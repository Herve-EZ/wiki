"""SSO completion bridge (browser → app).

allauth finishes the social flow with a Django *session* in the browser, but
the SPA/desktop app authenticates with JWT. These two views bridge the gap:

- ``SSOCompleteView`` (LOGIN_REDIRECT_URL): the page allauth lands on after a
  successful social login. It mints a single-use code and hands it to the
  desktop app through the ``wikicollab://`` deep link, then ends the browser
  session. No token ever travels in a URL.
- ``SSOExchangeView``: the app POSTs the code back and receives the real JWT
  pair (or an MFA challenge), exactly like password login.
"""
from django.contrib.auth import get_user_model, logout
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.views import View
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .sso import issue_sso_code, resolve_sso_code, tokens_for_sso_user

User = get_user_model()

_DEEP_LINK_SCHEME = "wikicollab"


def _page(title: str, body_html: str, *, status_code: int = 200) -> HttpResponse:
    html = f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — WikiCollab</title>
<style>
  body {{ font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: #f7f6fa;
         color: #1b1830; display: flex; min-height: 100vh; margin: 0; align-items: center;
         justify-content: center; }}
  .card {{ background: #fff; border: 1px solid #e6e4ee; border-radius: 12px; padding: 32px;
          max-width: 420px; text-align: center; box-shadow: 0 8px 28px rgba(27,24,48,.08); }}
  h1 {{ font-size: 18px; margin: 0 0 8px; }}
  p {{ color: #5d5972; font-size: 14px; line-height: 1.6; }}
  .btn {{ display: inline-block; margin-top: 12px; padding: 10px 18px; border-radius: 8px;
         background: #534ab7; color: #fff; text-decoration: none; font-weight: 600; }}
</style></head>
<body><div class="card">{body_html}</div></body></html>"""
    return HttpResponse(html, status=status_code)


class SSOCompleteView(View):
    """Landing page after a successful allauth social login."""

    def get(self, request):
        if not request.user.is_authenticated:
            return _page(
                "Connexion non aboutie",
                "<h1>Connexion non aboutie</h1><p>La connexion via le fournisseur "
                "n'a pas pu être finalisée. Fermez cette page et réessayez depuis "
                "l'application.</p>",
                status_code=401,
            )

        code = issue_sso_code(request.user)
        deep_link = f"{_DEEP_LINK_SCHEME}://auth?code={code}"
        # The code lives in the cache, not the session — safe to drop the
        # browser session so nothing lingers after the hand-off.
        logout(request)

        body = (
            "<h1>Connexion réussie ✅</h1>"
            "<p>Retour à l'application WikiCollab en cours…</p>"
            f'<p><a class="btn" href="{deep_link}">Ouvrir WikiCollab</a></p>'
            "<p style=\"font-size:12px;color:#8b87a0\">Si rien ne se passe, cliquez "
            "sur le bouton ci-dessus, puis revenez à l'application.</p>"
            f'<script>window.location.href = "{deep_link}";</script>'
        )
        return _page("Connexion réussie", body)


class SSOExchangeView(APIView):
    """Exchange the single-use SSO code for the JWT pair (or an MFA challenge)."""

    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        uid = resolve_sso_code(request.data.get("code", ""))
        if not uid:
            return Response(
                {"detail": "Invalid or expired code"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = get_object_or_404(User, pk=uid)
        return Response(tokens_for_sso_user(user))
