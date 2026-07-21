from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import RecoveryCode, TOTPDevice, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = ["email", "display_name", "is_system_admin", "is_staff", "mfa_enabled"]
    search_fields = ["email", "display_name"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("display_name", "avatar")}),
        (
            "Permissions",
            {"fields": ("is_active", "is_system_admin", "is_staff", "is_superuser", "groups")},
        ),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),
    )


admin.site.register(TOTPDevice)
admin.site.register(RecoveryCode)
