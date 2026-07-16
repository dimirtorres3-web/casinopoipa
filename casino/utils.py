import base64
import random
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def get_cipher():
    return Fernet(settings.FERNET_KEY.encode())


def encrypt_balance(value: int) -> str:
    cipher = get_cipher()
    token = cipher.encrypt(str(value).encode())
    return base64.urlsafe_b64encode(token).decode()


def decrypt_balance(token: str) -> int:
    cipher = get_cipher()
    try:
        decoded = base64.urlsafe_b64decode(token.encode())
        plaintext = cipher.decrypt(decoded)
        return int(plaintext.decode())
    except (InvalidToken, ValueError, TypeError):
        return 0


def generar_jwt(payload: dict) -> str:
    import jwt

    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def verificar_jwt(token: str) -> dict | None:
    import jwt

    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None


def lanzar_juego(apuesta: int) -> dict:
    if apuesta < 2000:
        return {"ganador": False, "probabilidad": 0.0}
    resultado = random.random() < 0.4
    return {"ganador": resultado, "probabilidad": 0.4}
