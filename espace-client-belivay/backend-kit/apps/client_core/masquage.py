# backend/apps/client_core/masquage.py
# Masquage des données personnelles (CAP-21, CMS-04) :
# - à la sortie : numéro « 6 77 ·· ·· 41 », e-mail « c•••••@gmail.com » (mêmes formes que le site,
#   site/src/donnees/numeros.ts et site/src/api/adaptateurs.ts) ;
# - dans un message entre client et vendeur : numéros, e-mails et liens retirés AVANT l'enregistrement, remplacés
#   par {{numero}}, {{email}}, {{lien}} ; la liste des masques est rendue au site (« masques »).

import re

_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_LIEN = re.compile(r"\b(?:https?://|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|cm|fr|io|me|co|ly|app)(?:/\S*)?\b", re.IGNORECASE)
# 8 chiffres ou plus, séparés ou non par des espaces, points ou tirets, avec ou sans +237 / 00237.
_NUMERO = re.compile(r"(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\d[\s.-]?){7,}\d")


def chiffres(numero: str) -> str:
    return re.sub(r"\D", "", numero or "")


def numero_local(numero: str) -> str:
    """9 chiffres camerounais sans indicatif (« +237 6 77 12 34 41 » → « 677123441 »)."""
    c = chiffres(numero)
    if c.startswith("00237"):
        c = c[5:]
    elif c.startswith("237") and len(c) == 12:
        c = c[3:]
    return c


def operateur(numero: str) -> str | None:
    """Opérateur d'après le préfixe (CCO-14), mêmes règles que le site (site/src/donnees/numeros.ts) ; seuls MTN et
    Orange ont un Mobile Money accepté. L'agrégateur confirme l'opérateur à l'envoi (le serveur fait foi)."""
    c = numero_local(numero)
    if not re.fullmatch(r"6\d{8}", c):
        return None
    if re.match(r"6(5[0-4]|7\d|8[0-4])", c):
        return "MTN"
    if re.match(r"6(5[5-9]|9\d|8[5-9])", c):
        return "Orange"
    if c.startswith("66"):
        return "Nexttel"
    if c.startswith("62"):
        return "Camtel"
    return None


def masquer_numero(numero: str) -> str:
    """« 677123441 » → « 6 77 ·· ·· 41 »."""
    c = numero_local(numero)
    if len(c) < 5:
        return "·" * len(c)
    return f"{c[0]} {c[1:3]} ·· ·· {c[-2:]}"


def masquer_email(email: str) -> str:
    """« carine@gmail.com » → « c•••••@gmail.com »."""
    nom, _, domaine = (email or "").partition("@")
    if not domaine:
        return email or ""
    return f"{nom[:1]}{'•' * max(3, min(6, len(nom) - 1))}@{domaine}"


def nettoyer_message(texte: str) -> tuple[str, list[str]]:
    """(texte masqué, masques appliqués dans l'ordre : « numero », « email », « lien »)."""
    masques: list[str] = []

    def remplacer(motif, nom, t):
        def f(_):
            if nom not in masques:
                masques.append(nom)
            return "{{" + nom + "}}"

        return motif.sub(f, t)

    t = remplacer(_EMAIL, "email", texte or "")
    t = remplacer(_LIEN, "lien", t)
    t = remplacer(_NUMERO, "numero", t)
    return t, masques
