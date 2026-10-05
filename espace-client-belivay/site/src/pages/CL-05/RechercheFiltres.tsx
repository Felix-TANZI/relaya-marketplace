// Écran « Filtres » (CL-05), forme d'origine du prototype rendue réelle (DP-54) : l'en-tête de recherche ; sans
// recherche ni liste d'où l'on vient, l'invitation à chercher d'abord et l'accueil de la recherche ; sinon le
// panneau : « Tout effacer », prix (de… à…, bornes des résultats ; plafonds rapides), livrabilité (retirable à mon
// relais, livrable à domicile, retrait possible aujourd'hui) avec le nombre de produits de chaque choix, relais et
// adresse, disponibilité (en stock), retrait offert, en promotion, distance du relais, note, univers et ses
// sous-catégories comptées, marque (comptée ; grisée à zéro) ; « Voir les N résultats » revient à la liste d'où l'on vient (?retour=…) avec ces filtres.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useCatalogue } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { usePreferences } from '../../preferences'
import { AccueilRecherche, EnteteRecherche, resultatsDe } from './Commun'
import { PanneauFiltres } from './PanneauFiltres'

export function RechercheFiltres() {
  const { t } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [c] = useCatalogue()
  const retour = params.get('retour') ?? 'recherche-resultats'
  const enPlace = useDes('tab-l')
  const [p, setP] = useState(() => {
    const x = new URLSearchParams(params)
    x.delete('retour')
    return x
  })
  useEffect(() => {
    const x = new URLSearchParams(params)
    x.delete('retour')
    setP(x)
  }, [params])
  const q = params.get('q') ?? ''
  const versListe = chemin(retour) + (p.toString() ? '?' + p.toString() : '')
  // Sans recherche ni liste d'origine : les filtres s'ouvrent après une recherche.
  if (!q && !params.get('retour')) {
    return (
      <Ecran route="recherche-filtres" enteteSite gabarit="centre" largeur="moyen" avant={<EnteteRecherche c={c} q="" />}>
        <div style={{ marginTop: '14px' }}>
          <div className="note ink">
            <Icone nom="sliders-horizontal" taille={18} />
            <div>{t('Les filtres s’ouvrent après une recherche : tape ce que tu cherches, puis touche « Filtres » au-dessus des résultats.')}</div>
          </div>
        </div>
        <AccueilRecherche c={c} colonnes />
      </Ecran>
    )
  }
  const entete = <EnteteRecherche c={c} q={q} retour={versListe} />
  // Dès 1024 px, les résultats et les listes ont le panneau des filtres en place (§ 5.3) : l'adresse les ouvre,
  // avec les filtres choisis. Les autres listes (sélection) gardent cette page.
  if (enPlace && (retour === 'recherche-resultats' || retour === 'liste')) return <Navigate to={versListe} replace />
  if (!c) return <Ecran route="recherche-filtres" enteteSite gabarit="centre" avant={entete} />
  const n = resultatsDe(c, p).liste.length
  return (
    <Ecran route="recherche-filtres" enteteSite gabarit="centre" avant={entete}>
      <PanneauFiltres c={c} p={p} setP={setP}>
        <div className="cl05-fbtn2">
          <button type="button" className={'btn primary' + (n ? '' : ' off')} disabled={!n} onClick={() => naviguer(versListe, { replace: true })}>
            <span>
              <span>{t(n > 1 ? 'Voir les' : 'Voir le')}</span> <span>{n}</span> <span>{t(n > 1 ? 'résultats' : 'résultat')}</span>
            </span>
          </button>
        </div>
      </PanneauFiltres>
    </Ecran>
  )
}
