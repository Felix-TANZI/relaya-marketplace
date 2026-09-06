# backend/apps/payments/config/models.py
# Configuration financiere BelivaY — domaine SEPARE de PlatformSettings.
#
# DEUX PRINCIPES STRUCTURANTS
#
#   P2 — Aucune valeur financiere en dur.
#        Taux, delais, seuils, plafonds, repartitions : tout vit ici.
#
#   P3/P4 — Versionnement immuable.
#        Une regle n'est JAMAIS modifiee. Une "modification" cree une
#        NOUVELLE VERSION et cloture l'ancienne. Un snapshot de transaction
#        pointant vers une version pointe donc toujours vers le contenu
#        reellement applique, meme des annees apres.
#
#        Sans cela, un admin qui corrige un taux reecrit retroactivement la
#        comptabilite de toutes les commandes en cours.

from decimal import Decimal

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


# ─────────────────────────────────────────────────────────────────────────────
# GOUVERNANCE
# ─────────────────────────────────────────────────────────────────────────────

class GovernanceLevel(models.TextChoices):
    """
    Niveau d'approbation requis pour modifier un parametre.

    Un parametre issu du referentiel ne se modifie pas comme un delai
    d'affichage. Le niveau est un attribut de l'objet, pas une convention.
    """
    N1 = "N1", "N1 — Operationnel (quatre yeux)"
    N2 = "N2", "N2 — Financier (quatre yeux + justification)"
    N3 = "N3", "N3 — Referentiel (approbation la plus haute + alerte)"


# ─────────────────────────────────────────────────────────────────────────────
# BASE VERSIONNEE IMMUABLE
# ─────────────────────────────────────────────────────────────────────────────

class ImmutableConfigError(Exception):
    """Tentative de modification d'une version de configuration figee."""


class VersionedConfig(models.Model):
    """
    Base abstraite de toute configuration financiere versionnee.

    `config_key` est l'identite STABLE a travers les versions.
    `version` s'incremente a chaque nouvelle mouture.
    Une seule version peut etre active a la fois pour une meme cle.
    """

    #: Niveau de gouvernance par defaut — surcharge par sous-classe.
    GOVERNANCE_LEVEL = GovernanceLevel.N2

    #: Champs figes apres creation. Toute tentative de modification leve.
    IMMUTABLE_FIELDS: tuple = ()

    config_key = models.SlugField(
        max_length=120,
        verbose_name="Cle de configuration",
        help_text="Identite stable a travers les versions. Ne change jamais.",
    )
    version = models.PositiveIntegerField(
        default=1,
        verbose_name="Version",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Version active",
    )
    valid_from = models.DateTimeField(
        default=timezone.now,
        verbose_name="Valide a partir du",
    )
    valid_until = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Valide jusqu'au",
        help_text="Renseigne automatiquement lorsqu'une version ulterieure la remplace.",
    )
    notes = models.TextField(
        blank=True, default="",
        verbose_name="Notes",
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="+",
        verbose_name="Cree par",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True

    def __str__(self):
        etat = "actif" if self.is_active else "clos"
        return f"{self.config_key} v{self.version} ({etat})"

    # ── Immuabilite ──────────────────────────────────────────────────────────

    def save(self, *args, **kwargs):
        if self.pk is not None:
            ancien = type(self).objects.filter(pk=self.pk).first()
            if ancien is not None:
                modifies = [
                    champ for champ in self.IMMUTABLE_FIELDS
                    if getattr(ancien, champ) != getattr(self, champ)
                ]
                if modifies:
                    raise ImmutableConfigError(
                        f"{type(self).__name__} '{self.config_key}' v{self.version} : "
                        f"champs figes modifies ({', '.join(modifies)}). "
                        "Une regle ne se modifie jamais : creer une NOUVELLE VERSION "
                        "via une demande de changement."
                    )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ImmutableConfigError(
            f"{type(self).__name__} '{self.config_key}' v{self.version} : "
            "une configuration financiere ne se supprime jamais. "
            "La cloturer en desactivant la version."
        )

    # ── Cycle de vie ─────────────────────────────────────────────────────────

    def close(self, at=None):
        """Cloture cette version sans la supprimer."""
        self.is_active = False
        self.valid_until = at or timezone.now()
        super().save(update_fields=["is_active", "valid_until"])

    @property
    def is_current(self) -> bool:
        maintenant = timezone.now()
        if not self.is_active:
            return False
        if self.valid_from > maintenant:
            return False
        if self.valid_until and self.valid_until <= maintenant:
            return False
        return True

    @classmethod
    def current(cls):
        """Toutes les versions actuellement en vigueur."""
        maintenant = timezone.now()
        return cls.objects.filter(
            is_active=True,
            valid_from__lte=maintenant,
        ).filter(
            models.Q(valid_until__isnull=True) | models.Q(valid_until__gt=maintenant)
        )

    @classmethod
    def next_version_for(cls, config_key: str) -> int:
        derniere = cls.objects.filter(config_key=config_key).order_by("-version").first()
        return (derniere.version + 1) if derniere else 1


# ─────────────────────────────────────────────────────────────────────────────
# TABLE DE REFERENCE — CLASSES DE VEHICULE
# ─────────────────────────────────────────────────────────────────────────────

class VehicleClass(models.Model):
    """
    Classe de vehicule pour les grilles tarifaires transporteurs.

    Table de reference et NON enumeration Python : ajouter "Camion 3,5 t"
    ne doit pas demander une migration (principe P2).

    Le seed initial reprend CourierProfile.VehicleType.
    """
    code = models.SlugField(max_length=40, unique=True, verbose_name="Code")
    label = models.CharField(max_length=80, verbose_name="Libelle")
    max_weight_kg = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Charge utile max (kg)",
    )
    max_volume_l = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Volume max (L)",
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        ordering = ["sort_order", "code"]
        verbose_name = "Classe de vehicule"
        verbose_name_plural = "Classes de vehicule"

    def __str__(self):
        return self.label


# ─────────────────────────────────────────────────────────────────────────────
# PRESTATAIRE DE PAIEMENT
# ─────────────────────────────────────────────────────────────────────────────

class ProviderConfig(VersionedConfig):
    """
    Comportement d'un prestataire de paiement.

    LES SECRETS N'Y SONT PAS. Jeton d'API et cle webhook vivent exclusivement
    en variables d'environnement. L'admin pilote le COMPORTEMENT, jamais les
    identifiants — voir principe de securite §12.1.
    """

    GOVERNANCE_LEVEL = GovernanceLevel.N3
    IMMUTABLE_FIELDS = ("config_key", "version", "provider_code", "mode")

    class Mode(models.TextChoices):
        SANDBOX = "SANDBOX", "Bac a sable"
        LIVE = "LIVE", "Production"

    provider_code = models.CharField(
        max_length=30, verbose_name="Code prestataire",
        help_text="CAMPAY, MOCK, FAPSHI…",
    )
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.SANDBOX)
    is_enabled = models.BooleanField(default=False, verbose_name="Encaissements actifs")
    is_payout_enabled = models.BooleanField(
        default=False, verbose_name="Versements actifs",
        help_text="Coupe-circuit des sorties, INDEPENDANT des encaissements.",
    )
    priority = models.IntegerField(
        default=0, verbose_name="Priorite",
        help_text="Ordre de bascule si le prestataire principal tombe.",
    )
    supported_operators = models.JSONField(
        default=list, blank=True, verbose_name="Operateurs supportes",
        help_text='Ex : ["MTN", "ORANGE"]',
    )
    min_amount_xaf = models.PositiveIntegerField(default=100)
    max_amount_xaf = models.PositiveIntegerField(default=1_000_000)
    daily_collect_cap_xaf = models.PositiveIntegerField(default=10_000_000)
    daily_payout_cap_xaf = models.PositiveIntegerField(default=5_000_000)
    collect_timeout_s = models.PositiveIntegerField(default=30)
    poll_interval_s = models.PositiveIntegerField(default=5)
    max_poll_duration_s = models.PositiveIntegerField(default=300)
    retry_policy = models.JSONField(
        default=dict, blank=True,
        help_text='Ex : {"max_attempts": 3, "backoff_seconds": [1, 5, 15]}',
    )
    circuit_breaker_threshold = models.PositiveIntegerField(
        default=5, verbose_name="Seuil du coupe-circuit",
        help_text="Nombre d'echecs consecutifs avant coupure automatique.",
    )
    webhook_ip_allowlist = models.JSONField(
        default=list, blank=True, verbose_name="IP autorisees pour les webhooks",
    )
    exposes_balance_per_operator = models.BooleanField(
        default=False,
        verbose_name="Expose un solde par operateur",
        help_text=(
            "A confirmer au Jalon A. Si faux, les comptes PSP_AVAILABLE_MTN et "
            "PSP_AVAILABLE_ORANGE ne sont pas reconciliables et le mode degrade "
            "s'applique (voir §6.1 du document d'architecture)."
        ),
    )

    class Meta:
        app_label = "payments"
        ordering = ["-priority", "provider_code", "-version"]
        unique_together = [("config_key", "version")]
        verbose_name = "Prestataire de paiement"
        verbose_name_plural = "Prestataires de paiement"

    def clean(self):
        if self.min_amount_xaf > self.max_amount_xaf:
            raise ValidationError("Le montant minimum depasse le montant maximum.")
        if self.mode == self.Mode.LIVE and not self.webhook_ip_allowlist:
            raise ValidationError(
                "Une configuration LIVE exige une liste blanche d'IP pour les webhooks."
            )


# ─────────────────────────────────────────────────────────────────────────────
# REGLES DE FRAIS
# ─────────────────────────────────────────────────────────────────────────────

class FeeRule(VersionedConfig):
    """
    Moteur de frais. C'est ici que vivent les frais PSP.

    Referentiel : les frais PSP sont portes par la PLATEFORME, et aucun frais
    de retrait n'est facture aux partenaires. Mais rien n'est fige : c'est une
    valeur de configuration, modifiable sans developpeur.
    """

    GOVERNANCE_LEVEL = GovernanceLevel.N2
    IMMUTABLE_FIELDS = (
        "config_key", "version", "scope", "basis", "value",
        "min_fee_xaf", "max_fee_xaf", "bearer", "rounding",
    )

    class Scope(models.TextChoices):
        COLLECT = "COLLECT", "Encaissement"
        PAYOUT = "PAYOUT", "Versement"
        REFUND = "REFUND", "Remboursement"
        SETTLEMENT = "SETTLEMENT", "Reglement"

    class Basis(models.TextChoices):
        PERCENT = "PERCENT", "Pourcentage"
        FIXED = "FIXED", "Montant fixe"
        TIERED = "TIERED", "Par paliers"

    class Bearer(models.TextChoices):
        BUYER = "BUYER", "Acheteur"
        VENDOR = "VENDOR", "Vendeur"
        DELIVERY_COMPANY = "DELIVERY_COMPANY", "Entreprise de livraison"
        RELAY_POINT = "RELAY_POINT", "Point relais"
        PLATFORM = "PLATFORM", "Plateforme BelivaY"
        SPLIT = "SPLIT", "Partage"

    class RoundingMode(models.TextChoices):
        HALF_UP = "HALF_UP", "Au plus proche"
        UP = "UP", "Au superieur"
        DOWN = "DOWN", "A l'inferieur"

    name = models.CharField(max_length=140, verbose_name="Libelle")
    scope = models.CharField(max_length=12, choices=Scope.choices)
    basis = models.CharField(max_length=10, choices=Basis.choices, default=Basis.PERCENT)
    value = models.DecimalField(
        max_digits=7, decimal_places=4, default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Valeur",
        help_text="Pourcentage (ex. 2.0000) ou montant fixe en FCFA.",
    )
    tiers = models.JSONField(
        default=list, blank=True,
        help_text='Ex : [{"up_to": 10000, "value": "3"}, {"up_to": null, "value": "1.5"}]',
    )
    min_fee_xaf = models.PositiveIntegerField(null=True, blank=True, verbose_name="Plancher")
    max_fee_xaf = models.PositiveIntegerField(null=True, blank=True, verbose_name="Plafond")
    bearer = models.CharField(max_length=20, choices=Bearer.choices, default=Bearer.PLATFORM)
    split_config = models.JSONField(
        default=dict, blank=True,
        help_text='Si bearer=SPLIT. Ex : {"PLATFORM": 50, "VENDOR": 50}',
    )
    rounding = models.CharField(
        max_length=10, choices=RoundingMode.choices, default=RoundingMode.HALF_UP,
    )
    priority = models.IntegerField(default=0)

    # Filtres — vide = ne filtre pas
    filter_provider = models.CharField(max_length=30, blank=True, default="")
    filter_operator = models.CharField(max_length=20, blank=True, default="")
    filter_payee_type = models.CharField(max_length=30, blank=True, default="")
    filter_category = models.CharField(max_length=80, blank=True, default="")
    filter_certification_tier = models.CharField(max_length=20, blank=True, default="")
    filter_city = models.CharField(max_length=80, blank=True, default="")

    class Meta:
        app_label = "payments"
        ordering = ["-priority", "config_key", "-version"]
        unique_together = [("config_key", "version")]
        verbose_name = "Regle de frais"
        verbose_name_plural = "Regles de frais"

    def clean(self):
        if self.basis == self.Basis.PERCENT and not (0 <= self.value <= 100):
            raise ValidationError(
                {"value": "Un taux doit rester entre 0 et 100 (borne absolue)."}
            )
        if self.basis == self.Basis.TIERED and not self.tiers:
            raise ValidationError({"tiers": "Base TIERED sans palier defini."})
        if self.min_fee_xaf and self.max_fee_xaf and self.min_fee_xaf > self.max_fee_xaf:
            raise ValidationError("Le plancher depasse le plafond.")
        if self.bearer == self.Bearer.SPLIT and not self.split_config:
            raise ValidationError({"split_config": "bearer=SPLIT exige une repartition."})


# ─────────────────────────────────────────────────────────────────────────────
# REGLES DE REPARTITION
# ─────────────────────────────────────────────────────────────────────────────

class DistributionRule(VersionedConfig):
    """
    Repartition d'un composant economique entre beneficiaires.

    Distincte de la grille tarifaire transporteur (CarrierTariff, Lot 8bis) :
    le tarif determine le PRIX du transport, cette regle en gere la REPARTITION.
    """

    GOVERNANCE_LEVEL = GovernanceLevel.N2
    IMMUTABLE_FIELDS = ("config_key", "version", "component", "payee_type", "basis", "value")

    class Component(models.TextChoices):
        GOODS = "GOODS", "Marchandise"
        TRANSPORT = "TRANSPORT", "Transport"
        RELAY_HANDLING = "RELAY_HANDLING", "Remise en point relais"

    class PayeeType(models.TextChoices):
        VENDOR = "VENDOR", "Vendeur"
        DELIVERY_COMPANY = "DELIVERY_COMPANY", "Entreprise de livraison"
        RELAY_POINT = "RELAY_POINT", "Point relais"
        PLATFORM = "PLATFORM", "Plateforme BelivaY"

    class Basis(models.TextChoices):
        PERCENT_OF_COMPONENT = "PERCENT_OF_COMPONENT", "Pourcentage du composant"
        FIXED = "FIXED", "Montant fixe"
        REMAINDER = "REMAINDER", "Solde restant"

    name = models.CharField(max_length=140)
    component = models.CharField(max_length=20, choices=Component.choices)
    payee_type = models.CharField(max_length=20, choices=PayeeType.choices)
    basis = models.CharField(max_length=24, choices=Basis.choices)
    value = models.DecimalField(
        max_digits=7, decimal_places=4, default=0,
        validators=[MinValueValidator(0)],
    )
    priority = models.IntegerField(default=0)
    filter_delivery_mode = models.CharField(max_length=20, blank=True, default="")
    filter_city = models.CharField(max_length=80, blank=True, default="")

    class Meta:
        app_label = "payments"
        ordering = ["component", "-priority", "-version"]
        unique_together = [("config_key", "version")]
        verbose_name = "Regle de repartition"
        verbose_name_plural = "Regles de repartition"

    def clean(self):
        if self.basis == self.Basis.PERCENT_OF_COMPONENT and not (0 <= self.value <= 100):
            raise ValidationError({"value": "Un pourcentage doit rester entre 0 et 100."})


# ─────────────────────────────────────────────────────────────────────────────
# POLITIQUES DE SEQUESTRE
# ─────────────────────────────────────────────────────────────────────────────

class EscrowPolicy(VersionedConfig):
    """Delais applicables a un sequestre : auto-confirmation, liberation, litige."""

    GOVERNANCE_LEVEL = GovernanceLevel.N2
    IMMUTABLE_FIELDS = (
        "config_key", "version",
        "auto_confirm_hours", "release_delay_hours", "dispute_window_days",
    )

    name = models.CharField(max_length=140)
    payee_type = models.CharField(
        max_length=20, blank=True, default="",
        choices=DistributionRule.PayeeType.choices,
    )
    component = models.CharField(
        max_length=20, blank=True, default="",
        choices=DistributionRule.Component.choices,
    )
    auto_confirm_hours = models.PositiveIntegerField(
        default=96, verbose_name="Auto-confirmation (h)",
        help_text="Verrouille a 4 jours (96h) depuis la remise — Addendum Decisions v1.0 §3.1.",
    )
    release_delay_hours = models.PositiveIntegerField(
        default=72, verbose_name="Delai de liberation (h)",
        help_text="Verrouille a J+3 (72h) depuis la cloture du droit de retour — Addendum Decisions v1.0 §3.1.",
    )
    dispute_window_days = models.PositiveIntegerField(
        default=4, verbose_name="Fenetre de litige (jours)",
        help_text="Verrouille a 4 jours depuis la remise, cale sur l'auto-confirmation — Addendum Decisions v1.0 §4.4.",
    )
    vendor_reply_hours = models.PositiveIntegerField(
        default=72, verbose_name="Delai de reponse vendeur (h)",
    )
    priority = models.IntegerField(default=0)
    filter_category = models.CharField(max_length=80, blank=True, default="")
    filter_delivery_mode = models.CharField(max_length=20, blank=True, default="")
    filter_city = models.CharField(max_length=80, blank=True, default="")
    filter_certification_tier = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        app_label = "payments"
        ordering = ["-priority", "-version"]
        unique_together = [("config_key", "version")]
        verbose_name = "Politique de sequestre"
        verbose_name_plural = "Politiques de sequestre"


# ─────────────────────────────────────────────────────────────────────────────
# CYCLES ET POLITIQUES DE REGLEMENT
# ─────────────────────────────────────────────────────────────────────────────

class SettlementCycle(VersionedConfig):
    """
    Cadence contractuelle de reglement d'un partenaire.

    Remplace le modele portefeuille : il n'existe ni solde disponible,
    ni bouton de retrait. Seulement un montant du et une date de reglement.
    """

    GOVERNANCE_LEVEL = GovernanceLevel.N3
    IMMUTABLE_FIELDS = ("config_key", "version", "frequency", "anchor_day")

    class Frequency(models.TextChoices):
        WEEKLY = "WEEKLY", "Hebdomadaire"
        BIWEEKLY = "BIWEEKLY", "Bi-mensuel"
        MONTHLY = "MONTHLY", "Mensuel"
        ON_THRESHOLD = "ON_THRESHOLD", "Au franchissement d'un seuil"

    name = models.CharField(max_length=140)
    frequency = models.CharField(max_length=14, choices=Frequency.choices)
    anchor_day = models.PositiveSmallIntegerField(
        default=5, verbose_name="Jour de declenchement",
        help_text="Hebdomadaire : 1=lundi … 7=dimanche. Mensuel : jour du mois.",
    )
    cutoff_hours = models.PositiveIntegerField(
        default=24, verbose_name="Delai de coupure (h)",
        help_text="Les liberations survenues apres la coupure basculent au cycle suivant.",
    )
    minimum_amount_xaf = models.PositiveIntegerField(default=1000)
    carry_forward = models.BooleanField(
        default=True, verbose_name="Report si sous le minimum",
    )
    default_payee_type = models.CharField(
        max_length=20, blank=True, default="",
        choices=DistributionRule.PayeeType.choices,
    )

    def next_run_at(self, now=None):
        """
        Prochaine date de reglement selon ce cycle.

        ─────────────────────────────────────────────────────────────────
        UNE DATE VAUT MIEUX QU'UNE CLE

        `next_settlement_cycle` retournait « cycle-weekly » — une reference
        technique. Un partenaire a besoin de savoir QUAND, et un compte a
        rebours vaut mieux qu'une date seule : c'est la difference entre une
        information et un engagement.

        Le seuil ON_THRESHOLD ne retourne rien, et c'est correct : il ne
        depend pas du calendrier mais du montant accumule. Annoncer une date
        qui ne tiendrait pas serait pire que ne rien annoncer.
        ─────────────────────────────────────────────────────────────────
        """
        from datetime import timedelta

        from django.utils import timezone

        maintenant = now or timezone.now()

        if self.frequency == self.Frequency.ON_THRESHOLD:
            return None

        if self.frequency == self.Frequency.WEEKLY:
            # anchor_day : 1 = lundi … 7 = dimanche.
            cible = max(1, min(7, self.anchor_day))
            actuel = maintenant.isoweekday()
            delta = (cible - actuel) % 7
            if delta == 0:
                # Le jour meme : c'est pour aujourd'hui si la coupure n'est
                # pas passee, sinon la semaine prochaine.
                delta = 0 if maintenant.hour < 24 - self.cutoff_hours % 24 else 7
            return (maintenant + timedelta(days=delta)).replace(
                hour=0, minute=0, second=0, microsecond=0)

        if self.frequency == self.Frequency.BIWEEKLY:
            cible = max(1, min(7, self.anchor_day))
            delta = (cible - maintenant.isoweekday()) % 7
            # Un cycle sur deux : on saute une semaine si le numero de
            # semaine ISO ne correspond pas a la parite du cycle.
            semaine = maintenant.isocalendar()[1]
            if semaine % 2 == 1:
                delta += 7
            return (maintenant + timedelta(days=delta)).replace(
                hour=0, minute=0, second=0, microsecond=0)

        if self.frequency == self.Frequency.MONTHLY:
            jour = max(1, min(28, self.anchor_day))
            if maintenant.day < jour:
                return maintenant.replace(
                    day=jour, hour=0, minute=0, second=0, microsecond=0)
            # Mois suivant.
            mois = maintenant.month + 1
            annee = maintenant.year + (1 if mois > 12 else 0)
            mois = 1 if mois > 12 else mois
            return maintenant.replace(
                year=annee, month=mois, day=jour,
                hour=0, minute=0, second=0, microsecond=0)

        return None

    class Meta:
        app_label = "payments"
        ordering = ["config_key", "-version"]
        unique_together = [("config_key", "version")]
        verbose_name = "Cycle de reglement"
        verbose_name_plural = "Cycles de reglement"


class PayoutPolicy(VersionedConfig):
    """Regles d'approbation et d'execution des versements."""

    GOVERNANCE_LEVEL = GovernanceLevel.N2
    IMMUTABLE_FIELDS = (
        "config_key", "version",
        "required_approvals", "dual_approval_threshold_xaf",
    )

    name = models.CharField(max_length=140)
    payee_type = models.CharField(
        max_length=20, blank=True, default="",
        choices=DistributionRule.PayeeType.choices,
    )
    min_payout_xaf = models.PositiveIntegerField(default=1000)
    max_payout_xaf = models.PositiveIntegerField(default=5_000_000)
    daily_cap_xaf = models.PositiveIntegerField(default=10_000_000)
    monthly_cap_xaf = models.PositiveIntegerField(default=100_000_000)
    required_approvals = models.PositiveSmallIntegerField(default=1)
    dual_approval_threshold_xaf = models.PositiveIntegerField(
        default=100_000,
        help_text="Au-dela, deux validateurs distincts sont exiges.",
    )
    cooling_period_hours = models.PositiveIntegerField(
        default=0, verbose_name="Refroidissement (h)",
    )
    momo_change_cooling_hours = models.PositiveIntegerField(
        default=72,
        verbose_name="Refroidissement apres changement de numero (h)",
        help_text=(
            "Vecteur d'attaque classique : compromettre un compte, changer le "
            "numero, vider le du. Sans ce delai, la compromission est une perte seche."
        ),
    )
    auto_execute_on_approval = models.BooleanField(default=False)
    require_kyc_verified = models.BooleanField(default=True)
    max_pending_requests = models.PositiveSmallIntegerField(default=1)
    allowed_weekdays = models.JSONField(
        default=list, blank=True,
        help_text="Ex : [1,2,3,4,5] pour les jours ouvres. Vide = tous les jours.",
    )
    priority = models.IntegerField(default=0)

    # ── Compensation d'une creance sur un reglement ──────────────────────────
    max_offset_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("50.00"),
        verbose_name="Retenue maximale (%)",
        help_text=(
            "Part maximale d'un reglement pouvant etre retenue pour recouvrer "
            "une creance. A 100 %, un partenaire qui doit autant qu'on lui doit "
            "toucherait ZERO : il ne pourrait plus s'approvisionner ni livrer, "
            "et la retenue totale s'apparente juridiquement a une saisie."
        ),
    )
    min_settlement_after_offset_xaf = models.PositiveIntegerField(
        default=0,
        verbose_name="Reste minimal apres retenue (FCFA)",
        help_text="Plancher absolu en valeur, cumule au plafond en pourcentage.",
    )

    # ── Reglement exceptionnel hors cycle ────────────────────────────────────
    allow_exceptional_settlement = models.BooleanField(
        default=False,
        verbose_name="Autoriser les reglements hors cycle",
        help_text=(
            "Chaque exception rapproche du modele portefeuille que le "
            "referentiel interdit pour raison reglementaire."
        ),
    )
    exceptional_required_approvals = models.PositiveSmallIntegerField(
        default=2,
        verbose_name="Approbations exigees (hors cycle)",
        help_text="Double validation systematique, quel que soit le montant.",
    )
    exceptional_max_amount_xaf = models.PositiveIntegerField(
        default=500000, verbose_name="Plafond par reglement hors cycle",
    )
    exceptional_max_percent_of_due = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("100.00"),
        verbose_name="Part maximale du montant du (%)",
    )
    exceptional_max_per_month = models.PositiveSmallIntegerField(
        default=1,
        verbose_name="Quota mensuel par partenaire",
        help_text="Au-dela, la demande est refusee automatiquement.",
    )
    exceptional_alert_share_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("10.00"),
        verbose_name="Seuil d'alerte sur la part d'exceptionnel (%)",
        help_text=(
            "LE garde-fou reglementaire. Le risque n'est pas UNE exception, "
            "c'est qu'elle devienne la norme : si une part importante des "
            "reglements est exceptionnelle, un regulateur verra un "
            "portefeuille quelle que soit l'etiquette."
        ),
    )

    class Meta:
        app_label = "payments"
        ordering = ["-priority", "-version"]
        unique_together = [("config_key", "version")]
        verbose_name = "Politique de versement"
        verbose_name_plural = "Politiques de versement"

    def clean(self):
        if self.min_payout_xaf > self.max_payout_xaf:
            raise ValidationError("Le minimum de versement depasse le maximum.")
        if self.required_approvals < 1:
            raise ValidationError("Au moins une approbation est requise.")


# ─────────────────────────────────────────────────────────────────────────────
# CONTROLE DES CHANGEMENTS — MAKER-CHECKER
# ─────────────────────────────────────────────────────────────────────────────

class RiskPolicy(VersionedConfig):
    """
    Parametres de detection du risque et de fraude.

    ─────────────────────────────────────────────────────────────────────────
    UN PRINCIPE STRUCTURANT : LE PAYEUR TIERS N'EST PAS UN SUSPECT
    Au Cameroun, payer pour un proche est le cas NOMINAL du segment diaspora,
    principal moteur de marge. Un systeme qui bloque par defaut ce
    comportement detruit le segment le plus rentable pour prevenir une fraude
    qui, elle, est marginale.
    Le signal reellement discriminant d'une mule financiere n'est pas
    « un tiers paie ». C'est un MEME NUMERO servant un nombre anormal de
    comptes distincts.
    ─────────────────────────────────────────────────────────────────────────

    Tous les seuils sont administrables (principe P2). Aucun n'est en dur.
    """

    GOVERNANCE_LEVEL = GovernanceLevel.N2
    IMMUTABLE_FIELDS = ("config_key", "version")

    name = models.CharField(max_length=140)

    # ── Numero partage — LE signal de mule financiere ────────────────────────
    shared_msisdn_payee_threshold = models.PositiveSmallIntegerField(
        default=2, verbose_name="Comptes beneficiaires par numero",
        help_text="Au-dela, le numero sert plusieurs beneficiaires : signal fort.",
    )
    shared_msisdn_buyer_threshold = models.PositiveSmallIntegerField(
        default=5, verbose_name="Acheteurs distincts par numero payeur",
        help_text=(
            "Un numero diaspora finance legitimement plusieurs proches. "
            "Le seuil doit rester GENEREUX : c'est le volume anormal qui "
            "compte, pas le fait de payer pour autrui."
        ),
    )
    shared_msisdn_window_days = models.PositiveSmallIntegerField(default=30)

    # ── Velocite ─────────────────────────────────────────────────────────────
    velocity_intents_per_hour = models.PositiveSmallIntegerField(
        default=10, verbose_name="Intentions par heure et par acheteur",
    )
    velocity_failed_attempts = models.PositiveSmallIntegerField(
        default=5, verbose_name="Tentatives echouees consecutives",
    )

    # ── Montant ──────────────────────────────────────────────────────────────
    amount_anomaly_multiplier = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("5.00"),
        verbose_name="Multiplicateur d'anomalie de montant",
        help_text="Montant superieur a N fois la moyenne de l'acheteur.",
    )
    amount_review_threshold_xaf = models.PositiveIntegerField(
        default=500000, verbose_name="Seuil de revue manuelle (FCFA)",
    )

    # ── Changement de numero suivi d'un versement ────────────────────────────
    momo_change_lookback_days = models.PositiveSmallIntegerField(
        default=7,
        help_text=(
            "Un changement de numero suivi de pres par une demande de "
            "versement est le scenario d'un compte compromis."
        ),
    )

    # ── Ponderation du score de risque ───────────────────────────────────────
    weight_shared_msisdn = models.PositiveSmallIntegerField(default=40)
    weight_velocity = models.PositiveSmallIntegerField(default=20)
    weight_amount = models.PositiveSmallIntegerField(default=15)
    weight_new_payer = models.PositiveSmallIntegerField(
        default=5,
        help_text=(
            "VOLONTAIREMENT FAIBLE. Un premier paiement par un tiers est le "
            "cas nominal du segment diaspora."
        ),
    )
    weight_momo_change = models.PositiveSmallIntegerField(
        default=50,
        help_text=(
            "Calibre pour atteindre A LUI SEUL le seuil de revue. La fenetre "
            "qui compte est celle ou le refroidissement de 72 h a expire mais "
            "ou le changement reste recent : le versement redevient possible "
            "alors que le compte a peut-etre ete compromis."
        ),
    )
    weight_failed_burst = models.PositiveSmallIntegerField(default=10)

    # ── Seuils d'action ──────────────────────────────────────────────────────
    review_score_threshold = models.PositiveSmallIntegerField(
        default=50, verbose_name="Score declenchant une revue",
    )
    block_score_threshold = models.PositiveSmallIntegerField(
        default=90, verbose_name="Score declenchant un blocage",
        help_text=(
            "Volontairement HAUT. Un blocage automatique sur un faux positif "
            "coute un client ; le laisser passer coute une transaction."
        ),
    )
    auto_block_enabled = models.BooleanField(
        default=False, verbose_name="Blocage automatique actif",
        help_text=(
            "Desactive par defaut. Tant qu'il est inactif, un score eleve "
            "produit une ALERTE et non un refus."
        ),
    )

    # ── Trust Score partenaire ───────────────────────────────────────────────
    trust_initial_score = models.PositiveSmallIntegerField(default=70)
    trust_dispute_penalty = models.PositiveSmallIntegerField(default=10)
    trust_late_penalty = models.PositiveSmallIntegerField(default=5)
    trust_success_bonus = models.PositiveSmallIntegerField(default=1)
    trust_window_days = models.PositiveSmallIntegerField(default=90)
    trust_adjustment_review_xaf = models.PositiveIntegerField(
        default=50000,
        verbose_name="Seuil de revue d'un ajustement Trust Score (FCFA)",
        help_text=(
            "Au-dela, un ajustement issu du Trust Score exige une validation "
            "humaine. Un bug de calcul applique en masse viderait des "
            "partenaires avant qu'on le detecte."
        ),
    )

    priority = models.IntegerField(default=0)

    class Meta(VersionedConfig.Meta):
        verbose_name = "Politique de risque"
        verbose_name_plural = "Politiques de risque"

    def __str__(self):
        return f"{self.config_key} v{self.version} — {self.name}"


class RelayCompensationRule(VersionedConfig):
    """
    Remuneration contractuelle d'un point relais.

    ─────────────────────────────────────────────────────────────────────────
    CE N'EST PAS UNE REGLE DE REPARTITION

    Un point relais n'est PAS paye par l'acheteur : sa remuneration ne sort
    pas des frais de livraison, elle decoule du contrat signe avec BelivaY.

    Consequence comptable : ce n'est pas un sequestre mais une CHARGE de la
    plateforme. Elle rejoint le cycle de reglement par un ajustement, comme
    n'importe quelle somme due a un partenaire.

    Cette distinction n'est pas cosmetique. Un montant preleve sur le
    paiement de l'acheteur devrait lui etre expose ; une charge de la
    plateforme ne le concerne pas.
    ─────────────────────────────────────────────────────────────────────────

    LE MONTANT EST NEGOCIE PAR CONTRAT, donc propre a chaque point relais.
    Une regle sans `payee_code` sert de valeur par defaut pour les relais
    qui n'ont pas de contrat particulier.
    """

    GOVERNANCE_LEVEL = GovernanceLevel.N2
    IMMUTABLE_FIELDS = ("config_key", "version")

    class Basis(models.TextChoices):
        PER_PARCEL = "PER_PARCEL", "Montant fixe par colis remis"

    class ParcelSize(models.TextChoices):
        """
        Categories de colis.

        Le vocabulaire est defini ICI parce que `Shipment.parcel_size` est
        un champ LIBRE, sans choix declares — le domaine livraison n'en
        avait pas fixe. Les valeurs restent des chaines : une expedition
        portant une taille inconnue tombe sur la regle « toutes tailles »
        plutot que d'echouer.
        """
        SMALL = "SMALL", "Petit colis"
        STANDARD = "STANDARD", "Colis standard"
        LARGE = "LARGE", "Gros colis"
        BULKY = "BULKY", "Encombrant"

    name = models.CharField(max_length=140)

    payee_code = models.CharField(
        max_length=40, blank=True, default="", db_index=True,
        verbose_name="Point relais",
        help_text=(
            "Code du compte financier du point relais. Laisser VIDE pour "
            "definir le tarif par defaut applique aux relais sans contrat "
            "particulier."
        ),
    )
    parcel_size = models.CharField(
        max_length=20, blank=True, default="", db_index=True,
        choices=ParcelSize.choices,
        verbose_name="Categorie de colis",
        help_text=(
            "Laisser VIDE pour appliquer ce tarif a TOUTES les categories. "
            "Un encombrant n'occupe pas la meme place qu'un petit colis : "
            "les contrats le refletent."
        ),
    )
    basis = models.CharField(
        max_length=20, choices=Basis.choices, default=Basis.PER_PARCEL,
    )
    amount_xaf = models.PositiveIntegerField(
        verbose_name="Montant (FCFA)",
        help_text="Montant du au point relais pour chaque colis remis.",
    )
    is_accepted = models.BooleanField(
        default=True,
        verbose_name="Categorie acceptee",
        help_text=(
            "Decocher si ce point relais REFUSE cette categorie — un local "
            "exigu ne prend pas d'encombrant. Aucune remuneration n'est "
            "alors due, et le domaine livraison peut interroger cette grille "
            "pour eviter de lui router le colis."
        ),
    )

    contract_reference = models.CharField(
        max_length=120, blank=True, default="",
        verbose_name="Reference du contrat",
        help_text="Piece justificative de la negociation.",
    )
    priority = models.IntegerField(
        default=0,
        help_text="Une regle nominative doit primer sur la regle par defaut.",
    )

    class Meta(VersionedConfig.Meta):
        verbose_name = "Remuneration de point relais"
        verbose_name_plural = "Remunerations de points relais"

    def __str__(self):
        cible = self.payee_code or "(par defaut)"
        taille = self.parcel_size or "toutes tailles"
        if not self.is_accepted:
            return f"{cible} / {taille} — REFUSE"
        return f"{cible} / {taille} — {self.amount_xaf} XAF par colis"


class ConfigChangeRequest(models.Model):
    """
    Demande de changement de configuration financiere.

    Aucune modification ne s'applique directement. Celui qui demande n'est
    jamais celui qui approuve — contrainte appliquee EN BASE, pas seulement
    en Python.

    Pourquoi : "l'admin peut tout changer instantanement" signifie qu'un compte
    compromis peut, en une requete, rediriger les frais ou ramener le delai
    d'escrow a zero pour vider le sequestre. Le maker-checker conserve
    l'autonomie totale et supprime le point de defaillance unique.

    Aucune cle etrangere generique : la cible est designee par un LABEL
    (nom de modele) et une CLE, jamais par un GenericForeignKey.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente d'approbation"
        APPROVED = "APPROVED", "Approuvee"
        REJECTED = "REJECTED", "Rejetee"
        APPLIED = "APPLIED", "Appliquee"
        ROLLED_BACK = "ROLLED_BACK", "Annulee"

    class Action(models.TextChoices):
        CREATE = "CREATE", "Creation"
        UPDATE = "UPDATE", "Nouvelle version"
        DEACTIVATE = "DEACTIVATE", "Desactivation"

    reference = models.CharField(max_length=40, unique=True, editable=False)
    target_model = models.CharField(
        max_length=60, verbose_name="Modele cible",
        help_text="FeeRule, EscrowPolicy, DistributionRule…",
    )
    target_key = models.SlugField(
        max_length=120, verbose_name="Cle cible",
    )
    action = models.CharField(max_length=12, choices=Action.choices, default=Action.UPDATE)
    governance_level = models.CharField(
        max_length=2, choices=GovernanceLevel.choices, default=GovernanceLevel.N2,
    )

    payload = models.JSONField(
        verbose_name="Valeurs demandees",
        help_text="Champs de la nouvelle version.",
    )
    previous_snapshot = models.JSONField(
        null=True, blank=True,
        verbose_name="Etat precedent",
        help_text="Permet le retour arriere en un clic.",
    )
    diff = models.JSONField(default=dict, blank=True, verbose_name="Differences")

    justification = models.TextField(
        verbose_name="Justification",
        help_text="Obligatoire. Tracee dans le journal d'audit.",
    )
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PENDING,
    )

    requested_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="config_changes_requested",
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        User, on_delete=models.PROTECT, null=True, blank=True,
        related_name="config_changes_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default="")

    effective_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Application differee",
        help_text="Vide = applicable des approbation.",
    )
    applied_at = models.DateTimeField(null=True, blank=True)
    applied_version = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        app_label = "payments"
        ordering = ["-requested_at"]
        verbose_name = "Demande de changement (config financiere)"
        verbose_name_plural = "Demandes de changement (config financiere)"
        constraints = [
            # Le demandeur ne peut JAMAIS etre l'approbateur.
            models.CheckConstraint(
                condition=(
                    models.Q(approved_by__isnull=True)
                    | ~models.Q(approved_by=models.F("requested_by"))
                ),
                name="config_change_maker_is_not_checker",
            ),
        ]

    def __str__(self):
        return f"{self.reference} — {self.target_model}/{self.target_key} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.reference:
            annee = timezone.now().year
            compteur = ConfigChangeRequest.objects.filter(
                requested_at__year=annee
            ).count() + 1
            self.reference = f"BLV-CFG-{annee}-{compteur:05d}"
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ImmutableConfigError(
            "Une demande de changement de configuration ne se supprime jamais : "
            "elle constitue une piece du journal d'audit."
        )


# Les tarifs de livraison et indemnites vivent dans un fichier separe,
# mais Django doit les decouvrir ici.
from .delivery_pricing import (  # noqa: E402,F401
    CourierIndemnityRule, DeliveryPricingRule,
)
