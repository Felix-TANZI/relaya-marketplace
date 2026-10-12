// SourceVendeur : tout ce que l'espace vendeur lit et écrit, en domaines (un fichier par domaine dans
// src/donnees/domaines/, une démonstration par domaine dans src/demo/, une implémentation API par domaine dans
// src/api/domaines/). Deux sources, une seule interface, choisies par VITE_SOURCE (site/src/config/env.ts, partagé) :
// « demo » (défaut) : src/demo, gardée sur l'appareil ; « api » : le serveur (contrat backend-kit/openapi.yaml).
// Les écrans n'appellent que `source.<domaine>.<méthode>()` : ils ne savent pas d'où viennent les données.
// Ajouter une méthode : dans le fichier du domaine (type), sa démonstration (src/demo/<domaine>.ts) et, en vague 3,
// son connecteur (src/api/domaines/<domaine>.ts) — ce fichier-ci ne change pas.
import { env } from '@client/config/env'
import { sourceApi } from '../api/source-api'
import type { DomaineAccueil } from './domaines/accueil'
import type { DomaineAide } from './domaines/aide'
import type { DomaineArgent } from './domaines/argent'
import type { DomaineBoutique } from './domaines/boutique'
import type { DomaineCommandes } from './domaines/commandes'
import type { DomaineCompte } from './domaines/compte'
import type { DomaineEquipe } from './domaines/equipe'
import type { DomaineLitiges } from './domaines/litiges'
import type { DomaineMessages } from './domaines/messages'
import type { DomaineNotifications } from './domaines/notifications'
import type { DomaineOffres } from './domaines/offres'
import type { DomainePaliers } from './domaines/paliers'
import type { DomainePlans } from './domaines/plans'
import type { DomainePublicite } from './domaines/publicite'
import type { DomainePreparation } from './domaines/preparation'
import type { DomaineProduits } from './domaines/produits'
import type { DomaineRemise } from './domaines/remise'
import type { DomaineRetours } from './domaines/retours'
import type { DomaineSession } from './domaines/session'
import type { DomaineTrust } from './domaines/trust'
import type { DomaineVersements } from './domaines/versements'

export interface SourceVendeur {
  session: DomaineSession
  accueil: DomaineAccueil
  commandes: DomaineCommandes
  preparation: DomainePreparation
  remise: DomaineRemise
  litiges: DomaineLitiges
  retours: DomaineRetours
  produits: DomaineProduits
  offres: DomaineOffres
  argent: DomaineArgent
  versements: DomaineVersements
  trust: DomaineTrust
  paliers: DomainePaliers
  plans: DomainePlans
  boutique: DomaineBoutique
  compte: DomaineCompte
  equipe: DomaineEquipe
  messages: DomaineMessages
  notifications: DomaineNotifications
  aide: DomaineAide
  publicite: DomainePublicite
}

export type NomDomaine = keyof SourceVendeur

// La démonstration n'est pas dans le paquet principal (vague 4, poids) : elle se charge à la première lecture (la
// session, au démarrage), en un fichier à part qu'une production branchée sur l'API ne télécharge jamais. Une fois
// chargée, chaque appel lui est passé tel quel (une méthode synchrone, comme messages.filtrer, le reste : les écrans
// ne s'affichent qu'après la session, donc après le chargement).
let demo: SourceVendeur | null = null
let chargement: Promise<SourceVendeur> | null = null
const chargerDemo = () => (chargement ??= import('../demo/source-demo').then((m) => (demo = m.sourceDemo)))
type Methodes = Record<string, (...args: unknown[]) => unknown>
function domaineDemo<K extends NomDomaine>(nom: K): SourceVendeur[K] {
  return new Proxy({} as SourceVendeur[K], {
    get(_, methode) {
      if (typeof methode !== 'string' || methode === 'then') return undefined
      return (...args: unknown[]) => (demo ? (demo[nom] as unknown as Methodes)[methode](...args) : chargerDemo().then((d) => (d[nom] as unknown as Methodes)[methode](...args)))
    },
  })
}
const NOMS: NomDomaine[] = ['session', 'accueil', 'commandes', 'preparation', 'remise', 'litiges', 'retours', 'produits', 'offres', 'argent', 'versements', 'trust', 'paliers', 'plans', 'boutique', 'compte', 'equipe', 'messages', 'notifications', 'aide', 'publicite']
const sourceDemo = Object.fromEntries(NOMS.map((n) => [n, domaineDemo(n)])) as unknown as SourceVendeur

export const source: SourceVendeur = env.source === 'api' ? sourceApi() : sourceDemo
