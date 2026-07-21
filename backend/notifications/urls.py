from django.urls import path

from . import views

urlpatterns = [
    path(
        "notifications",
        views.NotificationListView.as_view(),
        name="notification_list",
    ),
    path(
        "notifications/unread-count",
        views.UnreadCountView.as_view(),
        name="notification_unread_count",
    ),
    path(
        "notifications/<uuid:notification_id>/read",
        views.MarkReadView.as_view(),
        name="notification_mark_read",
    ),
    path(
        "notifications/read-all",
        views.MarkAllReadView.as_view(),
        name="notification_mark_all_read",
    ),
    path(
        "pages/<uuid:page_id>/subscribe",
        views.SubscribePageView.as_view(),
        name="page_subscribe",
    ),
]
