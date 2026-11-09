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

# ── Deux paliers (DEV-SRV-01 T07-2, 2026-11-09) ─────────────────────────────
# D19 distingue deja les deux : « refuser la publication tant que LA piece
# n'est pas verifiee » et « exiger les documents COMPLETS avant le premier
# versement ». T07-2 le precise : « piece d'identite et numero Mobile Money
# au premier produit ».
#   - PUBLIER : CNI recto + verso validees, numero Mobile Money renseigne ;
#   - ETRE VERSE : les trois pieces validees (selfie video compris), et le
#     numero verifie par code, exige de son cote par le module financier
#     (seul un numero verifie atteint PayeeAccount).
# Le versement reste donc aussi strict qu'avant ; seule la publication cesse
# d'attendre le selfie.

#: Les trois pieces du dossier complet, nommees comme le document les nomme.
CNI_RECTO = "CNI_RECTO"
CNI_VERSO = "CNI_VERSO"
SELFIE_VIDEO = "SELFIE_VIDEO"
PIECES_EXIGEES: tuple[str, ...] = (CNI_RECTO, CNI_VERSO, SELFIE_VIDEO)
#: La piece d'identite exigee pour publier.
PIECES_PUBLICATION: tuple[str, ...] = (CNI_RECTO, CNI_VERSO)
#: Pas une piece : le numero de versement (accounts.PayoutAccount), exige pour publier.
MOBILE_MONEY = "MOBILE_MONEY"

LIBELLES = {
    CNI_RECTO: "CNI (recto)",
    CNI_VERSO: "CNI (verso)",
    SELFIE_VIDEO: "Selfie video",
    MOBILE_MONEY: "Numero Mobile Money",
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


def _validees(user, pieces) -> bool:
    from apps.accounts.models import ComplianceDocument

    deposees = _documents(user)
    return all(
        piece in deposees
        and deposees[piece].status == ComplianceDocument.Status.APPROVED
        for piece in pieces
    )


def identite_verifiee(user) -> bool:
    """
    Dossier complet : vrai seulement si les TROIS pieces sont deposees et
    validees. C'est la condition du VERSEMENT (D19).

    Une piece en attente ne vaut pas accord : c'est tout l'objet du controle.
    """
    return _validees(user, PIECES_EXIGEES)


def mobile_money_renseigne(user) -> bool:
    """Un numero Mobile Money de versement est enregistre pour l'activite de vendeur (verifie ou non)."""
    from apps.accounts.models import PayoutAccount

    return PayoutAccount.objects.filter(
        user=user, owner_role=PayoutAccount.OwnerRole.VENDOR,
    ).exclude(status=PayoutAccount.Status.DISABLED).exists()


def peut_publier(user) -> bool:
    """
    Condition de PUBLICATION (D19, T07-2) : CNI recto et verso validees,
    numero Mobile Money renseigne. Le selfie video n'est exige qu'au versement.
    """
    return piece_identite_verifiee(user) and mobile_money_renseigne(user)


def piece_identite_verifiee(user) -> bool:
    """CNI recto et verso validees (sans le selfie video)."""
    return _validees(user, PIECES_PUBLICATION)


def _a_fournir_pour_publier(user) -> tuple[list[str], list[str], list[str]]:
    """(a fournir, a refaire, en attente) parmi ce qu'exige la publication."""
    manquantes = [p for p in pieces_manquantes(user) if p in PIECES_PUBLICATION]
    if not mobile_money_renseigne(user):
        manquantes.append(MOBILE_MONEY)
    refusees = [p for p in pieces_refusees(user) if p in PIECES_PUBLICATION]
    attente = [p for p in pieces_en_attente(user) if p in PIECES_PUBLICATION]
    return manquantes, refusees, attente


def etat_verification(user) -> dict:
    """
    Etat lisible, pour l'ecran vendeur et l'administration.

    `verifiee` garde son sens d'origine (dossier complet, condition du
    versement) ; `peut_publier` dit si les offres peuvent etre publiees, et
    `pour_publier` ce qui manque encore pour cela.
    """
    manquantes, refusees, attente = _a_fournir_pour_publier(user)
    return {
        "verifiee": identite_verifiee(user),
        "peut_publier": peut_publier(user),
        "mobile_money": mobile_money_renseigne(user),
        "manquantes": [LIBELLES[p] for p in pieces_manquantes(user)],
        "refusees": [LIBELLES[p] for p in pieces_refusees(user)],
        "en_attente": [LIBELLES[p] for p in pieces_en_attente(user)],
        "pour_publier": {
            "manquantes": [LIBELLES[p] for p in manquantes],
            "refusees": [LIBELLES[p] for p in refusees],
            "en_attente": [LIBELLES[p] for p in attente],
        },
    }


def exiger_publication_possible(user, action: str) -> None:
    """
    Leve PermissionDenied tant que la publication n'est pas possible.

    `action` sert a dire au vendeur CE QU'IL vient de tenter, et le message
    lui dit quoi faire — une interdiction sans explication se traduit en appel
    au support.
    """
    if peut_publier(user):
        return

    details = []
    manquantes, refusees, attente = _a_fournir_pour_publier(user)
    if manquantes:
        details.append("a fournir : " + ", ".join(LIBELLES[p] for p in manquantes))
    if refusees:
        details.append("a refaire : " + ", ".join(LIBELLES[p] for p in refusees))
    if attente and not manquantes and not refusees:
        details.append("votre piece est en cours de verification")

    raise PermissionDenied(
        f"{action} necessite une piece d'identite verifiee et un numero Mobile Money"
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
