from django.conf import settings
from django.db import models

from core.models import BaseModel


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
