# backend/apps/payments/wallet/models.py
# Le Wallet du client — feuille de route D16 ; spec v2.1, R03.
#
# Le solde n'est pas une verite a part : chaque mouvement passe d'abord au grand livre (compte 2050, dette envers
# les clients), et le portefeuille n'en est que le detail par client. Deux parts, parce que R03.6 l'exige :
#
#   retirable  l'argent recharge par le client, ou rembourse sur le Wallet ; il peut repartir vers son numero
#   geste      les gestes commerciaux credites par BelivaY ; ils servent seulement a acheter, jamais a retirer
#
# Ferme tant que r_wallet_ouvert = 0 (R03.1, R03.2).

import uuid

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User
from django.db import models


class Portefeuille(models.Model):
    client = models.OneToOneField(User, on_delete=models.PROTECT, related_name="portefeuille")
    solde_retirable_xaf = models.PositiveIntegerField(default=0)
    solde_geste_xaf = models.PositiveIntegerField(default=0, help_text="gestes commerciaux, jamais retirables (R03.6)")
    code_hash = models.CharField(max_length=128, blank=True, default="", help_text="code a 4 chiffres (R03.5)")
    code_echecs = models.PositiveSmallIntegerField(default=0, help_text="codes faux depuis le dernier bon code")
    code_bloque_jusqua = models.DateTimeField(null=True, blank=True, help_text="r_wallet_code_essais atteint")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Wallet client"
        verbose_name_plural = "Wallets clients"

    def __str__(self):
        return f"Wallet de {self.client}"

    @property
    def solde_xaf(self) -> int:
        return self.solde_retirable_xaf + self.solde_geste_xaf

    def definir_code(self, code: str) -> None:
        self.code_hash = make_password(code)

    def code_valide(self, code: str) -> bool:
        return bool(self.code_hash) and check_password(code or "", self.code_hash)


class MouvementPortefeuille(models.Model):
    """Append-only. `reference` rend chaque mouvement idempotent (un rejeu ne credite jamais deux fois)."""

    class Sorte(models.TextChoices):
        RECHARGE = "RECHARGE", "Recharge"
        PAIEMENT = "PAIEMENT", "Paiement d'une commande"
        REMBOURSEMENT = "REMBOURSEMENT", "Remboursement sur le Wallet"
        GESTE = "GESTE", "Geste commercial"
        RETRAIT = "RETRAIT", "Retrait"
        RETRAIT_ANNULE = "RETRAIT_ANNULE", "Retrait annule"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    portefeuille = models.ForeignKey(Portefeuille, on_delete=models.PROTECT, related_name="mouvements")
    sorte = models.CharField(max_length=16, choices=Sorte.choices)
    reference = models.CharField(max_length=80, unique=True)
    # Montants signes vus du client : + credite, - debite.
    part_retirable_xaf = models.IntegerField(default=0)
    part_geste_xaf = models.IntegerField(default=0)
    frais_xaf = models.PositiveIntegerField(default=0, help_text="frais de retrait (R03.4), compris dans le debit")
    intent_reference = models.CharField(max_length=48, blank=True, default="")
    payout_reference = models.CharField(max_length=48, blank=True, default="")
    libelle = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def montant_xaf(self) -> int:
        return self.part_retirable_xaf + self.part_geste_xaf


class GestePortefeuille(models.Model):
    """Geste commercial a crediter (R03.6) : demande par un membre de l'equipe, approuve par un autre."""

    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente d'approbation"
        CREDITE = "CREDITE", "Credite"
        REFUSE = "REFUSE", "Refuse"

    client = models.ForeignKey(User, on_delete=models.PROTECT, related_name="gestes_wallet")
    # Spec v2.1, R25.1 : un geste se rattache a une commande et ne depasse jamais sa commission_b.
    order_id = models.PositiveBigIntegerField(null=True, blank=True)
    montant_xaf = models.PositiveIntegerField()
    motif = models.CharField(max_length=200)
    statut = models.CharField(max_length=12, choices=Statut.choices, default=Statut.EN_ATTENTE)
    demande_par = models.ForeignKey(User, on_delete=models.PROTECT, related_name="gestes_wallet_demandes")
    decide_par = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True,
                                   related_name="gestes_wallet_decides")
    decide_le = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
