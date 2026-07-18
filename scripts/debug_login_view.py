import os
import traceback
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'casinopoipa.settings')
import django
django.setup()
from django.test import RequestFactory
from casino import views

rf = RequestFactory()
req = rf.get('/casino/login/')
req.user = None
try:
    resp = views.login_view(req)
    print('RESPONSE:', getattr(resp, 'status_code', None))
    try:
        print('TEMPLATE NAMES:', [t.name for t in getattr(resp, 'templates', [])])
    except Exception:
        pass
    print('CONTENT:\n')
    print(resp.content.decode(errors='replace')[:4000])
except Exception as e:
    traceback.print_exc()
    print('ERROR:', e)
