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
_EMAIL_FIELDS = [
    "email_enabled",
    "email_host",
    "email_port",
    "email_host_user",
    "email_use_tls",
    "email_use_ssl",
    "email_from",
]


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
    email_password_set = serializers.SerializerMethodField()
    email_host_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )

    class Meta:
        model = SiteConfiguration
        fields = [
            *_BRANDING_FIELDS,
            *_PROVIDER_FLAGS,
            *_EMAIL_FIELDS,
            "email_host_password",
            "email_password_set",
            "providers",
            "updated_at",
        ]
        read_only_fields = ["providers", "email_password_set", "updated_at"]

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

    def get_email_password_set(self, obj) -> bool:
        return bool(obj.email_host_password)

    def update(self, instance, validated_data):
        # Only overwrite password when a non-empty value is explicitly sent.
        pw = validated_data.pop("email_host_password", None)
        if pw is not None and pw != "":
            instance.email_host_password = pw
        return super().update(instance, validated_data)


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
