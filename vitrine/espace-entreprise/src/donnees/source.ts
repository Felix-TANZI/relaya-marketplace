// SourceEntreprise : tout ce que l'espace entreprise lit et écrit, en domaines (un fichier par domaine dans
// src/donnees/domaines/, une démonstration par domaine dans src/demo/). Les écrans n'appellent que
// `source.<domaine>.<méthode>()` : ils ne savent pas d'où viennent les données.
// Deux sources, une seule interface, choisies par VITE_SOURCE (site/src/config/env.ts, partagé) : « demo » (défaut) :
// src/demo, gardée sur l'appareil ; « api » : le serveur (routes /api/company/…, kit backend-kit/apps/entreprise_*),
// connecteurs dans src/api/domaines/<domaine>.ts (CONNECTEURS-ENTREPRISE.md).
// Ajouter une méthode : dans le fichier du domaine (type) et sa démonstration (src/demo/<domaine>.ts) ; ce fichier-ci
// ne change pas.
import { env } from '@client/config/env'
import { sourceApi } from '../api/source-api'
import { sessionHybride } from './session-hybride'
import type { DomaineAffectation } from './domaines/affectation'
import type { DomaineCarte } from './domaines/carte'
import type { DomaineColis } from './domaines/colis'
import type { DomaineCompte } from './domaines/compte'
import type { DomaineContrat } from './domaines/contrat'
import type { DomaineEmballages } from './domaines/emballages'
import type { DomaineEquipe } from './domaines/equipe'
import type { DomaineFlotte } from './domaines/flotte'
import type { DomaineIncidents } from './domaines/incidents'
import type { DomaineIntegrations } from './domaines/integrations'
import type { DomaineLitiges } from './domaines/litiges'
import type { DomaineLivreurs } from './domaines/livreurs'
import type { DomaineMessages } from './domaines/messages'
import type { DomaineMissions } from './domaines/missions'
import type { DomaineNotifications } from './domaines/notifications'
import type { DomainePaquets } from './domaines/paquets'
import type { DomaineParametres } from './domaines/parametres'
import type { DomainePreuves } from './domaines/preuves'
import type { DomainePrix } from './domaines/prix'
import type { DomaineRapports } from './domaines/rapports'
import type { DomaineReglements } from './domaines/reglements'
import type { DomaineReleves } from './domaines/releves'
import type { DomaineScore } from './domaines/score'
import type { DomaineSession } from './domaines/session'
import type { DomaineTableau } from './domaines/tableau'
import type { DomaineVehicules } from './domaines/vehicules'
import type { DomaineZones } from './domaines/zones'

export interface SourceEntreprise {
  session: DomaineSession
  compte: DomaineCompte
  tableau: DomaineTableau
  contrat: DomaineContrat
  zones: DomaineZones
  flotte: DomaineFlotte
  livreurs: DomaineLivreurs
  equipe: DomaineEquipe
  vehicules: DomaineVehicules
  prix: DomainePrix
  paquets: DomainePaquets
  affectation: DomaineAffectation
  missions: DomaineMissions
  carte: DomaineCarte
  incidents: DomaineIncidents
  colis: DomaineColis
  preuves: DomainePreuves
  litiges: DomaineLitiges
  reglements: DomaineReglements
  releves: DomaineReleves
  score: DomaineScore
  emballages: DomaineEmballages
  messages: DomaineMessages
  notifications: DomaineNotifications
  parametres: DomaineParametres
  rapports: DomaineRapports
  integrations: DomaineIntegrations
}

export type NomDomaine = keyof SourceEntreprise
export const DOMAINES: NomDomaine[] = ['session', 'compte', 'tableau', 'contrat', 'zones', 'flotte', 'livreurs', 'equipe', 'vehicules', 'prix', 'paquets', 'affectation', 'missions', 'carte', 'incidents', 'colis', 'preuves', 'litiges', 'reglements', 'releves', 'score', 'emballages', 'messages', 'notifications', 'parametres', 'rapports', 'integrations']

// La démonstration n'est pas dans le paquet principal : elle se charge à la première lecture (la session, au
// démarrage), en un fichier à part qu'une production branchée sur l'API ne télécharge jamais.
let demo: SourceEntreprise | null = null
let chargement: Promise<SourceEntreprise> | null = null
const chargerDemo = () => (chargement ??= import('../demo/source-demo').then((m) => (demo = m.sourceDemo)))
type Methodes = Record<string, (...args: unknown[]) => unknown>

function domaine<K extends NomDomaine>(nom: K, appeler: (nom: K, methode: string, args: unknown[]) => unknown): SourceEntreprise[K] {
  return new Proxy({} as SourceEntreprise[K], {
    get(_, methode) {
      if (typeof methode !== 'string' || methode === 'then') return undefined
      return (...args: unknown[]) => appeler(nom, methode, args)
    },
  })
}
const viaDemo = <K extends NomDomaine>(nom: K, methode: string, args: unknown[]) =>
  demo ? (demo[nom] as unknown as Methodes)[methode](...args) : chargerDemo().then((d) => (d[nom] as unknown as Methodes)[methode](...args))

const construire = (appeler: (nom: NomDomaine, methode: string, args: unknown[]) => unknown) =>
  Object.fromEntries(DOMAINES.map((n) => [n, domaine(n, appeler)])) as unknown as SourceEntreprise

const demoSeule: SourceEntreprise = construire(viaDemo)
// « hybride » : la session passe par les comptes réels (session-hybride.ts, site/COMPTES-REELS.md), tout le reste reste
// la démonstration.
export const source: SourceEntreprise = env.source === 'api' ? sourceApi() : env.source === 'hybride' ? { ...demoSeule, session: sessionHybride(demoSeule.session) } : demoSeule
