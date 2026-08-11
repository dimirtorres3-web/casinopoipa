import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "casinopoipa.settings")
application = get_wsgi_application()

import django
from django.core.management import call_command

django.setup()
try:
    call_command("migrate", interactive=False)
    print("Base de datos en la nube activada con éxito.")
except Exception as e:
    print("Error al migrar:", e)
