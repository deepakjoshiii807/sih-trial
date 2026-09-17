"""
Role profile helpers shared by the authentication paths.

Every User has exactly one role and (usually) one matching profile row holding
the fields its dashboard reads. Accounts created by Firebase Authentication
arrive with the role chosen in the UI, so the profile row is created lazily on
the first authenticated request.
"""
from __future__ import annotations

from .models import (
    AcademicianProfile,
    IndustryProfile,
    InstitutionAdminProfile,
    Role,
    StudentProfile,
    User,
)


def ensure_role_profile(user: User) -> None:
    """Create the profile row for `user.role` if it is missing (idempotent)."""
    if user.role == Role.STUDENT:
        StudentProfile.objects.get_or_create(user=user)
    elif user.role == Role.INDUSTRY:
        IndustryProfile.objects.get_or_create(
            user=user,
            defaults={
                "name": user.display_name,
                "company_email": user.email,
                "phone": user.phone,
            },
        )
    elif user.role == Role.ACADEMICIAN:
        AcademicianProfile.objects.get_or_create(user=user)
    elif user.role == Role.INSTITUTION_ADMIN:
        InstitutionAdminProfile.objects.get_or_create(user=user, defaults={"title": "Administrator"})
