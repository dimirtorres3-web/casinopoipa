import urllib.request, ssl
urls = [
 'https://web-production-2196be.up.railway.app/admin-panel/',
 'https://web-production-2196be.up.railway.app/casino/admin-panel/',
 'https://web-production-2196be.up.railway.app/admin/',
 'https://web-production-2196be.up.railway.app/casino/',
 'https://web-production-2196be.up.railway.app/login/',
 'https://web-production-2196be.up.railway.app/casino/login/',
]
ctx = ssl.create_default_context()
for u in urls:
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'curl/7.64.1'})
        r = urllib.request.urlopen(req, timeout=10, context=ctx)
        print(u, '->', r.getcode(), '->', r.geturl())
    except Exception as e:
        print(u, '-> ERROR ->', repr(e))
