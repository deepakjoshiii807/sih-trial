import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, ScanSearch, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";

import type { AnomalyFlag } from "@/lib/institution-api";
import { institutionApi } from "@/lib/institution-api";
import {
  auditEvidenceFlags,
  VERDICT_LABEL,
  type AuditVerdict,
  type EvidenceAuditReport,
} from "@/lib/ai-evidence-audit";
import { notifyDataChanged } from "@/lib/data-events";
import { ModelDisclaimer, ProvenanceBadge } from "@/components/ui/ai-provenance";

const verdictTone: Record<AuditVerdict, { bg: string; fg: string; border: string }> = {
  duplicate_likely: { bg: "#F7E2D8", fg: "#7a3f1a", border: "#E8C7AE" },
  inconsistent_likely: { bg: "#F7E2D8", fg: "#7a3f1a", border: "#E8C7AE" },
  outlier_likely: { bg: "#F6EFC8", fg: "#5c4a08", border: "#E8D36B" },
  pattern_likely: { bg: "#F6EFC8", fg: "#5c4a08", border: "#E8D36B" },
  insufficient_evidence: { bg: "#EDEBE0", fg: "#6B6F68", border: "#E0DCD0" },
  appears_legitimate: { bg: "#DCE6D0", fg: "#16301F", border: "#BFD2AF" },
};

function riskColor(risk: number): string {
  if (risk >= 60) return "#7a3f1a";
  if (risk >= 30) return "#B07A24";
  return "#244B35";
}

function SegBar({ pct, color }: { pct: number; color: string }) {
  const segments = 18;
  const filled = Math.round((pct / 100) * segments);
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className="w-[7px] h-[12px] rounded-[2px]"
          style={i < filled ? { background: color } : { background: "#EDEBE0" }}
        />
      ))}
    </div>
  );
}

function ActionButton({
  action,
  onDone,
}: {
  action: "resolve" | "escalate";
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDone(); // parent decides the target flag
      notifyDataChanged();
    } catch {
      setError("Action failed — backend unreachable.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-all hover:shadow-sm disabled:opacity-60"
        style={
          action === "resolve"
            ? { background: "#DCE6D0", color: "#16301F" }
            : { background: "#E8C7AE", color: "#7a3f1a" }
        }
      >
        {busy ? (
          <Loader2 size={12} className="inline animate-spin" />
        ) : action === "resolve" ? (
          "Mark Resolved"
        ) : (
          "Escalate"
        )}
      </button>
      {error && (
        <span className="font-mono text-[10px]" style={{ color: "#B0502F" }}>
          {error}
        </span>
      )}
    </div>
  );
}

export default function EvidenceAuditPanel({ flags }: { flags: AnomalyFlag[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<EvidenceAuditReport | null>(null);

  const pending = flags.filter((f) => f.status === "flagged" || f.status === "reviewing");
  const resolvedCount = flags.length - pending.length;

  const runAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const result = await auditEvidenceFlags(pending);
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI evidence audit failed.");
    } finally {
      setLoading(false);
    }
  }, [pending]);

  const decide = useCallback(
    (flagId: string, action: "resolve" | "escalate") => async () => {
      // Persist the AI's reasoning on the flag so the decision has a trail.
      const auditCase = report?.cases.find((c) => c.flagId === flagId);
      const note = auditCase
        ? `AI audit — ${VERDICT_LABEL[auditCase.verdict]} (${auditCase.confidence}%). ${auditCase.summary}`.slice(0, 400)
        : undefined;
      await institutionApi.reviewAnomaly(flagId, action, note);
    },
    [report],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Intro / CTA card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[18px] border p-6 bg-white relative overflow-hidden"
        style={{ borderColor: "#E6DDD5", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}
      >
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #C98B5F, #E8D36B)" }} />
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: "#C98B5F" }}>
          <ScanSearch size={14} /> AI Evidence Audit
        </div>
        <div className="font-semibold text-[22px] tracking-tight mt-2 mb-2" style={{ color: "#171A18" }}>
          Second-pass review of flagged records
        </div>
        <p className="text-sm max-w-[640px] leading-relaxed" style={{ color: "#6B6F68" }}>
          The rule engine flags suspicious evidence; the AI then re-reads each case as a skeptical
          auditor and gives a verdict, confidence, grounded rationale, and a suggested workflow
          action. It only sees flag metadata and the evidence note — not the raw files — and will
          say <em>insufficient evidence</em> rather than guess.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            type="button"
            onClick={runAudit}
            disabled={loading || pending.length === 0}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-md disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Auditing cases…" : `Run AI audit${pending.length ? ` (${pending.length} case${pending.length > 1 ? "s" : ""})` : ""}`}
          </button>
          <span className="font-mono text-[11px]" style={{ color: "#9A9D94" }}>
            <ProvenanceBadge value="ai" /> {pending.length} pending · {resolvedCount} already resolved
          </span>
        </div>
      </motion.div>

      {/* Error state */}
      {error && !report && (
        <div className="rounded-[16px] border p-5 bg-white" style={{ borderColor: "#E8C7AE" }}>
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} style={{ color: "#B0502F" }} className="mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: "#7a3f1a" }}>Audit could not be completed</div>
              <p className="text-xs leading-relaxed" style={{ color: "#6B6F68" }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {pending.length === 0 && !report && !loading && (
        <div className="rounded-[16px] border p-6 bg-white text-center" style={{ borderColor: "#E6DDD5" }}>
          <ShieldCheck size={22} className="mx-auto mb-2" style={{ color: "#244B35" }} />
          <div className="text-sm font-semibold" style={{ color: "#171A18" }}>No pending flags</div>
          <p className="text-xs mt-1" style={{ color: "#6B6F68" }}>
            Everything in the queue has been resolved or escalated.
          </p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {report && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-5"
          >
            {/* Summary strip */}
            <div className="rounded-[18px] border p-6 bg-white" style={{ borderColor: "#E6DDD5" }}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="flex-1">
                  <div className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: "#9A9D94" }}>Audit summary</div>
                  <p className="text-sm leading-relaxed" style={{ color: "#171A18" }}>{report.summary}</p>
                </div>
                <div className="shrink-0">
                  <div className="flex items-end gap-2">
                    <div className="font-bold text-4xl leading-none tracking-tight" style={{ color: riskColor(report.integrityRisk) }}>{report.integrityRisk}</div>
                    <div className="pb-1">
                      <SegBar pct={report.integrityRisk} color={riskColor(report.integrityRisk)} />
                      <div className="font-mono text-[10px] mt-1 tracking-widest uppercase" style={{ color: "#9A9D94" }}>Integrity risk</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {report.cases.map((c) => (
                  <span
                    key={c.flagId}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md"
                    style={{ background: verdictTone[c.verdict].bg, color: verdictTone[c.verdict].fg }}
                  >
                    {VERDICT_LABEL[c.verdict]} · {c.confidence}%
                  </span>
                ))}
              </div>
            </div>

            {/* Per-case cards */}
            {report.cases.map((c) => {
              const flag = flags.find((f) => f.id === c.flagId);
              if (!flag) return null;
              const tone = verdictTone[c.verdict];
              return (
                <motion.div
                  key={c.flagId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[18px] border bg-white p-5"
                  style={{ borderColor: "#E6DDD5", borderLeft: `4px solid ${tone.border}` }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: "#EDEBE0", color: "#171A18" }}>{flag.studentInitials}</div>
                      <div>
                        <div className="font-bold text-[15px]" style={{ color: "#171A18" }}>{flag.studentName}</div>
                        <div className="font-mono text-[11px]" style={{ color: "#6B6F68" }}>{flag.department} · {flag.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md" style={{ background: tone.bg, color: tone.fg }}>
                        {VERDICT_LABEL[c.verdict]}
                      </span>
                      <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md" style={{ background: "#EDEBE0", color: "#6B6F68" }}>
                        {flag.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <SegBar pct={c.confidence} color={tone.fg} />
                    <span className="font-mono text-[11px] font-bold" style={{ color: tone.fg }}>{c.confidence}% confidence</span>
                  </div>

                  <p className="text-sm leading-relaxed mb-3" style={{ color: "#171A18" }}>{c.summary}</p>

                  {c.rationale.length > 0 && (
                    <ul className="flex flex-col gap-1.5 mb-4">
                      {c.rationale.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: "#6B6F68" }}>
                          <span className="mt-[5px] w-1.5 h-1.5 rounded-[2px] shrink-0" style={{ background: tone.fg }} />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t flex-wrap gap-2" style={{ borderColor: "#EDEBE0" }}>
                    <span className="font-mono text-[11px]" style={{ color: "#9A9D94" }}>
                      Original evidence note: “{flag.evidence}”
                    </span>
                    {(flag.status === "flagged" || flag.status === "reviewing") &&
                      c.suggestedAction !== "review" && (
                        <ActionButton action={c.suggestedAction} onDone={decide(flag.id, c.suggestedAction)} />
                      )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      {report && <ModelDisclaimer />}
    </div>
  );
}
