import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from workspaces.models import Workspace, WorkspaceMember

from . import services
from .models import Page, PageLink

User = get_user_model()


@pytest.fixture
def author(db):
    return User.objects.create_user(email="author@x.com", password="testpass123")


@pytest.fixture
def workspace(author):
    ws = Workspace.objects.create(slug="docs", name="Docs", created_by=author)
    WorkspaceMember.objects.create(
        workspace=ws, user=author, role=WorkspaceMember.Role.OWNER
    )
    return ws


@pytest.fixture
def client(author) -> APIClient:
    c = APIClient()
    c.force_authenticate(author)
    return c


@pytest.fixture
def page(workspace, author):
    p = Page.objects.create(
        workspace=workspace, title="Guide Docker", slug="guide-docker",
        content_md="Step 1", author=author,
    )
    services.snapshot(p, author)
    return p


def test_create_page_creates_first_version(client, workspace):
    r = client.post(
        "/api/pages/",
        {"workspace": workspace.pk, "title": "Hello", "slug": "hello",
         "content_md": "world"},
        format="json",
    )
    assert r.status_code == 201, r.data
    p = Page.objects.get(slug="hello")
    assert p.versions.count() == 1
    assert p.versions.first().version_number == 1


def test_patch_creates_new_version(client, page):
    r = client.patch(
        f"/api/pages/{page.pk}/", {"content_md": "Step 1\nStep 2"}, format="json"
    )
    assert r.status_code == 200, r.data
    numbers = list(page.versions.values_list("version_number", flat=True))
    assert numbers == [2, 1]


def test_duplicate_slug_in_workspace_is_rejected(client, workspace, page):
    r = client.post(
        "/api/pages/",
        {"workspace": workspace.pk, "title": "Clone", "slug": page.slug},
        format="json",
    )
    assert r.status_code == 400


def test_viewer_cannot_edit_page(page, workspace):
    viewer = User.objects.create_user(email="viewer@x.com", password="testpass123")
    WorkspaceMember.objects.create(
        workspace=workspace, user=viewer, role=WorkspaceMember.Role.VIEWER
    )
    c = APIClient()
    c.force_authenticate(viewer)
    r = c.patch(f"/api/pages/{page.pk}/", {"content_md": "hack"}, format="json")
    assert r.status_code == 403


def test_diff_between_versions(client, page, author):
    services.save_page(page, author, content_md="Step 1\nStep 2")
    r = client.get(f"/api/pages/{page.pk}/diff/?from=1&to=2")
    assert r.status_code == 200
    ops = [o["op"] for o in r.data["ops"]]
    assert "insert" in ops or "replace" in ops
    assert "+Step 2" in r.data["unified"]


def test_restore_creates_new_version_with_old_content(client, page, author):
    services.save_page(page, author, content_md="v2 content")
    r = client.post(f"/api/pages/{page.pk}/restore/1/")
    assert r.status_code == 201
    page.refresh_from_db()
    assert page.content_md == "Step 1"
    assert page.versions.first().version_number == 3  # restore = new snapshot


def test_detect_links_wikilink_and_title_mention(workspace, author, page):
    target = Page.objects.create(
        workspace=workspace, title="Architecture", slug="architecture", author=author
    )
    services.save_page(
        page, author,
        content_md="See [[architecture]] and read Architecture carefully.",
    )
    assert PageLink.objects.filter(from_page=page, to_page=target).count() == 1


def test_backlinks_endpoint(client, workspace, author, page):
    other = Page.objects.create(
        workspace=workspace, title="Other", slug="other", author=author,
        content_md="Linking [[guide-docker]] here.",
    )
    services.detect_links(other)
    r = client.get(f"/api/pages/{page.pk}/backlinks/")
    assert r.status_code == 200
    assert [p["slug"] for p in r.data] == ["other"]


def test_search_scoped_to_accessible_workspaces(client, page, author):
    private = Workspace.objects.create(slug="secret", name="Secret")
    Page.objects.create(
        workspace=private, title="Guide Docker secret", slug="guide-secret",
        content_md="Docker",
    )
    r = client.get("/api/search?q=docker")
    assert r.status_code == 200
    slugs = [p["slug"] for p in r.data]
    assert "guide-docker" in slugs
    assert "guide-secret" not in slugs


def test_page_history_is_recorded(page, author):
    services.save_page(page, author, title="Guide Docker v2")
    assert page.history.count() >= 2
    assert page.history.first().title == "Guide Docker v2"
