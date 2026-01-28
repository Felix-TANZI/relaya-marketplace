from django.contrib import admin
from .models import Category, Product, ProductMedia, Inventory


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "is_active", "parent", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


class ProductMediaInline(admin.TabularInline):
    model = ProductMedia
    extra = 1


class InventoryInline(admin.StackedInline):
    model = Inventory
    extra = 0
    max_num = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "slug", "price_xaf", "is_active", "category", "created_at")
    list_filter = ("is_active", "category")
    search_fields = ("title", "slug")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [InventoryInline, ProductMediaInline]


@admin.register(ProductMedia)
class ProductMediaAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "media_type", "sort_order", "url")
    list_filter = ("media_type",)
    search_fields = ("product__title", "url")


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "quantity", "updated_at")
    search_fields = ("product__title",)
