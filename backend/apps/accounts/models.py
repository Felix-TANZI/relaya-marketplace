# backend/apps/accounts/models.py
# Modèles pour la gestion des comptes utilisateurs

from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """
    Profil étendu utilisateur (optionnel pour info supplémentaires)
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/%Y/%m/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    
    # Préférences
    newsletter_subscribed = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=True)
    
    # Modération
    is_banned = models.BooleanField(default=False)
    ban_reason = models.TextField(blank=True, null=True)
    banned_at = models.DateTimeField(blank=True, null=True)
    banned_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='banned_users'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Profil Utilisateur"
        verbose_name_plural = "Profils Utilisateurs"
    
    def __str__(self):
        return f"Profil de {self.user.username}"


class UserActivityLog(models.Model):
    """
    Journal d'activité utilisateur pour audit
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=100)  # Ex: "Login", "Order created", "Account banned"
    description = models.TextField(blank=True)
    performed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='performed_actions'
    )  # Null si action par l'utilisateur lui-même
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Journal Activité"
        verbose_name_plural = "Journaux Activités"
    
    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.timestamp}"