# backend/apps/vendeur_litiges/signaux.py
# Un litige ouvert par le client (apps.aftersales.signaux.litige_ouvert) prévient la boutique : notification urgente,
# non désactivable (VD11-R44), lien vers le dossier ; jamais l'identité du client (GEN-01). SMS : par le prestataire
# des notifications quand le vendeur aura ses appareils (vendeur_core.services.notifier).
import logging

from django.dispatch import receiver

from apps.aftersales.signaux import litige_ouvert

logger = logging.getLogger("apps.vendeur_litiges")


@receiver(litige_ouvert)
def prevenir_la_boutique(sender, litige, **_):
    from apps.pickup.models import SousCommande
    from apps.vendeur_core import services as socle
    from apps.vendeur_core.models import CommandeVendeur

    from .services import MOTIFS_VENDEUR, _p

    sc = SousCommande.objects.filter(order_id=litige.order_id, n=litige.colis).first()
    b = socle.boutique_du_vendeur(sc.vendor_id) if sc else None
    if b is None:
        return
    socle.synchroniser(b)
    c = CommandeVendeur.objects.filter(boutique=b, order_id=litige.order_id, n=litige.colis).first()
    if c is None:
        return
    socle.notifier(
        b,
        "litige",
        "Nouveau litige",
        f"{c.ref} · {MOTIFS_VENDEUR.get(litige.pb, litige.probleme)} : répondez sous {_p().vendeur_heures} h.",
        f"litige?ref={c.ref}",
        urgent=True,
    )
