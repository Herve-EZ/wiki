import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import Workspace, WorkspaceMember

User = get_user_model()


@pytest.fixture
def owner(db):
    return User.objects.create_user(email="owner@x.com", password="testpass123")


@pytest.fixture
def editor(db):
    return User.objects.create_user(email="editor@x.com", password="testpass123")


@pytest.fixture
def workspace(owner):
    ws = Workspace.objects.create(slug="team", name="Team", created_by=owner)
    WorkspaceMember.objects.create(
        workspace=ws, user=owner, role=WorkspaceMember.Role.OWNER
    )
    return ws


def _client(user) -> APIClient:
    c = APIClient()
    c.force_authenticate(user)
    return c


def test_create_workspace_makes_creator_owner(owner):
    r = _client(owner).post(
        "/api/workspaces/", {"slug": "new", "name": "New"}, format="json"
    )
    assert r.status_code == 201
    m = WorkspaceMember.objects.get(workspace__slug="new", user=owner)
    assert m.role == WorkspaceMember.Role.OWNER


def test_owner_can_invite_member(workspace, owner, editor):
    r = _client(owner).post(
        f"/api/workspaces/{workspace.slug}/members/",
        {"email": editor.email, "role": "editor"},
        format="json",
    )
    assert r.status_code == 201
    assert WorkspaceMember.objects.filter(workspace=workspace, user=editor).exists()


def test_non_owner_cannot_invite(workspace, owner, editor):
    WorkspaceMember.objects.create(
        workspace=workspace, user=editor, role=WorkspaceMember.Role.EDITOR
    )
    other = User.objects.create_user(email="other@x.com", password="testpass123")
    r = _client(editor).post(
        f"/api/workspaces/{workspace.slug}/members/",
        {"email": other.email, "role": "viewer"},
        format="json",
    )
    assert r.status_code == 403


def test_editor_cannot_modify_workspace_settings(workspace, editor):
    WorkspaceMember.objects.create(
        workspace=workspace, user=editor, role=WorkspaceMember.Role.EDITOR
    )
    r = _client(editor).patch(
        f"/api/workspaces/{workspace.slug}/", {"require_mfa": True}, format="json"
    )
    assert r.status_code == 403


def test_require_mfa_blocks_member_without_second_factor(workspace, owner):
    workspace.require_mfa = True
    workspace.save()
    r = _client(owner).get(f"/api/workspaces/{workspace.slug}/")
    assert r.status_code == 403


def test_workspace_history_is_recorded(workspace):
    workspace.name = "Renamed"
    workspace.save()
    assert workspace.history.count() >= 2
    assert workspace.history.first().name == "Renamed"
