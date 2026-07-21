import secrets

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractUser
from django.db import models
from simple_history.models import HistoricalRecords

from core.models import TimeStampedModel, UUIDModel

from . import crypto
from .managers import UserManager


def avatar_storage():
    """Storage backend for profile photos.

    S3 (Contabo) when AVATAR_S3_BUCKET is configured, otherwise the local
    default storage (dev/tests). Passing a callable — rather than a storage
    instance — keeps S3 credentials out of the generated migration file.
    """
    from django.conf import settings

    if settings.AVATAR_S3_BUCKET:
        from .storage import AvatarStorage

        return AvatarStorage()
    from django.core.files.storage import default_storage

    return default_storage


class User(UUIDModel, AbstractUser):
    """Custom user: UUID pk, login by email, no username field."""

    username = None
    email = models.EmailField("email address", unique=True)
    display_name = models.CharField(max_length=150, blank=True)
    # Profile photo, uploaded to the S3 bucket (see avatar_storage). The public
    # URL is exposed to the API via the `avatar_url` property below.
    avatar = models.ImageField(
        upload_to="avatars/", storage=avatar_storage, blank=True
    )
    # Platform-wide administrator (white-label config, SSO setup, admin roster).
    # Distinct from the per-workspace `owner` role; superusers are implicitly
    # system admins (see siteconfig.permissions.is_system_admin).
    is_system_admin = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    # Credentials never belong in an audit table.
    history = HistoricalRecords(excluded_fields=["password", "last_login"])

    def __str__(self):
        return self.email

    @property
    def avatar_url(self) -> str:
        """Public URL of the uploaded avatar, or "" when none is set."""
        return self.avatar.url if self.avatar else ""

    @property
    def mfa_enabled(self) -> bool:
        return self.totp_devices.filter(confirmed=True).exists()


class TOTPDevice(UUIDModel, TimeStampedModel):
    """A TOTP second factor. The base32 seed is encrypted at rest (no history:
    secret material must never be duplicated into audit tables)."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="totp_devices"
    )
    secret = models.CharField(max_length=256)
    confirmed = models.BooleanField(default=False)

    def set_secret(self, raw: str):
        self.secret = crypto.encrypt(raw)

    def get_secret(self) -> str:
        return crypto.decrypt(self.secret)

    def __str__(self):
        state = "confirmed" if self.confirmed else "pending"
        return f"TOTP({self.user.email}, {state})"


class RecoveryCode(UUIDModel, TimeStampedModel):
    """Single-use backup code. Stored hashed, never in plaintext (no history)."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="recovery_codes"
    )
    code_hash = models.CharField(max_length=128)
    used_at = models.DateTimeField(null=True, blank=True)

    @classmethod
    def generate_batch(cls, user, count: int = 10) -> list[str]:
        """Create `count` fresh codes, invalidating old ones. Returns plaintext."""
        cls.objects.filter(user=user).delete()
        plain = []
        for _ in range(count):
            raw = "-".join(secrets.token_hex(2) for _ in range(2))  # e.g. a1b2-c3d4
            plain.append(raw)
            cls.objects.create(user=user, code_hash=make_password(raw))
        return plain

    @classmethod
    def consume(cls, user, raw: str) -> bool:
        """Verify and burn a code. True if a valid unused code matched."""
        for rc in cls.objects.filter(user=user, used_at__isnull=True):
            if check_password(raw, rc.code_hash):
                from django.utils import timezone

                rc.used_at = timezone.now()
                rc.save(update_fields=["used_at"])
                return True
        return False
