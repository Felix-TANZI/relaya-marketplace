# Travail autonome (consignes du porteur, 4 oct. 2026)

Le porteur n'est plus là pour assister. Continuer page par page, sans s'arrêter, jusqu'à ce que toutes les
pages soient prêtes, puis un dernier scan complet.

## Consignes

1. **Panier** : revenir à la présentation d'origine (sections par boutique, lignes du prototype), avec les vraies
   données ; sur chaque article, les paramètres et sous-paramètres de la photo du porteur (couleur, capacité ou
   taille, stock, quantité, vendeur) et l'option **Autres vendeurs** pour choisir une autre offre. Le choix
   **relais ou domicile** ne se fait pas dans les pages : il se fait **en passant à l'achat**.
2. **Ne plus toucher** : l'accueil et le panier (une fois le panier terminé).
3. **Photo du porteur** (fiche produit) : galerie, fil d'Ariane, badges (Certifié, Escrow, Retour 7j), titre,
   prix et remise, note et ventes, variantes (couleur, capacité ; indisponible barré), stock avec jauge,
   vendeur certifié (score, distance au relais), retrait au relais et livraison à domicile avec leurs prix et
   seuils, quantité et sous-total, **Autres vendeurs** (le plus proche, mieux noté, moins cher : prix, quartier,
   distance, score, « Choisir »), garanties (paiement sécurisé, escrow, retour 7 jours, support), « Poser une
   question au vendeur », onglets Description / Spécifications / Avis, barre du bas (favori, Ajouter, Acheter).
   La reprendre avec le design propre au site.
4. **Chaque page** : front-end complet et cliquable : vraies saisies, vraies issues, rien de mort (bouton sans
   action, lien « # », lien vers un état écrit d'avance), tout ce dont la page a besoin, avant et après lancement.
   Route reprise : `"repris"` dans son `construits.json` ; un test de gestes par lot ; commit et push par lot.
5. **Fin** : scan complet (tous les tests, inventaire des contrôles morts à zéro), puis compte rendu.

## Ordre

Panier → CL-08 (paiement : choix relais ou domicile à l'achat) → CL-06 (fiche selon la photo, galerie, avis,
question) → CL-04 hors accueil, CL-05 (catalogue, recherche) → CL-09, CL-10 (commandes, codes, garde,
notifications) → CL-11 restant (retour, remplacement, arrangement, comptoir, auto), CL-12 → CL-03 restant →
CL-13 restant (réseau) → CL-14, CL-15 (après lancement) → CL-01 (kit) → scan final.
