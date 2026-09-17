# Generated for Learn2Lead — grounded scholarship catalog

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Scholarship",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=240)),
                ("provider", models.CharField(max_length=240)),
                ("category", models.CharField(choices=[("AYUSH", "AYUSH"), ("Health", "Health"), ("Research", "Research"), ("Merit", "Merit"), ("General", "General")], default="General", max_length=16)),
                ("amount", models.CharField(blank=True, default="", max_length=120)),
                ("deadline", models.DateField(blank=True, null=True)),
                ("url", models.URLField(blank=True, default="")),
                ("eligibility", models.TextField(blank=True, default="")),
                ("eligible_courses", models.JSONField(blank=True, default=list)),
                ("relevant_skills", models.JSONField(blank=True, default=list)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "catalog_scholarship",
                "ordering": ["-is_active", "title"],
            },
        ),
    ]
