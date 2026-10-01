# backend/apps/common/translation.py
# Client de traduction automatique (Google Cloud Translation API v2),
# partage par tous les domaines qui ont besoin de traduire du contenu
# genere par les utilisateurs (fiches produit, messages, notifications) —
# a ne pas confondre avec le i18n statique (frontend/src/i18n/), qui ne
# couvre que les textes fixes de l'interface compiles au build.
#
# PRINCIPE : la traduction est un CONFORT, jamais un bloqueur. Un echec de
# l'API Google (quota, reseau, cle absente) renvoie toujours le texte
# d'origine plutot que de lever une exception — une fiche produit ou une
# notification doit rester lisible meme si la traduction echoue.
#
# MISE EN CACHE : chaque appel coute (facturation Google au caractere).
# Le resultat est mis en cache (Django cache, cle = hash du texte + langue
# cible) pour que le meme contenu ne soit jamais traduit deux fois.

from __future__ import annotations

import hashlib
import logging

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger("apps.common.translation")

TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"

#: Pas de limite de temps de cache courte : un texte traduit une fois n'a
#: aucune raison de changer de traduction plus tard.
CACHE_TTL_S = 60 * 60 * 24 * 90  # 90 jours

#: Langues effectivement utilisees par l'application (voir frontend/src/i18n).
SUPPORTED_LANGUAGES = frozenset({"fr", "en"})


def _cache_key(text: str, target_lang: str, source_lang: str) -> str:
    empreinte = hashlib.sha256(f"{source_lang}:{target_lang}:{text}".encode("utf-8")).hexdigest()
    return f"belivay:translate:{empreinte}"


def translate_text(text: str, *, target_lang: str, source_lang: str = "") -> str:
    """
    Traduit `text` vers `target_lang`. Renvoie `text` tel quel si :
      - le texte est vide,
      - la langue cible n'est pas supportee ou egale a la langue source connue,
      - la cle API est absente,
      - l'appel echoue pour quelque raison que ce soit.

    Ne leve JAMAIS d'exception : voir le principe en tete de fichier.
    """
    texte = (text or "").strip()
    if not texte:
        return text or ""

    cible = (target_lang or "").strip().lower()
    source = (source_lang or "").strip().lower()
    if cible not in SUPPORTED_LANGUAGES:
        return text
    if source and source == cible:
        return text

    cle_cache = _cache_key(texte, cible, source)
    en_cache = cache.get(cle_cache)
    if en_cache is not None:
        return en_cache

    cle_api = getattr(settings, "GOOGLE_TRANSLATE_API_KEY", "")
    if not cle_api:
        logger.debug("GOOGLE_TRANSLATE_API_KEY absente : traduction ignoree.")
        return text

    corps = {"q": texte, "target": cible, "format": "text"}
    if source:
        corps["source"] = source

    try:
        reponse = requests.post(
            TRANSLATE_URL, params={"key": cle_api}, json=corps, timeout=(3.0, 8.0),
        )
    except requests.RequestException as exc:
        logger.warning("Traduction : erreur reseau — %s", exc)
        return text

    if reponse.status_code >= 400:
        logger.warning(
            "Traduction : HTTP %s — %s", reponse.status_code, reponse.text[:300],
        )
        return text

    try:
        donnees = reponse.json()
        traduit = donnees["data"]["translations"][0]["translatedText"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        logger.warning("Traduction : reponse inattendue — %s", exc)
        return text

    cache.set(cle_cache, traduit, timeout=CACHE_TTL_S)
    return traduit


def translate_fields(obj: dict, fields: list[str], *, target_lang: str, source_lang: str = "") -> dict:
    """
    Traduit plusieurs champs d'un dict en une seule fois (ex. title +
    description d'une fiche produit). Renvoie un NOUVEAU dict ; `obj`
    n'est jamais modifie en place.
    """
    resultat = dict(obj)
    for champ in fields:
        valeur = obj.get(champ)
        if isinstance(valeur, str) and valeur:
            resultat[champ] = translate_text(valeur, target_lang=target_lang, source_lang=source_lang)
    return resultat


def request_language(request, *, default: str = "fr") -> str:
    """
    Langue cible pour CETTE requete : lit `?lang=` en priorite, puis
    l'en-tete Accept-Language, sinon `default`.

    DECISION DE CONCEPTION : ni UserProfile (acheteur) ni le profil vendeur
    n'ont de champ de langue persiste en base (seul CourierProfile en a
    un). Plutot que d'ajouter ce champ pour ce lot, la langue vient de CE
    QUE LE FRONTEND ENVOIE pour la session en cours (son i18next.language
    actuel, deja suivi cote client) — coherent avec le fonctionnement
    actuel du selecteur de langue (bascule manuelle, pas de preference de
    compte persistee pour acheteur/vendeur).
    """
    depuis_param = (request.query_params.get("lang") or "").strip().lower() if hasattr(request, "query_params") else ""
    if depuis_param in SUPPORTED_LANGUAGES:
        return depuis_param

    entete = (request.headers.get("Accept-Language") or "").strip().lower()
    for candidat in entete.split(","):
        code = candidat.split(";")[0].strip()[:2]
        if code in SUPPORTED_LANGUAGES:
            return code

    return default
