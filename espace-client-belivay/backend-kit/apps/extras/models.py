# backend/apps/extras/models.py
# Modules CL-15 (DP-54) :
#
#   Cotisation, Participation — offrir à plusieurs (FF-EX02 ; COT-*) : l'argent reste bloqué chez BelivaY ;
#                     objectif = prix livré figé à la création + COT-FRAIS ; COT-DUREE-MAX au plus ; participation
#                     dès COT-PART-MIN, au plus ce qui manque ; objectif atteint : la commande part au prix figé ;
#                     date dépassée : chacun est remboursé sur son moyen.
#   MiseDeCote, Versement — réserver un article avec un acompte, payer en plusieurs fois (FF-EX03 ; MDC-*).
#   OffreFlash      — vente flash du kit (FF-FLASH ; FLASH-*), quand le catalogue de relaya (PromotionCampaign de
#                     type FLASH) n'est pas lisible par le pont.
#   Ecole, ListeRentree, ArticleRentree, SaisonRentree — listes officielles de rentrée (FF-EX01 ; RNT-*).
#   ArticleFamille, ModeleFamille, DestinataireFamille, PanierFamille, PaiementFamille — panier famille (FF-EX05 ;
#                     FAM-*).
#   ModeleReprise, Troc — reprise d'un ancien téléphone par un reconditionneur partenaire (FF-EX04 ; TRC-*).

from django.conf import settings
from django.db import models


class Cotisation(models.Model):
    class Etat(models.TextChoices):
        OUVERTE = "ouverte", "Ouverte"
        ATTEINTE = "atteinte", "Objectif atteint, commande partie"
        HAUSSE = "hausse", "Objectif atteint, prix en hausse : l'organisateur choisit"
        ECHUE = "echue", "Date dépassée"
        REMBOURSEE = "remboursee", "Remboursée"

    code = models.CharField(max_length=16, unique=True)
    organisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="cotisations_organisees"
    )
    organisateur_nom = models.CharField(max_length=80)
    nom = models.CharField(max_length=160)
    occasion = models.CharField(max_length=40, blank=True, default="")
    product_id = models.PositiveBigIntegerField()
    titre = models.CharField(max_length=200)
    prix = models.PositiveIntegerField(help_text="prix de l'article, figé à la création")
    frais = models.PositiveIntegerField(help_text="livraison au relais du bénéficiaire, figée à la création")
    prix_livre = models.PositiveIntegerField()
    objectif = models.PositiveIntegerField()
    qui = models.CharField(max_length=12, default="payeur", help_text="qui paie la livraison : payeur (participants) | destinataire")
    beneficiaire = models.CharField(max_length=80)
    beneficiaire_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="cotisations_recues"
    )
    relay_id = models.PositiveBigIntegerField(null=True, blank=True)
    relais_nom = models.CharField(max_length=160, blank=True, default="")
    jusqua = models.DateTimeField()
    etat = models.CharField(max_length=10, choices=Etat.choices, default=Etat.OUVERTE)
    hausse_prix = models.PositiveIntegerField(null=True, blank=True)
    hausse_ecart = models.PositiveIntegerField(null=True, blank=True)
    order_id = models.PositiveBigIntegerField(null=True, blank=True)
    fin = models.DateTimeField(null=True, blank=True)
    liste_code = models.CharField(
        max_length=16, blank=True, default="", db_index=True, help_text="née d'un article cher d'une liste d'envies"
    )
    liste_product_id = models.PositiveBigIntegerField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        verbose_name = "Cotisation"
        verbose_name_plural = "Cotisations"

    def __str__(self):
        return f"{self.nom} ({self.code})"

    @property
    def ref(self):
        return f"BLV-{self.order_id}" if self.order_id else None


class Participation(models.Model):
    class Paiement(models.TextChoices):
        ATTENTE = "attente", "En attente"
        PAYE = "paye", "Payé"
        REMBOURSE = "rembourse", "Remboursé"

    cotisation = models.ForeignKey(Cotisation, on_delete=models.CASCADE, related_name="participations")
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    prenom = models.CharField(max_length=80)
    montant = models.PositiveIntegerField(help_text="ce qui compte pour l'objectif")
    frais = models.PositiveIntegerField(default=0, help_text="frais de carte payés en plus (rendus au remboursement)")
    discret = models.BooleanField(default=False)
    moyen = models.CharField(max_length=10, default="mobile")
    moyen_affiche = models.CharField(max_length=60, blank=True, default="")
    numero_chiffre = models.BinaryField(null=True, blank=True)
    mot = models.CharField(max_length=200, blank=True, default="")
    organisateur = models.BooleanField(default=False)
    reference = models.CharField(max_length=80, blank=True, default="")
    etat_paiement = models.CharField(max_length=10, choices=Paiement.choices, default=Paiement.PAYE)
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "Participation"
        verbose_name_plural = "Participations"


class MiseDeCote(models.Model):
    class Etat(models.TextChoices):
        EN_COURS = "en_cours", "En cours"
        PAYEE = "payee", "Payée"
        ANNULEE = "annulee", "Annulée"

    class Rythme(models.TextChoices):
        DEUX_SEMAINES = "2sem", "Toutes les 2 semaines"
        MOIS = "mois", "Chaque mois"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mises_de_cote")
    product_id = models.PositiveBigIntegerField(null=True, blank=True)
    titre = models.CharField(max_length=200)
    prix = models.PositiveIntegerField()
    livraison = models.PositiveIntegerField()
    prix_livre = models.PositiveIntegerField()
    rythme = models.CharField(max_length=4, choices=Rythme.choices)
    moyen = models.CharField(max_length=60)
    numero_chiffre = models.BinaryField(null=True, blank=True)
    relay_id = models.PositiveBigIntegerField(null=True, blank=True)
    etat = models.CharField(max_length=8, choices=Etat.choices, default=Etat.EN_COURS)
    order_id = models.PositiveBigIntegerField(null=True, blank=True)
    annulee_le = models.DateTimeField(null=True, blank=True)
    rembourse = models.PositiveIntegerField(null=True, blank=True)
    forfait = models.PositiveIntegerField(null=True, blank=True)
    liste = models.JSONField(
        null=True, blank=True, help_text="liste de rentrée entière : {id, classe, ecole, exclus, equivalents, articles, rentreeLe}"
    )
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        verbose_name = "Mise de côté"
        verbose_name_plural = "Mises de côté"


class Versement(models.Model):
    mise = models.ForeignKey(MiseDeCote, on_delete=models.CASCADE, related_name="versements")
    n = models.PositiveSmallIntegerField()
    du = models.PositiveIntegerField()
    le = models.DateTimeField()
    paye_le = models.DateTimeField(null=True, blank=True)
    reference = models.CharField(max_length=80, blank=True, default="")

    class Meta:
        ordering = ["n"]
        constraints = [models.UniqueConstraint(fields=["mise", "n"], name="extras_versement_unique")]
        verbose_name = "Versement"
        verbose_name_plural = "Versements"


class OffreFlash(models.Model):
    product_id = models.PositiveBigIntegerField()
    prix = models.PositiveIntegerField(help_text="prix de l'offre")
    avant = models.PositiveIntegerField(help_text="prix vraiment pratiqué avant l'offre")
    debut = models.DateTimeField()
    fin = models.DateTimeField()
    stock = models.PositiveIntegerField(help_text="stock propre à l'offre")
    vendus = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["fin"]
        verbose_name = "Vente flash"
        verbose_name_plural = "Ventes flash"


class Ecole(models.Model):
    nom = models.CharField(max_length=160)
    quartier = models.CharField(max_length=80, blank=True, default="")
    verifiee = models.BooleanField(default=False)
    depuis = models.DateTimeField(auto_now_add=True)
    gestionnaires = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="ecoles_gerees")

    class Meta:
        verbose_name = "École"
        verbose_name_plural = "Écoles"

    def __str__(self):
        return self.nom


class SaisonRentree(models.Model):
    saison = models.CharField(max_length=9, unique=True, help_text="« 2026-2027 »")
    ouverte = models.BooleanField(default=True)
    rentree_le = models.DateTimeField()

    class Meta:
        ordering = ["-saison"]
        verbose_name = "Saison de rentrée"
        verbose_name_plural = "Saisons de rentrée"


class ListeRentree(models.Model):
    class Statut(models.TextChoices):
        PUBLIEE = "publiee", "Publiée"
        BROUILLON = "brouillon", "Brouillon"

    ecole = models.ForeignKey(Ecole, on_delete=models.CASCADE, related_name="listes")
    saison = models.ForeignKey(SaisonRentree, on_delete=models.CASCADE, related_name="listes")
    classe = models.CharField(max_length=40)
    section = models.CharField(max_length=2, default="fr")
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.BROUILLON)
    publiee_le = models.DateTimeField(null=True, blank=True)
    historique = models.JSONField(default=list, blank=True, help_text="[{le, texte}]")

    class Meta:
        verbose_name = "Liste de rentrée"
        verbose_name_plural = "Listes de rentrée"


class ListePapier(models.Model):
    """Photo d'une liste d'école sur papier envoyée par un parent : l'équipe la saisit (liste « prête » à pret_le)."""

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listes_papier")
    classe = models.CharField(max_length=40)
    photo = models.FileField(upload_to="rentree/papier/%Y/%m/")
    le = models.DateTimeField(auto_now_add=True)
    pret_le = models.DateTimeField(help_text="saisie annoncée au parent")
    liste = models.ForeignKey(ListeRentree, on_delete=models.SET_NULL, null=True, blank=True, help_text="la liste saisie")

    class Meta:
        ordering = ["-id"]
        verbose_name = "Liste de rentrée sur papier"
        verbose_name_plural = "Listes de rentrée sur papier"


class ArticleRentree(models.Model):
    liste = models.ForeignKey(ListeRentree, on_delete=models.CASCADE, related_name="articles")
    titre = models.CharField(max_length=200)
    groupe = models.CharField(max_length=80, blank=True, default="")
    qte = models.PositiveIntegerField(default=1)
    product_id = models.PositiveBigIntegerField(help_text="l'offre retenue (prix, boutique, zone lus dans le catalogue)")
    consigne = models.CharField(max_length=200, blank=True, default="")
    exigee = models.BooleanField(default=False, help_text="édition exigée : pas d'équivalent")
    equivalent_product_id = models.PositiveBigIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "Article d'une liste de rentrée"
        verbose_name_plural = "Articles des listes de rentrée"


class ArticleFamille(models.Model):
    product_id = models.PositiveBigIntegerField(unique=True)
    poids_g = models.PositiveIntegerField(help_text="FAM-POIDS-MAX au plus")
    actif = models.BooleanField(default=True)
    ordre = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordre", "id"]
        verbose_name = "Article du panier famille"
        verbose_name_plural = "Articles du panier famille"


class ModeleFamille(models.Model):
    nom = models.CharField(max_length=80)
    articles = models.JSONField(help_text="[{id: product_id, qte}]")

    class Meta:
        verbose_name = "Panier famille prêt"
        verbose_name_plural = "Paniers famille prêts"


class DestinataireFamille(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="destinataires_famille")
    prenom = models.CharField(max_length=80)
    numero_chiffre = models.BinaryField()
    numero_masque = models.CharField(max_length=40)
    relay_id = models.PositiveBigIntegerField(null=True, blank=True)
    relais_nom = models.CharField(max_length=160)
    lie_le = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["client", "prenom"], name="extras_destinataire_unique")]
        verbose_name = "Destinataire d'un panier famille"
        verbose_name_plural = "Destinataires des paniers famille"


class PanierFamille(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="paniers_famille")
    nom = models.CharField(max_length=80, default="Panier famille")
    destinataire_prenom = models.CharField(max_length=80, blank=True, default="")
    destinataire_relais = models.CharField(max_length=160, blank=True, default="")
    articles = models.JSONField(default=list, blank=True, help_text="[{id: product_id, qte}]")
    mensuel = models.BooleanField(default=False)
    jour = models.PositiveSmallIntegerField(default=21)
    suspendu = models.BooleanField(default=False)
    carte = models.CharField(max_length=60, blank=True, default="", help_text="« Visa •••• 4242 » ; le jeton reste chez le prestataire")
    jeton_carte = models.CharField(max_length=120, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "Panier famille"
        verbose_name_plural = "Paniers famille"


class PaiementFamille(models.Model):
    panier = models.ForeignKey(PanierFamille, on_delete=models.CASCADE, related_name="historique")
    montant = models.PositiveIntegerField()
    order_id = models.PositiveBigIntegerField()
    reference = models.CharField(max_length=80, blank=True, default="")
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        verbose_name = "Paiement d'un panier famille"
        verbose_name_plural = "Paiements des paniers famille"


class ModeleReprise(models.Model):
    code = models.CharField(max_length=40, unique=True)
    nom = models.CharField(max_length=120)
    cote = models.PositiveIntegerField(help_text="cote du reconditionneur partenaire (TRC-PARTENAIRE)")
    actif = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Modèle repris"
        verbose_name_plural = "Modèles repris"


class Troc(models.Model):
    class Etat(models.TextChoices):
        DEPOT = "depot", "À déposer au relais"
        DEPOSE = "depose", "Déposé"
        COLLECTE = "collecte", "Collecté"
        INSPECTION = "inspection", "En inspection"
        CONFIRME = "confirme", "Valeur confirmée"
        CONTRE = "contre", "Contre-offre"
        REFUSE = "refuse", "Refusé"
        PAYE = "paye", "Neuf payé"
        RENDU = "rendu", "Téléphone rendu"
        ANNULE = "annule", "Annulé"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="trocs")
    product_id = models.PositiveBigIntegerField()
    titre = models.CharField(max_length=200)
    prix = models.PositiveIntegerField()
    prix_livre = models.PositiveIntegerField()
    modele = models.ForeignKey(ModeleReprise, on_delete=models.PROTECT, related_name="+")
    declare = models.JSONField()
    estimation_min = models.PositiveIntegerField()
    estimation_max = models.PositiveIntegerField()
    code_depot = models.CharField(max_length=6)
    relay_id = models.PositiveBigIntegerField(null=True, blank=True)
    relais_nom = models.CharField(max_length=160, blank=True, default="")
    depose_le = models.DateTimeField(null=True, blank=True)
    collecte_le = models.DateTimeField(null=True, blank=True)
    recu_le = models.DateTimeField(null=True, blank=True)
    inspecte_le = models.DateTimeField(null=True, blank=True)
    valeur = models.PositiveIntegerField(null=True, blank=True)
    contre_offre = models.JSONField(null=True, blank=True)
    motif = models.JSONField(null=True, blank=True)
    contestation = models.JSONField(null=True, blank=True)
    etat = models.CharField(max_length=10, choices=Etat.choices, default=Etat.DEPOT)
    order_id = models.PositiveBigIntegerField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        verbose_name = "Reprise d'un téléphone"
        verbose_name_plural = "Reprises de téléphones"
