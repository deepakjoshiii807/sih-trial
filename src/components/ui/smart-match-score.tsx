import * as React from "react";
import { useState } from "react";
import { Sparkles, TrendingUp, Check, X, ChevronDown, ChevronUp, Target, Award, AlertTriangle, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

interface CandidateMatch {
  candidateId: string;
  name: string;
  initials: string;
  institution: string;
  overallScore: number;
  skillMatch: number;
  experienceMatch: number;
  locationMatch: number;
  culturalFit: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  concerns: string[];
}

const DEMO_CANDIDATES: CandidateMatch[] = [
  {
    candidateId: "c-1", name: "Aarav Sharma", initials: "AS", institution: "AIIA", overallScore: 92,
    skillMatch: 95, experienceMatch: 80, locationMatch: 100, culturalFit: 90,
    matchedSkills: ["Python", "Machine Learning", "Data Analysis", "Clinical Research"],
    missingSkills: ["Statistical Analysis"],
    strengths: ["Strong clinical background", "Verified ML projects", "Research publications"],
    concerns: ["Limited industry experience"],
  },
  {
    candidateId: "c-2", name: "Ananya Patel", initials: "AP", institution: "AIIA", overallScore: 78,
    skillMatch: 82, experienceMatch: 70, locationMatch: 100, culturalFit: 85,
    matchedSkills: ["Research Methodology", "Scientific Writing"],
    missingSkills: ["Python", "Machine Learning", "Data Analysis"],
    strengths: ["Strong academic record", "Published researcher"],
    concerns: ["No technical skills", "Limited programming experience"],
  },
  {
    candidateId: "c-3", name: "Rohan Gupta", initials: "RG", institution: "BHU", overallScore: 85,
    skillMatch: 88, experienceMatch: 75, locationMatch: 80, culturalFit: 92,
    matchedSkills: ["Statistical Analysis", "Python", "Machine Learning"],
    missingSkills: ["Clinical Research", "Scientific Writing"],
    strengths: ["Strong analytics background", "Recent ML certifications", "Fast learner"],
    concerns: ["No clinical background"],
  },
  {
    candidateId: "c-4", name: "Sneha Reddy", initials: "SR", institution: "AIIA", overallScore: 71,
    skillMatch: 68, experienceMatch: 82, locationMatch: 100, culturalFit: 75,
    matchedSkills: ["Clinical Research", "Scientific Writing"],
    missingSkills: ["Python", "Machine Learning", "Statistical Analysis"],
    strengths: ["4th year clinical experience", "Published papers"],
    concerns: ["No technical/data skills"],
  },
  {
    candidateId: "c-5", name: "Vikram Singh", initials: "VS", institution: "AIIMS", overallScore: 88,
    skillMatch: 90, experienceMatch: 85, locationMatch: 60, culturalFit: 88,
    matchedSkills: ["Python", "Data Analysis", "Machine Learning", "Statistical Analysis"],
    missingSkills: ["Clinical Research"],
    strengths: ["Top analytics skills", "Published ML papers", "Industry internship"],
    concerns: ["Location mismatch (Delhi vs Bangalore)"],
  },
];

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? "#244B35" : score >= 70 ? "#C98B5F" : "#C44D2A";
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6E3D7" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22} fontWeight="bold" fill={color}>{score}</text>
    </svg>
  );
}

export function SmartMatchScore({ opportunityTitle }: { opportunityTitle?: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"overall" | "skill" | "experience">("overall");

  const sorted = [...DEMO_CANDIDATES].sort((a, b) => {
    if (sortBy === "skill") return b.skillMatch - a.skillMatch;
    if (sortBy === "experience") return b.experienceMatch - a.experienceMatch;
    return b.overallScore - a.overallScore;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-[14px] font-semibold flex items-center gap-1.5" style={{ color: "#171A18" }}>
          <Sparkles size={16} style={{ color: "#C98B5F" }} /> Smart Match Score
        </h3>
        {opportunityTitle && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#F0F5EC", color: "#6B6F68" }}>{opportunityTitle}</span>}
        <div className="ml-auto flex gap-1.5">
          {(["overall", "skill", "experience"] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-medium capitalize transition-all"
              style={{ background: sortBy === s ? "#244B35" : "#F0F5EC", color: sortBy === s ? "white" : "#6B6F68" }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Distribution chart */}
      <div className="border rounded-xl p-3" style={{ borderColor: "#E6E3D7" }}>
        <h4 className="text-[11px] font-semibold mb-2" style={{ color: "#6B6F68" }}>Score Distribution</h4>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={sorted.map(c => ({ name: c.name.split(" ")[0], score: c.overallScore, skill: c.skillMatch }))}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
            <Bar dataKey="score" fill="#244B35" radius={[3, 3, 0, 0]} name="Overall" />
            <Bar dataKey="skill" fill="#C98B5F" radius={[3, 3, 0, 0]} name="Skill Match" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Candidate cards */}
      <div className="space-y-2">
        {sorted.map(c => (
          <div key={c.candidateId} className="border rounded-xl overflow-hidden transition-all"
            style={{ borderColor: expanded === c.candidateId ? "#244B35" : "#E6E3D7" }}>
            <button onClick={() => setExpanded(expanded === c.candidateId ? null : c.candidateId)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-all text-left">
              <ScoreRing score={c.overallScore} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px]">{c.name}</div>
                <div className="text-[11px]" style={{ color: "#6B6F68" }}>{c.institution} · {c.matchedSkills.length} matched skills</div>
              </div>
              <div className="flex gap-3 text-[11px]">
                <div className="text-center"><div className="font-bold" style={{ color: "#244B35" }}>{c.skillMatch}%</div><div style={{ color: "#888" }}>Skill</div></div>
                <div className="text-center"><div className="font-bold" style={{ color: "#C98B5F" }}>{c.experienceMatch}%</div><div style={{ color: "#888" }}>Exp</div></div>
              </div>
              {expanded === c.candidateId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expanded === c.candidateId && (
              <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: "#F0F0F0" }}>
                <div className="grid grid-cols-2 gap-3 pt-3">
                  {/* Radar chart */}
                  <div>
                    <h4 className="text-[11px] font-semibold mb-1" style={{ color: "#6B6F68" }}>Match Profile</h4>
                    <ResponsiveContainer width="100%" height={160}>
                      <RadarChart data={[
                        { subject: "Skills", value: c.skillMatch },
                        { subject: "Experience", value: c.experienceMatch },
                        { subject: "Location", value: c.locationMatch },
                        { subject: "Cultural", value: c.culturalFit },
                      ]}>
                        <PolarGrid stroke="#E6E3D7" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                        <Radar dataKey="value" stroke="#244B35" fill="#244B35" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-[10px] font-semibold mb-1 flex items-center gap-1" style={{ color: "#244B35" }}>
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
                        <h4 className="text-[10px] font-semibold mb-1 flex items-center gap-1" style={{ color: "#C44D2A" }}>
                          <AlertTriangle size={10} /> Missing ({c.missingSkills.length})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {c.missingSkills.map(s => (
                            <span key={s} className="px-2 py-0.5 rounded-full text-[9px] font-medium" style={{ background: "#F0E3DD", color: "#7a3f1a" }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-[10px] font-semibold mb-1" style={{ color: "#244B35" }}>Strengths</h4>
                    {c.strengths.map((s, i) => (
                      <div key={i} className="text-[11px] flex items-start gap-1.5 mb-0.5" style={{ color: "#444" }}>
                        <Check size={10} className="mt-0.5 flex-shrink-0" style={{ color: "#244B35" }} /> {s}
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-semibold mb-1" style={{ color: "#C98B5F" }}>Concerns</h4>
                    {c.concerns.map((s, i) => (
                      <div key={i} className="text-[11px] flex items-start gap-1.5 mb-0.5" style={{ color: "#444" }}>
                        <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" style={{ color: "#C98B5F" }} /> {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
