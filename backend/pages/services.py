"""Domain services for pages: versioning snapshots, link detection, diff.

Rule from the technical plan: persist BEFORE broadcasting. Every service here
completes its database work inside a transaction; WebSocket notifications are
sent only after commit (via transaction.on_commit).
"""
import difflib
import re

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Max

from .models import Page, PageLink, PageVersion

WIKILINK_RE = re.compile(r"\[\[([^\[\]|]+)(?:\|[^\[\]]*)?\]\]")


@transaction.atomic
def snapshot(page: Page, author) -> PageVersion:
    """Persist an immutable version of `page`. Version numbers are per-page,
    monotonically increasing; the unique constraint backstops races."""
    current = (
        PageVersion.objects.select_for_update()
        .filter(page=page)
        .aggregate(n=Max("version_number"))["n"]
        or 0
    )
    return PageVersion.objects.create(
        page=page,
        title=page.title,
        content_md=page.content_md,
        version_number=current + 1,
        author=author,
    )


def detect_links(page: Page) -> list[PageLink]:
    """Rebuild PageLink rows for `page` from its content.

    Two signals, scoped to the same workspace:
    - explicit wikilinks  [[Titre]] or [[slug]] (with optional [[cible|texte]])
    - plain-text mentions of another page's exact title (word-bounded,
      case-insensitive, titles of 3+ chars to avoid noise)
    """
    siblings = Page.objects.filter(workspace=page.workspace).exclude(pk=page.pk)
    by_key = {}
    for p in siblings:
        by_key[p.slug.lower()] = p
        by_key[p.title.lower()] = p

    targets = set()
    for raw in WIKILINK_RE.findall(page.content_md):
        hit = by_key.get(raw.strip().lower())
        if hit:
            targets.add(hit)

    content_lower = page.content_md.lower()
    for p in siblings:
        title = p.title.lower()
        if len(title) < 3 or p in targets:
            continue
        if re.search(rf"(?<!\w){re.escape(title)}(?!\w)", content_lower):
            targets.add(p)

    with transaction.atomic():
        PageLink.objects.filter(from_page=page).delete()
        links = [
            PageLink.objects.create(from_page=page, to_page=t) for t in targets
        ]
    return links


def save_page(page: Page, author, **fields) -> Page:
    """Apply `fields`, snapshot the new state, rebuild links, then notify
    pages that reference this one (after commit — persist before broadcast)."""
    with transaction.atomic():
        for name, value in fields.items():
            setattr(page, name, value)
        page.save()
        snapshot(page, author)
        detect_links(page)
        transaction.on_commit(lambda: _post_save_notifications(page, author))
    return page


MENTION_RE = re.compile(r"(?<!\w)@([\w.@+-]+(?:\s[\w.@+-]+)?)", re.UNICODE)


def _post_save_notifications(page: Page, author):
    """Run after commit: backlink WS push + persistent notifications."""
    notify_backlinked_pages(page)
    from notifications.services import auto_subscribe, notify_page_updated
    auto_subscribe(author, page)
    notify_page_updated(page, author)
    _process_mentions(page, author)


def _process_mentions(page: Page, author):
    """Parse @display_name or @email in content and notify mentioned users."""
    from django.contrib.auth import get_user_model
    from notifications.services import notify_mention

    User = get_user_model()
    members = User.objects.filter(
        workspace_memberships__workspace=page.workspace
    )
    name_map: dict[str, object] = {}
    for m in members:
        if m.display_name:
            name_map[m.display_name.lower()] = m
        name_map[m.email.lower()] = m

    mentioned: set[str] = set()
    for match in MENTION_RE.finditer(page.content_md):
        token = match.group(1).lower()
        user = name_map.get(token)
        if user and str(user.pk) not in mentioned:
            mentioned.add(str(user.pk))
            notify_mention(page, author, user)


def restore(page: Page, version_number: int, author) -> PageVersion:
    """Restore an old version by creating a NEW version with its content
    (history is never rewritten)."""
    old = page.versions.get(version_number=version_number)
    return save_page(
        page, author, title=old.title, content_md=old.content_md
    ).versions.first()


def diff(page: Page, v_from: int, v_to: int) -> dict:
    """Line-based diff between two versions (difflib), as structured ops the
    frontend can render, plus the classic unified-diff text."""
    a = page.versions.get(version_number=v_from)
    b = page.versions.get(version_number=v_to)
    a_lines = a.content_md.splitlines()
    b_lines = b.content_md.splitlines()

    ops = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(
        a=a_lines, b=b_lines, autojunk=False
    ).get_opcodes():
        ops.append(
            {
                "op": tag,  # equal | replace | delete | insert
                "from_lines": a_lines[i1:i2],
                "to_lines": b_lines[j1:j2],
                "from_start": i1 + 1,
                "to_start": j1 + 1,
            }
        )
    unified = "\n".join(
        difflib.unified_diff(
            a_lines, b_lines,
            fromfile=f"v{v_from}", tofile=f"v{v_to}", lineterm="",
        )
    )
    return {"from": v_from, "to": v_to, "ops": ops, "unified": unified}


def notify_backlinked_pages(page: Page):
    """Push a `notify.update` event to the WS group of every page that links
    TO `page`, so open editors can show the 'linked page changed' badge."""
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    backlink_ids = PageLink.objects.filter(to_page=page).values_list(
        "from_page_id", flat=True
    )
    for pid in backlink_ids:
        async_to_sync(channel_layer.group_send)(
            f"page_{pid}",
            {
                "type": "notify.update",
                "page_id": str(page.pk),
                "title": page.title,
            },
        )
