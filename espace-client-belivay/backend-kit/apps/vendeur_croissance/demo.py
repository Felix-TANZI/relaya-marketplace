# backend/apps/vendeur_croissance/demo.py
# DONNÉES DE DÉMONSTRATION (serveur d'essai) de la croissance, cohérentes avec le jeu d'essai du paquet
# (espace-vendeur/src/demo/{trust,paliers,plans}.ts) : Trust Score 62,7 et ses six critères, journal des événements
# lu dans les commandes réelles de la démo (prête dans le délai, litige en cours sans effet, retour en attente
# d'inspection) et les avis, relevés de la nuit (30 jours), un avertissement passé, projection du service Scores,
# plan Free (découverte), récompense au mérite gagnée en septembre, frein photo et attribution, recherches sans
# résultat de la zone Z4, vues des offres. Dates du jeu d'essai décalées comme la boutique (vendeur_core.demo).
# Idempotent : relancé, rien n'est dupliqué.
from datetime import timedelta
from decimal import Decimal

from apps.vendeur_core import demo as socle_demo
from apps.vendeur_core.models import Boutique, Offre

from .models import (
    CritereScore,
    Decision,
    EtatAbonnement,
    EvenementScore,
    FreinReleve,
    MeriteVisibilite,
    ProjectionScore,
    RechercheZone,
    ReleveScore,
    VuesOffre,
)

CRITERES = {
    "ponctualite": (25, "69.6", "7 commandes prêtes dans le délai"),
    "qualite": (20, "63.5", "4 commandes closes sans retour"),
    "satisfaction": (20, "54.5", "1 avis 5 ★ ; l’avis 3 ★ ne compte ni pour ni contre"),
    "litiges": (15, "63.3", "4 commandes closes sans litige ; 2 en cours non comptés"),
    "documents": (10, "100", "CNI valide, selfie vérifié"),
    "anciennete": (10, "22", "4 mois et demi ; 7 commandes livrées"),
}
# Relevés de la nuit (service Scores) : départ au neutre (50) à la signature, puis les commandes réussies.
RELEVES = [
    ((2026, 8, 23), "50"),
    ((2026, 8, 31), "54.2"),
    ((2026, 9, 4), "57.1"),
    ((2026, 9, 8), "59.8"),
    ((2026, 9, 11), "58.9"),
    ((2026, 9, 15), "61.4"),
    ((2026, 9, 17), "63.8"),
    ((2026, 9, 19), "64.1"),
    ((2026, 9, 20), "62.9"),
    ((2026, 9, 21), "62.7"),
]
RECHERCHES = [
    ("chargeur itel", 14),
    ("coque iphone 15", 11),
    ("écouteurs sans fil", 8),
    ("batterie externe 20 000", 6),
    ("montre connectée", 5),
]
VUES = {"itel-noir": 210, "iphone": 130}


def charger(boutique: Boutique) -> None:
    b = boutique
    d = socle_demo.decalage()
    t = lambda *a: socle_demo._t(d, *a)  # noqa: E731
    ref = lambda k: socle_demo.REFS.get(k, k)  # noqa: E731

    for cle, (poids, note, detail) in CRITERES.items():
        CritereScore.objects.update_or_create(boutique=b, cle=cle, defaults={"poids": poids, "note": Decimal(note), "detail": detail})

    # Relevés : une ligne par nuit, du 23 août au 21 septembre (jeu d'essai), la valeur gardée entre deux relevés.
    valeurs = {t(*j).date(): Decimal(s) for j, s in RELEVES}
    jour, fin, v = t(2026, 8, 23).date(), t(2026, 9, 21).date(), Decimal(50)
    while jour <= fin:
        v = valeurs.get(jour, v)
        ReleveScore.objects.update_or_create(
            boutique=b,
            jour=jour,
            defaults={"score": v, "commandes_livrees": 7 if jour >= t(2026, 9, 20).date() else 5, "note": Decimal("4.0")},
        )
        jour += timedelta(days=1)

    # Journal immuable : ajouté une seule fois.
    if not EvenementScore.objects.filter(boutique=b).exists():
        retraits = [
            (1, (2026, 8, 31, 15)),
            (2, (2026, 9, 7, 16)),
            (3, (2026, 9, 15, 11)),
            (4, (2026, 9, 17, 10)),
            (5, (2026, 9, 19, 17)),
            (6, (2026, 9, 20, 12)),
            (7, (2026, 9, 17, 9)),
        ]
        evenements = [(t(*a), "Prête dans le délai", "succes", "ponctualite", ref(f"BLV-0000{k}")) for k, a in retraits]
        evenements += [
            (t(2026, 9, 20, 5, 30), "Litige ouvert · ne compte pas tant qu’il est en cours", "aucun", "litiges", ref("BLV-00005")),
            (t(2026, 9, 21, 6, 2), "Litige ouvert · ne compte pas tant qu’il est en cours", "aucun", "litiges", ref("BLV-00006")),
            (t(2026, 9, 18, 16), "Retour signalé · compte après l’inspection", "aucun", "qualite", ref("BLV-00004")),
            (t(2026, 9, 3, 19, 12), "Avis 5 ★", "succes", "satisfaction", ref("BLV-00001")),
            (t(2026, 9, 10, 8, 40), "Avis 3 ★", "neutre", "satisfaction", ref("BLV-00002")),
        ]
        for a, libelle, effet, critere, r in sorted(evenements, key=lambda x: x[0]):
            EvenementScore.objects.create(boutique=b, a=a, libelle=libelle, effet=effet, critere=critere, ref=r)

    # Un avertissement passé (niveau 1, automatique : SAN-01), plus en cours aujourd'hui.
    Decision.objects.update_or_create(
        ident="DEC-2026-0908-A1",
        defaults={
            "boutique": b,
            "type": "avertissement",
            "niveau": 1,
            "decidee_a": t(2026, 9, 8, 7),
            "effet_a": t(2026, 9, 8, 7),
            "motif": f"Commande {ref('BLV-00002')} prête 40 minutes après l’échéance",
            "validee_par": "",
        },
    )
    ProjectionScore.objects.update_or_create(
        boutique=b,
        defaults={
            "commandes": 3,
            "score_apres": Decimal(66),
            "si_gagnes": Decimal(64),
            "si_perdus": Decimal(55),
            "calculee_le": t(2026, 9, 21, 3),
        },
    )
    EtatAbonnement.objects.get_or_create(boutique=b)

    offres = {o.variante: o for o in Offre.objects.filter(boutique=b)}
    itel, iphone = offres.get("noir"), offres.get("256 Go")
    if itel is not None:
        MeriteVisibilite.objects.update_or_create(
            boutique=b, offre=itel, defaults={"gagne_le": t(2026, 9, 14).date(), "raison": "du 8 au 14 sept.", "jours_de_suite": 0}
        )
        FreinReleve.objects.update_or_create(
            boutique=b,
            type="photo",
            defaults={
                "titre": "Une seule photo sur l’ITEL",
                "texte": "Les offres avec des photos nettes et nombreuses reçoivent plus de commandes.",
                "solution": "Photos par un agent",
                "route": "services",
            },
        )
    FreinReleve.objects.update_or_create(
        boutique=b,
        type="attribution",
        defaults={
            "titre": "L’iPhone n’est pas attribué aux clients de Bastos",
            "texte": "Pour eux, la livraison depuis votre boutique coûte 1 500 F.",
            "texte_preparation": "Pour eux, la livraison depuis votre boutique coûte plus que chez un autre vendeur.",
            "solution": "Vitrine de quartier ou prix ajusté",
            "route": "visibilite",
        },
    )
    FreinReleve.objects.update_or_create(
        boutique=b,
        type="avis",
        defaults={
            "titre": "2 avis seulement",
            "texte": "Le rappel automatique de notation est déjà actif après chaque retrait.",
            "solution": "Voir mes avis",
            "route": "avis",
        },
    )
    for mots, fois in RECHERCHES:
        RechercheZone.objects.update_or_create(zone=b.zone or "Z4", mots=mots, defaults={"fois": fois, "periode_jours": 30})
    for cle, o in (("itel-noir", itel), ("iphone", iphone)):
        if o is not None:
            VuesOffre.objects.update_or_create(offre=o, jour=t(2026, 9, 21).date(), defaults={"vues": VUES[cle]})
