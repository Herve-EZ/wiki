from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    mfa_enabled = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "display_name", "avatar_url", "mfa_enabled"]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Self-service edit of the caller's own profile fields."""

    class Meta:
        model = User
        fields = ["display_name", "avatar_url"]


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        validate_password(value, self.context["request"].user)
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "email", "display_name", "password"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            self.context.get("request"),
            username=attrs["email"],
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError("Invalid credentials")
        attrs["user"] = user
        return attrs


class MFAVerifySerializer(serializers.Serializer):
    challenge_token = serializers.CharField()
    code = serializers.CharField()


class MFAActivateSerializer(serializers.Serializer):
    code = serializers.CharField()
