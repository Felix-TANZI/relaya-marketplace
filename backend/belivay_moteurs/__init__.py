"""Moteurs de calcul de l'Espace client BelivaY (spécification CL-02, décisions du porteur).

Purs : sans Django, sans base de données, sans lecture de fichier dans les calculs. Ils suivent les
conventions du domaine financier de relaya-marketplace (backend/apps/payments/domain) : montants en
francs entiers (int), taux en Decimal, float interdit, objets immuables, arrondi « moitié vers le haut »,
et chaque résultat porte sa trace (quelle règle, quel paramètre, quel calcul).
"""
