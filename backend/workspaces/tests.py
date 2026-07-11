import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import Workspace, WorkspaceInvitation, WorkspaceMember

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
    """Inviting creates a PENDING invitation — no membership until acceptance."""
    r = _client(owner).post(
        f"/api/workspaces/{workspace.slug}/invitations/",
        {"email": editor.email, "role": "editor"},
        format="json",
    )
    assert r.status_code == 201
    assert not WorkspaceMember.objects.filter(
        workspace=workspace, user=editor
    ).exists()

    inv = WorkspaceInvitation.objects.get(workspace=workspace, email=editor.email)
    assert inv.status == WorkspaceInvitation.Status.PENDING

    # The invitee accepts → membership appears with the invited role.
    r = _client(editor).post(f"/api/invitations/{inv.token}/accept")
    assert r.status_code == 200
    m = WorkspaceMember.objects.get(workspace=workspace, user=editor)
    assert m.role == WorkspaceMember.Role.EDITOR
    inv.refresh_from_db()
    assert inv.status == WorkspaceInvitation.Status.ACCEPTED


def test_non_owner_cannot_invite(workspace, owner, editor):
    WorkspaceMember.objects.create(
        workspace=workspace, user=editor, role=WorkspaceMember.Role.EDITOR
    )
    other = User.objects.create_user(email="other@x.com", password="testpass123")
    r = _client(editor).post(
        f"/api/workspaces/{workspace.slug}/invitations/",
        {"email": other.email, "role": "viewer"},
        format="json",
    )
    assert r.status_code == 403


def test_accept_requires_matching_email(workspace, owner):
    """An invitation sent to one address cannot be accepted by another account."""
    inv = WorkspaceInvitation.objects.create(
        workspace=workspace, email="someone@x.com", invited_by=owner
    )
    stranger = User.objects.create_user(email="other@x.com", password="testpass123")
    r = _client(stranger).post(f"/api/invitations/{inv.token}/accept")
    assert r.status_code == 403
    assert not WorkspaceMember.objects.filter(
        workspace=workspace, user=stranger
    ).exists()


def test_workspace_not_visible_before_acceptance(workspace, owner, editor):
    """The invited workspace must not appear in the invitee's list while pending."""
    WorkspaceInvitation.objects.create(
        workspace=workspace, email=editor.email, invited_by=owner
    )
    r = _client(editor).get("/api/workspaces/")
    slugs = [w["slug"] for w in r.json()["results"]]
    assert workspace.slug not in slugs


def test_owner_can_change_member_role_and_remove(workspace, owner, editor):
    m = WorkspaceMember.objects.create(
        workspace=workspace, user=editor, role=WorkspaceMember.Role.EDITOR
    )
    r = _client(owner).patch(
        f"/api/workspaces/{workspace.slug}/members/{m.id}/",
        {"role": "viewer"},
        format="json",
    )
    assert r.status_code == 200
    m.refresh_from_db()
    assert m.role == WorkspaceMember.Role.VIEWER

    r = _client(owner).delete(f"/api/workspaces/{workspace.slug}/members/{m.id}/")
    assert r.status_code == 204
    assert not WorkspaceMember.objects.filter(pk=m.id).exists()


def test_last_owner_cannot_be_removed_or_demoted(workspace, owner):
    m = WorkspaceMember.objects.get(workspace=workspace, user=owner)
    c = _client(owner)
    assert (
        c.delete(f"/api/workspaces/{workspace.slug}/members/{m.id}/").status_code
        == 400
    )
    assert (
        c.patch(
            f"/api/workspaces/{workspace.slug}/members/{m.id}/",
            {"role": "editor"},
            format="json",
        ).status_code
        == 400
    )


def test_my_role_serialized(workspace, owner):
    r = _client(owner).get(f"/api/workspaces/{workspace.slug}/")
    assert r.json()["my_role"] == "owner"


def test_my_role_in_list(workspace, owner, editor):
    """The list endpoint must expose the caller's role — the UI gates on it."""
    WorkspaceMember.objects.create(
        workspace=workspace, user=editor, role=WorkspaceMember.Role.EDITOR
    )
    by_slug = {w["slug"]: w for w in _client(owner).get("/api/workspaces/").json()["results"]}
    assert by_slug[workspace.slug]["my_role"] == "owner"
    by_slug = {w["slug"]: w for w in _client(editor).get("/api/workspaces/").json()["results"]}
    assert by_slug[workspace.slug]["my_role"] == "editor"


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
