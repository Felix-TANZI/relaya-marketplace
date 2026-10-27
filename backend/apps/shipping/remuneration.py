# backend/apps/shipping/remuneration.py
# Paiement des entreprises de livraison selon leur grille signée — spec v2.1 :
#
#   R53.1  chaque entreprise signe sa grille ; chaque ligne est contrôlée contre son plafond (R54, A10)
#   R53.2  la grille couvre : domicile par niveau ; km au-delà de r_km_inclus ; suppléments de format ; tournée relais
#          par format ; XL ; retour ; transfert ; incidents
#   R54.3  jamais d'achat au-dessus du plafond : une ligne « bloquée » n'est pas payée tant que le porteur n'a pas
#          décidé par écrit ; R86 : exception de r_wink_exc_mois, puis le plafond
#   R43.1  l'entreprise est versée le vendredi, sans demande et sans minimum
#
# Décision du porteur (27/10/2026) : la grille REMPLACE la part du transport (règle « dist-transport-carrier ») ; les
# frais de livraison payés par le client restent à BelivaY, qui achète la prestation. Une prestation est due dès
# qu'elle est faite (colis remis à domicile ou déposé au relais) ; chaque prestation est une ligne PrestationEntreprise.
#
# Lignes « INCIDENT » : param « absence » (R51, client absent), « refus » (R85.2, refus d'un produit conforme),
# « deplacement » (R85.3, déplacement inutile), comme dans la grille de référence t_grille_reference (R53.3).

import logging
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.regles import services as regles

logger = logging.getLogger("apps.shipping")


def organisation_du_colis(shipment):
    return getattr(getattr(shipment, "courier", None), "delivery_organization", None)


def grille_en_vigueur(organisation, quand=None):
    from .models import GrilleAchat

    quand = timezone.localtime(quand or timezone.now()).date()
    return (GrilleAchat.objects.filter(organisation=organisation, entree_en_vigueur__lte=quand)
            .order_by("-entree_en_vigueur", "-pk").first())


def _tarif(ligne, quand) -> tuple[int, str]:
    """Le tarif payable d'une ligne : bloquée = 0 (R54.3) ; exception R86 jusqu'à son terme, puis le plafond."""
    if ligne.controle == "bloquee":
        return 0, f"Ligne {ligne.numero} bloquée (R54.3) : décision écrite du porteur nécessaire."
    if ligne.controle == "exception_r86":
        fin = ligne.grille.signee_le + timedelta(days=round(30.4375 * regles.reglage("r_wink_exc_mois")))
        if timezone.localtime(quand).date() > fin and ligne.plafond_achat is not None:
            return min(ligne.tarif, ligne.plafond_achat), f"Ligne {ligne.numero} : exception R86 échue, plafond appliqué."
    return ligne.tarif, ""


def enregistrer(shipment, nature: str, param: str = "", quantite: int = 1, petit_paquet: bool | None = None,
                quand=None):
    """Une prestation faite, au tarif de sa ligne de grille. Idempotent (une par colis, nature et param)."""
    from .models import PrestationEntreprise

    organisation = organisation_du_colis(shipment)
    if organisation is None or quantite <= 0:
        return None
    quand = quand or timezone.now()
    grille = grille_en_vigueur(organisation, quand)
    lignes = grille.lignes.filter(type=nature, param=param) if grille else None
    if lignes is not None and petit_paquet is not None:
        lignes = lignes.filter(petit_paquet=petit_paquet) or grille.lignes.filter(type=nature, param=param)
    ligne = lignes.first() if lignes is not None else None
    if ligne is None:
        tarif, note = 0, (f"Aucune ligne {nature} {param} dans la grille en vigueur." if grille else
                          "Aucune grille en vigueur pour cette entreprise.")
    else:
        tarif, note = _tarif(ligne, quand)
    try:
        with transaction.atomic():
            return PrestationEntreprise.objects.create(
                organisation=organisation, shipment=shipment, nature=nature, param=param, ligne=ligne,
                quantite=quantite, tarif=tarif, montant=tarif * quantite, note=note[:200], faite_le=quand)
    except IntegrityError:  # déjà enregistrée
        return None


def formats(shipment) -> list[str]:
    from apps.orders.absence import formats_du_colis

    return formats_du_colis(shipment)


def course_a_domicile(shipment, quand=None) -> None:
    """La course est faite : niveau de la course (R06.3), XL (R10.3), suppléments de format et km au-delà de
    r_km_inclus, lus dans les frais figés de la commande (R64)."""
    detail = shipment.order.frais_detail or {}
    niveau = detail.get("niv_course") or "centre"
    fmts = formats(shipment)
    enregistrer(shipment, "XL" if "XL" in fmts else "DOMICILE", niveau, quand=quand)
    for f in ("C1", "C2"):
        if fmts.count(f):
            enregistrer(shipment, "SUPPLEMENT_FORMAT", f, quantite=fmts.count(f), quand=quand)
    m = regles.moteur()
    for b in detail.get("boutiques") or []:
        if b.get("vendeur") == shipment.vendor_id:
            km = int(max(0, m.km_compte(b.get("km_b") or 0) - regles.reglage("r_km_inclus")))
            if km:
                enregistrer(shipment, "KM", "", quantite=km, quand=quand)


def depot_au_relais(shipment, relais, quand=None) -> None:
    """Le colis est déposé au relais : un colis de tournée par format (R53.2) ; petit paquet sous r_depart_colis (R86) ;
    supplément quand la tournée part d'une autre zone que le relais (R55)."""
    from apps.orders.frais import destination_relais

    tournee = getattr(shipment, "tournee", None)
    petit = None
    if tournee is not None:
        petit = tournee.shipments.count() < regles.reglage("r_depart_colis")
    for f in set(formats(shipment)):
        enregistrer(shipment, "RELAIS", f, quantite=formats(shipment).count(f), petit_paquet=petit, quand=quand)
    try:
        if tournee is not None and destination_relais(relais).zone_dest != getattr(tournee.zone, "code", None):
            enregistrer(shipment, "AUTRE_ZONE_TOURNEE", "", quantite=len(formats(shipment)), quand=quand)
    except Exception:  # relais sans zone : pas de supplément
        pass


def incident(shipment, sorte: str, quand=None) -> None:
    """Supplément d'incident (R53.3) : « absence » (R51), « refus » (R85.2), « deplacement » (R85.3)."""
    enregistrer(shipment, "INCIDENT", sorte, quand=quand)


# ── Le vendredi (R43.1) ──────────────────────────────────────────────────────────────────────────────────────

def preparer_entreprises(debut, fin) -> int:
    """Les prestations faites dans [debut, fin) entrent au versement du vendredi de chaque entreprise."""
    from django.db.models import Sum

    from apps.payments.bridge.actors import payee_for_delivery_company
    from apps.payments.settlements.services import remunerer_semaine

    from .models import PrestationEntreprise

    semaine = timezone.localtime(fin).date().isoformat()
    a_verser = PrestationEntreprise.objects.filter(faite_le__gte=debut, faite_le__lt=fin, versee_semaine="")
    n = 0
    # order_by() : sans lui, l'ordre par défaut (faite_le) entre dans le DISTINCT et répète l'entreprise.
    for org_id in list(a_verser.order_by().values_list("organisation_id", flat=True).distinct()):
        lot = a_verser.filter(organisation_id=org_id)
        premiere = lot.select_related("organisation").first()
        if premiere is None:
            continue
        montant = int(lot.aggregate(t=Sum("montant"))["t"] or 0)
        organisation = premiere.organisation
        try:
            with transaction.atomic():
                if montant:
                    remunerer_semaine(payee_for_delivery_company(organisation, create=True), montant=montant,
                                      semaine=semaine, regle="R53",
                                      libelle="Prestations de l'entreprise de livraison",
                                      detail=f"{lot.count()} prestation(s) faite(s), au tarif de la grille.")
                lot.update(versee_semaine=semaine)
                n += 1
        except Exception:  # une entreprise en erreur n'empêche pas les autres d'être payées
            logger.exception("Prestations R53 non préparées pour l'entreprise #%s.", org_id)
    return n
