from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import BankAccount, Player, Transaction


@admin.register(Player)
class PlayerAdmin(UserAdmin):
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Información personal", {"fields": ("nombre", "apellido", "email", "edad", "sexo", "estado_civil", "saldo")} ),
        ("Permisos", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "password1", "password2", "nombre", "apellido", "edad", "sexo", "estado_civil", "saldo"),
        }),
    )
    list_display = ("username", "email", "nombre", "apellido", "saldo", "is_staff")
    search_fields = ("username", "email", "nombre", "apellido")


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ("player", "banco", "tipo_cuenta", "numero_cuenta")
    search_fields = ("player__username", "titular", "cedula")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("player", "tipo", "monto", "estado", "creado_en")
    list_filter = ("estado", "tipo")
    readonly_fields = ("creado_en", "actualizado_en")
