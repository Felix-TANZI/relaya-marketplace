# backend/apps/payments/bridge/retours.py
# Course de retour — feuille de route D18 ; spec v2.1, R69.1 : r_retour, payée après arbitrage par la partie en tort.
# Vendeur, entreprise de livraison ou relais : une créance sur ses prochains versements, créée en attente et
# approuvée par un tiers (maker-checker). Client : rien à prélever, son retour non validé n'est pas remboursé.

import logging

logger = logging.getLogger("apps.payments")


def _payee(ret, partie):
    from .actors import payee_for_delivery_company, payee_for_relay_point, payee_for_vendor

    if partie == "vendeur" and ret.vendor is not None:
        profil = getattr(ret.vendor, "vendor_profile", None)
        return payee_for_vendor(profil, create=True) if profil else None
    if partie == "transporteur":
        colis = ret.order.shipments.filter(vendor=ret.vendor).select_related("courier__delivery_organization").first()
        entreprise = getattr(getattr(colis, "courier", None), "delivery_organization", None)
        return payee_for_delivery_company(entreprise, create=True) if entreprise else None
    if partie == "relais" and ret.order.relay_point_id:
        return payee_for_relay_point(ret.order.relay_point, create=True)
    return None


def facturer_course_de_retour(ret) -> None:
    from apps.payments.settlements.models import Adjustment
    from apps.payments.settlements.services import _systeme, create_adjustment

    if not ret.frais_retour_xaf or ret.frais_retour_partie in ("", "client"):
        return
    try:
        payee = _payee(ret, ret.frais_retour_partie)
        if payee is None:
            return
        evenement = f"R69.1:retour-{ret.pk}"
        if Adjustment.objects.filter(payee=payee, source_event=evenement).exists():
            return
        create_adjustment(
            payee=payee, direction=Adjustment.Direction.CREDIT, category=Adjustment.Category.RETURN_COST,
            amount_xaf=ret.frais_retour_xaf, created_by=_systeme(), source_order_id=ret.order_id,
            source_event=evenement,
            reason=f"Course de retour du retour #{ret.pk} (R69.1), partie en tort : {ret.frais_retour_partie}.",
        )
    except Exception:
        logger.exception("Course de retour non facturée pour le retour #%s.", ret.pk)
