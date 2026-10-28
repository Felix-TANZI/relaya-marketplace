# backend/apps/payments/bridge/vendredi.py
# Le versement du vendredi — feuille de route D11, D13, D20 ; spec v2.1 :
#
#   R22.2  chaque vendredi avant r_versement_heure, le vendeur reçoit ses net_b libérés au plus tard le jeudi minuit
#   R43.1  le relais et l'entreprise de livraison aussi, sans demande et sans minimum
#   R40.4  versement du relais = Σ part(format) + Σ part_garde + r_relais_comptoir_bonus × colis payés au comptoir
#          − espèces de garde encaissées par le relais (puis frais_versement, R43.2, retenus au versement)
#   R40.5  un solde négatif est reporté au vendredi suivant ; au-delà de r_solde_negatif_semaines, alerte finance
#
# Ce module lit le domaine livraison (colis remis, retours déposés, garde) : il fait partie du pont, seul autorisé à
# importer les autres applications (principe P1).

import logging
from datetime import timedelta

from django.utils import timezone

from apps.regles import services as regles

logger = logging.getLogger("apps.payments")


def _formats(parcel) -> list[str]:
    """Formats des colis de cette boutique dans la commande (frais figés, R64) ; P à défaut de détail."""
    detail = parcel.shipment.order.frais_detail or {}
    for b in detail.get("boutiques") or []:
        if b.get("vendeur") == parcel.shipment.vendor_id:
            return list(b.get("colis_b") or ["P"])
    return ["P"]


def montant_relais(relais, debut, fin) -> tuple[int, str]:
    """R40.4 pour la semaine [debut, fin) : (montant avant frais de versement, détail lisible)."""
    from apps.orders.models import Return
    from apps.shipping import garde
    from apps.shipping.models import RelayParcel

    remis = list(RelayParcel.objects.filter(relay_point=relais, picked_up_at__gte=debut, picked_up_at__lt=fin)
                 .select_related("shipment__order"))
    retours = Return.objects.filter(dropoff_relay_point=relais, received_at__gte=debut, received_at__lt=fin).count()
    formats, jours = [], []
    for parcel in remis:
        formats += _formats(parcel)
        jours.append(garde.jour(parcel.shipment.order, parcel.picked_up_at) or 0)
    formats += ["P"] * retours  # R40.1 : un retour déposé compte comme un colis (format inconnu : pochette)
    especes = sum(p.garde_encaissee_xaf or 0 for p in remis)
    nb_comptoir = sum(1 for p in remis if p.shipment.order.comptoir_paye_le)  # R40.4 : colis payés au comptoir (D14)
    v = regles.moteur().versement_relais(formats, [int(j) for j in jours], nb_comptoir, especes)
    detail = (f"{len(remis)} colis remis dont {nb_comptoir} payé(s) au comptoir, {retours} retour(s) déposé(s), "
              f"espèces de garde encaissées {especes} F.")
    return int(v["montant"]), detail


def preparer_relais(debut, fin) -> int:
    from apps.accounts.models import RelayPointProfile
    from apps.payments.settlements.services import remunerer_semaine

    from .actors import payee_for_relay_point

    semaine = timezone.localtime(fin).date().isoformat()
    n = 0
    for relais in RelayPointProfile.objects.filter(status=RelayPointProfile.Status.APPROVED):
        try:
            montant, detail = montant_relais(relais, debut, fin)
            if montant:
                remunerer_semaine(payee_for_relay_point(relais, create=True), montant=montant, semaine=semaine,
                                  detail=detail)
                n += 1
        except Exception:  # un relais en erreur n'empêche pas les autres d'être payés
            logger.exception("Versement R40.4 non préparé pour le relais #%s.", relais.pk)
    _alerter_soldes_negatifs()
    return n


def _alerter_soldes_negatifs() -> None:
    """R40.5 : un solde négatif reporté plus de r_solde_negatif_semaines alerte l'équipe finance."""
    from django.contrib.auth.models import User

    from apps.accounts.models import UserNotification
    from apps.payments.settlements.models import Adjustment

    limite = timezone.now() - timedelta(weeks=regles.reglage("r_solde_negatif_semaines"))
    anciens = Adjustment.objects.filter(source_contract="spec-v2.1#R40.4", direction=Adjustment.Direction.CREDIT,
                                        remaining_xaf__gt=0, created_at__lte=limite).select_related("payee")
    for a in anciens:
        for admin in User.objects.filter(is_staff=True, is_active=True):
            UserNotification.objects.get_or_create(
                user=admin, title=f"Solde négatif du relais {a.payee.display_label}"[:160],
                defaults={"message": f"{a.remaining_xaf} F restent dus depuis plus de "
                                     f"{regles.reglage('r_solde_negatif_semaines')} semaines (R40.5).",
                          "notification_type": UserNotification.NotificationType.SYSTEM})


def refus_metier(payee) -> str | None:
    """Feuille de route D19 : « Exiger les documents complets avant le premier versement. » Un vendeur dont les trois
    pièces ne sont pas validées n'est pas versé ; son argent reste dû et part le vendredi qui suit la validation."""
    from apps.vendors.kyc import identite_verifiee

    from .models import PayeeLink

    lien = PayeeLink.objects.filter(payee_account=payee, vendor__isnull=False).select_related("vendor__user").first()
    if lien is not None and not identite_verifiee(lien.vendor.user):
        return "pièce d'identité non vérifiée (D19)"
    return None


def executer(now=None) -> dict:
    """Le vendredi : versements R40.4 des relais, puis lots et demandes de versement de tous les bénéficiaires."""
    from apps.payments.settlements.services import VENDREDI, versements_du_vendredi

    local = timezone.localtime(now or timezone.now())
    if local.weekday() != VENDREDI or local.hour >= regles.reglage("r_versement_heure"):
        return {"skipped": True}
    fin = local.replace(hour=0, minute=0, second=0, microsecond=0)
    relais = preparer_relais(fin - timedelta(days=7), fin)
    resultat = versements_du_vendredi(now, refus=refus_metier)
    resultat["relay_weeks"] = relais
    return resultat
