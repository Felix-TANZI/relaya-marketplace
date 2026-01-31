# backend/apps/vendors/models.py
# Modèles pour la gestion des vendeurs sur la plateforme

from django.db import models
from django.contrib.auth.models import User


class VendorProfile(models.Model):
    """
    Profil vendeur - informations supplémentaires pour devenir vendeur
    """
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('APPROVED', 'Approuvé'),
        ('REJECTED', 'Rejeté'),
        ('SUSPENDED', 'Suspendu'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vendor_profile')
    business_name = models.CharField(max_length=255, verbose_name="Nom de l'entreprise")
    business_description = models.TextField(verbose_name="Description de l'entreprise")
    phone = models.CharField(max_length=20, verbose_name="Téléphone")
    address = models.TextField(verbose_name="Adresse")
    city = models.CharField(max_length=100, verbose_name="Ville")
    
    # Documents KYC simplifiés
    id_document = models.CharField(max_length=255, blank=True, verbose_name="Document d'identité")
    
    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Profil Vendeur"
        verbose_name_plural = "Profils Vendeurs"
    
    def __str__(self):
        return f"{self.business_name} - {self.user.username}"
    
    @property
    def is_active_vendor(self):
        """Vérifie si le vendeur est actif"""
        return self.status == 'APPROVED'