# backend/apps/messaging/regles.py
# Règles pures de la messagerie et de l'aide, portées du site (site/src/demo/source-demo.ts : envoyerMessage, aide,
# demanderRappel ; site/src/donnees/source.ts : ThemeFaq.module). Sans Django : testées seules.
#
# - Aperçu d'une conversation dans la liste : « Toi : « … » », « Toi : photo envoyée », « Support BelivaY : « … » »,
#   la ligne système sans son icône ; « · résolue » quand le fil est résolu. Les parties masquées s'affichent
#   « masqué ».
# - Lignes système : « icône||texte » (le site dessine l'icône) : masque appliqué (CMS-04), photo versée au dossier
#   (CL-11), réponse du support sous SUP-DELAI pendant SUP-HORAIRES (DP-12).
# - Rappel : aujourd'hui si le créneau n'est pas passé et que le support n'a pas encore fermé, sinon demain.
#   Fin d'un créneau : son dernier nombre d'heures (« Avant 12 h » → 12, « 12 h – 17 h » → 17) ; « Dès que
#   possible » → la fermeture du support.
# - Questions fréquentes : une question liée à un interrupteur (module) ne vaut que dans l'état indiqué ; recherche
#   sans accents ni casse, tous les mots dans la question ou la réponse ; un thème vide disparaît.

import re
import unicodedata
from collections.abc import Callable

NBSP = " "

NOMS_MASQUES = {
    "numero": "Un numéro a été retiré",
    "email": "Une adresse e-mail a été retirée",
    "lien": "Un lien a été retiré",
}


def ligne_masque(masque: str, type_conversation: str) -> str:
    suite = " Le vendeur répond ici." if type_conversation == "vendeur" else ""
    return f"eye-off||{NOMS_MASQUES[masque]} de ce message avant l’envoi.{suite}"


def ligne_photo_dossier(dossier: str) -> str:
    return f"check||Photo prise dans l’application et versée au dossier {dossier}."


def ligne_reponse_support(delai_h: int, ouverture: int, fermeture: int, jours: int) -> str:
    return (
        f"headset||Message envoyé. Une personne te répond ici sous {delai_h}{NBSP}h, "
        f"de {ouverture}{NBSP}h à {fermeture}{NBSP}h, {jours}{NBSP}jours sur {jours}."
    )


def sous_titre_support(delai_h: int, ouverture: int, fermeture: int, jours: int) -> str:
    return f"Réponse sous {delai_h}{NBSP}h, de {ouverture}{NBSP}h à {fermeture}{NBSP}h, {jours}{NBSP}jours sur {jours}"


def _sans_masques(texte: str) -> str:
    return re.sub(r"\{\{\w+\}\}", "masqué", texte)


def apercu(de: str, texte: str, qui: str = "", photo: bool = False, resolue: bool = False) -> str:
    """Dernier échange, tel que la liste des conversations l'affiche."""
    if de == "moi":
        a = f"Toi{NBSP}: «{NBSP}{_sans_masques(texte)}{NBSP}»" if texte else f"Toi{NBSP}: photo envoyée"
    elif de == "photo":
        a = f"Toi{NBSP}: photo envoyée"
    elif de == "eux":
        a = f"{qui or 'Réponse'}{NBSP}: «{NBSP}{_sans_masques(texte)}{NBSP}»"
    else:
        a = texte.split("||", 1)[-1]
    return a + (" · résolue" if resolue else "")


# ── Support et rappel ───────────────────────────────────────────────────────────────────────────────────


def horaires_support(nombres: list[int]) -> tuple[int, int, int]:
    """SUP-HORAIRES « 7 h – 21 h, 7 j/7 » → (7, 21, 7) : ouverture, fermeture, jours par semaine."""
    if len(nombres) < 2 or not 0 <= nombres[0] < nombres[1] <= 24:
        raise ValueError(f"SUP-HORAIRES illisible : {nombres}")
    jours = nombres[2] if len(nombres) > 2 else 7
    return nombres[0], nombres[1], jours


def support_ouvert(heure: float, ouverture: int, fermeture: int) -> bool:
    return ouverture <= heure < fermeture


def fin_du_creneau(creneau: str, fermeture: int) -> int:
    heures = [int(x) for x in re.findall(r"(\d{1,2})\s*h", creneau or "")]
    return min(heures[-1], fermeture) if heures else fermeture


def jour_du_rappel(heure: float, creneau: str, fermeture: int) -> str:
    """« aujourdhui » si le créneau n'est pas passé et que le support n'a pas fermé ; sinon « demain »."""
    fin = fin_du_creneau(creneau, fermeture)
    return "aujourdhui" if heure < fin and heure < fermeture else "demain"


# ── Questions fréquentes ────────────────────────────────────────────────────────────────────────────────


def normaliser(texte: str) -> str:
    t = unicodedata.normalize("NFKD", (texte or "").replace("’", "'").lower())
    return "".join(c for c in t if not unicodedata.combining(c))


def question_visible(question: dict, ouvert: Callable[[str], bool]) -> bool:
    module = question.get("module")
    return not module or ouvert(module["ff"]) == bool(module["ouvert"])


def filtrer_faq(themes: list[dict], ouvert: Callable[[str], bool], q: str = "") -> list[dict]:
    """ThemeFaq[] du site : questions hors interrupteur retirées, recherche, thèmes vides retirés."""
    mots = normaliser(q).split()
    rendu = []
    for theme in themes:
        questions = []
        for question in theme["questions"]:
            if not question_visible(question, ouvert):
                continue
            texte = normaliser(question["q"] + " " + question["r"])
            if all(m in texte for m in mots):
                questions.append(question)
        if questions:
            rendu.append({**theme, "questions": questions})
    return rendu
