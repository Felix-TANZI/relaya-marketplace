# backend/apps/notifications_client/regles.py
# Règles pures des notifications (CL-10), sans Django ; testées dans tests/test_regles.py.
#
#   dans_heures_calmes — heures calmes du client (« de 21 h à 7 h » passe minuit) : sans push, sauf alerte critique.
#   promo_permise      — PUSH-PROMO « 3 par semaine, 9 h – 20 h » : au plus N pushs de promotion sur 7 jours
#                        glissants, et seulement entre l'heure d'ouverture et l'heure de fermeture.

VERROUILLEES = ("commande", "retrait", "incident", "paiement")  # ne se désactivent pas (CL-10)
AU_CHOIX = ("messages", "suivi", "promotions")


def dans_heures_calmes(heure: float, actif: bool, debut: int, fin: int) -> bool:
    """`heure` : heure de Yaoundé en heures décimales (21.5 = 21 h 30)."""
    if not actif or debut == fin:
        return False
    if debut < fin:
        return debut <= heure < fin
    return heure >= debut or heure < fin


def promo_permise(heure: float, envoyees_7_jours: int, regle: list[int]) -> bool:
    """`regle` : nombres de PUSH-PROMO, [3, 9, 20] pour « 3 par semaine, 9 h – 20 h »."""
    maximum, ouverture, fermeture = regle[:3]
    return envoyees_7_jours < maximum and ouverture <= heure < fermeture
