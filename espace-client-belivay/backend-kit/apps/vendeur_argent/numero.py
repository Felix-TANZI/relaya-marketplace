# backend/apps/vendeur_argent/numero.py
# Numéro de versement (NUM-01 à NUM-07, VD09-R31 à R35 ; Q-19, Q-94) : deux codes SMS (un au NOUVEAU numéro, un au
# téléphone personnel du propriétaire, Membre.telephone : le second facteur), puis revue humaine de VD-NUM-REVUE jours
# (versements.fin_de_revue) ; les versements prévus pendant la revue sont reportés au vendredi qui la suit, jamais
# envoyés à l'ancien numéro ; à la fin de la revue le numéro devient actuel (services.appliquer_revues), chiffré dans
# Boutique.numero_chiffre.
#
# Codes : apps.otp.services.envoyer / verifier (règles OTP-LONG, OTP-DUREE, OTP-ESSAIS, OTP-RENVOI du registre).
#   objet « moyen »         (Nouveau numéro Mobile Money) → au nouveau numéro de versement ;
#   objet « numero-ancien » (numéro connu du compte)       → au téléphone personnel du propriétaire.
import re

from apps.client_core import parametres as reg
from apps.client_core.chiffrement import chiffrer, dechiffrer, empreinte
from apps.client_core.erreurs import ErreurClient
from apps.client_core.masquage import numero_local
from apps.client_core.temps import ms
from apps.vendeur_core import horloge, parametres
from apps.vendeur_core import services as socle
from apps.vendeur_core.models import Boutique, Membre

from . import services
from .models import ChangementNumero

OBJET_NOUVEAU = "moyen"
OBJET_PERSONNEL = "numero-ancien"
INDICATIF = "+237"
LONGUEUR = 9  # chiffres du numéro national camerounais
# Préfixes par opérateur (NUM-02, Q-94 : paramètres du pays) : VD-PREFIXES-CM (vendeur_core.parametres.prefixes_cm).
LIBELLES = {"MTN": "MTN Mobile Money", "Orange": "Orange Money"}


def operateurs() -> list[dict]:
    """[{nom, libelle, prefixes}] lus au registre (VD-PREFIXES-CM, lecture stricte)."""
    return [{"nom": nom, "libelle": LIBELLES.get(nom, nom), "prefixes": list(p)} for nom, p in parametres.prefixes_cm().items()]


def operateur_de(n: str) -> str | None:
    meilleur = None
    for o in operateurs():
        for p in o["prefixes"]:
            if n.startswith(p) and (meilleur is None or len(p) > meilleur[1]):
                meilleur = (o["nom"], len(p))
    return meilleur[0] if meilleur else None


def masquer_destination(n: str) -> str:
    """« 677 •• •• 18 » (étape 2)."""
    return f"{n[:3]} •• •• {n[-2:]}"


def proprietaire(b: Boutique) -> Membre | None:
    return b.membres.filter(role=Membre.Role.PROPRIETAIRE, actif=True).order_by("id").first()


def telephone_personnel(b: Boutique) -> str:
    m = proprietaire(b)
    return numero_local(m.telephone) if m else ""


def _otp():
    essais, attente = reg.nombres("OTP-ESSAIS")[:2]
    return {
        "longueur": reg.entier("OTP-LONG"),
        "dureeMinutes": reg.entier("OTP-DUREE"),
        "renvoiSecondes": reg.nombres("OTP-RENVOI")[0],
        "essais": essais,
        "attente": attente,
    }


def en_attente(b: Boutique) -> ChangementNumero | None:
    """Codes envoyés, pas encore confirmés (étape 2)."""
    return (
        ChangementNumero.objects.filter(boutique=b, valide_le__isnull=True, annule_le__isnull=True)
        .order_by("-codes_envoyes_le", "-id")
        .first()
    )


def lire(b: Boutique) -> dict:
    """NumeroVersement du site."""
    from belivay_moteurs.versements import montant_du, vendredi_de_versement

    t = horloge.maintenant()
    pv = parametres.versements()
    court = socle.numero_court(b) or {"operateur": b.numero_operateur, "masque": ""}
    rv = services.revue_en_cours(b)
    en_revue = None
    if rv is not None:
        base = vendredi_de_versement(t, pv)
        attend = montant_du(base, services.a_verser_gains(services.ventes(b, t)), pv)
        en_revue = {
            "operateur": rv.operateur,
            "masque": rv.masque,
            "jusqua": ms(rv.revue_jusqua),
            "premierVersement": vendredi_de_versement(rv.revue_jusqua, pv).isoformat(),
            "ancien": {"operateur": rv.ancien_operateur, "masque": rv.ancien_masque},
            "enAttente": {"vendredi": base.isoformat(), "montant": attend} if attend else None,
        }
    o = _otp()
    a = en_attente(b)
    attente = None
    if a is not None and (t - a.codes_envoyes_le).total_seconds() < o["dureeMinutes"] * 60:
        attente = {"operateur": a.operateur, "numeroMasque": a.destination, "envoyeA": ms(a.codes_envoyes_le)}
    tel = telephone_personnel(b)
    return {
        "actuel": {
            "operateur": court["operateur"],
            "masque": court["masque"],
            "verifieLe": b.numero_verifie_le.isoformat() if b.numero_verifie_le else "",
            "titulaire": services._titulaire(b),
        },
        "enRevue": en_revue,
        "operateurs": operateurs(),
        "indicatif": INDICATIF,
        "longueur": LONGUEUR,
        "telephonePersonnel": f"{tel[:1]}•• •• •• {tel[-2:]}" if tel else "",
        "revueJours": pv.revue_numero_jours,
        "code": {"longueur": o["longueur"], "renvoiSecondes": o["renvoiSecondes"], "dureeMinutes": o["dureeMinutes"]},
        "attente": attente,
    }


def _envoyer(objet: str, destination: str, user) -> int | None:
    """Envoie un code ; rend None, ou les secondes à attendre (429 trop_tot / trop_d_envois de l'OTP)."""
    from apps.otp.services import envoyer

    try:
        envoyer(objet=objet, destination=destination, utilisateur=user)
    except ErreurClient as e:
        if e.status_code == 429:
            return (e.data or {}).get("renvoiSecondes", 3600)
        raise
    return None


def demander_codes(b: Boutique, user, operateur: str, numero: str) -> dict:
    n = re.sub(r"\D", "", numero or "")
    if n.startswith("237") and len(n) == LONGUEUR + 3:
        n = n[3:]
    if len(n) != LONGUEUR:
        return {"ok": False, "raison": "longueur"}
    vrai = operateur_de(n)
    if vrai is None:
        return {"ok": False, "raison": "prefixe"}
    if vrai != operateur:
        return {"ok": False, "raison": "operateur", "detail": vrai}
    if b.numero_empreinte and empreinte(n) == b.numero_empreinte:
        return {"ok": False, "raison": "meme_numero"}
    tel = telephone_personnel(b)
    if not tel:
        return {"ok": False, "raison": "prefixe", "detail": "telephone_personnel"}
    t = horloge.maintenant()
    o = _otp()
    a = en_attente(b)
    if a is not None and a.numero_empreinte == empreinte(n) and (t - a.codes_envoyes_le).total_seconds() < o["renvoiSecondes"]:
        reste = o["renvoiSecondes"] - int((t - a.codes_envoyes_le).total_seconds())
        return {"ok": True, "destination": a.destination, "renvoiSecondes": reste}
    attendre = _envoyer(OBJET_NOUVEAU, n, user) or _envoyer(OBJET_PERSONNEL, tel, user)
    if attendre:
        return {"ok": False, "raison": "trop_tot", "detail": str(attendre)}
    ChangementNumero.objects.filter(boutique=b, valide_le__isnull=True, annule_le__isnull=True).update(annule_le=t)
    ch = ChangementNumero.objects.create(
        boutique=b,
        operateur=vrai,
        numero_chiffre=chiffrer(n),
        numero_empreinte=empreinte(n),
        masque=f"···· {n[-4:]}",
        destination=masquer_destination(n),
        codes_envoyes_le=t,
        renvoi_nouveau_le=t,
        renvoi_personnel_le=t,
    )
    return {"ok": True, "destination": ch.destination, "renvoiSecondes": o["renvoiSecondes"]}


def renvoyer(b: Boutique, user, quel: str) -> dict:
    a = en_attente(b)
    t = horloge.maintenant()
    o = _otp()
    if a is None or (t - a.codes_envoyes_le).total_seconds() >= o["dureeMinutes"] * 60:
        return {"ok": False, "raison": "expire"}
    dernier = a.renvoi_nouveau_le if quel == "nouveau" else a.renvoi_personnel_le
    if (t - dernier).total_seconds() < o["renvoiSecondes"]:
        return {"ok": False, "raison": "trop_tot"}
    n = dechiffrer(a.numero_chiffre)
    if _envoyer(OBJET_NOUVEAU if quel == "nouveau" else OBJET_PERSONNEL, n if quel == "nouveau" else telephone_personnel(b), user):
        return {"ok": False, "raison": "trop_tot"}
    if quel == "nouveau":
        a.renvoi_nouveau_le = t
    else:
        a.renvoi_personnel_le = t
    a.codes_envoyes_le = t
    a.save(update_fields=["renvoi_nouveau_le", "renvoi_personnel_le", "codes_envoyes_le"])
    return {"ok": True, "renvoiSecondes": o["renvoiSecondes"]}


def _refus(r: dict, raison: str) -> dict:
    if r.get("expire"):
        return {"ok": False, "raison": "expire"}
    if r.get("bloqueJusqua"):
        return {"ok": False, "raison": "bloque", "bloqueJusqua": r["bloqueJusqua"]}
    return {"ok": False, "raison": raison, "essaisRestants": r.get("essaisRestants", 0)}


def confirmer(b: Boutique, user, code_nouveau: str, code_personnel: str) -> dict:
    """Les deux codes justes : changement validé, revue humaine VD-NUM-REVUE jours (fin_de_revue) ; le versement prévu
    pendant la revue attend le vendredi qui la suit (Q-19)."""
    from apps.otp.services import verifier
    from belivay_moteurs.versements import fin_de_revue, vendredi_de_versement

    a = en_attente(b)
    if a is None:
        return {"ok": False, "raison": "expire"}
    n = dechiffrer(a.numero_chiffre)
    tel = telephone_personnel(b)
    r1 = verifier(objet=OBJET_NOUVEAU, code=code_nouveau, destination=n, utilisateur=user, consommer=False)
    if not r1.get("ok"):
        return _refus(r1, "code_nouveau")
    r2 = verifier(objet=OBJET_PERSONNEL, code=code_personnel, destination=tel, utilisateur=user)
    if not r2.get("ok"):
        return _refus(r2, "code_personnel")
    verifier(objet=OBJET_NOUVEAU, code=code_nouveau, destination=n, utilisateur=user)  # consommé maintenant
    t = horloge.maintenant()
    pv = parametres.versements()
    court = socle.numero_court(b) or {"operateur": b.numero_operateur, "masque": ""}
    ChangementNumero.objects.filter(boutique=b, valide_le__isnull=False, applique_le__isnull=True, annule_le__isnull=True).update(
        annule_le=t
    )
    a.valide_le, a.revue_jusqua = t, fin_de_revue(t, pv)
    a.ancien_operateur, a.ancien_masque = court["operateur"], court["masque"]
    a.save(update_fields=["valide_le", "revue_jusqua", "ancien_operateur", "ancien_masque"])
    premier = vendredi_de_versement(a.revue_jusqua, pv)
    socle.notifier(
        b,
        "versement",
        "Numéro de versement en revue",
        f"{a.operateur} {a.masque} : vérifié par BelivaY jusqu'au {services.jour_y(a.revue_jusqua).isoformat()} ; premier versement le {premier.isoformat()}.",
        "versements/numero",
        urgent=True,
        argent=True,
    )
    return {"ok": True, "revueJusqua": ms(a.revue_jusqua), "premierVersement": premier.isoformat()}


def annuler(b: Boutique) -> None:
    ChangementNumero.objects.filter(boutique=b, valide_le__isnull=True, annule_le__isnull=True).update(annule_le=horloge.maintenant())
