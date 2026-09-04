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
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        verbose_name="Latitude",
        help_text="Position GPS du point relais, utilisee pour le routage acheteur (point le plus proche avec de la place).",
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        verbose_name="Longitude",
    )
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

    # ── Fiabilité acheteur (IFA) — non-retrait au relais ────────────────────
    # Addendum Décisions v1.0 §3.2 : baisse de l'IFA a chaque non-retrait
    # (jamais de penalite monetaire au-dela des frais+garde). Un non-retrait
    # repete bascule le compte en "prepaiement obligatoire" — champ prevu ici
    # mais SANS levier d'application aujourd'hui : le systeme est deja 100%
    # prepaye a chaque commande (aucun mode de paiement a la remise n'existe),
    # donc ce flag est pour l'instant informatif/futur, pas encore applique
    # a un flux de paiement alternatif.
    non_retrait_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Nombre de non-retraits au relais",
    )
    requires_prepayment = models.BooleanField(
        default=False,
        verbose_name="Compte basculé en prépaiement obligatoire",
        help_text="Déclenché après non-retraits répétés — sans effet tant qu'aucun mode de paiement différé n'existe.",
    )

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
        # IFA (V5.5 §6) : indice de fiabilité acheteur, usage strictement
        # interne (jamais de Trust Score public côté acheteur) — throttling
        # anti-abus et, si le COD est activé un jour, gating du paiement à
        # la livraison. Ne jamais exposer ce role via une API publique.
        BUYER = "BUYER", "Acheteur (IFA interne)"

    class Tier(models.TextChoices):
        # Valeurs internes stables (utilisees par le plafond de valeur colis
        # livreur, entre autres) — le libelle AFFICHE varie par role, voir
        # get_role_tier_display() (Trust Score V5.5 : Bronze/Argent/Or/Platine
        # pour le vendeur, Starter/Confirme/Expert pour le livreur,
        # Starter/Confirme/Premium pour le relais).
        NEW = "NEW", "Nouveau"
        CONFIRMED = "CONFIRMED", "Confirmé"
        GOLD = "GOLD", "Or"
        PLATINUM = "PLATINUM", "Platine"

    # V5.5 : palier au-dessus de Or/Expert/Premium, atteignable uniquement
    # par le vendeur (score >= 90 tenu 6 mois + audit).
    ROLE_TIER_LABELS = {
        Role.VENDOR: {"NEW": "Bronze", "CONFIRMED": "Argent", "GOLD": "Or", "PLATINUM": "Platine"},
        Role.COURIER: {"NEW": "Starter", "CONFIRMED": "Confirmé", "GOLD": "Expert", "PLATINUM": "Expert"},
        Role.RELAY_POINT: {"NEW": "Starter", "CONFIRMED": "Confirmé", "GOLD": "Premium", "PLATINUM": "Premium"},
    }

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="trust_score_profiles")
    role = models.CharField(max_length=20, choices=Role.choices)
    score = models.DecimalField(max_digits=5, decimal_places=2, default=50)
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.NEW)
    candidate_tier = models.CharField(max_length=20, choices=Tier.choices, blank=True, default="")
    candidate_since = models.DateTimeField(null=True, blank=True)
    veto_active = models.BooleanField(default=False)
    veto_reason = models.CharField(max_length=255, blank=True, default="")
    audit_passed = models.BooleanField(
        default=False,
        help_text="Verification manuelle admin requise pour Or/Platine vendeur (V5.5). A renouveler par l'admin (trimestriel pour Platine).",
    )
    breakdown = models.JSONField(default=dict, blank=True)
    sample_size = models.PositiveIntegerField(default=0)
    volume = models.PositiveIntegerField(
        default=0,
        help_text="Commandes livrees (vendeur) / colis geres (relais) / courses terminees (livreur) — jauge les paliers V5.5.",
    )

    # Échelle de sanctions 1→4 (V5.5 §8). Le veto/gel existant (ci-dessus)
    # sert de mécanique pour le niveau 3 ; ces champs portent l'état propre
    # à l'échelle complète.
    class SanctionLevel(models.IntegerChoices):
        NONE = 0, "Aucune"
        WARNING = 1, "Avertissement"
        THROTTLING = 2, "Throttling"
        SUSPENSION = 3, "Suspension"
        BAN = 4, "Bannissement"

    sanction_level = models.PositiveSmallIntegerField(choices=SanctionLevel.choices, default=SanctionLevel.NONE)
    throttled_until = models.DateTimeField(
        null=True, blank=True,
        help_text="Niveau 2 : visibilité/dispatch réduits jusqu'à cette date.",
    )
    frozen_until = models.DateTimeField(
        null=True, blank=True,
        help_text="Niveau 3 : compte gelé jusqu'à cette date. À l'expiration, réhabilitation par re-cold-start (jamais restauration du score gelé).",
    )

    calculated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "role"], name="unique_trust_score_user_role"),
        ]
        ordering = ["role", "-score"]

    @property
    def is_throttled(self):
        return bool(self.throttled_until and timezone.now() < self.throttled_until)

    @property
    def parcel_value_cap_xaf(self):
        if self.tier in (self.Tier.GOLD, self.Tier.PLATINUM):
            return None
        if self.tier == self.Tier.CONFIRMED:
            return 250000
        return 75000

    def get_role_tier_display(self, tier=None):
        tier = tier or self.tier
        return self.ROLE_TIER_LABELS.get(self.role, {}).get(tier, tier)

    def __str__(self):
        return f"{self.user.username} · {self.role} · {self.score}"


class SanctionRecord(models.Model):
    """
    Journal des sanctions 1→4 (V5.5 §8) — un événement par palier appliqué,
    jamais réécrit ni supprimé (traçabilité OHADA, comme le score lui-même).
    """
    profile = models.ForeignKey(TrustScoreProfile, on_delete=models.CASCADE, related_name="sanctions")
    level = models.PositiveSmallIntegerField(choices=TrustScoreProfile.SanctionLevel.choices)
    reason = models.TextField()
    issued_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="issued_sanctions",
        help_text="Vide = déclenché automatiquement par le système (ex. véto anti-collusion).",
    )
    expires_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Niveaux 2/3 : levée automatique prévue à cette date. Vide = niveau 1 (log) ou niveau 4 (permanent).",
    )
    lifted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Sanction"
        verbose_name_plural = "Sanctions"

    def __str__(self):
        return f"{self.profile.user.username} · niveau {self.level} · {self.created_at:%Y-%m-%d}"


class PartnerBlacklist(models.Model):
    """
    Bannissement définitif (niveau 4) : bloque toute nouvelle inscription
    sous la même identité. On stocke un hash, jamais la valeur en clair —
    cette table n'a besoin que de comparer, pas de retrouver l'original.
    """
    class IdentifierType(models.TextChoices):
        CNI = "CNI", "Pièce d'identité"
        MOMO = "MOMO", "Numéro Mobile Money"
        DEVICE = "DEVICE", "Empreinte appareil"

    identifier_type = models.CharField(max_length=10, choices=IdentifierType.choices)
    identifier_hash = models.CharField(max_length=64, db_index=True, help_text="SHA-256 de la valeur normalisée.")
    reason = models.TextField()
    sanction = models.ForeignKey(SanctionRecord, on_delete=models.SET_NULL, null=True, blank=True, related_name="blacklist_entries")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["identifier_type", "identifier_hash"], name="unique_blacklist_identifier"),
        ]
        verbose_name = "Blacklist partenaire"
        verbose_name_plural = "Blacklist partenaires"

    def __str__(self):
        return f"{self.identifier_type} · {self.identifier_hash[:12]}…"

    @staticmethod
    def hash_identifier(raw_value: str) -> str:
        import hashlib
        normalised = "".join(ch for ch in (raw_value or "").strip().upper() if ch.isalnum())
        return hashlib.sha256(normalised.encode("utf-8")).hexdigest()

    @classmethod
    def is_blacklisted(cls, identifier_type: str, raw_value: str) -> bool:
        if not raw_value:
            return False
        return cls.objects.filter(identifier_type=identifier_type, identifier_hash=cls.hash_identifier(raw_value)).exists()


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


class RelayTrainingCompletion(models.Model):
    """
    Module de formation valide par un point relais.

    Le tronc obligatoire conditionne l'activation du statut de partenaire : la
    validation doit donc survivre au navigateur, d'ou un enregistrement serveur
    plutot qu'un stockage local.
    """

    class Module(models.TextChoices):
        RECEPTION = "reception", "Reception & garde des colis"
        CNI = "cni", "Verification CNI & cross-check ANTIC"
        STOCKAGE = "stockage", "Securite du stockage"
        LITIGE = "litige", "Gerer un litige & le mediateur"
        RELATION = "relation", "Relation acheteur & avis"
        PIDGIN = "pidgin", "Service en Pidgin"

    #: Modules du tronc obligatoire, requis pour activer le statut partenaire.
    CORE_MODULES = (Module.RECEPTION, Module.CNI, Module.STOCKAGE)

    #: Avantages credites a chaque module valide.
    POINTS_PER_MODULE = 30

    relay_point = models.ForeignKey(
        RelayPointProfile,
        on_delete=models.CASCADE,
        related_name="training_completions",
    )
    module_key = models.CharField(max_length=30, choices=Module.choices)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-completed_at"]
        verbose_name = "Module de formation valide"
        verbose_name_plural = "Modules de formation valides"
        constraints = [
            models.UniqueConstraint(
                fields=["relay_point", "module_key"],
                name="unique_training_module_per_relay_point",
            ),
        ]

    def __str__(self):
        return f"{self.relay_point.name} - {self.module_key}"


class AppRelease(models.Model):
    """
    Dernière version publiée de chaque appli partenaire, distribuée en dehors
    du Play Store (lien direct depuis le portail web une fois le compte
    approuvé). Une ligne par portail, modifiable depuis l'admin Django à
    chaque nouvelle build — pas de mise à jour automatique via un store.
    """

    class Portal(models.TextChoices):
        VENDOR = "VENDOR", "Vendeur"
        COURIER = "COURIER", "Livreur"
        DELIVERY_ORG = "DELIVERY_ORG", "Organisation de livraison"
        RELAY_POINT = "RELAY_POINT", "Point relais"

    portal = models.CharField(max_length=20, choices=Portal.choices, unique=True)
    version = models.CharField(max_length=30, help_text="Ex. 1.2.0")
    apk_url = models.URLField(max_length=500, help_text="Lien direct vers l'APK (heberge sur le domaine BelivaY, jamais un lien de stockage brut).")
    release_notes = models.TextField(blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Version d'appli partenaire"
        verbose_name_plural = "Versions d'applis partenaires"

    def __str__(self):
        return f"{self.get_portal_display()} v{self.version}"
