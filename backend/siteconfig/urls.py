from django.urls import path

from . import views

urlpatterns = [
    # Public branding + usable auth methods (drives the login page).
    path("config", views.PublicConfigView.as_view(), name="public_config"),
    # System-admin surface.
    path("admin/config", views.AdminConfigView.as_view(), name="admin_config"),
    path(
        "admin/config/test-email",
        views.AdminTestEmailView.as_view(),
        name="admin_test_email",
    ),
    path("admin/users", views.AdminUserListView.as_view(), name="admin_users"),
    path(
        "admin/users/<uuid:user_id>",
        views.AdminUserDetailView.as_view(),
        name="admin_user_detail",
    ),
]
