# backend/apps/vendeur_boutique/services.py
# Logique des domaines « boutique », « compte », « equipe », « messages », « notifications » et « aide » de l'espace
# vendeur (VD-11 ; espace-vendeur/src/donnees/domaines/*.ts, démonstrations src/demo/*.ts). Les vues ne font que lire
# l'entrée et rendre ce que ces fonctions renvoient (mêmes noms de champs que le site, dates en ms).
#
# Exposé aux autres applications :
#   messages_non_lus(boutique) -> int                      badge de la messagerie (apps.vendeur_session)
#   notifications_non_lues(membre) -> int                  badge des notifications (apps.vendeur_session)
#   enregistrer_appareil(membre, appareil_id, nom, lieu, *, type="telephone", jti="") -> AppareilVendeur
#                                                          à chaque connexion (apps.vendeur_session)
#   appareil_revoque(membre, appareil_id) -> bool          session d'un appareil déconnecté à refuser
#   ecrire_au_support(boutique, membre, texte, ref=None) -> dict   conversation « Support BelivaY » (VD06-R07…)
# Console BelivaY et agent de zone (routes d'essai /api/_essai/… à brancher par le coordinateur) :
#   repondre_support(boutique, texte) -> MessageSupportVendeur      le support répond dans la conversation
#   valider_point(boutique) -> Boutique                    l'agent de zone valide le point déplacé (> 200 m)
#   executer_clotures() -> list[tuple[Boutique, list[str]]]  clôtures arrivées à échéance (tâche de nuit)
#
# ANONYMAT (GEN-01) : avis et conversations du client sont lus dans les tables du kit client (aftersales, messaging)
# et rendus sans le client : ni nom, ni numéro, ni relais ; le commentaire et les messages passent par le filtre
# (apps.client_core.masquage.nettoyer_message) ; le client lit « Le vendeur », jamais la boutique ni le membre.
import base64
import re
import unicodedata
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status

from apps.client_core.erreurs import ErreurClient, conflit
from apps.client_core.masquage import nettoyer_message, numero_local
from apps.client_core.temps import YAOUNDE, ms
from apps.vendeur_core import calendrier, horloge, parametres
from apps.vendeur_core import droits as droits_m
from apps.vendeur_core import services as socle
from apps.vendeur_core.faits import faits
from apps.vendeur_core.models import Boutique, CommandeVendeur, EntreeJournal, FermetureBoutique, Membre, NotificationVendeur, Offre

from .models import (
    AppareilVendeur,
    HistoriqueEquipe,
    InvitationMembre,
    LectureFil,
    MessageSupportVendeur,
    ProfilMembre,
    QuestionAideVendeur,
    ReglagesNotificationsVendeur,
    ReponseAvis,
    SignatureMessage,
)

# ── Paramètres (registre vendeur ; absents du registre du kit : constantes nommées) ─────────────────────

PREAVIS_FERMETURE_H = 48  # PARAMÈTRE À AJOUTER AU REGISTRE : FERMETURE_PREAVIS (HOR-05, Q-39)
PAUSE_MAX_JOURS = 30  # PARAMÈTRE À AJOUTER AU REGISTRE : PAUSE_MAX_JOURS (Q-39)
DEPLACEMENT_MAX_M = 200  # PARAMÈTRE À AJOUTER AU REGISTRE : DEPLACEMENT_MAX_SANS_VERIF (EMP-01, VD11-R21)
REPONSE_AVIS_JOURS = 30  # PARAMÈTRE À AJOUTER AU REGISTRE : REPONSE_AVIS (VD11-R56, Q-88)
POIDS_SATISFACTION = 20  # PARAMÈTRE À AJOUTER AU REGISTRE : POIDS_AVIS_TRUST (VD11-R57)
EXPORT_H = 48  # PARAMÈTRE À AJOUTER AU REGISTRE : EXPORT_DONNEES (VD11-R36)
# Accès Préparation par boutique : VD-EQUIPE-MAX (parametres.equipe_max, EQU-02) ; préavis de clôture du compte :
# VD-RESILIATION-PREAVIS (parametres.resiliation_preavis, SEC-03).
RETENTION_NOTIFICATIONS_J = 365  # PARAMÈTRE À AJOUTER AU REGISTRE : RETENTION_NOTIFICATIONS (DP-33 : 12 mois)
RENVOI_INVITATION_S = 60  # comme OTP-RENVOI
INVITATION_JOURS = 7  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-INVITATION-JOURS (« Renvoyer » la prolonge)
REPERE_MAX = 120
DESCRIPTION_MAX = 300
PHOTO_MAX_OCTETS = 3 * 1024 * 1024
REPONSE_AVIS_MIN = 10
PRIX_EXEMPLE_AIDE = 20000  # ITEL AC52 du jeu d'essai (VD11-R65) : « un ITEL AC52 vendu 20 000 F »
# Coordonnées officielles (site/src/config/coordonnees.ts, consigne du porteur du 5 oct. 2026).
TELEPHONE_BELIVAY = "+237 689 002 812"  # PARAMÈTRE À AJOUTER AU REGISTRE : CONTACT-TELEPHONE
EMAIL_BELIVAY = "contact@belivay.com"  # PARAMÈTRE À AJOUTER AU REGISTRE : CONTACT-EMAIL
RESEAUX_BELIVAY = [
    {"nom": "facebook", "libelle": "Facebook", "url": "https://www.facebook.com/share/1Jte1yhs4a/"},
    {"nom": "instagram", "libelle": "Instagram", "url": "https://www.instagram.com/belivaycm"},
    {"nom": "tiktok", "libelle": "TikTok", "url": "https://www.tiktok.com/@belivaymarketplace"},
]
JOURS_COURTS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
MASQUES = re.compile(r"\{\{\w+\}\}")
SUPPORT = "support"
QUI_VENDEUR = "Le vendeur"
ACCUSE_SUPPORT = "Bien reçu. Une personne vous répond en {h} h au plus, de {de} h à {a} h, ici même."


def ok(**champs) -> dict:
    return {"ok": True, **champs}


def non(raison: str, detail: str | None = None) -> dict:
    d = {"ok": False, "raison": raison}
    if detail:
        d["detail"] = detail
    return d


def _jour(t: datetime) -> date:
    return t.astimezone(YAOUNDE).date()


def _debut(j: date) -> datetime:
    return datetime.combine(j, time(0, 0), YAOUNDE)


def _lire_jour(texte) -> date | None:
    try:
        return date.fromisoformat(str(texte)) if re.fullmatch(r"\d{4}-\d\d-\d\d", str(texte or "")) else None
    except ValueError:
        return None


def propre_pour_vendeur(texte: str) -> str:
    """Texte déjà nettoyé : les masques {{numero}}, {{email}}, {{lien}} s'affichent « ••• » chez le vendeur."""
    return MASQUES.sub("•••", texte or "")


def filtrer(texte: str) -> tuple[str, bool]:
    """Filtre des coordonnées avant l'envoi (CMS-04, VD11-R59) : (texte gardé, quelque chose a été retiré)."""
    propre, masques = nettoyer_message(texte)
    return propre, bool(masques)


# ═══ BOUTIQUE ═══════════════════════════════════════════════════════════════════════════════════════════


def pause_active(b: Boutique, t: datetime | None = None) -> bool:
    t = t or horloge.maintenant()
    return bool(b.pause_depuis and b.pause_jusqua and b.pause_depuis <= t < b.pause_jusqua)


def fermetures_actives(b: Boutique):
    return FermetureBoutique.objects.filter(boutique=b, annulee_le__isnull=True)


def _jours_texte(jours: list[int]) -> str:
    """[0, 1, 2, 3, 4] → « lun–ven » ; [5] → « sam » ; [0, 2] → « lun, mer »."""
    js = sorted(set(int(j) for j in jours))
    if len(js) > 2 and js == list(range(js[0], js[-1] + 1)):
        return f"{JOURS_COURTS[js[0]]}–{JOURS_COURTS[js[-1]]}"
    return ", ".join(JOURS_COURTS[j] for j in js)


def titulaire(b: Boutique) -> str:
    m = b.membres.filter(role=Membre.Role.PROPRIETAIRE).order_by("id").first()
    if m is not None:
        return f"{m.prenom} {m.nom}".strip()
    u = b.proprietaire
    return f"{u.first_name} {u.last_name}".strip()


def boutique_json(b: Boutique) -> dict:
    t = horloge.maintenant()
    jour = horloge.aujourd_hui()
    cal = calendrier.calendrier(b)
    fermetures = [f for f in fermetures_actives(b).order_by("du") if f.au >= jour]
    pause = pause_active(b, t)
    fermee_le = b.fermee_le if b.fermee_le == jour else None
    fermee_jusqua = ms(calendrier.ouverture_du_jour_suivant(t, cal)) if fermee_le else None
    programmee = any(f.du <= jour <= f.au for f in fermetures)
    return {
        "nom": b.nom,
        "titulaire": titulaire(b),
        "identifiant": b.identifiant,
        "statut": b.statut,
        "creeLe": b.cree_le.isoformat(),
        "approuveLe": b.approuve_le.isoformat() if b.approuve_le else None,
        "zone": b.zone,
        "quartier": b.quartier,
        "repere": b.repere,
        "position": {"lat": float(b.lat or 0), "lon": float(b.lon or 0)},
        "point": {
            "poseLe": (b.point_pose_le or b.cree_le).isoformat(),
            "verifieLe": b.point_verifie_le.isoformat() if b.point_verifie_le else None,
            "enAttente": b.point_attente or None,
        },
        "horaires": b.horaires or [],
        "passageLivreur": [{"jours": _jours_texte(p["jours"]), "de": p["de"], "a": p["a"]} for p in b.passages or []],
        "societeLivraison": b.societe_livraison,
        "fermeeAujourdhui": bool(fermee_le) or pause or programmee,
        "fermeeJusqua": fermee_jusqua,
        "fermeeLe": fermee_le.isoformat() if fermee_le else None,
        # La pause finit au début du jour de reprise (gardée une seconde avant, pour le calendrier en jours entiers).
        "pause": {"depuis": ms(b.pause_depuis), "jusqua": ms(b.pause_jusqua + timedelta(seconds=1))} if pause else None,
        "fermetures": [
            {"id": str(f.pk), "du": f.du.isoformat(), "au": f.au.isoformat(), "motif": f.motif, "annonceeLe": ms(f.annoncee_le)}
            for f in fermetures
        ],
        "vitrine": {"photo": b.vitrine_photo or None, "logo": b.vitrine_logo or None, "description": b.vitrine_description},
        # Seule chose que voit le client (VD11-R07, R08) : ni le nom, ni la vitrine, ni l'emplacement.
        "apercuClient": {"palier": b.palier, "trustScore": float(b.trust_score)},
    }


def fermer_aujourdhui(b: Boutique, membre: Membre, fermee: bool) -> dict:
    """« Fermer aujourd'hui » jusqu'à la prochaine ouverture réelle (Q-39) ; l'accès Préparation ferme, et ne rouvre
    que le jour même (Q-18)."""
    from apps.vendeur_core.acces import refus_proprietaire

    jour = horloge.aujourd_hui()
    if not fermee and not membre.proprietaire and b.fermee_le != jour:
        raise refus_proprietaire()
    b.fermee_le = jour if fermee else None
    b.save(update_fields=["fermee_le"])
    return boutique_json(b)


def _hm(s: str) -> int | None:
    m = re.fullmatch(r"([01]\d|2[0-3]):([0-5]\d)", str(s or ""))
    return int(m.group(1)) * 60 + int(m.group(2)) if m else None


def changer_horaires(b: Boutique, horaires: list[dict]) -> dict:
    propres = []
    for h in horaires:
        de, a = _hm(h.get("de")), _hm(h.get("a"))
        jour = h.get("jour")
        if not isinstance(jour, int) or not 0 <= jour <= 6 or de is None or a is None:
            raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Horaires illisibles.")
        if h.get("ouvert") and a <= de:
            return non("ordre")
        propres.append({"jour": jour, "ouvert": bool(h.get("ouvert")), "de": h["de"], "a": h["a"]})
    propres.sort(key=lambda x: x["jour"])
    b.horaires = propres
    b.save(update_fields=["horaires"])
    return ok(boutique=boutique_json(b))


def mettre_en_pause(b: Boutique, jours) -> dict:
    if not isinstance(jours, int) or isinstance(jours, bool) or not 1 <= jours <= PAUSE_MAX_JOURS:
        return non("duree")
    t = horloge.maintenant()
    b.pause_depuis = t
    # Reprise au début du jour J + jours ; gardée une seconde avant pour que ce jour reste ouvert au calendrier.
    b.pause_jusqua = _debut(_jour(t) + timedelta(days=jours)) - timedelta(seconds=1)
    b.save(update_fields=["pause_depuis", "pause_jusqua"])
    return ok(boutique=boutique_json(b))


def reprendre(b: Boutique) -> dict:
    b.pause_depuis = b.pause_jusqua = None
    b.save(update_fields=["pause_depuis", "pause_jusqua"])
    return boutique_json(b)


def programmer_fermeture(b: Boutique, du, au, motif: str) -> dict:
    d, a = _lire_jour(du), _lire_jour(au)
    if d is None or a is None or a < d:
        return non("dates")
    t = horloge.maintenant()
    if _debut(d) - t < timedelta(hours=PREAVIS_FERMETURE_H):
        return non("preavis_48h")
    if fermetures_actives(b).filter(du__lte=a, au__gte=d).exists():
        return non("chevauche")
    FermetureBoutique.objects.create(boutique=b, du=d, au=a, motif=(motif or "").strip()[:80], annoncee_le=t)
    return ok(boutique=boutique_json(b))


def _fermeture(b: Boutique, ident) -> FermetureBoutique | None:
    return fermetures_actives(b).filter(pk=int(ident)).first() if str(ident).isdigit() else None


def ecourter_fermeture(b: Boutique, ident, au) -> dict:
    f = _fermeture(b, ident)
    a = _lire_jour(au)
    if f is None or a is None or a < f.du or a >= f.au:
        return non("dates")
    f.au = a
    f.save(update_fields=["au"])
    return ok(boutique=boutique_json(b))


def annuler_fermeture(b: Boutique, ident) -> dict:
    f = _fermeture(b, ident)
    if f is not None:
        f.annulee_le = horloge.maintenant()
        f.save(update_fields=["annulee_le"])
    return boutique_json(b)


def replacer(b: Boutique, lat, lon) -> dict:
    """Nouveau point (VD11-R21) : au-delà de 200 m, nouvelle vérification par l'agent de zone ; l'ancien point sert
    jusque-là (Q-91). Distance géodésique par le moteur (belivay_moteurs.geo.distance_m)."""
    from belivay_moteurs.geo import Position, distance_m

    try:
        nouveau = Position(Decimal(str(lat)), Decimal(str(lon)))
    except (ValueError, ArithmeticError):
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Position illisible.") from None
    t = horloge.maintenant()
    if b.lat is None or b.lon is None:
        metres, verification = 0, False
    else:
        metres = int(distance_m(Position(b.lat, b.lon), nouveau).quantize(Decimal(1)))
        verification = metres > DEPLACEMENT_MAX_M
    if verification:
        b.point_attente = {"lat": float(nouveau.latitude), "lon": float(nouveau.longitude), "a": ms(t)}
    else:
        b.lat, b.lon = nouveau.latitude.quantize(Decimal("0.000001")), nouveau.longitude.quantize(Decimal("0.000001"))
        b.point_pose_le = _jour(t)
        b.point_attente = None
    b.save(update_fields=["lat", "lon", "point_pose_le", "point_attente"])
    return ok(boutique=boutique_json(b), nouvelleVerification=verification, metres=metres, a=ms(t))


def valider_point(b: Boutique) -> Boutique:
    """L'agent de zone a vérifié le point en attente : il devient le point de la boutique (console, route d'essai)."""
    if b.point_attente:
        t = horloge.maintenant()
        b.lat = Decimal(str(b.point_attente["lat"])).quantize(Decimal("0.000001"))
        b.lon = Decimal(str(b.point_attente["lon"])).quantize(Decimal("0.000001"))
        b.point_pose_le = b.point_verifie_le = _jour(t)
        b.point_attente = None
        b.save(update_fields=["lat", "lon", "point_pose_le", "point_verifie_le", "point_attente"])
    return b


def changer_repere(b: Boutique, repere: str) -> dict:
    r = (repere or "").strip()
    if not r:
        return non("vide")
    if len(r) > REPERE_MAX:
        return non("long")
    b.repere = r
    b.save(update_fields=["repere"])
    return ok(boutique=boutique_json(b))


def modifier_vitrine(b: Boutique, champs: dict) -> dict:
    """Vitrine INTERNE (VD11-R11) : pour le vendeur, l'agent de zone et le livreur ; jamais montrée au client."""
    if "description" in champs and len(champs["description"] or "") > DESCRIPTION_MAX:
        return non("long")
    for cle in ("photo", "logo"):
        if cle in champs and champs[cle] is not None and len(champs[cle]) > PHOTO_MAX_OCTETS * 4 // 3:
            return non("long", cle)
    if "photo" in champs:
        b.vitrine_photo = champs["photo"] or ""
    if "logo" in champs:
        b.vitrine_logo = champs["logo"] or ""
    if "description" in champs:
        b.vitrine_description = (champs["description"] or "").strip()
    b.save(update_fields=["vitrine_photo", "vitrine_logo", "vitrine_description"])
    return ok(boutique=boutique_json(b))


# ── Avis du client sur la boutique (VD11-R56, R57) ───────────────────────────────────────────────────────


def _duree(d: timedelta) -> str:
    minutes = int(abs(d.total_seconds()) // 60)
    h, m = divmod(minutes, 60)
    return f"{h} h {m:02d}" if h else f"{m} min"


def _journal_avis(c: CommandeVendeur, retrait: datetime | None) -> list[dict]:
    """Ce que la boutique a fait pour la commande notée (préparation, remise au livreur, retrait) : jamais le client."""
    j = []
    if c.prete_a and c.echeance:
        ecart = c.echeance - c.prete_a
        j.append(
            {
                "etape": "prete",
                "texte": f"{_duree(ecart)} avant l’échéance" if ecart >= timedelta(0) else f"{_duree(ecart)} après l’échéance",
            }
        )
    if c.remise_a:
        h = c.remise_a.astimezone(YAOUNDE)
        photos = len(c.photos_remise or [])
        j.append({"etape": "ramassage", "texte": f"Contrôlé et scellé à {h:%H} h {h:%M}" + (f" · {photos} photos" if photos else "")})
    if retrait:
        base = c.remise_a or c.prete_a or c.payee_a
        jours = (_jour(retrait) - _jour(base)).days
        quand = "le jour même" if jours <= 0 else "le lendemain" if jours == 1 else f"{jours} jours après"
        j.append({"etape": "tournee", "texte": f"Retirée au relais {quand}"})
    return j


def _avis_de(b: Boutique) -> list[dict]:
    """Avis des clients sur les colis de la boutique (aftersales.AvisCommande : une note par colis, puis le relais)."""
    from apps.aftersales.models import AvisCommande
    from apps.pickup.models import SousCommande

    commandes = {}
    for c in CommandeVendeur.objects.filter(boutique=b):
        commandes.setdefault(c.order_id, []).append(c)
    reponses = {(r.avis_id, r.n): r for r in ReponseAvis.objects.filter(boutique=b)}
    rendu = []
    for avis in AvisCommande.objects.filter(order_id__in=list(commandes)):
        colis = list(
            SousCommande.objects.filter(order_id=avis.order_id)
            .exclude(etat=SousCommande.Etat.ANNULEE)
            .order_by("n")
            .values_list("n", flat=True)
        )
        for c in commandes[avis.order_id]:
            if c.n not in colis or colis.index(c.n) >= len(avis.notes) - 1:
                continue
            note = int(avis.notes[colis.index(c.n)])
            retrait = faits(c).retrait
            r = reponses.get((avis.pk, c.n))
            commentaire = propre_pour_vendeur(nettoyer_message(avis.commentaire)[0]) if avis.commentaire else None
            rendu.append(
                {
                    "id": f"{avis.pk}-{c.n}",
                    "ref": c.ref,
                    "note": note,
                    "commentaire": commentaire,
                    "a": ms(avis.envoye_le),
                    "verifie": retrait is not None,  # achat vérifié : payé et retiré
                    "journal": _journal_avis(c, retrait),
                    "reponse": {"a": ms(r.a), "texte": r.texte, "fil": SUPPORT} if r else None,
                    "limiteReponse": ms(avis.envoye_le + timedelta(days=REPONSE_AVIS_JOURS)),
                    "_avis": avis.pk,
                    "_n": c.n,
                }
            )
    rendu.sort(key=lambda x: x["a"], reverse=True)
    return rendu


def avis(b: Boutique) -> dict:
    from belivay_moteurs.notes import note_affichee

    liste = _avis_de(b)
    note = note_affichee(tuple(a["note"] for a in liste))
    return {
        "note": float(note) if note is not None else None,
        "nombre": len(liste),
        "poidsPourCent": POIDS_SATISFACTION,
        "liste": [{k: v for k, v in a.items() if not k.startswith("_")} for a in liste],
    }


def repondre_avis(b: Boutique, membre: Membre, ident: str, texte: str) -> dict:
    """Réponse privée, passée par le support (VD11-R56) : 30 jours après l'avis, une seule, sans coordonnées."""
    a = next((x for x in _avis_de(b) if x["id"] == str(ident)), None)
    t = (texte or "").strip()
    if a is None:
        return non("delai_depasse")
    if a["reponse"]:
        return non("deja_repondu")
    if horloge.maintenant_ms() > a["limiteReponse"]:
        return non("delai_depasse")
    if len(t) < REPONSE_AVIS_MIN:
        return non("trop_court")
    if filtrer(t)[1]:
        return non("coordonnees")
    with transaction.atomic():
        ecrire_au_support(b, membre, f"Réponse privée à l’avis, à transmettre sans le nom de ma boutique : « {t} »", a["ref"])
        ReponseAvis.objects.create(boutique=b, avis_id=a["_avis"], n=a["_n"], texte=t, membre=membre, a=horloge.maintenant())
    return ok(fil=SUPPORT)


# ═══ SUPPORT BELIVAY (conversation de la boutique, Q-49) ═════════════════════════════════════════════════


def _support_horaires() -> tuple[int, int, int]:
    from apps.client_core.parametres import entier, nombres
    from apps.messaging.regles import horaires_support

    de, a, _ = horaires_support(nombres("SUP-HORAIRES"))
    return entier("SUP-DELAI"), de, a


def ecrire_au_support(b: Boutique, membre: Membre | None, texte: str, ref: str | None = None) -> dict:
    """Message du vendeur au support (filtré, signé), puis accusé de réception du support (Q-47)."""
    t = (texte or "").strip()
    if not t:
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "vide", "Écrivez un message.")
    if ref:
        t = f"{ref} · {t}"
    propre, filtre = filtrer(t)
    maintenant = horloge.maintenant()
    delai, de, a = _support_horaires()
    with transaction.atomic():
        m = MessageSupportVendeur.objects.create(
            boutique=b,
            de="vendeur",
            membre=membre,
            auteur=membre.prenom if membre else "",
            texte=propre,
            filtre=filtre,
            ref=ref or "",
            a=maintenant,
        )
        ar = MessageSupportVendeur.objects.create(boutique=b, de="support", texte=ACCUSE_SUPPORT.format(h=delai, de=de, a=a), a=maintenant)
        _lu(b, SUPPORT, ar.a)
    return {"fil": SUPPORT, "message": m}


def repondre_support(b: Boutique, texte: str, ref: str = "") -> MessageSupportVendeur:
    """Le support BelivaY répond (console) ; notification « message » au vendeur."""
    m = MessageSupportVendeur.objects.create(boutique=b, de="support", texte=texte.strip(), ref=ref, a=horloge.maintenant())
    socle.notifier(
        b, "message", "Nouveau message · Support BelivaY", "Ouvrez la conversation pour le lire et répondre.", "messages?fil=support"
    )
    return m


# ═══ MESSAGES (conversations anonymes, MSG-01) ═══════════════════════════════════════════════════════════

REPONSES_RAPIDES = {
    "commande": ["C’est prêt", "Le livreur passe aujourd’hui", "Merci pour votre commande"],
    "litige": [
        "Je regarde votre photo et je reviens vers vous",
        "Pouvez-vous ajouter une photo de l’étiquette ?",
        "Merci pour votre patience",
    ],
    "support": ["Pouvez-vous me rappeler la règle ?", "Merci, c’est réglé"],
}


def _lu(b: Boutique, fil: str, a: datetime) -> None:
    LectureFil.objects.update_or_create(boutique=b, fil=fil, defaults={"lu_le": a})


def _lectures(b: Boutique) -> dict[str, datetime]:
    return dict(LectureFil.objects.filter(boutique=b).values_list("fil", "lu_le"))


def conversations(b: Boutique):
    """Conversations du kit client adressées à la boutique (questions au vendeur, messaging.Conversation « vendeur »)."""
    from apps.messaging.models import Conversation

    if not b.vendor_id:
        return Conversation.objects.none()
    return Conversation.objects.filter(type=Conversation.Type.VENDEUR, vendor_id=b.vendor_id)


def _commande_du_fil(b: Boutique, conv) -> CommandeVendeur | None:
    """La commande de la boutique à laquelle se rattache la conversation : la plus récente du même client qui porte
    le produit de la question. Le client n'est lu que pour ce rattachement, jamais rendu."""
    from apps.client_core import pont

    orders = list(pont.modele("commande").objects.filter(user_id=conv.client_id).values_list("pk", flat=True))
    for c in CommandeVendeur.objects.filter(boutique=b, order_id__in=orders).order_by("-payee_a"):
        if any(str(lg.get("productId")) == str(conv.product_id) for lg in c.lignes):
            return c
    return None


def _etape(c: CommandeVendeur, f) -> str:
    if c.annulee_a:
        return "annulée"
    if f.gel == "litige":
        return "litige"
    if f.gel == "retour":
        return "retour"
    if f.retrait:
        return "livrée"
    if c.remise_a:
        return "chez le livreur"
    if c.prete_a:
        return "prête"
    return "à préparer"


def _fermee_commande(c: CommandeVendeur, f) -> bool:
    """MSG-02 : fermée à la fin du délai de litige (fermeture du retour) ou à l'annulation."""
    from belivay_moteurs.litiges import fermeture_du_retour

    if c.annulee_a:
        return True
    if f.retrait is None or f.gel:
        return False
    fin = fermeture_du_retour(_jour(f.retrait), _jour(f.tout_en_ordre) if f.tout_en_ordre else None, parametres.litiges())
    return horloge.aujourd_hui() > fin


def _message_client(m, signatures: dict) -> dict | None:
    if m.de == "systeme":
        return None
    if m.de == "eux":
        s = signatures.get(m.pk)
        return {
            "id": str(m.pk),
            "de": "vendeur",
            "auteur": s,
            "texte": propre_pour_vendeur(m.texte),
            "a": ms(m.cree_le),
            "filtre": bool(m.masques),
        }
    texte = propre_pour_vendeur(m.texte) if m.texte else "Photo envoyée"
    return {"id": str(m.pk), "de": "client", "auteur": None, "texte": texte, "a": ms(m.cree_le), "filtre": bool(m.masques)}


def _fil_client(b: Boutique, conv, lectures: dict) -> tuple[dict, list[dict]]:
    msgs = list(conv.messages.order_by("cree_le", "pk"))
    signatures = dict(SignatureMessage.objects.filter(message_id__in=[m.pk for m in msgs]).values_list("message_id", "auteur"))
    rendus = [x for x in (_message_client(m, signatures) for m in msgs) if x]
    ident = f"c{conv.pk}"
    lu = lectures.get(ident)
    non_lus = sum(1 for m in msgs if m.de in ("moi", "photo") and (lu is None or m.cree_le > lu))
    c = _commande_du_fil(b, conv)
    if c is not None:
        f = faits(c)
        type_ = "litige" if f.litige_id else "commande"
        ferme = f.gel is None if f.litige_id else _fermee_commande(c, f)
        lg = c.lignes[0] if c.lignes else {}
        etape = _etape(c, f)
        carte = {
            "titre": lg.get("titre", ""),
            "variante": lg.get("variante", ""),
            "dessin": lg.get("dessin", ""),
            "etape": etape,
            "echeance": ms(c.echeance) if etape == "à préparer" else None,
        }
        ref, sujet = c.ref, f"Client de {c.ref}"
    else:
        o = Offre.objects.select_related("fiche").filter(boutique=b, product_id=conv.product_id).first()
        type_, ferme, ref, sujet = "commande", False, None, "Question d’un client"
        carte = (
            {
                "titre": o.titre,
                "variante": o.variante,
                "dessin": o.fiche.dessin if o.fiche else "",
                "etape": "avant l’achat",
                "echeance": None,
            }
            if o
            else None
        )
    fil = {
        "id": ident,
        "type": type_,
        "ref": ref,
        "sujet": sujet,
        "nonLus": non_lus,
        "dernier": rendus[-1] if rendus else None,
        "ferme": ferme,
        "commande": carte,
    }
    return fil, rendus


def _message_support(m: MessageSupportVendeur) -> dict:
    return {
        "id": f"s{m.pk}",
        "de": m.de,
        "auteur": m.auteur or None if m.de == "vendeur" else None,
        "texte": propre_pour_vendeur(m.texte),
        "a": ms(m.a),
        "filtre": m.filtre,
    }


def _fil_support(b: Boutique, lectures: dict) -> tuple[dict, list[dict]]:
    msgs = list(MessageSupportVendeur.objects.filter(boutique=b))
    lu = lectures.get(SUPPORT)
    rendus = [_message_support(m) for m in msgs]
    non_lus = sum(1 for m in msgs if m.de == "support" and (lu is None or m.a > lu))
    fil = {
        "id": SUPPORT,
        "type": "support",
        "ref": None,
        "sujet": "Support BelivaY",
        "nonLus": non_lus,
        "dernier": rendus[-1] if rendus else None,
        "ferme": False,
        "commande": None,
    }
    return fil, rendus


def fils(b: Boutique) -> list[dict]:
    lectures = _lectures(b)
    rendu = [_fil_client(b, conv, lectures)[0] for conv in conversations(b).filter(messages__isnull=False).distinct()]
    rendu.append(_fil_support(b, lectures)[0])
    rendu.sort(key=lambda f: (f["ferme"], -((f["dernier"] or {}).get("a") or 0)))
    return rendu


def ouvrir_fil(b: Boutique, ref: str) -> dict | None:
    """La conversation d'une commande (REP-03 : « Relire les messages de la commande »), créée au besoin : celle que le
    client a ouverte sur le produit (messaging.question_vendeur), rattachée à la commande. None : commande inconnue."""
    from apps.client_core import pont
    from apps.messaging.services import question_vendeur

    c = CommandeVendeur.objects.filter(boutique=b, ref=str(ref).upper()).first()
    if c is None or not c.lignes:
        return None
    commande = pont.commande(c.order_id)
    produit = pont.produit(c.lignes[0].get("productId"))
    if commande is None or commande.user_id is None or produit is None:
        return None
    from django.contrib.auth import get_user_model

    conv = question_vendeur(get_user_model().objects.get(pk=commande.user_id), produit)
    return {"fil": f"c{conv.pk}"}


def _conversation(b: Boutique, ident: str):
    if not re.fullmatch(r"c\d+", str(ident)):
        return None
    return conversations(b).filter(pk=int(str(ident)[1:])).first()


def fil(b: Boutique, ident: str) -> dict | None:
    lectures = _lectures(b)
    if ident == SUPPORT:
        f, m = _fil_support(b, lectures)
        return {"fil": f, "messages": m}
    conv = _conversation(b, ident)
    if conv is None:
        return None
    f, m = _fil_client(b, conv, lectures)
    return {"fil": f, "messages": m}


def envoyer(b: Boutique, membre: Membre, ident: str, texte: str) -> dict | None:
    """Réponse du vendeur dans la conversation du client (même fil, CMS-04) : filtrée avant l'enregistrement, signée
    par le membre (EQU-03) ; le client lit « Le vendeur »."""
    from apps.messaging.models import Conversation, Message

    t = (texte or "").strip()
    if not t:
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "vide", "Écrivez un message.")
    if ident == SUPPORT:
        return _message_support(ecrire_au_support(b, membre, t)["message"])
    conv = _conversation(b, ident)
    if conv is None:
        return None
    if _fil_client(b, conv, {})[0]["ferme"]:
        raise conflit("ferme", "Conversation fermée : le message n’est pas parti.")
    propre, masques = nettoyer_message(t)
    maintenant = horloge.maintenant()
    with transaction.atomic():
        m = Message.objects.create(conversation=conv, de=Message.De.EUX, qui=QUI_VENDEUR, texte=propre, masques=masques, cree_le=maintenant)
        SignatureMessage.objects.create(message_id=m.pk, membre=membre, auteur=membre.prenom)
        Conversation.objects.filter(pk=conv.pk).update(maj_le=maintenant)
        _lu(b, ident, maintenant)
    _prevenir_client(conv)
    return _message_client(m, {m.pk: membre.prenom})


def _prevenir_client(conv) -> None:
    """Notification au client (centre + push selon ses choix) : sans le nom de la boutique (BOU-01)."""
    try:
        from apps.notifications_client.services import envoyer_notification
    except ImportError:  # pragma: no cover - notifications du kit client absentes
        return
    try:
        envoyer_notification(
            conv.client, "messages", "Le vendeur vous a répondu", "Ouvrez la conversation pour lire sa réponse.", f"/fil?id={conv.cle}"
        )
    except Exception:  # noqa: BLE001 - une notification qui échoue n'empêche pas le message
        pass


def lire(b: Boutique, ident: str) -> bool:
    if ident != SUPPORT and _conversation(b, ident) is None:
        return False
    _lu(b, ident, horloge.maintenant())
    return True


def messages_non_lus(b: Boutique) -> int:
    """Messages des clients et du support pas encore lus par la boutique (badge, lu par apps.vendeur_session)."""
    lectures = _lectures(b)
    total = _fil_support(b, lectures)[0]["nonLus"]
    for conv in conversations(b):
        lu = lectures.get(f"c{conv.pk}")
        qs = conv.messages.filter(de__in=("moi", "photo"))
        total += (qs.filter(cree_le__gt=lu) if lu else qs).count()
    return total


# ═══ NOTIFICATIONS ═══════════════════════════════════════════════════════════════════════════════════════

CANAL_SMS = ("preparer", "litige")  # SMS + notification, non désactivables (VD11-R43, R44)


def _ref_du_lien(lien: str) -> str | None:
    m = re.search(r"ref=([\w-]+)", lien or "")
    return m.group(1) if m else None


def _urgent(b: Boutique, n: NotificationVendeur) -> bool:
    """« Urgent » vivant : commande encore à préparer, litige qui court (VD11-R53)."""
    if not n.urgent:
        return False
    ref = _ref_du_lien(n.lien)
    c = socle.commande(b, ref) if ref else None
    if c is None:
        return n.urgent
    if n.type == "preparer":
        return c.prete_a is None and c.annulee_a is None
    if n.type == "litige":
        return faits(c).gel in ("litige", "retour")
    return True


def _notifications(b: Boutique, membre: Membre):
    limite = horloge.maintenant() - timedelta(days=RETENTION_NOTIFICATIONS_J)
    qs = NotificationVendeur.objects.filter(boutique=b, a__gte=limite).prefetch_related("lue_par")
    if not membre.proprietaire:
        qs = qs.exclude(argent=True)
    return qs.order_by("-a", "-id")


def notification_json(b: Boutique, membre: Membre, n: NotificationVendeur) -> dict:
    return {
        "id": str(n.pk),
        "type": n.type,
        "canal": "sms" if n.type in CANAL_SMS else "notification",
        "titre": {"modele": n.titre},
        "texte": {"modele": n.texte},
        "a": ms(n.a),
        "lu": any(m.pk == membre.pk for m in n.lue_par.all()),
        "urgent": _urgent(b, n),
        "argent": n.argent,
        "lien": n.lien,
        "contester": n.lien if n.type in ("sanction", "palier") and n.lien.startswith("contester") else None,
    }


def notifications(b: Boutique, membre: Membre, filtre: str = "tout") -> list[dict]:
    tout = [notification_json(b, membre, n) for n in _notifications(b, membre)]
    if filtre == "urgent":
        return [n for n in tout if n["urgent"]]
    if filtre == "argent":
        return [n for n in tout if n["argent"]]
    return tout


def compteurs(b: Boutique, membre: Membre) -> dict:
    t = notifications(b, membre)
    return {
        "tout": len(t),
        "urgent": sum(n["urgent"] for n in t),
        "argent": sum(n["argent"] for n in t),
        "nonLues": sum(not n["lu"] for n in t),
    }


def notifications_non_lues(membre: Membre) -> int:
    return _notifications(membre.boutique, membre).exclude(lue_par=membre).count()


def marquer_lue(b: Boutique, membre: Membre, ident, lue: bool = True) -> bool:
    n = _notifications(b, membre).filter(pk=int(ident)).first() if str(ident).isdigit() else None
    if n is None:
        return False
    (n.lue_par.add if lue else n.lue_par.remove)(membre)
    return True


def tout_marquer_lu(b: Boutique, membre: Membre) -> None:
    for n in _notifications(b, membre).exclude(lue_par=membre):
        n.lue_par.add(membre)


def reglages(membre: Membre) -> dict:
    r = ReglagesNotificationsVendeur.objects.get_or_create(membre=membre)[0]
    return {
        "commandesEtLitiges": True,
        "versements": r.versements if membre.proprietaire else False,
        "avis": r.avis,
        "conseils": r.conseils,
        "sonDistinct": r.son_distinct,
        "silence": [r.silence_de, r.silence_a],
    }


def regler(membre: Membre, champs: dict) -> dict:
    r = ReglagesNotificationsVendeur.objects.get_or_create(membre=membre)[0]
    noms = {"versements": "versements", "avis": "avis", "conseils": "conseils", "sonDistinct": "son_distinct"}
    for cle, champ in noms.items():
        if cle == "versements" and not membre.proprietaire:
            continue  # l'accès Préparation ne reçoit pas les notifications d'argent
        if isinstance(champs.get(cle), bool):
            setattr(r, champ, champs[cle])
    r.save()
    return reglages(membre)


# ═══ COMPTE ══════════════════════════════════════════════════════════════════════════════════════════════

MOTIFS_CODE = ("profil", "email", "telephone", "mot_de_passe", "export", "cloture", "appareil")


def profil_de(membre: Membre) -> ProfilMembre:
    return ProfilMembre.objects.get_or_create(membre=membre)[0]


def masquer(telephone: str) -> str:
    """« +237 6 77 12 42 17 » → « 6•• •• •• 17 » (jamais le numéro entier à l'écran)."""
    n = numero_local(telephone)
    return f"{n[:1]}•• •• •• {n[-2:]}" if n else ""


def telephone_formate(n: str) -> str:
    return f"+237 {n[0]} {n[1:3]} {n[3:5]} {n[5:7]} {n[7:]}"


def _sans_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")


def profil_json(membre: Membre) -> dict:
    p = profil_de(membre)
    b = membre.boutique
    ident = (
        b.identifiant
        if membre.proprietaire
        else "@" + re.sub(r"\W", "", _sans_accents(membre.prenom)) + _sans_accents(membre.nom)[:1].upper()
    )
    return {
        "prenom": membre.prenom,
        "nom": membre.nom,
        "email": (membre.user.email or None) if membre.user else None,
        "telephone": membre.telephone,
        "photo": p.photo or None,
        "couverture": p.couverture or None,
        "bio": p.bio,  # présentation (AJ-B) : vue par l'équipe et l'agent de zone, jamais par les clients
        "role": membre.role,
        "identifiant": ident,
        "titulaire": membre.proprietaire,
    }


def _objet(motif: str) -> str:
    return f"v-{motif}"[:20]


def _envoyer_code(objet: str, destination: str, user) -> dict | None:
    """Code par apps.otp ; None si un code vient d'être envoyé (429 trop_tot / trop_d_envois : le précédent vaut)."""
    from apps.otp.services import envoyer

    try:
        return envoyer(objet=objet, destination=destination, utilisateur=user)
    except ErreurClient as e:
        if e.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            return None
        raise


def _code_bon(objet: str, code, destination: str, user, consommer: bool = True) -> bool:
    from apps.otp.services import verifier

    return bool(code) and verifier(objet=objet, code=str(code), destination=destination, utilisateur=user, consommer=consommer).get(
        "ok", False
    )


def _deux_codes_bons(premier: tuple, second: tuple, user) -> bool:
    """Deux codes (CIN-39, DP-52) : vérifiés sans être consommés, puis consommés ensemble si les deux sont bons."""
    if not (_code_bon(*premier, user, consommer=False) and _code_bon(*second, user, consommer=False)):
        return False
    return _code_bon(*premier, user) and _code_bon(*second, user)


def demander_code(membre: Membre, motif: str) -> dict:
    if motif not in MOTIFS_CODE:
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Motif inconnu.")
    envoi = _envoyer_code(_objet(motif), membre.telephone, membre.user)
    if envoi is None:
        return non("trop_tot")
    return ok(masque=masquer(membre.telephone), renvoiSecondes=envoi["renvoiSecondes"])


def _image(photo) -> str | None:
    """Photo rognée : data: URL (texte) ou fichier envoyé, gardée en data: URL ; None pour la retirer."""
    if photo is None or photo == "":
        return ""
    if isinstance(photo, str):
        if not (photo.startswith("data:image/") or photo.startswith("https://") or photo.startswith("/")):
            raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Photo illisible.")
        return photo
    contenu = photo.read(PHOTO_MAX_OCTETS + 1)
    if len(contenu) > PHOTO_MAX_OCTETS:
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Photo trop lourde.")
    type_ = getattr(photo, "content_type", "") or "image/jpeg"
    if not type_.startswith("image/"):
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Photo illisible.")
    return f"data:{type_};base64,{base64.b64encode(contenu).decode()}"


def modifier_profil(membre: Membre, champs: dict, code) -> dict:
    prenom = champs.get("prenom")
    nom = champs.get("nom")
    if (prenom is not None and not str(prenom).strip()) or (nom is not None and not str(nom).strip()):
        return non("nom")
    # Le nom du titulaire suit la pièce d'identité (PAR-01) : il change par une demande au support.
    if membre.proprietaire and ((prenom and prenom.strip() != membre.prenom) or (nom and nom.strip() != membre.nom)):
        return non("titulaire")
    photo = _image(champs["photo"]) if "photo" in champs else None
    couverture = _image(champs["couverture"]) if "couverture" in champs else None
    if not _code_bon(_objet("profil"), code, membre.telephone, membre.user):
        return non("code")
    if prenom is not None:
        membre.prenom = prenom.strip()[:60]
    if nom is not None:
        membre.nom = nom.strip()[:60]
    membre.save(update_fields=["prenom", "nom"])
    if membre.user and not membre.proprietaire:
        membre.user.first_name, membre.user.last_name = membre.prenom, membre.nom
        membre.user.save(update_fields=["first_name", "last_name"])
    if photo is not None or couverture is not None:
        p = profil_de(membre)
        p.photo = p.photo if photo is None else photo
        p.couverture = p.couverture if couverture is None else couverture
        p.save(update_fields=["photo", "couverture"])
    return ok(profil=profil_json(membre))


BIO_MAX = 160


def changer_bio(membre: Membre, texte) -> dict:
    """Présentation facultative (AJ-B, 160 signes) : numéros, e-mails et liens refusés (GEN-08) ; sans code (elle ne
    donne aucun accès)."""
    v = str(texte or "").strip()
    if len(v) > BIO_MAX:
        return non("long")
    if filtrer(v)[1]:
        return non("coordonnees")
    p = profil_de(membre)
    p.bio = v
    p.save(update_fields=["bio"])
    return ok(profil=profil_json(membre))


EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


def demander_code_email(membre: Membre, email: str) -> dict:
    v = (email or "").strip().lower()
    if not EMAIL.match(v):
        return non("email")
    u = membre.user
    if u and (u.email or "").lower() == v:
        return non("meme")
    if get_user_model().objects.filter(email__iexact=v).exclude(pk=u.pk if u else None).exists():
        return non("pris")
    p = profil_de(membre)
    p.email_attente = v
    p.save(update_fields=["email_attente"])
    _envoyer_code("v-email-adresse", v, u)
    return ok()


def confirmer_email(membre: Membre, code_sms, code_email) -> dict:
    p = profil_de(membre)
    if not p.email_attente or membre.user is None:
        return non("code")
    if not _deux_codes_bons((_objet("email"), code_sms, membre.telephone), ("v-email-adresse", code_email, p.email_attente), membre.user):
        return non("code")
    membre.user.email = p.email_attente
    membre.user.save(update_fields=["email"])
    p.email_attente = ""
    p.save(update_fields=["email_attente"])
    return ok(profil=profil_json(membre))


def _numero_pris(n: str, membre: Membre) -> bool:
    for m in Membre.objects.filter(actif=True).exclude(pk=membre.pk).only("telephone"):
        if numero_local(m.telephone) == n:
            return True
    try:
        from apps.client_accounts.services import numero_pris
    except ImportError:  # pragma: no cover - comptes du kit client absents
        return False
    return numero_pris(n, sauf=membre.user)


def demander_codes_numero(membre: Membre, numero: str) -> dict:
    """Deux codes (CIN-39) : à l'ancien numéro et au nouveau."""
    n = numero_local(numero or "")
    if not re.fullmatch(r"6\d{8}", n):
        return non("prefixe")
    if numero_local(membre.telephone) == n:
        return non("meme")
    if _numero_pris(n, membre):
        return non("pris")
    p = profil_de(membre)
    p.numero_attente = n
    p.save(update_fields=["numero_attente"])
    _envoyer_code("v-tel-ancien", membre.telephone, membre.user)
    _envoyer_code("v-tel-nouveau", n, membre.user)
    return ok()


def confirmer_numero(membre: Membre, code_ancien, code_nouveau) -> dict:
    p = profil_de(membre)
    n = p.numero_attente
    if not n or not _deux_codes_bons(("v-tel-ancien", code_ancien, membre.telephone), ("v-tel-nouveau", code_nouveau, n), membre.user):
        return non("code")
    membre.telephone = telephone_formate(n)
    membre.save(update_fields=["telephone"])
    p.numero_attente = ""
    p.save(update_fields=["numero_attente"])
    return ok(profil=profil_json(membre))


# ── Appareils et sessions (SEC-01, VD11-R38) ──────────────────────────────────────────────────────────────


def enregistrer_appareil(
    membre: Membre, appareil_id: str, nom: str, lieu: str, *, type: str = "telephone", jti: str = ""
) -> AppareilVendeur:  # noqa: A002
    """Appelée par la connexion (apps.vendeur_session) : un appareil par identifiant ; ville, jamais l'adresse IP."""
    t = horloge.maintenant()
    a, cree = AppareilVendeur.objects.get_or_create(
        membre=membre,
        appareil_id=str(appareil_id)[:80],
        defaults={"nom": nom[:80], "lieu": lieu[:80], "type": type, "jti": jti[:64], "premiere": t, "vu_a": t},
    )
    if not cree:
        a.nom, a.lieu, a.vu_a, a.revoque_le = nom[:80] or a.nom, lieu[:80] or a.lieu, t, None
        a.ouvertures += 1
        if jti:
            a.jti = jti[:64]
        a.save()
    return a


def appareil_revoque(membre: Membre, appareil_id: str) -> bool:
    return AppareilVendeur.objects.filter(membre=membre, appareil_id=str(appareil_id), revoque_le__isnull=False).exists()


def _blacklister(jtis: list[str]) -> None:
    try:
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
    except (ImportError, RuntimeError):  # pragma: no cover - liste noire absente
        return
    for t in OutstandingToken.objects.filter(jti__in=[j for j in jtis if j]):
        BlacklistedToken.objects.get_or_create(token=t)


def _actuel(a: AppareilVendeur, appareil_courant: str) -> bool:
    return bool(appareil_courant) and a.appareil_id == appareil_courant


def appareils(membre: Membre, appareil_courant: str = "") -> list[dict]:
    rendu = [
        {
            "id": str(a.pk),
            "nom": a.nom,
            "type": a.type,
            "lieu": a.lieu,
            "vuA": ms(a.vu_a),
            "premiere": ms(a.premiere),
            "ouvertures": a.ouvertures,
            "actuel": _actuel(a, appareil_courant),
        }
        for a in AppareilVendeur.objects.filter(membre=membre, revoque_le__isnull=True)
    ]
    rendu.sort(key=lambda x: (not x["actuel"], -x["vuA"]))
    return rendu


def deconnecter(membre: Membre, appareil_courant: str, ident: str | None = None) -> list[dict]:
    """Déconnecte un appareil (ou tous les autres) : session refusée, jeton en liste noire ; jamais l'actuel."""
    qs = AppareilVendeur.objects.filter(membre=membre, revoque_le__isnull=True)
    if ident is not None:
        qs = qs.filter(pk=int(ident)) if str(ident).isdigit() else qs.none()
    cibles = [a for a in qs if not _actuel(a, appareil_courant)]
    _blacklister([a.jti for a in cibles])
    AppareilVendeur.objects.filter(pk__in=[a.pk for a in cibles]).update(revoque_le=horloge.maintenant())
    return appareils(membre, appareil_courant)


def changer_mot_de_passe(membre: Membre, ancien: str, nouveau: str, code, request=None) -> dict:
    u = membre.user
    if u is None or not u.check_password(ancien or ""):
        return non("ancien")
    if len(nouveau or "") < 8 or not re.search(r"\d", nouveau):
        return non("faible")
    if nouveau == ancien:
        return non("identique")
    if not _code_bon(_objet("mot_de_passe"), code, membre.telephone, u):
        return non("code")
    u.set_password(nouveau)
    u.save(update_fields=["password"])
    try:
        from apps.client_accounts.services import fermer_autres_sessions

        fermer_autres_sessions(u, request)  # CAP-15 : les autres sessions se ferment
    except ImportError:  # pragma: no cover
        pass
    return ok()


# ── Sécurité, statut, export, clôture ──────────────────────────────────────────────────────────────────


def _a_verser(b: Boutique) -> int:
    try:
        from apps.vendeur_argent.services import a_verser
    except ImportError:
        return 0
    return int(a_verser(b) or 0)


def a_solder(b: Boutique) -> list[dict]:
    """Ce qui reste avant une clôture (SEC-06) : commandes en cours, litiges, versements."""
    commandes = litiges = 0
    for c in CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True):
        f = faits(c)
        if f.gel in ("litige", "recours"):
            litiges += 1
        elif f.retrait is None or f.gel == "retour":
            commandes += 1
    versements = 1 if _a_verser(b) > 0 else 0
    return [
        x
        for x in (
            {"type": "commandes", "nombre": commandes, "route": "commandes"},
            {"type": "litiges", "nombre": litiges, "route": "litiges"},
            {"type": "versements", "nombre": versements, "route": "versements"},
        )
        if x["nombre"] > 0
    ]


def cloture_bloquee(b: Boutique) -> list[str]:
    """Raisons qui empêchent la clôture effective : commandes_en_cours, argent_a_verser, litiges."""
    raisons = []
    restes = {x["type"] for x in a_solder(b)}
    if "commandes" in restes:
        raisons.append("commandes_en_cours")
    if _a_verser(b) > 0:
        raisons.append("argent_a_verser")
    if "litiges" in restes:
        raisons.append("litiges")
    return raisons


def _proprio(b: Boutique) -> Membre:
    return b.membres.filter(role=Membre.Role.PROPRIETAIRE).order_by("id").first()


def securite(membre: Membre) -> dict:
    p = profil_de(membre)
    proprio = profil_de(_proprio(membre.boutique)) if membre.proprietaire else p
    t = horloge.maintenant()
    pret = p.export_demande_le + timedelta(hours=EXPORT_H) if p.export_demande_le else None
    cloture = proprio.cloture_demandee_le if membre.proprietaire else None
    return {
        "faceId": p.face_id,
        "telephoneMasque": masquer(membre.telephone),
        "exportDemandeLe": ms(p.export_demande_le),
        "exportPretLe": ms(pret) if pret and pret > t else None,
        "clotureDemandeeLe": ms(cloture),
        "clotureLe": ms(cloture + timedelta(days=parametres.resiliation_preavis())) if cloture else None,
        "aSolder": a_solder(membre.boutique) if membre.proprietaire else [],
    }


def regler_face_id(membre: Membre, actif: bool) -> dict:
    p = profil_de(membre)
    p.face_id = bool(actif)
    p.save(update_fields=["face_id"])
    return securite(membre)


FAMILLES = {
    "A": "Électronique, électroménager",
    "B": "Mode, beauté",
    "C": "Supermarché, frais",
    "D": "Maison, sport, bébé, animaux",
    "E": "Livres, médias",
}


def statut(b: Boutique) -> dict:
    """Statut du compte et grille « part que vous gardez » au palier du jour (SEC-05, VD11-R35) : 100 − taux du
    barème × multiplicateur du palier, hors découverte et planchers (comme src/calculs côté site)."""
    p = parametres.commission()
    mult = p.multiplicateurs[b.palier]
    grille = []
    for f, tranches in p.bareme.items():
        gardes = [Decimal(100) - t.taux_pour_cent * mult for t in tranches]
        cats = FAMILLES.get(f) or ", ".join(c for c, x in p.familles.items() if x == f)
        grille.append({"famille": f, "categories": cats, "de": float(min(gardes)), "a": float(max(gardes))})
    dec = socle.decouverte(b)
    return {
        "creeLe": b.cree_le.isoformat(),
        "approuveLe": b.approuve_le.isoformat() if b.approuve_le else None,
        "contratSigneLe": (b.signature_le or b.cree_le).isoformat(),
        "palier": b.palier,
        "trustScore": float(b.trust_score),
        "plan": b.plan,
        "decouverteJusqua": dec["fin"] if dec["active"] else None,
        "grille": grille,
        "plancherCommande": p.plancher_commande,
    }


def exporter(membre: Membre, code) -> dict:
    if not _code_bon(_objet("export"), code, membre.telephone, membre.user):
        return non("code")
    p = profil_de(membre)
    t = horloge.maintenant()
    if p.export_demande_le and p.export_demande_le + timedelta(hours=EXPORT_H) > t:
        return non("deja")
    p.export_demande_le = t
    p.save(update_fields=["export_demande_le"])
    # Le fichier part par e-mail sous 48 h (EXPORT_DONNEES) : préparé par l'équipe BelivaY (console).
    return ok(pret=ms(t + timedelta(hours=EXPORT_H)))


def cloturer(membre: Membre, code, motif: str = "") -> dict:
    """Clôture demandée avec un code SMS (Q-23) : 30 jours de préavis, annulable (SEC-03) ; ce qui reste à solder est
    rendu ; la clôture effective attend que tout soit soldé (executer_clotures)."""
    if not _code_bon(_objet("cloture"), code, membre.telephone, membre.user):
        return non("code")
    p = profil_de(membre)
    if p.cloture_demandee_le:
        return non("deja")
    p.cloture_demandee_le = horloge.maintenant()
    p.cloture_motif = (motif or "").strip()[:200]
    p.save(update_fields=["cloture_demandee_le", "cloture_motif"])
    s = securite(membre)
    return ok(le=s["clotureLe"], aSolder=s["aSolder"])


def annuler_cloture(membre: Membre) -> dict:
    p = profil_de(membre)
    p.cloture_demandee_le = None
    p.save(update_fields=["cloture_demandee_le"])
    return securite(membre)


def executer_clotures() -> list[tuple[Boutique, list[str]]]:
    """Tâche de nuit : clôtures dont le préavis est passé. Refusée (reportée) tant qu'il reste des commandes en cours,
    de l'argent à verser ou des litiges ; sinon les accès de la boutique sont fermés."""
    limite = horloge.maintenant() - timedelta(days=parametres.resiliation_preavis())
    rendu = []
    for p in ProfilMembre.objects.filter(
        cloture_demandee_le__lte=limite, membre__role=Membre.Role.PROPRIETAIRE, membre__actif=True
    ).select_related("membre__boutique"):
        b = p.membre.boutique
        raisons = cloture_bloquee(b)
        if not raisons:
            for m in b.membres.filter(actif=True):
                _couper(m)
        rendu.append((b, raisons))
    return rendu


def demander_modification(b: Boutique, membre: Membre, quoi: str, ref: str | None = None) -> dict:
    return {"fil": ecrire_au_support(b, membre, quoi, ref)["fil"]}


# ═══ ÉQUIPE (EQU-01 à EQU-04, VD11-R22 à R24) ═════════════════════════════════════════════════════════════


def _etat_membre(m: Membre) -> str:
    if m.suspendu_le is not None:
        return "suspendu"
    return "invite" if m.user is None or not m.user.has_usable_password() else "actif"


def _derniere_action(m: Membre) -> dict | None:
    j = journal_membre(m, 1)
    return {"texte": j[0]["texte"], "a": j[0]["a"]} if j else None


def _invite_jusqua(m: Membre) -> int | None:
    if _etat_membre(m) != "invite" or m.proprietaire:
        return None
    inv = InvitationMembre.objects.filter(membre=m).order_by("-id").first()
    depart = (inv.sms_envoye_le or inv.confirmee_le) if inv else m.depuis
    return ms(depart + timedelta(days=INVITATION_JOURS))


def membre_json(m: Membre) -> dict:
    return {
        "id": str(m.pk),
        "prenom": m.prenom,
        "nom": m.nom,
        "initiales": m.initiales,
        "telephone": m.telephone,  # numéro du membre de l'équipe (masqué à l'écran), jamais celui d'un client
        "role": m.role,
        "profil": droits_m.profil_du_membre(m),
        "droits": droits_m.droits_de(m),
        "depuis": ms(m.depuis),
        "etat": _etat_membre(m),
        "inviteJusqua": _invite_jusqua(m),
        "suspenduLe": ms(m.suspendu_le) if m.suspendu_le else None,
        "derniereAction": _derniere_action(m),
    }


def _actifs(b: Boutique):
    return b.membres.filter(actif=True).select_related("user").order_by("-role", "depuis")


def equipe(b: Boutique) -> dict:
    membres = list(_actifs(b))
    return {
        "membres": [membre_json(m) for m in membres],
        "maxEmployes": parametres.equipe_max(),
        # Actifs, invités et suspendus : chacun occupe une place (VD-EQUIPE-MAX).
        "employes": sum(1 for m in membres if m.role == Membre.Role.PREPARATION),
        "historique": [
            {"a": ms(h.a), "action": h.action, "par": h.par, "membre": h.membre, **({"detail": h.detail} if h.detail else {})}
            for h in HistoriqueEquipe.objects.filter(boutique=b)
        ],
    }


NOM_MOT = re.compile(r"^[^\W\d_][^\W\d_'’.-]*(?:['’.-][^\W\d_]*)*\.?$")


def inviter(b: Boutique, proprio: Membre, prenom_nom: str, telephone: str, droits=None) -> dict:
    """Prépare l'ajout d'un accès employé avec SES droits (rôle Préparation par défaut ; interdits retirés d'office) ;
    le code SMS part au propriétaire (second facteur, VD11-R23) : rien n'est créé avant le code."""
    if equipe(b)["employes"] >= parametres.equipe_max():
        return non("plein")
    mots = (prenom_nom or "").split()
    if len(mots) < 2 or not all(NOM_MOT.match(m) for m in mots):
        return non("nom")
    n = numero_local(telephone or "")
    if not re.fullmatch(r"6\d{8}", n):
        return non("telephone")
    if any(numero_local(m.telephone) == n for m in Membre.objects.filter(actif=True).only("telephone")):
        return non("deja")
    d = droits_m.normaliser(droits_m.PROFILS["preparation"] if droits is None else droits)
    if not d:
        return non("droits")
    inv = InvitationMembre.objects.create(
        boutique=b, prenom=mots[0][:60], nom=" ".join(mots[1:])[:60], telephone=n, cree_le=horloge.maintenant(), droits=d
    )
    _envoyer_code("v-equipe-ajout", proprio.telephone, proprio.user)
    return ok(invitation=f"inv-{inv.pk}", masque=masquer(proprio.telephone))


def _sms_installation(m: Membre, proprio: Membre) -> None:
    from apps.otp.prestataires import sms

    sms().envoyer(
        numero_local(m.telephone),
        f"BelivaY : {proprio.prenom} vous a ajouté à l'équipe de sa boutique (accès Préparation). Installez l'application "
        "BelivaY Vendeur et choisissez votre mot de passe avec ce numéro.",
    )


def _compte_du_numero(n: str, prenom: str, nom: str):
    """Le compte BelivaY de ce numéro (vérifié chez le client) ; sinon un compte créé sans mot de passe (à choisir)."""
    try:
        from apps.client_accounts.models import ProfilClient
        from apps.client_core.chiffrement import empreinte

        p = ProfilClient.objects.filter(numero_empreinte=empreinte(n), numero_verifie_le__isnull=False).select_related("user").first()
        if p is not None:
            return p.user
    except ImportError:  # pragma: no cover - comptes du kit client absents
        pass
    User = get_user_model()
    u = User.objects.filter(username=f"v{n}").first()
    if u is None:
        u = User(username=f"v{n}", first_name=prenom, last_name=nom)
        u.set_unusable_password()
        u.save()
    return u


def confirmer_invitation(b: Boutique, proprio: Membre, invitation: str, code) -> dict:
    m = re.fullmatch(r"inv-(\d+)", str(invitation or ""))
    inv = InvitationMembre.objects.filter(boutique=b, pk=int(m.group(1)), confirmee_le__isnull=True).first() if m else None
    if inv is None:
        return non("expire")
    if not _code_bon("v-equipe-ajout", code, proprio.telephone, proprio.user):
        return non("code")
    if equipe(b)["employes"] >= parametres.equipe_max():
        return non("expire")
    t = horloge.maintenant()
    with transaction.atomic():
        u = _compte_du_numero(inv.telephone, inv.prenom, inv.nom)
        membre = Membre.objects.create(
            boutique=b,
            user=u,
            prenom=inv.prenom,
            nom=inv.nom,
            telephone=telephone_formate(inv.telephone),
            role=Membre.Role.PREPARATION,
            depuis=t,
            confirme_le=t,
            droits=droits_m.normaliser(inv.droits or droits_m.PROFILS["preparation"]),
        )
        inv.confirmee_le, inv.membre, inv.sms_envoye_le = t, membre, t
        inv.save(update_fields=["confirmee_le", "membre", "sms_envoye_le"])
        HistoriqueEquipe.objects.create(
            boutique=b, a=t, action="ajout", par=proprio.prenom, membre=f"{inv.prenom} {inv.nom}", detail=droits_m.profil_du_membre(membre)
        )
    _sms_installation(membre, proprio)
    return ok(membre=membre_json(membre))


def _membre(b: Boutique, ident) -> Membre | None:
    return _actifs(b).filter(pk=int(ident)).first() if str(ident).isdigit() else None


def renvoyer_invitation(b: Boutique, proprio: Membre, ident) -> dict:
    m = _membre(b, ident)
    if m is None or _etat_membre(m) != "invite":
        return non("trop_tot")
    inv = InvitationMembre.objects.filter(membre=m).order_by("-id").first()
    t = horloge.maintenant()
    if inv and inv.sms_envoye_le and (t - inv.sms_envoye_le).total_seconds() < RENVOI_INVITATION_S:
        return non("trop_tot")
    if inv:
        inv.sms_envoye_le = t
        inv.save(update_fields=["sms_envoye_le"])
    _sms_installation(m, proprio)
    return ok(jusqua=ms(t + timedelta(days=INVITATION_JOURS)))


def demander_code_retrait(proprio: Membre) -> dict:
    _envoyer_code("v-equipe-retrait", proprio.telephone, proprio.user)
    return {"masque": masquer(proprio.telephone)}


def _couper(m: Membre, garder: bool = False) -> None:
    """Accès retiré (ou suspendu : garder=True, compte gardé) : sessions coupées tout de suite, appareils déconnectés ;
    les actions passées restent signées (EQU-04, VD11-R22)."""
    if not garder:
        m.actif = False
        m.save(update_fields=["actif"])
    jtis = list(AppareilVendeur.objects.filter(membre=m, revoque_le__isnull=True).values_list("jti", flat=True))
    _blacklister(jtis)
    AppareilVendeur.objects.filter(membre=m, revoque_le__isnull=True).update(revoque_le=horloge.maintenant())
    if m.user is not None and not Membre.objects.filter(user=m.user, actif=True, suspendu_le__isnull=True).exists():
        try:
            from apps.client_accounts.services import fermer_toutes_sessions

            fermer_toutes_sessions(m.user)
        except ImportError:  # pragma: no cover
            pass


def retirer(b: Boutique, proprio: Membre, ident, code) -> dict:
    m = _membre(b, ident)
    if m is None or m.proprietaire:
        return non("proprietaire")
    if not _code_bon("v-equipe-retrait", code, proprio.telephone, proprio.user):
        return non("code")
    with transaction.atomic():
        _couper(m)
        HistoriqueEquipe.objects.create(
            boutique=b, a=horloge.maintenant(), action="retrait", par=proprio.prenom, membre=f"{m.prenom} {m.nom}"
        )
    return ok(equipe=equipe(b))


def annuler_invitation(b: Boutique, proprio: Membre, ident) -> dict:
    """Invitation pas encore acceptée (mot de passe pas choisi) : retirée sans code, rien n'est ouvert."""
    m = _membre(b, ident)
    if m is None or m.proprietaire or _etat_membre(m) != "invite":
        return non("introuvable")
    with transaction.atomic():
        _couper(m)
        HistoriqueEquipe.objects.create(
            boutique=b, a=horloge.maintenant(), action="annulation", par=proprio.prenom, membre=f"{m.prenom} {m.nom}"
        )
    return ok(equipe=equipe(b))


MOTIFS_EQUIPE = ("retrait", "droits", "reactivation")


def demander_code_membre(proprio: Membre, motif: str) -> dict:
    """Code SMS au propriétaire avant un retrait, un changement de droits ou une réactivation (un accès donné)."""
    if motif not in MOTIFS_EQUIPE:
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Motif inconnu.")
    _envoyer_code(f"v-equipe-{motif}", proprio.telephone, proprio.user)
    return {"masque": masquer(proprio.telephone)}


def changer_droits(b: Boutique, proprio: Membre, ident, droits, code) -> dict:
    m = _membre(b, ident)
    if m is None or m.proprietaire:
        return non("proprietaire")
    d = droits_m.normaliser(droits if isinstance(droits, list) else [])
    if not d:
        return non("droits")
    if not _code_bon("v-equipe-droits", code, proprio.telephone, proprio.user):
        return non("code")
    with transaction.atomic():
        m.droits = d
        m.save(update_fields=["droits"])
        HistoriqueEquipe.objects.create(
            boutique=b,
            a=horloge.maintenant(),
            action="droits",
            par=proprio.prenom,
            membre=f"{m.prenom} {m.nom}",
            detail=droits_m.profil_de(d),
        )
    # Les droits sont relus à chaque requête (acces.EstMembre) : rien à rafraîchir dans les jetons.
    return ok(membre=membre_json(m))


def suspendre(b: Boutique, proprio: Membre, ident) -> dict:
    """Sessions coupées tout de suite, sans code : retirer un accès ne doit jamais attendre (EQU-04)."""
    m = _membre(b, ident)
    if m is None or m.proprietaire:
        return non("proprietaire")
    if _etat_membre(m) != "actif":
        return non("etat")
    t = horloge.maintenant()
    with transaction.atomic():
        m.suspendu_le = t
        m.save(update_fields=["suspendu_le"])
        _couper(m, garder=True)
        HistoriqueEquipe.objects.create(boutique=b, a=t, action="suspension", par=proprio.prenom, membre=f"{m.prenom} {m.nom}")
    return ok(membre=membre_json(m))


def reactiver(b: Boutique, proprio: Membre, ident, code) -> dict:
    m = _membre(b, ident)
    if m is None or m.proprietaire:
        return non("proprietaire")
    if m.suspendu_le is None:
        return non("etat")
    if not _code_bon("v-equipe-reactivation", code, proprio.telephone, proprio.user):
        return non("code")
    with transaction.atomic():
        m.suspendu_le = None
        m.save(update_fields=["suspendu_le"])
        HistoriqueEquipe.objects.create(
            boutique=b, a=horloge.maintenant(), action="reactivation", par=proprio.prenom, membre=f"{m.prenom} {m.nom}"
        )
    return ok(membre=membre_json(m))


def journal_membre(m: Membre, limite: int = 200) -> list[dict]:
    """Actions signées d'un membre (EQU-03), la plus récente d'abord : journaux des commandes, mouvements de stock,
    connexions (ville, jamais l'adresse IP)."""
    actions = [
        {"a": ms(e.a), "texte": e.action, "domaine": "commandes", "ref": e.commande.ref, "route": f"commande?ref={e.commande.ref}"}
        for e in EntreeJournal.objects.filter(commande__boutique=m.boutique, auteur=m.signature, role=m.role)
        .select_related("commande")
        .order_by("-a")[:limite]
    ]
    try:
        from apps.vendeur_catalogue.models import MouvementStock

        for mv in MouvementStock.objects.filter(membre=m).select_related("offre", "offre__fiche").order_by("-a")[:limite]:
            actions.append(
                {
                    "a": ms(mv.a),
                    "texte": f"Stock : {mv.offre.titre} {mv.avant} → {mv.apres}",
                    "domaine": "produits",
                    "ref": None,
                    "route": f"stock?p={mv.offre_id}",
                }
            )
    except ImportError:  # pragma: no cover - catalogue absent
        pass
    for a in AppareilVendeur.objects.filter(membre=m).order_by("-vu_a")[:limite]:
        lieu = f" · {a.lieu}" if a.lieu else ""
        actions.append({"a": ms(a.vu_a), "texte": f"Connexion · {a.nom}{lieu}", "domaine": "connexion", "ref": None, "route": None})
    actions.sort(key=lambda x: -x["a"])
    return actions[:limite]


# ═══ AIDE (VD11-R63 à R65) ═══════════════════════════════════════════════════════════════════════════════


def _donnees_aide() -> dict:
    import json
    from pathlib import Path

    return json.loads((Path(__file__).parent / "donnees" / "aide.json").read_text(encoding="utf-8"))


def charger_questions(remplacer: bool = True) -> int:
    """Charge les questions d'aide depuis donnees/aide.json (copie de espace-vendeur/src/demo/aide.ts)."""
    d = _donnees_aide()
    n = 0
    for i, q in enumerate(d["questions"], start=1):
        mots = " ".join(d["interdits"]) if q.get("mots") == "interdits" else q.get("mots", "")
        champs = {
            "ordre": i,
            "theme": q["theme"],
            "question": q["question"],
            "reponse": q["reponse"],
            "calcul": q.get("calcul", ""),
            "ecran": q.get("ecran", ""),
            "lien": q.get("lien", ""),
            "mots": mots,
        }
        if remplacer:
            QuestionAideVendeur.objects.update_or_create(cle=q["cle"], defaults=champs)
        else:
            QuestionAideVendeur.objects.get_or_create(cle=q["cle"], defaults=champs)
        n += 1
    return n


def _norm(s: str) -> str:
    return _sans_accents(s).lower()


def _reponse(b: Boutique, q: QuestionAideVendeur, proprietaire: bool) -> dict:
    modele = q.reponse
    r: dict = {"modele": modele}
    if q.calcul == "exemple_garde":
        r["montants"] = {"prix": PRIX_EXEMPLE_AIDE, "garde": socle.garde_par_vente(b, "Électronique", PRIX_EXEMPLE_AIDE)}
    elif q.calcul == "palier_argent":
        pp = parametres.paliers()
        a = pp.conditions["Argent"]
        r["valeurs"] = {"j": pp.montee_jours, "s": a.trust_score, "n": a.commandes_livrees, "note": f"{a.note:.1f}".replace(".", ",")}
        if proprietaire:
            r["montants"] = {
                "argent": socle.garde_par_vente(b, "Électronique", PRIX_EXEMPLE_AIDE, palier="Argent"),
                "bronze": socle.garde_par_vente(b, "Électronique", PRIX_EXEMPLE_AIDE),
            }
        else:  # aucun montant pour l'accès Préparation (DP-55)
            r["modele"] = modele.split(" Vous garderez")[0]
    elif q.calcul == "apercu_client":
        r["valeurs"] = {"palier": b.palier, "score": int(round(b.trust_score))}
    return r


def questions(b: Boutique, proprietaire: bool, recherche: str = "") -> list[dict]:
    qs = QuestionAideVendeur.objects.filter(actif=True)
    if not proprietaire:
        qs = qs.exclude(theme=QuestionAideVendeur.Theme.ARGENT)
    m = _norm((recherche or "").strip())
    rendu = []
    for q in qs:
        if m and m not in _norm(f"{q.question} {q.reponse} {q.mots}"):
            continue
        rendu.append(
            {
                "id": q.cle,
                "theme": q.theme,
                "question": q.question,
                "reponse": _reponse(b, q, proprietaire),
                "ecran": q.ecran or None,
                "lien": q.lien or None,
            }
        )
    return rendu


def produits_interdits() -> list[str]:
    return list(_donnees_aide()["interdits"])


def conseil() -> dict:
    return dict(_donnees_aide()["conseil"])


def contacts() -> dict:
    """Coordonnées officielles de BelivaY : registre (CONTACT-*, SUP-WA, SUP-HORAIRES, SUP-DELAI) sinon constantes."""
    from apps.client_core.masquage import chiffres

    reg = parametres.registre()
    tel = reg.get("CONTACT-TELEPHONE") or TELEPHONE_BELIVAY
    wa = chiffres(reg.get("SUP-WA", ""))
    if len(wa) < 8:
        wa = chiffres(tel)  # « Le numéro WhatsApp officiel est le même que le téléphone » (coordonnees.ts)
    if len(wa) == 9:
        wa = "237" + wa
    delai, de, a = _support_horaires()
    return {
        "telephone": tel,
        "telephoneLien": "tel:+" + chiffres(tel),
        "email": reg.get("CONTACT-EMAIL") or EMAIL_BELIVAY,
        "whatsapp": f"https://wa.me/{wa}",
        "horaires": [f"{de:02d}:00", f"{a:02d}:00"],
        "delaiReponseH": delai,
        "responsablePlatine": True,
        "reseaux": [dict(r) for r in RESEAUX_BELIVAY],
    }
