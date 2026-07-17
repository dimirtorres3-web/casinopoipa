from django.urls import path
from . import views

app_name = "casino"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("registro/", views.register, name="registro"),
    path("verificar-correo/", views.verify_email, name="verify_email"),
    path("jugar/", views.play_game, name="play_game"),
    path("api/play/", views.api_play, name="api_play"),
    path("api/withdraw/", views.api_withdraw, name="api_withdraw"),
    path("tragamonedas/", views.tragamonedas, name="tragamonedas"),
    path("poker/", views.poker, name="poker"),
    path("blackjack/", views.blackjack, name="blackjack"),
    path("bingo/", views.bingo, name="bingo"),
    path("ruleta/", views.ruleta, name="ruleta"),
    path("cajero/", views.cashier, name="cajero"),
    path("admin-panel/", views.admin_panel, name="admin_panel"),
    path("admin-panel/clientes/", views.clientes, name="clientes"),
    path("admin-panel/aprobar/<int:transaction_id>/", views.approve_transaction, name="approve_transaction"),
    path("admin-panel/reembolso/<int:transaction_id>/", views.refund_transaction, name="refund_transaction"),
    path("admin-panel/pagar/<int:transaction_id>/", views.mark_transaction_paid, name="mark_transaction_paid"),
    path("health/", views.health_check, name="health"),
]
