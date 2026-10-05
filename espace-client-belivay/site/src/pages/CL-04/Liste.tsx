// Écran « Liste » d'un univers (CL-04), forme d'origine du prototype rendue réelle (DP-54) : en-tête (univers ou
// sous-catégorie, nombre de produits trouvés, retour à l'univers dans les catégories), la recherche dans
// l'univers, puis la vue de liste (tri, filtres, marque, sous-catégories, livrabilité, relais d'origine, grille
// chargée en défilant) lue dans le catalogue.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Link, useSearchParams } from 'react-router-dom'
import { UNIVERS, useCatalogue } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { chemin, NAVIGATION } from '../../config/pages'
import { usePreferences } from '../../preferences'
import { FiltresEnPlace } from '../CL-05/PanneauFiltres'
import { listeDe, VueListe } from './VueListe'

export function Liste() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const [c] = useCatalogue()
  const u = UNIVERS.find((x) => x.id === (params.get('cat') ?? params.get('u')))
  const sub = params.get('sub')
  const n = c ? listeDe(c, params).liste.length : null
  const nombre = n === null ? null : tf(n > 1 ? '{n} produits' : '{n} produit', { n })
  const titre = sub ?? (u ? u.titre : 'Tout le catalogue')
  const sousTitre = nombre === null ? null : sub && u ? t(u.titre) + ' · ' + nombre : nombre
  // Dès 1024 px, la colonne gauche est le panneau des filtres (§ 5.3.1).
  const enPlace = useDes('tab-l')
  const retour = params.get('from') === 'accueil' ? 'accueil' : u ? `categories?u=${u.id}` : 'categories'
  return (
    <Ecran route="liste" titre={titre} sousTitre={sousTitre} navigation={{ ...NAVIGATION.liste, retour }} gabarit="catalogue" gauche={enPlace && c ? <FiltresEnPlace c={c} /> : undefined} etiquetteGauche={enPlace && c ? 'Filtres' : undefined}>
      {c && (
        <VueListe
          route="liste"
          c={c}
          avant={
            <Link to={chemin('recherche-saisie', u ? { cat: u.id, ...(sub ? { sub } : {}) } : undefined)} className="cl04-srch">
              <Icone nom="search" taille={18} />
              <span className="grow" style={{ display: 'flex', gap: '5px', minWidth: '0' }}>
                <span>{t('Chercher dans')}</span>
                <b>{t(u ? u.titre : 'tout le catalogue')}</b>
              </span>
            </Link>
          }
        />
      )}
    </Ecran>
  )
}
