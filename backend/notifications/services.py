"""Notification creation helpers — used by other apps to emit notifications."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import Notification, NotificationType, PageSubscription

User = get_user_model()

PAGE_UPDATE_DEDUP_MINUTES = 15


def notify(*, recipient, type: str, title: str, body: str = "", actor=None, payload: dict | None = None):
    """Create a single notification."""
    return Notification.objects.create(
        recipient=recipient,
        actor=actor,
        type=type,
        title=title,
        body=body,
        payload=payload or {},
    )


def notify_invitation(invitation, actor=None):
    """Notify the invitee (if they have an account) about a workspace invitation."""
    try:
        recipient = User.objects.get(email=invitation.email)
    except User.DoesNotExist:
        return None
    return notify(
        recipient=recipient,
        actor=actor,
        type=NotificationType.INVITATION,
        title=f"Invitation à « {invitation.workspace.name} »",
        body=f"Vous avez été invité(e) en tant que {invitation.get_role_display()}.",
        payload={
            "workspace_id": str(invitation.workspace_id),
            "workspace_slug": invitation.workspace.slug,
            "invitation_token": str(invitation.token),
        },
    )


def auto_subscribe(user, page):
    """Subscribe a user to a page unless they previously unsubscribed."""
    PageSubscription.objects.get_or_create(user=user, page=page)


def notify_page_updated(page, actor):
    """Notify subscribers of a page update, with 15-min dedup per (recipient, page)."""
    cutoff = timezone.now() - timedelta(minutes=PAGE_UPDATE_DEDUP_MINUTES)
    subs = PageSubscription.objects.filter(page=page).exclude(user=actor).select_related("user")
    for sub in subs:
        already = Notification.objects.filter(
            recipient=sub.user,
            type=NotificationType.PAGE_UPDATED,
            payload__page_id=str(page.id),
            created_at__gte=cutoff,
        ).exists()
        if already:
            continue
        notify(
            recipient=sub.user,
            actor=actor,
            type=NotificationType.PAGE_UPDATED,
            title=f"« {page.title} » a été modifiée",
            body=f"par {actor.display_name or actor.email}",
            payload={
                "page_id": str(page.id),
                "workspace_id": str(page.workspace_id),
                "workspace_slug": page.workspace.slug,
            },
        )


def notify_workflow_stage(page, actor, from_stage_name, to_stage_name):
    """Notify subscribers when a page changes workflow stage."""
    subs = PageSubscription.objects.filter(page=page).select_related("user")
    for sub in subs:
        notify(
            recipient=sub.user,
            actor=actor,
            type=NotificationType.WORKFLOW_STAGE,
            title=f"« {page.title} » → {to_stage_name}",
            body=f"Étape précédente : {from_stage_name or '—'}",
            payload={
                "page_id": str(page.id),
                "workspace_id": str(page.workspace_id),
                "workspace_slug": page.workspace.slug,
                "from_stage": from_stage_name or "",
                "to_stage": to_stage_name or "",
            },
        )


def notify_mention(page, actor, mentioned_user):
    """Notify a user who was mentioned in a page."""
    if mentioned_user == actor:
        return
    notify(
        recipient=mentioned_user,
        actor=actor,
        type=NotificationType.MENTION,
        title=f"Vous avez été mentionné(e) dans « {page.title} »",
        body=f"par {actor.display_name or actor.email}",
        payload={
            "page_id": str(page.id),
            "workspace_id": str(page.workspace_id),
            "workspace_slug": page.workspace.slug,
        },
    )
