import base64
import secrets
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


def secure_choice(sequence):
    if not sequence:
        raise ValueError("secure_choice requires a non-empty sequence.")
    index = secrets.randbelow(len(sequence))
    return sequence[index]


def secure_randbelow(upper: int) -> int:
    if upper <= 0:
        raise ValueError("secure_randbelow requires upper > 0")
    return secrets.randbelow(upper)


def secure_randint(low: int, high: int) -> int:
    if high < low:
        raise ValueError("secure_randint requires high >= low")
    return low + secrets.randbelow(high - low + 1)


def secure_bool(chance: float) -> bool:
    if chance <= 0:
        return False
    if chance >= 1:
        return True
    threshold = int(chance * 1_000_000)
    return secrets.randbelow(1_000_000) < threshold


def secure_sample(population, k):
    population = list(population)
    if k < 0 or k > len(population):
        raise ValueError("secure_sample requires 0 <= k <= len(population)")
    result = []
    for _ in range(k):
        index = secrets.randbelow(len(population))
        result.append(population.pop(index))
    return result


def secure_shuffle(sequence):
    items = list(sequence)
    for i in range(len(items) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        items[i], items[j] = items[j], items[i]
    return items


def secure_weighted_choice(choices):
    total_weight = sum(weight for _, weight in choices)
    if total_weight <= 0:
        raise ValueError("secure_weighted_choice requires a positive total weight.")
    pick = secrets.randbelow(total_weight)
    cumulative = 0
    for item, weight in choices:
        cumulative += weight
        if pick < cumulative:
            return item
    return choices[-1][0]


def lanzar_juego(apuesta: int) -> dict:
    if apuesta < 2000:
        return {"ganador": False, "probabilidad": 0.0}
    resultado = secure_bool(0.375)
    return {"ganador": resultado, "probabilidad": 0.375}
