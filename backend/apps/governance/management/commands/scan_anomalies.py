"""Institution-wide integrity scan (one-off / cron sweep).

Runs the rule engine from apps.governance.services over every institution's
students and reports the flags it created.

    python manage.py scan_anomalies
"""
from django.core.management.base import BaseCommand

from apps.catalog.models import Institution
from apps.governance.services import scan_institution


class Command(BaseCommand):
    help = "Run the evidence-integrity rule engine across all institutions."

    def handle(self, *args, **options):
        total = 0
        for institution in Institution.objects.all().order_by("name"):
            created = scan_institution(institution)
            total += len(created)
            if created:
                self.stdout.write(
                    f"  {institution.name}: {len(created)} new flag(s)"
                )
        self.stdout.write(self.style.SUCCESS(f"Scan complete — {total} new flag(s) created."))
