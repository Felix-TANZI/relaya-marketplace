# backend/apps/payments/config/delivery_pricing.py
# Les frais de livraison, sortis du code.
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI CE MODELE
#
# `_compute_delivery_price` portait quatre montants EN DUR : 500 pour un
# retrait relais, 1000 pour une livraison a domicile, et les memes valeurs
# pour chaque vendeur supplementaire.
#
# Un montant facture a l'acheteur qui ne se modifie qu'en recompilant est
# ingerable : il faut un developpeur pour un changement commercial, et
# personne ne peut verifier ce qui est applique.
#
# ─────────────────────────────────────────────────────────────────────────────
# CE QUE CELA CHANGE
#
# Les frais rejoignent la configuration financiere versionnee : meme
# gouvernance que les tarifs relais, meme historique, meme circuit
# d'approbation. Ils deviennent editables depuis l'espace admin.
#
# Le calcul, lui, ne change pas : base + supplements par vendeur, plus la
# majoration de zone eloignee.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

from django.db import models

from .models import GovernanceLevel, VersionedConfig


class DeliveryPricingRule(VersionedConfig):
    """
    Bareme des frais de livraison factures a l'acheteur.

    Ces frais NE SONT PAS la remuneration du transporteur : celle-ci decoule
    de la regle de repartition sur le composant TRANSPORT. Ce sont deux
    choses distinctes, et les confondre ferait varier la part du
    transporteur a chaque changement de tarif.
    """

    # Un tarif engage l'acheteur : meme niveau de gouvernance que les frais
    # prestataire.
    GOVERNANCE_LEVEL = GovernanceLevel.N2

    class DeliveryMode(models.TextChoices):
        PICKUP = "PICKUP", "Retrait en point relais"
        DELIVERY = "DELIVERY", "Livraison a domicile"

    name = models.CharField(
        max_length=120,
        help_text="Nom affiche dans les ecrans de configuration.",
    )

    delivery_mode = models.CharField(
        max_length=12, choices=DeliveryMode.choices,
        help_text="Le mode de livraison auquel ce bareme s'applique.",
    )

    base_xaf = models.PositiveIntegerField(
        default=0,
        help_text="Frais de base, couvrant le premier vendeur du panier.",
    )

    # ─────────────────────────────────────────────────────────────────────
    # POURQUOI DEUX SUPPLEMENTS
    #
    # Un second vendeur dans la MEME zone ne coute qu'un arret de plus au
    # meme trajet. Un vendeur dans une AUTRE zone impose un detour.
    #
    # Facturer pareil ferait payer trop cher un panier groupe, ou pas assez
    # un panier disperse — et la difference sort de la poche de BelivaY.
    # ─────────────────────────────────────────────────────────────────────
    extra_vendor_same_zone_xaf = models.PositiveIntegerField(
        default=0,
        help_text="Supplement par vendeur supplementaire situe dans la meme "
                  "zone que les precedents.",
    )

    extra_vendor_other_zone_xaf = models.PositiveIntegerField(
        default=0,
        help_text="Supplement par vendeur supplementaire situe dans une zone "
                  "differente.",
    )

    apply_zone_surcharge = models.BooleanField(
        default=True,
        help_text="Ajoute la majoration portee par la zone de destination "
                  "quand elle est eloignee.",
    )

    filter_city = models.CharField(
        max_length=80, blank=True, default="",
        help_text="Ne s'applique qu'a cette ville. Vide = toutes.",
    )

    priority = models.PositiveSmallIntegerField(
        default=100,
        help_text="Plus le nombre est bas, plus la regle s'applique tot.",
    )

    class Meta:
        app_label = "payments"
        ordering = ["priority", "delivery_mode"]
        verbose_name = "Tarif de livraison"
        verbose_name_plural = "Tarifs de livraison"
        constraints = [
            models.UniqueConstraint(
                fields=["config_key", "version"],
                name="unique_delivery_pricing_version",
            ),
        ]

    def __str__(self) -> str:
        return (f"{self.get_delivery_mode_display()} — {self.base_xaf} XAF "
                f"(v{self.version})")


class CourierIndemnityRule(VersionedConfig):
    """
    Indemnites dues a un livreur en dehors de la course elle-meme.

    ─────────────────────────────────────────────────────────────────────
    POURQUOI UN MODELE A PART

    L'indemnite de course annulee vivait en dur dans `orders/views.py` :
    500 XAF, invisible et non modifiable.

    La loger dans `RelayCompensationRule` aurait ete plus rapide, mais ce
    modele porte `parcel_size` et `is_accepted` — deux notions qui n'ont
    aucun sens pour un livreur. Un champ hors sujet finit toujours par
    etre rempli au hasard.
    ─────────────────────────────────────────────────────────────────────
    """

    GOVERNANCE_LEVEL = GovernanceLevel.N2

    class Kind(models.TextChoices):
        COURSE_CANCELLED = ("COURSE_CANCELLED",
                            "Course annulee apres acceptation")
        WAITING_TIME = "WAITING_TIME", "Attente prolongee"
        FAILED_DELIVERY = "FAILED_DELIVERY", "Livraison infructueuse"

    name = models.CharField(
        max_length=140,
        help_text="Nom affiche dans les ecrans de configuration.",
    )

    kind = models.CharField(
        max_length=24, choices=Kind.choices,
        help_text="La situation qui ouvre droit a cette indemnite.",
    )

    amount_xaf = models.PositiveIntegerField(
        default=0,
        help_text="Montant verse au livreur. C'est une charge BelivaY, pas "
                  "une part du paiement acheteur.",
    )

    contract_reference = models.CharField(
        max_length=80, blank=True, default="",
        help_text="La reference du contrat qui autorise cette indemnite.",
    )

    class Meta:
        app_label = "payments"
        ordering = ["kind"]
        verbose_name = "Indemnite livreur"
        verbose_name_plural = "Indemnites livreur"
        constraints = [
            models.UniqueConstraint(
                fields=["config_key", "version"],
                name="unique_courier_indemnity_version",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.get_kind_display()} — {self.amount_xaf} XAF"


def resolve_indemnity(kind: str):
    """Trouve l'indemnite active pour une situation donnee."""
    return CourierIndemnityRule.current().filter(kind=kind).first()


def resolve_pricing(delivery_mode: str, city: str = ""):
    """
    Trouve le bareme applicable, du plus precis au plus general.

    Retourne None si aucun bareme n'est configure — l'appelant decide alors
    de son repli plutot que de recevoir un zero silencieux qui ferait
    livrer gratuitement.
    """
    actifs = list(DeliveryPricingRule.current().filter(
        delivery_mode=delivery_mode,
    ))
    if not actifs:
        return None

    ville = (city or "").strip().casefold()

    # Une regle qui vise cette ville prime sur la regle generale.
    if ville:
        precise = [
            r for r in actifs
            if r.filter_city and r.filter_city.strip().casefold() == ville
        ]
        if precise:
            return sorted(precise, key=lambda r: r.priority)[0]

    generales = [r for r in actifs if not r.filter_city]
    if generales:
        return sorted(generales, key=lambda r: r.priority)[0]

    return None