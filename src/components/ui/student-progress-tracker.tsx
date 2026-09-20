import * as React from "react";
import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, User, Award, Calendar, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from "recharts";

interface SkillHistory {
  skill: string;
  history: Array<{ month: string; confidence: number; verified: boolean }>;
}

interface StudentProgress {
  studentId: string;
  name: string;
  initials: string;
  course: string;
  year: string;
  overallGrowth: number;
  skills: SkillHistory[];
}

const DEMO_STUDENTS: StudentProgress[] = [
  {
    studentId: "st-1", name: "Aarav Sharma", initials: "AS", course: "BAMS", year: "3rd Year", overallGrowth: 23,
    skills: [
      { skill: "Python", history: [{ month: "May", confidence: 65, verified: false }, { month: "Jun", confidence: 72, verified: false }, { month: "Jul", confidence: 85, verified: true }, { month: "Aug", confidence: 92, verified: true }] },
      { skill: "Machine Learning", history: [{ month: "May", confidence: 40, verified: false }, { month: "Jun", confidence: 55, verified: false }, { month: "Jul", confidence: 70, verified: true }, { month: "Aug", confidence: 86, verified: true }] },
      { skill: "Data Analysis", history: [{ month: "May", confidence: 50, verified: false }, { month: "Jun", confidence: 58, verified: false }, { month: "Jul", confidence: 65, verified: true }, { month: "Aug", confidence: 76, verified: true }] },
      { skill: "Clinical Research", history: [{ month: "May", confidence: 30, verified: false }, { month: "Jun", confidence: 42, verified: false }, { month: "Jul", confidence: 55, verified: true }, { month: "Aug", confidence: 68, verified: true }] },
    ]
  },
  {
    studentId: "st-2", name: "Ananya Patel", initials: "AP", course: "BAMS", year: "2nd Year", overallGrowth: 18,
    skills: [
      { skill: "Research Methodology", history: [{ month: "May", confidence: 35, verified: false }, { month: "Jun", confidence: 45, verified: false }, { month: "Jul", confidence: 52, verified: false }, { month: "Aug", confidence: 58, verified: false }] },
      { skill: "Scientific Writing", history: [{ month: "May", confidence: 20, verified: false }, { month: "Jun", confidence: 30, verified: false }, { month: "Jul", confidence: 38, verified: false }, { month: "Aug", confidence: 45, verified: false }] },
    ]
  },
  {
    studentId: "st-3", name: "Rohan Gupta", initials: "RG", course: "MD Pharmacology", year: "1st Year", overallGrowth: 31,
    skills: [
      { skill: "Statistical Analysis", history: [{ month: "May", confidence: 25, verified: false }, { month: "Jun", confidence: 40, verified: false }, { month: "Jul", confidence: 55, verified: true }, { month: "Aug", confidence: 72, verified: true }] },
      { skill: "Python", history: [{ month: "May", confidence: 10, verified: false }, { month: "Jun", confidence: 25, verified: false }, { month: "Jul", confidence: 45, verified: true }, { month: "Aug", confidence: 62, verified: true }] },
      { skill: "ML", history: [{ month: "May", confidence: 5, verified: false }, { month: "Jun", confidence: 15, verified: false }, { month: "Jul", confidence: 30, verified: false }, { month: "Aug", confidence: 48, verified: false }] },
    ]
  },
  {
    studentId: "st-4", name: "Sneha Reddy", initials: "SR", course: "BAMS", year: "4th Year", overallGrowth: 12,
    skills: [
      { skill: "Clinical Research", history: [{ month: "May", confidence: 70, verified: true }, { month: "Jun", confidence: 73, verified: true }, { month: "Jul", confidence: 75, verified: true }, { month: "Aug", confidence: 78, verified: true }] },
      { skill: "Scientific Writing", history: [{ month: "May", confidence: 55, verified: false }, { month: "Jun", confidence: 60, verified: true }, { month: "Jul", confidence: 62, verified: true }, { month: "Aug", confidence: 67, verified: true }] },
    ]
  },
];

function TrendIcon({ growth }: { growth: number }) {
  if (growth > 5) return <TrendingUp size={14} style={{ color: "#244B35" }} />;
  if (growth < -5) return <TrendingDown size={14} style={{ color: "#C44D2A" }} />;
  return <Minus size={14} style={{ color: "#888" }} />;
}

export function StudentProgressTracker() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [view, setView] = useState<"individual" | "comparison">("individual");

  const selected = expanded ? DEMO_STUDENTS.find(s => s.studentId === expanded) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h3 className="text-[14px] font-semibold" style={{ color: "#171A18" }}>
          <BarChart3 size={16} className="inline mr-1.5" style={{ color: "#244B35" }} />
          Student Progress Tracker
        </h3>
        <div className="ml-auto flex gap-2">
          {(["individual", "comparison"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1 rounded-lg text-[11px] font-medium capitalize transition-all"
              style={{ background: view === v ? "#244B35" : "#F0F5EC", color: view === v ? "white" : "#6B6F68" }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "comparison" ? (
        <div className="border rounded-xl p-4" style={{ borderColor: "#E6E3D7" }}>
          <h4 className="text-[12px] font-semibold mb-3" style={{ color: "#171A18" }}>Growth Comparison (All Students)</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={DEMO_STUDENTS.map(s => ({ name: s.name.split(" ")[0], growth: s.overallGrowth, skills: s.skills.length }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E3D7" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E6E3D7" }} />
              <Bar dataKey="growth" fill="#244B35" radius={[4, 4, 0, 0]} name="Growth %" />
              <Bar dataKey="skills" fill="#C98B5F" radius={[4, 4, 0, 0]} name="# Skills Tracked" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="space-y-2">
          {DEMO_STUDENTS.map(s => (
            <div key={s.studentId} className="border rounded-xl overflow-hidden transition-all" style={{ borderColor: expanded === s.studentId ? "#244B35" : "#E6E3D7" }}>
              <button onClick={() => setExpanded(expanded === s.studentId ? null : s.studentId)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-all text-left">
                <div className="w-9 h-9 rounded-lg grid place-items-center font-bold text-[11px] flex-shrink-0" style={{ background: "#DCE6D0", color: "#16301F" }}>
                  {s.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px]">{s.name}</div>
                  <div className="text-[11px]" style={{ color: "#6B6F68" }}>{s.course} · {s.year} · {s.skills.length} skills tracked</div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendIcon growth={s.overallGrowth} />
                  <span className="font-bold text-[13px]" style={{ color: s.overallGrowth > 0 ? "#244B35" : "#C44D2A" }}>
                    +{s.overallGrowth}%
                  </span>
                  {expanded === s.studentId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {expanded === s.studentId && selected && (
                <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: "#F0F0F0" }}>
                  <div className="pt-3">
                    <h4 className="text-[11px] font-semibold mb-2" style={{ color: "#6B6F68" }}>Skill Growth Over Time</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={selected.skills[0]?.history.map((h, i) => {
                        const point: Record<string, unknown> = { month: h.month };
                        selected.skills.forEach(sk => { point[sk.skill] = sk.history[i]?.confidence ?? 0; });
                        return point;
                      }) || []}>
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                        {selected.skills.map((sk, i) => (
                          <Area key={i} type="monotone" dataKey={sk.skill} stroke={["#244B35", "#C98B5F", "#8A6FB8", "#4A9B8E"][i % 4]} fill={["#244B35", "#C98B5F", "#8A6FB8", "#4A9B8E"][i % 4]} fillOpacity={0.1} strokeWidth={2} />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selected.skills.map((sk, i) => {
                      const latest = sk.history[sk.history.length - 1];
                      const first = sk.history[0];
                      const growth = latest.confidence - first.confidence;
                      return (
                        <div key={i} className="p-2 rounded-lg text-center" style={{ background: "#F8F6F1", border: "1px solid #E6E3D7" }}>
                          <div className="text-[10px] font-medium" style={{ color: "#6B6F68" }}>{sk.skill}</div>
                          <div className="text-[18px] font-bold" style={{ color: "#244B35" }}>{latest.confidence}%</div>
                          <div className="text-[10px] font-semibold" style={{ color: growth > 0 ? "#244B35" : "#C44D2A" }}>
                            {growth > 0 ? "+" : ""}{growth}pp
                          </div>
                          <div className="text-[9px] mt-0.5" style={{ color: latest.verified ? "#244B35" : "#C98B5F" }}>
                            {latest.verified ? "✓ Verified" : "○ Self-declared"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
