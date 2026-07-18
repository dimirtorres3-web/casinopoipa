import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'casinopoipa.settings')
import django
django.setup()
from django.test import Client
c = Client()
try:
    r = c.get('/casino/login/')
    print('STATUS', r.status_code)
    print('TEMPLATES', [t.name for t in getattr(r, 'templates', [])])
    content = r.content.decode(errors='replace')
    print('CONTENT START:\n')
    print(content[:8000])
except Exception as e:
    import traceback
    traceback.print_exc()
    print('EXCEPTION', e)
