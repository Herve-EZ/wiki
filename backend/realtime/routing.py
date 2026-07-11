from django.urls import path

from .consumers import PageConsumer

websocket_urlpatterns = [
    path("ws/page/<uuid:page_id>/", PageConsumer.as_asgi()),
]
