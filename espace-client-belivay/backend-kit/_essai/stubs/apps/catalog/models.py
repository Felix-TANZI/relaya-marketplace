# Bouchon de relaya-marketplace (apps/catalog/models.py, commit 9546ffe) : champs lus par le kit seulement.
from django.contrib.auth.models import User
from django.db import models


class MasterProduct(models.Model):
    title = models.CharField(max_length=200)


class Product(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    price_xaf = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="products", null=True, blank=True)
    master = models.ForeignKey(MasterProduct, on_delete=models.SET_NULL, related_name="offers", null=True, blank=True)


class Inventory(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="inventory")
    quantity = models.IntegerField(default=0)
