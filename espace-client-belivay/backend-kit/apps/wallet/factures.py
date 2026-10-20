# backend/apps/wallet/factures.py
# Factures (CCO-07, CCO-20) : une par commande RETIRÉE, émise par BelivaY — jamais le nom de la boutique ; une
# commande annulée n'a pas de facture (elle est listée dans « annulees » avec ce qui a été remboursé).
#
# Montants : ceux figés au paiement (pickup.MontantsCommande) et les articles des colis (pickup.SousCommande,
# LigneSousCommande). Une commande est « retirée » quand tous ses colis non annulés (ni renvoyés au vendeur) ont été
# remis au client (remise_le), et qu'il en reste au moins un.
#   lignes          : chaque article (« Titre × 2 »), la livraison (S·Ram + Rem + Suppl − Off − remise abonnement),
#                     les frais de service carte (PAY-CARTE-FRAIS) s'il y en a ;
#   total           : la somme des lignes ;
#   remboursement   : ce qui a été rendu en dehors des colis annulés (litige, partie de livraison…).
# Annulation partielle : les articles du colis annulé ne figurent pas sur la facture ; leur remboursement non plus.

from datetime import timedelta

from django.db.models import Exists, OuterRef

from apps.client_core import pont
from apps.client_core.temps import YAOUNDE, ms
from apps.pickup.models import MontantsCommande, SousCommande
from belivay_moteurs.argent import ecrire

from .pdf import Ligne, document

JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]
MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
HORS_FACTURE = (SousCommande.Etat.ANNULEE, SousCommande.Etat.RENVOYEE_VENDEUR)
PAYE_PAR = {
    "mtn": "MTN",
    "orange": "Orange",
    "wallet": "Portefeuille",
    "carte": "Carte",
    "apple": "Apple Pay",
    "google": "Google Pay",
    "autre": "Mobile Money",
}


def _date(d, annee_si_differente_de=None) -> str:
    d = d.astimezone(YAOUNDE)
    texte = f"{d.day} {MOIS[d.month - 1]}"
    if annee_si_differente_de is not None and d.year != annee_si_differente_de:
        texte += f" {d.year}"
    return texte


def _jour_date(d) -> str:
    d = d.astimezone(YAOUNDE)
    return f"{JOURS[d.weekday()]} {d.day} {MOIS[d.month - 1]}"


def _heure(d) -> str:
    d = d.astimezone(YAOUNDE)
    return f"{d.hour} h {d.minute:02d}"


def retirees(user):
    """MontantsCommande des commandes retirées du client (filtrage au queryset : jamais celles d'un autre)."""
    colis_remis = SousCommande.objects.filter(order_id=OuterRef("order_id"), remise_le__isnull=False).exclude(etat__in=HORS_FACTURE)
    colis_en_cours = SousCommande.objects.filter(order_id=OuterRef("order_id"), remise_le__isnull=True).exclude(etat__in=HORS_FACTURE)
    return (
        MontantsCommande.objects.filter(client=user, etat_paiement=MontantsCommande.EtatPaiement.PAYEE)
        .filter(Exists(colis_remis))
        .exclude(Exists(colis_en_cours))
    )


def annulees(user):
    """Commandes payées dont tous les colis sont annulés : pas de facture."""
    colis = SousCommande.objects.filter(order_id=OuterRef("order_id"))
    actifs = colis.exclude(etat=SousCommande.Etat.ANNULEE)
    return (
        MontantsCommande.objects.filter(client=user, etat_paiement=MontantsCommande.EtatPaiement.PAYEE)
        .filter(Exists(colis))
        .exclude(Exists(actifs))
    )


def _colis(order_ids) -> dict[int, list[SousCommande]]:
    par_commande: dict[int, list[SousCommande]] = {}
    for sc in SousCommande.objects.filter(order_id__in=order_ids).prefetch_related("lignes"):
        par_commande.setdefault(sc.order_id, []).append(sc)
    return par_commande


def _resume(articles: list[tuple[str, int]]) -> str:
    morceaux = []
    for i, (titre, qte) in enumerate(articles):
        t = titre
        if i and len(t) > 1 and t[0].isupper() and t[1].islower():
            t = t[0].lower() + t[1:]
        morceaux.append(t + (f" ×{qte}" if qte > 1 else ""))
    return ", ".join(morceaux)


def facture(mc: MontantsCommande, colis: list[SousCommande], maintenant) -> dict:
    """Facture du site."""
    gardes = [sc for sc in colis if sc.etat not in HORS_FACTURE]
    lignes, articles = [], []
    for sc in gardes:
        for li in sc.lignes.all():
            lignes.append({"libelle": li.titre + (f" × {li.qte}" if li.qte > 1 else ""), "montant": li.prix * li.qte})
            articles.append((li.titre, li.qte))
    livraison = max(mc.ramassages + mc.remises + mc.supplements - mc.offert - mc.prime, 0)
    mode = "Livraison à domicile" if mc.mode == MontantsCommande.Mode.DOMICILE else "Livraison au relais"
    lignes.append({"libelle": mode if livraison else f"{mode} · offerte", "montant": livraison})
    if mc.frais_service:
        lignes.append({"libelle": "Frais de service carte", "montant": mc.frais_service})
    le = max(sc.remise_le for sc in gardes)
    hors_annulation = mc.rembourse - sum(sc.rembourse for sc in colis if sc.etat in HORS_FACTURE)
    relais = pont.relais(mc.relay_id) if mc.relay_id else None
    numero = mc.numero_masque
    return {
        "ref": mc.ref,
        "total": sum(x["montant"] for x in lignes),
        "retiree": f"Retirée {_jour_date(le)}" if maintenant - le < timedelta(days=7) else f"Retirée le {_date(le, maintenant.year)}",
        "resume": _resume(articles),
        "lignes": lignes,
        "retrait": {"relais": relais.nom if relais else mc.lieu, "quand": f" · {_jour_date(le)} à {_heure(le)}"},
        "payePar": {"operateur": PAYE_PAR.get(mc.moyen, mc.moyen), "numero": numero},
        "remboursement": {"libelle": "Remboursé", "montant": hors_annulation} if hors_annulation > 0 else None,
        "le": ms(le),
    }


def factures(user, commandes: list[MontantsCommande], maintenant) -> list[dict]:
    colis = _colis([mc.order_id for mc in commandes])
    return [facture(mc, colis.get(mc.order_id, []), maintenant) for mc in commandes]


def liste_annulees(user, maintenant) -> list[dict]:
    commandes = list(annulees(user).order_by("-pk"))
    colis = _colis([mc.order_id for mc in commandes])
    sortie = []
    for mc in commandes:
        dates = [sc.annulee_le for sc in colis.get(mc.order_id, []) if sc.annulee_le]
        quand = f" le {_date(max(dates), maintenant.year)}" if dates else ""
        rendu = f", {ecrire(mc.rembourse)} remboursés" if mc.rembourse else ""
        sortie.append({"ref": mc.ref, "texte": f"Pas de facture : annulée{quand}{rendu}"})
    return sortie


def pdf(user, mc: MontantsCommande, maintenant) -> bytes:
    """La facture d'une commande retirée, en PDF (émise par BelivaY)."""
    f = facture(mc, _colis([mc.order_id]).get(mc.order_id, []), maintenant)
    nom = f"{user.first_name} {user.last_name}".strip() or user.get_username()
    lignes = [
        Ligne("BelivaY", taille=20, gras=True),
        Ligne("Facture émise par BelivaY · belivay.com", gris=True),
        Ligne(),
        Ligne(f"Facture {f['ref']}", taille=14, gras=True),
        Ligne(f"Client : {nom}"),
        Ligne(f"Payée le {_date(mc.payee_le or mc.cree_le)} · {f['retiree']}"),
        Ligne(f"Retrait : {f['retrait']['relais']}{f['retrait']['quand']}"),
        Ligne(f"Payé par : {f['payePar']['operateur']} {f['payePar']['numero']}".rstrip()),
        Ligne(),
    ]
    lignes += [Ligne(x["libelle"], droite=ecrire(x["montant"]), filet=(i == 0)) for i, x in enumerate(f["lignes"])]
    lignes.append(Ligne("Total payé", droite=ecrire(f["total"]), taille=12, gras=True, filet=True))
    if f["remboursement"]:
        lignes.append(Ligne(f["remboursement"]["libelle"], droite=ecrire(-f["remboursement"]["montant"])))
    lignes += [Ligne(), Ligne("Montants en francs CFA (XAF).", gris=True, taille=8)]
    return document(lignes, titre=f"Facture {f['ref']}")
