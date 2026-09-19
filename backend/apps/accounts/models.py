"""
User model + the four role profiles (student / industry / academician /
institution-admin). One user account maps to exactly one role, and each role
has a dedicated one-to-one profile with the fields its dashboard needs.
"""
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserManager(BaseUserManager):
    """
    Manager for the email-authenticated User (the model has no username field,
    so Django's stock UserManager — which requires a positional username —
    cannot be used).
    """

    use_in_migrations = True

    def _create_user(self, email: str, password: str, **extra_fields):
        if not email:
            raise ValueError("The given email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str = None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class Role(models.TextChoices):
    STUDENT = "student", "Student"
    INDUSTRY = "industry", "Industry"
    ACADEMICIAN = "academician", "Academician"
    INSTITUTION_ADMIN = "institution_admin", "Institution Admin"
    ADMIN = "admin", "Platform Admin"


class User(AbstractUser):
    """Email-authenticated user (no username field)."""

    username = None
    email = models.EmailField("email address", unique=True)
    # Firebase Authentication uid. Accounts are created client-side; this column
    # links the Django row to that account on the first authenticated request
    # (see apps/accounts/firebase_auth.py). NULL for seeded/demo users, which is
    # why the uniqueness constraint is nullable.
    firebase_uid = models.CharField(
        max_length=128, unique=True, null=True, blank=True, default=None
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
        db_index=True,
    )
    phone = models.CharField(max_length=30, blank=True, default="")
    is_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = "accounts_user"

    @property
    def display_name(self) -> str:
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.first_name or self.email.split("@")[0]

    @property
    def initials(self) -> str:
        parts = [p for p in self.display_name.replace(".", " ").split() if p]
        if len(parts) >= 2:
            return (parts[0][0] + parts[1][0]).upper()
        return (self.display_name[:2] or "?").upper()

    def __str__(self) -> str:
        return f"{self.display_name} <{self.email}> ({self.role})"


class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    roll_number = models.CharField(max_length=40, blank=True, default="")
    institution = models.ForeignKey(
        "catalog.Institution", null=True, blank=True, on_delete=models.SET_NULL, related_name="students"
    )
    institution_name = models.CharField(max_length=200, blank=True, default="")
    department = models.ForeignKey(
        "catalog.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="student_members"
    )
    department_name = models.CharField(max_length=120, blank=True, default="")
    course = models.CharField(max_length=120, blank=True, default="BAMS")
    year = models.CharField(max_length=40, blank=True, default="3rd Year")
    graduation_year = models.PositiveIntegerField(null=True, blank=True)
    location = models.CharField(max_length=160, blank=True, default="")
    bio = models.TextField(blank=True, default="")
    career_interests = models.JSONField(default=list, blank=True)
    target_role = models.ForeignKey(
        "catalog.TargetRole", null=True, blank=True, on_delete=models.SET_NULL, related_name="students_targeting"
    )
    target_role_name = models.CharField(max_length=160, blank=True, default="")

    @property
    def display_institution(self) -> str:
        return self.institution.name if self.institution else self.institution_name

    @property
    def display_department(self) -> str:
        return self.department.name if self.department else self.department_name

    class Meta:
        db_table = "accounts_student_profile"


class IndustryProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="industry_profile")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    domain = models.CharField(max_length=160, blank=True, default="")
    org_type = models.CharField(max_length=120, blank=True, default="")
    location = models.CharField(max_length=160, blank=True, default="")
    website = models.URLField(blank=True, default="")
    company_email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    contact_person = models.CharField(max_length=160, blank=True, default="")
    verified = models.BooleanField(default=False)
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    size = models.CharField(max_length=80, blank=True, default="")

    class Meta:
        db_table = "accounts_industry_profile"

    def __str__(self) -> str:
        return self.name


class AcademicianProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="academician_profile")
    designation = models.CharField(max_length=160, blank=True, default="")
    institution = models.ForeignKey(
        "catalog.Institution", null=True, blank=True, on_delete=models.SET_NULL, related_name="faculty"
    )
    institution_name = models.CharField(max_length=200, blank=True, default="")
    department = models.ForeignKey(
        "catalog.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="academic_members"
    )
    department_name = models.CharField(max_length=120, blank=True, default="")
    subjects = models.JSONField(default=list, blank=True)
    research_interests = models.JSONField(default=list, blank=True)
    experience_years = models.PositiveIntegerField(default=0)
    bio = models.TextField(blank=True, default="")

    @property
    def display_institution(self) -> str:
        return self.institution.name if self.institution else self.institution_name

    @property
    def display_department(self) -> str:
        return self.department.name if self.department else self.department_name

    class Meta:
        db_table = "accounts_academician_profile"


class InstitutionAdminProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="institution_admin_profile")
    institution = models.ForeignKey(
        "catalog.Institution", null=True, blank=True, on_delete=models.SET_NULL, related_name="admins"
    )
    institution_name = models.CharField(max_length=200, blank=True, default="")
    title = models.CharField(max_length=160, blank=True, default="")

    @property
    def display_institution(self) -> str:
        return self.institution.name if self.institution else self.institution_name

    class Meta:
        db_table = "accounts_institution_admin_profile"


class SkillAssessment(models.Model):
    """
    A timed, tab-locked skill assessment generated after AI skill extraction.

    The frontend generates questions via the AI gateway, presents them in a
    locked full-screen modal, then POSTs the student's answers here. The
    backend validates timing, grades answers, and records the score.
    """

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="skill_assessments")
    source_document = models.CharField(max_length=200, blank=True, default="")
    skills_assessed = models.JSONField(default=list, blank=True)
    questions = models.JSONField(default=list, blank=True)
    answers = models.JSONField(default=list, blank=True)
    score = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)
    time_limit_seconds = models.PositiveIntegerField(default=300)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    tab_switches = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=[("in_progress", "In Progress"), ("submitted", "Submitted"), ("timed_out", "Timed Out")],
        default="in_progress",
    )

    class Meta:
        db_table = "accounts_skill_assessment"
        ordering = ["-started_at"]

    def __str__(self) -> str:
        return f"Assessment #{self.pk} for {self.student.email} ({self.status})"


class LearningProgress(models.Model):
    """Tracks which learning recommendations a student has completed,
    enabling the Skill Gap Closure Tracker feature."""

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="learning_progress")
    resource = models.ForeignKey(
        "catalog.LearningResource", on_delete=models.CASCADE, related_name="student_progress"
    )
    completed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "accounts_learning_progress"
        unique_together = ("student", "resource")
        ordering = ["-completed_at"]

    def __str__(self) -> str:
        return f"{self.student.email} completed {self.resource.title}"


class Notification(models.Model):
    """In-app notifications for all user roles."""

    class NotificationType(models.TextChoices):
        APPLICATION_STAGE = "application_stage", "Application Stage Change"
        VERIFICATION = "verification", "Verification Update"
        SKILL_VERIFIED = "skill_verified", "Skill Verified"
        PROJECT_REVIEW = "project_review", "Project Review"
        SLA_BREACH = "sla_breach", "SLA Breach"
        ASSESSMENT = "assessment", "Assessment"
        SYSTEM = "system", "System"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
    )
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True, default="")
    link = models.CharField(max_length=300, blank=True, default="")
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_notification"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Notification for {self.user.email}: {self.title}"


# Helper to create notifications from anywhere

def create_notification(user, notification_type, title, message="", link=""):
    """Create a notification for a user. Safe to call from any context."""
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link,
    )
