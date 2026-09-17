"""
Evidence document file helpers.

The browser can only read text files reliably, so the student app sends
`documentText` alongside metadata. When a user also sends a binary file
(`evidenceFile` multipart), this module pulls text from it server-side — PDF
via pypdf/PyPDF2 and DOCX via python-docx — and returns the extracted text so
the LLM pipeline sees the real document, not just the filename.

No hard dependency on OCR: image-only PDFs/DOCXs that yield no text fall back
to a safe placeholder that the caller treats as "no LLM-extractable text".
"""

from __future__ import annotations

import io
import re
from typing import Optional, Tuple


def _pdf_text_from_bytes(raw: bytes) -> Optional[str]:
    """Try to extract text from a PDF; return None on any failure."""
    for mod in ("pypdf", "PyPDF2"):
        try:
            import importlib

            pdf_mod = importlib.import_module(mod)
            reader = pdf_mod.PdfReader(io.BytesIO(raw))
            parts = []
            for page in getattr(reader, "pages", [])[:30]:
                try:
                    t = page.extract_text() or ""
                except Exception:
                    t = ""
                if t.strip():
                    parts.append(t)
            text = "\n\n".join(parts).strip()
            if len(text) >= 40:
                return text
            # Reader succeeded but yielded no useful text (scanned image etc.).
            return None
        except ImportError:
            continue
        except Exception:
            return None
    return None


def _docx_text_from_bytes(raw: bytes) -> Optional[str]:
    """Extract text from a .docx file via python-docx; None on failure."""
    try:
        import importlib

        docx_mod = importlib.import_module("docx")
        doc = docx_mod.Document(io.BytesIO(raw))
        # Paragraphs + tables (so transcripts exported from Word aren't empty).
        parts: list[str] = []
        for para in getattr(doc, "paragraphs", []):
            t = (para.text or "").strip()
            if t:
                parts.append(t)
        for table in getattr(doc, "tables", []):
            for row in getattr(table, "rows", []):
                for cell in getattr(row, "cells", []):
                    t = (cell.text or "").strip()
                    if t:
                        parts.append(t)
        text = "\n".join(parts).strip()
        if len(text) >= 20:
            return text
        return None
    except ImportError:
        return None
    except Exception:
        return None


def extract_text_from_upload(
    filename: str, content_type: str, raw: bytes
) -> Tuple[Optional[str], str]:
    """
    Return (extracted_text, note).
    * extracted_text  is the text to feed the LLM pipeline, or None.
    * note            is a short human description (used for the EvidenceItem
                      description / fallback).
    """
    if not raw:
        return None, ""
    name_lc = (filename or "").lower()
    ctype = (content_type or "").lower()

    # Plain text family — decode directly.
    text_exts = (
        ".txt",
        ".md",
        ".csv",
        ".json",
        ".xml",
        ".html",
        ".rtf",
        ".log",
        ".py",
        ".js",
        ".ts",
    )
    if name_lc.endswith(text_exts) or ctype.startswith("text/"):
        for enc in ("utf-8", "utf-8-sig", "latin-1"):
            try:
                decoded = raw.decode(enc)
                decoded = decoded.replace("\x00", "")
                if decoded.strip():
                    return decoded[:20000], decoded[:500]
                return None, decoded[:500]
            except Exception:
                continue
        return None, raw[:500].decode(errors="replace")

    # PDF — try real extraction; keep the bytes count in the note.
    if name_lc.endswith(".pdf") or "pdf" in ctype:
        text = _pdf_text_from_bytes(raw)
        kb = len(raw) / 1024
        note = f"PDF {filename} ({kb:.1f} KB); server-side text extraction {'succeeded' if text else 'yielded no text — likely a scanned image; export or OCR the document to enable AI analysis'}. "
        if text:
            return text[:20000], text[:500]
        return None, note

    # DOCX — real extraction via python-docx when available.
    if name_lc.endswith(".docx") or "officedocument" in ctype or name_lc.endswith(".doc"):
        text = _docx_text_from_bytes(raw) if name_lc.endswith(".docx") or "officedocument" in ctype else None
        kb = len(raw) / 1024
        if text:
            return text[:20000], text[:500]
        # .doc (old binary) can't be read without antiword/mammoth; be honest.
        if name_lc.endswith(".doc") and not name_lc.endswith(".docx"):
            return None, f"Word document {filename} ({kb:.1f} KB); .doc (legacy) extraction not supported — save as .docx or .pdf with selectable text and re-upload."
        return None, f"Word document {filename} ({kb:.1f} KB); server-side DOCX text extraction {'succeeded' if text else 'yielded no text — the document may be empty or image-only; export as text to enable AI analysis'}."

    if name_lc.endswith((".png", ".jpg", ".jpeg")) or ctype.startswith("image/"):
        return None, f"Image {filename}; OCR is not configured on this host — upload a text/PDF export of the document to enable AI analysis."

    # Generic binary
    return None, f"File {filename} ({ctype or 'binary'})"


_DOC_TITLE_RE = re.compile(r"^(.+?)\s*[·\-\|]\s*(.+)$")


def normalise_document_text(
    document_text: Optional[str],
    title: str,
    description: str,
    issuer: str,
    uploaded_text: Optional[str],
) -> str:
    """
    Merge all available text sources into one document text for the LLM.
    Precedence: uploaded file text > client-sent documentText > title+description+issuer.
    """
    candidates = []
    for cand in (uploaded_text, document_text):
        if cand and isinstance(cand, str) and cand.strip():
            s = cand.strip()
            if len(s) >= 20:
                return s
            candidates.append(s)
    fallback = " ".join(p for p in (title, description, issuer) if p)
    return fallback.strip() or " ".join(candidates).strip()
