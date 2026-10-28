// Garde du site : un écran qui plante ne laisse jamais une page blanche. L'erreur part au suivi
// (src/connecteurs/suivi.ts) et le client voit « Quelque chose s'est mal passé », avec Recharger et l'Aide.
// Aussi : la mesure d'audience des pages vues (seulement avec l'accord du client, Réglages) et l'abonnement push
// rafraîchi. Les erreurs hors de React (scripts, promesses) sont suivies dès main.tsx (installerSuivi).
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { chemin } from '../config/pages'
import { synchroniserPush } from '../connecteurs/push'
import { mesurerPage, signalerErreur } from '../connecteurs/suivi'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

// Écran d'erreur : sans en-tête ni barre (ce sont peut-être eux qui ont planté), dans le style du site.
// L'aide s'ouvre par un vrai chargement de page : l'application repart de zéro.
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
          <p>{t('Cet écran n’a pas pu s’afficher. Tes commandes, ton panier et ton argent ne sont pas touchés : recharge la page pour reprendre.')}</p>
        </div>
        <div className="mt16">
          <button type="button" className="btn primary" onClick={() => location.reload()}>
            <Icone nom="rotate-cw" taille={18} />
            <span>{t('Recharger')}</span>
          </button>
        </div>
        <div className="mt10">
          <a className="btn secondary" href={chemin('aide')}>
            <Icone nom="life-buoy" taille={18} />
            <span>{t('Aide')}</span>
          </a>
        </div>
        <div className="mt10">
          <a className="btn ghost" href={chemin('accueil')}>
            <Icone nom="house" taille={18} />
            <span>{t('Retour à l’accueil')}</span>
          </a>
        </div>
      </main>
    </div>
  )
}

// Limite d'erreur (posée avec key={adresse} autour des écrans : ouvrir une autre adresse retente).
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

// Pages vues (mesure d'audience, avec accord) et abonnement push rafraîchi.
export function Connecteurs() {
  const { mesure } = usePreferences()
  const { pathname } = useLocation()
  useEffect(() => synchroniserPush(), [])
  useEffect(() => {
    if (mesure) mesurerPage(pathname)
  }, [mesure, pathname])
  return null
}
