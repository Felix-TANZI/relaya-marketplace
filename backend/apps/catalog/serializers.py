from rest_framework import serializers
from .models import Category, Product, ProductMedia, Inventory


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "is_active", "parent"]


class ProductMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMedia
        fields = ["id", "url", "media_type", "sort_order"]


class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventory
        fields = ["quantity"]


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer()
    media = ProductMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ["id", "title", "slug", "price_xaf", "is_active", "category", "media", "created_at"]


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer()
    media = ProductMediaSerializer(many=True, read_only=True)
    inventory = InventorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = ["id", "title", "slug", "description", "price_xaf", "is_active", "category", "media", "inventory", "created_at"]
