from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Workspace, WorkspaceMember
from .permissions import WorkspaceAccess, get_role
from .serializers import (
    MemberInviteSerializer,
    WorkspaceMemberSerializer,
    WorkspaceSerializer,
)


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated, WorkspaceAccess]
    lookup_field = "slug"

    def get_queryset(self):
        user = self.request.user
        return Workspace.objects.filter(
            Q(members__user=user) | Q(permission=Workspace.Permission.PUBLIC)
        ).distinct()

    def perform_create(self, serializer):
        workspace = serializer.save(created_by=self.request.user)
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=self.request.user,
            role=WorkspaceMember.Role.OWNER,
        )

    @action(detail=True, methods=["get", "post"])
    def members(self, request, slug=None):
        workspace = self.get_object()
        if request.method == "GET":
            qs = workspace.members.select_related("user")
            return Response(WorkspaceMemberSerializer(qs, many=True).data)

        # POST — invitation, owner only
        if get_role(request.user, workspace) != WorkspaceMember.Role.OWNER:
            raise PermissionDenied("Only the workspace owner can invite members.")
        s = MemberInviteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        member, created = WorkspaceMember.objects.get_or_create(
            workspace=workspace,
            user=s.user,
            defaults={"role": s.validated_data["role"]},
        )
        if not created:
            return Response(
                {"detail": "Already a member."}, status=status.HTTP_409_CONFLICT
            )
        return Response(
            WorkspaceMemberSerializer(member).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["get"])
    def pages(self, request, slug=None):
        from pages.serializers import PageListSerializer

        workspace = self.get_object()
        qs = workspace.pages.order_by("title")
        return Response(PageListSerializer(qs, many=True).data)
