/**
 * Student dashboard data layer — real HTTP client for the Django backend.
 *
 *   GET  /student/dashboard      → StudentDashboard (exact UI contract)
 *   PATCH /student/profile       → update profile
 *   POST  /student/applications  → apply to an opportunity
 *   POST  /student/projects/<id>/submit → submit a recommended project
 *   PATCH /settings              → settings tab
 */
import { apiClient, notifyAfterWrite } from "./api-helpers";

export type SkillOrigin = "evidence" | "self-declared";
export type RoleReadiness = "Beginning" | "Developing" | "Job-Ready";
export type ApplicationStage = "applied" | "shortlisted" | "interviewed" | "offered" | "joined" | "rejected";
export type EvidenceStatus = "verified" | "processing" | "needs review";
export type OpportunityType = "Internship" | "Placement" | "Part-time";

export interface Student {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  bio: string;
  institution: string;
  course: string;
  department: string;
  year: string;
  graduationYear: number;
  location: string;
  targetRole: string;
  profileCompletion: number;
}

export interface EvidenceItem {
  id: string;
  title: string;
  kind: "Certificate" | "Project" | "Transcript" | "Internship" | "Publication" | "Portfolio" | "Log";
  issuer: string;
  date: string;
  status: EvidenceStatus;
  skills?: string[];
}

export interface SkillPassportItem {
  id: string;
  name: string;
  taxonomyId: string;
  origin: SkillOrigin;
  confidence: number;
  evidence?: EvidenceItem;
  category: string;
}

export interface SkillPassport {
  verifiedCount: number;
  selfDeclaredCount: number;
  totalEvidence: number;
  verifiedEvidence: number;
  items: SkillPassportItem[];
}

export interface RoleReadinessProfile {
  targetRole: string;
  readiness: RoleReadiness;
  readinessScore: number;
  matchedSkills: number;
  totalRequired: number;
  strongSkills: string[];
  missingSkills: string[];
  weakSkills: string[];
  explanation: string;
  factors: { label: string; value: string; positive: boolean }[];
}

export interface SkillGap {
  id: string;
  taxonomyId: string;
  name: string;
  current: number;
  required: number;
  severity: "High" | "Medium" | "Low";
  evidenceNeeded: boolean;
}

export interface SimulatorAction {
  type: "skill" | "course" | "certification" | "project";
  name: string;
  description: string;
  skillsImproved: { skill: string; currentConfidence: number; projectedConfidence: number }[];
  readinessChange: { from: number; to: number; fromLabel: RoleReadiness; toLabel: RoleReadiness };
}

export interface RecommendedProject {
  id: string;
  title: string;
  description: string;
  targetSkill: string;
  skillGapId: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedDuration: string;
  deliverables: string[];
  verificationCriteria: string[];
  submissionStatus?: "not submitted" | "pending review" | "verified" | "needs revision";
}

export interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  org: string;
  location: string;
  duration: string;
  stipend: string;
  deadline: string;
  match: number;
  matchedSkills: string[];
  missingSkills: string[];
  requiredSkills: string[];
  description: string;
  workArrangement: string;
  openings: number;
}

export interface Application {
  id: string;
  opportunityId: string;
  role: string;
  org: string;
  stage: ApplicationStage;
  stageLabel: string;
  status: string;
  nextStep?: string;
  match: number;
  appliedDate: string;
  /** Industry user id — lets the student rate the employer (two-way rating). */
  employerUserId?: number;
  /** True once the engagement reached offer/joined and can be rated. */
  rateable?: boolean;
  /** True if this student already rated the employer for this engagement. */
  rated?: boolean;
}

export interface LearningRecommendation {
  id: string;
  closesGap: string;
  title: string;
  type: "Course" | "Workshop" | "Learning path" | "Certification";
  provider: string;
  duration: string;
  rating: number;
  why: string;
  projectedImprovement: number;
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  skills: string[];
  date: string;
  evidenceId?: string;
}

export interface PortfolioSummary {
  projects: number;
  certificates: number;
  verifiedSkills: number;
  internshipHours: number;
  achievements: number;
  featured: PortfolioProject[];
}

export interface StudentDashboard {
  student: Student;
  skillPassport: SkillPassport;
  roleReadiness: RoleReadinessProfile;
  gaps: SkillGap[];
  simulator: { currentReadinessScore: number; currentReadiness: RoleReadiness; actions: SimulatorAction[] };
  recommendedProjects: RecommendedProject[];
  opportunities: Opportunity[];
  applications: Application[];
  recommendations: LearningRecommendation[];
  portfolio: PortfolioSummary;
}

export interface ExtractedSkillItem {
  name: string;
  category?: string;
  confidence?: number;
  evidence?: string;
}

export interface ExtractedSkillSaveResult {
  added: number;
  upgraded: number;
  kept: number;
  evidenceId: string | null;
  verificationQueued: boolean;
  items: { name: string; claim: "added" | "upgraded" | "kept"; confidence: number | null }[];
}

/** "rp-12" / "op-7" → 12 / 7 (backend rows use plain integer pks). */
function numId(value: string | number, prefix?: string): number {
  if (typeof value === "number") return value;
  const cleaned = prefix ? value.replace(prefix, "") : value.replace(/^[a-z]+-/, "");
  return parseInt(cleaned, 10) || 0;
}

export const studentApi = {
  /** GET /api/student/dashboard */
  async getDashboard(): Promise<StudentDashboard> {
    const { data } = await apiClient.get<StudentDashboard>("/student/dashboard");
    return data;
  },

  /** PATCH /api/student/profile */
  async updateProfile(data: Partial<Student>): Promise<void> {
    await apiClient.patch("/student/profile", data);
    notifyAfterWrite();
  },

  /** POST /api/student/applications */
  async applyToOpportunity(opportunityId: string): Promise<void> {
    await apiClient.post("/student/applications", { opportunityId });
    notifyAfterWrite();
  },

  /** POST /api/student/projects/<pk>/submit */
  async submitProject(projectId: string, payload?: { submissionUrl?: string; notes?: string }): Promise<void> {
    const pk = numId(projectId, "rp-");
    await apiClient.post(`/student/projects/${pk}/submit`, payload ?? {});
    notifyAfterWrite();
  },

  /** PATCH /api/settings — student profile settings tab */
  async updateSettings(data: Record<string, unknown>): Promise<void> {
    await apiClient.patch("/settings", data);
    notifyAfterWrite();
  },

  /** POST /api/student/extracted-skills — persist AI-extracted skills as
   * evidence-backed claims queued for academician review. */
  async saveExtractedSkills(payload: {
    source: string;
    summary?: string;
    items: ExtractedSkillItem[];
  }): Promise<ExtractedSkillSaveResult> {
    const { data } = await apiClient.post<ExtractedSkillSaveResult>(
      "/student/extracted-skills",
      payload,
    );
    notifyAfterWrite();
    return data;
  },

  /** POST /api/student/ratings — student rates an industry partner (two-way). */
  async rateEmployer(data: {
    toId: number;
    opportunityId: string;
    score: number;
    feedback: string;
  }): Promise<void> {
    await apiClient.post("/student/ratings", {
      toId: data.toId,
      opportunityId: numId(data.opportunityId, "op-"),
      score: data.score,
      feedback: data.feedback,
    });
    notifyAfterWrite();
  },

  /** POST /api/student/evidence — upload evidence (JSON or multipart). */
  async uploadEvidence(payload: {
    title: string;
    kind?: string;
    issuer?: string;
    description?: string;
    file?: File;
    documentText?: string;
  }): Promise<{ id: string; status: string; extractedSkills: string[] }> {
    const hasFile = !!payload.file;
    if (hasFile && payload.file) {
      const fd = new FormData();
      fd.append("title", payload.title);
      fd.append("kind", payload.kind ?? "Certificate");
      if (payload.issuer) fd.append("issuer", payload.issuer);
      if (payload.description) fd.append("description", payload.description);
      fd.append("evidenceFile", payload.file, payload.file.name);
      if (payload.documentText) fd.append("documentText", payload.documentText);
      // Let the browser set the multipart boundary; don't force JSON.
      const { data } = await apiClient.post<{ id: string; status: string; extractedSkills: string[] }>(
        "/student/evidence",
        fd as unknown as Record<string, unknown>,
        { headers: { "Content-Type": "multipart/form-data" } } as never
      );
      notifyAfterWrite();
      return data;
    }
    const { data } = await apiClient.post<{ id: string; status: string; extractedSkills: string[] }>(
      "/student/evidence",
      {
        title: payload.title,
        kind: payload.kind ?? "Certificate",
        issuer: payload.issuer ?? "",
        description: payload.description ?? "",
        documentText: payload.documentText ?? payload.description ?? "",
      }
    );
    notifyAfterWrite();
    return data;
  },
};
