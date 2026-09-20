import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, MessageSquare, ExternalLink } from "lucide-react";
import type { ProjectSubmission } from "@/lib/faculty-api";
import { facultyApi } from "@/lib/faculty-api";

function Tag({ children, cls }: { children: React.ReactNode; cls?: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${cls || ""}`}>{children}</span>;
}

const statusCls: Record<string, string> = {
  "pending review": "bg-[#EDEBE0] text-[#6B6F68]",
  "verified": "bg-[#DCE6D0] text-[#16301F]",
  "needs revision": "bg-[#F0E8DD] text-[#7a3f1a]",
};

function showToast(msg: string, bg: string) {
  const el = document.createElement("div");
  el.className = "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white font-semibold text-sm shadow-lg";
  el.style.background = bg;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

export default function ProjectReviewSection({ projects: initialProjects }: { projects: ProjectSubmission[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const pending = projects.filter((p) => p.status === "pending review");
  const reviewed = projects.filter((p) => p.status !== "pending review");

  const handleDecision = async (id: string, action: "verified" | "needs revision") => {
    const notes = notesMap[id] || "";
    try {
      await facultyApi.decideProject(id, action, notes);
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status: action, reviewComment: notes } : p));
      showToast(action === "verified" ? "Project verified!" : "Changes requested.", "#244B35");
    } catch {
      showToast("Failed to update.", "#7a3f1a");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending Review", value: pending.length, color: "#6B6F68", bg: "#EDEBE0" },
          { label: "Verified", value: reviewed.filter((p) => p.status === "verified").length, color: "#244B35", bg: "#DCE6D0" },
          { label: "Needs Revision", value: reviewed.filter((p) => p.status === "needs revision").length, color: "#7a3f1a", bg: "#F0E8DD" },
        ].map((s) => (
          <div key={s.label} className="rounded-[14px] p-4 text-center border-l-[3px] hover:shadow-md transition-shadow" style={{ background: s.bg, borderLeftColor: s.color }}>
            <div className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: "#6B6F68" }}>{s.label}</div>
            <div className="font-bold text-2xl" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Project Cards */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-[18px] border p-6 bg-white relative overflow-hidden" style={{ borderColor: "#D6E3CE", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #244B35, #8A6FB8)" }} />
        <div className="font-mono text-[11px] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: "#244B35" }}>📋 Project Review</div>
        <div className="font-semibold text-[22px] tracking-tight mt-1 mb-5" style={{ color: "#171A18" }}>Student Project Submissions</div>

        <div className="flex flex-col gap-4">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border p-5 hover:shadow-md transition-shadow"
              style={{ borderColor: p.status === "verified" ? "#DCE6D0" : p.status === "needs revision" ? "#E8C7AE" : "#E6E3D7",
                background: "linear-gradient(180deg, #FDFCFA 0%, #FAFCF7 100%)" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                    style={{ background: p.status === "verified" ? "#DCE6D0" : p.status === "needs revision" ? "#F0E8DD" : "#EDEBE0",
                      color: p.status === "verified" ? "#244B35" : p.status === "needs revision" ? "#7a3f1a" : "#171A18" }}>
                    {p.studentInitials}
                  </div>
                  <div>
                    <div className="font-bold text-[15px]" style={{ color: "#171A18" }}>{p.studentName}</div>
                    <div className="font-mono text-[11px]" style={{ color: "#6B6F68" }}>{p.projectTitle}</div>
                  </div>
                </div>
                <Tag cls={statusCls[p.status] || ""}>{p.status}</Tag>
              </div>

              <p className="text-xs mb-2" style={{ color: "#6B6F68" }}>{p.description}</p>
              <div className="flex items-center gap-3 mb-3">
                <Tag cls="bg-[#C8B5DE] text-[#4d3a74]">Target: {p.targetSkill}</Tag>
                <span className="font-mono text-[11px]" style={{ color: "#9A9D94" }}>Submitted: {p.submittedDate}</span>
              </div>

              {p.reviewComment && (
                <div className="rounded-lg p-3 mb-3 text-xs" style={{ background: "#FAFAF7", border: "1px solid #E6E3D7", color: "#6B6F68" }}>
                  <span className="font-semibold">Review:</span> {p.reviewComment}
                </div>
              )}

              {p.status === "pending review" && (
                <div className="pt-3 border-t" style={{ borderColor: "#EDEBE0" }}>
                  <div className="mb-2">
                    <textarea
                      value={notesMap[p.id] || ""}
                      onChange={(e) => setNotesMap((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="Add feedback notes (optional)..."
                      rows={2}
                      className="w-full rounded-lg border px-3 py-2 text-xs resize-none"
                      style={{ borderColor: "#E6E3D7" }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDecision(p.id, "verified")}
                      className="font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-all hover:shadow-sm flex items-center gap-1"
                      style={{ background: "#DCE6D0", color: "#16301F" }}>
                      <Check size={12} /> Verify Project
                    </button>
                    <button onClick={() => handleDecision(p.id, "needs revision")}
                      className="font-semibold text-[11px] px-3 py-1.5 rounded-lg border transition-all hover:bg-[#FAFAF7] flex items-center gap-1"
                      style={{ borderColor: "#E6E3D7" }}>
                      <X size={12} /> Request Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
