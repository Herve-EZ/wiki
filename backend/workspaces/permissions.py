from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Workspace, WorkspaceMember

WRITE_ROLES = (WorkspaceMember.Role.OWNER, WorkspaceMember.Role.EDITOR)


def get_role(user, workspace):
    """Return the member role of `user` in `workspace`, or None."""
    if not user or not user.is_authenticated:
        return None
    m = WorkspaceMember.objects.filter(workspace=workspace, user=user).first()
    return m.role if m else None


def can_read(user, workspace) -> bool:
    """Read access: any member, or anyone if the workspace is public.
    A workspace with require_mfa refuses users without a second factor."""
    if workspace.require_mfa and not (
        user.is_authenticated and user.mfa_enabled
    ):
        return False
    if workspace.permission == Workspace.Permission.PUBLIC:
        return True
    return get_role(user, workspace) is not None


def can_write(user, workspace) -> bool:
    """Write access to workspace content (pages): owners and editors only."""
    if workspace.require_mfa and not user.mfa_enabled:
        return False
    return get_role(user, workspace) in WRITE_ROLES


class WorkspaceAccess(BasePermission):
    """Role-based access on a Workspace or any object with a `.workspace` FK.

    - viewers: read only
    - editors: read + write content
    - owners:  full control (only they may modify/delete the workspace itself)
    - `require_mfa`: workspace-wide gate for users without a second factor
    """

    message = "You do not have access to this workspace."

    def has_object_permission(self, request, view, obj):
        workspace = getattr(obj, "workspace", obj)
        if workspace.require_mfa and not request.user.mfa_enabled:
            self.message = "This workspace requires multi-factor authentication."
            return False
        if request.method in SAFE_METHODS:
            return can_read(request.user, workspace)
        role = get_role(request.user, workspace)
        if isinstance(obj, Workspace):
            # Changing workspace settings (permission, require_mfa, …) or
            # deleting it is owner-only.
            return role == WorkspaceMember.Role.OWNER
        return role in WRITE_ROLES
