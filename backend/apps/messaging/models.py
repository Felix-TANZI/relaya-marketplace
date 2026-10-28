# backend/apps/messaging/models.py
# Messagerie, aide, questions fréquentes et rappel (CL-13 ; CMS-01 à CMS-12 ; DP-12).
#
#   Conversation  — un fil par client : « support » (un seul), « dossier » (un par litige, CL-11 : messages et photos
#                   versés au dossier), « vendeur » (un par produit : le vendeur ne voit ni le nom ni le numéro du
#                   client, CMS-04). Identifiant exposé au site : `cle` (« support », « LIT-12 », « q-345 »).
#   Message       — texte DÉJÀ nettoyé avant l'enregistrement (numéros, e-mails et liens remplacés par {{numero}},
#                   {{email}}, {{lien}} : apps.client_core.masquage.nettoyer_message) ; jamais le texte d'origine.
#   ThemeFaq, QuestionFaq — questions fréquentes éditables par l'équipe support (commande charger_faq) ; une question
#                   peut ne valoir que selon un interrupteur (module FF-…, DP-17, DP-50).
#   EtatService   — état des services affiché dans l'aide (paiement, relais, livraison), réglé dans l'admin.
#   DemandeRappel — rappel par le support sur un créneau (aujourd'hui ou demain), un seul en cours par client.
#
# Aucune ForeignKey vers les modèles de relaya : product_id, vendor_id restent des entiers (apps.client_core.pont).

from django.conf import settings
from django.db import models
from django.utils import timezone


class Conversation(models.Model):
    class Type(models.TextChoices):
        DOSSIER = "dossier", "Dossier (litige)"
        VENDEUR = "vendeur", "Question à un vendeur"
        SUPPORT = "support", "Support BelivaY"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversations_client")
    cle = models.CharField(max_length=40, help_text="identifiant exposé au site : support, LIT-12, q-345")
    type = models.CharField(max_length=10, choices=Type.choices)
    titre = models.CharField(max_length=200)
    entete = models.JSONField(default=dict, blank=True, help_text="{titre, sous, dessin?, bloque?, lien?}")
    resolue = models.BooleanField(default=False)
    placeholder = models.CharField(max_length=120, blank=True, default="")
    pied = models.CharField(max_length=200, blank=True, default="")
    product_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="catalog.Product (question au vendeur)")
    vendor_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="vendors.VendorProfile")
    litige_id = models.CharField(max_length=20, blank=True, default="", help_text="aftersales.Litige : LIT-12")
    lu_le = models.DateTimeField(null=True, blank=True, help_text="dernière lecture par le client")
    maj_le = models.DateTimeField(default=timezone.now, help_text="dernier échange : tri de la messagerie")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["client", "cle"], name="messaging_conversation_unique")]
        indexes = [models.Index(fields=["client", "-maj_le"])]
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"

    def __str__(self):
        return f"{self.cle} · {self.titre}"


class Message(models.Model):
    class De(models.TextChoices):
        MOI = "moi", "Le client"
        EUX = "eux", "Le support ou le vendeur"
        SYSTEME = "systeme", "Ligne système"
        PHOTO = "photo", "Photo du client"

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    de = models.CharField(max_length=8, choices=De.choices)
    qui = models.CharField(max_length=80, blank=True, default="", help_text="« Support BelivaY », « Le vendeur »")
    texte = models.TextField(blank=True, default="", help_text="déjà masqué : {{numero}}, {{email}}, {{lien}}")
    photo = models.FileField(upload_to="messagerie/%Y/%m/", blank=True, default="")
    systeme = models.CharField(max_length=200, blank=True, default="", help_text="ligne système jointe à une photo")
    masques = models.JSONField(default=list, blank=True)
    cree_le = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["cree_le", "pk"]
        verbose_name = "Message"
        verbose_name_plural = "Messages"

    def __str__(self):
        return f"{self.conversation.cle} · {self.de} · {self.texte[:40]}"


class ThemeFaq(models.Model):
    cle = models.SlugField(max_length=40)
    langue = models.CharField(max_length=5, default="fr")
    titre = models.CharField(max_length=120)
    icone = models.CharField(max_length=40, blank=True, default="")
    ordre = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["langue", "ordre", "pk"]
        constraints = [models.UniqueConstraint(fields=["cle", "langue"], name="messaging_theme_faq_unique")]
        verbose_name = "Thème des questions fréquentes"
        verbose_name_plural = "Thèmes des questions fréquentes"

    def __str__(self):
        return f"{self.titre} ({self.langue})"


class QuestionFaq(models.Model):
    theme = models.ForeignKey(ThemeFaq, on_delete=models.CASCADE, related_name="questions")
    ordre = models.PositiveSmallIntegerField(default=0)
    question = models.CharField(max_length=255)
    reponse = models.TextField()
    lien_texte = models.CharField(max_length=120, blank=True, default="")
    lien_vers = models.CharField(max_length=255, blank=True, default="")
    module_ff = models.CharField(max_length=40, blank=True, default="", help_text="interrupteur FF-… (vide : toujours)")
    module_ouvert = models.BooleanField(null=True, blank=True, help_text="la question vaut quand l'interrupteur est dans cet état")

    class Meta:
        ordering = ["theme", "ordre", "pk"]
        verbose_name = "Question fréquente"
        verbose_name_plural = "Questions fréquentes"

    def __str__(self):
        return self.question


class EtatService(models.Model):
    nom = models.CharField(max_length=60)
    ok = models.BooleanField(default=True)
    detail = models.CharField(max_length=160, blank=True, default="")
    ordre = models.PositiveSmallIntegerField(default=0)
    actif = models.BooleanField(default=True, help_text="affiché dans l'aide")

    class Meta:
        ordering = ["ordre", "pk"]
        verbose_name = "État d'un service"
        verbose_name_plural = "États des services"

    def __str__(self):
        return f"{self.nom} · {'ok' if self.ok else 'perturbé'}"


class DemandeRappel(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="rappels_support")
    sujet = models.CharField(max_length=120)
    commande = models.CharField(max_length=20, blank=True, default="", help_text="BLV-52018")
    creneau = models.CharField(max_length=40)
    precision = models.CharField(max_length=200, blank=True, default="")
    date_appel = models.DateField(help_text="jour de l'appel, heure de Yaoundé (« aujourdhui » ou « demain » à la lecture)")
    annule_le = models.DateTimeField(null=True, blank=True)
    appele_le = models.DateTimeField(null=True, blank=True, help_text="rempli par le support après l'appel")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cree_le"]
        verbose_name = "Demande de rappel"
        verbose_name_plural = "Demandes de rappel"

    def __str__(self):
        return f"{self.client_id} · {self.creneau} · {self.date_appel}"
