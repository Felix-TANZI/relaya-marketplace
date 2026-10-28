// Garde de l'espace livreur : un écran qui plante ne laisse jamais une page blanche (sur la route, le livreur doit
// toujours pouvoir revenir à sa journée) ; l'erreur part au suivi (même connecteur que le client) et le livreur voit
// « Quelque chose s'est mal passé », Recharger et Aujourd'hui. Ses gestes en attente ne sont jamais effacés.
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { signalerErreur } from '@client/connecteurs/suivi'
import { ACCUEIL, chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

// En démonstration, l'état gardé sur l'appareil peut venir d'une version précédente : « Recharger » repart alors du
// jeu d'essai, SAUF la file hors connexion (gestes faits sur la route, jamais perdus).
function recharger() {
  if (import.meta.env.VITE_SOURCE !== 'api') {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('blv_l_demo_') && k !== 'blv_l_demo_horsligne') localStorage.removeItem(k)
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
      <main className="l-main l-seul">
        <div className="l-vide" role="alert">
          <div className="l-vide-i l-rouge">
            <Icone nom="triangle-alert" taille={28} />
          </div>
          <h1>{t('Quelque chose s’est mal passé')}</h1>
          <p>{t('Cet écran n’a pas pu s’afficher. Vos colis, vos preuves et vos gestes en attente sont gardés : rechargez pour reprendre.')}</p>
        </div>
        <button type="button" className="l-btn l-principal" onClick={recharger}>
          <Icone nom="rotate-cw" taille={20} />
          <span>{t('Recharger')}</span>
        </button>
        <a className="l-btn l-second" href={import.meta.env.BASE_URL.replace(/\/$/, '') + chemin(ACCUEIL)}>
          <Icone nom="house" taille={20} />
          <span>{t('Revenir à ma journée')}</span>
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
