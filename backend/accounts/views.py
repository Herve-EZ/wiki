from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from . import mfa
from .models import RecoveryCode
from .serializers import (
    LoginSerializer,
    MFAActivateSerializer,
    MFAVerifySerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


def issue_jwt(user) -> dict:
    """Emit the access/refresh pair. Call this ONLY after MFA (if any) passed."""
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """First factor. Returns JWT directly, or an MFA challenge if MFA is on."""

    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        s = LoginSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        user = s.validated_data["user"]
        if user.mfa_enabled:
            return Response(
                {
                    "mfa_required": True,
                    "challenge_token": mfa.issue_challenge_token(user),
                }
            )
        return Response(issue_jwt(user))


class MFAVerifyView(APIView):
    """Second factor. Exchanges the challenge token + code for the JWT pair.
    The challenge token is single-use: replaying it is rejected."""

    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        s = MFAVerifySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        uid = mfa.resolve_challenge_token(s.validated_data["challenge_token"])
        if not uid:
            return Response(
                {"detail": "Invalid or expired challenge"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.get(pk=uid)
        if not mfa.verify_second_factor(user, s.validated_data["code"]):
            return Response(
                {"detail": "Invalid code"}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(issue_jwt(user))


class MFASetupView(APIView):
    """Start TOTP enrolment: returns the secret + a QR data-URI to scan."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        _, secret, qr = mfa.start_totp_setup(request.user)
        return Response({"secret": secret, "qr_code": qr})


class MFAActivateView(APIView):
    """Confirm TOTP with the first generated code, then hand back recovery codes."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = MFAActivateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if not mfa.confirm_totp(request.user, s.validated_data["code"]):
            return Response(
                {"detail": "Invalid code"}, status=status.HTTP_400_BAD_REQUEST
            )
        codes = RecoveryCode.generate_batch(request.user)
        return Response({"activated": True, "recovery_codes": codes})


class MFADisableView(APIView):
    """Disabling MFA is sensitive: re-authentication (password) is required."""

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        password = request.data.get("password", "")
        if not request.user.check_password(password):
            return Response(
                {"detail": "Password confirmation required to disable MFA."},
                status=status.HTTP_403_FORBIDDEN,
            )
        request.user.totp_devices.all().delete()
        request.user.recovery_codes.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RecoveryCodesView(APIView):
    """Regenerate the batch of single-use backup codes."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        codes = RecoveryCode.generate_batch(request.user)
        return Response({"recovery_codes": codes})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
