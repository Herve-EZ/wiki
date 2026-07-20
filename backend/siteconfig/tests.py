import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from siteconfig.models import SiteConfiguration

User = get_user_model()


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def member(db):
    return User.objects.create_user(email="member@b.com", password="testpass123")


@pytest.fixture
def sysadmin(db):
    return User.objects.create_user(
        email="root@b.com", password="testpass123", is_system_admin=True
    )


def auth(client, user):
    from accounts.views import issue_jwt

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {issue_jwt(user)['access']}")
    return client


def test_public_config_is_anonymous_and_has_defaults(client, db):
    r = client.get("/api/config")
    assert r.status_code == 200
    assert r.data["site_name"] == "WikiCollab"
    # No SocialApp configured → no provider is offered, even though enabled.
    assert r.data["sso_providers"] == []
    assert "enable_google" not in r.data  # provider flags are admin-only


def test_public_config_hides_enabled_but_unconfigured_provider(client, db):
    cfg = SiteConfiguration.load()
    cfg.enable_google = True
    cfg.save()
    r = client.get("/api/config")
    assert all(p["id"] != "google" for p in r.data["sso_providers"])


def test_admin_config_requires_system_admin(client, member):
    auth(client, member)
    assert client.get("/api/admin/config").status_code == 403


def test_admin_can_read_and_patch_config(client, sysadmin):
    auth(client, sysadmin)
    r = client.get("/api/admin/config")
    assert r.status_code == 200
    assert any(p["id"] == "google" for p in r.data["providers"])

    r2 = client.patch(
        "/api/admin/config", {"site_name": "MonWiki", "enable_github": False}, format="json"
    )
    assert r2.status_code == 200
    assert r2.data["site_name"] == "MonWiki"
    assert SiteConfiguration.load().enable_github is False


def test_superuser_is_effective_system_admin(client, db):
    su = User.objects.create_superuser(email="su@b.com", password="testpass123")
    auth(client, su)
    assert client.get("/api/admin/config").status_code == 200


def test_admin_can_grant_and_revoke_system_admin(client, sysadmin, member):
    auth(client, sysadmin)
    r = client.patch(
        f"/api/admin/users/{member.id}", {"is_system_admin": True}, format="json"
    )
    assert r.status_code == 200
    member.refresh_from_db()
    assert member.is_system_admin is True


def test_admin_cannot_revoke_own_access(client, sysadmin):
    auth(client, sysadmin)
    r = client.patch(
        f"/api/admin/users/{sysadmin.id}", {"is_system_admin": False}, format="json"
    )
    assert r.status_code == 400
    sysadmin.refresh_from_db()
    assert sysadmin.is_system_admin is True


def test_me_exposes_system_admin_flag(client, sysadmin):
    auth(client, sysadmin)
    r = client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.data["is_system_admin"] is True
