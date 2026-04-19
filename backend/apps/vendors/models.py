# backend/apps/vendors/models.py
# Modèles pour la gestion des vendeurs sur la plateforme BelivaY.

from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify


# ─────────────────────────────────────────────────────────────────────────────
# PLAN D'ABONNEMENT (créé par l'admin uniquement)
# ─────────────────────────────────────────────────────────────────────────────

class SubscriptionPlan(models.Model):
    """
    Plans d'abonnement BelivaY pour les vendeurs.
    Créés et gérés par l'admin uniquement.
    """

    class PlanCode(models.TextChoices):
        FREE     = 'FREE',     'Gratuit'
        STARTER  = 'STARTER',  'Starter'
        PRO      = 'PRO',      'Pro'
        BUSINESS = 'BUSINESS', 'Business'

    code              = models.CharField(
        max_length=20, choices=PlanCode.choices, unique=True,
        verbose_name="Code plan",
    )
    name              = models.CharField(max_length=100, verbose_name="Nom du plan")
    description       = models.TextField(blank=True, verbose_name="Description")
    price_monthly_xaf = models.PositiveIntegerField(
        default=0, verbose_name="Prix mensuel (FCFA)",
        help_text="0 = plan gratuit",
    )
    price_annual_xaf  = models.PositiveIntegerField(
        default=0, verbose_name="Prix annuel (FCFA)",
        help_text="0 = plan gratuit. Typiquement prix_mensuel x 10 (2 mois offerts).",
    )
    commission_rate   = models.DecimalField(
        max_digits=5, decimal_places=2, default=10.00,
        verbose_name="Taux de commission (%)",
    )
    max_products      = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Produits maximum",
        help_text="null = illimite",
    )
    max_boosts_month  = models.PositiveIntegerField(
        default=0, verbose_name="Boosts max/mois",
    )
    features          = models.JSONField(
        default=list, verbose_name="Fonctionnalites",
        help_text='Liste JSON. Ex: ["QR Code boutique", "Support prioritaire"]',
    )
    is_active         = models.BooleanField(default=True, verbose_name="Plan actif")
    display_order     = models.PositiveIntegerField(default=0, verbose_name="Ordre affichage")

    class Meta:
        ordering            = ['display_order', 'price_monthly_xaf']
        verbose_name        = "Plan d'abonnement"
        verbose_name_plural = "Plans d'abonnement"

    def __str__(self):
        return f"{self.name} ({self.price_monthly_xaf:,} FCFA/mois)"


# ─────────────────────────────────────────────────────────────────────────────
# PROFIL VENDEUR
# ─────────────────────────────────────────────────────────────────────────────

class VendorProfile(models.Model):
    """
    Profil vendeur : donnees boutique, certification, plan.

    Slug : auto-genere depuis business_name, unique, modifiable.
           URL publique : belivay.com/boutique/{slug}

    Certification : total_points calcule dynamiquement a chaque appel API.
                    certification_tier deduit des points.

    Plan : current_plan FK vers SubscriptionPlan (null = FREE).
    """

    STATUS_CHOICES = [
        ('PENDING',   'En attente'),
        ('APPROVED',  'Approuve'),
        ('REJECTED',  'Rejete'),
        ('SUSPENDED', 'Suspendu'),
    ]

    class Status:
        APPROVED  = 'APPROVED'
        PENDING   = 'PENDING'
        REJECTED  = 'REJECTED'
        SUSPENDED = 'SUSPENDED'

    class CertificationTier(models.TextChoices):
        BRONZE  = 'BRONZE',  'Bronze'
        SILVER  = 'SILVER',  'Argent'
        GOLD    = 'GOLD',    'Or'
        DIAMOND = 'DIAMOND', 'Diamant'

    class PreparationDelay(models.TextChoices):
        H24    = '24H',    '24h ouvrables'
        H48    = '48H',    '48h ouvrables'
        H72    = '72H',    '72h ouvrables'
        CUSTOM = 'CUSTOM', 'Sur commande'

    # ── Identite de base ─────────────────────────────────────────────────────
    user                 = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='vendor_profile',
    )
    business_name        = models.CharField(max_length=255, verbose_name="Nom de la boutique")
    business_description = models.TextField(verbose_name="Description de la boutique")
    phone                = models.CharField(max_length=20, verbose_name="Telephone principal")
    address              = models.TextField(verbose_name="Adresse")
    city                 = models.CharField(max_length=100, verbose_name="Ville principale")
    id_document          = models.CharField(max_length=255, blank=True, verbose_name="Document identite")

    # ── Boutique publique ────────────────────────────────────────────────────
    shop_slug         = models.SlugField(
        max_length=120, unique=True, blank=True,
        verbose_name="Slug URL",
        help_text="URL : belivay.com/boutique/{slug}. Auto-genere depuis le nom.",
    )
    banner_image      = models.ImageField(
        upload_to='vendors/banners/%Y/%m/', null=True, blank=True,
        verbose_name="Banniere",
    )
    profile_photo     = models.ImageField(
        upload_to='vendors/photos/%Y/%m/', null=True, blank=True,
        verbose_name="Photo de boutique",
    )
    whatsapp_phone    = models.CharField(
        max_length=20, blank=True, verbose_name="Telephone WhatsApp",
    )
    preparation_delay = models.CharField(
        max_length=10, choices=PreparationDelay.choices, default=PreparationDelay.H72,
        verbose_name="Delai de preparation",
    )
    return_policy     = models.TextField(
        blank=True, default='', verbose_name="Politique de retour",
    )
    is_online         = models.BooleanField(
        default=True, verbose_name="Boutique en ligne",
    )

    # ── Certification (cache — recalcule dynamiquement) ───────────────────────
    total_points       = models.PositiveIntegerField(
        default=0, verbose_name="Points de certification (cache)",
    )
    certification_tier = models.CharField(
        max_length=10, choices=CertificationTier.choices, default=CertificationTier.BRONZE,
        verbose_name="Niveau de certification",
    )

    # ── Plan ─────────────────────────────────────────────────────────────────
    current_plan    = models.ForeignKey(
        SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='subscribers', verbose_name="Plan actuel",
    )
    plan_expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Expiration du plan")

    # ── Statut ───────────────────────────────────────────────────────────────
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = "Profil Vendeur"
        verbose_name_plural = "Profils Vendeurs"

    def __str__(self):
        return f"{self.business_name} ({self.user.username})"

    @property
    def is_active_vendor(self):
        return self.status == 'APPROVED'

    @property
    def public_url(self):
        return f"https://belivay.com/boutique/{self.shop_slug}" if self.shop_slug else None

    @property
    def active_plan_code(self):
        from django.utils import timezone
        if self.current_plan and (
            self.plan_expires_at is None or self.plan_expires_at > timezone.now()
        ):
            return self.current_plan.code
        return 'FREE'

    def save(self, *args, **kwargs):
        # Auto-generer le slug depuis business_name si absent
        if not self.shop_slug and self.business_name:
            base = slugify(self.business_name)
            slug = base
            n    = 1
            while VendorProfile.objects.filter(shop_slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n   += 1
            self.shop_slug = slug
        super().save(*args, **kwargs)

    @staticmethod
    def tier_from_points(points: int) -> str:
        if points >= 2000: return 'DIAMOND'
        if points >= 1000: return 'GOLD'
        if points >= 500:  return 'SILVER'
        return 'BRONZE'

    @staticmethod
    def next_tier_threshold(points: int) -> int:
        if points < 500:  return 500
        if points < 1000: return 1000
        if points < 2000: return 2000
        return 2000


# ─────────────────────────────────────────────────────────────────────────────
# HISTORIQUE ABONNEMENTS
# ─────────────────────────────────────────────────────────────────────────────

class VendorSubscription(models.Model):
    """
    Chaque souscription ou renouvellement cree une entree.
    PENDING  : vendeur a initie le paiement, admin doit valider.
    ACTIVE   : paiement confirme par l'admin.
    EXPIRED  : date expiree.
    CANCELLED: annule avant expiration.
    """

    class BillingCycle(models.TextChoices):
        MONTHLY = 'MONTHLY', 'Mensuel'
        ANNUAL  = 'ANNUAL',  'Annuel'

    class SubStatus(models.TextChoices):
        PENDING   = 'PENDING',   'En attente de paiement'
        ACTIVE    = 'ACTIVE',    'Actif'
        EXPIRED   = 'EXPIRED',   'Expire'
        CANCELLED = 'CANCELLED', 'Annule'

    vendor            = models.ForeignKey(
        VendorProfile, on_delete=models.CASCADE, related_name='subscriptions',
    )
    plan              = models.ForeignKey(
        SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions',
    )
    billing_cycle     = models.CharField(
        max_length=10, choices=BillingCycle.choices, default=BillingCycle.MONTHLY,
    )
    amount_paid_xaf   = models.PositiveIntegerField(default=0, verbose_name="Montant paye (FCFA)")
    operator          = models.CharField(
        max_length=20, blank=True,
        choices=[('ORANGE_MONEY', 'Orange Money'), ('MTN_MOMO', 'MTN MoMo')],
    )
    phone_number      = models.CharField(max_length=20, blank=True, verbose_name="Numero MoMo")
    payment_reference = models.CharField(
        max_length=60, blank=True,
        help_text="Auto-genere : BLV-SUB-{year}-{id}",
    )
    sub_status        = models.CharField(
        max_length=12, choices=SubStatus.choices, default=SubStatus.PENDING,
    )
    started_at    = models.DateTimeField(null=True, blank=True)
    expires_at    = models.DateTimeField(null=True, blank=True)
    confirmed_by  = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='confirmed_subscriptions',
    )
    confirmed_at  = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ['-created_at']
        verbose_name        = "Abonnement Vendeur"
        verbose_name_plural = "Abonnements Vendeurs"

    def __str__(self):
        return f"{self.vendor.business_name} - {self.plan.name} ({self.sub_status})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.payment_reference:
            import datetime
            year = self.created_at.year if self.created_at else datetime.date.today().year
            self.payment_reference = f"BLV-SUB-{year}-{self.pk:05d}"
            VendorSubscription.objects.filter(pk=self.pk).update(
                payment_reference=self.payment_reference,
            )


# ─────────────────────────────────────────────────────────────────────────────
# NOTE INTERNE VENDEUR SUR COMMANDE
# ─────────────────────────────────────────────────────────────────────────────

class VendorOrderNote(models.Model):
    order   = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='vendor_notes')
    vendor  = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name='order_notes')
    content = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together     = ('order', 'vendor')
        verbose_name        = "Note Interne Vendeur"
        verbose_name_plural = "Notes Internes Vendeurs"

    def __str__(self):
        return f"Note {self.vendor.business_name} - Commande #{self.order.id}"


# ─────────────────────────────────────────────────────────────────────────────
# DEMANDE DE RETRAIT
# ─────────────────────────────────────────────────────────────────────────────

class WithdrawalRequest(models.Model):

    class Operator(models.TextChoices):
        ORANGE_MONEY = 'ORANGE_MONEY', 'Orange Money'
        MTN_MOMO     = 'MTN_MOMO',     'MTN MoMo'

    class WithdrawalStatus(models.TextChoices):
        PENDING   = 'PENDING',   'En attente'
        APPROVED  = 'APPROVED',  'Approuve'
        REJECTED  = 'REJECTED',  'Rejete'
        CANCELLED = 'CANCELLED', 'Annule'

    vendor               = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name='withdrawals')
    amount_xaf           = models.PositiveIntegerField()
    fee_percent_snapshot = models.DecimalField(max_digits=4, decimal_places=2)
    fee_amount_xaf       = models.PositiveIntegerField()
    net_amount_xaf       = models.PositiveIntegerField()
    operator             = models.CharField(max_length=15, choices=Operator.choices)
    phone_number         = models.CharField(max_length=20)
    status               = models.CharField(max_length=12, choices=WithdrawalStatus.choices, default=WithdrawalStatus.PENDING)
    reference            = models.CharField(max_length=60, blank=True)
    admin_note           = models.TextField(blank=True)
    processed_at         = models.DateTimeField(null=True, blank=True)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        ordering            = ['-created_at']
        verbose_name        = "Demande de Retrait"
        verbose_name_plural = "Demandes de Retrait"

    def __str__(self):
        return f"{self.reference} - {self.vendor.business_name} ({self.status})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference:
            import datetime
            year = self.created_at.year if self.created_at else datetime.date.today().year
            self.reference = f"BLV-WD-{year}-{self.pk}"
            WithdrawalRequest.objects.filter(pk=self.pk).update(reference=self.reference)