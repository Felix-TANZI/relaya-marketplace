# backend/apps/recus/models.py
# Boîte « Reçus » (DP-54) : chaque envoi entre clients a sa réception, une seule boîte des deux côtés.
#
#   EnvoiRecu — un envoi (liste, cagnotte, cotisation, panier, lien de paiement, demande diaspora, rentrée, colis,
#               lien famille, abonnement, panier famille, code de retrait, parrainage, partage) d'un client à un
#               destinataire trouvé par son numéro VÉRIFIÉ ou son e-mail ; sans compte, seul le lien public existe.
#               Le numéro ou l'e-mail visé est chiffré (CAP-21) ; on ne renvoie jamais l'adresse ni le numéro complet.
#               Les actions (offert, payé, participé, accepté, refusé, retiré, vu) et le merci sont gardés tels que le
#               site les lit (site/src/donnees/source.ts : EnvoiRecu, ActionEnvoi).

from django.conf import settings
from django.db import models

TYPES = (
    "liste",
    "cagnotte",
    "cotisation",
    "panier",
    "lien-paiement",
    "demande-diaspora",
    "rentree",
    "colis",
    "lien-famille",
    "abonnement",
    "panier-famille",
    "code-retrait",
    "parrainage",
    "partage",
)


class EnvoiRecu(models.Model):
    class Etat(models.TextChoices):
        A_TRAITER = "a_traiter", "À traiter"
        ACCEPTE = "accepte", "Accepté"
        FAIT = "fait", "Fait"
        REFUSE = "refuse", "Refusé"
        EXPIRE = "expire", "Expiré"

    type = models.CharField(max_length=20, choices=[(t, t) for t in TYPES])
    de = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="envois_faits")
    de_prenom = models.CharField(max_length=80)
    depuis = models.CharField(max_length=60, blank=True, default="", help_text="pays de l'envoyeur s'il vit à l'étranger")
    pour = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="envois_recus",
        help_text="vide : sans compte",
    )
    pour_prenom = models.CharField(max_length=80)
    a_chiffre = models.BinaryField(help_text="numéro ou e-mail visé, chiffré (CAP-21)")
    a_empreinte = models.CharField(max_length=64, db_index=True)
    titre = models.CharField(max_length=200)
    occasion = models.CharField(max_length=20, blank=True, default="")
    hotes = models.JSONField(default=list, blank=True)
    date = models.DateTimeField(null=True, blank=True, help_text="jour de l'événement, de la remise")
    lieu = models.CharField(max_length=160, blank=True, default="", help_text="relais de remise (jamais une adresse)")
    mot = models.CharField(max_length=280, blank=True, default="")
    jusqua = models.DateTimeField(null=True, blank=True)
    lignes = models.JSONField(default=list, blank=True, help_text="LigneEnvoi[] : prix relus dans le catalogue à l'envoi")
    frais = models.PositiveIntegerField(default=0)
    qui = models.CharField(max_length=12, blank=True, default="", help_text="payeur | destinataire ; vide : au choix")
    objectif = models.PositiveIntegerField(null=True, blank=True)
    reuni = models.PositiveIntegerField(default=0)
    cagnotte = models.JSONField(null=True, blank=True)
    code = models.CharField(max_length=40, blank=True, default="", help_text="code public (liste, cotisation, invitation…)")
    ref = models.CharField(max_length=40, blank=True, default="", help_text="la commande liée")
    detail = models.CharField(max_length=200, blank=True, default="")
    lien = models.CharField(max_length=200, blank=True, default="")
    etat = models.CharField(max_length=10, choices=Etat.choices, default=Etat.A_TRAITER)
    actions = models.JSONField(default=list, blank=True, help_text="ActionEnvoi[]")
    merci = models.JSONField(null=True, blank=True)
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        indexes = [models.Index(fields=["pour", "etat"]), models.Index(fields=["de", "-id"])]
        verbose_name = "Envoi entre clients"
        verbose_name_plural = "Envois entre clients (Reçus)"

    def __str__(self):
        return f"{self.type} · {self.de_prenom} → {self.pour_prenom} ({self.etat})"
