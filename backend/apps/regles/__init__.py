# backend/apps/regles
# Règles BelivaY v2.1 (BV-DEV-01 à 09, 18 octobre 2026) : les 157 réglages r_… et les 23 tables t_…, modifiables dans
# l'admin et journalisés, et le moteur de référence BV-DEV-09 qui les applique clause par clause.
#
#     from apps.regles import services as regles
#     regles.reglage("r_panier_min")      # valeur en vigueur (admin)
#     regles.moteur().paiement(...)       # moteur BV-DEV-09 avec les valeurs de l'admin
#
# Fichiers de référence, copiés tels quels (empreintes contrôlées par les tests) :
#   donnees/BV-DEV-07_Donnees.json   réglages et tables au lancement, clauses, algorithmes, 200 tests
#   moteur_reference.py              BV-DEV-09_Moteur_de_reference.py
