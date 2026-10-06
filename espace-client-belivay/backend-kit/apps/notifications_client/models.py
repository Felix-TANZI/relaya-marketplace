# backend/apps/notifications_client/models.py
# Réglages et envoi des notifications du client (CL-10 ; CAP-17, CAP-19, DP-54).
#
#   ReglagesNotifications — choix du compte : Commande, Retrait, Incident et Paiement ne se désactivent pas
#                           (422 category_locked) ; messages, suivi, promotions et alerte flash au choix ; canal de
#                           repli SMS ou WhatsApp (FF-WHATSAPP-CANAL + consentement) ; heures calmes (sans son, sauf
#                           alerte critique).
#   ConsentementCanal     — accord horodaté du client pour un canal (WhatsApp : obligatoire avant de l'activer).
#   Appareil              — abonnement push d'un appareil (Web Push ou FCM) ; révoqué à la déconnexion (CAP-17).
#   JournalNotification   — trace de chaque envoi (centre, push, SMS) : limite PUSH-PROMO, preuve en cas de litige.
#
# Le centre de notifications reste celui de relaya (accounts.UserNotification) ; ce module y écrit par le pont.

from django.conf import settings
from django.db import models


class ReglagesNotifications(models.Model):
    class Canal(models.TextChoices):
        SMS = "sms", "SMS"
        WHATSAPP = "whatsapp", "WhatsApp"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reglages_notifications")
    messages = models.BooleanField(default=True)
    suivi = models.BooleanField(default=True)
    promotions = models.BooleanField(default=True)
    flash = models.BooleanField(default=False, help_text="alerte des ventes flash (FF-FLASH)")
    canal = models.CharField(max_length=10, choices=Canal.choices, default=Canal.SMS)
    calme_actif = models.BooleanField(default=False)
    calme_debut = models.PositiveSmallIntegerField(default=22, help_text="heure de début (0 à 23, heure de Yaoundé)")
    calme_fin = models.PositiveSmallIntegerField(default=7, help_text="heure de fin (0 à 23, heure de Yaoundé)")
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Réglages des notifications"
        verbose_name_plural = "Réglages des notifications"

    def __str__(self):
        return f"Notifications de {self.user}"


class ConsentementCanal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="consentements_canal")
    canal = models.CharField(max_length=10, choices=ReglagesNotifications.Canal.choices)
    le = models.DateTimeField(auto_now_add=True)
    retire_le = models.DateTimeField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    appareil = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        ordering = ["-le", "-id"]
        verbose_name = "Consentement à un canal"
        verbose_name_plural = "Consentements aux canaux"


class Appareil(models.Model):
    class Type(models.TextChoices):
        WEBPUSH = "webpush", "Web Push"
        FCM = "fcm", "Firebase (application)"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="appareils_push")
    type = models.CharField(max_length=10, choices=Type.choices)
    endpoint = models.TextField(help_text="adresse Web Push, ou jeton FCM")
    endpoint_empreinte = models.CharField(max_length=64, db_index=True, help_text="sha256 de l'adresse : identifiant stable")
    cles = models.JSONField(default=dict, blank=True, help_text="p256dh et auth (Web Push)")
    expire_le = models.DateTimeField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    revoque_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-cree_le"]
        verbose_name = "Appareil (push)"
        verbose_name_plural = "Appareils (push)"

    def __str__(self):
        return f"{self.get_type_display()} · {self.user}"


class JournalNotification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="journal_notifications")
    type = models.CharField(max_length=20)
    titre = models.CharField(max_length=160)
    critique = models.BooleanField(default=False)
    centre = models.BooleanField(default=False, help_text="écrite dans le centre de notifications")
    pousses = models.PositiveSmallIntegerField(default=0, help_text="appareils atteints par push")
    sms = models.CharField(max_length=10, blank=True, default="", help_text="canal de repli utilisé")
    raison = models.CharField(max_length=60, blank=True, default="", help_text="pourquoi pas de push (choix, calme, limite)")
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-le", "-id"]
        indexes = [models.Index(fields=["user", "type", "le"])]
        verbose_name = "Notification envoyée"
        verbose_name_plural = "Notifications envoyées"
