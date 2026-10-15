// Cœurs « Ajouter aux favoris » des cartes de l'accueil (rangées par catégorie, Flash, « Pour vous ») : le cœur posé
// sur la photo (.hr) ajoute ou retire le favori sans ouvrir le produit, branché sur les vrais favoris (onglet
// Favoris et compteur suivent). Un seul écouteur, en capture, pour toutes les cartes : le lien de la carte ne reçoit
// pas le clic du cœur. État plein quand le produit est en favori.
import { useEffect } from 'react'
import { source } from '../donnees/source'
import { usePreferences } from '../preferences'
import { useMajSession } from '../session'

const CIBLE = 'a[href*="fiche?p="] .hr'

const produitDe = (coeur: Element) => {
  const a = coeur.closest('a')
  const m = a?.getAttribute('href')?.match(/[?&]p=([^&#]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

export function useCoeursFavoris() {
  const { t } = usePreferences()
  const majSession = useMajSession()
  useEffect(() => {
    let favoris = new Set<string>()
    let vivant = true
    let attente = 0
    const marquer = () => {
      attente = 0
      document.querySelectorAll(CIBLE).forEach((c) => {
        const p = produitDe(c)
        if (!p) return
        const on = favoris.has(p)
        c.classList.toggle('on', on)
        c.setAttribute('role', 'button')
        c.setAttribute('tabindex', '0')
        c.setAttribute('aria-pressed', String(on))
        c.setAttribute('aria-label', t(on ? 'Retirer des favoris' : 'Ajouter aux favoris'))
      })
    }
    const plusTard = () => {
      if (!attente) attente = requestAnimationFrame(marquer)
    }
    source
      .favoris()
      .then((f) => {
        if (!vivant) return
        favoris = new Set(f.favoris.map((x) => x.p))
        marquer()
      })
      .catch(() => {})
    const basculer = async (c: Element) => {
      const p = produitDe(c)
      if (!p) return
      const on = await source.basculerFavori(p)
      if (on) favoris.add(p)
      else favoris.delete(p)
      marquer()
      majSession(await source.session())
    }
    const clic = (e: Event) => {
      const c = (e.target as Element | null)?.closest?.(CIBLE)
      if (!c) return
      e.preventDefault()
      e.stopPropagation()
      void basculer(c)
    }
    const touche = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      clic(e)
    }
    document.addEventListener('click', clic, true)
    document.addEventListener('keydown', touche, true)
    const obs = new MutationObserver(plusTard)
    obs.observe(document.body, { childList: true, subtree: true })
    return () => {
      vivant = false
      if (attente) cancelAnimationFrame(attente)
      obs.disconnect()
      document.removeEventListener('click', clic, true)
      document.removeEventListener('keydown', touche, true)
    }
  }, [t, majSession])
}
