from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import sso_views, views

urlpatterns = [
    path("register", views.RegisterView.as_view(), name="register"),
    path("token", views.LoginView.as_view(), name="token"),
    path("token/refresh", TokenRefreshView.as_view(), name="token_refresh"),
    path("me", views.MeView.as_view(), name="me"),
    # SSO: exchange the one-time code from the deep link for JWT tokens.
    path("sso/exchange", sso_views.SSOExchangeView.as_view(), name="sso_exchange"),
    path("password/change", views.PasswordChangeView.as_view(), name="password_change"),
    # MFA
    path("mfa/verify", views.MFAVerifyView.as_view(), name="mfa_verify"),
    path("mfa/totp/setup", views.MFASetupView.as_view(), name="mfa_setup"),
    path("mfa/totp/activate", views.MFAActivateView.as_view(), name="mfa_activate"),
    path("mfa/totp", views.MFADisableView.as_view(), name="mfa_disable"),
    path("mfa/recovery-codes", views.RecoveryCodesView.as_view(), name="recovery_codes"),
]
