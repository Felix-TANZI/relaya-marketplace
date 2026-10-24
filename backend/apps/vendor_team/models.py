# backend/apps/vendor_team/models.py
#
# Nouvelle app, dédiée au périmètre « session / compte / équipe » du nouveau frontend vendeur autonome
# (espace-client-belivay/espace-vendeur, INTEGRATION-API.md). Volontairement séparée de apps.vendors
# (qui reste la propriété du frontend vendeur v2 existant et des autres agents travaillant en parallèle
# sur views.py/urls.py) : toutes les FK pointent vers apps.vendors.VendorProfile / le User existant, rien
# n'est dupliqué.
#
# Patron repris de apps.accounts.models (RelayEmployee, RelayEmployeeInvitation, RelayAccessPin) : registre
# des droits + code à usage unique haché, pas encore un verrou technique partout (voir commentaires).

import secrets

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone

from apps.vendors.models import VendorProfile, VendorLocation


# ─── CATALOGUE DES DROITS (src/donnees/droits.ts, demande du porteur 6 oct.) ──────────────────────────────

# Droits qu'un employé peut recevoir. Les cinq droits qui n'apparaissent jamais ici (produits.prix,
# litiges.repondre, argent.voir, boutique.modifier, equipe.gerer) ne sont JAMAIS accordés à un employé —
# le serveur les retire d'office (voir VendorEmployee.clean_rights), quoi que le propriétaire coche côté écran.
DROITS_ASSIGNABLES = [
    "commandes.voir",
    "commandes.preparer",
    "commandes.remettre",
    "produits.voir",
    "produits.stock",
    "litiges.voir",
    "litiges.preuves",
    "retours.inspecter",
    "messages.voir",
    "messages.repondre",
    "boutique.fermer",
]

DROITS_RESERVES_PROPRIETAIRE = [
    "produits.prix",
    "litiges.repondre",
    "argent.voir",
    "boutique.modifier",
    "equipe.gerer",
]

TOUS_LES_DROITS = DROITS_ASSIGNABLES + DROITS_RESERVES_PROPRIETAIRE


class VendorEmployee(models.Model):
    """
    Les personnes autorisées à travailler sur une boutique vendeur.

    Même esprit que accounts.RelayEmployee : un REGISTRE des droits accordés par le propriétaire, pas
    encore (à ce stade) une authentification cloisonnée par personne au-delà du compte Django créé à
    l'acceptation de l'invitation.

    VD-EQUIPE-MAX (nombre maximum d'employés actifs par boutique) : AUCUNE valeur n'est donnée dans
    INTEGRATION-API.md pour le vendeur (contrairement au point relais, MAX_ACTIFS_PAR_RELAIS = 3,
    documenté). La valeur ci-dessous (5) est un DÉFAUT RAISONNABLE, pas une décision business : à confirmer
    par le CEO/porteur avant la mise en production.
    """

    MAX_ACTIFS_PAR_BOUTIQUE = 5  # VD-EQUIPE-MAX — À CONFIRMER (voir docstring).

    class Role(models.TextChoices):
        OWNER = "OWNER", "Propriétaire"
        EMPLOYEE = "EMPLOYEE", "Employé"

    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name="team_members")
    # Compte de connexion : vide tant que l'invitation n'a pas été acceptée (pas de mot de passe choisi).
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="vendor_employee_link",
    )
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80, blank=True, default="")
    phone = models.CharField(max_length=20)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.EMPLOYEE)
    # Sous-ensemble de DROITS_ASSIGNABLES ; filtré à chaque sauvegarde (clean_rights).
    droits = models.JSONField(default=list, blank=True)

    is_active = models.BooleanField(default=True)
    is_suspended = models.BooleanField(default=False)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    suspended_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-role", "created_at"]
        verbose_name = "Membre d'équipe vendeur"
        verbose_name_plural = "Membres d'équipe vendeur"

    def __str__(self):
        return f"{self.first_name} {self.last_name} · {self.vendor.business_name}"

    @classmethod
    def actifs_pour(cls, vendor):
        return cls.objects.filter(vendor=vendor, is_active=True, is_suspended=False)

    def clean_rights(self):
        if self.role == self.Role.OWNER:
            self.droits = list(DROITS_ASSIGNABLES)
            return
        self.droits = [d for d in (self.droits or []) if d in DROITS_ASSIGNABLES]

    def save(self, *args, **kwargs):
        self.clean_rights()
        super().save(*args, **kwargs)

    @property
    def etat(self) -> str:
        if self.is_suspended:
            return "suspendu"
        invitation = getattr(self, "invitation", None)
        if self.user_id is None and invitation is not None and invitation.est_valide:
            return "invite"
        return "actif"


class VendorEmployeeInvitation(models.Model):
    """Invitation envoyée par le propriétaire (code SMS à SON téléphone, pas à celui de l'employé : c'est
    le propriétaire qui autorise). Même durée de validité que accounts.RelayEmployeeInvitation."""

    JOURS_VALIDITE = 7

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        ACCEPTED = "ACCEPTED", "Acceptée"
        REVOKED = "REVOKED", "Annulée"
        EXPIRED = "EXPIRED", "Expirée"

    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name="employee_invitations")
    employee = models.OneToOneField(VendorEmployee, on_delete=models.CASCADE, related_name="invitation")
    token = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField()
    last_resent_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Invitation d'employé vendeur"
        verbose_name_plural = "Invitations d'employés vendeur"

    def __str__(self):
        return f"Invitation {self.employee.first_name} · {self.vendor.business_name}"

    @staticmethod
    def nouveau_jeton() -> str:
        return secrets.token_urlsafe(32)

    @property
    def est_valide(self) -> bool:
        return self.status == self.Status.PENDING and self.expires_at > timezone.now()


class VendorEmployeeActionLog(models.Model):
    """Journal des actions signées d'un membre (EQU-03) : lu par GET /shop/members/{id}/journal."""

    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name="employee_action_logs")
    # SET_NULL (pas CASCADE) : un membre retiré garde ses actions passées signées (EQU-04), même sans
    # ligne VendorEmployee pour les porter.
    employee = models.ForeignKey(
        VendorEmployee, on_delete=models.SET_NULL, related_name="action_logs", null=True, blank=True,
    )
    employee_label = models.CharField(max_length=160, blank=True, default="")  # nom gardé après un retrait
    domaine = models.CharField(max_length=20)  # commandes|produits|litiges|retours|messages|boutique|equipe|connexion
    texte = models.CharField(max_length=255)
    ref = models.CharField(max_length=40, blank=True, default="")
    route = models.CharField(max_length=120, blank=True, default="")
    # Catégorie de l'historique équipe (ajout|retrait|droits|suspension|reactivation|annulation) ; vide pour
    # les autres domaines.
    categorie = models.CharField(max_length=20, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Action d'employé vendeur"
        verbose_name_plural = "Actions des employés vendeur"

    def __str__(self):
        return f"{self.texte} ({self.domaine})"

    @classmethod
    def consigner(cls, *, vendor, employee=None, domaine, texte, ref="", route="", categorie="", employee_label=""):
        return cls.objects.create(
            vendor=vendor, employee=employee, domaine=domaine, texte=texte[:255], ref=ref[:40], route=route[:120],
            categorie=categorie, employee_label=employee_label[:160],
        )


class VendorLocationMeta(models.Model):
    """Champs du nouveau contrat (type de lieu, horaires propres) que vendors.VendorLocation ne porte pas :
    même raison que VendorShopMeta — pas de colonne ajoutée à une app partagée en parallèle."""

    class TypeLieu(models.TextChoices):
        BOUTIQUE = "boutique", "Boutique"
        DEUXIEME_BOUTIQUE = "deuxieme_boutique", "Deuxième boutique"
        ENTREPOT = "entrepot", "Entrepôt"
        COLLECTE = "collecte", "Point de collecte"
        AUTRE = "autre", "Autre"

    location = models.OneToOneField(VendorLocation, on_delete=models.CASCADE, related_name="meta_nouveau_frontend")
    type_lieu = models.CharField(max_length=20, choices=TypeLieu.choices, default=TypeLieu.AUTRE)
    horaires = models.JSONField(null=True, blank=True)

    class Meta:
        verbose_name = "Métadonnées de lieu (nouveau frontend vendeur)"
        verbose_name_plural = "Métadonnées de lieu (nouveau frontend vendeur)"


class VendorLocationVerification(models.Model):
    """
    Déplacement d'un lieu (vendors.VendorLocation) de plus de 200 m : le point en attente, pas encore
    vérifié par l'agent de zone (Q-91). L'ancien point reste en service tant qu'il n'y a pas eu de
    vérification. N'ajoute pas de colonne à VendorLocation (app apps.vendors, modifiée en parallèle par
    d'autres agents) : un enregistrement séparé porte le point en attente.
    """

    location = models.OneToOneField(VendorLocation, on_delete=models.CASCADE, related_name="verification_en_attente")
    lat_attente = models.DecimalField(max_digits=9, decimal_places=6)
    lon_attente = models.DecimalField(max_digits=9, decimal_places=6)
    metres = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    relance_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Vérification de lieu en attente"
        verbose_name_plural = "Vérifications de lieu en attente"

    def __str__(self):
        return f"{self.location.name} — à vérifier ({self.metres} m)"


class VendorChangeRequest(models.Model):
    """
    Demande de modification d'un champ protégé de la boutique (nom, informations officielles RCCM/NIU,
    titulaire, ou « autre » décrit par un motif libre), décidée par la console BelivaY sous 72 h ouvrées
    (VD-CONTESTATION-REPONSE). Modèle dédié (et non apps.vendors.ShopModificationRequest, déjà utilisé par
    un flux admin existant à granularité différente — plusieurs champs à la fois, sans RCCM/NIU ni code
    SMS) : la forme attendue par le nouveau frontend (un champ, une valeur, un code, un historique) ne
    correspond pas à ce que porte ShopModificationRequest ; dupliquer ses champs aurait forcé un
    détournement plutôt qu'une réutilisation propre.
    """

    class Champ(models.TextChoices):
        NOM = "nom", "Nom de la boutique"
        TITULAIRE = "titulaire", "Titulaire"
        OFFICIEL = "officiel", "Informations officielles (RCCM, NIU)"
        AUTRE = "autre", "Autre"

    class Status(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente"
        ACCEPTEE = "acceptee", "Acceptée"
        REFUSEE = "refusee", "Refusée"
        ANNULEE = "annulee", "Annulée"

    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name="change_requests")
    champ = models.CharField(max_length=12, choices=Champ.choices)
    avant = models.CharField(max_length=255, blank=True, default="")
    valeur = models.CharField(max_length=255)
    rccm = models.CharField(max_length=60, blank=True, default="")
    niu = models.CharField(max_length=60, blank=True, default="")
    motif = models.TextField()
    pieces = models.JSONField(default=list, blank=True)  # [{nom, taille}] — fichiers réels : POST /uploads existant
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.EN_ATTENTE)
    motif_refus = models.TextField(blank=True, default="")
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Demande de modification (nouveau frontend vendeur)"
        verbose_name_plural = "Demandes de modification (nouveau frontend vendeur)"

    def __str__(self):
        return f"{self.vendor.business_name} — {self.champ} ({self.status})"


class VendorAccountClosure(models.Model):
    """Clôture de compte demandée (Q-23) : préavis avant effet. 30 jours par défaut — la clé de registre
    VD-RESILIATION-PREAVIS (INTEGRATION-API.md §4) n'existe pas encore dans parametres-en-vigueur.json
    (vérifié : absente du registre au 12/10) ; ce module ne la lit donc pas pour éviter un crash au premier
    appel, et utilise la constante ci-dessous — à remplacer par apps.client_core.parametres dès que DP-57
    aura versé la clé."""

    PREAVIS_JOURS_DEFAUT = 30

    vendor = models.OneToOneField(VendorProfile, on_delete=models.CASCADE, related_name="closure_request")
    motif = models.TextField(blank=True, default="")
    requested_at = models.DateTimeField(auto_now_add=True)
    effective_at = models.DateTimeField()
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-requested_at"]
        verbose_name = "Clôture de compte vendeur demandée"
        verbose_name_plural = "Clôtures de compte vendeur demandées"

    def __str__(self):
        return f"Clôture {self.vendor.business_name} — effective le {self.effective_at:%d/%m/%Y}"


class VendorAssistedEntry(models.Model):
    """
    Fiche saisie par l'agent de zone pour le compte du vendeur (saisie assistée, SAI-01 à 04). Seule la
    DÉCISION du propriétaire (valider, modifier prix/stock) est gérée ici : publier réellement l'offre
    (créer le Product catalogue, la photo, etc.) appartient au domaine produits/offres, hors du périmètre
    de cet agent — validerFiches marque seulement les fiches « en vérification » côté équipe/session.
    """

    class Statut(models.TextChoices):
        A_VALIDER = "A_VALIDER", "À valider"
        VALIDEE = "VALIDEE", "Validée"
        REJETEE = "REJETEE", "Rejetée"

    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name="assisted_entries")
    titre = models.CharField(max_length=200)
    dessin = models.CharField(max_length=255, blank=True, default="")
    prix = models.PositiveIntegerField(null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    photos = models.PositiveSmallIntegerField(default=0)
    controles = models.JSONField(default=dict, blank=True)
    rattachee = models.BooleanField(default=False)
    mediane = models.PositiveIntegerField(null=True, blank=True)
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.A_VALIDER)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Fiche de saisie assistée"
        verbose_name_plural = "Fiches de saisie assistée"

    def __str__(self):
        return f"{self.titre} ({self.statut})"


class VendorShopMeta(models.Model):
    """Champs de l'ouverture (POST /shops) que vendors.VendorProfile ne porte pas encore (catégorie,
    statut particulier/entreprise) : n'ajoute pas de colonne à VendorProfile (app partagée, modifiée en
    parallèle par d'autres agents)."""

    class Statut(models.TextChoices):
        PARTICULIER = "particulier", "Particulier"
        ENTREPRISE = "entreprise", "Entreprise"

    vendor = models.OneToOneField(VendorProfile, on_delete=models.CASCADE, related_name="shop_meta")
    categorie = models.CharField(max_length=80, blank=True, default="")
    statut = models.CharField(max_length=12, choices=Statut.choices, default=Statut.PARTICULIER)
    device = models.CharField(max_length=120, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Métadonnées d'ouverture de boutique"
        verbose_name_plural = "Métadonnées d'ouverture de boutique"


class VendorContractSignature(models.Model):
    """Signature du contrat vendeur (POST /contract/sign) : version, horodatage, IP, appareil."""

    VERSION_COURANTE = "2026-10"

    vendor = models.OneToOneField(VendorProfile, on_delete=models.CASCADE, related_name="contract_signature")
    version = models.CharField(max_length=20, default=VERSION_COURANTE)
    immatricule = models.BooleanField(default=False)  # statut « entreprise »
    rccm = models.CharField(max_length=60, blank=True, default="")
    niu = models.CharField(max_length=60, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device = models.CharField(max_length=120, blank=True, default="")
    signed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Signature de contrat vendeur"
        verbose_name_plural = "Signatures de contrat vendeur"

    def __str__(self):
        return f"Contrat {self.vendor.business_name} — {self.version}"


