from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create the global superadmin user for Casinopoipa."

    def handle(self, *args, **options):
        User = get_user_model()
        email = "dimirtorres3@gmail.com"
        username = "dimirtorres3@gmail.com"
        password = "6569488Bt."

        user, created = User.objects.get_or_create(username=username, defaults={
            "email": email,
            "nombre": "Admin",
            "apellido": "Global",
            "edad": 30,
            "sexo": "M",
            "estado_civil": "soltero",
            "is_active": True,
            "is_staff": True,
            "is_superuser": True,
        })

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f"Created global superadmin user: {username}"
            ))
        else:
            updated = False
            if not user.is_active:
                user.is_active = True
                updated = True
            if not user.is_staff:
                user.is_staff = True
                updated = True
            if not user.is_superuser:
                user.is_superuser = True
                updated = True
            if user.email != email:
                user.email = email
                updated = True
            user.set_password(password)
            user.save()
            if updated:
                self.stdout.write(self.style.SUCCESS(
                    f"Updated global superadmin user: {username}"
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f"Global superadmin user already exists: {username}"
                ))
