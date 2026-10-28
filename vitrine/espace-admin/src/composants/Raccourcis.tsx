// Raccourcis du clavier de la console (motif M13) : un outil de travail d'ordinateur.
// - ⌘K, Ctrl+K ou « / » : chercher (la recherche de la barre du haut quand elle est à l'écran, sinon la page
//   Rechercher partout) ; « / » va à la recherche de la liste quand la page en a une (Recherche du kit) ;
// - « g » puis une lettre : aller à une page (f file, v vue d'ensemble, l litiges, c commandes, a remboursements,
//   k KYC, p paquets, j journal, q quatre yeux) — seulement si le rôle ouvre la page (config/droits.ts) ;
// - « ? » : la liste des raccourcis (feuille « ?pop=raccourcis », fermée par Échap), avec ceux du poste de travail
//   quand un poste de décision est à l'écran (poste/raccourcis.ts).
// Rien n'est capté pendant une saisie (champ, zone de texte, liste), sauf ⌘K / Ctrl+K.
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { useRouteOuverte } from '../session'
import { avecPop } from './coque'
import { RACCOURCIS_POSTE } from './poste/raccourcis'

export const ALLER: { touche: string; route: string; titre: string }[] = [
  { touche: 'f', route: 'file', titre: 'File d’action' },
  { touche: 'v', route: 'direct', titre: 'Vue d’ensemble' },
  { touche: 'l', route: 'litige', titre: 'Litiges' },
  { touche: 'c', route: 'commandes', titre: 'Commandes' },
  { touche: 'a', route: 'remboursements', titre: 'Remboursements' },
  { touche: 'k', route: 'kyc', titre: 'Revue KYC' },
  { touche: 'p', route: 'paquets', titre: 'Paquets et dispatch' },
  { touche: 'j', route: 'journal', titre: 'Journal d’audit' },
  { touche: 'q', route: 'quatreyeux', titre: 'Quatre yeux en attente' },
]

const enSaisie = (e: EventTarget | null) => e instanceof HTMLElement && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName))

/** Chercher : la recherche de la barre du haut si elle est visible, sinon la page Rechercher partout. */
export function useChercher() {
  const naviguer = useNavigate()
  return () => {
    const champ = document.querySelector<HTMLInputElement>('.tb .srch input')
    if (champ && champ.offsetParent !== null) window.dispatchEvent(new Event('blv-a-chercher'))
    else naviguer(chemin('recherche'))
  }
}

export function Raccourcis() {
  const { t } = usePreferences()
  const lieu = useLocation()
  const naviguer = useNavigate()
  const ouverte = useRouteOuverte()
  const chercher = useChercher()
  const g = useRef(0)
  const pop = new URLSearchParams(lieu.search).get('pop')
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        return chercher()
      }
      if (e.metaKey || e.ctrlKey || e.altKey || enSaisie(e.target) || document.querySelector('#app .sheet')) return
      if (e.key === '/') {
        // Une page qui a sa propre recherche de liste (Recherche du kit, aria-keyshortcuts="/") la garde pour « / ».
        if (document.querySelector('main [aria-keyshortcuts="/"]')) return
        e.preventDefault()
        return chercher()
      }
      if (e.key === '?') {
        e.preventDefault()
        return naviguer(avecPop(lieu.pathname, lieu.search, 'raccourcis'))
      }
      if (e.key === 'g') {
        g.current = Date.now()
        return
      }
      if (Date.now() - g.current < 1500) {
        g.current = 0
        const a = ALLER.find((x) => x.touche === e.key.toLowerCase())
        if (a && ouverte(a.route)) {
          e.preventDefault()
          naviguer(chemin(a.route))
        }
      }
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  })
  const fermer = () => naviguer(avecPop(lieu.pathname, lieu.search, null), { replace: true })
  const ligne = (touches: string[], quoi: string) => (
    <div className="kv" key={quoi + touches.join('')}>
      <span className="k">{t(quoi)}</span>
      <span className="v">
        {touches.map((k, i) => (
          <kbd key={i} className="e-touche">
            {k}
          </kbd>
        ))}
      </span>
    </div>
  )
  return (
    <Feuille ouverte={pop === 'raccourcis'} fermer={fermer} titre={t('Raccourcis du clavier')}>
      <h2 className="card-t">{t('Raccourcis du clavier')}</h2>
      <p className="card-s">{t('Ils ne s’activent pas pendant une saisie.')}</p>
      <div className="mt14">
        {ligne(['⌘', 'K'], 'Chercher partout')}
        {ligne(['/'], 'Chercher partout')}
        {ALLER.filter((a) => ouverte(a.route)).map((a) => ligne(['g', a.touche], a.titre))}
        {pop === 'raccourcis' && document.querySelector('#app [data-poste]') && (
          <>
            <h3 className="e-racc-h">{t('Poste de travail')}</h3>
            {RACCOURCIS_POSTE.map((r) => ligne(r.touches, r.quoi))}
          </>
        )}
        {ligne(['?'], 'Cette liste')}
        {ligne(['Échap'], 'Fermer une fenêtre')}
      </div>
    </Feuille>
  )
}
