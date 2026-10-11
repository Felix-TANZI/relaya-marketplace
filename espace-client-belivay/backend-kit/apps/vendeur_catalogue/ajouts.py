# backend/apps/vendeur_catalogue/ajouts.py
# Pages ajoutées (DP-58) servies par le catalogue : Nouveau produit (suggestion, produit nouveau après une recherche,
# rattachement à une fiche existante, ordre des photos), Stock et inventaire (AJ-A), Livraison et colis (AJ-A).
# Types : espace-vendeur/src/donnees/domaines/offres.ts, src/pages/AJ-A/donnees/types.ts ; démonstration (comportement
# de référence) : src/demo/offres.ts, src/pages/AJ-A/donnees/demo.ts.
#   - Stock : accès employé avec le droit produits.stock, gestes signés (VD02-DR03, ACC-27) ; aucun prix pour lui
#     (ACC-26) ; seuil d'alerte (VD11-R49) réservé au propriétaire ; ventes et réservations lues dans les commandes.
#   - Livraison : défauts de la boutique appliqués à toute offre créée (délai, colis, paiement au retrait, OFR-02) ;
#     classe calculée par les mesures au-delà de S et M (VD08-R22, VD-COLIS) ; employé : lecture seule (VD02-DR05).
import math
from datetime import timedelta

from django.db import transaction

from apps.client_core.temps import ms
from apps.vendeur_core import horloge, parametres
from apps.vendeur_core.models import Boutique, CommandeVendeur, FicheCatalogue, Offre

from . import services as s
from .models import DemandeFiche, MouvementStock, PhotoOffre, ReglagesLivraison

E = Offre.Etat
NOTE_MAX = 120
JOURS_COUVERTURE = 14  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-REAPPRO-HORIZON (horizon du conseil, proposé 14 jours)
RECHERCHE_MIN = 3  # NOF-01 : produit nouveau seulement après une recherche de 3 caractères (ou un code-barres)
RELAIS_MAX = 3  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-RELAIS-PREFERES (proposé)
# Créneaux de ramassage des tournées de la zone (proposés par BelivaY : le livreur passe à l'un d'eux).
CRENEAUX = [  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-CRENEAUX-RAMASSAGE
    {"id": "lv-10", "jours": "lun–ven", "de": "10:00", "a": "12:00"},
    {"id": "lv-14", "jours": "lun–ven", "de": "14:00", "a": "16:00"},
    {"id": "sa-11", "jours": "sam", "de": "11:00", "a": "13:00"},
]
GABARIT_DESCRIPTION = {
    "Électronique": "Modèle exact : … · Contenu de la boîte : … · Garantie : …",
    "Électroménager": "Modèle exact : … · Contenu de la boîte : … · Garantie : …",
    "Supermarché": "Contenance : … · Date limite : … · Origine : …",
}


def _dessin(o: Offre) -> str:
    p = o.photos_reelles.first()
    return s.photo_json(p)["image"] if p is not None else ((o.fiche.dessin if o.fiche_id else "") or "itel")


# ── Nouveau produit (DP-58) ──────────────────────────────────────────────────────────────────────────────


def suggerer(lec: s.Lecteur, nom: str) -> dict:
    """Catégorie du barème et marque proposées d'après le nom (fiche la plus proche du catalogue), description à
    compléter, doublon (similarité ≥ VD-DOUBLON) : la fiche existante plutôt qu'un produit nouveau (FCH-02)."""
    m = set(s.mots(nom))
    fiches = list(FicheCatalogue.objects.filter(publiee=True))
    proches = sorted(((s.similarite(nom, f.titre), -f.pk, f) for f in fiches), key=lambda x: (x[0], x[1]), reverse=True)
    meilleur = proches[0] if proches and proches[0][0] > 0 else None
    familles = parametres.commission().familles
    categorie = meilleur[2].categorie if meilleur and meilleur[2].categorie in familles else None
    marque = next((f.marque for f in fiches if f.marque and set(s.mots(f.marque)) <= m), None)
    texte = nom.strip()
    if texte:
        gabarit = GABARIT_DESCRIPTION.get(
            categorie or "",
            "Matière : … · Tailles : … · Entretien : …"
            if (categorie or "").startswith("Mode")
            else "Matière ou composition : … · Dimensions : … · Contenu : …",
        )
        texte = f"{texte}. {gabarit}"
    doublon = meilleur[2] if meilleur and meilleur[0] >= parametres.doublon() / 100 else None
    return {"categorie": categorie, "marque": marque, "description": texte, "doublon": s.fiche_json(doublon, lec) if doublon else None}


def defauts(b: Boutique) -> dict:
    r = ReglagesLivraison.objects.filter(boutique=b).first()
    defaut_h = parametres.preparation_delais().defaut_heures
    if r is None:
        return {"colis": "S", "delaiH": defaut_h, "paiementAuRetrait": True}
    return {"colis": r.colis, "delaiH": r.delai_h or defaut_h, "paiementAuRetrait": r.paiement_au_retrait}


@transaction.atomic
def creer(lec: s.Lecteur, nom: str, code: str | None) -> dict:
    """« Ajouter un nouveau produit » : seulement après une recherche (NOF-01) ; le nom cherché pré-remplit le produit,
    la catégorie et la marque proposées aussi ; BelivaY écrira la fiche pendant la vérification."""
    if not lec.proprietaire:
        return {"ok": False, "raison": "reserve"}
    nom = (nom or "").strip()
    chiffres = "".join(c for c in str(code or "") if c.isdigit())
    if len(nom) < RECHERCHE_MIN and not (6 <= len(chiffres) <= 14):
        return {"ok": False, "raison": "recherche"}
    b = lec.boutique
    sug = suggerer(lec, nom)
    d = defauts(b)
    o = Offre.objects.create(
        boutique=b,
        fiche=None,
        titre_demande=nom[:200],
        etat=E.BROUILLON,
        etat_article=s.etats_produit()[0],
        stock=0,
        seuil_alerte=5,
        delai_preparation_h=d["delaiH"],
        colis=d["colis"],
        paiement_au_retrait=d["paiementAuRetrait"],
    )
    DemandeFiche.objects.create(
        boutique=b,
        offre=o,
        recherche=nom[:200],
        marque=(sug["marque"] or "")[:80],
        categorie=(sug["categorie"] or "")[:80],
        statut=DemandeFiche.Statut.BROUILLON,
    )
    s.journal(o, "Produit nouveau commencé après la recherche")
    o.save(update_fields=["historique"])
    return {"ok": True, "brouillonId": str(o.pk)}


@transaction.atomic
def rattacher(lec: s.Lecteur, id_, fiche_id) -> dict:
    """Le produit nouveau existe déjà : le brouillon passe sur la fiche, photos et saisies gardées (FCH-02)."""
    f = FicheCatalogue.objects.filter(pk=fiche_id if str(fiche_id).isdigit() else 0, publiee=True).first()
    if f is None:
        return {"ok": False, "raison": "fiche"}
    o = s.offre_de(lec.boutique, id_, verrou=True)
    if o is None or o.etat != E.BROUILLON:
        return {"ok": False, "raison": "etat"}
    prises = set(s.offres_de(lec.boutique).filter(fiche=f).exclude(pk=o.pk).values_list("variante", flat=True))
    libres = [v for v in f.variantes or [] if v not in prises]
    o.fiche, o.titre_demande = f, ""
    o.variante = o.variante if o.variante in libres else (libres[0] if libres else (f.variantes or [""])[0])
    o.fiche_demandee = None
    DemandeFiche.objects.filter(offre=o, statut=DemandeFiche.Statut.BROUILLON).delete()
    s.journal(o, "Ce produit existe déjà : offre rattachée à sa fiche")
    o.save()
    return {"ok": True, "brouillonId": str(o.pk)}


def ordonner_photos(b: Boutique, cible: str, ids: list) -> None:
    """Ordre des photos ; la première est la photo principale. Une photo absente de la liste passe après."""
    try:
        _o, photos = s.photos_de(b, str(cible))
    except LookupError:
        return
    rang = {str(i): n for n, i in enumerate(ids or [])}
    for p in photos:
        r = rang.get(str(p.pk), len(rang))
        if p.rang != r:
            PhotoOffre.objects.filter(pk=p.pk).update(rang=r)


# ── Stock et inventaire (AJ-A) ───────────────────────────────────────────────────────────────────────────


def _ventes(b: Boutique, depuis=None) -> list[tuple]:
    """(offreId, quantité, payée_a, ref, préparée ou partie) des commandes de la boutique."""
    qs = CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True)
    if depuis is not None:
        qs = qs.filter(payee_a__gte=depuis)
    out = []
    for c in qs.only("lignes", "payee_a", "ref", "prete_a", "remise_a"):
        for lg in c.lignes or []:
            if lg.get("offreId"):
                out.append(
                    (str(lg["offreId"]), int(lg.get("quantite", 1)), c.payee_a, c.ref, c.prete_a is not None or c.remise_a is not None)
                )
    return out


def ligne(o: Offre, lec: s.Lecteur, ventes: list | None = None) -> dict:
    t = horloge.maintenant()
    ventes = _ventes(o.boutique, t - timedelta(days=30)) if ventes is None else ventes
    v30 = sum(q for oid, q, a, _r, _p in ventes if oid == str(o.pk) and a > t - timedelta(days=30))
    reserve = sum(q for oid, q, _a, _r, partie in ventes if oid == str(o.pk) and not partie)
    alerte = None if o.etat != E.EN_VENTE else "rupture" if o.stock == 0 else "sous_seuil" if o.stock <= o.seuil_alerte else None
    par_jour = v30 / 30
    cible = max(o.seuil_alerte + 1, math.ceil(par_jour * JOURS_COUVERTURE))
    dernier = o.mouvements.order_by("-a").values_list("a", flat=True).first()
    return {
        "offreId": str(o.pk),
        "titre": o.titre,
        "variante": o.variante,
        "dessin": _dessin(o),
        "etat": o.etat,
        "stock": o.stock,
        "seuil": o.seuil_alerte,
        "reserve": reserve,
        "alerte": alerte,
        "ventes30j": v30,
        "joursRestants": math.floor(o.stock / par_jour) if par_jour > 0 else None,
        "conseilReappro": max(0, cible - o.stock) if alerte else 0,
        "prix": lec.montant(o.prix),
        "dernierMouvement": ms(dernier) if dernier else None,
    }


def _rang(lg: dict) -> tuple:
    return ({"rupture": 0, "sous_seuil": 1}.get(lg["alerte"], 2), lg["stock"] - lg["seuil"], lg["titre"])


def inventaire(lec: s.Lecteur) -> dict:
    b = lec.boutique
    ventes = _ventes(b, horloge.maintenant() - timedelta(days=30))
    offres = s.offres_de(b).exclude(etat=E.BROUILLON).select_related("fiche")
    lignes = sorted((ligne(o, lec, ventes) for o in offres), key=_rang)
    return {
        "lignes": lignes,
        "compteurs": {
            "produits": len(lignes),
            "enVente": sum(1 for x in lignes if x["etat"] == E.EN_VENTE),
            "unites": sum(x["stock"] for x in lignes),
            "ruptures": sum(1 for x in lignes if x["alerte"] == "rupture"),
            "sousSeuil": sum(1 for x in lignes if x["alerte"] == "sous_seuil"),
        },
        "valeur": lec.montant(sum(o.stock * (o.prix or 0) for o in offres)),
        "joursCouverture": JOURS_COUVERTURE,
        "luA": horloge.maintenant_ms(),
    }


def mouvements(lec: s.Lecteur, offre_id=None, limite: int = 80) -> list[dict]:
    """Toute la boutique, ou une offre ; le plus récent d'abord : mouvements signés et ventes des commandes."""
    b = lec.boutique
    offres = {str(o.pk): o for o in s.offres_de(b).select_related("fiche")}
    if offre_id is not None and str(offre_id) not in offres:
        return []
    qs = MouvementStock.objects.filter(offre__boutique=b)
    if offre_id is not None:
        qs = qs.filter(offre_id=int(offre_id))
    out = [
        {
            "id": f"mv-{m.pk}",
            "offreId": str(m.offre_id),
            "type": m.type,
            "delta": m.apres - m.avant,
            "avant": m.avant,
            "apres": m.apres,
            "a": ms(m.a),
            "auteur": m.auteur,
            "ref": None,
            "note": m.note or None,
        }
        for m in qs.order_by("-a", "-id")[:limite]
    ]
    for oid, q, a, ref, _p in _ventes(b):
        if offre_id is None or oid == str(offre_id):
            out.append(
                {
                    "id": f"v-{ref}-{oid}",
                    "offreId": oid,
                    "type": "vente",
                    "delta": -q,
                    "avant": None,
                    "apres": None,
                    "a": ms(a),
                    "auteur": None,
                    "ref": ref,
                    "note": None,
                }
            )
    out.sort(key=lambda x: -x["a"])
    out = [x for x in out if x["offreId"] in offres][:limite]
    # Avant / après des ventes : remontés depuis le stock actuel (les mouvements signés gardent les leurs).
    courant = {oid: o.stock for oid, o in offres.items()}
    for x in out:
        if x["apres"] is None:
            x["apres"] = courant[x["offreId"]]
            x["avant"] = x["apres"] - x["delta"]
        courant[x["offreId"]] = x["avant"]
        x["titre"], x["variante"] = offres[x["offreId"]].titre, offres[x["offreId"]].variante
    return out


@transaction.atomic
def ajuster(lec: s.Lecteur, offre_id, c: dict) -> dict:
    o = s.offre_de(lec.boutique, offre_id, verrou=True)
    if o is None:
        return {"ok": False, "raison": "introuvable"}
    nouveau, type_ = c.get("nouveau"), c.get("type")
    if not s._entier_valide(nouveau, 0, s.STOCK_MAX) or type_ not in ("reappro", "correction"):
        return {"ok": False, "raison": "stock"}
    note = str(c.get("note") or "").strip()
    if len(note) > NOTE_MAX:
        return {"ok": False, "raison": "note"}
    if type_ == "reappro" and nouveau <= o.stock:
        return {"ok": False, "raison": "stock"}
    if nouveau == o.stock:
        return {"ok": True, "ligne": ligne(o, lec), "mouvement": None}
    avant = o.stock
    mv = s.noter_mouvement(o, lec, avant, nouveau, "reappro" if type_ == "reappro" else None, note)
    s.journal(o, "Stock changé : {de} → {a}", de=avant, a=nouveau)
    o.stock = nouveau
    o.save()
    s.synchroniser_produit(o)
    m = {
        "id": f"mv-{mv.pk}",
        "offreId": str(o.pk),
        "titre": o.titre,
        "variante": o.variante,
        "type": mv.type,
        "delta": nouveau - avant,
        "avant": avant,
        "apres": nouveau,
        "a": ms(mv.a),
        "auteur": mv.auteur,
        "ref": None,
        "note": note or None,
    }
    return {"ok": True, "ligne": ligne(o, lec), "mouvement": m}


def regler_seuil(lec: s.Lecteur, offre_id, seuil) -> dict:
    r = s.regler(lec, offre_id, {"seuilAlerte": seuil})
    if not r.get("ok"):
        return {"ok": False, "raison": "reserve" if r.get("raison") == "reserve" else "seuil"}
    return {"ok": True, "ligne": ligne(s.offre_de(lec.boutique, offre_id), lec)}


def exporter(lec: s.Lecteur) -> str:
    """CSV (séparateur « ; ») ; sans prix pour un employé (ACC-26)."""
    tete = [
        "identifiant",
        "produit",
        "variante",
        "stock",
        "seuil",
        "reserve",
        "alerte",
        "ventes_30j",
        *(["prix"] if lec.proprietaire else []),
    ]
    lignes = [";".join(tete)]
    for x in inventaire(lec)["lignes"]:
        v = [
            x["offreId"],
            x["titre"],
            x["variante"],
            x["stock"],
            x["seuil"],
            x["reserve"],
            x["alerte"] or "",
            x["ventes30j"],
            *([x["prix"]] if lec.proprietaire else []),
        ]
        lignes.append(";".join(s._champ_csv(e) for e in v))
    return "\n".join(lignes)


# ── Livraison et colis (AJ-A) ────────────────────────────────────────────────────────────────────────────


def _reglages_obj(b: Boutique) -> ReglagesLivraison:
    r, _ = ReglagesLivraison.objects.get_or_create(boutique=b, defaults={"creneaux": ["lv-14", "sa-11"]})
    return r


def _relais(b: Boutique, preferes: list[str]) -> list[dict]:
    from apps.client_core import pont
    from belivay_moteurs.geo import Position, distance_m

    out = []
    origine = Position(b.lat, b.lon) if b.lat is not None and b.lon is not None else None
    for r in pont.relais_actifs():
        if r.position is None:
            continue
        rid = f"r-{r.id}"
        d = int(distance_m(origine, Position(*r.position))) if origine else 0
        out.append(
            {
                "id": rid,
                "nom": r.nom,
                "quartier": r.quartier,
                "position": {"lat": float(r.position[0]), "lon": float(r.position[1])},
                "distanceM": d,
                "horaires": r.horaires,
                "prefere": rid in preferes,
            }
        )
    out.sort(key=lambda x: (not x["prefere"], x["distanceM"]))
    return out


def produit_livraison(o: Offre) -> dict:
    dims = o.dimensions_cm if isinstance(o.dimensions_cm, list) and len(o.dimensions_cm) == 3 else None
    return {
        "offreId": str(o.pk),
        "titre": o.titre,
        "variante": o.variante,
        "dessin": _dessin(o),
        "colis": o.colis,
        "colisFiche": defauts(o.boutique)["colis"],
        "poidsKg": float(o.poids_kg) if o.poids_kg is not None else None,
        "dimensionsCm": dims,
        "delaiPreparationH": o.delai_preparation_h,
        "paiementAuRetrait": o.paiement_au_retrait,
    }


def reglages(lec: s.Lecteur) -> dict:
    b = lec.boutique
    r = _reglages_obj(b)
    co = parametres.colis()
    return {
        "defauts": defauts(b),
        "delaisH": s.delais_h(),
        "classes": s.gabarits_colis(),
        "mesures": {"seuilKg": co.seuil_kg, "seuilCm": co.seuil_cm, "diviseur": co.diviseur},
        "creneaux": [{**c, "prefere": c["id"] in r.creneaux} for c in CRENEAUX],
        "relais": _relais(b, r.relais),
        "relaisMax": RELAIS_MAX,
        "boutique": {"position": {"lat": float(b.lat or 0), "lon": float(b.lon or 0)}, "quartier": b.quartier},
        "produits": [produit_livraison(o) for o in s.offres_de(b).exclude(etat=E.BROUILLON).select_related("fiche")],
        "peutRegler": lec.proprietaire,
    }


def regler(lec: s.Lecteur, d: dict) -> dict:
    if not lec.proprietaire:
        return {"ok": False, "raison": "reserve"}
    if "delaiH" in d and d["delaiH"] not in s.delais_h():
        return {"ok": False, "raison": "delai"}
    r = _reglages_obj(lec.boutique)
    if d.get("colis") in ("S", "M"):
        r.colis = d["colis"]
    if "delaiH" in d:
        r.delai_h = d["delaiH"]
    if isinstance(d.get("paiementAuRetrait"), bool):
        r.paiement_au_retrait = d["paiementAuRetrait"]
    r.save()
    return {"ok": True, "reglages": reglages(lec)}


@transaction.atomic
def regler_produit(lec: s.Lecteur, offre_id, c: dict) -> dict:
    if not lec.proprietaire:
        return {"ok": False, "raison": "reserve"}
    o = s.offre_de(lec.boutique, offre_id, verrou=True)
    if o is None:
        return {"ok": False, "raison": "introuvable"}
    if "delaiPreparationH" in c and c["delaiPreparationH"] not in s.delais_h():
        return {"ok": False, "raison": "delai"}
    # Au-delà de S et M, poids et dimensions sont obligatoires : la classe se calcule, elle ne se choisit pas.
    if "poidsKg" in c or "dimensionsCm" in c:
        p, dims = c.get("poidsKg"), c.get("dimensionsCm")
        if not (
            s._nombre(p) and 0 < p < 1000 and isinstance(dims, list) and len(dims) == 3 and all(s._nombre(x) and 0 < x < 1000 for x in dims)
        ):
            return {"ok": False, "raison": "mesures"}
    if "colis" in c and c["colis"] not in ("S", "M"):
        return {"ok": False, "raison": "mesures"}
    if "delaiPreparationH" in c and c["delaiPreparationH"] != o.delai_preparation_h:
        s.journal(o, "Délai de préparation : {de} h → {a} h", de=o.delai_preparation_h, a=c["delaiPreparationH"])
        o.delai_preparation_h = c["delaiPreparationH"]
    if isinstance(c.get("paiementAuRetrait"), bool):
        o.paiement_au_retrait = c["paiementAuRetrait"]
    if "colis" in c and (c["colis"] != o.colis or o.poids_kg is not None):
        s.journal(o, "Colis : {de} → {a}", de=o.colis, a=c["colis"])
        o.colis, o.poids_kg, o.dimensions_cm = c["colis"], None, None
    if "poidsKg" in c:
        from decimal import Decimal

        classe = s.classe_colis(c["poidsKg"], c["dimensionsCm"], o.colis)
        if classe != o.colis:
            s.journal(o, "Colis : {de} → {a}", de=o.colis, a=classe)
        o.poids_kg, o.dimensions_cm, o.colis = Decimal(str(c["poidsKg"])).quantize(Decimal("0.01")), c["dimensionsCm"], classe
    o.save()
    s.synchroniser_produit(o)
    return {"ok": True, "produit": produit_livraison(o)}


def preferer(lec: s.Lecteur, quoi: str, ident: str, prefere: bool) -> dict:
    """Créneau de ramassage préféré (au moins un) ou relais préféré (RELAIS_MAX au plus)."""
    if not lec.proprietaire:
        return {"ok": False, "raison": "reserve"}
    r = _reglages_obj(lec.boutique)
    liste = list(r.creneaux if quoi == "creneau" else r.relais)
    if quoi == "creneau" and ident not in {c["id"] for c in CRENEAUX}:
        return {"ok": False, "raison": "dernier"}
    if not prefere and quoi == "creneau" and liste == [ident]:
        return {"ok": False, "raison": "dernier"}
    if prefere and quoi == "relais" and ident not in liste and len(liste) >= RELAIS_MAX:
        return {"ok": False, "raison": "max"}
    liste = [x for x in liste if x != ident] + ([ident] if prefere else [])
    if quoi == "creneau":
        r.creneaux = liste
    else:
        r.relais = liste
    r.save()
    return {"ok": True, "reglages": reglages(lec)}
