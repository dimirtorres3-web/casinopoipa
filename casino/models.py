from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from .fields import EncryptedDecimalField


def validar_edad_mayoria(value):
    if value < 18:
        raise ValidationError(_("Debes ser mayor de 18 años para registrarte."))


def banco_paraguay_choices():
    return [
        ("Bancospy", "Banco de Paraguay"),
        ("Avanzar", "Avanzar"),
        ("Regional", "Regional"),
        ("Visión", "Visión Banco"),
        ("Otros", "Otros bancos"),
    ]


class Player(AbstractUser):
    nombre = models.CharField(max_length=64, verbose_name=_("Nombres"))
    apellido = models.CharField(max_length=64, verbose_name=_("Apellidos"))
    edad = models.PositiveSmallIntegerField(verbose_name=_("Edad"), validators=[validar_edad_mayoria])
    sexo = models.CharField(max_length=16, choices=[("M", "Masculino"), ("F", "Femenino"), ("O", "Otro")], verbose_name=_("Sexo"))
    estado_civil = models.CharField(
        max_length=24,
        choices=[
            ("soltero", "Soltero"),
            ("casado", "Casado"),
            ("divorciado", "Divorciado"),
            ("viudo", "Viudo"),
            ("union_libre", "Unión libre"),
        ],
        verbose_name=_("Estado Civil"),
    )

    saldo = EncryptedDecimalField(
        max_digits=14,
        decimal_places=0,
        default=20000,
        verbose_name=_("Saldo Disponible (Gs.)"),
        help_text=_("Saldo cifrado en Guaraníes."),
    )
    recibio_regalo = models.BooleanField(
        default=False,
        verbose_name=_("Recibió bono de bienvenida"),
        help_text=_("Marca si el usuario obtuvo el regalo de los primeros registros."),
    )
    slot_play_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Jugadas consecutivas de tragamonedas"),
        help_text=_("Contador acumulado de giros de tragamonedas para habilitar jackpots de retención."),
    )

    REQUIRED_FIELDS = ["email", "nombre", "apellido", "edad", "sexo", "estado_civil"]

    class Meta:
        verbose_name = "Jugador"
        verbose_name_plural = "Jugadores"


class BankAccount(models.Model):
    player = models.OneToOneField(Player, on_delete=models.CASCADE, related_name="bank_account")
    banco = models.CharField(max_length=64, verbose_name=_("Banco de preferencia"))
    alias = models.CharField(max_length=64, verbose_name=_("Alias"), help_text=_("Ej. Ahorros personal"), blank=True, null=True)
    tipo_cuenta = models.CharField(max_length=32, verbose_name=_("Tipo de Cuenta"))
    numero_cuenta = models.CharField(max_length=32, verbose_name=_("Número de Cuenta"))
    titular = models.CharField(max_length=128, verbose_name=_("Nombre del Titular"))
    cedula = models.CharField(max_length=32, verbose_name=_("Cédula"))
    telefono = models.CharField(max_length=32, verbose_name=_("Teléfono / WhatsApp"))

    def __str__(self):
        return f"{self.player.username} - {self.banco}"

    class Meta:
        verbose_name = "Cuenta Bancaria"
        verbose_name_plural = "Cuentas Bancarias"


class Transaction(models.Model):
    STATUS_CHOICES = [
        ("pendiente", "Pendiente"),
        ("pagado", "Pagado"),
    ]
    ESTADO_CHOICES = [
        ("pendiente", "Pendiente"),
        ("aprobado", "Aprobado"),
        ("reembolsado", "Reembolsado"),
    ]
    TIPO_CHOICES = [
        ("recarga", "Recarga"),
        ("retiro", "Retiro"),
    ]

    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="transactions")
    tipo = models.CharField(max_length=12, choices=TIPO_CHOICES, verbose_name=_("Tipo"))
    monto = models.DecimalField(max_digits=14, decimal_places=0, verbose_name=_("Monto (Gs.)"))
    estado = models.CharField(max_length=16, choices=ESTADO_CHOICES, default="pendiente", verbose_name=_("Estado"))
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="pendiente", verbose_name=_("Estado de pago"))
    banco = models.CharField(max_length=64, blank=True, null=True, verbose_name=_("Banco"))
    tipo_cuenta = models.CharField(max_length=32, blank=True, null=True, verbose_name=_("Tipo de Cuenta"))
    numero_cuenta = models.CharField(max_length=32, blank=True, null=True, verbose_name=_("Número de Cuenta"))
    titular = models.CharField(max_length=128, blank=True, null=True, verbose_name=_("Nombre del Titular"))
    cedula = models.CharField(max_length=32, blank=True, null=True, verbose_name=_("Cédula"))
    telefono = models.CharField(max_length=32, blank=True, null=True, verbose_name=_("Teléfono / WhatsApp"))
    comprobante = models.ImageField(upload_to="comprobantes/%Y/%m/%d", null=True, blank=True, verbose_name=_("Comprobante"))
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name=_("Fecha de creación"))
    actualizado_en = models.DateTimeField(auto_now=True, verbose_name=_("Fecha de actualización"))

    def __str__(self):
        return f"{self.player.username} - {self.tipo} - {self.monto} Gs."

    class Meta:
        verbose_name = "Transacción"
        verbose_name_plural = "Transacciones"
