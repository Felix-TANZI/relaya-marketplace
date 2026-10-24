# backend/apps/vendeur_catalogue/demo.py
# DONNÉES DE DÉMONSTRATION (serveur d'essai) du catalogue du vendeur, ajoutées à la boutique du socle (« Tonton PG »,
# apps.vendeur_core.demo) sans toucher à ses trois offres (ITEL AC52 noir en vente stock 3 seuil 5, bleu en
# vérification, iPhone 15 Pro Max en vente stock 2 seuil 1) :
#   - trois photos réelles par offre, dessinées par Pillow (aucun fichier externe), prises à la boutique, avec leurs
#     variantes WebP (srcset), comme espace-vendeur/src/demo/produits.ts (photosDe) ;
#   - l'historique de chaque offre (envoi, vérification) ;
# Idempotente : relancée, rien n'est dupliqué.
from datetime import timedelta

from apps.client_core.temps import ms
from apps.vendeur_core.models import Boutique, Offre

from . import services

COULEURS = {"noir": (40, 40, 44), "bleu": (38, 84, 160), "256 Go": (120, 110, 100)}


def _historique(o: Offre) -> None:
    if o.historique:
        return
    h = []
    if o.verifiee_a:
        h.append({"a": ms(o.verifiee_a), "quoi": "Offre vérifiée par BelivaY : en vente"})
    if o.envoyee_a:
        h.append({"a": ms(o.envoyee_a), "quoi": "Offre envoyée en vérification"})
    if o.duplique_de:
        h.append({"a": ms(o.cree_le), "quoi": "Brouillon créé depuis la variante {v}", "valeurs": {"v": o.duplique_de}})
    Offre.objects.filter(pk=o.pk).update(historique=h)


def charger(boutique: Boutique) -> None:
    for o in Offre.objects.filter(boutique=boutique, supprimee_le__isnull=True).select_related("fiche"):
        if o.variante == "bleu" and not o.duplique_de:
            Offre.objects.filter(pk=o.pk).update(duplique_de="noir")
            o.duplique_de = "noir"
        prise = (o.envoyee_a or o.cree_le) - timedelta(minutes=15)
        services.photos_demo(boutique, o, o.fiche.dessin if o.fiche_id else "offre", 3, prise, COULEURS.get(o.variante, (90, 90, 90)))
        _historique(o)
