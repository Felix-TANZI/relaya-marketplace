# backend/apps/vendeur_argent/models.py
# Argent, versements et accueil du vendeur (paquet « Espace vendeur » : VD-04, VD-09 ; DP-55, DP-56, DP-57).
#
#   Versement          — versement du vendredi (VER-02, VER-04) : référence BLV-VS-nnnn attribuée à l'arrêté du jeudi,
#                        montant dû (versements.montant_du), statut de la machine VERSEMENT des moteurs, essais après un
#                        refus de l'opérateur, numéro masqué figé à l'envoi, « versement non reçu » signalé.
#   VersementCommande  — liaison commande ↔ versement (une commande n'est versée qu'une fois) : gardé et libération.
#   Reprise            — montant déjà versé repris après un litige perdu (vice caché, H7, Q-11) : déduit des versements
#                        suivants (versements.appliquer_reprise), le reste reporté. « BelivaY ne perd jamais » (DP-55).
#   ChangementNumero   — changement du numéro de versement (NUM-01 à NUM-07) : deux codes (nouveau numéro, téléphone
#                        personnel du propriétaire), puis revue humaine VD-NUM-REVUE ; le numéro devient actuel à la fin.
#   EtatAccueil        — alerte avant un seuil masquée (une fois par seuil et par semaine), réseau, dernier envoi de file.
#   ActionEnFile       — geste fait hors connexion (OFF-01 à OFF-05) : rejoué dans l'ordre au retour du réseau ; 72 h.
#
# ANONYMAT (GEN-01) : rien du client ici (ni nom, ni numéro, ni relais) ; le numéro de versement est celui du VENDEUR,
# chiffré au repos (client_core.chiffrement) et masqué à la sortie.
from django.db import models

from apps.vendeur_core.models import Boutique, CommandeVendeur, Membre


class Versement(models.Model):
    class Statut(models.TextChoices):  # belivay_moteurs.etats.VERSEMENT
        PREVU = "prevu"
        REPORTE = "reporte"
        ENVOYE = "envoye"
        CREDITE = "credite"
        REFUSE = "refuse"
        SUSPENDU = "suspendu"

    class Motif(models.TextChoices):  # les trois seuls motifs de refus (REFVD-R98)
        PLEIN = "plein"
        TIERS = "tiers"
        PREFIXE = "prefixe"

    boutique = models.ForeignKey(Boutique, on_delete=models.PROTECT, related_name="versements")
    numero = models.PositiveIntegerField(unique=True, help_text="numéro de série : BLV-VS-nnnn (versements.reference_de_versement)")
    reference = models.CharField(max_length=20, unique=True)
    vendredi = models.DateField()
    montant = models.PositiveIntegerField(help_text="versé, sans frais ni minimum (reprise déduite)")
    repris = models.PositiveIntegerField(default=0, help_text="reprise déduite ce vendredi (appliquer_reprise)")
    operateur = models.CharField(max_length=8, blank=True, default="")
    numero_masque = models.CharField(max_length=40, blank=True, default="", help_text="« MTN ···· 4217 » au moment de l'envoi")
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.PREVU)
    arrete_le = models.DateTimeField(help_text="arrêté du jeudi 23 h 59 (heure de Yaoundé)")
    envoye_le = models.DateTimeField(null=True, blank=True)
    credite_le = models.DateTimeField(null=True, blank=True)
    refus_motif = models.CharField(max_length=8, choices=Motif.choices, blank=True, default="")
    refuse_le = models.DateTimeField(null=True, blank=True)
    refus = models.PositiveSmallIntegerField(default=0, help_text="refus consécutifs (versements.suspendu)")
    essais = models.JSONField(default=list, blank=True, help_text="essais prévus après le refus (ms) : + 24, 48, 72 h")
    essais_faits = models.PositiveSmallIntegerField(default=0)
    signale_le = models.DateTimeField(null=True, blank=True, help_text="« versement non reçu » signalé (VER-03)")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-vendredi", "-numero"]
        verbose_name = "Versement"
        verbose_name_plural = "Versements"

    def __str__(self):
        return f"{self.reference} · {self.montant} F · {self.statut}"


class VersementCommande(models.Model):
    versement = models.ForeignKey(Versement, on_delete=models.CASCADE, related_name="commandes")
    commande = models.OneToOneField(CommandeVendeur, on_delete=models.PROTECT, related_name="versement_lien")
    garde = models.IntegerField()
    liberation = models.DateTimeField()

    class Meta:
        ordering = ["liberation"]
        verbose_name = "Commande versée"
        verbose_name_plural = "Commandes versées"


class Reprise(models.Model):
    boutique = models.ForeignKey(Boutique, on_delete=models.PROTECT, related_name="reprises")
    commande = models.OneToOneField(CommandeVendeur, on_delete=models.PROTECT, related_name="reprise")
    montant = models.PositiveIntegerField(help_text="gardé déjà versé, repris")
    deduit = models.PositiveIntegerField(default=0, help_text="déjà déduit des versements")
    decidee_le = models.DateTimeField()
    motif = models.CharField(max_length=160, blank=True, default="")

    class Meta:
        ordering = ["decidee_le"]
        verbose_name = "Reprise"
        verbose_name_plural = "Reprises"

    @property
    def reste(self) -> int:
        return max(0, self.montant - self.deduit)


class ChangementNumero(models.Model):
    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="changements_numero")
    operateur = models.CharField(max_length=8)
    numero_chiffre = models.BinaryField()
    numero_empreinte = models.CharField(max_length=64)
    masque = models.CharField(max_length=20, help_text="« ···· 4218 »")
    destination = models.CharField(max_length=20, help_text="« 677 •• •• 18 » (étape 2)")
    codes_envoyes_le = models.DateTimeField()
    renvoi_nouveau_le = models.DateTimeField()
    renvoi_personnel_le = models.DateTimeField()
    valide_le = models.DateTimeField(null=True, blank=True)
    revue_jusqua = models.DateTimeField(null=True, blank=True)
    ancien_operateur = models.CharField(max_length=8, blank=True, default="")
    ancien_masque = models.CharField(max_length=20, blank=True, default="")
    applique_le = models.DateTimeField(null=True, blank=True, help_text="fin de la revue : le numéro est devenu actuel")
    annule_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-codes_envoyes_le", "-id"]
        verbose_name = "Changement de numéro de versement"
        verbose_name_plural = "Changements de numéro de versement"


class EtatAccueil(models.Model):
    boutique = models.OneToOneField(Boutique, on_delete=models.CASCADE, related_name="etat_accueil")
    alerte_masquee_le = models.DateField(null=True, blank=True)
    alerte_seuil = models.PositiveSmallIntegerField(null=True, blank=True)
    hors_ligne_depuis = models.DateTimeField(null=True, blank=True)
    dernier_envoi = models.JSONField(null=True, blank=True, help_text="{a, envoyees, expirees, refusees}")

    class Meta:
        verbose_name = "État de l'accueil"
        verbose_name_plural = "États de l'accueil"


class ActionEnFile(models.Model):
    class Type(models.TextChoices):
        PRET = "pret"
        PHOTO = "photo"
        STOCK = "stock"
        MASQUER = "masquer"
        FERMER = "fermer"
        ROUVRIR = "rouvrir"

    class Etat(models.TextChoices):
        EN_ATTENTE = "en_attente"
        EXPIREE = "expiree"
        REFUSEE = "refusee"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="actions_en_file")
    membre = models.ForeignKey(Membre, on_delete=models.SET_NULL, null=True, blank=True, related_name="actions_en_file")
    auteur = models.CharField(max_length=60)
    type = models.CharField(max_length=8, choices=Type.choices)
    objet = models.CharField(max_length=200)
    detail = models.JSONField(null=True, blank=True)
    origine = models.DateTimeField(help_text="heure d'origine du geste (origin_time)")
    lieu = models.CharField(max_length=120, blank=True, default="", help_text="lieu d'origine en mots (origin_geo)")
    etat = models.CharField(max_length=10, choices=Etat.choices, default=Etat.EN_ATTENTE)
    motif = models.CharField(max_length=200, blank=True, default="")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["origine", "id"]
        verbose_name = "Action hors connexion"
        verbose_name_plural = "Actions hors connexion"


class ObjectifMensuel(models.Model):
    """Objectif du mois (« Votre activité », VD-04) : montant gardé visé, propriétaire seulement."""

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="objectifs")
    mois = models.CharField(max_length=7, help_text="AAAA-MM")
    montant = models.PositiveIntegerField()
    maj_le = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["boutique", "mois"], name="vendeur_argent_un_objectif_par_mois")]
        verbose_name = "Objectif du mois"
        verbose_name_plural = "Objectifs du mois"
