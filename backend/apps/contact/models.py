# backend/apps/contact/models.py
# Modèle pour stocker les messages de contact

from django.db import models
from django.core.validators import EmailValidator
from django.utils import timezone


class ContactMessage(models.Model):
    """
    Messages de contact envoyés par les utilisateurs
    """
    
    STATUS_CHOICES = [
        ('NEW', 'Nouveau'),
        ('IN_PROGRESS', 'En cours'),
        ('RESOLVED', 'Résolu'),
        ('CLOSED', 'Fermé'),
    ]
    
    # Informations expéditeur
    name = models.CharField(max_length=255, verbose_name="Nom complet")
    email = models.EmailField(validators=[EmailValidator()], verbose_name="Email")
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Téléphone")
    
    # Message
    subject = models.CharField(max_length=255, verbose_name="Sujet")
    message = models.TextField(verbose_name="Message")
    
    # Métadonnées
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='NEW',
        verbose_name="Statut"
    )
    ip_address = models.GenericIPAddressField(blank=True, null=True, verbose_name="Adresse IP")
    user_agent = models.TextField(blank=True, null=True, verbose_name="User Agent")
    
    # Traitement
    admin_notes = models.TextField(blank=True, null=True, verbose_name="Notes admin")
    assigned_to = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='assigned_contacts',
        verbose_name="Assigné à"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    resolved_at = models.DateTimeField(blank=True, null=True, verbose_name="Date de résolution")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Message de contact"
        verbose_name_plural = "Messages de contact"
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.subject} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
    
    def mark_as_resolved(self):
        """Marquer le message comme résolu"""
        self.status = 'RESOLVED'
        self.resolved_at = timezone.now()
        self.save()
    
    def mark_as_closed(self):
        """Marquer le message comme fermé"""
        self.status = 'CLOSED'
        self.save()