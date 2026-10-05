# backend/apps/pickup/models.py
# Commande vue du client, après le paiement : montants figés, sous-commandes (une boutique = un colis, CCY-15),
# groupes de remise (un code de retrait), garde, comptoir, changements de lieu.
#
# relaya-marketplace a UNE commande par panier (orders.Order) et un envoi par vendeur (shipping.Shipment), sans
# sous-commande : c'est le plus gros écart de modèle (CORRESPONDANCE-RELAYA.md § 1.3). Le kit ajoute ces tables À
# CÔTÉ de Order (order_id), sans la modifier :
#
#   MontantsCommande  — S, Ram, Rem, Suppl, Off, total, frais de service, version des paramètres : figés au paiement,
#                       pour qu'une annulation ou un litige se recalcule avec les règles du jour du paiement (CCH-15).
#                       Tient aussi le cumul remboursé (anomalie A6 : amount_refunded_xaf jamais tenu chez relaya).
#   SousCommande      — machine belivay_moteurs.etats.SOUS_COMMANDE ; lignes (LigneSousCommande).
#   GroupeRemise      — un code à 6 chiffres + QR par groupe ; J0, garde (moteur garde.py), essais faux, renvois.
#   HorairesRelais    — horaires structurés d'un relais (relaya : texte libre), nécessaires à la garde (jour fermé
#                       jamais facturé) et aux rappels S0 à S5.
#   CompteComptoir    — refus au comptoir d'un client (CCP-04 : deux refus, paiement d'avance obligatoire).
#   ChangementLieu    — relais ou adresse changés, transfert d'un colis arrivé (CAL-25, DP-37, DP-42).

from django.conf import settings
from django.db import models


class MontantsCommande(models.Model):
    class Mode(models.TextChoices):
        RELAIS = "relais", "Relais"
        DOMICILE = "domicile", "Domicile"

    class EtatPaiement(models.TextChoices):
        ATTENTE = "attente", "En attente de validation"
        PAYEE = "payee", "Payée"
        ECHEC = "echec", "Échec"

    order_id = models.PositiveBigIntegerField(unique=True, help_text="orders.Order de relaya-marketplace")
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="montants_commandes")
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.RELAIS)
    relay_id = models.PositiveBigIntegerField(null=True, blank=True)
    adresse_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="client_accounts.Adresse")
    lieu = models.CharField(max_length=160, blank=True, default="", help_text="« Relais Mvog-Ada » ou « Maison · Mvog-Ada »")
    # Moteur frais.py (CAL-06) ; francs entiers
    sous_total = models.PositiveIntegerField()
    ramassages = models.PositiveIntegerField()
    remises = models.PositiveIntegerField()
    supplements = models.PositiveIntegerField(default=0)
    offert = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(help_text="S + Ram + Rem + Suppl − Off")
    seuil = models.PositiveIntegerField(default=0)
    frais_service = models.PositiveIntegerField(default=0, help_text="carte : PAY-CARTE-FRAIS (2 %)")
    prime = models.PositiveIntegerField(default=0, help_text="remise de l'abonnement sur la livraison")
    version_parametres = models.CharField(max_length=40)
    # Paiement
    moyen = models.CharField(max_length=10, help_text="mtn | orange | autre | wallet | carte | apple | google")
    numero_masque = models.CharField(max_length=40, blank=True, default="")
    comptoir = models.BooleanField(default=False)
    avance = models.PositiveIntegerField(default=0, help_text="payé maintenant (comptoir : la livraison seule)")
    du_au_retrait = models.PositiveIntegerField(default=0)
    devise = models.CharField(max_length=3, default="XAF")
    montant_devise = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    taux_devise = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    etat_paiement = models.CharField(max_length=10, choices=EtatPaiement.choices, default=EtatPaiement.ATTENTE)
    cause_echec = models.CharField(max_length=10, blank=True, default="", help_text="expire | solde | carte")
    expire_le = models.DateTimeField(null=True, blank=True, help_text="fin de la demande Mobile Money")
    payee_le = models.DateTimeField(null=True, blank=True)
    payeur = models.JSONField(null=True, blank=True, help_text="payé par un proche à l'étranger (PanierPartage.payeur)")
    tout_en_ordre_le = models.DateTimeField(null=True, blank=True, help_text="« Tout est en ordre » : ferme la fenêtre de retour")
    # Argent rendu (anomalie A6 de relaya : tenu ici)
    rembourse = models.PositiveIntegerField(default=0)
    service_reparti = models.PositiveIntegerField(default=0, help_text="frais de service déjà rendus ou acquis (CET-24)")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Montants figés d'une commande"
        verbose_name_plural = "Montants figés des commandes"

    def __str__(self):
        return f"BLV-{self.order_id} · {self.total} F"

    @property
    def ref(self) -> str:
        return f"BLV-{self.order_id}"

    @property
    def encaisse(self) -> int:
        """Ce que la commande a réellement encaissé, hors frais de service (moteur annulation.annuler)."""
        return self.avance if self.comptoir else self.total


class GroupeRemise(models.Model):
    """Un code de retrait pour les colis d'une commande au même relais (CAL-19 ; dissociation DP-32)."""

    order_id = models.PositiveBigIntegerField(db_index=True)
    relay_id = models.PositiveBigIntegerField(null=True, blank=True)
    code_chiffre = models.BinaryField(help_text="6 chiffres, chiffré (CAP-18, CAP-21)")
    code_empreinte = models.CharField(max_length=64)
    accuse_fort_le = models.DateTimeField(null=True, blank=True, help_text="premier accusé fort : fixe J0 (CAL-19)")
    valeur = models.PositiveIntegerField(default=0, help_text="valeur des colis : plafond de la garde")
    montant_paye = models.PositiveIntegerField(default=0, help_text="payé par le client : retenue au plus (DP-24)")
    gros = models.BooleanField(default=False, help_text="au moins un carton C1 ou C2")
    jours_suspendus = models.JSONField(default=list, blank=True, help_text="dates AAAA-MM-JJ : litige, groupage, transfert")
    rappels_non_delivres = models.JSONField(default=list, blank=True, help_text="dates AAAA-MM-JJ (CSM-30)")
    essais_faux = models.PositiveSmallIntegerField(default=0)
    bloque_jusqua = models.DateTimeField(null=True, blank=True)
    renvois = models.JSONField(default=list, blank=True, help_text="instants (ms) des renvois du code")
    retire_le = models.DateTimeField(null=True, blank=True)
    renvoye_le = models.DateTimeField(null=True, blank=True, help_text="renvoyé au vendeur après le 7e jour")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Groupe de remise"
        verbose_name_plural = "Groupes de remise"

    def __str__(self):
        return f"BLV-{self.order_id} · groupe {self.pk}"


class SousCommande(models.Model):
    """Une boutique d'une commande = un colis (CCY-15). États : belivay_moteurs.etats.SOUS_COMMANDE."""

    class Etat(models.TextChoices):
        PAYEE = "payee", "Payée · pas encore confirmée"
        CONFIRMEE = "confirmee", "Confirmée · en préparation"
        PRETE = "prete", "Prête"
        COLLECTEE = "collectee", "Collectée par le livreur"
        ARRIVEE_RELAIS = "arrivee_relais", "Arrivée au relais"
        EN_LIVRAISON_DOMICILE = "en_livraison_domicile", "En livraison à domicile"
        REMISE = "remise", "Remise au client"
        EN_LITIGE = "en_litige", "En litige"
        RETOUR_EN_COURS = "retour_en_cours", "Retour en cours"
        RENVOYEE_VENDEUR = "renvoyee_vendeur", "Renvoyée au vendeur"
        ANNULEE = "annulee", "Annulée"

    class AnnuleePar(models.TextChoices):
        CLIENT = "toi", "Le client"
        VENDEUR = "vendeur", "Le vendeur"
        BELIVAY = "belivay", "BelivaY"

    order_id = models.PositiveBigIntegerField(db_index=True)
    n = models.PositiveSmallIntegerField(help_text="numéro du colis dans la commande (1, 2…)")
    vendor_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="vendors.VendorProfile")
    boutique = models.CharField(max_length=255)
    zone = models.CharField(max_length=120, blank=True, default="")
    classe = models.CharField(max_length=2, default="S", help_text="S, M, L, XL, HG : la plus grande classe de ses articles")
    sous_total = models.PositiveIntegerField()
    etat = models.CharField(max_length=24, choices=Etat.choices, default=Etat.PAYEE)
    relay_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="relais de destination (peut changer : transfert)")
    groupe = models.ForeignKey(GroupeRemise, on_delete=models.SET_NULL, null=True, blank=True, related_name="colis")
    etagere = models.CharField(max_length=20, blank=True, default="")
    gros = models.BooleanField(default=False, help_text="carton C1 ou C2 : + GARDE-GROS-AJOUT par jour")
    collectee_le = models.DateTimeField(null=True, blank=True)
    arrivee_le = models.DateTimeField(null=True, blank=True)
    remise_le = models.DateTimeField(null=True, blank=True, help_text="retrait ou remise : ouvre la fenêtre de retour")
    annulee_le = models.DateTimeField(null=True, blank=True)
    annulee_par = models.CharField(max_length=10, choices=AnnuleePar.choices, blank=True, default="")
    motif_annulation = models.CharField(max_length=255, blank=True, default="")
    rembourse = models.PositiveIntegerField(default=0)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["order_id", "n"], name="pickup_sous_commande_unique")]
        ordering = ["order_id", "n"]
        verbose_name = "Sous-commande (colis)"
        verbose_name_plural = "Sous-commandes (colis)"

    def __str__(self):
        return f"{self.ref} · {self.boutique}"

    @property
    def ref(self) -> str:
        """Identifiant d'un colis dans les routes : « 52018-2 » (commande, numéro) ; décision D6."""
        return f"{self.order_id}-{self.n}"

    @property
    def statut_colis(self) -> str:
        """StatutColis du site : attente | preparation | pret | recupere."""
        return {
            self.Etat.PAYEE: "attente",
            self.Etat.CONFIRMEE: "preparation",
            self.Etat.PRETE: "pret",
        }.get(self.etat, "recupere")

    @property
    def collectee(self) -> bool:
        return self.etat not in (self.Etat.PAYEE, self.Etat.CONFIRMEE, self.Etat.PRETE, self.Etat.ANNULEE)


class LigneSousCommande(models.Model):
    sous_commande = models.ForeignKey(SousCommande, on_delete=models.CASCADE, related_name="lignes")
    product_id = models.PositiveBigIntegerField()
    titre = models.CharField(max_length=200)
    prix = models.PositiveIntegerField()
    qte = models.PositiveIntegerField()
    classe = models.CharField(max_length=2, default="S")

    class Meta:
        verbose_name = "Ligne d'une sous-commande"
        verbose_name_plural = "Lignes des sous-commandes"


class HorairesRelais(models.Model):
    relay_id = models.PositiveBigIntegerField(unique=True, help_text="accounts.RelayPointProfile")
    ouverture = models.TimeField()
    fermeture = models.TimeField()
    jours_fermes = models.JSONField(default=list, blank=True, help_text="0 = lundi … 6 = dimanche")
    fermetures = models.JSONField(default=list, blank=True, help_text="fermetures exceptionnelles, AAAA-MM-JJ")

    class Meta:
        verbose_name = "Horaires d'un relais"
        verbose_name_plural = "Horaires des relais"


class CompteComptoir(models.Model):
    client = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="compte_comptoir")
    refus = models.PositiveSmallIntegerField(default=0, help_text="refus sans motif d'une commande validée au comptoir")

    class Meta:
        verbose_name = "Compte comptoir"
        verbose_name_plural = "Comptes comptoir"


class ChangementLieu(models.Model):
    class Type(models.TextChoices):
        RELAIS = "relais", "Autre relais"
        ADRESSE = "adresse", "Autre adresse"
        TRANSFERT = "transfert", "Transfert d'un colis arrivé"

    order_id = models.PositiveBigIntegerField(db_index=True)
    type = models.CharField(max_length=10, choices=Type.choices)
    vers_relay_id = models.PositiveBigIntegerField(null=True, blank=True)
    vers_adresse_id = models.PositiveBigIntegerField(null=True, blank=True)
    transfert = models.PositiveIntegerField(default=0)
    garde_due = models.PositiveIntegerField(default=0)
    montant_du = models.PositiveIntegerField(default=0, help_text="une seule demande Mobile Money")
    deux_codes = models.BooleanField(default=False)
    trace = models.JSONField(default=list, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Changement de lieu"
        verbose_name_plural = "Changements de lieu"
