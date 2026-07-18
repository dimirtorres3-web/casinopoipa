import base64
import random
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def get_cipher():
    """Return a Fernet cipher ensuring the key is bytes.

    Accepts `FERNET_KEY` as str or bytes and converts as needed.
    """
    key = settings.FERNET_KEY
    if isinstance(key, str):
        key_bytes = key.encode()
    elif isinstance(key, (bytes, bytearray, memoryview)):
        key_bytes = bytes(key)
    else:
        key_bytes = str(key).encode()
    return Fernet(key_bytes)




def encrypt_balance(value: int) -> str:
    cipher = get_cipher()
    token = cipher.encrypt(str(value).encode())
    return base64.urlsafe_b64encode(token).decode()


def decrypt_balance(token: str | bytes) -> int:
    cipher = get_cipher()
    try:
        # Accept either the base64-encoded string produced by
        # `encrypt_balance` or raw encrypted bytes coming from some DBs.
        if isinstance(token, str):
            decoded = base64.urlsafe_b64decode(token.encode())
        elif isinstance(token, (bytes, bytearray, memoryview)):
            # try to treat as base64-encoded bytes first, fall back to raw
            try:
                decoded = base64.urlsafe_b64decode(bytes(token))
            except Exception:
                decoded = bytes(token)
        else:
            return 0

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
