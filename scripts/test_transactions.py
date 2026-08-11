from django.test import Client
from django.contrib.auth import get_user_model
from casino.models import Transaction

User = get_user_model()
email = "testuser_integration@example.com"
# Clean up existing test user if present
User.objects.filter(email__iexact=email).delete()

# Create test user with sufficient balance
user = User.objects.create_user(username=email, email=email, password="testpass123", nombre="Test", apellido="User", edad=30, sexo="M", estado_civil="soltero")
user.saldo = 200000
user.save()
print("Created user:", user.email, "saldo:", int(user.saldo))

c = Client()
# Force login to avoid dealing with authentication form nuances
c.force_login(user)

# Simulate deposit (recarga)
resp = c.post('/cajero/', {'action': 'recarga', 'tipo': 'recarga', 'monto': '50000'}, follow=True)
print('Deposit response code:', resp.status_code)

dep = Transaction.objects.filter(player=user, tipo='recarga').order_by('-creado_en').first()
if dep:
    print('Deposit transaction:', dep.id, dep.estado, dep.status, int(dep.monto))
else:
    print('No deposit transaction created')

# Simulate withdrawal (retiro)
resp2 = c.post('/cajero/', {'action': 'retiro', 'tipo': 'retiro', 'monto': '60000', 'banco': 'TestBank', 'tipo_cuenta': 'Ahorros', 'numero_cuenta': '123', 'titular': 'Test User', 'cedula': '123', 'telefono': '000'}, follow=True)
print('Withdraw response code:', resp2.status_code)

wit = Transaction.objects.filter(player=user, tipo='retiro').order_by('-creado_en').first()
if wit:
    print('Withdraw transaction:', wit.id, wit.estado, wit.status, int(wit.monto))
else:
    print('No withdraw transaction created')

user.refresh_from_db()
print('Final user saldo:', int(user.saldo))
