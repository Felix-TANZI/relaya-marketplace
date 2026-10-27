# Espace vendeur : images remplaçables

Toutes les images de l'espace vendeur sont **sans marque** (aucun logo de fabricant, d'opérateur ou de transporteur) et
**remplaçables** : quand une donnée porte une vraie photo (valeur qui commence par `data:`, `http(s):` ou `/`, et `blob:` au catalogue),
l'écran l'affiche à la place du dessin. En démonstration, aucune donnée n'en porte : on voit les dessins ci-dessous.
Les composants qui font ce choix : `Vignette`, `PhotoDessinee`, `Dessin` (`src/composants/Dessin.tsx`), `Image`
(`src/pages/VD-06/commun.tsx`), `ImagePhoto` (`src/pages/VD-08/commun.tsx`).

| Image | Où elle est | Ce qu'elle montre | Donnée qui la remplace |
| --- | --- | --- | --- |
| Produits (vignettes) | `src/genere/illustrations.json` → `art` : `itel`, `flagship`, `charger`, `pagne`, `coque`, `ecouteurs` | téléphone, smartphone, chargeur, pagne, coque, écouteurs, dessinés sans marque | `article.dessin` (commandes, remise, retours, litiges, argent, accueil `stockBas[].dessin`, messages `commande.dessin`), `Produit.image` et `photos[].image` (catalogue), `fiche.dessin` |
| Portrait du livreur | `illustrations.json` → `art.person` ; dessin `d0b26c91c6a1` de `src/genere/dessins.json` | livreur du créneau | `commande.livreur.photo`, `remise.livreur.photo` (`photo_url`), `preparation.ramassage.photo` |
| Photos de preuve | `illustrations.json` → `photos` : `counter`, `box`, `relay`, `cracked` | comptoir, colis scellé, relais, article abîmé | `litige.pieces[].photo`, pièces des retours ; photos prises dans l'application (`data:`) |
| Photos de la remise | dessins `31d53847e649` (colis ouvert), `97f264a1205c` (colis scellé) de `dessins.json` | colis vu par le livreur à la remise | `remise.photos[].image` (dossier de la commande) |
| Devanture de la boutique | `src/assets/illustrations/devanture.svg` | une devanture dessinée (store orange, vitrine, porte), à demi effacée avec « Pas encore de photo » | `boutique.vitrine.photo` (photo prise ou choisie dans Ma boutique) |
| Logo de la boutique | initiales du membre (aucun fichier) | pastille ronde | `boutique.vitrine.logo` (logo rogné) |
| Photo de profil | initiales du membre (aucun fichier) | pastille ronde (Menu, Paramètres) | `compte.profil.photo` (photo rognée, code SMS) |
| Plans et repères | `dessins.json` (`732aae44d0dd` : plan de la zone, `81b1dee44510` : drapeau du Cameroun…) | plan dessiné hors ligne, indicatif | la carte OpenStreetMap quand le réseau le permet (Emplacement) |
| Accueil de la connexion | `src/assets/prototype/acd794b2ecb9.jpg` | une vendeuse photographie ses pagnes en boutique | remplacer le fichier (même nom, 820 × 461 px environ) |
| Exemple de selfie (pièces) | `src/assets/prototype/32eb64e58d50.jpg` | selfie avec la carte d'identité à la main | remplacer le fichier (carré, 640 px) |
| Logo BelivaY | `src/assets/prototype/be926f70d2b8.png`, `src/assets/logo-belivay.png`, `src/assets/marque-belivay.png`, icônes `public/icone-*.png`, `public/apple-touch-icon.png`, `public/favicon.png` | la marque BelivaY (seule marque visible) | remplacer les fichiers |
| Animation d'ouverture | `illustrations.json` → `lancement` | le chariot BelivaY | `npm run donnees` (relevé du prototype) |

`src/genere/*.json` est relevé du prototype par `outils/prototype.mjs` (`npm run donnees`) : un dessin s'y change à la
source, pas à la main. Les dessins propres au vendeur (aujourd'hui la devanture) vivent dans
`src/assets/illustrations/` ; ils se remplacent en gardant le même nom de fichier.
