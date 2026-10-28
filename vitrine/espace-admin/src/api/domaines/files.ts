// Domaine « files » branché sur le kit : les éléments de toutes les files visibles du rôle (GET /console/vues/cartes,
// filtrés par rôle et zones au kit, retards d'abord) deviennent des cartes ; la famille et l'écran qui décide sont
// posés ici, d'après la file du kit (table FILES ci-dessous). Verrou d'une carte ouverte : au kit (cache).
import type { ClientApi } from '@client/api/client'
import type { Instant, Resultat } from '../../donnees/communs'
import type { CarteAction, Delegue, DomaineFiles, FamilleCarte, IndicateursFile, Verrou } from '../../donnees/domaines/files'
import { appels, seg } from '../outils'

/** Élément d'une file du kit (files._el, plus le titre de la file et le verrou d'un autre agent). */
export interface ElementFile {
  file: string
  id: string
  titre: string
  detail: string | null
  objet: string
  depuis: Instant | null
  echeance: Instant | null
  enRetard: boolean
  zones: string[]
  action: string | null
  permission: string
  donnees: Record<string, unknown>
  titreFile: string
  verrou: Verrou | null
  /** Délégation (backend-kit/apps/console/delegation.py) : nom de l'agent à qui la carte est confiée. */
  confieA?: string | null
  /** Carte d'argent : montant en jeu (remboursement, versement). */
  montant?: number | null
}

type Ecran = (x: ElementFile) => { route: string; params?: Record<string, string> }
const d = (x: ElementFile, k: string) => (x.donnees[k] === undefined || x.donnees[k] === null ? '' : String(x.donnees[k]))
const vers = (route: string, cle?: string, valeur?: (x: ElementFile) => string): Ecran => (x) => ({ route, params: cle ? { [cle]: valeur ? valeur(x) : x.id } : undefined })

/** File du kit → famille de la carte et écran qui décide. */
export const FILES: Record<string, { famille: FamilleCarte; ecran: Ecran }> = {
  candidatures: { famille: 'kyc', ecran: vers('candidatures', 'id') },
  pieces_entreprises: { famille: 'kyc', ecran: vers('kyc', 'id', (x) => `E${d(x, 'entreprise')}`) },
  pieces_livreurs: { famille: 'piece', ecran: vers('kyc', 'id', (x) => `L${d(x, 'livreur')}`) },
  quiz: { famille: 'piece', ecran: vers('livreurs', 'id', (x) => d(x, 'livreur')) },
  activations: { famille: 'kyc', ecran: vers('entreprises', 'id', (x) => d(x, 'entreprise')) },
  incidents: { famille: 'livraison', ecran: vers('paquets') },
  litiges: { famille: 'livraison', ecran: vers('paquets') },
  revisions_grille: { famille: 'support', ecran: vers('entreprises', 'id', (x) => d(x, 'entreprise')) },
  sanctions: { famille: 'recours', ecran: vers('livreurs', 'id', (x) => d(x, 'livreur')) },
  argent: { famille: 'support', ecran: vers('entreprises', 'id', (x) => d(x, 'entreprise')) },
  donnees: { famille: 'support', ecran: vers('journal') },
  departs_echus: { famille: 'depart', ecran: vers('livreurs', 'depart', (x) => d(x, 'demande')) },
  kits_contestes: { famille: 'kit', ecran: vers('livreurs', 'depart', (x) => d(x, 'demande')) },
  contreseings: { famille: 'quatreyeux', ecran: vers('quatreyeux', 'id') },
  kyc_vendeurs: { famille: 'kyc', ecran: vers('kyc', 'id', (x) => `B${d(x, 'boutique')}`) },
  litiges_clients: { famille: 'litige', ecran: vers('litige', 'id') },
  remboursements: { famille: 'remboursement', ecran: vers('remboursements', 'id') },
  retours: { famille: 'retour', ecran: vers('litige', 'id', (x) => `LIT-${d(x, 'litige')}`) },
  fraude: { famille: 'fraude', ecran: vers('fraude', 'id') },
  versements_controle: { famille: 'remboursement', ecran: vers('versements', 'id') },
  versements_exceptions: { famille: 'remboursement', ecran: vers('versements', 'id') },
  offres: { famille: 'moderation', ecran: vers('moderation', 'id') },
  avis: { famille: 'moderation', ecran: vers('avis', 'id') },
  cartes_finance: { famille: 'remboursement', ecran: vers('rapprochement') },
  support: { famille: 'support', ecran: vers('support', 'id') },
}

export function carte(x: ElementFile): CarteAction {
  const f = FILES[x.file] ?? { famille: 'support' as FamilleCarte, ecran: vers('file') }
  const famille: FamilleCarte = x.file === 'litiges_clients' && x.permission === 'litiges.niveau2' ? 'recours' : f.famille
  const e = f.ecran(x)
  return {
    id: `${x.file}:${x.id}`,
    famille,
    titre: x.titre,
    sous: [x.titreFile, x.detail].filter(Boolean).join(' · '),
    objet: x.objet,
    route: e.route,
    ...(e.params ? { params: e.params } : {}),
    zone: x.zones[0] ?? null,
    echeance: x.echeance,
    montant: x.montant ?? null,
    creeeLe: x.depuis ?? x.echeance ?? 0,
    verrou: x.verrou ?? null,
    confieA: x.confieA ?? null,
  }
}

export function domaineFiles(api: ClientApi): DomaineFiles {
  const a = appels(api, 'files')
  return {
    file: async () => (await a.get<ElementFile[]>('/vues/cartes')).map(carte),
    indicateurs: () => a.get<IndicateursFile>('/vues/indicateurs'),
    ouvrir: (id) => a.post<Resultat<{ verrou: Verrou }, 'verrouillee' | 'inconnue'>>(`/vues/cartes/${seg(id)}/ouvrir`),
    liberer: async (id) => {
      await a.post(`/vues/cartes/${seg(id)}/liberer`)
    },
    delegues: () => a.get<Delegue[]>('/vues/delegues'),
    deleguer: (ids, agentId, motif) => a.post<Resultat<{ n: number }, 'motif_court' | 'inconnu'>>('/vues/cartes-deleguer', { ids, agentId, motif }, { idempotence: true }),
  }
}
