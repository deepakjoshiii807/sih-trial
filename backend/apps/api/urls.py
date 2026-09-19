from django.urls import path

from apps.accounts import auth_views
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from . import ai as ai_views
from . import scholarship_views
from . import views

urlpatterns = [
    # ---- Health probe ---------------------------------------------------
    path("health", views.HealthView.as_view()),
    # ---- Auth (Firebase ID tokens) --------------------------------------
    # register/token* are legacy SimpleJWT endpoints: the SPA authenticates with
    # Firebase (see apps/accounts/firebase_auth.py). They stay in place for the
    # seeded demo accounts and the API test suite.
    path("auth/register", auth_views.RegisterView.as_view()),
    path("auth/token", auth_views.EmailTokenObtainPairView.as_view()),
    path("auth/token/refresh", TokenRefreshView.as_view()),
    path("auth/token/verify", TokenVerifyView.as_view()),
    path("auth/me", auth_views.MeView.as_view()),
    path("auth/sync", auth_views.SyncView.as_view()),
    path("auth/demo-accounts", auth_views.DemoAccountsView.as_view()),
    path("settings", views.SettingsView.as_view()),
    # ---- AI (server-side VLY gateway proxy) -----------------------------
    path("ai/completion", ai_views.AICompletionView.as_view()),
    # ---- Catalog (read-only reference data) -----------------------------
    path("catalog/skills", views.SkillListView.as_view()),
    path("catalog/roles", views.TargetRoleListView.as_view()),
    path("catalog/institutions", views.InstitutionListView.as_view()),
    path("catalog/departments", views.DepartmentListView.as_view()),
    path("catalog/resources", views.LearningResourceListView.as_view()),
    path("catalog/scholarships", scholarship_views.ScholarshipListView.as_view()),
    # ---- Student --------------------------------------------------------
    path("student/dashboard", views.StudentDashboardView.as_view()),
    path("student/profile", views.StudentProfileView.as_view()),
    path("student/applications", views.StudentApplyView.as_view()),
    path("student/projects/<int:pk>/submit", views.StudentSubmitProjectView.as_view()),
    path("student/evidence", views.StudentEvidenceUploadView.as_view()),
    path("student/extracted-skills", views.StudentExtractedSkillsView.as_view()),
    path("student/skills", views.StudentAddSkillView.as_view()),
    path("student/assessment/generate", views.StudentAssessmentGenerateView.as_view()),
    path("student/assessment/<int:pk>/submit", views.StudentAssessmentSubmitView.as_view()),
    path("student/ratings", views.StudentRatingCreateView.as_view()),
    path("student/scholarships", scholarship_views.StudentScholarshipListView.as_view()),
    path("student/recommendations/<int:pk>/complete", views.StudentRecommendationCompleteView.as_view()),
    path("student/progress", views.StudentProgressView.as_view()),
    # ---- Industry -------------------------------------------------------
    path("industry/dashboard", views.IndustryDashboardView.as_view()),
    path("industry/profile", views.IndustryProfileView.as_view()),
    path("industry/opportunities", views.IndustryOpportunityListCreateView.as_view()),
    path("industry/opportunities/<int:pk>", views.IndustryOpportunityDetailView.as_view()),
    path("industry/applications/<int:pk>/<str:action>", views.IndustryApplicationActionView.as_view()),
    path("industry/ratings", views.IndustryRatingCreateView.as_view()),
    # ---- Academician ----------------------------------------------------
    path("academician/dashboard", views.AcademicianDashboardView.as_view()),
    path("academician/profile", views.AcademicianProfileView.as_view()),
    path("academician/verifications/<int:pk>/decide", views.AcademicianVerificationDecideView.as_view()),
    path("academician/projects/<int:pk>/decide", views.AcademicianProjectDecideView.as_view()),
    path("academician/opportunities", views.AcademicianOpportunityListCreateView.as_view()),
    # ---- Institution admin ----------------------------------------------
    path("institution/dashboard", views.InstitutionDashboardView.as_view()),
    path("institution/profile", views.InstitutionProfileView.as_view()),
    path("institution/anomalies/<int:pk>/review", views.InstitutionAnomalyReviewView.as_view()),
    path("institution/reports/generate", views.InstitutionReportGenerateView.as_view()),
    # ---- Notifications ------------------------------------------------
    path("notifications", views.NotificationListView.as_view()),
    path("notifications/<int:pk>/read", views.NotificationReadView.as_view()),
    path("notifications/read-all", views.NotificationReadAllView.as_view()),
]
