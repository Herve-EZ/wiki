"""Dynamic email connection: prefer DB-stored SMTP config, fall back to env."""
from django.conf import settings
from django.core.mail import get_connection


def get_email_connection():
    """Return an SMTP connection from SiteConfiguration if enabled, otherwise
    fall back to the default Django mail backend configured via env vars."""
    from .models import SiteConfiguration

    cfg = SiteConfiguration.load()
    if not cfg.email_enabled or not cfg.email_host:
        return get_connection()

    return get_connection(
        backend="django.core.mail.backends.smtp.EmailBackend",
        host=cfg.email_host,
        port=cfg.email_port,
        username=cfg.email_host_user or None,
        password=cfg.email_host_password or None,
        use_tls=cfg.email_use_tls,
        use_ssl=cfg.email_use_ssl,
    )


def get_from_email() -> str:
    from .models import SiteConfiguration

    cfg = SiteConfiguration.load()
    if cfg.email_enabled and cfg.email_from:
        return cfg.email_from
    return settings.DEFAULT_FROM_EMAIL
