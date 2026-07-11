import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel


def _default_invite_expiry():
    days = getattr(settings, "INVITATION_TTL_DAYS", 14)
    return timezone.now() + timedelta(days=days)


def _generate_invite_token():
    return secrets.token_urlsafe(32)


class Workspace(BaseModel):
    class Permission(models.TextChoices):
        PUBLIC = "public"
        PRIVATE = "private"
        INVITE = "invite"

    slug = models.SlugField(unique=True, db_index=True)
    name = models.CharField(max_length=200)
    permission = models.CharField(
        max_length=10, choices=Permission.choices, default=Permission.PRIVATE
    )
    require_mfa = models.BooleanField(
        default=False,
        help_text="If set, members without an active second factor are denied access.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="created_workspaces",
    )

    def __str__(self):
        return self.name


class WorkspaceMember(BaseModel):
    class Role(models.TextChoices):
        OWNER = "owner"
        EDITOR = "editor"
        VIEWER = "viewer"

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "user"], name="unique_membership"
            )
        ]

    def __str__(self):
        return f"{self.user} @ {self.workspace} ({self.role})"


class WorkspaceInvitation(BaseModel):
    """A pending invitation to join a workspace. The invitee (registered or not)
    must accept before a WorkspaceMember row is created and the workspace becomes
    visible to them."""

    class Status(models.TextChoices):
        PENDING = "pending"
        ACCEPTED = "accepted"
        DECLINED = "declined"
        REVOKED = "revoked"

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="invitations"
    )
    email = models.EmailField()
    role = models.CharField(
        max_length=10,
        choices=WorkspaceMember.Role.choices,
        default=WorkspaceMember.Role.VIEWER,
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="sent_invitations",
    )
    token = models.CharField(
        max_length=64, unique=True, default=_generate_invite_token, editable=False
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    expires_at = models.DateTimeField(default=_default_invite_expiry)
    responded_at = models.DateTimeField(null=True, blank=True)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="accepted_invitations",
    )

    class Meta:
        constraints = [
            # At most one live invitation per (workspace, email). Resolved
            # invitations (accepted/declined/revoked) drop out of the index.
            models.UniqueConstraint(
                fields=["workspace", "email"],
                condition=models.Q(status="pending"),
                name="unique_pending_invitation",
            )
        ]

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"invite {self.email} → {self.workspace} ({self.status})"
