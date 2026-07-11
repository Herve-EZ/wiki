"""Abstract base models shared by every app.

Three layers, so each model opts into exactly what it needs:

- ``UUIDModel``        — UUID primary key (non-guessable, merge-friendly).
- ``TimeStampedModel`` — created_at / updated_at.
- ``BaseModel``        — UUID + timestamps + django-simple-history audit trail.
                         ``inherit=True`` gives every concrete subclass its own
                         ``Historical<Model>`` table automatically.

Models holding secret material (TOTP secrets, recovery codes) or ephemeral
rows (presence, locks) should NOT get history — use ``UUIDModel`` +
``TimeStampedModel`` directly so secrets are never duplicated into audit
tables and high-churn rows don't bloat them.
"""
import uuid

from django.db import models
from simple_history.models import HistoricalRecords


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel):
    """Default base for domain models: UUID pk, timestamps, full audit history."""

    history = HistoricalRecords(inherit=True)

    class Meta:
        abstract = True
