# backend/apps/otp/models.py
# Codes à usage unique (CIN-31 à CIN-43, CAP-14 à CAP-16, DP-52, DP-53) : 6 chiffres, valables OTP-DUREE,
# OTP-ESSAIS essais puis attente, OTP-RENVOI entre deux envois. Le code n'est jamais gardé en clair (empreinte
# HMAC) ; la destination non plus (empreinte + forme masquée, CAP-21).
#
# Feuille de route D6 : c'est le seul système de codes (l'ancien accounts.OTPCode et les codes propres au vendeur ont
# été retirés).

from django.conf import settings
from django.db import models


class CodeOtp(models.Model):
    class Objet(models.TextChoices):
        # Premier numéro (CIN-31) et changement de numéro (CIN-39 à CIN-43)
        VERIFY = "verify", "Premier numéro"
        NUMERO_ANCIEN = "numero-ancien", "Changement de numéro : ancien"
        NUMERO_NOUVEAU = "numero-nouveau", "Changement de numéro : nouveau"
        # D7 : « Ce n'est plus mon numéro » — l'ancien numéro ne reçoit plus rien, le code part à l'e-mail du compte
        NUMERO_PERDU = "numero-perdu", "Changement de numéro : ancien numéro perdu"
        # Profil et e-mail (DP-52)
        PROFIL = "profil", "Profil"
        EMAIL_SMS = "email-sms", "Changement d'e-mail : code par SMS"
        EMAIL_ADRESSE = "email-adresse", "Changement d'e-mail : code à la nouvelle adresse"
        # Argent et compte
        MOYEN = "moyen", "Nouveau numéro Mobile Money"
        SUPPRESSION = "suppression", "Suppression du compte"
        # Sans compte encore
        DIASPORA = "diaspora", "Inscription diaspora"
        CADEAU = "cadeau", "Cadeau payé par carte (vérification renforcée)"
        DIASPORA_RENFORCE = "diaspora-renforce", "Commande diaspora (vérification renforcée)"
        # Feuille de route D6 : un seul système de codes pour tout le projet
        DEUX_FA_CONNEXION = "2fa-connexion", "Double authentification : connexion"
        DEUX_FA_ACTIVATION = "2fa-activation", "Double authentification : activation"
        DEUX_FA_DESACTIVATION = "2fa-desactivation", "Double authentification : désactivation"
        RELAIS_PIN = "relais-pin", "PIN du point relais"
        VENDEUR_CONNEXION = "vendeur-connexion", "Vendeur : connexion par numéro"
        VENDEUR_OUVERTURE = "vendeur-ouverture", "Vendeur : numéro à l'ouverture"
        VENDEUR_SECURITE = "vendeur-securite", "Vendeur : geste sensible du propriétaire"

    class Canal(models.TextChoices):
        SMS = "sms", "SMS"
        WHATSAPP = "whatsapp", "WhatsApp"
        EMAIL = "email", "E-mail"

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="codes_otp_client"
    )
    objet = models.CharField(max_length=20, choices=Objet.choices)
    canal = models.CharField(max_length=10, choices=Canal.choices, default=Canal.SMS)
    destination_empreinte = models.CharField(max_length=64, db_index=True)
    destination_masquee = models.CharField(max_length=120)
    code_empreinte = models.CharField(max_length=64)
    essais = models.PositiveSmallIntegerField(default=0)
    bloque_jusqua = models.DateTimeField(null=True, blank=True)
    expire_le = models.DateTimeField()
    utilise_le = models.DateTimeField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["objet", "destination_empreinte", "cree_le"])]
        verbose_name = "Code à usage unique"
        verbose_name_plural = "Codes à usage unique"

    def __str__(self):
        return f"{self.objet} → {self.destination_masquee}"


class JetonMdp(models.Model):
    """Lien « mot de passe oublié » (CAP-16, MDP-LIEN) : usage unique, valable MDP-LIEN minutes. Seule l'empreinte
    du jeton est gardée ; le jeton en clair ne part que dans l'e-mail."""

    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="jetons_mdp_client")
    jeton_empreinte = models.CharField(max_length=64, unique=True)
    expire_le = models.DateTimeField()
    utilise_le = models.DateTimeField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["utilisateur", "cree_le"])]
        verbose_name = "Lien de nouveau mot de passe"
        verbose_name_plural = "Liens de nouveau mot de passe"

    def __str__(self):
        return f"{self.utilisateur} · {'utilisé' if self.utilise_le else 'valable'} jusqu'au {self.expire_le:%d/%m %H:%M}"
