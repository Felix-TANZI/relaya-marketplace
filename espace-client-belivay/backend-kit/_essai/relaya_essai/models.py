# Serveur d'essai du kit (PAS pour la production, PAS à copier chez relaya) : les modèles de relaya-marketplace que
# le site lit par les routes existantes de relaya (notifications, sessions, avis, images, messages de contact) et
# qui ne sont pas dans les bouchons (stubs/apps). Mêmes noms de champs que chez relaya (commit 9546ffe).
from django.conf import settings
from django.db import models


class UserNotification(models.Model):
    """accounts.UserNotification de relaya : le centre de notifications (le kit y écrit par notifier())."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications_essai")
    title = models.CharField(max_length=160)
    message = models.TextField(blank=True, default="")
    notification_type = models.CharField(max_length=20, default="SYSTEM")
    action_url = models.CharField(max_length=255, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class UserSession(models.Model):
    """accounts.UserSession de relaya : une ligne par appareil connecté (jti du jeton de rafraîchissement)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sessions_essai")
    jti = models.CharField(max_length=64, unique=True)
    device_name = models.CharField(max_length=120, blank=True, default="")
    browser = models.CharField(max_length=60, blank=True, default="")
    os_name = models.CharField(max_length=60, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)


class FicheProduit(models.Model):
    """Ce que ProductSerializer de relaya sert en plus des champs du bouchon catalog.Product."""

    product = models.OneToOneField("catalog.Product", on_delete=models.CASCADE, related_name="fiche_essai")
    description = models.TextField(blank=True, default="")
    compare_at_price = models.PositiveIntegerField(null=True, blank=True)
    category_slug = models.CharField(max_length=40, blank=True, default="")
    category_name = models.CharField(max_length=80, blank=True, default="")
    rating_average = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    reviews_count = models.PositiveIntegerField(default=0)


class ProductImage(models.Model):
    """catalog.ProductImage de relaya (lu aussi par client_core.pont.image : related_name « images », champ image)."""

    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="produits/")
    alt_text = models.CharField(max_length=200, blank=True, default="")
    is_primary = models.BooleanField(default=False)


class ProductReview(models.Model):
    """catalog.ProductReview de relaya (avis publiés sur une fiche)."""

    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="avis_essai")
    rating = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=120, blank=True, default="")
    comment = models.TextField(blank=True, default="")
    is_verified_purchase = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class ContactMessage(models.Model):
    """contact.ContactMessage de relaya (POST /api/contact/)."""

    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True, default="")
    subject = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
