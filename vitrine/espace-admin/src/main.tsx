// Console d'administration : animations de la famille (site/src/styles/animations.css : barre du bas de verre,
// feuilles, transitions de page), les jetons de couleur de la console (graphite, seul fichier de couleurs), la base, puis la
// feuille du PROTOTYPE (outils/styles.mjs : balisage et classes du prototype, BRIEF-PROTOTYPE), ses corrections
// (contraste, cibles), la coque et les composants communs de la console.
import '@client/styles/animations.css'
import './styles/jetons.css'
import './styles/base.css'
import './styles/prototype.css'
import './styles/ecarts.css'
import './styles/coque.css'
import './styles/console.css'
import './styles/travail.css'
import './styles/lisibilite.css'
import './styles/vie.css'
import './styles/finitions.css'
import './composants/vie'
import './composants/finitions'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Animations } from '@client/composants/Animations'
import { FeuillesLarges } from '@client/composants/Feuille'
import { RetourMemoire } from '@client/composants/RetourMemoire'
import { installerSuivi } from '@client/connecteurs/suivi'
import App from './App'
import { GardeErreurs } from './composants/Garde'
import { precharger, ROUTES } from './config/routes'
import { routeDe } from './config/pages'
import { chargerAnglais, i18n } from '@client/i18n/i18next'
import { chargerDictionnaireAnglais } from './i18n/dictionnaire'
import { PreferencesProvider } from './preferences'
import { SessionProvider } from './session'

installerSuivi()
// Un morceau de l'application que le navigateur n'arrive pas à précharger : avec du réseau (mise à jour publiée),
// recharger ; hors connexion, surtout pas — recharger sans réseau remplace l'application par la page d'erreur du
// navigateur. Hors connexion, l'écran déjà en mémoire s'ouvre (le préchargement manqué est ignoré).
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  if (navigator.onLine) location.reload()
})

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
// L'écran de l'adresse ouverte est chargé avant le premier affichage : il paraît d'un coup.
// Préchargement : l'écran d'un lien survolé, touché ou atteint au clavier ; puis, au repos, tous les écrans (un par
// un, sans gêner la page ouverte). Une page suivante est ainsi déjà là quand on la demande : aucun écran vide.
function prechargerLien(e: Event) {
  const a = (e.target as Element | null)?.closest?.('a[href]')
  const href = a?.getAttribute('href')
  if (!href || !href.startsWith(BASE + '/')) return
  void precharger(routeDe(new URL(href, location.href).pathname.slice(BASE.length)))
}
for (const ev of ['pointerover', 'pointerdown', 'focusin']) document.addEventListener(ev, prechargerLien, { passive: true, capture: true })
function prechargerTout() {
  const reste = Object.keys(ROUTES)
  const repos = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 200))
  const suivant = () => {
    const r = reste.shift()
    if (r) void precharger(r).then(() => repos(suivant))
  }
  repos(suivant)
}

// Anglais choisi : le dictionnaire est chargé avant le premier affichage (aucun passage par le français).
const anglaisChoisi = (() => {
  try {
    return localStorage.getItem('blv_a_lang') === 'en'
  } catch {
    return false
  }
})()
const dictionnaire = anglaisChoisi ? chargerDictionnaireAnglais()
      .then((d) => (chargerAnglais(d, {}), (document.documentElement.lang = 'en'), i18n.changeLanguage('en')))
      .catch(() => undefined) : Promise.resolve()

void Promise.all([precharger(routeDe(location.pathname.slice(BASE.length))), dictionnaire]).then(() => {
  prechargerTout()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter basename={BASE}>
        <PreferencesProvider>
          <GardeErreurs>
            <SessionProvider>
              <App />
              <RetourMemoire />
              <Animations />
              <FeuillesLarges />
            </SessionProvider>
          </GardeErreurs>
        </PreferencesProvider>
      </BrowserRouter>
    </StrictMode>,
  )
})
