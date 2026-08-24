# backend/apps/payments/webhooks/models.py
# Journal des webhooks entrants.
#
# APPEND-ONLY : ce journal est la trace brute de tout ce qui entre. Il est
# ecrit AVANT tout parsing, pour que meme une attaque exploitant l'analyseur
# laisse une trace exploitable.

import hashlib
import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class WebhookEvent(models.Model):
    """Un evenement recu d'un prestataire, tel qu'il est arrive."""

    class Status(models.TextChoices):
        RECEIVED = "RECEIVED", "Recu"
        VERIFIED = "VERIFIED", "Verifie aupres du prestataire"
        PROCESSED = "PROCESSED", "Traite"
        IGNORED = "IGNORED", "Ignore (doublon ou hors perimetre)"
        REJECTED = "REJECTED", "Rejete"
        ERROR = "ERROR", "Erreur de traitement"

    class SignatureState(models.TextChoices):
        VALID = "VALID", "Verifiee"
        INVALID = "INVALID", "Invalide"
        UNVERIFIABLE = "UNVERIFIABLE", "Non verifiable"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider_code = models.CharField(max_length=30, db_index=True)

    http_method = models.CharField(max_length=10, default="POST")
    raw_body = models.TextField(
        blank=True, default="",
        help_text="Corps brut, NON parse. Ecrit avant toute analyse.",
    )
    raw_query = models.TextField(
        blank=True, default="",
        help_text="Chaine de requete brute. CamPay livre le callback en GET.",
    )
    raw_headers = models.JSONField(default=dict, blank=True)
    source_ip = models.GenericIPAddressField(null=True, blank=True, db_index=True)

    body_sha256 = models.CharField(
        max_length=64, db_index=True, editable=False,
        help_text="Empreinte du contenu. Base de l'anti-rejeu.",
    )

    signature_state = models.CharField(
        max_length=14, choices=SignatureState.choices,
        default=SignatureState.UNVERIFIABLE,
    )
    signature_reason = models.TextField(blank=True, default="")

    provider_reference = models.CharField(max_length=120, blank=True, default="", db_index=True)
    external_reference = models.CharField(max_length=120, blank=True, default="", db_index=True)
    reported_status = models.CharField(max_length=40, blank=True, default="")
    endpoint = models.CharField(
        max_length=20, blank=True, default="",
        help_text="collect | withdraw — indique de quel flux vient l'evenement.",
    )

    status = models.CharField(max_length=12, choices=Status.choices, default=Status.RECEIVED)
    processing_error = models.TextField(blank=True, default="")
    processing_note = models.TextField(blank=True, default="")

    #: Resultat de la RE-INTERROGATION — c'est elle qui fait foi, pas le corps recu.
    verified_status = models.CharField(max_length=40, blank=True, default="")
    verified_payload = models.JSONField(default=dict, blank=True)

    received_at = models.DateTimeField(auto_now_add=True, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "payments"
        ordering = ["-received_at"]
        verbose_name = "Webhook recu"
        verbose_name_plural = "Webhooks recus"
        indexes = [
            models.Index(fields=["provider_code", "status"]),
            models.Index(fields=["received_at"]),
        ]

    def __str__(self):
        return f"{self.provider_code} {self.provider_reference or '—'} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.body_sha256:
            self.body_sha256 = self.compute_fingerprint(self.raw_body, self.raw_query)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Un webhook recu ne se supprime jamais : c'est le journal brut "
            "de tout ce qui entre dans le systeme."
        )

    @staticmethod
    def compute_fingerprint(body: str, query: str = "") -> str:
        return hashlib.sha256(f"{query}|{body}".encode("utf-8")).hexdigest()

    def mark(self, status: str, *, note: str = "", error: str = "") -> "WebhookEvent":
        self.status = status
        if note:
            self.processing_note = note
        if error:
            self.processing_error = error
        self.processed_at = timezone.now()
        super().save(update_fields=[
            "status", "processing_note", "processing_error", "processed_at",
        ])
        return self


class WebhookReplayGuard(models.Model):
    """
    Anti-rejeu.

    Une empreinte deja vue dans la fenetre de retention est refusee.
    Table separee du journal pour pouvoir la purger sans toucher a la piste
    d'audit — la retention technique et la conservation legale sont deux
    regimes distincts (voir §13 du document d'architecture).
    """

    body_sha256 = models.CharField(max_length=64, unique=True)
    provider_code = models.CharField(max_length=30)
    first_seen_at = models.DateTimeField(auto_now_add=True)
    hit_count = models.PositiveIntegerField(default=1)

    class Meta:
        app_label = "payments"
        verbose_name = "Empreinte anti-rejeu"
        verbose_name_plural = "Empreintes anti-rejeu"
        indexes = [models.Index(fields=["first_seen_at"])]

    def __str__(self):
        return f"{self.body_sha256[:16]}… ({self.hit_count} occurrence·s)"