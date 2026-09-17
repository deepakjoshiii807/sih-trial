"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  BookOpen,
  Briefcase,
  LayoutGrid,
  Shield,
  Check,
  ChevronRight,
  RefreshCw,
  Zap,
  Award,
} from "lucide-react";
import {
  optimizeProfileCached,
  type ProfileOptimization,
  type OptimizerRecommendation,
} from "@/lib/ai-profile-optimizer";
import type { StudentDashboard } from "@/lib/student-api";

interface ProfileOptimizerPanelProps {
  dashboard: StudentDashboard;
}

const CATEGORY_CONFIG: Record<
  OptimizerRecommendation["category"],
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  skill: { icon: <Zap size={14} />, color: "#244B35", bg: "#DCE6D0", label: "Skill" },
  profile: { icon: <Target size={14} />, color: "#8A6FB8", bg: "#EAE3F4", label: "Profile" },
  opportunity: { icon: <Briefcase size={14} />, color: "#C98B5F", bg: "#F0E8DD", label: "Opportunity" },
  learning: { icon: <BookOpen size={14} />, color: "#1C3D2B", bg: "#DCE6D0", label: "Learning" },
  portfolio: { icon: <LayoutGrid size={14} />, color: "#4d3a74", bg: "#EAE3F4", label: "Portfolio" },
};

const PRIORITY_COLORS: Record<OptimizerRecommendation["priority"], string> = {
  critical: "#DC2626",
  high: "#C98B5F",
  medium: "#E8D36B",
  low: "#244B35",
};

function ScoreRing({ score }: { score: number }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      frame += 2;
      setAnimated(Math.min(frame, score));
      if (frame >= score) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [score]);

  const color =
    score >= 80
      ? "#244B35"
      : score >= 60
        ? "#E8D36B"
        : score >= 40
          ? "#C98B5F"
          : "#DC2626";

  return (
    <div className="relative w-24 h-24">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="#E6E3D7"
          strokeWidth="6"
        />
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={2 * Math.PI * 40}
          strokeDashoffset={2 * Math.PI * 40 * (1 - animated / 100)}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-xl" style={{ color }}>
          {animated}
        </span>
        <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "#6B6F68" }}>
          /100
        </span>
      </div>
    </div>
  );
}

function RecommendationCard({
  rec,
  index,
}: {
  rec: OptimizerRecommendation;
  index: number;
}) {
  const cat = CATEGORY_CONFIG[rec.category] || CATEGORY_CONFIG.skill;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
      className="rounded-xl border p-4 hover:shadow-sm transition-shadow"
      style={{ borderColor: "#E6E3D7", background: "#FAFAF7" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: cat.bg, color: cat.color }}
        >
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="font-semibold text-sm"
              style={{ color: "#171A18" }}
            >
              {rec.title}
            </span>
            <span
              className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
              style={{
                background: PRIORITY_COLORS[rec.priority] + "18",
                color: PRIORITY_COLORS[rec.priority],
              }}
            >
              {rec.priority}
            </span>
          </div>
          <p className="text-xs leading-relaxed mb-1.5" style={{ color: "#6B6F68" }}>
            {rec.description}
          </p>
          {rec.impact && (
            <div
              className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{ background: "#F0F5EC", color: "#244B35" }}
            >
              <TrendingUp size={10} />
              {rec.impact}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ProfileOptimizerPanel({
  dashboard,
}: ProfileOptimizerPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProfileOptimization | null>(null);
  const [provenance, setProvenance] = useState<"ai" | "deterministic" | "cache">("ai");

  const analyze = useCallback(async (force: unknown = false) => {
    const doForce = force === true;
    setLoading(true);
    setError(null);
    try {
      // force:true bypasses the local cache by ignoring the dedup key suffix —
      // easiest is to clear the optimizer namespace then refetch.
      if (doForce) {
        try {
          const { clearAICache } = await import("@/lib/ai-cache");
          clearAICache("optimizer");
        } catch {
          /* ignore */
        }
      }
      const { value, source } = await optimizeProfileCached(dashboard);
      setResult(value);
      setProvenance(source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setLoading(false);
    }
  }, [dashboard]);

  // Auto-analyze once per dashboard identity (hash) — not every re-render.
  // `student.id + gaps.length` is enough to capture the cache key identity;
  // the full key is inside ai-profile-optimizer.
  const dashKey = `${dashboard.student.id}:${dashboard.gaps.length}:${dashboard.applications.length}`;
  useEffect(() => {
    if (!result && !loading && !error) analyze(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashKey]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[18px] border p-6 bg-white relative overflow-hidden"
        style={{ borderColor: "#D6E3CE", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}
      >
        <div
          className="absolute top-0 left-0 w-full h-1"
          style={{ background: "linear-gradient(90deg, #244B35, #E8D36B, #C98B5F)" }}
        />

        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} style={{ color: "#244B35" }} />
              <span
                className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase"
                style={{ color: "#244B35" }}
              >
                AI Profile Optimizer
              </span>
            </div>
            <h2
              className="font-semibold text-[20px] tracking-tight"
              style={{ color: "#171A18" }}
            >
              Your Optimization Report
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <span
                className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-md"
                style={{
                  background: provenance === "ai" ? "#DCE6D0" : provenance === "cache" ? "#F0F5EC" : "#EDEBE0",
                  color: provenance === "ai" ? "#16301F" : "#6B6F68",
                }}
              >
                {provenance === "ai" ? "AI" : provenance === "cache" ? "Cached AI" : "Rule-based fallback"}
              </span>
            )}
            <button
              onClick={() => { void analyze(true); }}
              disabled={loading}
              className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 hover:bg-[#F0F5EC] transition-colors disabled:opacity-40"
              style={{ borderColor: "#D6E3CE", color: "#244B35" }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {loading ? "Analyzing..." : "Re-analyze"}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !result && (
          <div className="py-12 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#F0F5EC" }}
            >
              <Sparkles size={20} style={{ color: "#244B35" }} />
            </motion.div>
            <div className="font-semibold text-sm" style={{ color: "#171A18" }}>
              AI is analyzing your complete profile...
            </div>
            <div className="text-xs mt-1" style={{ color: "#6B6F68" }}>
              Evaluating skills, gaps, applications, and portfolio
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !result && (
          <div className="py-8 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#F0E8DD" }}
            >
              <AlertTriangle size={20} style={{ color: "#C98B5F" }} />
            </div>
            <div className="font-semibold text-sm mb-1" style={{ color: "#171A18" }}>
              Could not generate report
            </div>
            <div className="text-xs mb-3" style={{ color: "#6B6F68" }}>
              {error}
            </div>
            <button
              onClick={analyze}
              className="font-mono text-xs font-bold px-4 py-2 rounded-lg border"
              style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Score + Summary */}
            <div className="flex items-center gap-5 flex-shrink-0">
              <ScoreRing score={result.score} />
              <div className="min-w-0">
                <div className="font-semibold text-[15px] mb-1" style={{ color: "#171A18" }}>
                  {result.summary}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-start gap-1.5">
                    <Check size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#244B35" }} />
                    <span className="text-xs" style={{ color: "#6B6F68" }}>
                      <strong style={{ color: "#244B35" }}>Strength:</strong> {result.topStrength}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#C98B5F" }} />
                    <span className="text-xs" style={{ color: "#6B6F68" }}>
                      <strong style={{ color: "#C98B5F" }}>Focus area:</strong> {result.biggestWeakness}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Career Narrative */}
            <div
              className="flex-1 rounded-xl p-4"
              style={{ background: "linear-gradient(135deg, #F0F5EC, #FAFCF7)", border: "1px solid #D6E3CE" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Award size={14} style={{ color: "#244B35" }} />
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#244B35" }}>
                  Career Narrative
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#171A18" }}>
                {result.careerNarrative}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Recommendations */}
      {result && result.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-[18px] border p-6 bg-white relative overflow-hidden"
          style={{ borderColor: "#E6E3D7", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}
        >
          <div
            className="absolute top-0 left-0 w-full h-1"
            style={{ background: "linear-gradient(90deg, #8A6FB8, #C8B5DE)" }}
          />
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase"
              style={{ color: "#8A6FB8" }}
            >
              Action Plan
            </span>
          </div>
          <div className="font-semibold text-[18px] tracking-tight mb-4" style={{ color: "#171A18" }}>
            {result.recommendations.length} Prioritized Recommendations
          </div>
          <div className="flex flex-col gap-3">
            {result.recommendations.map((rec, i) => (
              <RecommendationCard key={rec.id} rec={rec} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
