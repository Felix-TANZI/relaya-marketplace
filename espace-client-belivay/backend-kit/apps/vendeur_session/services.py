# backend/apps/vendeur_session/services.py
# Session de l'espace vendeur et connexion (VD-03, VD-04 ; CNX-01 à 07, VD03-R01 à R05 ; DP-57 S-1, S-3).
#
#   session_de(user)        — SessionVendeur : membre, propriétaire, boutique (état, palier, score exact, plan,
#                             découverte), badges (notifications non lues, commandes à préparer, messages), argent gelé.
#   connecter(...)          — identifiant « @Penga12 », e-mail ou numéro + mot de passe ; jamais d'erreur technique
#                             (VD03-R03) ; 5 faux → 15 minutes et le propriétaire est prévenu (CNX-03) ; appareil inconnu →
#                             code SMS au numéro du compte (CNX-01) ; réussite → jetons simplejwt (mêmes que le client).
#   second facteur, connexion par numéro + code, mot de passe oublié (lien 15 min, VD03-R04), appareil oublié,
#   Face ID ou empreinte (préférence par compte, DP-57 S-1).
import re
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.client_core import parametres as reg
from apps.client_core.chiffrement import dechiffrer, empreinte
from apps.client_core.masquage import numero_local
from apps.client_core.temps import ms
from apps.vendeur_core import horloge, parametres
from apps.vendeur_core import services as socle
from apps.vendeur_core.acces import membre_de
from apps.vendeur_core.models import Boutique, CommandeVendeur, Membre, NotificationVendeur

from . import codes
from .models import AppareilVendeur, DefiVendeur, DossierOuverture, PreferenceBiometrie, TentativesConnexion

# Lieu de la demande montré au second facteur : le serveur n'a pas encore de géolocalisation par adresse IP.
LIEU_PAR_DEFAUT = "Yaoundé"
# Adresse de l'espace vendeur (lien envoyé par SMS ou e-mail).
URL_VENDEUR = "https://vendeur.belivay.com"


# ── Appareils ─────────────────────────────────────────────────────────────────────────────────────────


def appareil_de(request) -> str:
    """Empreinte de l'appareil : champ `appareil` du corps ou de l'adresse, sinon en-tête X-Device-Id ; « » sinon."""
    brut = ""
    try:
        brut = str(request.data.get("appareil") or "") if hasattr(request.data, "get") else ""
    except Exception:  # pragma: no cover - corps illisible
        brut = ""
    brut = brut or request.query_params.get("appareil", "") or request.headers.get("X-Device-Id", "")
    brut = brut.strip()[:100]
    return empreinte(f"appareil:{brut}") if brut else ""


def nom_appareil(ua: str) -> str:
    """« iPhone · Safari » d'après l'agent utilisateur (même lecture que la démonstration)."""
    ua = ua or ""
    sys_ = (
        "iPhone"
        if re.search(r"iPhone|iPad", ua)
        else "Android"
        if "Android" in ua
        else "Mac"
        if "Mac" in ua
        else "Windows"
        if "Windows" in ua
        else "Ordinateur"
    )
    nav = (
        "Edge"
        if "Edg/" in ua
        else "Firefox"
        if "Firefox/" in ua
        else "Chrome"
        if "Chrome/" in ua
        else "Safari"
        if "Safari/" in ua
        else "Navigateur"
    )
    return f"{sys_} · {nav}"


def reconnaitre(user, appareil: str, ua: str = "") -> None:
    if not appareil:
        return
    t = horloge.maintenant()
    AppareilVendeur.objects.update_or_create(
        user=user, empreinte=appareil, defaults={"nom": nom_appareil(ua), "reconnu_le": t, "vu_le": t, "oublie_le": None}
    )
    # Appareils de la boutique (Sécurité, VD-11 : apps.vendeur_boutique), listés et révocables par le membre.
    try:
        from apps.vendeur_boutique.services import enregistrer_appareil
    except ImportError:  # pragma: no cover - application boutique absente
        return
    for m in Membre.objects.filter(user=user, actif=True):
        enregistrer_appareil(m, appareil, nom_appareil(ua), LIEU_PAR_DEFAUT)


def appareil_reconnu(user, appareil: str) -> bool:
    """Reconnu : validé par un second facteur (ou un code), ou première connexion du compte (aucun appareil connu)."""
    connus = AppareilVendeur.objects.filter(user=user)
    if not connus.exists():
        return True
    if not appareil or not connus.filter(empreinte=appareil, oublie_le__isnull=True).exists():
        return False
    try:
        from apps.vendeur_boutique.services import appareil_revoque
    except ImportError:  # pragma: no cover - application boutique absente
        return True
    # Un appareil déconnecté dans « Sécurité » redemande le second facteur.
    return not any(appareil_revoque(m, appareil) for m in Membre.objects.filter(user=user, actif=True))


def oublier_appareil(user, appareil: str) -> None:
    AppareilVendeur.objects.filter(user=user, empreinte=appareil).update(oublie_le=horloge.maintenant())


def jetons(user) -> dict:
    """Jetons simplejwt de relaya (les mêmes que l'espace client) : {access, refresh}."""
    from django.contrib.auth.models import update_last_login
    from rest_framework_simplejwt.tokens import RefreshToken

    r = RefreshToken.for_user(user)
    update_last_login(None, user)
    return {"access": str(r.access_token), "refresh": str(r)}


# ── Session ───────────────────────────────────────────────────────────────────────────────────────────


def _non_connecte() -> dict:
    return {
        "connecte": False,
        "membre": None,
        "proprietaire": None,
        "boutique": None,
        "badges": {"notifications": 0, "commandes": 0, "messages": 0},
        "argentGele": False,
        "maintenant": horloge.maintenant_ms(),
    }


def membre_json(m: Membre) -> dict:
    from apps.vendeur_core.droits import droits_de, profil_du_membre

    return {
        "id": str(m.pk),
        "prenom": m.prenom,
        "nom": m.nom,
        "initiales": m.initiales,
        "role": m.role,
        "droits": droits_de(m),
        "profil": profil_du_membre(m),
    }


def boutique_json(b: Boutique) -> dict:
    d = socle.decouverte(b)
    return {
        "nom": b.nom,
        "etat": socle.etat_boutique(b),
        "fermeA": socle.ferme_a(b),
        "palier": b.palier,
        "trustScore": float(b.trust_score),
        "plan": b.plan,
        "decouverte": {"active": d["active"], "fin": d["fin"], "commandes": d["commandes"]},
    }


def notifications_non_lues(m: Membre) -> int:
    qs = NotificationVendeur.objects.filter(boutique=m.boutique).exclude(lue_par=m)
    if not m.proprietaire:
        qs = qs.filter(argent=False)  # notifications d'argent masquées pour l'accès Préparation
    return qs.count()


def commandes_a_preparer(b: Boutique) -> int:
    socle.synchroniser(b)
    return CommandeVendeur.objects.filter(boutique=b, prete_a__isnull=True, annulee_a__isnull=True).count()


def messages_non_lus(b: Boutique) -> int:
    try:
        from apps.vendeur_boutique.services import messages_non_lus as lire
    except ImportError:
        return 0
    return int(lire(b))


def argent_gele(b: Boutique) -> bool:
    """Point rouge de l'onglet Argent : une commande gelée (litige, retour, recours ; vendeur_core.faits)."""
    from apps.vendeur_core.faits import faits

    t = horloge.maintenant()
    return any(faits(c, t).gel for c in CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True))


def session_de(user) -> dict:
    """SessionVendeur ; un compte sans boutique mais avec un dossier d'ouverture : connecté, boutique null."""
    if user is None or not user.is_authenticated:
        return _non_connecte()
    m = membre_de(user)
    if m is None:
        s = _non_connecte()
        s["connecte"] = DossierOuverture.objects.filter(user=user).exists()
        return s
    b = m.boutique
    proprio = b.membres.filter(role=Membre.Role.PROPRIETAIRE, actif=True).first()
    return {
        "connecte": True,
        "membre": membre_json(m),
        "proprietaire": {"prenom": proprio.prenom, "nom": proprio.nom} if proprio else None,
        "boutique": boutique_json(b),
        "badges": {"notifications": notifications_non_lues(m), "commandes": commandes_a_preparer(b), "messages": messages_non_lus(b)},
        "argentGele": m.proprietaire and argent_gele(b),
        "maintenant": horloge.maintenant_ms(),
    }


# ── Comptes ───────────────────────────────────────────────────────────────────────────────────────────


def _membre_par_numero(n: str) -> Membre | None:
    for m in Membre.objects.select_related("user").filter(actif=True, telephone__endswith=n[-8:]).exclude(telephone=""):
        if numero_local(m.telephone) == n and m.user_id:
            return m
    return None


def _a_un_espace(user) -> bool:
    return membre_de(user) is not None or DossierOuverture.objects.filter(user=user).exists()


def trouver_compte(identifiant: str):
    """Le compte vendeur d'un identifiant (« @Penga12 »), d'un e-mail ou d'un numéro ; None sinon (jamais dit à l'écran)."""
    s = (identifiant or "").strip()
    if not s:
        return None
    User = get_user_model()
    n = codes.numero_valide(s) if re.fullmatch(r"[\d\s+().-]+", s) else None
    if n:
        m = _membre_par_numero(n)
        if m is not None:
            return m.user
        d = DossierOuverture.objects.filter(telephone_empreinte=empreinte(n), user__isnull=False, numero_verifie_le__isnull=False).first()
        return d.user if d else None
    if "@" in s[1:]:
        for u in User.objects.filter(email__iexact=s, is_active=True):
            if _a_un_espace(u):
                return u
        return None
    b = Boutique.objects.filter(identifiant__iexact="@" + s.lstrip("@")).select_related("proprietaire").first()
    return b.proprietaire if b is not None else None


def numero_du_compte(user) -> str | None:
    """Numéro qui reçoit le second facteur : celui du membre, sinon celui du dossier, sinon celui du compte client."""
    for m in Membre.objects.filter(user=user, actif=True).order_by("-role"):
        n = codes.numero_valide(m.telephone)
        if n:
            return n
    d = DossierOuverture.objects.filter(user=user, numero_verifie_le__isnull=False).first()
    if d is not None and d.telephone_chiffre:
        return dechiffrer(d.telephone_chiffre)
    from apps.client_accounts.services import numero_verifie

    return numero_verifie(user)


def identifiant_du_compte(user) -> str:
    b = Boutique.objects.filter(proprietaire=user).first()
    return b.identifiant if b is not None else (user.email or user.get_username())


# ── Connexion ─────────────────────────────────────────────────────────────────────────────────────────


def _regles_mdp() -> tuple[int, int]:
    essais, attente = reg.nombres("MDP-ESSAIS")[:2]
    return essais, attente


def _prevenir_blocage(user, ua: str) -> None:
    """CNX-03 : le propriétaire de la boutique est prévenu (centre de notifications, urgent, sans montant)."""
    essais, attente = _regles_mdp()
    for m in Membre.objects.filter(user=user, actif=True).select_related("boutique"):
        # Type « securite » (TypeNotification du site), urgent.
        socle.notifier(
            m.boutique,
            "securite",
            f"Connexion bloquée {attente} min",
            f"{essais} mots de passe faux depuis {nom_appareil(ua)} ({m.prenom}).",
            "securite",
            urgent=True,
        )


def ouvrir(user, appareil: str, ua: str, se_souvenir: bool) -> dict:
    reconnaitre(user, appareil, ua)
    return {"ok": True, "session": session_de(user), "jetons": jetons(user), "seSouvenir": se_souvenir}


def defi_connexion(d: DefiVendeur) -> dict:
    return {**codes.envoi(d), "appareil": {"nom": d.appareil_nom, "lieu": d.lieu}, "demandeA": ms(d.demande_a)}


def apres_identification(user, appareil: str, ua: str, se_souvenir: bool) -> dict:
    """Appareil reconnu : la session s'ouvre ; sinon le code part par SMS au numéro du compte (CNX-01, V14)."""
    n = numero_du_compte(user)
    if appareil_reconnu(user, appareil) or n is None:
        return ouvrir(user, appareil, ua, se_souvenir)
    d, refus = codes.creer(
        DefiVendeur.Objet.DEUX_FACTEURS,
        n,
        user=user,
        appareil=appareil,
        appareil_nom=nom_appareil(ua),
        lieu=LIEU_PAR_DEFAUT,
        se_souvenir=se_souvenir,
    )
    if d is None:  # plus aucun envoi dans l'heure : le dernier défi (son code vaut encore) reste montré
        d = codes.en_cours(DefiVendeur.Objet.DEUX_FACTEURS, user=user, appareil=appareil) or codes.en_cours(
            DefiVendeur.Objet.DEUX_FACTEURS, user=user
        )
        if d is not None and d.appareil != appareil:
            # Le code déjà parti au numéro du compte vaut pour l'appareil qui le demande maintenant.
            d.appareil = appareil
            d.save(update_fields=["appareil"])
        d = d or DefiVendeur.objects.filter(objet="2fa", user=user).first()
    return {"ok": False, "raison": "deuxieme_facteur", "defi": defi_connexion(d)}


def connecter(identifiant: str, mot_de_passe: str, *, appareil: str, ua: str = "", se_souvenir: bool = True) -> dict:
    """ResultatConnexion (+ jetons à la réussite)."""
    user = trouver_compte(identifiant)
    cle = f"u:{user.pk}" if user is not None else "i:" + empreinte((identifiant or "").strip().lower())
    essais, attente = _regles_mdp()
    t = horloge.maintenant()
    with transaction.atomic():
        tent, _ = TentativesConnexion.objects.select_for_update().get_or_create(cle=cle)
        if tent.bloque_jusqua and tent.bloque_jusqua > t:
            return {"ok": False, "raison": "bloque", "jusqua": ms(tent.bloque_jusqua)}
        if user is None or not user.is_active or not user.check_password(mot_de_passe or ""):
            tent.echecs += 1
            if tent.echecs >= essais:
                tent.echecs, tent.bloque_jusqua = 0, t + timedelta(minutes=attente)
                tent.save()
                if user is not None:
                    _prevenir_blocage(user, ua)
                return {"ok": False, "raison": "bloque", "jusqua": ms(tent.bloque_jusqua)}
            tent.save()
            return {"ok": False, "raison": "identifiants", "essaisRestants": essais - tent.echecs}
        tent.echecs, tent.bloque_jusqua = 0, None
        tent.save()
    return apres_identification(user, appareil, ua, se_souvenir)


def valider_deuxieme_facteur(appareil: str, code: str, defi_id: str = "", ua: str = "") -> dict:
    filtre = {"public_id": defi_id} if defi_id else {}
    d = codes.en_cours(DefiVendeur.Objet.DEUX_FACTEURS, appareil=appareil, **filtre) if appareil else None
    r = codes.verifier(d, code)
    if not r["ok"]:
        return r
    return ouvrir(d.user, appareil, ua, d.se_souvenir)


def defi_en_cours(appareil: str) -> dict | None:
    d = codes.en_cours(DefiVendeur.Objet.DEUX_FACTEURS, appareil=appareil) if appareil else None
    return defi_connexion(d) if d is not None else None


def renvoyer_deuxieme_facteur(appareil: str) -> dict:
    d = codes.en_cours(DefiVendeur.Objet.DEUX_FACTEURS, appareil=appareil) if appareil else None
    if d is None:
        _, entre, _ = codes._regles()
        return {"ok": False, "raison": "trop_tot", "secondes": entre}
    return codes.renvoyer(d)


# ── Connexion par numéro et code (WhatsApp ou SMS) ────────────────────────────────────────────────────


def demander_code_numero(telephone: str, canal: str, *, appareil: str, ua: str = "", se_souvenir: bool = True) -> dict:
    """ResultatCodeNumero : numéro mal formé, numéro sans compte vendeur (« inconnu »), limite d'envois, ou code parti."""
    n = codes.numero_valide(telephone)
    if n is None:
        return {"ok": False, "raison": "numero"}
    m = _membre_par_numero(n)
    if m is None:
        return {"ok": False, "raison": "inconnu"}
    if not appareil:
        raise codes.appareil_absent()
    canal = canal if canal in ("sms", "whatsapp") else "sms"
    d, refus = codes.creer(
        DefiVendeur.Objet.NUMERO, n, canal=canal, user=m.user, appareil=appareil, appareil_nom=nom_appareil(ua), se_souvenir=se_souvenir
    )
    if d is None:
        return refus
    return {"ok": True, "envoi": codes.envoi(d)}


def envoi_numero(appareil: str) -> dict | None:
    d = codes.en_cours(DefiVendeur.Objet.NUMERO, appareil=appareil) if appareil else None
    return codes.envoi(d) if d is not None else None


def valider_code_numero(appareil: str, code: str, ua: str = "") -> dict:
    d = codes.en_cours(DefiVendeur.Objet.NUMERO, appareil=appareil) if appareil else None
    r = codes.verifier(d, code)
    if not r["ok"]:
        return r
    return ouvrir(d.user, appareil, ua, d.se_souvenir)  # le code au numéro du membre vaut second facteur


def renvoyer_code_numero(appareil: str, canal: str) -> dict:
    d = codes.en_cours(DefiVendeur.Objet.NUMERO, appareil=appareil) if appareil else None
    if d is None:
        _, entre, _ = codes._regles()
        return {"ok": False, "raison": "trop_tot", "secondes": entre}
    return codes.renvoyer(d, canal)


# ── Mot de passe oublié (VD03-R04) ────────────────────────────────────────────────────────────────────


def lien_minutes() -> int:
    """Durée du lien « mot de passe oublié » du vendeur (VD-MDP-LIEN, CNX-04, DP-56 Q-22)."""
    return parametres.lien_mot_de_passe()


def _jeton_valable(jeton: str):
    from apps.otp.models import JetonMdp
    from apps.otp.services import _empreinte_jeton

    return (
        JetonMdp.objects.select_related("utilisateur")
        .filter(jeton_empreinte=_empreinte_jeton(str(jeton or "")), utilise_le__isnull=True, expire_le__gt=timezone.now())
        .first()
    )


def demander_lien(identifiant: str) -> dict:
    """La réponse est la même que le compte existe ou non ; le lien part par SMS au numéro du compte (et par e-mail)."""
    if not (identifiant or "").strip():
        return {"ok": False, "raison": "vide"}
    _, entre, _ = codes._regles()
    minutes = lien_minutes()
    user = trouver_compte(identifiant)
    if user is not None:
        from apps.otp.models import JetonMdp
        from apps.otp.prestataires import sms
        from apps.otp.services import creer_jeton_mdp

        jeton, _ = creer_jeton_mdp(user)
        dernier = JetonMdp.objects.filter(utilisateur=user, utilise_le__isnull=True).order_by("-cree_le").first()
        dernier.expire_le = timezone.now() + timedelta(minutes=minutes)
        dernier.save(update_fields=["expire_le"])
        lien = f"{getattr(settings, 'BELIVAY_URL_VENDEUR', URL_VENDEUR)}/connexion?s=nouveau&jeton={jeton}"
        texte = f"BelivaY Vendeur : pour choisir un nouveau mot de passe, ouvre ce lien (valable {minutes} min) : {lien}"
        n = numero_du_compte(user)
        if n:
            sms().envoyer(n, texte)
        if user.email:
            send_mail("Nouveau mot de passe BelivaY Vendeur", texte, None, [user.email])
    return {"ok": True, "lien": {"envoyeA": ms(timezone.now()), "valideMinutes": minutes, "renvoiSecondes": entre}}


def ouvrir_lien(jeton: str) -> dict:
    """Lien valable : un code SMS confirme que c'est le titulaire (VD03-R04) ; sinon « expire »."""
    j = _jeton_valable(jeton)
    if j is None:
        return {"ok": False, "raison": "expire"}
    user = j.utilisateur
    cle = j.jeton_empreinte
    d = codes.en_cours(DefiVendeur.Objet.MOT_DE_PASSE, jeton=cle)
    if d is None:
        n = numero_du_compte(user)
        if n is None:
            return {"ok": False, "raison": "expire"}
        d, refus = codes.creer(DefiVendeur.Objet.MOT_DE_PASSE, n, user=user, jeton=cle)
        if d is None:
            return {"ok": False, "raison": "expire"}
    return {"ok": True, "nouveau": {"envoi": codes.envoi(d), "identifiant": identifiant_du_compte(user)}}


def mot_de_passe_fort(mdp: str, user=None) -> bool:
    from apps.client_accounts.regles import mot_de_passe_ok

    if not mot_de_passe_ok(mdp or "", reg.registre().get("MDP-LONG", "8 caractères au moins, dont un chiffre")):
        return False
    try:
        password_validation.validate_password(mdp, user)
    except ValidationError:
        return False
    return True


def choisir_mot_de_passe(jeton: str, code: str, mdp: str) -> dict:
    j = _jeton_valable(jeton)
    if not mot_de_passe_fort(mdp, j.utilisateur if j else None):
        return {"ok": False, "raison": "faible"}
    if j is None:
        return {"ok": False, "raison": "expire"}
    d = codes.en_cours(DefiVendeur.Objet.MOT_DE_PASSE, jeton=j.jeton_empreinte)
    r = codes.verifier(d, code)
    if not r["ok"]:
        return r
    from apps.otp.services import consommer_jeton_mdp

    user = consommer_jeton_mdp(jeton)
    user.set_password(mdp)
    user.save(update_fields=["password"])
    TentativesConnexion.objects.filter(cle=f"u:{user.pk}").delete()
    return {"ok": True}


def deconnecter(refresh: str | None) -> dict:
    if refresh:
        try:
            from rest_framework_simplejwt.tokens import RefreshToken

            RefreshToken(refresh).blacklist()
        except Exception:  # jeton déjà invalide, ou liste noire absente : la session est fermée sur l'appareil
            pass
    return _non_connecte()


# ── Face ID ou empreinte (DP-57 S-1) ──────────────────────────────────────────────────────────────────


def biometrie(user) -> dict:
    p = PreferenceBiometrie.objects.filter(user=user).first()
    return {"proposee": bool(p and p.proposee), "active": bool(p and p.active)}


def regler_biometrie(user, active: bool) -> dict:
    PreferenceBiometrie.objects.update_or_create(
        user=user, defaults={"proposee": True, "active": bool(active), "modifiee_le": horloge.maintenant()}
    )
    return biometrie(user)


# ── Essai ─────────────────────────────────────────────────────────────────────────────────────────────


def dernier_lien_mdp(telephone: str) -> str | None:
    """ESSAI : le jeton du dernier lien « mot de passe oublié » envoyé à ce numéro (SMS console), pour ouvrir le lien
    dans un parcours de bout en bout (à brancher sur GET /api/_essai/vendeur/lien-mdp?destination=…)."""
    from apps.otp.prestataires import SmsConsole

    n = codes.numero_valide(telephone) or ""
    for e in reversed(SmsConsole.ENVOYES):
        if numero_local(e["numero"]) == n and "jeton=" in e["texte"]:
            return e["texte"].split("jeton=", 1)[1].split()[0]
    return None
