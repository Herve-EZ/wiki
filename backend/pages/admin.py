from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import Page, PageLink, PageVersion


@admin.register(Page)
class PageAdmin(SimpleHistoryAdmin):
    list_display = ("title", "workspace", "slug", "status", "updated_at")
    list_filter = ("status", "workspace")
    search_fields = ("title", "slug")


@admin.register(PageVersion)
class PageVersionAdmin(admin.ModelAdmin):
    list_display = ("page", "version_number", "author", "created_at")
    readonly_fields = ("page", "title", "content_md", "version_number", "author")


@admin.register(PageLink)
class PageLinkAdmin(admin.ModelAdmin):
    list_display = ("from_page", "to_page", "created_at")
