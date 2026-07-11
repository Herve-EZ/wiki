from django.db import models

from core.models import BaseModel
from workspaces.models import Workspace


class Workflow(BaseModel):
    """A named review pipeline defined at the workspace level: an ordered set of
    stages a page moves through (e.g. Draft → Review → Approved)."""

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="workflows"
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.workspace.slug}/{self.name}"


class WorkflowStage(BaseModel):
    """One ordered step in a workflow. Reaching an `is_final` stage marks the
    end of the pipeline (and may publish the page — owner-gated in the view)."""

    workflow = models.ForeignKey(
        Workflow, on_delete=models.CASCADE, related_name="stages"
    )
    name = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)
    is_final = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["workflow", "order"], name="unique_stage_order_per_workflow"
            )
        ]

    def __str__(self):
        return f"{self.workflow.name} · {self.order}. {self.name}"


class PageWorkflow(BaseModel):
    """Assignment of a workflow to a page, tracking the current stage."""

    page = models.OneToOneField(
        "pages.Page", on_delete=models.CASCADE, related_name="workflow_state"
    )
    workflow = models.ForeignKey(
        Workflow, on_delete=models.CASCADE, related_name="page_states"
    )
    current_stage = models.ForeignKey(
        WorkflowStage, on_delete=models.SET_NULL, null=True, related_name="+"
    )

    def __str__(self):
        stage = self.current_stage.name if self.current_stage else "—"
        return f"{self.page} @ {self.workflow.name} ({stage})"
