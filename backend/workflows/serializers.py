from rest_framework import serializers

from .models import PageWorkflow, Workflow, WorkflowStage


class WorkflowStageSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)

    class Meta:
        model = WorkflowStage
        fields = ["id", "name", "order", "is_final"]


class WorkflowSerializer(serializers.ModelSerializer):
    stages = WorkflowStageSerializer(many=True, required=False)

    class Meta:
        model = Workflow
        fields = [
            "id", "workspace", "name", "description", "is_active", "stages",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def _write_stages(self, workflow, stages):
        # `order` is derived from position so the (workflow, order) unique
        # constraint can never clash regardless of what the client sends.
        for i, st in enumerate(stages):
            st.pop("id", None)
            st.pop("order", None)
            WorkflowStage.objects.create(workflow=workflow, order=i, **st)

    def create(self, validated_data):
        stages = validated_data.pop("stages", [])
        workflow = Workflow.objects.create(**validated_data)
        self._write_stages(workflow, stages)
        return workflow

    def update(self, instance, validated_data):
        stages = validated_data.pop("stages", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if stages is not None:
            instance.stages.all().delete()
            self._write_stages(instance, stages)
        return instance


class PageWorkflowSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source="workflow.name", read_only=True)
    current_stage_name = serializers.CharField(
        source="current_stage.name", read_only=True, default=None
    )
    stages = WorkflowStageSerializer(
        source="workflow.stages", many=True, read_only=True
    )

    class Meta:
        model = PageWorkflow
        fields = [
            "id", "workflow", "workflow_name", "current_stage",
            "current_stage_name", "stages",
        ]
        read_only_fields = fields
