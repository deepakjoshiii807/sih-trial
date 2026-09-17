"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Video,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  AlertTriangle,
  RefreshCw,
  Target,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Eye,
  ShieldCheck,
  Keyboard,
} from "lucide-react";
import {
  generateMockInterview,
  evaluateMockInterview,
  saveMockHistory,
  roleLabelFor,
  detectRoleKey,
  type MockInterviewSpec,
  type MockQuestion,
  type MockInterviewEval,
  type InterviewRoleKey,
} from "@/lib/ai-mock-interview";
import type { StudentDashboard, Opportunity } from "@/lib/student-api";
import { celebrate } from "@/components/ui/confetti";
import { useModalA11y } from "@/components/ui/use-modal-a11y";

const ROLE_OPTIONS: { key: InterviewRoleKey; label: string; hint: string }[] = [
  { key: "clinical-research", label: "Clinical Research Intern", hint: "Trials, GCP, consent" },
  { key: "data-analytics", label: "Research Data Assistant", hint: "Python, stats, EDA" },
  { key: "ayush-research", label: "AYUSH Research Intern", hint: "Ayurveda, Panchakarma" },
  { key: "pharmacovigilance", label: "Pharmacovigilance Trainee", hint: "ADR, drug safety" },
  { key: "clinical-ops", label: "Clinical Operations", hint: "Ward, hospital ops" },
  { key: "general", label: "General Research Intern", hint: "Mixed / exploratory" },
];

function ScoreRing({ score }: { score: number }) {
  const [a, setA] = useState(0);
  useEffect(() => {
    let f = 0;
    const id = setInterval(() => {
      f += 2;
      setA(Math.min(f, score));
      if (f >= score) clearInterval(id);
    }, 14);
    return () => clearInterval(id);
  }, [score]);
  const color = score >= 78 ? "#244B35" : score >= 58 ? "#E8D36B" : "#C98B5F";
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={40} fill="none" stroke="#E6E3D7" strokeWidth={6} />
        <circle
          cx={48}
          cy={48}
          r={40}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={2 * Math.PI * 40}
          strokeDashoffset={2 * Math.PI * 40 * (1 - a / 100)}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-xl" style={{ color }}>{a}</span>
        <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#6B6F68" }}>/100</span>
      </div>
    </div>
  );
}

type Step = "setup" | "generating" | "interview" | "evaluating" | "result";

export default function MockInterviewModal({
  open,
  onClose,
  opportunity,
  dashboard,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  dashboard: StudentDashboard;
  onNavigate?: (id: string) => void;
}) {
  const [step, setStep] = useState<Step>("setup");
  const [roleKey, setRoleKey] = useState<InterviewRoleKey>("general");
  const [spec, setSpec] = useState<MockInterviewSpec | null>(null);
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evalResult, setEvalResult] = useState<MockInterviewEval | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Voice + Camera mode
  const [voiceMode, setVoiceMode] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [camOn, setCamOn] = useState(true);
  const [camError, setCamError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [sttSupported, setSttSupported] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const reset = useCallback(() => {
    // stop camera + speech
    try { window.speechSynthesis?.cancel(); } catch {}
    try { recognitionRef.current?.stop?.(); } catch {}
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
    setStep("setup");
    setSpec(null);
    setQuestions([]);
    setAnswers({});
    setEvalResult(null);
    setErr(null);
    setExpanded(new Set());
    setCurrentIdx(0);
    setCamError(null);
    setIsSpeaking(false);
    setIsListening(false);
    setInterim("");
  }, []);

  useEffect(() => {
    if (!open) reset();
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
      try { recognitionRef.current?.stop?.(); } catch {}
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    };
  }, [open, reset]);

  useEffect(() => {
    if (open && opportunity) {
      setRoleKey(detectRoleKey(opportunity.title, opportunity.requiredSkills));
    }
    // check browser support on open
    if (open && typeof window !== "undefined") {
      const hasSTT = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
      const hasTTS = typeof window.speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
      setSttSupported(hasSTT);
      setTtsSupported(hasTTS);
    }
  }, [open, opportunity]);

  // Celebrate when a mock interview evaluation completes.
  useEffect(() => {
    if (step === "result") celebrate({ particleCount: 130 });
  }, [step]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const dialogRef = useModalA11y<HTMLDivElement>(open, handleClose);

  const handleGenerate = useCallback(async () => {
    if (!opportunity) return;
    setErr(null);
    setStep("generating");
    try {
      const s = await generateMockInterview(dashboard, {
        id: opportunity.id,
        title: opportunity.title,
        requiredSkills: opportunity.requiredSkills,
        description: opportunity.description,
        org: opportunity.org,
      });
      const finalSpec: MockInterviewSpec =
        s.roleKey !== roleKey
          ? { ...s, roleKey, roleLabel: roleLabelFor(roleKey) }
          : s;
      setSpec(finalSpec);
      setQuestions(finalSpec.questions);
      const init: Record<string, string> = {};
      for (const q of finalSpec.questions) init[q.id] = "";
      setAnswers(init);
      setCurrentIdx(0);
      setStep("interview");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not generate interview.");
      setStep("setup");
    }
  }, [opportunity, dashboard, roleKey]);

  const handleSubmit = useCallback(async () => {
    if (!spec || !questions.length) return;
    // stop any ongoing voice
    try { window.speechSynthesis?.cancel(); } catch {}
    try { recognitionRef.current?.stop?.(); } catch {}
    setErr(null);
    setStep("evaluating");
    try {
      const ev = await evaluateMockInterview(dashboard, spec, questions, answers);
      setEvalResult(ev);
      saveMockHistory({
        at: new Date().toISOString(),
        opportunityId: spec.opportunityId,
        opportunityTitle: spec.opportunityTitle,
        roleLabel: spec.roleLabel,
        overallScore: ev.overallScore,
        source: ev.source,
      });
      setStep("result");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Evaluation failed.");
      setStep("interview");
    }
  }, [spec, questions, answers, dashboard]);

  // ---------- Camera ----------
  const startCamera = useCallback(async () => {
    if (!voiceMode) return;
    setCamError(null);
    try {
      // try video+audio first so we get one permission prompt, fallback to video only
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamOn(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Camera permission denied";
      const isDenied = /denied|NotAllowed|Permission/i.test(msg);
      setCamError(isDenied ? "Camera/mic permission denied — please allow access and reload, or switch to Text mode." : msg);
      setCamOn(false);
    }
  }, [voiceMode]);

  const stopCamera = useCallback(() => {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
  }, []);

  useEffect(() => {
    if (step === "interview" && voiceMode && camOn && !streamRef.current) {
      void startCamera();
    }
    if (step !== "interview" || !voiceMode) {
      // cleanup video when leaving interview voice mode
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
        streamRef.current = null;
      }
    }
  }, [step, voiceMode, camOn, startCamera]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step, voiceMode]);

  // keep camera track enabled in sync with camOn toggle
  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn]);

  // ---------- TTS ----------
  const speak = useCallback((text: string) => {
    if (!ttsSupported || typeof window === "undefined") return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      utteranceRef.current = u;
      u.rate = 0.95;
      u.pitch = 1;
      u.volume = 1;
      // prefer an English voice if available
      try {
        const voices = window.speechSynthesis.getVoices();
        const en = voices.find((v) => /en(-|_)?(IN|US|GB)/i.test(v.lang) && v.name.toLowerCase().includes("google")) || voices.find((v) => v.lang.startsWith("en")) || voices[0];
        if (en) u.voice = en;
      } catch {}
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(u);
    } catch {
      setIsSpeaking(false);
    }
  }, [ttsSupported]);

  const stopSpeaking = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch {}
    setIsSpeaking(false);
  }, []);

  // auto-speak when voice mode enters interview or question changes
  useEffect(() => {
    if (step === "interview" && voiceMode && questions[currentIdx]) {
      const t = setTimeout(() => speak(questions[currentIdx].prompt), 500);
      return () => clearTimeout(t);
    }
  }, [step, voiceMode, currentIdx, questions, speak]);

  // ---------- STT ----------
  const startListening = useCallback(() => {
    if (!sttSupported) return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSttSupported(false); return; }
    try { recognitionRef.current?.stop?.(); } catch {}
    setInterim("");
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    let finalText = answers[questions[currentIdx]?.id] || "";
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (event: any) => {
      let interimT = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript || "";
        if (res.isFinal) finalChunk += transcript + " ";
        else interimT += transcript + " ";
      }
      if (interimT) setInterim(interimT);
      else setInterim("");
      if (finalChunk) {
        finalText = (finalText ? finalText + " " : "") + finalChunk.trim();
        const qid = questions[currentIdx]?.id;
        if (qid) setAnswers((prev) => ({ ...prev, [qid]: finalText.trim() }));
      }
    };
    try { rec.start(); } catch { setIsListening(false); }
  }, [sttSupported, answers, questions, currentIdx]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop?.(); } catch {}
    setIsListening(false);
    setInterim("");
  }, []);

  const answeredCount = questions.filter((q) => (answers[q.id] || "").trim().length >= 8).length;
  const totalWords = Object.values(answers).join(" ").split(/\s+/).filter(Boolean).length;
  const currentQ = questions[currentIdx] || null;

  if (!open || !opportunity) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.22 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="AI mock interview"
            tabIndex={-1}
            className="w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden rounded-[20px] border bg-white shadow-2xl flex flex-col"
            style={{ borderColor: "#E6E3D7" }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-5 border-b bg-white/95 backdrop-blur-sm shrink-0" style={{ borderColor: "#E6E3D7" }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}>
                  <Video size={16} style={{ color: "#DCE6D0" }} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] tracking-tight truncate" style={{ color: "#171A18" }}>AI Mock Interview</div>
                  <div className="text-xs truncate" style={{ color: "#6B6F68" }}>{opportunity.title} · {opportunity.org}</div>
                </div>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#EDEBE0] shrink-0">
                <X size={16} style={{ color: "#6B6F68" }} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 sm:p-5 flex-1">
              {/* SETUP */}
              {step === "setup" && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl p-4" style={{ background: "#FAFCF7", border: "1px solid #D6E3CE" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={14} style={{ color: "#244B35" }} />
                      <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#244B35" }}>Stretch feature — role-aware</span>
                      <span className="ml-auto font-mono text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "#DCE6D0", color: "#16301F" }}>6 questions</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "#6B6F68" }}>
                      Generates <strong style={{ color: "#171A18" }}>4 technical + 1 behavioral + 1 situational</strong> questions from this job&apos;s required skills ({opportunity.requiredSkills.join(", ") || "general research"}). Answers are evaluated against your <strong style={{ color: "#171A18" }}>skill gaps &amp; readiness</strong> — works offline; uses the LLM when the backend AI is configured.
                    </p>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9A9D94" }}>Interview role</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ROLE_OPTIONS.map((r) => (
                        <button
                          key={r.key}
                          onClick={() => setRoleKey(r.key)}
                          className={`text-left p-3 rounded-xl border transition-all ${roleKey === r.key ? "ring-2" : "hover:shadow-sm"}`}
                          style={{
                            borderColor: roleKey === r.key ? "#244B35" : "#E6E3D7",
                            background: roleKey === r.key ? "linear-gradient(135deg, #F0F5EC, #E8F0E2)" : "#FAFAF7",
                            boxShadow: roleKey === r.key ? "0 0 0 3px rgba(36,75,53,.12)" : undefined,
                          }}
                        >
                          <div className="font-semibold text-xs" style={{ color: "#171A18" }}>{r.label}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: "#6B6F68" }}>{r.hint}</div>
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] mt-2" style={{ color: "#9A9D94" }}>Auto-detected: <strong style={{ color: "#244B35" }}>{roleLabelFor(detectRoleKey(opportunity.title, opportunity.requiredSkills))}</strong> — change it if you want a different lens.</div>
                  </div>

                  {/* Mode picker */}
                  <div>
                    <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9A9D94" }}>How do you want to practice?</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setVoiceMode(false)}
                        className={`text-left rounded-xl border p-4 transition-all ${!voiceMode ? "ring-2" : "hover:shadow-sm"}`}
                        style={{ borderColor: !voiceMode ? "#244B35" : "#E6E3D7", background: !voiceMode ? "linear-gradient(135deg, #F0F5EC, #E8F0E2)" : "#fff", boxShadow: !voiceMode ? "0 0 0 3px rgba(36,75,53,.12)" : undefined }}
                      >
                        <div className="flex items-center gap-2 mb-1"><Keyboard size={14} style={{ color: !voiceMode ? "#244B35" : "#6B6F68" }} /><span className="font-semibold text-sm" style={{ color: "#171A18" }}>Text mode</span>{!voiceMode && <span className="ml-auto w-2 h-2 rounded-full" style={{ background: "#244B35" }} />}</div>
                        <div className="text-xs" style={{ color: "#6B6F68" }}>Type answers at your pace. Best for quick practice and low bandwidth.</div>
                      </button>
                      <button
                        onClick={() => setVoiceMode(true)}
                        className={`text-left rounded-xl border p-4 transition-all relative overflow-hidden ${voiceMode ? "ring-2" : "hover:shadow-sm"}`}
                        style={{ borderColor: voiceMode ? "#244B35" : "#E6E3D7", background: voiceMode ? "linear-gradient(135deg, #244B35, #1C3D2B)" : "#fff", boxShadow: voiceMode ? "0 8px 24px rgba(36,75,53,.22)" : undefined }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: voiceMode ? "rgba(255,255,255,.15)" : "#F0F5EC" }}><Video size={14} style={{ color: voiceMode ? "#fff" : "#244B35" }} /></div>
                          <span className="font-semibold text-sm" style={{ color: voiceMode ? "#fff" : "#171A18" }}>Voice + Camera</span>
                          <span className="ml-auto font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: voiceMode ? "#E8D36B" : "#244B35", color: voiceMode ? "#16301F" : "#fff" }}>RECOMMENDED</span>
                        </div>
                        <div className="text-xs" style={{ color: voiceMode ? "rgba(255,255,255,.78)" : "#6B6F68" }}>AI speaks each question, you reply verbally with camera on — builds real interview confidence.</div>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono font-bold" style={{ color: voiceMode ? "#DCE6D0" : "#9A9D94" }}><Eye size={10} /> Camera on <span style={{ opacity: 0.5 }}>·</span> <Mic size={10} /> Mic on <span style={{ opacity: 0.5 }}>·</span> <ShieldCheck size={10} /> Stays on-device</div>
                      </button>
                    </div>
                    {voiceMode && (
                      <div className="mt-2 rounded-lg px-3 py-2 flex gap-2 text-[11px] leading-snug" style={{ background: "#F0F5EC", border: "1px solid #D6E3CE", color: "#244B35" }}>
                        <ShieldCheck size={12} className="mt-0.5 shrink-0" /> <span><strong>Privacy:</strong> camera &amp; mic stay in your browser. Video is never uploaded — only your transcribed answer is sent for evaluation when you hit Submit. You can mute/turn off camera anytime.</span>
                      </div>
                    )}
                    {!sttSupported && voiceMode && <div className="mt-2 text-xs rounded-lg px-3 py-2" style={{ background: "#F0E8DD", color: "#7a3f1a" }}>Voice input isn&apos;t supported in this browser — you can still use Voice + Camera with the camera preview and type your answers, or switch to Chrome/Edge for full speech-to-text.</div>}
                  </div>

                  {err && <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#F0E8DD", color: "#7a3f1a" }}>{err}</div>}

                  <button onClick={handleGenerate} className="w-full font-mono text-sm font-bold py-3 rounded-xl text-white flex items-center justify-center gap-2 hover:shadow-md transition-shadow" style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}>
                    <Sparkles size={14} /> {voiceMode ? "Start voice interview" : "Generate interview"}
                  </button>
                  <div className="text-[11px] text-center" style={{ color: "#9A9D94" }}>Requires no file — questions come from this opportunity&apos;s required skills.</div>
                </div>
              )}

              {/* GENERATING */}
              {step === "generating" && (
                <div className="py-14 text-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "#F0F5EC" }}>
                    <Loader2 size={22} style={{ color: "#244B35" }} />
                  </motion.div>
                  <div className="font-semibold text-sm" style={{ color: "#171A18" }}>Crafting your mock interview…</div>
                  <div className="text-xs mt-1" style={{ color: "#6B6F68" }}>{roleLabelFor(roleKey)} · {opportunity.requiredSkills.slice(0, 3).join(", ") || "general"} {voiceMode ? "· Voice + Camera" : ""}</div>
                </div>
              )}

              {/* INTERVIEW — VOICE + CAMERA */}
              {step === "interview" && spec && voiceMode && currentQ && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: "#FAFCF7", border: "1px solid #D6E3CE" }}>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate" style={{ color: "#171A18" }}>{spec.roleLabel} · Voice + Camera</div>
                      <div className="font-mono text-[10px] truncate" style={{ color: "#6B6F68" }}>Q{currentIdx + 1} of {questions.length} · {spec.source === "ai" ? "AI-generated" : spec.source === "cache" ? "Cached" : "On-device"} · {answeredCount}/{questions.length} answered</div>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-2 py-1 rounded-md shrink-0" style={{ background: spec.source === "ai" ? "#244B35" : "#E8D36B", color: spec.source === "ai" ? "#fff" : "#16301F" }}>{spec.source === "ai" ? "AI" : "Dataset"}</span>
                  </div>

                  {/* Camera stage */}
                  <div className="rounded-[16px] overflow-hidden border relative" style={{ borderColor: "#171A18", background: "#0F1410" }}>
                    <div className="aspect-[16/10] sm:aspect-[16/9] relative bg-black">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)", display: camOn ? "block" : "none" }} />
                      {!camOn && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)" }}><CameraOff size={20} style={{ color: "rgba(255,255,255,.7)" }} /></div>
                          <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,.9)" }}>Camera off</div>
                          <div className="text-xs" style={{ color: "rgba(255,255,255,.55)" }}>Turn it on to practice eye contact — it really helps with fear.</div>
                        </div>
                      )}
                      {camError && (
                        <div className="absolute bottom-3 left-3 right-3 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(185,80,47,.95)", color: "#fff" }}>{camError}</div>
                      )}
                      {/* Top bar */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span role="status" aria-live="polite" className="font-mono text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1.5" style={{ background: isListening ? "#DC2626" : "rgba(0,0,0,.55)", color: "#fff", backdropFilter: "blur(6px)" }}>
                            <span className={`w-2 h-2 rounded-full ${isListening ? "animate-pulse" : ""}`} style={{ background: isListening ? "#fff" : "#E8D36B" }} /> {isListening ? "Listening…" : "Mic idle"}
                          </span>
                          {isSpeaking && <span className="font-mono text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "rgba(36,75,53,.9)", color: "#DCE6D0" }}><Volume2 size={10} className="inline mr-1" /> AI speaking</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setCamOn((v) => !v)} aria-label={camOn ? "Turn camera off" : "Turn camera on"} aria-pressed={camOn} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: camOn ? "rgba(255,255,255,.14)" : "rgba(220,38,38,.9)", color: "#fff" }} title={camOn ? "Turn camera off" : "Turn camera on"}>{camOn ? <Camera size={14} /> : <CameraOff size={14} />}</button>
                          <button onClick={() => (isSpeaking ? stopSpeaking() : speak(currentQ.prompt))} aria-label={isSpeaking ? "Stop speaking" : "Hear the question again"} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }} title={isSpeaking ? "Stop speaking" : "Hear question again"}>{isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
                        </div>
                      </div>
                      {/* Progress dots */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(6px)" }}>
                        {questions.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => { stopSpeaking(); stopListening(); setCurrentIdx(i); }}
                            className={`h-1.5 rounded-full transition-all ${i === currentIdx ? "w-6" : "w-1.5"} ${answers[questions[i].id]?.trim() ? "opacity-100" : "opacity-50"}`}
                            style={{ background: i === currentIdx ? "#E8D36B" : answers[questions[i].id]?.trim() ? "#DCE6D0" : "rgba(255,255,255,.6)" }}
                            aria-label={`Go to question ${i + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Question bar */}
                    <div className="p-3 sm:p-4 flex gap-3 items-start" style={{ background: "#fff" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: currentQ.kind === "technical" ? "#DCE6D0" : currentQ.kind === "behavioral" ? "#EAE3F4" : "#F0E8DD", color: currentQ.kind === "technical" ? "#16301F" : currentQ.kind === "behavioral" ? "#4d3a74" : "#7a3f1a" }}><span className="font-mono text-[10px] font-bold uppercase">{currentQ.kind.slice(0, 3)}</span></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md" style={{ background: "#EDEBE0", color: "#6B6F68" }}>{currentQ.skill} · {currentQ.difficulty}</span>
                          {currentQ.targetsGap && <span className="font-mono text-[10px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: "#F0E8DD", color: "#7a3f1a" }}><Target size={10} /> Targets gap</span>}
                        </div>
                        <div className="font-medium text-sm leading-snug" style={{ color: "#171A18" }}><span className="font-mono text-xs font-bold mr-1" style={{ color: "#9A9D94" }}>Q{currentIdx + 1}.</span>{currentQ.prompt}</div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => speak(currentQ.prompt)} className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1" style={{ borderColor: "#E6E3D7", color: "#244B35", background: "#FAFAF7" }}><Volume2 size={12} /> Hear again</button>
                          <button onClick={() => setExpanded((p) => { const n = new Set(p); if (n.has(currentQ.id)) n.delete(currentQ.id); else n.add(currentQ.id); return n; })} className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg border" style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}>{expanded.has(currentQ.id) ? "Hide hints" : "What a strong answer covers"}</button>
                        </div>
                        {expanded.has(currentQ.id) && <ul className="mt-2 list-disc pl-5 text-xs" style={{ color: "#6B6F68" }}>{currentQ.expectedPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>}
                      </div>
                    </div>
                  </div>

                  {/* Voice answer */}
                  <div className="rounded-xl border p-4" style={{ borderColor: isListening ? "#244B35" : "#E6E3D7", background: isListening ? "#FAFCF7" : "#fff", boxShadow: isListening ? "0 0 0 3px rgba(36,75,53,.1)" : undefined }}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9A9D94" }}>Your answer — speak, then refine by typing if you want</span>
                      <span className="font-mono text-[11px] font-bold" style={{ color: (answers[currentQ.id] || "").trim().length > 20 ? "#244B35" : "#9A9D94" }}>{(answers[currentQ.id] || "").split(/\s+/).filter(Boolean).length} words</span>
                    </div>

                    <div className="relative">
                      <textarea
                        value={(answers[currentQ.id] || "") + (interim ? (answers[currentQ.id] ? " " : "") + interim : "")}
                        onChange={(e) => {
                          // if user types, stop interim overlay and save typed text (strip interim)
                          setInterim("");
                          setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }));
                        }}
                        rows={4}
                        placeholder={isListening ? "Listening… speak clearly" : "Tap the mic and speak your answer — or type here"}
                        className="w-full rounded-xl border px-3 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-[#244B35]/20 resize-none"
                        style={{ borderColor: isListening ? "#244B35" : "#E6E3D7", background: "#FAFAF7", color: "#171A18", minHeight: 96 }}
                      />
                      {interim && <span className="pointer-events-none absolute bottom-3 right-14 text-xs italic" style={{ color: "#9A9D94" }}>{interim.slice(0, 28)}…</span>}
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {!isListening ? (
                        <button onClick={startListening} disabled={!sttSupported} className="font-mono text-sm font-bold px-5 py-2.5 rounded-xl text-white inline-flex items-center gap-2 hover:shadow-md disabled:opacity-40 transition-all" style={{ background: "linear-gradient(135deg, #DC2626, #991B1B)" }}><Mic size={16} /> Tap to speak</button>
                      ) : (
                        <button onClick={stopListening} className="font-mono text-sm font-bold px-5 py-2.5 rounded-xl text-white inline-flex items-center gap-2" style={{ background: "#171A18" }}><MicOff size={16} /> Stop</button>
                      )}
                      <span className="text-[11px]" style={{ color: "#9A9D94" }}>{sttSupported ? "Chrome/Edge recommended · Speak 20-60s per answer" : "Typing fallback — mic not supported here"}</span>
                      {answers[currentQ.id]?.trim() && <span className="ml-auto font-mono text-[11px] font-bold inline-flex items-center gap-1" style={{ color: "#244B35" }}><Check size={12} /> Saved</span>}
                    </div>
                    {camError && <div className="mt-2 text-xs" style={{ color: "#B0502F" }}>{camError} <button onClick={startCamera} className="underline font-bold">Retry</button></div>}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => { stopSpeaking(); stopListening(); setCurrentIdx((i) => Math.max(0, i - 1)); }} disabled={currentIdx === 0} className="font-mono text-xs font-bold px-4 py-2.5 rounded-xl border inline-flex items-center gap-1.5 disabled:opacity-40" style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}><ArrowLeft size={13} /> Previous</button>
                    {currentIdx < questions.length - 1 ? (
                      <button onClick={() => { stopSpeaking(); stopListening(); setCurrentIdx((i) => Math.min(questions.length - 1, i + 1)); }} className="ml-auto font-mono text-xs font-bold px-5 py-2.5 rounded-xl text-white inline-flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}>Next <ArrowRight size={13} /></button>
                    ) : (
                      <button onClick={handleSubmit} disabled={answeredCount === 0} className="ml-auto font-mono text-xs font-bold px-5 py-2.5 rounded-xl text-white inline-flex items-center gap-1.5 disabled:opacity-40" style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}><Video size={13} /> Submit for evaluation</button>
                    )}
                  </div>
                  <div className="text-[11px] text-center flex items-center justify-center gap-1.5" style={{ color: "#9A9D94" }}><Eye size={11} /> Keep your camera on and look at the lens — just like a real interview. You&apos;ve got this.</div>
                </div>
              )}

              {/* INTERVIEW — TEXT */}
              {step === "interview" && spec && !voiceMode && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#FAFCF7", border: "1px solid #D6E3CE" }}>
                    <div>
                      <div className="font-semibold text-xs" style={{ color: "#171A18" }}>{spec.roleLabel}</div>
                      <div className="font-mono text-[10px]" style={{ color: "#6B6F68" }}>{questions.length} questions · {spec.source === "ai" ? "AI-generated" : spec.source === "cache" ? "Cached" : "On-device"} · {spec.rationale || "role-specific"}</div>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: spec.source === "ai" ? "#244B35" : "#E8D36B", color: spec.source === "ai" ? "#fff" : "#16301F" }}>{spec.source === "ai" ? "AI" : "Dataset"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold" style={{ color: "#6B6F68" }}>{answeredCount}/{questions.length} answered · {totalWords} words</span>
                    <span className="font-mono text-[11px]" style={{ color: "#9A9D94" }}>Aim for 30+ words per technical answer</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="rounded-xl border p-4" style={{ borderColor: "#E6E3D7", background: "#fff" }}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md" style={{ background: q.kind === "technical" ? "#DCE6D0" : q.kind === "behavioral" ? "#EAE3F4" : "#F0E8DD", color: q.kind === "technical" ? "#16301F" : q.kind === "behavioral" ? "#4d3a74" : "#7a3f1a" }}>{q.kind}</span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "#EDEBE0", color: "#6B6F68" }}>{q.skill} · {q.difficulty}</span>
                        </div>
                        <div className="font-medium text-sm leading-snug" style={{ color: "#171A18" }}><span className="font-mono text-xs font-bold mr-1.5" style={{ color: "#9A9D94" }}>Q{idx + 1}.</span>{q.prompt}</div>
                        {q.targetsGap && <div className="mt-2 font-mono text-[10px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: "#F0E8DD", color: "#7a3f1a" }}><Target size={10} /> Targets gap: {q.targetsGap}</div>}
                        <textarea
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          rows={q.kind === "technical" ? 4 : 3}
                          placeholder={q.kind === "technical" ? "Walk through your approach — name a method/tool, when you'd use it, and one check…" : "Use STAR: Situation → Task → Action → Result…"}
                          className="mt-3 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#244B35]/20 resize-none"
                          style={{ borderColor: "#E6E3D7", background: "#FAFAF7", color: "#171A18" }}
                        />
                        <button onClick={() => setExpanded((prev) => { const n = new Set(prev); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })} className="mt-2 flex items-center gap-1 font-mono text-[11px] font-bold" style={{ color: "#6B6F68" }}>
                          {expanded.has(q.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />} What a strong answer covers
                        </button>
                        {expanded.has(q.id) && (
                          <ul className="mt-1.5 list-disc pl-5 text-xs" style={{ color: "#6B6F68" }}>
                            {q.expectedPoints.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  {err && <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#F0E8DD", color: "#7a3f1a" }}>{err}</div>}

                  <button onClick={handleSubmit} disabled={answeredCount === 0} className="w-full font-mono text-sm font-bold py-3 rounded-xl text-white flex items-center justify-center gap-2 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all" style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}>
                    <Video size={14} /> Submit for evaluation
                  </button>
                  <div className="text-[11px] text-center" style={{ color: "#9A9D94" }}>Evaluated against your gaps &amp; readiness. Works offline — LLM when backend AI is configured.</div>
                  <button onClick={() => setVoiceMode(true)} className="text-xs font-bold underline" style={{ color: "#244B35" }}>Prefer speaking? Switch to Voice + Camera</button>
                </div>
              )}

              {/* EVALUATING */}
              {step === "evaluating" && (
                <div className="py-14 text-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "#F0F5EC" }}>
                    <Loader2 size={22} style={{ color: "#244B35" }} />
                  </motion.div>
                  <div className="font-semibold text-sm" style={{ color: "#171A18" }}>Evaluating your answers…</div>
                  <div className="text-xs mt-1" style={{ color: "#6B6F68" }}>Scoring each answer and mapping feedback to your gaps.</div>
                </div>
              )}

              {/* RESULT */}
              {step === "result" && evalResult && spec && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-[16px] border p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center" style={{ borderColor: "#D6E3CE", background: "linear-gradient(135deg, #FAFCF7, #F0F5EC)" }}>
                    <ScoreRing score={evalResult.overallScore} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[16px]" style={{ color: "#171A18" }}>{evalResult.overallScore}/100</span>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: evalResult.source === "ai" ? "#244B35" : evalResult.source === "cache" ? "#DCE6D0" : "#E8D36B", color: evalResult.source === "ai" ? "#fff" : "#16301F" }}>
                          {evalResult.source === "ai" ? "AI evaluation" : evalResult.source === "cache" ? "Cached" : "Heuristic"}
                        </span>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "#EDEBE0", color: "#6B6F68" }}>{spec.roleLabel} {voiceMode ? "· Voice" : ""}</span>
                      </div>
                      <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "#171A18" }}>{evalResult.roleReadinessNote}</p>
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9A9D94" }}>Per-question feedback</div>
                    <div className="flex flex-col gap-2">
                      {questions.map((q) => {
                        const ev = evalResult.perQuestion.find((x) => x.questionId === q.id);
                        if (!ev) return null;
                        const w = Math.round((ev.score / 10) * 100);
                        return (
                          <div key={q.id} className="rounded-xl border p-3" style={{ borderColor: "#E6E3D7", background: "#fff" }}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md" style={{ background: "#EDEBE0", color: "#6B6F68" }}>{q.skill}</span>
                              <span className="font-mono text-xs font-bold" style={{ color: ev.score >= 7 ? "#244B35" : ev.score >= 5 ? "#7a3f1a" : "#B0502F" }}>{ev.score}/10</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "#E6E3D7" }}>
                              <div className="h-full rounded-full" style={{ width: `${w}%`, background: ev.score >= 7 ? "#244B35" : ev.score >= 5 ? "#E8D36B" : "#E8C7AE" }} />
                            </div>
                            <div className="text-xs leading-snug" style={{ color: "#6B6F68" }}>{ev.feedback}</div>
                            <div className="text-[11px] mt-1.5 line-clamp-2" style={{ color: "#9A9D94" }}>Q: {q.prompt}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {evalResult.strengths.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: "#F0F5EC", border: "1px solid #D6E3CE" }}>
                      <div className="flex items-center gap-1.5 mb-2"><Check size={14} style={{ color: "#244B35" }} /><span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#244B35" }}>Strengths</span></div>
                      <ul className="list-disc pl-5 text-xs" style={{ color: "#244B35" }}>{evalResult.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}

                  {evalResult.gapsToClose.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: "#FDF8F3", border: "1px solid #E8C7AE" }}>
                      <div className="flex items-center gap-1.5 mb-2"><AlertTriangle size={14} style={{ color: "#7a3f1a" }} /><span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#7a3f1a" }}>Mapped to your skill gaps</span></div>
                      <div className="flex flex-col gap-2">
                        {evalResult.gapsToClose.map((g) => (
                          <div key={g.gapName} className="rounded-lg p-3" style={{ background: "#fff", border: "1px solid #E8C7AE" }}>
                            <div className="font-semibold text-xs" style={{ color: "#7a3f1a" }}>{g.gapName}</div>
                            <div className="text-xs mt-1" style={{ color: "#6B6F68" }}>{g.why}</div>
                            <div className="text-xs mt-1 font-medium" style={{ color: "#244B35" }}>→ {g.suggestedAction}</div>
                          </div>
                        ))}
                      </div>
                      {onNavigate && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => { handleClose(); onNavigate("projects"); }} className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5" style={{ borderColor: "#E6E3D7", color: "#244B35" }}><Lightbulb size={12} /> Go to Projects</button>
                          <button onClick={() => { handleClose(); onNavigate("gaps"); }} className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5" style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}><Target size={12} /> View gaps</button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl p-4" style={{ background: "#FAFAF7", border: "1px solid #E6E3D7" }}>
                    <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9A9D94" }}>Next steps</div>
                    <ul className="flex flex-col gap-1.5">
                      {evalResult.nextSteps.map((s, i) => (
                        <li key={i} className="flex gap-2 text-xs" style={{ color: "#6B6F68" }}><ArrowRight size={12} className="mt-0.5 shrink-0" style={{ color: "#244B35" }} /> {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setStep("setup"); setEvalResult(null); }} className="flex-1 font-mono text-xs font-bold py-2.5 rounded-xl border flex items-center justify-center gap-1.5" style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}><RefreshCw size={12} /> Retake</button>
                    <button onClick={handleClose} className="flex-1 font-mono text-xs font-bold py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}>Done</button>
                  </div>
                  <div className="text-[11px] text-center" style={{ color: "#9A9D94" }}>Saved to mock history (local) · Re-run after your next project to see readiness move.</div>
                </div>
              )}
            </div>

            {step !== "setup" && step !== "generating" && (
              <div className="p-4 border-t flex justify-end shrink-0" style={{ borderColor: "#E6E3D7", background: "#FAFAF7" }}>
                <button onClick={handleClose} className="font-mono text-xs font-bold px-4 py-2 rounded-lg border" style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}>Close</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
