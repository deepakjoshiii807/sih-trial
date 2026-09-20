import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  Award,
  ArrowRight,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  Mail,
  MapPin,
  Shield,
  Smartphone,
  Sparkles,
  Target,
} from "lucide-react";

/**
 * Public student profile page (`/student-profile`).
 *
 * Rendered without authentication so the profile can be viewed or shared
 * before signing in. It is intentionally read-only and uses bundled demo data
 * — the authenticated `/student` route is what loads live, role-scoped data
 * from the API.
 */

const DEMO_STUDENT = {
  name: "Aarav Sharma",
  initials: "AS",
  email: "aarav.sharma@aiia.ac.in",
  phone: "+91 98765 43210",
  bio: "Third-year BAMS student with a strong interest in clinical research and evidence-based medicine.",
  institution: "All India Institute of Ayurveda",
  course: "BAMS",
  department: "Ayurveda Medicine",
  year: "3rd Year",
  graduationYear: 2027,
  location: "New Delhi",
  targetRole: "Clinical Research Intern",
  profileCompletion: 82,
  readinessScore: 74,
  readinessLabel: "Developing",
};

const DEMO_METRICS = [
  { label: "Verified Skills", value: "5", color: "#244B35", bg: "#DCE6D0" },
  { label: "Evidence Items", value: "12", color: "#4d3a74", bg: "#EAE3F4" },
  { label: "Applications", value: "4", color: "#7a3f1a", bg: "#F0E8DD" },
  { label: "Portfolio Projects", value: "4", color: "#5c4a08", bg: "#F7EFD4" },
];

const DEMO_CONTACT = [
  { icon: <Mail size={14} />, label: "Email", value: DEMO_STUDENT.email },
  { icon: <Smartphone size={14} />, label: "Phone", value: DEMO_STUDENT.phone },
  { icon: <MapPin size={14} />, label: "Location", value: DEMO_STUDENT.location },
  { icon: <Globe size={14} />, label: "Institution", value: DEMO_STUDENT.institution },
  { icon: <BookOpen size={14} />, label: "Course", value: `${DEMO_STUDENT.course} — ${DEMO_STUDENT.year}` },
  { icon: <Calendar size={14} />, label: "Graduation", value: `Class of ${DEMO_STUDENT.graduationYear}` },
];

const DEMO_VERIFIED_SKILLS = [
  { name: "Python", confidence: 92, source: "NPTEL · Jul 2025" },
  { name: "Machine Learning", confidence: 86, source: "CVD Risk Prediction Model · Jun 2025" },
  { name: "Research Methodology", confidence: 81, source: "Academic Transcript · Aug 2025" },
  { name: "Data Analysis", confidence: 76, source: "Rural Health Data Survey · May 2025" },
  { name: "Clinical Research", confidence: 68, source: "Clinical Posting Record · Jul 2025" },
];

const DEMO_SELF_DECLARED_SKILLS = [
  { name: "Scientific Writing", confidence: 64 },
  { name: "Documentation", confidence: 72 },
  { name: "Statistical Analysis", confidence: 45 },
];

const DEMO_GAPS = [
  { name: "Statistical Analysis", current: 45, required: 75, severity: "High" },
  { name: "Scientific Writing", current: 64, required: 80, severity: "Medium" },
  { name: "Clinical Trial Documentation", current: 55, required: 75, severity: "Medium" },
];

const DEMO_EVIDENCE = [
  { name: "Academic Transcript", meta: "PDF · 2024", status: "Verified", tone: "verified" },
  { name: "Python Certificate", meta: "PDF · 2025", status: "Verified", tone: "verified" },
  { name: "Research Project", meta: "DOCX · 2025", status: "Processing", tone: "processing" },
  { name: "Internship Certificate", meta: "PDF · 2024", status: "Needs review", tone: "review" },
];

const DEMO_PORTFOLIO = [
  { title: "Rural Health Data Survey", meta: "Python · Data Analysis", date: "May 2025" },
  { title: "CVD Risk Prediction Model", meta: "Machine Learning · Python", date: "Jun 2025" },
  { title: "Herbal Safety Database", meta: "Data Analysis · Documentation", date: "Apr 2025" },
];

const TAG_STYLES: Record<string, React.CSSProperties> = {
  "High": { background: "#E8C7AE", color: "#7a3f1a" },
  "Medium": { background: "#E8D36B", color: "#5c4a08" },
  verified: { background: "#DCE6D0", color: "#16301F" },
  processing: { background: "#EAE3F4", color: "#4d3a74" },
  review: { background: "#F0E8DD", color: "#7a3f1a" },
};

/** Pixel-segment progress bar matching the dashboard's visual language. */
function PixelBar({ pct, color = "#244B35" }: { pct: number; color?: string }) {
  const segments = 14;
  const filled = Math.round((Math.max(0, Math.min(100, pct)) / 100) * segments);
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className="h-2 w-2.5 rounded-[2px]"
          style={{ background: i < filled ? color : "#EDEBE0" }}
        />
      ))}
    </div>
  );
}

function Eyebrow({ children, color = "#9A9D94" }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase"
      style={{ color }}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`rounded-[18px] border bg-white p-5 md:p-6 ${className}`}
      style={{ borderColor: "#E6E3D7", boxShadow: "0 1px 3px rgba(0,0,0,.04)", ...style }}
    >
      {children}
    </motion.div>
  );
}

export default function StudentProfilePublic() {
  const ringPct = DEMO_STUDENT.profileCompletion;
  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;

  return (
    <div className="min-h-screen" style={{ background: "#F7F6F0", color: "#171A18" }}>
      {/* ── Public top bar ── */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur"
        style={{ background: "rgba(247,246,240,.88)", borderColor: "#E6E3D7" }}
      >
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-5 py-3.5 md:px-8">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold"
              style={{ background: "#244B35", color: "#DCE6D0" }}
            >
              L2L
            </div>
            <span className="font-semibold tracking-tight">Learn2Lead</span>
          </div>
          <span
            className="hidden rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest uppercase sm:inline-block"
            style={{ background: "#F0E8DD", color: "#7a3f1a" }}
          >
            Public profile · demo data
          </span>
          <Link
            to="/login?next=%2Fstudent"
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
            style={{ background: "#244B35", color: "#FFFFFF" }}
          >
            Sign in <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-8 pb-20 md:px-8">
        {/* ── Identity hero ── */}
        <Card delay={0.02} className="relative overflow-hidden">
          <div
            className="absolute top-0 left-0 h-1 w-full"
            style={{ background: "linear-gradient(90deg, #244B35, #DCE6D0)" }}
          />
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div
              className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl text-xl font-bold"
              style={{
                background: "linear-gradient(135deg, #244B35, #1C3D2B)",
                color: "#DCE6D0",
                boxShadow: "0 4px 12px rgba(36,75,53,.15)",
              }}
            >
              {DEMO_STUDENT.initials}
            </div>

            <div className="min-w-0 flex-1">
              <Eyebrow color="#244B35">Student Profile</Eyebrow>
              <h1 className="mt-2 text-[26px] font-semibold tracking-tight md:text-[30px]">
                {DEMO_STUDENT.name}
              </h1>
              <p className="mt-1 text-sm" style={{ color: "#6B6F68" }}>
                {DEMO_STUDENT.course} / {DEMO_STUDENT.year} / {DEMO_STUDENT.department}
              </p>
              <p className="text-xs" style={{ color: "#6B6F68" }}>
                {DEMO_STUDENT.institution}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase"
                  style={TAG_STYLES.verified}
                >
                  <Target size={11} /> Target: {DEMO_STUDENT.targetRole}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase"
                  style={{ background: "#E8D36B", color: "#5c4a08" }}
                >
                  <Sparkles size={11} /> {DEMO_STUDENT.readinessLabel} · {DEMO_STUDENT.readinessScore}%
                </span>
              </div>
              <p className="mt-4 max-w-[52ch] text-sm" style={{ color: "#6B6F68" }}>
                {DEMO_STUDENT.bio}
              </p>
            </div>

            {/* Profile completion ring */}
            <div className="flex flex-shrink-0 items-center gap-4 md:flex-col md:items-center">
              <div className="relative h-[86px] w-[86px]">
                <svg width="86" height="86" viewBox="0 0 86 86">
                  <circle cx="43" cy="43" r={ringRadius} fill="none" stroke="#EDEBE0" strokeWidth="6" />
                  <circle
                    cx="43"
                    cy="43"
                    r={ringRadius}
                    fill="none"
                    stroke="#244B35"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringCircumference * (1 - ringPct / 100)}
                    transform="rotate(-90 43 43)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: "#244B35" }}>
                  {ringPct}%
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9A9D94" }}>
                  Profile
                </div>
                <div className="text-xs font-medium" style={{ color: "#6B6F68" }}>
                  complete
                </div>
              </div>
            </div>
          </div>

          {/* Metric strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {DEMO_METRICS.map((m) => (
              <div key={m.label} className="rounded-xl p-3.5" style={{ background: m.bg }}>
                <div className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#6B6F68" }}>
                  {m.label}
                </div>
                <div className="mt-0.5 text-2xl font-bold" style={{ color: m.color }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Contact + evidence vault ── */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <Card delay={0.06} className="md:col-span-2">
            <Eyebrow>Contact Information</Eyebrow>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DEMO_CONTACT.map((f) => (
                <div key={f.label} className="flex items-start gap-3 rounded-lg p-3" style={{ background: "#FAFAF7" }}>
                  <div className="mt-0.5" style={{ color: "#9A9D94" }}>{f.icon}</div>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9A9D94" }}>
                      {f.label}
                    </div>
                    <div className="truncate text-sm font-medium">{f.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card delay={0.1}>
            <Eyebrow>Evidence Vault</Eyebrow>
            <div className="mt-3 flex flex-col">
              {DEMO_EVIDENCE.map((e) => (
                <div
                  key={e.name}
                  className="flex items-center gap-3 border-b py-2.5 last:border-b-0"
                  style={{ borderColor: "#EDEBE0" }}
                >
                  <FileText size={15} style={{ color: "#9A9D94" }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{e.name}</div>
                    <div className="font-mono text-[10px]" style={{ color: "#9A9D94" }}>{e.meta}</div>
                  </div>
                  <span
                    className="rounded-md px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase"
                    style={TAG_STYLES[e.tone]}
                  >
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Skills ── */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card delay={0.14}>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: "#244B35" }} />
              <span className="text-[16px] font-semibold">Evidence-Backed Skills</span>
            </div>
            <p className="mt-1 mb-4 text-xs" style={{ color: "#6B6F68" }}>
              Confidence is derived from verified evidence, not self-reporting.
            </p>
            <div className="flex flex-col gap-3">
              {DEMO_VERIFIED_SKILLS.map((sk) => (
                <div
                  key={sk.name}
                  className="rounded-xl border p-3"
                  style={{ borderColor: "#D6E3CE", background: "linear-gradient(135deg, #FAFCF7, #F4F9F0)" }}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-semibold">{sk.name}</span>
                    <span className="font-mono text-xs font-bold" style={{ color: "#244B35" }}>{sk.confidence}%</span>
                  </div>
                  <PixelBar pct={sk.confidence} />
                  <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px]" style={{ color: "#6B6F68" }}>
                    <CheckCircle2 size={11} /> {sk.source}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-col gap-5">
            <Card delay={0.18}>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: "#E8D36B" }} />
                <span className="text-[16px] font-semibold">Self-Declared Skills</span>
              </div>
              <p className="mt-1 mb-4 text-xs" style={{ color: "#6B6F68" }}>
                Claimed by the student — awaiting evidence.
              </p>
              <div className="flex flex-col gap-3">
                {DEMO_SELF_DECLARED_SKILLS.map((sk) => (
                  <div
                    key={sk.name}
                    className="rounded-xl border p-3"
                    style={{ borderColor: "#E6DDD5", background: "linear-gradient(135deg, #FAFAF7, #FDF9F2)" }}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold">{sk.name}</span>
                      <span className="font-mono text-xs font-bold" style={{ color: "#6B6F68" }}>{sk.confidence}%</span>
                    </div>
                    <PixelBar pct={sk.confidence} color="#B99A22" />
                  </div>
                ))}
              </div>
            </Card>

            <Card delay={0.22}>
              <div className="flex items-center gap-2">
                <Award size={15} style={{ color: "#8A6FB8" }} />
                <span className="text-[16px] font-semibold">Portfolio Highlights</span>
              </div>
              <div className="mt-3 flex flex-col">
                {DEMO_PORTFOLIO.map((p) => (
                  <div
                    key={p.title}
                    className="flex items-start gap-3 border-b py-2.5 last:border-b-0"
                    style={{ borderColor: "#EDEBE0" }}
                  >
                    <Briefcase size={15} className="mt-0.5" style={{ color: "#9A9D94" }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">{p.title}</div>
                      <div className="font-mono text-[10px]" style={{ color: "#6B6F68" }}>{p.meta}</div>
                    </div>
                    <span className="font-mono text-[10px]" style={{ color: "#9A9D94" }}>{p.date}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Skill gaps ── */}
        <Card delay={0.26} className="mt-5">
          <Eyebrow color="#C98B5F">Skill Gap Analysis</Eyebrow>
          <h2 className="mt-2 mb-1 text-[20px] font-semibold tracking-tight">
            Gaps against {DEMO_STUDENT.targetRole}
          </h2>
          <p className="mb-5 text-xs" style={{ color: "#6B6F68" }}>
            Where the profile currently sits versus what the target role requires.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {DEMO_GAPS.map((g) => (
              <div
                key={g.name}
                className="rounded-xl border p-5"
                style={{ borderColor: "#E6DDD5", background: "linear-gradient(180deg, #FDFCFA 0%, #FDF8F3 100%)" }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{g.name}</span>
                  <span
                    className="rounded-md px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase"
                    style={TAG_STYLES[g.severity]}
                  >
                    {g.severity} gap
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div>
                    <div className="mb-1 flex justify-between font-mono text-[10px]" style={{ color: "#6B6F68" }}>
                      <span>Current</span>
                      <span>{g.current}%</span>
                    </div>
                    <PixelBar pct={g.current} color="#C98B5F" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between font-mono text-[10px]" style={{ color: "#6B6F68" }}>
                      <span>Required</span>
                      <span>{g.required}%</span>
                    </div>
                    <PixelBar pct={g.required} color="#244B35" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── CTA ── */}
        <div
          className="mt-5 overflow-hidden rounded-[18px] p-7 text-white md:p-9"
          style={{
            background: "linear-gradient(135deg, #244B35 0%, #1C3D2B 40%, #1A3626 100%)",
            boxShadow: "0 8px 32px rgba(36,75,53,.18)",
          }}
        >
          <Eyebrow color="#DCE6D0">Your own profile</Eyebrow>
          <h2 className="mt-3 text-[22px] font-semibold tracking-tight md:text-[26px]">
            Sign in to build a profile like this.
          </h2>
          <p className="mt-1 max-w-[60ch] text-sm" style={{ color: "rgba(255,255,255,.7)" }}>
            Upload evidence, verify your skills with academicians, close skill gaps and get matched to
            internships — all from one workspace.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/login?next=%2Fstudent"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
              style={{ background: "#DCE6D0", color: "#16301F" }}
            >
              <Shield size={15} /> Sign in to my workspace
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors"
              style={{ borderColor: "rgba(220,230,208,.35)", color: "#DCE6D0" }}
            >
              Explore the platform
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[11px]" style={{ color: "#9A9D94" }}>
          Public preview rendered from bundled demo data — no sign-in required.
        </p>
      </main>
    </div>
  );
}
