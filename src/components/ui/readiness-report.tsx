import * as React from "react";
import { Printer, X } from "lucide-react";
import { useModalA11y } from "@/components/ui/use-modal-a11y";

interface ReadinessReportModalProps {
  open: boolean;
  onClose: () => void;
  student: { name: string; initials: string; course: string; year: string; institution: string; targetRole: string };
  readiness: { label: string; score: number; matched: number; total: number; explanation: string };
  skills: { name: string; category: string; origin: string; confidence: number }[];
  gaps: { name: string; severity: string; current: number; required: number }[];
  evidence: { verified: number; total: number };
}

/**
 * Printable readiness report. The modal renders a clean document (id
 * `l2l-print-report`) and the global print CSS hides everything else, so
 * "Print / Save as PDF" produces a neat one-page report.
 */
export default function ReadinessReportModal({ open, onClose, student, readiness, skills, gaps, evidence }: ReadinessReportModalProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(open, onClose);

  if (!open) return null;

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="l2l-report-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div className="relative w-full sm:max-w-2xl rounded-t-[20px] sm:rounded-[20px] bg-white max-h-[90vh] overflow-y-auto shadow-2xl" style={{ borderColor: "#E6E3D7" }}>
        {/* Toolbar (hidden when printing) */}
        <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white p-4" style={{ borderColor: "#EDEBE0" }}>
          <div className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9A9D94" }}>Readiness report</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="font-mono text-xs font-bold px-4 py-2 rounded-lg text-white inline-flex items-center gap-2 transition-all hover:shadow-md"
              style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}
            >
              <Printer size={13} /> Print / Save as PDF
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#FAFAF7]" style={{ borderColor: "#E6E3D7" }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Printable document */}
        <div id="l2l-print-report" className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b-2 pb-4" style={{ borderColor: "#244B35" }}>
            <div>
              <div className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "#244B35" }}>Learn2Lead · Skill Readiness Report</div>
              <h1 id="l2l-report-title" className="mt-1 text-[22px] font-bold tracking-tight" style={{ color: "#171A18" }}>{student.name}</h1>
              <div className="text-xs mt-0.5" style={{ color: "#6B6F68" }}>{student.course} / {student.year} · {student.institution}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase" style={{ color: "#9A9D94" }}>Generated</div>
              <div className="text-xs font-semibold" style={{ color: "#171A18" }}>{today}</div>
              <div className="mt-2 inline-block rounded-lg px-3 py-1.5 text-center" style={{ background: "#DCE6D0" }}>
                <div className="font-mono text-[9px] uppercase" style={{ color: "#244B35" }}>Readiness</div>
                <div className="font-bold text-lg leading-none" style={{ color: "#16301F" }}>{readiness.score}/100</div>
              </div>
            </div>
          </div>

          {/* Target role summary */}
          <div className="mt-5 rounded-xl border p-4" style={{ borderColor: "#E6E3D7", background: "#FAFAF7" }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: "#9A9D94" }}>Target role</div>
                <div className="font-semibold text-[15px]" style={{ color: "#171A18" }}>{student.targetRole}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: "#9A9D94" }}>Skills matched</div>
                <div className="font-semibold text-[15px]" style={{ color: "#244B35" }}>{readiness.matched} of {readiness.total}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: "#9A9D94" }}>Evidence</div>
                <div className="font-semibold text-[15px]" style={{ color: "#244B35" }}>{evidence.verified} verified / {evidence.total}</div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed" style={{ color: "#6B6F68" }}>{readiness.explanation}</p>
          </div>

          {/* Skills table */}
          <h2 className="mt-6 font-semibold text-[15px]" style={{ color: "#171A18" }}>Skill Passport</h2>
          <table className="mt-2 w-full text-left text-xs">
            <thead>
              <tr className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>
                <th className="pb-2 border-b" style={{ borderColor: "#E6E3D7" }}>Skill</th>
                <th className="pb-2 border-b" style={{ borderColor: "#E6E3D7" }}>Category</th>
                <th className="pb-2 border-b" style={{ borderColor: "#E6E3D7" }}>Origin</th>
                <th className="pb-2 border-b text-right" style={{ borderColor: "#E6E3D7" }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s) => (
                <tr key={s.name}>
                  <td className="py-2 font-semibold" style={{ color: "#171A18" }}>{s.name}</td>
                  <td className="py-2" style={{ color: "#6B6F68" }}>{s.category}</td>
                  <td className="py-2" style={{ color: s.origin === "evidence" ? "#244B35" : "#6B6F68" }}>{s.origin === "evidence" ? "✓ Verified" : "Self-declared"}</td>
                  <td className="py-2 text-right font-mono font-bold" style={{ color: "#171A18" }}>{s.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Gaps table */}
          <h2 className="mt-6 font-semibold text-[15px]" style={{ color: "#171A18" }}>Skill Gaps to Close</h2>
          <table className="mt-2 w-full text-left text-xs">
            <thead>
              <tr className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>
                <th className="pb-2 border-b" style={{ borderColor: "#E6E3D7" }}>Skill</th>
                <th className="pb-2 border-b" style={{ borderColor: "#E6E3D7" }}>Severity</th>
                <th className="pb-2 border-b text-right" style={{ borderColor: "#E6E3D7" }}>Current → Required</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((g) => (
                <tr key={g.name}>
                  <td className="py-2 font-semibold" style={{ color: "#171A18" }}>{g.name}</td>
                  <td className="py-2"><span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: g.severity === "High" ? "#E8C7AE" : "#E8D36B", color: g.severity === "High" ? "#7a3f1a" : "#5c4a08" }}>{g.severity}</span></td>
                  <td className="py-2 text-right font-mono font-bold" style={{ color: "#6B6F68" }}>{g.current}% → {g.required}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 border-t pt-3 text-center font-mono text-[9px] tracking-widest uppercase" style={{ borderColor: "#EDEBE0", color: "#9A9D94" }}>
            Generated by Learn2Lead · All India Institute of Ayurveda
          </div>
        </div>
      </div>
    </div>
  );
}