# backend/apps/catalog/models.py
# Modèles du catalogue produits BelivaY.

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from django.db import transaction


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ─────────────────────────────────────────────────────────────────────────────
# CATÉGORIE
# ─────────────────────────────────────────────────────────────────────────────

class Category(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    is_active = models.BooleanField(default=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────────────────────────────────────
# ATTRIBUTS PRODUIT (créés par l'admin, choisis par le vendeur)
# ─────────────────────────────────────────────────────────────────────────────

class ProductAttribute(models.Model):
    """
    Attribut de produit défini par l'admin pour une catégorie donnée.
    Ex : pour la catégorie "Mode Femme" → attribut "Taille" avec valeurs ["XS","S","M","L","XL"]

    Règles :
      - Seul l'admin peut créer/modifier/supprimer des attributs.
      - Un vendeur voit les attributs de la catégorie qu'il sélectionne.
      - Le vendeur choisit uniquement parmi les valeurs définies ici.
    """

    class AttributeType(models.TextChoices):
        SIZE     = 'SIZE',     'Taille'
        COLOR    = 'COLOR',    'Couleur'
        MATERIAL = 'MATERIAL', 'Matière'
        OTHER    = 'OTHER',    'Autre'

    category      = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='attributes',
        verbose_name="Catégorie",
    )
    name          = models.CharField(max_length=100, verbose_name="Nom de l'attribut")
    attribute_type = models.CharField(
        max_length=10, choices=AttributeType.choices, default=AttributeType.OTHER,
        verbose_name="Type",
    )
    # Liste des valeurs possibles — ex: ["XS", "S", "M", "L", "XL"]
    values        = models.JSONField(
        default=list,
        verbose_name="Valeurs disponibles",
        help_text='Liste JSON. Ex: ["S", "M", "L"] ou ["Rouge", "Bleu"]',
    )
    is_required   = models.BooleanField(default=False, verbose_name="Obligatoire")
    display_order = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")

    class Meta:
        ordering            = ['category', 'display_order', 'name']
        verbose_name        = "Attribut Produit"
        verbose_name_plural = "Attributs Produit"

    def __str__(self):
        return f"{self.category.name} — {self.name}"


# ─────────────────────────────────────────────────────────────────────────────
# PRODUIT
# ─────────────────────────────────────────────────────────────────────────────

class Product(TimeStampedModel):
    """
    Produit mis en vente sur BelivaY.

    Logique prix :
      - price_xaf         : prix de vente final (ce que paie l'acheteur)
      - compare_at_price  : prix barré (ancien prix avant promo) — affiché rayé
      - discount_percent  : calculé automatiquement si compare_at_price est défini
      - promo_end_date    : date de fin de promotion — le frontend affiche un countdown

    Logique stock :
      - stock_threshold   : seuil alerte personnel du vendeur (nullable)
        Si null → on utilise PlatformSettings.default_stock_threshold

    Logique SKU :
      - sku auto-généré à la sauvegarde : BLV-{3 premières lettres catégorie}-{id:05d}
      - Le vendeur peut le modifier manuellement
    """

    title             = models.CharField(max_length=200)
    slug              = models.SlugField(max_length=220, unique=True)
    description       = models.TextField(blank=True)
    short_description = models.CharField(
        max_length=300, blank=True,
        help_text="Description courte pour la page produit et les aperçus.",
    )

    # ── Prix ────────────────────────────────────────────────────────────────
    price_xaf        = models.PositiveIntegerField(help_text="Prix de vente en FCFA (XAF)")
    compare_at_price = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Prix barré (avant promotion). Si renseigné, affiché rayé. Doit être > price_xaf.",
        verbose_name="Prix barré (FCFA)",
    )
    promo_end_date   = models.DateField(
        null=True, blank=True,
        help_text="Date de fin de promotion. Le frontend affiche un timer countdown.",
        verbose_name="Fin de promotion",
    )
    # Conservé pour rétrocompatibilité — remplacé progressivement par compare_at_price
    discount         = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Réduction en % (0-100). Utiliser compare_at_price de préférence.",
    )

    # ── Stock & Identification ───────────────────────────────────────────────
    sku             = models.CharField(
        max_length=60, blank=True, default='',
        verbose_name="SKU / Référence",
        help_text="Auto-généré : BLV-{CAT}-{id}. Modifiable manuellement.",
    )
    stock_threshold = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name="Seuil alerte stock",
        help_text=(
            "Quantité en dessous de laquelle une alerte stock s'affiche pour ce produit. "
            "Si vide → on utilise le seuil global de PlatformSettings."
        ),
    )

    # ── Relations ────────────────────────────────────────────────────────────
    is_active = models.BooleanField(default=True)
    category  = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )
    vendor    = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='products',
        null=True, blank=True,
        verbose_name="Vendeur",
    )

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Produit"
        verbose_name_plural = "Produits"

    def __str__(self):
        return self.title

    @property
    def discount_percent(self) -> int:
        """
        Pourcentage de réduction calculé.
        Priorité : compare_at_price > discount (legacy).
        """
        if self.compare_at_price and self.compare_at_price > self.price_xaf:
            return round((1 - self.price_xaf / self.compare_at_price) * 100)
        return self.discount

    @property
    def is_on_promotion(self) -> bool:
        """True si le produit est en promotion active."""
        if self.compare_at_price and self.compare_at_price > self.price_xaf:
            if self.promo_end_date:
                from django.utils import timezone
                return self.promo_end_date >= timezone.now().date()
            return True
        return self.discount > 0

    def get_effective_stock_threshold(self) -> int:
        """
        Retourne le seuil d'alerte stock effectif :
        - Seuil personnel du vendeur si défini
        - Sinon seuil global depuis PlatformSettings
        """
        if self.stock_threshold is not None:
            return self.stock_threshold
        try:
            from apps.orders.models import PlatformSettings
            return PlatformSettings.get_settings().default_stock_threshold
        except Exception:
            return 5  # Fallback sécurisé

    def generate_sku(self) -> str:
        """Génère le SKU automatique : BLV-{3 lettres catégorie}-{id:05d}."""
        cat_code = (self.category.name[:3].upper() if self.category else 'GEN')
        return f"BLV-{cat_code}-{self.pk:05d}"

    def save(self, *args, **kwargs):
        # Slug auto depuis le titre
        if not self.slug:
            self.slug = slugify(self.title)
            original = self.slug
            counter  = 1
            while Product.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original}-{counter}"
                counter += 1

        super().save(*args, **kwargs)

        # SKU auto après première sauvegarde (pour avoir le pk)
        if not self.sku:
            self.sku = self.generate_sku()
            Product.objects.filter(pk=self.pk).update(sku=self.sku)


class PromotionCampaign(TimeStampedModel):
    """
    Promotion régulière ou Flash Deal.

    Une promotion régulière est une remise simple. Un Flash Deal est limité dans
    le temps et en stock, avec validation admin et règles d'éligibilité plus
    strictes.
    """

    class CampaignType(models.TextChoices):
        REGULAR = "REGULAR", "Promotion régulière"
        FLASH = "FLASH", "Flash Deal"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Brouillon"
        PENDING = "PENDING", "En attente"
        APPROVED = "APPROVED", "Approuvée"
        REJECTED = "REJECTED", "Rejetée"
        SUSPENDED = "SUSPENDED", "Suspendue"
        EXPIRED = "EXPIRED", "Expirée"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="promotion_campaigns")
    campaign_type = models.CharField(max_length=12, choices=CampaignType.choices, default=CampaignType.REGULAR)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="requested_promotions")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_promotions")
    title = models.CharField(max_length=160)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    reference_price_xaf = models.PositiveIntegerField()
    promo_price_xaf = models.PositiveIntegerField()
    stock_reserved = models.PositiveIntegerField(default=0)
    stock_claimed = models.PositiveIntegerField(default=0)
    placement_fee_xaf = models.PositiveIntegerField(default=0)
    commission_uplift_points = models.PositiveIntegerField(default=0)
    rejection_reason = models.TextField(blank=True, default="")
    admin_note = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-starts_at", "-created_at"]
        verbose_name = "Campagne promotionnelle"
        verbose_name_plural = "Campagnes promotionnelles"

    def __str__(self):
        return f"{self.get_campaign_type_display()} · {self.product.title}"

    @property
    def discount_percent(self) -> int:
        if self.reference_price_xaf <= self.promo_price_xaf:
            return 0
        return round((1 - self.promo_price_xaf / self.reference_price_xaf) * 100)

    @property
    def is_active_now(self) -> bool:
        from django.utils import timezone

        now = timezone.now()
        return (
            self.status == self.Status.APPROVED
            and self.starts_at <= now <= self.ends_at
            and (self.campaign_type != self.CampaignType.FLASH or self.remaining_stock > 0)
        )

    @property
    def remaining_stock(self) -> int:
        if self.campaign_type != self.CampaignType.FLASH:
            return 0
        return max(0, self.stock_reserved - self.stock_claimed)

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.reference_price_xaf <= self.promo_price_xaf:
            raise ValidationError({"promo_price_xaf": "Le prix promo doit être inférieur au prix de référence."})
        if self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "La fin doit être après le début."})
        if self.campaign_type == self.CampaignType.FLASH:
            duration_hours = (self.ends_at - self.starts_at).total_seconds() / 3600
            if duration_hours < 2 or duration_hours > 48:
                raise ValidationError({"ends_at": "Un Flash Deal doit durer entre 2 h et 48 h."})
            if self.stock_reserved < 5:
                raise ValidationError({"stock_reserved": "Un Flash Deal demande au moins 5 unités réservées."})
            if not 15 <= self.discount_percent <= 70:
                raise ValidationError({"promo_price_xaf": "Un Flash Deal demande une remise entre 15 % et 70 %."})


# ─────────────────────────────────────────────────────────────────────────────
# VALEURS D'ATTRIBUTS PAR PRODUIT
# ─────────────────────────────────────────────────────────────────────────────

class ProductAttributeValue(models.Model):
    """
    Valeurs d'un attribut choisies par le vendeur pour un produit donné.
    Ex : produit "Robe Wax" → attribut "Taille" → selected_values = ["S", "M", "L"]

    Le vendeur choisit uniquement parmi ProductAttribute.values.
    """
    product         = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='attribute_values',
    )
    attribute       = models.ForeignKey(
        ProductAttribute,
        on_delete=models.CASCADE,
        related_name='product_values',
    )
    selected_values = models.JSONField(
        default=list,
        help_text="Valeurs sélectionnées parmi ProductAttribute.values.",
    )

    class Meta:
        unique_together     = ('product', 'attribute')
        verbose_name        = "Valeur Attribut Produit"
        verbose_name_plural = "Valeurs Attributs Produit"

    def __str__(self):
        return f"{self.product.title} — {self.attribute.name} : {self.selected_values}"


# ─────────────────────────────────────────────────────────────────────────────
# IMAGES, MEDIA, INVENTAIRE, AVIS
# ─────────────────────────────────────────────────────────────────────────────

class ProductImage(models.Model):
    product    = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='images', verbose_name="Produit",
    )
    image      = models.ImageField(upload_to='products/%Y/%m/', verbose_name="Image")
    is_primary = models.BooleanField(default=False, verbose_name="Image principale")
    order      = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = "Image Produit"
        verbose_name_plural = "Images Produits"
        ordering            = ['order', '-is_primary', '-created_at']

    def __str__(self):
        return f"Image {self.id} — {self.product.title}"

    def save(self, *args, **kwargs):
        """
        Sauvegarde de l'image avec gestion robuste du flag is_primary.
 
        Contrats garantis :
          - Une seule image par produit peut être is_primary=True.
          - Si c'est la première image du produit, elle devient automatiquement
            principale (sauf si is_primary=False explicitement passé).
          - Toutes les opérations BDD se font dans une seule transaction
            atomique pour éviter les états incohérents en cas d'uploads simultanés.
 
        IMPORTANT : self.product DOIT être assigné avant l'appel à save().
        Si product n'est pas encore en BDD ou non assigné, on lève une erreur
        explicite (au lieu de planter sur RelatedObjectDoesNotExist).
        """
        # Garde-fou : éviter le crash silencieux si product n'est pas attaché
        if not getattr(self, 'product_id', None):
            raise ValueError(
                "ProductImage.save() appelé sans produit associé. "
                "Toujours passer product=... lors de la création."
            )
 
        with transaction.atomic():
            # Cas 1 — Cette image est marquée principale : on retire le flag
            # de toutes les autres images du même produit.
            if self.is_primary:
                ProductImage.objects.filter(
                    product_id=self.product_id,
                ).exclude(pk=self.pk).update(is_primary=False)
 
            # Cas 2 — Cette image n'est pas marquée principale, mais c'est
            # la première image du produit : on la promeut automatiquement.
            elif not ProductImage.objects.filter(
                product_id=self.product_id,
            ).exclude(pk=self.pk).exists():
                self.is_primary = True
 
            super().save(*args, **kwargs)


class ProductMedia(TimeStampedModel):
    product    = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media")
    url        = models.URLField(max_length=500)
    media_type = models.CharField(
        max_length=20, choices=[("image", "image"), ("video", "video")], default="image",
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.product.title} — {self.media_type}"


class Inventory(TimeStampedModel):
    product  = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="inventory")
    quantity = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.product.title} — stock={self.quantity}"


class ProductReview(models.Model):
    product  = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_reviews')
    order    = models.ForeignKey(
        'orders.Order', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='product_reviews',
    )
    rating   = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Note de 1 à 5 étoiles",
    )
    title    = models.CharField(max_length=200, blank=True)
    comment  = models.TextField(blank=True)
    is_verified_purchase = models.BooleanField(default=False)
    is_approved          = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table       = 'product_reviews'
        ordering       = ['-created_at']
        unique_together = [['product', 'user']]
        indexes        = [
            models.Index(fields=['product', '-created_at']),
            models.Index(fields=['product', 'is_approved']),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.product.title} ({self.rating}★)"
