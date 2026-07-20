from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Workspace, WorkspaceInvitation, WorkspaceMember
from .permissions import WorkspaceAccess, is_owner
from .serializers import (
    InvitationCreateSerializer,
    MemberRoleSerializer,
    MyInvitationSerializer,
    WorkspaceInvitationSerializer,
    WorkspaceMemberSerializer,
    WorkspaceSerializer,
)


def _send_invitation_email(invitation: WorkspaceInvitation) -> None:
    """Deliver the invite link. Never let a mail misconfig break the request —
    in DEBUG the console backend just prints the message (link included)."""
    link = f"{settings.FRONTEND_URL.rstrip('/')}/invite/{invitation.token}"
    send_mail(
        subject=f"Invitation à rejoindre « {invitation.workspace.name} »",
        message=(
            f"Vous avez été invité(e) à rejoindre l'espace "
            f"« {invitation.workspace.name} » en tant que "
            f"{invitation.get_role_display()}.\n\n"
            f"Ouvrez ce lien pour accepter l'invitation :\n{link}\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[invitation.email],
        fail_silently=True,
    )


def _is_last_owner(workspace: Workspace, member: WorkspaceMember) -> bool:
    if member.role != WorkspaceMember.Role.OWNER:
        return False
    return (
        workspace.members.filter(role=WorkspaceMember.Role.OWNER).count() <= 1
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

    @action(detail=True, methods=["get"])
    def members(self, request, slug=None):
        workspace = self.get_object()
        qs = workspace.members.select_related("user")
        return Response(WorkspaceMemberSerializer(qs, many=True).data)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"members/(?P<member_id>[^/.]+)",
    )
    def member_detail(self, request, slug=None, member_id=None):
        """Change a member's role (PATCH) or remove them (DELETE) — owner only.
        The last remaining owner can neither be removed nor demoted."""
        workspace = self.get_object()
        if not is_owner(request.user, workspace):
            raise PermissionDenied("Only the workspace owner can manage members.")
        member = (
            workspace.members.select_related("user").filter(pk=member_id).first()
        )
        if not member:
            raise NotFound("Member not found.")

        if request.method == "DELETE":
            if _is_last_owner(workspace, member):
                raise ValidationError({"detail": "Cannot remove the last owner."})
            member.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        s = MemberRoleSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        new_role = s.validated_data["role"]
        if _is_last_owner(workspace, member) and new_role != WorkspaceMember.Role.OWNER:
            raise ValidationError({"detail": "Cannot demote the last owner."})
        member.role = new_role
        member.save(update_fields=["role"])
        return Response(WorkspaceMemberSerializer(member).data)

    @action(detail=True, methods=["get", "post"])
    def invitations(self, request, slug=None):
        workspace = self.get_object()
        if not is_owner(request.user, workspace):
            raise PermissionDenied("Only the workspace owner can manage invitations.")

        if request.method == "GET":
            qs = workspace.invitations.filter(
                status=WorkspaceInvitation.Status.PENDING
            ).select_related("invited_by")
            return Response(WorkspaceInvitationSerializer(qs, many=True).data)

        s = InvitationCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email = s.validated_data["email"]
        role = s.validated_data["role"]

        # Already an accepted member?
        if workspace.members.filter(user__email__iexact=email).exists():
            raise ValidationError({"detail": "This person is already a member."})
        # Refresh an existing pending invite rather than violating the constraint.
        invitation, created = WorkspaceInvitation.objects.get_or_create(
            workspace=workspace,
            email=email,
            status=WorkspaceInvitation.Status.PENDING,
            defaults={"role": role, "invited_by": request.user},
        )
        if not created:
            invitation.role = role
            invitation.invited_by = request.user
            invitation.save(update_fields=["role", "invited_by"])
        _send_invitation_email(invitation)
        return Response(
            WorkspaceInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"invitations/(?P<invitation_id>[^/.]+)",
    )
    def invitation_detail(self, request, slug=None, invitation_id=None):
        """Revoke a pending invitation — owner only."""
        workspace = self.get_object()
        if not is_owner(request.user, workspace):
            raise PermissionDenied("Only the workspace owner can manage invitations.")
        invitation = workspace.invitations.filter(pk=invitation_id).first()
        if not invitation:
            raise NotFound("Invitation not found.")
        invitation.status = WorkspaceInvitation.Status.REVOKED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=["status", "responded_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def pages(self, request, slug=None):
        from pages.serializers import PageListSerializer

        workspace = self.get_object()
        qs = workspace.pages.order_by("title")
        return Response(PageListSerializer(qs, many=True).data)


class MyInvitationsView(APIView):
    """Pending invitations addressed to the current user (matched by email)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            WorkspaceInvitation.objects.filter(
                email__iexact=request.user.email,
                status=WorkspaceInvitation.Status.PENDING,
                expires_at__gt=timezone.now(),
            )
            .select_related("workspace", "invited_by")
            .order_by("-created_at")
        )
        return Response(MyInvitationSerializer(qs, many=True).data)


class InvitationDetailView(APIView):
    """Public landing for an invite link — shows enough to decide, even before
    the recipient has an account."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        invitation = get_object_or_404(
            WorkspaceInvitation.objects.select_related("workspace", "invited_by"),
            token=token,
        )
        data = MyInvitationSerializer(invitation).data
        data["is_expired"] = invitation.is_expired
        return Response(data)


class InvitationAcceptView(APIView):
    """Accept an invitation — this is the only place a membership is created,
    so a workspace never appears in an interface before the user accepts."""

    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        invitation = get_object_or_404(
            WorkspaceInvitation.objects.select_related("workspace"), token=token
        )
        if invitation.status != WorkspaceInvitation.Status.PENDING:
            raise ValidationError({"detail": "This invitation is no longer pending."})
        if invitation.is_expired:
            raise ValidationError({"detail": "This invitation has expired."})
        if invitation.email.lower() != request.user.email.lower():
            raise PermissionDenied(
                "This invitation was sent to a different email address."
            )
        WorkspaceMember.objects.get_or_create(
            workspace=invitation.workspace,
            user=request.user,
            defaults={"role": invitation.role},
        )
        invitation.status = WorkspaceInvitation.Status.ACCEPTED
        invitation.responded_at = timezone.now()
        invitation.accepted_by = request.user
        invitation.save(update_fields=["status", "responded_at", "accepted_by"])
        return Response(
            WorkspaceSerializer(
                invitation.workspace, context={"request": request}
            ).data
        )


class InvitationDeclineView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        invitation = get_object_or_404(WorkspaceInvitation, token=token)
        if invitation.status != WorkspaceInvitation.Status.PENDING:
            raise ValidationError({"detail": "This invitation is no longer pending."})
        if invitation.email.lower() != request.user.email.lower():
            raise PermissionDenied(
                "This invitation was sent to a different email address."
            )
        invitation.status = WorkspaceInvitation.Status.DECLINED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=["status", "responded_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
