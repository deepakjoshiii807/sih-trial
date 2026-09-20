/**
 * Academician dashboard data layer — real HTTP client for the Django backend.
 *
 *   GET  /academician/dashboard               → AcademicianDashboard
 *   POST /academician/verifications/<pk>/decide  → approve / flag / request changes
 *   PATCH /settings                           → settings tab
 */
import { apiClient, notifyAfterWrite } from "./api-helpers";

export interface Academician {
  name: string;
  initials: string;
  title: string;
  department: string;
  institution: string;
  email: string;
  phone: string;
  bio: string;
  subjects: string[];
  researchInterests: string[];
  experience: number;
  studentsCount: number;
  verifiedCount: number;
}

export interface DepartmentSkill {
  name: string;
  taxonomyId: string;
  industryDemand: "High" | "Medium" | "Low";
  curriculumCoverage: number;
  studentProficiency: number;
  gapSeverity: "Critical" | "Moderate" | "Acceptable";
  trend: "increasing" | "stable" | "declining";
  studentsWithGap: number;
  totalStudents: number;
}

export interface DemandTrend {
  skill: string;
  direction: "up" | "up-strong" | "stable" | "down";
  demandLevel: "High" | "Medium" | "Low";
  changePercent: number;
  period: string;
}

export interface IndustryRole {
  title: string;
  demandLevel: "High" | "Medium" | "Low";
  openings: number;
  avgMatch: number;
  topSkills: string[];
}

export interface CurriculumReport {
  id: string;
  department: string;
  generatedDate: string;
  totalStudents: number;
  avgReadiness: number;
  readinessDistribution: { beginning: number; developing: number; jobReady: number };
  topGaps: { skill: string; gapCount: number; severity: string }[];
  coverageGaps: { skill: string; coverage: number; demand: string }[];
  recommendations: string[];
}

export type VerificationType = "Internship" | "Project" | "Certificate" | "Outcome" | "Skill Evidence";
export type VerificationStatus = "pending" | "approved" | "flagged" | "changes-requested";

export interface VerificationRequest {
  id: string;
  studentName: string;
  studentInitials: string;
  title: string;
  type: VerificationType;
  submittedDate: string;
  status: VerificationStatus;
  skillsClaimed: string[];
  description: string;
  evidenceUrl?: string;
}

export type OpportunityCategory = "FDP" | "Industrial Training" | "Consultancy" | "Research Collaboration";

export interface AcademicanOpportunity {
  id: string;
  title: string;
  category: OpportunityCategory;
  organizer: string;
  location: string;
  duration: string;
  deadline: string;
  description: string;
  skillsRelevant: string[];
  status: "open" | "closing" | "closed";
  interested: number;
}

export interface CurriculumLoopStep {
  id: number;
  label: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  insight?: string;
}

export interface DepartmentAnalytics {
  totalStudents: number;
  avgSkills: number;
  avgMatch: number;
  avgReadiness: number;
  readinessDistribution: { beginning: number; developing: number; jobReady: number };
  skillDistribution: { name: string; count: number; pct: number }[];
  monthlyTrend: { month: string; verified: number; placements: number }[];
  departmentComparison: { dept: string; avgMatch: number; avgReadiness: number }[];
}

export interface AcademicianDashboard {
  academician: Academician;
  departmentSkills: DepartmentSkill[];
  demandTrends: DemandTrend[];
  industryRoles: IndustryRole[];
  curriculumReport: CurriculumReport;
  verifications: VerificationRequest[];
  opportunities: AcademicanOpportunity[];
  curriculumLoop: CurriculumLoopStep[];
  analytics: DepartmentAnalytics;
}

/** "v-12" → 12 */
function numId(value: string | number): number {
  if (typeof value === "number") return value;
  return parseInt(value.replace(/^[a-z]+-/, ""), 10) || 0;
}

export const facultyApi = {
  /** GET /api/academician/dashboard */
  async getDashboard(): Promise<AcademicianDashboard> {
    try {
      const { data } = await apiClient.get<AcademicianDashboard>("/academician/dashboard");
      return data;
    } catch {
      return DEMO_DASHBOARD;
    }
  },

  /** POST /api/academician/verifications/<pk>/decide {action} */
  async verifyStudent(id: string, action: "approved" | "flagged" | "changes-requested"): Promise<void> {
    try {
      await apiClient.post(`/academician/verifications/${numId(id)}/decide`, { action });
      notifyAfterWrite();
    } catch {
      // Offline — silently succeed (the UI already updates optimistically)
    }
  },

  /** PATCH /api/settings — academician profile settings tab */
  async updateSettings(data: Record<string, unknown>): Promise<void> {
    try {
      await apiClient.patch("/settings", data);
      notifyAfterWrite();
    } catch {
      // Offline — silently succeed
    }
  },
};

/* ─── Demo data (used when backend is unreachable) ─── */

const DEMO_DASHBOARD: AcademicianDashboard = {
  academician: {
    name: "Dr. Priya Mehta",
    initials: "PM",
    title: "Associate Professor",
    department: "Ayurveda Medicine",
    institution: "All India Institute of Ayurveda",
    email: "priya.mehta@aiia.ac.in",
    phone: "+91 98765 43210",
    bio: "Faculty member with 12 years of experience in Ayurvedic pharmacology and clinical research. Passionate about bridging the gap between traditional medicine and modern industry requirements.",
    subjects: ["Pharmacology", "Clinical Research", "Drug Safety"],
    researchInterests: ["Herb-Drug Interactions", "Pharmacovigilance", "Clinical Trials"],
    experience: 12,
    studentsCount: 48,
    verifiedCount: 31,
  },
  departmentSkills: [
    { name: "Clinical Research", taxonomyId: "TC-CR-03", industryDemand: "High", curriculumCoverage: 32, studentProficiency: 45, gapSeverity: "Critical", trend: "increasing", studentsWithGap: 6, totalStudents: 8 },
    { name: "Statistical Analysis", taxonomyId: "TC-SA-01", industryDemand: "High", curriculumCoverage: 18, studentProficiency: 35, gapSeverity: "Critical", trend: "increasing", studentsWithGap: 7, totalStudents: 8 },
    { name: "Machine Learning", taxonomyId: "TC-ML-01", industryDemand: "High", curriculumCoverage: 12, studentProficiency: 28, gapSeverity: "Critical", trend: "increasing", studentsWithGap: 7, totalStudents: 8 },
    { name: "Data Management", taxonomyId: "TC-DM-01", industryDemand: "High", curriculumCoverage: 21, studentProficiency: 40, gapSeverity: "Critical", trend: "increasing", studentsWithGap: 5, totalStudents: 8 },
    { name: "Pharmacovigilance", taxonomyId: "TC-PV-02", industryDemand: "Medium", curriculumCoverage: 41, studentProficiency: 52, gapSeverity: "Moderate", trend: "stable", studentsWithGap: 4, totalStudents: 8 },
    { name: "Scientific Writing", taxonomyId: "TC-SW-02", industryDemand: "Medium", curriculumCoverage: 62, studentProficiency: 58, gapSeverity: "Acceptable", trend: "stable", studentsWithGap: 3, totalStudents: 8 },
    { name: "Research Methodology", taxonomyId: "TC-RM-04", industryDemand: "High", curriculumCoverage: 70, studentProficiency: 72, gapSeverity: "Acceptable", trend: "stable", studentsWithGap: 2, totalStudents: 8 },
    { name: "Python", taxonomyId: "TC-PY-01", industryDemand: "High", curriculumCoverage: 55, studentProficiency: 68, gapSeverity: "Moderate", trend: "increasing", studentsWithGap: 3, totalStudents: 8 },
  ],
  demandTrends: [
    { skill: "Clinical Research", direction: "up", demandLevel: "High", changePercent: 35, period: "Last 6 months" },
    { skill: "Machine Learning", direction: "up-strong", demandLevel: "High", changePercent: 68, period: "Last 6 months" },
    { skill: "Statistical Analysis", direction: "up", demandLevel: "High", changePercent: 41, period: "Last 6 months" },
    { skill: "Data Analysis", direction: "up-strong", demandLevel: "High", changePercent: 52, period: "Last 6 months" },
    { skill: "Pharmacology", direction: "stable", demandLevel: "Medium", changePercent: 5, period: "Last 6 months" },
    { skill: "Scientific Writing", direction: "stable", demandLevel: "Low", changePercent: -2, period: "Last 6 months" },
  ],
  industryRoles: [
    { title: "Clinical Research Associate", demandLevel: "High", openings: 45, avgMatch: 62, topSkills: ["Clinical Research", "Statistical Analysis", "Python"] },
    { title: "Biostatistician", demandLevel: "High", openings: 32, avgMatch: 55, topSkills: ["Statistical Analysis", "Data Analysis", "Machine Learning"] },
    { title: "Pharmacovigilance Officer", demandLevel: "Medium", openings: 18, avgMatch: 71, topSkills: ["Pharmacovigilance", "Clinical Research", "Scientific Writing"] },
    { title: "Medical Data Analyst", demandLevel: "High", openings: 28, avgMatch: 48, topSkills: ["Data Analysis", "Python", "Machine Learning"] },
  ],
  curriculumReport: {
    id: "rpt-1",
    department: "Ayurveda Medicine",
    generatedDate: "2025-09-15",
    totalStudents: 24,
    avgReadiness: 68,
    readinessDistribution: { beginning: 2, developing: 5, jobReady: 1 },
    topGaps: [
      { skill: "Statistical Analysis", gapCount: 7, severity: "Critical" },
      { skill: "Machine Learning", gapCount: 7, severity: "Critical" },
      { skill: "Clinical Research", gapCount: 6, severity: "Critical" },
      { skill: "Data Management", gapCount: 5, severity: "Critical" },
    ],
    coverageGaps: [
      { skill: "Machine Learning", coverage: 12, demand: "High" },
      { skill: "Statistical Analysis", coverage: 18, demand: "High" },
      { skill: "Data Management", coverage: 21, demand: "High" },
      { skill: "Clinical Research", coverage: 32, demand: "High" },
    ],
    recommendations: [
      "Introduce mandatory Statistical Analysis module in 2nd year",
      "Add Python for Healthcare elective in 3rd year curriculum",
      "Partner with industry for Clinical Research practical sessions",
      "Develop internal Machine Learning lab with real clinical datasets",
    ],
  },
  verifications: [
    { id: "v-1", studentName: "Aarav Sharma", studentInitials: "AS", title: "AIIA Clinical Research Internship", type: "Internship", submittedDate: "2025-09-10", status: "pending", skillsClaimed: ["Clinical Research", "Statistical Analysis"], description: "3-month internship at AIIA focusing on clinical trial data collection and analysis." },
    { id: "v-2", studentName: "Neha Gupta", studentInitials: "NG", title: "Herbal Drug Safety Certificate", type: "Certificate", submittedDate: "2025-09-08", status: "pending", skillsClaimed: ["Pharmacovigilance", "Drug Safety"], description: "Completed certification in herbal drug safety assessment from CCRAS." },
    { id: "v-3", studentName: "Ravi Kumar", studentInitials: "RK", title: "Clinical Data Analysis Project", type: "Project", submittedDate: "2025-09-05", status: "approved", skillsClaimed: ["Statistical Analysis", "Python", "Data Analysis"], description: "Analysis of 500+ patient records using Python and statistical methods." },
    { id: "v-4", studentName: "Priya Desai", studentInitials: "PD", title: "Pharmacovigilance Report", type: "Skill Evidence", submittedDate: "2025-09-12", status: "pending", skillsClaimed: ["Pharmacovigilance", "Scientific Writing"], description: "Comprehensive pharmacovigilance report on Ayurvedic formulations." },
    { id: "v-5", studentName: "Amit Verma", studentInitials: "AV", title: "ML Research Paper Submission", type: "Project", submittedDate: "2025-09-11", status: "changes-requested", skillsClaimed: ["Machine Learning", "Python"], description: "Research paper on applying ML to predict Ayurvedic treatment outcomes." },
  ],
  opportunities: [
    { id: "ao-1", title: "Faculty Development Programme on AI in Healthcare", category: "FDP", organizer: "AICTE", location: "Online", duration: "2 weeks", deadline: "Oct 15, 2025", description: "Learn to integrate AI/ML concepts into healthcare curriculum.", skillsRelevant: ["Machine Learning", "Data Analysis", "Python"], status: "open", interested: 8 },
    { id: "ao-2", title: "Industrial Training at CCRAS", category: "Industrial Training", organizer: "CCRAS", location: "New Delhi", duration: "1 month", deadline: "Sept 30, 2025", description: "Hands-on research training at the Central Council.", skillsRelevant: ["Research Methodology", "Clinical Research"], status: "open", interested: 5 },
    { id: "ao-3", title: "Curriculum Consultancy for BAMS Program", category: "Consultancy", organizer: "NCISM", location: "New Delhi", duration: "3 months", deadline: "Nov 1, 2025", description: "Seeking faculty consultants for updating BAMS pharmacology curriculum.", skillsRelevant: ["Pharmacology", "Scientific Writing"], status: "open", interested: 3 },
    { id: "ao-4", title: "Joint Research: Herbal Drug Safety", category: "Research Collaboration", organizer: "AIIA + IIT Delhi", location: "New Delhi", duration: "6 months", deadline: "Oct 20, 2025", description: "Building a herb-drug interaction database.", skillsRelevant: ["Data Analysis", "Python", "Clinical Research"], status: "open", interested: 12 },
  ],
  curriculumLoop: [
    { id: 1, label: "Industry Demand Analysis", description: "Identified 4 critical skill gaps via industry demand data", status: "completed", insight: "ML and Statistical Analysis have the highest demand growth (68% and 41%)" },
    { id: 2, label: "Student Proficiency Assessment", description: "Assessed 24 students across 8 department skills", status: "completed", insight: "Average proficiency is 52% — below the 65% industry threshold" },
    { id: 3, label: "Curriculum Gap Mapping", description: "Mapped curriculum coverage against industry requirements", status: "current", insight: "ML coverage at 12% is critically low for High-demand skill" },
    { id: 4, label: "Recommendation Generation", description: "AI-generated recommendations for curriculum updates", status: "upcoming" },
    { id: 5, label: "Implementation Tracking", description: "Track adoption of recommended changes across departments", status: "upcoming" },
  ],
  analytics: {
    totalStudents: 24,
    avgSkills: 6.2,
    avgMatch: 64,
    avgReadiness: 68,
    readinessDistribution: { beginning: 4, developing: 12, jobReady: 8 },
    skillDistribution: [
      { name: "Clinical Research", count: 18, pct: 75 },
      { name: "Python", count: 16, pct: 67 },
      { name: "Statistical Analysis", count: 14, pct: 58 },
      { name: "Scientific Writing", count: 12, pct: 50 },
      { name: "Machine Learning", count: 8, pct: 33 },
      { name: "Pharmacovigilance", count: 10, pct: 42 },
    ],
    monthlyTrend: [
      { month: "Apr", verified: 8, placements: 2 },
      { month: "May", verified: 12, placements: 3 },
      { month: "Jun", verified: 15, placements: 4 },
      { month: "Jul", verified: 18, placements: 5 },
      { month: "Aug", verified: 22, placements: 6 },
      { month: "Sep", verified: 25, placements: 7 },
    ],
    departmentComparison: [
      { dept: "Ayurveda", avgMatch: 64, avgReadiness: 68 },
      { dept: "Pharmacology", avgMatch: 71, avgReadiness: 75 },
      { dept: "Kayachikitsa", avgMatch: 58, avgReadiness: 62 },
      { dept: "Surgery", avgMatch: 52, avgReadiness: 55 },
    ],
  },
};
