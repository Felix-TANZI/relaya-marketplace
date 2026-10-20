# backend/apps/catalog/regles_catalogue.py
# Ce que la spécification v2.1 demande au catalogue avant qu'un article soit publié, et le format de colis qui en
# découle. Les valeurs (univers, limites des formats, prix minimum) sont lues dans apps.regles (admin), jamais ici.
#
#   R16.1  une fiche maître porte un seul univers (t_univers) ; sans univers, elle NE DOIT PAS être publiée.
#   R63.1  format, poids et dimensions de chaque article sont portés par la fiche maître (équipe catalogue).
#   R62    format_i calculé par le moteur BV-DEV-09 à partir de poids_i, l1_i ≥ l2_i ≥ l3_i et carton_i.
#   R87.1  carton_i = vrai pour le fragile (verre, céramique, tablette, écran > r_ecran_grand_pouces…).
#   R17.1  mic_i : Made in Cameroon déclaré et contrôlé (baisse du taux de commission).
#   R19.1  un article NE DOIT JAMAIS être publié à un prix < r_prix_min_publiable.

from django.core.exceptions import ValidationError

from apps.regles import services as regles


class FicheIncomplete(ValidationError):
    """La fiche maître ne peut pas être publiée ; `manques` dit ce que l'équipe catalogue doit remplir."""

    def __init__(self, manques):
        self.manques = manques
        super().__init__("Fiche incomplète : " + " ; ".join(manques) + ".")


class PrixNonPubliable(ValidationError):
    code_refus = "prix_minimum"

    def __init__(self, prix, minimum):
        self.prix, self.minimum = prix, minimum
        super().__init__(f"Prix de {prix} F inférieur au prix minimum publiable ({minimum} F).", code=self.code_refus)


def univers_connus() -> dict:
    """Code d'univers → ligne de t_univers (code, nom, nom_en, famille)."""
    return {u["code"]: u for u in regles.table("t_univers")}


def famille(univers: str) -> str | None:
    """fam(univers_i) (R16.1, t_univers)."""
    ligne = univers_connus().get(univers)
    return ligne["famille"] if ligne else None


def dimensions(master) -> list | None:
    d = [master.dim_l1_cm, master.dim_l2_cm, master.dim_l3_cm]
    return None if any(x is None for x in d) else d


def manques_fiche(master) -> list[str]:
    """Ce qui empêche de publier la fiche (R16.1, R63.1) ; liste vide : publiable."""
    manques = []
    if not master.univers:
        manques.append("univers (R16.1)")
    elif master.univers not in univers_connus():
        manques.append(f"univers « {master.univers} » inconnu de t_univers (R16.1)")
    if master.poids_kg is None:
        manques.append("poids (R63.1)")
    if dimensions(master) is None:
        manques.append("dimensions (R63.1)")
    return manques


def verifier_fiche_publiable(master):
    manques = manques_fiche(master)
    if manques:
        raise FicheIncomplete(manques)


def colis_fiche(master) -> dict | None:
    """pf_i, vol_i et format_i de l'article (R62.1 à R62.6) ; None tant que poids ou dimensions manquent."""
    dims = dimensions(master)
    if master.poids_kg is None or dims is None:
        return None
    m = regles.moteur()
    l1, l2, l3 = sorted(dims, reverse=True)
    return {
        "pf_kg": float(m.pf(master.poids_kg, dims)),
        "volume_l": float(l1 * l2 * l3 / 1000),
        "format": m.format_article(master.poids_kg, dims, master.carton),
    }


def prix_minimum() -> int:
    return regles.reglage("r_prix_min_publiable")


def verifier_prix_publiable(prix: int):
    """R19.1 : refus `prix_minimum` sous r_prix_min_publiable."""
    minimum = prix_minimum()
    if prix < minimum:
        raise PrixNonPubliable(prix, minimum)
