# backend/apps/payments/infrastructure/providers/cinetpay/client.py
# Client HTTP CinetPay.
#
# CONTRAT PARTIELLEMENT VERIFIE CONTRE LE VRAI SANDBOX (voir cinetpay_selftest).
#
# Premiere hypothese (apikey + site_id envoyes en clair dans le corps JSON de
# chaque requete, sur api-checkout.cinetpay.com) s'est revelee FAUSSE : ce
# domaine ne resout meme pas en DNS. Confirme empiriquement a la place :
#   - api.cinetpay.net (sandbox) / api.cinetpay.co (production) existent bien.
#   - POST /v1/oauth/login existe (422 INVALID_PARAMS, pas 404) : CinetPay
#     utilise un flux d'authentification a DEUX temps — connexion avec
#     apikey + mot de passe API pour obtenir un jeton, puis ce jeton en
#     en-tete Authorization pour les appels de paiement — plutot que le
#     modele "identifiants dans chaque corps de requete" suppose au depart.
#   - Le compte BelivaY n'a pas encore defini son mot de passe API (tableau
#     de bord CinetPay -> "API & securite" -> "Definir un mot de passe API") :
#     tant que ce n'est pas fait, /v1/oauth/login refusera tout appel.
#
# ENCORE A CONFIRMER (une fois le mot de passe API defini) :
#   - Nom exact des champs de connexion (apikey/apiKey, password/apiPassword).
#   - Forme de la reponse de connexion (ou se trouve le jeton, sa duree de vie).
#   - Chemin et forme exacte de l'appel d'initialisation de paiement.
# Chacun sera verifie par `python manage.py cinetpay_selftest --login` puis
# `--checkout` contre le vrai bac a sable, jamais suppose plus loin que
# necessaire — meme discipline que campay/client.py.
#
# MEME DISCIPLINE DE ROBUSTESSE QUE CAMPAY :
#   1. Timeouts distincts connexion / lecture.
#   2. Retry uniquement sur erreur reseau et 5xx.
#   3. Coupe-circuit apres N echecs consecutifs.
# Les secrets ne sont jamais journalises.
#
# CircuitBreaker est DUPLIQUE depuis campay/client.py plutot que partage :
# chaque prestataire reste un module independant (voir registry.py), et ça
# evite de toucher au code CamPay, deja en production, pour l'ajout d'un
# second prestataire sans rapport.

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

import requests
from django.conf import settings
from django.core.cache import cache

from ..base import ProviderError, ProviderTimeout, ProviderUnavailable

logger = logging.getLogger("apps.payments.cinetpay")

#: Confirmes par resolution DNS reelle — voir l'historique ci-dessus.
BASE_URL_SANDBOX = "https://api.cinetpay.net"
BASE_URL_LIVE = "https://api.cinetpay.co"

#: Duree de vie supposee du jeton si la reponse de connexion n'en indique
#: aucune — CONSERVATEUR (rafraichit plus souvent que necessaire plutot que
#: de risquer un jeton perime en plein appel de paiement).
DEFAULT_TOKEN_TTL_S = 15 * 60

#: Champs de payload a expurger avant toute journalisation.
SECRET_FIELDS = frozenset({
    "apikey", "api_key", "apikey", "apipassword", "api_password",
    "password", "access_token", "token",
})


def redact(donnees):
    """Expurge recursivement les valeurs sensibles avant journalisation."""
    if isinstance(donnees, dict):
        return {
            cle: ("***" if cle.lower() in SECRET_FIELDS else redact(valeur))
            for cle, valeur in donnees.items()
        }
    if isinstance(donnees, list):
        return [redact(v) for v in donnees]
    if isinstance(donnees, str) and len(donnees) > 200:
        return donnees[:200] + "…"
    return donnees


@dataclass(frozen=True)
class HttpResponse:
    status_code: int
    payload: dict
    raw_text: str
    elapsed_ms: int


class CircuitBreaker:
    """Coupe-circuit simple, adosse au cache partage. Voir campay/client.py."""

    def __init__(self, name: str, threshold: int = 5, cooldown_s: int = 60):
        self.name = name
        self.threshold = max(1, threshold)
        self.cooldown_s = cooldown_s

    @property
    def _key(self) -> str:
        return f"belivay:payments:breaker:{self.name}"

    @property
    def _open_key(self) -> str:
        return f"{self._key}:open"

    def is_open(self) -> bool:
        return bool(cache.get(self._open_key))

    def record_success(self) -> None:
        cache.delete(self._key)
        cache.delete(self._open_key)

    def record_failure(self) -> int:
        echecs = (cache.get(self._key) or 0) + 1
        cache.set(self._key, echecs, timeout=self.cooldown_s * 5)
        if echecs >= self.threshold:
            cache.set(self._open_key, True, timeout=self.cooldown_s)
            logger.error(
                "Coupe-circuit OUVERT pour %s apres %s echecs consecutifs. "
                "Aucun appel pendant %ss.",
                self.name, echecs, self.cooldown_s,
            )
        return echecs

    def reset(self) -> None:
        self.record_success()


class CinetPayAuthError(ProviderError):
    """Connexion (/v1/oauth/login) refusee — cle ou mot de passe API invalide."""


class CinetPayClient:
    """
    Client HTTP bas niveau. Ne connait rien du metier BelivaY.

    Flux d'authentification a deux temps (confirme empiriquement) :
    `login()` echange apikey + mot de passe API contre un jeton, ensuite
    utilise en en-tete `Authorization: Bearer <jeton>` sur les appels
    metier. Le jeton est mis en cache (Django cache, partage entre workers)
    pour eviter une connexion a chaque appel.
    """

    def __init__(
        self,
        *,
        base_url: str = "",
        apikey: str = "",
        api_password: str = "",
        mode_label: str = "sandbox",
        connect_timeout: float = 5.0,
        read_timeout: float = 30.0,
        max_attempts: int = 3,
        backoff_seconds: tuple = (1, 3, 8),
        breaker: CircuitBreaker | None = None,
    ):
        self.base_url = (base_url or BASE_URL_SANDBOX).rstrip("/")
        self.apikey = apikey or ""
        self.api_password = api_password or ""
        self.mode_label = mode_label
        self.connect_timeout = connect_timeout
        self.read_timeout = read_timeout
        self.max_attempts = max(1, max_attempts)
        self.backoff_seconds = backoff_seconds
        self.breaker = breaker or CircuitBreaker("cinetpay")
        self._session = requests.Session()

    # ── Jeton — mis en cache entre les appels ────────────────────────────────

    @property
    def _token_cache_key(self) -> str:
        return f"belivay:payments:cinetpay:token:{self.mode_label}"

    def _cached_token(self) -> str:
        return cache.get(self._token_cache_key) or ""

    def login(self, *, force: bool = False) -> str:
        """
        Echange apikey + mot de passe API contre un jeton d'acces.

        FORME DE LA REPONSE NON ENCORE CONFIRMEE : plusieurs emplacements
        possibles pour le jeton sont tentes (voir `candidats` ci-dessous).
        Si aucun ne correspond, l'exception liste la reponse brute pour
        corriger ce code immediatement plutot que d'echouer silencieusement.
        """
        if not force:
            jeton = self._cached_token()
            if jeton:
                return jeton

        if not self.apikey or not self.api_password:
            raise ProviderUnavailable(
                "Identifiants CinetPay incomplets. Definir CINETPAY_API_KEY_* "
                "ET CINETPAY_API_PASSWORD_* (mot de passe API defini depuis le "
                "tableau de bord CinetPay, section API & securite) en "
                "variable d'environnement. Jamais stockes en base."
            )

        url = f"{self.base_url}/v1/oauth/login"
        try:
            reponse = self._session.request(
                method="POST",
                url=url,
                # Noms de champs CONFIRMES empiriquement (snake_case) : les
                # variantes apikey/apiPassword, apiKey/apiSecret et
                # client_id/client_secret renvoient toutes INVALID_PARAMS ;
                # seule api_key/api_password passe la validation des
                # parametres (obtient ensuite NOT_ALLOWED pour IP non
                # autorisee, pas INVALID_PARAMS — preuve que ces noms sont
                # les bons).
                json={"api_key": self.apikey, "api_password": self.api_password},
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                timeout=(self.connect_timeout, self.read_timeout),
            )
        except requests.Timeout as exc:
            raise ProviderTimeout(
                "CinetPay : delai depasse sur la connexion (/v1/oauth/login)."
            ) from exc
        except requests.RequestException as exc:
            raise ProviderError(
                f"CinetPay : erreur reseau sur la connexion — {exc}"
            ) from exc

        donnees = self._parse(reponse)

        if reponse.status_code >= 400:
            if donnees.get("code") == 2011:
                raise CinetPayAuthError(
                    "CinetPay : IP non autorisee (code 2011, "
                    f"{redact(donnees)}). L'adresse IP sortante de ce serveur "
                    "doit etre ajoutee a la liste blanche du tableau de bord "
                    "CinetPay (API & securite -> Liste Blanche IP)."
                )
            raise CinetPayAuthError(
                f"CinetPay : connexion refusee (HTTP {reponse.status_code}) — "
                f"{redact(donnees)}. Verifier CINETPAY_API_KEY_* et "
                "CINETPAY_API_PASSWORD_* (le mot de passe API doit avoir ete "
                "defini depuis le tableau de bord, section API & securite)."
            )

        # Emplacements plausibles du jeton — a corriger des la premiere
        # reponse reelle obtenue via `cinetpay_selftest --login`.
        candidats = [
            donnees.get("access_token"),
            donnees.get("token"),
            (donnees.get("data") or {}).get("access_token") if isinstance(donnees.get("data"), dict) else None,
            (donnees.get("data") or {}).get("token") if isinstance(donnees.get("data"), dict) else None,
        ]
        jeton = next((c for c in candidats if isinstance(c, str) and c), "")

        if not jeton:
            raise ProviderError(
                "CinetPay : connexion acceptee mais aucun jeton reconnu dans "
                f"la reponse — {redact(donnees)}. Corriger client.login() "
                "avec le vrai nom de champ."
            )

        duree_vie = DEFAULT_TOKEN_TTL_S
        for cle in ("expires_in", "expiresIn"):
            valeur = donnees.get(cle)
            if isinstance(valeur, (int, float)) and valeur > 0:
                duree_vie = int(valeur)
                break

        # Marge de securite : on rafraichit avant l'expiration reelle plutot
        # que d'echouer un appel de paiement en plein milieu.
        cache.set(self._token_cache_key, jeton, timeout=max(30, duree_vie - 60))
        return jeton

    # ── Appel ────────────────────────────────────────────────────────────────

    def request(self, method: str, path: str, *, json_body: dict | None = None,
                allow_retry: bool | None = None, _retried_after_login: bool = False) -> HttpResponse:
        """
        Emet un appel HTTP authentifie par jeton Bearer.

        Sur un 401, une SEULE reconnexion est tentee (le jeton en cache a pu
        expirer) — jamais en boucle, pour ne pas marteler /v1/oauth/login si
        les identifiants sont reellement invalides.
        """
        if self.breaker.is_open():
            raise ProviderUnavailable(
                f"Coupe-circuit ouvert sur CinetPay. Aucun appel emis. "
                f"Reessayer dans {self.breaker.cooldown_s}s."
            )

        jeton = self.login()
        tentatives = self.max_attempts if allow_retry is not False else 1
        url = f"{self.base_url}{path}"
        derniere_erreur = None

        for essai in range(tentatives):
            debut = time.monotonic()
            try:
                reponse = self._session.request(
                    method=method,
                    url=url,
                    json=json_body or {},
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": f"Bearer {jeton}",
                        "User-Agent": "BelivaY/1.0 (+https://belivay.com)",
                    },
                    timeout=(self.connect_timeout, self.read_timeout),
                )
            except requests.Timeout:
                derniere_erreur = ProviderTimeout(
                    f"CinetPay : delai depasse sur {method} {path}. "
                    "L'issue de l'operation reste INCONNUE."
                )
                logger.warning("CinetPay timeout %s %s (essai %s/%s)",
                               method, path, essai + 1, tentatives)
            except requests.RequestException as exc:
                derniere_erreur = ProviderError(
                    f"CinetPay : erreur reseau sur {method} {path} — {exc}"
                )
                logger.warning("CinetPay erreur reseau %s %s : %s", method, path, exc)
            else:
                duree = int((time.monotonic() - debut) * 1000)

                if reponse.status_code == 401 and not _retried_after_login:
                    # Jeton probablement expire malgre le cache : une seule
                    # reconnexion forcee, jamais en boucle.
                    self.login(force=True)
                    return self.request(
                        method, path, json_body=json_body, allow_retry=allow_retry,
                        _retried_after_login=True,
                    )

                if reponse.status_code >= 500:
                    derniere_erreur = ProviderError(
                        f"CinetPay : erreur serveur {reponse.status_code} sur {path}."
                    )
                    logger.warning("CinetPay %s sur %s (essai %s/%s)",
                                   reponse.status_code, path, essai + 1, tentatives)
                else:
                    self.breaker.record_success()
                    return HttpResponse(
                        status_code=reponse.status_code,
                        payload=self._parse(reponse),
                        raw_text=reponse.text[:4000],
                        elapsed_ms=duree,
                    )

            if essai < tentatives - 1:
                attente = self.backoff_seconds[min(essai, len(self.backoff_seconds) - 1)]
                time.sleep(attente)

        self.breaker.record_failure()
        raise derniere_erreur or ProviderError("CinetPay : echec sans cause identifiee.")

    @staticmethod
    def _parse(reponse) -> dict:
        try:
            donnees = reponse.json()
        except ValueError:
            return {"_raw": reponse.text[:2000], "_not_json": True}
        if isinstance(donnees, dict):
            return donnees
        return {"_list": donnees}

    def post(self, path: str, body: dict, *, allow_retry: bool | None = None):
        return self.request("POST", path, json_body=body, allow_retry=allow_retry)

    def close(self):
        self._session.close()


# ─────────────────────────────────────────────────────────────────────────────
# FABRIQUE
# ─────────────────────────────────────────────────────────────────────────────

def build_client(config=None) -> CinetPayClient:
    """
    Construit un client depuis la configuration en base et l'environnement.

    Le COMPORTEMENT vient de ProviderConfig (administrable).
    Les SECRETS viennent de l'environnement (jamais administrables).
    """
    mode_live = bool(config and getattr(config, "mode", "") == "LIVE")

    apikey = (
        getattr(settings, "CINETPAY_API_KEY_LIVE", "") if mode_live
        else getattr(settings, "CINETPAY_API_KEY_SANDBOX", "")
    ) or getattr(settings, "CINETPAY_API_KEY", "")
    api_password = (
        getattr(settings, "CINETPAY_API_PASSWORD_LIVE", "") if mode_live
        else getattr(settings, "CINETPAY_API_PASSWORD_SANDBOX", "")
    ) or getattr(settings, "CINETPAY_API_PASSWORD", "")

    politique = (getattr(config, "retry_policy", None) or {}) if config else {}
    backoff = tuple(politique.get("backoff_seconds") or (1, 3, 8))

    return CinetPayClient(
        base_url=BASE_URL_LIVE if mode_live else BASE_URL_SANDBOX,
        apikey=apikey,
        api_password=api_password,
        mode_label="live" if mode_live else "sandbox",
        connect_timeout=float(getattr(config, "collect_timeout_s", 5) or 5) / 6 or 5.0,
        read_timeout=float(getattr(config, "collect_timeout_s", 30) or 30),
        max_attempts=int(politique.get("max_attempts") or 3),
        backoff_seconds=backoff,
        breaker=CircuitBreaker(
            "cinetpay-live" if mode_live else "cinetpay-sandbox",
            threshold=int(getattr(config, "circuit_breaker_threshold", 5) or 5),
        ),
    )
