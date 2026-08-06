from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, PageTemplateViewSet, PageViewSet

router = DefaultRouter()
router.register("pages", PageViewSet, basename="page")
router.register("comments", CommentViewSet, basename="comment")
router.register("templates", PageTemplateViewSet, basename="page-template")

urlpatterns = router.urls
