from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import SSO_PROVIDERS, SiteConfiguration, configured_provider_ids
from .permissions import is_system_admin

User = get_user_model()

# Branding / copy fields shared by the public and admin representations.
_BRANDING_FIELDS = [
    "site_name",
    "tagline",
    "logo_svg",
    "primary_color",
    "primary_color_dark",
    "support_email",
    "login_title",
    "login_subtitle",
    "allow_registration",
    "enable_email_login",
]
_PROVIDER_FLAGS = ["enable_google", "enable_github", "enable_microsoft", "enable_saml"]


class PublicConfigSerializer(serializers.ModelSerializer):
    """What the login page / branding layer may read, anonymously.

    Exposes only the SSO providers that are truly usable (enabled AND
    configured) so the frontend never renders a dead button.
    """

    sso_providers = serializers.SerializerMethodField()

    class Meta:
        model = SiteConfiguration
        fields = [*_BRANDING_FIELDS, "sso_providers"]
        read_only_fields = fields

    def get_sso_providers(self, obj):
        return obj.available_providers()


class AdminConfigSerializer(serializers.ModelSerializer):
    """Full read/write view for system admins, plus per-provider status so the
    UI can show which providers still lack server-side credentials."""

    providers = serializers.SerializerMethodField()

    class Meta:
        model = SiteConfiguration
        fields = [*_BRANDING_FIELDS, *_PROVIDER_FLAGS, "providers", "updated_at"]
        read_only_fields = ["providers", "updated_at"]

    def get_providers(self, obj):
        configured = configured_provider_ids()
        return [
            {
                "id": pid,
                "label": label,
                "enabled": obj.enabled_flag(pid),
                "configured": pid in configured,
            }
            for pid, label in SSO_PROVIDERS
        ]


class AdminUserSerializer(serializers.ModelSerializer):
    """User row for the system-admin management screen. ``is_system_admin`` is
    the only writable field; a superuser is always an effective admin."""

    is_system_admin = serializers.BooleanField()
    is_effective_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "display_name",
            "is_superuser",
            "is_system_admin",
            "is_effective_admin",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "display_name", "is_superuser", "date_joined"]

    def get_is_effective_admin(self, obj):
        return is_system_admin(obj)
