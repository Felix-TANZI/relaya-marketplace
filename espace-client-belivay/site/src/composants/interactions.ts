// Gestes du prototype qui ne changent pas d'écran (« Interactions du prototype, 28 sept. » : chaque bouton
// répond), repris sur le site pour les écrans construits : interrupteurs, quantités, voile d'une feuille,
// choix uniques qui pointent vers l'écran ouvert (puces, boutons radio, segments), mot de passe affiché,
// « se souvenir de moi », filtre par univers. Les messages de confirmation du prototype (#proto-toast) sont
// un outil de revue : ils ne sont pas repris. Quand l'API existera, chaque geste qui enregistre quelque chose
// (interrupteur de notification, quantité) appellera la source ; ici, l'écran répond seulement.
import type { MouseEvent } from 'react'

type Naviguer = (vers: string | number, options?: { replace?: boolean }) => void

const MOTS_FERMER = /^(annuler|garder.*|fermer|plus tard|pas maintenant|non merci|retour|ignorer|close|cancel|keep.*|later|not now)$/i

export function interagir(e: MouseEvent, naviguer: Naviguer, adresseCourante: string): boolean {
  const cible = e.target as HTMLElement
  const app = cible.closest('#app')
  if (!app) return false

  // Interrupteur : allumé / éteint ; verrouillé, il ne bouge pas (notification qui protège la commande).
  const tg = cible.closest('button.tg')
  if (tg) {
    if (!tg.classList.contains('lock')) {
      const on = tg.classList.toggle('on')
      tg.setAttribute('aria-checked', on ? 'true' : 'false')
    }
    return true
  }

  // Quantité : − / + autour du nombre.
  const b = cible.closest('button')
  if (b) {
    const lab = b.getAttribute('aria-label') || ''
    const txt = (b.textContent || '').trim()
    if (lab === 'Moins' || lab === 'Plus' || txt === '−' || txt === '+') {
      const nombre = [...(b.parentElement?.children ?? [])].find((x) => x !== b && x.tagName !== 'BUTTON' && /^\d+$/.test((x.textContent || '').trim()))
      if (nombre) {
        const n = Number(nombre.textContent!.trim())
        nombre.textContent = String(lab === 'Plus' || txt === '+' ? n + 1 : Math.max(0, n - 1))
      }
      return true
    }
  }

  // Voile d'une feuille : la ferme par son bouton de fermeture, sinon revient à l'écran précédent.
  if (cible.closest('.veil')) {
    const feuille = app.querySelector('.sheet')
    const fermer =
      feuille &&
      ((feuille.querySelector(':is([aria-label*="Fermer"], [aria-label*="Close"]):not(.sheet-x)') as HTMLElement | null) ||
        ([...feuille.querySelectorAll('a[href]')] as HTMLElement[]).find((a) => !a.matches('.danger, .primary') && MOTS_FERMER.test((a.textContent || '').trim())))
    if (fermer) fermer.click()
    else naviguer(-1)
    return true
  }

  // « Se souvenir de moi ».
  const rmb = cible.closest('.rmb')
  if (rmb) {
    const on = rmb.classList.toggle('on')
    rmb.setAttribute('aria-checked', on ? 'true' : 'false')
    return true
  }

  // Filtre par univers (promotions) : les cartes d'un autre univers se cachent.
  const puce = cible.closest('.dx-filt .chip')
  if (puce) {
    const u = puce.getAttribute('data-uni')
    app.querySelectorAll<HTMLElement>('[data-fu]').forEach((x) => (x.style.display = !u || x.getAttribute('data-fu') === u ? 'contents' : 'none'))
  }

  const a = cible.closest<HTMLElement>('a[href], [role=button]')
  if (!a) return false

  // Mot de passe : afficher / masquer.
  if (a.getAttribute('role') === 'button' && /mot de passe|password/i.test(a.getAttribute('aria-label') || '')) {
    const champ = a.closest('.inp')?.querySelector<HTMLElement>('.grow')
    if (champ) {
      const montrer = !champ.dataset.pw
      if (montrer) {
        champ.dataset.pw = champ.textContent || ''
        champ.textContent = 'Yaounde#2026' // mot de passe de la démonstration (prototype)
      } else {
        champ.textContent = champ.dataset.pw!
        delete champ.dataset.pw
      }
      a.setAttribute('aria-label', montrer ? 'Masquer le mot de passe' : 'Afficher le mot de passe')
    }
    e.preventDefault()
    return true
  }

  // Choix unique vers l'écran ouvert (puce, bouton radio, segment) : il s'allume sur place.
  const href = a.getAttribute('href')
  if (!href) return false
  const option = a.classList.contains('radio') || a.classList.contains('chip') || a.getAttribute('role') === 'radio' || /(^| )(seg|cl10-seg2)( |$)/.test(a.parentElement?.className || '')
  const ici = href === adresseCourante || (option && !href.includes('?') && href === adresseCourante.split('?')[0])
  if (!option || !ici) return false
  e.preventDefault()
  let groupe: HTMLElement | null = null
  if (a.classList.contains('radio')) {
    groupe = a.parentElement
    while (groupe && groupe.querySelectorAll('a.radio').length < 2) groupe = groupe.parentElement
  } else groupe = a.parentElement
  if (groupe) {
    const sel = a.classList.contains('radio') ? 'a.radio' : ':scope > a'
    groupe.querySelectorAll(sel).forEach((x) => {
      x.classList.toggle('on', x === a)
      if (x.hasAttribute('aria-checked')) x.setAttribute('aria-checked', x === a ? 'true' : 'false')
    })
  }
  return true
}
