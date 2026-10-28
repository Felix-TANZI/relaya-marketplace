# backend/apps/orders/commission.py
# Commission d'une sous-commande et contrôle de rentabilité (BV-DEV-03, algorithmes A7 et A8) : le seul service qui
# calcule la commission (R13.5). Il prépare les entrées du moteur BV-DEV-09 et fige le résultat au paiement (R13.2) :
#
#   articles    prix_i (prix payé), q_i, univers_i et mic_i de la fiche maître (R16.1, R17.1)
#   palier      palier du vendeur (Trust Score, libellés Bronze, Argent, Or, Platine : t_multiplicateurs, R15.1)
#   decouverte  R17.3 : pendant r_decouverte_mois après la première commande payée, sous r_decouverte_cmd commandes
#   couv_b      couverture × st_b ÷ st, exacte (R14.3)
#
# Le vendeur ne voit que net_b (R26.1) ; la console voit commission_b, tva_b et net_b (R26.2).

from datetime import datetime
from fractions import Fraction

from django.utils import timezone

from apps.regles import services as regles

PALIER_PAR_TIER = {"NEW": "Bronze", "CONFIRMED": "Argent", "GOLD": "Or", "PLATINUM": "Platine"}


def palier_vendeur(vendeur) -> str:
    """Palier du vendeur, tel que le Trust Score le tient (R24)."""
    from apps.accounts.models import TrustScoreProfile

    tier = (TrustScoreProfile.objects.filter(user=vendeur, role=TrustScoreProfile.Role.VENDOR)
            .values_list("tier", flat=True).first())
    return PALIER_PAR_TIER.get(tier or "NEW", "Bronze")


def _plus_mois(d: datetime, mois: int) -> datetime:
    m = d.month - 1 + mois
    annee, m = d.year + m // 12, m % 12 + 1
    jours = [31, 29 if annee % 4 == 0 and (annee % 100 or annee % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return d.replace(year=annee, month=m, day=min(d.day, jours[m - 1]))


def _commandes_payees(vendeur):
    from apps.orders.models import Order

    return (Order.objects.filter(items__product__vendor=vendeur, payment_status=Order.PaymentStatus.PAID).distinct())


def decouverte(vendeur, maintenant=None) -> bool:
    """R17.3 : vrai pendant r_decouverte_mois à partir de la première commande payée du vendeur, tant qu'il a moins
    de r_decouverte_cmd commandes payées et non remboursées. Avant toute commande payée, l'offre n'a pas commencé :
    elle s'applique à la première."""
    from apps.orders.models import Order
    from apps.payments.bridge.intent_orders import PaymentIntentOrder

    maintenant = maintenant or timezone.now()
    payees = _commandes_payees(vendeur)
    if not payees.exists():
        return True
    premiere = (PaymentIntentOrder.objects.filter(order__in=payees, intent__confirmed_at__isnull=False)
                .order_by("intent__confirmed_at").values_list("intent__confirmed_at", flat=True).first())
    premiere = premiere or payees.order_by("created_at").values_list("created_at", flat=True).first()
    if maintenant >= _plus_mois(premiere, regles.reglage("r_decouverte_mois")):
        return False
    non_remboursees = payees.exclude(escrow_status__in=[Order.EscrowStatus.REFUNDED, Order.EscrowStatus.PARTIAL_REFUNDED])
    return non_remboursees.count() < regles.reglage("r_decouverte_cmd")


def _exact(x) -> str:
    return str(Fraction(x)) if not isinstance(x, str) else x


def rentabilite(m, detail: dict, i: int, commission_b: int, couv_b: Fraction) -> dict:
    """A8 (R92.1 à R92.4) pour la boutique d'indice i, avec les frais figés de la commande (detail de frais.calculer)."""
    mode = detail["mode"]
    boutiques = detail["boutiques"]
    b_base = detail["b_base"] - 1
    c = m.R("r_relais") if mode == "relais" else m.R("r_colis_en_plus")                         # R09.4

    def liv_brut(j):                                                                             # R92.1, b ≠ b_base
        colis = boutiques[j]["colis_b"]
        return Fraction(detail["supp_b"][j]) + sum(m.sup(f) for f in colis) + c * (len(colis) - 1)

    autres = [j for j in range(len(boutiques)) if j != b_base]
    liv_brut_b = liv_brut(i) if i != b_base else Fraction(detail["frais_bruts"]) - sum(liv_brut(j) for j in autres)
    liv_b = liv_brut_b - couv_b                                                                  # R92.1

    if mode == "relais":                                                                         # R92.3
        j1 = m.j1()
        couts = sum(m.plafond(m.R("r_relais") + m.sup(f), m.part(f), j1) + m.part(f) + j1 for f in boutiques[i]["colis_b"])
    elif i != b_base:
        couts = m.plafond(liv_brut_b)
    else:
        couts = m.plafond(detail["frais_bruts"]) - sum(m.plafond(liv_brut(j)) for j in autres)
    if i == b_base:
        couts += m.R("r_sms_max") * m.R("r_sms_cout")
    reste = commission_b + liv_b - couts                                                         # R92.2
    return dict(liv_b=liv_b, couts_b=Fraction(couts), reste_b=reste, exigence=reste >= 0,
                objectif=reste >= Fraction(str(m.R("r_objectif_reste"))) * couts)               # R92.4


def calculer(order, lignes: list[tuple], detail: dict) -> list:
    """Crée la commission de chaque sous-commande de `order` (A7, A8). `lignes` : [(Product, prix payé, quantité)] ;
    `detail` : le calcul des frais figé sur la commande (Order.frais_detail)."""
    from apps.orders.models import CommissionSousCommande

    m = regles.moteur()
    par_vendeur = {}
    for produit, prix, qty in lignes:
        fiche = produit.master
        par_vendeur.setdefault(produit.vendor_id, (produit.vendor, []))[1].append(
            dict(prix_i=prix, q_i=qty, univers_i=fiche.univers, mic_i=fiche.made_in_cameroon))
    st = Fraction(detail["st"])
    couverture = Fraction(detail["couverture"])
    creees = []
    for i, b in enumerate(detail["boutiques"]):
        vendeur, articles = par_vendeur[b["vendeur"]]
        palier, dec = palier_vendeur(vendeur), decouverte(vendeur)
        couv_b = couverture * b["st_b"] / st if st else Fraction(0)                              # R14.3
        r = m.commission(articles, palier, dec, couv_b)
        rent = rentabilite(m, detail, i, r["commission_b"], couv_b)
        creees.append(CommissionSousCommande.objects.create(
            order=order, vendor=vendeur, st_b=r["st_b"], commission_b=r["commission_b"], tva_b=r["tva_b"],
            net_b=r["net_b"], bareme_b=r["bareme_b_exact"], plancher_retenu=r["plancher_retenu"], couv_b=_exact(couv_b),
            palier=palier, decouverte=dec, articles=articles, liv_b=_exact(rent["liv_b"]), couts_b=_exact(rent["couts_b"]),
            reste_b=_exact(rent["reste_b"]), exigence=rent["exigence"], objectif=rent["objectif"],
            reglages=detail.get("reglages", ""),
        ))
    return creees


def commission_apres_remboursement(c, montant_garde: int) -> int:
    """R20.2 : arrondi(commission_b × montant gardé ÷ st_b) ; r_com_min ne se réapplique pas. 0 si tout est rendu."""
    if montant_garde <= 0:                                                                       # R13.3
        return 0
    return regles.moteur().commission_partielle(c.commission_b, montant_garde, c.st_b)


def net_vendeur(order, vendeur, sous_total: int | None = None) -> int:
    """Ce que reçoit le vendeur sur sa sous-commande, la seule somme qu'il voit (R22.1, R26.1). Une commande
    antérieure, sans commission figée, garde le calcul par son taux d'origine."""
    figee = next((c for c in order.commissions.all() if c.vendor_id == getattr(vendeur, "pk", vendeur)), None)
    if figee is not None:
        return figee.net_b
    if sous_total is None:
        sous_total = sum(i.line_total_xaf for i in order.items.filter(product__vendor=vendeur))
    return sous_total - round(sous_total * float(order.commission_rate_snapshot) / 100)
