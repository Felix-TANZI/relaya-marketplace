# Lectures strictes des paramètres propres au vendeur (DP-57) : la valeur lue est celle du registre en vigueur ;
# une forme qui change arrête la lecture (ParametreIllisible), un code absent aussi (ParametreAbsent).
import pytest

from apps.vendeur_core import parametres as p
from belivay_moteurs.erreurs import ParametreAbsent, ParametreIllisible

pytestmark = pytest.mark.django_db

LECTURES = {
    "VD-MDP-LIEN": p.lien_mot_de_passe,
    "VD-KYC-DELAIS": p.kyc_delais,
    "VD-RESILIATION-PREAVIS": p.resiliation_preavis,
    "VD-SAISIE-ASSISTEE": p.saisie_assistee,
    "VD-PRIX-ANORMAL": p.prix_anormal,
    "VD-CONTESTATION-REPONSE": p.contestation_reponse,
    "VD-FILE-HORS-LIGNE": p.file_hors_ligne,
    "VD-PHOTOS": p.photos,
    "VD-FICHE-DELAI": p.fiche_delai,
    "VD-MODERATION": p.moderation,
    "VD-COLIS": p.colis,
    "VD-ETATS-PRODUIT": p.etats_produit,
    "VD-PREPARATION-DELAIS": p.preparation_delais,
    "VD-RAPPEL-PRIX": p.rappel_prix,
    "VD-PRIX-AUTO": p.prix_auto,
    "VD-DOUBLON": p.doublon,
    "VD-CONSEIL-PRIX": p.conseil_prix,
    "VD-PREFIXES-CM": p.prefixes_cm,
    "VD-EQUIPE-MAX": p.equipe_max,
    "VD-SERVICES": p.services,
    "VD-VISIBILITE": p.visibilite,
    "VD-DEMANDE": p.demande,
    "VD-SIMULATEUR": p.simulateur,
    "VD-VISITE-AGENT": p.visite_agent,
}


def test_valeurs_lues_au_registre():
    assert p.lien_mot_de_passe() == 15
    assert p.kyc_delais() == p.KycDelais(15, 48, 3)
    assert p.resiliation_preavis() == 30
    assert p.saisie_assistee() == p.SaisieAssistee(10, 5000)
    assert p.prix_anormal() == p.PrixAnormal(50, 3)
    assert p.contestation_reponse() == 72
    assert p.file_hors_ligne() == 72
    assert p.photos() == p.Photos(3, 8, 800, 1600, 80)
    assert p.fiche_delai() == p.FicheDelai(48, 24, 1000)
    assert p.moderation() == 48
    c = p.colis()
    assert (c.diviseur, c.au_dela, c.seuil_kg, c.seuil_cm) == (5000, "XXL", 5, 50)
    assert [(g.classe, g.kg, g.cm) for g in c.gabarits] == [("S", 2, 35), ("M", 5, 50), ("L", 15, 80), ("XL", 30, 120)]
    assert p.etats_produit()[0] == "Neuf" and len(p.etats_produit()) == 6
    assert p.preparation_delais() == p.PreparationDelais(4, (2, 4, 8, 24, 48, 72, 120, 168))
    assert p.rappel_prix() == 7
    assert p.prix_auto() == 3
    assert p.doublon() == 85
    assert p.conseil_prix() == p.ConseilPrix(10, 30)
    pref = p.prefixes_cm()
    assert pref["MTN"] == ("67", "68", "650", "651", "652", "653", "654")
    assert pref["Orange"] == ("69", "655", "656", "657", "658", "659")
    assert p.equipe_max() == 3
    assert p.services() == p.Services(3000, 10)
    assert p.visibilite() == p.Visibilite(7, 7, 50, 50)
    assert p.demande() == p.Demande(3, 30)
    assert p.simulateur() == p.Simulateur(1_000_000, 1_000_000)
    assert p.visite_agent() == 72


def test_lu_dans_le_registre_pas_dans_le_code():
    """Un registre qui change change la lecture (aucune valeur recopiée dans le code)."""
    reg = dict(p.registre())
    reg["VD-MDP-LIEN"] = "20 minutes"
    reg["VD-SAISIE-ASSISTEE"] = "gratuite pour les 12 premières boutiques de chaque zone exploitée ; ensuite 6 000 F la session"
    reg["VD-PREFIXES-CM"] = "MTN : 67 · Orange : 69, 655 à 656"
    assert p.lien_mot_de_passe(reg) == 20
    assert p.saisie_assistee(reg) == p.SaisieAssistee(12, 6000)
    assert p.prefixes_cm(reg) == {"MTN": ("67",), "Orange": ("69", "655", "656")}


@pytest.mark.parametrize("code", sorted(LECTURES))
def test_forme_cassee(code):
    reg = dict(p.registre())
    reg[code] = "valeur sans la forme attendue"
    with pytest.raises(ParametreIllisible):
        LECTURES[code](reg)


@pytest.mark.parametrize("code", sorted(LECTURES))
def test_code_absent(code):
    reg = {k: v for k, v in p.registre().items() if k != code}
    with pytest.raises(ParametreAbsent):
        LECTURES[code](reg)


@pytest.mark.parametrize(
    "code, valeur",
    [
        ("VD-PHOTOS", "9 au moins, 8 au plus ; 800 px au moins de côté ; allégées à 1 600 px, qualité JPEG 80 %"),
        ("VD-PHOTOS", "3 au moins, 8 au plus ; 800 px au moins de côté ; allégées à 1 600 px, qualité JPEG 180 %"),
        (
            "VD-COLIS",
            "poids facturé = le plus grand du poids réel et du volume ÷ 5 000 ; S 2 kg et 35 cm · M 1 kg et 50 cm · au-delà XXL ; mesures demandées au-delà de 5 kg ou de 50 cm",
        ),
        (
            "VD-COLIS",
            "poids facturé = le plus grand du poids réel et du volume ÷ 5 000 ; S 2 kg · au-delà XXL ; mesures demandées au-delà de 5 kg ou de 50 cm",
        ),
        ("VD-ETATS-PRODUIT", "Neuf, Neuf"),
        ("VD-PREPARATION-DELAIS", "5 h par défaut ; au choix 2, 4 ou 8 h"),
        ("VD-PREPARATION-DELAIS", "4 h par défaut ; au choix 8, 4 ou 2 h"),
        ("VD-DOUBLON", "0 % de ressemblance"),
        ("VD-CONSEIL-PRIX", "0e centile des prix pratiqués sur 30 jours"),
        ("VD-PREFIXES-CM", "MTN : 67, 67"),
        ("VD-PREFIXES-CM", "MTN : 67 · MTN : 68"),
        ("VD-PREFIXES-CM", "MTN : 654 à 650"),
        ("VD-PREFIXES-CM", "MTN : 67 à 654"),
        ("VD-PREFIXES-CM", "MTN : 67 à"),
    ],
)
def test_coherence_verifiee(code, valeur):
    reg = dict(p.registre())
    reg[code] = valeur
    with pytest.raises(ParametreIllisible):
        LECTURES[code](reg)


def test_get_config_sert_les_24_codes_de_dp57():
    from apps.vendeur_core.parametres import CODES_CONSOLE, parametres_console, registre
    from apps.vendeur_core.tests.outils import creer_boutique_vendeur, proprietaire

    assert len(CODES_CONSOLE) == 24
    assert parametres_console() == {c: registre()[c] for c in CODES_CONSOLE}
    r = proprietaire(creer_boutique_vendeur()).get("/api/vendors/config").json()
    assert r["parametres"]["VD-PHOTOS"] == registre()["VD-PHOTOS"]
