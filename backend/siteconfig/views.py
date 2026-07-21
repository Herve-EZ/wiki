from django.contrib.auth import get_user_model
from django.core.mail import EmailMessage
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .email import get_email_connection, get_from_email
from .models import SiteConfiguration
from .permissions import IsSystemAdmin
from .serializers import (
    AdminConfigSerializer,
    AdminUserSerializer,
    PublicConfigSerializer,
)

User = get_user_model()


class PublicConfigView(APIView):
    """Anonymous-readable branding + usable auth methods. Drives the login page
    and the app-wide white-label layer (name, colours, logo)."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(PublicConfigSerializer(SiteConfiguration.load()).data)


class AdminConfigView(APIView):
    """System-admin read/write of the whole platform configuration."""

    permission_classes = [IsSystemAdmin]

    def get(self, request):
        return Response(AdminConfigSerializer(SiteConfiguration.load()).data)

    def patch(self, request):
        config = SiteConfiguration.load()
        s = AdminConfigSerializer(config, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class AdminTestEmailView(APIView):
    """POST /api/admin/config/test-email — send a test mail to the logged-in admin."""

    permission_classes = [IsSystemAdmin]

    def post(self, request):
        try:
            conn = get_email_connection()
            msg = EmailMessage(
                subject="WikiCollab — e-mail de test",
                body="Si vous lisez ce message, la configuration SMTP fonctionne correctement.",
                from_email=get_from_email(),
                to=[request.user.email],
                connection=conn,
            )
            msg.send(fail_silently=False)
        except Exception as exc:
            return Response(
                {"detail": f"Échec de l'envoi : {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": f"E-mail de test envoyé à {request.user.email}."})


class AdminUserListView(APIView):
    """List platform users so an admin can grant/revoke the system-admin role."""

    permission_classes = [IsSystemAdmin]

    def get(self, request):
        users = User.objects.order_by("email")
        return Response(AdminUserSerializer(users, many=True).data)


class AdminUserDetailView(APIView):
    """Toggle a user's ``is_system_admin`` flag."""

    permission_classes = [IsSystemAdmin]

    def patch(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        s = AdminUserSerializer(user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        # Superusers are implicitly admins; the flag on them is a no-op, but we
        # still guard against an admin demoting the account they're logged in as
        # to avoid accidentally locking the platform's admin surface.
        if user == request.user and not user.is_superuser:
            new_value = s.validated_data.get("is_system_admin", user.is_system_admin)
            if not new_value:
                return Response(
                    {"detail": "Vous ne pouvez pas retirer votre propre accès administrateur."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        s.save()
        return Response(s.data)
