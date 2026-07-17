from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Remove all non-admin users while preserving staff and superuser accounts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many non-admin users would be deleted without deleting them.",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        non_admin_users = User.objects.filter(is_staff=False, is_superuser=False)
        count = non_admin_users.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No non-admin users found to delete."))
            return

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING(
                f"Dry run: {count} non-admin user(s) would be deleted."
            ))
            return

        non_admin_users.delete()
        self.stdout.write(self.style.SUCCESS(
            f"Deleted {count} non-admin user(s) and preserved all admin accounts."
        ))
