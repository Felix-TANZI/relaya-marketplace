// Tailwind en premier (TAILWIND.md) : nos feuilles de style, importées après, l'emportent à spécificité égale.
import './styles/tailwind.css'
import './styles/prototype.css'
import './styles/site.css'
import './styles/ecarts.css'
import './styles/animations.css'
// Grands écrans (tablette, ordinateur) : rien ne s'y applique sous 600 px.
import './styles/larges.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { Animations } from './composants/Animations'
import { AvisErreurs } from './composants/AvisErreurs'
import { BandeauDemo } from './composants/BandeauDemo'
import { BarreComparer } from './composants/Comparer'
import { BandeauPresentation } from './demo/presentation'
import { RetourMemoire } from './composants/RetourMemoire'
import { FeuillesLarges } from './composants/Feuille'
import { Connecteurs, GardeErreurs } from './composants/Garde'
import { installerSuivi } from './connecteurs/suivi'
import { installerPrechargement, precharger } from './pages/registre'
import { PreferencesProvider } from './preferences'
import { SessionProvider } from './session'

// Erreurs non attrapées : au suivi (VITE_ERREURS_URL), dès le premier script.
installerSuivi()

// Après une mise en ligne, un ancien fichier de document n'existe plus : la page se recharge sur la nouvelle version.
// Un morceau de l'application que le navigateur n'arrive pas à précharger : avec du réseau (mise à jour publiée),
// recharger ; hors connexion, surtout pas — recharger sans réseau remplace l'application par la page d'erreur du
// navigateur. Hors connexion, l'écran déjà en mémoire s'ouvre (le préchargement manqué est ignoré).
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  if (navigator.onLine) location.reload()
})

// Le document de l'adresse ouverte est chargé avant le premier affichage (pages/registre.ts).
// Ensuite, les pages probables se chargent d'avance (au toucher d'un lien, puis au repos).
precharger(location.pathname).then(() => {
  installerPrechargement()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <PreferencesProvider>
          <GardeErreurs>
            <SessionProvider>
              <App />
              <BandeauDemo />
              <BandeauPresentation />
              <BarreComparer />
              <AvisErreurs />
              <RetourMemoire />
              <Animations />
              <FeuillesLarges />
              <Connecteurs />
            </SessionProvider>
          </GardeErreurs>
        </PreferencesProvider>
      </BrowserRouter>
    </StrictMode>,
  )
})
