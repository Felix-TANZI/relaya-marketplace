# backend/apps/vendors/kyc.py
# Verification de l'identite du vendeur — tache D19.
#
# Le document demande quatre choses qui touchent toutes au meme etat :
#   « Creer la boutique depuis le compte client, sans piece. »
#   « Refuser la publication cote serveur tant que la piece n'est pas
#     verifiee. »
#   « Recevoir la CNI recto et verso et le selfie video, les stocker en acces
#     restreint, donner un motif de refus par piece. »
#   « Exiger les documents complets avant le premier versement. »
#
# Deux regles serveur (publication, versement) dependent donc de la meme
# question : « ce vendeur a-t-il ses trois pieces validees ? » Elle est
# repondue ICI, a un seul endroit. Si chaque appelant refaisait le calcul,
# l'un des deux finirait par diverger — et ce serait celui qui laisse passer.
#
# Les pieces elles-memes vivent dans ComplianceDocument (apps.accounts), le
# meme modele que pour les points relais et les organisations de livraison.
# On ne cree pas un second magasin de pieces justificatives.

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

#: Les trois pieces exigees, nommees comme le document les nomme.
CNI_RECTO = "CNI_RECTO"
CNI_VERSO = "CNI_VERSO"
SELFIE_VIDEO = "SELFIE_VIDEO"
PIECES_EXIGEES: tuple[str, ...] = (CNI_RECTO, CNI_VERSO, SELFIE_VIDEO)

LIBELLES = {
    CNI_RECTO: "CNI (recto)",
    CNI_VERSO: "CNI (verso)",
    SELFIE_VIDEO: "Selfie video",
}

#: Delai de reponse promis par D19 : « Repondre en 48 h ouvrees au plus. »
#: Compte en heures, en ne faisant courir que les jours ouvres.
DELAI_REPONSE_HEURES = getattr(settings, "KYC_DELAI_REPONSE_HEURES", 48)
#: Jours ouvres, au format `datetime.weekday()` (0 = lundi).
JOURS_OUVRES = set(getattr(settings, "KYC_JOURS_OUVRES", (0, 1, 2, 3, 4)))


def _documents(user) -> dict:
    """Les pieces deposees par ce vendeur, indexees par type."""
    from apps.accounts.models import ComplianceDocument

    lignes = ComplianceDocument.objects.filter(
        user=user, owner_role=ComplianceDocument.OwnerRole.VENDOR,
    )
    return {ligne.document_type: ligne for ligne in lignes}


def pieces_manquantes(user) -> list[str]:
    """Pieces jamais deposees."""
    deposees = _documents(user)
    return [piece for piece in PIECES_EXIGEES if piece not in deposees]


def pieces_refusees(user) -> list[str]:
    """Pieces deposees puis rejetees, a redeposer."""
    from apps.accounts.models import ComplianceDocument

    deposees = _documents(user)
    return [
        piece for piece in PIECES_EXIGEES
        if piece in deposees
        and deposees[piece].status == ComplianceDocument.Status.REJECTED
    ]


def pieces_en_attente(user) -> list[str]:
    """Pieces deposees, pas encore examinees."""
    from apps.accounts.models import ComplianceDocument

    deposees = _documents(user)
    return [
        piece for piece in PIECES_EXIGEES
        if piece in deposees
        and deposees[piece].status == ComplianceDocument.Status.PENDING
    ]


def identite_verifiee(user) -> bool:
    """
    Vrai seulement si les TROIS pieces sont deposees et validees.

    Une piece en attente ne vaut pas accord : c'est tout l'objet du controle.
    """
    from apps.accounts.models import ComplianceDocument

    deposees = _documents(user)
    return all(
        piece in deposees
        and deposees[piece].status == ComplianceDocument.Status.APPROVED
        for piece in PIECES_EXIGEES
    )


def etat_verification(user) -> dict:
    """Etat lisible, pour l'ecran vendeur et l'administration."""
    return {
        "verifiee": identite_verifiee(user),
        "manquantes": [LIBELLES[p] for p in pieces_manquantes(user)],
        "refusees": [LIBELLES[p] for p in pieces_refusees(user)],
        "en_attente": [LIBELLES[p] for p in pieces_en_attente(user)],
    }


def exiger_identite_verifiee(user, action: str) -> None:
    """
    Leve PermissionDenied tant que l'identite n'est pas verifiee.

    `action` sert a dire au vendeur CE QU'IL vient de tenter, et le message
    lui dit quoi faire — une interdiction sans explication se traduit en appel
    au support.
    """
    if identite_verifiee(user):
        return

    details = []
    manquantes = pieces_manquantes(user)
    refusees = pieces_refusees(user)
    attente = pieces_en_attente(user)
    if manquantes:
        details.append("a fournir : " + ", ".join(LIBELLES[p] for p in manquantes))
    if refusees:
        details.append("a refaire : " + ", ".join(LIBELLES[p] for p in refusees))
    if attente and not manquantes and not refusees:
        details.append("vos pieces sont en cours de verification")

    raise PermissionDenied(
        f"{action} necessite une piece d'identite verifiee"
        + (f" ({' ; '.join(details)})." if details else ".")
    )


def echeance_examen(depose_le):
    """
    Date limite de reponse promise par D19, a partir du depot.

    « 48 h ouvrees » est compris comme 48 heures qui ne courent que les jours
    ouvres : un depot le vendredi midi est donc attendu pour le mardi midi, et
    non le dimanche. Le nombre d'heures et la liste des jours ouvres sont des
    reglages (KYC_DELAI_REPONSE_HEURES, KYC_JOURS_OUVRES) : si l'entreprise
    compte autrement, rien a recompiler.
    """
    restant = DELAI_REPONSE_HEURES
    instant = depose_le
    while restant > 0:
        instant += timedelta(hours=1)
        if instant.weekday() in JOURS_OUVRES:
            restant -= 1
    return instant


def examen_en_retard(document) -> bool:
    """Vrai si la piece attend depuis plus longtemps que le delai promis."""
    from apps.accounts.models import ComplianceDocument

    if document.status != ComplianceDocument.Status.PENDING:
        return False
    return timezone.now() > echeance_examen(document.created_at)
