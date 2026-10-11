# backend/apps/vendeur_boutique/models.py
# Boutique, compte, équipe, messages, notifications et aide de l'espace vendeur (VD-11 ; VD-02 p12, Q-92). La boutique,
# ses fermetures programmées, ses membres et ses notifications sont dans le socle (apps.vendeur_core) ; ici, ce que le
# groupe VD-11 ajoute :
#
#   ProfilMembre          — ce que le membre règle pour lui : photo rognée, e-mail et numéro en attente de code,
#                           Face ID, export de ses données, clôture demandée (propriétaire).
#   AppareilVendeur       — appareils connectés d'un membre (ville, jamais l'adresse IP, SEC-01) ; alimenté par la
#                           connexion (apps.vendeur_session → services.enregistrer_appareil).
#   InvitationMembre      — ajout d'un accès Préparation préparé, en attente du code SMS du propriétaire (VD11-R23).
#   HistoriqueEquipe      — ajouts et retraits signés (EQU-04), en ajout seul.
#   MessageSupportVendeur — conversation « Support BelivaY » de la boutique (Q-49), hors commandes.
#   SignatureMessage      — membre qui a écrit une réponse du vendeur dans une conversation du client (EQU-03) ; le
#                           client lit « Le vendeur », jamais le nom de la boutique ni celui du membre.
#   LectureFil            — dernière lecture d'une conversation par la boutique (non lus du vendeur).
#   ReponseAvis           — réponse privée à un avis, transmise par le support (VD11-R56).
#   ReglagesNotificationsVendeur — réglages push d'un membre (I-2, VD11-R27).
#   QuestionAideVendeur   — questions fréquentes du vendeur (VD11-R63), chargées depuis donnees/aide.json.
#
# ANONYMAT (GEN-01) : aucune de ces tables ne garde l'identité, le numéro ou le relais d'un client ; un avis et une
# conversation sont lus dans les tables du kit client et rendus sans le client.
from django.db import models

from apps.vendeur_core.models import Boutique, Membre


class ProfilMembre(models.Model):
    membre = models.OneToOneField(Membre, on_delete=models.CASCADE, related_name="profil_vendeur")
    photo = models.TextField(blank=True, default="", help_text="image rognée (data: ou adresse du serveur)")
    couverture = models.TextField(blank=True, default="", help_text="photo de couverture rognée en bandeau 3:1")
    email_attente = models.EmailField(blank=True, default="", help_text="nouvel e-mail en attente des deux codes")
    numero_attente = models.CharField(max_length=20, blank=True, default="", help_text="nouveau téléphone en attente des deux codes")
    face_id = models.BooleanField(default=True)
    bio = models.CharField(max_length=160, blank=True, default="", help_text="présentation (équipe, agent ; jamais les clients)")
    apprendre = models.JSONField(default=list, blank=True, help_text="étapes faites du centre Apprendre : « fiche:étape »")
    export_demande_le = models.DateTimeField(null=True, blank=True)
    cloture_demandee_le = models.DateTimeField(null=True, blank=True, help_text="propriétaire : clôture du compte, 30 jours de préavis")
    cloture_motif = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        verbose_name = "Profil d'un membre"
        verbose_name_plural = "Profils des membres"

    def __str__(self):
        return str(self.membre)


class AppareilVendeur(models.Model):
    class Type(models.TextChoices):
        TELEPHONE = "telephone"
        ORDINATEUR = "ordinateur"
        TABLETTE = "tablette"

    membre = models.ForeignKey(Membre, on_delete=models.CASCADE, related_name="appareils")
    appareil_id = models.CharField(max_length=80, help_text="identifiant de l'appareil (X-Device-Id)")
    nom = models.CharField(max_length=80, help_text="« iPhone · Safari »")
    type = models.CharField(max_length=10, choices=Type.choices, default=Type.TELEPHONE)
    lieu = models.CharField(max_length=80, blank=True, default="", help_text="ville, jamais l'adresse IP (SEC-01)")
    jti = models.CharField(max_length=64, blank=True, default="", help_text="jeton de rafraîchissement de la session")
    premiere = models.DateTimeField()
    vu_a = models.DateTimeField()
    ouvertures = models.PositiveIntegerField(default=1)
    revoque_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["membre", "appareil_id"], name="vendeur_boutique_un_appareil")]
        verbose_name = "Appareil d'un membre"
        verbose_name_plural = "Appareils des membres"

    def __str__(self):
        return f"{self.membre} · {self.nom}"


class InvitationMembre(models.Model):
    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="invitations")
    prenom = models.CharField(max_length=60)
    nom = models.CharField(max_length=60)
    telephone = models.CharField(max_length=20, help_text="numéro du futur membre (9 chiffres)")
    cree_le = models.DateTimeField()
    confirmee_le = models.DateTimeField(null=True, blank=True)
    membre = models.ForeignKey(Membre, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    sms_envoye_le = models.DateTimeField(null=True, blank=True, help_text="SMS d'installation au nouveau membre")
    droits = models.JSONField(default=list, blank=True, help_text="droits cochés à l'invitation (vendeur_core.droits)")

    class Meta:
        verbose_name = "Invitation dans l'équipe"
        verbose_name_plural = "Invitations dans l'équipe"


class HistoriqueEquipe(models.Model):
    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="historique_equipe")
    a = models.DateTimeField()
    action = models.CharField(max_length=12, help_text="ajout | retrait | droits | suspension | reactivation | annulation")
    par = models.CharField(max_length=60, help_text="prénom du propriétaire")
    membre = models.CharField(max_length=130, help_text="« Aïcha N. »")
    detail = models.CharField(max_length=20, blank=True, default="", help_text="profil d'accès donné (ajout, droits)")

    class Meta:
        ordering = ["-a", "-id"]
        verbose_name = "Historique de l'équipe"
        verbose_name_plural = "Historique de l'équipe"


class MessageSupportVendeur(models.Model):
    class De(models.TextChoices):
        VENDEUR = "vendeur"
        SUPPORT = "support"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="messages_support")
    de = models.CharField(max_length=8, choices=De.choices)
    membre = models.ForeignKey(Membre, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    auteur = models.CharField(max_length=60, blank=True, default="", help_text="prénom du membre (EQU-03)")
    texte = models.TextField(help_text="déjà nettoyé (numéros, e-mails, liens retirés)")
    filtre = models.BooleanField(default=False)
    ref = models.CharField(max_length=30, blank=True, default="", help_text="commande concernée")
    a = models.DateTimeField()

    class Meta:
        ordering = ["a", "id"]
        verbose_name = "Message au support (vendeur)"
        verbose_name_plural = "Messages au support (vendeur)"


class SignatureMessage(models.Model):
    message_id = models.PositiveBigIntegerField(unique=True, help_text="messaging.Message écrit par le vendeur")
    membre = models.ForeignKey(Membre, on_delete=models.SET_NULL, null=True, related_name="+")
    auteur = models.CharField(max_length=60)

    class Meta:
        verbose_name = "Signature d'une réponse du vendeur"
        verbose_name_plural = "Signatures des réponses du vendeur"


class LectureFil(models.Model):
    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="lectures")
    fil = models.CharField(max_length=40, help_text="« support » ou « c<conversation> »")
    lu_le = models.DateTimeField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=["boutique", "fil"], name="vendeur_boutique_une_lecture")]


class ReponseAvis(models.Model):
    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="reponses_avis")
    avis_id = models.PositiveBigIntegerField(help_text="aftersales.AvisCommande")
    n = models.PositiveSmallIntegerField(help_text="colis de la boutique dans la commande")
    texte = models.TextField()
    membre = models.ForeignKey(Membre, on_delete=models.SET_NULL, null=True, related_name="+")
    a = models.DateTimeField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=["avis_id", "n"], name="vendeur_boutique_une_reponse_par_avis")]
        verbose_name = "Réponse privée à un avis"
        verbose_name_plural = "Réponses privées aux avis"


class ReglagesNotificationsVendeur(models.Model):
    membre = models.OneToOneField(Membre, on_delete=models.CASCADE, related_name="reglages_notifications")
    versements = models.BooleanField(default=True)
    avis = models.BooleanField(default=True)
    conseils = models.BooleanField(default=True)
    son_distinct = models.BooleanField(default=True)
    silence_de = models.CharField(max_length=5, default="21:00")
    silence_a = models.CharField(max_length=5, default="07:00")

    class Meta:
        verbose_name = "Réglages des notifications (membre)"
        verbose_name_plural = "Réglages des notifications (membres)"


class QuestionAideVendeur(models.Model):
    class Theme(models.TextChoices):
        ARGENT = "argent"
        COMMANDES = "commandes"
        LITIGES = "litiges"
        RETOURS = "retours"
        PALIER = "palier"
        BOUTIQUE = "boutique"
        PRODUITS = "produits"

    cle = models.CharField(max_length=20, unique=True, help_text="« q1 »")
    ordre = models.PositiveSmallIntegerField(default=0, help_text="ordre des demandes au support (VD11-R63)")
    theme = models.CharField(max_length=10, choices=Theme.choices)
    question = models.CharField(max_length=200)
    reponse = models.TextField(help_text="modèle : {prix}, {garde}… remplis par le serveur (montants calculés)")
    calcul = models.CharField(
        max_length=30, blank=True, default="", help_text="valeurs calculées : exemple_garde | palier_argent | apercu_client"
    )
    ecran = models.CharField(max_length=60, blank=True, default="", help_text="route de l'écran où agir")
    lien = models.CharField(max_length=80, blank=True, default="")
    mots = models.TextField(blank=True, default="", help_text="mots de recherche en plus (produits interdits…)")
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ["ordre", "id"]
        verbose_name = "Question d'aide (vendeur)"
        verbose_name_plural = "Questions d'aide (vendeur)"

    def __str__(self):
        return self.question


class LieuBoutique(models.Model):
    """Lieux de la boutique (emplacements multiples, VD-LIEUX-MAX) : le principal (origine du ramassage et zone ; son
    point, son repère et sa vérification restent ceux de Boutique) et les autres (deuxième boutique, entrepôt, dépôt
    dans un centre BelivaY). Un point posé au GPS attend l'agent de zone ; au-delà de 200 m, l'ancien sert (Q-91)."""

    class Type(models.TextChoices):
        BOUTIQUE = "boutique"
        DEUXIEME = "deuxieme_boutique"
        ENTREPOT = "entrepot"
        COLLECTE = "collecte"
        AUTRE = "autre"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="lieux")
    nom = models.CharField(max_length=60)
    type = models.CharField(max_length=18, choices=Type.choices, default=Type.BOUTIQUE)
    principal = models.BooleanField(default=False)
    adresse = models.CharField(max_length=160, blank=True, default="")
    horaires = models.JSONField(null=True, blank=True, help_text="None : ceux de la boutique")
    centre = models.CharField(max_length=40, blank=True, default="", help_text="centre BelivaY choisi (GET /hubs)")
    # Lieu non principal : son point (le principal lit Boutique).
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    zone = models.CharField(max_length=20, blank=True, default="")
    quartier = models.CharField(max_length=120, blank=True, default="")
    repere = models.CharField(max_length=120, blank=True, default="")
    pose_le = models.DateField(null=True, blank=True)
    verifie_le = models.DateField(null=True, blank=True)
    attente = models.JSONField(null=True, blank=True, help_text="{lat, lon, a} : point à vérifier")
    cree_le = models.DateTimeField()

    class Meta:
        ordering = ["-principal", "cree_le", "id"]
        verbose_name = "Lieu de la boutique"
        verbose_name_plural = "Lieux des boutiques"


class DemandeModification(models.Model):
    """Demande de modification d'un champ protégé (nom, informations officielles, titulaire, autre), décidée par la
    console sous 72 h ouvrées (VD-CONTESTATION-REPONSE) avec un motif écrit."""

    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente"
        ACCEPTEE = "acceptee"
        REFUSEE = "refusee"
        ANNULEE = "annulee"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="demandes_modification")
    champ = models.CharField(max_length=10, help_text="nom | titulaire | officiel | autre")
    avant = models.CharField(max_length=160, blank=True, default="")
    valeur = models.CharField(max_length=160)
    motif = models.CharField(max_length=500)
    pieces = models.JSONField(default=list, blank=True, help_text="[{nom, taille}] : pièces téléversées (POST /uploads)")
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.EN_ATTENTE)
    cree_le = models.DateTimeField()
    reponse_avant = models.DateTimeField()
    historique = models.JSONField(default=list, blank=True, help_text="[{a, texte, par: vous|belivay}]")
    motif_refus = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        ordering = ["-cree_le", "-id"]
        verbose_name = "Demande de modification"
        verbose_name_plural = "Demandes de modification"


class QuestionProduit(models.Model):
    """Question publique d'un client sur une offre (AJ-A Questions) : texte déjà filtré (coordonnées retirées), jamais
    le client (GEN-01, VD11-R10) ; réponse publique du propriétaire (Q-17) signée en interne ; signalement relu sous
    48 h (VD-MODERATION)."""

    offre = models.ForeignKey("vendeur_core.Offre", on_delete=models.CASCADE, related_name="questions_clients")
    texte = models.CharField(max_length=600)
    posee_a = models.DateTimeField()
    reponse = models.CharField(max_length=600, blank=True, default="")
    reponse_a = models.DateTimeField(null=True, blank=True)
    reponse_par = models.CharField(max_length=80, blank=True, default="")
    signalement = models.CharField(max_length=12, blank=True, default="")
    signalee_a = models.DateTimeField(null=True, blank=True)
    utile = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-posee_a", "-id"]
        verbose_name = "Question d'un client"
        verbose_name_plural = "Questions des clients"


class ModeleReponseQuestion(models.Model):
    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="modeles_reponse")
    titre = models.CharField(max_length=40)
    texte = models.CharField(max_length=600)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cree_le", "-id"]
        verbose_name = "Modèle de réponse"
        verbose_name_plural = "Modèles de réponse"
