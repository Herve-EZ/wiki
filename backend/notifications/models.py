import uuid

from django.conf import settings
from django.db import models


class NotificationType(models.TextChoices):
    INVITATION = "invitation", "Invitation"
    MENTION = "mention", "Mention"
    PAGE_UPDATED = "page_updated", "Page modifiée"
    WORKFLOW_STAGE = "workflow_stage", "Changement de workflow"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    type = models.CharField(max_length=20, choices=NotificationType.choices)
    title = models.CharField(max_length=300)
    body = models.TextField(blank=True, default="")
    payload = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "-created_at"]),
            models.Index(fields=["recipient", "read_at"]),
        ]

    def __str__(self):
        return f"{self.type} → {self.recipient}"


class PageSubscription(models.Model):
    """Track which users follow which pages for update notifications."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="page_subscriptions",
    )
    page = models.ForeignKey(
        "pages.Page",
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "page")]

    def __str__(self):
        return f"{self.user} → {self.page}"
