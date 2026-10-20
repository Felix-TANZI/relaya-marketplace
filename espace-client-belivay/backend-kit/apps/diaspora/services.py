# backend/apps/diaspora/services.py
# Diaspora et proches (DP-54) : inscription, liens famille, paniers envoyés entre proches, commande payée pour un
# proche. Règles pures : regles.py (contrôle de cohérence, plafonds, pays) et apps.wishlists.regles (règle commune des
# échanges : totalDiaspora, supplementAuProche).
#
# Ce que chacun voit : le compte diaspora voit le prénom du proche, le quartier de son relais et la ville s'il accepte
# la livraison chez lui ; jamais son numéro, son adresse, son code de retrait ni ses autres commandes. Le proche voit
# le prénom et le pays de celui qui paie.
#
# Fonctions exposées aux autres applications du kit :
#   est_diaspora(user) → bool ; compte(user) → CompteDiaspora | None
#   proches_lies(user) → [User] (liens actifs, des deux côtés ; apps.wishlists s'en sert pour les proches)
#   depenses_du_mois(user) → int (francs)
#   confirmer_paiement(reference) → bool : retour 3-D Secure (webhook du prestataire carte) d'une commande pour un proche

import re
import secrets
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status

from apps.client_core import parametres, pont
from apps.client_core.chiffrement import chiffrer, dechiffrer, empreinte
from apps.client_core.erreurs import ErreurClient, conflit, interdit, introuvable, refus
from apps.client_core.masquage import chiffres, numero_local
from apps.client_core.temps import aujourd_hui, maintenant_ms, ms
from apps.wishlists import commandes
from apps.wishlists import regles as rechanges

from . import regles
from .models import CodeFamille, CommandeDiaspora, CompteDiaspora, DemandeProche, Invitation, LienFamille

LETTRES_CODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # sans 0, O, 1, I, L (lus à voix haute ou recopiés)
OUVERTS = (LienFamille.Etat.ACTIF, LienFamille.Etat.INVITE)


# ── Compte ─────────────────────────────────────────────────────────────────────────────────────────────


def compte(user) -> CompteDiaspora | None:
    if user is None or not user.is_authenticated:
        return None
    return CompteDiaspora.objects.filter(client=user).first()


def est_diaspora(user) -> bool:
    return compte(user) is not None


def _mot_de_passe_ok(mdp: str) -> bool:
    regle = parametres.registre().get("MDP-LONG", "8 caractères au moins")
    try:
        from apps.client_accounts.regles import mot_de_passe_ok
    except ImportError:
        return len(mdp or "") >= 8
    return mot_de_passe_ok(mdp, regle)


def session(user, request=None) -> dict:
    """Session du site (source.ts Session) d'un compte diaspora : client_accounts.services.session si elle existe."""
    s = commandes.appeler("apps.client_accounts.services", "session", user, request)
    c = compte(user)
    if s is not None:
        if c is None:
            return s
        return {**s, "typeCompte": "diaspora", "devise": c.devise, "proche": proche_actif(user)}

    client = commandes.appeler("apps.client_accounts.services", "client", user, request) or {
        "prenom": user.first_name,
        "nom": user.last_name,
        "nomComplet": f"{user.first_name} {user.last_name}".strip(),
        "numeroMasque": "",
        "operateur": "",
        "email": user.email,
        "emailMasque": "",
        "connexion": "email",
        "portrait": {},
        "photo": None,
    }
    if c is not None:
        client = {**client, "numeroMasque": c.numero_masque, "operateur": ""}
    return {
        **_session_de_base(client),
        "typeCompte": "diaspora" if c is not None else "standard",
        "devise": c.devise if c is not None else "XAF",
        **({"proche": proche_actif(user)} if c is not None else {}),
    }


def _session_de_base(client: dict) -> dict:
    from apps.client_core.interrupteurs import etat

    return {
        "connecte": True,
        "client": client,
        "relais": None,
        "badges": {"panier": 0, "nonLus": 0, "compte": 0},
        "interrupteurs": etat(),
        "reperesPrototype": False,
        "bandeau": {"quartiersExploites": len(parametres.geo().zones), "seuilRetraitOffert": parametres.livraison().seuil_relais},
    }


def inscrire(d: dict, request=None) -> dict:
    """inscrireDiaspora : majeur, pays accepté (jamais le Cameroun) avec son indicatif, numéro de ce pays ; puis les
    deux codes (SMS au numéro étranger, e-mail), objet « diaspora » ; 422 code, codeEmail, age, pays, numero."""
    from apps.otp.services import verifier

    try:
        naissance = date.fromisoformat(d["naissance"])
    except ValueError:
        naissance = None
    age = regles.age_le(naissance, aujourd_hui()) if naissance else -1
    if not regles.AGE_DIASPORA <= age <= 120:
        raise refus("age", "Il faut être majeur pour ouvrir un compte diaspora.")
    if d["pays"] == regles.CAMEROUN or not regles.pays_accepte(d["pays"], d["indicatif"]):
        raise refus("pays", "Ce pays n'est pas accepté pour un compte diaspora.")
    if not regles.numero_etranger_valide(d["numero"]):
        raise refus("numero", "Numéro de téléphone invalide pour ce pays.")
    prenom, nom, email = d["prenom"].strip(), d["nom"].strip(), d["email"].strip().lower()
    if not prenom:
        return {"ok": False, "raison": "prenom"}
    if not _mot_de_passe_ok(d["motDePasse"]):
        return {"ok": False, "raison": "mdp"}
    User = get_user_model()
    if User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).exists():
        return {"ok": False, "raison": "existe"}
    numero = chiffres(d["indicatif"] + d["numero"])
    r = verifier(objet="diaspora", code=d["code"], destination=numero)
    if not r.get("ok"):
        raise refus("code", "Le code reçu par SMS n'est pas le bon.", {k: v for k, v in r.items() if k != "ok"})
    r = verifier(objet="diaspora", code=d["codeEmail"], destination=email)
    if not r.get("ok"):
        raise refus("codeEmail", "Le code reçu par e-mail n'est pas le bon.", {k: v for k, v in r.items() if k != "ok"})
    local = chiffres(d["numero"])
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=email, email=email, password=d["motDePasse"], first_name=prenom[:150], last_name=nom[:150]
            )
            CompteDiaspora.objects.create(
                client=user,
                pays=d["pays"],
                ville=d["ville"].strip()[:80],
                indicatif=d["indicatif"],
                numero_chiffre=chiffrer(numero),
                numero_empreinte=empreinte(numero),
                numero_masque=f"{d['indicatif']} {local[:2]} ·· ·· {local[-2:]}",
                naissance=naissance,
            )
            profil = commandes.appeler("apps.client_accounts.services", "profil", user)
            if profil is not None and hasattr(profil, "type_compte"):
                profil.type_compte = "diaspora"
                profil.save(update_fields=["type_compte"])
    except IntegrityError:
        return {"ok": False, "raison": "existe"}
    from rest_framework_simplejwt.tokens import RefreshToken

    jeton = RefreshToken.for_user(user)
    return {"ok": True, "session": session(user, request), "access": str(jeton.access_token), "refresh": str(jeton)}


def _identite(fournisseur: str, jeton: str) -> dict:
    """Jeton Google ou Apple vérifié par apps.client_accounts (comme les connexions de relaya) ; 422 jeton."""
    try:
        from apps.client_accounts.services import FournisseurIndisponible, JetonInvalide, verifier_jeton_identite
    except ImportError:
        raise ErreurClient(status.HTTP_501_NOT_IMPLEMENTED, "a_finir", "Connexion Google et Apple indisponible.") from None
    try:
        return verifier_jeton_identite(fournisseur, jeton)
    except JetonInvalide:
        raise refus("jeton", "La connexion avec ce compte a échoué. Réessaie.") from None
    except FournisseurIndisponible:
        raise ErreurClient(
            status.HTTP_503_SERVICE_UNAVAILABLE, "fournisseur_indisponible", "Connexion indisponible pour le moment."
        ) from None


def identite_fournisseur(fournisseur: str, jeton: str) -> dict:
    """identiteFournisseur : prénom, nom, e-mail (déjà vérifié par Google ou Apple) et le compte BelivaY qui porte
    déjà cette adresse (aucun, standard, diaspora). Ne crée rien ; le jeton est rendu pour l'inscription."""
    i = _identite(fournisseur, jeton)
    User = get_user_model()
    u = User.objects.filter(Q(email__iexact=i["email"]) | Q(username__iexact=i["email"])).first() if i["email"] else None
    return {
        "jeton": jeton,
        "prenom": i.get("prenom", ""),
        "nom": i.get("nom", ""),
        "email": i["email"],
        "compte": None if u is None else ("diaspora" if est_diaspora(u) else "standard"),
    }


def _controles_communs(d: dict):
    """Âge, pays accepté avec son indicatif, numéro étranger ; puis le code SMS (consommé). → (naissance, numéro)."""
    from apps.otp.services import verifier

    try:
        naissance = date.fromisoformat(d["naissance"])
    except ValueError:
        naissance = None
    age = regles.age_le(naissance, aujourd_hui()) if naissance else -1
    if not regles.AGE_DIASPORA <= age <= 120:
        raise refus("age", "Il faut être majeur pour ouvrir un compte diaspora.")
    if d["pays"] == regles.CAMEROUN or not regles.pays_accepte(d["pays"], d["indicatif"]):
        raise refus("pays", "Ce pays n'est pas accepté pour un compte diaspora.")
    if not regles.numero_etranger_valide(d["numero"]):
        raise refus("numero", "Numéro de téléphone invalide pour ce pays.")
    numero = chiffres(d["indicatif"] + d["numero"])
    r = verifier(objet="diaspora", code=d["code"], destination=numero)
    if not r.get("ok"):
        raise refus("code", "Le code reçu par SMS n'est pas le bon.", {k: v for k, v in r.items() if k != "ok"})
    return naissance, numero


def _ouvrir_compte(user, d: dict, naissance, numero: str) -> None:
    local = chiffres(d["numero"])
    CompteDiaspora.objects.create(
        client=user,
        pays=d["pays"],
        ville=d["ville"].strip()[:80],
        indicatif=d["indicatif"],
        numero_chiffre=chiffrer(numero),
        numero_empreinte=empreinte(numero),
        numero_masque=f"{d['indicatif']} {local[:2]} ·· ·· {local[-2:]}",
        naissance=naissance,
    )
    profil = commandes.appeler("apps.client_accounts.services", "profil", user)
    if profil is not None and hasattr(profil, "type_compte"):
        profil.type_compte = "diaspora"
        profil.save(update_fields=["type_compte"])


def _jetons(user, request) -> dict:
    from rest_framework_simplejwt.tokens import RefreshToken

    jeton = RefreshToken.for_user(user)
    return {"ok": True, "session": session(user, request), "access": str(jeton.access_token), "refresh": str(jeton)}


def inscrire_social(d: dict, request=None) -> dict:
    """inscrireDiaspora avec Google, Apple (e-mail repris du jeton, déjà vérifié ; ni mot de passe ni code e-mail ;
    convertir=true passe le compte existant de cette adresse en diaspora) ou le numéro seul (e-mail facultatif, sans
    mot de passe : connexion par code SMS). 422 jeton, code, age, pays, numero ; refus existe, prenom, email (200)."""
    fournisseur = d["fournisseur"]
    User = get_user_model()
    identite = _identite(fournisseur, d.get("jeton") or "") if fournisseur in ("google", "apple") else None
    email = (identite["email"] if identite else (d.get("email") or "")).strip().lower()
    prenom, nom = d["prenom"].strip(), d["nom"].strip()
    if not prenom:
        return {"ok": False, "raison": "prenom"}
    if email and "@" not in email:
        return {"ok": False, "raison": "email"}
    existant = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first() if email else None
    if existant is not None and (not d.get("convertir") or identite is None or est_diaspora(existant)):
        return {"ok": False, "raison": "existe"}
    naissance, numero = _controles_communs(d)
    if CompteDiaspora.objects.filter(numero_empreinte=empreinte(numero)).exists():
        return {"ok": False, "raison": "existe"}
    try:
        with transaction.atomic():
            if existant is not None:
                user = existant
            else:
                username = email or f"diaspora-{empreinte(numero)[:16]}"
                user = User.objects.create_user(username=username, email=email, first_name=prenom[:150], last_name=nom[:150])
                user.set_unusable_password()
                user.save(update_fields=["password"])
            _ouvrir_compte(user, d, naissance, numero)
            if identite is not None:
                commandes.appeler("apps.client_accounts.services", "lier_methode", user, fournisseur, d.get("jeton") or "")
    except IntegrityError:
        return {"ok": False, "raison": "existe"}
    return _jetons(user, request)


# ── Proche actif (« Pour qui ? ») ──────────────────────────────────────────────────────────────────────


def _liens_actifs(user):
    return LienFamille.objects.filter(diaspora=user, etat=LienFamille.Etat.ACTIF).select_related("proche").order_by("-id")


def proche_actif(user) -> dict | None:
    """Session.proche d'un compte diaspora : le proche choisi (sinon le dernier relié) ; prénom, quartier de son
    relais, ville s'il accepte la livraison chez lui ; jamais son adresse ni son code. None : aucun proche relié."""
    c = compte(user)
    liens = list(_liens_actifs(user))
    if c is None or not liens:
        return None
    lien = next((x for x in liens if x.pk == c.proche_actif_id), liens[0])
    relais = pont.relais(lien.relay_id) if lien.relay_id else None
    domicile = bool(lien.domicile and lien.proche is not None)
    return {
        "id": str(lien.pk),
        "prenom": (lien.proche.first_name if lien.proche else "") or lien.prenom_invite,
        "quartier": relais.quartier if relais else None,
        "ville": commandes.ville_domicile(lien.proche) if domicile else None,
        "domicile": domicile,
        "autres": len(liens) - 1,
    }


def choisir_proche(user, id_) -> dict:
    """choisirProche : 403 hors compte diaspora ; 404 lien non actif."""
    c = compte(user)
    if c is None:
        raise interdit("hors", "Le choix d'un proche se fait sur un compte diaspora.")
    try:
        pk = int(str(id_).removeprefix("LF-"))
    except ValueError:
        pk = 0
    lien = _liens_actifs(user).filter(pk=pk).first()
    if lien is None:
        raise introuvable("Ce proche n'est pas relié.", code="lien")
    c.proche_actif = lien
    c.save(update_fields=["proche_actif"])
    return {"ok": True}


def regler_devise(user, devise: str) -> dict:
    c = compte(user)
    if c is None:
        return {"ok": False}
    c.devise = devise
    c.save(update_fields=["devise"])
    profil = commandes.appeler("apps.client_accounts.services", "profil", user)
    if profil is not None and hasattr(profil, "devise"):
        profil.devise = devise
        profil.save(update_fields=["devise"])
    return {"ok": True}


# ── Liens famille ──────────────────────────────────────────────────────────────────────────────────────


def _mes_liens(user):
    """Les liens où je suis l'un ou l'autre ; côté Cameroun, aussi les invitations faites à mon numéro vérifié."""
    q = Q(diaspora=user) | Q(proche=user)
    numero = commandes.appeler("apps.client_accounts.services", "numero_verifie", user)
    if numero:
        q |= Q(proche__isnull=True, numero_empreinte=empreinte(numero_local(numero)), etat=LienFamille.Etat.INVITE)
    return LienFamille.objects.filter(q)


def _lien(user, id_) -> LienFamille:
    try:
        return _mes_liens(user).select_related("diaspora", "proche").get(pk=int(str(id_).removeprefix("LF-")))
    except (ValueError, LienFamille.DoesNotExist):
        raise introuvable("Lien introuvable.") from None


def _ouverts(user) -> int:
    return LienFamille.objects.filter(Q(diaspora=user) | Q(proche=user), etat__in=OUVERTS).count()


def proches_lies(user) -> list:
    sortie = []
    for lien in LienFamille.objects.filter(Q(diaspora=user) | Q(proche=user), etat=LienFamille.Etat.ACTIF).select_related(
        "diaspora", "proche"
    ):
        autre = lien.proche if lien.diaspora_id == user.pk else lien.diaspora
        if autre is not None:
            sortie.append(autre)
    return sortie


def depenses_du_mois(user) -> int:
    from apps.wishlists.services import debut_mois

    return (
        CommandeDiaspora.objects.filter(payeur=user, cree_le__gte=debut_mois(), etat_paiement=CommandeDiaspora.Paiement.PAYE).aggregate(
            n=Sum("montant")
        )["n"]
        or 0
    )


def commande_dict(c: CommandeDiaspora) -> dict:
    s = commandes.suivi(c.order_id)
    return {
        "ref": c.ref,
        "le": ms(c.cree_le),
        "montant": c.montant,
        "devise": c.devise,
        "enDevise": float(c.en_devise) if c.en_devise is not None else None,
        "carte": c.carte,
        "articles": c.articles,
        "mot": c.mot,
        "pretLe": ms(s["arriveLe"]),
        "retireLe": ms(s["remisLe"]),
        "rembourse": c.rembourse if c.rembourse is not None else s["rembourse"],
        "livraison": c.livraison,
        "moyen": c.moyen,
        "demande": str(c.demande_id) if c.demande_id else None,
        "aLaRemise": c.a_la_remise,
    }


def lien_dict(lien: LienFamille, user) -> dict:
    relais = pont.relais(lien.relay_id) if lien.relay_id else None
    if lien.diaspora_id == user.pk:
        d = {
            "id": str(lien.pk),
            "sens": "diaspora",
            "prenom": (lien.proche.first_name if lien.proche else "") or lien.prenom_invite,
            "pays": None,
            "relais": relais.quartier if relais else None,  # le quartier seulement
            "commandes": [commande_dict(c) for c in lien.commandes.all()],
        }
    else:
        c = compte(lien.diaspora)
        d = {
            "id": str(lien.pk),
            "sens": "cameroun",
            "prenom": lien.diaspora.first_name,
            "pays": c.pays if c else None,
            "relais": relais.nom if relais else None,
            "commandes": [],
        }
    domicile = lien.domicile and lien.proche is not None
    return {
        **d,
        "etat": lien.etat,
        "le": ms(lien.cree_le),
        "domicile": domicile,
        "prefere": lien.prefere if domicile else "relais",
        "ville": commandes.ville_domicile(lien.proche) if domicile else None,
    }


def liens_famille(user) -> dict:
    c = compte(user)
    code = CodeFamille.objects.filter(client=user, utilise_le__isnull=True, jusqua__gt=timezone.now()).order_by("-id").first()
    return {
        "compte": {"pays": c.pays, "ville": c.ville, "indicatif": c.indicatif, "numeroMasque": c.numero_masque} if c else None,
        "liens": [lien_dict(x, user) for x in _mes_liens(user).select_related("diaspora", "proche").order_by("-id")],
        "code": {"code": code.code, "jusqua": ms(code.jusqua)} if code else None,
        "depensesMois": depenses_du_mois(user) if c else 0,
        "maintenant": maintenant_ms(),
    }


def _code(prefixe: str, modele) -> str:
    while True:
        code = prefixe + "".join(secrets.choice(LETTRES_CODE) for _ in range(4))
        if not modele.objects.filter(code=code).exists():
            return code


def creer_code_famille(user) -> dict:
    """Côté Cameroun : un code à donner au proche à l'étranger (24 h, usage unique) ; le précédent est annulé."""
    if est_diaspora(user):
        raise interdit("type", "Un compte diaspora ne crée pas de code famille : il invite ses proches.")
    maintenant = timezone.now()
    CodeFamille.objects.filter(client=user, utilise_le__isnull=True, jusqua__gt=maintenant).update(jusqua=maintenant)
    c = CodeFamille.objects.create(
        client=user, code=_code("FAM-", CodeFamille), jusqua=maintenant + timedelta(hours=regles.CODE_FAMILLE_HEURES)
    )
    return {"code": c.code, "jusqua": ms(c.jusqua)}


def _deja(diaspora, proche) -> bool:
    return LienFamille.objects.filter(diaspora=diaspora, proche=proche, etat__in=OUVERTS).exists()


def lier_par_code(user, code: str) -> dict:
    """Côté diaspora : 404 code, 422 max, 409 deja."""
    if not est_diaspora(user):
        raise interdit("type", "Seul un compte diaspora se relie par un code famille.")
    with transaction.atomic():
        c = (
            CodeFamille.objects.select_for_update()
            .filter(code=str(code).strip().upper(), utilise_le__isnull=True, jusqua__gt=timezone.now())
            .select_related("client")
            .first()
        )
        if c is None or c.client_id == user.pk:
            raise introuvable("Ce code famille n'est pas valable.", code="code")
        if _deja(user, c.client):
            raise conflit("deja", "Ce proche est déjà relié à ton compte.")
        if _ouverts(user) >= regles.LIENS_MAX or _ouverts(c.client) >= regles.LIENS_MAX:
            raise refus("max", f"{regles.LIENS_MAX} proches reliés au plus.")
        relais = commandes.relais_habituel(c.client)
        lien = LienFamille.objects.create(
            diaspora=user, proche=c.client, etat=LienFamille.Etat.ACTIF, relay_id=relais.id if relais else None
        )
        c.utilise_le = timezone.now()
        c.save(update_fields=["utilise_le"])
    commandes.notifier(c.client, f"{user.first_name} est relié à ton compte", "Il peut maintenant commander pour toi.", "/proches")
    return {"ok": True, "lien": lien_dict(lien, user)}


def inviter_proche(user, prenom: str, numero: str) -> dict:
    """Côté diaspora : inviter un proche par son numéro camerounais ; il accepte dans son application."""
    if not est_diaspora(user):
        raise interdit("type", "Seul un compte diaspora invite un proche.")
    n = numero_local(numero)
    if not re.fullmatch(r"6\d{8}", n):
        return {"ok": False, "raison": "numero"}
    if _ouverts(user) >= regles.LIENS_MAX:
        return {"ok": False, "raison": "max"}
    proche = commandes.client_par_numero(n)
    emp = empreinte(n)
    if (
        LienFamille.objects.filter(diaspora=user, etat__in=OUVERTS)
        .filter(Q(numero_empreinte=emp) | Q(proche=proche) if proche else Q(numero_empreinte=emp))
        .exists()
    ):
        return {"ok": False, "raison": "deja"}
    lien = LienFamille.objects.create(
        diaspora=user,
        proche=proche,
        prenom_invite=prenom.strip()[:80],
        numero_chiffre=chiffrer(n),
        numero_empreinte=emp,
        etat=LienFamille.Etat.INVITE,
    )
    if proche is not None:
        commandes.notifier(proche, f"{user.first_name} veut te relier à son compte", "Accepte ou refuse dans Mes proches.", "/proches")
    else:
        from apps.otp.prestataires import sms

        sms().envoyer(
            n,
            f"BelivaY : {user.first_name} veut te relier à son compte pour commander pour toi. Ouvre BelivaY, Mes proches, pour accepter.",
            "sms",
        )
    return {"ok": True, "lien": lien_dict(lien, user)}


def repondre_lien(user, id_, accepte: bool, relais_texte: str | None) -> None:
    """Côté Cameroun : accepter (avec son relais) ou refuser une invitation par numéro."""
    lien = _lien(user, id_)
    if lien.diaspora_id == user.pk:
        raise interdit("type", "C'est au proche de répondre.")
    if lien.etat != LienFamille.Etat.INVITE:
        raise conflit("state_changed", "Cette invitation a déjà une réponse.")
    if accepte:
        if _ouverts(user) >= regles.LIENS_MAX:
            raise refus("max", f"{regles.LIENS_MAX} proches reliés au plus.")
        relais = commandes.relais_par_texte(relais_texte) if relais_texte else commandes.relais_habituel(user)
        lien.relay_id = relais.id if relais else None
    lien.proche = user
    lien.etat = LienFamille.Etat.ACTIF if accepte else LienFamille.Etat.REFUSE
    lien.save()
    commandes.notifier(lien.diaspora, f"{user.first_name} a {'accepté' if accepte else 'refusé'} ton invitation", "", "/proches")


def retirer_lien(user, id_) -> None:
    lien = _lien(user, id_)
    lien.etat = LienFamille.Etat.RETIRE
    lien.save(update_fields=["etat", "modifie_le"])
    DemandeProche.objects.filter(lien=lien, etat=DemandeProche.Etat.ATTENTE).update(etat=DemandeProche.Etat.ANNULEE)


def lien_invitation(user) -> dict:
    """Côté diaspora : un lien d'invitation partageable (7 jours) ; côté Cameroun : son code famille."""
    maintenant = timezone.now()
    if not est_diaspora(user):
        c = CodeFamille.objects.filter(client=user, utilise_le__isnull=True, jusqua__gt=maintenant).order_by("-id").first()
        d = {"code": c.code, "jusqua": ms(c.jusqua)} if c else creer_code_famille(user)
        return {"type": "famille", **d}
    inv = Invitation.objects.filter(client=user, jusqua__gt=maintenant).order_by("-id").first()
    if inv is None:
        inv = Invitation.objects.create(
            client=user, code=_code("INV-", Invitation), jusqua=maintenant + timedelta(days=regles.INVITATION_JOURS)
        )
    return {"type": "invitation", "code": inv.code, "jusqua": ms(inv.jusqua)}


def accepter_invitation(user, code: str, relais_texte: str) -> dict:
    """Côté Cameroun : 403 type (compte diaspora), 404 code, 422 max, 409 deja."""
    if est_diaspora(user):
        raise interdit("type", "Un compte diaspora n'accepte pas d'invitation : il invite.")
    inv = Invitation.objects.filter(code=str(code).strip().upper(), jusqua__gt=timezone.now()).select_related("client").first()
    if inv is None or inv.client_id == user.pk:
        raise introuvable("Ce code d'invitation n'est pas valable.", code="code")
    if _deja(inv.client, user):
        raise conflit("deja", "Ce proche est déjà relié à ton compte.")
    if _ouverts(user) >= regles.LIENS_MAX or _ouverts(inv.client) >= regles.LIENS_MAX:
        raise refus("max", f"{regles.LIENS_MAX} proches reliés au plus.")
    relais = commandes.relais_par_texte(relais_texte) or commandes.relais_habituel(user)
    lien = LienFamille.objects.create(diaspora=inv.client, proche=user, etat=LienFamille.Etat.ACTIF, relay_id=relais.id if relais else None)
    commandes.notifier(inv.client, f"{user.first_name} a accepté ton invitation", "Tu peux commander pour lui.", "/proches")
    return {"ok": True, "lien": lien_dict(lien, user)}


def regler_livraison(user, id_, relais_texte: str, domicile: bool, prefere: str) -> None:
    """Côté Cameroun : son relais, et la livraison chez lui (seulement s'il a une adresse ; jamais montrée)."""
    lien = _lien(user, id_)
    if lien.proche_id != user.pk:
        raise interdit("type", "Seul le proche règle sa livraison.")
    relais = commandes.relais_par_texte(relais_texte)
    if relais is None:
        raise refus("relais", "Relais introuvable.")
    possible = bool(domicile) and commandes.a_une_adresse(user)
    lien.relay_id, lien.domicile = relais.id, possible
    lien.prefere = prefere if possible else LienFamille.Prefere.RELAIS
    lien.save(update_fields=["relay_id", "domicile", "prefere", "modifie_le"])


# ── Paniers envoyés au proche diaspora ─────────────────────────────────────────────────────────────────


def _etat_demande(d: DemandeProche) -> str:
    if d.etat == DemandeProche.Etat.ATTENTE and d.jusqua <= timezone.now():
        return DemandeProche.Etat.EXPIREE
    return d.etat


def demande_dict(d: DemandeProche, user) -> dict:
    recue = d.lien.diaspora_id == user.pk
    c = compte(d.lien.diaspora)
    return {
        "id": str(d.pk),
        "sens": "recue" if recue else "envoyee",
        "lien": str(d.lien_id),
        "prenom": (d.lien.proche.first_name if d.lien.proche else "") if recue else d.lien.diaspora.first_name,
        "pays": None if recue else (c.pays if c else None),
        "lignes": [
            {
                "titre": x["titre"],
                "dessin": pont.image(x["product_id"]),
                "qte": x["qte"],
                "prix": x["prix"],
                "boutique": x["boutique"],
                "classe": x["classe"],
            }
            for x in d.lignes
        ],
        "sousTotal": d.sous_total,
        "livraison": d.livraison,
        "fraisRelais": d.frais_relais,
        "fraisDomicile": d.frais_domicile,
        "mot": d.mot,
        "creeLe": ms(d.cree_le),
        "jusqua": ms(d.jusqua),
        "etat": _etat_demande(d),
        "ref": f"BLV-{d.order_id}" if d.order_id else None,
        "motRefus": d.mot_refus or None,
        "supplementPar": d.supplement_par or None,
        "payeeLe": ms(d.payee_le),
    }


def demandes(user, request) -> dict:
    from apps.client_core.pagination import page

    qs = DemandeProche.objects.filter(Q(lien__diaspora=user) | Q(lien__proche=user)).select_related(
        "lien", "lien__diaspora", "lien__proche"
    )
    elements, suivant = page(request, qs, taille=20)
    return {"demandes": [demande_dict(d, user) for d in elements], "maintenant": maintenant_ms(), "next_cursor": suivant}


def _lignes_du_panier(user, ids: list[str] | None):
    try:
        from apps.cart import services as panier_srv
    except ImportError:
        raise ErreurClient(
            status.HTTP_501_NOT_IMPLEMENTED, "a_finir", "Le panier serveur n'est pas installé.", {"manque": "application apps.cart"}
        ) from None
    lignes = list(panier_srv.lignes_actives(panier_srv.panier_de(user)))
    if ids is not None:
        voulues = {str(i) for i in ids}
        lignes = [lg for lg in lignes if str(lg.pk) in voulues]
    produits = pont.produits([lg.product_id for lg in lignes])
    return [lg for lg in lignes if lg.product_id in produits and produits[lg.product_id].actif], produits


def envoyer_panier_au_proche(user, id_, mot: str, livraison: str, ids: list[str] | None) -> dict:
    """Côté Cameroun : son panier envoyé à son proche diaspora relié, valable DEMANDE_JOURS ; 409 deja ; 422 vide,
    plafond, domicile."""
    try:
        lien = _lien(user, id_)
    except ErreurClient:
        return {"ok": False, "raison": "lien"}
    if est_diaspora(user) or lien.proche_id != user.pk or lien.etat != LienFamille.Etat.ACTIF:
        return {"ok": False, "raison": "lien"}
    if livraison == "domicile" and not commandes.a_une_adresse(user):
        raise refus("domicile", "Ajoute ton adresse pour être livré chez toi.")
    lignes_db, produits = _lignes_du_panier(user, ids)
    if not lignes_db:
        raise refus("vide", "Ton panier est vide.")
    if DemandeProche.objects.filter(lien=lien, etat=DemandeProche.Etat.ATTENTE, jusqua__gt=timezone.now()).exists():
        raise conflit("deja", "Un panier attend déjà ton proche.")
    lignes = [(lg.product_id, lg.qte, produits[lg.product_id].prix) for lg in lignes_db]
    fr, fd = commandes.frais("relais", lignes), commandes.frais("domicile", lignes)
    sous_total = fr.sous_total
    frais_relais, frais_domicile = fr.total - sous_total, fd.total - sous_total
    base = sous_total + (frais_domicile if livraison == "domicile" else frais_relais)
    if base + commandes.service_carte(base) > parametres.paiement().carte_max:
        raise refus("plafond", "Ce panier dépasse le plafond d'un paiement par carte.", {"plafond": parametres.paiement().carte_max})
    figees = []
    for lg in lignes_db:
        p = produits[lg.product_id]
        figees.append(
            {
                "product_id": lg.product_id,
                "titre": p.titre,
                "qte": lg.qte,
                "prix": p.prix,
                "boutique": p.boutique.nom if p.boutique else "",
                "classe": commandes.classe_de(lg.product_id),
            }
        )
    d = DemandeProche.objects.create(
        lien=lien,
        lignes=figees,
        sous_total=sous_total,
        livraison=livraison,
        frais_relais=frais_relais,
        frais_domicile=frais_domicile,
        mot=mot.strip()[:120],
        jusqua=timezone.now() + timedelta(days=regles.DEMANDE_JOURS),
    )
    commandes.notifier(
        lien.diaspora, f"{user.first_name} t'a envoyé son panier à payer", "Ouvre « À payer pour mes proches ».", "/paniers-proches"
    )
    return {"ok": True, "demande": demande_dict(d, user)}


def _demande(user, id_) -> DemandeProche:
    try:
        return DemandeProche.objects.select_related("lien").get(Q(lien__diaspora=user) | Q(lien__proche=user), pk=int(id_))
    except (ValueError, DemandeProche.DoesNotExist):
        raise introuvable("Panier introuvable.") from None


def refuser_demande(user, id_, mot: str) -> None:
    d = _demande(user, id_)
    if d.lien.diaspora_id != user.pk or _etat_demande(d) != DemandeProche.Etat.ATTENTE:
        raise conflit("state_changed", "Ce panier n'attend plus de réponse.")
    d.etat, d.mot_refus = DemandeProche.Etat.REFUSEE, mot.strip()[:120]
    d.save(update_fields=["etat", "mot_refus"])
    commandes.notifier(d.lien.proche, f"{user.first_name} a refusé ton panier", d.mot_refus, "/paniers-proches")


def annuler_demande(user, id_) -> None:
    d = _demande(user, id_)
    if d.lien.proche_id != user.pk or _etat_demande(d) != DemandeProche.Etat.ATTENTE:
        raise conflit("state_changed", "Ce panier n'attend plus de réponse.")
    d.etat = DemandeProche.Etat.ANNULEE
    d.save(update_fields=["etat"])


# ── Commande pour un proche ────────────────────────────────────────────────────────────────────────────


def _affiche_carte(texte: str, moyen: str) -> str:
    if moyen == "apple":
        return "Apple Pay"
    if moyen == "google":
        return "Google Pay"
    t = (texte or "").strip()
    return t[:40] if t and not t.lower().startswith(("tok_", "carte_")) else "Carte"


def _controle(user, c: CompteDiaspora, pays_carte: str, montant: int):
    historique = [
        (ms(x.cree_le), x.montant) for x in CommandeDiaspora.objects.filter(payeur=user, etat_paiement=CommandeDiaspora.Paiement.PAYE)
    ]
    return regles.controle_diaspora(
        pays_carte=pays_carte, pays_compte=c.pays, montant=montant, historique=historique, maintenant=maintenant_ms()
    )


def commander_pour(user, id_, p: dict) -> dict:
    """commanderPour (idempotent, la vue) : carte, Apple Pay ou Google Pay ; règle commune (totalDiaspora,
    supplementAuProche) ; plafonds ; contrôle de cohérence ; 3-D Secure ; 422 domicile, demande, garantie."""
    c = compte(user)
    try:
        lien = _lien(user, id_)
    except ErreurClient:
        return {"ok": False, "raison": "lien"}
    livraison, moyen = p.get("livraison") or "relais", p.get("moyen") or "carte"
    supplement_par = p.get("supplementPar") or rechanges.PAYEUR
    if (
        c is None
        or lien.diaspora_id != user.pk
        or lien.etat != LienFamille.Etat.ACTIF
        or lien.proche is None
        or (livraison == "relais" and not lien.relay_id)
    ):
        return {"ok": False, "raison": "lien"}
    if livraison == "domicile" and not (lien.domicile and commandes.a_une_adresse(lien.proche)):
        raise refus("domicile", "Ce proche n'a pas accepté la livraison chez lui.")
    if moyen == "carte" and regles.nom_carte(p.get("titulaire") or "") != regles.nom_carte(f"{user.first_name} {user.last_name}"):
        return {"ok": False, "raison": "titulaire"}
    dem = None
    if p.get("demande"):
        dem = DemandeProche.objects.filter(pk=_entier(p["demande"]), lien=lien).first()
        if dem is None or _etat_demande(dem) != DemandeProche.Etat.ATTENTE:
            raise refus("demande", "Ce panier n'attend plus de paiement.")
        lignes = [(x["product_id"], x["qte"], x["prix"]) for x in dem.lignes]
        produits = pont.produits([x[0] for x in lignes])
        lignes = [(pid, q, produits[pid].prix if pid in produits else prix) for pid, q, prix in lignes]  # prix du jour
        lignes_panier = []
    else:
        lignes_panier, produits = _lignes_du_panier(user, None)
        lignes = [(lg.product_id, lg.qte, produits[lg.product_id].prix) for lg in lignes_panier]
    if not lignes:
        return {"ok": False, "raison": "vide"}
    fr, fd = commandes.frais("relais", lignes), commandes.frais("domicile", lignes)
    articles = fr.sous_total
    frais_relais, frais_domicile = fr.total - articles, fd.total - articles
    g = parametres.garde()
    par_proche = dem is not None and dem.livraison == "domicile" and livraison == "domicile"
    if (
        supplement_par == rechanges.DESTINATAIRE
        and not rechanges.supplement_au_proche(
            articles=articles, supplement=max(0, frais_domicile - frais_relais), demande_par_proche=par_proche, g=g
        ).ok
    ):
        raise refus("garantie", "Le supplément domicile ne peut pas être laissé à ton proche.")
    tot = rechanges.total_diaspora(
        articles=articles,
        frais_relais=frais_relais,
        frais_domicile=frais_domicile,
        livraison=livraison,
        supplement_par=supplement_par,
        service_pour_cent=parametres.paiement().carte_frais_pour_cent,
    )
    montant = tot["total"]
    if regles.depasse_plafonds(
        montant=montant, deja_ce_mois=depenses_du_mois(user), par_paiement=parametres.paiement().carte_max, par_mois=regles.PLAFOND_MOIS
    ):
        return {"ok": False, "raison": "plafond"}
    pays_carte = p.get("paysCarte") or ""
    controle = _controle(user, c, pays_carte, montant)
    if controle.decision == "refuse":
        return {"ok": False, "raison": "coherence", "controle": controle.en_dict()}
    if controle.decision == "renforce":
        from apps.otp.services import verifier

        r = verifier(objet="diaspora-renforce", code=p.get("codeSms") or "", destination=dechiffrer(c.numero_chiffre))
        if not r.get("ok"):
            return {"ok": False, "raison": "verification", "controle": controle.en_dict()}

    devise = p.get("devise") if p.get("devise") in ("EUR", "USD") else "EUR"
    en_dev, taux = commandes.en_devise(montant, devise)
    reference = f"DIA-{user.pk}-{secrets.token_hex(6)}"
    r = commandes.payer(moyen=moyen, montant=montant, reference=reference, jeton=str(p["carte"]), devise=devise, email=user.email)
    if r.statut == "refuse":
        raise ErreurClient(
            status.HTTP_402_PAYMENT_REQUIRED, "paiement_refuse", "Paiement refusé par la banque : rien n'a été débité.", {"motif": r.motif}
        )
    # Le pays donné par le prestataire fait foi : contrôle refait, refus → remboursé aussitôt.
    if r.pays_carte and r.pays_carte != pays_carte:
        c2 = _controle(user, c, r.pays_carte, montant)
        if c2.decision == "refuse" or (c2.decision == "renforce" and controle.decision != "renforce"):
            commandes.rembourser(moyen=moyen, reference=r.reference or reference, montant=montant)
            return {"ok": False, "raison": "coherence" if c2.decision == "refuse" else "verification", "controle": c2.en_dict()}
    payee = r.statut == "reussi"
    with transaction.atomic():
        order_id = commandes.creer_commande(
            destinataire=lien.proche,
            lignes=lignes,
            mode=livraison,
            relay_id=lien.relay_id,
            payee=payee,
            livraison=tot["livraisonPayee"],
            frais_service=tot["service"],
            moyen=moyen,
            devise=devise,
            montant_devise=en_dev,
            payeur={"prenom": user.first_name, "pays": c.pays, "devise": devise},
        )
        cd = CommandeDiaspora.objects.create(
            lien=lien,
            payeur=user,
            order_id=order_id,
            montant=montant,
            devise=devise,
            en_devise=en_dev,
            taux=taux,
            carte=_affiche_carte(p["carte"], moyen),
            articles=sum(q for _, q, _ in lignes),
            mot=(p.get("mot") or "").strip()[:80],
            livraison=livraison,
            moyen=moyen,
            demande=dem,
            a_la_remise=tot["aLaRemise"],
            pays_carte=r.pays_carte or pays_carte,
            reference=r.reference or reference,
            etat_paiement=CommandeDiaspora.Paiement.PAYE if payee else CommandeDiaspora.Paiement.ACTION,
        )
        if dem is not None:
            dem.etat, dem.order_id, dem.payee_le = DemandeProche.Etat.PAYEE, order_id, timezone.now()
            dem.supplement_par = supplement_par if livraison == "domicile" else ""
            dem.livraison = livraison
            dem.save()
        for lg in lignes_panier:
            lg.delete()
    commandes.notifier(
        lien.proche, f"{user.first_name} a commandé pour toi", "Ton code de retrait arrive quand le colis est prêt.", "/commandes"
    )
    reponse = {"ok": True, "ref": cd.ref}
    if r.redirection:
        reponse["redirection"] = r.redirection
    return reponse


def confirmer_paiement(reference: str, reussi: bool = True) -> bool:
    """Webhook du prestataire carte après 3-D Secure (ou Apple Pay / Google Pay validé plus tard) : la commande pour un
    proche passe de « 3-D Secure à valider » à « payée » ; refusé : la commande est annulée, rien n'est débité.
    Faux si la référence n'est pas une commande diaspora en attente (idempotent)."""
    with transaction.atomic():
        cd = (
            CommandeDiaspora.objects.select_for_update()
            .filter(reference=reference, etat_paiement=CommandeDiaspora.Paiement.ACTION)
            .select_related("lien__proche", "payeur")
            .first()
        )
        if cd is None:
            return False
        if not reussi:
            cd.etat_paiement = CommandeDiaspora.Paiement.REMBOURSE
            cd.save(update_fields=["etat_paiement"])
            pont.modele("commande").objects.filter(pk=cd.order_id).update(payment_status="FAILED")
            from apps.pickup.services import annuler_commande_echange

            annuler_commande_echange(cd.order_id, "3-D Secure non validé")
            return True
        cd.etat_paiement = CommandeDiaspora.Paiement.PAYE
        cd.save(update_fields=["etat_paiement"])
        commandes.marquer_payee(cd.order_id)
    return True


def _entier(x) -> int:
    try:
        return int(str(x).removeprefix("DP-"))
    except ValueError:
        return 0
