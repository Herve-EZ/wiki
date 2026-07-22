"""Root HTTP URL configuration."""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from accounts.sso_views import SSOCompleteView
from pages.views import AttachmentRawView, SearchView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Landing page allauth redirects to after social login (LOGIN_REDIRECT_URL).
    path("sso/complete", SSOCompleteView.as_view(), name="sso_complete"),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("siteconfig.urls")),
    path("api/", include("workspaces.urls")),
    path("api/", include("pages.urls")),
    path("api/", include("workflows.urls")),
    path("api/", include("notifications.urls")),
    path("api/search", SearchView.as_view(), name="search"),
    path("api/attachments/<uuid:pk>/raw", AttachmentRawView.as_view(), name="attachment-raw"),
    # OpenAPI schema + interactive docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    # allauth drives the SSO web flows (social + SAML); our callback adapter
    # exchanges the completed allauth login for a JWT pair.
    path("accounts/", include("allauth.urls")),
]
