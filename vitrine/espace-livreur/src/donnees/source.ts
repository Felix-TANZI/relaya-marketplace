// SourceLivreur : tout ce que l'espace livreur lit et écrit, en domaines (un fichier par domaine dans
// src/donnees/domaines/, une démonstration par domaine dans src/demo/). Les écrans n'appellent que
// `source.<domaine>.<méthode>()` : ils ne savent pas d'où viennent les données. VITE_SOURCE=api : le serveur (routes
// /api/courier/…, kit backend-kit/apps/livreur_*), connecteurs dans src/api/domaines/<domaine>.ts (CONNECTEURS-LIVREUR.md).
// Ajouter une méthode : dans le fichier du domaine (type) et sa démonstration (src/demo/<domaine>.ts) ; ce fichier-ci
// ne change que pour un domaine nouveau.
import { env } from '@client/config/env'
import { sourceApi } from '../api/source-api'
import { sessionHybride } from './session-hybride'
import type { DomaineAcces } from './domaines/acces'
import type { DomaineActivite } from './domaines/activite'
import type { DomaineAide } from './domaines/aide'
import type { DomaineAujourdhui } from './domaines/aujourdhui'
import type { DomaineDisponibilite } from './domaines/disponibilite'
import type { DomaineHistorique } from './domaines/historique'
import type { DomaineHorsLigne } from './domaines/horsligne'
import type { DomaineIncidents } from './domaines/incidents'
import type { DomaineJournee } from './domaines/journee'
import type { DomaineKit } from './domaines/kit'
import type { DomaineMessages } from './domaines/messages'
import type { DomaineMoi } from './domaines/moi'
import type { DomaineNotifications } from './domaines/notifications'
import type { DomainePaquets } from './domaines/paquets'
import type { DomaineRamassage } from './domaines/ramassage'
import type { DomaineRemises } from './domaines/remises'
import type { DomaineSession } from './domaines/session'
import type { DomaineTournee } from './domaines/tournee'
import type { DomaineTrust } from './domaines/trust'

export interface SourceLivreur {
  session: DomaineSession
  acces: DomaineAcces
  aujourdhui: DomaineAujourdhui
  disponibilite: DomaineDisponibilite
  paquets: DomainePaquets
  kit: DomaineKit
  tournee: DomaineTournee
  ramassage: DomaineRamassage
  remises: DomaineRemises
  incidents: DomaineIncidents
  horsligne: DomaineHorsLigne
  journee: DomaineJournee
  historique: DomaineHistorique
  activite: DomaineActivite
  trust: DomaineTrust
  messages: DomaineMessages
  notifications: DomaineNotifications
  moi: DomaineMoi
  aide: DomaineAide
}

export type NomDomaine = keyof SourceLivreur
export const NOMS: NomDomaine[] = ['session', 'acces', 'aujourdhui', 'disponibilite', 'paquets', 'kit', 'tournee', 'ramassage', 'remises', 'incidents', 'horsligne', 'journee', 'historique', 'activite', 'trust', 'messages', 'notifications', 'moi', 'aide']

// La démonstration n'est pas dans le paquet principal : elle se charge à la première lecture (la session, au
// démarrage), en un fichier à part qu'une production branchée sur l'API ne téléchargera jamais.
let demo: SourceLivreur | null = null
let chargement: Promise<SourceLivreur> | null = null
const chargerDemo = () => (chargement ??= import('../demo/source-demo').then((m) => (demo = m.sourceDemo)))
type Methodes = Record<string, (...args: unknown[]) => unknown>
function domaineDemo<K extends NomDomaine>(nom: K): SourceLivreur[K] {
  return new Proxy({} as SourceLivreur[K], {
    get(_, methode) {
      if (typeof methode !== 'string' || methode === 'then') return undefined
      return (...args: unknown[]) => (demo ? (demo[nom] as unknown as Methodes)[methode](...args) : chargerDemo().then((d) => (d[nom] as unknown as Methodes)[methode](...args)))
    },
  })
}

const demoSeule: SourceLivreur = (Object.fromEntries(NOMS.map((n) => [n, domaineDemo(n)])) as unknown as SourceLivreur)
// « hybride » : la session passe par les comptes réels (session-hybride.ts, site/COMPTES-REELS.md), tout le reste reste
// la démonstration.
export const source: SourceLivreur = env.source === 'api' ? sourceApi() : env.source === 'hybride' ? { ...demoSeule, session: sessionHybride(demoSeule.session) } : demoSeule
