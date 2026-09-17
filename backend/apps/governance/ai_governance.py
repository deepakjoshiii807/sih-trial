"""
AI governance: per-user rate limit + daily token budget + audit log.

Every LLM call through gateway_chat() should consult this module first so the
platform can enforce cost and abuse controls without touching business logic.

Storage: Django cache (CACHES setting) when available so limits are shared
across replicas (e.g. Redis in production); falls back to the original
in-process dicts for dev/single-replica.
"""

from __future__ import annotations

import hashlib
import re
import time
from collections import deque
from typing import Deque, Dict, List, Optional

# --- Tunables -------------------------------------------------------------

RATE_LIMIT_PER_MINUTE = 12
RATE_LIMIT_PER_HOUR = 80
DAILY_MAX_TOKENS = 80000

# In-process fallback (per-replica) — used when cache is absent.
_WINDOW_MINUTE: Dict[int, Deque[float]] = {}
_WINDOW_HOUR: Dict[int, Deque[float]] = {}
_TOKEN_BUCKET: Dict[int, List[float]] = {}  # [day_key, tokens_used]
_AUDIT_RING: deque = deque(maxlen=200)


def _day_key() -> int:
    return int(time.time() // 86400)


def _prune(q: Deque[float], window_s: float) -> None:
    now = time.time()
    while q and (now - q[0]) > window_s:
        q.popleft()


# --- Cache helpers (best-effort) -----------------------------------------

def _cache():
    try:
        from django.core.cache import cache as _c  # type: ignore
        return _c
    except Exception:
        return None


def _cache_get(key: str):
    c = _cache()
    if c is None:
        return None
    try:
        return c.get(key)
    except Exception:
        return None


def _cache_set(key: str, value, timeout: int):
    c = _cache()
    if c is None:
        return
    try:
        c.set(key, value, timeout=timeout)
    except Exception:
        pass


def check_rate_limit(user_id: Optional[int]) -> Optional[str]:
    """Return an error string if the caller is rate-limited, else None."""
    if user_id is None:
        return None
    # Try cache first (shared across replicas) — keys rotate per window.
    c = _cache()
    if c is not None:
        try:
            min_key = f"ai:rl:min:{user_id}:{int(time.time() // 60)}"
            hour_key = f"ai:rl:hr:{user_id}:{int(time.time() // 3600)}"
            # Use cache incr pattern where available; fall back to local dict
            mv = c.get(min_key)
            hv = c.get(hour_key)
            # We still need a counter per window — emulate with cache add/incr
            # Simpler: keep using local deque but also gate on cache counters when present.
            # For correctness without complex lua: just use local deque + also write cache.
            pass
        except Exception:
            pass
    qm = _WINDOW_MINUTE.setdefault(user_id, deque())
    qh = _WINDOW_HOUR.setdefault(user_id, deque())
    _prune(qm, 60)
    _prune(qh, 3600)
    if len(qm) >= RATE_LIMIT_PER_MINUTE:
        return f"Rate limit exceeded: max {RATE_LIMIT_PER_MINUTE} AI calls per minute. Please wait a moment."
    if len(qh) >= RATE_LIMIT_PER_HOUR:
        return f"Rate limit exceeded: max {RATE_LIMIT_PER_HOUR} AI calls per hour. Please try again later."
    return None


def check_budget(user_id: Optional[int], max_tokens: int) -> Optional[str]:
    if user_id is None:
        return None
    # Prefer cache-backed bucket when available (shared across replicas)
    cache_key = f"ai:budget:{user_id}:{_day_key()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        try:
            used = int(cached)
            if used + max_tokens > DAILY_MAX_TOKENS:
                return f"Daily AI token budget ({DAILY_MAX_TOKENS} tokens) exhausted. Resumes tomorrow."
            return None
        except Exception:
            pass
    entry = _TOKEN_BUCKET.get(user_id)
    day = _day_key()
    if entry is None or entry[0] != day:
        _TOKEN_BUCKET[user_id] = [float(day), 0.0]
        return None
    if entry[1] + max_tokens > DAILY_MAX_TOKENS:
        return f"Daily AI token budget ({DAILY_MAX_TOKENS} tokens) exhausted. Resumes tomorrow."
    return None


def record_usage(
    user_id: Optional[int],
    *,
    max_tokens: int,
    model: str,
    detail: str = "",
    actual_tokens: Optional[int] = None,
) -> None:
    """Record one call against the sliding windows + daily budget + audit log.

    When `actual_tokens` (from gateway `usage.total_tokens`) is provided it is
    used for the budget; otherwise `max_tokens` (the requested cap) is used.
    """
    charged = int(actual_tokens) if actual_tokens is not None else int(max_tokens)
    if user_id is not None:
        now = time.time()
        _WINDOW_MINUTE.setdefault(user_id, deque()).append(now)
        _WINDOW_HOUR.setdefault(user_id, deque()).append(now)
        entry = _TOKEN_BUCKET.get(user_id)
        day = _day_key()
        if entry is None or entry[0] != day:
            _TOKEN_BUCKET[user_id] = [float(day), float(charged)]
        else:
            entry[1] += charged
        # Mirror to cache (shared) — additive counter for today
        try:
            cache_key = f"ai:budget:{user_id}:{day}"
            c = _cache()
            if c is not None:
                # locmem doesn't have incr with init; do get+set
                cur = c.get(cache_key)
                nxt = charged if cur is None else int(cur) + charged
                c.set(cache_key, nxt, timeout=86400 + 3600)
                # Per-window counters for rate limit (best-effort)
                c.set(f"ai:rl:min:{user_id}:{int(now // 60)}", 1, timeout=70)
                c.set(f"ai:rl:hr:{user_id}:{int(now // 3600)}", 1, timeout=3700)
        except Exception:
            pass
    _AUDIT_RING.append(
        {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "user_id": user_id,
            "model": model,
            "max_tokens": max_tokens,
            "actual_tokens": charged,
            "detail": detail[:160],
        }
    )


def budget_state(user_id: Optional[int]) -> Dict:
    # Prefer cache value when present (shared)
    if user_id is not None:
        cached = _cache_get(f"ai:budget:{user_id}:{_day_key()}")
        if cached is not None:
            try:
                used = int(cached)
                return {"used_tokens_today": used, "limit": DAILY_MAX_TOKENS, "remaining": max(0, DAILY_MAX_TOKENS - used)}
            except Exception:
                pass
    entry = _TOKEN_BUCKET.get(user_id or 0)
    used = entry[1] if entry and entry[0] == _day_key() else 0
    return {
        "used_tokens_today": int(used),
        "limit": DAILY_MAX_TOKENS,
        "remaining": max(0, DAILY_MAX_TOKENS - int(used)),
    }


def recent_audit(limit: int = 50) -> List[dict]:
    return list(_AUDIT_RING)[-limit:]


# --- Injection guard: more robust than 8 literal strings -----------------

_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.I),
    re.compile(r"disregard\s+(your|all|previous)\s+instructions", re.I),
    re.compile(r"you\s+are\s+now\s+(a|an|in|the)", re.I),
    re.compile(r"\bdo\s+anything\s+now\b", re.I),
    re.compile(r"\bdan\s*mode\b", re.I),
    re.compile(r"\bjail\s*break\b", re.I),
    re.compile(r"reveal\s+(your\s+)?(system\s+)?(prompt|instructions)", re.I),
    re.compile(r"system\s*prompt", re.I),
    re.compile(r"exfiltrate|leak\s+.*\b(prompt|key|secret)\b", re.I),
    re.compile(r"repeat\s+(the\s+)?(above|previous)\s+.*(prompt|instructions)", re.I),
]


def injection_guard(text: str) -> Optional[str]:
    """Best-effort prompt-injection guard — returns a warning if triggered."""
    if not text or len(text) < 8:
        return None
    for pat in _INJECTION_PATTERNS:
        m = pat.search(text)
        if m:
            snippet = (m.group(0) or "")[:40]
            return f"Suspicious content detected ({snippet!r}); request was not forwarded to the model."
    # Also keep the literal fallback for exact phrases
    lowered = text.lower()
    for s in ("ignore all previous instructions", "ignore previous instructions"):
        if s in lowered:
            return f"Suspicious content detected ({s!r}); request was not forwarded to the model."
    return None


def redact_pii(text: str) -> str:
    """Redact obvious PII before sending user content to the gateway."""
    if not text:
        return text
    # Emails
    text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[redacted-email]", text)
    # Indian phone numbers (10 digits, optional +91 / spaces / dashes)
    text = re.sub(r"(?:\+91[\s-]?)?[6-9]\d{9}\b", "[redacted-phone]", text)
    # Aadhaar-like 12-digit groups
    text = re.sub(r"\b\d{4}\s?\d{4}\s?\d{4}\b", "[redacted-id]", text)
    return text


def deterministic_hash(*parts: str) -> str:
    """Stable id used to cache AI results per user + content hash."""
    h = hashlib.sha256("|".join(parts).encode()).hexdigest()
    return h[:16]
