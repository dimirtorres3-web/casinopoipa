from decimal import Decimal
from typing import Any

from cryptography.fernet import InvalidToken
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from .utils import get_cipher


class EncryptedDecimalField(models.BinaryField):
    description = "Campo decimal cifrado con Fernet"

    def __init__(self, *args, max_digits: int = 14, decimal_places: int = 0, **kwargs: Any):
        self.max_digits = max_digits
        self.decimal_places = decimal_places
        super().__init__(*args, **kwargs)

    def get_prep_value(self, value: Any) -> bytes | None:
        if value is None:
            return None
        if isinstance(value, Decimal):
            value = str(value.normalize())
        else:
            value = str(value)
        cipher = get_cipher()
        return cipher.encrypt(value.encode())

    def from_db_value(self, value: bytes | None, expression, connection) -> Decimal | None:
        if value is None:
            return None
        cipher = get_cipher()
        # Accept bytes, memoryview or base64-encoded str stored in some DBs
        if isinstance(value, memoryview) or isinstance(value, bytearray):
            value = bytes(value)
        if isinstance(value, str):
            try:
                import base64

                value = base64.urlsafe_b64decode(value.encode())
            except Exception:
                value = value.encode()

        try:
            plain = cipher.decrypt(value)
            return Decimal(plain.decode())
        except (InvalidToken, ValueError):
            raise ValidationError("No se pudo descifrar el saldo almacenado.")

    def to_python(self, value: Any) -> Decimal | None:
        if value is None:
            return None
        if isinstance(value, Decimal):
            return value
        if isinstance(value, (bytes, memoryview, bytearray)):
            return self.from_db_value(bytes(value), None, None)
        return Decimal(str(value))

    def formfield(self, **kwargs: Any):
        defaults = {"form_class": models.DecimalField}
        defaults.update(kwargs)
        return super().formfield(**defaults)
