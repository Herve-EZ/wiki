"""Test settings: zero external services (sqlite + in-memory everything).

Used by default for `pytest` (see pyproject.toml). CI runs the suite against
the real stack with `pytest --ds=config.settings` + Postgres/Redis services.
"""
from .settings import *  # noqa: F401,F403
from .settings import BASE_DIR, REST_FRAMEWORK

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_db.sqlite3",
    }
}

CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
}

CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    # Throttling must not make tests order-dependent.
    "DEFAULT_THROTTLE_RATES": {"auth": "10000/min", "auth_burst": "10000/min"},
}

# Fast hashing — tests create many users.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
