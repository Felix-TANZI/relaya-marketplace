# backend/apps/aftersales/models.py
# Après la vente (CL-09, CL-11, CL-13 ; CAL-27 à CAL-31 ; DP-10, DP-27, DP-28, DP-35) :
#
#   Litige         — un dossier par colis (sous-commande « 52018-2 ») ; machine belivay_moteurs.etats.LITIGE
#                    (ouvert → attente_vendeur → en_examen → decide ; rembourse_automatiquement sous le seuil du palier
#                    IFA). L'argent du colis reste bloqué (montant = prix des articles du colis). Identifiant exposé :
#                    « LIT-<pk> ». Un litige retiré par le client (retire_le) libère le colis ; un nouveau dossier peut
#                    alors s'ouvrir.
#   PreuveLitige   — photos versées au dossier, horodatées par le serveur (jamais par l'appareil).
#   Retour         — machine RETOUR (DP-10 : toujours un dépôt au relais, aucun remboursement sans retour).
#   Remplacement   — machine REMPLACEMENT (vendeur suivant si rupture : catalogue.vendeur_suivant, DP-01).
#   AvisCommande   — notes d'une commande retirée : une par colis (le vendeur), puis le relais ; AVIS-FENETRE.
#   VoteAvis       — « utile » / « signaler » sur un avis produit de relaya (catalog.ProductReview, id gardé seul).
#
# Aucune ForeignKey vers les modèles de relaya : order_id, product_id, relay_id, review_id restent des entiers.

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Litige(models.Model):
    class Etat(models.TextChoices):  # belivay_moteurs.etats.LITIGE
        OUVERT = "ouvert", "Ouvert"
        ATTENTE_VENDEUR = "attente_vendeur", "Le vendeur a 48 h pour répondre"
        EN_EXAMEN = "en_examen", "En examen"
        DECIDE = "decide", "Décision"
        REMBOURSE_AUTO = "rembourse_automatiquement", "Remboursé automatiquement"

    class Probleme(models.TextChoices):
        JAMAIS = "jamais", "Jamais reçu"
        ABIME = "abime", "Abîmé"
        PAS_COMMANDE = "pas-commande", "Pas ce que j’ai commandé"
        MANQUE = "manque", "Il manque quelque chose"
        AUTRE = "autre", "Autre chose"

    class Souhait(models.TextChoices):
        REMBOURSE = "rembourse", "Un remboursement"
        REMPLACE = "remplace", "Un remplacement"
        SIGNAL = "signal", "Signaler seulement"

    class Origine(models.TextChoices):
        APPLI = "appli", "Application"
        COMPTOIR = "comptoir", "Constat au comptoir"
        AUTO = "auto", "Remboursement immédiat"

    class Reponse(models.TextChoices):
        AUCUNE = "", "Pas encore"
        ACCEPTE = "accepte", "Accepte"
        CONTESTE = "conteste", "Conteste"
        ARRANGEMENT = "arrangement", "Propose un arrangement"
        SILENCE = "silence", "Sans réponse"

    class Issue(models.TextChoices):
        AUCUNE = "", "Pas encore"
        REMBOURSE = "rembourse", "Remboursement"
        REMPLACE = "remplace", "Remplacement"
        REFUSE = "refuse", "Débouté"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="litiges_client")
    order_id = models.PositiveBigIntegerField(db_index=True, help_text="orders.Order de relaya-marketplace")
    colis = models.PositiveSmallIntegerField(help_text="numéro du colis (pickup.SousCommande.n)")
    product_id = models.PositiveBigIntegerField(null=True, blank=True)
    produit = models.CharField(max_length=200)
    relay_id = models.PositiveBigIntegerField(null=True, blank=True)
    pb = models.CharField(max_length=14, choices=Probleme.choices)
    probleme = models.CharField(max_length=120, help_text="libellé affiché (« Abîmé », « Semelle fendue »)")
    description = models.TextField(blank=True, default="")
    souhait = models.CharField(max_length=10, choices=Souhait.choices)
    origine = models.CharField(max_length=10, choices=Origine.choices, default=Origine.APPLI)
    montant = models.PositiveIntegerField(help_text="bloqué pendant le litige : prix des articles du colis")
    etat = models.CharField(max_length=26, choices=Etat.choices, default=Etat.OUVERT)
    etat_colis_avant = models.CharField(
        max_length=24, blank=True, default="", help_text="état du colis avant le litige (retrait du dossier)"
    )
    palier_ifa = models.CharField(max_length=12, blank=True, default="", help_text="palier IFA du client à l'ouverture")
    ouvert_le = models.DateTimeField(default=timezone.now)
    echeance_vendeur = models.DateTimeField(help_text="LIT-VENDEUR-H après l'ouverture")
    decision_au_plus_tard = models.DateTimeField(help_text="LIT-DECISION-H après l'échéance du vendeur")
    reponse_vendeur = models.CharField(max_length=12, choices=Reponse.choices, blank=True, default="")
    arrangement_montant = models.PositiveIntegerField(null=True, blank=True)
    arrangement_texte = models.TextField(blank=True, default="")
    arrangement_propose_le = models.DateTimeField(null=True, blank=True)
    arrangement_repondu_le = models.DateTimeField(null=True, blank=True)
    arrangement_accepte = models.BooleanField(null=True, blank=True)
    decision_le = models.DateTimeField(null=True, blank=True)
    decision_motif = models.TextField(blank=True, default="", help_text="motif écrit, obligatoire")
    issue = models.CharField(max_length=10, choices=Issue.choices, blank=True, default="")
    rembourse = models.PositiveIntegerField(default=0, help_text="argent rendu au client pour ce dossier")
    recours_le = models.DateTimeField(null=True, blank=True)
    recours_motif = models.TextField(blank=True, default="")
    retire_le = models.DateTimeField(null=True, blank=True)
    clos_le = models.DateTimeField(null=True, blank=True, help_text="fin de la suspension (garde, libération)")
    version_parametres = models.CharField(max_length=40, blank=True, default="")

    class Meta:
        ordering = ["-ouvert_le"]
        constraints = [
            models.UniqueConstraint(
                fields=["order_id", "colis"], condition=Q(retire_le__isnull=True), name="aftersales_un_dossier_par_colis"
            )
        ]
        verbose_name = "Litige"
        verbose_name_plural = "Litiges"

    def __str__(self):
        return f"{self.ref} · BLV-{self.order_id} colis {self.colis}"

    @property
    def ref(self) -> str:
        return f"LIT-{self.pk}"

    @property
    def colis_ref(self) -> str:
        return f"{self.order_id}-{self.colis}"


class PreuveLitige(models.Model):
    class Source(models.TextChoices):
        CLIENT = "client", "Le client (dossier)"
        CONVERSATION = "conversation", "Le client (conversation du dossier)"
        RELAIS = "relais", "Le relais"
        LIVREUR = "livreur", "Le livreur"

    litige = models.ForeignKey(Litige, on_delete=models.CASCADE, related_name="preuves")
    titre = models.CharField(max_length=120)
    sous = models.CharField(max_length=160, blank=True, default="")
    photo = models.FileField(upload_to="litiges/%Y/%m/")
    source = models.CharField(max_length=14, choices=Source.choices, default=Source.CLIENT)
    ajoutee_le = models.DateTimeField(default=timezone.now, help_text="horodatée par le serveur")

    class Meta:
        ordering = ["ajoutee_le", "pk"]
        verbose_name = "Preuve d'un litige"
        verbose_name_plural = "Preuves des litiges"


class Retour(models.Model):
    class Etat(models.TextChoices):  # belivay_moteurs.etats.RETOUR
        ACCEPTE = "accepte", "À déposer"
        DEPOSE = "retour_depose", "Retour déposé"
        COLLECTE = "collecte", "Récupéré par le livreur"
        RECU = "recu", "Le vendeur inspecte"
        INSPECTE = "retour_inspecte", "Inspecté"
        CLOS = "clos", "Clos"

    litige = models.OneToOneField(Litige, on_delete=models.CASCADE, related_name="retour")
    etat = models.CharField(max_length=16, choices=Etat.choices, default=Etat.ACCEPTE)
    accepte_le = models.DateTimeField(default=timezone.now)
    deposer_avant = models.DateTimeField()
    depose_le = models.DateTimeField(null=True, blank=True)
    collecte_le = models.DateTimeField(null=True, blank=True)
    recu_le = models.DateTimeField(null=True, blank=True)
    inspecte_le = models.DateTimeField(null=True, blank=True)
    clos_le = models.DateTimeField(null=True, blank=True)
    en_tort = models.CharField(max_length=12, blank=True, default="", help_text="client | vendeur | transporteur")
    rembourse = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Retour"
        verbose_name_plural = "Retours"


class Remplacement(models.Model):
    class Etat(models.TextChoices):  # belivay_moteurs.etats.REMPLACEMENT
        ATTENTE = "attente", "Le vendeur renvoie l'article"
        AUTRE_VENDEUR = "autre_vendeur", "Un autre vendeur l'a"
        EXPEDIE = "expedie", "Nouvel article en route"
        REMIS = "remis", "Remis"
        REMBOURSE = "rembourse", "Remboursé"

    litige = models.OneToOneField(Litige, on_delete=models.CASCADE, related_name="remplacement")
    etat = models.CharField(max_length=14, choices=Etat.choices, default=Etat.ATTENTE)
    debut = models.DateTimeField(default=timezone.now)
    avant = models.DateTimeField(help_text="RET-REMPL-DELAI heures ouvrées, dimanche non compté")
    expedie_le = models.DateTimeField(null=True, blank=True)
    remis_le = models.DateTimeField(null=True, blank=True)
    vendeurs_essayes = models.JSONField(default=list, blank=True, help_text="vendor_id déjà sollicités (DP-01)")
    autre_vendor_id = models.PositiveBigIntegerField(null=True, blank=True)
    autre_product_id = models.PositiveBigIntegerField(null=True, blank=True)
    autre_boutique = models.CharField(max_length=255, blank=True, default="")
    autre_trust = models.PositiveSmallIntegerField(null=True, blank=True)
    ecart = models.PositiveIntegerField(default=0, help_text="payé par BelivaY, le client garde son prix")
    autre_accepte_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Remplacement"
        verbose_name_plural = "Remplacements"


class AvisCommande(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="avis_commandes")
    order_id = models.PositiveBigIntegerField()
    notes = models.JSONField(help_text="une par colis (le vendeur), puis le relais")
    commentaire = models.TextField(blank=True, default="")
    photo = models.FileField(upload_to="avis/%Y/%m/", blank=True, default="")
    note_basse = models.BooleanField(default=False, help_text="AVIS-BAS : un litige a été proposé")
    envoye_le = models.DateTimeField(default=timezone.now)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["client", "order_id"], name="aftersales_avis_commande_unique")]
        verbose_name = "Avis sur une commande"
        verbose_name_plural = "Avis sur les commandes"


class VoteAvis(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="votes_avis")
    review_id = models.PositiveBigIntegerField(help_text="catalog.ProductReview de relaya-marketplace")
    utile = models.BooleanField(default=False)
    signale_le = models.DateTimeField(null=True, blank=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["client", "review_id"], name="aftersales_un_vote_par_client")]
        verbose_name = "Vote sur un avis produit"
        verbose_name_plural = "Votes sur les avis produit"
