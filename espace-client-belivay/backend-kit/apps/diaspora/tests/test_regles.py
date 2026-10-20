# backend/apps/diaspora/tests/test_regles.py
# Contrôle de cohérence et règles du compte diaspora (regles.py), exemples de site/src/donnees/source.ts,
# site/tests/diaspora.spec.ts et listes-statut.spec.ts.
from datetime import date

from apps.diaspora import regles

H = 3_600_000
T = 1_000 * H


def c(pays_carte, montant=50_000, historique=(), pays_compte="France"):
    return regles.controle_diaspora(
        pays_carte=pays_carte, pays_compte=pays_compte, montant=montant, historique=list(historique), maintenant=T
    )


def test_carte_du_pays_du_compte_acceptee():
    r = c("France")
    assert (r.decision, r.signaux, r.motif) == ("accepte", (), None)
    assert r.en_dict() == {"decision": "accepte", "paysCarte": "France", "signaux": []}


def test_carte_belge_quand_on_vit_en_france_verification_renforcee():
    # listes-statut.spec.ts : « Carte émise en Belgique ; tu vis en France. »
    r = c("Belgique")
    assert (r.decision, r.signaux) == ("renforce", ("pays",))


def test_carte_camerounaise_ou_pays_non_accepte_refusee():
    assert c("Cameroun").en_dict() == {"decision": "refuse", "paysCarte": "Cameroun", "signaux": [], "motif": "cameroun"}
    assert c("Chine").motif == "pays"


def test_montant_inhabituel():
    assert c("France", montant=100_001).signaux == ("montant",)  # sans habitudes : au-delà de PREMIER_MAX
    assert c("France", montant=100_000).decision == "accepte"
    hist = [(T - 100 * H, 10_000), (T - 200 * H, 10_000)]
    assert c("France", montant=30_001, historique=hist).signaux == ("montant",)  # > 3 × la moyenne
    assert c("France", montant=30_000, historique=hist).decision == "accepte"


def test_deux_signaux_refus():
    r = c("Belgique", montant=150_000)
    assert (r.decision, r.signaux, r.motif) == ("refuse", ("pays", "montant"), "signaux")


def test_commandes_rapprochees():
    deux = [(T - H, 20_000), (T - 2 * H, 20_000)]
    assert c("France", historique=deux).signaux == ("rapprochees",)
    quatre = [(T - i * H, 20_000) for i in range(1, 5)]
    assert c("France", historique=quatre).motif == "rapprochees"
    vieilles = [(T - 30 * H, 20_000), (T - 40 * H, 20_000)]
    assert c("France", historique=vieilles).decision == "accepte"


def test_nom_carte():
    assert regles.nom_carte("Hervé Mbarga") == regles.nom_carte("MBARGA HERVE") == "herve mbarga"
    assert regles.nom_carte("Jean-Paul Ékané") == "ekane jean paul"
    assert regles.nom_carte("Paul Mbarga") != regles.nom_carte("Hervé Mbarga")


def test_pays_age_numero():
    assert regles.pays_accepte("France", "+33") and not regles.pays_accepte("France", "+32")
    assert not regles.pays_accepte("Cameroun")
    assert regles.indicatif_de("Canada") == "+1"
    assert regles.age_le(date(1990, 5, 14), date(2026, 10, 5)) == 36
    assert regles.age_le(date(2008, 10, 6), date(2026, 10, 5)) == 17
    assert regles.numero_etranger_valide("6 12 34 56 78")
    assert not regles.numero_etranger_valide("237677123441")
    assert not regles.numero_etranger_valide("12345")


def test_plafonds():
    assert regles.depasse_plafonds(montant=150_001, deja_ce_mois=0, par_paiement=150_000, par_mois=500_000)
    assert regles.depasse_plafonds(montant=100_000, deja_ce_mois=450_000, par_paiement=150_000, par_mois=500_000)
    assert not regles.depasse_plafonds(montant=100_000, deja_ce_mois=400_000, par_paiement=150_000, par_mois=500_000)
