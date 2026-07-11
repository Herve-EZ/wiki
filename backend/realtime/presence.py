"""Presence bookkeeping (sync ORM helpers, wrapped async for the consumer)."""
from channels.db import database_sync_to_async
from django.utils import timezone

from .models import Presence

STALE_AFTER_SECONDS = 90  # 3 missed 30 s heartbeats → considered gone


def _payload(p: Presence) -> dict:
    return {
        "user_id": str(p.user_id),
        "email": p.user.email,
        "display_name": p.user.display_name or p.user.email,
        "avatar_url": p.user.avatar_url,
    }


@database_sync_to_async
def join(page_id, user, channel_name) -> dict:
    p, _ = Presence.objects.update_or_create(
        channel_name=channel_name,
        defaults={"user": user, "page_id": page_id},
    )
    return _payload(p)


@database_sync_to_async
def leave(channel_name):
    Presence.objects.filter(channel_name=channel_name).delete()


@database_sync_to_async
def heartbeat(channel_name):
    # auto_now on last_seen → any save refreshes the timestamp
    for p in Presence.objects.filter(channel_name=channel_name):
        p.save(update_fields=["last_seen"])


@database_sync_to_async
def roster(page_id) -> list[dict]:
    """Everyone on the page, dropping silently-dead connections on the way."""
    cutoff = timezone.now() - timezone.timedelta(seconds=STALE_AFTER_SECONDS)
    Presence.objects.filter(page_id=page_id, last_seen__lt=cutoff).delete()
    return [
        _payload(p)
        for p in Presence.objects.filter(page_id=page_id).select_related("user")
    ]
