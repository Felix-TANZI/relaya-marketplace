// Écran « Recherche » (CL-05), forme d'origine du prototype rendue réelle (DP-54) : l'en-tête de recherche (vrai
// champ, recherche vocale, relais d'où partent les distances), puis l'accueil de la recherche : tes recherches
// (effaçables une à une ou toutes), recherches populaires comptées, univers ; dès deux lettres, les suggestions
// (même écran que la saisie).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { EcranSaisie } from './RechercheSaisie'

export function Recherche() {
  return <EcranSaisie route="recherche" />
}
