"""Channels middleware: authenticate the WebSocket from a JWT in the query string.

    ws://host/ws/page/42/?token=<access_jwt>

SimpleJWT validates the token; the resolved user is attached to the connection
scope. Anonymous users are allowed to reach the consumer, which decides whether
to accept or close (e.g. public vs private pages).
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@database_sync_to_async
def _get_user(user_id):
    try:
        return User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode())
        token = (query.get("token") or [None])[0]
        scope["user"] = AnonymousUser()
        if token:
            try:
                access = AccessToken(token)
                scope["user"] = await _get_user(access["user_id"])
            except (TokenError, KeyError):
                pass
        return await super().__call__(scope, receive, send)
