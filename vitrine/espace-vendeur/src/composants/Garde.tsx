// Garde de l'espace vendeur : un écran qui plante ne laisse jamais une page blanche ; l'erreur part au suivi (même
// connecteur que le client) et le vendeur voit « Quelque chose s'est mal passé », Recharger et l'accueil. Un écran
// réservé au propriétaire ouvert par l'accès Préparation montre « Réservé au propriétaire » (ReserveAuProprietaire).
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { signalerErreur } from '@client/connecteurs/suivi'
import { chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

// En démonstration, l'état gardé sur l'appareil peut venir d'une version précédente : « Recharger » repart alors du
// jeu d'essai (rien de réel n'est perdu : en mode serveur, rien n'est effacé).
function recharger() {
  if (import.meta.env.VITE_SOURCE !== 'api') {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('blv_v_demo_')) localStorage.removeItem(k)
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
      <main style={{ paddingTop: 'calc(var(--sb) + 48px)' }}>
        <div className="empty" role="alert">
          <div className="ei">
            <Icone nom="triangle-alert" taille={26} />
          </div>
          <h3>{t('Quelque chose s’est mal passé')}</h3>
          <p>{t('Cet écran n’a pas pu s’afficher. Vos commandes et votre argent ne sont pas touchés : rechargez la page pour reprendre.')}</p>
        </div>
        <div className="mt16">
          <button type="button" className="btn primary" onClick={recharger}>
            <Icone nom="rotate-cw" taille={18} />
            <span>{t('Recharger')}</span>
          </button>
        </div>
        <div className="mt10">
          <a className="btn ghost" href={import.meta.env.BASE_URL.replace(/\/$/, '') + chemin('accueil')}>
            <Icone nom="house" taille={18} />
            <span>{t('Retour à l’accueil')}</span>
          </a>
        </div>
      </main>
    </div>
  )
}

/** Écran réservé au propriétaire ouvert par l'accès Préparation (403 owner_only) : on le dit, sans montant. */
export function EcranReserve() {
  const { t } = usePreferences()
  return (
    <div id="app">
      <main style={{ paddingTop: 'calc(var(--sb) + 48px)' }}>
        <div className="empty" role="alert">
          <div className="ei">
            <Icone nom="lock" taille={26} />
          </div>
          <h3>{t('Réservé au propriétaire')}</h3>
          <p>{t('Les montants sont réservés au propriétaire de la boutique.')}</p>
        </div>
        <div className="mt16">
          <a className="btn ghost" href={import.meta.env.BASE_URL.replace(/\/$/, '') + chemin('accueil')}>
            <Icone nom="house" taille={18} />
            <span>{t('Retour à l’accueil')}</span>
          </a>
        </div>
      </main>
    </div>
  )
}

export class GardeErreurs extends Component<{ children: ReactNode }, { echec: boolean; reserve: boolean }> {
  state = { echec: false, reserve: false }
  static getDerivedStateFromError(e: unknown) {
    return { echec: true, reserve: e instanceof Error && e.name === 'ReserveAuProprietaire' }
  }
  componentDidCatch(e: Error, info: ErrorInfo) {
    if (e.name === 'ReserveAuProprietaire') return // un refus attendu, pas une panne
    signalerErreur(e, 'ecran', { composant: info.componentStack?.slice(0, 1500) ?? undefined })
  }
  render() {
    return this.state.reserve ? <EcranReserve /> : this.state.echec ? <EcranErreur /> : this.props.children
  }
}
