# backend/apps/vendeur_croissance/models.py
# Croissance du vendeur (VD-10) : Trust Score tel que le service Scores de relaya le donne (Q-37), décisions et
# contestation, plans et paiements, récompenses au mérite, services, chiffres et demande de la zone.
# Les relevés du jour (score, commandes livrées, note, visite, audit) restent dans vendeur_core.Boutique ; cette
# application garde ce que le socle n'a pas :
#
#   CritereScore        — les six critères pondérés du score (note sur 100, poids, détail en mots).
#   EvenementScore      — journal IMMUABLE des événements qui font bouger le score (SCO-04) : ajout seul.
#   ReleveScore         — un relevé par nuit (score et conditions du jour : EtatDuJour du moteur des paliers).
#   ProjectionScore     — projection du service Scores (commandes sans incident → score d'arrivée ; litiges).
#   Decision            — avertissement, visibilité réduite, suspension, exclusion, descente de palier (SAN-*).
#   Contestation        — une seule par décision (OneToOne), réponse humaine sous 72 h ouvrées (CON-01, Q-53).
#   EtatAbonnement      — facturation du plan en cours (Boutique.plan), essais faits, arrêt demandé, paiement échoué.
#   DemandePaiement     — demande Mobile Money (plan, service) ; rien n'est activé avant sa confirmation (PLN-04).
#   MeriteVisibilite    — récompense au mérite gagnée (offre la moins chère livrée de la zone N jours de suite, P-3).
#   UtilisationRecompense — vitrine de quartier utilisée, vente flash programmée (une par mois).
#   RechercheZone       — recherches sans résultat d'une zone (GET /demand, idée du jour de l'accueil).
#   VuesOffre           — vues d'une offre par jour (service des statistiques).
#   FreinReleve         — frein relevé par BelivaY (attribution…) montré dans « Demande de la zone ».
# ANONYMAT (GEN-01) : aucune de ces tables ne garde un client ; un événement nomme la commande, jamais le client.
from django.db import models

from apps.vendeur_core.models import Boutique, Membre, Offre


class CritereScore(models.Model):
    class Cle(models.TextChoices):
        PONCTUALITE = "ponctualite", "Ponctualité"
        QUALITE = "qualite", "Qualité"
        SATISFACTION = "satisfaction", "Satisfaction"
        LITIGES = "litiges", "Litiges"
        DOCUMENTS = "documents", "Documents"
        ANCIENNETE = "anciennete", "Ancienneté"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="criteres_score")
    cle = models.CharField(max_length=14, choices=Cle.choices)
    poids = models.PositiveSmallIntegerField(help_text="en % (25)")
    note = models.DecimalField(max_digits=4, decimal_places=1, help_text="sur 100 (69,6)")
    detail = models.CharField(max_length=200, blank=True, default="")
    maj_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Critère du score"
        verbose_name_plural = "Critères du score"
        constraints = [models.UniqueConstraint(fields=["boutique", "cle"], name="croissance_un_critere_par_cle")]


class JournalImmuable(Exception):
    pass


class EvenementScore(models.Model):
    class Effet(models.TextChoices):
        SUCCES = "succes"
        NEUTRE = "neutre"
        LEGER = "leger"
        MOYEN = "moyen"
        GRAVE = "grave"
        AUCUN = "aucun"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="evenements_score")
    a = models.DateTimeField()
    libelle = models.CharField(max_length=160)
    effet = models.CharField(max_length=8, choices=Effet.choices)
    critere = models.CharField(max_length=14, choices=CritereScore.Cle.choices, blank=True, default="")
    ref = models.CharField(max_length=30, blank=True, default="", help_text="commande liée (jamais le client)")

    class Meta:
        ordering = ["-a", "-id"]
        verbose_name = "Événement du score"
        verbose_name_plural = "Journal du score"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise JournalImmuable("le journal du score est en ajout seul (SCO-04)")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise JournalImmuable("le journal du score est en ajout seul (SCO-04)")


class ReleveScore(models.Model):
    """Relevé de la nuit (recalcul du service Scores) : EtatDuJour du moteur des paliers."""

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="releves_score")
    jour = models.DateField()
    score = models.DecimalField(max_digits=4, decimal_places=1)
    commandes_livrees = models.PositiveIntegerField(default=0)
    note = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    visite = models.BooleanField(default=False)
    audit = models.BooleanField(default=False)

    class Meta:
        ordering = ["jour"]
        verbose_name = "Relevé de la nuit"
        verbose_name_plural = "Relevés de la nuit"
        constraints = [models.UniqueConstraint(fields=["boutique", "jour"], name="croissance_un_releve_par_nuit")]


class ProjectionScore(models.Model):
    """Projection du service Scores (VD10-R07, REFVD-R204) : « 3 commandes sans incident mènent à environ 66 »."""

    boutique = models.OneToOneField(Boutique, on_delete=models.CASCADE, related_name="projection_score")
    commandes = models.PositiveIntegerField()
    score_apres = models.DecimalField(max_digits=4, decimal_places=1)
    si_gagnes = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    si_perdus = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    calculee_le = models.DateTimeField()

    class Meta:
        verbose_name = "Projection du score"


class Decision(models.Model):
    class Type(models.TextChoices):
        AVERTISSEMENT = "avertissement"
        VISIBILITE_REDUITE = "visibilite_reduite"
        SUSPENSION = "suspension"
        EXCLUSION = "exclusion"
        DESCENTE = "descente"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="decisions")
    ident = models.CharField(max_length=40, unique=True, help_text="« DEC-2026-0918-S3 »")
    type = models.CharField(max_length=20, choices=Type.choices)
    niveau = models.PositiveSmallIntegerField(null=True, blank=True, help_text="1 à 4 ; vide pour une descente")
    palier_vise = models.CharField(max_length=8, blank=True, default="", help_text="descente : palier d'arrivée")
    decidee_a = models.DateTimeField()
    effet_a = models.DateTimeField()
    motif = models.TextField()
    validee_par = models.CharField(max_length=120, blank=True, default="", help_text="vide : avertissement automatique (SAN-01)")
    levee_a = models.DateTimeField(null=True, blank=True, help_text="suspension levée par une personne : la période probatoire commence")
    annulee_a = models.DateTimeField(null=True, blank=True, help_text="annulée (contestation acceptée)")

    class Meta:
        ordering = ["-decidee_a", "-id"]
        verbose_name = "Décision (sanction ou palier)"
        verbose_name_plural = "Décisions"

    def __str__(self):
        return self.ident


class Contestation(models.Model):
    class Issue(models.TextChoices):
        MAINTENUE = "maintenue"
        ANNULEE = "annulee"

    decision = models.OneToOneField(Decision, on_delete=models.CASCADE, related_name="contestation")
    membre = models.ForeignKey(Membre, on_delete=models.SET_NULL, null=True, blank=True)
    envoyee_a = models.DateTimeField()
    texte = models.TextField()
    preuves = models.JSONField(default=list, blank=True)
    reponse_avant = models.DateTimeField()
    reponse_a = models.DateTimeField(null=True, blank=True)
    issue = models.CharField(max_length=10, choices=Issue.choices, blank=True, default="")
    motif_reponse = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Contestation"


class EtatAbonnement(models.Model):
    class Facturation(models.TextChoices):
        MENSUELLE = "mensuelle"
        ANNUELLE = "annuelle"
        ESSAI = "essai"

    boutique = models.OneToOneField(Boutique, on_delete=models.CASCADE, related_name="abonnement")
    facturation = models.CharField(max_length=10, choices=Facturation.choices, blank=True, default="")
    depuis = models.DateField(null=True, blank=True)
    essais = models.JSONField(default=list, blank=True, help_text="plans déjà essayés (un essai par plan)")
    premier_paiement_confirme = models.BooleanField(default=False)
    arret = models.BooleanField(default=False, help_text="« Arrêter » : retour à Free à la fin de la période")
    echec_le = models.DateField(null=True, blank=True, help_text="paiement échoué : grâce de 7 jours (PLN-02)")

    class Meta:
        verbose_name = "Abonnement (plan)"


class DemandePaiement(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente"
        CONFIRME = "confirme"
        REFUSE = "refuse"

    class Quoi(models.TextChoices):
        PLAN = "plan"
        SERVICE = "service"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="demandes_paiement")
    membre = models.ForeignKey(Membre, on_delete=models.SET_NULL, null=True, blank=True)
    montant = models.PositiveIntegerField()
    objet = models.CharField(max_length=120, help_text="« Boost · un mois »")
    envoyee_a = models.DateTimeField()
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.EN_ATTENTE)
    quoi = models.CharField(max_length=8, choices=Quoi.choices)
    plan = models.CharField(max_length=6, blank=True, default="")
    facturation = models.CharField(max_length=10, blank=True, default="")
    service = models.CharField(max_length=20, blank=True, default="")
    confirmee_a = models.DateTimeField(null=True, blank=True)
    refusee_a = models.DateTimeField(null=True, blank=True)
    visite_avant = models.DateTimeField(null=True, blank=True, help_text="service : visite de l'agent avant (72 h ouvrées)")
    visite_faite_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-envoyee_a", "-id"]
        verbose_name = "Demande de paiement (Mobile Money)"
        verbose_name_plural = "Demandes de paiement"


class MeriteVisibilite(models.Model):
    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="merites")
    offre = models.ForeignKey(Offre, on_delete=models.CASCADE, related_name="merites")
    gagne_le = models.DateField()
    raison = models.CharField(max_length=80, help_text="« du 8 au 14 sept. »")
    jours_de_suite = models.PositiveSmallIntegerField(default=0, help_text="série en cours")

    class Meta:
        ordering = ["-gagne_le", "-id"]
        verbose_name = "Récompense au mérite"
        verbose_name_plural = "Récompenses au mérite"


class UtilisationRecompense(models.Model):
    class Etat(models.TextChoices):
        PROGRAMMEE = "programmee"
        EN_VERIFICATION = "en_verification"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="recompenses_utilisees")
    recompense = models.CharField(max_length=20, help_text="REC-VITRINE | REC-FLASH")
    utilisee_a = models.DateTimeField()
    jusqua = models.DateTimeField(null=True, blank=True)
    flash_remise = models.PositiveSmallIntegerField(null=True, blank=True)
    flash_etat = models.CharField(max_length=16, choices=Etat.choices, blank=True, default="")

    class Meta:
        ordering = ["-utilisee_a", "-id"]
        verbose_name = "Récompense utilisée"
        verbose_name_plural = "Récompenses utilisées"


class RechercheZone(models.Model):
    zone = models.CharField(max_length=20, db_index=True)
    mots = models.CharField(max_length=120)
    fois = models.PositiveIntegerField(default=0)
    periode_jours = models.PositiveSmallIntegerField(default=30)
    maj_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-fois", "mots"]
        verbose_name = "Recherche sans résultat (zone)"
        verbose_name_plural = "Recherches sans résultat (zones)"
        constraints = [models.UniqueConstraint(fields=["zone", "mots"], name="croissance_une_recherche_par_zone")]


class VuesOffre(models.Model):
    offre = models.ForeignKey(Offre, on_delete=models.CASCADE, related_name="vues")
    jour = models.DateField()
    vues = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Vues d'une offre (jour)"
        verbose_name_plural = "Vues des offres"
        constraints = [models.UniqueConstraint(fields=["offre", "jour"], name="croissance_vues_par_jour")]


class FreinReleve(models.Model):
    class Type(models.TextChoices):
        PHOTO = "photo"
        ATTRIBUTION = "attribution"
        AVIS = "avis"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="freins")
    type = models.CharField(max_length=12, choices=Type.choices)
    titre = models.CharField(max_length=160)
    texte = models.TextField(help_text="pour le propriétaire (peut citer un montant)")
    texte_preparation = models.TextField(blank=True, default="", help_text="pour l'accès Préparation : sans montant")
    solution = models.CharField(max_length=120)
    route = models.CharField(max_length=40)
    actif = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Frein relevé"
        verbose_name_plural = "Freins relevés"


class VenteFlash(models.Model):
    """Vente flash à remise vérifiée (OFR-05, VD12-R38, VD10-R40, DEC-17) — UNE SEULE NOTION côté vendeur (DP-58) : celle
    que le vendeur programme (Promotions) et celle offerte au mérite (Se faire voir, P-3, origine « merite »). Prix de
    référence = le plus bas pratiqué sur 30 jours (jamais saisi) ; pendant la fenêtre, le prix payé est le prix remisé
    et la commission se calcule dessus (F9). Une remise au-delà de VD-VISIBILITE est relue sous 24 h."""

    class Origine(models.TextChoices):
        VENDEUR = "vendeur"
        MERITE = "merite"
        SELECTION = "selection"  # vente flash sur sélection BelivaY acceptée (publicite.selectionner_flash, DP-59)

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="ventes_flash")
    offre = models.ForeignKey(Offre, on_delete=models.CASCADE, related_name="ventes_flash")
    origine = models.CharField(max_length=10, choices=Origine.choices, default=Origine.VENDEUR)
    type = models.CharField(max_length=8, help_text="pourcent | montant")
    valeur = models.PositiveIntegerField()
    prix_reference = models.PositiveIntegerField()
    prix_promo = models.PositiveIntegerField()
    debut = models.DateTimeField()
    fin = models.DateTimeField()
    relue = models.BooleanField(default=False, help_text="remise au-delà du seuil : relue par la console")
    cree_le = models.DateTimeField()
    arretee_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-debut", "-id"]
        verbose_name = "Vente flash"
        verbose_name_plural = "Ventes flash"
