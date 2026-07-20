from rest_framework.permissions import BasePermission


def is_system_admin(user) -> bool:
    """A system admin is a platform-wide role, above per-workspace owners.

    Django superusers are implicitly system admins (so the bootstrap
    ``createsuperuser`` account can always administer the platform); the
    dedicated ``is_system_admin`` flag lets one superuser promote others
    without handing out full superuser rights.
    """
    return bool(
        user
        and user.is_authenticated
        and (user.is_superuser or getattr(user, "is_system_admin", False))
    )


class IsSystemAdmin(BasePermission):
    message = "Réservé aux administrateurs système."

    def has_permission(self, request, view):
        return is_system_admin(request.user)
