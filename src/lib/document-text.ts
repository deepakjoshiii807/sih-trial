/**
 * Real in-browser document text extraction.
 *
 * PDF  → pdfjs-dist (proper text layer parsing, works for most text-based PDFs)
 * DOCX → unzip via fflate + parse word/document.xml
 * TXT/MD/CSV/JSON/HTML/RTF/log/code → read as text directly
 * DOC/.doc legacy → honest message (legacy binary format)
 *
 * Everything degrades gracefully: any failure returns an *honest* placeholder
 * describing what happened, never binary garbage and never a fake success.
 */
// Vite resolves this to the bundled worker URL at build time without loading it.
// The worker file is only fetched when pdf.js actually starts a parse.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export interface DocumentTextResult {
  /** Extracted readable text ("" when nothing could be read) */
  text: string;
  /** How the text was obtained — surfaced in the UI for transparency */
  method: "pdfjs" | "docx" | "plaintext" | "none";
  /** Human-readable note when extraction was partial or failed */
  note?: string;
}

/** Read a plain-text-ish file via FileReader, resolving "" on failure. */
function readAsPlaintext(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => resolve("");
    try {
      reader.readAsText(file);
    } catch {
      resolve("");
    }
  });
}

/** Extract text from a PDF using pdfjs-dist. Returns "" on any failure. */
async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist");
    // Point pdf.js at the bundled worker (resolved at build time by Vite).
    // If the worker still fails to start, pdf.js falls back to a fake worker
    // on the main thread — slower but functional.
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const pages: string[] = [];
    const maxPages = Math.min(doc.numPages, 15); // resumes are short; cap for safety
    for (let p = 1; p <= maxPages; p++) {
      try {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        // Group items into lines by vertical position so words don't merge
        let lastY: number | null = null;
        let line = "";
        const lines: string[] = [];
        for (const item of content.items as Array<{
          str?: string;
          transform?: number[];
        }>) {
          const s = (item.str || "").trim();
          if (!s) continue;
          const y = item.transform ? Math.round(item.transform[5]) : null;
          if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
            lines.push(line.trim());
            line = s;
          } else {
            line += (line ? " " : "") + s;
          }
          if (y !== null) lastY = y;
        }
        if (line.trim()) lines.push(line.trim());
        pages.push(lines.join("\n"));
      } catch {
        /* skip unreadable page */
      }
    }
    try {
      doc.destroy();
    } catch {
      /* ignore */
    }
    return pages.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return "";
  }
}

/** Extract text from a DOCX by unzipping word/document.xml with fflate. */
async function extractDocxText(file: File): Promise<string> {
  try {
    const { unzipSync, strFromU8 } = await import("fflate");
    const buf = new Uint8Array(await file.arrayBuffer());
    const files = unzipSync(buf, {
      filter: (f) => f.name === "word/document.xml",
    });
    const xmlBytes = files["word/document.xml"];
    if (!xmlBytes) return "";
    const xml = strFromU8(xmlBytes);
    // Paragraphs
    const paras = xml
      .split(/<\/w:p>/)
      .map((p) =>
        p
          // tab / break markers → space
          .replace(/<w:(tab|br|cr)\b[^>]*\/>/g, " ")
          // collect all text runs
          .replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g, "$1")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean);
    return paras.join("\n").trim();
  } catch {
    return "";
  }
}

/** Remove PDF ligature/control artefacts and normalise whitespace. */
function cleanExtractedText(t: string): string {
  return t
    .replace(/\u0000/g, "")
    // pdf.js sometimes yields ligatures / private-use glyphs
    .replace(/[\uFB00-\uFB04]/g, (m) => ({ "\uFB00": "ff", "\uFB01": "fi", "\uFB02": "fl", "\uFB03": "ffi", "\uFB04": "ffl" }[m as "ﬀ"] ?? m))
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Main entry: read any supported file and return its readable text.
 * NEVER throws — always returns an honest result.
 */
export async function extractDocumentText(file: File): Promise<DocumentTextResult> {
  const ext = ("." + (file.name.split(".").pop() || "")).toLowerCase();

  // 1. PDFs → real parsing via pdf.js
  if (ext === ".pdf" || file.type === "application/pdf") {
    const text = cleanExtractedText(await extractPdfText(file));
    if (text.length >= 20) {
      return { text, method: "pdfjs" };
    }
    // Scanned/image-only PDF — pdf.js finds no text layer
    return {
      text: "",
      method: "none",
      note: `This PDF appears to be scanned or image-based — no selectable text layer was found. Export it as a text-based PDF or paste the content below for extraction.`,
    };
  }

  // 2. DOCX → unzip + XML parse
  if (
    ext === ".docx" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const text = cleanExtractedText(await extractDocxText(file));
    if (text.length >= 20) {
      return { text, method: "docx" };
    }
    return {
      text: "",
      method: "none",
      note: `Could not read text from this .docx (it may be empty or use an unusual structure). Paste the content below for extraction.`,
    };
  }

  // 3. Legacy .doc → honest message (binary OLE format, needs server-side tooling)
  if (ext === ".doc" || file.type === "application/msword") {
    return {
      text: "",
      method: "none",
      note: `Legacy .doc files can't be parsed in the browser. Save as .docx or .txt and re-upload — or paste the content below.`,
    };
  }

  // 4. Images → honest message (no OCR in browser)
  if (/\.(png|jpe?g|gif|webp|bmp|tiff?)$/.test(ext) || file.type.startsWith("image/")) {
    return {
      text: "",
      method: "none",
      note: `Images can't be text-extracted in the browser (no OCR). Upload a text-based PDF/DOCX or paste the content below.`,
    };
  }

  // 5. Everything else → try as plaintext (txt, md, csv, json, html, rtf, code…)
  const text = cleanExtractedText(await readAsPlaintext(file));
  if (text.length >= 20) {
    return { text, method: "plaintext" };
  }
  return {
    text: "",
    method: "none",
    note: `Could not read readable text from "${file.name}". Paste the content below for extraction.`,
  };
}
