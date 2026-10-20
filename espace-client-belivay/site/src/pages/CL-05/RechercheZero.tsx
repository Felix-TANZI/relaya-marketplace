// Écran « Rien trouvé » (CL-05), forme d'origine du prototype rendue réelle (DP-54) : l'en-tête de recherche ; pour
// ?q=, aucun produit livrable : ce qui s'en approche le plus (lignes produit, « Voir les N produits proches »),
// « Préviens-moi quand ça arrive » (alerte gardée, puis « Alerte créée » et « Annuler l'alerte »), la catégorie
// la plus proche (ou toutes les catégories), les recherches populaires.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useSearchParams } from 'react-router-dom'
import { useCatalogue } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { CorpsZero, EnteteRecherche } from './Commun'

export function RechercheZero() {
  const [params] = useSearchParams()
  const [c] = useCatalogue()
  const q = params.get('q') ?? ''
  return (
    <Ecran route="recherche-zero" enteteSite gabarit="centre" largeur="moyen" avant={<EnteteRecherche c={c} q={q} />}>
      {c && <CorpsZero key={q} c={c} q={q} />}
    </Ecran>
  )
}
