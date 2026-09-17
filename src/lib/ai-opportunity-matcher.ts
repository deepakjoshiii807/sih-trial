/**
 * Opportunity / candidate / report intelligence — client-side AI helpers.
 * Each one is a thin LLM re-ranker with a deterministic fallback so the
 * products stays usable even when the AI gateway is not configured.
 */
import { aiCompletion } from "./ai-server";
import { aiHashKey, dedupedFetch, readAICache, writeAICache } from "./ai-cache";
import type { StudentDashboard } from "./student-api";

export type MatchSignal = { skill: string; why: string; positive: boolean };

export interface EnrichedMatch {
  /** Extra points (−5..+10) the LLM re-ranker adds to the deterministic match. */
  delta: number;
  /** Human-readable rationale for the delta (shown as a tooltip/tag). */
  rationale: string;
  signals: MatchSignal[];
}

export interface ScholarshipHit {
  id: string;
  title: string;
  provider: string;
  amount?: string;
  deadline?: string;
  url?: string;
  eligibility: string;
  whyYouMatch: string;
  confidence: number;
}

export interface FacultyQueueCaseSummary {
  id: string;
  title: string;
  riskLevel: "low" | "medium" | "high";
  summary: string;
  keySignals: string[];
  suggestedDecision: "approved" | "changes-requested" | "flagged";
}

export interface IndustryCandidateRank {
  candidateId: string;
  candidateName: string;
  overallFit: number; // 0-100
  whyHire: string;
  watchouts: string[];
}

export interface ReportNarrative {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  insights: string[];
}

/* ------------------------------------------------------------------ */
/* Opportunity / Scholarship LLM re-ranker                             */
/* ------------------------------------------------------------------ */

const MATCH_SYSTEM = `You are a skill-matching re-ranker for the Learn2Lead AYUSH platform.
Given a student's skills and an opportunity's required skills, output a SMALL correction to a deterministic matcher.
- delta is an integer in [-5, +10]. Positive when evidence + domain context justify extra confidence.
- Be explainable: one short rationale and 2-3 granular signals.
- Respond ONLY with valid JSON: {"delta": 4, "rationale": "...", "signals": [{"skill": "...", "why": "...", "positive": true}]}`;

function matchPrompt(student: StudentDashboard, oppTitle: string, requiredSkills: string[], matchedSkills: string[], missingSkills: string[]): string {
  const passport = student.skillPassport.items.slice(0, 8).map((s) => `${s.name}(${s.confidence}%/${s.origin})`).join(", ");
  return `Student (${student.student.targetRole}): ${passport}\nOpportunity: ${oppTitle} needs [${requiredSkills.join(", ")}]\nDeterministic: matched=[${matchedSkills.join(", ")}] missing=[${missingSkills.join(", ")}]\nReturn the JSON delta.`;
}

function parseMatchDelta(content: string): EnrichedMatch {
  try {
    let s = content;
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1];
    const obj = JSON.parse(s.match(/\{[\s\S]*\}/)?.[0] ?? s);
    const delta = Math.max(-5, Math.min(10, Number(obj.delta) || 0));
    const rationale = String(obj.rationale || "").slice(0, 220);
    const signals: MatchSignal[] = (obj.signals || []).slice(0, 4).map((x: unknown) => {
      const r = x as Record<string, unknown>;
      return { skill: String(r.skill || ""), why: String(r.why || ""), positive: Boolean(r.positive) };
    }).filter((x: MatchSignal) => x.skill);
    return { delta, rationale, signals };
  } catch {
    return { delta: 0, rationale: "", signals: [] };
  }
}

function deterministicEnrichedMatch(
  student: StudentDashboard,
  opp: { id: string; title: string; requiredSkills: string[]; matchedSkills: string[]; missingSkills: string[] },
): EnrichedMatch {
  const byName = new Map(student.skillPassport.items.map((s) => [s.name.toLowerCase(), s]));
  const signals: MatchSignal[] = [];
  let delta = 0;
  for (const name of opp.matchedSkills.slice(0, 3)) {
    const claim = byName.get(name.toLowerCase());
    const conf = claim?.confidence ?? 65;
    const verified = claim?.origin === "evidence";
    signals.push({
      skill: name,
      why: verified ? `Verified at ${conf}% — strong evidence` : `Present at ${conf}% — add evidence to boost`,
      positive: true,
    });
    if (verified && conf >= 85) delta += 3;
    else if (verified && conf >= 70) delta += 2;
    else if (verified) delta += 1;
    else delta += 1;
  }
  for (const name of opp.missingSkills.slice(0, 2)) {
    const claim = byName.get(name.toLowerCase());
    const why = claim
      ? `Only ${claim.confidence}% — below required threshold, close this gap to improve match`
      : `Not yet evidenced — complete a project/course for this skill to unlock the role`;
    signals.push({ skill: name, why, positive: false });
    delta -= 2;
  }
  delta = Math.max(-5, Math.min(10, delta));
  const total = opp.requiredSkills.length || Math.max(1, opp.matchedSkills.length + opp.missingSkills.length);
  const matched = opp.matchedSkills.length;
  let rationale = `${matched}/${total} required skills matched for ${opp.title}. `;
  if (matched === total) rationale += "You cover all core requirements — strong fit.";
  else if (matched >= Math.ceil(total * 0.6)) rationale += `Strong overlap — ${opp.missingSkills.slice(0, 2).join(", ") || "minor gaps"} is the main gap to close.`;
  else rationale += `Partial fit — build ${opp.missingSkills.slice(0, 2).join(" and ") || "missing skills"} to unlock this role.`;
  return { delta, rationale: rationale.slice(0, 220), signals: signals.slice(0, 4) };
}

export async function enrichOpportunityMatch(
  student: StudentDashboard,
  opp: { id: string; title: string; requiredSkills: string[]; matchedSkills: string[]; missingSkills: string[] },
): Promise<EnrichedMatch> {
  const key = aiHashKey(["match", student.student.id, opp.id]);
  const cached = readAICache<EnrichedMatch>("opp-match", key);
  // Invalidate stale empty-rationale caches from before the deterministic fallback shipped
  if (cached && cached.value.rationale && cached.value.rationale.length >= 12) return cached.value;
  // Try live AI re-ranker first (requires VLY_INTEGRATION_KEY on the Django server via POST /api/ai/completion)
  try {
    const content = await dedupedFetch(`opp-match:${key}`, () =>
      aiCompletion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: MATCH_SYSTEM },
          { role: "user", content: matchPrompt(student, opp.title, opp.requiredSkills, opp.matchedSkills, opp.missingSkills) },
        ],
        temperature: 0.2,
        maxTokens: 500,
      }),
    );
    const parsed = parseMatchDelta(content);
    if (parsed.rationale && parsed.rationale.length >= 12) {
      writeAICache("opp-match", key, parsed, "ai");
      return parsed;
    }
  } catch {
    // gateway not configured / offline / 503 — fall through to deterministic
  }
  const fallback = deterministicEnrichedMatch(student, opp);
  writeAICache("opp-match", key, fallback, "deterministic");
  return fallback;
}

/* Scholarships — grounded catalog (DB) + optional LLM re-rank for whyYouMatch.
 * The catalog itself is never hallucinated: every item comes from
 * GET /api/student/scholarships (or /api/catalog/scholarships). The LLM only
 * rewrites the fit rationale when available; otherwise the deterministic
 * eligibility reasons from the server are used.
 */

import { apiClient } from "./api-helpers";

type RawScholarshipRow = {
  id: string;
  title: string;
  provider: string;
  amount?: string;
  deadline?: string;
  url?: string;
  eligibility: string;
  eligibleCourses?: string[];
  relevantSkills?: string[];
  category?: string;
  confidence?: number;
  whyYouMatch?: string;
  eligibilityReasons?: string[];
};

const SCHOLARSHIP_RERANK_SYSTEM = `You are a scholarship advisor for Learn2Lead. Given a student's profile and 2-6 real scholarships (title, provider, eligibility), return a JSON map from scholarship id to a 1-sentence personalized whyYouMatch. Ground every sentence ONLY in the given eligibility — never invent new criteria. Respond ONLY with JSON: {"whyYouMatch": {"sch-1": "...", "sch-2": "..."}}`;

export async function discoverScholarships(
  student: StudentDashboard,
): Promise<{ items: ScholarshipHit[]; source: "ai" | "deterministic" | "cache" }> {
  const key = aiHashKey(["scholarships", student.student.id, student.student.course, student.gaps.length.toString()]);
  const cached = readAICache<ScholarshipHit[]>("scholarships", key);
  if (cached) return { items: cached.value, source: "cache" };

  // 1) Grounded fetch — this is the source of truth, works even without AI
  let rows: RawScholarshipRow[] = [];
  try {
    const { data } = await apiClient.get<RawScholarshipRow[]>("/student/scholarships", { params: { explain: 1 } });
    rows = Array.isArray(data) ? data : [];
  } catch {
    try {
      const { data } = await apiClient.get<RawScholarshipRow[]>("/catalog/scholarships");
      rows = Array.isArray(data) ? data : [];
    } catch {
      rows = [];
    }
  }
  if (rows.length === 0) return { items: [], source: "deterministic" };

  const base: ScholarshipHit[] = rows.slice(0, 6).map((r) => ({
    id: String(r.id),
    title: String(r.title),
    provider: String(r.provider),
    amount: r.amount ? String(r.amount) : undefined,
    deadline: r.deadline ? String(r.deadline) : undefined,
    url: r.url ? String(r.url) : undefined,
    eligibility: String(r.eligibility || ""),
    whyYouMatch: String(r.whyYouMatch || r.eligibilityReasons?.join("; ") || r.eligibility || "Matches your course eligibility"),
    confidence: Math.min(95, Math.max(40, Number(r.confidence) || 65)),
  }));

  // 2) Optional LLM re-rank: rewrite whyYouMatch when gateway is configured
  try {
    const content = await dedupedFetch(`scholarships-rerank:${key}`, () =>
      aiCompletion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SCHOLARSHIP_RERANK_SYSTEM },
          {
            role: "user",
            content:
              `Student: ${student.student.course}/${student.student.year} at ${student.student.institution}, target ${student.student.targetRole}, skills: ${student.skillPassport.items.slice(0, 6).map((s) => s.name).join(", ")}\n` +
              `Scholarships:\n${rows.slice(0, 6).map((r) => `${r.id}: ${r.title} — ${r.provider} — eligibility: ${r.eligibility}`).join("\n")}\nReturn JSON map.`,
          },
        ],
        temperature: 0.25,
        maxTokens: 800,
      }),
    );
    let s = content;
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1];
    const obj = JSON.parse(s.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const whyMap: Record<string, string> = obj.whyYouMatch && typeof obj.whyYouMatch === "object" ? obj.whyYouMatch : obj;
    let touched = false;
    for (const hit of base) {
      const v = whyMap[hit.id];
      if (typeof v === "string" && v.trim().length >= 10) {
        hit.whyYouMatch = v.trim().slice(0, 220);
        touched = true;
      }
    }
    writeAICache("scholarships", key, base, touched ? "ai" : "deterministic");
    return { items: base, source: touched ? "ai" : "deterministic" };
  } catch {
    writeAICache("scholarships", key, base, "deterministic");
    return { items: base, source: "deterministic" };
  }
}

/* Faculty queue summaries — one LLM call over the pending verifications. */

const FACULTY_SYSTEM = `You are a faculty reviewer assistant for Learn2Lead. Summarize a verification queue and flag any risky case in 1-2 sentences each. Respond ONLY with JSON: {"cases": [{"id": "...", "riskLevel": "low|medium|high", "summary": "...", "keySignals": ["..."], "suggestedDecision": "approved|changes-requested|flagged"}]}`;

export async function summarizeVerificationQueue(
  items: { id: string; title: string; description: string; skillsClaimed: string[]; status: string }[],
): Promise<FacultyQueueCaseSummary[]> {
  if (items.length === 0) return [];
  const key = aiHashKey(["faculty-queue", items.map((x) => x.id).join(","), items.length.toString()]);
  const cached = readAICache<FacultyQueueCaseSummary[]>("faculty-queue", key);
  if (cached) return cached.value;
  try {
    const content = await dedupedFetch(`faculty-queue:${key}`, () =>
      aiCompletion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: FACULTY_SYSTEM },
          { role: "user", content: `Queue (${items.length}):\n${items.slice(0, 10).map((x, i) => `${i + 1}. ${x.id} — ${x.title} (${x.skillsClaimed.join(", ")}) — ${x.description.slice(0, 180)}`).join("\n")}\nReturn JSON.` },
        ],
        temperature: 0.2,
        maxTokens: 1800,
      }),
    );
    let s = content;
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1];
    const obj = JSON.parse(s.match(/\{[\s\S]*\}/)?.[0] ?? '{"cases":[]}');
    const cases: FacultyQueueCaseSummary[] = (obj.cases || []).slice(0, 10).map((r: Record<string, unknown>) => ({
      id: String(r.id || ""),
      title: String(r.title || ""),
      riskLevel: (["low", "medium", "high"].includes(String(r.riskLevel)) ? r.riskLevel : "low") as FacultyQueueCaseSummary["riskLevel"],
      summary: String(r.summary || ""),
      keySignals: (r.keySignals as string[] | undefined)?.slice(0, 4).map(String) || [],
      suggestedDecision: (["approved", "changes-requested", "flagged"].includes(String(r.suggestedDecision)) ? r.suggestedDecision : "approved") as FacultyQueueCaseSummary["suggestedDecision"],
    }));
    writeAICache("faculty-queue", key, cases, "ai");
    return cases;
  } catch {
    return [];
  }
}

/* Industry: rank candidates for an opportunity. */

const RANK_SYSTEM = `You are an AYUSH industry recruiter assistant. Given an opportunity's required skills and a short list of candidates, rank them and explain 1-line why. Respond ONLY with JSON: {"ranks": [{"candidateId": "...", "overallFit": 84, "whyHire": "...", "watchouts": ["..."]}]}`;

export async function rankIndustryCandidates(
  oppTitle: string,
  requiredSkills: string[],
  applicants: { id: string; candidateName: string; matchedSkills: string[]; missingSkills: string[]; matchScore: number }[],
): Promise<IndustryCandidateRank[]> {
  if (applicants.length === 0) return [];
  const key = aiHashKey(["industry-rank", oppTitle, requiredSkills.join(","), applicants.map((a) => a.id).join(",")]);
  const cached = readAICache<IndustryCandidateRank[]>("industry-rank", key);
  if (cached) return cached.value;
  try {
    const content = await dedupedFetch(`industry-rank:${key}`, () =>
      aiCompletion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: RANK_SYSTEM },
          {
            role: "user",
            content: `Opportunity: ${oppTitle} — needs [${requiredSkills.join(", ")}]\nCandidates:\n${applicants.slice(0, 8).map((a, i) => `${i + 1}. ${a.id} ${a.candidateName} — matched [${a.matchedSkills.join(", ")}] missing [${a.missingSkills.join(", ")}] deterministic ${a.matchScore}%`).join("\n")}\nReturn JSON.`,
          },
        ],
        temperature: 0.25,
        maxTokens: 1600,
      }),
    );
    let s = content;
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1];
    const obj = JSON.parse(s.match(/\{[\s\S]*\}/)?.[0] ?? '{"ranks":[]}');
    const ranks: IndustryCandidateRank[] = (obj.ranks || []).slice(0, 8).map((r: Record<string, unknown>) => ({
      candidateId: String(r.candidateId || ""),
      candidateName: String(r.candidateName || ""),
      overallFit: Math.min(98, Math.max(20, Number(r.overallFit) || 60)),
      whyHire: String(r.whyHire || ""),
      watchouts: (r.watchouts as string[] | undefined)?.slice(0, 2).map(String) || [],
    }));
    writeAICache("industry-rank", key, ranks, "ai");
    return ranks;
  } catch {
    return [];
  }
}

/* Report narrative generation. */

const REPORT_SYSTEM = `You are an institutional reporting assistant for Learn2Lead. Given aggregate stats, write: a 2-3 sentence summary, 3-5 key findings, 3 recommendations, and 2-3 insights. Be concrete, not generic. Respond ONLY with JSON: {"summary": "...", "keyFindings": ["..."], "recommendations": ["..."], "insights": [{"skill": "...", "note": "..."}]}`;

export async function generateReportNarrative(
  stats: { totalStudents: number; totalPlaced: number; placementRate: number; avgReadiness: number; type: string; period: string },
): Promise<ReportNarrative | null> {
  const key = aiHashKey(["report-narrative", stats.type, String(stats.totalStudents), String(stats.totalPlaced), stats.period]);
  const cached = readAICache<ReportNarrative>("report-narrative", key);
  if (cached) return cached.value;
  try {
    const content = await dedupedFetch(`report-narrative:${key}`, () =>
      aiCompletion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: REPORT_SYSTEM },
          {
            role: "user",
            content: `Stats: ${JSON.stringify(stats)}\nReturn JSON.`,
          },
        ],
        temperature: 0.35,
        maxTokens: 1400,
      }),
    );
    let s = content;
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1];
    const obj = JSON.parse(s.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const narrative: ReportNarrative = {
      summary: String(obj.summary || ""),
      keyFindings: (obj.keyFindings as string[] | undefined)?.slice(0, 6).map(String) || [],
      recommendations: (obj.recommendations as string[] | undefined)?.slice(0, 5).map(String) || [],
      insights: (obj.insights as unknown[] | undefined)?.slice(0, 4).map((x) => String((x as Record<string, unknown>).note ?? x)) || [],
    };
    if (!narrative.summary && narrative.keyFindings.length === 0) return null;
    writeAICache("report-narrative", key, narrative, "ai");
    return narrative;
  } catch {
    return null;
  }
}
