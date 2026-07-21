from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """GET /api/notifications — paginated list, optional ``?unread=1`` filter."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(
            recipient=request.user
        ).select_related("actor")
        if request.query_params.get("unread") == "1":
            qs = qs.filter(read_at__isnull=True)
        results = qs[:100]
        return Response(NotificationSerializer(results, many=True).data)


class UnreadCountView(APIView):
    """GET /api/notifications/unread-count"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, read_at__isnull=True
        ).count()
        return Response({"count": count})


class MarkReadView(APIView):
    """POST /api/notifications/<id>/read"""

    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        updated = Notification.objects.filter(
            pk=notification_id, recipient=request.user, read_at__isnull=True
        ).update(read_at=timezone.now())
        if not updated:
            return Response({"detail": "Not found or already read."}, status=404)
        return Response({"ok": True})


class MarkAllReadView(APIView):
    """POST /api/notifications/read-all"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        count = Notification.objects.filter(
            recipient=request.user, read_at__isnull=True
        ).update(read_at=timezone.now())
        return Response({"marked": count})


class NotificationDetailView(APIView):
    """DELETE /api/notifications/<id> — remove a single notification."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):
        deleted, _ = Notification.objects.filter(
            pk=notification_id, recipient=request.user
        ).delete()
        if not deleted:
            return Response({"detail": "Not found."}, status=404)
        return Response(status=204)


class SubscribePageView(APIView):
    """POST/DELETE /api/pages/<id>/subscribe"""

    permission_classes = [IsAuthenticated]

    def post(self, request, page_id):
        from notifications.models import PageSubscription
        from pages.models import Page

        page = Page.objects.filter(pk=page_id).first()
        if not page:
            return Response({"detail": "Page not found."}, status=404)
        PageSubscription.objects.get_or_create(user=request.user, page=page)
        return Response({"subscribed": True}, status=201)

    def delete(self, request, page_id):
        from notifications.models import PageSubscription

        PageSubscription.objects.filter(
            user=request.user, page_id=page_id
        ).delete()
        return Response({"subscribed": False})

    def get(self, request, page_id):
        from notifications.models import PageSubscription

        exists = PageSubscription.objects.filter(
            user=request.user, page_id=page_id
        ).exists()
        return Response({"subscribed": exists})
