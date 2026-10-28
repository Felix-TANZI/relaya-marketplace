// Garde de l'espace point relais : un écran qui plante ne laisse jamais une page blanche (au comptoir, le gérant doit
// toujours pouvoir revenir à sa journée) ; l'erreur part au suivi (même connecteur que le client) et le gérant voit
// « Quelque chose s'est mal passé », Recharger et Aujourd'hui. Ses opérations en attente (réceptions, remises, preuves) ne sont jamais effacées.
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { signalerErreur } from '@client/connecteurs/suivi'
import { ACCUEIL, chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

// En démonstration, l'état gardé sur l'appareil peut venir d'une version précédente : « Recharger » repart alors du
// jeu d'essai, SAUF la file hors connexion (opérations faites au comptoir, jamais perdues).
function recharger() {
  if (import.meta.env.VITE_SOURCE !== 'api') {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('blv_r_demo_') && k !== 'blv_r_demo_horsligne') localStorage.removeItem(k)
    } catch {
      /* stockage refusé */
    }
  }
  location.reload()
}

export function EcranErreur() {
  const { t } = usePreferences()
  useEffect(() => {
    document.title = t('Quelque chose s’est mal passé') + ' · BelivaY'
  }, [t])
  return (
    <div id="app">
      <main className="r-main r-seul">
        <div className="r-vide" role="alert">
          <div className="r-vide-i r-rouge">
            <Icone nom="triangle-alert" taille={28} />
          </div>
          <h1>{t('Quelque chose s’est mal passé')}</h1>
          <p>{t('Cet écran n’a pas pu s’afficher. Vos colis, vos preuves et vos opérations en attente sont gardés : rechargez pour reprendre.')}</p>
        </div>
        <button type="button" className="r-btn r-principal" onClick={recharger}>
          <Icone nom="rotate-cw" taille={20} />
          <span>{t('Recharger')}</span>
        </button>
        <a className="r-btn r-second" href={import.meta.env.BASE_URL.replace(/\/$/, '') + chemin(ACCUEIL)}>
          <Icone nom="r-grille" taille={20} />
          <span>{t('Revenir au guichet')}</span>
        </a>
      </main>
    </div>
  )
}

export class GardeErreurs extends Component<{ children: ReactNode }, { echec: boolean }> {
  state = { echec: false }
  static getDerivedStateFromError() {
    return { echec: true }
  }
  componentDidCatch(e: Error, info: ErrorInfo) {
    signalerErreur(e, 'ecran', { composant: info.componentStack?.slice(0, 1500) ?? undefined })
  }
  render() {
    return this.state.echec ? <EcranErreur /> : this.props.children
  }
}
