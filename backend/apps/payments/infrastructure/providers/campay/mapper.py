# backend/apps/payments/infrastructure/providers/campay/mapper.py
# Traduction CamPay <-> domaine BelivaY.
#
# Ce fichier isole TOUTE la connaissance du format CamPay. Si CamPay change
# un nom de champ, seul ce fichier bouge.
#
# STRUCTURE D'UNE TRANSACTION CAMPAY
#   Confirmee par la reponse de /mass_payout_status/ :
#
#   reference           UUID CamPay de la transaction
#   status              SUCCESSFUL | FAILED | PENDING
#   amount              montant, sous forme de CHAINE ("0.00")
#   currency            XAF
#   operator            MTN | ORANGE
#   code                code operateur ("D260612W0011SN")
#   operator_reference  reference cote operateur
#   endpoint            collect | withdraw
#   signature           JWT HS256 — voir webhooks/signature.py
#   external_reference  NOTRE reference. Vaut la CHAINE "None" si absente
#   external_user       identifiant tiers optionnel
#   app_amount          montant net cote application
#   phone_number        numero implique
#   reason              motif d'echec. Vaut la CHAINE "None" si absent
#
# PIEGE : CamPay serialise les valeurs absentes par la chaine "None", pas par
# null. Un test `if payload.get("external_reference")` serait VRAI sur "None".

from __future__ import annotations

import uuid
from decimal import ROUND_FLOOR, Decimal, InvalidOperation

from ..base import ProviderStatus
from .errors import extract_error_code

#: Chaines que CamPay utilise pour representer l'absence de valeur.
NULL_STRINGS = frozenset({"None", "none", "null", "NULL", ""})

#: LE WEBHOOK NE SE DECLENCHE QUE SUR SUCCESSFUL OU FAILED.
#: Documentation : « Your callback url will be notified when a transaction
#: is SUCCESSFUL or FAILED. »
#: Consequence : une transaction bloquee en PENDING — acheteur qui n'a jamais
#: compose son code — ne genere AUCUN webhook. Le polling reste indispensable,
#: ce n'est pas un simple filet de securite.
WEBHOOK_TRIGGER_STATUSES = frozenset({"SUCCESSFUL", "FAILED"})

#: Traduction des statuts CamPay vers les statuts normalises du domaine.
STATUS_MAP = {
    "SUCCESSFUL": ProviderStatus.SUCCESSFUL,
    "SUCCESS": ProviderStatus.SUCCESSFUL,
    "FAILED": ProviderStatus.FAILED,
    "FAILURE": ProviderStatus.FAILED,
    "PENDING": ProviderStatus.PENDING,
    "PROCESSING": ProviderStatus.PENDING,
}


def clean(valeur) -> str:
    """Normalise une valeur CamPay. Les chaines 'None' deviennent vides."""
    if valeur is None:
        return ""
    texte = str(valeur).strip()
    return "" if texte in NULL_STRINGS else texte


def to_status(raw: str) -> ProviderStatus:
    """
    Traduit un statut CamPay.

    Un statut INCONNU devient UNKNOWN, jamais FAILED : conclure a l'echec
    sur un statut qu'on ne comprend pas peut declencher un remboursement
    ou un reessai sur une transaction pourtant reussie.
    """
    return STATUS_MAP.get(clean(raw).upper(), ProviderStatus.UNKNOWN)


def to_amount_xaf(valeur) -> int:
    """
    Convertit un montant CamPay en entier XAF.

    CamPay renvoie des chaines ("0.00"). Le franc CFA n'ayant pas de
    subdivision, la partie decimale doit valoir zero — sinon il y a un
    probleme de devise et on prefere lever plutot que de tronquer
    silencieusement de l'argent.
    """
    texte = clean(valeur)
    if not texte:
        return 0
    try:
        montant = Decimal(texte)
    except (InvalidOperation, ValueError):
        raise ValueError(f"Montant CamPay illisible : {valeur!r}")
    if montant != montant.to_integral_value():
        raise ValueError(
            f"Montant CamPay avec decimales non nulles : {valeur!r}. "
            "Le XAF n'a pas de subdivision — incoherence a investiguer."
        )
    return int(montant)


def parse_transaction(payload: dict) -> dict:
    """
    Normalise un objet transaction CamPay.

    Meme structure pour /transaction/{ref}/, le webhook et
    /mass_payout_status/. Un seul analyseur pour les trois.
    """
    if not isinstance(payload, dict):
        return {
            "provider_reference": "", "status": ProviderStatus.UNKNOWN,
            "raw_status": "", "amount_xaf": 0, "operator": "",
            "external_reference": "", "error_code": "", "error_message": "",
            "endpoint": "", "operator_code": "", "signature": "",
            "phone_number": "", "raw": {},
        }

    statut_brut = clean(payload.get("status"))
    motif = clean(payload.get("reason"))
    code_erreur = extract_error_code(payload) or extract_error_code({"message": motif})

    try:
        montant = to_amount_xaf(payload.get("amount"))
    except ValueError:
        montant = 0

    return {
        "provider_reference": clean(payload.get("reference")),
        "status": to_status(statut_brut),
        "raw_status": statut_brut,
        "amount_xaf": montant,
        "currency": clean(payload.get("currency")) or "XAF",
        "operator": clean(payload.get("operator")).upper(),
        "external_reference": clean(payload.get("external_reference")),
        "operator_code": clean(payload.get("code")),
        "operator_reference": clean(payload.get("operator_reference")),
        "endpoint": clean(payload.get("endpoint")).lower(),
        "signature": clean(payload.get("signature")),
        "phone_number": clean(payload.get("phone_number")),
        "app_amount": clean(payload.get("app_amount")),
        "error_code": code_erreur,
        "error_message": motif,
        "raw": payload,
    }


def build_collect_body(*, amount_xaf: int, msisdn: str, external_reference: str,
                       description: str = "", currency: str = "XAF") -> dict:
    """
    Corps d'une demande d'encaissement.

    Le montant est envoye en CHAINE d'ENTIER : CamPay refuse les decimales
    (code ER201). `external_reference` est NOTRE cle d'idempotence, elle
    nous revient dans le webhook et dans le statut.
    """
    if not isinstance(amount_xaf, int) or isinstance(amount_xaf, bool):
        raise ValueError("Le montant doit etre un entier.")
    if amount_xaf <= 0:
        raise ValueError("Le montant doit etre strictement positif.")
    return {
        "amount": str(amount_xaf),
        "currency": currency,
        "from": normalise_msisdn(msisdn),
        "description": (description or "BelivaY")[:120],
        "external_reference": external_reference,
    }


def new_withdraw_reference() -> str:
    """
    Genere une reference de versement au format exige par CamPay.

    La documentation de /withdraw/ impose explicitement un UUID4 :
        « external_reference : A valid UUID4. Each request should have a
          unique UUID. A request with a duplicate UUID will be rejected »

    Nos references lisibles (BLV-OUT-2026-000391) sont donc REFUSEES sur cet
    endpoint. On genere un UUID4 et on conserve la correspondance cote
    BelivaY, dans PayoutRequest.external_reference.
    """
    return str(uuid.uuid4())


def is_uuid4(valeur: str) -> bool:
    try:
        parse = uuid.UUID(str(valeur))
    except (ValueError, AttributeError, TypeError):
        return False
    return parse.version == 4


def build_withdraw_body(*, amount_xaf: int, msisdn: str, external_reference: str,
                        description: str = "") -> dict:
    """
    Corps d'un versement.

    CONTRAINTE CAMPAY : external_reference doit etre un UUID4 valide, sinon
    la requete est rejetee. Cette validation est faite ICI plutot que de
    laisser CamPay refuser un versement en production.

    NOTE SUR L'IDEMPOTENCE — la documentation se contredit :
      « This endpoint supports Idempotency on external_reference field.
        [...] you will get the results of the first request »
      puis, deux lignes plus bas :
      « A request with a duplicate UUID will be rejected »

    Rejouer un versement ne peut donc pas etre considere comme sur. Le code
    ne retente JAMAIS un versement : seule la reconciliation tranche.
    A confirmer aupres du support CamPay (Jalon A).
    """
    if not isinstance(amount_xaf, int) or isinstance(amount_xaf, bool):
        raise ValueError("Le montant doit etre un entier.")
    if amount_xaf <= 0:
        raise ValueError("Le montant doit etre strictement positif.")

    reference = (external_reference or "").strip()
    if reference and not is_uuid4(reference):
        raise ValueError(
            f"external_reference invalide pour /withdraw/ : {reference!r}. "
            "CamPay exige un UUID4 sur cet endpoint et rejette tout autre "
            "format. Utiliser mapper.new_withdraw_reference() et conserver "
            "la correspondance avec la reference lisible cote BelivaY."
        )

    return {
        "amount": str(amount_xaf),
        "to": normalise_msisdn(msisdn),
        "description": (description or "BelivaY")[:120],
        "external_reference": reference,
    }


def normalise_msisdn(msisdn: str) -> str:
    """
    Normalise un numero au format attendu : 237XXXXXXXXX.

    CamPay refuse les numeros sans code pays (ER101). On corrige ici plutot
    que de laisser l'acheteur echouer sur une erreur qu'on sait prevenir.
    """
    numero = "".join(c for c in (msisdn or "") if c.isdigit())
    if numero.startswith("00237"):
        numero = numero[2:]
    if len(numero) == 9 and numero[0] == "6":
        numero = "237" + numero
    return numero


def to_balance_xaf(valeur) -> int:
    """
    Convertit un SOLDE en entier XAF.

    Distincte de to_amount_xaf : un montant de transaction avec des decimales
    signale une incoherence de devise et doit lever. Un SOLDE, lui, peut
    revenir avec des decimales — la reponse reelle de /balance/ contient
    `total_balance: 0.0` et l'environnement de demonstration manipule des
    valeurs fractionnaires.

    On ARRONDIT A L'INFERIEUR : mieux vaut sous-estimer ce qu'on detient que
    le surestimer. Un solde surestime autoriserait un versement que le
    prestataire refuserait ensuite (ER301).
    """
    texte = clean(valeur)
    if not texte:
        return 0
    try:
        montant = Decimal(texte)
    except (InvalidOperation, ValueError):
        raise ValueError(f"Solde CamPay illisible : {valeur!r}")
    return int(montant.to_integral_value(rounding=ROUND_FLOOR))


#: Cles de la reponse /balance/ qui ne sont PAS le solde marchand.
#: Confirmees par un appel reel au bac a sable.
NON_MERCHANT_BALANCE_KEYS = frozenset({
    "utility_balance", "utility_commission_balance",
})


def parse_balance(payload: dict) -> dict:
    """
    Normalise la reponse de /balance/.

    REPONSE DU JALON A — confirmee par un appel reel :
        {"total_balance": 0.0, "mtn_balance": 0, "orange_balance": 0,
         "currency": "XAF", "utility_balance": 0.0,
         "utility_commission_balance": 0.0}

    CamPay EXPOSE bien un solde par operateur. Le mode nominal du plan
    comptable s'applique : les comptes 1011 et 1012 sont reconciliables.

    Les soldes `utility_*` concernent le service de transfert de credit
    telephonique et ne font PAS partie du solde marchand. Les inclure
    fausserait le controle de solvabilite.
    """
    if not isinstance(payload, dict):
        return {"total_xaf": 0, "per_operator": {},
                "per_operator_available": False, "raw": {}}

    par_operateur = {}
    for cle, valeur in payload.items():
        nom = str(cle).lower()
        if nom in NON_MERCHANT_BALANCE_KEYS:
            continue
        for operateur in ("MTN", "ORANGE"):
            if operateur.lower() in nom:
                try:
                    par_operateur[operateur] = to_balance_xaf(valeur)
                except (ValueError, TypeError):
                    continue

    total = 0
    for cle in ("total_balance", "total", "balance", "amount"):
        if cle in payload:
            try:
                total = to_balance_xaf(payload[cle])
                break
            except (ValueError, TypeError):
                continue
    if not total and par_operateur:
        total = sum(par_operateur.values())

    return {
        "total_xaf": total,
        "per_operator": par_operateur,
        "per_operator_available": bool(par_operateur),
        "utility_balance_xaf": _optional(payload, "utility_balance"),
        "raw": payload,
    }


def _optional(payload: dict, cle: str) -> int:
    try:
        return to_balance_xaf(payload.get(cle))
    except (ValueError, TypeError):
        return 0


# ─────────────────────────────────────────────────────────────────────────────
# HISTORIQUE — /api/history/
# ─────────────────────────────────────────────────────────────────────────────
#
# LIMITE STRUCTURELLE A CONNAITRE
#   La reponse de /history/ ne contient PAS external_reference. Elle expose
#   reference_uuid, code, operator_tx_code, description, external_user,
#   amount, charge_amount, debit, credit, status, phone_number, datetime.
#
#   Le rapprochement d'un versement a issue inconnue repose donc sur :
#     1. reference_uuid, si le prestataire avait deja repondu
#     2. le champ `description`, ou BelivaY place sa propre reference
#     3. numero + montant + fenetre temporelle — CANDIDAT seulement
#
#   C'est pour cette raison que `description` porte systematiquement la
#   reference BelivaY : sans ce marquage, aucun rapprochement fiable ne
#   serait possible a la lecture.

def parse_history_row(ligne: dict) -> dict:
    """Normalise une ligne d'historique CamPay."""
    if not isinstance(ligne, dict):
        return {}

    try:
        montant = to_amount_xaf(ligne.get("amount"))
    except (ValueError, TypeError):
        montant = 0

    # charge_amount est DECIMAL chez CamPay (0.05). On arrondit a l'inferieur :
    # sous-estimer une charge est plus sur que la surestimer.
    try:
        frais = to_balance_xaf(ligne.get("charge_amount"))
    except (ValueError, TypeError):
        frais = 0

    horodatage = None
    brut = clean(ligne.get("datetime"))
    if brut:
        try:
            from django.utils.dateparse import parse_datetime
            horodatage = parse_datetime(brut)
        except Exception:
            horodatage = None

    # debit > 0 signale une sortie de fonds : c'est un versement.
    endpoint = clean(ligne.get("endpoint")).lower()
    if not endpoint:
        try:
            endpoint = "withdraw" if float(ligne.get("debit") or 0) > 0 else "collect"
        except (TypeError, ValueError):
            endpoint = ""

    return {
        "provider_reference": clean(ligne.get("reference_uuid"))
                              or clean(ligne.get("reference")),
        "operator_code": clean(ligne.get("code")),
        "operator_tx_code": clean(ligne.get("operator_tx_code")),
        "status": clean(ligne.get("status")).upper(),
        "amount_xaf": montant,
        "fee_xaf": frais,
        "operator": clean(ligne.get("operator")).upper(),
        "phone_number": clean(ligne.get("phone_number")),
        "description": clean(ligne.get("description")),
        "external_user": clean(ligne.get("external_user")),
        "endpoint": endpoint,
        "occurred_at": horodatage,
        "raw": ligne,
    }


def parse_history(payload) -> list:
    """Normalise une reponse complete de /history/."""
    if isinstance(payload, dict):
        lignes = payload.get("data") or payload.get("results") or []
    elif isinstance(payload, list):
        lignes = payload
    else:
        return []
    return [parse_history_row(l) for l in lignes if isinstance(l, dict)]