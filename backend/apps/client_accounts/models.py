# backend/apps/client_accounts/models.py
# Le compte client (CL-03, CL-13 ; CIN-31 à CIN-46, CCO-01 à CCO-15, DP-52 à DP-54).
#
#   ProfilClient       — un par utilisateur (OneToOne) : numéro vérifié (CIN-31, un numéro vérifié = un seul compte,
#                        CIN-35), relais habituel, type de compte (standard | diaspora, DP-54), devise, langue,
#                        confidentialité, intérêts, version des conditions acceptée. Le numéro est chiffré au repos
#                        (CAP-21) : BinaryField + empreinte (recherche d'égalité) + forme masquée.
#   ChangementNumero   — dernier(s) changement(s) de numéro (CIN-39 à CIN-43) : ce que l'écran final nomme.
#   Adresse            — carnet d'adresses de livraison à domicile (CCO-10, CCO-11, CPR-23, DP-09) ; repères,
#                        instructions, destinataire et position GPS chiffrés au repos (CAP-21).
#   Recherche, ProduitVu — historique effaçable (DP-54, RECH-HIST).
#   VersionLegale      — textes légaux versionnés (CL-13) ; ConsentementLegal — acceptation horodatée (CAP-23).
#   IdentiteLiee       — comptes Google / Apple liés au compte (CIN-46).
#   BoutiqueClient     — boutique ouverte depuis le compte (CL-13, 9.6) ; DemandeBusiness — pièce du compte Business.
#   AlerteFavori       — alertes prix / retour en stock sur un favori de relaya (accounts.UserFavorite).
#
# Aucune ForeignKey vers les modèles de relaya : relais, favoris et boutiques sont gardés en identifiants entiers
# (apps.client_core.pont).

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.client_core.chiffrement import dechiffrer


class ProfilClient(models.Model):
    class TypeCompte(models.TextChoices):
        STANDARD = "standard", "Standard"
        DIASPORA = "diaspora", "Diaspora"

    class Devise(models.TextChoices):
        XAF = "XAF", "Franc CFA"
        EUR = "EUR", "Euro"
        USD = "USD", "Dollar"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profil_client")
    # Numéro du compte (CIN-31) : chiffré, empreinte HMAC pour l'unicité, forme masquée « 6 77 ·· ·· 41 ».
    numero_chiffre = models.BinaryField(null=True, blank=True)
    numero_empreinte = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    numero_masque = models.CharField(max_length=40, blank=True, default="")
    operateur = models.CharField(max_length=20, blank=True, default="")
    numero_verifie_le = models.DateTimeField(null=True, blank=True)
    relais_habituel_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="accounts.RelayPointProfile")
    type_compte = models.CharField(max_length=10, choices=TypeCompte.choices, default=TypeCompte.STANDARD)
    devise = models.CharField(max_length=3, choices=Devise.choices, default=Devise.XAF)
    langue = models.CharField(max_length=5, default="fr")
    alerte_connexion = models.BooleanField(default=True, help_text="message au numéro vérifié à chaque nouvel appareil")
    personnalisation = models.BooleanField(default=True, help_text="suggestions selon ce que le client regarde et achète")
    nom_retrait = models.CharField(max_length=60, null=True, blank=True, help_text="nom donné au comptoir à la place du nom complet")
    photo = models.TextField(null=True, blank=True, help_text="photo de profil choisie (DP-52) : adresse ou data URL rognée")
    interets = models.JSONField(default=list, blank=True, help_text="univers choisis à l'arrivée")
    cgu_version = models.CharField(max_length=20, blank=True, default="")
    cgu_acceptee_le = models.DateTimeField(null=True, blank=True)
    email_modifie_le = models.DateTimeField(null=True, blank=True)
    supprime_le = models.DateTimeField(null=True, blank=True, help_text="compte supprimé et pseudonymisé")
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # CIN-35 : un numéro vérifié va avec un seul compte (index partiel : PostgreSQL et SQLite).
            models.UniqueConstraint(
                fields=["numero_empreinte"],
                condition=Q(numero_verifie_le__isnull=False),
                name="client_accounts_numero_verifie_unique",
            )
        ]
        verbose_name = "Profil client"
        verbose_name_plural = "Profils clients"

    def __str__(self):
        return f"{self.user} · {self.numero_masque or 'sans numéro'}"

    @property
    def numero(self) -> str:
        """Le numéro en clair (9 chiffres) ; « » sans numéro."""
        return dechiffrer(self.numero_chiffre)

    @property
    def numero_verifie(self) -> bool:
        return self.numero_verifie_le is not None and bool(self.numero_empreinte)


class ChangementNumero(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="changements_numero")
    ancien_masque = models.CharField(max_length=40)
    ancien_operateur = models.CharField(max_length=20, blank=True, default="")
    nouveau_masque = models.CharField(max_length=40)
    nouveau_operateur = models.CharField(max_length=20, blank=True, default="")
    renouvelees = models.JSONField(default=list, blank=True, help_text="commandes dont le code de retrait est renouvelé (CIN-40)")
    relay_id = models.PositiveBigIntegerField(null=True, blank=True)
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-le"]
        verbose_name = "Changement de numéro"
        verbose_name_plural = "Changements de numéro"


class Adresse(models.Model):
    class Creneau(models.TextChoices):
        MATIN = "matin", "Matin"
        APRES_MIDI = "apres-midi", "Après-midi"
        SOIR = "soir", "Soir"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="adresses_client")
    nom = models.CharField(max_length=60, help_text="« Maison », « Bureau »")
    quartier = models.CharField(max_length=80, help_text="nom d'une zone exploitée (ZONES-EXPLOITEES)")
    reperes_chiffre = models.BinaryField(help_text="repères écrits comme dans la rue, chiffrés (CAP-21)")
    instructions_chiffre = models.BinaryField(null=True, blank=True)
    destinataire_chiffre = models.BinaryField(null=True, blank=True)
    coords_chiffre = models.BinaryField(null=True, blank=True, help_text="« lat;lon;précision » chiffré")
    position = models.BooleanField(default=False, help_text="position donnée par le téléphone")
    creneau = models.CharField(max_length=12, choices=Creneau.choices, null=True, blank=True)
    photo = models.TextField(null=True, blank=True, help_text="photo de l'entrée (adresse du fichier)")
    principale = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-principale", "cree_le", "id"]
        verbose_name = "Adresse de livraison"
        verbose_name_plural = "Adresses de livraison"

    def __str__(self):
        return self.libelle

    @property
    def libelle(self) -> str:
        """« Maison · Mvog-Ada » (lieu d'une commande à domicile)."""
        return f"{self.nom} · {self.quartier}"

    @property
    def reperes(self) -> str:
        return dechiffrer(self.reperes_chiffre)

    @property
    def instructions(self) -> str:
        return dechiffrer(self.instructions_chiffre)

    @property
    def destinataire(self) -> str:
        return dechiffrer(self.destinataire_chiffre)

    @property
    def coords(self) -> dict | None:
        brut = dechiffrer(self.coords_chiffre)
        if not brut:
            return None
        lat, lon, precision = brut.split(";")
        return {"lat": float(lat), "lon": float(lon), "precision": float(precision)}

    # Position pour les moteurs (supplément XL, distance du relais) : Decimal, jamais float.
    @property
    def lat(self):
        from decimal import Decimal

        brut = dechiffrer(self.coords_chiffre)
        return Decimal(brut.split(";")[0]) if brut else None

    @property
    def lon(self):
        from decimal import Decimal

        brut = dechiffrer(self.coords_chiffre)
        return Decimal(brut.split(";")[1]) if brut else None


class Recherche(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recherches_client")
    texte = models.CharField(max_length=120)
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-le", "-id"]
        verbose_name = "Recherche (historique)"
        verbose_name_plural = "Recherches (historique)"


class ProduitVu(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="produits_vus_client")
    product_id = models.PositiveBigIntegerField()
    le = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "product_id"], name="client_accounts_produit_vu_unique")]
        ordering = ["-le"]
        verbose_name = "Produit vu (historique)"
        verbose_name_plural = "Produits vus (historique)"


class VersionLegale(models.Model):
    """Une version publiée de l'ensemble des textes légaux (CL-13) ; la plus récente déjà publiée est en vigueur."""

    version = models.CharField(max_length=20, unique=True)
    publiee_le = models.DateTimeField(help_text="publication ; en vigueur dès cette date")
    changements = models.JSONField(default=list, blank=True, help_text="ce qui change par rapport à la version précédente")
    documents = models.JSONField(default=list, help_text="DocumentLegal[] du site : cle, icone, aAccepter, fr, en")
    pdf = models.JSONField(null=True, blank=True, help_text="adresse du PDF complet par document et langue (« cgu-fr »)")

    class Meta:
        ordering = ["-publiee_le"]
        verbose_name = "Version des textes légaux"
        verbose_name_plural = "Versions des textes légaux"

    def __str__(self):
        return f"Textes légaux {self.version}"


class ConsentementLegal(models.Model):
    """Acceptation horodatée d'un texte légal (CAP-23). Gardée après la suppression du compte (preuve)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="consentements_legaux")
    doc = models.CharField(max_length=40)
    version = models.CharField(max_length=20)
    le = models.DateTimeField(auto_now_add=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    appareil = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        ordering = ["-le", "-id"]
        verbose_name = "Consentement légal"
        verbose_name_plural = "Consentements légaux"


class IdentiteLiee(models.Model):
    class Fournisseur(models.TextChoices):
        GOOGLE = "google", "Google"
        APPLE = "apple", "Apple"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="identites_liees")
    fournisseur = models.CharField(max_length=10, choices=Fournisseur.choices)
    sujet = models.CharField(max_length=255, help_text="« sub » du jeton du fournisseur")
    email_masque = models.CharField(max_length=160, blank=True, default="")
    liee_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["fournisseur", "sujet"], name="client_accounts_identite_unique"),
            models.UniqueConstraint(fields=["user", "fournisseur"], name="client_accounts_identite_par_compte"),
        ]
        verbose_name = "Identité liée"
        verbose_name_plural = "Identités liées"


class BoutiqueClient(models.Model):
    class Type(models.TextChoices):
        PARTICULIER = "particulier", "Particulier"
        ENTREPRISE = "entreprise", "Entreprise"

    class Piece(models.TextChoices):
        AUCUNE = "aucune", "Aucune"
        ENVOYEE = "envoyee", "Envoyée"
        VERIFIEE = "verifiee", "Vérifiée"
        REFUSEE = "refusee", "Refusée"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="boutique_client")
    vendor_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="vendors.VendorProfile créé en attente")
    nom = models.CharField(max_length=40)
    categorie = models.CharField(max_length=60)
    type = models.CharField(max_length=12, choices=Type.choices)
    code = models.CharField(max_length=12, unique=True, help_text="« KRN-4821 » : vendeur.belivay.com/b/KRN-4821")
    piece = models.CharField(max_length=10, choices=Piece.choices, default=Piece.AUCUNE)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Boutique ouverte depuis le compte"
        verbose_name_plural = "Boutiques ouvertes depuis le compte"

    def __str__(self):
        return f"{self.nom} ({self.code})"


class DemandeBusiness(models.Model):
    """Pièce envoyée pour le compte Business (revendeur vérifié, ABO-BUSINESS)."""

    class Etat(models.TextChoices):
        ENVOYEE = "envoyee", "Envoyée"
        VERIFIEE = "verifiee", "Vérifiée"
        REFUSEE = "refusee", "Refusée"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="demandes_business")
    piece = models.TextField(help_text="adresse du fichier envoyé")
    etat = models.CharField(max_length=10, choices=Etat.choices, default=Etat.ENVOYEE)
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-le", "-id"]
        verbose_name = "Demande de compte Business"
        verbose_name_plural = "Demandes de compte Business"


class AlerteFavori(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="alertes_favoris")
    favorite_id = models.PositiveBigIntegerField(help_text="accounts.UserFavorite")
    prix = models.BooleanField(default=False, help_text="alerte de baisse de prix")
    stock = models.BooleanField(default=False, help_text="alerte de retour en stock")
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "favorite_id"], name="client_accounts_alerte_favori_unique")]
        verbose_name = "Alerte sur un favori"
        verbose_name_plural = "Alertes sur les favoris"
