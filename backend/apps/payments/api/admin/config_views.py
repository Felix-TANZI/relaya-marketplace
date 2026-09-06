# backend/apps/payments/api/admin/config_views.py
# La configuration financiere, pilotable depuis l'interface.
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI CES VUES EXISTENT
#
# Les huit modeles de configuration n'etaient accessibles que depuis
# l'administration Django. Chaque reglage — passer CamPay en production,
# ajuster un tarif relais, changer un minimum de versement — imposait de
# quitter l'interface.
#
# Ces vues exposent la MEME chose, avec le MEME circuit d'approbation. Rien
# n'est assoupli : `request_change` reste le seul chemin, et la contrainte
# maker-checker est appliquee en base.
#
# ─────────────────────────────────────────────────────────────────────────────
# AUCUNE ECRITURE DIRECTE
#
# Il n'existe volontairement PAS de vue de modification. Un `PATCH` sur une
# politique de versement contournerait la gouvernance, et c'est exactement
# ce que le module existe pour empecher.
#
# Toute modification passe par une demande, approuvee par un TIERS.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.config.change_control import (
    ChangeControlError, approve_change, reject_change, request_change,
    rollback_change,
)
from apps.payments.config.models import (
    ConfigChangeRequest, DistributionRule, EscrowPolicy, FeeRule,
    PayoutPolicy, ProviderConfig, RelayCompensationRule, RiskPolicy,
    SettlementCycle,
)
from apps.payments.config.delivery_pricing import (
    CourierIndemnityRule, DeliveryPricingRule,
)

from .config_schema import describe_model
from .permissions import CanApproveMoney, IsFinanceStaff

TAG = "Admin — Configuration"

#: Les huit modeles gouvernes, dans l'ordre ou ils comptent pour un
#: exploitant : d'abord ce qui encaisse, ensuite ce qui verse.
MODELES = {
    "provider": {
        "model": ProviderConfig,
        "label": "Prestataire de paiement",
        "hint": "Qui encaisse et verse l'argent, et dans quelles bornes.",
    },
    "fees": {
        "model": FeeRule,
        "label": "Frais prestataire",
        "hint": "Ce que coute chaque operation, et qui le supporte.",
    },
    "distribution": {
        "model": DistributionRule,
        "label": "Repartition des paiements",
        "hint": "Qui recoit quoi sur chaque composant economique.",
    },
    "escrow": {
        "model": EscrowPolicy,
        "label": "Politique de sequestre",
        "hint": "Combien de temps l'argent reste protege.",
    },
    "cycles": {
        "model": SettlementCycle,
        "label": "Cycles de reglement",
        "hint": "A quelle date les partenaires sont regles.",
    },
    "payout": {
        "model": PayoutPolicy,
        "label": "Politique de versement",
        "hint": "Combien d'approbations, et dans quelles bornes.",
    },
    "relay": {
        "model": RelayCompensationRule,
        "label": "Remuneration points relais",
        "hint": "Le tarif contractuel par categorie de colis.",
    },
    "delivery_pricing": {
        "model": DeliveryPricingRule,
        "label": "Frais de livraison",
        "hint": "Ce que l'acheteur paie pour etre livre, selon le mode et "
                "le nombre de vendeurs.",
    },
    "courier_indemnity": {
        "model": CourierIndemnityRule,
        "label": "Indemnites livreur",
        "hint": "Montants dus a un livreur en dehors de la course — course "
                "annulee, attente prolongee.",
    },
    "risk": {
        "model": RiskPolicy,
        "label": "Politique de risque",
        "hint": "Ce qui declenche une alerte, et ce qui bloque.",
    },
}


def _serialiser(objet) -> dict:
    """
    Represente une configuration sans exposer ses rouages internes.

    On expose les champs metier, pas les cles etrangeres ni les colonnes
    techniques : l'interface affiche des reglages, pas un schema de base.
    """
    ignores = {"id", "created_by", "created_by_id", "created_at",
               "updated_at", "superseded_by", "superseded_by_id"}
    donnees = {}
    for champ in objet._meta.get_fields():
        if not hasattr(champ, "attname") or champ.name in ignores:
            continue
        valeur = getattr(objet, champ.name, None)
        # Les Decimal et les dates ne survivent pas a JSON tels quels.
        if hasattr(valeur, "isoformat"):
            valeur = valeur.isoformat()
        elif valeur is not None and not isinstance(
            valeur, (str, int, float, bool, list, dict)
        ):
            valeur = str(valeur)
        donnees[champ.name] = valeur
    return donnees


def _resume(cle: str, entree: dict) -> dict:
    """
    Une ligne de la liste : le nom, la valeur lisible, et ce qui cloche.

    ─────────────────────────────────────────────────────────────────────
    LA VALEUR AVANT LE NOM

    Django oblige a ouvrir chaque objet pour savoir ce qu'il contient. Ici
    « CamPay · bac a sable · min 1 » se lit d'un coup d'oeil — c'est la
    raison d'etre de cet ecran.
    ─────────────────────────────────────────────────────────────────────
    """
    modele = entree["model"]
    actifs = list(modele.current())

    alertes = []
    resume = ""

    if cle == "provider":
        actif = next((p for p in actifs if p.is_enabled), None)
        if actif is not None:
            resume = f"{actif.provider_code} · min {actif.min_amount_xaf}"
            if actif.mode != "LIVE":
                alertes.append("bac à sable")
            if actif.min_amount_xaf and actif.min_amount_xaf < 100:
                alertes.append(f"min {actif.min_amount_xaf} FCFA")
        else:
            alertes.append("aucun prestataire actif")

    elif cle == "payout":
        politique = actifs[0] if actifs else None
        if politique is not None:
            resume = (f"{politique.required_approvals} approbation(s)"
                      f" · double au-dela de "
                      f"{politique.dual_approval_threshold_xaf}")
            if politique.min_payout_xaf and politique.min_payout_xaf < 100:
                alertes.append(f"min {politique.min_payout_xaf} FCFA")

    elif cle == "escrow":
        politique = actifs[0] if actifs else None
        if politique is not None:
            resume = (f"Auto-confirmation {politique.auto_confirm_hours} h"
                      f" · liberation {politique.release_delay_hours} h")

    elif cle == "relay":
        negocies = sum(1 for r in actifs if r.payee_code)
        refuses = sum(1 for r in actifs if not r.is_accepted)
        resume = f"{len(actifs)} regle(s)"
        if negocies:
            resume += f" · {negocies} negocie(s)"
        if refuses:
            resume += f" · {refuses} categorie(s) refusee(s)"

    elif cle == "risk":
        politique = actifs[0] if actifs else None
        if politique is not None:
            bloque = getattr(politique, "auto_block_enabled", False)
            resume = ("Blocage automatique actif" if bloque
                      else "Marquage seul · blocage desactive")

    else:
        resume = f"{len(actifs)} regle(s) active(s)"

    return {
        "key": cle,
        "label": entree["label"],
        "hint": entree["hint"],
        "summary": resume,
        "count": len(actifs),
        "version": max((o.version for o in actifs), default=0),
        # Les valeurs anormales sont SIGNALEES, jamais corrigees d'office :
        # un reglage de test peut etre voulu.
        "warnings": alertes,
    }


@extend_schema(tags=[TAG], summary="Tous les reglages actifs, en resume")
class ConfigOverviewView(APIView):
    permission_classes = [IsFinanceStaff]

    def get(self, request):
        return Response({
            "sections": [_resume(cle, e) for cle, e in MODELES.items()],
            "pending_requests": ConfigChangeRequest.objects.filter(
                status=ConfigChangeRequest.Status.PENDING).count(),
        })


@extend_schema(tags=[TAG], summary="Detail d'un reglage et son historique")
class ConfigDetailView(APIView):
    permission_classes = [IsFinanceStaff]

    def get(self, request, section: str):
        entree = MODELES.get(section)
        if entree is None:
            return Response({"detail": f"Section « {section} » inconnue."},
                            status=status.HTTP_404_NOT_FOUND)

        modele = entree["model"]
        actifs = list(modele.current())

        # L'historique complet, actives et remplacees : c'est ce qui permet
        # de repondre a « qui a change ca, et quand ? ».
        historique = list(
            modele.objects.all().order_by("-version", "-valid_from")[:30]
        )

        return Response({
            "key": section,
            "label": entree["label"],
            "hint": entree["hint"],
            "governance_level": getattr(modele, "GOVERNANCE_LEVEL", ""),
            # ─────────────────────────────────────────────────────────────
            # LE FORMULAIRE SE DEDUIT DU MODELE
            #
            # Redecrire 123 champs cote frontend garantirait la derive : un
            # champ ajoute cote Django resterait invisible.
            # ─────────────────────────────────────────────────────────────
            "schema": describe_model(modele),
            "active": [_serialiser(o) for o in actifs],
            "history": [
                {
                    "config_key": o.config_key,
                    "version": o.version,
                    "is_active": o.is_active,
                    "valid_from": o.valid_from.isoformat() if o.valid_from else None,
                    "valid_to": o.valid_to.isoformat() if getattr(o, "valid_to", None) else None,
                    "created_by": getattr(o.created_by, "username", "")
                    if getattr(o, "created_by", None) else "",
                }
                for o in historique
            ],
        })


@extend_schema(tags=[TAG], summary="Demandes de changement")
class ConfigChangeRequestListView(APIView):
    permission_classes = [IsFinanceStaff]

    def get(self, request):
        etat = request.query_params.get("status") or ""
        demandes = ConfigChangeRequest.objects.select_related(
            "requested_by", "approved_by").order_by("-requested_at")
        if etat:
            demandes = demandes.filter(status__in=etat.split(","))

        return Response([
            {
                "reference": d.reference,
                "target_model": d.target_model,
                "target_key": d.target_key,
                "action": d.action,
                "governance_level": d.governance_level,
                "payload": d.payload,
                "previous_snapshot": d.previous_snapshot,
                "diff": d.diff,
                "justification": d.justification,
                "status": d.status,
                "status_label": d.get_status_display(),
                "requested_by": getattr(d.requested_by, "username", ""),
                "requested_at": d.requested_at.isoformat(),
                "approved_by": getattr(d.approved_by, "username", "")
                if d.approved_by else "",
                "approved_at": d.approved_at.isoformat() if d.approved_at else None,
                "rejection_reason": d.rejection_reason,
                "applied_at": d.applied_at.isoformat() if d.applied_at else None,
                "applied_version": d.applied_version,
                # ─────────────────────────────────────────────────────────
                # ON DIT A L'INTERFACE CE QU'ELLE PEUT PROPOSER
                #
                # Le demandeur ne peut pas approuver. Plutot que de laisser
                # l'ecran l'apprendre par un refus, on le lui dit d'avance :
                # le bouton ne doit pas exister.
                # ─────────────────────────────────────────────────────────
                "can_approve": (
                    d.status == ConfigChangeRequest.Status.PENDING
                    and d.requested_by_id != request.user.id
                ),
                "is_mine": d.requested_by_id == request.user.id,
            }
            for d in demandes[:100]
        ])

    def post(self, request):
        """Cree une demande de changement."""
        section = request.data.get("section") or ""
        entree = MODELES.get(section)
        if entree is None:
            return Response({"detail": f"Section « {section} » inconnue."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            demande = request_change(
                target_model=entree["model"].__name__,
                target_key=request.data.get("config_key") or "",
                payload=request.data.get("payload") or {},
                justification=request.data.get("justification") or "",
                requested_by=request.user,
                action=request.data.get("action") or "UPDATE",
            )
        except ChangeControlError as exc:
            # Le message du service, TEL QUEL.
            return Response({"detail": str(exc)},
                            status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"reference": demande.reference, "status": demande.status},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=[TAG], summary="Approuver une demande de changement")
class ConfigChangeApproveView(APIView):
    # CanApproveMoney : approuver un changement de configuration financiere
    # engage autant qu'approuver un versement.
    permission_classes = [CanApproveMoney]

    def post(self, request, reference: str):
        demande = ConfigChangeRequest.objects.filter(
            reference=reference).first()
        if demande is None:
            return Response({"detail": "Demande introuvable."},
                            status=status.HTTP_404_NOT_FOUND)

        try:
            approve_change(demande, approved_by=request.user)
        except ChangeControlError as exc:
            return Response({"detail": str(exc)},
                            status=status.HTTP_400_BAD_REQUEST)

        demande.refresh_from_db()
        return Response({
            "reference": demande.reference,
            "status": demande.status,
            "applied_version": demande.applied_version,
        })


@extend_schema(tags=[TAG], summary="Revenir a la version precedente")
class ConfigChangeRollbackView(APIView):
    """
    Restaure l'etat anterieur d'un reglage.

    ─────────────────────────────────────────────────────────────────────
    ON N'EFFACE PAS, ON AVANCE VERS L'ETAT PRECEDENT

    `rollback_change` cree une NOUVELLE version portant les anciennes
    valeurs. L'historique reste complet : on voit le changement, puis son
    annulation, avec leurs auteurs respectifs.

    Effacer la version fautive donnerait un historique qui ment.
    ─────────────────────────────────────────────────────────────────────
    """

    permission_classes = [CanApproveMoney]

    def post(self, request, reference: str):
        demande = ConfigChangeRequest.objects.filter(
            reference=reference).first()
        if demande is None:
            return Response({"detail": "Demande introuvable."},
                            status=status.HTTP_404_NOT_FOUND)

        motif = (request.data.get("reason") or "").strip()
        if not motif:
            return Response(
                {"detail": "Le motif du retour arriere est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rollback_change(demande, request.user, motif)
        except ChangeControlError as exc:
            return Response({"detail": str(exc)},
                            status=status.HTTP_400_BAD_REQUEST)

        demande.refresh_from_db()
        return Response({
            "reference": demande.reference,
            "status": demande.status,
        })


@extend_schema(tags=[TAG], summary="Rejeter une demande de changement")
class ConfigChangeRejectView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request, reference: str):
        demande = ConfigChangeRequest.objects.filter(
            reference=reference).first()
        if demande is None:
            return Response({"detail": "Demande introuvable."},
                            status=status.HTTP_404_NOT_FOUND)

        motif = (request.data.get("reason") or "").strip()
        if not motif:
            # Rejeter, c'est s'ecarter du cours normal : ca s'explique.
            return Response(
                {"detail": "Le motif du rejet est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reject_change(demande, request.user, motif)
        except ChangeControlError as exc:
            return Response({"detail": str(exc)},
                            status=status.HTTP_400_BAD_REQUEST)

        demande.refresh_from_db()
        return Response({
            "reference": demande.reference,
            "status": demande.status,
        })