// Comparateur (VAGUE-AMELIORATIONS.md n° 5, règles : donnees/comparateur.ts) : le bouton « Comparer » des produits des
// listes et des résultats, et la barre « Comparer » posée en bas de ces écrans dès qu'un produit est choisi (ses
// vignettes, retirables, « Comparer » dès deux produits, « Vider »).
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { chemin } from '../config/pages'
import { COMPARER_MAX, basculerDans, categorieComparee, ecrireComparaison, lireComparaison } from '../donnees/comparateur'
import type { Produit } from '../donnees/source'
import { usePreferences } from '../preferences'
import { useCatalogue } from './Catalogue'
import { Dessin } from './Dessin'
import { Icone } from './Icone'

/** Les produits choisis pour la comparaison (identifiants), relus à chaque changement (cet onglet ou un autre). */
export function useComparaison(): string[] {
  const [ids, setIds] = useState(lireComparaison)
  useEffect(() => {
    const f = () => setIds(lireComparaison())
    window.addEventListener('blv:comparer', f)
    window.addEventListener('storage', f)
    return () => {
      window.removeEventListener('blv:comparer', f)
      window.removeEventListener('storage', f)
    }
  }, [])
  return ids
}

/** « Comparer » sur un produit : ajouté ou retiré ; une autre catégorie remplace la comparaison (annoncé). */
export function BoutonComparer({ p, tous, auChange, classe = 'cmp-b' }: { p: Produit; tous: Produit[]; auChange?: (texte: string) => void; classe?: string }) {
  const { t, tf } = usePreferences()
  const ids = useComparaison()
  const dedans = ids.includes(p.p)
  const basculer = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const r = basculerDans(ids, p, (id) => tous.find((x) => x.p === id))
    if (r.refus === 'plein') return auChange?.(tf('{n} produits au plus : retire-en un pour comparer « {p} ».', { n: COMPARER_MAX, p: t(p.titre) }))
    if (r.refus === 'categorie') {
      ecrireComparaison([p.p])
      return auChange?.(tf('Une catégorie à la fois : on compare maintenant les {c}.', { c: t(categorieComparee(p)) }))
    }
    ecrireComparaison(r.ids)
    auChange?.(dedans ? tf('« {p} » retiré de la comparaison.', { p: t(p.titre) }) : tf('« {p} » ajouté à la comparaison ({n}/{m}).', { p: t(p.titre), n: r.ids.length, m: COMPARER_MAX }))
  }
  return (
    <span className={classe + (dedans ? ' on' : '')} role="button" tabIndex={0} aria-pressed={dedans} aria-label={tf(dedans ? 'Retirer de la comparaison : {p}' : 'Comparer : {p}', { p: t(p.titre) })} onClick={basculer} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && basculer(e as unknown as MouseEvent)}>
      <Icone nom={dedans ? 'check' : 'scale'} taille={14} trait={2.4} />
      {t(dedans ? 'Comparé' : 'Comparer')}
    </span>
  )
}

const ECRANS_BARRE = ['/liste', '/recherche-resultats', '/selection', '/promotions']

/** La barre « Comparer », sur les listes et les résultats, dès qu'un produit est choisi. */
export function BarreComparer() {
  const ids = useComparaison()
  const lieu = useLocation()
  if (!ids.length || !ECRANS_BARRE.includes(lieu.pathname)) return null
  return <Barre ids={ids} />
}

function Barre({ ids }: { ids: string[] }) {
  const { t, tf } = usePreferences()
  const [c] = useCatalogue()
  const choisis = ids.map((id) => c?.tous.find((x) => x.p === id)).filter((x): x is Produit => !!x)
  if (!c) return null
  return (
    <div className="cmp-barre" role="region" aria-label={tf('Comparaison : {n} produits sur {m}', { n: choisis.length, m: COMPARER_MAX })}>
      <div className="cmp-vig">
        {choisis.map((p) => (
          <button key={p.p} type="button" className="cmp-v" aria-label={tf('Retirer de la comparaison : {p}', { p: t(p.titre) })} onClick={() => ecrireComparaison(ids.filter((x) => x !== p.p))}>
            <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} tailles="44px" />
            <i>
              <Icone nom="x" taille={11} trait={3} />
            </i>
          </button>
        ))}
        {Array.from({ length: COMPARER_MAX - choisis.length }, (_, i) => (
          <span key={i} className="cmp-v vide" aria-hidden="true" />
        ))}
      </div>
      <div className="cmp-txt">
        <b>{tf('{n}/{m}', { n: choisis.length, m: COMPARER_MAX })}</b>
        <small>{choisis[0] ? t(categorieComparee(choisis[0])) : ''}</small>
      </div>
      <button type="button" className="cmp-vider" aria-label={t('Vider la comparaison')} onClick={() => ecrireComparaison([])}>
        <Icone nom="trash-2" taille={18} />
      </button>
      {choisis.length >= 2 ? (
        <Link to={chemin('comparer')} className="btn primary cmp-go">
          {t('Comparer')}
        </Link>
      ) : (
        <span className="btn primary off cmp-go" aria-disabled="true" title={t('Choisis au moins deux produits.')}>
          {t('Comparer')}
        </span>
      )}
    </div>
  )
}
