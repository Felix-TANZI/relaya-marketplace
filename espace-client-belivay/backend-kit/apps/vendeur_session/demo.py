# backend/apps/vendeur_session/demo.py
# DONNÉES DE DÉMONSTRATION (serveur d'essai, jamais en production), après la boutique du socle (« Tonton PG ») :
#   - le dossier d'ouverture SIGNÉ de la boutique (VD-2026-0913) : numéro vérifié, pièces vérifiées, versement MTN, contrat
#     signé le jour de la signature du socle (20 août du jeu d'essai, décalé) ;
#   - la saisie assistée de l'agent de zone (Aïssatou B., visite du 20 septembre du jeu d'essai) : trois fiches à valider,
#     comme la démonstration (src/demo/session.ts) — une fiche normale, un prix anormal, un doublon rattaché.
# Idempotent : relancé, rien n'est dupliqué.
from django.db import transaction

from apps.client_core.chiffrement import chiffrer, dechiffrer, empreinte
from apps.client_core.masquage import numero_local
from apps.client_core.temps import ms
from apps.vendeur_core import demo as socle_demo
from apps.vendeur_core.models import Boutique, FicheCatalogue, Membre

from .models import DossierOuverture, FicheAgent, VisiteAgent
from .ouverture import VERSION_CONTRAT

REF = "VD-2026-0913"

FICHES = [
    # (titre, dessin, rayon, prix, stock, photos, prix habituel relevé, description, doublon)
    (
        "Écouteurs filaires · jack 3,5 mm",
        "ecouteurs",
        "Écouteurs",
        2500,
        15,
        3,
        3000,
        "Écouteurs intra-auriculaires, micro intégré, câble 1,2 m.",
        False,
    ),
    ("Chargeur rapide 18 W · USB-C", "charger", "Chargeurs", 1800, 10, 3, 4000, "Chargeur secteur 18 W, prise USB-C, câble fourni.", False),
    ("Coque ITEL AC52 · silicone", "coque", "Coques", 2000, 20, 3, 2000, "Coque souple en silicone pour ITEL AC52.", True),
]


@transaction.atomic
def charger(boutique: Boutique) -> None:
    d = socle_demo.decalage()
    proprio = boutique.membres.filter(role=Membre.Role.PROPRIETAIRE).first()
    n = numero_local(proprio.telephone) if proprio else "677124217"
    signe = socle_demo._t(d, 2026, 8, 20, 10)
    v = {"etat": "verifie", "a": ms(signe), "motif": None}
    versement = dechiffrer(boutique.numero_chiffre) if boutique.numero_chiffre else ""
    DossierOuverture.objects.update_or_create(
        ref=REF,
        defaults={
            "user": boutique.proprietaire,
            "boutique": boutique,
            "etape": DossierOuverture.Etape.SIGNEE,
            "nom": boutique.nom,
            "categorie": boutique.categorie or "Électronique",
            "statut": boutique.statut,
            "telephone_chiffre": chiffrer(n),
            "telephone_empreinte": empreinte(n),
            "zone_code": boutique.zone,
            "zone_quartiers": boutique.quartier,
            "lat": boutique.lat,
            "lon": boutique.lon,
            "precision": 0,
            "numero_verifie_le": socle_demo._t(d, 2026, 8, 19, 17),
            "elements": {"recto": v, "verso": v, "selfie": v, "versement": v},
            "versement_chiffre": chiffrer(versement) if versement else None,
            "versement_operateur": boutique.numero_operateur,
            "envoye_a": socle_demo._t(d, 2026, 8, 20, 8),
            "reponse_avant": None,
            "refus": 0,
            "brouillons": 3,
            "en_ligne": 3,
            "immatricule": False,
            "signe_a": signe,
            "contrat_version": boutique.contrat_version or VERSION_CONTRAT,
            "cree_le": socle_demo._t(d, 2026, 8, 19, 16),
        },
    )
    visite, _ = VisiteAgent.objects.get_or_create(
        boutique=boutique, agent="Aïssatou B.", le=socle_demo._t(d, 2026, 9, 20).date(), defaults={"zone": boutique.zone, "gratuite": True}
    )
    for titre, dessin, rayon, prix, stock, photos, mediane, description, doublon in FICHES:
        fiche = None
        if doublon:
            fiche, _ = FicheCatalogue.objects.get_or_create(
                titre=titre,
                defaults={"marque": "ITEL", "categorie": "Électronique", "rayon": rayon, "dessin": dessin, "mots": titre.lower()},
            )
        FicheAgent.objects.get_or_create(
            visite=visite,
            titre=titre,
            defaults={
                "dessin": dessin,
                "categorie": "Électronique",
                "rayon": rayon,
                "description": description,
                "prix": prix,
                "stock": stock,
                "photos": photos,
                "mediane_relevee": mediane,
                "fiche": fiche,
            },
        )
