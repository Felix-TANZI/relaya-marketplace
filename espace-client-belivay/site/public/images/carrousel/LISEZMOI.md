# Photos du carrousel de l’accueil

Une photo par bande, déposée dans ce dossier (`site/public/images/carrousel/`). Le site la recadre lui-même à
toutes les tailles (téléphone, tablette, ordinateur) : pas de variantes à fournir.

## Noms exacts (10 bandes)

| Bande | Fichier |
|---|---|
| Mode femme | `femme.webp` |
| Téléphones & tablettes | `tel.webp` |
| Maison & cuisine | `maison.webp` |
| Beauté & santé | `beaute.webp` |
| Électronique | `elec.webp` |
| Supermarché | `marche.webp` |
| Mode homme | `homme.webp` |
| Chaussures | `chauss.webp` |
| Bébé & enfant | `bebe.webp` |
| Sport & loisirs | `sport.webp` |

`.jpg` est accepté aussi (`femme.jpg`…) : le site essaie `.webp`, puis `.jpg`.

## Format conseillé

- **Paysage**, environ 2,4 × plus large que haut (par exemple 2400 × 1000 px) ; le site recadre au centre-droit.
- **Sujet principal à droite** (le recadrage garde le point à 70 % de la largeur) ; **fond calme et plus sombre en
  bas à gauche** : le titre et le texte s’y affichent, sur un voile sombre ajouté par le site.
- WebP de préférence (qualité 75–80), sinon JPEG progressif ; poids conseillé **< 400 Ko** (idéalement < 250 Ko).
- Aucun texte ni logo dans l’image.

## Comportement

- Fichier absent ou illisible : le dessin actuel reste affiché, sans image cassée.
- La photo apparaît en fondu une fois chargée ; seule la première bande se charge tout de suite, les autres quand
  elles approchent de l’écran.
- Une photo servie par le serveur (`image` dans `GET /api/content/home`) passe avant le fichier de ce dossier.
- Les noms viennent du champ `photo` de chaque bande (`src/donnees/contenus.ts`) ; les prompts de génération sont
  dans `PROMPTS.md`.
