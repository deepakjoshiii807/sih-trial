/**
 * AI Evidence Audit — institution-admin triage of flagged evidence records.
 *
 * The platform's rule engine flags suspicious student evidence (duplicate
 * records, statistical outliers, inconsistent data, unusual patterns). This
 * module sends the flagged cases to the AI (through the server-side proxy,
 * backend/apps/api/ai.py) for a second-pass forensic review: a verdict,
 * confidence, rationale, and a suggested workflow action per case.
 *
 * The AI only ever sees the flag metadata + short evidence note — never raw
 * document bytes — and is instructed to say "insufficient evidence" rather
 * than guess.
 */
import type { AnomalyFlag } from "./institution-api";
import { aiCompletion } from "./ai-server";

export type AuditVerdict =
  | "duplicate_likely"
  | "inconsistent_likely"
  | "outlier_likely"
  | "pattern_likely"
  | "insufficient_evidence"
  | "appears_legitimate";

export type AuditAction = "resolve" | "escalate" | "review";

export interface EvidenceAuditCase {
  flagId: string;
  verdict: AuditVerdict;
  /** 0–100 confidence in the verdict */
  confidence: number;
  /** 1-2 sentence plain-language read of the case */
  summary: string;
  /** Short reasons, grounded in the supplied evidence note */
  rationale: string[];
  /** Suggested workflow action (matches the backend review endpoint) */
  suggestedAction: AuditAction;
}

export interface EvidenceAuditReport {
  /** What the AI found across the reviewed queue */
  summary: string;
  /** Overall institutional evidence-integrity risk 0 (clean) – 100 (critical) */
  integrityRisk: number;
  cases: EvidenceAuditCase[];
  rawResponse?: string;
}

const SYSTEM_PROMPT = `You are a skeptical forensic evidence auditor for an AYUSH (Ayurveda, Yoga, Unani, Siddha, Homeopathy) academia-industry platform.

The platform's rule engine has already flagged suspicious student evidence records. Your job is a second-pass review: decide, from the flag metadata and the short evidence note provided, which flags are genuine problems worth acting on and which look like legitimate activity that the rule engine over-flagged.

Ground rules:
1. Base every verdict ONLY on the case details provided. Never invent facts, documents, or student history.
2. If the case note is too thin to judge, say "insufficient_evidence" — guessing is worse than abstaining.
3. You cannot inspect the actual uploaded files. The "evidence" field is a human-written note, not proof.
4. Be skeptical but fair. A student having more skills than the department average is not by itself fraud; a duplicated certificate hash or identical internship dates is a strong signal.
5. For each case recommend a workflow action:
   - "resolve" only when the flag looks like a false positive or is safely explainable,
   - "escalate" when the case strongly suggests real duplication/fabrication/inconsistency that needs a human investigator,
   - "review" when more information is needed before deciding.
6. Respond ONLY with valid JSON (no markdown fences).`;

function flagToText(flag: AnomalyFlag, idx: number): string {
  const trim = (s: string, n: number) =>
    s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
  return (
    `Case ${idx}: ${flag.studentName} (${flag.department}) — ${flag.type}\n` +
    `  Rule: ${trim(flag.description, 260)}\n` +
    `  Evidence note: ${trim(flag.evidence, 300)}\n` +
    `  Severity: ${flag.severity}; Status: ${flag.status}; Flagged: ${flag.flaggedDate}`
  );
}

function buildUserPrompt(flags: AnomalyFlag[]): string {
  const serialized = flags.map(flagToText).join("\n\n");
  return `Review these ${flags.length} flagged evidence record(s) currently in the institution review queue:

${serialized}

Return your audit as valid JSON with this exact structure:
{
  "summary": "2-3 sentence overview of the overall integrity picture across these cases",
  "integrityRisk": 45,
  "cases": [
    {
      "flagId": "${flags[0]?.id ?? "an-1"}",
      "verdict": "duplicate_likely|inconsistent_likely|outlier_likely|pattern_likely|insufficient_evidence|appears_legitimate",
      "confidence": 80,
      "summary": "1-2 sentence assessment of this specific case",
      "rationale": ["Short reason grounded in the evidence note", "Second reason"],
      "suggestedAction": "resolve|escalate|review"
    }
  ]
}

Include EXACTLY one case object per flag, in the same order, using the original flag id.`;
}

/**
 * Run an AI second-pass audit over the given flags. Returns structured
 * verdicts; throws a friendly Error when the AI service cannot be reached.
 */
export async function auditEvidenceFlags(
  flags: AnomalyFlag[],
): Promise<EvidenceAuditReport> {
  if (flags.length === 0) {
    return {
      summary: "No pending flags to audit.",
      integrityRisk: 0,
      cases: [],
    };
  }

  // Keep the request bounded — cap the queue size sent to the model.
  const batch = flags.slice(0, 10);

  try {
    const content = await aiCompletion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(batch) },
      ],
      temperature: 0.2,
      maxTokens: 2500,
    });
    return parseAuditResponse(content, batch);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "AI evidence audit failed. Please try again.",
    );
  }
}

function isVerdict(v: string): v is AuditVerdict {
  return [
    "duplicate_likely",
    "inconsistent_likely",
    "outlier_likely",
    "pattern_likely",
    "insufficient_evidence",
    "appears_legitimate",
  ].includes(v);
}

function isAction(v: string): v is AuditAction {
  return ["resolve", "escalate", "review"].includes(v);
}

function parseAuditResponse(
  content: string,
  flags: AnomalyFlag[],
): EvidenceAuditReport {
  try {
    let jsonStr = content;
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1];

    const objMatch = jsonStr.match(/\{[\s\S]*"integrityRisk"[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    const parsed = JSON.parse(jsonStr);

    const cases: EvidenceAuditCase[] = flags.map((flag, i) => {
      const raw = Array.isArray(parsed.cases) ? parsed.cases[i] : undefined;
      const fallback: EvidenceAuditCase = {
        flagId: flag.id,
        verdict: "insufficient_evidence",
        confidence: 0,
        summary: "No AI assessment was returned for this case.",
        rationale: ["Manual review recommended."],
        suggestedAction: "review",
      };
      if (!raw || typeof raw !== "object") return fallback;

      const verdict = isVerdict(String(raw.verdict))
        ? (raw.verdict as AuditVerdict)
        : fallback.verdict;
      const suggestedAction = isAction(String(raw.suggestedAction))
        ? (raw.suggestedAction as AuditAction)
        : verdict === "appears_legitimate"
          ? "resolve"
          : verdict === "insufficient_evidence"
            ? "review"
            : "escalate";

      return {
        flagId: String(raw.flagId || flag.id),
        verdict,
        confidence: Math.min(100, Math.max(0, Number(raw.confidence) || 0)),
        summary: String(raw.summary || fallback.summary),
        rationale: Array.isArray(raw.rationale)
          ? raw.rationale.map(String).slice(0, 4)
          : fallback.rationale,
        suggestedAction,
      };
    });

    return {
      summary: String(parsed.summary || "AI audit complete."),
      integrityRisk: Math.min(
        100,
        Math.max(0, Number(parsed.integrityRisk) || 0),
      ),
      cases,
      rawResponse: content,
    };
  } catch {
    // Unparseable response — fall back to neutral per-flag guidance.
    return {
      summary:
        "The AI returned an unparseable response. Cases need manual review.",
      integrityRisk: 50,
      cases: flags.map((flag) => ({
        flagId: flag.id,
        verdict: "insufficient_evidence" as AuditVerdict,
        confidence: 0,
        summary: "AI response could not be parsed.",
        rationale: ["Manual review recommended."],
        suggestedAction: "review" as AuditAction,
      })),
      rawResponse: content,
    };
  }
}

/** Human labels for audit verdicts (used by the UI). */
export const VERDICT_LABEL: Record<AuditVerdict, string> = {
  duplicate_likely: "Duplicate likely",
  inconsistent_likely: "Inconsistency likely",
  outlier_likely: "Statistical outlier",
  pattern_likely: "Unusual pattern",
  insufficient_evidence: "Insufficient evidence",
  appears_legitimate: "Likely legitimate",
};
