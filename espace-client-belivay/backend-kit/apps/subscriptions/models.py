# backend/apps/subscriptions/models.py
# Abonnement du client (CL-14 ; FF-ABONNEMENT ; CAB-43, CAB-44 ; DP-41, DP-54). relaya-marketplace n'a que les
# abonnements des vendeurs (/api/vendors/plans/) : tout est ajouté ici.
#
#   Abonnement          — une ligne par souscription (ou abonnement offert) ; la plus récente est l'abonnement
#                         courant. Prélèvement refusé : echec_* (grâce ABO-GRACE, puis palier Gratuit).
#   Prelevement         — chaque demande d'argent (souscription, renouvellement, paiement après refus).
#   EssaiUtilise        — ABO-ESSAI : une fois par compte ET par numéro (empreinte du numéro).
#   AbonnementOffert    — cadeau payé par carte (page « offrir ») ; appliqué au compte du numéro, ou en attente
#                         qu'il s'inscrive.
#   CreditCagnotte      — cagnotte d'une commande (ABO-CAGNOTTE), créditée quand le vendeur est payé ; versée au
#                         portefeuille (FF-WALLET ouvert) ou par Mobile Money (verserCagnotte) ; expire sinon.
#   CodeParrainage, Parrainage — lien de parrainage, proches inscrits, récompenses (ABO-PARRAIN).

from django.conf import settings
from django.db import models


class Palier(models.TextChoices):
    PLUS = "plus", "Plus"
    PRIME = "prime", "Prime"
    DUO = "duo", "Prime Duo"
    BUSINESS = "business", "Business"
    PASS = "pass", "Pass 7 jours"


class Formule(models.TextChoices):
    MOIS = "mois", "Au mois"
    AN = "an", "À l'année"
    PASS = "pass", "Pass"


class Abonnement(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="abonnements_client")
    palier = models.CharField(max_length=10, choices=Palier.choices)
    formule = models.CharField(max_length=5, choices=Formule.choices)
    debut = models.DateTimeField()
    prochain = models.DateTimeField(null=True, blank=True, help_text="prochain prélèvement (vide : Pass, offert ou résilié)")
    montant = models.PositiveIntegerField(help_text="montant du prochain prélèvement")
    moyen = models.CharField(max_length=80, help_text="libellé affiché : « MTN MoMo · 6 77 ·· ·· 41 »")
    moyen_ref = models.CharField(max_length=20, blank=True, default="", help_text="« compte », « m12 », « c3 » (apps.wallet)")
    essai = models.BooleanField(default=False, help_text="premier mois au prix d'essai")
    resilie = models.DateTimeField(null=True, blank=True)
    fin = models.DateTimeField(null=True, blank=True, help_text="fin de la période payée (résilié, Pass, offert)")
    offert_par = models.CharField(max_length=80, blank=True, default="")
    message_cadeau = models.CharField(max_length=300, blank=True, default="")
    echec_le = models.DateTimeField(null=True, blank=True)
    echec_moyen = models.CharField(max_length=80, blank=True, default="")
    echec_montant = models.PositiveIntegerField(default=0)
    echec_tentatives = models.PositiveSmallIntegerField(default=0)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-pk"]
        verbose_name = "Abonnement client"
        verbose_name_plural = "Abonnements clients"

    def __str__(self):
        return f"{self.client_id} · {self.palier} ({self.formule})"


class Prelevement(models.Model):
    class Etat(models.TextChoices):
        ATTENTE = "attente", "En attente de l'opérateur"
        REUSSI = "reussi", "Réussi"
        REFUSE = "refuse", "Refusé"

    abonnement = models.ForeignKey(Abonnement, on_delete=models.PROTECT, related_name="prelevements")
    montant = models.PositiveIntegerField()
    moyen = models.CharField(max_length=80)
    reference = models.CharField(max_length=60, unique=True)
    etat = models.CharField(max_length=8, choices=Etat.choices, default=Etat.ATTENTE)
    motif = models.CharField(max_length=60, blank=True, default="")
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Prélèvement d'abonnement"
        verbose_name_plural = "Prélèvements d'abonnement"


class EssaiUtilise(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="essais_abonnement")
    numero_empreinte = models.CharField(max_length=64, db_index=True, blank=True, default="")
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Essai Prime utilisé"
        verbose_name_plural = "Essais Prime utilisés"


class AbonnementOffert(models.Model):
    offrant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="abonnements_offerts")
    beneficiaire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="abonnements_recus",
        help_text="vide : pas encore de compte",
    )
    numero_chiffre = models.BinaryField()
    numero_empreinte = models.CharField(max_length=64, db_index=True)
    numero_masque = models.CharField(max_length=40)
    prenom = models.CharField(max_length=80)
    palier = models.CharField(max_length=10, choices=Palier.choices)
    mois = models.PositiveSmallIntegerField()
    message = models.CharField(max_length=300, blank=True, default="")
    montant = models.PositiveIntegerField()
    frais_service = models.PositiveIntegerField()
    carte = models.CharField(max_length=60, help_text="« Visa •••• 4242 »")
    ref = models.CharField(max_length=20, unique=True, help_text="CAD-…")
    paiement_ref = models.CharField(max_length=80, blank=True, default="")

    class Paiement(models.TextChoices):
        PAYE = "paye", "Payé"
        ACTION = "action", "3-D Secure à valider"
        REFUSE = "refuse", "Refusé par la banque"

    paiement = models.CharField(
        max_length=8, choices=Paiement.choices, default=Paiement.PAYE, help_text="action : appliqué au retour de la banque (webhook)"
    )
    abonnement = models.OneToOneField(Abonnement, on_delete=models.SET_NULL, null=True, blank=True, related_name="cadeau")
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Abonnement offert"
        verbose_name_plural = "Abonnements offerts"


class CreditCagnotte(models.Model):
    class Etat(models.TextChoices):
        DISPONIBLE = "disponible", "Créditée, à verser (portefeuille fermé ou plein)"
        VERSEE = "versee", "Versée"
        EXPIREE = "expiree", "Expirée (ABO-CAGNOTTE)"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cagnottes")
    order_id = models.PositiveBigIntegerField(unique=True)
    palier = models.CharField(max_length=10, choices=Palier.choices)
    base = models.PositiveIntegerField(help_text="sous-total produits des colis non annulés")
    montant = models.PositiveIntegerField()
    reste = models.PositiveIntegerField(help_text="encore à verser")
    etat = models.CharField(max_length=10, choices=Etat.choices, default=Etat.DISPONIBLE)
    credite_le = models.DateTimeField(auto_now_add=True)
    expire_le = models.DateTimeField()
    versee_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Cagnotte d'une commande"
        verbose_name_plural = "Cagnottes des commandes"


class CodeParrainage(models.Model):
    client = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="code_parrainage")
    code = models.CharField(max_length=12, unique=True)

    class Meta:
        verbose_name = "Code de parrainage"
        verbose_name_plural = "Codes de parrainage"


class Parrainage(models.Model):
    parrain = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="filleuls")
    filleul = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="parrainage")
    inscrit_le = models.DateTimeField(auto_now_add=True)
    retiree_le = models.DateTimeField(null=True, blank=True, help_text="première commande payée et retirée")
    recompense_le = models.DateTimeField(null=True, blank=True, help_text="mois offert au parrain (ABO-PARRAIN : 3 par mois au plus)")
    mois_offerts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "Parrainage"
        verbose_name_plural = "Parrainages"
