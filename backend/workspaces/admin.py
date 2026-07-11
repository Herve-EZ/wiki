from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import Workspace, WorkspaceMember


class MemberInline(admin.TabularInline):
    model = WorkspaceMember
    extra = 0


@admin.register(Workspace)
class WorkspaceAdmin(SimpleHistoryAdmin):
    list_display = ["name", "slug", "permission", "require_mfa"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [MemberInline]


admin.site.register(WorkspaceMember)
