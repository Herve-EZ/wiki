from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    InvitationAcceptView,
    InvitationDeclineView,
    InvitationDetailView,
    MyInvitationsView,
    WorkspaceViewSet,
)

router = DefaultRouter()
router.register("workspaces", WorkspaceViewSet, basename="workspace")

urlpatterns = [
    path("invitations/", MyInvitationsView.as_view(), name="my-invitations"),
    path(
        "invitations/<str:token>/accept",
        InvitationAcceptView.as_view(),
        name="invitation-accept",
    ),
    path(
        "invitations/<str:token>/decline",
        InvitationDeclineView.as_view(),
        name="invitation-decline",
    ),
    path(
        "invitations/<str:token>/",
        InvitationDetailView.as_view(),
        name="invitation-detail",
    ),
    *router.urls,
]
