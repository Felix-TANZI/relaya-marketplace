// Espace point relais : animations du client (même famille : bulle de verre, feuilles, entrées), les jetons de couleur
// du relais (jetons.css, SEUL fichier où une couleur est écrite, clair et sombre), les classes transcrites du prototype
// (prototype.css, généré par outils/transcription.mjs), puis la feuille du socle (relais.css : base, coque, tablette).
import '@client/styles/animations.css'
import './styles/jetons.css'
import './styles/prototype.css'
import './styles/relais.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Animations } from '@client/composants/Animations'
import { FeuillesLarges } from '@client/composants/Feuille'
import { RetourMemoire } from '@client/composants/RetourMemoire'
import { installerSuivi } from '@client/connecteurs/suivi'
import App from './App'
import { BandeauPresentation } from './demo/presentation'
import { SignauxDuRelais } from './composants/Globaux'
import { GardeErreurs } from './composants/Garde'
import { routeDe } from './config/pages'
import { precharger } from './config/routes'
import { PreferencesProvider } from './preferences'
import { SessionProvider } from './session'
// Invite d'installation d'Android (beforeinstallprompt) écoutée dès le démarrage : elle n'est annoncée qu'une fois, tôt.
import './pages/PR-03/installation'

installerSuivi()
// Un morceau de l'application introuvable après une mise à jour : recharger, mais seulement avec du réseau (hors
// connexion, recharger perdrait l'écran ouvert ; la page garde l'erreur de chargement et la file reste intacte).
window.addEventListener('vite:preloadError', (e) => {
  if (!navigator.onLine) return
  e.preventDefault()
  location.reload()
})

// Application installable et ouverte sans réseau (OFF-01) : service worker de la portée /relais/. Pas sous navigateur
// piloté (tests) : chaque essai part d'un état neuf.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !navigator.webdriver)
  window.addEventListener('load', () => void navigator.serviceWorker.register('/relais/sw.js', { scope: '/relais/' }).catch(() => undefined))

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
// L'écran de l'adresse ouverte est chargé avant le premier affichage : il paraît d'un coup.
void precharger(routeDe(location.pathname.slice(BASE.length))).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter basename={BASE}>
        <PreferencesProvider>
          <GardeErreurs>
            <SessionProvider>
              <App />
              <BandeauPresentation />
              <RetourMemoire />
              <Animations />
              <FeuillesLarges />
              <SignauxDuRelais />
            </SessionProvider>
          </GardeErreurs>
        </PreferencesProvider>
      </BrowserRouter>
    </StrictMode>,
  )
})
