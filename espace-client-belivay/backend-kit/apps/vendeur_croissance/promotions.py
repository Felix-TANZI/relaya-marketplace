# backend/apps/vendeur_croissance/promotions.py
# Promotions = ventes flash à remise vérifiée (AJ-A Promotions + VD-10 vente flash au mérite : UNE SEULE NOTION, table
# VenteFlash ; types : espace-vendeur/src/pages/AJ-A/donnees/types.ts, DomainePromotions ; démonstration :
# …/AJ-A/donnees/demo.ts et src/demo/ventes-flash.ts). Propriétaire seulement (les prix restent au propriétaire, EQU-01).
# Règles : OFR-05, VD12-R38, DEC-17, VD10-R40 (remise réelle ≥ FLASH-REMISE-MIN sur le prix le plus bas pratiqué sur
# 30 jours, jamais saisi), FLASH-DUREE-MAX, P-3 (relue au-delà de VD-VISIBILITE), VIS-02 (score minimum, pas de
# rupture), F9 (commission sur le prix payé, moteur de commission), DP-55 (refus si la vente serait refusée : « BelivaY
# ne perd jamais »), DP-14 (gratuite, jamais « Sponsorisé »).
# Pendant la fenêtre d'une vente en cours, le prix payé est le prix remisé : appliquer() met à jour le Product de
# relaya (tâche régulière, et à chaque création ou arrêt) ; la commission de la commande se calcule sur ce prix.
import math
import re
from datetime import datetime, time, timedelta

from django.db import transaction

from apps.client_core.temps import YAOUNDE, ms
from apps.vendeur_core import horloge, parametres
from apps.vendeur_core import services as socle
from apps.vendeur_core.models import Boutique, CommandeVendeur, Offre

from .models import VenteFlash

PROGRAMMER_JOURS_MAX = 30  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-FLASH-PROGRAMMER (proposé)
JOURS_REFERENCE = 30  # prix barré = le plus bas pratiqué sur 30 jours (OFR-05)
RELECTURE_H = 24  # P-3 : remise au-delà du seuil relue sous 24 h
REMISE_MAX = 90
REFUS = (
    "ferme",
    "remise_min",
    "remise_max",
    "garde_negatif",
    "prix_min",
    "dates",
    "duree",
    "trop_loin",
    "chevauche",
    "rupture",
    "etat",
    "score",
    "valeur",
)


def regles(b: Boutique) -> dict:
    vis = parametres.visibilite()
    ouvert = parametres.valeur("FF-FLASH", "fermé").startswith("ouvert")
    nombre = lambda code: int(re.match(r"(\d+)", parametres.valeur(code)).group(1))  # noqa: E731
    return {
        "ouvert": ouvert,
        "remiseMin": nombre("FLASH-REMISE-MIN"),
        "relueAuDela": vis.flash_relue_au_dela,
        "dureeMaxHeures": nombre("FLASH-DUREE-MAX"),
        "programmerJoursMax": PROGRAMMER_JOURS_MAX,
        "joursReference": JOURS_REFERENCE,
        "scoreMin": vis.score_min,
        "trustScore": float(b.trust_score),
        "prixMin": parametres.commission().prix_min,
        "relectureHeures": RELECTURE_H,
    }


def etat(v: VenteFlash, t: datetime | None = None) -> str:
    t = t or horloge.maintenant()
    if v.arretee_le:
        return "arretee"
    if v.fin <= t:
        return "terminee"
    if v.relue and t < v.cree_le + timedelta(hours=RELECTURE_H):
        return "en_verification"
    return "en_cours" if v.debut <= t else "programmee"


def active(v: VenteFlash) -> bool:
    return etat(v) in ("en_verification", "programmee", "en_cours")


def en_cours(o: Offre) -> VenteFlash | None:
    t = horloge.maintenant()
    for v in VenteFlash.objects.filter(offre=o, arretee_le__isnull=True, debut__lte=t, fin__gt=t):
        if etat(v, t) == "en_cours":
            return v
    return None


def _categorie(o: Offre) -> str:
    from apps.vendeur_catalogue.services import categorie_de

    return categorie_de(o)


def _commission(b: Boutique, o: Offre, prix: int):
    """ResultatCommission du moteur au prix donné ; None si la vente serait refusée (DP-55)."""
    from belivay_moteurs.erreurs import OffreRefusee, VenteInvalide

    try:
        return socle.garde(
            [{"categorie": _categorie(o), "prix": prix, "quantite": 1, "madeInCameroon": o.made_in_cameroon}],
            b.palier,
            socle.decouverte(b)["active"],
        )
    except (OffreRefusee, VenteInvalide):
        return None


def prix_reference(o: Offre) -> int | None:
    """Le plus bas prix réellement pratiqué sur 30 jours (historique de l'offre), jamais saisi (OFR-05)."""
    if o.prix is None:
        return None
    depuis = horloge.maintenant_ms() - JOURS_REFERENCE * 86_400_000
    anciens = [
        int(h["valeurs"]["de"])
        for h in o.historique or []
        if str(h.get("quoi", "")).startswith("Prix changé")
        and h.get("a", 0) >= depuis
        and str((h.get("valeurs") or {}).get("de", "")).isdigit()
    ]
    return min([o.prix, *[x for x in anciens if x > 0]])


def _offre_vue(o: Offre) -> dict:
    p = o.photos_reelles.first()
    from apps.vendeur_catalogue.services import photo_json

    return {
        "offreId": str(o.pk),
        "titre": o.titre,
        "variante": o.variante,
        "dessin": photo_json(p)["image"] if p else ((o.fiche.dessin if o.fiche_id else "") or "itel"),
    }


def promotion_json(v: VenteFlash) -> dict:
    o, b = v.offre, v.boutique
    ga, gp = _commission(b, o, v.prix_reference), _commission(b, o, v.prix_promo)
    fin = v.arretee_le or v.fin
    vendues = sum(
        int(lg.get("quantite", 1))
        for c in CommandeVendeur.objects.filter(boutique=b, payee_a__gte=v.debut, payee_a__lt=fin, annulee_a__isnull=True).only("lignes")
        for lg in c.lignes or []
        if str(lg.get("offreId")) == str(o.pk)
    )
    return {
        "id": str(v.pk),
        **_offre_vue(o),
        "type": v.type,
        "valeur": v.valeur,
        "prixReference": v.prix_reference,
        "prixPromo": v.prix_promo,
        "remisePourCent": round((v.prix_reference - v.prix_promo) / v.prix_reference * 100, 1),
        "gardeAvant": ga.garde if ga else 0,
        "gardePromo": gp.garde if gp else 0,
        "debut": ms(v.debut),
        "fin": ms(v.fin),
        "etat": etat(v),
        "origine": v.origine,
        "creeeA": ms(v.cree_le),
        "relueAvant": ms(v.cree_le + timedelta(hours=RELECTURE_H)) if v.relue else None,
        "arreteeA": ms(v.arretee_le) if v.arretee_le else None,
        "vendues": vendues,
    }


def liste(b: Boutique) -> list[dict]:
    return [promotion_json(v) for v in VenteFlash.objects.filter(boutique=b).select_related("offre", "offre__fiche", "boutique")]


def offres(b: Boutique) -> list[dict]:
    actives = {
        v.offre_id for v in VenteFlash.objects.filter(boutique=b, arretee_le__isnull=True, fin__gt=horloge.maintenant()) if active(v)
    }
    out = []
    for o in (
        Offre.objects.filter(boutique=b, supprimee_le__isnull=True, prix__isnull=False)
        .exclude(etat=Offre.Etat.BROUILLON)
        .select_related("fiche")
    ):
        bloque = "etat" if o.etat != Offre.Etat.EN_VENTE else "rupture" if o.stock < 1 else "promotion" if o.pk in actives else None
        out.append({**_offre_vue(o), "prix": o.prix, "prixReference": prix_reference(o) or o.prix, "stock": o.stock, "bloque": bloque})
    return out


def _instant(x) -> datetime | None:
    return datetime.fromtimestamp(x / 1000, tz=YAOUNDE) if isinstance(x, (int, float)) and not isinstance(x, bool) else None


def apercu(b: Boutique, p: dict) -> dict:
    o = Offre.objects.filter(boutique=b, pk=int(p["offreId"]) if str(p.get("offreId", "")).isdigit() else 0).select_related("fiche").first()
    ref = (prix_reference(o) if o else None) or 0
    r = regles(b)

    def vide(refus: str) -> dict:
        return {
            "prixReference": ref,
            "prixPromo": ref,
            "remisePourCent": 0,
            "gardeAvant": 0,
            "gardePromo": None,
            "commissionPromo": None,
            "plancherApplique": False,
            "relue": False,
            "refus": refus,
        }

    if not r["ouvert"]:
        return vide("ferme")
    if o is None or o.prix is None or not ref:
        return vide("etat")
    type_, valeur = p.get("type"), p.get("valeur")
    if (
        type_ not in ("pourcent", "montant")
        or isinstance(valeur, bool)
        or not isinstance(valeur, int)
        or valeur <= 0
        or (type_ == "pourcent" and valeur >= 100)
    ):
        return vide("valeur")
    # Prix remisé arrondi à la dizaine inférieure : jamais une remise plus petite qu'annoncée.
    brut = ref * (1 - valeur / 100) if type_ == "pourcent" else ref - valeur
    prix_promo = int(math.floor(brut / 10) * 10)
    remise = round((ref - prix_promo) / ref * 100, 1)
    ga = _commission(b, o, ref)
    gp = _commission(b, o, prix_promo) if prix_promo >= r["prixMin"] else None
    debut, fin, t = _instant(p.get("debut")), _instant(p.get("fin")), horloge.maintenant()
    if o.etat != Offre.Etat.EN_VENTE:
        refus = "etat"
    elif o.stock < 1:
        refus = "rupture"
    elif float(b.trust_score) < r["scoreMin"]:
        refus = "score"
    elif remise < r["remiseMin"]:
        refus = "remise_min"
    elif remise >= REMISE_MAX:
        refus = "remise_max"
    elif prix_promo < r["prixMin"]:
        refus = "prix_min"
    elif gp is None:
        refus = "garde_negatif"
    elif debut is None or fin is None or fin <= debut or debut < t - timedelta(minutes=5):
        refus = "dates"
    elif fin - debut > timedelta(hours=r["dureeMaxHeures"]):
        refus = "duree"
    elif debut > t + timedelta(days=PROGRAMMER_JOURS_MAX):
        refus = "trop_loin"
    elif any(active(v) and v.debut < fin and debut < v.fin for v in VenteFlash.objects.filter(offre=o, arretee_le__isnull=True)):
        refus = "chevauche"
    else:
        refus = None
    return {
        "prixReference": ref,
        "prixPromo": prix_promo,
        "remisePourCent": remise,
        "gardeAvant": ga.garde if ga else 0,
        "gardePromo": gp.garde if gp else None,
        "commissionPromo": gp.commission if gp else None,
        "plancherApplique": gp.plancher_applique if gp else False,
        "relue": remise > r["relueAuDela"],
        "refus": refus,
    }


@transaction.atomic
def creer(b: Boutique, p: dict, origine: str = VenteFlash.Origine.VENDEUR) -> dict:
    a = apercu(b, p)
    if a["refus"]:
        return {"ok": False, "raison": a["refus"]}
    o = Offre.objects.select_for_update().get(boutique=b, pk=int(p["offreId"]))
    t = horloge.maintenant()
    v = VenteFlash.objects.create(
        boutique=b,
        offre=o,
        origine=origine,
        type=p["type"],
        valeur=p["valeur"],
        prix_reference=a["prixReference"],
        prix_promo=a["prixPromo"],
        debut=_instant(p["debut"]),
        fin=_instant(p["fin"]),
        relue=a["relue"],
        cree_le=t,
    )
    from apps.vendeur_catalogue.services import journal

    journal(o, "Vente flash prévue : −{r} %", r=str(a["remisePourCent"]).replace(".", ","))
    o.save(update_fields=["historique"])
    appliquer(o)
    return {"ok": True, "promotion": promotion_json(v)}


@transaction.atomic
def arreter(b: Boutique, ident) -> dict | None:
    v = VenteFlash.objects.filter(boutique=b, pk=int(ident) if str(ident).isdigit() else 0).select_related("offre").first()
    if v is None:
        return None
    if not active(v):
        return {"ok": False, "raison": "etat"}
    v.arretee_le = horloge.maintenant()
    v.save(update_fields=["arretee_le"])
    appliquer(v.offre)
    if v.origine == VenteFlash.Origine.SELECTION:
        # Vente flash sur sélection (DP-59) : arrêtée ici, elle s'arrête aussi chez le client et dans la Publicité.
        from apps.publicite.services import flash_arretee_en_promotions

        flash_arretee_en_promotions(v.pk, v.arretee_le)
    return {"ok": True, "promotion": promotion_json(v)}


def creer_au_merite(b: Boutique, o: Offre, remise: int) -> VenteFlash | None:
    """Vente flash offerte au mérite (VD-10, P-3) : même table, même liste ; créneau choisi par BelivaY (demain 8 h,
    pour la durée maximale)."""
    r = regles(b)
    demain = horloge.maintenant_yaounde().date() + timedelta(days=1)
    debut = datetime.combine(demain, time(8, 0), YAOUNDE)
    p = {
        "offreId": str(o.pk),
        "type": "pourcent",
        "valeur": remise,
        "debut": ms(debut),
        "fin": ms(debut + timedelta(hours=r["dureeMaxHeures"])),
    }
    res = creer(b, p, VenteFlash.Origine.MERITE)
    return VenteFlash.objects.get(pk=int(res["promotion"]["id"])) if res["ok"] else None


def appliquer(o: Offre) -> None:
    """Prix payé de l'offre chez relaya : prix remisé pendant une vente en cours, sinon le prix de l'offre."""
    if o.product_id:
        socle.publier_produit(o)


def appliquer_toutes() -> int:
    """Tâche régulière (toutes les 5 minutes) : début et fin des ventes flash."""
    t = horloge.maintenant()
    n = 0
    for v in VenteFlash.objects.filter(debut__lte=t + timedelta(minutes=5), fin__gte=t - timedelta(minutes=10)).select_related("offre"):
        appliquer(v.offre)
        n += 1
    return n
