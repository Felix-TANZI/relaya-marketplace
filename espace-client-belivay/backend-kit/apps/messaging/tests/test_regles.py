# Règles pures portées du site (site/src/demo/source-demo.ts : envoyerMessage, aide, demanderRappel).
from apps.messaging import regles

N = " "


def test_apercu_comme_le_site():
    assert regles.apercu("moi", "Merci !", resolue=True) == f"Toi{N}: «{N}Merci !{N}» · résolue"
    assert regles.apercu("moi", "Appelle le {{numero}}") == f"Toi{N}: «{N}Appelle le masqué{N}»"
    assert regles.apercu("photo", "") == f"Toi{N}: photo envoyée"
    assert regles.apercu("eux", "Bien reçu.", qui="Support BelivaY") == f"Support BelivaY{N}: «{N}Bien reçu.{N}»"
    assert regles.apercu("systeme", "scale||Dossier ouvert.") == "Dossier ouvert."


def test_lignes_systeme():
    assert regles.ligne_masque("numero", "vendeur") == "eye-off||Un numéro a été retiré de ce message avant l’envoi. Le vendeur répond ici."
    assert regles.ligne_reponse_support(2, 7, 21, 7) == (
        f"headset||Message envoyé. Une personne te répond ici sous 2{N}h, de 7{N}h à 21{N}h, 7{N}jours sur 7."
    )


def test_horaires_du_support():
    assert regles.horaires_support([7, 21, 7, 7]) == (7, 21, 7)  # SUP-HORAIRES « 7 h – 21 h, 7 j/7 »
    assert regles.support_ouvert(7, 7, 21) and not regles.support_ouvert(21, 7, 21)


def test_jour_du_rappel():
    assert regles.fin_du_creneau("Avant 12 h", 21) == 12
    assert regles.fin_du_creneau("12 h – 17 h", 21) == 17
    assert regles.fin_du_creneau("Dès que possible", 21) == 21
    assert regles.jour_du_rappel(10.5, "Avant 12 h", 21) == "aujourdhui"
    assert regles.jour_du_rappel(12.0, "Avant 12 h", 21) == "demain"
    assert regles.jour_du_rappel(20.9, "Dès que possible", 21) == "aujourdhui"
    assert regles.jour_du_rappel(21.5, "17 h – 21 h", 21) == "demain"


def test_faq_module_et_recherche():
    themes = [
        {
            "cle": "remb",
            "titre": "Remboursements",
            "icone": "x",
            "questions": [
                {
                    "q": "Quand arrive mon remboursement ?",
                    "r": "Au portefeuille.",
                    "lien": None,
                    "module": {"ff": "FF-WALLET", "ouvert": True},
                },
                {
                    "q": "Quand arrive mon remboursement ?",
                    "r": "Sur ton Mobile Money.",
                    "lien": None,
                    "module": {"ff": "FF-WALLET", "ouvert": False},
                },
            ],
        },
        {"cle": "pay", "titre": "Paiement", "icone": "y", "questions": [{"q": "Comment je paie ?", "r": "Avec MTN MoMo.", "lien": None}]},
    ]
    ferme = regles.filtrer_faq(themes, lambda ff: False)
    assert [q["r"] for q in ferme[0]["questions"]] == ["Sur ton Mobile Money."]
    assert regles.filtrer_faq(themes, lambda ff: True, "remboursement")[0]["questions"][0]["r"] == "Au portefeuille."
    assert [t["cle"] for t in regles.filtrer_faq(themes, lambda ff: True, "PAIE")] == ["pay"]
    assert regles.filtrer_faq(themes, lambda ff: True, "rembourse portefeuille")[0]["cle"] == "remb"
    assert regles.filtrer_faq(themes, lambda ff: True, "introuvable") == []
