# backend/apps/payments/tests/domain/test_unresolved_payees.py
# Une regle sans beneficiaire connu ne doit pas faire echouer tout le plan.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/domain/ -q
#
# ─────────────────────────────────────────────────────────────────────────────
# CE FICHIER EXISTE A CAUSE D'UN BUG TROUVE PAR payments_smoke_test
#
# Au CHECKOUT, aucun transporteur n'est encore assigne. La regle
# « 70 % du transport a l'entreprise de livraison » n'avait donc aucun
# beneficiaire, et le moteur refusait TOUT le plan :
#
#     DistributionError : Regle 'Transport a l'entreprise de livraison'
#     cible DELIVERY_COMPANY mais aucun beneficiaire de ce type n'est fourni
#
# Consequence : AUCUN paiement comportant des frais de livraison n'etait
# possible — c'est-a-dire le cas nominal.
#
# Les tests unitaires ne l'avaient pas vu : ma configuration de test
# n'attribuait le transport qu'a la PLATEFORME.
# ─────────────────────────────────────────────────────────────────────────────

from decimal import Decimal

import pytest

from apps.payments.domain.distribution import (
    ComponentInput, DistributionRuleSpec, build_distribution_plan,
)
from apps.payments.domain.enums import (
    DistributionBasis, EconomicComponent, PayeeType,
)
from apps.payments.domain.exceptions import IncompleteDistribution
from apps.payments.domain.money import Money

VENDEUR = "PAY-VND-000001"
TRANSPORTEUR = "PAY-DLV-000001"


def regle(nom, composant, type_beneficiaire, base, valeur=0, priorite=0,
          identifiant=1):
    return DistributionRuleSpec(
        rule_version_id=identifiant, name=nom, component=composant,
        payee_type=type_beneficiaire, basis=base,
        value=Decimal(str(valeur)), priority=priorite)


REGLES = [
    regle("Marchandise au vendeur", EconomicComponent.GOODS,
          PayeeType.VENDOR, DistributionBasis.REMAINDER, priorite=10,
          identifiant=1),
    regle("Transport a l'entreprise de livraison", EconomicComponent.TRANSPORT,
          PayeeType.DELIVERY_COMPANY, DistributionBasis.PERCENT_OF_COMPONENT,
          valeur=70, priorite=20, identifiant=2),
    regle("Part plateforme transport", EconomicComponent.TRANSPORT,
          PayeeType.PLATFORM, DistributionBasis.REMAINDER, priorite=10,
          identifiant=3),
]

PANIER = [
    ComponentInput(EconomicComponent.GOODS, Money(45000), order_id=1,
                   commission_rate=Decimal("15")),
    ComponentInput(EconomicComponent.TRANSPORT, Money(5000)),
]


class TestTransporteurInconnu:
    """Le cas du checkout : le transporteur n'est pas encore assigne."""

    def test_le_plan_est_calculable_sans_transporteur(self):
        """
        LE test qui debloque le checkout.

        Sans transporteur, la regle qui le cible est ecartee et la part
        revient au reliquat. Le plan reste calculable.
        """
        plan = build_distribution_plan(
            PANIER, REGLES,
            payee_codes={PayeeType.VENDOR: VENDEUR},
            payee_types={VENDEUR: PayeeType.VENDOR},
        )
        assert plan.total_distributed == Money(50000)

    def test_la_conservation_est_preservee(self):
        """
        LE point le plus risque de cette correction.

        Ecarter une regle libere un montant. Si le reliquat ne l'absorbait
        pas, de l'argent disparaitrait du plan.
        """
        plan = build_distribution_plan(
            PANIER, REGLES,
            payee_codes={PayeeType.VENDOR: VENDEUR},
            payee_types={VENDEUR: PayeeType.VENDOR},
        )
        total = plan.total_gross() + plan.platform_revenue - Money(
            sum(h.commission.amount for h in plan.holds))
        assert total == plan.total_distributed

    def test_la_part_transport_revient_a_la_plateforme(self):
        plan = build_distribution_plan(
            PANIER, REGLES,
            payee_codes={PayeeType.VENDOR: VENDEUR},
            payee_types={VENDEUR: PayeeType.VENDOR},
        )
        transports = [h for h in plan.holds
                      if h.component == EconomicComponent.TRANSPORT]
        assert transports == []          # aucun sequestre transport
        # 6 750 de commission marchandise + 5 000 de transport
        assert plan.platform_revenue == Money(11750)

    def test_l_ecart_est_signale_jamais_silencieux(self):
        """
        Un montant qui change de destinataire doit rester explicable.
        """
        plan = build_distribution_plan(
            PANIER, REGLES,
            payee_codes={PayeeType.VENDOR: VENDEUR},
            payee_types={VENDEUR: PayeeType.VENDOR},
        )
        assert plan.needs_reallocation is True
        assert len(plan.unresolved_rules) == 1

        ecarte = plan.unresolved_rules[0]
        assert ecarte["payee_type"] == "DELIVERY_COMPANY"
        assert ecarte["component"] == "TRANSPORT"
        assert "Aucun beneficiaire" in ecarte["reason"]

        assert any("ECARTEE" in ligne for ligne in plan.trace)

    def test_l_instantane_porte_le_drapeau(self):
        """L'administration doit voir qu'une reallocation est due."""
        plan = build_distribution_plan(
            PANIER, REGLES,
            payee_codes={PayeeType.VENDOR: VENDEUR},
            payee_types={VENDEUR: PayeeType.VENDOR},
        )
        instantane = plan.as_snapshot()
        assert instantane["needs_reallocation"] is True
        assert len(instantane["unresolved_rules"]) == 1


class TestTransporteurConnu:
    """Quand le transporteur EST assigne, rien ne change."""

    def test_la_repartition_nominale_est_intacte(self):
        plan = build_distribution_plan(
            PANIER, REGLES,
            payee_codes={PayeeType.VENDOR: VENDEUR,
                         PayeeType.DELIVERY_COMPANY: TRANSPORTEUR},
            payee_types={VENDEUR: PayeeType.VENDOR,
                         TRANSPORTEUR: PayeeType.DELIVERY_COMPANY},
        )
        transports = [h for h in plan.holds
                      if h.component == EconomicComponent.TRANSPORT]
        assert len(transports) == 1
        assert transports[0].payee_code == TRANSPORTEUR
        assert transports[0].gross == Money(3500)       # 70 %

    def test_aucune_reallocation_due(self):
        plan = build_distribution_plan(
            PANIER, REGLES,
            payee_codes={PayeeType.VENDOR: VENDEUR,
                         PayeeType.DELIVERY_COMPANY: TRANSPORTEUR},
            payee_types={VENDEUR: PayeeType.VENDOR,
                         TRANSPORTEUR: PayeeType.DELIVERY_COMPANY},
        )
        assert plan.needs_reallocation is False
        assert plan.unresolved_rules == ()

    def test_la_plateforme_ne_garde_que_sa_part(self):
        plan = build_distribution_plan(
            PANIER, REGLES,
            payee_codes={PayeeType.VENDOR: VENDEUR,
                         PayeeType.DELIVERY_COMPANY: TRANSPORTEUR},
            payee_types={VENDEUR: PayeeType.VENDOR,
                         TRANSPORTEUR: PayeeType.DELIVERY_COMPANY},
        )
        # 6 750 commission + 1 500 part transport
        assert plan.platform_revenue == Money(8250)


class TestConfigurationIncomplete:
    """L'indulgence a une limite : sans filet, on echoue toujours."""

    def test_sans_regle_de_repli_le_plan_echoue(self):
        """
        Si AUCUNE regle ne designe un beneficiaire connu, il n'y a pas de
        plan possible. On echoue, plutot que d'inventer une destination.
        """
        regles_sans_repli = [
            regle("Transport au transporteur", EconomicComponent.TRANSPORT,
                  PayeeType.DELIVERY_COMPANY,
                  DistributionBasis.REMAINDER, priorite=10, identifiant=1),
        ]
        with pytest.raises(IncompleteDistribution, match="REMAINDER vers PLATFORM"):
            build_distribution_plan(
                [ComponentInput(EconomicComponent.TRANSPORT, Money(5000))],
                regles_sans_repli, payee_codes={}, payee_types={},
            )

    def test_un_vendeur_absent_echoue_toujours(self):
        """
        La marchandise SANS vendeur n'a aucun sens : il n'existe pas de
        repli legitime. Le plan doit echouer.
        """
        regles_marchandise = [
            regle("Marchandise au vendeur", EconomicComponent.GOODS,
                  PayeeType.VENDOR, DistributionBasis.REMAINDER,
                  priorite=10, identifiant=1),
        ]
        with pytest.raises(IncompleteDistribution):
            build_distribution_plan(
                [ComponentInput(EconomicComponent.GOODS, Money(45000),
                                order_id=1)],
                regles_marchandise, payee_codes={}, payee_types={},
            )