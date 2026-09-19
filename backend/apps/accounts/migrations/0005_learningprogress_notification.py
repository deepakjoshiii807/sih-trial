from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_skillassessment"),
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="LearningProgress",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("completed_at", models.DateTimeField(auto_now_add=True)),
                ("notes", models.TextField(blank=True, default="")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="learning_progress", to=settings.AUTH_USER_MODEL)),
                ("resource", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="student_progress", to="catalog.learningresource")),
            ],
            options={
                "db_table": "accounts_learning_progress",
                "ordering": ["-completed_at"],
                "unique_together": {("student", "resource")},
            },
        ),
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("notification_type", models.CharField(choices=[
                    ("application_stage", "Application Stage Change"),
                    ("verification", "Verification Update"),
                    ("skill_verified", "Skill Verified"),
                    ("project_review", "Project Review"),
                    ("sla_breach", "SLA Breach"),
                    ("assessment", "Assessment"),
                    ("system", "System"),
                ], default="system", max_length=30)),
                ("title", models.CharField(max_length=200)),
                ("message", models.TextField(blank=True, default="")),
                ("link", models.CharField(blank=True, default="", max_length=300)),
                ("read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notifications", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "accounts_notification",
                "ordering": ["-created_at"],
            },
        ),
    ]
