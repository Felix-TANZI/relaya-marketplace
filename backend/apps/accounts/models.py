# backend/apps/accounts/models.py
# Modèles pour la gestion des comptes utilisateurs

from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from apps.catalog.models import Product


class CourierProfile(models.Model):
    class AvailabilityStatus(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Disponible"
        ABSENT = "ABSENT", "Absent"
        LEAVE = "LEAVE", "En congé"
        SUSPENDED = "SUSPENDED", "Suspendu"

    class VehicleType(models.TextChoices):
        MOTORBIKE = "MOTORBIKE", "Moto"
        CAR       = "CAR", "Voiture"
        BIKE      = "BIKE", "Velo"
        TRICYCLE  = "TRICYCLE", "Tricycle"
        VAN       = "VAN", "Camionnette"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="courier_profile")
    delivery_organization = models.ForeignKey(
        "DeliveryOrganizationProfile",
        on_delete=models.SET_NULL,
        related_name="couriers",
        null=True,
        blank=True,
    )
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
    max_active_shipments = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    availability_status = models.CharField(
        max_length=20,
        choices=AvailabilityStatus.choices,
        default=AvailabilityStatus.AVAILABLE,
    )
    availability_note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Profil livreur"
        verbose_name_plural = "Profils livreurs"

    def __str__(self):
        return f"Livreur {self.user.username} ({self.city})"


class DeliveryOrganizationProfile(models.Model):
    """
    Entreprise partenaire de livraison.

    Phase 1 BelivaY: les livreurs terrain sont rattaches a une organisation de
    livraison contractuelle, distincte du compte admin global.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        APPROVED = "APPROVED", "Approuvee"
        SUSPENDED = "SUSPENDED", "Suspendue"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="delivery_organization_profile")
    company_name = models.CharField(max_length=160)
    manager_name = models.CharField(max_length=120, blank=True, default="")
    phone = models.CharField(max_length=20)
    city = models.CharField(max_length=80, blank=True, default="")
    zones = models.JSONField(default=list, blank=True)
    address = models.CharField(max_length=255, blank=True, default="")
    contract_reference = models.CharField(max_length=120, blank=True, default="")
    allowed_vehicle_types = models.JSONField(default=list, blank=True)
    max_active_shipments = models.PositiveIntegerField(default=50)
    transport_insurance_verified = models.BooleanField(
        default=False,
        help_text="Obligatoire pour confier sans plafond un colis à un livreur de palier Or.",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_name"]
        verbose_name = "Organisation de livraison"
        verbose_name_plural = "Organisations de livraison"

    def __str__(self):
        return self.company_name


class DeliveryVehicle(models.Model):
    """Vehicle owned by a delivery organization and temporarily assigned to a courier."""

    organization = models.ForeignKey(
        DeliveryOrganizationProfile,
        on_delete=models.CASCADE,
        related_name="vehicles",
    )
    label = models.CharField(max_length=120)
    registration = models.CharField(max_length=40)
    vehicle_type = models.CharField(max_length=20, choices=CourierProfile.VehicleType.choices)
    assigned_courier = models.OneToOneField(
        CourierProfile,
        on_delete=models.SET_NULL,
        related_name="assigned_company_vehicle",
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["label"]
        constraints = [
            models.UniqueConstraint(fields=["organization", "registration"], name="unique_org_vehicle_registration"),
        ]

    def __str__(self):
        return f"{self.label} ({self.registration})"


class ComplianceDocument(models.Model):
    class OwnerRole(models.TextChoices):
        DELIVERY_ORGANIZATION = "DELIVERY_ORGANIZATION", "Organisation livraison"
        RELAY_POINT = "RELAY_POINT", "Point relais"

    class Status(models.TextChoices):
        PENDING = "PENDING", "En cours de vérification"
        APPROVED = "APPROVED", "Validé"
        REJECTED = "REJECTED", "Rejeté"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="compliance_documents")
    owner_role = models.CharField(max_length=30, choices=OwnerRole.choices)
    document_type = models.CharField(max_length=60)
    file = models.FileField(upload_to="compliance/%Y/%m/")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    review_note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "owner_role", "document_type"], name="unique_role_compliance_document"),
        ]


class RelayPointProfile(models.Model):
    """
    Point relais BelivaY.

    Phase 1: le point relais est un acteur operationnel rattache a un compte,
    cree par l'admin pour recevoir, stocker et remettre les colis.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        APPROVED = "APPROVED", "Approuve"
        SUSPENDED = "SUSPENDED", "Suspendu"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="relay_point_profile")
    name = models.CharField(max_length=160)
    manager_name = models.CharField(max_length=120, blank=True, default="")
    phone = models.CharField(max_length=20)
    city = models.CharField(max_length=80, blank=True, default="")
    zones = models.JSONField(default=list, blank=True)
    address = models.CharField(max_length=255, blank=True, default="")
    relay_code = models.CharField(max_length=80, blank=True, default="")
    opening_hours = models.CharField(max_length=160, blank=True, default="")
    storage_capacity = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Point relais"
        verbose_name_plural = "Points relais"

    def __str__(self):
        return self.name


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


class RewardAccount(models.Model):
    """
    Compte points/tokens par rôle.

    BelivaY n'a pas un seul compteur global: un même utilisateur peut être client,
    vendeur ou livreur, avec des règles et des affichages différents.
    """

    class Role(models.TextChoices):
        CLIENT = "CLIENT", "Client"
        VENDOR = "VENDOR", "Vendeur"
        COURIER = "COURIER", "Livreur"
        RELAY = "RELAY", "Point Relais"

    class Tier(models.TextChoices):
        BRONZE = "BRONZE", "Bronze"
        SILVER = "SILVER", "Argent"
        GOLD = "GOLD", "Or"
        PLATINUM = "PLATINUM", "Platine"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reward_accounts")
    role = models.CharField(max_length=20, choices=Role.choices)
    points_balance = models.IntegerField(default=0)
    lifetime_points = models.PositiveIntegerField(default=0)
    trust_score = models.PositiveIntegerField(default=70)
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.BRONZE)
    last_recalculated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [["user", "role"]]
        ordering = ["user_id", "role"]
        verbose_name = "Compte récompenses"
        verbose_name_plural = "Comptes récompenses"

    def __str__(self):
        return f"{self.user.username} · {self.role} · {self.points_balance} pts"

    @staticmethod
    def tier_from_points(points: int) -> str:
        if points >= 5000:
            return RewardAccount.Tier.PLATINUM
        if points >= 2000:
            return RewardAccount.Tier.GOLD
        if points >= 500:
            return RewardAccount.Tier.SILVER
        return RewardAccount.Tier.BRONZE

    def apply_delta(self, delta: int) -> None:
        self.points_balance = max(0, self.points_balance + delta)
        if delta > 0:
            self.lifetime_points += delta
        self.tier = self.tier_from_points(self.lifetime_points)
        self.save(update_fields=["points_balance", "lifetime_points", "tier", "updated_at"])


class RewardTransaction(models.Model):
    """
    Journal immuable des mouvements de points/tokens.
    Les conversions en argent réel restent interdites côté client; on journalise
    les usages internes BelivaY pour garder une trace auditable.
    """

    class Source(models.TextChoices):
        ORDER = "ORDER", "Commande"
        REVIEW = "REVIEW", "Avis"
        DISPUTE = "DISPUTE", "Litige"
        DELIVERY = "DELIVERY", "Livraison"
        PROMOTION = "PROMOTION", "Promotion"
        MANUAL = "MANUAL", "Manuel"

    account = models.ForeignKey(RewardAccount, on_delete=models.CASCADE, related_name="transactions")
    delta = models.IntegerField()
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    reason = models.CharField(max_length=180)
    reference = models.CharField(max_length=80, blank=True, default="")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reward_transactions_created")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Transaction récompense"
        verbose_name_plural = "Transactions récompenses"

    def __str__(self):
        return f"{self.account} · {self.delta:+d}"


class TrustScoreProfile(models.Model):
    """Score de confiance métier, indépendant des points de récompense."""

    class Role(models.TextChoices):
        VENDOR = "VENDOR", "Vendeur"
        COURIER = "COURIER", "Livreur"
        RELAY_POINT = "RELAY_POINT", "Point relais"

    class Tier(models.TextChoices):
        NEW = "NEW", "Nouveau"
        CONFIRMED = "CONFIRMED", "Confirmé"
        GOLD = "GOLD", "Or"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="trust_score_profiles")
    role = models.CharField(max_length=20, choices=Role.choices)
    score = models.DecimalField(max_digits=5, decimal_places=2, default=70)
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.NEW)
    candidate_tier = models.CharField(max_length=20, choices=Tier.choices, blank=True, default="")
    candidate_since = models.DateTimeField(null=True, blank=True)
    veto_active = models.BooleanField(default=False)
    veto_reason = models.CharField(max_length=255, blank=True, default="")
    breakdown = models.JSONField(default=dict, blank=True)
    sample_size = models.PositiveIntegerField(default=0)
    calculated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "role"], name="unique_trust_score_user_role"),
        ]
        ordering = ["role", "-score"]

    @property
    def parcel_value_cap_xaf(self):
        if self.tier == self.Tier.GOLD:
            return None
        if self.tier == self.Tier.CONFIRMED:
            return 250000
        return 75000

    def __str__(self):
        return f"{self.user.username} · {self.role} · {self.score}"


class PayoutAccount(models.Model):
    """
    Numero Mobile Money utilise pour les versements BelivaY.

    Un vendeur, livreur, point relais ou organisation doit prouver qu'il controle
    le numero avant que BelivaY puisse l'utiliser pour envoyer l'argent.
    """

    class OwnerRole(models.TextChoices):
        VENDOR = "VENDOR", "Vendeur"
        COURIER = "COURIER", "Livreur"
        DELIVERY_ORGANIZATION = "DELIVERY_ORGANIZATION", "Organisation livraison"
        RELAY_POINT = "RELAY_POINT", "Point relais"

    class Status(models.TextChoices):
        PENDING_VERIFICATION = "PENDING_VERIFICATION", "Verification requise"
        VERIFIED = "VERIFIED", "Verifie"
        DISABLED = "DISABLED", "Desactive"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payout_accounts")
    owner_role = models.CharField(max_length=30, choices=OwnerRole.choices)
    label = models.CharField(max_length=120, blank=True, default="")
    phone_e164 = models.CharField(max_length=20)
    national_number = models.CharField(max_length=12)
    operator = models.CharField(max_length=20)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING_VERIFICATION)
    is_primary = models.BooleanField(default=False)
    verification_code_hash = models.CharField(max_length=160, blank=True, default="")
    verification_expires_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_primary", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "owner_role", "phone_e164"],
                name="uniq_payout_account_phone_per_role",
            ),
        ]
        indexes = [
            models.Index(
                fields=["user", "owner_role", "status"],
                name="accounts_pa_user_id_1906da_idx",
            ),
        ]
        verbose_name = "Compte de versement"
        verbose_name_plural = "Comptes de versement"

    def __str__(self):
        return f"{self.user.username} · {self.owner_role} · {self.phone_e164}"

    def set_verification_code(self, code: str, minutes: int = 10):
        self.verification_code_hash = make_password(code)
        self.verification_expires_at = timezone.now() + timezone.timedelta(minutes=minutes)
        self.last_sent_at = timezone.now()

    def check_verification_code(self, code: str) -> bool:
        if not self.verification_code_hash or not self.verification_expires_at:
            return False
        if self.verification_expires_at < timezone.now():
            return False
        return check_password(code, self.verification_code_hash)

    def mark_verified(self):
        self.status = self.Status.VERIFIED
        self.verified_at = timezone.now()
        self.verification_code_hash = ""
        self.verification_expires_at = None
        self.save(update_fields=["status", "verified_at", "verification_code_hash", "verification_expires_at", "updated_at"])


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
