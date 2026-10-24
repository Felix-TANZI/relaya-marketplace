# backend/apps/vendeur_argent/demo.py
# DONNÉES DE DÉMONSTRATION (serveur d'essai) : l'historique des versements du jeu d'essai (espace-vendeur/src/demo/
# jeu-essai.ts) : BLV-00001 versée par BLV-VS-4071, BLV-00002 par BLV-VS-4085, créditées, vers MTN ···· 4217 (vérifié
# le 2026-05-09, posé par le socle). Les commandes de démo sont celles du socle (apps.vendeur_core.demo : REFS,
# commande()) ; libération et vendredi par les moteurs, à partir des dates décalées du socle. Idempotent.
from apps.vendeur_core import demo as socle_demo
from apps.vendeur_core import services as socle
from apps.vendeur_core.models import Boutique

from . import services
from .models import Versement, VersementCommande

VERSEMENTS = (("BLV-00001", 4071), ("BLV-00002", 4085))


def charger(boutique: Boutique) -> None:
    from belivay_moteurs.versements import arrete, heure_limite, reference_de_versement, vendredi_de_versement

    pv = services._pv()
    par_ref = {v.c.ref: v for v in services.ventes(boutique)}
    for ref_essai, numero in VERSEMENTS:
        c = socle_demo.commande(ref_essai)
        v = par_ref.get(c.ref) if c is not None else None
        if v is None or v.liberation is None or VersementCommande.objects.filter(commande=c).exists():
            continue
        vendredi = vendredi_de_versement(v.liberation, pv)
        vs, _ = Versement.objects.get_or_create(
            reference=reference_de_versement(numero),
            defaults={
                "boutique": boutique,
                "numero": numero,
                "vendredi": vendredi,
                "montant": c.garde,
                "operateur": "MTN",
                "numero_masque": socle.numero_en_mots(boutique),
                "statut": Versement.Statut.CREDITE,
                "arrete_le": arrete(services._jeudi(vendredi, pv), pv),
                "envoye_le": arrete(services._jeudi(vendredi, pv), pv),
                "credite_le": heure_limite(vendredi, pv),
            },
        )
        VersementCommande.objects.create(versement=vs, commande=c, garde=c.garde, liberation=v.liberation)
