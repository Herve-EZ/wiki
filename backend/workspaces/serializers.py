from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Workspace, WorkspaceInvitation, WorkspaceMember
from .permissions import get_role

User = get_user_model()


class WorkspaceSerializer(serializers.ModelSerializer):
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            "id", "slug", "name", "permission", "require_mfa", "created_at",
            "my_role",
        ]
        read_only_fields = ["id", "created_at", "my_role"]

    def get_my_role(self, obj):
        request = self.context.get("request")
        if request is None:
            return None
        return get_role(request.user, obj)


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    display_name = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ["id", "user", "email", "display_name", "role"]
        read_only_fields = ["id", "user", "email", "display_name"]


class MemberRoleSerializer(serializers.Serializer):
    """Change an existing member's role (owner-only)."""

    role = serializers.ChoiceField(choices=WorkspaceMember.Role.choices)


class InvitationCreateSerializer(serializers.Serializer):
    """Invite someone by email — registered or not. No existence check: the
    invite is delivered by email and materialises a member only on acceptance."""

    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=WorkspaceMember.Role.choices, default=WorkspaceMember.Role.VIEWER
    )

    def validate_email(self, value):
        return value.strip().lower()


class WorkspaceInvitationSerializer(serializers.ModelSerializer):
    """Owner-facing view of an invitation on their workspace."""

    invited_by_email = serializers.EmailField(
        source="invited_by.email", read_only=True, default=None
    )

    class Meta:
        model = WorkspaceInvitation
        fields = [
            "id", "email", "role", "status", "invited_by_email",
            "created_at", "expires_at",
        ]
        read_only_fields = fields


class MyInvitationSerializer(serializers.ModelSerializer):
    """Invitee-facing view: what the recipient sees in their pending list."""

    workspace_name = serializers.CharField(source="workspace.name", read_only=True)
    workspace_slug = serializers.CharField(source="workspace.slug", read_only=True)
    invited_by_email = serializers.EmailField(
        source="invited_by.email", read_only=True, default=None
    )
    invited_by_name = serializers.CharField(
        source="invited_by.display_name", read_only=True, default=None
    )

    class Meta:
        model = WorkspaceInvitation
        fields = [
            "id", "token", "email", "role", "status", "workspace_name",
            "workspace_slug", "invited_by_email", "invited_by_name",
            "created_at", "expires_at",
        ]
        read_only_fields = fields
