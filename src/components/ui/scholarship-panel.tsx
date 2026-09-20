"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { GraduationCap, RefreshCw, ExternalLink } from "lucide-react";
import { ListSkeleton } from "@/components/ui/skeleton";
import { discoverScholarships, type ScholarshipHit } from "@/lib/ai-opportunity-matcher";
import { ProvenanceBadge } from "@/components/ui/ai-provenance";
import type { StudentDashboard } from "@/lib/student-api";

export default function ScholarshipPanel({ dashboard }: { dashboard: StudentDashboard }) {
  const [items, setItems] = useState<ScholarshipHit[]>([]);
  const [source, setSource] = useState<"ai" | "deterministic" | "cache">("deterministic");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await discoverScholarships(dashboard);
      setItems(r.items);
      setSource(r.source);
    } finally {
      setLoading(false);
    }
  }, [dashboard]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loading && items.length === 0) {
    return (
      <div className="rounded-[18px] border p-6 bg-white" style={{ borderColor: "#E6E3D7" }}>
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: "#8A6FB8" }}>
          <GraduationCap size={14} /> Scholarships
        </div>
        <p className="text-sm mt-2" style={{ color: "#6B6F68" }}>
          No scholarships in the catalog yet. An admin can add them; matched results appear automatically for your course and skills.
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[18px] border p-6 bg-white relative overflow-hidden" style={{ borderColor: "#DED6EC" }}>
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #8A6FB8, #C8B5DE)" }} />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: "#8A6FB8" }}>
          <GraduationCap size={14} /> Scholarships matched to your profile
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && <ProvenanceBadge value={source === "deterministic" ? "deterministic" : source} />}
          <button onClick={load} disabled={loading} className="p-1 rounded-md hover:bg-[#F0F5EC]" title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} style={{ color: "#6B6F68" }} />
          </button>
        </div>
      </div>
      <p className="text-[11px] mb-3" style={{ color: "#9A9D94" }}>From the verified catalog — AI only personalizes the fit explanation when available.</p>
      {loading && items.length === 0 ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="grid gap-3">
          {items.map((s) => (
            <div key={s.id} className="rounded-xl border p-4 hover:shadow-sm transition-shadow" style={{ borderColor: "#E6E3D7" }}>
              <div className="font-semibold text-sm" style={{ color: "#171A18" }}>{s.title}</div>
              <div className="text-xs" style={{ color: "#6B6F68" }}>{s.provider} {s.amount ? `· ${s.amount}` : ""}</div>
              <div className="text-xs mt-2" style={{ color: "#171A18" }}><span className="font-semibold">Why you match:</span> {s.whyYouMatch}</div>
              <div className="text-[11px] mt-1" style={{ color: "#9A9D94" }}>{s.eligibility}</div>
              <div className="flex items-center gap-3 mt-2">
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#244B35" }}>
                    View <ExternalLink size={12} />
                  </a>
                )}
                <button
                  onClick={() => {
                    const el = document.createElement("div");
                    el.className = "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white font-semibold text-sm shadow-lg";
                    el.style.background = "#244B35";
                    el.textContent = `Application submitted for ${s.title}!`;
                    document.body.appendChild(el);
                    setTimeout(() => el.remove(), 2500);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90"
                  style={{ background: "#8A6FB8" }}
                >
                  Apply
                </button>
              </div>
              <div className="font-mono text-[10px] mt-2" style={{ color: "#9A9D94" }}>{s.confidence}% fit</div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
