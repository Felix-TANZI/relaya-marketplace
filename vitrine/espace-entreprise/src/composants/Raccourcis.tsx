// Raccourcis du clavier de l'espace entreprise (motif M13 ; ENRICHISSEMENTS P02) : un outil de travail d'ordinateur.
// - ⌘K, Ctrl+K ou « / » : chercher (la recherche de la barre du haut quand elle est à l'écran, sinon la page
//   Rechercher partout) ; « / » va à la recherche de la liste quand la page en a une (Recherche du kit) ;
// - « g » puis une lettre : aller à une page (t tableau, p paquets, m missions, i incidents, f flotte, l litiges,
//   r règlements, s paramètres) — seulement si le rôle ouvre la page (ENT-RG-R25) ;
// - « ? » : la liste des raccourcis (feuille « ?pop=raccourcis », fermée par Échap).
// Rien n'est capté pendant une saisie (champ, zone de texte, liste), sauf ⌘K / Ctrl+K.
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { useRouteOuverte } from '../session'
import { avecPop } from './coque'

export const ALLER: { touche: string; route: string; titre: string }[] = [
  { touche: 't', route: 'tableau', titre: 'Tableau de bord' },
  { touche: 'p', route: 'paquets', titre: 'Paquets disponibles' },
  { touche: 'm', route: 'missions', titre: 'Missions et carte' },
  { touche: 'i', route: 'incidents', titre: 'Incidents à valider' },
  { touche: 'f', route: 'flotte', titre: 'Livreurs' },
  { touche: 'l', route: 'litiges', titre: 'Litiges' },
  { touche: 'r', route: 'reglements', titre: 'Règlements' },
  { touche: 's', route: 'parametres', titre: 'Paramètres' },
]

const enSaisie = (e: EventTarget | null) => e instanceof HTMLElement && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName))

/** Chercher : la recherche de la barre du haut si elle est visible, sinon la page Rechercher partout. */
export function useChercher() {
  const naviguer = useNavigate()
  return () => {
    const champ = document.querySelector<HTMLInputElement>('.tb .srch input')
    if (champ && champ.offsetParent !== null) window.dispatchEvent(new Event('blv-e-chercher'))
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
        {ligne(['?'], 'Cette liste')}
        {ligne(['Échap'], 'Fermer une fenêtre')}
      </div>
    </Feuille>
  )
}
