# backend/apps/wallet/models.py
# Argent du client : moyens de paiement Mobile Money, cartes enregistrées chez le prestataire, portefeuille.
#
#   MoyenPaiement       — numéros Mobile Money MTN et Orange en plus du numéro du compte (CCO-14, CCO-15, CIN-43) :
#                         vérifiés par un code SMS (objet « moyen »), chiffrés au repos (CAP-21 : BinaryField +
#                         empreinte + forme masquée). Le numéro du compte n'est PAS ici : il vient du compte (il ne
#                         se retire pas, il se change) ; il est « par défaut » quand aucun autre ne l'est.
#   CarteEnregistree    — Visa ou Mastercard (DP-23) : le numéro n'arrive jamais au serveur (CAP-24) ; on garde le
#                         jeton du prestataire (chiffré), la marque, les 4 derniers chiffres, l'expiration.
#   Portefeuille (CWL-01 à CWL-12, FF-WALLET) — registre à écritures + état :
#       Mouvement           — une ligne signée par crédit ou débit (recharge, remboursement, paiement, cagnotte,
#                             retrait) : l'historique montré au client ; Σ montants = solde.
#       EtatPortefeuille    — la part « remboursée » (retirable sans frais, DP-48) ;
#       Recharge            — chaque recharge et son reste (le moteur prend les plus anciennes d'abord) ;
#       Retrait             — chaque retrait, sa part prise sur l'argent rechargé (retrait gratuit du mois) et le
#                             détail de ce qu'il a pris (pour le rendre à l'identique si le versement échoue).
#   Le moteur belivay_moteurs.portefeuille.Portefeuille se reconstruit à partir de ces tables (services.py).
#
# Montants en francs entiers. Aucune ForeignKey vers les modèles de relaya (principe du pont).

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Operateur(models.TextChoices):
    MTN = "MTN", "MTN MoMo"
    ORANGE = "Orange", "Orange Money"


class MoyenPaiement(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="moyens_mobile_money")
    operateur = models.CharField(max_length=10, choices=Operateur.choices)
    numero_chiffre = models.BinaryField(help_text="numéro local à 9 chiffres, chiffré (CAP-21)")
    numero_empreinte = models.CharField(max_length=64, help_text="HMAC du numéro local : recherche sans déchiffrer")
    numero_masque = models.CharField(max_length=40, help_text="« 6 77 ·· ·· 41 »")
    verifie_le = models.DateTimeField(null=True, blank=True, help_text="vide tant que le code SMS n'est pas saisi")
    par_defaut = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["client", "numero_empreinte"], name="wallet_moyen_unique")]
        ordering = ["cree_le", "pk"]
        verbose_name = "Moyen de paiement Mobile Money"
        verbose_name_plural = "Moyens de paiement Mobile Money"

    def __str__(self):
        return f"{self.operateur} · {self.numero_masque}"

    @property
    def ident(self) -> str:
        """Identifiant donné au site (« m12 ») ; « compte » désigne le numéro du compte."""
        return f"m{self.pk}"


class CarteEnregistree(models.Model):
    class Marque(models.TextChoices):
        VISA = "Visa", "Visa"
        MASTERCARD = "Mastercard", "Mastercard"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cartes_client")
    jeton_chiffre = models.BinaryField(help_text="jeton du prestataire (jamais le numéro de carte, CAP-24), chiffré")
    marque = models.CharField(max_length=12, choices=Marque.choices)
    derniers = models.CharField(max_length=4)
    expire = models.CharField(max_length=5, help_text="« 08/29 »")
    titulaire = models.CharField(max_length=120, blank=True, default="")
    pays = models.CharField(max_length=80, blank=True, default="", help_text="pays d'émission donné par le prestataire")
    par_defaut = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["client", "marque", "derniers", "expire"], name="wallet_carte_unique")]
        ordering = ["cree_le", "pk"]
        verbose_name = "Carte enregistrée"
        verbose_name_plural = "Cartes enregistrées"

    def __str__(self):
        return f"{self.marque} •••• {self.derniers}"

    @property
    def ident(self) -> str:
        return f"c{self.pk}"


class EtatPortefeuille(models.Model):
    client = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="portefeuille_client")
    rembourse = models.PositiveIntegerField(default=0, help_text="argent venu de remboursements et de la cagnotte : retiré sans frais")
    numero_change_le = models.DateTimeField(
        null=True, blank=True, help_text="dernier changement du numéro du compte : WALLET-NUMERO-ATTENTE"
    )
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Portefeuille"
        verbose_name_plural = "Portefeuilles"

    def __str__(self):
        return f"Portefeuille de {self.client_id}"


class Recharge(models.Model):
    class Etat(models.TextChoices):
        ATTENTE = "attente", "Demande envoyée, en attente de l'opérateur"
        CONFIRMEE = "confirmee", "Confirmée (webhook signé, CWL-03) : créditée"
        ECHEC = "echec", "Refusée ou expirée"
        RENDUE = "rendue", "Encaissée mais refusée par les règles (plafond) : rendue au numéro"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="recharges_portefeuille")
    montant = models.PositiveIntegerField()
    restant = models.PositiveIntegerField(default=0, help_text="ce qui reste de cette recharge dans le solde")
    a_servi = models.BooleanField(default=False, help_text="a payé (en partie) une commande : retirable sans attendre")
    reference = models.CharField(max_length=60, unique=True, help_text="référence envoyée à l'agrégateur (RCH-…)")
    operateur = models.CharField(max_length=10, choices=Operateur.choices)
    numero_chiffre = models.BinaryField(help_text="numéro local, chiffré (CAP-21) : pour rendre ou verser l'argent")
    numero_masque = models.CharField(max_length=40)
    etat = models.CharField(max_length=10, choices=Etat.choices, default=Etat.ATTENTE)
    demandee_le = models.DateTimeField(default=timezone.now)
    confirmee_le = models.DateTimeField(null=True, blank=True, help_text="instant du crédit : départ de WALLET-RECHARGE-ATTENTE")

    class Meta:
        ordering = ["confirmee_le", "pk"]
        indexes = [models.Index(fields=["client", "etat"])]
        verbose_name = "Recharge du portefeuille"
        verbose_name_plural = "Recharges du portefeuille"

    def __str__(self):
        return f"{self.reference} · {self.montant} F · {self.etat}"


class Retrait(models.Model):
    class Etat(models.TextChoices):
        EN_COURS = "en_cours", "Versement demandé"
        VERSE = "verse", "Versé"
        ECHEC = "echec", "Versement refusé : rendu au portefeuille"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="retraits_portefeuille")
    montant = models.PositiveIntegerField(help_text="débité du solde")
    part_rechargee = models.PositiveIntegerField(help_text="prise sur l'argent rechargé : compte pour le retrait gratuit du mois")
    part_remboursee = models.PositiveIntegerField()
    frais = models.PositiveIntegerField(default=0, help_text="WALLET-RETRAIT-FRAIS, retenus sur le montant versé")
    prises = models.JSONField(default=list, blank=True, help_text="[{recharge: id, prise: F}] : pour rendre à l'identique")
    reference = models.CharField(max_length=60, unique=True)
    operateur = models.CharField(max_length=10, choices=Operateur.choices)
    numero_chiffre = models.BinaryField(help_text="numéro local, chiffré (CAP-21) : pour rendre ou verser l'argent")
    numero_masque = models.CharField(max_length=40)
    etat = models.CharField(max_length=10, choices=Etat.choices, default=Etat.EN_COURS)
    le = models.DateTimeField(default=timezone.now)
    verse_au_plus_tard = models.DateTimeField(null=True, blank=True, help_text="WALLET-RETRAIT-H")
    verse_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["le", "pk"]
        indexes = [models.Index(fields=["client", "le"])]
        verbose_name = "Retrait du portefeuille"
        verbose_name_plural = "Retraits du portefeuille"

    def __str__(self):
        return f"{self.reference} · {self.montant} F · {self.etat}"


class Mouvement(models.Model):
    """Registre à écritures : une ligne signée par mouvement ; jamais modifiée, jamais supprimée."""

    class Type(models.TextChoices):
        RECHARGE = "recharge", "Recharge"
        REMBOURSEMENT = "remboursement", "Remboursement"
        PAIEMENT = "paiement", "Paiement d'une commande"
        CAGNOTTE = "cagnotte", "Cagnotte de l'abonnement"
        RETRAIT = "retrait", "Retrait (ou retrait rendu)"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="mouvements_portefeuille")
    type = models.CharField(max_length=14, choices=Type.choices)
    montant = models.IntegerField(help_text="positif : crédit ; négatif : débit")
    libelle = models.CharField(max_length=160)
    reference = models.CharField(max_length=60, blank=True, default="", help_text="recharge, retrait, commande… : rend l'écriture unique")
    le = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-le", "-pk"]
        constraints = [
            models.UniqueConstraint(
                fields=["client", "type", "reference"], condition=~Q(reference=""), name="wallet_mouvement_reference_unique"
            )
        ]
        verbose_name = "Mouvement du portefeuille"
        verbose_name_plural = "Mouvements du portefeuille"

    def __str__(self):
        return f"{self.type} {self.montant:+d} F · {self.libelle}"
