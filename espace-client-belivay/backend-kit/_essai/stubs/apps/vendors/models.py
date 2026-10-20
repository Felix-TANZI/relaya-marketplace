# Bouchon de relaya-marketplace (apps/vendors/models.py, commit 9546ffe) : champs lus par le kit seulement.
from django.contrib.auth.models import User
from django.db import models


class VendorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="vendor_profile")
    business_name = models.CharField(max_length=255)
    city = models.CharField(max_length=100, default="Yaoundé")
    zone = models.ForeignKey("shipping.Zone", on_delete=models.SET_NULL, null=True, blank=True)
    certification_tier = models.CharField(max_length=20, default="BRONZE")
    status = models.CharField(max_length=20, default="APPROVED")


class VendorLocation(models.Model):
    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name="locations")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_main = models.BooleanField(default=False)
