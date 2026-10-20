# backend/apps/otp/services.py
# Envoyer et vérifier un code (utilisé par les routes /auth/otp/*, /me/phone, /me/email, /me (profil, suppression),
# /me/moyens-paiement, l'inscription diaspora et les cadeaux par carte).
#
#     envoi = envoyer(objet="moyen", destination="677123441", utilisateur=request.user)
#     → {"destination": "6 77 ·· ·· 41 · MTN", "valideMinutes": 10, "renvoiSecondes": 60}   (EnvoiCode du site)
#     r = verifier(objet="moyen", code="123456", destination="677123441", utilisateur=request.user)
#     → {"ok": True} | {"ok": False, "essaisRestants": 3} | {"ok": False, "bloqueJusqua": 1767225600000}
#
# Paramètres (registre) : OTP-LONG (6 chiffres), OTP-DUREE (10 minutes), OTP-ESSAIS (5, puis 15 minutes),
# OTP-RENVOI (60 s entre deux envois, 3 envois par heure).

import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework import status

from apps.client_core import parametres
from apps.client_core.erreurs import ErreurClient
from apps.client_core.masquage import masquer_email, masquer_numero, numero_local, operateur
from apps.client_core.temps import ms

from .models import CodeOtp
from .prestataires import sms


def _empreinte(valeur: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), valeur.encode(), hashlib.sha256).hexdigest()


def _normaliser(destination: str) -> str:
    d = (destination or "").strip()
    return d.lower() if "@" in d else numero_local(d) or d


def _masquer(destination: str) -> str:
    if "@" in destination:
        return masquer_email(destination)
    op = operateur(destination)
    return masquer_numero(destination) + (f" · {op}" if op else "")


def _regles():
    duree = parametres.entier("OTP-DUREE")
    essais, attente = parametres.nombres("OTP-ESSAIS")[:2]
    entre, par_heure = parametres.nombres("OTP-RENVOI")[:2]
    longueur = parametres.entier("OTP-LONG")
    return duree, essais, attente, entre, par_heure, longueur


def envoyer(*, objet: str, destination: str, utilisateur=None, canal: str = "sms") -> dict:
    """Crée et envoie un code ; 429 trop_tot / trop_d_envois selon OTP-RENVOI."""
    dest = _normaliser(destination)
    if not dest:
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Destination manquante.")
    if "@" in dest:
        canal = CodeOtp.Canal.EMAIL
    duree, _, _, entre, par_heure, longueur = _regles()
    maintenant = timezone.now()
    empreinte_dest = _empreinte(dest)
    recents = CodeOtp.objects.filter(objet=objet, destination_empreinte=empreinte_dest, cree_le__gte=maintenant - timedelta(hours=1))
    dernier = recents.order_by("-cree_le").first()
    if dernier is not None and dernier.cree_le > maintenant - timedelta(seconds=entre):
        attendre = entre - int((maintenant - dernier.cree_le).total_seconds())
        raise ErreurClient(
            status.HTTP_429_TOO_MANY_REQUESTS, "trop_tot", "Patiente avant de demander un nouveau code.", {"renvoiSecondes": attendre}
        )
    if recents.count() >= par_heure:
        raise ErreurClient(status.HTTP_429_TOO_MANY_REQUESTS, "trop_d_envois", "Trop de codes demandés. Réessaie dans une heure.")

    code = f"{secrets.randbelow(10**longueur):0{longueur}d}"
    with transaction.atomic():
        # Un nouveau code annule les précédents du même objet (un seul code valable à la fois).
        CodeOtp.objects.filter(objet=objet, destination_empreinte=empreinte_dest, utilise_le__isnull=True).update(expire_le=maintenant)
        CodeOtp.objects.create(
            utilisateur=utilisateur if utilisateur is not None and utilisateur.is_authenticated else None,
            objet=objet,
            canal=canal,
            destination_empreinte=empreinte_dest,
            destination_masquee=_masquer(dest),
            code_empreinte=_empreinte(f"{objet}:{dest}:{code}"),
            expire_le=maintenant + timedelta(minutes=duree),
        )
    texte = f"BelivaY : ton code est {code}. Il est valable {duree} minutes. Ne le donne à personne."
    if canal == CodeOtp.Canal.EMAIL:
        send_mail("Ton code BelivaY", texte, None, [dest])
    else:
        sms().envoyer(dest, texte, canal)
    return {"destination": _masquer(dest), "valideMinutes": duree, "renvoiSecondes": entre}


def verifier(*, objet: str, code: str, destination: str, utilisateur=None, consommer: bool = True) -> dict:
    """Vérifie et consomme le code (consommer=False : le code juste reste valable, pour un contrôle refait plus tard,
    ex. l'inscription diaspora). Ne lève pas pour un code faux : le résultat le dit (ResultatCode du site)."""
    dest = _normaliser(destination)
    _, essais_max, attente_min, _, _, _ = _regles()
    maintenant = timezone.now()
    with transaction.atomic():
        c = (
            CodeOtp.objects.select_for_update()
            .filter(objet=objet, destination_empreinte=_empreinte(dest), utilise_le__isnull=True)
            .order_by("-cree_le")
            .first()
        )
        if c is None or c.expire_le <= maintenant:
            return {"ok": False, "essaisRestants": 0, "expire": True}
        if c.bloque_jusqua and c.bloque_jusqua > maintenant:
            return {"ok": False, "bloqueJusqua": ms(c.bloque_jusqua)}
        if hmac.compare_digest(c.code_empreinte, _empreinte(f"{objet}:{dest}:{str(code).strip()}")):
            if consommer:
                c.utilise_le = maintenant
                c.save(update_fields=["utilise_le"])
            return {"ok": True}
        c.essais += 1
        if c.essais >= essais_max:
            c.bloque_jusqua = maintenant + timedelta(minutes=attente_min)
            c.save(update_fields=["essais", "bloque_jusqua"])
            return {"ok": False, "bloqueJusqua": ms(c.bloque_jusqua)}
        c.save(update_fields=["essais"])
        return {"ok": False, "essaisRestants": essais_max - c.essais}


def etape_validee(*, objet: str, utilisateur, apres=None, fenetres: int = 1) -> bool:
    """Un code `objet` de ce compte a-t-il été vérifié depuis moins de `fenetres` × OTP-DUREE (et après `apres`) ?

    Sert aux parcours en deux codes (DP-52, CIN-39) : le code au numéro du compte ouvre une fenêtre d'OTP-DUREE
    pour demander le second code ; celui-ci vaut OTP-DUREE ; la confirmation doit donc tomber dans 2 × OTP-DUREE."""
    duree = parametres.entier("OTP-DUREE")
    limite = timezone.now() - timedelta(minutes=duree * fenetres)
    if apres is not None and apres > limite:
        limite = apres
    return CodeOtp.objects.filter(objet=objet, utilisateur=utilisateur, utilise_le__gt=limite).exists()


# ── Lien « mot de passe oublié » (CAP-16, MDP-LIEN) ─────────────────────────────────────────────────────


def _empreinte_jeton(jeton: str) -> str:
    return hashlib.sha256(jeton.encode()).hexdigest()


def creer_jeton_mdp(utilisateur) -> tuple[str, int]:
    """(jeton en clair pour l'e-mail, minutes de validité) ; les liens précédents de ce compte cessent de valoir."""
    from .models import JetonMdp

    minutes = parametres.entier("MDP-LIEN")
    jeton = secrets.token_urlsafe(32)
    maintenant = timezone.now()
    with transaction.atomic():
        JetonMdp.objects.filter(utilisateur=utilisateur, utilise_le__isnull=True, expire_le__gt=maintenant).update(expire_le=maintenant)
        JetonMdp.objects.create(
            utilisateur=utilisateur, jeton_empreinte=_empreinte_jeton(jeton), expire_le=maintenant + timedelta(minutes=minutes)
        )
    return jeton, minutes


def jeton_mdp_connu(jeton: str) -> bool:
    """Le lien a existé (utilisé, remplacé ou expiré) : 410 expire plutôt que 404 invalide."""
    from .models import JetonMdp

    return JetonMdp.objects.filter(jeton_empreinte=_empreinte_jeton(str(jeton or ""))).exists()


def consommer_jeton_mdp(jeton: str):
    """L'utilisateur du lien s'il est valable (et le lien est alors consommé) ; None sinon."""
    from .models import JetonMdp

    maintenant = timezone.now()
    with transaction.atomic():
        j = (
            JetonMdp.objects.select_for_update()
            .select_related("utilisateur")
            .filter(jeton_empreinte=_empreinte_jeton(str(jeton or "")), utilise_le__isnull=True, expire_le__gt=maintenant)
            .first()
        )
        if j is None:
            return None
        j.utilise_le = maintenant
        j.save(update_fields=["utilise_le"])
        return j.utilisateur
