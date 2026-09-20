import { useState } from "react";
import { X, Plus, MapPin, Clock, Calendar, Tag } from "lucide-react";
import type { OpportunityCategory } from "@/lib/faculty-api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (opp: {
    id: string;
    title: string;
    category: OpportunityCategory;
    organizer: string;
    location: string;
    duration: string;
    deadline: string;
    description: string;
    skillsRelevant: string[];
    status: "open";
    interested: number;
  }) => void;
}

const CATEGORIES: OpportunityCategory[] = ["FDP", "Industrial Training", "Consultancy", "Research Collaboration"];

export default function PostOpportunityModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<OpportunityCategory>("FDP");
  const [organizer, setOrganizer] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { facultyApi } = await import("@/lib/faculty-api");
      const result = await facultyApi.createOpportunity({
        title: title.trim(),
        category,
        organizer: organizer.trim(),
        location: location.trim(),
        duration: duration.trim(),
        deadline,
        description: description.trim(),
        skillsRelevant: skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      onCreated({
        id: result.id,
        title: title.trim(),
        category,
        organizer: organizer.trim(),
        location: location.trim(),
        duration: duration.trim(),
        deadline,
        description: description.trim(),
        skillsRelevant: skills.split(",").map((s) => s.trim()).filter(Boolean),
        status: "open",
        interested: 0,
      });
      onClose();
      // Show success toast
      const el = document.createElement("div");
      el.className = "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white font-semibold text-sm shadow-lg";
      el.style.background = "#244B35";
      el.textContent = "Opportunity posted successfully!";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#DCE6D0" }}>
              <Plus size={16} style={{ color: "#244B35" }} />
            </div>
            <h2 className="font-semibold text-lg" style={{ color: "#171A18" }}>Post Opportunity</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "#6B6F68" }}>Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. FDP on AI in Healthcare"
              className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#E6E3D7" }} />
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "#6B6F68" }}>Category</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${category === c ? "text-white" : "border"}`}
                  style={category === c ? { background: "#244B35" } : { borderColor: "#E6E3D7", color: "#6B6F68" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: "#6B6F68" }}>Organizer</label>
              <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder="e.g. AICTE"
                className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#E6E3D7" }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: "#6B6F68" }}>Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Online / New Delhi"
                className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#E6E3D7" }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: "#6B6F68" }}>Duration</label>
              <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2 weeks"
                className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#E6E3D7" }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: "#6B6F68" }}>Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#E6E3D7" }} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "#6B6F68" }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Describe the opportunity..."
              className="w-full rounded-xl border px-3 py-2 text-sm resize-none" style={{ borderColor: "#E6E3D7" }} />
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "#6B6F68" }}>Skills (comma-separated)</label>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Machine Learning, Python, Data Analysis"
              className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#E6E3D7" }} />
          </div>

          <button onClick={handleSubmit} disabled={!title.trim() || saving}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#244B35" }}>
            {saving ? "Posting..." : "Post Opportunity"}
          </button>
        </div>
      </div>
    </div>
  );
}
