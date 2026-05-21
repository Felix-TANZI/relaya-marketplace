# backend/apps/accounts/models.py
# Modèles pour la gestion des comptes utilisateurs

from django.db import models
from django.contrib.auth.models import User
from apps.catalog.models import Product


class CourierProfile(models.Model):
    class VehicleType(models.TextChoices):
        MOTORBIKE = "MOTORBIKE", "Moto"
        CAR       = "CAR", "Voiture"
        BIKE      = "BIKE", "Velo"
        TRICYCLE  = "TRICYCLE", "Tricycle"
        VAN       = "VAN", "Camionnette"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="courier_profile")
    phone = models.CharField(max_length=20)
    city = models.CharField(max_length=80)
    zones = models.JSONField(default=list, blank=True)
    vehicle_type = models.CharField(
        max_length=20,
        choices=VehicleType.choices,
        default=VehicleType.MOTORBIKE,
    )
    id_card = models.CharField(max_length=120)
    preferred_language = models.CharField(max_length=8, default="fr", blank=True)
    gps_permission_granted = models.BooleanField(default=False)
    camera_permission_granted = models.BooleanField(default=False)
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

        # ── Double authentification ──────────────────────────────────────────────
    two_factor_enabled = models.BooleanField(
        default=False,
        verbose_name="Double authentification activée"
    )
    two_factor_method = models.CharField(
        max_length=10,
        choices=[('EMAIL', 'Email'), ('SMS', 'SMS'), ('WHATSAPP', 'WhatsApp')],
        default='EMAIL',
        blank=True,
        verbose_name="Méthode 2FA",
    )
    two_factor_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Numéro pour 2FA SMS/WhatsApp",
        help_text="Renseigné par l'utilisateur. Vérification à venir."
    )
    
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


class UserCart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="cart")
    items = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Panier utilisateur"
        verbose_name_plural = "Paniers utilisateurs"

    def __str__(self):
        return f"Panier de {self.user.username}"


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


class UserSession(models.Model):
    """
    Session active par appareil, créée/mise à jour par SessionTrackingMiddleware.
    Révocable individuellement (blacklist token) ou en masse.
    """
    user          = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    jti           = models.CharField(max_length=255, unique=True, verbose_name="JWT ID")
    device_name   = models.CharField(max_length=200, blank=True, verbose_name="Appareil")
    browser       = models.CharField(max_length=100, blank=True, verbose_name="Navigateur")
    os_name       = models.CharField(max_length=100, blank=True, verbose_name="Système")
    ip_address    = models.GenericIPAddressField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active     = models.BooleanField(default=True)
 
    class Meta:
        ordering = ['-last_activity']
        verbose_name = "Session utilisateur"
        verbose_name_plural = "Sessions utilisateurs"
 
    def __str__(self):
        return f"{self.user.username} — {self.device_name} ({self.ip_address})"
 
 
class OTPCode(models.Model):
    """
    Code OTP à 6 chiffres, usage unique, valide 10 minutes.
    Utilisé pour la 2FA (connexion, activation, désactivation).
    """
    PURPOSE_CHOICES = [
        ('2FA_LOGIN',   'Connexion 2FA'),
        ('2FA_ENABLE',  'Activation 2FA'),
        ('2FA_DISABLE', 'Désactivation 2FA'),
    ]
 
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_codes')
    code       = models.CharField(max_length=6)
    purpose    = models.CharField(max_length=15, choices=PURPOSE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used    = models.BooleanField(default=False)
 
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Code OTP"
        verbose_name_plural = "Codes OTP"
 
    def __str__(self):
        return f"{self.user.username} — {self.purpose} — {self.code}"
 
    @property
    def is_valid(self) -> bool:
        from django.utils import timezone
        return not self.is_used and self.expires_at > timezone.now()
