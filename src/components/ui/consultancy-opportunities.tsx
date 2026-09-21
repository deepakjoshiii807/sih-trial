import { useState } from "react";
import { motion } from "framer-motion";
import {
  Handshake, Calendar, Clock, MapPin, Users, DollarSign,
  CheckCircle2, Search, BookmarkPlus, Send, Building2, FileText,
} from "lucide-react";

interface ConsultancyItem {
  id: string;
  title: string;
  organization: string;
  location: string;
  type: "Curriculum" | "Policy" | "Accreditation" | "Research Advisory";
  duration: string;
  deadline: string;
  description: string;
  skillsRelevant: string[];
  status: "open" | "closing" | "upcoming";
  budget: string;
  slots: number;
  interested: number;
  remote: boolean;
}

const demoConsultancies: ConsultancyItem[] = [
  {
    id: "c-1", title: "BAMS Curriculum Modernization Consultancy",
    organization: "NCISM — National Commission for Indian System of Medicine",
    location: "New Delhi", type: "Curriculum", duration: "3 months",
    deadline: "Nov 15, 2025",
    description: "Seeking faculty consultants to modernize BAMS pharmacology curriculum. Review current syllabus, propose competency-based updates, and align with industry skill demands.",
    skillsRelevant: ["Pharmacology", "Curriculum Design", "Scientific Writing", "CBME"],
    status: "open", budget: "₹2,50,000", slots: 4, interested: 6, remote: true,
  },
  {
    id: "c-2", title: "NAAC Accreditation Documentation Review",
    organization: "Banaras Hindu University",
    location: "Varanasi", type: "Accreditation", duration: "2 months",
    deadline: "Oct 30, 2025",
    description: "External expert to review and advise on NAAC accreditation documentation for the Faculty of Ayurveda. Assess IQAC processes and suggest improvements.",
    skillsRelevant: ["Quality Assurance", "Accreditation", "Academic Administration"],
    status: "open", budget: "₹1,80,000", slots: 2, interested: 3, remote: false,
  },
  {
    id: "c-3", title: "AYUSH Ministry Policy Advisory — Digital Health Integration",
    organization: "Ministry of AYUSH, Government of India",
    location: "New Delhi", type: "Policy", duration: "6 months",
    deadline: "Dec 1, 2025",
    description: "Advisory role for integrating digital health tools into AYUSH healthcare delivery. Develop policy recommendations for telemedicine and AI in traditional medicine.",
    skillsRelevant: ["Digital Health", "Policy Analysis", "Healthcare Management", "Telemedicine"],
    status: "upcoming", budget: "₹5,00,000", slots: 3, interested: 2, remote: true,
  },
  {
    id: "c-4", title: "Clinical Research Protocol Development",
    organization: "ICMR — Indian Council of Medical Research",
    location: "New Delhi", type: "Research Advisory", duration: "4 months",
    deadline: "Nov 25, 2025",
    description: "Expert consultant to develop clinical research protocols for multi-center herbal drug efficacy trials. Review statistical methodology and regulatory requirements.",
    skillsRelevant: ["Clinical Research", "Statistical Analysis", "Research Methodology", "Regulatory Affairs"],
    status: "open", budget: "₹3,50,000", slots: 2, interested: 4, remote: false,
  },
  {
    id: "c-5", title: "Skill Taxonomy Development for Ayurveda Practitioners",
    organization: "Skill India — Healthcare Sector Skill Council",
    location: "Mumbai", type: "Curriculum", duration: "2 months",
    deadline: "Oct 20, 2025",
    description: "Define a comprehensive skill taxonomy for Ayurveda practitioners aligned with industry requirements. Map competencies to job roles and create assessment frameworks.",
    skillsRelevant: ["Skill Taxonomy", "Competency Mapping", "Assessment Design", "Industry Alignment"],
    status: "closing", budget: "₹2,00,000", slots: 3, interested: 5, remote: true,
  },
];

export default function ConsultancyOpportunities() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const filtered = demoConsultancies.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.organization.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeColor: Record<string, { bg: string; text: string }> = {
    Curriculum: { bg: "#C8B5DE", text: "#4d3a74" },
    Policy: { bg: "#E8D36B", text: "#5c4a08" },
    Accreditation: { bg: "#DCE6D0", text: "#16301F" },
    "Research Advisory": { bg: "#E8C7AE", text: "#7a3f1a" },
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
          { label: "Open", value: demoConsultancies.filter(c => c.status === "open").length, color: "#244B35", bg: "#DCE6D0" },
          { label: "Budget Range", value: "₹2-5L", color: "#5c4a08", bg: "#E8D36B30" },
          { label: "Remote", value: demoConsultancies.filter(c => c.remote).length, color: "#4d3a74", bg: "#C8B5DE30" },
          { label: "On-Site", value: demoConsultancies.filter(c => !c.remote).length, color: "#C98B5F", bg: "#F0E8DD" },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search consultancy opportunities..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E6E3D7" }} />
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c, idx) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="rounded-[16px] border p-5 hover:shadow-md transition-shadow relative overflow-hidden"
            style={{ borderColor: "#E6DDD5", background: "linear-gradient(180deg, #FDFCFA 0%, #FDF8F3 100%)" }}>
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #C98B5F, #E8D36B)" }} />

            {/* Header */}
            <div className="flex items-start justify-between mb-2 mt-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: typeColor[c.type].bg, color: typeColor[c.type].text }}>{c.type.toUpperCase()}</span>
                  {c.remote && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "#DCE6D0", color: "#16301F" }}>REMOTE</span>}
                </div>
                <div className="font-semibold text-[15px] leading-tight" style={{ color: "#171A18" }}>{c.title}</div>
                <div className="text-xs" style={{ color: "#6B6F68" }}>{c.organization}</div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: statusColor[c.status].bg, color: statusColor[c.status].text }}>
                {c.status.toUpperCase()}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs mb-3 line-clamp-2" style={{ color: "#6B6F68" }}>{c.description}</p>

            {/* Meta */}
            <div className="flex flex-wrap gap-3 font-mono text-[11px] mb-3" style={{ color: "#6B6F68" }}>
              <span className="inline-flex items-center gap-1"><MapPin size={11} /> {c.location}</span>
              <span className="inline-flex items-center gap-1"><Clock size={11} /> {c.duration}</span>
              <span className="inline-flex items-center gap-1"><DollarSign size={11} /> {c.budget}</span>
              <span className="inline-flex items-center gap-1"><Users size={11} /> {c.interested}/{c.slots} slots</span>
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1 mb-3">
              {c.skillsRelevant.map(s => (
                <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "#EDEBE0", color: "#6B6F68" }}>{s}</span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#EDEBE0" }}>
              <span className="font-mono text-[10px]" style={{ color: "#9A9D94" }}>Deadline: {c.deadline}</span>
              <div className="flex gap-2">
                <button onClick={() => { setBookmarked(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; }); toast(bookmarked.has(c.id) ? "Removed" : "Bookmarked!"); }}
                  className="p-1.5 rounded-lg transition-all hover:shadow-sm"
                  style={{ background: bookmarked.has(c.id) ? "#E8D36B30" : "#EDEBE0" }}>
                  <BookmarkPlus size={13} style={{ color: bookmarked.has(c.id) ? "#5c4a08" : "#6B6F68" }} />
                </button>
                <button onClick={() => { setApplied(prev => new Set(prev).add(c.id)); toast("Proposal submitted!"); }}
                  disabled={applied.has(c.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:shadow-sm"
                  style={applied.has(c.id) ? { background: "#DCE6D0", color: "#16301F" } : { background: "#C98B5F", color: "#fff" }}>
                  {applied.has(c.id) ? <><CheckCircle2 size={12} /> Submitted</> : <><Send size={12} /> Submit Proposal</>}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
