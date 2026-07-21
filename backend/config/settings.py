"""Django settings for WikiCollab.

Environment-driven (12-factor): every deployment-specific value comes from
env / .env. Notable switches:

- DJANGO_DB=sqlite            → file-backed sqlite (local test runs without services)
- DJANGO_CACHE=locmem         → in-process cache instead of Redis
- DJANGO_CHANNEL_LAYER=inmemory → in-process channel layer instead of Redis
The defaults are the real stack: PostgreSQL + Redis.
"""
import importlib.util
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR.parent / ".env")


def env(key, default=None):
    return os.environ.get(key, default)


def env_bool(key, default=False):
    return env(key, str(default)).lower() in ("1", "true", "yes", "on")


def env_list(key, default=""):
    return [v.strip() for v in env(key, default).split(",") if v.strip()]


SECRET_KEY = env("DJANGO_SECRET_KEY", "dev-insecure-change-me-0000000000000000000000000000")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# SAML support needs native xmlsec libs (present in the Docker image, often
# absent on dev machines) — enable the provider only when importable.
SAML_AVAILABLE = importlib.util.find_spec("onelogin") is not None

# --- Applications -----------------------------------------------------------
INSTALLED_APPS = [
    "daphne",  # must precede django.contrib.staticfiles for ASGI runserver
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "django.contrib.postgres",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "channels",
    "corsheaders",
    "simple_history",
    "drf_spectacular",
    # allauth (SSO: social + SAML)
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.github",
    "allauth.socialaccount.providers.microsoft",
    *(["allauth.socialaccount.providers.saml"] if SAML_AVAILABLE else []),
    # Local apps
    "core",
    "accounts",
    "siteconfig",
    "workspaces",
    "pages",
    "workflows",
    "realtime",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise serves static files (admin, DRF) under Daphne/ASGI, which does
    # not serve them on its own the way `runserver` does.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "simple_history.middleware.HistoryRequestMiddleware",  # stamps history_user
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Database ---------------------------------------------------------------
if env("DJANGO_DB") == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB", "wikicollab"),
            "USER": env("POSTGRES_USER", "wikicollab"),
            "PASSWORD": env("POSTGRES_PASSWORD", "wikicollab"),
            "HOST": env("POSTGRES_HOST", "localhost"),
            "PORT": env("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": 60,
        }
    }

# --- Cache / Channels / Redis -------------------------------------------------
REDIS_URL = env("REDIS_URL", "redis://localhost:6379/0")

if env("DJANGO_CACHE") == "locmem":
    CACHES = {
        "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }

if env("DJANGO_CHANNEL_LAYER") == "inmemory":
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
    }
else:
    # PubSub layer: uses Redis pub/sub for group broadcast (presence + locks).
    # Avoids the blocking BRPOP receive loop of the core layer, whose long reads
    # surface as "Timeout reading from redis" and drop the WebSocket.
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.pubsub.RedisPubSubChannelLayer",
            "CONFIG": {"hosts": [REDIS_URL]},
        }
    }

# --- Auth -------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"
# django.contrib.sites id. allauth resolves the SocialApp for THIS site, so it
# must match the Site your SocialApp rows are attached to. Override per
# deployment (e.g. DJANGO_SITE_ID=2 when the real domain lives on Site id 2).
SITE_ID = int(env("DJANGO_SITE_ID", "1"))

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# allauth
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
ACCOUNT_EMAIL_VERIFICATION = "optional"
# Our custom User has no `username` field (login by email). Tell allauth so it
# doesn't try to read/validate a username during (social) signup — otherwise
# social login crashes with FieldDoesNotExist: User has no field named 'username'.
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
# After a social login, allauth redirects here; SSOCompleteView hands the app a
# one-time code via the wikicollab:// deep link (see accounts.sso_views).
LOGIN_REDIRECT_URL = "/sso/complete"
SOCIALACCOUNT_ADAPTER = "accounts.sso.JWTSocialAdapter"
# Skip allauth's intermediate "you are about to sign in…" confirmation page.
# That page is rendered from allauth templates and, in production (Daphne/ASGI,
# no collected allauth static), lands unstyled. With LOGIN_ON_GET the provider
# button hits the provider's OAuth flow directly — the user only ever sees
# Google/GitHub/Microsoft's own (styled) consent screen, never a bare Django
# page. Same reason /sso/complete carries its CSS inline: never depend on
# allauth's static assets being served in prod.
SOCIALACCOUNT_LOGIN_ON_GET = True


def _oauth_app(id_key, secret_key):
    """Build an allauth settings-based `APP` from env, or None if unset.

    Settings-based apps are global (NOT filtered by the Sites framework), so
    they sidestep the SocialApp/SITE_ID matching that otherwise raises
    SocialApp.DoesNotExist. Configure a provider purely via env — no DB
    SocialApp needed (and don't keep both, or allauth sees two apps).
    """
    client_id = env(id_key, "")
    secret = env(secret_key, "")
    if client_id and secret:
        return {"APP": {"client_id": client_id, "secret": secret, "key": ""}}
    return None


SOCIALACCOUNT_PROVIDERS = {}
for _pid, _id_key, _secret_key in (
    ("google", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
    ("github", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"),
    ("microsoft", "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"),
):
    _app = _oauth_app(_id_key, _secret_key)
    if _app:
        SOCIALACCOUNT_PROVIDERS[_pid] = _app
if SAML_AVAILABLE:
    # SAML is configured per-IdP (DB SocialApp), not via a client id/secret.
    SOCIALACCOUNT_PROVIDERS["saml"] = {}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        # Brute-force guard on the auth surface (per IP for anonymous calls).
        "auth": env("THROTTLE_AUTH", "10/min"),
        "auth_burst": env("THROTTLE_AUTH_BURST", "30/min"),
        # SSO code exchange: single-use random codes (not brute-forceable), on
        # its own scope so a completed social login isn't blocked by prior
        # password-login attempts sharing the "auth" budget.
        "sso": env("THROTTLE_SSO", "30/min"),
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "WikiCollab API",
    "DESCRIPTION": "Collaborative real-time wiki — REST API",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# Ephemeral MFA challenge token (issued after 1st factor, before JWT).
# Single-use: a cache-backed nonce is burned at verification.
MFA_CHALLENGE_TOKEN_LIFETIME = timedelta(minutes=5)
# Dedicated key for TOTP secret encryption at rest (falls back to SECRET_KEY).
MFA_ENCRYPTION_KEY = env("MFA_ENCRYPTION_KEY", "")

# --- Email --------------------------------------------------------------------
# Invitations are delivered by email. In DEBUG the console backend prints the
# message (and the invite link) to stdout; production uses SMTP via env.
if DEBUG:
    EMAIL_BACKEND = env(
        "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
    )
else:
    EMAIL_BACKEND = env(
        "EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend"
    )
EMAIL_HOST = env("EMAIL_HOST", "localhost")
EMAIL_PORT = int(env("EMAIL_PORT", "25"))
EMAIL_HOST_USER = env("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", False)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "no-reply@wikicollab.local")

# Base URL of the frontend, used to build invitation links.
FRONTEND_URL = env("FRONTEND_URL", "http://localhost:5173")
# How long a workspace invitation stays valid.
INVITATION_TTL_DAYS = int(env("INVITATION_TTL_DAYS", "14"))

# --- CORS (Vite SPA + Tauri webview run on their own origins) -----------------
# Auth is JWT-in-header (no cookies), so allow-listing origins is enough; no
# credentials mode required.
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
# The packaged Tauri desktop app serves its webview from tauri://localhost
# (macOS/Linux) or http(s)://tauri.localhost (Windows/WebView2) in EVERY
# environment — so these origins must be allowed in production too, not only
# under DEBUG, otherwise the desktop app's CORS preflight passes but the real
# request is blocked ("Serveur injoignable").
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^tauri://localhost$",
    r"^https?://tauri\.localhost$",
]
if DEBUG:
    # Dev convenience: Vite may pick any free port (5173, 5174, …).
    CORS_ALLOWED_ORIGIN_REGEXES += [
        r"^http://localhost:\d+$",
        r"^http://127\.0\.0\.1:\d+$",
    ]

# --- Production hardening -----------------------------------------------------
if not DEBUG:
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SSL_REDIRECT", True)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_HSTS_SECONDS = int(env("DJANGO_HSTS_SECONDS", "3600"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"

# --- Logging ------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "{asctime} {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "default"},
    },
    "root": {"handlers": ["console"], "level": env("DJANGO_LOG_LEVEL", "INFO")},
    "loggers": {
        "django.request": {"level": "WARNING"},
        "daphne": {"level": "WARNING"},
    },
}

# --- I18N / static ----------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# --- Media / avatars (S3 — Contabo Object Storage) ---------------------------
# ONLY profile photos live in S3; every other file stays on the local
# filesystem (see accounts.models.avatar_storage). Set AVATAR_S3_BUCKET to
# enable S3 — leave it blank and avatars fall back to local media (dev/tests).
MEDIA_URL = env("MEDIA_URL", "/media/")
MEDIA_ROOT = BASE_DIR / "media"

# Contabo S3-compatible endpoint, e.g. https://eu2.contabostorage.com
AVATAR_S3_ENDPOINT_URL = env("AVATAR_S3_ENDPOINT_URL", "")
AVATAR_S3_BUCKET = env("AVATAR_S3_BUCKET", "")
AVATAR_S3_ACCESS_KEY = env("AVATAR_S3_ACCESS_KEY", "")
AVATAR_S3_SECRET_KEY = env("AVATAR_S3_SECRET_KEY", "")
# Contabo usually ignores the region; leave blank unless your provider needs it.
AVATAR_S3_REGION = env("AVATAR_S3_REGION", "")
# Optional public host/CDN in front of the bucket (no scheme), else the
# endpoint+bucket URL is used.
AVATAR_S3_CUSTOM_DOMAIN = env("AVATAR_S3_CUSTOM_DOMAIN", "")
# Avatars are public so the stored URL is directly usable in an <img> tag.
AVATAR_S3_ACL = env("AVATAR_S3_ACL", "public-read")

# WhiteNoise: in dev, serve straight from the apps' static dirs (no collectstatic
# needed); in prod, serve the collected + compressed, hashed manifest.
WHITENOISE_USE_FINDERS = DEBUG
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": (
            "django.contrib.staticfiles.storage.StaticFilesStorage"
            if DEBUG
            else "whitenoise.storage.CompressedManifestStaticFilesStorage"
        ),
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
