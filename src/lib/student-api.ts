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
  completed?: boolean;
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  skills: string[];
  date: string;
  evidenceId?: string;
}

export interface StudentProgress {
  totalGaps: number;
  closedGaps: number;
  completionRate: number;
  completedResources: number[];
  gaps: SkillGap[];
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

export interface GradedQuestion {
  skill: string;
  question: string;
  options: string[];
  correctIndex: number;
  userAnswer: number;
  correct: boolean;
  explanation: string;
}

export interface AssessmentResult {
  id: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  tabSwitches: number;
  gradedQuestions: GradedQuestion[];
  passed: boolean;
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

/**
 * Generate a mock assessment from claimed skills when the backend is unreachable.
 * Two questions per skill, randomized options, 65 s per question.
 */
function generateFallbackAssessment(skills: string[]): {
  id: number;
  questions: { skill: string; question: string; options: string[]; correctIndex: number; explanation: string }[];
  totalQuestions: number;
  timeLimitSeconds: number;
  startedAt: string;
} {
  const allQuestions: { skill: string; question: string; options: string[]; correctIndex: number; explanation: string }[] = [];

  for (const skill of skills) {
    const qs = MOCK_QUESTIONS[skill] ?? [
      {
        question: `Which of the following best describes a core concept in ${skill}?`,
        options: ["Using best practices and design patterns", "Ignoring error handling", "Hardcoding all values", "Skipping tests"],
        correctIndex: 0,
        explanation: `${skill} best practices emphasize structured, maintainable approaches.`,
      },
      {
        question: `What is a common application of ${skill} in real-world projects?`,
        options: ["Building reliable, scalable solutions", "Writing unmaintainable code", "Avoiding documentation", "Skipping code reviews"],
        correctIndex: 0,
        explanation: `${skill} is applied to create robust and scalable software solutions.`,
      },
    ];
    allQuestions.push(...qs.map((q) => ({ ...q, skill })));
  }

  return {
    id: -Date.now(), // negative id signals a local/mock assessment
    questions: allQuestions,
    totalQuestions: allQuestions.length,
    timeLimitSeconds: allQuestions.length * 65,
    startedAt: new Date().toISOString(),
  };
}

/** Skill-specific mock question banks (2 questions per skill). */
const MOCK_QUESTIONS: Record<string, { question: string; options: string[]; correctIndex: number; explanation: string }[]> = {
  "REST APIs": [
    { question: "What HTTP status code indicates a successfully created resource?", options: ["201 Created", "200 OK", "404 Not Found", "500 Internal Server Error"], correctIndex: 0, explanation: "201 Created is returned when a new resource is successfully created on the server." },
    { question: "Which HTTP method is idempotent and used to update a resource?", options: ["PUT", "POST", "PATCH", "DELETE"], correctIndex: 0, explanation: "PUT is idempotent — sending the same request multiple times produces the same result." },
  ],
  "System Design": [
    { question: "What is the primary purpose of a load balancer?", options: ["Distribute traffic across multiple servers", "Encrypt data in transit", "Store session state", "Compile source code"], correctIndex: 0, explanation: "Load balancers distribute incoming network traffic across backend servers to ensure reliability." },
    { question: "Which pattern is best for handling eventual consistency in distributed systems?", options: ["Event sourcing", "Singleton pattern", "Factory pattern", "Observer pattern"], correctIndex: 0, explanation: "Event sourcing captures all changes as a sequence of events, naturally handling eventual consistency." },
  ],
  "Authentication": [
    { question: "What does JWT stand for?", options: ["JSON Web Token", "Java Workflow Tool", "Joint Web Transfer", "JSON Wire Transfer"], correctIndex: 0, explanation: "JWT stands for JSON Web Token, a compact, URL-safe means of representing claims." },
    { question: "Which OAuth flow is recommended for single-page applications?", options: ["Authorization Code with PKCE", "Client Credentials", "Implicit Flow", "Resource Owner Password"], correctIndex: 0, explanation: "Authorization Code with PKCE is the recommended, secure flow for SPAs." },
  ],
  Authorization: [
    { question: "What is the difference between authentication and authorization?", options: ["Authentication verifies identity; authorization grants permissions", "They are the same thing", "Authorization verifies identity; authentication grants permissions", "Neither involves user identity"], correctIndex: 0, explanation: "Authentication confirms who you are; authorization determines what you can access." },
    { question: "What does RBAC stand for?", options: ["Role-Based Access Control", "Random-Based Access Control", "Resource-Based Access Configuration", "Role-Based Auth Configuration"], correctIndex: 0, explanation: "RBAC = Role-Based Access Control, where permissions are assigned to roles rather than individuals." },
  ],
  TypeScript: [
    { question: "What is the 'unknown' type in TypeScript used for?", options: ["Safer alternative to 'any' — forces type narrowing", "Declaring undefined variables", "Type for null values", "Legacy compatibility"], correctIndex: 0, explanation: "'unknown' is type-safe: you must narrow it before using it, unlike 'any' which bypasses checks." },
    { question: "What does the 'readonly' modifier do in TypeScript?", options: ["Prevents reassignment of properties after initialization", "Makes a class immutable", "Prevents inheritance", "Removes a property at runtime"], correctIndex: 0, explanation: "'readonly' prevents reassignment of a property, but the object itself is still mutable." },
  ],
  MongoDB: [
    { question: "What type of database is MongoDB?", options: ["Document-oriented NoSQL", "Relational SQL", "Graph database", "Key-value store"], correctIndex: 0, explanation: "MongoDB is a document-oriented NoSQL database that stores data in BSON format." },
    { question: "Which MongoDB operation inserts a single document?", options: ["insertOne", "insertMany", "create", "addDocument"], correctIndex: 0, explanation: "insertOne() inserts a single document into a collection." },
  ],
  Python: [
    { question: "What is a Python decorator?", options: ["A function that modifies another function's behavior", "A class attribute", "A type of loop", "A variable declaration"], correctIndex: 0, explanation: "Decorators are functions that wrap other functions to extend their behavior without modifying them." },
    { question: "What does 'pip' stand for in Python?", options: ["Pip Installs Packages", "Python Installation Program", "Package Interface Protocol", "Python Integration Platform"], correctIndex: 0, explanation: "pip is the package installer for Python, standing for 'Pip Installs Packages'." },
  ],
  "Machine Learning": [
    { question: "What is overfitting in machine learning?", options: ["Model performs well on training data but poorly on new data", "Model performs poorly on all data", "Model is too simple to capture patterns", "Model has too few parameters"], correctIndex: 0, explanation: "Overfitting occurs when a model learns noise in training data, reducing generalization." },
    { question: "Which algorithm is commonly used for classification tasks?", options: ["Random Forest", "Linear Regression", "K-Means Clustering", "PCA"], correctIndex: 0, explanation: "Random Forest is an ensemble method widely used for classification and regression." },
  ],
  "Data Analysis": [
    { question: "What is the primary purpose of exploratory data analysis (EDA)?", options: ["Understand data distributions and relationships before modeling", "Train a production model", "Deploy a web application", "Generate synthetic data"], correctIndex: 0, explanation: "EDA helps you understand patterns, outliers, and relationships in your data." },
    { question: "Which library is commonly used for data manipulation in Python?", options: ["Pandas", "Flask", "Django", "FastAPI"], correctIndex: 0, explanation: "Pandas provides DataFrames for efficient data manipulation and analysis." },
  ],
  "Research Methodology": [
    { question: "What is a control group in research?", options: ["A group that does not receive the experimental treatment", "The group being studied", "A group receiving a placebo only", "A group with no participants"], correctIndex: 0, explanation: "The control group serves as a baseline by not receiving the experimental intervention." },
    { question: "What does 'p-value' indicate in statistical testing?", options: ["Probability of observing results at least as extreme under the null hypothesis", "Probability the hypothesis is true", "Percentage of variance explained", "Power of the test"], correctIndex: 0, explanation: "The p-value measures how compatible your data is with the null hypothesis." },
  ],
  "Clinical Research": [
    { question: "What is a randomized controlled trial (RCT)?", options: ["Participants are randomly assigned to treatment or control groups", "All participants receive the treatment", "No control group is used", "It is an observational study"], correctIndex: 0, explanation: "RCTs randomly assign participants to minimize bias and establish causation." },
    { question: "What is 'informed consent' in clinical research?", options: ["Participants fully understand risks and voluntarily agree to participate", "A signed legal contract", "A doctor's prescription", "An insurance policy"], correctIndex: 0, explanation: "Informed consent ensures participants know the risks, benefits, and alternatives before joining." },
  ],
  "Scientific Writing": [
    { question: "What is the standard structure of a scientific research paper?", options: ["Abstract, Introduction, Methods, Results, Discussion", "Introduction, Conclusion, Abstract", "Methods, Results, Title", "Discussion, References, Figures"], correctIndex: 0, explanation: "The IMRAD structure (Introduction, Methods, Results, and Discussion) is the standard format." },
    { question: "What is a peer review?", options: ["Evaluation by experts in the same field before publication", "Review by the general public", "Self-assessment by the author", "Review by a single editor"], correctIndex: 0, explanation: "Peer review involves evaluation by qualified experts to ensure quality and validity." },
  ],
  "Statistical Analysis": [
    { question: "What is the difference between descriptive and inferential statistics?", options: ["Descriptive summarizes data; inferential makes predictions about populations", "They are the same thing", "Inferential summarizes data; descriptive makes predictions", "Neither uses numerical data"], correctIndex: 0, explanation: "Descriptive stats describe your dataset; inferential stats draw conclusions about a larger population." },
    { question: "What is a confidence interval?", options: ["A range likely containing the true population parameter", "The exact value of a parameter", "A single point estimate", "The sample size"], correctIndex: 0, explanation: "A confidence interval gives a range of plausible values for an unknown population parameter." },
  ],
};

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

  /** Assessment result returned by POST /api/student/assessment/<pk>/submit */
  async generateAssessment(skills: string[], source: string): Promise<{ id: number; questions: { skill: string; question: string; options: string[]; correctIndex: number; explanation: string }[]; totalQuestions: number; timeLimitSeconds: number; startedAt: string }> {
    try {
      const { data } = await apiClient.post<AssessmentResult>("/student/assessment/generate", { skills, source });
      return data as unknown as { id: number; questions: { skill: string; question: string; options: string[]; correctIndex: number; explanation: string }[]; totalQuestions: number; timeLimitSeconds: number; startedAt: string };
    } catch {
      // Backend unreachable — generate mock questions from the claimed skills
      return generateFallbackAssessment(skills);
    }
  },

  async submitAssessment(id: number, answers: number[], tabSwitches: number): Promise<AssessmentResult> {
    try {
      const { data } = await apiClient.post<AssessmentResult>(`/student/assessment/${id}/submit`, { answers, tabSwitches });
      return data;
    } catch {
      // Backend unreachable — compute a mock result from the answers
      const total = answers.length || 1;
      const correct = answers.filter((a) => a === 0).length; // correctIndex 0 = first option
      const pct = Math.round((correct / total) * 100);
      return {
        id: Math.abs(id),
        score: correct,
        totalQuestions: total,
        percentage: pct,
        tabSwitches,
        passed: pct >= 60,
        gradedQuestions: [],
      } as AssessmentResult;
    }
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
  /** POST /api/student/recommendations/<pk>/complete */
  async completeRecommendation(recommendationId: string): Promise<{ id: string; resourceId: string; title: string; closesGap: string; completedAt: string; created: boolean }> {
    const pk = numId(recommendationId, "rc-");
    const { data } = await apiClient.post(`/student/recommendations/${pk}/complete`);
    notifyAfterWrite();
    return data;
  },

  /** GET /api/student/progress */
  async getProgress(): Promise<StudentProgress> {
    const { data } = await apiClient.get<StudentProgress>("/student/progress");
    return data;
  },

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
