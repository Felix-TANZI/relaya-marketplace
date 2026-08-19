# backend/apps/payments/config/change_control.py
# Maker-checker sur la configuration financiere.
#
# FLUX
#   1. Un operateur cree une demande (make)
#   2. Un approbateur DIFFERENT l'approuve (check)
#   3. L'application cree une NOUVELLE VERSION et cloture l'ancienne
#   4. Le retour arriere restaure l'etat precedent, toujours par nouvelle version
#
# Aucune etape ne modifie une version existante (principes P3 et P4).

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import (
    RelayCompensationRule,
    RiskPolicy,
    ConfigChangeRequest,
    DistributionRule,
    EscrowPolicy,
    FeeRule,
    GovernanceLevel,
    PayoutPolicy,
    ProviderConfig,
    SettlementCycle,
)

#: Modeles pilotables par demande de changement.
TARGET_MODELS = {
    "ProviderConfig": ProviderConfig,
    "FeeRule": FeeRule,
    "DistributionRule": DistributionRule,
    "EscrowPolicy": EscrowPolicy,
    "SettlementCycle": SettlementCycle,
    "PayoutPolicy": PayoutPolicy,
    "RelayCompensationRule": RelayCompensationRule,
    "RiskPolicy": RiskPolicy,
}

#: Champs geres par la base versionnee, jamais fournis dans un payload.
_MANAGED_FIELDS = {
    "id", "pk", "config_key", "version", "is_active",
    "valid_from", "valid_until", "created_by", "created_at",
}


class ChangeControlError(Exception):
    """Erreur du circuit de validation des changements."""


def resolve_model(target_model: str):
    modele = TARGET_MODELS.get(target_model)
    if modele is None:
        raise ChangeControlError(
            f"Modele cible inconnu : '{target_model}'. "
            f"Attendu parmi {', '.join(sorted(TARGET_MODELS))}."
        )
    return modele


def snapshot_of(instance) -> dict:
    """Serialise une version pour le retour arriere."""
    donnees = {}
    for champ in instance._meta.fields:
        if champ.name in {"id", "created_by"}:
            continue
        valeur = getattr(instance, champ.name)
        if hasattr(valeur, "isoformat"):
            valeur = valeur.isoformat()
        elif hasattr(valeur, "__float__") and not isinstance(valeur, (int, bool)):
            valeur = str(valeur)  # Decimal -> str, jamais float
        donnees[champ.name] = valeur
    return donnees


def compute_diff(avant: dict | None, apres: dict) -> dict:
    """Differences lisibles entre deux etats."""
    if avant is None:
        return {cle: {"avant": None, "apres": valeur} for cle, valeur in apres.items()}
    ecarts = {}
    for cle, valeur in apres.items():
        ancienne = avant.get(cle)
        if str(ancienne) != str(valeur):
            ecarts[cle] = {"avant": ancienne, "apres": valeur}
    return ecarts


# ─────────────────────────────────────────────────────────────────────────────
# 1. DEMANDE
# ─────────────────────────────────────────────────────────────────────────────

def request_change(
    *,
    target_model: str,
    target_key: str,
    payload: dict,
    justification: str,
    requested_by,
    action: str = ConfigChangeRequest.Action.UPDATE,
    effective_at=None,
) -> ConfigChangeRequest:
    """
    Cree une demande de changement. N'applique RIEN.

    La justification est obligatoire : une modification de parametre financier
    sans motif ecrit est inauditable.
    """
    modele = resolve_model(target_model)

    if not justification or not justification.strip():
        raise ChangeControlError(
            "La justification est obligatoire pour toute demande de changement."
        )

    inconnus = set(payload) - {
        c.name for c in modele._meta.fields
    } | (set(payload) & _MANAGED_FIELDS)
    if inconnus:
        raise ChangeControlError(
            f"Champs invalides ou geres automatiquement : {', '.join(sorted(inconnus))}."
        )

    actuelle = modele.current().filter(config_key=target_key).order_by("-version").first()
    ancien_snapshot = snapshot_of(actuelle) if actuelle else None

    if action == ConfigChangeRequest.Action.CREATE and actuelle is not None:
        raise ChangeControlError(
            f"Une version active existe deja pour '{target_key}'. "
            "Utiliser l'action UPDATE."
        )
    if action != ConfigChangeRequest.Action.CREATE and actuelle is None:
        raise ChangeControlError(
            f"Aucune version active pour '{target_key}'. Utiliser l'action CREATE."
        )

    return ConfigChangeRequest.objects.create(
        target_model=target_model,
        target_key=target_key,
        action=action,
        governance_level=modele.GOVERNANCE_LEVEL,
        payload=payload,
        previous_snapshot=ancien_snapshot,
        diff=compute_diff(ancien_snapshot, payload),
        justification=justification.strip(),
        requested_by=requested_by,
        effective_at=effective_at,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 2. APPROBATION
# ─────────────────────────────────────────────────────────────────────────────

def approve_change(demande: ConfigChangeRequest, approved_by, apply_now: bool = True):
    """
    Approuve une demande. Celui qui approuve n'est jamais celui qui demande.

    Le controle est double : ici en Python pour un message clair, et en base
    par une contrainte CHECK — un contournement par requete directe echoue aussi.

    Retourne le tuple (demande, version_appliquee).
    `version_appliquee` vaut None si l'application est differee.
    """
    if demande.status != ConfigChangeRequest.Status.PENDING:
        raise ChangeControlError(
            f"La demande {demande.reference} est en statut '{demande.status}', "
            "seules les demandes en attente peuvent etre approuvees."
        )

    if approved_by.id == demande.requested_by_id:
        raise ChangeControlError(
            "Separation des roles : le demandeur ne peut pas approuver "
            "sa propre demande. Un second valideur est requis."
        )

    if demande.governance_level == GovernanceLevel.N3 and not approved_by.is_superuser:
        raise ChangeControlError(
            "Ce parametre releve du referentiel (niveau N3) : "
            "seul un super-administrateur peut l'approuver."
        )

    demande.status = ConfigChangeRequest.Status.APPROVED
    demande.approved_by = approved_by
    demande.approved_at = timezone.now()
    demande.save(update_fields=["status", "approved_by", "approved_at"])

    differe = demande.effective_at and demande.effective_at > timezone.now()
    appliquee = None
    if apply_now and not differe:
        appliquee = apply_change(demande)

    return demande, appliquee


def reject_change(demande: ConfigChangeRequest, rejected_by, reason: str):
    if demande.status != ConfigChangeRequest.Status.PENDING:
        raise ChangeControlError("Seule une demande en attente peut etre rejetee.")
    if not reason or not reason.strip():
        raise ChangeControlError("Le motif de rejet est obligatoire.")
    if rejected_by.id == demande.requested_by_id:
        raise ChangeControlError("Le demandeur ne peut pas rejeter sa propre demande.")

    demande.status = ConfigChangeRequest.Status.REJECTED
    demande.rejection_reason = reason.strip()
    demande.approved_by = rejected_by
    demande.approved_at = timezone.now()
    demande.save(
        update_fields=["status", "rejection_reason", "approved_by", "approved_at"]
    )
    return demande


# ─────────────────────────────────────────────────────────────────────────────
# 3. APPLICATION
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def apply_change(demande: ConfigChangeRequest):
    """
    Applique une demande approuvee : cree une NOUVELLE VERSION.

    L'ancienne version est cloturee, jamais modifiee ni supprimee. Les
    transactions deja figees continuent de pointer vers elle (principe P3).
    """
    if demande.status != ConfigChangeRequest.Status.APPROVED:
        raise ChangeControlError(
            f"La demande {demande.reference} doit etre approuvee avant application "
            f"(statut actuel : {demande.status})."
        )

    modele = resolve_model(demande.target_model)
    maintenant = timezone.now()

    actuelle = (
        modele.objects.select_for_update()
        .filter(config_key=demande.target_key, is_active=True)
        .order_by("-version")
        .first()
    )

    if demande.action == ConfigChangeRequest.Action.DEACTIVATE:
        if actuelle is None:
            raise ChangeControlError(
                f"Aucune version active a desactiver pour '{demande.target_key}'."
            )
        actuelle.close(at=maintenant)
        demande.status = ConfigChangeRequest.Status.APPLIED
        demande.applied_at = maintenant
        demande.applied_version = actuelle.version
        demande.save(update_fields=["status", "applied_at", "applied_version"])
        return actuelle

    champs = {
        c.name for c in modele._meta.fields
    } - _MANAGED_FIELDS

    valeurs = {}
    if actuelle is not None:
        for champ in champs:
            valeurs[champ] = getattr(actuelle, champ)
    valeurs.update({k: v for k, v in demande.payload.items() if k in champs})

    nouvelle = modele(
        config_key=demande.target_key,
        version=modele.next_version_for(demande.target_key),
        is_active=True,
        valid_from=demande.effective_at or maintenant,
        created_by=demande.approved_by,
        **valeurs,
    )
    nouvelle.full_clean(exclude=["created_by"])
    nouvelle.save()

    if actuelle is not None:
        actuelle.close(at=nouvelle.valid_from)

    demande.status = ConfigChangeRequest.Status.APPLIED
    demande.applied_at = maintenant
    demande.applied_version = nouvelle.version
    demande.save(update_fields=["status", "applied_at", "applied_version"])

    return nouvelle


# ─────────────────────────────────────────────────────────────────────────────
# 4. RETOUR ARRIERE
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def rollback_change(demande: ConfigChangeRequest, rolled_back_by, reason: str):
    """
    Restaure l'etat precedent — par CREATION D'UNE NOUVELLE VERSION.

    On ne "defait" jamais : on avance vers l'etat anterieur. L'historique
    reste complet et la piste d'audit intacte.
    """
    if demande.status != ConfigChangeRequest.Status.APPLIED:
        raise ChangeControlError("Seule une demande appliquee peut etre annulee.")
    if not demande.previous_snapshot:
        raise ChangeControlError(
            f"La demande {demande.reference} n'a pas d'etat precedent "
            "(il s'agissait d'une creation initiale)."
        )
    if not reason or not reason.strip():
        raise ChangeControlError("Le motif d'annulation est obligatoire.")

    modele = resolve_model(demande.target_model)
    champs = {c.name for c in modele._meta.fields} - _MANAGED_FIELDS
    restaure = {
        cle: valeur
        for cle, valeur in demande.previous_snapshot.items()
        if cle in champs
    }

    retour = ConfigChangeRequest.objects.create(
        target_model=demande.target_model,
        target_key=demande.target_key,
        action=ConfigChangeRequest.Action.UPDATE,
        governance_level=demande.governance_level,
        payload=restaure,
        previous_snapshot=demande.payload,
        diff=compute_diff(demande.payload, restaure),
        justification=f"Retour arriere de {demande.reference}. {reason.strip()}",
        requested_by=demande.requested_by,
        status=ConfigChangeRequest.Status.APPROVED,
        approved_by=rolled_back_by,
        approved_at=timezone.now(),
    )
    nouvelle = apply_change(retour)

    demande.status = ConfigChangeRequest.Status.ROLLED_BACK
    demande.save(update_fields=["status"])

    return nouvelle