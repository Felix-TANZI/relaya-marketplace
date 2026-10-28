// SourceAdmin : tout ce que la console lit et écrit, en domaines (un fichier par domaine dans src/donnees/domaines/,
// une démonstration par domaine dans src/demo/). Les écrans n'appellent que `source.<domaine>.<méthode>()` : ils ne
// savent pas d'où viennent les données.
// Deux sources, une seule interface, choisies par VITE_SOURCE (site/src/config/env.ts, partagé) : « demo » (défaut) :
// src/demo, gardée sur l'appareil ; « api » : le serveur (routes /api/console/…, kit backend-kit/apps/console),
// connecteurs dans src/api/ ; une méthode sans route au kit est refusée (NonBranche : jamais une donnée inventée).
// Ajouter une méthode : dans le fichier du domaine (type) et sa démonstration (src/demo/<domaine>.ts) ; ce fichier-ci
// ne change pas.
import { env } from '@client/config/env'
import { sourceApi } from '../api/source-api'
import { sessionHybride } from './session-hybride'
import type { DomaineActeurs } from './domaines/acteurs'
import type { DomaineArgent } from './domaines/argent'
import type { DomaineCatalogue } from './domaines/catalogue'
import type { DomaineCommandes } from './domaines/commandes'
import type { DomaineCommunication } from './domaines/communication'
import type { DomaineDecisions } from './domaines/decisions'
import type { DomaineDirect } from './domaines/direct'
import type { DomaineEquipe } from './domaines/equipe'
import type { DomaineFiles } from './domaines/files'
import type { DomaineGouvernance } from './domaines/gouvernance'
import type { DomaineLitiges } from './domaines/litiges'
import type { DomaineLogistique } from './domaines/logistique'
import type { DomainePilotage } from './domaines/pilotage'
import type { DomaineQuatreYeux } from './domaines/quatreyeux'
import type { DomaineSession } from './domaines/session'
import type { DomaineSysteme } from './domaines/systeme'

export interface SourceAdmin {
  session: DomaineSession
  direct: DomaineDirect
  files: DomaineFiles
  quatreyeux: DomaineQuatreYeux
  litiges: DomaineLitiges
  commandes: DomaineCommandes
  argent: DomaineArgent
  acteurs: DomaineActeurs
  catalogue: DomaineCatalogue
  logistique: DomaineLogistique
  pilotage: DomainePilotage
  communication: DomaineCommunication
  gouvernance: DomaineGouvernance
  systeme: DomaineSysteme
  equipe: DomaineEquipe
  decisions: DomaineDecisions
}

export type NomDomaine = keyof SourceAdmin
export const DOMAINES: NomDomaine[] = ['session', 'direct', 'files', 'quatreyeux', 'litiges', 'commandes', 'argent', 'acteurs', 'catalogue', 'logistique', 'pilotage', 'communication', 'gouvernance', 'systeme', 'equipe', 'decisions']

// La démonstration n'est pas dans le paquet principal : elle se charge à la première lecture (la session, au
// démarrage), en un fichier à part qu'une production branchée sur l'API ne télécharge jamais.
let demo: SourceAdmin | null = null
let chargement: Promise<SourceAdmin> | null = null
const chargerDemo = () => (chargement ??= import('../demo/source-demo').then((m) => (demo = m.sourceDemo)))
type Methodes = Record<string, (...args: unknown[]) => unknown>

function domaine<K extends NomDomaine>(nom: K, appeler: (nom: K, methode: string, args: unknown[]) => unknown): SourceAdmin[K] {
  return new Proxy({} as SourceAdmin[K], {
    get(_, methode) {
      if (typeof methode !== 'string' || methode === 'then') return undefined
      return (...args: unknown[]) => appeler(nom, methode, args)
    },
  })
}
const viaDemo = <K extends NomDomaine>(nom: K, methode: string, args: unknown[]) =>
  demo ? (demo[nom] as unknown as Methodes)[methode](...args) : chargerDemo().then((d) => (d[nom] as unknown as Methodes)[methode](...args))
const construire = (appeler: (nom: NomDomaine, methode: string, args: unknown[]) => unknown) =>
  Object.fromEntries(DOMAINES.map((n) => [n, domaine(n, appeler)])) as unknown as SourceAdmin

// « api » : les connecteurs du kit (src/api/, CONNECTEURS-ADMIN.md ; une méthode sans route lève NonBranche).
const demoSeule: SourceAdmin = construire(viaDemo)
// « hybride » : la session passe par les comptes réels (session-hybride.ts, site/COMPTES-REELS.md), tout le reste reste
// la démonstration.
export const source: SourceAdmin = env.source === 'api' ? sourceApi() : env.source === 'hybride' ? { ...demoSeule, session: sessionHybride(demoSeule.session) } : demoSeule
