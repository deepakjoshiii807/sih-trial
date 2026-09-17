/**
 * AI Profile Optimizer — analyzes a student's full dashboard data
 * and generates personalized recommendations to improve their career readiness.
 *
 * Model calls go through the server-side proxy (backend/apps/api/ai.py) so
 * the VLY integration key never reaches the browser.
 */
import type { StudentDashboard } from "./student-api";
import { aiCompletion } from "./ai-server";
import { aiHashKey, dedupedFetch, readAICache, writeAICache } from "./ai-cache";

export interface ProfileOptimization {
  /** Overall optimization score 0–100 */
  score: number;
  /** One-line summary of the student's current position */
  summary: string;
  /** Ranked list of actions to take */
  recommendations: OptimizerRecommendation[];
  /** What the AI thinks the student's biggest strength is */
  topStrength: string;
  /** What the AI thinks needs the most work */
  biggestWeakness: string;
  /** AI-generated 2-3 sentence career narrative */
  careerNarrative: string;
}

export interface OptimizerRecommendation {
  /** Unique identifier */
  id: string;
  /** "critical", "high", "medium", or "low" priority */
  priority: "critical" | "high" | "medium" | "low";
  /** Category: skill, profile, opportunity, learning, portfolio */
  category: "skill" | "profile" | "opportunity" | "learning" | "portfolio";
  /** Short title */
  title: string;
  /** Detailed explanation of why this matters */
  description: string;
  /** Expected impact on readiness score if this is done */
  impact: string;
}

const SYSTEM_PROMPT = `You are a career optimization AI assistant for the Learn2Lead AYUSH (Ayurveda, Yoga, Unani, Siddha, Homeopathy) academia-industry platform.

Your job is to analyze a student's complete profile data and provide actionable recommendations to maximize their career readiness and job-match potential.

You understand the AYUSH education ecosystem, clinical research pipelines, pharmacology, data science in healthcare, and the specific skill demands of AYUSH employers (hospitals, research councils like CCRAS, pharmaceutical companies, wellness organizations).

Your recommendations must be:
1. Specific and actionable (not generic advice)
2. Prioritized by career impact
3. Grounded in the student's actual data (skills, gaps, applications, portfolio)
4. Aware of AYUSH-specific opportunities and skill requirements
5. Concise — each recommendation in 1-2 sentences

For the optimization score, consider:
- Skill coverage for target role (40% weight)
- Portfolio strength (20% weight)
- Application success rate (15% weight)
- Learning progress (15% weight)
- Profile completeness (10% weight)`;

function buildUserPrompt(data: StudentDashboard): string {
  const { student, skillPassport, roleReadiness, gaps, opportunities, applications, recommendations, portfolio } = data;

  return `Analyze this student's profile and provide optimization recommendations:

**Student Profile:**
- Name: ${student.name}
- Course: ${student.course}, ${student.year}
- Institution: ${student.institution}
- Target Role: ${student.targetRole}
- Location: ${student.location}
- Profile Completion: ${student.profileCompletion}%
- Bio: ${student.bio || "Not provided"}

**Skill Passport:**
- Verified Skills: ${skillPassport.verifiedCount}
- Self-Declared Skills: ${skillPassport.selfDeclaredCount}
- Total Evidence: ${skillPassport.totalEvidence}
- Verified Evidence: ${skillPassport.verifiedEvidence}
- Top Skills: ${skillPassport.items.slice(0, 5).map(s => `${s.name} (${s.confidence}%, ${s.origin})`).join(", ")}

**Role Readiness:**
- Target: ${roleReadiness.targetRole}
- Status: ${roleReadiness.readiness} (${roleReadiness.readinessScore}/100)
- Matched: ${roleReadiness.matchedSkills}/${roleReadiness.totalRequired} skills
- Strong: ${roleReadiness.strongSkills.join(", ") || "None"}
- Missing: ${roleReadiness.missingSkills.join(", ") || "None"}
- Weak: ${roleReadiness.weakSkills.join(", ") || "None"}

**Skill Gaps:** ${gaps.map(g => `${g.name} (${g.current}/${g.required}, ${g.severity}${g.evidenceNeeded ? ", needs evidence" : ""})`).join("; ") || "None"}

**Applications (${applications.length} total):** ${applications.map(a => `${a.role} at ${a.org} — ${a.stageLabel} (${a.match}% match)`).join("; ") || "None"}

**Available Opportunities (${opportunities.length}):** ${opportunities.map(o => `${o.title} at ${o.org} — ${o.match}% match, needs: ${o.missingSkills.join(", ") || "none"}`).join("; ") || "None"}

**Learning Recommendations:** ${recommendations.map(r => `${r.title} for ${r.closesGap} (${r.type}, ${r.provider}, ${r.duration})`).join("; ") || "None"}

**Portfolio:** ${portfolio.projects} projects, ${portfolio.certificates} certificates, ${portfolio.verifiedSkills} verified skills, ${portfolio.internshipHours} internship hours, ${portfolio.achievements} achievements

Return your analysis as valid JSON with this exact structure:
{
  "score": 72,
  "summary": "One-line summary of current career readiness",
  "topStrength": "What this student does best",
  "biggestWeakness": "What needs the most work",
  "careerNarrative": "2-3 sentence career story and path forward",
  "recommendations": [
    {
      "id": "rec-1",
      "priority": "critical|high|medium|low",
      "category": "skill|profile|opportunity|learning|portfolio",
      "title": "Short title",
      "description": "1-2 sentence actionable explanation",
      "impact": "Expected impact on readiness"
    }
  ]
}

Provide exactly 5-8 recommendations. Be specific to THIS student's data.`;
}

function deterministicOptimization(data: StudentDashboard): ProfileOptimization {
  const gaps = data.gaps.slice(0, 3);
  const readiness = data.roleReadiness;
  const recs: OptimizerRecommendation[] = [];
  for (let i = 0; i < gaps.length; i++) {
    const g = gaps[i];
    recs.push({
      id: `det-${i + 1}`,
      priority: g.severity === "High" ? "critical" : g.severity === "Medium" ? "high" : "medium",
      category: "skill",
      title: `Close ${g.name} gap (${g.current} → ${g.required})`,
      description: `${readiness.targetRole} requires ${g.required}% on ${g.name}; you have ${g.current}%. ${g.evidenceNeeded ? "Evidence would make this verifiable." : "Improve proficiency through practice and evidence."}`,
      impact: `+${Math.min(15, g.required - g.current)} readiness points if closed`,
    });
  }
  if (data.portfolio.certificates === 0) {
    recs.push({
      id: "det-portfolio",
      priority: "medium",
      category: "portfolio",
      title: "Add a verified project or certificate",
      description: "Verified evidence raises confidence scores more than self-declared skills.",
      impact: "Higher trust with reviewers and better matches",
    });
  }
  if (data.applications.length === 0 && data.opportunities.length > 0) {
    recs.push({
      id: "det-oppty",
      priority: "high",
      category: "opportunity",
      title: `Apply to ${data.opportunities[0].title} — ${data.opportunities[0].match}% match`,
      description: `Your strongest live match is at ${data.opportunities[0].org}. Applying now turns readiness into a real pipeline stage.`,
      impact: "A live application with interview potential",
    });
  }
  const score = readiness.readinessScore;
  return {
    score,
    summary: readiness.explanation || `You are ${readiness.readiness} toward ${readiness.targetRole}.`,
    topStrength: readiness.strongSkills[0] || data.skillPassport.items[0]?.name || "No strong skill yet — close your biggest gap first",
    biggestWeakness: gaps[0]?.name || readiness.missingSkills[0] || "No major weakness detected",
    careerNarrative: `With ${data.skillPassport.verifiedCount} verified skills you are on the path to ${readiness.targetRole}. Closing ${gaps[0]?.name ?? "your top gap"} would unlock the most opportunity matches. The next step is a small, verifiable deliverable that directly evidences that gap.`,
    recommendations: recs.slice(0, 6),
  };
}

/** Deterministic + cached wrapper — only hits the network when the key changes. */
export async function optimizeProfileCached(
  data: StudentDashboard,
): Promise<{ value: ProfileOptimization; source: "ai" | "deterministic" | "cache"; hashKey: string }> {
  const prompt = buildUserPrompt(data);
  const hashKey = aiHashKey(["optimizer", data.student.id, data.roleReadiness.readinessScore.toString(), gapsKey(data), data.applications.length.toString()]);
  const cached = readAICache<ProfileOptimization>("optimizer", hashKey);
  if (cached) return { value: cached.value, source: "cache", hashKey };
  try {
    const content = await dedupedFetch(`optimizer:${hashKey}`, () =>
      aiCompletion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        maxTokens: 3000,
      }),
    );
    const parsed = parseOptimizationResponse(content);
    writeAICache("optimizer", hashKey, parsed, "ai");
    return { value: parsed, source: "ai", hashKey };
  } catch {
    const det = deterministicOptimization(data);
    writeAICache("optimizer", hashKey, det, "deterministic");
    return { value: det, source: "deterministic", hashKey };
  }
}

function gapsKey(data: StudentDashboard): string {
  return data.gaps.map((g) => `${g.name}:${g.current}/${g.required}`).join(",");
}

/**
 * Call the AI to generate profile optimization recommendations.
 */
export async function optimizeProfile(
  data: StudentDashboard,
): Promise<ProfileOptimization> {
  const { value } = await optimizeProfileCached(data);
  return value;
}

/**
 * Parse the AI response into a typed optimization result.
 */
function parseOptimizationResponse(content: string): ProfileOptimization {
  try {
    let jsonStr = content;

    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1];

    const objMatch = jsonStr.match(/\{[\s\S]*"score"[\s\S]*"recommendations"[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    const parsed = JSON.parse(jsonStr);

    const recommendations: OptimizerRecommendation[] = (
      parsed.recommendations || []
    ).map((r: any, i: number) => ({
      id: String(r.id || `rec-${i + 1}`),
      priority: ["critical", "high", "medium", "low"].includes(r.priority)
        ? r.priority
        : "medium",
      category: ["skill", "profile", "opportunity", "learning", "portfolio"].includes(
        r.category,
      )
        ? r.category
        : "skill",
      title: String(r.title || "Recommendation"),
      description: String(r.description || ""),
      impact: String(r.impact || ""),
    }));

    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
      summary: String(parsed.summary || "Profile analysis complete."),
      topStrength: String(parsed.topStrength || "N/A"),
      biggestWeakness: String(parsed.biggestWeakness || "N/A"),
      careerNarrative: String(parsed.careerNarrative || ""),
      recommendations,
    };
  } catch {
    return {
      score: 50,
      summary: "Analysis could not be fully parsed. Please try again.",
      topStrength: "N/A",
      biggestWeakness: "N/A",
      careerNarrative: "Unable to generate career narrative from AI response.",
      recommendations: [],
    };
  }
}
