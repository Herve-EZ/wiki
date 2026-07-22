import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
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


@pytest.fixture
def editor_client(workspace) -> APIClient:
    editor = User.objects.create_user(email="editor@x.com", password="testpass123")
    WorkspaceMember.objects.create(
        workspace=workspace, user=editor, role=WorkspaceMember.Role.EDITOR
    )
    c = APIClient()
    c.force_authenticate(editor)
    return c


def test_editor_cannot_delete_page(editor_client, page):
    r = editor_client.delete(f"/api/pages/{page.pk}/")
    assert r.status_code == 403
    assert Page.objects.filter(pk=page.pk).exists()


def test_owner_can_delete_page(client, page):
    r = client.delete(f"/api/pages/{page.pk}/")
    assert r.status_code == 204
    # Soft delete: the row survives (recoverable) but is trashed.
    page.refresh_from_db()
    assert page.deleted_at is not None


def test_trashed_page_hidden_from_reads(client, workspace, page):
    client.delete(f"/api/pages/{page.pk}/")
    # No longer in the workspace tree, search, or retrievable.
    r = client.get(f"/api/workspaces/{workspace.slug}/pages/")
    assert page.slug not in [p["slug"] for p in r.data]
    assert client.get(f"/api/pages/{page.pk}/").status_code == 404
    r = client.get(f"/api/search?q=docker")
    assert page.slug not in [p["slug"] for p in r.data]


def test_owner_can_view_untrash_and_purge(client, workspace, page):
    client.delete(f"/api/pages/{page.pk}/")
    # Trash listing shows it.
    r = client.get(f"/api/workspaces/{workspace.slug}/trash/")
    assert [p["slug"] for p in r.data] == [page.slug]
    # Restore brings it back.
    r = client.post(f"/api/pages/{page.pk}/untrash/")
    assert r.status_code == 200
    page.refresh_from_db()
    assert page.deleted_at is None
    # Trash again, then purge permanently.
    client.delete(f"/api/pages/{page.pk}/")
    r = client.delete(f"/api/pages/{page.pk}/purge/")
    assert r.status_code == 204
    assert not Page.objects.filter(pk=page.pk).exists()


def test_editor_cannot_view_trash(editor_client, workspace, page):
    r = editor_client.get(f"/api/workspaces/{workspace.slug}/trash/")
    assert r.status_code == 403


def test_slug_reusable_after_trashing(client, workspace, page):
    client.delete(f"/api/pages/{page.pk}/")
    # A brand-new page may take the trashed page's slug.
    r = client.post(
        "/api/pages/",
        {"workspace": workspace.pk, "title": "New", "slug": page.slug},
        format="json",
    )
    assert r.status_code == 201, r.data


def test_untrash_resolves_slug_clash(client, workspace, page):
    original = page.slug
    client.delete(f"/api/pages/{page.pk}/")
    client.post(
        "/api/pages/",
        {"workspace": workspace.pk, "title": "New", "slug": original},
        format="json",
    )
    # Restoring must not violate the unique constraint — slug gets a suffix.
    r = client.post(f"/api/pages/{page.pk}/untrash/")
    assert r.status_code == 200
    page.refresh_from_db()
    assert page.slug != original
    assert page.deleted_at is None


def test_create_page_with_parent(client, workspace, page):
    r = client.post(
        "/api/pages/",
        {"workspace": workspace.pk, "title": "Child", "slug": "child",
         "parent": str(page.pk)},
        format="json",
    )
    assert r.status_code == 201, r.data
    assert str(r.data["parent"]) == str(page.pk)


def test_page_cannot_be_its_own_ancestor(client, workspace, page, author):
    child = Page.objects.create(
        workspace=workspace, title="Child", slug="child", author=author, parent=page
    )
    # Making `page` a child of its own descendant would create a cycle.
    r = client.patch(
        f"/api/pages/{page.pk}/", {"parent": str(child.pk)}, format="json"
    )
    assert r.status_code == 400


def test_parent_must_be_same_workspace(client, workspace, page, author):
    other_ws = Workspace.objects.create(slug="other", name="Other", created_by=author)
    WorkspaceMember.objects.create(
        workspace=other_ws, user=author, role=WorkspaceMember.Role.OWNER
    )
    r = client.post(
        "/api/pages/",
        {"workspace": other_ws.pk, "title": "X", "slug": "x", "parent": str(page.pk)},
        format="json",
    )
    assert r.status_code == 400


def test_editor_cannot_publish_page(editor_client, page):
    r = editor_client.patch(
        f"/api/pages/{page.pk}/", {"status": "published"}, format="json"
    )
    assert r.status_code == 403
    page.refresh_from_db()
    assert page.status == Page.Status.DRAFT


def test_editor_can_edit_draft_content(editor_client, page):
    r = editor_client.patch(
        f"/api/pages/{page.pk}/", {"content_md": "edited"}, format="json"
    )
    assert r.status_code == 200


def test_owner_can_publish_page(client, page):
    r = client.patch(
        f"/api/pages/{page.pk}/", {"status": "published"}, format="json"
    )
    assert r.status_code == 200
    page.refresh_from_db()
    assert page.status == Page.Status.PUBLISHED


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


def test_editor_can_upload_and_fetch_attachment(editor_client, workspace, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    f = SimpleUploadedFile("logo.png", b"\x89PNG\r\n fake image", content_type="image/png")
    r = editor_client.post(
        f"/api/workspaces/{workspace.slug}/attachments/", {"file": f}, format="multipart"
    )
    assert r.status_code == 201, r.data
    assert r.data["original_name"] == "logo.png"
    assert r.data["content_type"] == "image/png"
    assert r.data["url"].endswith("/raw")
    raw = editor_client.get(r.data["url"])
    assert raw.status_code == 200


def test_viewer_cannot_upload_attachment(workspace, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    viewer = User.objects.create_user(email="v2@x.com", password="testpass123")
    WorkspaceMember.objects.create(
        workspace=workspace, user=viewer, role=WorkspaceMember.Role.VIEWER
    )
    c = APIClient()
    c.force_authenticate(viewer)
    f = SimpleUploadedFile("x.txt", b"hi", content_type="text/plain")
    r = c.post(
        f"/api/workspaces/{workspace.slug}/attachments/", {"file": f}, format="multipart"
    )
    assert r.status_code == 403


def test_page_history_is_recorded(page, author):
    services.save_page(page, author, title="Guide Docker v2")
    assert page.history.count() >= 2
    assert page.history.first().title == "Guide Docker v2"
