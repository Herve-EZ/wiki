"""Repair NULL `is_system_admin` values.

On some databases the column added in 0002 ended up nullable / not back-filled,
so existing users (and their history rows) hold NULL. That breaks login: saving
`last_login` triggers a django-simple-history insert into
``accounts_historicaluser``, whose ``is_system_admin`` column is NOT NULL.

Set every NULL to False, then re-assert the NOT NULL constraint on both the base
and the historical model so the state is consistent going forward.
"""
from django.db import migrations, models


def backfill_nulls(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(is_system_admin__isnull=True).update(is_system_admin=False)
    HistoricalUser = apps.get_model("accounts", "HistoricalUser")
    HistoricalUser.objects.filter(is_system_admin__isnull=True).update(
        is_system_admin=False
    )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_is_system_admin"),
    ]

    operations = [
        migrations.RunPython(backfill_nulls, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="is_system_admin",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="historicaluser",
            name="is_system_admin",
            field=models.BooleanField(default=False),
        ),
    ]
