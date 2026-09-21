import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Calendar, Clock, MapPin, Users, Award, ExternalLink,
  CheckCircle2, Star, Filter, Search, ChevronDown, BookmarkPlus, Send,
} from "lucide-react";

interface FDPItem {
  id: string;
  title: string;
  organizer: string;
  type: "Online" | "Hybrid" | "In-Person";
  duration: string;
  startDate: string;
  deadline: string;
  description: string;
  skillsRelevant: string[];
  status: "open" | "closing" | "upcoming" | "completed";
  seats: number;
  interested: number;
  rating: number;
  certified: boolean;
  fundingAvailable: boolean;
  url?: string;
}

const demoFDPs: FDPItem[] = [
  {
    id: "fdp-1", title: "AI & Machine Learning in Healthcare Education",
    organizer: "AICTE", type: "Online", duration: "2 weeks",
    startDate: "Oct 20, 2025", deadline: "Oct 15, 2025",
    description: "Comprehensive FDP covering AI/ML fundamentals applied to healthcare curriculum development. Includes hands-on workshops on Python, TensorFlow, and medical data analysis.",
    skillsRelevant: ["Machine Learning", "Python", "Data Analysis", "Healthcare AI"],
    status: "open", seats: 50, interested: 38, rating: 4.7, certified: true, fundingAvailable: true,
  },
  {
    id: "fdp-2", title: "Research Methodology & Scientific Writing",
    organizer: "UGC", type: "Hybrid", duration: "1 week",
    startDate: "Nov 5, 2025", deadline: "Oct 28, 2025",
    description: "Intensive program on research design, statistical methods, and scientific paper writing. Covers NVivo, SPSS, and manuscript preparation for high-impact journals.",
    skillsRelevant: ["Research Methodology", "Scientific Writing", "Statistical Analysis"],
    status: "open", seats: 30, interested: 22, rating: 4.5, certified: true, fundingAvailable: false,
  },
  {
    id: "fdp-3", title: "Curriculum Design for Competency-Based Medical Education",
    organizer: "NCISM", type: "In-Person", duration: "3 days",
    startDate: "Sep 28, 2025", deadline: "Sep 25, 2025",
    description: "Workshop on redesigning BAMS curriculum to align with competency-based medical education (CBME) framework. Includes case-based learning strategies.",
    skillsRelevant: ["Curriculum Design", "CBME", "Assessment Methods"],
    status: "closing", seats: 25, interested: 24, rating: 4.8, certified: true, fundingAvailable: true,
  },
  {
    id: "fdp-4", title: "Digital Health & Telemedicine Fundamentals",
    organizer: "IIT Delhi", type: "Online", duration: "10 days",
    startDate: "Dec 1, 2025", deadline: "Nov 20, 2025",
    description: "Learn to integrate digital health tools, telemedicine platforms, and electronic health records into academic teaching. Practical sessions on e-clinic setup.",
    skillsRelevant: ["Digital Health", "Telemedicine", "EHR Systems", "Health Informatics"],
    status: "upcoming", seats: 40, interested: 15, rating: 4.3, certified: true, fundingAvailable: false,
  },
  {
    id: "fdp-5", title: "Statistical Analysis with R for Clinical Research",
    organizer: "ICMR", type: "Online", duration: "2 weeks",
    startDate: "Jan 10, 2026", deadline: "Dec 30, 2025",
    description: "Hands-on training in R programming for clinical data analysis. Covers survival analysis, meta-analysis, and clinical trial design.",
    skillsRelevant: ["Statistical Analysis", "R Programming", "Clinical Research"],
    status: "upcoming", seats: 35, interested: 8, rating: 4.6, certified: true, fundingAvailable: true,
  },
  {
    id: "fdp-6", title: "Pharmacovigilance & Drug Safety Monitoring",
    organizer: "CDSCO", type: "Hybrid", duration: "5 days",
    startDate: "Aug 15, 2025", deadline: "Aug 10, 2025",
    description: "Completed FDP on adverse drug reaction reporting, signal detection, and risk management. Participants received CDSCO certification.",
    skillsRelevant: ["Pharmacovigilance", "Drug Safety", "Regulatory Affairs"],
    status: "completed", seats: 30, interested: 30, rating: 4.9, certified: true, fundingAvailable: false,
  },
];

export default function FDPListings() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const filtered = demoFDPs.filter((f) => {
    if (filter !== "all" && f.status !== filter) return false;
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && !f.organizer.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColor: Record<string, { bg: string; text: string }> = {
    open: { bg: "#DCE6D0", text: "#16301F" },
    closing: { bg: "#E8D36B", text: "#5c4a08" },
    upcoming: { bg: "#EDEBE0", text: "#6B6F68" },
    completed: { bg: "#C8B5DE", text: "#4d3a74" },
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
          { label: "Available", value: demoFDPs.filter(f => f.status !== "completed").length, color: "#244B35", bg: "#DCE6D0" },
          { label: "Closing Soon", value: demoFDPs.filter(f => f.status === "closing").length, color: "#5c4a08", bg: "#E8D36B30" },
          { label: "Upcoming", value: demoFDPs.filter(f => f.status === "upcoming").length, color: "#6B6F68", bg: "#EDEBE0" },
          { label: "Certified", value: demoFDPs.filter(f => f.certified).length, color: "#4d3a74", bg: "#C8B5DE30" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg }}>
            <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "#6B6F68" }}>{s.label}</div>
            <div className="font-bold text-2xl" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto">
          {["all", "open", "closing", "upcoming", "completed"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${filter === f ? "text-white" : ""}`}
              style={filter === f ? { background: "#244B35" } : { background: "#EDEBE0", color: "#6B6F68" }}>
              {f === "all" ? "All FDPs" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9A9D94" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FDPs..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E6E3D7" }} />
        </div>
      </div>

      {/* FDP Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((fdp, idx) => (
          <motion.div key={fdp.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="rounded-[16px] border p-5 hover:shadow-md transition-shadow relative overflow-hidden"
            style={{ borderColor: "#E6E3D7", background: "linear-gradient(180deg, #FDFCFA 0%, #F8F5FC 100%)" }}>
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #8A6FB8, #C8B5DE)" }} />

            {/* Header */}
            <div className="flex items-start justify-between mb-2 mt-1">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] leading-tight mb-1" style={{ color: "#171A18" }}>{fdp.title}</div>
                <div className="text-xs" style={{ color: "#6B6F68" }}>{fdp.organizer}</div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: statusColor[fdp.status].bg, color: statusColor[fdp.status].text }}>
                  {fdp.status.toUpperCase()}
                </span>
                {fdp.certified && <Award size={14} style={{ color: "#8A6FB8" }} />}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs mb-3 line-clamp-2" style={{ color: "#6B6F68" }}>{fdp.description}</p>

            {/* Meta */}
            <div className="flex flex-wrap gap-3 font-mono text-[11px] mb-3" style={{ color: "#6B6F68" }}>
              <span className="inline-flex items-center gap-1"><BookOpen size={11} /> {fdp.type}</span>
              <span className="inline-flex items-center gap-1"><Clock size={11} /> {fdp.duration}</span>
              <span className="inline-flex items-center gap-1"><Calendar size={11} /> {fdp.startDate}</span>
              <span className="inline-flex items-center gap-1"><Users size={11} /> {fdp.interested}/{fdp.seats}</span>
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1 mb-3">
              {fdp.skillsRelevant.map(s => (
                <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "#DCE6D0", color: "#16301F" }}>{s}</span>
              ))}
            </div>

            {/* Rating + Funding */}
            <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: "#6B6F68" }}>
              <span className="inline-flex items-center gap-1"><Star size={12} style={{ color: "#E8D36B", fill: "#E8D36B" }} /> {fdp.rating}</span>
              {fdp.fundingAvailable && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "#E8D36B30", color: "#5c4a08" }}>FUNDING AVAILABLE</span>}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#EDEBE0" }}>
              <span className="font-mono text-[10px]" style={{ color: "#9A9D94" }}>Deadline: {fdp.deadline}</span>
              <div className="flex gap-2">
                <button onClick={() => { setBookmarked(prev => { const n = new Set(prev); n.has(fdp.id) ? n.delete(fdp.id) : n.add(fdp.id); return n; }); toast(bookmarked.has(fdp.id) ? "Removed from bookmarks" : "Bookmarked!"); }}
                  className="p-1.5 rounded-lg transition-all hover:shadow-sm"
                  style={{ background: bookmarked.has(fdp.id) ? "#E8D36B30" : "#EDEBE0" }}>
                  <BookmarkPlus size={13} style={{ color: bookmarked.has(fdp.id) ? "#5c4a08" : "#6B6F68" }} />
                </button>
                {fdp.status !== "completed" && (
                  <button onClick={() => { setApplied(prev => new Set(prev).add(fdp.id)); toast("Application submitted!"); }}
                    disabled={applied.has(fdp.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:shadow-sm"
                    style={applied.has(fdp.id) ? { background: "#DCE6D0", color: "#16301F" } : { background: "#244B35", color: "#fff" }}>
                    {applied.has(fdp.id) ? <><CheckCircle2 size={12} /> Applied</> : <><Send size={12} /> Apply</>}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
