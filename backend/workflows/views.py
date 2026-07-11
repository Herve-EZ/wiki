from django.db.models import Q
from rest_framework import viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from pages.models import Page
from workspaces.models import Workspace
from workspaces.permissions import can_read, can_write, is_owner

from .models import PageWorkflow, Workflow
from .serializers import PageWorkflowSerializer, WorkflowSerializer


def _accessible_workspaces(user):
    return Workspace.objects.filter(
        Q(members__user=user) | Q(permission=Workspace.Permission.PUBLIC)
    ).distinct()


def _get_page(user, page_id):
    page = (
        Page.objects.filter(workspace__in=_accessible_workspaces(user))
        .select_related("workspace")
        .filter(pk=page_id)
        .first()
    )
    if not page:
        raise NotFound("Page not found.")
    return page


class WorkflowAccess(BasePermission):
    """Read = any member; create/update/delete = workspace owner only."""

    message = "Only the workspace owner can manage workflows."

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return can_read(request.user, obj.workspace)
        return is_owner(request.user, obj.workspace)


class WorkflowViewSet(viewsets.ModelViewSet):
    serializer_class = WorkflowSerializer
    permission_classes = [IsAuthenticated, WorkflowAccess]

    def get_queryset(self):
        qs = (
            Workflow.objects.filter(
                workspace__in=_accessible_workspaces(self.request.user)
            )
            .select_related("workspace")
            .prefetch_related("stages")
        )
        slug = self.request.query_params.get("workspace")
        if slug:
            qs = qs.filter(workspace__slug=slug)
        return qs

    def perform_create(self, serializer):
        workspace = serializer.validated_data["workspace"]
        if not is_owner(self.request.user, workspace):
            raise PermissionDenied("Only the workspace owner can create workflows.")
        serializer.save()


class PageWorkflowView(APIView):
    """GET / assign (POST) / unassign (DELETE) the workflow of a page."""

    permission_classes = [IsAuthenticated]

    def get(self, request, page_id):
        page = _get_page(request.user, page_id)
        if not can_read(request.user, page.workspace):
            raise PermissionDenied()
        state = getattr(page, "workflow_state", None)
        if state is None:
            return Response(None)
        return Response(PageWorkflowSerializer(state).data)

    def post(self, request, page_id):
        page = _get_page(request.user, page_id)
        if not is_owner(request.user, page.workspace):
            raise PermissionDenied("Only the workspace owner can assign a workflow.")
        workflow = Workflow.objects.filter(
            pk=request.data.get("workflow"), workspace=page.workspace
        ).first()
        if not workflow:
            raise NotFound("Workflow not found in this workspace.")
        state, _ = PageWorkflow.objects.update_or_create(
            page=page,
            defaults={"workflow": workflow, "current_stage": workflow.stages.first()},
        )
        return Response(PageWorkflowSerializer(state).data)

    def delete(self, request, page_id):
        page = _get_page(request.user, page_id)
        if not is_owner(request.user, page.workspace):
            raise PermissionDenied("Only the workspace owner can remove a workflow.")
        PageWorkflow.objects.filter(page=page).delete()
        return Response(status=204)


class PageWorkflowAdvanceView(APIView):
    """Move a page to the next workflow stage. Entering a final stage publishes
    the page and is owner-only; earlier steps require write access."""

    permission_classes = [IsAuthenticated]

    def post(self, request, page_id):
        page = _get_page(request.user, page_id)
        state = getattr(page, "workflow_state", None)
        if state is None:
            raise NotFound("No workflow assigned to this page.")
        stages = list(state.workflow.stages.all())
        if not stages:
            raise NotFound("This workflow has no stages.")
        idx = next(
            (i for i, s in enumerate(stages) if state.current_stage_id == s.id), -1
        )
        if idx + 1 >= len(stages):
            raise ValidationError({"detail": "Already at the final stage."})
        nxt = stages[idx + 1]
        if nxt.is_final and not is_owner(request.user, page.workspace):
            raise PermissionDenied(
                "Only the workspace owner can complete the workflow."
            )
        if not nxt.is_final and not can_write(request.user, page.workspace):
            raise PermissionDenied("You cannot advance this page.")
        state.current_stage = nxt
        state.save(update_fields=["current_stage"])
        if nxt.is_final:
            from pages import services

            services.save_page(page, request.user, status=Page.Status.PUBLISHED)
        return Response(PageWorkflowSerializer(state).data)
