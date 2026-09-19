/**
 * Skill Assessment Modal — a locked, timed quiz that verifies claimed skills.
 *
 * When a student uploads a document and skills are extracted, this modal
 * generates a quick MCQ assessment. During the assessment:
 *
 *  - Tab switches are tracked (Page Visibility API).
 *  - Keyboard shortcuts that could leave the page are intercepted.
 *  - Right-click context menu is disabled.
 *  - A countdown timer enforces the time limit.
 *
 * On submit the answers are graded server-side and the result is recorded.
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Clock,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { studentApi, type AssessmentResult } from "@/lib/student-api";
import { apiErrorMessage } from "@/lib/api-client";

interface SkillAssessmentModalProps {
  open: boolean;
  skills: string[];
  source: string;
  onClose: () => void;
  /** Called with true when the student passes (>= 60%). */
  onPassed: () => void;
  /** Called with the result regardless of pass/fail so the parent can record it. */
  onResult?: (result: AssessmentResult) => void;
}

interface Question {
  skill: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface AssessmentState {
  id: number;
  questions: Question[];
  totalQuestions: number;
  timeLimitSeconds: number;
  startedAt: string;
}

type Phase = "intro" | "loading" | "assessment" | "submitting" | "results";

export default function SkillAssessmentModal({
  open,
  skills,
  source,
  onClose,
  onPassed,
  onResult,
}: SkillAssessmentModalProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [assessment, setAssessment] = useState<AssessmentState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [interceptedKeys, setInterceptedKeys] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Anti-cheat: tab visibility tracking ---
  useEffect(() => {
    if (phase !== "assessment") return;

    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+Tab, Alt+Tab, Ctrl+W, Ctrl+T, F11, PrintScreen
      const blocked =
        (e.ctrlKey && ["Tab", "w", "t", "n", "Shift"].includes(e.key)) ||
        (e.altKey && ["Tab", "F4"].includes(e.key)) ||
        ["F11", "PrintScreen", "Meta"].includes(e.key);
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        setInterceptedKeys((prev) => prev + 1);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [phase]);

  // --- Timer ---
  useEffect(() => {
    if (phase !== "assessment" || !assessment) return;

    // Calculate remaining time from the assessment start
    const startTime = new Date(assessment.startedAt).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, assessment.timeLimitSeconds - elapsed);
    setTimeLeft(remaining);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, assessment]);

  // --- Start assessment ---
  const startAssessment = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const response = await studentApi.generateAssessment(skills, source);
      setAssessment(response);
      setAnswers(new Array(response.questions.length).fill(null));
      setCurrentIndex(0);
      setTabSwitches(0);
      setInterceptedKeys(0);
      setPhase("assessment");
    } catch (err) {
      setError(apiErrorMessage(err));
      setPhase("intro");
    }
  }, [skills, source]);

  // --- Submit assessment ---
  const handleSubmit = useCallback(async () => {
    if (!assessment || phase === "submitting" || phase === "results") return;

    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("submitting");

    try {
      const response = await studentApi.submitAssessment(
        assessment.id,
        answers.map((a) => a ?? -1),
        tabSwitches,
      );
      setResult(response);
      setPhase("results");
      onResult?.(response);
      if (response.passed) {
        onPassed();
      }
    } catch (err) {
      setError(apiErrorMessage(err));
      setPhase("assessment");
      // Restart timer with remaining time
      if (assessment) {
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              handleSubmit();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  }, [assessment, answers, tabSwitches, phase, onResult, onPassed]);

  // --- Timer formatting ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const timerColor =
    timeLeft <= 30
      ? "text-red-500"
      : timeLeft <= 60
        ? "text-orange-500"
        : "text-[#244B35]";

  const handleSelect = (qIdx: number, optIdx: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  };

  const answeredCount = answers.filter((a) => a !== null).length;
  const progress = assessment
    ? (answeredCount / assessment.totalQuestions) * 100
    : 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && phase !== "assessment") {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`bg-white shadow-2xl overflow-hidden ${
            phase === "assessment"
              ? "w-full max-w-3xl max-h-[95vh]"
              : "w-full max-w-lg max-h-[85vh]"
          } rounded-[20px] border`}
          style={{ borderColor: "#E6E3D7" }}
        >
          {/* ── INTRO PHASE ── */}
          {phase === "intro" && (
            <div className="p-8 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{
                  background: "linear-gradient(135deg, #244B35, #1C3D2B)",
                }}
              >
                <Shield size={28} style={{ color: "#DCE6D0" }} />
              </div>
              <div
                className="font-semibold text-xl tracking-tight mb-2"
                style={{ color: "#171A18" }}
              >
                Skill Verification Assessment
              </div>
              <p className="text-sm mb-6" style={{ color: "#6B6F68" }}>
                To verify the skills you claimed from your uploaded document,
                you&apos;ll take a quick timed assessment. This ensures skill
                authenticity in your passport.
              </p>

              <div
                className="rounded-xl p-4 mb-6 text-left"
                style={{ background: "#FAFCF7", border: "1px solid #D6E3CE" }}
              >
                <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#244B35" }}>
                  Assessment Rules
                </div>
                <ul className="flex flex-col gap-2 text-xs" style={{ color: "#6B6F68" }}>
                  <li className="flex items-start gap-2">
                    <Lock size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#C98B5F" }} />
                    Tab switching is tracked — stay on this page during the assessment
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#C98B5F" }} />
                    A countdown timer enforces the time limit ({Math.min(600, Math.max(120, skills.length * 30))}s)
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#C98B5F" }} />
                    {skills.length} skill{skills.length !== 1 ? "s" : ""} to assess — {skills.length * 2} multiple-choice questions
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center mb-6">
                {skills.slice(0, 6).map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide"
                    style={{ background: "#EAE3F4", color: "#4d3a74" }}
                  >
                    {s}
                  </span>
                ))}
                {skills.length > 6 && (
                  <span className="text-[10px] font-mono" style={{ color: "#9A9D94" }}>
                    +{skills.length - 6} more
                  </span>
                )}
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="font-mono text-xs font-bold px-4 py-2.5 rounded-lg border"
                  style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}
                >
                  Cancel
                </button>
                <button
                  onClick={startAssessment}
                  className="font-mono text-xs font-bold px-6 py-2.5 rounded-lg text-white transition-all hover:shadow-md flex items-center gap-1.5"
                  style={{
                    background: "linear-gradient(135deg, #244B35, #1C3D2B)",
                  }}
                >
                  Start Assessment
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── LOADING PHASE ── */}
          {phase === "loading" && (
            <div className="py-16 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "#F0F5EC" }}
              >
                <Loader2 size={24} style={{ color: "#244B35" }} />
              </motion.div>
              <div className="font-semibold text-sm mb-1" style={{ color: "#171A18" }}>
                Generating your assessment...
              </div>
              <div className="text-xs" style={{ color: "#6B6F68" }}>
                Creating {skills.length * 2} questions for your claimed skills
              </div>
            </div>
          )}

          {/* ── ASSESSMENT PHASE ── */}
          {phase === "assessment" && assessment && (
            <div className="flex flex-col h-[90vh] max-h-[90vh]">
              {/* Top bar with timer + progress */}
              <div
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: "#E6E3D7", background: "#FAFAF7" }}
              >
                <div className="flex items-center gap-3">
                  <Lock size={14} style={{ color: "#C98B5F" }} />
                  <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#6B6F68" }}>
                    Locked Assessment
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {tabSwitches > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold" style={{ color: "#C98B5F" }}>
                      <EyeOff size={12} />
                      {tabSwitches} tab switch{tabSwitches !== 1 ? "es" : ""}
                    </span>
                  )}
                  <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${timerColor}`}>
                    <Clock size={14} />
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1" style={{ background: "#E6E3D7" }}>
                <motion.div
                  className="h-full"
                  style={{ background: "#244B35" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Question */}
              <div className="flex-1 overflow-y-auto p-6">
                {assessment.questions[currentIndex] && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md"
                        style={{ background: "#EAE3F4", color: "#4d3a74" }}
                      >
                        {assessment.questions[currentIndex].skill}
                      </span>
                      <span className="font-mono text-xs font-bold" style={{ color: "#9A9D94" }}>
                        {currentIndex + 1} of {assessment.totalQuestions}
                      </span>
                    </div>

                    <div className="font-semibold text-[17px] mb-5" style={{ color: "#171A18" }}>
                      {assessment.questions[currentIndex].question}
                    </div>

                    <div className="flex flex-col gap-3">
                      {assessment.questions[currentIndex].options.map(
                        (opt, optIdx) => {
                          const selected = answers[currentIndex] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleSelect(currentIndex, optIdx)}
                              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                                selected
                                  ? "ring-2 ring-[#244B35] bg-[#FAFCF7]"
                                  : "hover:bg-[#FAFAF7]"
                              }`}
                              style={{
                                borderColor: selected ? "#D6E3CE" : "#E6E3D7",
                              }}
                            >
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                                  selected
                                    ? "bg-[#244B35] border-[#244B35]"
                                    : "bg-white border-[#D6E3CE]"
                                }`}
                              >
                                {selected && (
                                  <Check size={12} style={{ color: "#DCE6D0" }} />
                                )}
                              </div>
                              <span className="text-sm" style={{ color: "#171A18" }}>
                                {opt}
                              </span>
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom navigation */}
              <div
                className="flex items-center justify-between px-5 py-4 border-t"
                style={{ borderColor: "#E6E3D7" }}
              >
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="font-mono text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1 disabled:opacity-30"
                  style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>

                <div className="flex gap-1.5">
                  {assessment.questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i === currentIndex
                          ? "scale-125"
                          : answers[i] !== null
                            ? ""
                            : "opacity-40"
                      }`}
                      style={{
                        background:
                          i === currentIndex
                            ? "#244B35"
                            : answers[i] !== null
                              ? "#D6E3CE"
                              : "#E6E3D7",
                      }}
                    />
                  ))}
                </div>

                {currentIndex < assessment.totalQuestions - 1 ? (
                  <button
                    onClick={() => setCurrentIndex((i) => i + 1)}
                    className="font-mono text-xs font-bold px-3 py-2 rounded-lg text-white flex items-center gap-1"
                    style={{
                      background: "linear-gradient(135deg, #244B35, #1C3D2B)",
                    }}
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="font-mono text-xs font-bold px-4 py-2 rounded-lg text-white flex items-center gap-1"
                    style={{
                      background:
                        answeredCount === assessment.totalQuestions
                          ? "linear-gradient(135deg, #244B35, #1C3D2B)"
                          : "#9A9D94",
                    }}
                  >
                    Submit
                    <Check size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── SUBMITTING PHASE ── */}
          {phase === "submitting" && (
            <div className="py-16 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "#F0F5EC" }}
              >
                <Loader2 size={24} style={{ color: "#244B35" }} />
              </motion.div>
              <div className="font-semibold text-sm" style={{ color: "#171A18" }}>
                Grading your assessment...
              </div>
            </div>
          )}

          {/* ── RESULTS PHASE ── */}
          {phase === "results" && result && (
            <div className="p-6">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                    result.passed ? "" : ""
                  }`}
                  style={{
                    background: result.passed ? "#DCE6D0" : "#F0E8DD",
                  }}
                >
                  {result.passed ? (
                    <Trophy size={28} style={{ color: "#244B35" }} />
                  ) : (
                    <AlertCircle size={28} style={{ color: "#C98B5F" }} />
                  )}
                </motion.div>
                <div className="font-semibold text-xl mb-1" style={{ color: "#171A18" }}>
                  {result.passed ? "Assessment Passed!" : "Keep Practicing"}
                </div>
                <div className="text-sm" style={{ color: "#6B6F68" }}>
                  {result.passed
                    ? "Your skills have been verified. They'll appear as verified in your passport."
                    : "You scored below 60%. Review the explanations below and try again."}
                </div>
              </div>

              {/* Score card */}
              <div
                className="rounded-xl p-5 mb-5"
                style={{
                  background: result.passed ? "#FAFCF7" : "#FDF8F3",
                  border: `1px solid ${result.passed ? "#D6E3CE" : "#E8C7AE"}`,
                }}
              >
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="font-bold text-2xl" style={{ color: "#244B35" }}>
                      {result.percentage}%
                    </div>
                    <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>
                      Score
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-2xl" style={{ color: "#171A18" }}>
                      {result.score}/{result.totalQuestions}
                    </div>
                    <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>
                      Correct
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-2xl" style={{ color: "#171A18" }}>
                      {result.totalQuestions}
                    </div>
                    <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>
                      Questions
                    </div>
                  </div>
                  <div>
                    <div
                      className="font-bold text-2xl"
                      style={{
                        color: result.tabSwitches === 0 ? "#244B35" : "#C98B5F",
                      }}
                    >
                      {result.tabSwitches}
                    </div>
                    <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>
                      Tab Switches
                    </div>
                  </div>
                </div>
              </div>

              {/* Question review */}
              <div className="max-h-[300px] overflow-y-auto mb-5">
                <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#9A9D94" }}>
                  Question Review
                </div>
                {result.gradedQuestions.map((q, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3 mb-2 border"
                    style={{
                      borderColor: q.correct ? "#D6E3CE" : "#E8C7AE",
                      background: q.correct ? "#FAFCF7" : "#FDF8F3",
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: q.correct ? "#244B35" : "#C98B5F",
                        }}
                      >
                        {q.correct ? (
                          <Check size={11} style={{ color: "#fff" }} />
                        ) : (
                          <X size={11} style={{ color: "#fff" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium" style={{ color: "#171A18" }}>
                          {q.question}
                        </div>
                        {!q.correct && (
                          <div className="text-[11px] mt-1" style={{ color: "#9A9D94" }}>
                            Your answer: {q.options[q.userAnswer] ?? "N/A"} · Correct: {q.options[q.correctIndex]}
                          </div>
                        )}
                        {q.explanation && (
                          <div className="text-[11px] mt-1" style={{ color: "#6B6F68" }}>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={onClose}
                className="w-full font-mono text-xs font-bold px-5 py-2.5 rounded-lg text-white transition-all hover:shadow-md"
                style={{
                  background: "linear-gradient(135deg, #244B35, #1C3D2B)",
                }}
              >
                {result.passed ? "Continue to Passport" : "Close"}
              </button>
            </div>
          )}

          {/* ── ERROR ── */}
          {error && (
            <div className="px-5 pb-4">
              <div
                className="rounded-xl p-3 text-xs flex items-start gap-2"
                style={{ background: "#FDF8F3", border: "1px solid #E8C7AE" }}
              >
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#C98B5F" }} />
                <span style={{ color: "#7a3f1a" }}>{error}</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
