# backend/apps/wishlists/tests/test_regles.py
# Règle commune des échanges (regles.py), exemples de site/src/donnees/echanges.ts et site/tests/echanges.spec.ts.
from dataclasses import dataclass
from decimal import Decimal

from apps.wishlists import regles


@dataclass(frozen=True)
class G:
    grille: tuple = (0, 100, 100, 100, 200, 500, 1000)  # GARDE-GRILLE
    ajout_gros: int = 300  # GARDE-GROS-AJOUT
    renvoi: int = 500  # GARDE-RENVOI


g = G()


def test_pire_cas():
    assert regles.garde_max(g) == 2000
    assert regles.pire_cas(900, g) == 3400
    assert regles.pire_cas(900, g, gros=True) == 3400 + 7 * 300


def test_destinataire_peut_payer_cafe_de_mireille():
    # « Mireille paie la livraison » : café 5 500 F, livraison 900 F → total payé 5 500 F au lieu de 6 400 F.
    assert regles.destinataire_peut_payer(articles=5500, frais=900, g=g).ok
    r = regles.repartition(articles=5500, frais=900, qui="destinataire", g=g)
    assert r == {"payeurMaintenant": 5500, "destinataireALaRemise": 900, "garantie": 3400}
    assert regles.repartition(articles=5500, frais=900, qui="payeur", g=g)["payeurMaintenant"] == 6400


def test_destinataire_ne_peut_pas_payer():
    assert regles.destinataire_peut_payer(articles=3000, frais=900, g=g).raison == "garantie"
    assert regles.destinataire_peut_payer(articles=50000, frais=0, g=g).raison == "offert"
    assert regles.destinataire_peut_payer(articles=50000, frais=900, g=g, payeur_diaspora=True).raison == "diaspora"


def test_refus_colis_sans_frais_avant_expedition():
    # Sandales de Paul (14 900 F), refusées avant l'expédition : Paul récupère 14 900 F.
    r = regles.refus_colis(articles=14900, frais=900, qui="destinataire", expedie=False, jours_garde=0, g=g)
    assert r == {"retenue": 0, "rembourse": 14900}
    assert regles.refus_colis(articles=14900, frais=900, qui="payeur", expedie=False, jours_garde=0, g=g)["rembourse"] == 15800


def test_refus_colis_apres_expedition():
    # Destinataire paie : frais 900 + garde de 3 jours (0 + 100 + 100) + renvoi 500 = 1 600 retenus.
    r = regles.refus_colis(articles=14900, frais=900, qui="destinataire", expedie=True, jours_garde=3, g=g)
    assert r == {"retenue": 1600, "rembourse": 13300}
    # Jamais plus que les articles.
    assert regles.refus_colis(articles=1000, frais=900, qui="destinataire", expedie=True, jours_garde=7, g=g)["retenue"] == 1000


def test_retenue_refus_plafonnee_au_paye():
    assert regles.retenue_refus(articles=1000, frais=900, qui="payeur", jours_garde=7, g=g) == 1900


def test_total_diaspora():
    t = regles.total_diaspora(
        articles=30000, frais_relais=900, frais_domicile=1900, livraison="domicile", supplement_par="payeur", service_pour_cent=Decimal(2)
    )
    assert t == {"livraison": 1900, "supplement": 1000, "aLaRemise": 0, "livraisonPayee": 1900, "service": 638, "total": 32538}
    t = regles.total_diaspora(
        articles=30000,
        frais_relais=900,
        frais_domicile=1900,
        livraison="domicile",
        supplement_par="destinataire",
        service_pour_cent=Decimal(2),
    )
    assert (t["aLaRemise"], t["service"], t["total"]) == (1000, 618, 31518)
    t = regles.total_diaspora(
        articles=30000,
        frais_relais=900,
        frais_domicile=1900,
        livraison="relais",
        supplement_par="destinataire",
        service_pour_cent=Decimal(2),
    )
    assert (t["supplement"], t["aLaRemise"], t["total"]) == (0, 0, 31518)


def test_supplement_au_proche():
    assert regles.supplement_au_proche(articles=30000, supplement=1000, demande_par_proche=True, g=g).ok
    assert regles.supplement_au_proche(articles=30000, supplement=1000, demande_par_proche=False, g=g).raison == "choix-payeur"
    assert regles.supplement_au_proche(articles=3000, supplement=1000, demande_par_proche=True, g=g).raison == "garantie"


def test_objectif_cotisation_cafe_de_nadege():
    # site/tests/echanges.spec.ts : 6 528 F (participants paient la livraison), 5 610 F (Nadège la paie).
    assert regles.objectif_cotisation(prix=5500, frais=900, qui="payeur", frais_pour_cent=Decimal(2)) == 6528
    assert regles.objectif_cotisation(prix=5500, frais=900, qui="destinataire", frais_pour_cent=Decimal(2)) == 5610


def test_rappel_tous_les_trois_jours():
    j = 86_400_000
    assert regles.rappel_possible(None, 10 * j, 3 * j) == (True, None)
    assert regles.rappel_possible(9 * j, 10 * j, 3 * j) == (False, 12 * j)
    assert regles.rappel_possible(7 * j, 10 * j, 3 * j) == (True, None)
