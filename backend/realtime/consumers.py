"""PageConsumer: presence + section locks + linked-page notifications.

Contract (see PLAN_TECHNIQUE.md §3): every mutation is persisted BEFORE it is
broadcast to the group. Cleanup of the user's presence row and locks happens
on disconnect.
"""
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from . import locks, presence


@database_sync_to_async
def _page_readable(page_id, user):
    from pages.models import Page
    from workspaces.permissions import can_read

    page = Page.objects.select_related("workspace").filter(pk=page_id).first()
    if page is None:
        return None
    return page if can_read(user, page.workspace) else False


class PageConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=4401)  # unauthorized
            return
        self.page_id = self.scope["url_route"]["kwargs"]["page_id"]
        page = await _page_readable(self.page_id, user)
        if page is None:
            await self.close(code=4404)  # unknown page
            return
        if page is False:
            await self.close(code=4403)  # forbidden
            return

        self.user = user
        self.group_name = f"page_{self.page_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Persist first, then broadcast.
        me = await presence.join(self.page_id, user, self.channel_name)
        await self.channel_layer.group_send(
            self.group_name, {"type": "presence.join", **me}
        )
        await self.send_json(
            {"type": "presence.sync", "users": await presence.roster(self.page_id)}
        )
        await self.send_json(
            {"type": "lock.sync", "locks": await locks.active_locks(self.page_id)}
        )

    async def disconnect(self, code):
        if not hasattr(self, "group_name"):
            return
        await presence.leave(self.channel_name)
        for section_id in await locks.release_all(self.page_id, self.user):
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "lock.release", "section_id": section_id,
                 "user_id": str(self.user.pk)},
            )
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "presence.leave", "user_id": str(self.user.pk)},
        )
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # ---- client → server -----------------------------------------------
    async def receive_json(self, content):
        kind = content.get("type")
        if kind == "heartbeat":
            await presence.heartbeat(self.channel_name)
            await self.send_json({"type": "heartbeat.ack"})
        elif kind == "lock.acquire":
            await self._acquire(content.get("section_id"))
        elif kind == "lock.release":
            await self._release(content.get("section_id"))
        else:
            await self.send_json({"type": "error", "detail": "Unknown event type"})

    async def _acquire(self, section_id):
        if not section_id:
            await self.send_json({"type": "error", "detail": "section_id required"})
            return
        result = await locks.acquire(self.page_id, self.user, section_id)
        if result.pop("granted"):
            await self.channel_layer.group_send(
                self.group_name, {"type": "lock.acquire", **result}
            )
        else:
            await self.send_json({"type": "lock.denied", **result})

    async def _release(self, section_id):
        if not section_id:
            await self.send_json({"type": "error", "detail": "section_id required"})
            return
        if await locks.release(self.page_id, self.user, section_id):
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "lock.release", "section_id": section_id,
                 "user_id": str(self.user.pk)},
            )

    # ---- group → client handlers (type "a.b" → method a_b) ---------------
    async def presence_join(self, event):
        await self.send_json({**event, "type": "presence.join"})

    async def presence_leave(self, event):
        await self.send_json({**event, "type": "presence.leave"})

    async def lock_acquire(self, event):
        await self.send_json({**event, "type": "lock.acquire"})

    async def lock_release(self, event):
        await self.send_json({**event, "type": "lock.release"})

    async def notify_update(self, event):
        await self.send_json({**event, "type": "notify.update"})
