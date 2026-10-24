# backend/apps/shipping/grille.py
# Grille d'achat d'une entreprise de livraison et plafond d'achat (BV-DEV-05, algorithme A10), avec le moteur BV-DEV-09.
#
#   R54.1  plafond(prix ; part_relais ; j1) = dix_inf((prix − part_relais − j1) ÷ (1 + r_marge))
#   R54.2  prestation relais d'un colis : prix = r_relais + sup(format), part_relais = part(format) ; course à domicile :
#          prix = frais_bruts de la course avant couverture, part_relais = 0
#   R54.3  BelivaY NE DOIT JAMAIS acheter au-dessus du plafond : une ligne au-dessus est bloquée (exception : R86)
#   R55    tournée qui part d'une autre zone : + r_sup_autre_zone_tournee par colis si tarif + supplément ≤ plafond, jamais
#          sur un paquet de moins de r_depart_colis colis
#   R86    paquet de moins de r_depart_colis colis vers un relais (ligne 5) : r_wink_exc_prix accepté r_wink_exc_mois après
#          la signature de la grille, puis le plafond
#   R61    une grille est annoncée r_preavis_grille_j avant d'entrer en vigueur
#
# Les plafonds calculés ici sont ceux des « derives » de BV-DEV-07 (vérifiés par tests/test_grille_v21.py).

from datetime import timedelta

from apps.regles import services as regles


def plafond(type_, param="") -> int | None:
    """plafond_achat d'une prestation (R54.1, R54.2) ; None : prestation sans plafond (supplément d'incident)."""
    m = regles.moteur()
    j1 = m.j1()
    if type_ == "DOMICILE":                           # course simple d'un niveau (centre, peripherie, periurbain)
        return m.plafond(m.prix_niv(param))
    if type_ == "XL":                                 # R10.3
        return m.plafond(m.R("r_xl_base") + m.prix_niv(param) - m.R("r_niv_centre"))
    if type_ == "RELAIS":                             # un colis de ce format vers un relais
        return m.plafond(m.R("r_relais") + m.sup(param), m.part(param), j1)
    if type_ == "SUPPLEMENT_FORMAT":
        return m.plafond(m.sup(param))
    if type_ == "KM":
        return m.plafond(m.R("r_prix_km"))
    if type_ == "BOUTIQUE_EN_PLUS":
        return m.plafond(m.R("r_boutique_meme_zone" if param == "meme_zone" else "r_boutique_autre_zone"))
    if type_ == "RETOUR":
        return m.plafond(m.R("r_retour"))
    if type_ == "TRANSFERT":
        return m.plafond(m.R("r_transfert"))
    if type_ == "AGENCE_RELAIS":                      # agence d'entreprise qui sert de relais (R40.3)
        return m.plafond(m.R("r_relais"), m.R("r_agence_relais"), j1)
    return None


def controler(ligne, signee_le=None) -> tuple[str, int | None, str]:
    """(contrôle, plafond, note) d'une ligne de grille : « conforme », « exception_r86 » ou « bloquee » (A10)."""
    if ligne.type == "AUTRE_ZONE_TOURNEE":           # R55 : supplément par colis, jamais au-delà du réglage
        base = plafond("RELAIS", ligne.param or "P")
        sup = regles.reglage("r_sup_autre_zone_tournee")
        if ligne.petit_paquet:
            return "bloquee", base, "R55.2 : jamais sur un paquet de moins de r_depart_colis colis."
        return ("conforme", base, "R55.1") if ligne.tarif <= sup else (
            "bloquee", base, f"R55.1 : supplément limité à {sup} F par colis.")
    p = plafond(ligne.type, ligne.param)
    if p is None or ligne.tarif <= p:
        return "conforme", p, ""
    if ligne.type == "RELAIS" and ligne.petit_paquet and ligne.tarif <= regles.reglage("r_wink_exc_prix") and signee_le:
        fin = signee_le + timedelta(days=round(30.4375 * regles.reglage("r_wink_exc_mois")))
        return "exception_r86", p, f"R86.1 : accepté jusqu'au {fin:%d/%m/%Y}, puis {p} F au plus."
    return "bloquee", p, "R54.3 : tarif au-dessus du plafond d'achat ; décision écrite du porteur nécessaire."


def entree_en_vigueur_min(signee_le):
    """R61.1 : au plus tôt r_preavis_grille_j jours après l'annonce."""
    return signee_le + timedelta(days=regles.reglage("r_preavis_grille_j"))
