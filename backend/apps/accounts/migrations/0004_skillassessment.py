from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_user_firebase_uid"),
    ]

    operations = [
        migrations.CreateModel(
            name="SkillAssessment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source_document", models.CharField(blank=True, default="", max_length=200)),
                ("skills_assessed", models.JSONField(blank=True, default=list)),
                ("questions", models.JSONField(blank=True, default=list)),
                ("answers", models.JSONField(blank=True, default=list)),
                ("score", models.PositiveIntegerField(default=0)),
                ("total_questions", models.PositiveIntegerField(default=0)),
                ("time_limit_seconds", models.PositiveIntegerField(default=300)),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("tab_switches", models.PositiveIntegerField(default=0)),
                ("status", models.CharField(choices=[("in_progress", "In Progress"), ("submitted", "Submitted"), ("timed_out", "Timed Out")], default="in_progress", max_length=20)),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="skill_assessments", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "accounts_skill_assessment",
                "ordering": ["-started_at"],
            },
        ),
    ]
