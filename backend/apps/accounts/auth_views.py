"""
Authentication endpoints.

The app authenticates with **Firebase Authentication** (see firebase_auth.py):
Firebase issues the ID token, Django verifies it and maps it onto a User row.

  GET  /api/auth/me              current user + role summary (Firebase token)
  POST /api/auth/sync            attach the chosen role/profile to the session

Legacy (kept for the seeded demo accounts and the API test suite — the SPA no
longer calls these):
  POST /api/auth/register        create account + role profile
  POST /api/auth/token           email + password -> access/refresh (SimpleJWT)
  POST /api/auth/token/refresh   refresh -> new access token
  POST /api/auth/token/verify    validate an access token
"""
from django.db import transaction
from rest_framework import serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView

from .models import (
    AcademicianProfile,
    IndustryProfile,
    InstitutionAdminProfile,
    Role,
    StudentProfile,
    User,
)
from .profiles import ensure_role_profile


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=Role.choices)
    name = serializers.CharField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(required=False, allow_blank=True, default="")

    # Optional role-specific payload (created lazily if provided).
    institution_id = serializers.IntegerField(required=False)
    department_id = serializers.IntegerField(required=False)
    roll_number = serializers.CharField(required=False, allow_blank=True, default="")
    course = serializers.CharField(required=False, allow_blank=True, default="BAMS")
    year = serializers.CharField(required=False, allow_blank=True, default="3rd Year")
    graduation_year = serializers.IntegerField(required=False)
    location = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()


class RegisterView(APIView):
    permission_classes = (AllowAny,)

    @transaction.atomic
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        first, _, last = data["name"].partition(" ")
        user = User.objects.create_user(
            email=data["email"],
            password=data["password"],
            role=data["role"],
            phone=data.get("phone", ""),
            first_name=first,
            last_name=last.strip(),
        )
        self._create_profile(user, data)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "name": user.display_name,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=201,
        )

    @staticmethod
    def _create_profile(user, data) -> None:
        if user.role == Role.STUDENT:
            StudentProfile.objects.create(
                user=user,
                institution_id=data.get("institution_id"),
                department_id=data.get("department_id"),
                roll_number=data.get("roll_number", ""),
                course=data.get("course", "BAMS"),
                year=data.get("year", "3rd Year"),
                graduation_year=data.get("graduation_year"),
                location=data.get("location", ""),
            )
        elif user.role == Role.INDUSTRY:
            IndustryProfile.objects.create(
                user=user,
                name=data.get("name") or user.display_name,
                company_email=user.email,
                phone=data.get("phone", ""),
            )
        elif user.role == Role.ACADEMICIAN:
            AcademicianProfile.objects.create(
                user=user,
                institution_id=data.get("institution_id"),
                department_id=data.get("department_id"),
                designation=data.get("designation", "Faculty"),
            )
        elif user.role == Role.INSTITUTION_ADMIN:
            InstitutionAdminProfile.objects.create(
                user=user,
                institution_id=data.get("institution_id"),
                title="Administrator",
            )


def serialize_me(user) -> dict:
    """The /auth/me payload — also returned by /auth/sync."""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.display_name,
        "initials": user.initials,
        "role": user.role,
        "is_verified": user.is_verified,
        "phone": user.phone,
        "firebase_linked": bool(user.firebase_uid),
    }


class MeView(APIView):
    """GET /api/auth/me — the profile behind the Firebase session."""

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(serialize_me(request.user))


class SyncSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=Role.choices, required=False)
    name = serializers.CharField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(required=False, allow_blank=True, default="")


class SyncView(APIView):
    """
    POST /api/auth/sync — attach the app-level profile to a Firebase session.

    Called by the client after sign-up (to record the chosen role) and on
    Google sign-in. Idempotent: the user row is created/linked by
    FirebaseAuthentication before this view runs, so it only fills in the
    role/profile details the token cannot carry.
    """

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = SyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user

        changed = []
        role = data.get("role")
        if role and user.role != role:
            user.role = role
            changed.append("role")
        phone = (data.get("phone") or "").strip()
        if phone and user.phone != phone:
            user.phone = phone
            changed.append("phone")
        name = (data.get("name") or "").strip()
        if name:
            first, _, last = name.partition(" ")
            if user.first_name != first or user.last_name != last.strip():
                user.first_name, user.last_name = first, last.strip()
                changed += ["first_name", "last_name"]
        if changed:
            user.save(update_fields=changed)

        ensure_role_profile(user)
        return Response(serialize_me(user))


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "email"


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class DemoAccountsView(APIView):
    """Public demo helper listing the seeded demo logins (dev only)."""

    permission_classes = (AllowAny,)

    def get(self, request):
        accounts = (
            User.objects.filter(email__endswith="@demo.aiia.local")
            .order_by("id")
            .values("email", "role", "display_name")
        )
        return Response(list(accounts))
