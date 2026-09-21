import { useState, useMemo } from "react";
import {
  Sparkles, TrendingUp, Check, X, ChevronDown, ChevronUp, Target,
  Award, AlertTriangle, BarChart3, GitCompare,
  ArrowUpDown, Filter, Star, GraduationCap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { toast } from "sonner";

/* ─── Types ─── */
interface CandidateMatch {
  candidateId: string;
  name: string;
  initials: string;
  institution: string;
  course: string;
  year: string;
  overallScore: number;
  skillMatch: number;
  experienceMatch: number;
  locationMatch: number;
  culturalFit: number;
  readinessScore: number;
  verifiedSkills: number;
  certifications: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  concerns: string[];
  status: "shortlisted" | "interviewed" | "offered" | "applied" | "new";
}

/* ─── Demo data ─── */
const DEMO_CANDIDATES: CandidateMatch[] = [
  {
    candidateId: "c-1", name: "Aarav Sharma", initials: "AS", institution: "AIIA New Delhi",
    course: "BAMS", year: "3rd Year", overallScore: 92,
    skillMatch: 95, experienceMatch: 80, locationMatch: 100, culturalFit: 90,
    readinessScore: 87, verifiedSkills: 5, certifications: 3,
    matchedSkills: ["Python", "Machine Learning", "Data Analysis", "Clinical Research"],
    missingSkills: ["Statistical Analysis"],
    strengths: ["Strong clinical background", "Verified ML projects", "Research publications", "87% readiness score"],
    concerns: ["Limited industry experience"],
    status: "shortlisted",
  },
  {
    candidateId: "c-2", name: "Ananya Patel", initials: "AP", institution: "AIIA New Delhi",
    course: "BAMS", year: "4th Year", overallScore: 78,
    skillMatch: 82, experienceMatch: 70, locationMatch: 100, culturalFit: 85,
    readinessScore: 72, verifiedSkills: 3, certifications: 1,
    matchedSkills: ["Research Methodology", "Scientific Writing"],
    missingSkills: ["Python", "Machine Learning", "Data Analysis"],
    strengths: ["Strong academic record", "Published researcher"],
    concerns: ["No technical skills", "Limited programming experience"],
    status: "applied",
  },
  {
    candidateId: "c-3", name: "Rohan Gupta", initials: "RG", institution: "BHU Varanasi",
    course: "BAMS", year: "3rd Year", overallScore: 85,
    skillMatch: 88, experienceMatch: 75, locationMatch: 80, culturalFit: 92,
    readinessScore: 81, verifiedSkills: 4, certifications: 2,
    matchedSkills: ["Statistical Analysis", "Python", "Machine Learning"],
    missingSkills: ["Clinical Research", "Scientific Writing"],
    strengths: ["Strong analytics background", "Recent ML certifications", "Fast learner"],
    concerns: ["No clinical background"],
    status: "new",
  },
  {
    candidateId: "c-4", name: "Sneha Reddy", initials: "SR", institution: "AIIA New Delhi",
    course: "BAMS", year: "4th Year", overallScore: 71,
    skillMatch: 68, experienceMatch: 82, locationMatch: 100, culturalFit: 75,
    readinessScore: 65, verifiedSkills: 2, certifications: 2,
    matchedSkills: ["Clinical Research", "Scientific Writing"],
    missingSkills: ["Python", "Machine Learning", "Statistical Analysis"],
    strengths: ["4th year clinical experience", "Published papers"],
    concerns: ["No technical/data skills"],
    status: "applied",
  },
  {
    candidateId: "c-5", name: "Vikram Singh", initials: "VS", institution: "AIIMS Delhi",
    course: "B.Tech CSE", year: "3rd Year", overallScore: 88,
    skillMatch: 90, experienceMatch: 85, locationMatch: 60, culturalFit: 88,
    readinessScore: 84, verifiedSkills: 6, certifications: 4,
    matchedSkills: ["Python", "Data Analysis", "Machine Learning", "Statistical Analysis"],
    missingSkills: ["Clinical Research"],
    strengths: ["Top analytics skills", "Published ML papers", "Industry internship at TechCorp"],
    concerns: ["Location mismatch (Delhi vs New Delhi campus)"],
    status: "interviewed",
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "#6B6F68", bg: "#F0F0F0" },
  applied: { label: "Applied", color: "#6B6F68", bg: "#EDEBE0" },
  shortlisted: { label: "Shortlisted", color: "#244B35", bg: "#DCE6D0" },
  interviewed: { label: "Interviewed", color: "#4d3a74", bg: "#C8B5DE" },
  offered: { label: "Offered", color: "#16301F", bg: "#244B35" },
};

const PIE_COLORS = ["#244B35", "#C98B5F", "#8A6FB8", "#B99A22"];

/* ─── Helpers ─── */
function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? "#244B35" : score >= 70 ? "#C98B5F" : "#C44D2A";
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6E3D7" strokeWidth={3.5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3.5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.2} fontWeight="bold" fill={color}>{score}</text>
    </svg>
  );
}

function SkillBar({ label, value, max = 100, color = "#244B35" }: { label: string; value: number; max?: number; color?: string }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-0.5">
        <span className="text-[10px] font-medium" style={{ color: "#6B6F68" }}>{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E6E3D7" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export function SmartMatchScore({ opportunityTitle }: { opportunityTitle?: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"overall" | "skill" | "experience">("overall");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredCandidates = useMemo(() => {
    let list = [...DEMO_CANDIDATES];
    if (filterStatus !== "all") list = list.filter(c => c.status === filterStatus);
    return list.sort((a, b) => {
      if (sortBy === "skill") return b.skillMatch - a.skillMatch;
      if (sortBy === "experience") return b.experienceMatch - a.experienceMatch;
      return b.overallScore - a.overallScore;
    });
  }, [sortBy, filterStatus]);

  const compareCandidates = useMemo(
    () => DEMO_CANDIDATES.filter(c => selectedForCompare.has(c.candidateId)),
    [selectedForCompare]
  );
  const canCompare = compareCandidates.length >= 2;

  const distributionData = filteredCandidates.map(c => ({
    name: c.name.split(" ")[0], score: c.overallScore, skill: c.skillMatch, experience: c.experienceMatch,
  }));

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    DEMO_CANDIDATES.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ name: STATUS_CONFIG[status]?.label || status, value: count }));
  }, []);

  const toggleCompare = (id: string) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      else { toast.info("Compare up to 3 candidates at a time."); return prev; }
      return next;
    });
  };

  const avgScore = Math.round(DEMO_CANDIDATES.reduce((s, c) => s + c.overallScore, 0) / DEMO_CANDIDATES.length);
  const strongFits = DEMO_CANDIDATES.filter(c => c.overallScore >= 85).length;
  const totalMatched = DEMO_CANDIDATES.reduce((s, c) => s + c.matchedSkills.length, 0);

  const handleShortlist = (name: string) => { toast.success(`${name} shortlisted!`); };
  const handleReject = (name: string) => { toast.info(`${name} removed from consideration.`); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}>
            <Sparkles size={16} style={{ color: "#DCE6D0" }} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold" style={{ color: "#171A18" }}>Smart Match</h3>
            <p className="text-[11px]" style={{ color: "#6B6F68" }}>AI-powered candidate recommendations</p>
          </div>
        </div>
        {opportunityTitle && (
          <span className="text-[10px] font-mono px-2 py-1 rounded-lg self-start" style={{ background: "#F0F5EC", color: "#6B6F68" }}>
            {opportunityTitle}
          </span>
        )}
        <div className="sm:ml-auto flex items-center gap-2">
          <button onClick={() => { setCompareMode(!compareMode); setSelectedForCompare(new Set()); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: compareMode ? "#244B35" : "#F0F5EC", color: compareMode ? "white" : "#6B6F68" }}>
            <GitCompare size={12} /> Compare {compareMode && selectedForCompare.size > 0 && `(${selectedForCompare.size})`}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-3 rounded-xl" style={{ background: "#F7F6F0" }}>
          <div className="font-bold text-2xl" style={{ color: "#244B35" }}>{DEMO_CANDIDATES.length}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: "#9A9D94" }}>Candidates</div>
        </div>
        <div className="text-center p-3 rounded-xl" style={{ background: "#F7F6F0" }}>
          <div className="font-bold text-2xl" style={{ color: "#C98B5F" }}>{avgScore}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: "#9A9D94" }}>Avg Score</div>
        </div>
        <div className="text-center p-3 rounded-xl" style={{ background: "#F7F6F0" }}>
          <div className="font-bold text-2xl" style={{ color: "#244B35" }}>{strongFits}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: "#9A9D94" }}>Strong Fits</div>
        </div>
        <div className="text-center p-3 rounded-xl" style={{ background: "#F7F6F0" }}>
          <div className="font-bold text-2xl" style={{ color: "#8A6FB8" }}>{totalMatched}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: "#9A9D94" }}>Skill Matches</div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1">
        <div className="flex items-center gap-1">
          <Filter size={12} style={{ color: "#9A9D94" }} />
          <span className="text-[10px] font-semibold" style={{ color: "#6B6F68" }}>Status:</span>
        </div>
        {["all", "new", "applied", "shortlisted", "interviewed"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className="px-2 py-0.5 rounded-md text-[10px] font-medium capitalize transition-all"
            style={{ background: filterStatus === s ? "#244B35" : "#F0F5EC", color: filterStatus === s ? "white" : "#6B6F68" }}>
            {s === "all" ? "All" : s}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <ArrowUpDown size={12} style={{ color: "#9A9D94" }} />
          {(["overall", "skill", "experience"] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className="px-2 py-0.5 rounded-md text-[10px] font-medium capitalize transition-all"
              style={{ background: sortBy === s ? "#244B35" : "#F0F5EC", color: sortBy === s ? "white" : "#6B6F68" }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 border rounded-xl p-4" style={{ borderColor: "#E6E3D7" }}>
          <h4 className="text-[11px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: "#6B6F68" }}>
            <BarChart3 size={12} /> Score Distribution
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distributionData} barGap={4}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "1px solid #E6E3D7" }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
              <Bar dataKey="score" fill="#244B35" radius={[4, 4, 0, 0]} name="Overall" />
              <Bar dataKey="skill" fill="#C98B5F" radius={[4, 4, 0, 0]} name="Skill" />
              <Bar dataKey="experience" fill="#8A6FB8" radius={[4, 4, 0, 0]} name="Experience" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="border rounded-xl p-4" style={{ borderColor: "#E6E3D7" }}>
          <h4 className="text-[11px] font-semibold mb-3" style={{ color: "#6B6F68" }}>Pipeline Status</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Compare panel */}
      {compareMode && canCompare && (
        <div className="border-2 rounded-xl p-5" style={{ borderColor: "#244B35", background: "#FAFDF8" }}>
          <h4 className="text-[13px] font-bold mb-4 flex items-center gap-1.5" style={{ color: "#244B35" }}>
            <GitCompare size={14} /> Side-by-Side Comparison
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "2px solid #E6E3D7" }}>
                  <th className="text-left py-2 pr-3 font-semibold" style={{ color: "#6B6F68" }}>Metric</th>
                  {compareCandidates.map(c => (
                    <th key={c.candidateId} className="text-center py-2 px-3 font-bold" style={{ color: "#171A18" }}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Overall", key: "overallScore" as const, color: "#244B35" },
                  { label: "Skill Match", key: "skillMatch" as const, color: "#C98B5F" },
                  { label: "Experience", key: "experienceMatch" as const, color: "#8A6FB8" },
                  { label: "Location", key: "locationMatch" as const, color: "#B99A22" },
                  { label: "Cultural Fit", key: "culturalFit" as const, color: "#244B35" },
                  { label: "Readiness", key: "readinessScore" as const, color: "#C98B5F" },
                ].map(row => (
                  <tr key={row.label} style={{ borderBottom: "1px solid #F0F0F0" }}>
                    <td className="py-2 pr-3 font-medium" style={{ color: "#6B6F68" }}>{row.label}</td>
                    {compareCandidates.map(c => {
                      const val = c[row.key];
                      const best = Math.max(...compareCandidates.map(cc => cc[row.key]));
                      return (
                        <td key={c.candidateId} className="text-center py-2 px-3">
                          <span className="font-bold" style={{ color: val === best ? "#244B35" : "#6B6F68" }}>{val}%</span>
                          {val === best && <span className="ml-1 text-[8px]" style={{ color: "#244B35" }}>★</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <td className="py-2 pr-3 font-medium" style={{ color: "#6B6F68" }}>Verified Skills</td>
                  {compareCandidates.map(c => {
                    const best = Math.max(...compareCandidates.map(cc => cc.verifiedSkills));
                    return (
                      <td key={c.candidateId} className="text-center py-2 px-3">
                        <span className="font-bold" style={{ color: c.verifiedSkills === best ? "#244B35" : "#6B6F68" }}>{c.verifiedSkills}</span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-medium" style={{ color: "#6B6F68" }}>Matched Skills</td>
                  {compareCandidates.map(c => (
                    <td key={c.candidateId} className="text-center py-2 px-3">
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {c.matchedSkills.slice(0, 3).map(s => (
                          <span key={s} className="px-1.5 py-0.5 rounded text-[8px] font-medium" style={{ background: "#DCE6D0", color: "#16301F" }}>{s}</span>
                        ))}
                        {c.matchedSkills.length > 3 && <span className="text-[8px]" style={{ color: "#9A9D94" }}>+{c.matchedSkills.length - 3}</span>}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidate cards */}
      <div className="space-y-3">
        {filteredCandidates.map((c, idx) => {
          const isExpanded = expanded === c.candidateId;
          const isCompareSelected = selectedForCompare.has(c.candidateId);
          const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.new;

          return (
            <div key={c.candidateId}
              className="border rounded-xl overflow-hidden transition-all hover:shadow-sm"
              style={{
                borderColor: isExpanded ? "#244B35" : isCompareSelected ? "#C98B5F" : "#E6E3D7",
                background: isCompareSelected ? "#FFFBF5" : "white",
              }}>
              {/* Collapsed header */}
              <div className="flex items-center gap-3 p-4">
                {compareMode && (
                  <input type="checkbox" checked={isCompareSelected} onChange={() => toggleCompare(c.candidateId)}
                    className="w-4 h-4 rounded accent-[#244B35] cursor-pointer" />
                )}
                <ScoreRing score={c.overallScore} size={50} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-[14px]" style={{ color: "#171A18" }}>{c.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                      {statusCfg.label}
                    </span>
                    {c.overallScore > 89 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5" style={{ background: "#E8D36B", color: "#5c4a08" }}>
                        <Star size={8} fill="#5c4a08" /> Top Pick
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: "#6B6F68" }}>
                    <span className="flex items-center gap-0.5"><GraduationCap size={10} /> {c.course} · {c.year}</span>
                    <span>·</span>
                    <span>{c.institution}</span>
                  </div>
                </div>
                {/* Score chips */}
                <div className="hidden md:flex items-center gap-4">
                  <div className="text-center">
                    <div className="font-bold text-[13px]" style={{ color: "#244B35" }}>{c.skillMatch}%</div>
                    <div className="text-[9px] font-mono tracking-wider uppercase" style={{ color: "#9A9D94" }}>Skill</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-[13px]" style={{ color: "#C98B5F" }}>{c.experienceMatch}%</div>
                    <div className="text-[9px] font-mono tracking-wider uppercase" style={{ color: "#9A9D94" }}>Exp</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-[13px]" style={{ color: "#8A6FB8" }}>{c.readinessScore}%</div>
                    <div className="text-[9px] font-mono tracking-wider uppercase" style={{ color: "#9A9D94" }}>Ready</div>
                  </div>
                </div>
                {/* Matched skills preview */}
                <div className="hidden xl:flex flex-wrap gap-1 max-w-[200px]">
                  {c.matchedSkills.slice(0, 3).map(s => (
                    <span key={s} className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: "#DCE6D0", color: "#16301F" }}>{s}</span>
                  ))}
                  {c.matchedSkills.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: "#EDEBE0", color: "#6B6F68" }}>+{c.matchedSkills.length - 3}</span>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleShortlist(c.name)} title="Shortlist"
                    className="w-7 h-7 rounded-lg grid place-items-center transition-all hover:scale-110" style={{ background: "#DCE6D0", color: "#244B35" }}>
                    <Check size={12} />
                  </button>
                  <button onClick={() => handleReject(c.name)} title="Reject"
                    className="w-7 h-7 rounded-lg grid place-items-center transition-all hover:scale-110" style={{ background: "#F0E3DD", color: "#C44D2A" }}>
                    <X size={12} />
                  </button>
                  <button onClick={() => setExpanded(isExpanded ? null : c.candidateId)}
                    className="w-7 h-7 rounded-lg grid place-items-center transition-all hover:scale-110" style={{ background: "#F0F5EC", color: "#6B6F68" }}>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: "#F0F0F0" }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    {/* Radar chart */}
                    <div>
                      <h4 className="text-[11px] font-semibold mb-2 flex items-center gap-1" style={{ color: "#6B6F68" }}>
                        <Target size={10} /> Match Profile
                      </h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <RadarChart data={[
                          { subject: "Skills", value: c.skillMatch },
                          { subject: "Experience", value: c.experienceMatch },
                          { subject: "Location", value: c.locationMatch },
                          { subject: "Cultural", value: c.culturalFit },
                          { subject: "Readiness", value: c.readinessScore },
                        ]}>
                          <PolarGrid stroke="#E6E3D7" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                          <Radar dataKey="value" stroke="#244B35" fill="#244B35" fillOpacity={0.15} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Skills breakdown */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-[10px] font-semibold mb-1.5 flex items-center gap-1" style={{ color: "#244B35" }}>
                          <Check size={10} /> Matched ({c.matchedSkills.length})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {c.matchedSkills.map(s => (
                            <span key={s} className="px-2 py-0.5 rounded-full text-[9px] font-medium" style={{ background: "#DCE6D0", color: "#16301F" }}>{s}</span>
                          ))}
                        </div>
                      </div>
                      {c.missingSkills.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-semibold mb-1.5 flex items-center gap-1" style={{ color: "#C44D2A" }}>
                            <AlertTriangle size={10} /> Missing ({c.missingSkills.length})
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {c.missingSkills.map(s => (
                              <span key={s} className="px-2 py-0.5 rounded-full text-[9px] font-medium" style={{ background: "#F0E3DD", color: "#7a3f1a" }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="text-center p-2 rounded-lg" style={{ background: "#F7F6F0" }}>
                          <div className="font-bold text-sm" style={{ color: "#244B35" }}>{c.verifiedSkills}</div>
                          <div className="text-[8px] font-mono tracking-wider uppercase" style={{ color: "#9A9D94" }}>Verified</div>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ background: "#F7F6F0" }}>
                          <div className="font-bold text-sm" style={{ color: "#C98B5F" }}>{c.certifications}</div>
                          <div className="text-[8px] font-mono tracking-wider uppercase" style={{ color: "#9A9D94" }}>Certs</div>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ background: "#F7F6F0" }}>
                          <div className="font-bold text-sm" style={{ color: "#8A6FB8" }}>{c.readinessScore}%</div>
                          <div className="text-[8px] font-mono tracking-wider uppercase" style={{ color: "#9A9D94" }}>Ready</div>
                        </div>
                      </div>
                    </div>

                    {/* Strengths & Concerns */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-[10px] font-semibold mb-1.5" style={{ color: "#244B35" }}>Strengths</h4>
                        {c.strengths.map((s, i) => (
                          <div key={i} className="text-[11px] flex items-start gap-1.5 mb-1" style={{ color: "#444" }}>
                            <Check size={10} className="mt-0.5 flex-shrink-0" style={{ color: "#244B35" }} /> {s}
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 className="text-[10px] font-semibold mb-1.5" style={{ color: "#C98B5F" }}>Concerns</h4>
                        {c.concerns.map((s, i) => (
                          <div key={i} className="text-[11px] flex items-start gap-1.5 mb-1" style={{ color: "#444" }}>
                            <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" style={{ color: "#C98B5F" }} /> {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t" style={{ borderColor: "#F0F0F0" }}>
                    <SkillBar label="Skill Match" value={c.skillMatch} color="#244B35" />
                    <SkillBar label="Experience" value={c.experienceMatch} color="#C98B5F" />
                    <SkillBar label="Location" value={c.locationMatch} color="#8A6FB8" />
                    <SkillBar label="Cultural Fit" value={c.culturalFit} color="#B99A22" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCandidates.length === 0 && (
        <div className="text-center py-12 rounded-xl border border-dashed" style={{ borderColor: "#E6E3D7" }}>
          <Target size={32} style={{ color: "#9A9D94", margin: "0 auto 12px" }} />
          <div className="font-semibold text-sm" style={{ color: "#171A18" }}>No candidates match filter</div>
          <div className="text-[13px]" style={{ color: "#6B6F68" }}>Try a different status filter.</div>
        </div>
      )}
    </div>
  );
}
