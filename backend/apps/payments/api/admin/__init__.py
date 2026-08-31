# backend/apps/payments/api/admin/__init__.py
# API d'administration financiere.
#
# Elle EXPOSE les services existants, elle ne les reimplemente jamais.
# C'est ce qui garantit qu'une interface ne pourra pas contourner la
# separation des roles ni les invariants comptables.