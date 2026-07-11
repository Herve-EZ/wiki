"""Consumer tests: presence, locks, heartbeat — over the real ASGI stack
(in-memory channel layer, JWT in the query string)."""
import pytest
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import RefreshToken

from config.asgi import application

TIMEOUT = 5


@database_sync_to_async
def make_fixtures():
    from django.contrib.auth import get_user_model

    from pages.models import Page
    from workspaces.models import Workspace, WorkspaceMember

    User = get_user_model()
    alice = User.objects.create_user(email="alice@x.com", password="testpass123")
    bob = User.objects.create_user(email="bob@x.com", password="testpass123")
    ws = Workspace.objects.create(slug="rt", name="RT", created_by=alice)
    for u in (alice, bob):
        WorkspaceMember.objects.create(
            workspace=ws, user=u, role=WorkspaceMember.Role.EDITOR
        )
    page = Page.objects.create(workspace=ws, title="P", slug="p", author=alice)
    return alice, bob, page


def _connect(page, user) -> WebsocketCommunicator:
    token = str(RefreshToken.for_user(user).access_token)
    return WebsocketCommunicator(application, f"/ws/page/{page.pk}/?token={token}")


async def _drain_until(comm, event_type, pred=None):
    """Read frames until `event_type` (and optional predicate) shows up —
    tolerates interleaving/ordering races between direct and group sends."""
    for _ in range(10):
        msg = await comm.receive_json_from(timeout=TIMEOUT)
        if msg["type"] == event_type and (pred is None or pred(msg)):
            return msg
    raise AssertionError(f"never received {event_type}")


@pytest.mark.django_db(transaction=True)
async def test_rejects_anonymous():
    _, _, page = await make_fixtures()
    comm = WebsocketCommunicator(application, f"/ws/page/{page.pk}/")
    connected, code = await comm.connect(timeout=TIMEOUT)
    assert not connected
    assert code == 4401


@pytest.mark.django_db(transaction=True)
async def test_presence_sync_and_join_broadcast():
    alice, bob, page = await make_fixtures()

    c1 = _connect(page, alice)
    connected, _ = await c1.connect(timeout=TIMEOUT)
    assert connected
    sync = await _drain_until(c1, "presence.sync")
    assert [u["email"] for u in sync["users"]] == ["alice@x.com"]

    c2 = _connect(page, bob)
    connected, _ = await c2.connect(timeout=TIMEOUT)
    assert connected
    # alice sees bob arrive (skipping the echo of her own join)
    join = await _drain_until(c1, "presence.join", lambda m: m["email"] == "bob@x.com")
    assert join["email"] == "bob@x.com"
    sync2 = await _drain_until(c2, "presence.sync")
    assert {u["email"] for u in sync2["users"]} == {"alice@x.com", "bob@x.com"}

    await c2.disconnect()
    leave = await _drain_until(c1, "presence.leave")
    assert leave["user_id"] == str(bob.pk)
    await c1.disconnect()


@pytest.mark.django_db(transaction=True)
async def test_lock_acquire_denied_release():
    alice, bob, page = await make_fixtures()
    c1, c2 = _connect(page, alice), _connect(page, bob)
    await c1.connect(timeout=TIMEOUT)
    await c2.connect(timeout=TIMEOUT)
    await _drain_until(c2, "lock.sync")

    await c1.send_json_to({"type": "lock.acquire", "section_id": "h2-1"})
    granted = await _drain_until(c1, "lock.acquire")
    assert granted["user_id"] == str(alice.pk)

    # bob is refused while alice holds it
    await c2.send_json_to({"type": "lock.acquire", "section_id": "h2-1"})
    denied = await _drain_until(c2, "lock.denied")
    assert denied["user_id"] == str(alice.pk)

    # alice releases → bob sees the release and can take it
    await c1.send_json_to({"type": "lock.release", "section_id": "h2-1"})
    released = await _drain_until(c2, "lock.release")
    assert released["section_id"] == "h2-1"
    await c2.send_json_to({"type": "lock.acquire", "section_id": "h2-1"})
    granted2 = await _drain_until(c2, "lock.acquire")
    assert granted2["user_id"] == str(bob.pk)

    await c1.disconnect()
    await c2.disconnect()


@pytest.mark.django_db(transaction=True)
async def test_disconnect_releases_held_locks():
    alice, bob, page = await make_fixtures()
    c1, c2 = _connect(page, alice), _connect(page, bob)
    await c1.connect(timeout=TIMEOUT)
    await c2.connect(timeout=TIMEOUT)
    await _drain_until(c2, "lock.sync")

    await c1.send_json_to({"type": "lock.acquire", "section_id": "h2-9"})
    await _drain_until(c2, "lock.acquire")
    await c1.disconnect()

    released = await _drain_until(c2, "lock.release")
    assert released["section_id"] == "h2-9"
    await c2.disconnect()


@pytest.mark.django_db(transaction=True)
async def test_heartbeat_ack():
    alice, _, page = await make_fixtures()
    c = _connect(page, alice)
    await c.connect(timeout=TIMEOUT)
    await _drain_until(c, "lock.sync")
    await c.send_json_to({"type": "heartbeat"})
    ack = await _drain_until(c, "heartbeat.ack")
    assert ack["type"] == "heartbeat.ack"
    await c.disconnect()
