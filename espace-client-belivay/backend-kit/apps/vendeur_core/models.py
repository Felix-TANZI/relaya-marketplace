# backend/apps/vendeur_core/models.py
# Socle de l'espace vendeur (paquet « Espace vendeur », VD-02 ; PLAN-VENDEUR.md) : les tables partagées par toutes les
# applications vendeur du kit. Mêmes principes que le kit client (REPRISE-BACKEND.md § 1) :
#   - aucune ForeignKey vers les applications de relaya : la boutique garde l'identifiant de son VendorProfile
#     (vendor_id), une offre celui de son Product (product_id), une commande celui de son Order et le numéro du colis
#     (order_id, n : pickup.SousCommande) ; la lecture de ces objets passe par apps.client_core.pont ;
#   - montants en francs entiers, figés au paiement avec la version des paramètres (CCH-15, D5) ;
#   - ANONYMAT (GEN-01, CTV-02) : aucune table vendeur ne copie l'identité, le numéro, l'adresse, le quartier, le relais
#     ou le total payé du client ; une commande vendeur ne garde que les articles de SA boutique.
#
#   Horloge           — décalage de l'heure du serveur d'essai (routes /api/_essai/horloge) ; 0 en production.
#   Boutique          — la boutique (VendorProfile + ce que le paquet ajoute : horaires, point, palier, plan…).
#   FermetureBoutique — fermetures programmées (jours entiers) : comptent dans les heures d'ouverture.
#   Membre            — propriétaire et accès Préparation (3 au plus, VD-11) ; un compte (User) par membre.
#   Livreur           — livreur d'une entreprise de livraison (créneau de ramassage, niveau : plafond de valeur).
#   FicheCatalogue    — fiche BelivaY (titre, marque, famille du barème, variantes) ; MasterProduct chez relaya.
#   Offre             — l'offre d'une boutique sur une fiche (variante, prix, stock, état) ; Product chez relaya.
#   CommandeVendeur   — la sous-commande d'une boutique vue par le vendeur (pickup.SousCommande + ce qu'il voit).
#   EntreeJournal     — journal signé d'une commande, en ajout seul (JRN-02).
#   NotificationVendeur — centre de notifications de la boutique (lue par membre).
from django.conf import settings
from django.db import models


class Horloge(models.Model):
    """Une seule ligne : décalage (secondes) ajouté à l'heure réelle par apps.vendeur_core.horloge.maintenant().
    Réglé seulement par les routes réservées à l'essai (BELIVAY_ESSAI_ROUTES) ; sans ligne, l'heure réelle."""

    decalage_secondes = models.BigIntegerField(default=0)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Horloge d'essai"


class Boutique(models.Model):
    class Statut(models.TextChoices):
        PARTICULIER = "particulier"
        ENTREPRISE = "entreprise"

    class Palier(models.TextChoices):
        BRONZE = "Bronze"
        ARGENT = "Argent"
        OR = "Or"
        PLATINE = "Platine"

    class Plan(models.TextChoices):
        FREE = "Free"
        BOOST = "Boost"
        PRO = "Pro"

    vendor_id = models.PositiveBigIntegerField(null=True, blank=True, unique=True, help_text="vendors.VendorProfile de relaya")
    proprietaire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="boutiques_vendeur")
    # Identité (BOU-01) : le nom est interne, jamais montré au client.
    nom = models.CharField(max_length=120)
    identifiant = models.CharField(max_length=40, unique=True, help_text="« @Penga12 »")
    statut = models.CharField(max_length=12, choices=Statut.choices, default=Statut.PARTICULIER)
    categorie = models.CharField(max_length=80, blank=True, default="", help_text="catégorie principale (ouverture)")
    rccm = models.CharField(max_length=40, blank=True, default="")
    niu = models.CharField(max_length=40, blank=True, default="")
    cree_le = models.DateField()
    approuve_le = models.DateField(null=True, blank=True)
    signature_le = models.DateField(null=True, blank=True, help_text="contrat signé : début du palier de lancement")
    contrat_version = models.CharField(max_length=20, blank=True, default="")
    premiere_commande_payee = models.DateField(null=True, blank=True, help_text="début de l'offre de découverte")
    # Emplacement (VD11-R21) : point vérifié ; un point déplacé de plus de 200 m attend l'agent de zone.
    zone = models.CharField(max_length=20, blank=True, default="", help_text="« Z4 »")
    quartier = models.CharField(max_length=120, blank=True, default="", help_text="quartier de la BOUTIQUE")
    repere = models.CharField(max_length=160, blank=True, default="")
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    point_pose_le = models.DateField(null=True, blank=True)
    point_verifie_le = models.DateField(null=True, blank=True)
    point_attente = models.JSONField(null=True, blank=True, help_text="{lat, lon, a (ms)} : nouveau point à vérifier")
    # Horaires (lundi = 0), passages du livreur ({jours: [0…6], de, a}), « Fermer aujourd'hui », pause.
    horaires = models.JSONField(default=list, blank=True)
    passages = models.JSONField(default=list, blank=True)
    societe_livraison = models.CharField(max_length=80, blank=True, default="")
    fermee_le = models.DateField(null=True, blank=True, help_text="« Fermer aujourd'hui » touché ce jour-là")
    pause_depuis = models.DateTimeField(null=True, blank=True)
    pause_jusqua = models.DateTimeField(null=True, blank=True)
    # Vitrine interne (VD11-R11) : jamais montrée au client.
    vitrine_photo = models.TextField(blank=True, default="")
    vitrine_logo = models.TextField(blank=True, default="")
    vitrine_description = models.TextField(blank=True, default="")
    # Score et palier : relevés du service Scores de relaya (Q-37), recalcul de la nuit.
    palier = models.CharField(max_length=8, choices=Palier.choices, default=Palier.BRONZE)
    trust_score = models.DecimalField(max_digits=4, decimal_places=1, default=50)
    score_calcule_le = models.DateTimeField(null=True, blank=True)
    commandes_livrees = models.PositiveIntegerField(default=0, help_text="livrées et non remboursées (Q-10)")
    note = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    visite = models.BooleanField(default=False)
    audit = models.BooleanField(default=False)
    suspendue_depuis = models.DateTimeField(null=True, blank=True, help_text="sanction de niveau 3 en cours")
    plan = models.CharField(max_length=6, choices=Plan.choices, default=Plan.FREE)
    # Numéro de versement (NUM-01) : chiffré au repos (client_core.chiffrement), masqué à la sortie.
    numero_operateur = models.CharField(max_length=8, blank=True, default="", help_text="MTN | Orange")
    numero_chiffre = models.BinaryField(null=True, blank=True)
    numero_empreinte = models.CharField(max_length=64, blank=True, default="")
    numero_verifie_le = models.DateField(null=True, blank=True)
    titulaire_versement = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        verbose_name = "Boutique (vendeur)"
        verbose_name_plural = "Boutiques (vendeur)"

    def __str__(self):
        return f"{self.nom} ({self.identifiant})"


class FermetureBoutique(models.Model):
    """Fermeture programmée par jours entiers, annoncée 48 h à l'avance, écourtable (Q-39). Le motif reste interne."""

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="fermetures")
    du = models.DateField()
    au = models.DateField()
    motif = models.CharField(max_length=160, blank=True, default="")
    annoncee_le = models.DateTimeField()
    annulee_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["du"]
        verbose_name = "Fermeture programmée"
        verbose_name_plural = "Fermetures programmées"


class Membre(models.Model):
    class Role(models.TextChoices):
        PROPRIETAIRE = "proprietaire"
        PREPARATION = "preparation"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="membres")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="membres_vendeur")
    prenom = models.CharField(max_length=60)
    nom = models.CharField(max_length=60)
    telephone = models.CharField(max_length=20, help_text="numéro du membre (jamais celui d'un client)")
    role = models.CharField(max_length=12, choices=Role.choices, default=Role.PREPARATION)
    depuis = models.DateTimeField()
    actif = models.BooleanField(default=True)
    confirme_le = models.DateTimeField(null=True, blank=True, help_text="ajout confirmé par le code SMS")
    # Droits d'un employé (vendeur_core.droits ; EQU-01) : None = rôle « Préparation » d'avant ; propriétaire : tous.
    droits = models.JSONField(null=True, blank=True, help_text="droits cochés par le propriétaire (employé)")
    suspendu_le = models.DateTimeField(null=True, blank=True, help_text="session coupée, compte gardé (EQU-04)")

    class Meta:
        verbose_name = "Membre de l'équipe"
        verbose_name_plural = "Membres de l'équipe"

    def __str__(self):
        return f"{self.prenom} {self.nom} · {self.role}"

    @property
    def initiales(self) -> str:
        return (self.prenom[:1] + self.nom[:1]).upper()

    @property
    def signature(self) -> str:
        """« Aïcha N. » : la signature du journal (GEN-09)."""
        return f"{self.prenom} {self.nom[:1]}." if self.nom else self.prenom

    @property
    def proprietaire(self) -> bool:
        return self.role == self.Role.PROPRIETAIRE


class Livreur(models.Model):
    class Niveau(models.TextChoices):
        NOUVEAU = "Nouveau"
        CONFIRME = "Confirme"
        OR = "Or"

    nom = models.CharField(max_length=80, help_text="« Serge M. »")
    societe = models.CharField(max_length=80, help_text="« Wink Express »")
    photo = models.CharField(max_length=255, blank=True, default="", help_text="adresse ou dessin du portrait")
    niveau = models.CharField(max_length=10, choices=Niveau.choices, default=Niveau.CONFIRME)
    actif = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nom} ({self.societe})"


class FicheCatalogue(models.Model):
    master_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="catalog.MasterProduct de relaya")
    titre = models.CharField(max_length=200)
    marque = models.CharField(max_length=80, blank=True, default="")
    categorie = models.CharField(max_length=80, help_text="famille du barème (VD-BAREME-*) : « Électronique »")
    rayon = models.CharField(max_length=120, blank=True, default="", help_text="catégorie affichée")
    dessin = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    variantes = models.JSONField(default=list, blank=True)
    codes_barres = models.JSONField(default=list, blank=True)
    mots = models.TextField(blank=True, default="", help_text="mots de recherche (minuscules, sans accents)")
    prix_min = models.PositiveIntegerField(null=True, blank=True, help_text="prix du marché (fourchette)")
    prix_max = models.PositiveIntegerField(null=True, blank=True)
    publiee = models.BooleanField(default=True, help_text="fiche validée par BelivaY")

    class Meta:
        verbose_name = "Fiche du catalogue"
        verbose_name_plural = "Fiches du catalogue"

    def __str__(self):
        return self.titre


class Offre(models.Model):
    class Etat(models.TextChoices):
        EN_VENTE = "en_vente"
        EN_VERIFICATION = "en_verification"
        EN_PAUSE = "en_pause"
        REFUSEE = "refusee"
        BROUILLON = "brouillon"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="offres")
    fiche = models.ForeignKey(FicheCatalogue, on_delete=models.PROTECT, null=True, blank=True, related_name="offres")
    product_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="catalog.Product de relaya (à la publication)")
    titre_demande = models.CharField(max_length=200, blank=True, default="", help_text="brouillon sans fiche : la recherche")
    variante = models.CharField(max_length=80, blank=True, default="")
    etat = models.CharField(max_length=16, choices=Etat.choices, default=Etat.BROUILLON)
    etat_article = models.CharField(max_length=40, blank=True, default="Neuf")
    prix = models.PositiveIntegerField(null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    seuil_alerte = models.PositiveIntegerField(default=5)
    delai_preparation_h = models.PositiveIntegerField(default=4)
    colis = models.CharField(max_length=3, default="S")
    poids_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    dimensions_cm = models.JSONField(null=True, blank=True)
    paiement_au_retrait = models.BooleanField(default=True)
    made_in_cameroon = models.BooleanField(default=False)
    prix_auto = models.BooleanField(default=False)
    plancher_prive = models.PositiveIntegerField(null=True, blank=True)
    reference = models.CharField(max_length=40, blank=True, default="", help_text="SKU imprimé sur la boîte")
    a_mettre_de_cote = models.JSONField(default=list, blank=True, help_text="accessoires livrés avec l'article")
    envoyee_a = models.DateTimeField(null=True, blank=True)
    verification_avant = models.DateTimeField(null=True, blank=True)
    verifiee_a = models.DateTimeField(null=True, blank=True)
    motif_refus = models.TextField(blank=True, default="")
    fiche_demandee = models.JSONField(null=True, blank=True, help_text="{reponseAvant, prioritaire}")
    description_proposee = models.JSONField(null=True, blank=True)
    duplique_de = models.CharField(max_length=80, blank=True, default="")
    etape_brouillon = models.PositiveSmallIntegerField(null=True, blank=True)
    rester_jusqua = models.DateTimeField(null=True, blank=True, help_text="« Rester à X F » : aucun rappel avant (VD08-R20)")
    historique = models.JSONField(default=list, blank=True)
    supprimee_le = models.DateTimeField(null=True, blank=True, help_text="brouillon supprimé (annulable)")
    # DP-58 : prix barré saisi (remise réelle ≥ FLASH-REMISE-MIN, fin ≤ 30 jours, contrôlés à la publication) et note du
    # vendeur visible par l'acheteur (sans coordonnées, GEN-01).
    prix_barre = models.PositiveIntegerField(null=True, blank=True)
    fin_promo = models.DateTimeField(null=True, blank=True)
    note_vendeur = models.CharField(max_length=300, blank=True, default="")
    maj_le = models.DateTimeField(auto_now=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Offre"
        verbose_name_plural = "Offres"

    def __str__(self):
        return f"{self.titre} · {self.variante} ({self.etat})"

    @property
    def titre(self) -> str:
        return self.fiche.titre if self.fiche_id else self.titre_demande


class CommandeVendeur(models.Model):
    """La sous-commande d'une boutique (pickup.SousCommande order_id + n), créée à son entrée chez le vendeur : payée,
    ou validée pour paiement au retrait (E3, VD05-R01). Montants figés à ce moment (D5)."""

    class Moyen(models.TextChoices):
        MOMO = "momo"
        CARTE = "carte"
        APPLE = "apple"
        GOOGLE = "google"
        WALLET = "wallet"
        USD = "usd"
        EUR = "eur"
        COMPTOIR = "comptoir"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="commandes")
    order_id = models.PositiveBigIntegerField(db_index=True)
    n = models.PositiveSmallIntegerField(default=1)
    ref = models.CharField(max_length=30, unique=True, help_text="« BLV-52018 » (« BLV-52018-2 » pour le 2e colis)")
    payee_a = models.DateTimeField()
    payable_au_retrait = models.BooleanField(default=False)
    moyen = models.CharField(max_length=10, choices=Moyen.choices, default=Moyen.MOMO)
    colis = models.CharField(max_length=3, default="S")
    lignes = models.JSONField(default=list, help_text="articles de la boutique : offreId, titre, variante, prix, quantité…")
    # Argent figé (D5) : prix des articles, montant gardé, palier et découverte du jour, version des paramètres.
    prix = models.PositiveIntegerField()
    garde = models.IntegerField()
    commission = models.PositiveIntegerField(default=0)
    tva = models.PositiveIntegerField(default=0)
    palier = models.CharField(max_length=8, default="Bronze")
    decouverte = models.BooleanField(default=False)
    version_parametres = models.CharField(max_length=40, blank=True, default="")
    # Préparation (VD-05) : comptes à rebours en heures d'ouverture de la boutique.
    debut = models.DateTimeField(help_text="paiement, ou ouverture suivante si payée boutique fermée (E10)")
    echeance = models.DateTimeField(null=True, blank=True)
    echeance_absolue = models.DateTimeField(null=True, blank=True)
    prolongee = models.BooleanField(default=False)
    prete_a = models.DateTimeField(null=True, blank=True)
    verifications = models.JSONField(default=list, blank=True, help_text="coches du bon : [{cle, fait, par}]")
    ruptures = models.PositiveSmallIntegerField(default=0)
    annulee_a = models.DateTimeField(null=True, blank=True)
    motif_annulation = models.CharField(
        max_length=30, blank=True, default="", help_text="client_avant_ramassage | rupture | litige_perdu | belivay"
    )
    # Remise au livreur (VD-06) : le code n'est jamais lu avec la commande ; chiffré au repos.
    livreur = models.ForeignKey(Livreur, on_delete=models.SET_NULL, null=True, blank=True, related_name="commandes")
    ramassage_debut = models.DateTimeField(null=True, blank=True)
    ramassage_fin = models.DateTimeField(null=True, blank=True)
    code_chiffre = models.BinaryField(null=True, blank=True)
    code_vu = models.JSONField(default=list, blank=True, help_text="handover_code.viewed : [{a, par}]")
    essais_faux = models.PositiveSmallIntegerField(default=0)
    bloque_jusqua = models.DateTimeField(null=True, blank=True)
    nouveau_code_demande = models.BooleanField(default=False)
    creneau_manque = models.JSONField(null=True, blank=True, help_text="{debut, fin} (ms) : livreur absent")
    remise_a = models.DateTimeField(null=True, blank=True)
    photos_remise = models.JSONField(default=list, blank=True)
    confirmee_a = models.DateTimeField(null=True, blank=True, help_text="seller.confirmed envoyé à la sous-commande")
    remplacement_de = models.CharField(
        max_length=30, blank=True, default="", help_text="sous-commande de remplacement d'un retour (REFCL-R080) : référence d'origine"
    )
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Commande (vendeur)"
        verbose_name_plural = "Commandes (vendeur)"
        constraints = [models.UniqueConstraint(fields=["order_id", "n"], name="vendeur_core_un_colis_une_commande")]
        ordering = ["-payee_a"]

    def __str__(self):
        return self.ref


class EntreeJournal(models.Model):
    """Journal d'une commande, en ajout seul (JRN-02) : qui, quand, quoi ; un changement de valeur garde avant → après."""

    commande = models.ForeignKey(CommandeVendeur, on_delete=models.CASCADE, related_name="journal")
    a = models.DateTimeField()
    auteur = models.CharField(max_length=80, help_text="« Aïcha N. », « Système BelivaY »")
    role = models.CharField(max_length=12, help_text="proprietaire | preparation | systeme")
    action = models.CharField(max_length=160)
    detail = models.CharField(max_length=255, blank=True, default="")
    detail_a = models.DateTimeField(null=True, blank=True)
    avant = models.CharField(max_length=80, blank=True, default="")
    apres = models.CharField(max_length=80, blank=True, default="")

    class Meta:
        ordering = ["-a", "-id"]
        verbose_name = "Ligne du journal"
        verbose_name_plural = "Journal des commandes"


class NotificationVendeur(models.Model):
    """Centre de notifications du vendeur (VD-02 p9) : commande à préparer et litige (non désactivables), prix, retour,
    versement, palier, avis, conseil, sanction, stock, offre vérifiée, message. Une notification d'argent est masquée
    pour l'accès Préparation ; jamais de code ni d'identité du client dans le texte (CAP-19, GEN-01)."""

    class Type(models.TextChoices):
        PREPARER = "preparer"
        LITIGE = "litige"
        PRIX = "prix"
        RETOUR = "retour"
        VERSEMENT = "versement"
        PALIER = "palier"
        AVIS = "avis"
        CONSEIL = "conseil"
        SANCTION = "sanction"
        STOCK = "stock"
        OFFRE = "offre"
        MESSAGE = "message"
        SECURITE = "securite"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=10, choices=Type.choices)
    titre = models.CharField(max_length=160)
    texte = models.TextField()
    a = models.DateTimeField()
    urgent = models.BooleanField(default=False)
    argent = models.BooleanField(default=False, help_text="concerne l'argent : masquée pour l'accès Préparation")
    lien = models.CharField(max_length=200, blank=True, default="", help_text="route de l'application vendeur")
    lue_par = models.ManyToManyField(Membre, blank=True, related_name="notifications_lues")

    class Meta:
        ordering = ["-a", "-id"]
        verbose_name = "Notification (vendeur)"
        verbose_name_plural = "Notifications (vendeur)"


class EvenementVendeur(models.Model):
    """Flux des échanges avec les autres interfaces (espace-vendeur/INTERFACES.md ; GET /events?depuis=, SSE
    /events/stream) : un événement entrant (client, livreur, relais, administration) ou sortant (geste du vendeur
    relayé), en ajout seul. L'identifiant sert de curseur : rejouer le flux ne crée aucun doublon. ANONYMAT (GEN-01) :
    jamais le nom, le numéro, l'adresse, le quartier, le point de retrait ni le total payé du client."""

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="evenements")
    sens = models.CharField(max_length=8, help_text="entrant | sortant")
    interface = models.CharField(max_length=16, help_text="client | livreur | relais | administration")
    type = models.CharField(max_length=40, help_text="type du paquet (commande_payee, colis_non_pret…)")
    canal = models.CharField(max_length=40, help_text="nom du flux (order.paid, pickup.not_ready…)")
    donnees = models.JSONField(default=dict, help_text="champs de l'événement (montant : null pour un employé à la lecture)")
    droit = models.CharField(max_length=24, blank=True, default="", help_text="droit qu'il faut pour le recevoir ; vide : propriétaire")
    a = models.DateTimeField()

    class Meta:
        ordering = ["id"]
        indexes = [models.Index(fields=["boutique", "id"])]
        verbose_name = "Événement (échanges)"
        verbose_name_plural = "Événements (échanges)"
