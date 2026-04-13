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