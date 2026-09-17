"""
Internship response SLA.

Industry partners must act on an application (shortlist / interview / offer /
reject) within the SLA window of the student applying; otherwise the listing
is auto-flagged stale so applicants are never "ghosted".

The window is deliberately a module constant (no per-listing override column
yet): 7 days, matching the policy copy shown in the industry dashboard.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Optional

from django.utils import timezone

from .models import Application

SLA_WINDOW_DAYS = 7
AWAITING_STAGES = ("applied", "shortlisted")


def respond_by(application: Application):
    """Datetime by which the industry must have moved this application along."""
    anchor = application.applied_at or application.updated_at
    return anchor + timedelta(days=SLA_WINDOW_DAYS)


def application_sla(application: Application) -> dict:
    """Per-application SLA state: respond-by, remaining time, and status."""
    deadline = respond_by(application)
    now = timezone.now()
    remaining = (deadline - now).days
    if remaining < 0:
        sla_status = "breached"
    elif remaining <= 3:
        sla_status = "warning"
    else:
        sla_status = "on-track"
    return {
        "respondBy": deadline,
        "slaStatus": sla_status,
        "daysRemaining": max(remaining, 0),
        "timeRemaining": (
            f"Overdue by {-remaining} day{'s' if remaining != -1 else ''}"
            if remaining < 0
            else f"{remaining} day{'s' if remaining != 1 else ''}"
        ),
    }


def awaiting_applications(opportunity) -> list:
    """Applications on this listing still waiting for an industry decision."""
    return [
        a
        for a in opportunity.applications.all()
        if a.stage in AWAITING_STAGES
    ]


def opportunity_sla(opportunity) -> dict:
    """
    Listing-level SLA state used for auto-flagging.

    breached == True when at least one applicant is still waiting past the
    SLA window, i.e. the listing is stale and needs industry attention.
    """
    waiting = awaiting_applications(opportunity)
    if not waiting:
        return {"awaitingCount": 0, "breached": False, "earliestRespondBy": None}
    states = [application_sla(a) for a in waiting]
    earliest: Optional[dict] = min(
        states, key=lambda s: s["respondBy"]
    )
    return {
        "awaitingCount": len(waiting),
        "breached": any(s["slaStatus"] == "breached" for s in states),
        "earliestRespondBy": earliest["respondBy"],
    }
