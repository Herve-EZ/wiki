from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import PageWorkflowAdvanceView, PageWorkflowView, WorkflowViewSet

router = DefaultRouter()
router.register("workflows", WorkflowViewSet, basename="workflow")

urlpatterns = [
    path(
        "pages/<uuid:page_id>/workflow/",
        PageWorkflowView.as_view(),
        name="page-workflow",
    ),
    path(
        "pages/<uuid:page_id>/workflow/advance",
        PageWorkflowAdvanceView.as_view(),
        name="page-workflow-advance",
    ),
    *router.urls,
]
