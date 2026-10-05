# backend/apps/aftersales/tests/fabriques.py
# Une commande payée avec ses colis (pickup.SousCommande) et ses montants figés, pour les tests de l'après-vente et
# de la messagerie.

import base64
from datetime import timedelta

from django.utils import timezone

from apps.client_core.tests.outils import creer_boutique, creer_commande, creer_produit, creer_relais
from apps.pickup.models import LigneSousCommande, MontantsCommande, SousCommande

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
PNG_DATA_URL = "data:image/png;base64," + base64.b64encode(PNG).decode()


def commande_retiree(user, prix=(23_000,), retiree_il_y_a=timedelta(days=1), etat="remise", moyen="mtn"):
    """Une commande de relaya et un colis par prix (une boutique chacun), retirés il y a `retiree_il_y_a`."""
    relais = creer_relais()
    produits = [creer_produit(creer_boutique(), prix=p) for p in prix]
    o = creer_commande(user, [(p, 1) for p in produits], relais=relais)
    remise = timezone.now() - retiree_il_y_a if etat == "remise" else None
    colis = []
    for n, p in enumerate(produits, start=1):
        vp = p.vendor.vendor_profile
        sc = SousCommande.objects.create(
            order_id=o.pk,
            n=n,
            vendor_id=vp.pk,
            boutique=vp.business_name,
            zone=vp.zone.name,
            sous_total=p.price_xaf,
            etat=etat,
            relay_id=relais.pk,
            remise_le=remise,
        )
        LigneSousCommande.objects.create(sous_commande=sc, product_id=p.pk, titre=p.title, prix=p.price_xaf, qte=1)
        colis.append(sc)
    total = sum(prix)
    MontantsCommande.objects.create(
        order_id=o.pk,
        client=user,
        relay_id=relais.pk,
        sous_total=total,
        ramassages=500,
        remises=400,
        total=total + 900,
        version_parametres="essai",
        moyen=moyen,
        numero_masque="6 77 ·· ·· 41",
        etat_paiement="payee",
        payee_le=timezone.now() - timedelta(days=3),
    )
    return o, colis, produits, relais
