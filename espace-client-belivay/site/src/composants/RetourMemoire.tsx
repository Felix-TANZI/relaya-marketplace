// Bouton « Revenir » avec mémoire (consigne du porteur) : partout sur le site, la flèche de retour ramène à la page
// où l'on était juste avant (historique de la visite), et non à un parent fixe. Seulement quand la visite n'a pas de
// page précédente (lien ouvert directement, nouvel onglet), le lien d'origine (parent logique) sert de repli.
// Se branche une fois (main.tsx) : intercepte les liens et boutons de retour (aria-label « Revenir », « Retour »,
// « Back », flèche de l'en-tête .ibtn, .cl03-back) sans modifier chaque page.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const LIBELLES = /^(revenir|retour|back|go back)$/i

function precedenteDansLaVisite(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx
  return typeof idx === 'number' && idx > 0
}

export function RetourMemoire() {
  const naviguer = useNavigate()
  useEffect(() => {
    const clic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const el = (e.target as Element | null)?.closest?.('a, button') as HTMLElement | null
      if (!el) return
      const nom = (el.getAttribute('aria-label') ?? '').trim()
      const estRetour = LIBELLES.test(nom) || el.classList.contains('cl03-back') || (el.matches('.hd-sub > a.ibtn:first-child') && !!el.querySelector('svg'))
      if (!estRetour || !precedenteDansLaVisite()) return
      e.preventDefault()
      e.stopPropagation()
      naviguer(-1)
    }
    document.addEventListener('click', clic, true)
    return () => document.removeEventListener('click', clic, true)
  }, [naviguer])
  return null
}
