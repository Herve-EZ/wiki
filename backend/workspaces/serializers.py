from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Workspace, WorkspaceMember

User = get_user_model()


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "slug", "name", "permission", "require_mfa", "created_at"]
        read_only_fields = ["id", "created_at"]


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    display_name = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ["id", "user", "email", "display_name", "role"]
        read_only_fields = ["id", "user", "email", "display_name"]


class MemberInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=WorkspaceMember.Role.choices, default=WorkspaceMember.Role.VIEWER
    )

    def validate_email(self, value):
        try:
            self.user = User.objects.get(email__iexact=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("No account with this email.") from None
        return value
