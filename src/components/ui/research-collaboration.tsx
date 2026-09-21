import { useState } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical, Calendar, Clock, MapPin, Users, DollarSign,
  CheckCircle2, Search, BookmarkPlus, Send, FileText, ExternalLink,
} from "lucide-react";

interface ResearchItem {
  id: string;
  title: string;
  partners: string[];
  location: string;
  type: "Joint Research" | "Industry Sponsored" | "Grant-Funded" | "Academic Partnership";
  duration: string;
  deadline: string;
  description: string;
  skillsRelevant: string[];
  status: "open" | "closing" | "upcoming";
  funding: string;
  teamSize: number;
  interested: number;
  publications: boolean;
  patentPotential: boolean;
}

const demoResearch: ResearchItem[] = [
  {
    id: "r-1", title: "Herb-Drug Interaction Database Development",
    partners: ["AIIA New Delhi", "IIT Delhi", "CCRAS"],
    location: "New Delhi", type: "Joint Research", duration: "6 months",
    deadline: "Oct 25, 2025",
    description: "Build a comprehensive database of herb-drug interactions using machine learning. Map interaction pathways and create a decision-support tool for practitioners.",
    skillsRelevant: ["Machine Learning", "Python", "Data Analysis", "Pharmacology", "Clinical Research"],
    status: "open", funding: "₹35,00,000", teamSize: 6, interested: 12, publications: true, patentPotential: true,
  },
  {
    id: "r-2", title: "AI-Powered Pulse Diagnosis Validation Study",
    partners: ["BHU Varanasi", "IIT Kanpur", "AIIMS Delhi"],
    location: "Varanasi", type: "Grant-Funded", duration: "12 months",
    deadline: "Nov 10, 2025",
    description: "Validate Nadi Pariksha (pulse diagnosis) using sensor-based data collection and deep learning classification. Compare AI predictions with expert Vaidya assessments.",
    skillsRelevant: ["Deep Learning", "Signal Processing", "Python", "Research Methodology"],
    status: "open", funding: "₹50,00,000", teamSize: 8, interested: 9, publications: true, patentPotential: true,
  },
  {
    id: "r-3", title: "Comparative Efficacy of Rasayana Therapy — Multi-Center Trial",
    partners: ["CCRAS", "NIPER Hyderabad", "Gujarat Ayurved University"],
    location: "Multi-Center", type: "Industry Sponsored", duration: "18 months",
    deadline: "Dec 5, 2025",
    description: "Multi-center randomized controlled trial comparing Rasayana formulations for immune modulation. Sponsored by a leading Ayurveda pharmaceutical company.",
    skillsRelevant: ["Clinical Research", "Statistical Analysis", "Randomized Trials", "Regulatory Affairs"],
    status: "upcoming", funding: "₹1,20,00,000", teamSize: 12, interested: 5, publications: true, patentPotential: false,
  },
  {
    id: "r-4", title: "Digital Twin for Ayurveda Patient Profiling",
    partners: ["IIT Madras", "S-VYASA University"],
    location: "Chennai / Bangalore", type: "Academic Partnership", duration: "9 months",
    deadline: "Nov 20, 2025",
    description: "Develop a digital twin framework for personalized Ayurveda treatment planning based on Prakriti assessment, lifestyle data, and genomic markers.",
    skillsRelevant: ["Bioinformatics", "Data Modeling", "Python", "Ayurveda Principles"],
    status: "open", funding: "₹40,00,000", teamSize: 5, interested: 7, publications: true, patentPotential: true,
  },
  {
    id: "r-5", title: "Nanotechnology in Ayurvedic Drug Delivery Systems",
    partners: ["IIT Delhi", "Jawaharlal Nehru University"],
    location: "New Delhi", type: "Grant-Funded", duration: "24 months",
    deadline: "Jan 15, 2026",
    description: "Develop nano-formulations for improved bioavailability of traditional Ayurvedic medicines. Focus on liposomal and polymeric nanoparticle delivery systems.",
    skillsRelevant: ["Nanotechnology", "Pharmacology", "Drug Delivery", "Material Science"],
    status: "upcoming", funding: "₹80,00,000", teamSize: 7, interested: 4, publications: true, patentPotential: true,
  },
];

export default function ResearchCollaboration() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const filtered = demoResearch.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.partners.some(p => p.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const typeColor: Record<string, { bg: string; text: string }> = {
    "Joint Research": { bg: "#C8B5DE", text: "#4d3a74" },
    "Industry Sponsored": { bg: "#E8D36B", text: "#5c4a08" },
    "Grant-Funded": { bg: "#DCE6D0", text: "#16301F" },
    "Academic Partnership": { bg: "#E8C7AE", text: "#7a3f1a" },
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
          { label: "Active", value: demoResearch.filter(r => r.status !== "upcoming").length, color: "#4d3a74", bg: "#C8B5DE30" },
          { label: "Total Funding", value: "₹3.25Cr", color: "#244B35", bg: "#DCE6D0" },
          { label: "Publications", value: demoResearch.filter(r => r.publications).length, color: "#5c4a08", bg: "#E8D36B30" },
          { label: "Patent Potential", value: demoResearch.filter(r => r.patentPotential).length, color: "#C98B5F", bg: "#F0E8DD" },
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
              style={filter === f ? { background: "#4d3a74" } : { background: "#EDEBE0", color: "#6B6F68" }}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9A9D94" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search research collaborations..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E6E3D7" }} />
        </div>
      </div>

      {/* Research Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((r, idx) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="rounded-[16px] border p-5 hover:shadow-md transition-shadow relative overflow-hidden"
            style={{ borderColor: "#DED6EC", background: "linear-gradient(180deg, #FDFCFA 0%, #F8F5FC 100%)" }}>
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #8A6FB8, #C8B5DE)" }} />

            {/* Header */}
            <div className="flex items-start justify-between mb-2 mt-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: typeColor[r.type].bg, color: typeColor[r.type].text }}>{r.type.toUpperCase()}</span>
                  {r.patentPotential && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "#E8D36B30", color: "#5c4a08" }}>PATENT POTENTIAL</span>}
                </div>
                <div className="font-semibold text-[15px] leading-tight" style={{ color: "#171A18" }}>{r.title}</div>
                <div className="text-xs mt-0.5" style={{ color: "#6B6F68" }}>{r.partners.join(" • ")}</div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: statusColor[r.status].bg, color: statusColor[r.status].text }}>
                {r.status.toUpperCase()}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs mb-3 line-clamp-2" style={{ color: "#6B6F68" }}>{r.description}</p>

            {/* Meta */}
            <div className="flex flex-wrap gap-3 font-mono text-[11px] mb-3" style={{ color: "#6B6F68" }}>
              <span className="inline-flex items-center gap-1"><MapPin size={11} /> {r.location}</span>
              <span className="inline-flex items-center gap-1"><Clock size={11} /> {r.duration}</span>
              <span className="inline-flex items-center gap-1"><DollarSign size={11} /> {r.funding}</span>
              <span className="inline-flex items-center gap-1"><Users size={11} /> {r.interested}/{r.teamSize} team</span>
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1 mb-3">
              {r.skillsRelevant.map(s => (
                <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "#EAE3F4", color: "#4d3a74" }}>{s}</span>
              ))}
            </div>

            {/* Benefits */}
            <div className="flex items-center gap-3 mb-3 text-xs" style={{ color: "#6B6F68" }}>
              {r.publications && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "#DCE6D0", color: "#16301F" }}>PUBLICATIONS</span>}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#EDEBE0" }}>
              <span className="font-mono text-[10px]" style={{ color: "#9A9D94" }}>Deadline: {r.deadline}</span>
              <div className="flex gap-2">
                <button onClick={() => { setBookmarked(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; }); toast(bookmarked.has(r.id) ? "Removed" : "Bookmarked!"); }}
                  className="p-1.5 rounded-lg transition-all hover:shadow-sm"
                  style={{ background: bookmarked.has(r.id) ? "#E8D36B30" : "#EDEBE0" }}>
                  <BookmarkPlus size={13} style={{ color: bookmarked.has(r.id) ? "#5c4a08" : "#6B6F68" }} />
                </button>
                <button onClick={() => { setApplied(prev => new Set(prev).add(r.id)); toast("Interest registered!"); }}
                  disabled={applied.has(r.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:shadow-sm"
                  style={applied.has(r.id) ? { background: "#C8B5DE", color: "#4d3a74" } : { background: "#8A6FB8", color: "#fff" }}>
                  {applied.has(r.id) ? <><CheckCircle2 size={12} /> Registered</> : <><Send size={12} /> Express Interest</>}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
