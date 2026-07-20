"""SSO bridge: turn a completed django-allauth login into a JWT pair.

allauth handles the SSO web flow (OAuth/OIDC social + SAML). When the flow
finishes and the user lands back on the app, this adapter runs. If the account
has MFA enabled we still require the second factor before any JWT is granted;
otherwise we hand out the tokens immediately.

Wire this up in settings via:
    SOCIALACCOUNT_ADAPTER = "accounts.sso.JWTSocialAdapter"

For a headless/SPA frontend, the callback view can redirect to the frontend
with either the JWT pair or an `mfa_required` marker + challenge token in a
short-lived, single-use exchange (never put JWTs directly in a URL in prod —
use a one-time code exchanged over POST).
"""
import secrets

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.core.cache import cache

from . import mfa
from .views import issue_jwt


class JWTSocialAdapter(DefaultSocialAccountAdapter):
    def get_login_redirect_url(self, request):  # pragma: no cover - flow glue
        return "/sso/complete"


def tokens_for_sso_user(user) -> dict:
    """Called by the SSO completion view once allauth has authenticated user."""
    if user.mfa_enabled:
        return {"mfa_required": True, "challenge_token": mfa.issue_challenge_token(user)}
    return issue_jwt(user)


# --- One-time SSO exchange code -------------------------------------------
# The browser finishes the allauth flow (Django session), but the SPA/desktop
# app authenticates with JWT. We can't put JWTs in a redirect URL, so the
# completion page hands the app a short-lived, single-use code (over a custom
# scheme deep link for desktop). The app POSTs it back to exchange it for the
# real tokens. The code maps only to a user id in the cache — no token material
# is stored — and is burned on first use.
_SSO_CODE_PREFIX = "sso:code:"
_SSO_CODE_TTL_SECONDS = 120


def issue_sso_code(user) -> str:
    code = secrets.token_urlsafe(32)
    cache.set(_SSO_CODE_PREFIX + code, str(user.pk), timeout=_SSO_CODE_TTL_SECONDS)
    return code


def resolve_sso_code(code: str):
    """Return the user id for a valid, unexpired, unused code — burning it — or
    None."""
    key = _SSO_CODE_PREFIX + (code or "")
    uid = cache.get(key)
    if uid is None:
        return None
    cache.delete(key)  # single use
    return uid
