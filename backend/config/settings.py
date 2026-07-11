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
    "workspaces",
    "pages",
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
SITE_ID = 1

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
SOCIALACCOUNT_ADAPTER = "accounts.sso.JWTSocialAdapter"
SOCIALACCOUNT_PROVIDERS = {
    # Real client IDs/secrets are configured per-deployment via the admin
    # (SocialApp) or env; providers are declared here so allauth loads them.
    **({"saml": {}} if SAML_AVAILABLE else {}),
}

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

# --- CORS (Vite SPA + Tauri webview run on their own origins) -----------------
# Auth is JWT-in-header (no cookies), so allow-listing origins is enough; no
# credentials mode required.
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
if DEBUG:
    # Dev convenience: Vite may pick any free port (5173, 5174, …) and the Tauri
    # desktop webview serves from tauri://localhost / http(s)://tauri.localhost.
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^http://localhost:\d+$",
        r"^http://127\.0\.0\.1:\d+$",
        r"^tauri://localhost$",
        r"^https?://tauri\.localhost$",
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
