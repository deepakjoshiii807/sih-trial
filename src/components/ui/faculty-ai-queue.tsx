"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { ListSkeleton } from "@/components/ui/skeleton";
import { summarizeVerificationQueue, type FacultyQueueCaseSummary } from "@/lib/ai-opportunity-matcher";
import { ProvenanceBadge } from "@/components/ui/ai-provenance";

type Item = { id: string; title: string; description: string; skillsClaimed: string[]; status: string };

export default function FacultyAIQueue({ items }: { items: Item[] }) {
  const [cases, setCases] = useState<FacultyQueueCaseSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  const pending = items.filter((x) => x.status === "pending");

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const r = await summarizeVerificationQueue(pending);
      setCases(r);
    } finally {
      setLoading(false);
    }
  }, [pending]);

  if (pending.length === 0) return null;

  const byId = new Map((cases ?? []).map((c) => [c.id, c]));

  return (
    <div className="rounded-[18px] border p-5 bg-white" style={{ borderColor: "#E6E3D7" }}>
      <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: "#244B35" }}>
        <Sparkles size={14} /> Queue intelligence
        {cases && <ProvenanceBadge value="ai" />}
      </div>
      <p className="text-xs mt-1 mb-3" style={{ color: "#6B6F68" }}>
        AI summaries help you triage — the decision is still yours. <span className="font-semibold">Model suggestions are advisory.</span>
      </p>
      <button
        onClick={run}
        disabled={loading}
        className="font-mono text-xs font-bold px-4 py-2 rounded-lg text-white disabled:opacity-50 inline-flex items-center gap-2"
        style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {loading ? "Analyzing…" : `Summarize ${pending.length} pending`}
      </button>
      {loading && !cases && (
        <div className="mt-4">
          <ListSkeleton rows={3} />
        </div>
      )}
      {cases && cases.length > 0 && (
        <div className="mt-4 grid gap-3">
          {pending.slice(0, 8).map((it) => {
            const ai = byId.get(it.id);
            return (
              <div key={it.id} className="rounded-xl border p-3" style={{ borderColor: ai?.riskLevel === "high" ? "#E8C7AE" : ai?.riskLevel === "medium" ? "#E8D36B" : "#E6E3D7" }}>
                <div className="font-semibold text-sm" style={{ color: "#171A18" }}>{it.title}</div>
                {ai ? (
                  <>
                    <div className="text-xs mt-1" style={{ color: "#171A18" }}>{ai.summary}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: ai.riskLevel === "high" ? "#E8C7AE" : ai.riskLevel === "medium" ? "#E8D36B" : "#DCE6D0", color: ai.riskLevel === "high" ? "#7a3f1a" : "#16301F" }}>
                        {ai.riskLevel} risk
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[#EDEBE0]" style={{ color: "#6B6F68" }}>suggests: {ai.suggestedDecision}</span>
                    </div>
                    {ai.keySignals.length > 0 && <ul className="text-[11px] mt-2 list-disc pl-4" style={{ color: "#6B6F68" }}>{ai.keySignals.map((s, i) => <li key={i}>{s}</li>)}</ul>}
                  </>
                ) : (
                  <div className="text-[11px] mt-1" style={{ color: "#9A9D94" }}>{it.description.slice(0, 140)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
