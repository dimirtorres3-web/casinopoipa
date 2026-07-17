from django.test import TestCase
from django.urls import reverse

from .models import Player


class ClientesPanelTests(TestCase):
    def setUp(self):
        self.admin = Player.objects.create_user(
            username="admin@example.com",
            email="admin@example.com",
            password="TestPassword123",
            nombre="Admin",
            apellido="Sistema",
            edad=30,
            sexo="M",
            estado_civil="soltero",
            is_staff=True,
            is_superuser=True,
        )
        self.client_user = Player.objects.create_user(
            username="cliente@example.com",
            email="cliente@example.com",
            password="TestPassword123",
            nombre="Cliente",
            apellido="Prueba",
            edad=25,
            sexo="F",
            estado_civil="casado",
        )

    def test_admin_can_open_clients_panel(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("casino:clientes"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Panel de clientes")
        self.assertContains(response, "cliente@example.com")

    def test_admin_can_toggle_player_active_state(self):
        self.client.force_login(self.admin)
        response = self.client.post(reverse("casino:toggle_player_status", args=[self.client_user.id]))
        self.assertEqual(response.status_code, 302)
        self.client_user.refresh_from_db()
        self.assertFalse(self.client_user.is_active)

        response = self.client.post(reverse("casino:toggle_player_status", args=[self.client_user.id]))
        self.assertEqual(response.status_code, 302)
        self.client_user.refresh_from_db()
        self.assertTrue(self.client_user.is_active)
