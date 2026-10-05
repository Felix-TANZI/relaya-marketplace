// Écran « Saisie de recherche » (CL-05), forme d'origine du prototype rendue réelle (DP-54) : l'en-tête de recherche
// avec le vrai champ (le clavier du téléphone s'ouvre) ; sans texte, l'accueil de la recherche (tes recherches,
// recherches populaires, univers) ; dès deux lettres, les suggestions lues dans le catalogue : recherches
// complétées (tes recherches, populaires, produits) avec leur nombre de produits ou « 0 · on cherche »,
// sous-catégories avec leur univers, produits avec leur prix ; « Rechercher » (ou Entrée) ouvre les résultats, ou
// « rien trouvé » ; ?cat= limite la recherche à un univers (retirable).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { UNIVERS, useCatalogue } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { retenirRecherche } from '../../donnees/recherches'
import { usePreferences } from '../../preferences'
import { AccueilRecherche, EnteteRecherche, resultatsDe, Suggestions, suggestionsDe } from './Commun'

export function EcranSaisie({ route }: { route: 'recherche' | 'recherche-saisie' }) {
  const { t, tf } = usePreferences()
  const [params, setParams] = useSearchParams()
  const naviguer = useNavigate()
  const [c] = useCatalogue()
  const [q, setQ] = useState(params.get('q') ?? '')
  const cat = params.get('cat') ?? undefined
  const u = UNIVERS.find((x) => x.id === cat)
  const parametres = u ? { cat: u.id } : undefined
  const ecrire = (v: string) => {
    setQ(v)
    const n = new URLSearchParams(params)
    if (v) n.set('q', v)
    else n.delete('q')
    setParams(n, { replace: true })
  }
  const chercher = (v: string) => {
    if (!v.trim()) return
    retenirRecherche(v.trim())
    const n = new URLSearchParams({ q: v.trim(), ...(parametres ?? {}) })
    const vide = c ? resultatsDe(c, n).liste.length === 0 : false
    naviguer(chemin(vide ? 'recherche-zero' : 'recherche-resultats', Object.fromEntries(n)))
  }
  const s = c && q.trim().length >= 2 ? suggestionsDe(c, q, u?.id) : null
  return (
    <Ecran route={route} enteteSite largeur="moyen" avant={<EnteteRecherche c={c} q={q} edition={{ setQ: ecrire, soumettre: () => chercher(q) }} parametres={parametres} />}>
      {u && (
        <div className="cl05-scope">
          <Icone nom="layout-grid" taille={16} />
          <span className="grow">
            {t('Dans ')}
            <b>{t(u.titre)}</b>
          </span>
          <button type="button" className="ibtn" aria-label={t('Chercher dans tout BelivaY')} onClick={() => setParams(q ? { q } : {}, { replace: true })}>
            <Icone nom="x" taille={16} />
          </button>
        </div>
      )}
      {!s ? (
        <AccueilRecherche c={c} colonnes />
      ) : (
        <>
          <Suggestions s={s} q={q} chercher={chercher} />
          <div className="btns">
            <button type="button" className="btn primary" onClick={() => chercher(q)}>
              <Icone nom="search" taille={18} />
              <span>{tf('Voir tous les résultats pour « {q} »', { q: q.trim() })}</span>
            </button>
          </div>
        </>
      )}
    </Ecran>
  )
}

export function RechercheSaisie() {
  return <EcranSaisie route="recherche-saisie" />
}
