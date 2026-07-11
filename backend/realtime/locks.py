"""Section-lock logic: exclusive, TTL-bounded, cleaned lazily and on disconnect."""
from channels.db import database_sync_to_async
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import SectionLock


def _ttl():
    return timezone.now() + timezone.timedelta(seconds=SectionLock.TTL_SECONDS)


@database_sync_to_async
def acquire(page_id, user, section_id: str) -> dict:
    """Try to take the lock. Returns
    {granted, section_id, user_id, display_name, expires_at}."""
    now = timezone.now()
    with transaction.atomic():
        SectionLock.objects.filter(
            page_id=page_id, section_id=section_id, expires_at__lt=now
        ).delete()
        existing = (
            SectionLock.objects.select_for_update()
            .filter(page_id=page_id, section_id=section_id)
            .select_related("user")
            .first()
        )
        if existing and existing.user_id != user.pk:
            return {
                "granted": False,
                "section_id": section_id,
                "user_id": str(existing.user_id),
                "display_name": existing.user.display_name or existing.user.email,
                "expires_at": existing.expires_at.isoformat(),
            }
        if existing:  # same user → extend the TTL
            existing.expires_at = _ttl()
            existing.save(update_fields=["expires_at"])
            lock = existing
        else:
            try:
                lock = SectionLock.objects.create(
                    page_id=page_id, user=user,
                    section_id=section_id, expires_at=_ttl(),
                )
            except IntegrityError:  # lost a race — somebody else got it
                return _denied_payload(page_id, section_id)
    return {
        "granted": True,
        "section_id": section_id,
        "user_id": str(user.pk),
        "display_name": user.display_name or user.email,
        "expires_at": lock.expires_at.isoformat(),
    }


def _denied_payload(page_id, section_id) -> dict:
    holder = (
        SectionLock.objects.filter(page_id=page_id, section_id=section_id)
        .select_related("user")
        .first()
    )
    return {
        "granted": False,
        "section_id": section_id,
        "user_id": str(holder.user_id) if holder else None,
        "display_name": (
            (holder.user.display_name or holder.user.email) if holder else None
        ),
        "expires_at": holder.expires_at.isoformat() if holder else None,
    }


@database_sync_to_async
def release(page_id, user, section_id: str) -> bool:
    """Release if held by `user`. True if a lock was actually removed."""
    deleted, _ = SectionLock.objects.filter(
        page_id=page_id, section_id=section_id, user=user
    ).delete()
    return deleted > 0


@database_sync_to_async
def release_all(page_id, user) -> list[str]:
    """Drop every lock `user` holds on the page (disconnect cleanup).
    Returns the freed section ids so the consumer can broadcast them."""
    qs = SectionLock.objects.filter(page_id=page_id, user=user)
    sections = list(qs.values_list("section_id", flat=True))
    qs.delete()
    return sections


@database_sync_to_async
def active_locks(page_id) -> list[dict]:
    """Current live locks (for lock.sync at connect). Purges expired ones."""
    now = timezone.now()
    SectionLock.objects.filter(page_id=page_id, expires_at__lt=now).delete()
    return [
        {
            "section_id": lk.section_id,
            "user_id": str(lk.user_id),
            "display_name": lk.user.display_name or lk.user.email,
            "expires_at": lk.expires_at.isoformat(),
        }
        for lk in SectionLock.objects.filter(page_id=page_id).select_related("user")
    ]
