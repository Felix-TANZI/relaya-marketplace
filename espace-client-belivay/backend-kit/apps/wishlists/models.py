# backend/apps/wishlists/models.py
# Listes d'envies (CL-14 ; FF-LISTE-ENVIES) et échanges entre clients (DP-54).
#
#   ListeEnvies     — la liste par défaut (les favoris) et les listes nommées (anniversaire, mariage…) ; partagée
#                     par un lien court de LIEN-COURT-LONG caractères (CAP-11), valable LST-VALIDITE ; les prix du
#                     jour sont relevés au partage (CLE-39) ; remise au fil de l'eau ou groupée ; mode surprise.
#   ParticipationCagnotte — une participation à la cagnotte d'une liste (mariage : voyage de noces), sans compte.
#   ArticleListe    — un produit d'une liste (prix et titre lus dans le catalogue à chaque lecture).
#   MiseEnStatut    — la liste mise en statut (WhatsApp, Facebook…), par canal.
#   ColisEchange    — un colis payé par l'un pour l'autre : cadeau d'une liste, cotisation atteinte, panier payé
#                     pour un proche. Qui paie la livraison (règle commune, regles.py), état d'acceptation par le
#                     destinataire, retenue et remboursement après un refus. Le cadeau d'un invité sans compte garde
#                     son e-mail chiffré (suivi, remerciement, historique des cartes pour les plafonds).
#   ProcheConnu, RechercheProche — proches trouvés par leur numéro (20 recherches par jour au plus, anti-annuaire).
#   EnvoiEchange    — une liste ou une cotisation envoyée dans l'application d'un proche (une fois par objet), et le
#                     dernier rappel du propriétaire.
#   ListeSuivie     — la liste d'un proche que l'on suit, avec un rappel N jours avant la remise.
#   Merci           — remerciement après un cadeau.
#
# Les produits, relais et commandes de relaya sont gardés par leur identifiant entier (apps.client_core.pont).

from django.conf import settings
from django.db import models


class ListeEnvies(models.Model):
    class Mode(models.TextChoices):
        FIL = "fil", "Au fil de l'eau (chaque cadeau son code)"
        GROUPE = "groupe", "Groupée (tous ensemble à une date)"

    class Destination(models.TextChoices):
        MOI = "moi", "Mon relais"
        OFFRANT = "offrant", "Choisi par celui qui offre"
        TIERS = "tiers", "Une autre personne"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listes_envies")
    nom = models.CharField(max_length=120)
    favoris = models.BooleanField(default=False, help_text="la liste par défaut, faite des favoris")
    mode = models.CharField(max_length=6, choices=Mode.choices, default=Mode.FIL)
    remise_le = models.DateTimeField(null=True, blank=True)
    surprise = models.BooleanField(default=False)
    destination = models.CharField(max_length=8, choices=Destination.choices, default=Destination.MOI)
    relay_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="vide et destination « moi » : le relais habituel")
    tiers_prenom = models.CharField(max_length=80, blank=True, default="")
    domicile = models.BooleanField(default=False, help_text="livraison à domicile acceptée (l'adresse n'est jamais montrée)")
    demarree = models.BooleanField(default=False)
    code = models.CharField(max_length=16, unique=True, null=True, blank=True, help_text="lien court /l/<code> (CAP-11)")
    partage_le = models.DateTimeField(null=True, blank=True)
    partage_jusqua = models.DateTimeField(null=True, blank=True)
    prix_partage = models.JSONField(default=dict, blank=True, help_text="{product_id: prix} relevés au partage (CLE-39)")
    occasion = models.CharField(max_length=20, blank=True, default="", help_text="OccasionListe du site (anniversaire, mariage, dot…)")
    hotes = models.JSONField(default=list, blank=True, help_text="le couple, les parents, les hôtes (prénoms)")
    cagnotte_titre = models.CharField(max_length=80, blank=True, default="", help_text="cagnotte de la liste (« Voyage de noces »)")
    cagnotte_objectif = models.PositiveIntegerField(null=True, blank=True, help_text="objectif en francs ; vide : pas de cagnotte")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["client"], condition=models.Q(favoris=True), name="wishlists_un_seul_favoris")]
        ordering = ["-favoris", "id"]
        verbose_name = "Liste d'envies"
        verbose_name_plural = "Listes d'envies"

    def __str__(self):
        return f"{self.nom} ({self.client})"


class ParticipationCagnotte(models.Model):
    """Une participation à la cagnotte d'une liste (mariage : voyage de noces), depuis la page publique, sans compte.
    Dès PARTICIPATION_MIN, au plus ce qui manque ; l'argent est bloqué chez BelivaY puis versé aux hôtes."""

    class Paiement(models.TextChoices):
        ATTENTE = "attente", "En attente de validation"
        PAYE = "paye", "Payé"
        REFUSE = "refuse", "Refusé"

    liste = models.ForeignKey(ListeEnvies, on_delete=models.CASCADE, related_name="participations")
    prenom = models.CharField(max_length=80)
    montant = models.PositiveIntegerField()
    mot = models.CharField(max_length=200, blank=True, default="")
    discret = models.BooleanField(default=False)
    moyen = models.CharField(max_length=10, default="mobile")
    moyen_affiche = models.CharField(max_length=60, blank=True, default="")
    reference_paiement = models.CharField(max_length=80, blank=True, default="")
    etat_paiement = models.CharField(max_length=8, choices=Paiement.choices, default=Paiement.ATTENTE)
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "Participation à une cagnotte de liste"
        verbose_name_plural = "Participations aux cagnottes de liste"


class ArticleListe(models.Model):
    liste = models.ForeignKey(ListeEnvies, on_delete=models.CASCADE, related_name="articles")
    product_id = models.PositiveBigIntegerField()
    ajoute_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["liste", "product_id"], name="wishlists_article_unique")]
        ordering = ["id"]
        verbose_name = "Article d'une liste"
        verbose_name_plural = "Articles des listes"


class MiseEnStatut(models.Model):
    class Canal(models.TextChoices):
        PARTAGE = "partage", "Partage du téléphone"
        IMAGE = "image", "Image enregistrée"
        WHATSAPP = "whatsapp", "WhatsApp"
        SMS = "sms", "SMS"
        LIEN = "lien", "Lien copié"
        TEXTE = "texte", "Texte copié"

    liste = models.ForeignKey(ListeEnvies, on_delete=models.CASCADE, related_name="statuts")
    canal = models.CharField(max_length=10, choices=Canal.choices)
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "Mise en statut"
        verbose_name_plural = "Mises en statut"


class ColisEchange(models.Model):
    class Origine(models.TextChoices):
        LISTE = "liste", "Cadeau d'une liste"
        COTISATION = "cotisation", "Cotisation"
        PANIER = "panier", "Panier payé pour un proche"

    class Qui(models.TextChoices):
        PAYEUR = "payeur", "Le payeur"
        DESTINATAIRE = "destinataire", "Le destinataire, à la remise"

    class Etat(models.TextChoices):
        A_ACCEPTER = "a_accepter", "À accepter par le destinataire"
        ACCEPTE = "accepte", "Accepté"
        REFUSE = "refuse", "Refusé"
        RETIRE = "retire", "Retiré"

    class Paiement(models.TextChoices):
        ATTENTE = "attente", "En attente (Mobile Money)"
        ACTION = "action", "3-D Secure à valider"
        PAYE = "paye", "Payé"
        REFUSE = "refuse", "Refusé"

    origine = models.CharField(max_length=10, choices=Origine.choices)
    payeur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="colis_payes")
    payeur_prenom = models.CharField(max_length=80)
    payeur_email_chiffre = models.BinaryField(null=True, blank=True)
    payeur_email_empreinte = models.CharField(max_length=64, blank=True, default="", db_index=True)
    destinataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="colis_recus")
    destinataire_prenom = models.CharField(max_length=80)
    liste = models.ForeignKey(ListeEnvies, on_delete=models.SET_NULL, null=True, blank=True, related_name="cadeaux")
    code_liste = models.CharField(max_length=16, blank=True, default="", db_index=True)
    product_id = models.PositiveBigIntegerField(null=True, blank=True)
    titre = models.CharField(max_length=200)
    surprise = models.BooleanField(default=False)
    articles = models.PositiveIntegerField(help_text="valeur des articles, payée et bloquée")
    frais = models.PositiveIntegerField(help_text="livraison (relais ou domicile)")
    qui = models.CharField(max_length=12, choices=Qui.choices, default=Qui.PAYEUR)
    livraison = models.CharField(max_length=8, default="relais", help_text="relais | domicile")
    relay_id = models.PositiveBigIntegerField(null=True, blank=True)
    relais_nom = models.CharField(max_length=160, blank=True, default="")
    mot = models.CharField(max_length=200, blank=True, default="")
    moyen = models.CharField(max_length=10, default="mobile", help_text="mobile | carte | apple | google")
    moyen_affiche = models.CharField(max_length=60, blank=True, default="", help_text="« Visa •••• 4242 », « 6 77 ·· ·· 41 »")
    numero_chiffre = models.BinaryField(null=True, blank=True, help_text="Mobile Money du payeur : remboursement")
    devise = models.CharField(max_length=3, default="XAF")
    montant_devise = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    frais_service = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(help_text="payé maintenant par le payeur")
    pays_carte = models.CharField(max_length=60, blank=True, default="")
    reference_paiement = models.CharField(max_length=80, blank=True, default="")
    etat_paiement = models.CharField(max_length=8, choices=Paiement.choices, default=Paiement.ATTENTE)
    etat = models.CharField(max_length=10, choices=Etat.choices, default=Etat.ACCEPTE)
    order_id = models.PositiveBigIntegerField(null=True, blank=True, unique=True)
    retenue = models.PositiveIntegerField(null=True, blank=True)
    rembourse = models.PositiveIntegerField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    paye_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-id"]
        verbose_name = "Colis payé pour un autre"
        verbose_name_plural = "Colis payés pour un autre"

    def __str__(self):
        return f"{self.ref} · {self.payeur_prenom} → {self.destinataire_prenom}"

    @property
    def ref(self) -> str:
        return f"BLV-{self.order_id}" if self.order_id else f"ECH-{self.pk}"


class ProcheConnu(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="proches_connus")
    proche = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    numero_masque = models.CharField(max_length=40, blank=True, default="")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["client", "proche"], name="wishlists_proche_unique")]
        verbose_name = "Proche trouvé par son numéro"
        verbose_name_plural = "Proches trouvés par leur numéro"


class RechercheProche(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    le = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Recherche d'un proche"
        verbose_name_plural = "Recherches de proches"


class EnvoiEchange(models.Model):
    class Objet(models.TextChoices):
        LISTE = "liste", "Liste d'envies"
        COTISATION = "cotisation", "Cotisation"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="envois_echange")
    objet = models.CharField(max_length=10, choices=Objet.choices)
    objet_id = models.CharField(max_length=40)
    proche = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    le = models.DateTimeField(auto_now_add=True)
    rappele_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["client", "objet", "objet_id", "proche"], name="wishlists_envoi_unique")]
        ordering = ["id"]
        verbose_name = "Envoi à un proche"
        verbose_name_plural = "Envois aux proches"


class ListeSuivie(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listes_suivies")
    liste = models.ForeignKey(ListeEnvies, on_delete=models.CASCADE, related_name="suiveurs")
    rappel = models.PositiveSmallIntegerField(null=True, blank=True, help_text="jours avant la remise")
    depuis = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["client", "liste"], name="wishlists_suivie_unique")]
        verbose_name = "Liste suivie"
        verbose_name_plural = "Listes suivies"


class Merci(models.Model):
    auteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mercis")
    ref = models.CharField(max_length=40)
    pour = models.CharField(max_length=80)
    texte = models.CharField(max_length=500)
    le = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["auteur", "ref"], name="wishlists_merci_unique")]
        verbose_name = "Remerciement"
        verbose_name_plural = "Remerciements"
