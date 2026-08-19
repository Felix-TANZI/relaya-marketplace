# backend/apps/payments/ledger/__init__.py
# Registre comptable en partie double.
#
# Point d'entree unique pour ecrire : posting.post()
# Point d'entree unique pour lire   : balances.*
# Controles                          : invariants.run_all()