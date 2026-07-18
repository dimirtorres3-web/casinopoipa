from decimal import Decimal
from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError
from .models import BankAccount, Player, Transaction


class PlayerRegistrationForm(UserCreationForm):
    username = forms.CharField(widget=forms.HiddenInput(), required=False)
    email = forms.EmailField(label="Correo electrónico")
    nombre = forms.CharField(label="Nombres", max_length=64)
    apellido = forms.CharField(label="Apellidos", max_length=64)
    edad = forms.IntegerField(label="Edad", min_value=18)
    sexo = forms.ChoiceField(label="Sexo", choices=[("M", "Masculino"), ("F", "Femenino"), ("O", "Otro")])
    estado_civil = forms.ChoiceField(
        label="Estado Civil",
        choices=[
            ("soltero", "Soltero"),
            ("casado", "Casado"),
            ("divorciado", "Divorciado"),
            ("viudo", "Viudo"),
            ("union_libre", "Unión libre"),
        ],
    )

    class Meta:
        model = Player
        fields = [
            "username",
            "email",
            "nombre",
            "apellido",
            "edad",
            "sexo",
            "estado_civil",
            "password1",
            "password2",
        ]

    def clean_username(self):
        return self.cleaned_data.get("email", "").strip().lower()

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if email:
            return email
        return email

    def save(self, commit=True):
        player = super().save(commit=False)
        email = self.cleaned_data["email"].strip().lower()
        player.email = email
        player.username = email
        player.nombre = self.cleaned_data["nombre"]
        player.apellido = self.cleaned_data["apellido"]
        player.edad = self.cleaned_data["edad"]
        player.sexo = self.cleaned_data["sexo"]
        player.estado_civil = self.cleaned_data["estado_civil"]
        if commit:
            player.save()
        return player


class BankAccountForm(forms.ModelForm):
    class Meta:
        model = BankAccount
        fields = ["banco", "alias", "tipo_cuenta", "numero_cuenta", "titular", "cedula", "telefono"]
        widgets = {
            "banco": forms.TextInput(attrs={"class": "form-input", "placeholder": "Ej. Banco Continental"}),
            "alias": forms.TextInput(attrs={"class": "form-input", "placeholder": "Alias de la cuenta"}),
            "tipo_cuenta": forms.TextInput(attrs={"class": "form-input", "placeholder": "Cuenta corriente / ahorro"}),
            "numero_cuenta": forms.TextInput(attrs={"class": "form-input", "placeholder": "Número de cuenta"}),
            "titular": forms.TextInput(attrs={"class": "form-input", "placeholder": "Nombre del titular"}),
            "cedula": forms.TextInput(attrs={"class": "form-input", "placeholder": "Cédula de identidad"}),
            "telefono": forms.TextInput(attrs={"class": "form-input", "placeholder": "Whatsapp o teléfono"}),
        }


class LoginForm(forms.Form):
    email = forms.EmailField(
        label="Correo electrónico",
        widget=forms.EmailInput(attrs={"autofocus": True, "placeholder": "ejemplo@correo.com", "class": "form-input"}),
    )
    password = forms.CharField(label="Contraseña", widget=forms.PasswordInput(attrs={"class": "form-input"}))

    def clean_email(self):
        return self.cleaned_data["email"].strip().lower()


class VerificationCodeForm(forms.Form):
    code = forms.CharField(
        label="Código de verificación",
        max_length=6,
        min_length=6,
        widget=forms.TextInput(
            attrs={
                "autocomplete": "one-time-code",
                "placeholder": "000000",
                "class": "form-input",
            }
        ),
    )

    def clean_code(self):
        return self.cleaned_data["code"].strip()


class TransactionForm(forms.ModelForm):
    comprobante = forms.ImageField(required=False, label="Comprobante de transferencia")

    class Meta:
        model = Transaction
        fields = ["tipo", "monto", "comprobante"]
        widgets = {
            "tipo": forms.Select(attrs={"class": "form-input"}),
            "monto": forms.NumberInput(attrs={"class": "form-input", "min": "30000"}),
            "comprobante": forms.ClearableFileInput(attrs={"class": "form-input"}),
        }

    def clean_monto(self):
        monto = self.cleaned_data["monto"]
        tipo = self.cleaned_data.get("tipo")
        if tipo == "recarga":
            if monto < 30000 or monto > 1500000:
                raise ValidationError("El monto de recarga debe estar entre 30.000 Gs. y 1.500.000 Gs.")
        elif tipo == "retiro":
            if monto < 30000:
                raise ValidationError("El retiro mínimo es de 30.000 Gs.")
        return monto


class WithdrawalForm(TransactionForm):
    class Meta(TransactionForm.Meta):
        fields = [
            "tipo",
            "monto",
            "banco",
            "alias",
            "tipo_cuenta",
            "numero_cuenta",
            "titular",
            "cedula",
            "telefono",
            "comprobante",
        ]
        widgets = {
            "tipo": forms.HiddenInput(),
            "monto": forms.NumberInput(attrs={"class": "form-input", "min": "30000", "placeholder": "Monto para retirar"}),
            "banco": forms.TextInput(attrs={"class": "form-input", "placeholder": "Nombre del banco"}),
            "alias": forms.TextInput(attrs={"class": "form-input", "placeholder": "Alias de la cuenta"}),
            "tipo_cuenta": forms.TextInput(attrs={"class": "form-input", "placeholder": "Tipo de cuenta"}),
            "numero_cuenta": forms.TextInput(attrs={"class": "form-input", "placeholder": "Número de cuenta"}),
            "titular": forms.TextInput(attrs={"class": "form-input", "placeholder": "Nombre del titular"}),
            "cedula": forms.TextInput(attrs={"class": "form-input", "placeholder": "Cédula de identidad"}),
            "telefono": forms.TextInput(attrs={"class": "form-input", "placeholder": "Whatsapp o teléfono"}),
            "comprobante": forms.ClearableFileInput(attrs={"class": "form-input"}),
        }

    def clean_monto(self):
        monto = self.cleaned_data["monto"]
        if monto < 30000:
            raise ValidationError("El retiro mínimo es de 30.000 Gs.")
        return monto
