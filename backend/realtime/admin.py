from django.contrib import admin

from .models import Presence, SectionLock


@admin.register(Presence)
class PresenceAdmin(admin.ModelAdmin):
    list_display = ("user", "page", "last_seen")


@admin.register(SectionLock)
class SectionLockAdmin(admin.ModelAdmin):
    list_display = ("page", "section_id", "user", "locked_at", "expires_at")
