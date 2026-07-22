from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, PageViewSet

router = DefaultRouter()
router.register("pages", PageViewSet, basename="page")
router.register("comments", CommentViewSet, basename="comment")

urlpatterns = router.urls
