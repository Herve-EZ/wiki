from uuid import uuid4

from django.conf import settings
from django.db import models
from django.db.models import Q

from core.models import BaseModel, TimeStampedModel, UUIDModel
from workspaces.models import Workspace


def attachment_path(instance, filename):
    """Store uploads under a per-workspace, per-attachment folder so filenames
    never collide and the original name is preserved for downloads."""
    return f"attachments/{instance.workspace_id}/{uuid4().hex}/{filename}"


class Page(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft"
        PUBLISHED = "published"
        ARCHIVED = "archived"

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="pages"
    )
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="children",
    )
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300)
    content_md = models.TextField(blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="pages",
    )
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        constraints = [
            # Slug is unique among *live* pages only, so trashing a page frees its
            # slug for reuse (Postgres/SQLite partial unique index).
            models.UniqueConstraint(
                fields=["workspace", "slug"],
                condition=Q(deleted_at__isnull=True),
                name="unique_live_page_slug_per_workspace",
            )
        ]
        indexes = [models.Index(fields=["workspace", "-updated_at"])]

    def __str__(self):
        return f"{self.workspace.slug}/{self.slug}"


class PageVersion(UUIDModel, TimeStampedModel):
    """Immutable snapshot of a page at save time. No simple-history here:
    versions never change after creation — the snapshot IS the history."""

    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="versions")
    content_md = models.TextField(blank=True)
    title = models.CharField(max_length=300)
    version_number = models.PositiveIntegerField()
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="page_versions",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["page", "version_number"], name="unique_version_per_page"
            )
        ]
        ordering = ["-version_number"]

    def __str__(self):
        return f"{self.page} v{self.version_number}"


class PageLink(UUIDModel, TimeStampedModel):
    """Derived page-to-page mention, rebuilt by services.detect_links() on save."""

    from_page = models.ForeignKey(
        Page, on_delete=models.CASCADE, related_name="links_out"
    )
    to_page = models.ForeignKey(
        Page, on_delete=models.CASCADE, related_name="links_in"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["from_page", "to_page"], name="unique_page_link"
            )
        ]

    def __str__(self):
        return f"{self.from_page} → {self.to_page}"


class Comment(UUIDModel, TimeStampedModel):
    """A discussion note on a page, optionally anchored to a section (by the
    section slug from lib/sections). Top-level comments can have one level of
    replies (parent) and be marked resolved."""

    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="comments",
    )
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True,
        related_name="replies",
    )
    # Section slug this comment refers to; blank = general page comment.
    section_id = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["page", "created_at"])]

    def __str__(self):
        return f"comment on {self.page} by {self.author_id}"


class Attachment(UUIDModel, TimeStampedModel):
    """A file (image or document) uploaded into a workspace and embedded in a
    page via Markdown. Served by an unguessable-UUID capability URL so plain
    <img> tags can load it without an auth header."""

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="attachments"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="attachments",
    )
    file = models.FileField(upload_to=attachment_path)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100, blank=True)
    size = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [models.Index(fields=["workspace", "-created_at"])]

    def __str__(self):
        return self.original_name
