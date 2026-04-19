# backend/apps/vendors/models.py

from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify


# ─── PLAN D'ABONNEMENT ────────────────────────────────────────────────────────

class SubscriptionPlan(models.Model):
    class PlanCode(models.TextChoices):
        FREE     = 'FREE',     'Gratuit'
        STARTER  = 'STARTER',  'Starter'
        PRO      = 'PRO',      'Pro'
        BUSINESS = 'BUSINESS', 'Business'

    code               = models.CharField(max_length=20, choices=PlanCode.choices, unique=True)
    name               = models.CharField(max_length=100)
    description        = models.TextField(blank=True)
    price_monthly_xaf  = models.PositiveIntegerField(default=0, help_text="0 = gratuit")
    price_annual_xaf   = models.PositiveIntegerField(default=0)
    commission_rate    = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    max_products       = models.PositiveIntegerField(null=True, blank=True, help_text="null = illimité")
    max_boosts_month   = models.PositiveIntegerField(default=0)
    features           = models.JSONField(default=list)
    # Durée configurable par l'admin
    plan_duration_days = models.PositiveIntegerField(
        default=30,
        verbose_name="Durée du plan (jours)",
        help_text="Durée d'un abonnement mensuel en jours."
    )
    # Essai gratuit par plan
    trial_days         = models.PositiveIntegerField(
        default=0,
        verbose_name="Jours d'essai gratuit",
        help_text="0 = pas d'essai. Activé quand le vendeur choisit le plan pour la première fois."
    )
    is_active          = models.BooleanField(default=True)
    display_order      = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'price_monthly_xaf']
        verbose_name = "Plan d'abonnement"
        verbose_name_plural = "Plans d'abonnement"

    def __str__(self):
        trial_info = f" · {self.trial_days}j essai" if self.trial_days else ""
        return f"{self.name} ({self.price_monthly_xaf:,} FCFA/mois{trial_info})"


# ─── PROFIL VENDEUR ───────────────────────────────────────────────────────────

class VendorProfile(models.Model):
    STATUS_CHOICES = [
        ('PENDING',   'En attente'),
        ('APPROVED',  'Approuvé'),
        ('REJECTED',  'Rejeté'),
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

    # ── Identité (champs SENSIBLES — modification via ShopModificationRequest) ──
    user                 = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vendor_profile')
    business_name        = models.CharField(max_length=255, verbose_name="Nom de la boutique")
    business_description = models.TextField(verbose_name="Description")
    phone                = models.CharField(max_length=20)
    address              = models.TextField()
    city                 = models.CharField(max_length=100)
    id_document          = models.CharField(max_length=255, blank=True)

    # ── Boutique publique ────────────────────────────────────────────────────
    shop_slug         = models.SlugField(max_length=120, unique=True, blank=True)
    banner_image      = models.ImageField(upload_to='vendors/banners/%Y/%m/', null=True, blank=True)
    profile_photo     = models.ImageField(upload_to='vendors/photos/%Y/%m/', null=True, blank=True)
    whatsapp_phone    = models.CharField(max_length=20, blank=True)
    is_online         = models.BooleanField(default=True)

    # ── Certification (cache recalculé dynamiquement) ────────────────────────
    total_points       = models.PositiveIntegerField(default=0)
    certification_tier = models.CharField(
        max_length=10, choices=CertificationTier.choices, default=CertificationTier.BRONZE
    )

    # ── Plan ─────────────────────────────────────────────────────────────────
    current_plan    = models.ForeignKey(
        SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name='subscribers'
    )
    plan_expires_at = models.DateTimeField(null=True, blank=True)

    # ── Statut ───────────────────────────────────────────────────────────────
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Profil Vendeur"
        verbose_name_plural = "Profils Vendeurs"

    def __str__(self):
        return f"{self.business_name} ({self.user.username})"

    @property
    def is_active_vendor(self):
        return self.status == 'APPROVED'

    @property
    def public_url(self):
        return f"https://belivay.com?ref={self.shop_slug}" if self.shop_slug else None

    @property
    def active_plan_code(self):
        from django.utils import timezone
        if self.current_plan and (
            self.plan_expires_at is None or self.plan_expires_at > timezone.now()
        ):
            return self.current_plan.code
        return 'FREE'

    def save(self, *args, **kwargs):
        if not self.shop_slug and self.business_name:
            base = slugify(self.business_name)
            slug = base
            n = 1
            while VendorProfile.objects.filter(shop_slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
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


# ─── HISTORIQUE ABONNEMENTS ───────────────────────────────────────────────────

class VendorSubscription(models.Model):
    class BillingCycle(models.TextChoices):
        MONTHLY = 'MONTHLY', 'Mensuel'
        ANNUAL  = 'ANNUAL',  'Annuel'
        TRIAL   = 'TRIAL',   'Essai gratuit'

    class SubStatus(models.TextChoices):
        PENDING   = 'PENDING',   'En attente de paiement'
        ACTIVE    = 'ACTIVE',    'Actif'
        EXPIRED   = 'EXPIRED',   'Expiré'
        CANCELLED = 'CANCELLED', 'Annulé'

    vendor            = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name='subscriptions')
    plan              = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')
    billing_cycle     = models.CharField(max_length=10, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    is_trial          = models.BooleanField(
        default=False,
        verbose_name="Essai gratuit",
        help_text="Si True, c'est un essai gratuit — pas de paiement requis."
    )
    amount_paid_xaf   = models.PositiveIntegerField(default=0)
    operator          = models.CharField(
        max_length=20, blank=True,
        choices=[('ORANGE_MONEY', 'Orange Money'), ('MTN_MOMO', 'MTN MoMo')]
    )
    phone_number      = models.CharField(max_length=20, blank=True)
    payment_reference = models.CharField(max_length=60, blank=True)
    sub_status        = models.CharField(max_length=12, choices=SubStatus.choices, default=SubStatus.PENDING)
    started_at        = models.DateTimeField(null=True, blank=True)
    expires_at        = models.DateTimeField(null=True, blank=True)
    confirmed_by      = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='confirmed_subscriptions'
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Abonnement Vendeur"
        verbose_name_plural = "Abonnements Vendeurs"

    def __str__(self):
        trial_tag = " [ESSAI]" if self.is_trial else ""
        return f"{self.vendor.business_name} - {self.plan.name}{trial_tag} ({self.sub_status})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.payment_reference:
            import datetime
            year = self.created_at.year if self.created_at else datetime.date.today().year
            prefix = "BLV-TRIAL" if self.is_trial else "BLV-SUB"
            self.payment_reference = f"{prefix}-{year}-{self.pk:05d}"
            VendorSubscription.objects.filter(pk=self.pk).update(payment_reference=self.payment_reference)


# ─── TYPE DE DOCUMENT REQUIS (prédefini par l'admin) ─────────────────────────

class RequiredDocumentType(models.Model):
    """
    Types de documents que l'admin peut demander au vendeur
    lors d'une demande de modification de champs sensibles.
    Ex : RCCM, CNI, Justificatif de domicile, Acte de naissance...
    """
    name        = models.CharField(max_length=100, verbose_name="Nom du document")
    description = models.TextField(blank=True, verbose_name="Description / instructions")
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Type de document requis"
        verbose_name_plural = "Types de documents requis"

    def __str__(self):
        return self.name


# ─── DEMANDE DE MODIFICATION DE CHAMPS SENSIBLES ─────────────────────────────

class ShopModificationRequest(models.Model):
    """
    Le vendeur soumet une demande pour modifier des champs sensibles
    (nom, description, ville, adresse).

    Workflow :
      PENDING      → l'admin reçoit la demande
      DOCS_REQUIRED→ l'admin spécifie les documents à fournir
      DOCS_UPLOADED→ le vendeur a uploadé les documents demandés
      APPROVED     → l'admin approuve, les champs sont mis à jour automatiquement
      REJECTED     → l'admin rejette avec une raison
    """

    class Status(models.TextChoices):
        PENDING       = 'PENDING',       'En attente'
        DOCS_REQUIRED = 'DOCS_REQUIRED', 'Documents requis'
        DOCS_UPLOADED = 'DOCS_UPLOADED', 'Documents fournis'
        APPROVED      = 'APPROVED',      'Approuvée'
        REJECTED      = 'REJECTED',      'Rejetée'

    # Champs sensibles modifiables via cette procédure
    SENSITIVE_FIELDS = ['business_name', 'business_description', 'city', 'address']

    vendor        = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name='modification_requests')
    # JSON : {'business_name': 'Nouveau Nom', 'city': 'Douala'}
    fields_requested = models.JSONField(
        verbose_name="Champs à modifier",
        help_text='Ex: {"business_name": "Nouveau Nom", "city": "Douala"}'
    )
    reason        = models.TextField(verbose_name="Justification du vendeur")
    status        = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    # Message de l'admin (raison du rejet ou instructions pour les docs)
    admin_note    = models.TextField(blank=True, verbose_name="Note de l'admin")
    # Documents spécifiquement demandés par l'admin
    required_docs = models.ManyToManyField(
        RequiredDocumentType, blank=True, verbose_name="Documents requis par l'admin"
    )
    approved_by   = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_mod_requests'
    )
    approved_at   = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Demande de modification"
        verbose_name_plural = "Demandes de modification"

    def __str__(self):
        fields = ', '.join(self.fields_requested.keys()) if self.fields_requested else '?'
        return f"{self.vendor.business_name} — [{fields}] ({self.status})"

    def apply_approved_changes(self):
        """Applique les champs approuvés sur VendorProfile."""
        allowed = self.SENSITIVE_FIELDS
        for field, value in (self.fields_requested or {}).items():
            if field in allowed:
                setattr(self.vendor, field, value)
        self.vendor.save()


class ShopModificationDocument(models.Model):
    """Pièces jointes uploadées par le vendeur en réponse à une demande."""
    modification_request = models.ForeignKey(
        ShopModificationRequest, on_delete=models.CASCADE, related_name='documents'
    )
    document_type = models.ForeignKey(
        RequiredDocumentType, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name="Type de document"
    )
    file        = models.FileField(
        upload_to='vendors/mod_docs/%Y/%m/',
        verbose_name="Fichier"
    )
    description = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Document de modification"
        verbose_name_plural = "Documents de modification"

    def __str__(self):
        doc_type = self.document_type.name if self.document_type else "Document"
        return f"{doc_type} — {self.modification_request}"


# ─── EMPLACEMENTS PHYSIQUES ───────────────────────────────────────────────────

class VendorLocation(models.Model):
    """
    Emplacement physique d'une boutique.
    Ex : "Safara Mokolo", "Safara Essos", "Safara Bastos"
    """
    vendor               = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name='locations')
    name                 = models.CharField(max_length=200, verbose_name="Nom de l'emplacement")
    address              = models.TextField(verbose_name="Adresse complète")
    phone                = models.CharField(max_length=20, verbose_name="Téléphone de l'emplacement")
    email                = models.EmailField(blank=True, verbose_name="Email de l'emplacement")
    representative_name  = models.CharField(max_length=200, verbose_name="Nom du représentant")
    representative_phone = models.CharField(max_length=20, verbose_name="Téléphone du représentant")
    # Coordonnées GPS
    latitude             = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        verbose_name="Latitude",
        help_text="Ex: 3.848 (Yaoundé). Remplissez pour activer la carte."
    )
    longitude            = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        verbose_name="Longitude",
        help_text="Ex: 11.502 (Yaoundé)"
    )
    is_active            = models.BooleanField(default=True)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Emplacement de boutique"
        verbose_name_plural = "Emplacements de boutique"

    def __str__(self):
        return f"{self.vendor.business_name} — {self.name}"


# ─── NOTE INTERNE VENDEUR / COMMANDE ─────────────────────────────────────────

class VendorOrderNote(models.Model):
    order      = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='vendor_notes')
    vendor     = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name='order_notes')
    content    = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('order', 'vendor')
        verbose_name = "Note Interne Vendeur"
        verbose_name_plural = "Notes Internes Vendeurs"

    def __str__(self):
        return f"Note {self.vendor.business_name} — Commande #{self.order.id}"


# ─── DEMANDE DE RETRAIT ───────────────────────────────────────────────────────

class WithdrawalRequest(models.Model):
    class Operator(models.TextChoices):
        ORANGE_MONEY = 'ORANGE_MONEY', 'Orange Money'
        MTN_MOMO     = 'MTN_MOMO',     'MTN MoMo'

    class WithdrawalStatus(models.TextChoices):
        PENDING   = 'PENDING',   'En attente'
        APPROVED  = 'APPROVED',  'Approuvé'
        REJECTED  = 'REJECTED',  'Rejeté'
        CANCELLED = 'CANCELLED', 'Annulé'

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
        ordering = ['-created_at']
        verbose_name = "Demande de Retrait"
        verbose_name_plural = "Demandes de Retrait"

    def __str__(self):
        return f"{self.reference} — {self.vendor.business_name} ({self.status})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference:
            import datetime
            year = self.created_at.year if self.created_at else datetime.date.today().year
            self.reference = f"BLV-WD-{year}-{self.pk}"
            WithdrawalRequest.objects.filter(pk=self.pk).update(reference=self.reference)