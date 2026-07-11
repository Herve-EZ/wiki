"""TOTP + recovery-code helpers, and the short-lived MFA challenge token.

The challenge token is issued after the first factor (password or SSO) succeeds
but before the JWT pair is granted. The client exchanges it, together with a
TOTP code or a recovery code, for the real access/refresh tokens.

Tokens are signed (integrity + expiry via ``django.core.signing``) AND
single-use: a nonce is stored in the cache at issue time and burned at
resolution, so a replayed token is rejected even inside its lifetime window.
"""
import base64
import secrets
from io import BytesIO

import pyotp
import qrcode
from django.conf import settings
from django.core import signing
from django.core.cache import cache

from .models import RecoveryCode, TOTPDevice

_SALT = "accounts.mfa.challenge"
_CACHE_PREFIX = "mfa:challenge:"


def issue_challenge_token(user) -> str:
    nonce = secrets.token_urlsafe(16)
    lifetime = int(settings.MFA_CHALLENGE_TOKEN_LIFETIME.total_seconds())
    cache.set(_CACHE_PREFIX + nonce, str(user.pk), timeout=lifetime)
    return signing.dumps({"uid": str(user.pk), "nonce": nonce}, salt=_SALT)


def resolve_challenge_token(token: str):
    """Return the user id if the token is valid, unexpired and unused — and
    burn it so it cannot be replayed. Returns None otherwise."""
    max_age = int(settings.MFA_CHALLENGE_TOKEN_LIFETIME.total_seconds())
    try:
        data = signing.loads(token, salt=_SALT, max_age=max_age)
    except signing.BadSignature:
        return None
    key = _CACHE_PREFIX + data.get("nonce", "")
    uid = cache.get(key)
    if uid is None or uid != data.get("uid"):
        return None
    cache.delete(key)  # single use
    return uid


def start_totp_setup(user) -> tuple[TOTPDevice, str, str]:
    """Create an unconfirmed device. Returns (device, secret, qr_data_uri)."""
    user.totp_devices.filter(confirmed=False).delete()
    secret = pyotp.random_base32()
    device = TOTPDevice(user=user, confirmed=False)
    device.set_secret(secret)
    device.save()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.email, issuer_name="WikiCollab"
    )
    return device, secret, _qr_data_uri(uri)


def confirm_totp(user, code: str) -> bool:
    """Activate the pending device if `code` matches. Returns success."""
    device = user.totp_devices.filter(confirmed=False).order_by("-created_at").first()
    if not device or not _verify(device.get_secret(), code):
        return False
    device.confirmed = True
    device.save(update_fields=["confirmed"])
    return True


def verify_second_factor(user, code: str) -> bool:
    """Accept either a valid TOTP code or a single-use recovery code."""
    for device in user.totp_devices.filter(confirmed=True):
        if _verify(device.get_secret(), code):
            return True
    return RecoveryCode.consume(user, code)


def _verify(secret: str, code: str) -> bool:
    return pyotp.TOTP(secret).verify((code or "").strip(), valid_window=1)


def _qr_data_uri(uri: str) -> str:
    img = qrcode.make(uri)
    buf = BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"
