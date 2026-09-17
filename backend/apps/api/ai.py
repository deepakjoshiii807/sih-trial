"""
Server-side access to the VLY AI integration gateway.

Two surfaces live here:

1. AICompletionView — the authenticated proxy the React app calls. The VLY
   integration key (VLY_INTEGRATION_KEY) is never shipped to the browser (see
   /integrations.md); it is read from the server environment on every request.
   The proxy accepts the OpenAI-compatible chat-completion payload subset the
   app actually uses and returns the upstream body unchanged.

2. gateway_chat() / extract_skills() — small server-side helpers used by the
   evidence pipeline so "skills extracted from a document" is a real LLM call
   (with a deterministic fallback when the gateway is not configured).
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Dict, List, Optional

from apps.governance.ai_governance import (
    budget_state,
    check_budget,
    check_rate_limit,
    injection_guard,
    record_usage,
    redact_pii,
)
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

DEFAULT_GATEWAY_BASE = "https://integrations.vly.ai/v1/llm"
ALLOWED_ROLES = {"system", "user", "assistant"}
MAX_MESSAGES = 30
MAX_MESSAGE_CHARS = 20000
MAX_TOTAL_CHARS = 60000
MAX_OUTPUT_TOKENS = 4096
GATEWAY_TIMEOUT_SECONDS = 60


class AICompletionView(APIView):
    """POST /api/ai/completion - forward a chat completion to the VLY gateway."""

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        key = (os.environ.get("VLY_INTEGRATION_KEY") or "").strip()
        if not key:
            return Response(
                {
                    "detail": (
                        "AI is not configured on the server: "
                        "VLY_INTEGRATION_KEY is missing from the backend environment."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        body = request.data if isinstance(request.data, dict) else {}
        # Governance: abuse + cost controls — before any upstream call.
        user_id = getattr(getattr(request, "user", None), "id", None)
        if isinstance(body.get("messages"), list):
            for _m in body.get("messages", [])[:8]:
                if isinstance(_m, dict) and isinstance(_m.get("content"), str):
                    flag = injection_guard(_m["content"])
                    if flag:
                        return Response({"detail": flag}, status=status.HTTP_400_BAD_REQUEST)
        limited = check_rate_limit(user_id)
        if limited:
            return Response({"detail": limited}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        messages = self._clean_messages(body.get("messages"))
        if messages is None:
            return Response(
                {
                    "detail": (
                        "messages must be a list of {role, content} objects "
                        "with role in system|user|assistant."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not messages:
            return Response(
                {"detail": "At least one message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        model = body.get("model") or "gpt-4o-mini"
        if not isinstance(model, str) or not model.strip() or len(model) > 64:
            return Response(
                {"detail": "model must be a non-empty string."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            temperature = min(2.0, max(0.0, float(body.get("temperature", 0.7))))
        except (TypeError, ValueError):
            return Response(
                {"detail": "temperature must be a number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_tokens = body.get("max_tokens", body.get("maxTokens", 1024))
        try:
            max_tokens = max(1, min(int(raw_tokens), MAX_OUTPUT_TOKENS))
        except (TypeError, ValueError):
            return Response(
                {"detail": "max_tokens must be a number."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        budgeted = check_budget(user_id, max_tokens)
        if budgeted:
            return Response({"detail": budgeted}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        base_url = (
            os.environ.get("VLY_INTEGRATION_BASE_URL") or DEFAULT_GATEWAY_BASE
        ).rstrip("/")
        # Redact PII from user messages before forwarding to the gateway
        redacted_messages = []
        for m in messages:
            if m.get("role") == "user":
                redacted_messages.append({"role": m["role"], "content": redact_pii(m["content"])})
            else:
                redacted_messages.append(m)
        payload = {
            "model": model.strip(),
            "messages": redacted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        encoded = json.dumps(payload).encode("utf-8")
        gateway_request = urllib.request.Request(
            base_url + "/chat/completions",
            data=encoded,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {key}",
            },
        )

        try:
            with urllib.request.urlopen(
                gateway_request, timeout=GATEWAY_TIMEOUT_SECONDS
            ) as upstream:
                raw = upstream.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw)
                # Charge actual tokens when the gateway returns usage (fallback to cap)
                actual = None
                try:
                    usage = parsed.get("usage") or {}
                    actual = usage.get("total_tokens") or usage.get("completion_tokens")
                    if actual is not None:
                        actual = int(actual)
                except Exception:
                    actual = None
                record_usage(user_id, max_tokens=max_tokens, model=model.strip(), detail="ai/completion", actual_tokens=actual)
                # Surface remaining budget in a header so the UI can show it.
                try:
                    remaining = budget_state(user_id)["remaining"]
                except Exception:
                    remaining = None
                headers = {"X-AI-Budget-Remaining": str(remaining)} if remaining is not None else {}
                return Response(parsed, headers=headers)
            except ValueError:
                return Response(
                    {"detail": "AI gateway returned an invalid response."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
        except urllib.error.HTTPError as exc:
            detail = ""
            try:
                detail = exc.read().decode("utf-8", errors="replace")[:300]
            except Exception:  # noqa: BLE001 - best effort detail
                pass
            return Response(
                {"detail": detail or f"AI gateway error ({exc.code})."},
                status=exc.code,
            )
        except urllib.error.URLError as exc:
            return Response(
                {"detail": f"AI gateway unreachable: {exc.reason}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except OSError as exc:
            return Response(
                {"detail": f"AI gateway request failed: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @staticmethod
    def _clean_messages(raw):
        """Validate/trim messages; returns list, [] for empty, or None on bad shape."""
        if not isinstance(raw, list):
            return None
        cleaned = []
        total_chars = 0
        for message in raw[:MAX_MESSAGES]:
            if not isinstance(message, dict):
                return None
            role = message.get("role")
            content = message.get("content")
            if role not in ALLOWED_ROLES or not isinstance(content, str):
                return None
            content = content[:MAX_MESSAGE_CHARS].strip()
            if not content:
                return None
            total_chars += len(content)
            if total_chars > MAX_TOTAL_CHARS:
                return None
            cleaned.append({"role": role, "content": content})
        return cleaned

    @staticmethod
    def _redact_messages(messages):
        from apps.governance.ai_governance import redact_pii as _redact
        out = []
        for m in messages:
            if m.get("role") == "user":
                out.append({"role": m["role"], "content": _redact(m["content"])})
            else:
                out.append(m)
        return out


class AIGatewayUnavailable(Exception):
    """The LLM gateway is not configured or could not be reached."""


def gateway_chat(
    messages: List[dict],
    *,
    model: str = "gpt-4o-mini",
    temperature: float = 0.2,
    max_tokens: int = 1200,
    user_id: Optional[int] = None,
) -> Dict:
    """
    Raw chat completion against the VLY gateway (OpenAI-compatible).

    Raises AIGatewayUnavailable when the key is missing, the gateway is
    unreachable, or the response cannot be parsed. Callers that can degrade
    (e.g. the evidence pipeline) should catch it and fall back.
    """
    # Governance at the helper layer too — keeps the evidence pipeline from
    # silently hammering the gateway when a batch save retries.
    limited = check_rate_limit(user_id)
    if limited:
        raise AIGatewayUnavailable(limited)
    budgeted = check_budget(user_id, max_tokens)
    if budgeted:
        raise AIGatewayUnavailable(budgeted)
    # Light injection guard on the user content only (system prompt is trusted).
    for _m in messages:
        if _m.get("role") == "user" and isinstance(_m.get("content"), str):
            flag = injection_guard(_m["content"])
            if flag:
                raise AIGatewayUnavailable(flag)

    key = (os.environ.get("VLY_INTEGRATION_KEY") or "").strip()
    if not key:
        raise AIGatewayUnavailable(
            "VLY_INTEGRATION_KEY is missing from the backend environment."
        )

    # Redact PII from user content at the helper layer too
    safe_messages = []
    for _m in messages:
        if _m.get("role") == "user" and isinstance(_m.get("content"), str):
            safe_messages.append({"role": _m["role"], "content": redact_pii(_m["content"])})
        else:
            safe_messages.append(_m)
    payload = {
        "model": model,
        "messages": safe_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    base_url = (
        os.environ.get("VLY_INTEGRATION_BASE_URL") or DEFAULT_GATEWAY_BASE
    ).rstrip("/")
    encoded = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        base_url + "/chat/completions",
        data=encoded,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=GATEWAY_TIMEOUT_SECONDS) as upstream:
            raw = upstream.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        raise AIGatewayUnavailable(f"AI gateway error ({exc.code}).") from exc
    except urllib.error.URLError as exc:
        raise AIGatewayUnavailable(f"AI gateway unreachable: {exc.reason}") from exc
    except OSError as exc:
        raise AIGatewayUnavailable(f"AI gateway request failed: {exc}") from exc
    try:
        parsed = json.loads(raw)
        actual = None
        try:
            usage = parsed.get("usage") or {}
            actual = usage.get("total_tokens") or usage.get("completion_tokens")
            if actual is not None:
                actual = int(actual)
        except Exception:
            actual = None
        record_usage(user_id, max_tokens=max_tokens, model=model, detail="gateway_chat", actual_tokens=actual)
        return parsed
    except ValueError as exc:
        raise AIGatewayUnavailable("AI gateway returned an invalid response.") from exc


def _extract_json_object(content: str) -> Optional[dict]:
    """Best-effort extraction of the JSON object inside an LLM response."""
    text = (content or "").strip()
    if not text:
        return None
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    if start == -1:
        return None
    end_positions = [i for i in range(len(text) - 1, start, -1) if text[i] == "}"]
    for end in end_positions:
        try:
            parsed = json.loads(text[start : end + 1])
            if isinstance(parsed, dict):
                return parsed
        except ValueError:
            continue
    return None


EXTRACT_SYSTEM_PROMPT = (
    "You are an expert skill extraction engine for the Learn2Lead AYUSH "
    "(Ayurveda, Yoga, Unani, Siddha, Homeopathy) academia-industry platform. "
    "Given a document's text, extract the professional skills, competencies, "
    "certifications and abilities it evidences. For each skill return a name "
    "using standard terminology (e.g. 'Statistical Analysis', not 'stats'), a "
    "0-100 confidence score based on how clearly the document supports it, and "
    "a short supporting quote or paraphrase. Respond ONLY with valid JSON in "
    "this exact shape and nothing else: "
    '{"summary": "1-2 sentences describing the document", "skills": '
    '[{"name": "Skill", "confidence": 80, "evidence": "short quote"}]}. '
    "If the text contains no extractable skills return {\"summary\": \"\", \"skills\": []}."
)


def extract_skills(document_text: str, document_name: str = "", *, user_id: Optional[int] = None) -> Optional[dict]:
    """
    Server-side LLM skill extraction for the evidence pipeline.

    Returns {"summary": str, "skills": [{name, confidence, evidence, category}]}
    or None when the gateway is unavailable / the model output is unusable —
    callers then fall back to their deterministic logic.
    """
    text = (document_text or "").strip()
    if len(text) < 30:
        return None
    label = f" ({document_name})" if document_name else ""
    user_prompt = (
        f"Extract skills from this document{label}:\n\n"
        f"---\n{text[:12000]}\n---"
    )
    try:
        data = gateway_chat(
            [
                {"role": "system", "content": EXTRACT_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=1500,
            user_id=user_id,
        )
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        if not content or not isinstance(content, str):
            return None
    except (AIGatewayUnavailable, IndexError, KeyError, TypeError, AttributeError):
        return None

    parsed = _extract_json_object(content)
    if not parsed:
        return None

    raw_skills = parsed.get("skills")
    if not isinstance(raw_skills, list):
        raw_skills = []
    skills = []
    for raw in raw_skills[:40]:
        if not isinstance(raw, dict):
            continue
        name = str(raw.get("name") or "").strip()
        if not name or len(name) > 160:
            continue
        try:
            confidence = int(raw.get("confidence") or 70)
        except (TypeError, ValueError):
            confidence = 70
        skills.append(
            {
                "name": name,
                "confidence": max(0, min(100, confidence)),
                "evidence": str(raw.get("evidence") or "").strip()[:500],
                "category": str(raw.get("category") or "Domain").strip()[:40],
            }
        )
    if not skills:
        return None
    return {
        "summary": str(parsed.get("summary") or "").strip()[:500],
        "skills": skills,
    }
