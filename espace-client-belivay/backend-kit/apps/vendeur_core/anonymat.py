# backend/apps/vendeur_core/anonymat.py
# ANONYMAT du client (GEN-01, CTV-02, CMD-06, RCU-03) : une réponse vendeur ne porte jamais l'identité, le numéro,
# l'adresse, le quartier, le relais, le mode de livraison ni le total payé du client. Vérifié par le test de contrat
# (tests/test_anonymat.py) sur toutes les routes vendeur, et utilisable dans les tests de chaque application.
import re

# Noms de champs interdits dans une réponse vendeur (toutes profondeurs), en minuscules.
CHAMPS_INTERDITS = {
    "client",
    "acheteur",
    "nomclient",
    "prenomclient",
    "telephoneclient",
    "numeroclient",
    "emailclient",
    "adresse",
    "adresseclient",
    "relais",
    "relay",
    "relay_id",
    "relayid",
    "pointderetrait",
    "modelivraison",
    "delivery_method",
    "totalpaye",
    "total_paye",
    "total_xaf",
    "totalclient",
    "customer",
    "customer_phone",
    "user_id",
    "userid",
    "authorized_pickup_name",
    "authorized_pickup_phone",
    "quartierclient",
    "district",
}
# Valeurs qui trahiraient un client : un numéro de téléphone camerounais complet, une adresse e-mail.
NUMERO = re.compile(r"(?<!\d)(?:\+?237\s?)?6(?:[\s.]?\d){8}(?!\d)")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")


def fuites(donnees, *, permis: set[str] = frozenset(), valeurs_interdites: tuple[str, ...] = (), chemin="$") -> list[str]:
    """Liste des fuites d'une réponse : champs interdits, et toute valeur de `valeurs_interdites` (nom, numéro,
    relais… du client du test). `permis` : noms de champs autorisés dans ce contexte (ex. « mode » d'un plan)."""
    out = []
    if isinstance(donnees, dict):
        for k, v in donnees.items():
            cle = str(k).lower().replace("-", "")
            if cle in CHAMPS_INTERDITS and cle not in permis:
                out.append(f"{chemin}.{k}")
            out += fuites(v, permis=permis, valeurs_interdites=valeurs_interdites, chemin=f"{chemin}.{k}")
    elif isinstance(donnees, list):
        for i, v in enumerate(donnees):
            out += fuites(v, permis=permis, valeurs_interdites=valeurs_interdites, chemin=f"{chemin}[{i}]")
    elif isinstance(donnees, str):
        for interdit in valeurs_interdites:
            if interdit and interdit.lower() in donnees.lower():
                out.append(f"{chemin} = « {donnees} » contient « {interdit} »")
    return out
