# backend/apps/catalog/admin.py
# Enregistrement complet des modèles catalog dans Django Admin.
# Remplace le fichier existant (ajoute ProductAttribute, ProductAttributeValue, ProductReview).

from django.contrib import admin, messages
from django.utils.html import format_html
from django.urls import reverse
from django.utils.http import urlencode
from .models import (
    Category,
    Product,
    ProductImage,
    ProductMedia,
    Inventory,
    ProductAttribute,
    ProductAttributeValue,
    PromotionCampaign,
    ProductReview,
    Brand,
    MasterProduct,
    ColorDictionary,
)


# ─── CATÉGORIES ───────────────────────────────────────────────────────────────

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    """
    Admin du registre des marques.
 
    Fonctionnalités clés :
      - Bulk actions : marquer verified, activer/désactiver
      - Fusion de doublons via action bulk (source → cible, migre les FK)
      - Statistiques : nombre de fiches maîtres par marque
      - Filtres rapides pour identifier les marques non-vérifiées
    """
 
    list_display = [
        "name_with_badge",
        "slug",
        "country_of_origin",
        "master_products_count_display",
        "is_verified_badge",
        "is_active",
        "created_at",
    ]
    list_filter = [
        "is_verified",
        "is_active",
        "country_of_origin",
    ]
    search_fields = ["name", "slug", "country_of_origin"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["-is_verified", "name"]
    list_per_page = 50
 
    fieldsets = (
        ("Identité", {
            "fields": ("name", "slug", "logo"),
        }),
        ("Présentation publique", {
            "fields": ("description", "country_of_origin", "website"),
        }),
        ("État", {
            "fields": ("is_active", "is_verified"),
        }),
        ("Interne", {
            "fields": ("admin_note",),
            "classes": ("collapse",),
        }),
    )
 
    actions = [
        "mark_verified",
        "unmark_verified",
        "activate",
        "deactivate",
        "merge_into_first_selected",
    ]
 
    # ─── Colonnes personnalisées ───────────────────────────────────────
 
    def name_with_badge(self, obj):
        if obj.is_verified:
            return format_html(
                '<strong>{}</strong> <span style="color:#059669;">✓</span>',
                obj.name,
            )
        return format_html(
            '<strong>{}</strong> <span style="color:#F59E0B; font-size:11px;">'
            '(non-vérifiée)</span>',
            obj.name,
        )
    name_with_badge.short_description = "Nom"
    name_with_badge.admin_order_field = "name"
 
    def is_verified_badge(self, obj):
        if obj.is_verified:
            return format_html(
                '<span style="background:#059669; color:#fff; padding:2px 8px; '
                'border-radius:4px; font-size:11px;">VÉRIFIÉE</span>'
            )
        return format_html(
            '<span style="background:#F59E0B; color:#fff; padding:2px 8px; '
            'border-radius:4px; font-size:11px;">EN ATTENTE</span>'
        )
    is_verified_badge.short_description = "Statut"
 
    def master_products_count_display(self, obj):
        count = obj.master_products.count()
        if count == 0:
            return "0"
        try:
            url = reverse("admin:catalog_masterproduct_changelist")
            return format_html(
                '<a href="{}?brand_fk__id__exact={}">{} fiche(s)</a>',
                url, obj.id, count,
            )
        except Exception:
            return str(count)
    master_products_count_display.short_description = "Fiches maîtres"
 
    # ─── Actions bulk ──────────────────────────────────────────────────
 
    @admin.action(description="✓ Marquer comme VÉRIFIÉE")
    def mark_verified(self, request, queryset):
        n = queryset.update(is_verified=True)
        self.message_user(
            request,
            f"{n} marque(s) marquée(s) vérifiée(s).",
            level=messages.SUCCESS,
        )
 
    @admin.action(description="✗ Retirer le flag VÉRIFIÉE")
    def unmark_verified(self, request, queryset):
        n = queryset.update(is_verified=False)
        self.message_user(request, f"{n} marque(s) démarquée(s).", level=messages.WARNING)
 
    @admin.action(description="Activer")
    def activate(self, request, queryset):
        n = queryset.update(is_active=True)
        self.message_user(request, f"{n} marque(s) activée(s).")
 
    @admin.action(description="Désactiver")
    def deactivate(self, request, queryset):
        n = queryset.update(is_active=False)
        self.message_user(request, f"{n} marque(s) désactivée(s).")
 
    @admin.action(
        description=(
            "⚠️ FUSIONNER : la 1re sélectionnée devient la cible, "
            "les autres seront supprimées"
        )
    )
    def merge_into_first_selected(self, request, queryset):
        """
        Fusion de marques : la première (par ordre alphabétique de la sélection)
        devient la cible. Tous les MasterProduct des autres marques sont
        rebasculés vers la cible, puis les autres marques sont supprimées.
 
        Sécurités :
          - Refus si < 2 marques sélectionnées
          - Refus si la cible n'est pas is_verified (évite d'écraser une
            marque vérifiée par une non-vérifiée par erreur)
        """
        brands = list(queryset.order_by("-is_verified", "name"))
        if len(brands) < 2:
            self.message_user(
                request,
                "Sélectionne au moins 2 marques pour fusionner.",
                level=messages.ERROR,
            )
            return
 
        target = brands[0]
        sources = brands[1:]
 
        if not target.is_verified:
            # On préfère forcer verified sur la cible en cas de fusion
            # (règle métier : après fusion, on a une seule marque canonique)
            self.message_user(
                request,
                f"La marque cible '{target.name}' n'est pas vérifiée. "
                f"Marque-la d'abord comme vérifiée avant la fusion.",
                level=messages.ERROR,
            )
            return
 
        total_moved = 0
        for src in sources:
            moved = MasterProduct.objects.filter(brand_fk=src).update(brand_fk=target)
            total_moved += moved
            src.delete()
 
        self.message_user(
            request,
            f"Fusion réussie : {total_moved} fiche(s) rebasculée(s) vers "
            f"'{target.name}'. {len(sources)} marque(s) supprimée(s).",
            level=messages.SUCCESS,
        )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Admin optimisé pour gérer une hiérarchie de plusieurs centaines de nœuds."""
 
    list_display = [
        "indented_name",
        "level_badge",
        "slug",
        "flags",
        "children_count",
        "products_count_display",
        "display_order",
    ]
    list_filter = [
        "level",
        "is_active",
        "is_deprecated",
        "requires_admin_approval",
    ]
    search_fields = ["name", "slug", "description"]
    autocomplete_fields = ["parent"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["level", "display_order", "name"]
    list_per_page = 100
 
    fieldsets = (
        ("Identité", {
            "fields": ("name", "slug", "parent", "level"),
        }),
        ("Présentation", {
            "fields": ("icon_name", "description", "display_order"),
        }),
        ("État", {
            "fields": ("is_active", "is_deprecated", "requires_admin_approval"),
        }),
    )
    readonly_fields = ("level",)
 
    actions = [
        "mark_deprecated",
        "unmark_deprecated",
        "enable_admin_approval",
        "disable_admin_approval",
        "activate",
        "deactivate",
    ]
 
    # ─── Colonnes personnalisées ───────────────────────────────────────
 
    def indented_name(self, obj):
        """Affiche le nom avec une indentation proportionnelle au level."""
        indent = "&nbsp;" * (obj.level * 4)
        marker = "└─ " if obj.level > 0 else ""
        return format_html("{}{}<strong>{}</strong>", indent, marker, obj.name)
    indented_name.short_description = "Nom (arborescence)"
    indented_name.admin_order_field = "level"
 
    def level_badge(self, obj):
        colors = {
            0: "#111827",   # racine — noir
            1: "#F47920",   # niveau 1 — orange BelivaY
            2: "#059669",   # niveau 2 — vert
            3: "#0891B2",   # niveau 3 — cyan
        }
        color = colors.get(obj.level, "#6B7280")
        return format_html(
            '<span style="background:{}; color:#fff; padding:2px 8px; '
            'border-radius:10px; font-size:11px;">N{}</span>',
            color, obj.level,
        )
    level_badge.short_description = "Niveau"
 
    def flags(self, obj):
        parts = []
        if obj.is_deprecated:
            parts.append(
                '<span style="background:#EF4444; color:#fff; padding:2px 6px; '
                'border-radius:4px; font-size:10px; margin-right:4px;">'
                'DEPRECATED</span>'
            )
        if obj.requires_admin_approval:
            parts.append(
                '<span style="background:#F59E0B; color:#fff; padding:2px 6px; '
                'border-radius:4px; font-size:10px; margin-right:4px;">'
                'MOD-RENFORCÉE</span>'
            )
        if not obj.is_active:
            parts.append(
                '<span style="background:#6B7280; color:#fff; padding:2px 6px; '
                'border-radius:4px; font-size:10px; margin-right:4px;">'
                'INACTIVE</span>'
            )
        return format_html("".join(parts)) if parts else "—"
    flags.short_description = "Flags"
 
    def children_count(self, obj):
        return obj.children.filter(deleted_at__isnull=True).count()
    children_count.short_description = "Enfants"
 
    def products_count_display(self, obj):
        """Nombre de MasterProduct rattachés (lien cliquable si > 0)."""
        try:
            count = obj.master_products.count()
        except Exception:
            return "—"
        if count == 0:
            return "0"
        # Lien vers la liste filtrée dans l'admin
        try:
            url = reverse("admin:catalog_masterproduct_changelist")
            return format_html(
                '<a href="{}?category__id__exact={}">{} fiche(s)</a>',
                url, obj.id, count,
            )
        except Exception:
            return str(count)
    products_count_display.short_description = "Fiches maîtres"
 
    # ─── Actions bulk ──────────────────────────────────────────────────
 
    @admin.action(description="⚠️ Marquer comme DEPRECATED")
    def mark_deprecated(self, request, queryset):
        n = queryset.update(is_deprecated=True)
        self.message_user(
            request,
            f"{n} catégorie(s) marquée(s) deprecated. "
            "Elles ne seront plus proposées dans les nouveaux formulaires vendeur.",
            level=messages.WARNING,
        )
 
    @admin.action(description="✅ Retirer le flag DEPRECATED")
    def unmark_deprecated(self, request, queryset):
        n = queryset.update(is_deprecated=False)
        self.message_user(request, f"{n} catégorie(s) réactivée(s).", level=messages.SUCCESS)
 
    @admin.action(description="⚠️ Activer la MODÉRATION RENFORCÉE")
    def enable_admin_approval(self, request, queryset):
        n = queryset.update(requires_admin_approval=True)
        self.message_user(
            request,
            f"{n} catégorie(s) passée(s) en modération renforcée. "
            "Toute nouvelle fiche/offre nécessitera validation admin.",
            level=messages.WARNING,
        )
 
    @admin.action(description="✅ Désactiver la modération renforcée")
    def disable_admin_approval(self, request, queryset):
        n = queryset.update(requires_admin_approval=False)
        self.message_user(request, f"{n} catégorie(s) mise(s) en modération standard.", level=messages.SUCCESS)
 
    @admin.action(description="Activer")
    def activate(self, request, queryset):
        n = queryset.update(is_active=True)
        self.message_user(request, f"{n} catégorie(s) activée(s).", level=messages.SUCCESS)
 
    @admin.action(description="Désactiver")
    def deactivate(self, request, queryset):
        n = queryset.update(is_active=False)
        self.message_user(request, f"{n} catégorie(s) désactivée(s).", level=messages.WARNING)


# ─── ATTRIBUTS DE CATÉGORIE ───────────────────────────────────────────────────

@admin.register(ProductAttribute)
class ProductAttributeAdmin(admin.ModelAdmin):
    """
    L'admin crée ici les attributs disponibles par catégorie.
    Le vendeur choisit ensuite parmi ces attributs dans son formulaire produit.
    """
    list_display  = ('name', 'category', 'attribute_type', 'is_required', 'display_order')
    list_filter   = ('attribute_type', 'is_required', 'category')
    search_fields = ('name', 'category__name')
    ordering      = ('category', 'display_order', 'name')

    fieldsets = (
        ('Attribut', {
            'fields': ('category', 'name', 'attribute_type'),
        }),
        ('Configuration', {
            'fields': ('values', 'is_required', 'display_order'),
            'description': 'values : liste JSON. Ex: ["XS", "S", "M", "L", "XL"]',
        }),
    )


# ─── INLINES PRODUIT ──────────────────────────────────────────────────────────

class ProductImageInline(admin.TabularInline):
    model           = ProductImage
    extra           = 1
    fields          = ('image', 'is_primary', 'order')
    readonly_fields = ('created_at',)


class ProductMediaInline(admin.TabularInline):
    model  = ProductMedia
    extra  = 1
    fields = ('url', 'media_type', 'sort_order')


class InventoryInline(admin.StackedInline):
    model   = Inventory
    extra   = 0
    max_num = 1
    fields  = ('quantity',)


class ProductAttributeValueInline(admin.TabularInline):
    """Valeurs d'attributs choisies par le vendeur pour ce produit."""
    model  = ProductAttributeValue
    extra  = 0
    fields = ('attribute', 'selected_values')


@admin.register(PromotionCampaign)
class PromotionCampaignAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'campaign_type', 'title', 'product', 'status',
        'discount_percent', 'starts_at', 'ends_at', 'remaining_stock',
    )
    list_filter = ('campaign_type', 'status', 'starts_at', 'ends_at')
    search_fields = ('title', 'product__title', 'requested_by__username')
    readonly_fields = (
        'discount_percent', 'remaining_stock', 'stock_claimed',
        'created_at', 'updated_at',
    )
    autocomplete_fields = ('product', 'requested_by', 'approved_by')

    fieldsets = (
        ('Campagne', {
            'fields': ('campaign_type', 'status', 'title', 'product'),
        }),
        ('Prix & stock', {
            'fields': ('reference_price_xaf', 'promo_price_xaf', 'discount_percent', 'stock_reserved', 'stock_claimed', 'remaining_stock'),
        }),
        ('Calendrier', {
            'fields': ('starts_at', 'ends_at'),
        }),
        ('Validation', {
            'fields': ('requested_by', 'approved_by', 'rejection_reason', 'admin_note'),
        }),
        ('Monétisation Flash Deal', {
            'fields': ('placement_fee_xaf', 'commission_uplift_points'),
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


# ─── PRODUITS ─────────────────────────────────────────────────────────────────

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display        = ('id', 'title', 'vendor_name', 'category', 'price_xaf_fmt', 'stock', 'is_active', 'created_at')
    list_filter         = ('is_active', 'category')
    search_fields       = ('title', 'slug', 'sku', 'vendor__username')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields     = ('sku', 'discount_percent', 'created_at', 'updated_at')
    ordering            = ('-created_at',)
    inlines             = [InventoryInline, ProductImageInline, ProductMediaInline, ProductAttributeValueInline]

    fieldsets = (
        ('Identité', {
            'fields': ('title', 'slug', 'sku', 'vendor', 'category'),
        }),
        ('Description', {
            'fields': ('description', 'short_description'),
        }),
        ('Prix & Visibilité', {
            'fields': ('price_xaf', 'compare_at_price', 'promo_end_date', 'discount', 'discount_percent', 'is_active'),
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def vendor_name(self, obj):
        return obj.vendor.username if obj.vendor else '—'
    vendor_name.short_description = 'Vendeur'

    def price_xaf_fmt(self, obj):
        return f"{obj.price_xaf:,} FCFA".replace(',', ' ')
    price_xaf_fmt.short_description = 'Prix'

    def stock(self, obj):
        inv = getattr(obj, 'inventory', None)
        qty = inv.quantity if inv else 0
        color = 'green' if qty > 5 else ('orange' if qty > 0 else 'red')
        return format_html('<span style="color:{}; font-weight:bold;">{}</span>', color, qty)
    stock.short_description = 'Stock'

    actions = ['activate_products', 'deactivate_products']

    def activate_products(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f"{count} produit(s) activé(s).")
    activate_products.short_description = "Activer les produits sélectionnés"

    def deactivate_products(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} produit(s) désactivé(s).")
    deactivate_products.short_description = "Désactiver les produits sélectionnés"


# ─── IMAGES PRODUIT ───────────────────────────────────────────────────────────

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display  = ('id', 'product', 'is_primary', 'order', 'created_at')
    list_filter   = ('is_primary',)
    search_fields = ('product__title',)
    readonly_fields = ('created_at',)


# ─── MÉDIAS PRODUIT ───────────────────────────────────────────────────────────

@admin.register(ProductMedia)
class ProductMediaAdmin(admin.ModelAdmin):
    list_display  = ('id', 'product', 'media_type', 'sort_order', 'url')
    list_filter   = ('media_type',)
    search_fields = ('product__title', 'url')


# ─── INVENTAIRE ───────────────────────────────────────────────────────────────

@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display  = ('product', 'quantity', 'updated_at')
    search_fields = ('product__title',)
    readonly_fields = ('updated_at',)


# ─── AVIS PRODUIT ─────────────────────────────────────────────────────────────

@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display  = ('product', 'user', 'rating_stars', 'is_approved', 'is_verified_purchase', 'created_at')
    list_filter   = ('is_approved', 'is_verified_purchase', 'rating')
    search_fields = ('product__title', 'user__username', 'comment')
    readonly_fields = ('created_at', 'updated_at')
    ordering      = ('-created_at',)

    actions = ['approve_reviews', 'reject_reviews']

    def rating_stars(self, obj):
        stars = '★' * obj.rating + '☆' * (5 - obj.rating)
        color = 'green' if obj.rating >= 4 else ('orange' if obj.rating == 3 else 'red')
        return format_html('<span style="color:{};">{}</span>', color, stars)
    rating_stars.short_description = 'Note'

    def approve_reviews(self, request, queryset):
        count = queryset.update(is_approved=True)
        self.message_user(request, f"{count} avis approuvé(s).")
    approve_reviews.short_description = "Approuver les avis sélectionnés"

    def reject_reviews(self, request, queryset):
        count = queryset.update(is_approved=False)
        self.message_user(request, f"{count} avis rejeté(s).")
    reject_reviews.short_description = "Rejeter les avis sélectionnés"


from django.contrib import admin, messages
from django.utils.html import format_html
from .models import ColorDictionary
 
 
@admin.register(ColorDictionary)
class ColorDictionaryAdmin(admin.ModelAdmin):
    """
    Admin pour le dictionnaire couleurs/finitions.
 
    Fonctionnalités clés :
      - Pastille couleur visuelle dans la liste (aide énorme au débogage)
      - Filtres par famille, neutral, active
      - Actions bulk : activer/désactiver, marquer neutre
    """
 
    list_display = [
        "swatch",
        "name",
        "name_en",
        "family_badge",
        "hex_code",
        "is_neutral_display",
        "display_order",
        "is_active",
    ]
    list_filter = ["family", "is_neutral", "is_active"]
    search_fields = ["name", "name_en", "hex_code", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["family", "display_order", "name"]
    list_per_page = 100
 
    fieldsets = (
        ("Identité", {
            "fields": ("family", "name", "name_en", "slug"),
        }),
        ("Rendu visuel", {
            "fields": ("hex_code", "pattern_url"),
            "description": (
                "hex_code : format #RRGGBB pour rendre une pastille couleur. "
                "pattern_url : image optionnelle pour finitions à texture (Cuir, Bois...)."
            ),
        }),
        ("Classification", {
            "fields": ("is_neutral", "display_order", "is_active"),
        }),
    )
 
    actions = ["activate", "deactivate", "mark_neutral", "unmark_neutral"]
 
    # ─── Colonnes personnalisées ───────────────────────────────────────
 
    def swatch(self, obj):
        """Rend une pastille visuelle basée sur hex_code ou pattern_url."""
        if obj.hex_code:
            return format_html(
                '<div style="width:24px; height:24px; border-radius:50%; '
                'background:{}; border:1px solid #d1d5db; display:inline-block;" '
                'title="{}"></div>',
                obj.hex_code, obj.hex_code,
            )
        if obj.pattern_url:
            return format_html(
                '<img src="{}" style="width:24px; height:24px; border-radius:50%; '
                'border:1px solid #d1d5db; object-fit:cover;" />',
                obj.pattern_url,
            )
        return format_html(
            '<div style="width:24px; height:24px; border-radius:50%; '
            'background:repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 3px, '
            '#e5e7eb 3px, #e5e7eb 6px); border:1px solid #d1d5db; '
            'display:inline-block;" title="Sans rendu"></div>'
        )
    swatch.short_description = ""
 
    def family_badge(self, obj):
        colors = {"COLOR": "#0891B2", "FINISH": "#7C3AED"}
        labels = {"COLOR": "COULEUR", "FINISH": "FINITION"}
        return format_html(
            '<span style="background:{}; color:#fff; padding:2px 8px; '
            'border-radius:10px; font-size:10px;">{}</span>',
            colors.get(obj.family, "#6B7280"),
            labels.get(obj.family, obj.family),
        )
    family_badge.short_description = "Famille"
    family_badge.admin_order_field = "family"
 
    def is_neutral_display(self, obj):
        if obj.is_neutral:
            return format_html(
                '<span style="background:#6B7280; color:#fff; padding:2px 6px; '
                'border-radius:4px; font-size:10px;">NEUTRE</span>'
            )
        return "—"
    is_neutral_display.short_description = "Neutre"
    is_neutral_display.admin_order_field = "is_neutral"
 
    # ─── Actions bulk ──────────────────────────────────────────────────
 
    @admin.action(description="Activer")
    def activate(self, request, queryset):
        n = queryset.update(is_active=True)
        self.message_user(request, f"{n} entrée(s) activée(s).", level=messages.SUCCESS)
 
    @admin.action(description="Désactiver")
    def deactivate(self, request, queryset):
        n = queryset.update(is_active=False)
        self.message_user(request, f"{n} entrée(s) désactivée(s).", level=messages.WARNING)
 
    @admin.action(description="Marquer comme NEUTRE")
    def mark_neutral(self, request, queryset):
        n = queryset.update(is_neutral=True)
        self.message_user(request, f"{n} entrée(s) marquée(s) neutre(s).", level=messages.SUCCESS)
 
    @admin.action(description="Retirer le flag NEUTRE")
    def unmark_neutral(self, request, queryset):
        n = queryset.update(is_neutral=False)
        self.message_user(request, f"{n} entrée(s) démarquée(s).", level=messages.SUCCESS)