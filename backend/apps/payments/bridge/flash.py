# backend/apps/payments/bridge/flash.py
# Feuille de route D9 : apres le delai de paiement, le stock flash des commandes impayees revient a la vente.
# Le pont est le seul endroit du module financier autorise a appeler le domaine commandes (principe P1).


def rendre_les_impayees() -> int:
    from apps.orders.flash import rendre_les_impayees as rendre

    return rendre()
