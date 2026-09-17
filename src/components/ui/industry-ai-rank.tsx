"use client";
import { useCallback, useState } from "react";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { ListSkeleton } from "@/components/ui/skeleton";
import { rankIndustryCandidates, type IndustryCandidateRank } from "@/lib/ai-opportunity-matcher";
import { ProvenanceBadge } from "@/components/ui/ai-provenance";

type Applicant = { id: string; candidate: { name: string }; matchedSkills: string[]; missingSkills: string[]; matchScore: number };

export default function IndustryAIRank({
  oppTitle,
  requiredSkills,
  applicants,
}: {
  oppTitle: string;
  requiredSkills: string[];
  applicants: Applicant[];
}) {
  const [ranks, setRanks] = useState<IndustryCandidateRank[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const r = await rankIndustryCandidates(
        oppTitle,
        requiredSkills,
        applicants.map((a) => ({ id: String(a.id), candidateName: a.candidate.name, matchedSkills: a.matchedSkills, missingSkills: a.missingSkills, matchScore: a.matchScore })),
      );
      setRanks(r);
    } finally {
      setLoading(false);
    }
  }, [oppTitle, requiredSkills, applicants]);

  if (applicants.length === 0) return null;

  const rankById = new Map((ranks ?? []).map((r) => [r.candidateId, r]));

  return (
    <div className="rounded-[18px] border p-5 bg-white" style={{ borderColor: "#E6E3D7" }}>
      <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: "#244B35" }}>
        <Sparkles size={14} /> Candidate ranking
        {ranks && <ProvenanceBadge value="ai" />}
      </div>
      <p className="text-xs mt-1 mb-3" style={{ color: "#6B6F68" }}>
        AI re-ranks by evidence + skill fit — names stay blind until shortlisted.
      </p>
      <button onClick={run} disabled={loading} className="font-mono text-xs font-bold px-4 py-2 rounded-lg text-white disabled:opacity-50 inline-flex items-center gap-2" style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />} {loading ? "Ranking…" : `Re-rank ${applicants.length}`}
      </button>
      {loading && !ranks && (
        <div className="mt-4">
          <ListSkeleton rows={3} />
        </div>
      )}
      {ranks && ranks.length > 0 && (
        <div className="mt-4 grid gap-2">
          {applicants
            .slice()
            .sort((a, b) => (rankById.get(String(b.id))?.overallFit ?? b.matchScore) - (rankById.get(String(a.id))?.overallFit ?? a.matchScore))
            .slice(0, 6)
            .map((a) => {
              const r = rankById.get(String(a.id));
              return (
                <div key={String(a.id)} className="rounded-xl border p-3 flex items-start justify-between gap-3" style={{ borderColor: "#E6E3D7" }}>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "#171A18" }}>{a.candidate.name}</div>
                    {r ? (
                      <>
                        <div className="text-xs mt-1" style={{ color: "#171A18" }}>{r.whyHire}</div>
                        {r.watchouts.length > 0 && <div className="text-[11px] mt-1" style={{ color: "#9A9D94" }}>Watch: {r.watchouts.join(" · ")}</div>}
                      </>
                    ) : (
                      <div className="text-xs mt-1" style={{ color: "#9A9D94" }}>{a.matchedSkills.slice(0, 3).join(", ") || "No matched skills"}</div>
                    )}
                  </div>
                  <div className="font-mono text-xs font-bold px-2 py-1 rounded-md shrink-0" style={{ background: "#DCE6D0", color: "#16301F" }}>{r?.overallFit ?? a.matchScore}% fit</div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
