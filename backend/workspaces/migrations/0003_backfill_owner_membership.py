"""Workspaces created outside the API (e.g. Django admin) have no member rows,
so their creator gets no role and the UI shows read-only for everyone. Backfill
an OWNER membership for `created_by` wherever it is missing."""
from django.db import migrations


def backfill_owner_memberships(apps, schema_editor):
    Workspace = apps.get_model("workspaces", "Workspace")
    WorkspaceMember = apps.get_model("workspaces", "WorkspaceMember")
    for ws in Workspace.objects.filter(created_by__isnull=False):
        WorkspaceMember.objects.get_or_create(
            workspace=ws,
            user_id=ws.created_by_id,
            defaults={"role": "owner"},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("workspaces", "0002_historicalworkspaceinvitation_workspaceinvitation_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_owner_memberships, migrations.RunPython.noop),
    ]
