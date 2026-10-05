# backend/apps/diaspora/models.py
# Diaspora et proches (DP-54) : un compte ouvert depuis l'étranger commande pour un proche au Cameroun, relié par un
# lien famille. Le lien ne naît qu'avec l'accord du proche : son code famille (24 h, usage unique), l'acceptation
# d'une invitation dans son application, ou la réponse à une invitation par numéro. Le compte diaspora ne voit que
# le prénom du proche et le quartier du relais qu'il a choisi ; jamais son numéro, son adresse ni ses autres
# commandes. Le proche voit le prénom et le pays de celui qui paie. Chacun retire le lien quand il veut.
#
#   CompteDiaspora   — pays, ville, indicatif, numéro étranger vérifié (chiffré, CAP-21), devise d'affichage.
#                      Le type de compte est aussi écrit dans client_accounts.ProfilClient (type_compte) si
#                      l'application est installée.
#   CodeFamille      — côté Cameroun : à donner au proche à l'étranger (24 h, usage unique).
#   Invitation       — côté diaspora : lien partageable (QR, WhatsApp, SMS) accepté par le proche.
#   LienFamille      — diaspora ↔ proche, état, relais choisi par le proche et sa livraison à domicile.
#   DemandeProche    — panier envoyé par le proche à son proche diaspora pour qu'il le paie (7 jours).
#   CommandeDiaspora — commande payée pour un proche, vue de celui qui paie (jamais le code ni l'adresse).

from django.conf import settings
from django.db import models


class CompteDiaspora(models.Model):
    class Devise(models.TextChoices):
        XAF = "XAF", "Franc CFA"
        EUR = "EUR", "Euro"
        USD = "USD", "Dollar US"

    client = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="compte_diaspora")
    pays = models.CharField(max_length=60)
    ville = models.CharField(max_length=80)
    indicatif = models.CharField(max_length=6)
    numero_chiffre = models.BinaryField(help_text="numéro étranger vérifié par SMS, chiffré (CAP-21)")
    numero_empreinte = models.CharField(max_length=64, db_index=True)
    numero_masque = models.CharField(max_length=40)
    devise = models.CharField(max_length=3, choices=Devise.choices, default=Devise.XAF)
    naissance = models.DateField()
    proche_actif = models.ForeignKey(
        "LienFamille", on_delete=models.SET_NULL, null=True, blank=True, related_name="+", help_text="« Pour qui ? » (choisirProche)"
    )
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Compte diaspora"
        verbose_name_plural = "Comptes diaspora"

    def __str__(self):
        return f"{self.client} · {self.pays}"


class CodeFamille(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="codes_famille")
    code = models.CharField(max_length=12, unique=True)
    jusqua = models.DateTimeField()
    utilise_le = models.DateTimeField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Code famille"
        verbose_name_plural = "Codes famille"


class Invitation(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="invitations_diaspora")
    code = models.CharField(max_length=12, unique=True)
    jusqua = models.DateTimeField()
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Invitation diaspora"
        verbose_name_plural = "Invitations diaspora"


class LienFamille(models.Model):
    class Etat(models.TextChoices):
        INVITE = "invite", "Invité (en attente du proche)"
        ACTIF = "actif", "Actif"
        REFUSE = "refuse", "Refusé par le proche"
        RETIRE = "retire", "Retiré"

    class Prefere(models.TextChoices):
        RELAIS = "relais", "Relais"
        DOMICILE = "domicile", "Domicile"

    diaspora = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="liens_diaspora")
    proche = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="liens_proche")
    prenom_invite = models.CharField(max_length=80, blank=True, default="", help_text="prénom donné à l'invitation par numéro")
    numero_chiffre = models.BinaryField(null=True, blank=True, help_text="invitation par numéro : chiffré (CAP-21)")
    numero_empreinte = models.CharField(max_length=64, blank=True, default="", db_index=True)
    etat = models.CharField(max_length=7, choices=Etat.choices, default=Etat.INVITE)
    relay_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="relais choisi par le proche")
    domicile = models.BooleanField(default=False, help_text="le proche accepte la livraison chez lui (adresse jamais montrée)")
    prefere = models.CharField(max_length=8, choices=Prefere.choices, default=Prefere.RELAIS)
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]
        verbose_name = "Lien famille"
        verbose_name_plural = "Liens famille"

    def __str__(self):
        return f"{self.diaspora} ↔ {self.proche or self.prenom_invite} ({self.etat})"


class DemandeProche(models.Model):
    class Etat(models.TextChoices):
        ATTENTE = "attente", "En attente"
        PAYEE = "payee", "Payée"
        REFUSEE = "refusee", "Refusée"
        ANNULEE = "annulee", "Annulée"
        EXPIREE = "expiree", "Expirée"

    lien = models.ForeignKey(LienFamille, on_delete=models.CASCADE, related_name="demandes")
    lignes = models.JSONField(help_text="[{product_id, titre, qte, prix, boutique, classe}] au moment de l'envoi")
    sous_total = models.PositiveIntegerField()
    livraison = models.CharField(max_length=8, default="relais")
    frais_relais = models.PositiveIntegerField()
    frais_domicile = models.PositiveIntegerField()
    mot = models.CharField(max_length=120, blank=True, default="")
    jusqua = models.DateTimeField()
    etat = models.CharField(max_length=8, choices=Etat.choices, default=Etat.ATTENTE)
    order_id = models.PositiveBigIntegerField(null=True, blank=True)
    mot_refus = models.CharField(max_length=120, blank=True, default="")
    supplement_par = models.CharField(max_length=12, blank=True, default="")
    payee_le = models.DateTimeField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        verbose_name = "Panier envoyé à un proche diaspora"
        verbose_name_plural = "Paniers envoyés aux proches diaspora"


class CommandeDiaspora(models.Model):
    class Paiement(models.TextChoices):
        ACTION = "action", "3-D Secure à valider"
        PAYE = "paye", "Payé"
        REMBOURSE = "rembourse", "Remboursé"

    lien = models.ForeignKey(LienFamille, on_delete=models.PROTECT, related_name="commandes")
    payeur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="commandes_pour_proches")
    order_id = models.PositiveBigIntegerField(unique=True)
    montant = models.PositiveIntegerField(help_text="francs, frais de service compris")
    devise = models.CharField(max_length=3, default="EUR")
    en_devise = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    taux = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    carte = models.CharField(max_length=40, blank=True, default="", help_text="« Visa •••• 4242 »")
    articles = models.PositiveIntegerField(default=0)
    mot = models.CharField(max_length=80, blank=True, default="")
    livraison = models.CharField(max_length=8, default="relais")
    moyen = models.CharField(max_length=6, default="carte")
    demande = models.ForeignKey(DemandeProche, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    a_la_remise = models.PositiveIntegerField(default=0)
    pays_carte = models.CharField(max_length=60, blank=True, default="")
    reference = models.CharField(max_length=80, blank=True, default="")
    etat_paiement = models.CharField(max_length=10, choices=Paiement.choices, default=Paiement.PAYE)
    rembourse = models.PositiveIntegerField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        verbose_name = "Commande pour un proche"
        verbose_name_plural = "Commandes pour des proches"

    @property
    def ref(self) -> str:
        return f"BLV-{self.order_id}"
