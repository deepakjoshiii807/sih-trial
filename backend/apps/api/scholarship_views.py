"""
Grounded scholarship endpoints.

GET /api/catalog/scholarships               — all active scholarships (public)
GET /api/student/scholarships              — matched to the caller's profile
GET /api/student/scholarships?explain=1    — same, with per-item rationale
"""

from __future__ import annotations

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsStudent
from apps.catalog.scholarship_models import Scholarship


def _scholarship_block(s: Scholarship) -> dict:
    return {
        "id": f"sch-{s.id}",
        "title": s.title,
        "provider": s.provider,
        "category": s.category,
        "amount": s.amount,
        "deadline": s.deadline.isoformat() if s.deadline else "",
        "url": s.url,
        "eligibility": s.eligibility,
        "eligibleCourses": s.eligible_courses or [],
        "relevantSkills": s.relevant_skills or [],
        "isActive": s.is_active,
    }


def _matches_student(s: Scholarship, student) -> tuple[bool, list[str]]:
    """Deterministic match: course eligibility + optional skill overlap. Returns (matched, reasons)."""
    reasons: list[str] = []
    course = ""
    try:
        course = (getattr(student.student_profile, "course", "") or "").strip()
    except Exception:
        course = ""
    eligible = s.eligible_courses or []
    if eligible and course and course not in eligible:
        return False, [f"Requires {', '.join(eligible)}"]
    if eligible and course:
        reasons.append(f"Eligible for {course}")
    elif not eligible:
        reasons.append("Open to all courses")
    # Skill relevance is soft — bonus reason, never a filter
    relevant = [str(x).lower() for x in (s.relevant_skills or [])]
    if relevant:
        try:
            student_skills = {c.skill.name.lower() for c in student.skill_claims.select_related("skill").all()}
            overlap = [x for x in relevant if x in student_skills]
            if overlap:
                reasons.append(f"Relevant to your {', '.join(overlap[:2])} skills")
        except Exception:
            pass
    return True, reasons


class ScholarshipListView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        qs = Scholarship.objects.filter(is_active=True).order_by("title")
        return Response([_scholarship_block(s) for s in qs])


class StudentScholarshipListView(APIView):
    permission_classes = (IsStudent,)

    def get(self, request):
        # Grounded catalog — no hallucination. Optional LLM enrichment happens
        # client-side (rank + explain) in ai-opportunity-matcher, but the items
        # are always from this DB table.
        qs = Scholarship.objects.filter(is_active=True).order_by("title")
        matched: list[dict] = []
        explain = request.query_params.get("explain") in ("1", "true", "yes")
        for s in qs:
            ok, reasons = _matches_student(s, request.user)
            if not ok:
                continue
            block = _scholarship_block(s)
            # Deterministic confidence: course match + skill overlap (40-95)
            base = 60
            if reasons and "Eligible for" in reasons[0]:
                base += 10
            if any("Relevant to your" in r for r in reasons):
                base += 10
            if s.category in ("AYUSH", "Health") and "AYUSH" in (request.user.student_profile.course or ""):
                base += 5
            block["confidence"] = min(95, base)
            if explain:
                block["whyYouMatch"] = "; ".join(reasons) if reasons else "Profile match"
                block["eligibilityReasons"] = reasons
            matched.append(block)
        # Rank: active AYUSH/Research first, then general
        order = {"AYUSH": 0, "Research": 1, "Health": 2, "Merit": 3, "General": 4}
        matched.sort(key=lambda b: (order.get(b["category"], 9), b["title"]))
        return Response(matched)
