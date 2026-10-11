# backend/apps/vendeur_litiges/models.py
# Litiges et retours vus par la boutique (VD-07 ; DP-35, DP-56 Q-17, Q-26 à Q-30, Q-72 ; DP-57 L-2 à L-4).
#
# Le dossier du client vit dans apps.aftersales (Litige, PreuveLitige, Retour, Remplacement ; machines LITIGE, RETOUR,
# REMPLACEMENT des moteurs) : il n'est jamais dupliqué ici. Cette application garde seulement ce que la boutique a en
# plus :
#   Dossier          — un par Litige du client sur un colis de la boutique (Litige.order_id + colis =
#                      CommandeVendeur.order_id + n) : voie (litige, ou retour accepté par BelivaY), catégorie vendeur
#                      (RET-01, depuis le motif du client, DP-56 Q-29), réponse du propriétaire (posture, texte,
#                      arrangement), recours du vendeur (Q-26) et sa décision, inspection du retour (contrôles,
#                      verdict), choix remplacer / rembourser, remplacement prêt.
#   PieceVendeur     — photo ajoutée par un membre (preuve du litige ou photo d'inspection), horodatée par le serveur,
#                      signée (GEN-09) ; retirée = gardée avec sa date de retrait (journal en ajout seul).
#   BrouillonReponse — réponse en cours de rédaction, gardée LIT-BROUILLON-H.
#   EvenementDossier — fil chronologique du dossier côté boutique, en ajout seul.
#
# ANONYMAT (GEN-01) : rien du client ici ; ses dires et ses photos sont lus dans aftersales au moment de la réponse.
from django.db import models


class Dossier(models.Model):
    class Voie(models.TextChoices):
        LITIGE = "litige", "Litige"
        RETOUR = "retour", "Retour accepté"

    class Categorie(models.TextChoices):  # RET-01 : les quatre catégories vendeur
        NON_CONFORME = "non_conforme", "non conforme"
        ABIME = "abime", "abîmé"
        CONTREFACON = "contrefacon", "contrefaçon"
        DEFAUT_CACHE = "defaut_cache", "défaut caché"

    litige = models.OneToOneField("aftersales.Litige", on_delete=models.CASCADE, related_name="dossier_vendeur")
    boutique = models.ForeignKey("vendeur_core.Boutique", on_delete=models.CASCADE, related_name="dossiers")
    commande = models.ForeignKey("vendeur_core.CommandeVendeur", on_delete=models.CASCADE, related_name="dossiers")
    voie = models.CharField(max_length=8, choices=Voie.choices, default=Voie.LITIGE)
    categorie = models.CharField(max_length=14, choices=Categorie.choices)
    cree_le = models.DateTimeField()
    # Réponse au litige (propriétaire, une seule fois, REP-02).
    posture = models.CharField(max_length=12, blank=True, default="", help_text="accepte | conteste | arrangement")
    arrangement = models.CharField(max_length=12, blank=True, default="", help_text="remplacement | remise")
    reponse_texte = models.TextField(blank=True, default="")
    reponse_a = models.DateTimeField(null=True, blank=True)
    reponse_par = models.CharField(max_length=80, blank=True, default="")
    faute_grave = models.BooleanField(default=False, help_text="décision perdue pour faute avérée : g3 (DCS-02)")
    # Recours du vendeur (Q-26) : une fois, sous LIT-RECOURS-H ; examiné par une autre personne.
    recours_a = models.DateTimeField(null=True, blank=True)
    recours_texte = models.TextField(blank=True, default="")
    recours_par = models.CharField(max_length=80, blank=True, default="")
    recours_decide_a = models.DateTimeField(null=True, blank=True)
    recours_issue = models.CharField(max_length=8, blank=True, default="", help_text="gagne | perdu")
    recours_motif = models.TextField(blank=True, default="")
    # Inspection du retour (VD07-R22 à R29).
    controles = models.JSONField(default=dict, blank=True, help_text="brouillon puis inspection : {scelle, serie}")
    verdict_brouillon = models.CharField(max_length=14, blank=True, default="")
    verdict = models.CharField(max_length=14, blank=True, default="", help_text="conforme | non_conforme")
    inspecte_a = models.DateTimeField(null=True, blank=True)
    inspecte_par = models.CharField(max_length=80, blank=True, default="")
    choix = models.CharField(max_length=12, blank=True, default="", help_text="remplacer | rembourser")
    choix_a = models.DateTimeField(null=True, blank=True)
    expedier_avant = models.DateTimeField(null=True, blank=True)
    pret_a = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-cree_le"]
        verbose_name = "Dossier (vendeur)"
        verbose_name_plural = "Dossiers (vendeur)"

    def __str__(self):
        return f"{self.commande.ref} · {self.voie}"


class PieceVendeur(models.Model):
    class Usage(models.TextChoices):
        PREUVE = "preuve", "Preuve du litige"
        INSPECTION = "inspection", "Photo d'inspection"

    dossier = models.ForeignKey(Dossier, on_delete=models.CASCADE, related_name="pieces")
    usage = models.CharField(max_length=10, choices=Usage.choices)
    photo = models.FileField(upload_to="vendeur/litiges/%Y/%m/")
    a = models.DateTimeField(help_text="horodatée par le serveur")
    par = models.CharField(max_length=80)
    retiree_a = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["a", "pk"]
        verbose_name = "Pièce de la boutique"
        verbose_name_plural = "Pièces de la boutique"

    @property
    def ident(self) -> str:
        return f"P{self.pk}"


class BrouillonReponse(models.Model):
    dossier = models.OneToOneField(Dossier, on_delete=models.CASCADE, related_name="brouillon")
    posture = models.CharField(max_length=12)
    arrangement = models.CharField(max_length=12)
    texte = models.TextField(blank=True, default="")
    garde_a = models.DateTimeField()

    class Meta:
        verbose_name = "Brouillon de réponse"
        verbose_name_plural = "Brouillons de réponse"


class EvenementDossier(models.Model):
    dossier = models.ForeignKey(Dossier, on_delete=models.CASCADE, related_name="evenements")
    a = models.DateTimeField()
    code = models.CharField(max_length=20)
    auteur = models.CharField(max_length=80, blank=True, default="")
    detail = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["a", "pk"]
        verbose_name = "Événement du dossier"
        verbose_name_plural = "Fil des dossiers"
