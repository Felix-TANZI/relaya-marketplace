// Garde de l'espace entreprise : un écran qui plante ne laisse jamais une page blanche ; l'erreur part au suivi (même
// connecteur que le client) et l'utilisateur voit « Quelque chose s'est mal passé », Recharger et le tableau de bord.
// Une lecture ou un geste refusés à un rôle (AccesRefuse, 403 ROLE_FORBIDDEN) montrent « Réservé » et à qui.
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { signalerErreur } from '@client/connecteurs/suivi'
import { NOM_ROLE } from '../config/libelles'
import { ACCUEIL, chemin } from '../config/pages'
import type { Role } from '../donnees/communs'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

// En démonstration, l'état gardé sur l'appareil peut venir d'une version précédente : « Recharger » repart alors du
// jeu d'essai (rien de réel n'est perdu : en mode serveur, rien n'est effacé).
function recharger() {
  if (import.meta.env.VITE_SOURCE !== 'api') {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('blv_e_demo_')) localStorage.removeItem(k)
    } catch {
      /* stockage refusé */
    }
  }
  location.reload()
}
const ACCUEIL_ABSOLU = import.meta.env.BASE_URL.replace(/\/$/, '') + chemin(ACCUEIL)

/** Contenu « réservé » (sans coque : la garde peut être au-dessus de la session). */
export function Reserve({ roles }: { roles: Role[] }) {
  const { t, tf } = usePreferences()
  const noms = roles.map((r) => t(NOM_ROLE[r])).join(', ')
  return (
    <div className="vide" role="alert">
      <div className="ei">
        <Icone nom="lock" taille={26} />
      </div>
      <h2>{t('Réservé à d’autres rôles')}</h2>
      <p>{tf('Cette page est ouverte à : {roles}. Demandez au propriétaire de l’entreprise si vous en avez besoin.', { roles: noms })}</p>
      <a className="btn ghost mt16" href={ACCUEIL_ABSOLU}>
        <Icone nom="layout-dashboard" taille={18} />
        <span>{t('Tableau de bord')}</span>
      </a>
    </div>
  )
}

export function EcranErreur({ roles }: { roles?: Role[] }) {
  const { t } = usePreferences()
  useEffect(() => {
    document.title = t(roles ? 'Réservé à d’autres rôles' : 'Quelque chose s’est mal passé') + ' · BelivaY'
  }, [t, roles])
  return (
    <div id="app">
      <main id="contenu">
        {roles ? (
          <Reserve roles={roles} />
        ) : (
          <div className="vide" role="alert">
            <div className="ei">
              <Icone nom="triangle-alert" taille={26} />
            </div>
            <h2>{t('Quelque chose s’est mal passé')}</h2>
            <p>{t('Cet écran n’a pas pu s’afficher. Vos paquets, vos missions et vos règlements ne sont pas touchés : rechargez la page pour reprendre.')}</p>
            <div className="btns mt16">
              <button type="button" className="btn primary" onClick={recharger}>
                <Icone nom="rotate-cw" taille={18} />
                <span>{t('Recharger')}</span>
              </button>
              <a className="btn ghost" href={ACCUEIL_ABSOLU}>
                <Icone nom="layout-dashboard" taille={18} />
                <span>{t('Tableau de bord')}</span>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// « cle » (l'adresse ouverte) : une panne est oubliée quand on change de page, SANS démonter l'arbre (un démontage à
// chaque navigation viderait l'écran le temps que la page suivante se charge : écran blanc ou noir entre deux pages).
export class GardeErreurs extends Component<{ children: ReactNode; cle?: string }, { echec: boolean; roles: Role[] | null }> {
  state: { echec: boolean; roles: Role[] | null } = { echec: false, roles: null }
  static getDerivedStateFromError(e: unknown) {
    return { echec: true, roles: e instanceof Error && e.name === 'AccesRefuse' ? ((e as Error & { roles?: Role[] }).roles ?? []) : null }
  }
  componentDidUpdate(avant: { cle?: string }) {
    if (this.state.echec && avant.cle !== this.props.cle) this.setState({ echec: false, roles: null })
  }
  componentDidCatch(e: Error, info: ErrorInfo) {
    if (e.name === 'AccesRefuse') return // un refus attendu, pas une panne
    signalerErreur(e, 'ecran', { composant: info.componentStack?.slice(0, 1500) ?? undefined })
  }
  render() {
    return this.state.echec ? <EcranErreur roles={this.state.roles ?? undefined} /> : this.props.children
  }
}
