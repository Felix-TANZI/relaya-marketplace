# backend/apps/catalog/admin.py
# Enregistrement complet des modèles catalog dans Django Admin.
# Remplace le fichier existant (ajoute ProductAttribute, ProductAttributeValue, ProductReview).

from django.contrib import admin
from django.utils.html import format_html
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
)


# ─── CATÉGORIES ───────────────────────────────────────────────────────────────

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display        = ('id', 'name', 'slug', 'parent', 'is_active', 'created_at')
    list_filter         = ('is_active', 'parent')
    search_fields       = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    ordering            = ('name',)


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
