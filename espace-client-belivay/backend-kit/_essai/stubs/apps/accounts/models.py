# Bouchon de relaya-marketplace (apps/accounts/models.py, commit 9546ffe) : champs lus par le kit seulement.
from django.contrib.auth.models import User
from django.db import models


class RelayPointProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="relay_point_profile")
    name = models.CharField(max_length=160)
    manager_name = models.CharField(max_length=120, blank=True, default="")
    phone = models.CharField(max_length=20, default="")
    city = models.CharField(max_length=80, blank=True, default="")
    zones = models.JSONField(default=list, blank=True)
    address = models.CharField(max_length=255, blank=True, default="")
    opening_hours = models.CharField(max_length=160, blank=True, default="")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    storage_capacity = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, default="APPROVED")
    is_active = models.BooleanField(default=True)


class UserFavorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["user", "product"]]
