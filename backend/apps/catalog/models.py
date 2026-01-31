# backend/apps/catalog/models.py
# Models for product catalog, including products, categories, and inventory.

from django.db import models
from django.contrib.auth.models import User

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


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

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField(blank=True)
    price_xaf = models.PositiveIntegerField(help_text="Prix en FCFA (XAF)")
    is_active = models.BooleanField(default=True)

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )

    vendor = models.ForeignKey(
    User, 
    on_delete=models.CASCADE, 
    related_name='products',
    null=True,  # Temporaire pour la migration
    blank=True,
    verbose_name="Vendeur"
   )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ProductMedia(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media")
    url = models.URLField(max_length=500)
    media_type = models.CharField(
        max_length=20,
        choices=[("image", "image"), ("video", "video")],
        default="image",
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.product.title} - {self.media_type}"


class Inventory(TimeStampedModel):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="inventory")
    quantity = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.product.title} - stock={self.quantity}"

