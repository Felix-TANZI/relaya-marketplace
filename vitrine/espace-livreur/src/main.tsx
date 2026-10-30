// Espace livreur : animations du client (même famille : bulle de verre, feuilles, entrées), puis la feuille propre
// au livreur (identité verte légère, téléphone d'abord, lisible en plein soleil, sombre la nuit), entre le kit du
// prototype (prototype.css, généré par outils/styles.mjs) et ses écarts décidés (ecarts-prototype.css).
import '@client/styles/animations.css'
import './styles/prototype.css'
import './styles/livreur.css'
import './styles/ecarts-prototype.css'
import './styles/sombre.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Animations } from '@client/composants/Animations'
import { FeuillesLarges } from '@client/composants/Feuille'
import { RetourMemoire } from '@client/composants/RetourMemoire'
import { installerSuivi } from '@client/connecteurs/suivi'
import App from './App'
import { BandeauPresentation } from './demo/presentation'
import { SignauxDuLivreur } from './composants/Globaux'
import { GardeErreurs } from './composants/Garde'
import { routeDe } from './config/pages'
import { precharger } from './config/routes'
import { PreferencesProvider } from './preferences'
import { SessionProvider } from './session'

installerSuivi()
// Un morceau d'écran que le navigateur n'arrive pas à précharger : avec du réseau (mise à jour publiée), recharger ;
// hors connexion, surtout pas — recharger sans réseau laissait une page d'erreur du navigateur à la place de
// l'application (la file d'envoi devenait inaccessible). Hors connexion, l'écran est déjà en mémoire : le
// préchargement manqué (feuille de style, module partagé) est ignoré et l'écran s'ouvre.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  if (navigator.onLine) location.reload()
})

// Application installable et ouverte sans réseau (hors connexion prioritaire, LIV-P22) : service worker de la portée
// /livreur/. Pas sous navigateur piloté (tests) : chaque essai part d'un état neuf.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !navigator.webdriver)
  window.addEventListener('load', () => void navigator.serviceWorker.register('/livreur/sw.js', { scope: '/livreur/' }).catch(() => undefined))

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
              <SignauxDuLivreur />
            </SessionProvider>
          </GardeErreurs>
        </PreferencesProvider>
      </BrowserRouter>
    </StrictMode>,
  )
})
