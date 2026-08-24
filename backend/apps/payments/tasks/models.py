# backend/apps/payments/tasks/models.py
# Journal des executions de taches.
#
# Sans ce journal, une tache qui cesse de tourner est INVISIBLE : rien
# n'echoue, rien n'alerte, et on decouvre le probleme quand un vendeur
# reclame un reglement qui n'est jamais parti.
#
# Il repond aussi a l'exigence de consultation totale : l'administrateur voit
# quand chaque tache a tourne, combien de temps, ce qu'elle a produit, et
# depuis combien de temps une tache critique n'a plus donne signe de vie.

import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class TaskRun(models.Model):
    """Une execution de tache. Append-only."""

    class Status(models.TextChoices):
        RUNNING = "RUNNING", "En cours"
        SUCCESS = "SUCCESS", "Terminee"
        ERROR = "ERROR", "En echec"
        SKIPPED = "SKIPPED", "Ignoree (verrou)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_name = models.CharField(max_length=80, db_index=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.RUNNING)

    result = models.JSONField(default=dict, blank=True)
    note = models.TextField(blank=True, default="")
    error = models.TextField(blank=True, default="")
    traceback_text = models.TextField(blank=True, default="")

    hostname = models.CharField(max_length=80, blank=True, default="")
    duration_ms = models.PositiveIntegerField(default=0)

    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "payments"
        ordering = ["-started_at"]
        verbose_name = "Execution de tache"
        verbose_name_plural = "Executions de taches"
        indexes = [
            models.Index(fields=["task_name", "-started_at"]),
            models.Index(fields=["status", "-started_at"]),
        ]

    def __str__(self):
        return f"{self.task_name} — {self.status} ({self.started_at:%Y-%m-%d %H:%M})"

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Le journal des executions ne se supprime pas a l'unite. "
            "Utiliser la purge de retention technique."
        )

    def finish(self, status: str, *, result=None, note: str = "",
               error: str = "", traceback_text: str = "",
               duration_ms: int = 0) -> "TaskRun":
        TaskRun.objects.filter(pk=self.pk).update(
            status=status,
            result=result or {},
            note=note[:2000],
            error=error[:2000],
            traceback_text=traceback_text[:8000],
            duration_ms=duration_ms,
            finished_at=timezone.now(),
        )
        self.refresh_from_db()
        return self

    @classmethod
    def last_success(cls, task_name: str) -> "TaskRun | None":
        return cls.objects.filter(
            task_name=task_name, status=cls.Status.SUCCESS,
        ).order_by("-started_at").first()

    @classmethod
    def health(cls, max_age_minutes: int = 60) -> list[dict]:
        """
        Sante des taches : celles qui n'ont pas tourne depuis trop longtemps.

        Une tache CRITIQUE muette est une alerte, pas une curiosite : sans
        `escrow_tick`, aucun vendeur n'est jamais paye.
        """
        from .base import REGISTRY

        limite = timezone.now() - timezone.timedelta(minutes=max_age_minutes)
        rapport = []
        for nom, info in sorted(REGISTRY.items()):
            derniere = cls.last_success(nom)
            en_retard = derniere is None or derniere.started_at < limite
            rapport.append({
                "task_name": nom,
                "critical": info["critical"],
                "last_success_at": derniere.started_at if derniere else None,
                "stale": en_retard,
                "alert": en_retard and info["critical"],
            })
        return rapport