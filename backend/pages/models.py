from django.conf import settings
from django.db import models

from core.models import BaseModel, TimeStampedModel, UUIDModel
from workspaces.models import Workspace


class Page(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft"
        PUBLISHED = "published"
        ARCHIVED = "archived"

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="pages"
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

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "slug"], name="unique_page_slug_per_workspace"
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
