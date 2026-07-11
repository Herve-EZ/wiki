from rest_framework import serializers

from .models import Page, PageVersion


class PageListSerializer(serializers.ModelSerializer):
    """Light payload for trees/sidebars — no content body."""

    class Meta:
        model = Page
        fields = ["id", "workspace", "title", "slug", "status", "updated_at"]
        read_only_fields = fields


class PageSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)

    class Meta:
        model = Page
        fields = [
            "id", "workspace", "title", "slug", "content_md", "status",
            "author", "author_email", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def validate(self, attrs):
        # unique (workspace, slug) — surface a clean 400 instead of a 500
        workspace = attrs.get("workspace") or getattr(self.instance, "workspace", None)
        slug = attrs.get("slug") or getattr(self.instance, "slug", None)
        if workspace and slug:
            clash = Page.objects.filter(workspace=workspace, slug=slug)
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError(
                    {"slug": "A page with this slug already exists in this workspace."}
                )
        return attrs


class PageVersionSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)

    class Meta:
        model = PageVersion
        fields = [
            "id", "version_number", "title", "author", "author_email", "created_at",
        ]
        read_only_fields = fields


class PageVersionDetailSerializer(PageVersionSerializer):
    class Meta(PageVersionSerializer.Meta):
        fields = PageVersionSerializer.Meta.fields + ["content_md"]
        read_only_fields = fields
