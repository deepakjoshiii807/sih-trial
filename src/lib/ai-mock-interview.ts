/**
 * AI-Powered Mock Interview — stretch feature.
 *
 * For a selected opportunity, generates role-specific technical + behavioral
 * questions from the job's required skills and evaluates responses via the
 * LLM. Feedback is mapped back to the student's skill gaps and readiness.
 *
 * Works offline: when the VLY gateway is not configured the deterministic
 * question bank + heuristic evaluator are used (cached as "deterministic").
 * Model calls go through POST /api/ai/completion (VLY key never in browser).
 */
import { aiCompletion } from "./ai-server";
import { aiHashKey, dedupedFetch, readAICache, writeAICache } from "./ai-cache";
import type { StudentDashboard } from "./student-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type InterviewRoleKey =
  | "clinical-research"
  | "data-analytics"
  | "ayush-research"
  | "pharmacovigilance"
  | "clinical-ops"
  | "general";

export interface MockQuestion {
  id: string;
  prompt: string;
  kind: "technical" | "behavioral" | "situational";
  /** taxonomy skill this question probes, or "General" */
  skill: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  /** hints shown when the student expands "What a good answer covers" */
  expectedPoints: string[];
  /** optional: which gap this targets (by name) */
  targetsGap?: string;
}

export interface MockInterviewSpec {
  opportunityId: string;
  opportunityTitle: string;
  roleKey: InterviewRoleKey;
  roleLabel: string;
  requiredSkills: string[];
  questions: MockQuestion[];
  source: "ai" | "deterministic" | "cache";
  rationale?: string;
}

export interface PerQuestionEval {
  questionId: string;
  score: number; // 0-10
  feedback: string; // 1-2 sentences, specific
  strength?: string;
  gap?: string;
}

export interface MockInterviewEval {
  overallScore: number; // 0-100
  perQuestion: PerQuestionEval[];
  strengths: string[];
  gapsToClose: { gapName: string; why: string; suggestedAction: string }[];
  roleReadinessNote: string;
  nextSteps: string[];
  source: "ai" | "deterministic" | "cache";
  /** which gaps this interview hit */
  hitGapIds?: string[];
}

// ---------------------------------------------------------------------------
// Role detection + labels
// ---------------------------------------------------------------------------
const ROLE_DEFS: Record<InterviewRoleKey, { label: string; keywords: string[] }> = {
  "clinical-research": { label: "Clinical Research Intern", keywords: ["clinical research", "clinical trial", "cras", "gcp", "trial documentation", "patient assessment"] },
  "data-analytics": { label: "Research Data Assistant", keywords: ["data", "python", "statistical", "machine learning", "analytics", "tableau", "power bi"] },
  "ayush-research": { label: "AYUSH Research Intern", keywords: ["ayurveda", "ayush", "panchakarma", "kayachikitsa", "dravyaguna", "herbal", "nia"] },
  pharmacovigilance: { label: "Pharmacovigilance Trainee", keywords: ["pharmacovigilance", "adr", "drug safety", "pharmacology"] },
  "clinical-ops": { label: "Clinical Operations", keywords: ["operations", "ward", "opd", "hospital", "care"] },
  general: { label: "General Research Intern", keywords: [] },
};

export function detectRoleKey(title: string, requiredSkills: string[]): InterviewRoleKey {
  const hay = (title + " " + requiredSkills.join(" ")).toLowerCase();
  let best: InterviewRoleKey = "general";
  let bestScore = -1;
  for (const [k, def] of Object.entries(ROLE_DEFS) as [InterviewRoleKey, typeof ROLE_DEFS[InterviewRoleKey]][]) {
    if (k === "general") continue;
    let s = 0;
    for (const kw of def.keywords) if (hay.includes(kw)) s += kw.length > 6 ? 2 : 1;
    for (const rs of requiredSkills) if (def.keywords.some((kw) => rs.toLowerCase().includes(kw.split(" ")[0]))) s += 1.5;
    if (s > bestScore) { bestScore = s; best = k; }
  }
  if (bestScore <= 0) return "general";
  return best;
}

export function roleLabelFor(key: InterviewRoleKey): string {
  return ROLE_DEFS[key]?.label ?? ROLE_DEFS.general.label;
}

// ---------------------------------------------------------------------------
// Deterministic question bank — used offline and as fallback
// ---------------------------------------------------------------------------
type BankEntry = { technical: string[]; behavioral: string[]; situational: string[] };

const SKILL_BANK: Record<string, BankEntry> = {
  Python: {
    technical: [
      "In Python, how would you clean a clinical-trial CSV with missing values and inconsistent date formats? Walk through your pandas steps.",
      "Write (in words) a Python function to compute descriptive stats for a cohort. What libraries would you use and why?",
    ],
    behavioral: ["Describe a time you debugged a tricky Python error under a deadline. What was your approach?"],
    situational: ["You inherit a Jupyter notebook with no comments that crashes on a key merge. How do you make it reproducible in one day?"],
  },
  "Machine Learning": {
    technical: [
      "You have 500 patient records with Ayurvedic markers. How would you frame a CVD risk-prediction ML problem and pick a first model?",
      "How would you evaluate whether your classifier overfits on a small clinical dataset?",
    ],
    behavioral: ["Tell us about a model that failed in validation. What did you learn?"],
    situational: ["An ML dashboard flags an herb–drug interaction incorrectly. How do you investigate and communicate the fix?"],
  },
  "Research Methodology": {
    technical: [
      "Outline the sections of a systematic review protocol for an Ayurvedic formulation's efficacy. What goes in PICO?",
      "When would you choose a cross-sectional vs. a cohort design for AYUSH field research?",
    ],
    behavioral: ["How do you handle a co-author disagreeing on your methodology section?"],
    situational: ["Your literature search returns contradictory findings on Panchakarma outcomes. How do you synthesize them?"],
  },
  "Data Analysis": {
    technical: [
      "Given a rural health survey (500 households, mixed numeric/categorical), what EDA steps and visualizations would you do first?",
      "How would you choose between a t-test, Mann–Whitney, and ANOVA for comparing two herb-dose groups?",
    ],
    behavioral: ["Describe how you presented a confusing data finding to a non-technical supervisor."],
    situational: ["A dashboard shows an unexpected spike in reported adverse events for one site. What is your triage?"],
  },
  "Clinical Research": {
    technical: [
      "Walk through the lifecycle of a clinical trial from protocol to CSR. Where does a Clinical Research Intern contribute most?",
      "What are the essential elements of informed consent, and how would you verify them in source documents?",
    ],
    behavioral: ["Tell us about a time you spotted an inconsistency in case records. What did you do?"],
    situational: ["A participant withdraws consent mid-trial. What documentation and data-handling steps do you trigger?"],
  },
  "Statistical Analysis": {
    technical: [
      "A trial compares herb A vs placebo on fasting glucose (n=60). Which test and assumptions would you check? How would you report a p-value and effect size?",
      "When would you use multiple imputation vs. complete-case analysis for missing trial data?",
    ],
    behavioral: ["Describe a time your statistical conclusion was challenged. How did you respond?"],
    situational: ["Your pre-registered analysis shows p=0.06. How do you write this up without p-hacking?"],
  },
  "Scientific Writing": {
    technical: [
      "How would you structure an IMRaD manuscript from a small pilot study? What belongs in each section?",
      "How do you avoid plagiarism and manage citations for a review article on herbal safety?",
    ],
    behavioral: ["Describe receiving harsh reviewer feedback on your writing. How did you revise?"],
    situational: ["You have 48 hours to turn a workshop report into a publication-ready brief. What is your process?"],
  },
  Documentation: {
    technical: [
      "What makes Good Documentation Practice (ALCOA+) in a regulated trial file? Give examples.",
      "How would you maintain a Trial Master File so an auditor can reconstruct the study?",
    ],
    behavioral: ["Tell us about catching a documentation error that could have become an audit finding."],
    situational: ["Two sites use different CRF versions. How do you reconcile and document the change?"],
  },
  Pharmacovigilance: {
    technical: [
      "A patient on an Ayurvedic formulation reports a rash. Walk through your ADR case intake and causality assessment.",
      "How would you code adverse events with MedDRA and assess expectedness?",
    ],
    behavioral: ["How do you handle pressure to downplay a safety signal?"],
    situational: ["A PSUR is due in a week and one site is late with line listings. What do you do?"],
  },
  "Data Management": {
    technical: ["How would you validate and clean data from REDCap before database lock?", "Describe your approach to a database audit trail."],
    behavioral: ["Tell us about reconciling conflicting data from two sources under time pressure."],
    situational: ["A range check flags 15% of lab values as out-of-range on import. How do you triage?"],
  },
  "Clinical Trial Documentation": {
    technical: ["What is the difference between a CRF, TMF, and CSR, and who owns each?", "How do you version-control a protocol amendment?"],
    behavioral: ["Describe coordinating stakeholders for a protocol amendment."],
    situational: ["An auditor finds a missing ICF signature page. What CAPA do you propose?"],
  },
  Pharmacology: {
    technical: ["Explain dose-response and therapeutic index using an AYUSH herb example.", "How would you assess a herb–drug interaction risk?"],
    behavioral: ["How do you keep pharmacology knowledge current?"],
    situational: ["A clinician proposes an off-label dose. How do you evaluate and communicate risk?"],
  },
  "Ayurvedic Therapeutics": {
    technical: ["Describe Panchakarma planning for a patient cohort — how do you document indication and outcome?", "How do you correlate Nadi Pariksha findings with modern diagnostics in a study context?"],
    behavioral: ["How do you explain Ayurvedic evidence to a skeptic on an interdisciplinary team?"],
    situational: ["A trial blends Ayurvedic and allopathic arms. How do you ensure fair outcome assessment?"],
  },
  Communication: {
    technical: ["How would you tailor a trial summary for participants, clinicians, and a regulator?"],
    behavioral: ["Describe handling a difficult conversation with a participant about study burden."],
    situational: ["Your PI asks you to cut methods details to fit a word limit. How do you negotiate?"],
  },
  Leadership: {
    technical: ["How would you run a 5-person student research team with clear roles and deadlines?"],
    behavioral: ["Tell us about leading without formal authority."],
    situational: ["Two teammates disagree on authorship. How do you mediate?"],
  },
  "Project Management": {
    technical: ["How would you plan a 12-week research internship with milestones and risks?"],
    behavioral: ["Describe keeping a project on track when a dependency slipped."],
    situational: ["Scope doubles mid-internship. How do you re-plan and communicate?"],
  },
  Research: {
    technical: ["What ethical approvals and registrations does an AYUSH clinical study need in India?"],
    behavioral: ["How do you respond to an IEC query about your consent process?"],
    situational: ["Recruitment is at 40% with two weeks left. What actions do you take?"],
  },
};

function genericFallback(skill: string): BankEntry {
  return {
    technical: [`The role requires ${skill}. How would you demonstrate proficiency in ${skill} on this internship?`],
    behavioral: [`Describe a challenge you faced while learning ${skill} and how you overcame it.`],
    situational: [`You are asked to deliver a ${skill} task with limited guidance on day one. What is your first-hour plan?`],
  };
}

function pickForSkill(skill: string, kind: "technical" | "behavioral" | "situational", idx: number): string {
  const b = SKILL_BANK[skill] ?? genericFallback(skill);
  const arr = b[kind];
  return arr[idx % arr.length];
}

function deterministicQuestions(
  opportunityTitle: string,
  requiredSkills: string[],
  roleKey: InterviewRoleKey,
  gaps: { name: string }[],
  opportunityId: string,
): MockQuestion[] {
  const gapNames = new Set(gaps.map((g) => g.name.toLowerCase()));
  const orderedSkills = [...requiredSkills];
  // Prioritize gap skills first so the interview feels personal
  orderedSkills.sort((a, b) => {
    const aGap = gapNames.has(a.toLowerCase()) ? 0 : 1;
    const bGap = gapNames.has(b.toLowerCase()) ? 0 : 1;
    return aGap - bGap;
  });
  const qs: MockQuestion[] = [];
  const used = new Set<string>();
  let qi = 0;

  // 4 technical: one per required skill (or reuse)
  for (let i = 0; i < 4; i++) {
    const skill = orderedSkills[i % Math.max(1, orderedSkills.length)] || "Research Methodology";
    if (used.has(skill + ":t")) continue;
    used.add(skill + ":t");
    const isGap = gapNames.has(skill.toLowerCase());
    qs.push({
      id: `q-${opportunityId}-t${i + 1}`,
      prompt: pickForSkill(skill, "technical", qi++),
      kind: "technical",
      skill,
      difficulty: isGap ? "Intermediate" : i < 2 ? "Intermediate" : "Advanced",
      expectedPoints: isGap
        ? ["Define the concept clearly", "Name one method/tool and when to use it", "Mention an assumption or pitfall"]
        : ["Apply the method to the role's context", "Justify your choice", "How you'd validate the result"],
      targetsGap: isGap ? skill : undefined,
    });
  }

  // 1 behavioral — tailored to role
  const behavioralSkill = roleKey === "data-analytics" ? "Communication" : roleKey === "ayush-research" ? "Ayurvedic Therapeutics" : "Clinical Research";
  qs.push({
    id: `q-${opportunityId}-b1`,
    prompt: pickForSkill(behavioralSkill, "behavioral", qi++),
    kind: "behavioral",
    skill: behavioralSkill,
    difficulty: "Intermediate",
    expectedPoints: ["Situation & task", "Specific actions you took", "Outcome and what you learned"],
  });

  // 1 situational — always closing
  const sitSkill = requiredSkills[0] || "Research Methodology";
  qs.push({
    id: `q-${opportunityId}-s1`,
    prompt: pickForSkill(sitSkill, "situational", qi++),
    kind: "situational",
    skill: sitSkill,
    difficulty: "Advanced",
    expectedPoints: ["Clarify constraints and stakeholders", "Immediate next steps", "How you'd document and follow up"],
    targetsGap: gapNames.has(sitSkill.toLowerCase()) ? sitSkill : undefined,
  });

  return qs.slice(0, 6);
}

// ---------------------------------------------------------------------------
// LLM generation — with deterministic fallback
// ---------------------------------------------------------------------------
const GEN_SYSTEM = `You are a mock interview generator for the Learn2Lead AYUSH academia-industry platform.
Given an opportunity's title, required skills, and the student's gaps, create 6 interview questions.
Return ONLY valid JSON: {"rationale":"one line why these 6 fit the role","questions":[{"id":"q1","prompt":"...","kind":"technical|behavioral|situational","skill":"skill name","difficulty":"Beginner|Intermediate|Advanced","expectedPoints":["point 1","point 2","point 3"]}]} 
Rules:
- 4 technical (one per required skill), 1 behavioral, 1 situational.
- Each question must be role-specific (use AYUSH / clinical / data context).
- expectedPoints = 2-3 hints of what a strong answer covers.
- Keep prompts 1-2 sentences, conversational, as an interviewer would ask.`;

function genUserPrompt(
  dashboard: StudentDashboard,
  opp: { id: string; title: string; requiredSkills: string[]; description?: string },
  roleKey: InterviewRoleKey,
): string {
  return `Opportunity: ${opp.title} (${roleLabelFor(roleKey)}) — needs [${opp.requiredSkills.join(", ")}]
Description: ${(opp.description || "").slice(0, 400)}
Student target role: ${dashboard.student.targetRole}; gaps: ${dashboard.gaps.map((g) => `${g.name}(${g.current}/${g.required})`).join(", ") || "none"}
Passport top skills: ${dashboard.skillPassport.items.slice(0, 5).map((s) => `${s.name} ${s.confidence}%`).join(", ")}
Generate 6 questions. Return JSON.`;
}

function parseGenResponse(content: string, fallback: MockQuestion[], opportunityId: string, opportunityTitle: string, roleKey: InterviewRoleKey): { questions: MockQuestion[]; rationale: string } {
  try {
    let s = content;
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1];
    const obj = JSON.parse(s.match(/\{[\s\S]*\}/)?.[0] ?? s);
    const qs: MockQuestion[] = (obj.questions || []).slice(0, 6).map((r: Record<string, unknown>, i: number) => ({
      id: String(r.id || `q-${opportunityId}-${i + 1}`),
      prompt: String(r.prompt || fallback[i]?.prompt || "Tell us about your experience relevant to this role."),
      kind: (["technical", "behavioral", "situational"].includes(String(r.kind)) ? r.kind : (i < 4 ? "technical" : i === 4 ? "behavioral" : "situational")) as MockQuestion["kind"],
      skill: String(r.skill || fallback[i]?.skill || "General"),
      difficulty: (["Beginner", "Intermediate", "Advanced"].includes(String(r.difficulty)) ? r.difficulty : (fallback[i]?.difficulty ?? "Intermediate")) as MockQuestion["difficulty"],
      expectedPoints: Array.isArray(r.expectedPoints) ? (r.expectedPoints as string[]).slice(0, 4).map(String) : (fallback[i]?.expectedPoints ?? []),
      targetsGap: fallback[i]?.targetsGap,
    }));
    const rationale = String(obj.rationale || "").slice(0, 300);
    if (qs.length >= 4) return { questions: qs, rationale };
  } catch { /* fall through */ }
  return { questions: fallback, rationale: "" };
}

export async function generateMockInterview(
  dashboard: StudentDashboard,
  opp: { id: string; title: string; requiredSkills: string[]; description?: string; org?: string },
): Promise<MockInterviewSpec> {
  const roleKey = detectRoleKey(opp.title, opp.requiredSkills);
  const roleLabel = roleLabelFor(roleKey);
  const fallback = deterministicQuestions(opp.title, opp.requiredSkills, roleKey, dashboard.gaps, opp.id);
  const hashKey = aiHashKey(["mock-gen", opp.id, roleKey, dashboard.gaps.map((g) => g.name).join(",")]);
  const cached = readAICache<MockInterviewSpec>("mock-gen", hashKey);
  if (cached && cached.value.questions.length >= 4) return { ...cached.value, source: "cache" as const };

  try {
    const content = await dedupedFetch(`mock-gen:${hashKey}`, () =>
      aiCompletion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: GEN_SYSTEM },
          { role: "user", content: genUserPrompt(dashboard, opp, roleKey) },
        ],
        temperature: 0.35,
        maxTokens: 1800,
      }),
    );
    const parsed = parseGenResponse(content, fallback, opp.id, opp.title, roleKey);
    const spec: MockInterviewSpec = {
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      roleKey,
      roleLabel,
      requiredSkills: opp.requiredSkills,
      questions: parsed.questions,
      source: "ai",
      rationale: parsed.rationale,
    };
    writeAICache("mock-gen", hashKey, spec, "ai");
    return spec;
  } catch {
    const spec: MockInterviewSpec = {
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      roleKey,
      roleLabel,
      requiredSkills: opp.requiredSkills,
      questions: fallback,
      source: "deterministic",
      rationale: `${fallback.length} role-specific questions for ${roleLabel} — generated on-device.`,
    };
    writeAICache("mock-gen", hashKey, spec, "deterministic");
    return spec;
  }
}

// ---------------------------------------------------------------------------
// Evaluation — LLM with deterministic fallback
// ---------------------------------------------------------------------------
const EVAL_SYSTEM = `You are a kind but rigorous mock-interview evaluator for the Learn2Lead AYUSH platform.
Given 6 questions and the student's answers, score each 0-10 and give holistic feedback.
Return ONLY valid JSON:
{
  "overallScore": 72,
  "perQuestion": [{"questionId":"q1","score":7,"feedback":"1-2 sentence specific feedback"}],
  "strengths": ["one-line strength 1", "strength 2"],
  "gapsToClose": [{"gapName":"Statistical Analysis","why":"brief why it showed","suggestedAction":"course or project title"}],
  "roleReadinessNote":"1-2 sentences mapping to readiness",
  "nextSteps":["action 1","action 2","action 3"]
}
Rules:
- overallScore 0-100 (average of perQuestion *10).
- Feedback must cite something the student said or omitted — be concrete, not generic.
- gapsToClose must reference the student's actual skill gaps when relevant.
- Keep each feedback 1-2 sentences.`;

function evalUserPrompt(
  dashboard: StudentDashboard,
  spec: MockInterviewSpec,
  questions: MockQuestion[],
  answers: Record<string, string>,
): string {
  const qa = questions
    .map((q, i) => `Q${i + 1} [${q.skill}/${q.kind}] (${q.id}): ${q.prompt}\nAnswer: ${(answers[q.id] || "").trim().slice(0, 1200) || "(no answer)"}`)
    .join("\n\n");
  return `Role: ${spec.roleLabel} — requires [${spec.requiredSkills.join(", ")}]
Student gaps: ${dashboard.gaps.map((g) => `${g.name} ${g.current}/${g.required} severity ${g.severity}`).join("; ") || "none"}
Readiness: ${dashboard.roleReadiness.readiness} ${dashboard.roleReadiness.readinessScore}/100 for ${dashboard.roleReadiness.targetRole}

Interview:
${qa}

Return JSON evaluation.`;
}

function deterministicEval(
  dashboard: StudentDashboard,
  spec: MockInterviewSpec,
  questions: MockQuestion[],
  answers: Record<string, string>,
): MockInterviewEval {
  const gapByName = new Map(dashboard.gaps.map((g) => [g.name.toLowerCase(), g]));
  const perQuestion: PerQuestionEval[] = [];
  let sum = 0;
  const hitGaps = new Set<string>();

  for (const q of questions) {
    const ans = (answers[q.id] || "").trim();
    const words = ans.split(/\s+/).filter(Boolean).length;
    const lower = ans.toLowerCase();
    // Heuristic: length + keyword hits on expected points + skill mention
    const skillHit = lower.includes(q.skill.toLowerCase().split(" ")[0]) ? 1.5 : 0;
    const pointHits = q.expectedPoints.reduce((n, p) => (lower.includes(p.toLowerCase().split(" ")[0].slice(0, 4)) ? n + 0.6 : n), 0);
    const lengthScore = words === 0 ? 0 : words < 12 ? 2 : words < 30 ? 4.5 : words < 80 ? 6.5 : 7.5;
    const raw = Math.min(9.2, lengthScore + skillHit + Math.min(2, pointHits));
    const score = ans.length === 0 ? 1 : Math.round(raw * 10) / 10;
    sum += score;

    const isGapQ = q.targetsGap && gapByName.has(q.targetsGap.toLowerCase());
    if (isGapQ) hitGaps.add(q.targetsGap!);

    let feedback: string;
    if (words === 0) feedback = "No answer provided — interviewers look for at least a brief approach even under uncertainty.";
    else if (score >= 7.5) feedback = `Clear and specific — you addressed ${q.skill} with concrete steps. Tighten with one named method or metric.`;
    else if (score >= 5) feedback = `On the right track for ${q.skill}, but add a named method, assumption, or example to make it interview-strong.`;
    else feedback = `Too brief for ${q.skill}. Name the method, when you'd use it, and one pitfall you'd check.`;

    perQuestion.push({ questionId: q.id, score, feedback, gap: isGapQ ? q.targetsGap : undefined, strength: score >= 7 ? q.skill : undefined });
  }

  const overallScore = Math.round((sum / Math.max(1, questions.length)) * 10);
  const strengths = perQuestion.filter((p) => p.score >= 6.5).slice(0, 3).map((p) => {
    const q = questions.find((x) => x.id === p.questionId);
    return `${q?.skill ?? "General"} — ${p.feedback.slice(0, 90)}`;
  });
  if (strengths.length === 0) strengths.push("Willingness to attempt every question — build on this with more specific examples.");

  const gapsToClose: MockInterviewEval["gapsToClose"] = [];
  for (const g of dashboard.gaps.slice(0, 2)) {
    if (hitGaps.has(g.name) || perQuestion.some((p) => p.gap === g.name && p.score < 6)) {
      gapsToClose.push({
        gapName: g.name,
        why: `Your answers on ${g.name} were less specific than for other skills — this matches your ${g.current}/${g.required} gap.`,
        suggestedAction: g.evidenceNeeded ? `Complete a small ${g.name} deliverable to make it evidence-backed.` : `Do one focused ${g.name} exercise and add evidence.`,
      });
    }
  }
  if (gapsToClose.length === 0 && dashboard.gaps[0]) {
    gapsToClose.push({
      gapName: dashboard.gaps[0].name,
      why: `This gap (${dashboard.gaps[0].current}/${dashboard.gaps[0].required}) appeared in the role's requirements.`,
      suggestedAction: `Close it with a targeted project: ${dashboard.gaps[0].name}.`,
    });
  }

  const readiness = dashboard.roleReadiness;
  const readinessNote =
    overallScore >= 78
      ? `Strong mock performance toward ${readiness.targetRole} — you sound ${readiness.readiness}. Polish the gaps above to push readiness past ${readiness.readinessScore}.`
      : overallScore >= 58
        ? `Developing toward ${readiness.targetRole}. Your technical base is there; tighten ${gapsToClose[0]?.gapName ?? "the target skills"} for a stronger interview.`
        : `Early-stage for ${readiness.targetRole}. Use this feedback to pick one gap and build a verifiable deliverable.`;

  const nextSteps = [
    gapsToClose[0] ? `Start the ${gapsToClose[0].gapName} project in Projects.` : "Pick one opportunity and apply — your profile already matches well.",
    "Re-run this mock after your next deliverable to see readiness move.",
    "Add one certificate or project evidence to lift confidence scores that the interviewer will probe.",
  ];

  return {
    overallScore,
    perQuestion,
    strengths,
    gapsToClose,
    roleReadinessNote: readinessNote,
    nextSteps,
    source: "deterministic",
    hitGapIds: dashboard.gaps.filter((g) => hitGaps.has(g.name)).map((g) => g.id),
  };
}

function parseEvalResponse(content: string, fallback: MockInterviewEval): MockInterviewEval {
  try {
    let s = content;
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1];
    const obj = JSON.parse(s.match(/\{[\s\S]*\}/)?.[0] ?? s);
    const perQ: PerQuestionEval[] = (obj.perQuestion || []).slice(0, 10).map((r: Record<string, unknown>) => ({
      questionId: String(r.questionId || r.id || ""),
      score: Math.min(10, Math.max(0, Number(r.score) || 0)),
      feedback: String(r.feedback || "").slice(0, 280),
      strength: r.strength ? String(r.strength) : undefined,
      gap: r.gap ? String(r.gap) : undefined,
    }));
    const overall = Math.min(100, Math.max(0, Number(obj.overallScore) || (perQ.length ? Math.round((perQ.reduce((a, x) => a + x.score, 0) / perQ.length) * 10) : fallback.overallScore)));
    return {
      overallScore: overall,
      perQuestion: perQ.length ? perQ : fallback.perQuestion,
      strengths: Array.isArray(obj.strengths) ? (obj.strengths as string[]).slice(0, 4).map(String) : fallback.strengths,
      gapsToClose: Array.isArray(obj.gapsToClose)
        ? (obj.gapsToClose as Record<string, unknown>[]).slice(0, 3).map((g) => ({
            gapName: String(g.gapName || g.name || ""),
            why: String(g.why || ""),
            suggestedAction: String(g.suggestedAction || g.action || ""),
          }))
        : fallback.gapsToClose,
      roleReadinessNote: String(obj.roleReadinessNote || obj.readinessNote || fallback.roleReadinessNote).slice(0, 400),
      nextSteps: Array.isArray(obj.nextSteps) ? (obj.nextSteps as string[]).slice(0, 4).map(String) : fallback.nextSteps,
      source: "ai",
      hitGapIds: fallback.hitGapIds,
    };
  } catch {
    return fallback;
  }
}

export async function evaluateMockInterview(
  dashboard: StudentDashboard,
  spec: MockInterviewSpec,
  questions: MockQuestion[],
  answers: Record<string, string>,
): Promise<MockInterviewEval> {
  const answerHash = questions.map((q) => `${q.id}:${(answers[q.id] || "").trim().length}`).join("|");
  const hashKey = aiHashKey(["mock-eval", spec.opportunityId, spec.roleKey, answerHash.slice(0, 600)]);
  const cached = readAICache<MockInterviewEval>("mock-eval", hashKey);
  if (cached) return { ...cached.value, source: "cache" as const };

  const fallback = deterministicEval(dashboard, spec, questions, answers);

  // If answers are very short / empty, skip LLM — deterministic is more honest
  const totalWords = Object.values(answers).join(" ").split(/\s+/).filter(Boolean).length;
  if (totalWords < 18) {
    writeAICache("mock-eval", hashKey, fallback, "deterministic");
    return fallback;
  }

  try {
    const content = await dedupedFetch(`mock-eval:${hashKey}`, () =>
      aiCompletion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: EVAL_SYSTEM },
          { role: "user", content: evalUserPrompt(dashboard, spec, questions, answers) },
        ],
        temperature: 0.25,
        maxTokens: 2200,
      }),
    );
    const parsed = parseEvalResponse(content, fallback);
    writeAICache("mock-eval", hashKey, parsed, "ai");
    return parsed;
  } catch {
    writeAICache("mock-eval", hashKey, fallback, "deterministic");
    return fallback;
  }
}

export function saveMockHistory(entry: { at: string; opportunityId: string; opportunityTitle: string; roleLabel: string; overallScore: number; source: string }) {
  try {
    const key = "l2l.mock_interview_history";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 20);
    localStorage.setItem(key, JSON.stringify(next));
  } catch { /* quota */ }
}
