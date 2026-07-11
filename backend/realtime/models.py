from django.conf import settings
from django.db import models

from core.models import TimeStampedModel, UUIDModel


class Presence(UUIDModel, TimeStampedModel):
    """Who is currently connected to a page. Ephemeral rows (created on WS
    connect, deleted on disconnect) — deliberately no audit history."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="presences"
    )
    page = models.ForeignKey(
        "pages.Page", on_delete=models.CASCADE, related_name="presences"
    )
    channel_name = models.CharField(max_length=255, unique=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} on {self.page}"


class SectionLock(UUIDModel, TimeStampedModel):
    """Exclusive edit lock on one section of a page. TTL-bounded; expired
    locks are treated as free and purged lazily. Ephemeral — no history."""

    TTL_SECONDS = 300  # 5 min, per the technical plan

    page = models.ForeignKey(
        "pages.Page", on_delete=models.CASCADE, related_name="section_locks"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="section_locks"
    )
    section_id = models.CharField(max_length=100)  # e.g. "h2-3"
    locked_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["page", "section_id"], name="unique_lock_per_section"
            )
        ]

    def __str__(self):
        return f"{self.section_id}@{self.page} by {self.user}"
