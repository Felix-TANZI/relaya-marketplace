# backend/apps/otp/oubli.py
# « Mot de passe oublié » pour tous les comptes (client, vendeur, relais, livreur, entreprise) — DEV-SRV-01, T07-5 :
# le vendeur inscrit par un agent qui a perdu son mot de passe passe par ici (apps.vendors.agent_terrain le lui dit).
#
# Une seule façon d'envoyer le lien, appelée par /api/auth/password/forgot et /api/vendors/auth/password-reset :
#   - le compte est retrouvé par son e-mail, ou par son numéro sur n'importe lequel de ses profils (users_with_phone) ;
#   - le lien part par e-mail s'il y en a un ; sinon par SMS au numéro saisi (la plupart des vendeurs n'ont pas d'e-mail) ;
#   - il ramène au portail d'où vient la demande, s'il fait partie des origines configurées (CORS_ALLOWED_ORIGINS) :
#     un site tiers ne peut pas faire envoyer par BelivaY un lien vers lui-même. Sinon, l'adresse du site.
# La réponse ne dit jamais si un compte existe.

from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

from apps.client_core import parametres
from apps.client_core.masquage import masquer_email, masquer_numero
from apps.common.phone import normalize_cameroon_phone

from . import services
from .prestataires import sms

#: Page qui lit le jeton, la même sur tous les portails (frontend : features/auth/NouveauMotDePassePage.tsx).
CHEMIN = "/mdp-nouveau?jeton={jeton}"


def _portail(origine: str | None) -> str:
    """L'origine de la demande si elle est l'un des portails configurés (https, pas une appli mobile) ; sinon le site."""
    origine = (origine or "").strip().rstrip("/")
    morceaux = urlsplit(origine)
    if (origine and morceaux.scheme == "https" and morceaux.hostname not in (None, "localhost")
            and origine in {o.rstrip("/") for o in getattr(settings, "CORS_ALLOWED_ORIGINS", [])}):
        return origine
    return settings.BELIVAY_SITE_URL


def _compte(identifiant: str):
    """(compte, numéro e164 saisi ou None) ; (None, …) si rien ne correspond."""
    User = get_user_model()
    if "@" in identifiant:
        return User.objects.filter(email__iexact=identifiant, is_active=True).first(), None
    from apps.accounts.serializers import users_with_phone

    numero = normalize_cameroon_phone(identifiant)
    if not numero["is_valid"]:
        return None, None
    return users_with_phone(numero["e164"]).filter(is_active=True).first(), numero["e164"]


def envoyer_lien(identifiant: str, origine: str | None = None) -> dict:
    """Envoie le lien (si un compte correspond) ; rend {destination masquée, canal, valideMinutes}, toujours."""
    identifiant = (identifiant or "").strip()
    user, numero = _compte(identifiant)
    minutes = parametres.entier("MDP-LIEN")
    canal = "email" if "@" in identifiant else "sms"
    destination = masquer_email(identifiant) if canal == "email" else masquer_numero(numero or identifiant)
    if user is None:
        return {"destination": destination, "canal": canal, "valideMinutes": minutes}

    jeton, minutes = services.creer_jeton_mdp(user)
    lien = _portail(origine) + CHEMIN.format(jeton=jeton)
    if canal == "email":  # retrouvé par son e-mail : le lien y part
        send_mail(
            "Ton nouveau mot de passe BelivaY",
            f"Bonjour {user.first_name or ''},\n\nPour choisir un nouveau mot de passe, ouvre ce lien (valable {minutes} "
            f"minutes, une seule fois) :\n{lien}\n\nSi tu n'as rien demandé, ignore ce message : ton mot de passe ne "
            f"change pas.",
            None,
            [user.email],
        )
        return {"destination": destination, "canal": "email", "valideMinutes": minutes}
    # Retrouvé par son numéro : le lien part par SMS à ce numéro, qui est celui du compte.
    sms().envoyer(numero, f"BelivaY : pour choisir un nouveau mot de passe, ouvre {lien} (valable {minutes} min, une "
                          f"seule fois). Si tu n'as rien demandé, ignore ce message.")
    return {"destination": destination, "canal": "sms", "valideMinutes": minutes}
