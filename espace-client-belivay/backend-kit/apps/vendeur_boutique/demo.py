# backend/apps/vendeur_boutique/demo.py
# DONNÉES DE DÉMONSTRATION (serveur d'essai, jamais en production) des domaines boutique, compte, équipe, messages et
# notifications, cohérentes avec espace-vendeur/src/demo/{boutique,compte,equipe,messages,notifications}.ts et le jeu
# d'essai (lundi 21 septembre 2026, 09 h 48, dates décalées par apps.vendeur_core.demo.decalage()) :
#   - fermeture programmée « Fêtes de fin d'année » du 24 au 26 décembre ;
#   - avis du client sur BLV-00001 (5 ★) et BLV-00002 (3 ★, « la boîte était un peu abîmée »), commandes retirées ;
#   - conversations anonymes : ITEL AC52 (rattachée à BLV-00008 à préparer, un message non lu) et iPhone 15 Pro Max
#     (litige BLV-00005), conversation « Support BelivaY » (versement parti) ;
#   - notifications du jeu d'essai (message, prix, litiges, retour, palier, versement, avis, conseil, offre vérifiée) ;
#   - équipe : ajout d'Aïcha N. par Franck le 2 septembre ; appareils de Franck (iPhone · Safari, Android · Chrome).
# Idempotent : relancé, rien n'est dupliqué. Appelé après apps.vendeur_core.demo.charger().
from django.db import transaction

from apps.client_core import pont
from apps.client_core.masquage import nettoyer_message
from apps.vendeur_core import demo as socle_demo
from apps.vendeur_core.models import Boutique, FermetureBoutique, Membre, NotificationVendeur

from .models import AppareilVendeur, HistoriqueEquipe, LectureFil, MessageSupportVendeur, SignatureMessage


def _f(n: int) -> str:
    return f"{n:,}".replace(",", " ") + " F"


def _fermeture(b: Boutique, d) -> None:
    t = socle_demo._t
    FermetureBoutique.objects.get_or_create(
        boutique=b,
        motif="Fêtes de fin d’année",
        defaults={"du": t(d, 2026, 12, 24).date(), "au": t(d, 2026, 12, 26).date(), "annoncee_le": t(d, 2026, 9, 21, 9, 40)},
    )


def _avis(d) -> None:
    from apps.aftersales.models import AvisCommande

    t = socle_demo._t
    for ref, note, commentaire, le in (
        ("BLV-00001", 5, "", t(d, 2026, 8, 31, 17, 30)),
        ("BLV-00002", 3, "Bon téléphone, mais la boîte était un peu abîmée.", t(d, 2026, 9, 16, 18, 5)),
    ):
        c = socle_demo.commande(ref)
        commande = pont.commande(c.order_id) if c else None
        if commande is None or not commande.user_id:
            continue
        AvisCommande.objects.get_or_create(
            client_id=commande.user_id, order_id=c.order_id, defaults={"notes": [note, 5], "commentaire": commentaire, "envoye_le": le}
        )


def _message(conv, de: str, texte: str, a, membre: Membre | None = None):
    from apps.messaging.models import Message

    propre, masques = nettoyer_message(texte)
    m = Message.objects.create(conversation=conv, de=de, qui="Le vendeur" if de == "eux" else "", texte=propre, masques=masques, cree_le=a)
    if membre is not None:
        SignatureMessage.objects.get_or_create(message_id=m.pk, defaults={"membre": membre, "auteur": membre.prenom})
    return m


def _conversations(b: Boutique, d) -> None:
    from apps.messaging.models import Conversation
    from apps.messaging.services import question_vendeur

    t = socle_demo._t
    franck = b.membres.filter(role=Membre.Role.PROPRIETAIRE).first()
    for ref, messages, lu in (
        (
            "BLV-00008",
            [
                ("moi", "Bonjour, la couleur noire est bien celle de la photo ?", (2026, 9, 21, 9, 21)),
                ("eux", "Oui, noir, neuf, avec chargeur et boîte d’origine.", (2026, 9, 21, 9, 24)),
                ("eux", "Appelez-moi au 677 12 42 17 si besoin.", (2026, 9, 21, 9, 30)),
                ("moi", "Le livreur passe à quelle heure ?", (2026, 9, 21, 9, 31)),
            ],
            (2026, 9, 21, 9, 30),
        ),
        ("BLV-00005", [("moi", "J’ai commandé le 256 Go, la boîte indique 128 Go.", (2026, 9, 20, 5, 30))], None),
    ):
        c = socle_demo.commande(ref)
        commande = pont.commande(c.order_id) if c else None
        produit = pont.produit(c.lignes[0]["productId"]) if c and c.lignes else None
        if commande is None or produit is None or not commande.user_id:
            continue
        conv = question_vendeur(_utilisateur(commande.user_id), produit)
        if not conv.messages.exists():
            for de, texte, a in messages:
                _message(conv, de, texte, t(d, *a), franck if de == "eux" else None)
            Conversation.objects.filter(pk=conv.pk).update(maj_le=t(d, *messages[-1][2]))
        if lu:
            LectureFil.objects.get_or_create(boutique=b, fil=f"c{conv.pk}", defaults={"lu_le": t(d, *lu)})
    if not MessageSupportVendeur.objects.filter(boutique=b).exists():
        c2 = socle_demo.commande("BLV-00002")
        a = t(d, 2026, 9, 18, 11, 40)
        MessageSupportVendeur.objects.create(
            boutique=b,
            de="support",
            texte=f"Votre versement du 18 sept. est parti : BLV-VS-4085 (couvre {c2.ref if c2 else 'BLV-00002'}).",
            a=a,
        )
        LectureFil.objects.get_or_create(boutique=b, fil="support", defaults={"lu_le": a})


def _utilisateur(user_id: int):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.get(pk=user_id)


def _notifications(b: Boutique, d) -> None:
    t = socle_demo._t
    ref = {
        k: (socle_demo.commande(k).ref if socle_demo.commande(k) else k)
        for k in ("BLV-00002", "BLV-00004", "BLV-00005", "BLV-00006", "BLV-00008")
    }
    garde2 = socle_demo.commande("BLV-00002").garde if socle_demo.commande("BLV-00002") else 0
    # (type, titre, texte, a, lien, urgent, argent, lue)
    a_creer = [
        (
            "message",
            f"Nouveau message · Client de {ref['BLV-00008']}",
            "Ouvrez la conversation pour le lire et répondre.",
            t(d, 2026, 9, 21, 9, 31),
            "messages",
            False,
            False,
            True,
        ),
        (
            "prix",
            "ITEL AC52 : un vendeur est passé à 19 000 F",
            "À 18 900 F, les clients vous voient de nouveau en premier.",
            t(d, 2026, 9, 21, 8),
            "offre3",
            False,
            True,
            True,
        ),
        (
            "litige",
            f"{ref['BLV-00006']} · « Colis abîmé »",
            "Répondez avant l’échéance. Sans réponse, BelivaY décide en partant de ce que dit le client.",
            t(d, 2026, 9, 21, 6, 2),
            f"litige?ref={ref['BLV-00006']}",
            True,
            False,
            False,
        ),
        (
            "retour",
            f"{ref['BLV-00004']} revient : défaut caché",
            "Arrivée demain entre 14:00 et 16:00. Vous aurez 48 h pour l’inspecter.",
            t(d, 2026, 9, 20, 16, 10),
            "retours",
            False,
            False,
            True,
        ),
        (
            "litige",
            f"{ref['BLV-00005']} · « Ce n’est pas le bon produit »",
            "Répondez avant l’échéance. Sans réponse, BelivaY décide en partant de ce que dit le client.",
            t(d, 2026, 9, 20, 5, 30),
            f"litige?ref={ref['BLV-00005']}",
            True,
            False,
            False,
        ),
        (
            "palier",
            "Votre score approche de 70 : plus que 3 commandes livrées pour passer Argent",
            "Vous garderez plus par ITEL au palier Argent.",
            t(d, 2026, 9, 19, 18),
            "palier",
            False,
            True,
            True,
        ),
        (
            "versement",
            f"Vendredi : {_f(garde2)} sur MTN ···· 4217, sans frais",
            f"Référence BLV-VS-4085 · couvre {ref['BLV-00002']}.",
            t(d, 2026, 9, 18, 11, 40),
            "versements",
            False,
            True,
            True,
        ),
        (
            "avis",
            f"Nouvel avis · 3 ★ sur {ref['BLV-00002']}",
            "Vous pouvez répondre en privé, par le support, pendant 30 jours.",
            t(d, 2026, 9, 16, 18, 5),
            "avis",
            False,
            False,
            True,
        ),
        (
            "conseil",
            "Conseil de la semaine : des photos à la lumière du jour",
            "2 minutes de lecture : les photos nettes rassurent et vendent plus.",
            t(d, 2026, 9, 14, 9),
            "aide",
            False,
            False,
            True,
        ),
        (
            "offre",
            "ITEL AC52 noir vérifié : en vente",
            "Votre offre est visible des clients. Gardez le stock à jour.",
            t(d, 2026, 9, 10, 15, 20),
            "offre_detail",
            False,
            False,
            True,
        ),
    ]
    membres = list(b.membres.filter(actif=True))
    for type_, titre, texte, a, lien, urgent, argent, lue in a_creer:
        if type_ == "litige" and NotificationVendeur.objects.filter(boutique=b, type="litige", lien=lien).exists():
            continue  # déjà annoncé par l'application des litiges
        n, cree = NotificationVendeur.objects.get_or_create(
            boutique=b, type=type_, titre=titre, defaults={"texte": texte, "a": a, "lien": lien, "urgent": urgent, "argent": argent}
        )
        if cree and lue:
            n.lue_par.add(*membres)
    # Commandes à préparer du jeu d'essai (BLV-00008, BLV-00009) non lues ; les plus anciennes déjà lues.
    a_preparer = {ref["BLV-00008"], socle_demo.REFS["BLV-00009"]}
    for n in NotificationVendeur.objects.filter(boutique=b, type="preparer"):
        if not any(r in n.lien for r in a_preparer) and not n.lue_par.exists():
            n.lue_par.add(*membres)


def _equipe_et_appareils(b: Boutique, d) -> None:
    t = socle_demo._t
    franck = b.membres.filter(role=Membre.Role.PROPRIETAIRE).first()
    aicha = b.membres.filter(role=Membre.Role.PREPARATION, prenom="Aïcha").first()
    if aicha is not None:
        HistoriqueEquipe.objects.get_or_create(
            boutique=b, action="ajout", membre="Aïcha N.", defaults={"a": t(d, 2026, 9, 2, 9), "par": "Franck"}
        )
    if franck is not None:
        for ident, nom, vu, premiere, ouvertures in (
            ("demo-iphone", "iPhone · Safari", (2026, 9, 21, 9, 48), (2026, 8, 20, 10, 2), 138),
            ("demo-android", "Android · Chrome", (2026, 9, 14, 18, 2), (2026, 9, 12, 8, 30), 3),
        ):
            AppareilVendeur.objects.get_or_create(
                membre=franck,
                appareil_id=ident,
                defaults={"nom": nom, "lieu": "Yaoundé", "vu_a": t(d, *vu), "premiere": t(d, *premiere), "ouvertures": ouvertures},
            )


@transaction.atomic
def charger(boutique: Boutique) -> None:
    d = socle_demo.decalage()
    _fermeture(boutique, d)
    _avis(d)
    _conversations(boutique, d)
    _notifications(boutique, d)
    _equipe_et_appareils(boutique, d)
