# backend/apps/vendeur_boutique/lieux.py
# Sécurité de la boutique (vague « équipe », INTEGRATION-API.md § 8 ; démonstration : espace-vendeur/src/demo/boutique.ts) :
#   - emplacements multiples (VD-LIEUX-MAX) : le principal est l'origine du ramassage et la zone (son point, son repère
#     et sa vérification restent ceux de Boutique : PUT /shop/location en est l'alias) ; un point posé au GPS attend
#     l'agent de zone ; au-delà de 200 m, l'ancien point sert (Q-91) ; un centre BelivaY est vérifié d'office ; seul un
#     lieu vérifié devient principal, avec le code SMS du propriétaire ;
#   - centres BelivaY (GET /hubs) : relais actifs des zones exploitées et centre de chaque zone (ZONES-EXPLOITEES) ;
#   - demandes de modification des champs protégés (nom, officiel RCCM/NIU, titulaire, autre), code SMS, décidées par
#     la console sous 72 h ouvrées (VD-CONTESTATION-REPONSE) avec un motif écrit.
# Console (à brancher) : verifier_lieu(lieu_id, verifie, motif) ; decider_demande(demande_id, accord, motif).
import re
from decimal import Decimal

from django.db import transaction
from rest_framework import status

from apps.client_core.erreurs import ErreurClient
from apps.client_core.temps import ms
from apps.vendeur_core import echanges, horloge, parametres
from apps.vendeur_core.models import Boutique, Membre

from . import services as s
from .models import DemandeModification, LieuBoutique

LIEUX_MAX = 5  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-LIEUX-MAX (principal + 4 autres lieux, proposé)
NOM_MIN, NOM_MAX = 3, 60
PRECISION_MAX_M = 100  # point GPS trop imprécis : refusé (« position »)
CHAMPS = ("nom", "titulaire", "officiel", "autre")
RCCM = re.compile(r"^[A-Z]{2}-[A-Z]{3}-\d{2,4}-[A-Z]-\d{3,6}$", re.IGNORECASE)  # FORME_RCCM (communs.ts)
NIU = re.compile(r"^[A-Z]\d{12}[A-Z]$", re.IGNORECASE)  # FORME_NIU
MOTIF_MIN = 10
PIECES_MAX = 5


def _position(lat, lon):
    from belivay_moteurs.geo import Position

    try:
        return Position(Decimal(str(lat)), Decimal(str(lon)))
    except (ValueError, ArithmeticError, TypeError):
        return None


def _metres(a, b) -> int:
    from belivay_moteurs.geo import distance_m

    return int(distance_m(a, b).quantize(Decimal(1)))


def _q(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.000001"))


def _zone(lat, lon) -> dict | None:
    from apps.vendeur_session.ouverture import zone_du_point

    return zone_du_point(lat, lon)


def _horaires_ok(h) -> bool:
    if h is None:
        return True
    if not isinstance(h, list) or not all(isinstance(x, dict) for x in h):
        return False
    return not any(x.get("ouvert") and (s._hm(x.get("a", "")) or 0) <= (s._hm(x.get("de", "")) or 0) for x in h)


# ── Centres BelivaY (GET /hubs) ──────────────────────────────────────────────────────────────────────────


def centres() -> list[dict]:
    from apps.client_core import parametres as reg
    from apps.client_core import pont
    from apps.vendeur_session.ouverture import CENTRES

    out = []
    for z in reg.geo().zones:
        c = CENTRES.get(z.nom)
        if c:
            out.append(
                {
                    "id": f"cz-{z.code.lower()}",
                    "nom": f"Centre BelivaY {z.code} · {z.nom}",
                    "type": "centre_zone",
                    "zone": z.code,
                    "quartier": z.nom,
                    "position": {"lat": float(c[0]), "lon": float(c[1])},
                    "horaires": "Lun – sam 07 h – 20 h",
                    "exploitee": True,
                }
            )
    for r in pont.relais_actifs():
        if r.position is None:
            continue
        z = _zone(*r.position)
        if z is None:
            continue
        out.append(
            {
                "id": f"r-{r.id}",
                "nom": r.nom,
                "type": "relais",
                "zone": z["code"],
                "quartier": r.quartier,
                "position": {"lat": float(r.position[0]), "lon": float(r.position[1])},
                "horaires": r.horaires,
                "exploitee": True,
            }
        )
    return out


# ── Lieux ────────────────────────────────────────────────────────────────────────────────────────────────


def principal(b: Boutique) -> LieuBoutique:
    """Le lieu principal, créé à la première lecture à partir de la boutique (ouverte avant les emplacements multiples)."""
    lieu = b.lieux.filter(principal=True).first()
    if lieu is None:
        lieu = LieuBoutique.objects.create(
            boutique=b,
            nom=f"Boutique de {b.quartier}" if b.quartier else b.nom,
            type=LieuBoutique.Type.BOUTIQUE,
            principal=True,
            cree_le=horloge.maintenant(),
        )
    return lieu


def lieu_json(lieu: LieuBoutique) -> dict:
    b = lieu.boutique
    if lieu.principal:  # point, repère et vérification : ceux de la boutique (origine du ramassage)
        lat, lon, zone, quartier, repere = b.lat, b.lon, b.zone, b.quartier, b.repere
        pose, verifie, attente = b.point_pose_le or b.cree_le, b.point_verifie_le, b.point_attente
    else:
        lat, lon, zone, quartier, repere = lieu.lat, lieu.lon, lieu.zone, lieu.quartier, lieu.repere
        pose, verifie, attente = lieu.pose_le or lieu.cree_le.date(), lieu.verifie_le, lieu.attente
    return {
        "id": str(lieu.pk),
        "nom": lieu.nom,
        "type": lieu.type,
        "principal": lieu.principal,
        "position": {"lat": float(lat or 0), "lon": float(lon or 0)},
        "zone": zone or None,
        "quartier": quartier or None,
        "adresse": lieu.adresse,
        "repere": repere,
        "horaires": lieu.horaires,
        "statut": "verifie" if verifie and not attente else "a_verifier",
        "point": {"poseLe": pose.isoformat(), "verifieLe": verifie.isoformat() if verifie else None, "enAttente": attente or None},
        "centre": lieu.centre or None,
    }


def lieux(b: Boutique) -> dict:
    principal(b)
    return {
        "lieux": [lieu_json(x) for x in b.lieux.select_related("boutique").order_by("-principal", "cree_le", "id")],
        "max": LIEUX_MAX,
        "centres": centres(),
    }


def _lieu(b: Boutique, ident) -> LieuBoutique | None:
    return b.lieux.filter(pk=int(ident)).select_related("boutique").first() if str(ident).isdigit() else None


@transaction.atomic
def ajouter(b: Boutique, n: dict) -> dict:
    principal(b)
    if b.lieux.count() >= LIEUX_MAX:
        return s.non("plein")
    nom = str(n.get("nom") or "").strip()
    if not NOM_MIN <= len(nom) <= NOM_MAX:
        return s.non("nom")
    repere = str(n.get("repere") or "").strip()
    if len(repere) > s.REPERE_MAX:
        return s.non("repere")
    horaires = n.get("horaires")
    if not _horaires_ok(horaires):
        return s.non("ordre")
    centre = next((c for c in centres() if c["id"] == n.get("centre")), None) if n.get("centre") else None
    if centre:
        p = _position(centre["position"]["lat"], centre["position"]["lon"])
        z = {"code": centre["zone"], "quartiers": centre["quartier"]}
    else:
        pos = n.get("position") if isinstance(n.get("position"), dict) else {}
        p = _position(pos.get("lat"), pos.get("lon"))
        precision = n.get("precision")
        if p is None or not isinstance(precision, (int, float)) or precision > PRECISION_MAX_M:
            return s.non("position")
        z = _zone(p.latitude, p.longitude)
    if z is None:
        return s.non("hors_zone")
    t = horloge.maintenant()
    type_ = LieuBoutique.Type.COLLECTE if centre else n.get("type")
    if type_ not in LieuBoutique.Type.values:
        type_ = LieuBoutique.Type.AUTRE
    lieu = LieuBoutique.objects.create(
        boutique=b,
        nom=nom,
        type=type_,
        adresse=str(n.get("adresse") or "").strip()[:160] or (centre["nom"] if centre else ""),
        horaires=horaires,
        centre=centre["id"] if centre else "",
        lat=_q(p.latitude),
        lon=_q(p.longitude),
        zone=z["code"],
        quartier=z["quartiers"],
        repere=repere,
        pose_le=s._jour(t),
        # Un centre BelivaY est connu : vérifié d'office ; un point posé au GPS attend l'agent de zone.
        verifie_le=s._jour(t) if centre else None,
        cree_le=t,
    )
    _emettre_lieu(b, lieu, "ajoute")
    return s.ok(lieu=lieu_json(lieu))


def modifier(b: Boutique, ident, champs: dict) -> dict:
    """Nom, adresse, repère, horaires : sans nouvelle vérification (EMP-02)."""
    lieu = _lieu(b, ident)
    if lieu is None:
        return s.non("introuvable")
    if "nom" in champs and not NOM_MIN <= len(str(champs["nom"] or "").strip()) <= NOM_MAX:
        return s.non("nom")
    if "repere" in champs and len(str(champs["repere"] or "").strip()) > s.REPERE_MAX:
        return s.non("repere")
    if "horaires" in champs and not _horaires_ok(champs["horaires"]):
        return s.non("ordre")
    if "nom" in champs:
        lieu.nom = str(champs["nom"]).strip()
    if "adresse" in champs:
        lieu.adresse = str(champs["adresse"] or "").strip()[:160]
    if "horaires" in champs:
        lieu.horaires = champs["horaires"]
    if "repere" in champs:
        if lieu.principal:
            b.repere = str(champs["repere"] or "").strip()
            b.save(update_fields=["repere"])
        else:
            lieu.repere = str(champs["repere"] or "").strip()
    lieu.save()
    return s.ok(lieu=lieu_json(lieu))


def replacer(b: Boutique, ident, lat, lon) -> dict:
    """Au-delà de 200 m (DEPLACEMENT_MAX_SANS_VERIF) : « À vérifier », l'ancien point sert, agent prévenu (Q-91)."""
    lieu = _lieu(b, ident)
    if lieu is None:
        return s.non("introuvable")
    if lieu.principal:
        r = s.replacer(b, lat, lon)
        b.refresh_from_db()
        lieu.boutique = b
    else:
        p = _position(lat, lon)
        if p is None:
            raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Position illisible.")
        t = horloge.maintenant()
        metres = _metres(_position(lieu.lat, lieu.lon), p) if lieu.lat is not None else 0
        verification = metres > s.DEPLACEMENT_MAX_M
        if verification:
            lieu.attente = {"lat": float(p.latitude), "lon": float(p.longitude), "a": ms(t)}
        else:
            lieu.lat, lieu.lon, lieu.pose_le, lieu.attente = _q(p.latitude), _q(p.longitude), s._jour(t), None
        lieu.save()
        r = {"nouvelleVerification": verification, "metres": metres}
    if r["nouvelleVerification"]:
        _emettre_lieu(b, lieu, "deplace")
    return s.ok(lieu=lieu_json(lieu), nouvelleVerification=r["nouvelleVerification"], metres=r["metres"])


def demander_code_principal(proprio: Membre) -> dict:
    s._envoyer_code("v-lieu-principal", proprio.telephone, proprio.user)
    return {"masque": s.masquer(proprio.telephone)}


@transaction.atomic
def rendre_principal(b: Boutique, proprio: Membre, ident, code) -> dict:
    """Lieu vérifié seulement (jamais un point que personne n'a vu) ; change l'origine du ramassage et la zone."""
    lieu = _lieu(b, ident)
    if lieu is None:
        return s.non("introuvable")
    if lieu.principal:
        return s.ok(lieux=lieux(b))
    if lieu.verifie_le is None or lieu.attente:
        return s.non("a_verifier")
    if not s._code_bon("v-lieu-principal", code, proprio.telephone, proprio.user):
        return s.non("code")
    ancien = principal(b)
    # L'ancien principal garde le point de la boutique ; la boutique prend celui du nouveau.
    ancien.lat, ancien.lon, ancien.zone, ancien.quartier, ancien.repere = b.lat, b.lon, b.zone, b.quartier, b.repere
    ancien.pose_le, ancien.verifie_le, ancien.attente, ancien.principal = b.point_pose_le, b.point_verifie_le, b.point_attente, False
    ancien.save()
    b.lat, b.lon, b.zone, b.quartier, b.repere = lieu.lat, lieu.lon, lieu.zone, lieu.quartier, lieu.repere
    b.point_pose_le, b.point_verifie_le, b.point_attente = lieu.pose_le, lieu.verifie_le, None
    b.save(update_fields=["lat", "lon", "zone", "quartier", "repere", "point_pose_le", "point_verifie_le", "point_attente"])
    lieu.principal = True
    lieu.save(update_fields=["principal"])
    _emettre_lieu(b, lieu, "principal")
    return s.ok(lieux=lieux(b))


def retirer(b: Boutique, ident) -> dict:
    lieu = _lieu(b, ident)
    if lieu is None:
        return s.non("introuvable")
    if lieu.principal:
        return s.non("principal")
    _emettre_lieu(b, lieu, "retire")
    lieu.delete()
    return s.ok(lieux=lieux(b))


def _emettre_lieu(b: Boutique, lieu: LieuBoutique, action: str) -> None:
    echanges.emettre(b, "sortant", "administration", "lieu", "location.changed", {"lieuId": str(lieu.pk), "action": action})


def verifier_lieu(lieu_id: int, verifie: bool, motif: str = "") -> LieuBoutique:
    """Console (agent de zone) : le point en attente devient celui du lieu, ou il est refusé avec un motif."""
    lieu = LieuBoutique.objects.select_related("boutique").get(pk=lieu_id)
    b = lieu.boutique
    t = horloge.maintenant()
    if lieu.principal:
        if verifie:
            s.valider_point(b)
            if b.point_verifie_le is None:
                b.point_verifie_le = s._jour(t)
                b.save(update_fields=["point_verifie_le"])
        else:
            b.point_attente = None
            b.save(update_fields=["point_attente"])
    else:
        if verifie and lieu.attente:
            lieu.lat, lieu.lon = _q(Decimal(str(lieu.attente["lat"]))), _q(Decimal(str(lieu.attente["lon"])))
            lieu.pose_le = s._jour(t)
        if verifie:
            lieu.verifie_le = s._jour(t)
        lieu.attente = None
        lieu.save()
    echanges.emettre(
        b,
        "entrant",
        "administration",
        "lieu_verifie",
        "location.verified",
        {"lieuId": str(lieu.pk), "verifie": verifie, "motif": motif or None},
    )
    return lieu


# ── Demandes de modification ─────────────────────────────────────────────────────────────────────────────


def demande_json(d: DemandeModification) -> dict:
    return {
        "id": str(d.pk),
        "champ": d.champ,
        "avant": d.avant or None,
        "valeur": d.valeur,
        "motif": d.motif,
        "pieces": d.pieces,
        "statut": d.statut,
        "creeeLe": ms(d.cree_le),
        "reponseAvant": ms(d.reponse_avant),
        "historique": d.historique,
        "motifRefus": d.motif_refus or None,
    }


def demandes(b: Boutique) -> list[dict]:
    return [demande_json(d) for d in b.demandes_modification.all()]


def demander_code(proprio: Membre) -> dict:
    s._envoyer_code("v-demande-modification", proprio.telephone, proprio.user)
    return {"masque": s.masquer(proprio.telephone)}


def _avant(b: Boutique, champ: str) -> str:
    if champ == "nom":
        return b.nom
    if champ == "titulaire":
        return s.titulaire(b)
    if champ == "officiel":
        return f"RCCM {b.rccm} · NIU {b.niu}" if b.rccm else "Particulier · sans RCCM"
    return ""


def demander(b: Boutique, proprio: Membre, d: dict, code) -> dict:
    champ = d.get("champ")
    if champ not in CHAMPS:
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Champ inconnu.")
    rccm, niu = str(d.get("rccm") or "").strip().upper(), str(d.get("niu") or "").strip().upper()
    if champ == "officiel":
        if not RCCM.match(rccm):
            return s.non("rccm")
        if not NIU.match(niu):
            return s.non("niu")
        valeur = f"RCCM {rccm} · NIU {niu}"
    else:
        valeur = str(d.get("valeur") or "").strip()[:160]
        if champ != "autre" and len(valeur) < 3:
            return s.non("valeur")
    motif = str(d.get("motif") or "").strip()
    if len(motif) < MOTIF_MIN:
        return s.non("motif")
    pieces = [
        {"nom": str(p.get("nom", ""))[:120], "taille": int(p.get("taille") or 0)}
        for p in (d.get("pieces") if isinstance(d.get("pieces"), list) else [])
        if isinstance(p, dict)
    ][:PIECES_MAX]
    # Pièces : extrait RCCM et attestation NIU, ou pièce d'identité du nouveau titulaire ; le nom n'en demande pas.
    if champ in ("officiel", "titulaire") and not pieces:
        return s.non("pieces")
    if b.demandes_modification.filter(champ=champ, statut=DemandeModification.Statut.EN_ATTENTE).exists():
        return s.non("deja")
    if not s._code_bon("v-demande-modification", code, proprio.telephone, proprio.user):
        return s.non("code")
    from apps.vendeur_croissance.services import apres_heures_ouvrees

    t = horloge.maintenant()
    dm = DemandeModification.objects.create(
        boutique=b,
        champ=champ,
        avant=_avant(b, champ),
        valeur=valeur,
        motif=motif[:500],
        pieces=pieces,
        cree_le=t,
        reponse_avant=apres_heures_ouvrees(t, parametres.contestation_reponse()),
        historique=[{"a": ms(t), "texte": "Demande envoyée", "par": "vous"}],
    )
    echanges.emettre(
        b,
        "sortant",
        "administration",
        "demande_modification",
        "change_request.created",
        {"demandeId": str(dm.pk), "champ": champ, "valeur": valeur, "motif": dm.motif, "pieces": len(pieces)},
    )
    # Une trace part aussi dans la conversation « Support BelivaY ».
    s.ecrire_au_support(b, proprio, f"Demande de modification · {champ} : {valeur} — {dm.motif}")
    return s.ok(demande=demande_json(dm))


def annuler(b: Boutique, ident) -> dict:
    dm = b.demandes_modification.filter(pk=int(ident)).first() if str(ident).isdigit() else None
    if dm is None:
        return s.non("introuvable")
    if dm.statut != DemandeModification.Statut.EN_ATTENTE:
        return s.non("etat")
    dm.statut = DemandeModification.Statut.ANNULEE
    dm.historique = [*dm.historique, {"a": horloge.maintenant_ms(), "texte": "Demande annulée", "par": "vous"}]
    dm.save(update_fields=["statut", "historique"])
    return s.ok(demande=demande_json(dm))


@transaction.atomic
def decider_demande(demande_id: int, accord: bool, motif: str) -> DemandeModification:
    """Console : décision avec un motif écrit ; acceptée, le nom et les informations officielles s'appliquent à la
    boutique (le titulaire change par le support, avec la pièce d'identité : PAR-01)."""
    dm = DemandeModification.objects.select_related("boutique").select_for_update().get(pk=demande_id)
    if dm.statut != DemandeModification.Statut.EN_ATTENTE:
        return dm
    b = dm.boutique
    if accord:
        if dm.champ == "nom":
            b.nom = dm.valeur[:120]
        elif dm.champ == "officiel":
            m = re.match(r"RCCM (\S+) · NIU (\S+)", dm.valeur)
            if m:
                b.rccm, b.niu, b.statut = m.group(1), m.group(2), Boutique.Statut.ENTREPRISE
        b.save()
    dm.statut = DemandeModification.Statut.ACCEPTEE if accord else DemandeModification.Statut.REFUSEE
    dm.motif_refus = "" if accord else motif[:500]
    dm.historique = [
        *dm.historique,
        {"a": horloge.maintenant_ms(), "texte": ("Acceptée : " if accord else "Refusée : ") + motif, "par": "belivay"},
    ]
    dm.save()
    echanges.emettre(
        b,
        "entrant",
        "administration",
        "demande_decidee",
        "change_request.decided",
        {"demandeId": str(dm.pk), "decision": dm.statut, "motif": motif},
    )
    return dm
