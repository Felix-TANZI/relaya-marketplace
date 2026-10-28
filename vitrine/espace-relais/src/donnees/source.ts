// SourceRelais : tout ce que l'espace point relais lit et écrit, en domaines (un fichier par domaine dans
// src/donnees/domaines/, une démonstration par domaine dans src/demo/). Les écrans n'appellent que
// `source.<domaine>.<méthode>()` : ils ne savent pas d'où viennent les données. VITE_SOURCE=api : le serveur (routes
// /api/relay/…), registre des routes dans src/api/routes.ts (chaque méthode « à brancher » tant que la route manque).
// Le modèle central du colis (domaines/colis.ts) n'est pas un domaine : il est lu par reception, retrait, stock,
// departs, incidents et historique. Ajouter une méthode : dans le fichier du domaine (type), sa démonstration
// (src/demo/<domaine>.ts) et son entrée au registre des routes ; ce fichier-ci ne change que pour un domaine nouveau.
import { env } from '@client/config/env'
import { sourceApi } from '../api/source-api'
import { accesHybride, sessionHybride } from './session-hybride'
import type { DomaineAcces } from './domaines/acces'
import type { DomaineAide } from './domaines/aide'
import type { DomaineArgent } from './domaines/argent'
import type { DomaineAujourdhui } from './domaines/aujourdhui'
import type { DomaineDeparts } from './domaines/departs'
import type { DomaineFermeture } from './domaines/fermeture'
import type { DomaineHistorique } from './domaines/historique'
import type { DomaineHorsLigne } from './domaines/horsligne'
import type { DomaineIncidents } from './domaines/incidents'
import type { DomaineMessages } from './domaines/messages'
import type { DomaineNotifications } from './domaines/notifications'
import type { DomaineQualite } from './domaines/qualite'
import type { DomaineReception } from './domaines/reception'
import type { DomaineRelais } from './domaines/relais'
import type { DomaineRetrait } from './domaines/retrait'
import type { DomaineSession } from './domaines/session'
import type { DomaineStock } from './domaines/stock'

export interface SourceRelais {
  session: DomaineSession
  acces: DomaineAcces
  aujourdhui: DomaineAujourdhui
  reception: DomaineReception
  retrait: DomaineRetrait
  stock: DomaineStock
  departs: DomaineDeparts
  incidents: DomaineIncidents
  fermeture: DomaineFermeture
  historique: DomaineHistorique
  notifications: DomaineNotifications
  messages: DomaineMessages
  aide: DomaineAide
  argent: DomaineArgent
  qualite: DomaineQualite
  relais: DomaineRelais
  horsligne: DomaineHorsLigne
}

export type NomDomaine = keyof SourceRelais
export const NOMS: NomDomaine[] = ['session', 'acces', 'aujourdhui', 'reception', 'retrait', 'stock', 'departs', 'incidents', 'fermeture', 'historique', 'notifications', 'messages', 'aide', 'argent', 'qualite', 'relais', 'horsligne']

// La démonstration n'est pas dans le paquet principal : elle se charge à la première lecture (la session, au
// démarrage), en un fichier à part qu'une production branchée sur l'API ne téléchargera jamais.
let demo: SourceRelais | null = null
let chargement: Promise<SourceRelais> | null = null
const chargerDemo = () => (chargement ??= import('../demo/source-demo').then((m) => (demo = m.sourceDemo)))
type Methodes = Record<string, (...args: unknown[]) => unknown>
function domaineDemo<K extends NomDomaine>(nom: K): SourceRelais[K] {
  return new Proxy({} as SourceRelais[K], {
    get(_, methode) {
      if (typeof methode !== 'string' || methode === 'then') return undefined
      return (...args: unknown[]) => (demo ? (demo[nom] as unknown as Methodes)[methode](...args) : chargerDemo().then((d) => (d[nom] as unknown as Methodes)[methode](...args)))
    },
  })
}

const demoSeule: SourceRelais = (Object.fromEntries(NOMS.map((n) => [n, domaineDemo(n)])) as unknown as SourceRelais)
// « hybride » : la session passe par les comptes réels (session-hybride.ts, site/COMPTES-REELS.md), tout le reste reste
// la démonstration.
export const source: SourceRelais = env.source === 'api' ? sourceApi() : env.source === 'hybride' ? { ...demoSeule, session: sessionHybride(demoSeule.session), acces: accesHybride(demoSeule.acces) } : demoSeule
