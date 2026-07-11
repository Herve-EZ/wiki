"""Symmetric encryption for secrets at rest (TOTP seeds).

Fernet (AES-128-CBC + HMAC) keyed from ``MFA_ENCRYPTION_KEY`` — a dedicated
env secret, falling back to ``SECRET_KEY`` in dev. Rotating the key
invalidates stored TOTP secrets (users re-enrol), so treat it like a
database credential.
"""
import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

_PREFIX = "enc:v1:"


def _fernet() -> Fernet:
    material = getattr(settings, "MFA_ENCRYPTION_KEY", "") or settings.SECRET_KEY
    digest = hashlib.sha256(material.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(value: str) -> str:
    return _PREFIX + _fernet().encrypt(value.encode()).decode()


def decrypt(stored: str) -> str:
    """Decrypt a stored secret. Accepts legacy plaintext (pre-encryption rows)."""
    if not stored.startswith(_PREFIX):
        return stored
    try:
        return _fernet().decrypt(stored[len(_PREFIX):].encode()).decode()
    except InvalidToken:
        raise ValueError("Cannot decrypt secret: wrong MFA_ENCRYPTION_KEY?") from None
