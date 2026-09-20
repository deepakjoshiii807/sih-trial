import * as React from "react";
import { useState } from "react";
import { Download, Printer, Eye, Edit3, X, ChevronDown, FileText, User, GraduationCap, Briefcase, Award, Star, Mail, Phone, MapPin, Globe, ExternalLink } from "lucide-react";

interface ResumeData {
  student: { name: string; initials: string; email: string; phone: string; bio: string; institution: string; course: string; year: string; location: string; graduationYear: number; targetRole: string };
  skills: Array<{ name: string; category: string; confidence: number; verified: boolean }>;
  projects: Array<{ title: string; description: string; skills: string[]; date: string }>;
  applications: Array<{ role: string; org: string; stage: string; match: number }>;
}

export function ResumeBuilderPanel({ student, skills, projects, applications }: ResumeData) {
  const [preview, setPreview] = useState(false);
  const [template, setTemplate] = useState<"modern" | "classic" | "minimal">("modern");
  const [sections, setSections] = useState({ summary: true, skills: true, projects: true, education: true, experience: false, certifications: true });

  const toggleSection = (key: keyof typeof sections) => setSections(s => ({ ...s, [key]: !s[key] }));

  const renderResumeHTML = () => {
    const colorMap = { modern: "#244B35", classic: "#1a1a2e", minimal: "#333333" };
    const accent = colorMap[template];

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${student.name} - Resume</title>
<style>
  @page { margin: 0.6in; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { border-bottom: 3px solid ${accent}; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 28px; color: ${accent}; letter-spacing: 1px; }
  .header .role { font-size: 14px; color: #666; margin-top: 4px; font-style: italic; }
  .contact { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; font-size: 12px; color: #555; }
  .contact span { display: flex; align-items: center; gap: 4px; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 13px; font-weight: bold; color: ${accent}; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
  .summary { font-size: 13px; color: #444; line-height: 1.6; }
  .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill-tag { background: ${accent}11; border: 1px solid ${accent}33; padding: 3px 10px; border-radius: 12px; font-size: 11px; color: ${accent}; }
  .skill-tag.verified { background: ${accent}; color: white; }
  .project { margin-bottom: 12px; }
  .project h3 { font-size: 14px; color: #222; }
  .project .meta { font-size: 11px; color: #888; margin-bottom: 4px; }
  .project p { font-size: 12px; color: #555; }
  .project .tags { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
  .project .tag { font-size: 10px; background: #f0f0f0; padding: 2px 8px; border-radius: 8px; color: #666; }
  .edu-item { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .edu-item .deg { font-size: 13px; font-weight: bold; }
  .edu-item .year { font-size: 12px; color: #888; }
  .cert-item { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
  .cert-item .issuer { color: #888; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="header">
  <h1>${student.name}</h1>
  <div class="role">${student.targetRole || "Aspiring Professional"}</div>
  <div class="contact">
    <span>📧 ${student.email}</span>
    <span>📱 ${student.phone}</span>
    <span>📍 ${student.location}</span>
    <span>🏛️ ${student.institution}</span>
  </div>
</div>

${sections.summary ? `<div class="section"><div class="section-title">Professional Summary</div><div class="summary">${student.bio}</div></div>` : ""}

${sections.education ? `<div class="section"><div class="section-title">Education</div><div class="edu-item"><div><div class="deg">${student.course} — ${student.course}</div><div style="font-size:12px;color:#666">${student.institution}</div></div><div class="year">${student.year} · Graduating ${student.graduationYear}</div></div></div>` : ""}

${sections.skills ? `<div class="section"><div class="section-title">Skills</div><div class="skills-grid">${skills.map(s => `<span class="skill-tag${s.verified ? " verified" : ""}">${s.name}${s.verified ? " ✓" : ""}</span>`).join("")}</div></div>` : ""}

${sections.projects && projects.length > 0 ? `<div class="section"><div class="section-title">Projects</div>${projects.map(p => `<div class="project"><h3>${p.title}</h3><div class="meta">${p.date}</div><p>${p.description}</p><div class="tags">${p.skills.map(s => `<span class="tag">${s}</span>`).join("")}</div></div>`).join("")}</div>` : ""}

${sections.certifications ? `<div class="section"><div class="section-title">Certifications & Evidence</div>${skills.filter(s => s.verified).map(s => `<div class="cert-item"><span>${s.name} Certification</span><span class="issuer">${s.category}</span></div>`).join("")}</div>` : ""}

</body></html>`;
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(renderResumeHTML());
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([renderResumeHTML()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student.name.replace(/\s+/g, "_")}_Resume.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium" style={{ color: "#6B6F68" }}>Template:</span>
          {(["modern", "classic", "minimal"] as const).map(t => (
            <button key={t} onClick={() => setTemplate(t)}
              className="px-3 py-1 rounded-lg text-[11px] font-medium capitalize transition-all"
              style={{ background: template === t ? "#244B35" : "#F0F5EC", color: template === t ? "white" : "#6B6F68" }}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setPreview(!preview)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all hover:bg-gray-50" style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}>
            <Eye size={12} /> {preview ? "Edit" : "Preview"}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white transition-all hover:opacity-90" style={{ background: "#244B35" }}>
            <Printer size={12} /> Print / PDF
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all hover:bg-gray-50" style={{ borderColor: "#C98B5F", color: "#C98B5F" }}>
            <Download size={12} /> Download HTML
          </button>
        </div>
      </div>

      {/* Section toggles */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(sections).map(([key, enabled]) => (
          <button key={key} onClick={() => toggleSection(key as keyof typeof sections)}
            className="px-3 py-1 rounded-full text-[10px] font-medium capitalize transition-all"
            style={{ background: enabled ? "#DCE6D0" : "#F5F3ED", color: enabled ? "#16301F" : "#999", border: `1px solid ${enabled ? "#C4D4B8" : "#E6E3D7"}` }}>
            {enabled ? "✓" : "○"} {key}
          </button>
        ))}
      </div>

      {/* Resume preview */}
      {preview ? (
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: "#E6E3D7" }}>
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
            <FileText size={14} className="text-gray-500" />
            <span className="text-[11px] text-gray-500 font-medium">Resume Preview — {template}</span>
          </div>
          <iframe srcDoc={renderResumeHTML()} className="w-full bg-white" style={{ height: "800px", border: "none" }} title="Resume Preview" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Edit panels */}
          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold" style={{ color: "#171A18" }}>
              <User size={14} className="inline mr-1" /> Personal Info
            </h3>
            <div className="p-3 rounded-xl text-[12px]" style={{ background: "#F8F6F1", border: "1px solid #E6E3D7" }}>
              <p><strong>Name:</strong> {student.name}</p>
              <p><strong>Role:</strong> {student.targetRole}</p>
              <p><strong>Email:</strong> {student.email}</p>
              <p><strong>Phone:</strong> {student.phone}</p>
              <p><strong>Location:</strong> {student.location}</p>
              <p className="mt-2 text-[11px] italic" style={{ color: "#6B6F68" }}>{student.bio}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold" style={{ color: "#171A18" }}>
              <GraduationCap size={14} className="inline mr-1" /> Education
            </h3>
            <div className="p-3 rounded-xl text-[12px]" style={{ background: "#F8F6F1", border: "1px solid #E6E3D7" }}>
              <p><strong>{student.course}</strong> — {student.course}</p>
              <p>{student.institution}</p>
              <p>{student.year} · Graduating {student.graduationYear}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold" style={{ color: "#171A18" }}>
              <Award size={14} className="inline mr-1" /> Skills ({skills.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: s.verified ? "#244B35" : "#F0F5EC", color: s.verified ? "white" : "#6B6F68" }}>
                  {s.name} {s.verified && "✓"}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold" style={{ color: "#171A18" }}>
              <Briefcase size={14} className="inline mr-1" /> Projects ({projects.length})
            </h3>
            {projects.slice(0, 3).map((p, i) => (
              <div key={i} className="p-2 rounded-lg text-[11px]" style={{ background: "#F8F6F1", border: "1px solid #E6E3D7" }}>
                <p className="font-semibold">{p.title}</p>
                <p style={{ color: "#6B6F68" }}>{p.description.slice(0, 80)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
