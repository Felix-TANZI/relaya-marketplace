// Garde de la console : un écran qui plante ne laisse jamais une page blanche ; l'erreur part au suivi (même
// connecteur que le client) et l'utilisateur voit « Quelque chose s'est mal passé », Recharger et le File d’action.
// Une lecture ou un geste refusés à un rôle (AccesRefuse, 403 ROLE_FORBIDDEN) montrent « Réservé » et à qui.
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { signalerErreur } from '@client/connecteurs/suivi'
import { NOM_ROLE } from '../config/libelles'
import { PAGES_NIVEAU, pageOuverte } from '../config/droits'
import { ACCUEIL, chemin } from '../config/pages'
import type { Role } from '../donnees/communs'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

// En démonstration, l'état gardé sur l'appareil peut venir d'une version précédente : « Recharger » repart alors du
// jeu d'essai (rien de réel n'est perdu : en mode serveur, rien n'est effacé).
function recharger() {
  if (import.meta.env.VITE_SOURCE !== 'api') {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('blv_a_demo_')) localStorage.removeItem(k)
    } catch {
      /* stockage refusé */
    }
  }
  location.reload()
}
const ACCUEIL_ABSOLU = import.meta.env.BASE_URL.replace(/\/$/, '') + chemin(ACCUEIL)

/**
 * Refus propre à une page, pour un rôle (écran « hors périmètre » du prototype) : ce que le rôle fait à la place, et où.
 * Versements · Support (ADM-P07, ADM-ROL-04) : le Support ne voit pas les versements ; il ouvre la commande et transmet.
 */
const HORS_PERIMETRE: Record<string, Partial<Record<Role, { texte: string; lien: { route: string; libelle: string; icone: string } }>>> = {
  versements: { support: { texte: 'Les versements du vendredi ne sont pas ouverts au Support. Un vendeur demande où en est son argent : ouvrez la fiche de sa commande (état de l’escrow, date de libération) et, si besoin, transmettez la question à la Finance depuis la demande du support.', lien: { route: 'commandes', libelle: 'Ouvrir les commandes', icone: 'shopping-bag' } } },
}

/** Contenu « réservé » (sans coque : la garde peut être au-dessus de la session). */
export function Reserve({ roles, route, role }: { roles: Role[]; route?: string; role?: Role }) {
  const { t, tf } = usePreferences()
  const noms = roles.map((r) => t(NOM_ROLE[r])).join(', ')
  const propre = route && role ? HORS_PERIMETRE[route]?.[role] : undefined
  // Page ouverte au rôle mais réservée à un niveau (Mon équipe : Responsable d'équipe, ACCES-CONSOLE § 1).
  if (route && role && PAGES_NIVEAU[route] && pageOuverte(route, role))
    return (
      <div className="vide" role="alert">
        <div className="ei">
          <Icone nom="lock" taille={26} />
        </div>
        <h2>{t('Réservé aux responsables d’équipe')}</h2>
        <a className="btn ghost mt16" href={ACCUEIL_ABSOLU}>
          <Icone nom="house" taille={18} />
          <span>{t('Accueil de la console')}</span>
        </a>
      </div>
    )
  return (
    <div className="vide" role="alert">
      <div className="ei">
        <Icone nom="lock" taille={26} />
      </div>
      <h2>{t('Réservé à d’autres rôles')}</h2>
      <p>{tf('Cette page est ouverte à : {roles}. Demandez à la Direction si votre travail l’exige : chaque rôle est attribué et journalisé.', { roles: noms })}</p>
      {propre && (
        <>
          <p className="mt10">{t(propre.texte)}</p>
          <a className="btn secondary mt16" href={import.meta.env.BASE_URL.replace(/\/$/, '') + chemin(propre.lien.route)}>
            <Icone nom={propre.lien.icone} taille={18} />
            <span>{t(propre.lien.libelle)}</span>
          </a>
        </>
      )}
      <a className="btn ghost mt16" href={ACCUEIL_ABSOLU}>
        <Icone nom="house" taille={18} />
        <span>{t('Accueil de la console')}</span>
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
            <p>{t('Cet écran n’a pas pu s’afficher. Aucune décision n’a été prise ni perdue : rechargez la page pour reprendre.')}</p>
            <div className="btns mt16">
              <button type="button" className="btn primary" onClick={recharger}>
                <Icone nom="rotate-cw" taille={18} />
                <span>{t('Recharger')}</span>
              </button>
              <a className="btn ghost" href={ACCUEIL_ABSOLU}>
                <Icone nom="house" taille={18} />
                <span>{t('Accueil de la console')}</span>
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
