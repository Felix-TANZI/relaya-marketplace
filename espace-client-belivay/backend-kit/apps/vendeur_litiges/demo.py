# backend/apps/vendeur_litiges/demo.py
# DONNÉES DE DÉMONSTRATION (serveur d'essai, jamais en production) : les dossiers du jeu d'essai du paquet vendeur
# (espace-vendeur/src/demo/litiges.ts, retours.ts), ouverts sur les VRAIES commandes de démo de la boutique (socle :
# apps.vendeur_core.demo, BLV-00004 → BLV-260904…) par les services d'aftersales, comme le client :
#   - BLV-00005 (iPhone 15 Pro Max) : « Ce n'est pas le bon produit », ouvert dim. 20 à 05 h 30, remboursement attendu ;
#   - BLV-00006 (iPhone 15 Pro Max) : « Colis abîmé », ouvert lun. 21 à 06 h 02, remplacement attendu ;
#   - BLV-00004 (ITEL AC52 noir) : défaut caché signalé 30 h après le retrait, retour accepté par BelivaY, déposé au
#     relais, en route vers la boutique (passage du livreur).
# Dates du paquet décalées comme le socle (demo.decalage()). Idempotent : un dossier existant n'est pas refait.
from django.db import transaction

from apps.aftersales import services as apres_vente
from apps.aftersales.models import Litige, PreuveLitige, Retour
from apps.client_core import pont
from apps.vendeur_core import demo as socle_demo
from apps.vendeur_core.models import Boutique, CommandeVendeur
from belivay_moteurs import litiges as moteur

from . import services

# (commande du jeu d'essai, motif du client, ce qu'il dit, souhait, ouverture (jeu d'essai), photos dessinées)
DOSSIERS = (
    (
        "BLV-00005",
        "pas-commande",
        "J’ai commandé le 256 Go, la boîte indique 128 Go.",
        "rembourse",
        (2026, 9, 20, 5, 30),
        ("counter", "box"),
    ),
    ("BLV-00006", "abime", "L’écran est fissuré à l’ouverture du colis.", "remplace", (2026, 9, 21, 6, 2), ("cracked", "box")),
    ("BLV-00004", "autre", "L’écran reste noir après une journée", "remplace", (2026, 9, 18, 16, 0), ("box",)),
)
RAMASSAGE = {"BLV-00005": (2026, 9, 15, 14, 20), "BLV-00006": (2026, 9, 17, 14, 35)}


def _ouvrir(c: CommandeVendeur, pb, description, souhait, ouverture, photos) -> Litige:
    lit = Litige.objects.filter(order_id=c.order_id, colis=c.n).order_by("-pk").first()
    if lit is not None:
        return lit
    client = pont.modele("commande").objects.get(pk=c.order_id).user
    lit = apres_vente.ouvrir(client, pont.ref_commande(c.order_id), c.n, pb, description, souhait, [])
    ech = moteur.echeances(ouverture, services._p())
    Litige.objects.filter(pk=lit.pk).update(
        ouvert_le=ouverture, echeance_vendeur=ech.reponse_vendeur, decision_au_plus_tard=ech.decision_au_plus_tard
    )
    for i, nom in enumerate(photos, start=1):
        p = PreuveLitige(
            litige=lit, titre=f"Ta photo {i}", sous="versée au dossier", source=PreuveLitige.Source.CLIENT, ajoutee_le=ouverture
        )
        p.photo.name = nom  # illustration nommée du prototype
        p.save()
    lit.refresh_from_db()
    return lit


@transaction.atomic
def charger(boutique: Boutique) -> None:
    d = socle_demo.decalage()
    for ref, pb, description, souhait, ouverture, photos in DOSSIERS:
        c = socle_demo.commande(ref)
        if c is None or c.boutique_id != boutique.pk:
            continue  # commande de démo absente : le socle ne l'a pas chargée
        if ref in RAMASSAGE and not c.photos_remise:
            # Photos du contrôle au ramassage (article à découvert, colis scellé), versées d'office au dossier.
            t = socle_demo._t(d, *RAMASSAGE[ref])
            c.photos_remise = [
                {"type": "decouvert", "image": "counter", "a": int(t.timestamp() * 1000), "lieu": "Tonton PG"},
                {"type": "scelle", "image": "box", "a": int(t.timestamp() * 1000) + 60_000, "lieu": "Tonton PG"},
            ]
            c.save(update_fields=["photos_remise"])
        lit = _ouvrir(c, pb, description, souhait, socle_demo._t(d, *ouverture), photos)
        if ref == "BLV-00004" and not Retour.objects.filter(litige=lit).exists():
            services.accepter_retour(c.ref, "defaut_cache")
            services.avancer_retour(c.ref, "return.deposited")
            Retour.objects.filter(litige=lit).update(depose_le=socle_demo._t(d, 2026, 9, 21, 8, 30))
