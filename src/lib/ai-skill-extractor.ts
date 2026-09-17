/**
 * AI-powered skill extraction from uploaded documents.
 *
 * Analyzes document text with an LLM to extract professional skills,
 * certifications, and competencies. Model calls go through the server-side
 * proxy (backend/apps/api/ai.py) so the VLY integration key never reaches
 * the browser. When the gateway is unreachable, we fall back to a
 * deterministic matcher over the Learn2Lead skill taxonomy + a section-aware
 * harvester that reads the skills actually *listed* in the document, so every
 * distinct document yields distinct results.
 */
import { aiCompletion } from "./ai-server";
import { SKILL_TAXONOMY } from "./skill-taxonomy";
import { extractDocumentText, type DocumentTextResult } from "./document-text";

export interface ExtractedSkill {
  name: string;
  category: string;
  confidence: number;
  evidence: string;
}

export interface ExtractionResult {
  skills: ExtractedSkill[];
  summary: string;
  rawResponse?: string;
  /** Where the result came from — shown as a badge in the modal */
  source?: "ai" | "deterministic";
}

const SYSTEM_PROMPT = `You are an expert skill extraction assistant for the Learn2Lead academia-industry platform focused on AYUSH (Ayurveda, Yoga, Unani, Siddha, Homeopathy) education.

Given a document (certificate, transcript, resume, project description, internship letter, etc.), extract all professional skills, competencies, certifications, and abilities mentioned or implied.

For each skill, provide:
- name: The skill name (use standard terminology, e.g., "Statistical Analysis" not "stats")
- category: One of: Technical, Research, Clinical, Administrative, Communication, Leadership, Software, Domain-Specific
- confidence: 0-100 score indicating how clearly the skill is evidenced by the document
- evidence: A short quote or paraphrase from the document that supports this skill

Return a JSON array of skills. If the document is not readable or contains no skills, return an empty array.

Focus on skills relevant to AYUSH education and healthcare, including but not limited to:
- Clinical skills (Panchakarma, Nadi Pariksha, etc.)
- Research methodology
- Data analysis and statistics
- Scientific writing
- Pharmacology and toxicology
- Modern tools (Python, R, SPSS, etc.)
- Soft skills demonstrated through activities

Also return a brief summary (1-2 sentences) of what the document appears to be.`;

// --- Deterministic dataset fallback (no AI / no backend) ------------------

function mapTaxonomyCategory(cat: string): string {
  const m: Record<string, string> = {
    Technical: "Technical",
    Domain: "Domain-Specific",
    Research: "Research",
    Communication: "Communication",
    Management: "Leadership",
  };
  return m[cat] ?? "Technical";
}

function snippetAround(text: string, idx: number, len: number): string {
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, idx + len + 50);
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 140);
}

/** True if a snippet looks like human-readable text, not binary garbage. */
function isReadableSnippet(s: string): boolean {
  const t = (s || "").trim();
  if (t.length < 12) return false;
  const safe = (t.match(/[A-Za-z0-9 .,;:\-_'\"()\[\]%\/]/g) || []).length;
  if (safe / t.length < 0.82) return false;
  if (/[\|\*\\~`]{3,}/.test(t)) return false;
  if (/[|]{2,}/.test(t) && (t.match(/\|/g) || []).length > 4) return false;
  const words = t.split(/\s+/).filter((w) => /^[A-Za-z]{3,}$/.test(w.replace(/[^A-Za-z]/g, "")));
  if (words.length < 2) return false;
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(t)) return false;
  return true;
}

function cleanEvidence(rawSnippet: string, fallback: string): string {
  if (isReadableSnippet(rawSnippet)) return rawSnippet;
  return fallback;
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length > 2 && w === w.toUpperCase() && /^[A-Z0-9+#.&-]+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .trim();
}

/** Guess a category for a free-form skill item harvested from the document. */
function guessCategory(item: string): string {
  const l = item.toLowerCase();
  const rules: [RegExp, string][] = [
    [/python|java(?!script)|javascript|typescript|c\+\+|sql|nosql|excel|tableau|power ?bi|docker|kubernetes|aws|azure|gcp|react|node|git|github|matlab|spss|html|css|linux|mongodb|software|programming|coding|mysql|postgres/, "Technical"],
    [/machine learning|deep learning|ai\b|data scien|neural|analytics/, "Technical"],
    [/research|publication|thesis|dissertation|methodolog|literature/, "Research"],
    [/clinical|patient|ayurved|panchakarma|nadi|medic|therap|diagnos|pharmac|yoga|asana|pranayam|health|wellness|herb/, "Domain-Specific"],
    [/writ|communicat|present|document|report|public speak/, "Communication"],
    [/lead|team|manag|coordinat|mentor|organiz|supervis/, "Leadership"],
  ];
  for (const [re, cat] of rules) if (re.test(l)) return cat;
  return "Domain-Specific";
}

const SECTION_HEADING_RE =
  /^(?:key\s+|core\s+|technical\s+|professional\s+|other\s+|relevant\s+)?(?:skills?|competencies|areas? of expertise|proficiencies|certifications?|licenses?|tools\s*(?:&|and)\s*(?:technologies|software)|technical proficiencies|languages(?:\s*known)?)\s*[:\-–—]?\s*$/i;

const SECTION_HEADING_INLINE_RE =
  /^((?:key\s+|core\s+|technical\s+|professional\s+|other\s+|relevant\s+)?(?:skills?|competencies|areas? of expertise|proficiencies|certifications?|licenses?|tools\s*(?:&|and)\s*(?:technologies|software)|technical proficiencies|languages(?:\s*known)?))\s*[:\-–—]\s*(.+)$/i;

const SECTION_END_RE =
  /^(experience|work experience|professional experience|employment|education|academic|projects?|achievements|publications|awards|extracurricular|declaration|references|objective|career objective|summary|profile)\b/i;

/**
 * Harvest skills actually *listed* in the document (e.g. a resume's
 * "Technical Skills: Python, SQL, …" section). Handles both heading-alone
 * and inline "Skills: a, b, c" forms so every distinct resume yields
 * distinct results instead of the same generic Documentation card.
 */
function harvestListedSkills(text: string): { name: string; evidence: string }[] {
  const lines = text.split(/\n+/);
  const out: { name: string; evidence: string }[] = [];
  const seen = new Set<string>();
  let collecting: string | null = null;

  const pushItems = (raw: string, heading: string) => {
    const items = raw
      .split(/[,•|;·\/]+|\s{2,}/)
      .map((s) => s.replace(/^[-–—*\s]+/, "").replace(/[:\s]+$/, "").trim())
      .filter((s) => s.length >= 2 && s.length <= 40 && /^[A-Za-z][A-Za-z0-9 +#/.&'()-]*$/.test(s));
    for (const it of items) {
      const key = it.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: titleCase(it), evidence: `Listed under "${heading}" in the document` });
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;

    const inline = line.match(SECTION_HEADING_INLINE_RE);
    if (inline) {
      const heading = (inline[1] || "Skills").trim();
      const content = (inline[2] || "").trim();
      collecting = heading;
      if (content) pushItems(content, heading);
      continue;
    }

    const heading = line.match(SECTION_HEADING_RE);
    if (heading) {
      const cap = (heading as unknown as string[])[0]?.trim() || "Skills";
      collecting = cap.replace(/[:\-–—]\s*$/, "").trim() || "Skills";
      continue;
    }
    if (!collecting) continue;
    if (SECTION_END_RE.test(line.toLowerCase()) || (line.length > 90 && !/[,•|;\/]/.test(line))) {
      collecting = null;
      continue;
    }
    pushItems(line, collecting);
  }
  return out.slice(0, 12);
}

function deterministicExtract(
  documentText: string,
  documentName: string,
  emptyNote?: string,
): ExtractionResult {
  const text = (documentText || "").trim();
  const nameText = (documentName || "").trim();

  // Honest empty state: no readable text → no fake skills.
  if (text.replace(/\s+/g, "").length < 20) {
    return {
      skills: [],
      summary:
        emptyNote ||
        `No readable text was found in "${nameText || "the document"}". Paste the document text below for extraction.`,
      source: "deterministic",
    };
  }

  const searchText = text + " " + nameText;
  const lower = searchText.toLowerCase();
  const skills: ExtractedSkill[] = [];
  const seen = new Set<string>();

  // 1) Taxonomy matching (name hit = strongest, then keyword aliases)
  for (const tax of SKILL_TAXONOMY) {
    const nameLower = tax.name.toLowerCase();
    let matched = false;
    let conf = 0;
    let evidence = "";

    const nameIdx = lower.indexOf(nameLower);
    if (nameIdx !== -1) {
      matched = true;
      conf = 90;
      if (nameIdx < text.length) {
        const raw = snippetAround(text, nameIdx, tax.name.length);
        evidence = cleanEvidence(raw, `Found "${tax.name}" in document`);
      } else {
        evidence = `Found "${tax.name}" in file name "${nameText}"`;
      }
    } else {
      for (const kwRaw of tax.keywords) {
        const kw = kwRaw.toLowerCase().trim();
        if (!kw) continue;
        let found = false;
        let idx = -1;
        let fromFilename = false;
        if (kw.length <= 3) {
          const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
          const m = re.exec(text);
          if (m) {
            found = true;
            idx = m.index;
          }
        } else {
          idx = lower.indexOf(kw);
          found = idx !== -1;
          fromFilename = found && idx >= text.length;
        }
        if (found) {
          matched = true;
          conf = 72;
          if (idx !== -1 && !fromFilename) {
            const raw = snippetAround(text, idx, kw.length);
            evidence = cleanEvidence(raw, `Mentions "${kwRaw}" — relevant to ${tax.name}`);
          } else if (fromFilename) {
            evidence = `Mentions "${kwRaw}" in file name — relevant to ${tax.name}`;
          } else {
            evidence = `Mentions "${kwRaw}" — relevant to ${tax.name}`;
          }
          break;
        }
      }
    }

    if (matched && !seen.has(nameLower)) {
      seen.add(nameLower);
      skills.push({
        name: tax.name,
        category: mapTaxonomyCategory(tax.category),
        confidence: conf,
        evidence: evidence || "Found in document",
      });
    }
  }

  // 2) Skills explicitly listed in the document (Skills/Certifications sections)
  for (const item of harvestListedSkills(text)) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push({
      name: item.name,
      category: guessCategory(item.name),
      confidence: 75,
      evidence: item.evidence,
    });
  }

  // 3) Document-type signals — only when the wording is actually present
  if (skills.length === 0) {
    const genericCandidates: { re: RegExp; name: string; cat: string; ev: string }[] = [
      { re: /certificate|certification|certified|has completed|successfully completed/i, name: "Documentation", cat: "Communication", ev: "Certificate language found in document" },
      { re: /transcript|marksheet|grade|report\s*card/i, name: "Documentation", cat: "Communication", ev: "Academic transcript/report detected" },
      { re: /internship|training|dissertation|capstone|major project|mini project/i, name: "Research", cat: "Research", ev: "Project/internship evidence in document" },
      { re: /workshop|seminar|conference|fdp|symposium| attended/i, name: "Research", cat: "Research", ev: "Workshop/seminar participation" },
      { re: /ayurved|panchakarma|nadi\s*pariksha|herbal|kayachikitsa|dravyaguna/i, name: "Ayurvedic Therapeutics", cat: "Domain", ev: "AYUSH content detected" },
      { re: /clinical|patient|ward|opd|case\s*(sheet|report|study)|posting/i, name: "Patient Assessment", cat: "Domain", ev: "Clinical context in document" },
    ];
    for (const g of genericCandidates) {
      if (g.re.test(searchText)) {
        skills.push({ name: g.name, category: mapTaxonomyCategory(g.cat), confidence: 62, evidence: g.ev });
        if (skills.length >= 2) break;
      }
    }
  }

  // Cap + sort so the strongest evidence shows first
  skills.sort((a, b) => b.confidence - a.confidence);
  const capped = skills.slice(0, 15);

  const summary =
    capped.length === 0
      ? `Read "${nameText || "the document"}" but found no recognizable skills. Paste the text below for a manual re-extract.`
      : capped.length === 1
        ? `Detected 1 skill from "${nameText || "the document"}": ${capped[0].name}.`
        : `Detected ${capped.length} skills from "${nameText || "the document"}": ${capped.slice(0, 4).map((s) => s.name).join(", ")}${capped.length > 4 ? "…" : ""}.`;

  return { skills: capped, summary, source: "deterministic" };
}

/**
 * Read a file's text (kept for backwards compatibility). For PDFs/DOCX this
 * now performs REAL in-browser parsing (pdf.js / DOCX unzip) instead of a
 * placeholder.
 */
export async function readFileAsText(file: File): Promise<string> {
  const res = await extractDocumentText(file);
  if (res.text) return res.text;
  return res.note || `[Could not read text from "${file.name}"]`;
}

/**
 * Send document text to the AI model and extract skills.
 * Falls back to the deterministic taxonomy + section harvester when the AI
 * gateway is unreachable — so the feature works even without a backend.
 */
export async function extractSkillsFromText(
  documentText: string,
  documentName: string,
  emptyNote?: string,
): Promise<ExtractionResult> {
  const hasText = (documentText || "").trim().replace(/\s+/g, "").length >= 30;

  if (hasText) {
    const userPrompt = `Extract skills from this document:

Document: ${documentName}
---
${documentText.slice(0, 8000)}
---

Return your response as valid JSON with this exact structure:
{
  "skills": [
    {
      "name": "Skill Name",
      "category": "Technical|Research|Clinical|Administrative|Communication|Leadership|Software|Domain-Specific",
      "confidence": 85,
      "evidence": "Quote or paraphrase from document"
    }
  ],
  "summary": "Brief description of what this document is"
}`;

    try {
      const content = await aiCompletion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        maxTokens: 2000,
      });
      const parsed = parseExtractionResponse(content);
      // If the AI returned nothing usable, fall through to deterministic
      if (parsed.skills.length > 0) return { ...parsed, source: "ai" as const };
      const fallback = deterministicExtract(documentText, documentName, emptyNote);
      return {
        ...fallback,
        rawResponse: `AI returned no usable skills${parsed.rawResponse ? ` (raw: ${parsed.rawResponse.slice(0, 200)})` : ""} — showing deterministic match from the document text.`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "AI unavailable";
      const fallback = deterministicExtract(documentText, documentName, emptyNote);
      return {
        ...fallback,
        rawResponse: `AI gateway unavailable (${msg}) — matched the document text against the local Learn2Lead skill taxonomy instead.`,
      };
    }
  }

  // No readable text at all (e.g. scanned PDF) — honest empty state
  const fallback = deterministicExtract(documentText, documentName, emptyNote);
  return {
    ...fallback,
    rawResponse: emptyNote
      ? `Text extraction: ${emptyNote}`
      : `No readable text could be extracted from "${documentName}".`,
  };
}

/**
 * Parse the AI response text into structured skill data.
 */
function parseExtractionResponse(content: string): ExtractionResult {
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    const objectMatch = jsonStr.match(/\{[\s\S]*"skills"[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
    const parsed = JSON.parse(jsonStr);
    const skills: ExtractedSkill[] = (parsed.skills || []).map(
      (s: any) => ({
        name: String(s.name || "Unknown Skill"),
        category: String(s.category || "Technical"),
        confidence: Math.min(100, Math.max(0, Number(s.confidence) || 50)),
        evidence: String(s.evidence || ""),
      }),
    );
    return {
      skills,
      summary: String(parsed.summary || "Document processed for skill extraction."),
      rawResponse: content,
    };
  } catch {
    return {
      skills: [],
      summary: "Could not parse AI response into structured skills. The AI response may need manual review.",
      rawResponse: content,
    };
  }
}

/**
 * Read a file and extract skills in one call.
 * 1. Real text extraction (pdf.js for PDFs, unzip for DOCX, plaintext else)
 * 2. AI gateway when available
 * 3. Deterministic taxonomy + section harvester offline
 * NEVER throws — the modal always gets a reviewable result.
 */
export async function extractSkillsFromFile(
  file: File,
): Promise<ExtractionResult> {
  let docText: DocumentTextResult;
  try {
    docText = await extractDocumentText(file);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    docText = {
      text: "",
      method: "none",
      note: `Could not read "${file.name}" (${msg}). Paste the document text below for extraction.`,
    };
  }
  return extractSkillsFromText(docText.text, file.name, docText.note);
}

/** Export for testing / direct use */
export { deterministicExtract };
