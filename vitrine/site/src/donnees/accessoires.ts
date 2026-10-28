// Accessoires compatibles d'un article du panier (VAGUE-AMELIORATIONS.md n° 3) : une règle, la même pour la
// démonstration et le serveur (qui la servira avec le panier) :
// - seuls les appareils en ont : smartphone, tablette, ordinateur portable (classe S ou M), console, photo et vidéo ;
// - pour chacun, les familles d'accessoires qui lui vont (COMPATIBLES) ;
// - en jeux vidéo, une manette de la marque de la console (jamais une autre console) ;
// - les accessoires d'une marque fermée (MARQUES_FERMEES : chargeur MagSafe, écouteurs Galaxy, manette DualSense…)
//   ne vont qu'aux appareils de la même marque ; les autres (batterie Anker, enceinte JBL) vont à tous ;
// - en stock, moins cher que l'appareil, jamais encombrant (classe S ou M), pas déjà au panier ;
// - la même boutique d'abord (aucun ramassage en plus), puis les plus vendus ; trois au plus.
import type { Produit } from './source'

export const COMPATIBLES: Record<string, string[]> = {
  Smartphones: ['Accessoires', 'Audio', 'Énergie & batteries'],
  Tablettes: ['Accessoires', 'Audio', 'Énergie & batteries'],
  Informatique: ['Audio', 'Énergie & batteries'],
  'Jeux vidéo': ['Jeux vidéo', 'Audio'],
  'Photo & vidéo': ['Énergie & batteries'],
}
export const MARQUES_FERMEES = ['Apple', 'Samsung', 'Sony', 'Microsoft', 'Nintendo']
const UNIVERS_ACCESSOIRES = ['tel', 'elec']
const PETITS = ['S', 'M']
export const ACCESSOIRES_MAX = 3

export interface AccessoireCompatible {
  p: string
  titre: string
  dessin: string
  prix: number
  boutique: string
}

export function accessoiresCompatibles(article: Produit, catalogue: Produit[], exclus: string[] = []): AccessoireCompatible[] {
  const familles = COMPATIBLES[article.sousCategorie ?? '']
  if (!familles || !PETITS.includes(article.classe)) return []
  return catalogue
    .filter(
      (x) =>
        x.p !== article.p &&
        !exclus.includes(x.p) &&
        UNIVERS_ACCESSOIRES.includes(x.univers) &&
        familles.includes(x.sousCategorie ?? '') &&
        // Une manette, pas une autre console : en jeux vidéo, un petit article de la marque de la console.
        (x.sousCategorie !== 'Jeux vidéo' || (x.classe === 'S' && x.marque === article.marque)) &&
        PETITS.includes(x.classe) &&
        x.stock > 0 &&
        x.prix < article.prix &&
        (!x.marque || !MARQUES_FERMEES.includes(x.marque) || x.marque === article.marque),
    )
    .sort((a, b) => Number(b.vendeur.boutique === article.vendeur.boutique) - Number(a.vendeur.boutique === article.vendeur.boutique) || b.ventes - a.ventes)
    .slice(0, ACCESSOIRES_MAX)
    .map((x) => ({ p: x.p, titre: x.titre, dessin: x.dessins[0] ?? '', prix: x.prix, boutique: x.vendeur.boutique }))
}
