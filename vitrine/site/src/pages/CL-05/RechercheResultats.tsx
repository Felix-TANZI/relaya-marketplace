// Écran « Résultats de recherche » (CL-05), forme d'origine du prototype rendue réelle (DP-54) : l'en-tête de
// recherche ; la recherche (?q=, ?cat=) dans le catalogue, tolérante aux accents et corrigée d'une faute
// (« Corrigé depuis ») ; le nombre de produits, les filtres (badge du nombre choisi), le tri, « Retirable
// aujourd'hui » ; les lignes produit (retrait calculé, colis trop volumineux, trajet du panier, stock, favori,
// panier) chargées en défilant ; après un changement de relais, ce qui a été recalculé ; sans résultat : « rien
// trouvé » avec ce qui s'en approche et l'alerte.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useSearchParams } from 'react-router-dom'
import { useCatalogue } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { CorpsResultats, EnteteRecherche } from './Commun'
import { FiltresEnPlace } from './PanneauFiltres'

export function RechercheResultats() {
  const [params] = useSearchParams()
  const [c] = useCatalogue()
  const cat = params.get('cat')
  // Dès 1024 px, la colonne gauche est le panneau des filtres (§ 5.3.1).
  const enPlace = useDes('tab-l')
  return (
    <Ecran route="recherche-resultats" enteteSite gabarit="catalogue" gauche={enPlace && c ? <FiltresEnPlace c={c} /> : undefined} etiquetteGauche={enPlace && c ? 'Filtres' : undefined} avant={<EnteteRecherche c={c} q={params.get('q') ?? ''} parametres={cat ? { cat } : undefined} />}>
      {c && <CorpsResultats c={c} />}
    </Ecran>
  )
}
