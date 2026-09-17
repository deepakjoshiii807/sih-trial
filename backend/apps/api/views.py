"""
REST endpoints for the four roles. Each role namespace enforces role-based
permission; dashboards return exactly the payload shape `src/lib/*-api.ts`
declares so the React app can be pointed at this API with zero reshaping.
"""
from __future__ import annotations

import hashlib
import os
import uuid
from datetime import datetime

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AcademicianProfile, IndustryProfile, InstitutionAdminProfile, StudentProfile, User
from apps.accounts.permissions import IsAcademician, IsIndustry, IsInstitutionAdmin, IsStudent
from apps.catalog.models import Department, Institution, LearningResource, Skill, SkillCategory, TargetRole
from apps.credentials.models import (
    EvidenceItem,
    EvidenceStatus,
    ProjectRecommendation,
    ProjectSubmission,
    SkillClaim,
    VerificationRequest,
)
from apps.governance.services import scan_student
from apps.governance.models import (
    AcademicianOpportunity,
    AnomalyFlag,
    InstitutionalReport,
    ReportType,
    Placement,
)
from apps.marketplace.models import Application, ApplicationStage, Opportunity, Rating, OpportunityStatus

from . import ai as ai_service
from . import presenters_academician as acad
from . import presenters_industry as ind
from . import presenters_institution as inst
from . import presenters_student as stu

SIMPLE_KEYS = {
    "name": ("name", None),
    "email": ("email", "email"),
    "phone": ("phone", None),
}


def _pick(data, *keys):
    return {k: data[k] for k in keys if k in data}


def _user_email_sync(user, data):
    if "email" in data and data["email"]:
        user.email = data["email"].lower()
        user.save(update_fields=["email"])


def _company_email(data):
    return data.get("email", "")


# ---------------------------------------------------------------------------
# STUDENT
# ---------------------------------------------------------------------------


class StudentDashboardView(APIView):
    permission_classes = (IsStudent,)

    def get(self, request):
        return Response(stu.build_student_dashboard(request.user))


class StudentProfileView(APIView):
    permission_classes = (IsStudent,)

    def get(self, request):
        return Response(stu._student_block(request.user))

    @transaction.atomic
    def patch(self, request):
        user = request.user
        profile = user.student_profile
        data = request.data

        if data.get("name"):
            first, _, last = str(data["name"]).partition(" ")
            user.first_name = first
            user.last_name = last.strip()
            user.save(update_fields=["first_name", "last_name"])
        _user_email_sync(user, data)
        if data.get("phone"):
            user.phone = data["phone"]
            user.save(update_fields=["phone"])
        if data.get("bio") is not None:
            profile.bio = data["bio"]
        if data.get("location") is not None:
            profile.location = data["location"]
        if data.get("course") is not None:
            profile.course = data["course"]
        if data.get("year") is not None:
            profile.year = data["year"]
        if data.get("graduationYear"):
            profile.graduation_year = data["graduationYear"]
        if data.get("targetRole"):
            role, _ = TargetRole.objects.get_or_create(name=data["targetRole"])
            profile.target_role = role
            profile.target_role_name = role.name
        profile.save()
        return Response(stu._student_block(user))


class StudentApplyView(APIView):
    permission_classes = (IsStudent,)

    @transaction.atomic
    def post(self, request):
        opportunity_id = request.data.get("opportunityId") or request.data.get("opportunity_id")
        if not opportunity_id:
            return Response({"detail": "opportunityId is required."}, status=status.HTTP_400_BAD_REQUEST)
        opportunity_id = str(opportunity_id).replace("op-", "")
        try:
            opportunity = Opportunity.objects.get(pk=int(opportunity_id))
        except (ValueError, Opportunity.DoesNotExist):
            return Response({"detail": "Opportunity not found."}, status=status.HTTP_404_NOT_FOUND)
        application, created = Application.objects.get_or_create(
            opportunity=opportunity, student=request.user
        )
        if created:
            application.stage = ApplicationStage.APPLIED
            application.save()
        return Response({"id": application.id, "created": created}, status=201 if created else 200)


class StudentSubmitProjectView(APIView):
    permission_classes = (IsStudent,)

    @transaction.atomic
    def post(self, request, pk):
        try:
            project = ProjectRecommendation.objects.get(pk=pk)
        except (ProjectRecommendation.DoesNotExist, ValueError):
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        submission, _ = ProjectSubmission.objects.get_or_create(
            student=request.user, project=project
        )
        submission.status = "pending review"
        submission.submitted_at = timezone.now()
        submission.submission_url = request.data.get("submissionUrl", "") or request.data.get("url", "")
        submission.notes = request.data.get("notes", "")
        submission.save()
        return Response({"id": submission.id, "status": submission.status})


def _llm_extract_to_claims(user, evidence, raw_text: str) -> list:
    """
    Run the real LLM skill extraction over document text and attach matched
    taxonomy skills as evidence-backed claims. Returns the names extracted.

    Never raises: any gateway/model failure returns [] so callers fall back to
    deterministic logic (which keeps the API usable without a VLY key).
    """
    extracted = []
    analysis = None
    try:
        analysis = ai_service.extract_skills(
            raw_text[:14000], evidence.title, user_id=getattr(user, "id", None)
        )
    except Exception:  # noqa: BLE001 - best-effort AI, never fail the upload
        analysis = None
    if not analysis or not analysis.get("skills"):
        return extracted

    taxonomy = {s.name.lower(): s for s in Skill.objects.all()}
    claimed = set()
    for raw in analysis["skills"]:
        raw_name = str(raw.get("name") or "").strip()
        if not raw_name:
            continue
        skill = taxonomy.get(raw_name.lower())
        if skill is None:
            # Loose containment match so "Python for Healthcare" still lands on
            # the taxonomy's "Python" rather than creating a duplicate skill.
            for taxon_name, candidate in taxonomy.items():
                if taxon_name in raw_name.lower() or raw_name.lower() in taxon_name:
                    skill = candidate
                    break
        if skill is None or skill.name.lower() in claimed:
            continue
        claimed.add(skill.name.lower())
        try:
            confidence = int(raw.get("confidence") or 70)
        except (TypeError, ValueError):
            confidence = 70
        confidence = max(40, min(90, confidence))
        claim, _ = user.skill_claims.get_or_create(
            skill=skill,
            defaults={"origin": "evidence", "evidence": evidence, "confidence": confidence},
        )
        if claim.origin != "evidence" or claim.evidence_id is None:
            claim.origin = "evidence"
            claim.evidence = evidence
            claim.confidence = max(claim.confidence, confidence)
            claim.save()
        extracted.append(skill.name)
    return extracted


class StudentEvidenceUploadView(APIView):
    permission_classes = (IsStudent,)

    @transaction.atomic
    def post(self, request):
        """
        Upload evidence and extract the skills it evidences.

        When document text is available (either supplied as `documentText` or
        reconstructed from the title/description) the real LLM extraction runs
        through the server-side gateway. Without a configured VLY key — or if
        the gateway call fails — a deterministic keyword match over the
        taxonomy is used so the flow still works in dev/demo.

        Also accepts an optional multipart file field `evidenceFile` (PDFs and
        text files). When present its server-side extraction takes precedence
        over any client-provided text — so PDFs work even when the browser
        cannot read them.
        """
        title = request.data.get("title") or "Uploaded document"
        kind = request.data.get("kind", "Certificate")
        issuer = request.data.get("issuer", "")
        description = request.data.get("description", "")
        # Back-compat: some callers send `url` instead of `fileUrl`.
        file_url = request.data.get("fileUrl", "") or request.data.get("url", "")
        # Multipart wins over JSON if present — wire the bytes through the
        # server-side extractor so large PDFs don't need a client round-trip.
        uploaded_text = None
        uploaded_file = request.FILES.get("evidenceFile")
        raw_bytes: bytes | None = None
        saved_file_url = ""
        if uploaded_file is not None:
            # Size guard before reading into memory
            max_bytes = getattr(settings, "EVIDENCE_MAX_UPLOAD_BYTES", 8 * 1024 * 1024)
            if getattr(uploaded_file, "size", 0) > max_bytes:
                return Response(
                    {"detail": f"File too large — max {max_bytes // (1024*1024)} MB."},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )
            try:
                raw_bytes = uploaded_file.read()
                if len(raw_bytes) > max_bytes:
                    return Response(
                        {"detail": f"File too large — max {max_bytes // (1024*1024)} MB."},
                        status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    )
                # Persist to MEDIA_ROOT/evidence/<user_id>/ so file_url is real
                try:
                    orig_name = getattr(uploaded_file, "name", "document") or "document"
                    safe_name = os.path.basename(orig_name).replace(" ", "_")[:80] or "document"
                    # prefix with uuid to avoid collisions
                    stored_name = f"evidence/{request.user.id}/{uuid.uuid4().hex[:8]}_{safe_name}"
                    saved_path = default_storage.save(stored_name, ContentFile(raw_bytes))
                    # Build an absolute URL when possible; fallback to MEDIA_URL
                    try:
                        saved_file_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)
                    except Exception:
                        saved_file_url = (settings.MEDIA_URL or "/media/") + saved_path
                    if not file_url:
                        file_url = saved_file_url
                except Exception:
                    # Storage failure must not break the upload entirely — we still
                    # have raw_bytes for text extraction
                    saved_file_url = saved_file_url or ""
            except Exception:
                raw_bytes = None
            try:
                from .evidence_upload import extract_text_from_upload  # noqa: WPS433

                # Use already-read bytes if available to avoid double read
                b = raw_bytes if raw_bytes is not None else b""
                if not b and uploaded_file is not None:
                    try:
                        uploaded_file.seek(0)
                        b = uploaded_file.read()
                    except Exception:
                        b = b""
                text, note = extract_text_from_upload(
                    getattr(uploaded_file, "name", "") or "document",
                    getattr(uploaded_file, "content_type", "") or "",
                    b,
                )
                uploaded_text = text
                if note:
                    description = (description + " " + note).strip()[:2000]
            except Exception:  # noqa: BLE001 - file parsing must never break uploads
                uploaded_text = None
        evidence = EvidenceItem.objects.create(
            student=request.user,
            title=title,
            kind=kind,
            issuer=issuer,
            description=description,
            file_url=file_url or saved_file_url,
            status="processing",
        )

        doc_text = request.data.get("documentText") or request.data.get("text") or ""
        # Best available text: uploaded file extraction > client documentText > metadata.
        text = f"{title} {description} {issuer}".strip()
        try:
            from .evidence_upload import normalise_document_text as _normalise  # noqa: WPS433

            raw_text = _normalise(doc_text, title, description, issuer, uploaded_text)
        except Exception:
            raw_text = str(doc_text) if str(doc_text).strip() else text
            if uploaded_text and len(uploaded_text.strip()) >= 20:
                raw_text = uploaded_text
        extracted = _llm_extract_to_claims(request.user, evidence, raw_text)

        if not extracted:
            # Deterministic fallback: any taxonomy skill mentioned in the
            # title/description becomes an evidence-backed claim (pending review).
            haystack = raw_text.lower()
            for skill in Skill.objects.all():
                if skill.name.lower() not in haystack:
                    continue
                extracted.append(skill.name)
                claim, _ = request.user.skill_claims.get_or_create(
                    skill=skill, defaults={"origin": "evidence", "evidence": evidence, "confidence": 70}
                )
                if claim.origin == "evidence" and claim.evidence_id is None:
                    claim.evidence = evidence
                    claim.confidence = max(claim.confidence, 70)
                    claim.save()

        evidence.extracted_skills = extracted
        evidence.status = "needs review" if extracted else "processing"
        evidence.save(update_fields=["extracted_skills", "status"])
        try:
            scan_student(request.user)
        except Exception:  # noqa: BLE001 - integrity scanning must never break uploads
            pass
        return Response(
            {"id": f"ev-{evidence.id}", "status": evidence.status, "extractedSkills": extracted},
            status=201,
        )


class StudentExtractedSkillsView(APIView):
    """
    POST /api/student/extracted-skills — persist AI-extracted skills.

    The student dashboard's "AI Skill Extraction" flow used to POST skill
    fields to /settings, where no backend handler consumed them, so nothing was
    ever saved. This endpoint stores each extracted skill as an evidence-backed
    claim under one EvidenceItem per source document, and queues the batch on
    the academician verification queue (approval there flips claims verified).
    """

    permission_classes = (IsStudent,)
    MAX_ITEMS = 50

    EVIDENCE_KIND = "Portfolio"
    EVIDENCE_ISSUER = "AI document analysis"

    _CATEGORY_MAP = {
        "technical": SkillCategory.TECHNICAL,
        "software": SkillCategory.TECHNICAL,
        "research": SkillCategory.RESEARCH,
        "communication": SkillCategory.COMMUNICATION,
        "administrative": SkillCategory.MANAGEMENT,
        "leadership": SkillCategory.MANAGEMENT,
        "management": SkillCategory.MANAGEMENT,
        "clinical": SkillCategory.DOMAIN,
        "domain": SkillCategory.DOMAIN,
        "domain-specific": SkillCategory.DOMAIN,
    }

    @classmethod
    def _map_category(cls, label) -> str:
        key = str(label or "").strip().lower()
        return cls._CATEGORY_MAP.get(key, SkillCategory.DOMAIN)

    @classmethod
    def _resolve_skill(cls, name: str, category_label: str):
        """Find the taxonomy skill or create it (category-normalised)."""
        skill = Skill.objects.filter(name__iexact=name).first()
        if skill is not None:
            return skill
        taxonomy_id = f"SK-{hashlib.md5(name.encode()).hexdigest()[:8].upper()}"
        try:
            return Skill.objects.create(
                name=name,
                taxonomy_id=taxonomy_id,
                category=cls._map_category(category_label),
            )
        except IntegrityError:
            # A concurrent request created the same skill first — reuse it.
            return Skill.objects.get(name__iexact=name)

    @transaction.atomic
    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        items = data.get("items")
        if not isinstance(items, list) or not items:
            return Response(
                {"detail": "items must be a non-empty list of extracted skills."},
                status=400,
            )

        source = str(data.get("source") or "document").strip()[:120] or "document"
        summary = str(data.get("summary") or "").strip()[:2000]

        parsed = []
        for raw in items[: self.MAX_ITEMS]:
            if not isinstance(raw, dict):
                continue
            name = str(raw.get("name") or "").strip()
            if not name or len(name) > 160:
                continue
            try:
                confidence = int(raw.get("confidence") or 70)
            except (TypeError, ValueError):
                confidence = 70
            parsed.append(
                {
                    "name": name,
                    "category": str(raw.get("category") or "Domain")[:40],
                    # Capped below verified levels — an academician approval
                    # later raises it through the normal review flow.
                    "confidence": max(40, min(90, confidence)),
                    "evidence": str(raw.get("evidence") or "").strip()[:500],
                }
            )
        if not parsed:
            return Response({"detail": "No valid skill names were provided."}, status=400)

        # Phase 1 — decide what actually needs writing (skip already
        # evidence-backed claims so repeated runs don't spam duplicates).
        writes = []  # (skill, confidence, evidence_note)
        kept_names = []
        for item in parsed:
            skill = self._resolve_skill(item["name"], item["category"])
            claim = request.user.skill_claims.filter(skill=skill).first()
            needs_write = claim is None or claim.origin != "evidence" or claim.evidence_id is None
            if needs_write:
                writes.append((skill, item["confidence"]))
            else:
                kept_names.append(skill.name)

        if not writes:
            return Response(
                {
                    "added": 0,
                    "upgraded": 0,
                    "kept": len(parsed),
                    "evidenceId": None,
                    "verificationQueued": False,
                    "items": [
                        {"name": n, "claim": "kept", "confidence": None} for n in kept_names
                    ],
                },
                status=200,
            )

        # Phase 2 — one EvidenceItem per source document, then the claim writes.
        title = f"AI-extracted skills · {source}"
        evidence = EvidenceItem.objects.filter(
            student=request.user,
            title=title,
            kind=self.EVIDENCE_KIND,
            issuer=self.EVIDENCE_ISSUER,
            description=summary,
        ).first()
        if evidence is None:
            evidence = EvidenceItem.objects.create(
                student=request.user,
                title=title,
                kind=self.EVIDENCE_KIND,
                issuer=self.EVIDENCE_ISSUER,
                description=summary,
                status="needs review",
            )
        elif evidence.status == EvidenceStatus.PROCESSING:
            evidence.status = EvidenceStatus.NEEDS_REVIEW
            evidence.save(update_fields=["status"])

        added = upgraded = 0
        items_out = []
        for skill, confidence in writes:
            claim = request.user.skill_claims.filter(skill=skill).first()
            if claim is None:
                request.user.skill_claims.create(
                    skill=skill,
                    origin="evidence",
                    evidence=evidence,
                    confidence=confidence,
                )
                added += 1
                state = "added"
            else:
                claim.origin = "evidence"
                claim.evidence = evidence
                claim.confidence = max(claim.confidence, confidence)
                claim.save(update_fields=["origin", "evidence", "confidence"])
                upgraded += 1
                state = "upgraded"
            items_out.append(
                {"name": skill.name, "claim": state, "confidence": max(claim.confidence, confidence) if claim else confidence}
            )
        for name in kept_names:
            items_out.append({"name": name, "claim": "kept", "confidence": None})

        changed_names = [r["name"] for r in items_out if r["claim"] != "kept"]
        if changed_names:
            # Land on the academician verification queue: approving the request
            # flips this evidence (and its claims) to verified.
            VerificationRequest.objects.get_or_create(
                student=request.user,
                evidence=evidence,
                title=title,
                defaults={
                    "type": "Skill Evidence",
                    "description": summary or f"AI-extracted skills from {source}.",
                    "skills_claimed": changed_names,
                    "status": "pending",
                },
            )

        try:
            scan_student(request.user)
        except Exception:  # noqa: BLE001 - integrity scanning must never break saves
            pass
        return Response(
            {
                "added": added,
                "upgraded": upgraded,
                "kept": len(kept_names),
                "evidenceId": f"ev-{evidence.id}",
                "verificationQueued": True,
                "items": items_out,
            },
            status=201,
        )


class StudentAddSkillView(APIView):
    permission_classes = (IsStudent,)

    @transaction.atomic
    def post(self, request):
        name = request.data.get("name")
        if not name:
            return Response({"detail": "name is required."}, status=400)
        skill, _ = Skill.objects.get_or_create(
            name=name,
            defaults={"taxonomy_id": f"SK-{hashlib.md5(name.encode()).hexdigest()[:8].upper()}"},
        )
        claim, created = request.user.skill_claims.get_or_create(
            skill=skill,
            defaults={"origin": "self-declared", "confidence": int(request.data.get("confidence", 60))},
        )
        if not created:
            claim.origin = "self-declared"
            claim.confidence = int(request.data.get("confidence", claim.confidence))
            claim.save()
        return Response({"id": f"claim-{claim.id}", "created": created}, status=201 if created else 200)


# ---------------------------------------------------------------------------
# INDUSTRY
# ---------------------------------------------------------------------------


class IndustryDashboardView(APIView):
    permission_classes = (IsIndustry,)

    def get(self, request):
        return Response(ind.build_industry_dashboard(request.user))


class IndustryProfileView(APIView):
    permission_classes = (IsIndustry,)

    def get(self, request):
        return Response(ind._company_block(request.user.industry_profile))

    @transaction.atomic
    def patch(self, request):
        profile = request.user.industry_profile
        data = request.data
        for field in (
            "name", "description", "domain", "orgType", "location", "website",
            "contactPerson", "size",
        ):
            key = "org_type" if field == "orgType" else field
            if field in data:
                setattr(profile, key, data[field])
        if data.get("email"):
            profile.company_email = data["email"]
            _user_email_sync(request.user, data)
        if data.get("phone"):
            profile.phone = data["phone"]
            request.user.phone = data["phone"]
            request.user.save(update_fields=["phone"])
        if data.get("foundedYear"):
            profile.founded_year = data["foundedYear"]
        if data.get("verified") is not None:
            profile.verified = bool(data["verified"])
        profile.save()
        return Response(ind._company_block(profile))


class IndustryOpportunityListCreateView(APIView):
    permission_classes = (IsIndustry,)

    def get(self, request):
        opportunities = Opportunity.objects.filter(company=request.user).select_related("company__industry_profile")
        return Response([ind._opportunity_block(o) for o in opportunities])

    @transaction.atomic
    def post(self, request):
        data = request.data
        title = str(data.get("title") or "").strip()
        if not title:
            return Response({"detail": "title is required."}, status=400)
        eligibility = data.get("eligibility") or {}
        try:
            deadline = data.get("deadline") or None
            if deadline:
                deadline = datetime.strptime(str(deadline)[:10], "%Y-%m-%d").date()
        except ValueError:
            deadline = None
        opportunity = Opportunity.objects.create(
            company=request.user,
            title=title,
            type=data.get("type", "Internship"),
            description=data.get("description", ""),
            openings=int(data.get("openings", 1)),
            location=data.get("location", ""),
            work_arrangement=data.get("workArrangement", "On-site"),
            duration=data.get("duration", ""),
            stipend=data.get("stipend", ""),
            deadline=deadline,
            eligibility_qualification=eligibility.get("qualification", ""),
            eligibility_courses=eligibility.get("courses", []),
            eligibility_experience=eligibility.get("experience", ""),
            eligibility_other=eligibility.get("otherCriteria", ""),
            registration_requirements=data.get("registrationRequirements", ""),
            status=data.get("status", OpportunityStatus.ACTIVE),
            blind_shortlisting=bool(data.get("blindShortlisting", True)),
        )
        for req in data.get("requiredSkills") or []:
            if not isinstance(req, dict):
                continue
            name = req.get("skill") or req.get("name")
            if not name:
                continue
            skill, _ = Skill.objects.get_or_create(
                name=name,
                defaults={"taxonomy_id": f"SK-{hashlib.md5(name.encode()).hexdigest()[:8].upper()}"},
            )
            opportunity.required_skills.create(
                skill=skill,
                required=req.get("required", "essential"),
                min_proficiency=int(req.get("minProficiency", 60)),
            )
        return Response(ind._opportunity_block(opportunity), status=201)


class IndustryOpportunityDetailView(APIView):
    permission_classes = (IsIndustry,)

    def _get(self, request, pk):
        try:
            return Opportunity.objects.get(pk=pk, company=request.user)
        except Opportunity.DoesNotExist:
            return None

    @transaction.atomic
    def patch(self, request, pk):
        opportunity = self._get(request, pk)
        if opportunity is None:
            return Response({"detail": "Not found."}, status=404)
        data = request.data
        for field in ("title", "description", "location", "duration", "stipend",
                      "workArrangement", "type", "status", "registrationRequirements"):
            if field in data:
                attr = "work_arrangement" if field == "workArrangement" else field
                setattr(opportunity, attr, data[field])
        if data.get("openings") is not None:
            opportunity.openings = int(data["openings"])
        if data.get("blindShortlisting") is not None:
            opportunity.blind_shortlisting = bool(data["blindShortlisting"])
        if data.get("deadline"):
            try:
                opportunity.deadline = datetime.strptime(str(data["deadline"])[:10], "%Y-%m-%d").date()
            except ValueError:
                pass
        eligibility = data.get("eligibility") or {}
        if "qualification" in eligibility:
            opportunity.eligibility_qualification = eligibility["qualification"]
        if "courses" in eligibility:
            opportunity.eligibility_courses = eligibility["courses"]
        if "experience" in eligibility:
            opportunity.eligibility_experience = eligibility["experience"]
        if "otherCriteria" in eligibility:
            opportunity.eligibility_other = eligibility["otherCriteria"]
        if data.get("requiredSkills") is not None:
            opportunity.required_skills.all().delete()
            for req in data["requiredSkills"]:
                name = req.get("skill") if isinstance(req, dict) else req
                if not name:
                    continue
                skill, _ = Skill.objects.get_or_create(
                    name=name,
                    defaults={"taxonomy_id": f"SK-{hashlib.md5(str(name).encode()).hexdigest()[:8].upper()}"},
                )
                opportunity.required_skills.create(
                    skill=skill,
                    required=req.get("required", "essential") if isinstance(req, dict) else "essential",
                    min_proficiency=int(req.get("minProficiency", 60)) if isinstance(req, dict) else 60,
                )
        opportunity.save()
        return Response(ind._opportunity_block(opportunity))

    @transaction.atomic
    def delete(self, request, pk):
        opportunity = self._get(request, pk)
        if opportunity is None:
            return Response({"detail": "Not found."}, status=404)
        if opportunity.applications.exists():
            return Response(
                {"detail": "This listing has applicants. Close it instead of deleting."},
                status=409,
            )
        opportunity.delete()
        return Response(status=204)


class IndustryApplicationActionView(APIView):
    """POST /api/industry/applications/<pk>/<action>"""

    permission_classes = (IsIndustry,)
    ALLOWED = {
        "shortlist": ApplicationStage.SHORTLISTED,
        "interview": ApplicationStage.INTERVIEWED,
        "offer": ApplicationStage.OFFERED,
        "reject": ApplicationStage.REJECTED,
    }

    @transaction.atomic
    def post(self, request, pk, action):
        if action not in self.ALLOWED:
            return Response({"detail": f"Unknown action {action}."}, status=400)
        try:
            application = Application.objects.select_related("opportunity").get(
                pk=pk, opportunity__company=request.user
            )
        except Application.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        application.stage = self.ALLOWED[action]
        if action == "interview" and request.data.get("interviewDate"):
            try:
                application.interview_date = datetime.fromisoformat(str(request.data["interviewDate"]).replace("Z", "+00:00"))
            except ValueError:
                pass
        if action == "offer":
            # Convert the offer into a Placement record when accepted later.
            pass
        application.notes = request.data.get("notes", application.notes)
        application.save()
        return Response({"id": application.id, "stage": application.stage})


class IndustryRatingCreateView(APIView):
    permission_classes = (IsIndustry,)

    @transaction.atomic
    def post(self, request):
        ratee_id = request.data.get("toId") or request.data.get("rateeId")
        if not ratee_id:
            return Response({"detail": "toId (student user id) is required."}, status=400)
        try:
            ratee = User.objects.get(pk=ratee_id, role="student")
        except User.DoesNotExist:
            return Response({"detail": "Student not found."}, status=404)
        try:
            score = min(5, max(1, int(request.data.get("score", 5))))
        except (TypeError, ValueError):
            return Response({"detail": "score must be 1-5."}, status=400)
        opportunity_id = request.data.get("opportunityId")
        rating, created = Rating.objects.update_or_create(
            rater=request.user,
            ratee=ratee,
            opportunity_id=opportunity_id or None,
            defaults={
                "ratee_type": "student",
                "score": score,
                "feedback": request.data.get("feedback", ""),
            },
        )
        return Response({"id": rating.id, "created": created}, status=201)


class StudentRatingCreateView(APIView):
    """POST /api/student/ratings — student rates the industry after an internship."""

    permission_classes = (IsStudent,)

    @transaction.atomic
    def post(self, request):
        ratee_id = request.data.get("toId") or request.data.get("rateeId")
        if not ratee_id:
            return Response({"detail": "toId (industry user id) is required."}, status=400)
        opportunity_id = request.data.get("opportunityId")
        if not opportunity_id:
            return Response({"detail": "opportunityId is required."}, status=400)
        try:
            ratee = User.objects.get(pk=ratee_id, role="industry")
        except User.DoesNotExist:
            return Response({"detail": "Industry partner not found."}, status=404)

        # Only rate an engagement the student actually completed.
        engagement = Application.objects.filter(
            student=request.user,
            opportunity_id=opportunity_id,
            stage__in=("offered", "joined"),
        ).first()
        if engagement is None:
            return Response(
                {"detail": "You can only rate an internship you completed or were offered."},
                status=400,
            )
        if engagement.opportunity.company_id != ratee.id:
            return Response({"detail": "Opportunity does not belong to this partner."}, status=400)

        try:
            score = min(5, max(1, int(request.data.get("score", 5))))
        except (TypeError, ValueError):
            return Response({"detail": "score must be 1-5."}, status=400)

        rating, created = Rating.objects.update_or_create(
            rater=request.user,
            ratee=ratee,
            opportunity_id=opportunity_id,
            defaults={
                "ratee_type": "industry",
                "score": score,
                "feedback": request.data.get("feedback", ""),
            },
        )
        return Response({"id": rating.id, "created": created}, status=201)


# ---------------------------------------------------------------------------
# ACADEMICIAN
# ---------------------------------------------------------------------------


class AcademicianDashboardView(APIView):
    permission_classes = (IsAcademician,)

    def get(self, request):
        return Response(acad.build_academician_dashboard(request.user))


class AcademicianProfileView(APIView):
    permission_classes = (IsAcademician,)

    def get(self, request):
        return Response(acad._academician_block(request.user))

    @transaction.atomic
    def patch(self, request):
        user = request.user
        profile = user.academician_profile
        data = request.data
        if data.get("name"):
            first, _, last = str(data["name"]).partition(" ")
            user.first_name = first
            user.last_name = last.strip()
            user.save(update_fields=["first_name", "last_name"])
        _user_email_sync(user, data)
        if data.get("phone"):
            user.phone = data["phone"]
            user.save(update_fields=["phone"])
        if data.get("title") is not None:
            profile.designation = data["title"]
        if data.get("bio") is not None:
            profile.bio = data["bio"]
        if data.get("subjects") is not None:
            profile.subjects = data["subjects"]
        if data.get("researchInterests") is not None:
            profile.research_interests = data["researchInterests"]
        if data.get("experience") is not None:
            profile.experience_years = int(data["experience"])
        if data.get("departmentName"):
            profile.department_name = data["departmentName"]
        if data.get("institutionName"):
            profile.institution_name = data["institutionName"]
        profile.save()
        return Response(acad._academician_block(user))


class AcademicianVerificationDecideView(APIView):
    permission_classes = (IsAcademician,)
    ACTIONS = {"approved", "flagged", "changes-requested"}

    @transaction.atomic
    def post(self, request, pk):
        action = request.data.get("action")
        if action not in self.ACTIONS:
            return Response({"detail": "action must be approved|flagged|changes-requested."}, status=400)
        try:
            verification = VerificationRequest.objects.select_related("evidence", "student").get(pk=pk)
        except VerificationRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        verification.status = action
        verification.reviewer = request.user
        verification.decided_at = timezone.now()
        verification.review_notes = request.data.get("notes", verification.review_notes)
        verification.save()

        # Approving the verification also verifies the linked evidence, which
        # upgrades every evidence-backed skill claim into the verified passport.
        if action == "approved" and verification.evidence:
            evidence = verification.evidence
            evidence.status = "verified"
            evidence.save(update_fields=["status"])
        return Response({"id": verification.id, "status": verification.status})


class AcademicianProjectDecideView(APIView):
    permission_classes = (IsAcademician,)
    ACTIONS = {"verified", "needs revision"}

    @transaction.atomic
    def post(self, request, pk):
        action = request.data.get("action")
        if action not in self.ACTIONS:
            return Response({"detail": "action must be verified|needs revision."}, status=400)
        try:
            submission = ProjectSubmission.objects.select_related("student").get(pk=pk)
        except ProjectSubmission.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        submission.status = action
        submission.reviewer = request.user
        submission.review_comment = request.data.get("notes", submission.review_comment)
        submission.save()
        if action == "verified":
            # Claim the demonstrated skill with evidence provenance: the project
            # submission itself becomes the evidence record.
            claim = submission.student.skill_claims.filter(skill=submission.project.target_skill).first()
            evidence, _ = EvidenceItem.objects.get_or_create(
                student=submission.student,
                title=submission.project.title,
                defaults={
                    "kind": "Project",
                    "issuer": request.user.display_name,
                    "status": "verified",
                    "description": submission.project.description,
                },
            )
            if claim:
                claim.origin = "evidence"
                claim.evidence = evidence
                claim.confidence = max(claim.confidence, 80)
                claim.save()
            else:
                submission.student.skill_claims.create(
                    skill=submission.project.target_skill,
                    origin="evidence",
                    evidence=evidence,
                    confidence=80,
                )
        return Response({"id": submission.id, "status": submission.status})


class AcademicianOpportunityListCreateView(APIView):
    permission_classes = (IsAcademician,)

    def get(self, request):
        from apps.governance.models import AcademicianOpportunity

        rows = []
        for o in AcademicianOpportunity.objects.order_by("-created_at"):
            rows.append(
                {
                    "id": f"ao-{o.id}",
                    "title": o.title,
                    "category": o.category,
                    "organizer": o.organizer,
                    "location": o.location,
                    "duration": o.duration,
                    "deadline": o.deadline.isoformat() if o.deadline else "",
                    "description": o.description,
                    "skillsRelevant": o.skills_relevant,
                    "status": o.status,
                    "interested": o.interested,
                }
            )
        return Response(rows)

    @transaction.atomic
    def post(self, request):
        data = request.data
        opportunity = AcademicianOpportunity.objects.create(
            category=data.get("category", "FDP"),
            title=data["title"],
            organizer=data.get("organizer", ""),
            location=data.get("location", ""),
            duration=data.get("duration", ""),
            deadline=data.get("deadline") or None,
            description=data.get("description", ""),
            skills_relevant=data.get("skillsRelevant", []),
            status=data.get("status", "open"),
            interested=int(data.get("interested", 0)),
            posted_by=request.user,
        )
        return Response({"id": f"ao-{opportunity.id}", "created": True}, status=201)


# ---------------------------------------------------------------------------
# INSTITUTION ADMIN
# ---------------------------------------------------------------------------


class InstitutionDashboardView(APIView):
    permission_classes = (IsInstitutionAdmin,)

    def get(self, request):
        return Response(inst.build_institution_dashboard(request.user))


class InstitutionProfileView(APIView):
    permission_classes = (IsInstitutionAdmin,)

    def get(self, request):
        return Response(inst._institution_block(request.user.institution_admin_profile.institution))

    @transaction.atomic
    def patch(self, request):
        institution = request.user.institution_admin_profile.institution
        if institution is None:
            return Response({"detail": "No institution linked to this admin."}, status=400)
        data = request.data
        for field in ("name", "location", "type", "website", "email", "phone"):
            if field in data:
                setattr(institution, field, data[field])
        if data.get("establishedYear"):
            institution.established_year = int(data["establishedYear"])
        institution.save()
        return Response(inst._institution_block(institution))


class InstitutionAnomalyReviewView(APIView):
    permission_classes = (IsInstitutionAdmin,)

    @transaction.atomic
    def post(self, request, pk):
        action = request.data.get("action")
        if action not in ("resolve", "escalate"):
            return Response({"detail": "action must be resolve|escalate."}, status=400)
        try:
            flag = AnomalyFlag.objects.get(pk=pk)
        except AnomalyFlag.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        flag.status = "resolved" if action == "resolve" else "escalated"
        flag.decided_at = timezone.now()
        flag.decided_by = request.user
        flag.resolution_note = request.data.get("note", flag.resolution_note)
        flag.save()
        return Response({"id": flag.id, "status": flag.status})


class InstitutionReportGenerateView(APIView):
    permission_classes = (IsInstitutionAdmin,)

    @transaction.atomic
    def post(self, request):
        institution = request.user.institution_admin_profile.institution
        if institution is None:
            return Response({"detail": "No institution linked."}, status=400)
        report_type = request.data.get("type", "Placement")
        if report_type not in ReportType.values:
            return Response({"detail": f"Unknown report type {report_type}."}, status=400)
        students = User.objects.filter(role="student", student_profile__institution=institution)
        placements = Placement.objects.filter(student__in=students)
        report = InstitutionalReport.objects.create(
            institution=institution,
            title=f"{institution.initials or institution.name} · {report_type} report",
            type=report_type,
            period=request.data.get("period", "Latest"),
            departments=["All"],
            summary=f"Generated from live data across {len(students)} students and {placements.count()} recorded engagements.",
            key_findings=[
                f"{placements.count()} placements/internships recorded",
                f"{students.count()} active student profiles",
            ],
            status="ready",
        )
        return Response({"id": f"rpt-{report.id}", "status": "ready"}, status=201)


# ---------------------------------------------------------------------------
# PUBLIC CATALOG (skills / roles / resources / institutions)
# ---------------------------------------------------------------------------


class SkillListView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response(
            [
                {"id": s.id, "taxonomyId": s.taxonomy_id, "name": s.name, "category": s.category}
                for s in Skill.objects.order_by("name")
            ]
        )


class TargetRoleListView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        rows = []
        for role in TargetRole.objects.prefetch_related("required_skills__skill").order_by("name"):
            rows.append(
                {
                    "id": role.id,
                    "name": role.name,
                    "description": role.description,
                    "requiredSkills": [
                        {
                            "skill": r.skill.name,
                            "priority": r.priority,
                            "minProficiency": r.min_proficiency,
                        }
                        for r in role.required_skills.all()
                    ],
                }
            )
        return Response(rows)


class InstitutionListView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response(
            [
                {"id": i.id, "name": i.name, "initials": i.initials, "location": i.location}
                for i in Institution.objects.all()
            ]
        )


class DepartmentListView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        depts = Department.objects.select_related("institution").order_by("institution_id", "name")
        return Response(
            [
                {
                    "id": d.id,
                    "name": d.name,
                    "institutionId": d.institution_id,
                    "institutionName": d.institution.name,
                }
                for d in depts
            ]
        )


class LearningResourceListView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        rows = []
        for r in LearningResource.objects.select_related("closes_gap").order_by("id"):
            rows.append(
                {
                    "id": r.id,
                    "title": r.title,
                    "kind": r.kind,
                    "provider": r.provider,
                    "duration": r.duration,
                    "rating": float(r.rating),
                    "url": r.url,
                    "why": r.why,
                    "closesGap": r.closes_gap.name if r.closes_gap else r.closes_gap_name,
                    "boostPoints": r.boost_points,
                }
            )
        return Response(rows)


# ---------------------------------------------------------------------------
# Health / readiness probe (used by Docker healthcheck + load balancers)
# ---------------------------------------------------------------------------


class HealthView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        """200 when the app + database are reachable, 503 otherwise."""
        from django.db import connection

        db_ok = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception:  # noqa: BLE001 - report any failure as unhealthy
            db_ok = False
        if not db_ok:
            return Response(
                {"status": "degraded", "database": "error"},
                status=503,
            )
        return Response({"status": "ok", "database": "ok"})


# ---------------------------------------------------------------------------
# Generic settings endpoint (best-effort patch for dashboards' Settings tabs)
# ---------------------------------------------------------------------------


class SettingsView(APIView):
    permission_classes = (IsAuthenticated,)

    @transaction.atomic
    def patch(self, request):
        """Thin dispatcher to the role profile so Settings tabs persist."""
        role = request.user.role
        if role == "student":
            return StudentProfileView().patch(request)
        if role == "industry":
            return IndustryProfileView().patch(request)
        if role == "academician":
            return AcademicianProfileView().patch(request)
        if role == "institution_admin":
            return InstitutionProfileView().patch(request)
        return Response({"detail": "Role not supported."}, status=400)
