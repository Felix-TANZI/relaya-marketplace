# backend/apps/vendeur_session/models.py
# Session et ouverture de l'espace vendeur (VD-03 ; CNX-01 à 07, OUV-01 à 05, KYC-01 à 09, SAI-01 à 04 ; DP-57 S-1 à S-3).
#
#   AppareilVendeur     — appareil reconnu d'un compte (validé par un second facteur, ou première connexion du compte) :
#                         il n'a plus de second facteur (CNX-01, VD03-R02). Seule l'empreinte de son identifiant est gardée.
#   TentativesConnexion — mots de passe faux par compte (ou par identifiant inconnu) : 5 puis 15 minutes (MDP-ESSAIS).
#   DefiVendeur         — un envoi de code en cours (second facteur, connexion par numéro, mot de passe oublié, numéro
#                         de l'ouverture, numéro de versement) : gardé côté serveur, lié à l'appareil ou au compte. Le code
#                         lui-même est dans apps.otp (CodeOtp, empreinte seulement).
#   DossierOuverture    — l'ouverture en trois étapes (« VD-2026-0913 ») : boutique demandée, numéro vérifié, pièces
#                         (fichiers privés), numéro de versement, vérification, contrat signé.
#   PreferenceBiometrie — Face ID ou empreinte (proposée une fois, DP-57 S-1 : n'ouvre que l'application).
#   VisiteAgent, FicheAgent — saisie assistée par l'agent de zone (SAI-01 à 04, VD03-R15).
# ANONYMAT : rien ici ne parle d'un client ; les numéros sont ceux du vendeur, chiffrés au repos (CAP-21).
from django.conf import settings
from django.db import models

from .stockage import StockagePrive, chemin_piece


class AppareilVendeur(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="appareils_vendeur")
    empreinte = models.CharField(max_length=64, help_text="HMAC de l'identifiant de l'appareil")
    nom = models.CharField(max_length=80, blank=True, default="", help_text="« iPhone · Safari »")
    reconnu_le = models.DateTimeField()
    vu_le = models.DateTimeField(null=True, blank=True)
    oublie_le = models.DateTimeField(null=True, blank=True, help_text="« Ne plus reconnaître cet appareil » (VD-11)")

    class Meta:
        verbose_name = "Appareil reconnu (vendeur)"
        verbose_name_plural = "Appareils reconnus (vendeur)"
        constraints = [models.UniqueConstraint(fields=["user", "empreinte"], name="vendeur_session_un_appareil")]

    def __str__(self):
        return f"{self.user} · {self.nom or self.empreinte[:8]}"


class TentativesConnexion(models.Model):
    cle = models.CharField(max_length=80, unique=True, help_text="u:<id du compte> ou i:<empreinte de l'identifiant>")
    echecs = models.PositiveSmallIntegerField(default=0)
    bloque_jusqua = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Mots de passe faux (vendeur)"
        verbose_name_plural = "Mots de passe faux (vendeur)"


class DefiVendeur(models.Model):
    class Objet(models.TextChoices):
        DEUX_FACTEURS = "2fa", "Second facteur (appareil inconnu)"
        NUMERO = "numero", "Connexion par numéro"
        MOT_DE_PASSE = "mdp", "Mot de passe oublié"
        OUVERTURE = "ouverture", "Numéro de l'ouverture"
        VERSEMENT = "versement", "Numéro de versement de l'ouverture"

    public_id = models.CharField(max_length=24, unique=True, help_text="challenge_id rendu au site")
    objet = models.CharField(max_length=10, choices=Objet.choices)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="defis_vendeur")
    appareil = models.CharField(max_length=64, blank=True, default="", help_text="empreinte de l'appareil demandeur")
    appareil_nom = models.CharField(max_length=80, blank=True, default="")
    lieu = models.CharField(max_length=80, blank=True, default="")
    telephone_chiffre = models.BinaryField(help_text="numéro qui reçoit le code (chiffré)")
    canal = models.CharField(max_length=10, default="sms")
    se_souvenir = models.BooleanField(default=True)
    demande_a = models.DateTimeField()
    jeton = models.CharField(max_length=64, blank=True, default="", help_text="mot de passe oublié : empreinte du lien")
    dossier = models.ForeignKey("DossierOuverture", on_delete=models.CASCADE, null=True, blank=True, related_name="defis")
    termine_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-demande_a", "-id"]
        verbose_name = "Code envoyé (vendeur)"
        verbose_name_plural = "Codes envoyés (vendeur)"

    def __str__(self):
        return f"{self.objet} · {self.public_id}"


class DossierOuverture(models.Model):
    class Etape(models.TextChoices):
        OUVRIR = "ouvrir"
        PIECES = "pieces"
        ATTENTE = "attente"
        CONTRAT = "contrat"
        SIGNEE = "signee"
        REFUSEE = "refusee"

    ref = models.CharField(max_length=20, unique=True, help_text="« VD-2026-0913 »")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="dossiers_vendeur")
    appareil = models.CharField(max_length=64, blank=True, default="", help_text="appareil qui a commencé (avant le code)")
    depuis_client = models.BooleanField(default=False, help_text="« Devenir vendeur » depuis l'espace client")
    etape = models.CharField(max_length=8, choices=Etape.choices, default=Etape.OUVRIR)
    # Étape 1 : la boutique demandée.
    nom = models.CharField(max_length=60)
    categorie = models.CharField(max_length=80)
    statut = models.CharField(max_length=12, default="particulier")
    telephone_chiffre = models.BinaryField(null=True, blank=True)
    telephone_empreinte = models.CharField(max_length=64, blank=True, default="", db_index=True)
    zone_code = models.CharField(max_length=8, blank=True, default="")
    zone_quartiers = models.CharField(max_length=120, blank=True, default="")
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    precision = models.PositiveIntegerField(default=0, help_text="mètres (GPS) ; 0 : point posé à la main")
    numero_verifie_le = models.DateTimeField(null=True, blank=True)
    # Étape 2 : pièces (fichiers privés), numéro de versement. elements : {recto|verso|selfie|versement: {etat, a, motif}}.
    recto = models.FileField(upload_to=chemin_piece, storage=StockagePrive(), blank=True)
    verso = models.FileField(upload_to=chemin_piece, storage=StockagePrive(), blank=True)
    selfie = models.FileField(upload_to=chemin_piece, storage=StockagePrive(), blank=True)
    elements = models.JSONField(default=dict, blank=True)
    versement_chiffre = models.BinaryField(null=True, blank=True)
    versement_operateur = models.CharField(max_length=8, blank=True, default="")
    versement_attente_chiffre = models.BinaryField(null=True, blank=True, help_text="numéro en cours de vérification")
    envoye_a = models.DateTimeField(null=True, blank=True)
    reponse_avant = models.DateTimeField(null=True, blank=True)
    refus = models.PositiveSmallIntegerField(default=0)
    brouillons = models.PositiveIntegerField(default=0)
    en_ligne = models.PositiveIntegerField(default=0)
    # Étape 3 : contrat (version, horodatage, IP, appareil).
    immatricule = models.BooleanField(default=False)
    rccm = models.CharField(max_length=40, blank=True, default="")
    niu = models.CharField(max_length=40, blank=True, default="")
    signe_a = models.DateTimeField(null=True, blank=True)
    contrat_version = models.CharField(max_length=20, blank=True, default="")
    signature_ip = models.GenericIPAddressField(null=True, blank=True)
    signature_appareil = models.CharField(max_length=160, blank=True, default="")
    boutique = models.OneToOneField(
        "vendeur_core.Boutique", on_delete=models.SET_NULL, null=True, blank=True, related_name="dossier_ouverture"
    )
    cree_le = models.DateTimeField()

    class Meta:
        ordering = ["-cree_le", "-id"]
        verbose_name = "Dossier d'ouverture"
        verbose_name_plural = "Dossiers d'ouverture"

    def __str__(self):
        return f"{self.ref} · {self.nom} ({self.etape})"


class PreferenceBiometrie(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="biometrie_vendeur")
    proposee = models.BooleanField(default=False)
    active = models.BooleanField(default=False)
    modifiee_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Face ID ou empreinte (vendeur)"
        verbose_name_plural = "Face ID ou empreinte (vendeur)"


class VisiteAgent(models.Model):
    """Visite de l'agent de zone (SAI-01) : gratuite pour les premières boutiques de la zone (SAI-03)."""

    boutique = models.ForeignKey("vendeur_core.Boutique", on_delete=models.CASCADE, related_name="visites_agent")
    agent = models.CharField(max_length=60, help_text="« Aïssatou B. »")
    zone = models.CharField(max_length=8)
    le = models.DateField()
    gratuite = models.BooleanField(default=True)

    class Meta:
        ordering = ["-le", "-id"]
        verbose_name = "Visite de l'agent de zone"
        verbose_name_plural = "Visites de l'agent de zone"

    def __str__(self):
        return f"{self.agent} · {self.le}"


class FicheAgent(models.Model):
    """Fiche saisie par l'agent, à valider par le propriétaire ; validée, elle devient une vraie offre (en vérification)."""

    visite = models.ForeignKey(VisiteAgent, on_delete=models.CASCADE, related_name="fiches")
    titre = models.CharField(max_length=200)
    dessin = models.CharField(max_length=255, blank=True, default="", help_text="illustration ou photo prise par l'agent")
    categorie = models.CharField(max_length=80, help_text="famille du barème (« Électronique »)")
    rayon = models.CharField(max_length=120, blank=True, default="", help_text="rayon du catalogue (médiane du prix)")
    description = models.TextField(blank=True, default="")
    prix = models.PositiveIntegerField()
    stock = models.PositiveIntegerField(default=0)
    photos = models.PositiveSmallIntegerField(default=0)
    mediane_relevee = models.PositiveIntegerField(null=True, blank=True, help_text="prix habituel relevé par l'agent (repli)")
    fiche = models.ForeignKey("vendeur_core.FicheCatalogue", on_delete=models.SET_NULL, null=True, blank=True, related_name="fiches_agent")
    modifiee_a = models.DateTimeField(null=True, blank=True)
    validee_a = models.DateTimeField(null=True, blank=True)
    offre = models.OneToOneField("vendeur_core.Offre", on_delete=models.SET_NULL, null=True, blank=True, related_name="fiche_agent")

    class Meta:
        ordering = ["id"]
        verbose_name = "Fiche de l'agent"
        verbose_name_plural = "Fiches de l'agent"

    def __str__(self):
        return self.titre
