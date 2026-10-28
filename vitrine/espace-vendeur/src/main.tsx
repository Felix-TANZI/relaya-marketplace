// Espace vendeur : feuille du prototype vendeur (outils/styles.mjs), puis ce que le client ajoute à la sienne (champs
// réels, taille du texte, animations : même famille, site/src/styles), puis les ajouts propres au vendeur.
import './styles/prototype.css'
import '@client/styles/site.css'
import '@client/styles/animations.css'
import './styles/vendeur.css'
import './styles/larges.css'
import './styles/pro.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Animations } from '@client/composants/Animations'
import { FeuillesLarges } from '@client/composants/Feuille'
import { RetourMemoire } from '@client/composants/RetourMemoire'
import { installerSuivi } from '@client/connecteurs/suivi'
import App from './App'
import { BandeauPresentation } from './demo/presentation'
import { ActionsPrototype, SonsDuVendeur } from './composants/Globaux'
import { GardeErreurs } from './composants/Garde'
import { precharger } from './config/routes'
import { routeDe } from './config/pages'
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

// Invite d'installation (INS-03) : l'événement part souvent avant l'ouverture de l'écran Installer (chargé à la
// demande) ; il est gardé ici, l'écran le lit dans window.__blvInvite.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as Window & { __blvInvite?: Event | null }).__blvInvite = e
})

// Application installable et ouverte sans réseau (VD03-R16, VD-D02.A10) : service worker de la portée /vendeur/.
// Pas sous navigateur piloté (tests) : chaque essai part d'un état neuf, comme mouvementLibre() du client.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !navigator.webdriver)
  window.addEventListener('load', () => void navigator.serviceWorker.register('/vendeur/sw.js', { scope: '/vendeur/' }).catch(() => undefined))

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
              <ActionsPrototype />
              <SonsDuVendeur />
            </SessionProvider>
          </GardeErreurs>
        </PreferencesProvider>
      </BrowserRouter>
    </StrictMode>,
  )
})
