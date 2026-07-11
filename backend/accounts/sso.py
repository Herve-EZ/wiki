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
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

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
