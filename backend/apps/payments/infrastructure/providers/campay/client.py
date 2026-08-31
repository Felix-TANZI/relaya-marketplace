# backend/apps/payments/infrastructure/providers/campay/client.py
# Client HTTP CamPay.
#
# TROIS REGLES DE ROBUSTESSE
#
#   1. Timeouts DISTINCTS connexion / lecture.
#      Un serveur qui accepte la connexion puis ne repond plus est le cas
#      le plus frequent ; un timeout unique le confond avec une panne reseau.
#
#   2. Retry UNIQUEMENT sur erreur reseau et 5xx, et JAMAIS sur /withdraw/.
#      Retenter un versement dont l'issue est inconnue peut doubler un
#      versement reel. C'est irrecuperable.
#
#   3. Coupe-circuit apres N echecs consecutifs.
#      Evite de marteler un prestataire en panne et de bloquer les workers.
#
# LES SECRETS NE SONT JAMAIS JOURNALISES. Le jeton est expurge de tous les
# payloads stockes.

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

import requests
from django.conf import settings
from django.core.cache import cache

from ..base import ProviderError, ProviderTimeout, ProviderUnavailable

logger = logging.getLogger("apps.payments.campay")

SANDBOX_BASE_URL = "https://demo.campay.net/api"
LIVE_BASE_URL = "https://campay.net/api"

#: En-tetes dont la valeur ne doit JAMAIS apparaitre dans un journal.
SECRET_HEADERS = frozenset({"authorization", "x-api-key"})

#: Champs de payload a expurger.
SECRET_FIELDS = frozenset({
    "token", "access_token", "username", "password", "app_id",
    "permanent_token", "webhook_key",
})

#: Methodes rejouables. /withdraw/ en est volontairement absent.
IDEMPOTENT_PATHS = ("/transaction/", "/balance/", "/history/", "/holder_info/")


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
    """
    Coupe-circuit simple, adosse au cache partage.

    Apres `threshold` echecs consecutifs, le circuit s'ouvre pour
    `cooldown_s` secondes : tout appel est refuse immediatement, sans
    solliciter le prestataire.
    """

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


class CampayClient:
    """Client HTTP bas niveau. Ne connait rien du metier BelivaY."""

    def __init__(
        self,
        *,
        base_url: str = "",
        token: str = "",
        connect_timeout: float = 5.0,
        read_timeout: float = 30.0,
        max_attempts: int = 3,
        backoff_seconds: tuple = (1, 3, 8),
        breaker: CircuitBreaker | None = None,
    ):
        self.base_url = (base_url or SANDBOX_BASE_URL).rstrip("/")
        self.token = token or ""
        self.connect_timeout = connect_timeout
        self.read_timeout = read_timeout
        self.max_attempts = max(1, max_attempts)
        self.backoff_seconds = backoff_seconds
        self.breaker = breaker or CircuitBreaker("campay")
        self._session = requests.Session()

    # ── En-tetes ─────────────────────────────────────────────────────────────

    def _headers(self) -> dict:
        if not self.token:
            raise ProviderUnavailable(
                "Jeton CamPay absent. Definir CAMPAY_TOKEN en variable "
                "d'environnement. Le jeton n'est JAMAIS stocke en base."
            )
        return {
            "Authorization": f"Token {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "BelivaY/1.0 (+https://belivay.com)",
        }

    # ── Appel ────────────────────────────────────────────────────────────────

    def request(self, method: str, path: str, *, json_body: dict | None = None,
                allow_retry: bool | None = None) -> HttpResponse:
        """
        Emet un appel HTTP.

        `allow_retry` : si None, deduit du chemin. Seules les operations
        idempotentes sont rejouables. /withdraw/ ne l'est JAMAIS.
        """
        if self.breaker.is_open():
            raise ProviderUnavailable(
                f"Coupe-circuit ouvert sur CamPay. Aucun appel emis. "
                f"Reessayer dans {self.breaker.cooldown_s}s."
            )

        if allow_retry is None:
            allow_retry = any(path.startswith(p) for p in IDEMPOTENT_PATHS)

        url = f"{self.base_url}{path}"
        tentatives = self.max_attempts if allow_retry else 1
        derniere_erreur = None

        for essai in range(tentatives):
            debut = time.monotonic()
            try:
                reponse = self._session.request(
                    method=method,
                    url=url,
                    json=json_body,
                    headers=self._headers(),
                    timeout=(self.connect_timeout, self.read_timeout),
                )
            except requests.Timeout as exc:
                derniere_erreur = ProviderTimeout(
                    f"CamPay : delai depasse sur {method} {path}. "
                    "L'issue de l'operation reste INCONNUE."
                )
                logger.warning("CamPay timeout %s %s (essai %s/%s)",
                               method, path, essai + 1, tentatives)
            except requests.RequestException as exc:
                derniere_erreur = ProviderError(
                    f"CamPay : erreur reseau sur {method} {path} — {exc}"
                )
                logger.warning("CamPay erreur reseau %s %s : %s", method, path, exc)
            else:
                duree = int((time.monotonic() - debut) * 1000)

                if reponse.status_code >= 500:
                    derniere_erreur = ProviderError(
                        f"CamPay : erreur serveur {reponse.status_code} sur {path}."
                    )
                    logger.warning("CamPay %s sur %s (essai %s/%s)",
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
        raise derniere_erreur or ProviderError("CamPay : echec sans cause identifiee.")

    @staticmethod
    def _parse(reponse) -> dict:
        try:
            donnees = reponse.json()
        except ValueError:
            return {"_raw": reponse.text[:2000], "_not_json": True}
        if isinstance(donnees, dict):
            return donnees
        return {"_list": donnees}

    # ── Raccourcis ───────────────────────────────────────────────────────────

    def post(self, path: str, body: dict, *, allow_retry: bool | None = None):
        return self.request("POST", path, json_body=body, allow_retry=allow_retry)

    def get(self, path: str, *, allow_retry: bool | None = None):
        return self.request("GET", path, allow_retry=allow_retry)

    def close(self):
        self._session.close()


# ─────────────────────────────────────────────────────────────────────────────
# FABRIQUE
# ─────────────────────────────────────────────────────────────────────────────

def build_client(config=None) -> CampayClient:
    """
    Construit un client depuis la configuration en base et l'environnement.

    Le COMPORTEMENT vient de ProviderConfig (administrable).
    Les SECRETS viennent de l'environnement (jamais administrables).
    """
    mode_live = bool(config and getattr(config, "mode", "") == "LIVE")

    base = LIVE_BASE_URL if mode_live else SANDBOX_BASE_URL
    token = (
        getattr(settings, "CAMPAY_TOKEN_LIVE", "") if mode_live
        else getattr(settings, "CAMPAY_TOKEN_SANDBOX", "")
    ) or getattr(settings, "CAMPAY_TOKEN", "")

    politique = (getattr(config, "retry_policy", None) or {}) if config else {}
    backoff = tuple(politique.get("backoff_seconds") or (1, 3, 8))

    return CampayClient(
        base_url=base,
        token=token,
        connect_timeout=float(getattr(config, "collect_timeout_s", 5) or 5) / 6 or 5.0,
        read_timeout=float(getattr(config, "collect_timeout_s", 30) or 30),
        max_attempts=int(politique.get("max_attempts") or 3),
        backoff_seconds=backoff,
        breaker=CircuitBreaker(
            "campay-live" if mode_live else "campay-sandbox",
            threshold=int(getattr(config, "circuit_breaker_threshold", 5) or 5),
        ),
    )