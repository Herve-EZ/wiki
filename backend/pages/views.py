from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from workspaces.models import Workspace
from workspaces.permissions import WorkspaceAccess, can_write, is_owner

from . import services
from .models import Page, PageVersion
from .search import search_pages_with_snippets
from .serializers import (
    PageListSerializer,
    PageSerializer,
    PageVersionDetailSerializer,
    PageVersionSerializer,
)


def _accessible_workspaces(user):
    return Workspace.objects.filter(
        Q(members__user=user) | Q(permission=Workspace.Permission.PUBLIC)
    ).distinct()


class PageViewSet(viewsets.ModelViewSet):
    serializer_class = PageSerializer
    permission_classes = [IsAuthenticated, WorkspaceAccess]

    def get_queryset(self):
        # Trashed pages are excluded from all normal reads/writes; the trash
        # actions below fetch them explicitly.
        return Page.objects.filter(
            workspace__in=_accessible_workspaces(self.request.user),
            deleted_at__isnull=True,
        ).select_related("workspace", "author")

    def _get_trashed_or_404(self, request, pk):
        try:
            page = Page.objects.select_related("workspace").get(
                pk=pk, deleted_at__isnull=False
            )
        except (Page.DoesNotExist, ValueError, ValidationError):
            raise NotFound("Trashed page not found.") from None
        if not _accessible_workspaces(request.user).filter(pk=page.workspace_id).exists():
            raise NotFound("Trashed page not found.")
        return page

    def perform_create(self, serializer):
        workspace = serializer.validated_data["workspace"]
        if not can_write(self.request.user, workspace):
            raise PermissionDenied("You cannot create pages in this workspace.")
        page = serializer.save(author=self.request.user)
        services.snapshot(page, self.request.user)
        services.detect_links(page)
        from notifications.services import auto_subscribe
        auto_subscribe(self.request.user, page)

    def perform_update(self, serializer):
        page = serializer.instance
        # save_page snapshots + rebuilds links + notifies backlinked pages
        fields = dict(serializer.validated_data)
        fields.pop("workspace", None)  # a page never moves workspace via PATCH
        # Publishing/archiving is owner-only; editors may only work in draft.
        new_status = fields.get("status")
        if (
            new_status is not None
            and new_status != page.status
            and new_status != Page.Status.DRAFT
            and not is_owner(self.request.user, page.workspace)
        ):
            raise PermissionDenied(
                "Only the workspace owner can publish or archive a page."
            )
        services.save_page(page, self.request.user, **fields)

    def perform_destroy(self, instance):
        # Deleting a page is owner-only; editors can create and edit, not delete.
        if not is_owner(self.request.user, instance.workspace):
            raise PermissionDenied("Only the workspace owner can delete a page.")
        # Soft delete: move to trash rather than dropping the row (recoverable).
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])

    @action(detail=True, methods=["post"])
    def untrash(self, request, pk=None):
        """Restore a trashed page (owner-only)."""
        page = self._get_trashed_or_404(request, pk)
        if not is_owner(request.user, page.workspace):
            raise PermissionDenied("Only the workspace owner can restore a page.")
        # If a live page grabbed this slug meanwhile, give the restored one a
        # unique suffix instead of failing the unique constraint.
        clash = (
            Page.objects.filter(
                workspace=page.workspace, slug=page.slug, deleted_at__isnull=True
            )
            .exclude(pk=page.pk)
            .exists()
        )
        fields = ["deleted_at"]
        if clash:
            page.slug = f"{page.slug}-{str(page.pk)[:8]}"
            fields.append("slug")
        page.deleted_at = None
        page.save(update_fields=fields)
        return Response(PageSerializer(page).data)

    @action(detail=True, methods=["delete"])
    def purge(self, request, pk=None):
        """Permanently delete a trashed page (owner-only)."""
        page = self._get_trashed_or_404(request, pk)
        if not is_owner(request.user, page.workspace):
            raise PermissionDenied(
                "Only the workspace owner can permanently delete a page."
            )
        page.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        page = self.get_object()
        qs = page.versions.select_related("author")
        return Response(PageVersionSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"], url_path=r"versions/(?P<n>\d+)")
    def version_detail(self, request, pk=None, n=None):
        page = self.get_object()
        try:
            version = page.versions.select_related("author").get(version_number=n)
        except PageVersion.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(PageVersionDetailSerializer(version).data)

    @action(detail=True, methods=["get"])
    def diff(self, request, pk=None):
        page = self.get_object()
        try:
            v_from = int(request.query_params.get("from", ""))
            v_to = int(request.query_params.get("to", ""))
        except ValueError:
            raise ValidationError(
                {"detail": "Query params `from` and `to` must be version numbers."}
            ) from None
        try:
            return Response(services.diff(page, v_from, v_to))
        except PageVersion.DoesNotExist:
            return Response(
                {"detail": "Unknown version number."}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["post"], url_path=r"restore/(?P<n>\d+)")
    def restore(self, request, pk=None, n=None):
        page = self.get_object()
        if not can_write(request.user, page.workspace):
            raise PermissionDenied("You cannot edit this page.")
        try:
            version = services.restore(page, int(n), request.user)
        except PageVersion.DoesNotExist:
            return Response(
                {"detail": "Unknown version number."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(
            {"restored_from": int(n), "new_version": version.version_number},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def backlinks(self, request, pk=None):
        page = self.get_object()
        pages = Page.objects.filter(
            links_out__to_page=page, deleted_at__isnull=True
        ).select_related("workspace")
        return Response(PageListSerializer(pages, many=True).data)


class SearchView(APIView):
    """GET /api/search?q=…&workspace=<slug> — full-text over accessible pages."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Page.objects.filter(
            workspace__in=_accessible_workspaces(request.user),
            deleted_at__isnull=True,
        ).select_related("workspace")
        slug = request.query_params.get("workspace")
        if slug:
            qs = qs.filter(workspace__slug=slug)
        q = request.query_params.get("q", "")
        results = search_pages_with_snippets(qs, q)
        return Response(results)
