"""
Deterministic integrity rules for the institution review queue.

The Evidence Audit UI describes a "rule engine" that flags suspicious student
evidence before the AI does a second-pass review. This module is that engine:
plain, explainable checks run against DB rows (no ML), so every AnomalyFlag the
AI later reviews has a concrete reason for existing.

Rules currently implemented:
  1. Duplicate Record    — the same (kind, title, issuer) evidence row appears twice.
  2. Unusual Pattern     — a burst of evidence rows (>= BURST_LIMIT) inside BURST_WINDOW.
  3. Statistical Outlier — a claim count well above the average of peers in the
                           same institution (>= OUTLIER_MULTIPLIER x average).

Each rule only creates a flag when no *open* (flagged / reviewing) flag with the
same type + description already exists for the student, so repeated scans do not
spam the queue.

Usage:
  - automatically after every evidence / extracted-skill write (in the API views)
  - on demand via:  python manage.py scan_anomalies
"""
from __future__ import annotations

import re
from datetime import timedelta
from typing import List, Optional

from django.db.models import Count
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.credentials.models import EvidenceItem, SkillClaim
from apps.governance.models import (
    AnomalyFlag,
    AnomalySeverity,
    AnomalyType,
)

# --- tuning knobs ----------------------------------------------------------
RECENT_WINDOW = timedelta(days=14)  # de-dupe window for open flags
BURST_WINDOW = timedelta(days=7)
BURST_LIMIT = 5
OUTLIER_MIN_CLAIMS = 10
OUTLIER_MULTIPLIER = 2.5

_OPEN = ("flagged", "reviewing")


def _normalise(value) -> str:
    """Lower-case, single-spaced comparison key for titles/issuers."""
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _has_open_flag(student, atype: str, description: str) -> bool:
    return AnomalyFlag.objects.filter(
        student=student,
        type=atype,
        description=description,
        status__in=_OPEN,
        flagged_at__gte=timezone.now() - RECENT_WINDOW,
    ).exists()


def _flag(
    student,
    atype: str,
    severity: str,
    description: str,
    evidence_note: str,
) -> Optional[AnomalyFlag]:
    if _has_open_flag(student, atype, description):
        return None
    return AnomalyFlag.objects.create(
        student=student,
        type=atype,
        severity=severity,
        description=description,
        evidence=evidence_note,
    )


def _flag_duplicates(student, evidence_rows: List[EvidenceItem]) -> Optional[AnomalyFlag]:
    """Rule 1: identical (kind, title, issuer) rows for the same student."""
    seen = {}
    for row in evidence_rows:
        key = (row.kind, _normalise(row.title), _normalise(row.issuer))
        if key in seen:
            original = seen[key]
            return _flag(
                student,
                AnomalyType.DUPLICATE.value,
                AnomalySeverity.HIGH.value,
                "Duplicate Record",
                (
                    f"Duplicate entries: identical {row.kind.lower()} record "
                    f"'{row.title}' (same issuer) was submitted more than once — "
                    f"original record ev-{original.pk}."
                ),
            )
        seen[key] = row
    return None


def _flag_burst(student, evidence_rows: List[EvidenceItem]) -> Optional[AnomalyFlag]:
    """Rule 2: a suspiciously fast cluster of new evidence rows."""
    if len(evidence_rows) < BURST_LIMIT:
        return None
    cutoff = timezone.now() - BURST_WINDOW
    recent = [r for r in evidence_rows if r.created_at and r.created_at >= cutoff]
    if len(recent) < BURST_LIMIT:
        return None
    return _flag(
        student,
        AnomalyType.UNUSUAL.value,
        AnomalySeverity.MEDIUM.value,
        "Unusual Pattern",
        (
            f"{len(recent)} evidence records were added within the last "
            f"{BURST_WINDOW.days} days; policy allows a slower, verifiable cadence."
        ),
    )


def _peer_average_claims(institution_id) -> float:
    """Average number of skill claims per student in the same institution."""
    rows = (
        SkillClaim.objects.filter(
            student__role=Role.STUDENT,
            student__student_profile__institution_id=institution_id,
        )
        .values("student_id")
        .annotate(total=Count("id"))
    )
    counts = [r["total"] for r in rows]
    if not counts:
        return 0.0
    return sum(counts) / len(counts)


def _flag_outlier(student) -> Optional[AnomalyFlag]:
    """Rule 3: claim count far above the institution peer average."""
    profile = getattr(student, "student_profile", None)
    if profile is None or profile.institution_id is None:
        return None
    claims = SkillClaim.objects.filter(student=student).count()
    if claims < OUTLIER_MIN_CLAIMS:
        return None
    peer_avg = _peer_average_claims(profile.institution_id)
    if peer_avg <= 0 or claims < peer_avg * OUTLIER_MULTIPLIER:
        return None
    return _flag(
        student,
        AnomalyType.OUTLIER.value,
        AnomalySeverity.MEDIUM.value,
        "Statistical Outlier",
        (
            f"Claimed {claims} skills when the average for peers at the same "
            f"institution is {peer_avg:.0f} — review for inflated or unverifiable claims."
        ),
    )


def scan_student(student) -> List[AnomalyFlag]:
    """
    Run every rule against one student and create any new flags.

    Returns the flags created by this scan (empty when nothing new was found).
    Idempotent: a rule never fires twice within RECENT_WINDOW for the same
    type + description.
    """
    evidence_rows = list(
        EvidenceItem.objects.filter(student=student).order_by("created_at")
    )
    created = []
    for candidate in (
        _flag_duplicates(student, evidence_rows),
        _flag_burst(student, evidence_rows),
        _flag_outlier(student),
    ):
        if candidate is not None:
            created.append(candidate)
    return created


def scan_institution(institution) -> List[AnomalyFlag]:
    """
    Scan every student attached to an institution (used by the management
    command and any future admin-triggered sweep).
    """
    students = User.objects.filter(
        role=Role.STUDENT, student_profile__institution=institution
    )
    created = []
    for student in students.iterator(chunk_size=200):
        created.extend(scan_student(student))
    return created
