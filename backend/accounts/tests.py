import pyotp
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from accounts import mfa
from accounts.models import RecoveryCode

User = get_user_model()


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(email="a@b.com", password="testpass123")


def test_register(client, db):
    r = client.post(
        "/api/auth/register",
        {"email": "new@b.com", "password": "testpass123"},
        format="json",
    )
    assert r.status_code == 201
    assert User.objects.filter(email="new@b.com").exists()


def test_login_without_mfa_returns_jwt(client, user):
    r = client.post(
        "/api/auth/token", {"email": "a@b.com", "password": "testpass123"}, format="json"
    )
    assert r.status_code == 200
    assert "access" in r.data and "refresh" in r.data


def test_login_with_mfa_challenges_then_verifies(client, user):
    # Enrol TOTP
    device, secret, _ = mfa.start_totp_setup(user)
    assert mfa.confirm_totp(user, pyotp.TOTP(secret).now())

    # First factor now returns a challenge, not tokens
    r = client.post(
        "/api/auth/token", {"email": "a@b.com", "password": "testpass123"}, format="json"
    )
    assert r.status_code == 200
    assert r.data.get("mfa_required") is True
    token = r.data["challenge_token"]

    # Second factor exchanges challenge + code for tokens
    r2 = client.post(
        "/api/auth/mfa/verify",
        {"challenge_token": token, "code": pyotp.TOTP(secret).now()},
        format="json",
    )
    assert r2.status_code == 200
    assert "access" in r2.data


def test_recovery_code_is_single_use(user):
    codes = RecoveryCode.generate_batch(user, count=3)
    assert RecoveryCode.consume(user, codes[0]) is True
    assert RecoveryCode.consume(user, codes[0]) is False  # already burned


def test_challenge_token_is_single_use(client, user):
    device, secret, _ = mfa.start_totp_setup(user)
    assert mfa.confirm_totp(user, pyotp.TOTP(secret).now())
    token = mfa.issue_challenge_token(user)

    assert mfa.resolve_challenge_token(token) == str(user.pk)
    assert mfa.resolve_challenge_token(token) is None  # replay rejected


def test_totp_secret_is_encrypted_at_rest(user):
    device, secret, _ = mfa.start_totp_setup(user)
    device.refresh_from_db()
    assert device.secret != secret  # ciphertext stored
    assert device.secret.startswith("enc:v1:")
    assert device.get_secret() == secret


def test_mfa_disable_requires_password(client, user):
    device, secret, _ = mfa.start_totp_setup(user)
    assert mfa.confirm_totp(user, pyotp.TOTP(secret).now())
    client.force_authenticate(user)

    r = client.delete("/api/auth/mfa/totp", {"password": "wrong"}, format="json")
    assert r.status_code == 403
    assert user.mfa_enabled

    r = client.delete("/api/auth/mfa/totp", {"password": "testpass123"}, format="json")
    assert r.status_code == 204
    assert not user.mfa_enabled
