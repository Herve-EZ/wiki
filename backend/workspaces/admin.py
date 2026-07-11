from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import Workspace, WorkspaceInvitation, WorkspaceMember


class MemberInline(admin.TabularInline):
    model = WorkspaceMember
    extra = 0


@admin.register(Workspace)
class WorkspaceAdmin(SimpleHistoryAdmin):
    list_display = ["name", "slug", "permission", "require_mfa"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [MemberInline]

    def save_model(self, request, obj, form, change):
        # Mirror the API behaviour: an admin-created workspace still needs an
        # owner membership, otherwise nobody has any role in it.
        if not change and not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        if not change and obj.created_by:
            WorkspaceMember.objects.get_or_create(
                workspace=obj,
                user=obj.created_by,
                defaults={"role": WorkspaceMember.Role.OWNER},
            )


admin.site.register(WorkspaceMember)


@admin.register(WorkspaceInvitation)
class WorkspaceInvitationAdmin(admin.ModelAdmin):
    list_display = ["email", "workspace", "role", "status", "expires_at"]
    list_filter = ["status", "role"]
    search_fields = ["email"]
