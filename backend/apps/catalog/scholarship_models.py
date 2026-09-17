"""
Scholarship catalog — grounded, verifiable listings.

These are curated by staff (admin) and matched deterministically to the
student's course/department/skills. The LLM is only used to rank + explain
why a scholarship fits; the items themselves are never hallucinated.
"""

from django.db import models


class ScholarshipCategory(models.TextChoices):
    AYUSH = "AYUSH", "AYUSH"
    HEALTH = "Health", "Health"
    RESEARCH = "Research", "Research"
    MERIT = "Merit", "Merit"
    GENERAL = "General", "General"


class Scholarship(models.Model):
    title = models.CharField(max_length=240)
    provider = models.CharField(max_length=240)
    category = models.CharField(max_length=16, choices=ScholarshipCategory.choices, default=ScholarshipCategory.GENERAL)
    amount = models.CharField(max_length=120, blank=True, default="")  # e.g. "₹50,000/year"
    deadline = models.DateField(null=True, blank=True)
    url = models.URLField(blank=True, default="")
    eligibility = models.TextField(blank=True, default="")
    # Which courses this applies to, e.g. ["BAMS", "BPharm", "BSc"]. Empty = all.
    eligible_courses = models.JSONField(default=list, blank=True)
    # Optional skill relevance, e.g. ["Research Methodology", "Python"]. Empty = any.
    relevant_skills = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catalog_scholarship"
        ordering = ["-is_active", "title"]

    def __str__(self) -> str:
        return f"{self.title} — {self.provider}"
