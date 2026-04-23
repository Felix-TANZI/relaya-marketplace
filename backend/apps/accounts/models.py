# backend/apps/accounts/models.py
# Modèles pour la gestion des comptes utilisateurs

from django.db import models
from django.contrib.auth.models import User
from apps.catalog.models import Product


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


class UserFavorite(models.Model):
    """
    Produit mis en favori par un client.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [['user', 'product']]
        verbose_name = "Favori utilisateur"
        verbose_name_plural = "Favoris utilisateurs"

    def __str__(self):
        return f"{self.user.username} -> {self.product.title}"


class UserNotification(models.Model):
    """
    Notification simple côté client.
    """
    class NotificationType(models.TextChoices):
        ORDER = "ORDER", "Commande"
        PROMOTION = "PROMOTION", "Promotion"
        PAYMENT = "PAYMENT", "Paiement"
        SUPPORT = "SUPPORT", "Support"
        SYSTEM = "SYSTEM", "Système"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=160)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
    )
    action_url = models.CharField(max_length=255, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Notification utilisateur"
        verbose_name_plural = "Notifications utilisateurs"

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class CourierProfile(models.Model):
    """
    Profil livreur.
    La validation finale est faite plus tard par l'admin/support.
    """

    class VehicleType(models.TextChoices):
        MOTORBIKE = "MOTORBIKE", "Moto"
        CAR = "CAR", "Voiture"
        BIKE = "BIKE", "Velo"
        TRICYCLE = "TRICYCLE", "Tricycle"
        VAN = "VAN", "Camionnette"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="courier_profile")
    phone = models.CharField(max_length=20)
    city = models.CharField(max_length=80)
    zones = models.JSONField(default=list, blank=True)
    vehicle_type = models.CharField(max_length=20, choices=VehicleType.choices, default=VehicleType.MOTORBIKE)
    id_card = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Profil livreur"
        verbose_name_plural = "Profils livreurs"

    def __str__(self):
        return f"Livreur {self.user.username} ({self.city})"
