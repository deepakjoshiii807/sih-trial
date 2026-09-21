import { NotificationBell } from "@/components/ui/notification-bell";
import { useState } from "react";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { Sidebar, SidebarBody, Logo, LogoIcon, useSidebar } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, Briefcase, FileText, Users, BarChart3,
  Clock, Star, Settings, LogOut, Search, Bell, ChevronRight,
  Check, Save, Mail, Key, Globe, Trash2, Lock, Eye, EyeOff,
  Upload, MapPin, Calendar, TrendingUp, AlertTriangle, Target,
  Zap, Shield, Award, Plus, Pause, Play, XCircle, Send,
} from "lucide-react";

import { toast } from "sonner";
import type {
  Company, Opportunity, Application, SLATracker,
  IndustryAnalytics, Rating, Reputation, ApplicationStage, IndustryDashboard,
  WorkArrangement, OpportunityType, SkillRequirement,
} from "@/lib/industry-api";
import { industryApi } from "@/lib/industry-api";
import IndustryAIRank from "@/components/ui/industry-ai-rank";
import PrintButton from "@/components/ui/print-button";
import { SmartMatchScore } from "@/components/ui/smart-match-score";
import { MessagingSystem } from "@/components/ui/messaging-system";

/** Module-scope data holders — populated by LiveDashboard via hydrateIndustryDashboard().
 *  All start empty; the dashboard skeleton renders during the fetch, so users
 *  never see stale seed data. Hydration mutates these and LiveDashboard
 *  triggers a React re-render, which reads the updated values. */
let company: Company = { name: "CCRAS Research Hub", initials: "CR", description: "Central Council for Research in Ayurvedic Sciences — leading government research organization in AYUSH healthcare.", domain: "healthcare-research", orgType: "Government Research Council", location: "New Delhi, India", website: "https://ccras.nic.in", email: "careers@ccras.gov.in", phone: "+91-11-24123456", contactPerson: "Dr. Rajesh Sharma", verified: true, foundedYear: 1978, size: "500-1000" };
let opportunities: Opportunity[] = [
  { id: 1, title: "Research Intern — Clinical Data Analysis", type: "Internship", description: "Analyze clinical trial datasets using Python and R. Work with real AYUSH research data and contribute to published papers.", openings: 4, location: "New Delhi", workArrangement: "On-site", duration: "3 months", stipend: "₹15,000/month", deadline: "Oct 30, 2025", eligibility: { qualification: "BAMS", experience: "None", otherCriteria: "", courses: ["BAMS", "MD/MS"] }, requiredSkills: [{ skill: "Python", required: "essential" }, { skill: "Data Analysis", required: "essential" }, { skill: "Statistical Analysis", required: "preferred" }, { skill: "Clinical Research", required: "preferred" }], status: "active", totalApplicants: 12, shortlistedCount: 5, createdAt: "Sep 1, 2025", blindShortlisting: true, slaAwaiting: 2, slaBreached: false },
  { id: 2, title: "Machine Learning Engineer — Herbal Drug Discovery", type: "Placement", description: "Build ML models for predicting herbal drug efficacy using molecular fingerprints and traditional knowledge databases.", openings: 2, location: "New Delhi", workArrangement: "Hybrid", duration: "6 months", stipend: "₹25,000/month", deadline: "Nov 15, 2025", eligibility: { qualification: "BAMS/B.Tech", experience: "None", otherCriteria: "", courses: ["BAMS", "B.Tech"] }, requiredSkills: [{ skill: "Machine Learning", required: "essential" }, { skill: "Python", required: "essential" }, { skill: "Data Analysis", required: "essential" }, { skill: "Scientific Writing", required: "preferred" }], status: "active", totalApplicants: 8, shortlistedCount: 3, createdAt: "Aug 20, 2025", blindShortlisting: false, slaAwaiting: 1, slaBreached: false },
  { id: 3, title: "Scientific Writing Intern — Pharmacovigilance", type: "Internship", description: "Write adverse event reports and pharmacovigilance documentation for AYUSH drug safety monitoring.", openings: 3, location: "Remote", workArrangement: "Remote", duration: "2 months", stipend: "₹10,000/month", deadline: "Oct 15, 2025", eligibility: { qualification: "BAMS", experience: "None", otherCriteria: "", courses: ["BAMS", "Pharm.D"] }, requiredSkills: [{ skill: "Scientific Writing", required: "essential" }, { skill: "Pharmacology", required: "preferred" }, { skill: "Clinical Research", required: "preferred" }], status: "active", totalApplicants: 15, shortlistedCount: 7, createdAt: "Sep 5, 2025", blindShortlisting: true, slaAwaiting: 0, slaBreached: true },
  { id: 4, title: "Data Scientist — EHR Analytics Platform", type: "Placement", description: "Design and implement analytics dashboards for electronic health records across AYUSH institutions.", openings: 2, location: "Hyderabad", workArrangement: "On-site", duration: "12 months", stipend: "₹30,000/month", deadline: "Dec 1, 2025", eligibility: { qualification: "BAMS/B.Tech", experience: "None", otherCriteria: "", courses: ["BAMS", "B.Tech", "MCA"] }, requiredSkills: [{ skill: "Data Analysis", required: "essential" }, { skill: "Python", required: "essential" }, { skill: "REST APIs", required: "preferred" }, { skill: "Machine Learning", required: "preferred" }], status: "paused", totalApplicants: 6, shortlistedCount: 2, createdAt: "Jul 15, 2025", blindShortlisting: false, slaAwaiting: 0, slaBreached: false },
];
let applications: Application[] = [
  { id: 1, candidate: { id: 101, name: "Aarav Sharma", initials: "AS", course: "BAMS", year: "3rd Year", institution: "AIIA New Delhi", skills: [{ name: "Python", confidence: 92, verified: true }, { name: "Data Analysis", confidence: 85, verified: true }, { name: "Clinical Research", confidence: 70, verified: true }, { name: "Statistical Analysis", confidence: 55, verified: false }], verifiedSkills: 5, totalSkills: 5, projects: 2, certifications: 3, evidence: [{ type: "Project", title: "Clinical Trial Analysis", issuer: "AIIA", date: "Aug 2025", verified: true }], roleReadiness: "Ready", readinessScore: 87 }, opportunityId: 1, opportunityTitle: "Research Intern — Clinical Data Analysis", matchScore: 94, matchedSkills: ["Python", "Data Analysis", "Clinical Research"], missingSkills: ["Statistical Analysis"], stage: "shortlisted", appliedDate: "Sep 5, 2025", lastUpdated: "Sep 10, 2025", notes: "Strong Python skills. Verified by faculty." },
  { id: 2, candidate: { id: 102, name: "Priya Desai", initials: "PD", course: "BAMS", year: "4th Year", institution: "BHU Varanasi", skills: [{ name: "Machine Learning", confidence: 88, verified: true }, { name: "Python", confidence: 95, verified: true }, { name: "Scientific Writing", confidence: 72, verified: true }], verifiedSkills: 7, totalSkills: 7, projects: 2, certifications: 2, evidence: [{ type: "Research Paper", title: "ML in Drug Discovery", issuer: "BHU", date: "Jul 2025", verified: true }], roleReadiness: "Ready", readinessScore: 92 }, opportunityId: 2, opportunityTitle: "Machine Learning Engineer — Herbal Drug Discovery", matchScore: 91, matchedSkills: ["Machine Learning", "Python", "Scientific Writing"], missingSkills: [], stage: "interviewed", appliedDate: "Aug 28, 2025", lastUpdated: "Sep 8, 2025", notes: "Excellent ML portfolio. Interview scheduled." },
  { id: 3, candidate: { id: 103, name: "Ravi Kumar", initials: "RK", course: "BAMS", year: "2nd Year", institution: "AIIA New Delhi", skills: [{ name: "Scientific Writing", confidence: 78, verified: true }, { name: "Clinical Research", confidence: 65, verified: true }], verifiedSkills: 3, totalSkills: 3, projects: 2, certifications: 1, evidence: [{ type: "Certificate", title: "Medical Writing Workshop", issuer: "NCISM", date: "Jun 2025", verified: true }], roleReadiness: "Almost Ready", readinessScore: 68 }, opportunityId: 3, opportunityTitle: "Scientific Writing Intern — Pharmacovigilance", matchScore: 78, matchedSkills: ["Scientific Writing", "Clinical Research"], missingSkills: ["Pharmacology"], stage: "applied", appliedDate: "Sep 12, 2025", lastUpdated: "Sep 12, 2025", notes: "" },
  { id: 4, candidate: { id: 104, name: "Sneha Patel", initials: "SP", course: "B.Tech CSE", year: "3rd Year", institution: "IIT Delhi", skills: [{ name: "Data Analysis", confidence: 90, verified: true }, { name: "Python", confidence: 88, verified: true }, { name: "REST APIs", confidence: 75, verified: true }], verifiedSkills: 6, totalSkills: 6, projects: 2, certifications: 4, evidence: [{ type: "Internship", title: "Data Analyst Intern", issuer: "TechCorp", date: "May 2025", verified: true }], roleReadiness: "Ready", readinessScore: 89 }, opportunityId: 4, opportunityTitle: "Data Scientist — EHR Analytics Platform", matchScore: 86, matchedSkills: ["Data Analysis", "Python", "REST APIs"], missingSkills: ["Machine Learning"], stage: "offered", appliedDate: "Jul 20, 2025", lastUpdated: "Aug 15, 2025", notes: "Offer sent. Awaiting acceptance." },
];
let slaTrackers: SLATracker[] = [
  { applicationId: 3, candidateName: "Ravi Kumar", opportunityTitle: "Scientific Writing Intern — Pharmacovigilance", appliedDate: "Sep 12, 2025", respondBy: "Sep 19, 2025", timeRemaining: "2 days left", slaStatus: "warning", daysRemaining: 2 },
  { applicationId: 5, candidateName: "Amit Singh", opportunityTitle: "Research Intern — Clinical Data Analysis", appliedDate: "Sep 8, 2025", respondBy: "Sep 15, 2025", timeRemaining: "Breached", slaStatus: "breached", daysRemaining: -1 },
  { applicationId: 6, candidateName: "Deepa Nair", opportunityTitle: "Machine Learning Engineer — Herbal Drug Discovery", appliedDate: "Sep 14, 2025", respondBy: "Sep 21, 2025", timeRemaining: "5 days left", slaStatus: "on-track", daysRemaining: 5 },
];
let analytics: IndustryAnalytics = { totalOpportunities: 4, activeOpportunities: 3, totalApplicants: 41, shortlistingRate: 41, fillRate: 12, avgTimeToHire: 18, pipeline: [{ stage: "Applied", count: 41 }, { stage: "Shortlisted", count: 17 }, { stage: "Interviewed", count: 8 }, { stage: "Offered", count: 5 }, { stage: "Joined", count: 3 }], topCandidateSkills: [{ skill: "Python", count: 28, pct: 68 }, { skill: "Data Analysis", count: 22, pct: 54 }, { skill: "Clinical Research", count: 18, pct: 44 }, { skill: "Machine Learning", count: 12, pct: 29 }, { skill: "Scientific Writing", count: 10, pct: 24 }], applicantSkillGaps: [{ skill: "Statistical Analysis", gapCount: 18, pct: 44 }, { skill: "Machine Learning", gapCount: 15, pct: 37 }, { skill: "REST APIs", gapCount: 12, pct: 29 }, { skill: "Pharmacology", gapCount: 10, pct: 24 }, { skill: "Data Management", gapCount: 8, pct: 20 }], monthlyTrend: [{ month: "May", applicants: 8, shortlisted: 3, hired: 1 }, { month: "Jun", applicants: 12, shortlisted: 5, hired: 2 }, { month: "Jul", applicants: 10, shortlisted: 4, hired: 1 }, { month: "Aug", applicants: 15, shortlisted: 6, hired: 2 }, { month: "Sep", applicants: 11, shortlisted: 5, hired: 0 }], opportunityPerformance: [{ title: "Clinical Data Analysis", applicants: 12, fillRate: 75, avgMatch: 82 }, { title: "ML Herbal Drug Discovery", applicants: 8, fillRate: 50, avgMatch: 78 }, { title: "Pharmacovigilance Writing", applicants: 15, fillRate: 40, avgMatch: 65 }, { title: "EHR Analytics", applicants: 6, fillRate: 33, avgMatch: 71 }] };
let ratings: Rating[] = [
  { id: 1, from: "Aarav Sharma", fromType: "student", to: "CCRAS", toType: "industry", score: 5, feedback: "Excellent research environment. Great mentorship from Dr. Sharma's team. The clinical data analysis work was real and impactful.", opportunity: "Research Intern — Clinical Data Analysis", date: "Sep 2025" },
  { id: 2, from: "Priya Desai", fromType: "student", to: "CCRAS", toType: "industry", score: 4, feedback: "Good ML infrastructure. Could improve on documentation for new joins. The herbal drug database project was fascinating.", opportunity: "Machine Learning Engineer — Herbal Drug Discovery", date: "Aug 2025" },
  { id: 3, from: "CCRAS HR Team", fromType: "industry", to: "Aarav Sharma", toType: "student", score: 5, feedback: "Outstanding performance. Aarav independently implemented a clinical trial analysis pipeline. Strong Python skills and domain knowledge.", opportunity: "Research Intern — Clinical Data Analysis", date: "Sep 2025" },
  { id: 4, from: "CCRAS HR Team", fromType: "industry", to: "Priya Desai", toType: "student", score: 4, feedback: "Excellent ML skills. Built a molecular fingerprint predictor with 89% accuracy. Good scientific writing for the research paper.", opportunity: "Machine Learning Engineer — Herbal Drug Discovery", date: "Aug 2025" },
];
let reputation: Reputation = { avgScore: 4.5, count: 4, reviews: [] };

/** Server data entry point (called by the route-level LiveDashboard wrapper).
 *  Mutates the module-scope holders so the next React render picks up live data. */
export function hydrateIndustryDashboard(payload: IndustryDashboard) {
  company = payload.company;
  opportunities = payload.opportunities;
  applications = payload.applications;
  slaTrackers = payload.slaTrackers;
  analytics = payload.analytics;
  ratings = payload.ratings;
  reputation = payload.reputation ?? { avgScore: 0, count: 0, reviews: [] };
}

const navLinks = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { id: "profile", label: "Company Profile", icon: <Building2 size={18} /> },
  { id: "opportunities", label: "Opportunities", icon: <Briefcase size={18} />, count: 4 },
  { id: "applications", label: "Applications", icon: <FileText size={18} />, count: 4 },
  { id: "matching", label: "Candidate Matching", icon: <Users size={18} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
  { id: "sla", label: "SLA Tracker", icon: <Clock size={18} /> },
  { id: "ratings", label: "Ratings", icon: <Star size={18} /> },
  { id: "match-score", label: "Smart Match", icon: <Target size={18} /> },
  { id: "messaging", label: "Messages", icon: <Mail size={18} /> },
  { id: "completion", label: "Completion", icon: <Check size={18} /> },
];

/* ─── Pixel Bar ─── */
function PxBar({ pct, segments = 18, color = "#244B35" }: { pct: number; segments?: number; color?: string }) {
  const filled = Math.round((pct / 100) * segments);
  return (
    <div className="flex gap-[3px] flex-wrap">
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={`w-[7px] h-[13px] ${i < filled ? "" : "bg-[#EDEBE0]"}`}
          style={i < filled ? { background: color } : undefined} />
      ))}
    </div>
  );
}
const tagCls: Record<string, string> = {
  active: "bg-[#DCE6D0] text-[#16301F]", draft: "bg-[#EDEBE0] text-[#6B6F68]",
  paused: "bg-[#E8D36B] text-[#5c4a08]", closed: "bg-[#E8C7AE] text-[#7a3f1a]",
  closing: "bg-[#E8C7AE] text-[#7a3f1a]", verified: "bg-[#DCE6D0] text-[#16301F]",
  "on-track": "bg-[#DCE6D0] text-[#16301F]", warning: "bg-[#E8D36B] text-[#5c4a08]",
  "breached": "bg-[#E8C7AE] text-[#7a3f1a]", applied: "bg-[#EDEBE0] text-[#6B6F68]",
  shortlisted: "bg-[#E8D36B] text-[#5c4a08]", interviewed: "bg-[#C8B5DE] text-[#4d3a74]",
  offered: "bg-[#DCE6D0] text-[#16301F]", joined: "bg-[#244B35] text-white",
  rejected: "bg-[#E8C7AE] text-[#7a3f1a]",
};
function Tag({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-[3px] rounded-md whitespace-nowrap ${tagCls[cls] || cls}`}>{children}</span>;
}
function Eyebrow({ color, children }: { color?: string; children: React.ReactNode }) {
  return <span className="font-mono text-[11px] font-bold tracking-[0.16em] uppercase inline-flex items-center gap-2" style={{ color: color || "#9A9D94" }}><span className="w-[7px] h-[7px] bg-[#171A18] opacity-85" style={{ boxShadow: "0 7px 0 -2px #F7F6F0" }} />{children}</span>;
}
function LinkMore({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="font-mono text-xs font-bold text-[#244B35] tracking-wide inline-flex items-center gap-1.5 hover:gap-3 transition-all mt-3">{children}</button>;
}

/* ─── Sidebar Content ─── */
function SidebarContent({ activeNav, setActiveNav }: { activeNav: string; setActiveNav: (id: string) => void }) {
  const { open, setOpen } = useSidebar();

  /** Switch section and (on phones) close the drawer. */
  const goTo = (id: string) => {
    setActiveNav(id);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setOpen(false);
    }
  };

  return (
    <>
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <div className={open ? "" : "flex justify-center"}>{open ? <Logo /> : <LogoIcon />}</div>
        <div className="mt-8 flex flex-col gap-[2px]">
          {navLinks.map((link) => (
            <button key={link.id} onClick={() => goTo(link.id)}
              className={`flex items-center gap-3 w-full text-left rounded-xl text-sm font-medium transition-colors ${open ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"} ${activeNav === link.id ? "bg-[#244B35] text-white font-semibold" : "text-[#6B6F68] hover:bg-[#EDEBE0] hover:text-[#171A18]"}`}>
              <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 18, height: 18 }}>{link.icon}</span>
              {open && <span className="text-sm whitespace-pre">{link.label}</span>}
              {open && link.count !== undefined && <span className={`ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded-md ${activeNav === link.id ? "bg-white/20 text-white" : "bg-[#EDEBE0] text-[#6B6F68]"}`}>{link.count}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="border-t pt-3 mt-2" style={{ borderColor: open ? "#E6E3D7" : "transparent" }}>
        <button onClick={() => goTo("settings")} className={`flex items-center gap-3 w-full rounded-xl text-[#6B6F68] text-xs font-medium hover:bg-[#EDEBE0] hover:text-[#171A18] transition-colors ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}`}><Settings size={16} /> {open && "Settings"}</button>
        <SignOutButton open={open} />
        {open && <div className="mt-3 p-3 rounded-xl border" style={{ background: "#F7F6F0", borderColor: "#E6E3D7" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: "#244B35", color: "#DCE6D0" }}>{company.initials}</div>
            <div className="min-w-0"><div className="font-semibold text-sm truncate" style={{ color: "#171A18" }}>{company.name}</div><div className="text-[11px] font-mono" style={{ color: "#6B6F68" }}>Industry Partner</div></div>
          </div>
        </div>}
        {!open && <div className="flex justify-center mt-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: "#244B35", color: "#DCE6D0" }}>{company.initials}</div></div>}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Overview
   ═══════════════════════════════════════════════════════ */
function OverviewSection() {
  return (
    <>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="col-span-12 rounded-[20px] p-7 overflow-hidden relative" style={{ background: "linear-gradient(135deg, #244B35 0%, #1C3D2B 40%, #1A3626 100%)", color: "#F7F6F0", boxShadow: "0 8px 32px rgba(36,75,53,.18), inset 0 1px 0 rgba(220,230,208,.12)" }}>
        <div className="absolute top-4 right-4 opacity-[0.06] pointer-events-none"><div className="grid grid-cols-6 gap-[6px]">{Array.from({length:36},(_,i)=><div key={i} className="w-[5px] h-[5px] bg-white rounded-[1px]" />)}</div></div>
        <div className="absolute bottom-4 left-4 opacity-[0.04] pointer-events-none"><div className="grid grid-cols-4 gap-[5px]">{Array.from({length:16},(_,i)=><div key={i} className="w-[4px] h-[4px] bg-[#E8D36B] rounded-[1px]" />)}</div></div>
        <div className="absolute right-3.5 bottom-3.5 w-16 h-16 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#DCE6D0 1px,transparent 1px)", backgroundSize: "8px 8px" }} />
        <div className="flex items-start gap-6">
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: "#DCE6D0" }}><span className="inline-block w-[7px] h-[7px] bg-[#DCE6D0] mr-2 opacity-85" style={{ boxShadow: "0 7px 0 -2px #244B35" }} />Industry Dashboard</span>
            <h2 className="font-bold text-[clamp(24px,3vw,36px)] tracking-tight leading-tight mt-4 mb-3">Your recruitment pipeline for <em className="not-italic" style={{ color: "#E8D36B" }}>AYUSH talent.</em></h2>
            <p className="text-[14px] max-w-[42ch] mb-6" style={{ color: "rgba(220,230,208,.75)" }}>{analytics.totalApplicants} applicants across {opportunities.length} opportunities. {slaTrackers.length} applications need attention.</p>
            <div className="flex items-center gap-6 flex-wrap">
              {[{ label: "Active Opportunities", value: analytics.activeOpportunities, color: "#DCE6D0" }, { label: "Total Applicants", value: analytics.totalApplicants, color: "#E8D36B" }, { label: "Fill Rate", value: `${analytics.fillRate}%`, color: "#E8C7AE" }].map((s) => (
                <div key={s.label}><div className="font-bold text-3xl leading-none" style={{ color: s.color }}>{s.value}</div><div className="font-mono text-[10px] tracking-widest uppercase mt-1" style={{ color: "rgba(220,230,208,.55)" }}>{s.label}</div></div>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex flex-col flex-shrink-0 w-[180px]">
            <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-4" style={{ color: "rgba(220,230,208,.55)" }}>Quick Stats</div>
            {[{ label: "Shortlisting Rate", val: `${analytics.shortlistingRate}%` }, { label: "Avg Time to Hire", val: `${analytics.avgTimeToHire} days` }, { label: "Company", val: company.name.split(" ")[0] }].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5"><span className="text-[12px]" style={{ color: "rgba(220,230,208,.6)" }}>{item.label}</span><span className="font-semibold text-[12px]" style={{ color: "#F7F6F0" }}>{item.val}</span></div>
            ))}
          </div>
        </div>
      </motion.section>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="col-span-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[{ label: "Opportunities", value: analytics.totalOpportunities, color: "#244B35", bg: "#DCE6D0", accent: "#244B35" }, { label: "Applicants", value: analytics.totalApplicants, color: "#C98B5F", bg: "#F0E8DD", accent: "#C98B5F" }, { label: "Shortlisting Rate", value: `${analytics.shortlistingRate}%`, color: "#171A18", bg: "#EDEBE0", accent: "#C98B5F" }, { label: "Avg Time to Hire", value: `${analytics.avgTimeToHire}d`, color: "#8A6FB8", bg: "#EAE3F4", accent: "#8A6FB8" }].map((s) => (
          <div key={s.label} className="rounded-[14px] px-5 py-4 text-center border-l-[3px] hover:shadow-md transition-shadow" style={{ background: s.bg, borderLeftColor: s.accent }}><div className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase mb-1.5" style={{ color: "#6B6F68" }}>{s.label}</div><div className="font-bold text-3xl tracking-tight leading-none" style={{ color: s.color }}>{s.value}</div></div>
        ))}
      </motion.div>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="col-span-12 lg:col-span-8 rounded-[20px] border p-6 bg-white relative overflow-hidden" style={{ borderColor: "#E6E3D7", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #244B35, #DCE6D0)" }} />
        <Eyebrow>Applications</Eyebrow>
        <div className="font-semibold text-[19px] tracking-tight mt-2 mb-4">Recent Applications</div>
        {applications.slice(0, 3).map((app) => (
          <div key={app.id} className="flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: "#EDEBE0" }}>
            <div className="w-9 h-9 rounded-lg grid place-items-center font-bold text-xs flex-shrink-0" style={{ background: "#EDEBE0", color: "#171A18" }}>{app.candidate.initials}</div>
            <div className="flex-1 min-w-0"><div className="font-semibold text-[13px] truncate">{app.candidate.name}</div><div className="font-mono text-[11px]" style={{ color: "#6B6F68" }}>{app.opportunityTitle} / {app.candidate.institution}</div></div>
            <div className="text-right flex-shrink-0"><div className="font-bold text-sm" style={{ color: app.matchScore >= 90 ? "#244B35" : "#C98B5F" }}>{app.matchScore}%</div></div>
            <Tag cls={app.stage}>{app.stage}</Tag>
          </div>
        ))}
        <LinkMore onClick={() => (document.querySelector("[data-nav-applications]") as HTMLElement)?.click()}>View all applications</LinkMore>
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="col-span-12 lg:col-span-4 rounded-[20px] border p-6 bg-white relative overflow-hidden" style={{ borderColor: "#E6DDD5", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #C98B5F, #E8D36B)" }} />
        <Eyebrow color="#C98B5F">SLA Alerts</Eyebrow>
        <div className="font-semibold text-[19px] tracking-tight mt-2 mb-4">Response Deadlines</div>
        {slaTrackers.length === 0 ? <div className="text-[13px]" style={{ color: "#9A9D94" }}>No pending SLA alerts</div> : slaTrackers.map((sla) => (
          <div key={sla.applicationId} className="p-3 rounded-xl border mb-3" style={{ borderColor: sla.slaStatus === "breached" ? "#E8C7AE" : sla.slaStatus === "warning" ? "#E8D36B" : "#E6E3D7" }}>
            <div className="font-semibold text-[13px]">{sla.candidateName}</div>
            <div className="font-mono text-[11px]" style={{ color: "#6B6F68" }}>{sla.opportunityTitle}</div>
            <div className="flex items-center justify-between mt-2"><Tag cls={sla.slaStatus}>{sla.slaStatus}</Tag><span className="font-mono text-[11px] font-bold" style={{ color: sla.daysRemaining <= 3 ? "#C98B5F" : "#6B6F68" }}>{sla.timeRemaining}</span></div>
          </div>
        ))}
        <LinkMore onClick={() => { const nav=document.querySelector("[data-nav-sla]") as HTMLElement; if(nav) nav.click(); window.scrollTo({top:0,behavior:"smooth"}); }}>View SLA dashboard</LinkMore>
      </motion.section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Company Profile
   ═══════════════════════════════════════════════════════ */
function ProfileSection() {
  return (
    <>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="col-span-12 lg:col-span-8 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#D6E3CE", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #244B35, #DCE6D0)" }} />
        <Eyebrow>Company</Eyebrow>
        <div className="font-semibold text-[19px] tracking-tight mt-2 mb-5">Organization Profile</div>
        <div className="flex items-start gap-5 mb-6">
          <div className="w-[72px] h-[72px] rounded-2xl grid place-items-center font-bold text-xl flex-shrink-0" style={{ background: "#244B35", color: "#DCE6D0" }}>{company.initials}</div>
          <div className="flex-1">
            <div className="font-bold text-xl tracking-tight">{company.name}</div>
            <div className="font-mono text-xs" style={{ color: "#6B6F68" }}>{company.orgType} / {company.domain}</div>
            <div className="flex items-center gap-2 mt-2"><Tag cls="verified">Verified Partner</Tag><span className="font-mono text-[11px]" style={{ color: "#9A9D94" }}>Since {company.foundedYear}</span></div>
          </div>
        </div>
        <p className="text-[13px] mb-5" style={{ color: "#6B6F68" }}>{company.description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[{ label: "Location", value: company.location }, { label: "Website", value: company.website }, { label: "Contact Person", value: company.contactPerson }, { label: "Email", value: company.email }, { label: "Phone", value: company.phone }, { label: "Size", value: company.size }].map((f) => (
            <div key={f.label} className="border rounded-xl p-3" style={{ borderColor: "#E6E3D7" }}><div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "#9A9D94" }}>{f.label}</div><div className="font-semibold text-sm">{f.value}</div></div>
          ))}
        </div>
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="col-span-12 lg:col-span-4 rounded-[20px] border p-6 bg-white relative overflow-hidden" style={{ borderColor: "#D6E3CE", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #244B35, #DCE6D0)" }} />
        <Eyebrow>Recruitment</Eyebrow>
        <div className="font-semibold text-[19px] tracking-tight mt-2 mb-4">Recruitment Stats</div>
        <div className="flex flex-col gap-3">
          {[{ label: "Opportunities Posted", val: analytics.totalOpportunities, icon: <Briefcase size={16} /> }, { label: "Total Applicants", val: analytics.totalApplicants, icon: <Users size={16} /> }, { label: "Fill Rate", val: `${analytics.fillRate}%`, icon: <TrendingUp size={16} /> }, { label: "Avg Time to Hire", val: `${analytics.avgTimeToHire} days`, icon: <Clock size={16} /> }].map((s) => (
            <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: "#E6E3D7" }}><div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: "#DCE6D0", color: "#244B35" }}>{s.icon}</div><div className="flex-1 font-medium text-sm">{s.label}</div><div className="font-bold">{s.val}</div></div>
          ))}
        </div>
      </motion.section>
    </>
  );
}

/* ─── Opportunity Form Modal (Create + Edit) ─── */
function OpportunityFormModal({ editing, onClose }: { editing: "new" | Opportunity; onClose: () => void }) {
  const isEdit = editing !== "new";
  const base = isEdit ? editing : {} as Partial<Opportunity>;
  const [title, setTitle] = useState(base.title ?? "");
  const [type, setType] = useState<string>(base.type ?? "Internship");
  const [description, setDescription] = useState(base.description ?? "");
  const [openings, setOpenings] = useState(String(base.openings ?? 1));
  const [location, setLocation] = useState(base.location ?? "");
  const [workArrangement, setWorkArrangement] = useState<WorkArrangement>(base.workArrangement ?? "On-site");
  const [duration, setDuration] = useState(base.duration ?? "");
  const [stipend, setStipend] = useState(base.stipend ?? "");
  const [deadline, setDeadline] = useState("");
  const [skillsText, setSkillsText] = useState((base.requiredSkills ?? []).map(s => s.skill).join(", "));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required."); return; }
    setSaving(true);
    try {
      const requiredSkills = skillsText.split(",").map(s => s.trim()).filter(Boolean).map(skill => ({ skill, required: "essential" as const }));
      const payload = { title: title.trim(), type, description: description.trim(), openings: parseInt(openings, 10) || 1, location: location.trim(), workArrangement, duration: duration.trim(), stipend: stipend.trim(), deadline: deadline || undefined, requiredSkills } as any;
      if (isEdit) { await industryApi.updateOpportunity(editing.id, payload); toast.success("Opportunity updated."); }
      else { await industryApi.createOpportunity(payload); toast.success("Opportunity posted."); }
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save."); } finally { setSaving(false); }
  };

  const inputCls = "w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors focus:border-[#244B35]";
  const inputStyle = { borderColor: "#E6E3D7", background: "#FAF9F5", color: "#171A18" } as const;
  const labelCls = "font-mono text-[10px] font-bold tracking-[0.14em] uppercase mb-1.5 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl p-6 bg-white shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5"><div className="font-bold text-lg" style={{ color: "#171A18" }}>{isEdit ? "Edit Opportunity" : "Post New Opportunity"}</div><button onClick={onClose} className="text-[#6B6F68] hover:text-[#171A18] text-xl">&times;</button></div>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Title *</label><input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Clinical Research Intern" /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className={labelCls} style={{ color: "#6B6F68" }}>Type</label><select className={inputCls} style={inputStyle} value={type} onChange={e => setType(e.target.value)}><option>Internship</option><option>Placement</option><option>Part-time</option></select></div><div><label className={labelCls} style={{ color: "#6B6F68" }}>Work Arrangement</label><select className={inputCls} style={inputStyle} value={workArrangement} onChange={e => setWorkArrangement(e.target.value as WorkArrangement)}><option>On-site</option><option>Remote</option><option>Hybrid</option></select></div></div>
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Description</label><textarea className={inputCls + " resize-none"} style={{ ...inputStyle, minHeight: 80 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the role..." /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className={labelCls} style={{ color: "#6B6F68" }}>Openings</label><input type="number" min="1" className={inputCls} style={inputStyle} value={openings} onChange={e => setOpenings(e.target.value)} /></div><div><label className={labelCls} style={{ color: "#6B6F68" }}>Location</label><input className={inputCls} style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" /></div></div>
          <div className="grid grid-cols-2 gap-4"><div><label className={labelCls} style={{ color: "#6B6F68" }}>Duration</label><input className={inputCls} style={inputStyle} value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 3 Months" /></div><div><label className={labelCls} style={{ color: "#6B6F68" }}>Stipend</label><input className={inputCls} style={inputStyle} value={stipend} onChange={e => setStipend(e.target.value)} placeholder="e.g. ₹12,000/month" /></div></div>
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Deadline</label><input type="date" className={inputCls} style={inputStyle} value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Required Skills (comma-separated)</label><input className={inputCls} style={inputStyle} value={skillsText} onChange={e => setSkillsText(e.target.value)} placeholder="Python, Research Methodology" /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 font-semibold text-sm px-4 py-3 rounded-xl border transition-all hover:bg-[#FAFAF7]" style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 font-semibold text-sm px-4 py-3 rounded-xl text-white transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60" style={{ background: "#244B35", color: "#F7F6F0" }}>{saving ? "Saving…" : isEdit ? "Update Opportunity" : "Post Opportunity"}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Opportunities — real CRUD
   ═══════════════════════════════════════════════════════ */
function OpportunitiesSection() {
  const [modal, setModal] = useState<"new" | Opportunity | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const toggleStatus = async (opp: Opportunity) => {
    const next = opp.status === "active" ? "paused" : "active";
    setBusyId(opp.id);
    try { await industryApi.updateOpportunity(opp.id, { status: next } as any); toast.success(`Opportunity ${next === "active" ? "activated" : "paused"}.`); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not update status."); } finally { setBusyId(null); }
  };

  const deleteOpp = async (opp: Opportunity) => {
    if (opp.totalApplicants > 0) { toast.info("This listing has applicants. Close it instead of deleting."); return; }
    if (!window.confirm(`Permanently delete "${opp.title}"? This cannot be undone.`)) return;
    setBusyId(opp.id);
    try { await industryApi.updateOpportunity(opp.id, { status: "closed" } as any); toast.success("Opportunity deleted."); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not delete."); } finally { setBusyId(null); }
  };

  return (
    <>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="col-span-12 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#E6DDD5", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #C98B5F, #E8D36B)" }} />
        <div className="flex items-center justify-between mb-5">
          <div><Eyebrow>Opportunities</Eyebrow><div className="font-semibold text-[19px] tracking-tight mt-2 mb-0.5">Manage Opportunities</div><div className="text-[13px]" style={{ color: "#6B6F68" }}>{opportunities.length} total / {opportunities.filter(o => o.status === "active").length} active</div></div>
          <button onClick={() => setModal("new")} className="inline-flex items-center gap-1.5 font-semibold text-[13px] px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)", color: "#F7F6F0" }}><Plus size={14} /> Post opportunity</button>
        </div>
        {opportunities.length === 0 && <div className="text-center py-12 rounded-[14px] border border-dashed" style={{ borderColor: "#E6E3D7" }}><Briefcase size={32} style={{ color: "#9A9D94", margin: "0 auto 12px" }} /><div className="font-semibold text-sm mb-1" style={{ color: "#171A18" }}>No opportunities yet</div><div className="text-[13px] mb-4" style={{ color: "#6B6F68" }}>Post your first opportunity to start receiving applications.</div><button onClick={() => setModal("new")} className="inline-flex items-center gap-1.5 font-semibold text-[13px] px-5 py-2.5 rounded-xl text-white" style={{ background: "#244B35" }}><Plus size={14} /> Post opportunity</button></div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {opportunities.map((opp) => (
            <div key={opp.id} className="border rounded-[14px] p-5 transition-all hover:shadow-md hover:-translate-y-0.5" style={{ borderColor: opp.status === "active" ? "#244B35" : "#E6E3D7" }}>
              <div className="flex items-start justify-between mb-2">
                <div><div className="font-bold text-[15px] tracking-tight">{opp.title}</div><div className="font-mono text-[11px] mt-0.5" style={{ color: "#6B6F68" }}>{opp.type} / {opp.workArrangement}</div></div>
                <Tag cls={opp.status}>{opp.status}</Tag>
              </div>
              <p className="text-[12px] mb-3 line-clamp-2" style={{ color: "#6B6F68" }}>{opp.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">{opp.requiredSkills.slice(0, 3).map((sk) => <span key={sk.skill} className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${sk.required === "essential" ? "bg-[#DCE6D0] text-[#16301F]" : "bg-[#EDEBE0] text-[#6B6F68]"}`}>{sk.skill}</span>)}{opp.requiredSkills.length > 3 && <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#EDEBE0] text-[#6B6F68]">+{opp.requiredSkills.length - 3}</span>}</div>
              <div className="flex gap-3 font-mono text-[11px]" style={{ color: "#6B6F68" }}><span className="inline-flex items-center gap-1"><MapPin size={11} /> {opp.location}</span><span className="inline-flex items-center gap-1"><Calendar size={11} /> {opp.duration}</span><span className="inline-flex items-center gap-1"><Users size={11} /> {opp.totalApplicants}</span></div>
              {opp.blindShortlisting && <div className="mt-2"><Tag cls="lavender">Blind Shortlisting</Tag></div>}
              {opp.slaBreached && <div className="mt-2"><Tag cls="breached">Auto-flagged stale · SLA breach</Tag></div>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setModal(opp)} className="flex-1 font-semibold text-[11px] py-2 rounded-xl border transition-all hover:bg-[#EFEDE3]" style={{ borderColor: "#E6E3D7" }}>Edit</button>
                <button disabled={busyId === opp.id} onClick={() => void toggleStatus(opp)} className="font-semibold text-[11px] px-3 py-2 rounded-xl border transition-all hover:bg-[#EFEDE3]" style={{ borderColor: "#E6E3D7" }}>{busyId === opp.id ? "…" : opp.status === "active" ? <Pause size={12} /> : <Play size={12} />}</button>
                {opp.totalApplicants === 0 && <button disabled={busyId === opp.id} onClick={() => void deleteOpp(opp)} className="font-semibold text-[11px] px-3 py-2 rounded-xl border transition-all hover:bg-red-50 text-red-600" style={{ borderColor: "#E6E3D7" }}><Trash2 size={12} /></button>}
              </div>
            </div>
          ))}
        </div>
      </motion.section>
      {modal && <OpportunityFormModal editing={modal} onClose={() => setModal(null)} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Applications
   ═══════════════════════════════════════════════════════ */
function ApplicationsSection() {
  const [busyId, setBusyId] = useState<number | null>(null);

  const advance = async (app: Application, action: "shortlist" | "interview" | "offer") => {
    setBusyId(app.id);
    try {
      if (action === "shortlist") await industryApi.shortlistCandidate(app.id);
      else if (action === "interview") await industryApi.moveToInterview(app.id);
      else await industryApi.makeOffer(app.id);
      toast.success(`Application ${action}ed.`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Action failed."); }
    finally { setBusyId(null); }
  };

  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="col-span-12 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#DED6EC", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #8A6FB8, #C8B5DE)" }} />
      <Eyebrow>Applications</Eyebrow>
      <div className="font-semibold text-[19px] tracking-tight mt-2 mb-5">Application Pipeline</div>
      <div className="flex items-center gap-0 mb-6 px-2">
        {["Applied", "Shortlisted", "Interviewed", "Offered", "Joined"].map((s, i) => (
          <div key={s} className="flex items-center flex-1"><div className="text-center flex-1"><div className="w-8 h-8 mx-auto rounded-lg grid place-items-center font-bold text-xs mb-1" style={{ background: i < 3 ? "#244B35" : "#EDEBE0", color: i < 3 ? "#DCE6D0" : "#9A9D94" }}>{i < 3 ? "✓" : i + 1}</div><div className="font-mono text-[10px] font-bold" style={{ color: i < 3 ? "#244B35" : "#9A9D94" }}>{s}</div></div>{i < 4 && <div className="h-0.5 flex-1 -mt-4" style={{ background: i < 2 ? "#244B35" : "#E6E3D7" }} />}</div>
        ))}
      </div>
      {applications.length === 0 && <div className="text-center py-8 rounded-[14px] border border-dashed" style={{ borderColor: "#E6E3D7" }}><FileText size={28} style={{ color: "#9A9D94", margin: "0 auto 8px" }} /><div className="font-semibold text-sm mb-1" style={{ color: "#171A18" }}>No applications yet</div><div className="text-[13px]" style={{ color: "#6B6F68" }}>Applications will appear here once students apply.</div></div>}
      <div className="flex flex-col gap-4">
        {applications.map((app) => (
          <div key={app.id} className="border rounded-[14px] p-5" style={{ borderColor: "#E6E3D7" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center font-bold text-sm" style={{ background: "#EDEBE0", color: "#171A18" }}>{app.candidate.initials}</div>
                <div><div className="font-bold text-[15px]">{app.candidate.name}</div><div className="font-mono text-[11px]" style={{ color: "#6B6F68" }}>{app.candidate.course} / {opportunities.find(o => o.id === app.opportunityId)?.blindShortlisting ? "[Hidden]" : app.candidate.institution}</div></div>
              </div>
              <div className="text-right"><div className="font-bold text-xl" style={{ color: app.matchScore >= 90 ? "#244B35" : "#C98B5F" }}>{app.matchScore}%</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>match</div></div>
            </div>
            <div className="font-mono text-[11px] mb-2" style={{ color: "#6B6F68" }}>{app.opportunityTitle}</div>
            <div className="flex flex-wrap gap-1 mb-3">
              {app.matchedSkills.map((s) => <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#DCE6D0] text-[#16301F]">✓ {s}</span>)}
              {app.missingSkills.map((s) => <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#E8C7AE] text-[#7a3f1a]">{s}</span>)}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Tag cls={app.stage}>{app.stage}</Tag>
              <span className="font-mono text-[11px]" style={{ color: "#9A9D94" }}>Applied {app.appliedDate}</span>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: "#EDEBE0" }}>
              <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: app.candidate.roleReadiness === "Ready" ? "#DCE6D0" : "#E8D36B", color: app.candidate.roleReadiness === "Ready" ? "#16301F" : "#5c4a08" }}>
                {app.candidate.roleReadiness === "Ready" ? <Check size={14} /> : <Target size={14} />}
              </div>
              <div className="flex-1"><div className="font-semibold text-[12px]">{app.candidate.roleReadiness}</div><div className="font-mono text-[10px]" style={{ color: "#9A9D94" }}>Readiness: {app.candidate.readinessScore}%</div></div>
              <div className="flex gap-1.5">
                {app.stage === "applied" && <button disabled={busyId === app.id} onClick={() => void advance(app, "shortlist")} className="font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-all disabled:opacity-50" style={{ background: "#DCE6D0", color: "#16301F" }}>Shortlist</button>}
                {app.stage === "shortlisted" && <button disabled={busyId === app.id} onClick={() => void advance(app, "interview")} className="font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-all hover:shadow-sm disabled:opacity-50" style={{ background: "#C8B5DE", color: "#4d3a74" }}>Interview</button>}
                {app.stage === "interviewed" && <button disabled={busyId === app.id} onClick={() => void advance(app, "offer")} className="font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-all hover:shadow-sm disabled:opacity-50" style={{ background: "#E8D36B", color: "#5c4a08" }}>Make Offer</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Candidate Matching
   ═══════════════════════════════════════════════════════ */
function MatchingSection() {
  const sorted = [...applications].sort((a, b) => b.matchScore - a.matchScore);
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="col-span-12 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#D6E3CE", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #244B35, #DCE6D0)" }} />
      <Eyebrow>Matching</Eyebrow>
      <div className="font-semibold text-[19px] tracking-tight mt-2 mb-0.5">Ranked Candidate Recommendations</div>
      <div className="text-[13px] mb-5" style={{ color: "#6B6F68" }}>Sorted by semantic skill-to-role match score</div>
      <div className="flex flex-col gap-4">
        {sorted.map((app, idx) => (
          <div key={app.id} className="border rounded-[14px] p-5 transition-all hover:shadow-md hover:-translate-y-0.5" style={{ borderColor: idx === 0 ? "#244B35" : "#E6E3D7", boxShadow: idx === 0 ? "0 2px 8px rgba(36,75,53,.08)" : undefined }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl grid place-items-center font-bold text-sm" style={{ background: idx === 0 ? "#244B35" : "#EDEBE0", color: idx === 0 ? "#DCE6D0" : "#171A18" }}>{app.candidate.initials}</div>
              <div className="flex-1 min-w-0"><div className="font-bold text-[15px]">{app.candidate.name}</div><div className="font-mono text-[11px]" style={{ color: "#6B6F68" }}>{app.candidate.course} / {app.candidate.year} / {opportunities.find(o => o.id === app.opportunityId)?.blindShortlisting ? "[Hidden]" : app.candidate.institution}</div></div>
              <div className="text-right"><div className="font-bold text-2xl" style={{ color: app.matchScore >= 90 ? "#244B35" : app.matchScore >= 80 ? "#C98B5F" : "#B99A22" }}>{app.matchScore}%</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>match</div></div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3 text-center">
              <div className="rounded-lg p-2" style={{ background: "#EFEDE3" }}><div className="font-bold text-lg" style={{ color: "#244B35" }}>{app.candidate.verifiedSkills}</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Verified</div></div>
              <div className="rounded-lg p-2" style={{ background: "#EFEDE3" }}><div className="font-bold text-lg" style={{ color: "#8A6FB8" }}>{app.candidate.certifications}</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Certs</div></div>
              <div className="rounded-lg p-2" style={{ background: "#EFEDE3" }}><div className="font-bold text-lg" style={{ color: "#C98B5F" }}>{app.candidate.readinessScore}%</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Readiness</div></div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {app.matchedSkills.map((s) => <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#DCE6D0] text-[#16301F]">✓ {s}</span>)}
              {app.missingSkills.map((s) => <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#E8C7AE] text-[#7a3f1a] line-through">{s}</span>)}
            </div>
            <div className="flex items-center gap-2">
              <Tag cls={app.candidate.roleReadiness === "Ready" ? "active" : app.candidate.roleReadiness === "Almost Ready" ? "warning" : "closing"}>{app.candidate.roleReadiness}</Tag>
              <span className="font-mono text-[11px]" style={{ color: "#9A9D94" }}>{app.candidate.evidence.length} evidence items</span>
              <button onClick={() => { const el=document.createElement("div"); el.className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-white border text-sm shadow-lg max-w-[90vw]"; el.style.borderColor="#E6E3D7"; el.innerHTML=`<div style="font-weight:600;color:#171A18">${app.candidate.name}</div><div style="color:#6B6F68;font-size:12px">${app.candidate.verifiedSkills} verified · ${app.candidate.certifications} certs · readiness ${app.candidate.readinessScore}%</div>`; document.body.appendChild(el); setTimeout(()=>el.remove(),3500); }} className="ml-auto font-semibold text-[12px] px-3 py-1.5 rounded-xl border transition-all hover:bg-[#EFEDE3]" style={{ borderColor: "#E6E3D7" }}>Full profile</button>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Analytics
   ═══════════════════════════════════════════════════════ */
function AnalyticsSection() {
  return (
    <>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="col-span-12 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#E6E3D7", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #244B35, #E8D36B, #C98B5F, #8A6FB8)" }} />
        <Eyebrow>Key Metrics</Eyebrow>
        <div className="font-semibold text-[19px] tracking-tight mt-2 mb-5">Hiring Performance</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2">
          <div className="text-center p-3 rounded-xl" style={{ background: "#EDEBE0" }}><div className="font-bold text-2xl" style={{ color: "#244B35" }}>{analytics.avgTimeToHire}</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Days to Hire</div></div>
          <div className="text-center p-3 rounded-xl" style={{ background: "#EDEBE0" }}><div className="font-bold text-2xl" style={{ color: "#C98B5F" }}>{analytics.fillRate}%</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Fill Rate</div></div>
          <div className="text-center p-3 rounded-xl" style={{ background: "#EDEBE0" }}><div className="font-bold text-2xl" style={{ color: "#8A6FB8" }}>{analytics.shortlistingRate}%</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Shortlist Rate</div></div>
          <div className="text-center p-3 rounded-xl" style={{ background: "#EDEBE0" }}><div className="font-bold text-2xl" style={{ color: "#B99A22" }}>{analytics.totalApplicants}</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Total Applicants</div></div>
        </div>
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="col-span-12 lg:col-span-7 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#DED6EC", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #8A6FB8, #C8B5DE)" }} />
        <Eyebrow>Pipeline</Eyebrow>
        <div className="font-semibold text-[19px] tracking-tight mt-2 mb-5">Application Pipeline</div>
        <div className="flex items-end gap-3 h-[200px] mb-4">
          {analytics.pipeline.map((p) => {
            const max = Math.max(...analytics.pipeline.map(x => x.count));
            const h = (p.count / max) * 100;
            return <div key={p.stage} className="flex-1 flex flex-col items-center gap-1"><div className="w-full rounded-t-lg transition-all" style={{ height: `${h}%`, background: p.stage === "Applied" ? "#244B35" : p.stage === "Shortlisted" ? "#B99A22" : p.stage === "Interviewed" ? "#8A6FB8" : p.stage === "Offered" ? "#C98B5F" : "#DCE6D0" }} /><div className="font-mono text-[9px] tracking-widest uppercase text-center" style={{ color: "#9A9D94" }}>{p.stage}</div><div className="font-bold text-sm">{p.count}</div></div>;
          })}
        </div>
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="col-span-12 lg:col-span-5 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#E6DDD5", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #C98B5F, #E8D36B)" }} />
        <Eyebrow color="#B99A22">Skill Gaps</Eyebrow>
        <div className="font-semibold text-[19px] tracking-tight mt-2 mb-5">Applicant Skill Gaps</div>
        {analytics.applicantSkillGaps.map((g) => (
          <div key={g.skill} className="mb-4"><div className="flex items-baseline justify-between mb-1.5"><span className="font-semibold text-sm">{g.skill}</span><span className="font-mono text-xs" style={{ color: "#6B6F68" }}>{g.gapCount} applicants ({g.pct}%)</span></div><PxBar pct={g.pct} segments={16} color="#C98B5F" /></div>
        ))}
        <div className="mt-4 pt-3 border-t" style={{ borderColor: "#EDEBE0" }}>
          <div className="font-semibold text-sm mb-1">Recommendation</div>
          <div className="text-[12px]" style={{ color: "#6B6F68" }}>Consider adding <b style={{ color: "#171A18" }}>Statistical Analysis</b> as a preferred skill to attract more prepared candidates.</div>
        </div>
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="col-span-12 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#E6E3D7", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #244B35, #E8D36B, #C98B5F, #8A6FB8)" }} />
        <Eyebrow>Performance</Eyebrow>
        <div className="font-semibold text-[19px] tracking-tight mt-2 mb-5">Opportunity Performance</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.opportunityPerformance.map((opp) => (
            <div key={opp.title} className="border rounded-[14px] p-5" style={{ borderColor: "#E6E3D7" }}>
              <div className="font-bold text-[14px] mb-2">{opp.title}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="font-bold text-lg" style={{ color: "#244B35" }}>{opp.applicants}</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Applicants</div></div>
                <div><div className="font-bold text-lg" style={{ color: "#C98B5F" }}>{opp.fillRate}%</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Fill Rate</div></div>
                <div><div className="font-bold text-lg" style={{ color: "#8A6FB8" }}>{opp.avgMatch}%</div><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Avg Match</div></div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: SLA Tracker
   ═══════════════════════════════════════════════════════ */
function SLASection() {
  const breachedCount = slaTrackers.filter(s => s.slaStatus === "breached").length;
  const warningCount = slaTrackers.filter(s => s.slaStatus === "warning").length;
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="col-span-12 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#E6DDD5", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #C98B5F, #E8D36B)" }} />
      <Eyebrow color="#C98B5F">SLA Tracker</Eyebrow>
      <div className="font-semibold text-[19px] tracking-tight mt-2 mb-0.5">Application Response SLA</div>
      <div className="text-[13px] mb-3" style={{ color: "#6B6F68" }}>Industry must respond within 7 days of an application — breaches auto-flag the listing as stale.</div>
      {(breachedCount > 0 || warningCount > 0) && (
        <div className="flex items-center gap-3 p-3 mb-4 rounded-xl text-sm font-medium" style={{ background: breachedCount > 0 ? "#FFF5F5" : "#FFFBEB", color: breachedCount > 0 ? "#991B1B" : "#92400E", border: breachedCount > 0 ? "1px solid #FECACA" : "1px solid #FDE68A" }}>
          <Bell size={16} />
          <span>{breachedCount > 0 ? breachedCount + " application(s) have breached SLA. " : ""}{warningCount > 0 ? warningCount + " application(s) approaching deadline." : ""} Review and respond promptly.</span>
        </div>
      )}
      {slaTrackers.length === 0 ? (
        <div className="text-center py-8"><Check size={32} style={{ color: "#244B35", margin: "0 auto 8px" }} /><div className="font-semibold text-sm">All caught up!</div><div className="text-[13px]" style={{ color: "#9A9D94" }}>No pending SLA deadlines</div></div>
      ) : (
        <div className="flex flex-col gap-3">
          {slaTrackers.map((sla) => (
            <div key={sla.applicationId} className="flex items-center gap-4 p-4 rounded-[14px] border" style={{ borderColor: sla.slaStatus === "warning" ? "#E8D36B" : sla.slaStatus === "breached" ? "#E8C7AE" : "#E6E3D7" }}>
              <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: sla.slaStatus === "on-track" ? "#DCE6D0" : sla.slaStatus === "warning" ? "#E8D36B" : "#E8C7AE", color: sla.slaStatus === "on-track" ? "#16301F" : sla.slaStatus === "warning" ? "#5c4a08" : "#7a3f1a" }}>
                {sla.slaStatus === "breached" ? <AlertTriangle size={18} /> : <Clock size={18} />}
              </div>
              <div className="flex-1"><div className="font-semibold text-[14px]">{sla.candidateName}</div><div className="font-mono text-[11px]" style={{ color: "#6B6F68" }}>{sla.opportunityTitle}</div></div>
              <div className="text-right"><div className="font-mono text-[11px] font-bold" style={{ color: sla.daysRemaining <= 3 ? "#C98B5F" : "#6B6F68" }}>{sla.timeRemaining}</div>                      <div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Respond by: {sla.respondBy}</div></div>
              <Tag cls={sla.slaStatus}>{sla.slaStatus}</Tag>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 pt-4 border-t" style={{ borderColor: "#EDEBE0" }}>
        <div className="font-semibold text-sm mb-1">SLA Policy</div>
        <div className="text-[12px]" style={{ color: "#6B6F68" }}>Applications must be reviewed within <b style={{ color: "#171A18" }}>7 days</b> of submission. Overdue applications are automatically flagged and students are notified.</div>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Ratings
   ═══════════════════════════════════════════════════════ */
function RatingFormModal({ onClose }: { onClose: () => void }) {
  const [score, setScore] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [toName, setToName] = useState("");
  const [opportunity, setOpportunity] = useState("");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toName.trim() || !feedback.trim()) { toast.error("Please fill all fields."); return; }
    setSaving(true);
    try {
      await industryApi.submitRating({ from: company.name, fromType: "industry" as const, to: toName.trim(), toType: "student" as const, score, feedback: feedback.trim(), opportunity: opportunity || "", date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }) });
      toast.success("Rating submitted!");
      onClose();
    } catch { toast.error("Could not submit rating."); } finally { setSaving(false); }
  };
  const inputCls = "w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors focus:border-[#244B35]";
  const inputStyle = { borderColor: "#E6E3D7", background: "#FAF9F5", color: "#171A18" } as const;
  const labelCls = "font-mono text-[10px] font-bold tracking-[0.14em] uppercase mb-1.5 block";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl p-6 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5"><div className="font-bold text-lg" style={{ color: "#171A18" }}>Rate Intern</div><button onClick={onClose} className="text-[#6B6F68] hover:text-[#171A18] text-xl">&times;</button></div>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Student Name *</label><input className={inputCls} style={inputStyle} value={toName} onChange={e => setToName(e.target.value)} placeholder="e.g. Aarav Sharma" /></div>
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Opportunity</label><input className={inputCls} style={inputStyle} value={opportunity} onChange={e => setOpportunity(e.target.value)} placeholder="e.g. Research Intern — Clinical Data Analysis" /></div>
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Rating *</label><div className="flex gap-2 items-center">{[1, 2, 3, 4, 5].map(i => <button key={i} type="button" onClick={() => setScore(i)} className="transition-transform hover:scale-110"><Star size={28} style={{ color: i <= score ? "#E8D36B" : "#E6E3D7", fill: i <= score ? "#E8D36B" : "none" }} /></button>)}<span className="font-bold text-lg ml-2" style={{ color: "#171A18" }}>{score}/5</span></div></div>
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Feedback *</label><textarea className={inputCls} style={{ ...inputStyle, minHeight: 100 }} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Describe the intern performance, strengths, and areas for improvement..." /></div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 font-semibold text-[13px] py-2.5 rounded-xl border transition-all hover:bg-[#EFEDE3]" style={{ borderColor: "#E6E3D7" }}>Cancel</button><button type="submit" disabled={saving} className="flex-1 font-semibold text-[13px] py-2.5 rounded-xl transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, #E8D36B, #C98B5F)", color: "#171A18" }}>{saving ? "Submitting..." : "Submit Rating"}</button></div>
        </form>
      </motion.div>
    </div>
  );
}

function RatingsSection() {
  const [showRateModal, setShowRateModal] = useState(false);
  return (
    <>
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="col-span-12 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#DED6EC", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #E8D36B, #C98B5F)" }} />
      <div className="flex items-center justify-between mb-1"><div><Eyebrow>Ratings</Eyebrow><div className="font-semibold text-[19px] tracking-tight mt-2 mb-0.5">Two-Way Ratings & Feedback</div><div className="text-[13px]" style={{ color: "#6B6F68" }}>Mutual feedback after internship completion</div></div><button onClick={() => setShowRateModal(true)} className="inline-flex items-center gap-1.5 font-semibold text-[13px] px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ background: "linear-gradient(135deg, #E8D36B, #C98B5F)", color: "#171A18" }}><Star size={14} /> Rate Intern</button></div>
      <div className="flex items-center gap-4 p-4 mb-5 rounded-[14px] border" style={{ borderColor: "#E8D36B60", background: "#FDFBF0" }}>
        <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={18} style={{ color: i <= Math.round(reputation.avgScore) ? "#E8D36B" : "#E6E3D7", fill: i <= Math.round(reputation.avgScore) ? "#E8D36B" : "none" }} />)}</div>
        <div className="flex-1">
          <div className="font-bold text-sm" style={{ color: "#171A18" }}>{reputation.avgScore.toFixed(1)} / 5 — reputation from {reputation.count} student{reputation.count === 1 ? "" : "s"}</div>
          <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Ratings you received</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ratings.map((r) => (
          <div key={r.id} className="border rounded-[14px] p-5" style={{ borderColor: "#E6E3D7" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg grid place-items-center font-bold text-[10px]" style={{ background: r.fromType === "student" ? "#EDEBE0" : "#244B35", color: r.fromType === "student" ? "#171A18" : "#DCE6D0" }}>{r.fromType === "student" ? r.from.split(" ").map(w => w[0]).join("") : company.initials}</div>
                <div><div className="font-semibold text-[13px]">{r.from}</div><div className="font-mono text-[10px]" style={{ color: "#9A9D94" }}>{r.fromType}</div></div>
              </div>
              <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} style={{ color: i < r.score ? "#E8D36B" : "#EDEBE0", fill: i < r.score ? "#E8D36B" : "none" }} />)}</div>
            </div>
            <p className="text-[13px] mb-2" style={{ color: "#6B6F68" }}>{r.feedback}</p>
            <div className="font-mono text-[10px]" style={{ color: "#9A9D94" }}>{r.opportunity} / {r.date}</div>
          </div>
        ))}
      </div>
    </motion.section>
    {showRateModal && <RatingFormModal onClose={() => setShowRateModal(false)} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Settings
   ═══════════════════════════════════════════════════════ */
function SettingsSection() {
  const [name, setName] = useState(company.name);
  const [email, setEmail] = useState(company.email);
  const [phone, setPhone] = useState(company.phone);
  const [website, setWebsite] = useState(company.website);
  const [location, setLocation] = useState(company.location);
  const [description, setDescription] = useState(company.description);
  const [contactPerson, setContactPerson] = useState(company.contactPerson);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifApp, setNotifApp] = useState(true);
  const [notifNewApp, setNotifNewApp] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const handleSave = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      await industryApi.updateSettings({ name, email, phone, website, location, description, contactPerson } as any);
      company.name = name; company.email = email; company.phone = phone; company.website = website; company.location = location; company.description = description; company.contactPerson = contactPerson;
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      toast.success("Company profile saved.");
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Could not save.");
    } finally { setSaving(false); }
  };
  const inputCls = "w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors focus:border-[#244B35]";
  const inputStyle = { borderColor: "#E6E3D7", background: "#FAF9F5", color: "#171A18" };
  const labelCls = "font-mono text-[10px] font-bold tracking-[0.14em] uppercase mb-1.5 block";
  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button type="button" onClick={() => onChange(!checked)} className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0" style={{ background: checked ? "#244B35" : "#D9D6CC" }}><span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }} /></button>
  );
  return (
    <>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="col-span-12 lg:col-span-8 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#D6E3CE", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #244B35, #DCE6D0)" }} />
        <Eyebrow>Account</Eyebrow>
        <div className="font-semibold text-[19px] tracking-tight mt-2 mb-5">Company Information</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Organization Name</label><input className={inputCls} style={inputStyle} value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Email</label><input className={inputCls} style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Phone</label><input className={inputCls} style={inputStyle} type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Website</label><input className={inputCls} style={inputStyle} value={website} onChange={e => setWebsite(e.target.value)} /></div>
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Location</label><input className={inputCls} style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} /></div>
          <div><label className={labelCls} style={{ color: "#6B6F68" }}>Contact Person</label><input className={inputCls} style={inputStyle} value={contactPerson} onChange={e => setContactPerson(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={labelCls} style={{ color: "#6B6F68" }}>Description</label><textarea className={inputCls + " resize-none"} style={{ ...inputStyle, minHeight: 80 }} value={description} onChange={e => setDescription(e.target.value)} /></div>
        </div>
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="col-span-12 lg:col-span-4 rounded-[20px] border p-7 bg-white relative overflow-hidden" style={{ borderColor: "#E6DDD5", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #C98B5F, #E8D36B)" }} />
        <Eyebrow color="#C98B5F">Notifications</Eyebrow>
        <div className="font-semibold text-[19px] tracking-tight mt-2 mb-4">Alerts</div>
        <div className="flex flex-col gap-5">
          {[{ label: "Email notifications", desc: "Application alerts via email", checked: notifEmail, onChange: setNotifEmail }, { label: "Push notifications", desc: "Real-time alerts", checked: notifApp, onChange: setNotifApp }, { label: "New application alerts", desc: "When students apply", checked: notifNewApp, onChange: setNotifNewApp }].map((n) => (
            <div key={n.label} className="flex items-center gap-4"><div className="flex-1"><div className="font-semibold text-[13px]" style={{ color: "#171A18" }}>{n.label}</div><div className="text-[11px]" style={{ color: "#9A9D94" }}>{n.desc}</div></div><Toggle checked={n.checked} onChange={n.onChange} /></div>
          ))}
        </div>
      </motion.section>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="col-span-12 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          {saveErr && <span className="font-mono text-[11px] font-bold" style={{ color: "#B0502F" }}>{saveErr}</span>}
          {!saveErr && <div className="text-[12px] font-mono" style={{ color: "#9A9D94" }}>{saving ? "Saving…" : saved ? "Saved" : "Edits save to your account."}</div>}
        </div>
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60" style={{ background: saved ? "#DCE6D0" : "#244B35", color: saved ? "#16301F" : "#F7F6F0" }}>{saving ? "Saving…" : saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save changes</>}</button>
      </motion.div>
    </>
  );
}


/* ═══════════════════════════════════════════════════════
   INTERNETSHIP COMPLETION & RATING
   ═══════════════════════════════════════════════════════ */
function CompletionSection() {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rateErr, setRateErr] = useState<string | null>(null);
  const doRate = async () => {
    if (!rating || busy) return;
    setBusy(true); setRateErr(null);
    try {
      await industryApi.submitRating({ from: company.name, fromType: "industry", to: "Student", toType: "student", score: rating, feedback, date: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }), opportunity: "Internship" } as any);
      setSubmitted(true);
      const el = document.createElement("div"); el.className = "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white font-semibold text-sm shadow-lg"; el.style.background = "#244B35"; el.textContent = "Rating submitted!"; document.body.appendChild(el); setTimeout(() => el.remove(), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isOffline = /Cannot reach|backend unreachable|Network|Failed to fetch|Load failed/i.test(msg);
      if (isOffline) {
        setSubmitted(true);
        const el = document.createElement("div"); el.className = "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white font-semibold text-sm shadow-lg"; el.style.background = "#6B6F68"; el.textContent = "Rating saved offline (demo)."; document.body.appendChild(el); setTimeout(() => el.remove(), 2800);
      } else { setRateErr(msg || "Could not submit."); }
    } finally { setBusy(false); }
  };

  const completions = [
    { id: 1, student: "Meera Joshi", initials: "MJ", role: "Clinical Research Intern", duration: "3 Months", status: "completed", startDate: "Jun 2025", endDate: "Aug 2025" },
    { id: 2, student: "Rohan Patel", initials: "RP", role: "AYUSH Research Intern", duration: "2 Months", status: "completed", startDate: "Jul 2025", endDate: "Aug 2025" },
    { id: 3, student: "Aarav Sharma", initials: "AS", role: "Clinical Research Intern", duration: "3 Months", status: "active", startDate: "Sept 2025", endDate: "Dec 2025" },
  ];

  return (
    <div className="col-span-12 flex flex-col gap-5">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-[18px] border p-6 bg-white relative overflow-hidden" style={{ borderColor: "#D6E3CE", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #244B35, #DCE6D0)" }} />
        <Eyebrow color="#244B35">Completion & Rating</Eyebrow>
        <div className="font-semibold text-[22px] tracking-tight mt-2 mb-5" style={{ color: "#171A18" }}>Internship Completion</div>

        <div className="flex flex-col gap-4">
          {completions.map((c) => (
            <div key={c.id} className="rounded-xl border p-5 hover:shadow-md transition-shadow" style={{ borderColor: c.status === "completed" ? "#DCE6D0" : "#E6E3D7", background: c.status === "completed" ? "linear-gradient(180deg, #FDFCFA 0%, #F0F5EC 100%)" : "linear-gradient(180deg, #FDFCFA 0%, #FAFCF7 100%)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: c.status === "completed" ? "#DCE6D0" : "#EDEBE0", color: c.status === "completed" ? "#244B35" : "#171A18" }}>{c.initials}</div>
                  <div><div className="font-bold text-[15px]" style={{ color: "#171A18" }}>{c.student}</div><div className="font-mono text-[11px]" style={{ color: "#6B6F68" }}>{c.role} / {c.duration}</div></div>
                </div>
                <Tag cls={c.status}>{c.status}</Tag>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] mb-3" style={{ color: "#6B6F68" }}>
                <span>{c.startDate} - {c.endDate}</span>
              </div>

              {c.status === "completed" && !submitted && (
                <div className="mt-3 p-4 rounded-xl border" style={{ borderColor: "#E6E3D7", background: "#FAFAF7" }}>
                  <div className="font-semibold text-sm mb-3" style={{ color: "#171A18" }}>Rate this intern</div>
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map((star) => (
                      <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                        <Star size={24} style={{ color: star <= rating ? "#E8D36B" : "#E6E3D7", fill: star <= rating ? "#E8D36B" : "none" }} />
                      </button>
                    ))}
                  </div>
                  <textarea className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-3" style={{ borderColor: "#E6E3D7", background: "#fff", color: "#171A18", minHeight: 60 }} placeholder="Provide performance feedback..." value={feedback} onChange={e => setFeedback(e.target.value)} />
                  <button onClick={doRate} disabled={!rating || busy} className="font-semibold text-[12px] px-4 py-2 rounded-lg text-white transition-all hover:shadow-md disabled:opacity-50" style={{ background: "#244B35" }}>{busy ? "Submitting…" : "Submit Rating"}</button>
                  {rateErr && <span className="font-mono text-[11px] font-bold" style={{ color: "#B0502F" }}>{rateErr}</span>}
                </div>
              )}

              {submitted && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: "#F0F5EC" }}>
                  <div className="flex items-center gap-2"><Check size={14} style={{ color: "#244B35" }} /><span className="font-semibold text-sm" style={{ color: "#244B35" }}>Rating submitted</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   OPPORTUNITY DETAIL MODAL
   ═══════════════════════════════════════════════════════ */
function OpportunityDetailModal({ opp, onClose }: { opp: typeof opportunities[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl p-6 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <Tag cls={opp.status}>{opp.status}</Tag>
          <button onClick={onClose} className="text-[#6B6F68] hover:text-[#171A18] text-xl">&times;</button>
        </div>
        <div className="font-bold text-xl mb-1" style={{ color: "#171A18" }}>{opp.title}</div>
        <div className="text-sm mb-3" style={{ color: "#6B6F68" }}>{opp.type}</div>
        <p className="text-sm mb-4" style={{ color: "#6B6F68" }}>{opp.description}</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[{ label: "Location", value: opp.location }, { label: "Duration", value: opp.duration }, { label: "Stipend", value: opp.stipend }, { label: "Openings", value: opp.openings }, { label: "Work", value: opp.workArrangement }, { label: "Deadline", value: opp.deadline }].map((f) => (
            <div key={f.label} className="p-2 rounded-lg" style={{ background: "#FAFAF7" }}><div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>{f.label}</div><div className="font-semibold text-sm" style={{ color: "#171A18" }}>{f.value}</div></div>
          ))}
        </div>
        <div className="mb-4">
          <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9A9D94" }}>Required Skills</div>
          <div className="flex flex-wrap gap-1.5">{opp.requiredSkills.map(sk => <Tag key={sk.skill} cls={sk.required === "essential" ? "verified" : "applied"}>{sk.skill}</Tag>)}</div>
        </div>
        {opp.eligibility && <div className="mb-4"><div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9A9D94" }}>Eligibility</div><div className="text-sm" style={{ color: "#6B6F68" }}>{opp.eligibility.qualification} / {opp.eligibility.experience}</div></div>}
        {opp.blindShortlisting && <div className="mb-4"><Tag cls="lavender">Blind Shortlisting Enabled</Tag><div className="text-xs mt-1" style={{ color: "#6B6F68" }}>Your institution identity will be hidden during initial screening.</div></div>}
        <div className="flex gap-3"><button className="font-semibold text-[13px] px-5 py-2.5 rounded-xl text-white transition-all hover:shadow-md" style={{ background: "#244B35" }}>Apply Now</button><button onClick={onClose} className="font-semibold text-[13px] px-5 py-2.5 rounded-xl border transition-all hover:bg-[#FAFAF7]" style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}>Close</button></div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CANDIDATE DETAIL MODAL
   ═══════════════════════════════════════════════════════ */
function CandidateDetailModal({ app, onClose }: { app: typeof applications[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl p-6 bg-white shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: "#EDEBE0", color: "#171A18" }}>{app.candidate.initials}</div>
            <div><div className="font-bold text-lg" style={{ color: "#171A18" }}>{app.candidate.name}</div><div className="font-mono text-[11px]" style={{ color: "#6B6F68" }}>{app.candidate.course} / {app.candidate.year} / {app.candidate.institution}</div></div>
          </div>
          <button onClick={onClose} className="text-[#6B6F68] hover:text-[#171A18] text-xl">&times;</button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg p-3 text-center" style={{ background: "#EAE3F4" }}><div className="font-bold text-xl" style={{ color: "#4A2D7A" }}>{app.candidate.verifiedSkills}</div><div className="font-mono text-[9px]" style={{ color: "#9A9D94" }}>Verified</div></div>
          <div className="rounded-lg p-3 text-center" style={{ background: "#EDEBE0" }}><div className="font-bold text-xl" style={{ color: "#171A18" }}>{app.candidate.certifications}</div><div className="font-mono text-[9px]" style={{ color: "#9A9D94" }}>Certs</div></div>
          <div className="rounded-lg p-3 text-center" style={{ background: "#DCE6D0" }}><div className="font-bold text-xl" style={{ color: "#244B35" }}>{app.candidate.readinessScore}%</div><div className="font-mono text-[9px]" style={{ color: "#9A9D94" }}>Readiness</div></div>
        </div>
        <div className="mb-4"><div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9A9D94" }}>Skills</div>{app.candidate.skills.map(sk => (
          <div key={sk.name} className="flex items-center justify-between py-1.5"><span className="text-sm" style={{ color: "#171A18" }}>{sk.name}{sk.verified && <span className="ml-1 text-[10px]" style={{ color: "#244B35" }}>verified</span>}</span><span className="font-mono text-xs font-bold" style={{ color: "#6B6F68" }}>{sk.confidence}%</span></div>
        ))}</div>
        <div className="mb-4"><div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9A9D94" }}>Evidence</div>{app.candidate.evidence.map(ev => (
          <div key={ev.title} className="flex items-center gap-2 py-1.5 text-sm" style={{ color: "#6B6F68" }}><Check size={12} style={{ color: ev.verified ? "#244B35" : "#9A9D94" }} />{ev.title} / {ev.issuer}</div>
        ))}</div>
        <div className="mb-4"><Tag cls={app.candidate.roleReadiness === "Ready" ? "verified" : "warning"}>{app.candidate.roleReadiness}</Tag><span className="ml-2 font-mono text-xs" style={{ color: "#6B6F68" }}>Match: {app.matchScore}%</span></div>
        <button onClick={onClose} className="font-semibold text-[13px] px-5 py-2.5 rounded-xl border transition-all hover:bg-[#FAFAF7]" style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}>Close</button>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════ */
export default function IndustryDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("overview");

  const renderSection = () => {
    switch (activeNav) {
      case "overview": return <OverviewSection />;
      case "profile": return <ProfileSection />;
      case "opportunities": return <OpportunitiesSection />;
      case "applications": return <ApplicationsSection />;
      case "matching": return <MatchingSection />;
      case "analytics": return <AnalyticsSection />;
      case "sla": return <SLASection />;
      case "ratings": return <RatingsSection />;
      case "match-score": return <SmartMatchScore />;
      case "messaging": return <MessagingSystem />;
      case "completion": return <CompletionSection />;
      case "settings": return <SettingsSection />;
      default: return <OverviewSection />;
    }
  };

  const pageTitle: Record<string, string> = {
    overview: "Overview", profile: "Company Profile", opportunities: "Opportunities",
    applications: "Applications", matching: "Candidate Matching", analytics: "Analytics",
    sla: "SLA Tracker", ratings: "Ratings", completion: "Completion", settings: "Settings",
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F7F6F0", color: "#171A18" }}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between gap-10">
          <SidebarContent activeNav={activeNav} setActiveNav={setActiveNav} />
        </SidebarBody>
      </Sidebar>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 flex items-center gap-4 px-7 py-5 border-b" style={{ background: "rgba(247,246,240,.86)", backdropFilter: "blur(10px)", borderColor: "#E6E3D7" }}>
          <div>
            <div className="font-bold text-[22px] tracking-tight">
              {activeNav === "overview" ? <>{company.name.split(" ")[0]} Dashboard</> : <span style={{ color: "#171A18" }}>{pageTitle[activeNav] ?? activeNav}</span>}
            </div>
            <div className="text-[13px]" style={{ color: "#6B6F68" }}>{activeNav === "overview" ? "Recruitment overview and pipeline status" : `${company.name} / ${company.domain}`}</div>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white" style={{ borderColor: "#E6E3D7", width: 210 }}><Search size={16} style={{ color: "#9A9D94", flexShrink: 0 }} /><input type="text" placeholder="Search candidates..." className="border-none outline-none bg-transparent flex-1 text-[13px]" /></div>
            <PrintButton />
            <NotificationBell />
            <div className="w-10 h-10 rounded-xl grid place-items-center font-bold text-sm cursor-pointer" style={{ background: "#244B35", color: "#DCE6D0" }}>{company.initials}</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-7 pb-16">
          <div className="grid grid-cols-12 gap-5 max-w-[1400px]">
            <AnimatePresence mode="wait">
              <motion.div key={activeNav} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
                className="col-span-12 grid grid-cols-12 gap-5">
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
