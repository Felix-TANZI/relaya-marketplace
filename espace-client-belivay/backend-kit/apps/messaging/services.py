# backend/apps/messaging/services.py
# Logique de la messagerie, de l'aide et du rappel (CL-13 ; CMS-01 à CMS-12 ; DP-12).
#
# Exposé aux autres applications :
#   non_lus(user) -> int                                    badge de la messagerie (menu, compte)
#   ouvrir_conversation_dossier(user, titre, litige_id, …)  aftersales, à l'ouverture d'un litige (CL-11)
#   ajouter_message_systeme(conversation, texte)            aftersales : étapes du dossier
#   clore_conversation_dossier(user, litige_id)             aftersales : dossier clos ou retiré
#   commandes_en_cours(user) -> list[str]                   refs « BLV-… » des commandes pas encore retirées
#
# Règles :
# - CMS-04 : un message est nettoyé (numéros, e-mails, liens) AVANT l'enregistrement ; seul le texte masqué est
#   gardé ; la liste des masques est rendue au site et une ligne système le dit dans le fil.
# - CL-11 : dans une conversation de dossier, une photo est versée au dossier du litige (aftersales).
# - DP-12 : le support répond sous SUP-DELAI, pendant SUP-HORAIRES ; le site le dit à chaque message.
# - Le vendeur ne voit ni le nom ni le numéro du client : la conversation « vendeur » ne garde que le produit et la
#   boutique ; la console vendeur (à écrire) lira les messages, jamais le compte du client.

import logging
from datetime import datetime, timedelta

from django.apps import apps
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone
from rest_framework import status

from apps.client_core import interrupteurs, parametres, pont
from apps.client_core.erreurs import ErreurClient
from apps.client_core.masquage import masquer_numero, nettoyer_message
from apps.client_core.temps import YAOUNDE, aujourd_hui, ms

from . import regles
from .models import Conversation, DemandeRappel, EtatService, Message, ThemeFaq
from .photos import adresse, lire_photo

logger = logging.getLogger("apps.messaging")

SUPPORT = "support"
QUI_SUPPORT = "Support BelivaY"
# États d'une sous-commande pas encore entre les mains du client (machine SOUS_COMMANDE).
EN_COURS = ("payee", "confirmee", "prete", "collectee", "arrivee_relais", "en_livraison_domicile")


# ── Horaires du support (SUP-HORAIRES, SUP-DELAI) ───────────────────────────────────────────────────────


def horaires() -> tuple[int, int, int]:
    return regles.horaires_support(parametres.nombres("SUP-HORAIRES"))


def delai_support() -> int:
    return parametres.entier("SUP-DELAI")


def heure_yaounde(moment: datetime | None = None) -> float:
    t = (moment or timezone.now()).astimezone(YAOUNDE)
    return t.hour + t.minute / 60


# ── Conversations ───────────────────────────────────────────────────────────────────────────────────────


def conversation_support(user) -> Conversation:
    ouverture, fermeture, jours = horaires()
    conv, _ = Conversation.objects.get_or_create(
        client=user,
        cle=SUPPORT,
        defaults={
            "type": Conversation.Type.SUPPORT,
            "titre": QUI_SUPPORT,
            "entete": {"titre": QUI_SUPPORT, "sous": regles.sous_titre_support(delai_support(), ouverture, fermeture, jours)},
            "placeholder": "Ton message…",
            "pied": "Gardé par écrit. Numéros, e-mails et réseaux sociaux sont masqués.",
        },
    )
    return conv


def conversation_du_client(user, cle: str) -> Conversation | None:
    """La conversation `cle` du client (filtrage au queryset) ; celle du support est créée à la première visite."""
    if cle == SUPPORT:
        return conversation_support(user)
    return Conversation.objects.filter(client=user, cle=cle).first()


def ouvrir_conversation_dossier(user, titre: str, litige_id: str, *, entete: dict | None = None, premier_message: str = "") -> Conversation:
    """Conversation d'un dossier de litige (CL-11) : une par litige ; ce qui s'y écrit est versé au dossier."""
    conv, cree = Conversation.objects.get_or_create(
        client=user,
        cle=litige_id,
        defaults={
            "type": Conversation.Type.DOSSIER,
            "titre": titre,
            "litige_id": litige_id,
            "entete": entete or {"titre": titre, "sous": litige_id},
            "placeholder": "Ajoute un détail au dossier…",
            "pied": "Gardé au dossier. Numéros et adresses sont masqués.",
        },
    )
    if cree and premier_message:
        ajouter_message_systeme(conv, premier_message)
    return conv


def clore_conversation_dossier(user, litige_id: str, message: str = "") -> None:
    conv = Conversation.objects.filter(client=user, cle=litige_id).first()
    if conv is None:
        return
    if message:
        ajouter_message_systeme(conv, message)
    Conversation.objects.filter(pk=conv.pk).update(resolue=True)


def ajouter_message_systeme(conversation: Conversation, texte: str) -> Message:
    m = Message.objects.create(conversation=conversation, de=Message.De.SYSTEME, texte=texte)
    Conversation.objects.filter(pk=conversation.pk).update(maj_le=m.cree_le)
    return m


def question_vendeur(user, produit: pont.Produit) -> Conversation:
    """Une conversation « vendeur » par produit ; le vendeur ne voit ni le nom ni le numéro du client."""
    boutique = produit.boutique
    conv, _ = Conversation.objects.get_or_create(
        client=user,
        cle=f"q-{produit.id}",
        defaults={
            "type": Conversation.Type.VENDEUR,
            "titre": f"{produit.titre} · le vendeur",
            "product_id": produit.id,
            "vendor_id": boutique.id if boutique else None,
            "entete": {
                "titre": produit.titre,
                "sous": "Le vendeur ne voit ni ton nom ni ton numéro.",
                "dessin": pont.image(produit.id),
                "lien": {"texte": "Voir", "vers": f"/fiche?p={produit.id}"},
            },
            "placeholder": "Ta question au vendeur…",
            "pied": "Gardé par écrit. BelivaY ne lit cette conversation que si un dossier est ouvert.",
        },
    )
    return conv


def envoyer_message(conversation: Conversation, texte: str | None = None, photo=None) -> list[str]:
    """Enregistre un message du client, nettoyé AVANT l'enregistrement (CMS-04) ; rend les masques appliqués."""
    texte = (texte or "").strip()
    fichier = lire_photo(photo, prefixe=conversation.cle) if photo else None
    if not texte and fichier is None:
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Écris un message ou ajoute une photo.")
    propre, masques = nettoyer_message(texte) if texte else ("", [])
    maintenant = timezone.now()
    with transaction.atomic():
        if fichier is not None:
            m = Message.objects.create(conversation=conversation, de=Message.De.PHOTO, photo=fichier, cree_le=maintenant)
            if conversation.type == Conversation.Type.DOSSIER:
                Message.objects.create(
                    conversation=conversation, de=Message.De.SYSTEME, texte=regles.ligne_photo_dossier(conversation.cle), cree_le=maintenant
                )
                _verser_au_dossier(conversation, m)
        if propre:
            Message.objects.create(conversation=conversation, de=Message.De.MOI, texte=propre, masques=masques, cree_le=maintenant)
        for masque in masques:
            Message.objects.create(
                conversation=conversation, de=Message.De.SYSTEME, texte=regles.ligne_masque(masque, conversation.type), cree_le=maintenant
            )
        champs = {"maj_le": maintenant}
        if conversation.type == Conversation.Type.SUPPORT and propre:
            ouverture, fermeture, jours = horaires()
            Message.objects.create(
                conversation=conversation,
                de=Message.De.SYSTEME,
                texte=regles.ligne_reponse_support(delai_support(), ouverture, fermeture, jours),
                cree_le=maintenant,
            )
            champs["resolue"] = False
        Conversation.objects.filter(pk=conversation.pk).update(**champs)
    return masques


def _verser_au_dossier(conversation: Conversation, message: Message) -> None:
    if not apps.is_installed("apps.aftersales"):
        return
    from apps.aftersales.services import verser_photo_au_dossier

    verser_photo_au_dossier(conversation.client, conversation.litige_id or conversation.cle, message.photo.name)


def _non_lus_q() -> Q:
    return Q(de=Message.De.EUX) & (Q(conversation__lu_le__isnull=True) | Q(cree_le__gt=F("conversation__lu_le")))


def non_lus(user) -> int:
    return Message.objects.filter(_non_lus_q(), conversation__client=user).count()


def marquer_lue(conversation: Conversation) -> None:
    conversation.lu_le = timezone.now()
    Conversation.objects.filter(pk=conversation.pk).update(lu_le=conversation.lu_le)


def tout_marquer_lu(user) -> None:
    Conversation.objects.filter(client=user).update(lu_le=timezone.now())


def conversations_visibles(user):
    """Le support et les questions n'apparaissent qu'avec un premier message ; un dossier, toujours."""
    return Conversation.objects.filter(client=user).filter(Q(type=Conversation.Type.DOSSIER) | Q(messages__isnull=False)).distinct()


def message_json(m: Message) -> dict:
    d = {"de": m.de, "le": ms(m.cree_le)}
    if m.qui:
        d["qui"] = m.qui
    if m.texte:
        d["texte"] = m.texte
    photo = adresse(m.photo)
    if photo:
        d["photo"] = photo
    if m.systeme:
        d["systeme"] = m.systeme
    return d


def conversation_json(c: Conversation, messages: list[Message] | None = None) -> dict:
    """Conversation du site (source.ts) : messages dans l'ordre, non lus, aperçu du dernier échange."""
    messages = list(c.messages.all()) if messages is None else messages
    dernier = messages[-1] if messages else None
    apercu = ""
    if dernier is not None:
        apercu = regles.apercu(dernier.de, dernier.texte, dernier.qui, bool(dernier.photo), c.resolue)
    nonlus = sum(1 for m in messages if m.de == Message.De.EUX and (c.lu_le is None or m.cree_le > c.lu_le))
    return {
        "id": c.cle,
        "type": c.type,
        "titre": c.titre,
        "apercu": apercu,
        "entete": c.entete,
        "resolue": c.resolue,
        "messages": [message_json(m) for m in messages],
        "nonLus": nonlus,
        "placeholder": c.placeholder,
        "pied": c.pied,
    }


# ── Commandes en cours ──────────────────────────────────────────────────────────────────────────────────


def commandes_en_cours(user) -> list[str]:
    """Commandes du client dont un colis n'est pas encore retiré (sous-commandes, apps.pickup)."""
    if not apps.is_installed("apps.pickup"):
        return []
    from apps.pickup.models import SousCommande

    ids = pont.modele("commande").objects.filter(user=user).values_list("pk", flat=True)
    en_cours = SousCommande.objects.filter(order_id__in=list(ids), etat__in=EN_COURS).values_list("order_id", flat=True).distinct()
    return [pont.ref_commande(i) for i in sorted(set(en_cours), reverse=True)]


# ── Aide (DonneesAide) ──────────────────────────────────────────────────────────────────────────────────


def _numero(user) -> tuple[str, bool]:
    """(numéro vérifié masqué, vérifié ?) par apps.client_accounts.services.numero_verifie(user) quand elle existe."""
    if not apps.is_installed("apps.client_accounts"):
        return "", False
    try:
        from apps.client_accounts.services import numero_verifie
    except ImportError:
        return "", False
    valeur = numero_verifie(user)
    if isinstance(valeur, dict):
        valeur = valeur.get("masque") or valeur.get("numeroMasque") or valeur.get("numero")
    if not valeur:
        return "", False
    valeur = str(valeur)
    return (valeur if "·" in valeur else masquer_numero(valeur)), True


def _dossier(user) -> dict | None:
    if not apps.is_installed("apps.aftersales"):
        return None
    from apps.aftersales.services import dossier_en_cours

    return dossier_en_cours(user)


def _whatsapp() -> str | None:
    """SUP-WA : « à publier » tant qu'aucun numéro n'est choisi ; sinon le lien wa.me."""
    from apps.client_core.masquage import chiffres

    valeur = parametres.registre().get("SUP-WA", "")
    numero = chiffres(valeur)
    if len(numero) < 8:
        return None
    if len(numero) == 9:
        numero = "237" + numero
    return f"https://wa.me/{numero}"


def donnees_aide(user) -> dict:
    ouverture, fermeture, _ = horaires()
    maintenant = timezone.now()
    numero, verifie = _numero(user)
    visibles = conversations_visibles(user).count()
    return {
        "dossier": _dossier(user),
        "conversations": {"nombre": visibles, "nonLus": non_lus(user)},
        "support": {
            "ouverture": ouverture,
            "fermeture": fermeture,
            "ouvert": regles.support_ouvert(heure_yaounde(maintenant), ouverture, fermeture),
            "instant": ms(maintenant),
        },
        "whatsapp": _whatsapp(),
        "numero": numero,
        "numeroVerifie": verifie,
        "commandesEnCours": commandes_en_cours(user),
        "services": [{"nom": s.nom, "ok": s.ok, "detail": s.detail} for s in EtatService.objects.filter(actif=True)],
    }


# ── Questions fréquentes ────────────────────────────────────────────────────────────────────────────────


def faq(langue: str = "fr", q: str = "") -> list[dict]:
    langue = (langue or "fr").lower()[:5]
    qs = ThemeFaq.objects.filter(langue=langue)
    if not qs.exists():
        qs = ThemeFaq.objects.filter(langue="fr")
    themes = []
    for t in qs.prefetch_related("questions"):
        questions = []
        for x in t.questions.all():
            question = {"q": x.question, "r": x.reponse, "lien": {"texte": x.lien_texte, "vers": x.lien_vers} if x.lien_vers else None}
            if x.module_ff and x.module_ouvert is not None:
                question["module"] = {"ff": x.module_ff, "ouvert": x.module_ouvert}
            questions.append(question)
        themes.append({"cle": t.cle, "titre": t.titre, "icone": t.icone, "questions": questions})
    return regles.filtrer_faq(themes, interrupteurs.ouvert, q)


# ── Rappel ──────────────────────────────────────────────────────────────────────────────────────────────


def rappel_en_cours(user) -> DemandeRappel | None:
    return (
        DemandeRappel.objects.filter(client=user, annule_le__isnull=True, appele_le__isnull=True, date_appel__gte=aujourd_hui())
        .order_by("-cree_le")
        .first()
    )


def rappel_json(r: DemandeRappel) -> dict:
    d = {
        "sujet": r.sujet,
        "commande": r.commande or None,
        "creneau": r.creneau,
        "jour": "aujourdhui" if r.date_appel == aujourd_hui() else "demain",
    }
    if r.precision:
        d["precision"] = r.precision
    return d


def demander_rappel(user, sujet: str, creneau: str, commande: str | None = None, precision: str = "") -> DemandeRappel:
    """Un seul rappel en cours : une nouvelle demande remplace la précédente."""
    _, fermeture, _ = horaires()
    maintenant = timezone.now()
    jour = regles.jour_du_rappel(heure_yaounde(maintenant), creneau, fermeture)
    date_appel = aujourd_hui() + timedelta(days=0 if jour == "aujourdhui" else 1)
    with transaction.atomic():
        DemandeRappel.objects.filter(client=user, annule_le__isnull=True, appele_le__isnull=True).update(annule_le=maintenant)
        return DemandeRappel.objects.create(
            client=user, sujet=sujet, commande=commande or "", creneau=creneau, precision=precision, date_appel=date_appel
        )


def annuler_rappel(user) -> None:
    DemandeRappel.objects.filter(client=user, annule_le__isnull=True, appele_le__isnull=True).update(annule_le=timezone.now())
