from django.contrib import admin

from .models import PageWorkflow, Workflow, WorkflowStage


class StageInline(admin.TabularInline):
    model = WorkflowStage
    extra = 0


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ["name", "workspace", "is_active"]
    inlines = [StageInline]


admin.site.register(PageWorkflow)
