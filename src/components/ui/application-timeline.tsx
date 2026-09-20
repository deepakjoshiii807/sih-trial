import * as React from "react";
import { useState } from "react";
import { Clock, Check, AlertCircle, X, ChevronDown, ChevronUp, MapPin, Calendar, ExternalLink, Star } from "lucide-react";

interface ApplicationTimeline {
  id: string;
  role: string;
  org: string;
  location: string;
  appliedDate: string;
  match: number;
  currentStage: string;
  stages: Array<{
    name: string;
    status: "completed" | "current" | "upcoming" | "rejected";
    date?: string;
    note?: string;
  }>;
  events: Array<{
    type: "applied" | "shortlisted" | "interviewed" | "offered" | "rejected" | "update";
    text: string;
    date: string;
  }>;
}

const DEMO_TIMELINES: ApplicationTimeline[] = [
  {
    id: "app-1", role: "ML Research Intern", org: "Tech4Ayush Labs", location: "Bangalore", appliedDate: "Aug 15, 2025", match: 92,
    currentStage: "Interviewed",
    stages: [
      { name: "Applied", status: "completed", date: "Aug 15", note: "Application submitted with cover letter" },
      { name: "Shortlisted", status: "completed", date: "Aug 20", note: "Profile matched 92% — Python, ML, Clinical Research" },
      { name: "Interview", status: "current", date: "Aug 28", note: "Video call scheduled at 3 PM IST" },
      { name: "Offer", status: "upcoming" },
      { name: "Join", status: "upcoming" },
    ],
    events: [
      { type: "update", text: "Interview details confirmed — Video call via Google Meet", date: "Aug 27" },
      { type: "interviewed", text: "Shortlisted for interview — 30 min video call", date: "Aug 20" },
      { type: "applied", text: "Application submitted", date: "Aug 15" },
    ]
  },
  {
    id: "app-2", role: "Clinical Data Analyst", org: "CCRAS Research", location: "New Delhi", appliedDate: "Aug 10, 2025", match: 85,
    currentStage: "Offered",
    stages: [
      { name: "Applied", status: "completed", date: "Aug 10", note: "Applied via campus placement" },
      { name: "Shortlisted", status: "completed", date: "Aug 14", note: "Strong clinical background" },
      { name: "Interview", status: "completed", date: "Aug 18", note: "Technical + HR interview passed" },
      { name: "Offer", status: "completed", date: "Aug 22", note: "Offer letter sent — ₹25,000/month stipend" },
      { name: "Join", status: "current", note: "Accept offer by Sept 5" },
    ],
    events: [
      { type: "offered", text: "Offer received — ₹25,000/month stipend, 6-month internship", date: "Aug 22" },
      { type: "interviewed", text: "Technical interview completed — scored 8/10", date: "Aug 18" },
      { type: "shortlisted", text: "Shortlisted — clinical research background strong match", date: "Aug 14" },
      { type: "applied", text: "Application submitted via campus placement", date: "Aug 10" },
    ]
  },
  {
    id: "app-3", role: "Statistical Analyst Intern", org: "AIIMS Delhi", location: "New Delhi", appliedDate: "Aug 5, 2025", match: 78,
    currentStage: "Rejected",
    stages: [
      { name: "Applied", status: "completed", date: "Aug 5" },
      { name: "Shortlisted", status: "completed", date: "Aug 10" },
      { name: "Interview", status: "rejected", date: "Aug 15", note: "Position filled internally" },
    ],
    events: [
      { type: "rejected", text: "Position filled — they recommended another opening at CCRAS", date: "Aug 16" },
      { type: "interviewed", text: "Attended interview — waiting for results", date: "Aug 15" },
      { type: "shortlisted", text: "Shortlisted based on statistical analysis skills", date: "Aug 10" },
      { type: "applied", text: "Application submitted", date: "Aug 5" },
    ]
  },
  {
    id: "app-4", role: "Ayurveda Research Fellow", org: "NCISM", location: "Mumbai", appliedDate: "Jul 28, 2025", match: 88,
    currentStage: "Shortlisted",
    stages: [
      { name: "Applied", status: "completed", date: "Jul 28" },
      { name: "Shortlisted", status: "completed", date: "Aug 3", note: "BAMS background + research experience" },
      { name: "Interview", status: "current", date: "Expected Sept 5", note: "Awaiting scheduling details" },
      { name: "Offer", status: "upcoming" },
    ],
    events: [
      { type: "update", text: "Interview expected in first week of September", date: "Aug 25" },
      { type: "shortlisted", text: "Shortlisted — strong BAMS + research background", date: "Aug 3" },
      { type: "applied", text: "Application submitted", date: "Jul 28" },
    ]
  },
];

const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  completed: { bg: "#DCE6D0", text: "#16301F", border: "#244B35" },
  current: { bg: "#244B35", text: "white", border: "#244B35" },
  upcoming: { bg: "#F5F3ED", text: "#999", border: "#E6E3D7" },
  rejected: { bg: "#F0E3DD", text: "#7a3f1a", border: "#C44D2A" },
};

const eventIcons: Record<string, React.ReactNode> = {
  applied: <Clock size={12} />,
  shortlisted: <Star size={12} />,
  interviewed: <Check size={12} />,
  offered: <Check size={12} />,
  rejected: <X size={12} />,
  update: <AlertCircle size={12} />,
};

const eventColors: Record<string, string> = {
  applied: "#6B6F68",
  shortlisted: "#244B35",
  interviewed: "#C98B5F",
  offered: "#244B35",
  rejected: "#C44D2A",
  update: "#8A6FB8",
};

export function ApplicationTimelinePanel() {
  const [expanded, setExpanded] = useState<string | null>(DEMO_TIMELINES[0].id);

  const active = expanded ? DEMO_TIMELINES.find(t => t.id === expanded) : null;

  const stats = {
    total: DEMO_TIMELINES.length,
    active: DEMO_TIMELINES.filter(t => !["Rejected"].includes(t.currentStage)).length,
    offered: DEMO_TIMELINES.filter(t => t.currentStage === "Offered").length,
    avgMatch: Math.round(DEMO_TIMELINES.reduce((s, t) => s + t.match, 0) / DEMO_TIMELINES.length),
  };

  return (
    <div className="space-y-4">
      <h3 className="text-[14px] font-semibold flex items-center gap-1.5" style={{ color: "#171A18" }}>
        <Clock size={16} style={{ color: "#244B35" }} /> Application Timeline
      </h3>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: stats.total, bg: "#F8F6F1", color: "#171A18" },
          { label: "Active", value: stats.active, bg: "#DCE6D0", color: "#16301F" },
          { label: "Offers", value: stats.offered, bg: "#F0E8DD", color: "#C98B5F" },
          { label: "Avg Match", value: `${stats.avgMatch}%`, bg: "#EAE3F4", color: "#8A6FB8" },
        ].map((s, i) => (
          <div key={i} className="p-2.5 rounded-xl text-center" style={{ background: s.bg }}>
            <div className="text-[16px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] font-medium" style={{ color: s.color, opacity: 0.7 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Application cards */}
      <div className="space-y-2">
        {DEMO_TIMELINES.map(app => (
          <div key={app.id} className="border rounded-xl overflow-hidden transition-all"
            style={{ borderColor: expanded === app.id ? "#244B35" : "#E6E3D7" }}>
            <button onClick={() => setExpanded(expanded === app.id ? null : app.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-all text-left">
              <div className="w-9 h-9 rounded-lg grid place-items-center font-bold text-[11px] flex-shrink-0"
                style={{ background: stageColors[app.stages.find(s => s.status === "current")?.status || "current"]?.bg || "#DCE6D0",
                  color: stageColors[app.stages.find(s => s.status === "current")?.status || "current"]?.text || "#16301F" }}>
                {app.match}%
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px]">{app.role}</div>
                <div className="text-[11px] flex items-center gap-1" style={{ color: "#6B6F68" }}>
                  {app.org} · <MapPin size={9} /> {app.location}
                </div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background: stageColors[app.stages.find(s => s.status === "current")?.status || "current"]?.bg || "#DCE6D0",
                    color: stageColors[app.stages.find(s => s.status === "current")?.status || "current"]?.text || "#16301F"
                  }}>
                  {app.currentStage}
                </span>
              </div>
              {expanded === app.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expanded === app.id && active && (
              <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: "#F0F0F0" }}>
                {/* Stage progress */}
                <div className="pt-3">
                  <h4 className="text-[11px] font-semibold mb-3" style={{ color: "#6B6F68" }}>Progress</h4>
                  <div className="flex items-center gap-1">
                    {active.stages.map((stage, i) => (
                      <React.Fragment key={i}>
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full grid place-items-center text-[10px] font-bold"
                            style={{ background: stageColors[stage.status].bg, color: stageColors[stage.status].text,
                              border: `2px solid ${stageColors[stage.status].border}` }}>
                            {stage.status === "completed" ? <Check size={12} /> : stage.status === "rejected" ? <X size={12} /> : i + 1}
                          </div>
                          <div className="text-[9px] font-medium mt-1 text-center" style={{ color: stageColors[stage.status].text }}>
                            {stage.name}
                          </div>
                          {stage.date && <div className="text-[8px]" style={{ color: "#888" }}>{stage.date}</div>}
                          {stage.note && <div className="text-[8px] max-w-[80px] text-center" style={{ color: "#888" }}>{stage.note}</div>}
                        </div>
                        {i < active.stages.length - 1 && (
                          <div className="flex-1 h-0.5 mb-5"
                            style={{ background: stage.status === "completed" ? "#244B35" : "#E6E3D7" }} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Event log */}
                <div>
                  <h4 className="text-[11px] font-semibold mb-2" style={{ color: "#6B6F68" }}>Activity Log</h4>
                  <div className="space-y-2">
                    {active.events.map((evt, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full grid place-items-center flex-shrink-0"
                          style={{ background: `${eventColors[evt.type]}15`, color: eventColors[evt.type] }}>
                          {eventIcons[evt.type]}
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px]">{evt.text}</div>
                          <div className="text-[9px]" style={{ color: "#888" }}>{evt.date}</div>
                        </div>
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
