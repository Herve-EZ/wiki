from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_display_name = serializers.CharField(
        source="actor.display_name", read_only=True, default=""
    )
    actor_email = serializers.CharField(
        source="actor.email", read_only=True, default=""
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "body",
            "payload",
            "actor_display_name",
            "actor_email",
            "read_at",
            "created_at",
        ]
        read_only_fields = fields
