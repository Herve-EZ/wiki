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


admin.site.register(WorkspaceMember)


@admin.register(WorkspaceInvitation)
class WorkspaceInvitationAdmin(admin.ModelAdmin):
    list_display = ["email", "workspace", "role", "status", "expires_at"]
    list_filter = ["status", "role"]
    search_fields = ["email"]
