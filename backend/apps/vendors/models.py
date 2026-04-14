# backend/apps/vendors/models.py
# Modèles pour la gestion des vendeurs sur la plateforme

from django.db import models
from django.contrib.auth.models import User


class VendorProfile(models.Model):
    """
    Profil vendeur - informations supplémentaires pour devenir vendeur
    """
    STATUS_CHOICES = [
        ('PENDING',   'En attente'),
        ('APPROVED',  'Approuvé'),
        ('REJECTED',  'Rejeté'),
        ('SUSPENDED', 'Suspendu'),
    ]

    # Alias utilisé dans les vues pour les transitions de statut
    class Status:
        APPROVED  = 'APPROVED'
        PENDING   = 'PENDING'
        REJECTED  = 'REJECTED'
        SUSPENDED = 'SUSPENDED'

    user                 = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vendor_profile')
    business_name        = models.CharField(max_length=255, verbose_name="Nom de l'entreprise")
    business_description = models.TextField(verbose_name="Description de l'entreprise")
    phone                = models.CharField(max_length=20, verbose_name="Téléphone")
    address              = models.TextField(verbose_name="Adresse")
    city                 = models.CharField(max_length=100, verbose_name="Ville")

    # Documents KYC simplifiés
    id_document = models.CharField(max_length=255, blank=True, verbose_name="Document d'identité")

    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    # Dates
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = "Profil Vendeur"
        verbose_name_plural = "Profils Vendeurs"

    def __str__(self):
        return f"{self.business_name} - {self.user.username}"

    @property
    def is_active_vendor(self):
        """Vérifie si le vendeur est actif"""
        return self.status == 'APPROVED'


class VendorOrderNote(models.Model):
    """
    Note interne d'un vendeur sur une commande.

    Règles :
      - Une note par couple (commande, vendeur) — unique_together garantit l'unicité.
      - Strictement privée : invisible pour l'acheteur, l'admin et les autres vendeurs.
      - Seul le vendeur propriétaire peut lire et modifier sa propre note.
      - Contenu limité à 2 000 caractères.
      - Le contenu peut être vide (efface la note sans la supprimer).
    """
    order  = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='vendor_notes',
        verbose_name="Commande",
    )
    vendor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='order_notes',
        verbose_name="Vendeur",
    )
    content    = models.TextField(blank=True, default='', verbose_name="Contenu de la note")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together     = ('order', 'vendor')
        ordering            = ['-updated_at']
        verbose_name        = "Note Interne Vendeur"
        verbose_name_plural = "Notes Internes Vendeur"

    def __str__(self):
        return f"Note de {self.vendor.username} sur commande #{self.order_id}"


class WithdrawalRequest(models.Model):
    """
    Demande de retrait de fonds par un vendeur.

    Logique métier :
      - Un seul retrait PENDING à la fois par vendeur.
        Raison : simplifie la gestion admin manuelle (version initiale sans
        API MoMo automatique), évite les doublons et les dépassements de solde.
        Quand l'API MoMo sera intégrée, cette contrainte pourra être levée.

      - Les frais (withdrawal_fee_percent) sont lus depuis PlatformSettings
        au moment de la création — snapshot pour garantir la cohérence même si
        le taux change ensuite.

      - Statuts possibles :
          PENDING   → soumise, en attente de traitement admin
          APPROVED  → admin a validé et exécuté le virement
          REJECTED  → admin a rejeté (admin_note obligatoire)
          CANCELLED → vendeur a annulé avant traitement

      - La libération automatique est prévue (quand l'API MoMo sera branchée)
        selon les délais de PlatformSettings.
    """

    class Operator(models.TextChoices):
        ORANGE_MONEY = "ORANGE_MONEY", "Orange Money"
        MTN_MOMO    = "MTN_MOMO",    "MTN Mobile Money"

    class Status(models.TextChoices):
        PENDING   = "PENDING",   "En attente"
        APPROVED  = "APPROVED",  "Approuvé et versé"
        REJECTED  = "REJECTED",  "Rejeté"
        CANCELLED = "CANCELLED", "Annulé par le vendeur"

    vendor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="withdrawal_requests",
        verbose_name="Vendeur",
    )

    # Montants — tous en FCFA entiers
    amount_xaf  = models.PositiveIntegerField(verbose_name="Montant demandé (FCFA)")
    fee_percent_snapshot = models.DecimalField(
        max_digits=4, decimal_places=2,
        verbose_name="Taux de frais appliqué (%)",
        help_text="Snapshot du taux en vigueur au moment de la demande.",
    )
    fee_amount_xaf = models.PositiveIntegerField(
        verbose_name="Frais prélevés (FCFA)",
        help_text="fee_percent_snapshot × amount_xaf / 100, arrondi.",
    )
    net_amount_xaf = models.PositiveIntegerField(
        verbose_name="Montant net versé (FCFA)",
        help_text="amount_xaf - fee_amount_xaf.",
    )

    # Moyen de paiement
    operator     = models.CharField(max_length=20, choices=Operator.choices, verbose_name="Opérateur")
    phone_number = models.CharField(max_length=20, verbose_name="Numéro Mobile Money")

    # Statut
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING,
        verbose_name="Statut",
    )

    # Référence unique lisible (générée à la sauvegarde)
    reference = models.CharField(
        max_length=30, unique=True, blank=True,
        verbose_name="Référence",
        help_text="Générée automatiquement : BLV-WD-{année}-{id}.",
    )

    # Gestion admin
    admin_note   = models.TextField(blank=True, default="", verbose_name="Note admin")
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de traitement")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Demande de Retrait"
        verbose_name_plural = "Demandes de Retrait"

    def __str__(self):
        return f"{self.reference or f'WD-{self.id}'} — {self.vendor.username} — {self.amount_xaf} FCFA ({self.status})"

    def save(self, *args, **kwargs):
        """Génère la référence lisible à la première sauvegarde."""
        super().save(*args, **kwargs)
        if not self.reference:
            from django.utils import timezone
            year = timezone.now().year
            self.reference = f"BLV-WD-{year}-{self.pk:05d}"
            # Mise à jour ciblée pour éviter la récursion
            WithdrawalRequest.objects.filter(pk=self.pk).update(reference=self.reference)