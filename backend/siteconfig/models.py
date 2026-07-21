"""Platform-wide configuration.

A single row (``SiteConfiguration``) holds the white-label settings for the whole
deployment: branding (name, colours, logo), the login page copy, and which
authentication methods are offered. It is edited by a *system administrator* —
a platform-level role distinct from the per-workspace ``owner`` role — through
the admin API, or via the Django admin.

Only a system admin should ever write this row; everyone (even anonymous
visitors, since the login page needs it) may read the public subset.
"""
from django.db import models

from core.models import TimeStampedModel

# The SSO providers the app knows how to render a button for. A provider is
# only actually offered when it is BOTH enabled here (admin intent) AND
# configured server-side (credentials present — see `configured_provider_ids`).
SSO_PROVIDERS = (
    ("google", "Google"),
    ("github", "GitHub"),
    ("microsoft", "Microsoft"),
    ("saml", "SSO entreprise"),
)


def configured_provider_ids() -> set[str]:
    """Provider ids with real credentials configured server-side.

    Two configuration paths, either of which counts as "configured":
    - env / settings: ``SOCIALACCOUNT_PROVIDERS[<id>]["APP"|"APPS"]`` (12-factor,
      recommended — see settings._oauth_app). These are global, no Site wiring.
    - DB: an allauth ``SocialApp`` row (admin-managed, filtered by Site).

    A button whose provider is configured by neither would only lead to an
    allauth error, so we never surface it.
    """
    from django.conf import settings

    ids: set[str] = set()
    for pid, conf in getattr(settings, "SOCIALACCOUNT_PROVIDERS", {}).items():
        if isinstance(conf, dict) and (conf.get("APP") or conf.get("APPS")):
            ids.add(pid)

    try:
        from allauth.socialaccount.models import SocialApp

        ids.update(SocialApp.objects.values_list("provider", flat=True))
    except Exception:  # allauth missing / table not migrated yet
        pass
    return ids


class SiteConfiguration(TimeStampedModel):
    """Singleton row (pk is pinned to 1). Use ``SiteConfiguration.load()``."""

    SINGLETON_ID = 1

    id = models.PositiveSmallIntegerField(primary_key=True, default=SINGLETON_ID, editable=False)

    # --- Branding -----------------------------------------------------------
    site_name = models.CharField(max_length=120, default="WikiCollab")
    tagline = models.CharField(
        max_length=200,
        blank=True,
        default="Wiki collaboratif self-hosted — vos données restent chez vous.",
    )
    logo_svg = models.TextField(
        blank=True,
        default="",
        help_text="Markup SVG complet du logo. Laisser vide pour le logo par défaut.",
    )
    primary_color = models.CharField(max_length=9, default="#534ab7")
    primary_color_dark = models.CharField(max_length=9, default="#8b84e8")
    support_email = models.EmailField(blank=True, default="")

    # --- Login page copy ----------------------------------------------------
    login_title = models.CharField(
        max_length=120, blank=True, default="",
        help_text="Titre de la page de connexion. Vide → « Connexion à <nom> ».",
    )
    login_subtitle = models.CharField(max_length=300, blank=True, default="")

    # --- Authentication methods --------------------------------------------
    allow_registration = models.BooleanField(default=True)
    enable_email_login = models.BooleanField(default=True)
    enable_google = models.BooleanField(default=True)
    enable_github = models.BooleanField(default=True)
    enable_microsoft = models.BooleanField(default=True)
    enable_saml = models.BooleanField(default=True)

    # --- SMTP / email -------------------------------------------------------
    email_enabled = models.BooleanField(
        default=False,
        help_text="Activer l'envoi d'e-mails via la configuration ci-dessous (sinon fallback sur les variables d'environnement).",
    )
    email_host = models.CharField(max_length=255, blank=True, default="")
    email_port = models.PositiveIntegerField(default=587)
    email_host_user = models.CharField(max_length=255, blank=True, default="")
    email_host_password = models.CharField(max_length=255, blank=True, default="")
    email_use_tls = models.BooleanField(default=True)
    email_use_ssl = models.BooleanField(default=False)
    email_from = models.EmailField(
        blank=True,
        default="",
        help_text="Adresse d'expéditeur. Vide → DEFAULT_FROM_EMAIL de l'environnement.",
    )

    class Meta:
        verbose_name = "Configuration de la plateforme"
        verbose_name_plural = "Configuration de la plateforme"

    def __str__(self):
        return self.site_name

    def save(self, *args, **kwargs):
        self.pk = self.SINGLETON_ID
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "SiteConfiguration":
        obj, _ = cls.objects.get_or_create(pk=cls.SINGLETON_ID)
        return obj

    def enabled_flag(self, provider_id: str) -> bool:
        return bool(getattr(self, f"enable_{provider_id}", False))

    def available_providers(self) -> list[dict]:
        """Providers offered to end users: enabled here AND configured server-side."""
        configured = configured_provider_ids()
        return [
            {"id": pid, "label": label}
            for pid, label in SSO_PROVIDERS
            if self.enabled_flag(pid) and pid in configured
        ]
