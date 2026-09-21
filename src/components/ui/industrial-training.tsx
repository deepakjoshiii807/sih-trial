import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, Calendar, Clock, MapPin, Users, Award, Briefcase,
  CheckCircle2, Star, Search, BookmarkPlus, Send, Stethoscope,
} from "lucide-react";

interface TrainingItem {
  id: string;
  title: string;
  organization: string;
  location: string;
  type: "Hospital" | "Research Lab" | "Industry" | "Government";
  duration: string;
  startDate: string;
  deadline: string;
  description: string;
  skillsRelevant: string[];
  status: "open" | "closing" | "upcoming";
  slots: number;
  interested: number;
  stipend: string;
  mentorship: boolean;
  certificate: boolean;
}

const demoTrainings: TrainingItem[] = [
  {
    id: "it-1", title: "Clinical Research Training at CCRAS",
    organization: "CCRAS — Central Council for Research in Ayurvedic Sciences",
    location: "New Delhi", type: "Research Lab", duration: "1 month",
    startDate: "Oct 15, 2025", deadline: "Oct 5, 2025",
    description: "Hands-on research training in clinical trial design, data collection, and statistical analysis at CCRAS headquarters. Work alongside senior researchers on ongoing herbal medicine studies.",
    skillsRelevant: ["Clinical Research", "Data Analysis", "Statistical Analysis", "Research Methodology"],
    status: "open", slots: 8, interested: 12, stipend: "₹15,000/month", mentorship: true, certificate: true,
  },
  {
    id: "it-2", title: "Hospital Administration & Healthcare Management",
    organization: "AIIMS — All India Institute of Medical Sciences",
    location: "New Delhi", type: "Hospital", duration: "2 weeks",
    startDate: "Nov 1, 2025", deadline: "Oct 25, 2025",
    description: "Observe and participate in hospital administration workflows, patient management systems, and healthcare quality assurance processes at AIIMS.",
    skillsRelevant: ["Healthcare Management", "Patient Care", "Quality Assurance", "EHR Systems"],
    status: "open", slots: 5, interested: 8, stipend: "₹10,000/month", mentorship: true, certificate: true,
  },
  {
    id: "it-3", title: "Pharmacovigilance Internship at CDSCO",
    organization: "CDSCO — Central Drugs Standard Control Organisation",
    location: "New Delhi", type: "Government", duration: "3 months",
    startDate: "Jan 5, 2026", deadline: "Dec 15, 2025",
    description: "Learn adverse drug reaction monitoring, signal detection, and regulatory compliance hands-on at India's national regulatory body for pharmaceuticals.",
    skillsRelevant: ["Pharmacovigilance", "Regulatory Affairs", "Drug Safety", "Scientific Writing"],
    status: "upcoming", slots: 4, interested: 6, stipend: "₹20,000/month", mentorship: true, certificate: true,
  },
  {
    id: "it-4", title: "Medical Device Testing & Quality Lab",
    organization: "NABL Accredited Lab — BIS",
    location: "Mumbai", type: "Industry", duration: "6 weeks",
    startDate: "Nov 20, 2025", deadline: "Nov 10, 2025",
    description: "Work in an NABL-accredited testing laboratory. Learn ISO 13485 quality management, biocompatibility testing, and medical device regulatory requirements.",
    skillsRelevant: ["Quality Assurance", "Medical Devices", "ISO Standards", "Lab Techniques"],
    status: "open", slots: 6, interested: 4, stipend: "₹12,000/month", mentorship: false, certificate: true,
  },
  {
    id: "it-5", title: "Herbal Drug Formulation & Standardization",
    organization: "NIPER — National Institute of Pharmaceutical Education & Research",
    location: "Hyderabad", type: "Research Lab", duration: "2 months",
    startDate: "Dec 1, 2025", deadline: "Nov 20, 2025",
    description: "Learn herbal drug extraction, formulation development, and HPLC-based standardization techniques at NIPER's pharmacognosy division.",
    skillsRelevant: ["Pharmacognosy", "Drug Formulation", "HPLC", "Quality Control"],
    status: "upcoming", slots: 5, interested: 3, stipend: "₹18,000/month", mentorship: true, certificate: true,
  },
];

export default function IndustrialTraining() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const filtered = demoTrainings.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.organization.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeIcon: Record<string, React.ReactNode> = {
    Hospital: <Stethoscope size={14} />,
    "Research Lab": <Building2 size={14} />,
    Industry: <Briefcase size={14} />,
    Government: <Award size={14} />,
  };

  const statusColor: Record<string, { bg: string; text: string }> = {
    open: { bg: "#DCE6D0", text: "#16301F" },
    closing: { bg: "#E8D36B", text: "#5c4a08" },
    upcoming: { bg: "#EDEBE0", text: "#6B6F68" },
  };

  const toast = (msg: string, color = "#244B35") => {
    const el = document.createElement("div");
    el.className = "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white font-semibold text-sm shadow-lg";
    el.style.background = color;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Available", value: demoTrainings.filter(t => t.status === "upcoming" ? false : true).length, color: "#244B35", bg: "#DCE6D0" },
          { label: "Hospitals", value: demoTrainings.filter(t => t.type === "Hospital").length, color: "#C98B5F", bg: "#F0E8DD" },
          { label: "Research Labs", value: demoTrainings.filter(t => t.type === "Research Lab").length, color: "#4d3a74", bg: "#C8B5DE30" },
          { label: "With Stipend", value: demoTrainings.filter(t => t.stipend !== "None").length, color: "#5c4a08", bg: "#E8D36B30" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg }}>
            <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "#6B6F68" }}>{s.label}</div>
            <div className="font-bold text-2xl" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto">
          {["all", "open", "closing", "upcoming"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${filter === f ? "text-white" : ""}`}
              style={filter === f ? { background: "#244B35" } : { background: "#EDEBE0", color: "#6B6F68" }}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9A9D94" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search training opportunities..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E6E3D7" }} />
        </div>
      </div>

      {/* Training Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((t, idx) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="rounded-[16px] border p-5 hover:shadow-md transition-shadow relative overflow-hidden"
            style={{ borderColor: "#D6E3CE", background: "linear-gradient(180deg, #FDFCFA 0%, #FAFCF7 100%)" }}>
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #244B35, #DCE6D0)" }} />

            {/* Header */}
            <div className="flex items-start justify-between mb-2 mt-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#DCE6D0", color: "#244B35" }}>
                  {typeIcon[t.type]}
                </div>
                <div>
                  <div className="font-semibold text-[15px] leading-tight" style={{ color: "#171A18" }}>{t.title}</div>
                  <div className="text-xs" style={{ color: "#6B6F68" }}>{t.organization}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: statusColor[t.status].bg, color: statusColor[t.status].text }}>
                {t.status.toUpperCase()}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs mb-3 line-clamp-2" style={{ color: "#6B6F68" }}>{t.description}</p>

            {/* Meta */}
            <div className="flex flex-wrap gap-3 font-mono text-[11px] mb-3" style={{ color: "#6B6F68" }}>
              <span className="inline-flex items-center gap-1"><MapPin size={11} /> {t.location}</span>
              <span className="inline-flex items-center gap-1"><Clock size={11} /> {t.duration}</span>
              <span className="inline-flex items-center gap-1"><Calendar size={11} /> {t.startDate}</span>
              <span className="inline-flex items-center gap-1"><Users size={11} /> {t.interested}/{t.slots} slots</span>
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1 mb-3">
              {t.skillsRelevant.map(s => (
                <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "#DCE6D0", color: "#16301F" }}>{s}</span>
              ))}
            </div>

            {/* Benefits */}
            <div className="flex items-center gap-3 mb-3 text-xs" style={{ color: "#6B6F68" }}>
              <span className="font-semibold" style={{ color: "#244B35" }}>{t.stipend}</span>
              {t.mentorship && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "#EAE3F4", color: "#4d3a74" }}>MENTORSHIP</span>}
              {t.certificate && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "#E8D36B30", color: "#5c4a08" }}>CERTIFICATE</span>}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#EDEBE0" }}>
              <span className="font-mono text-[10px]" style={{ color: "#9A9D94" }}>Deadline: {t.deadline}</span>
              <div className="flex gap-2">
                <button onClick={() => { setBookmarked(prev => { const n = new Set(prev); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; }); toast(bookmarked.has(t.id) ? "Removed" : "Bookmarked!"); }}
                  className="p-1.5 rounded-lg transition-all hover:shadow-sm"
                  style={{ background: bookmarked.has(t.id) ? "#E8D36B30" : "#EDEBE0" }}>
                  <BookmarkPlus size={13} style={{ color: bookmarked.has(t.id) ? "#5c4a08" : "#6B6F68" }} />
                </button>
                <button onClick={() => { setApplied(prev => new Set(prev).add(t.id)); toast("Application submitted!"); }}
                  disabled={applied.has(t.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:shadow-sm"
                  style={applied.has(t.id) ? { background: "#DCE6D0", color: "#16301F" } : { background: "#244B35", color: "#fff" }}>
                  {applied.has(t.id) ? <><CheckCircle2 size={12} /> Applied</> : <><Send size={12} /> Apply</>}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
