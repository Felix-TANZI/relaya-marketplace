// Domaine « commandes » (ADM-P04 ; tenu par S1) : commandes de la plateforme et fiche commande, page de référence de
// tout échange sur une commande (ADM-P04R-04). Champs selon le rôle (ADM-04-R04) : la Finance reçoit l'argent, pas le
// contenu ; le téléphone du client reste masqué, le Support et la Direction le démasquent sur motif journalisé
// (ADM-P04R-03) ; le code de retrait n'est JAMAIS envoyé, seulement son état (ADM-P04R-02). Montants lus au registre,
// figés au paiement avec la version de grille (ADM-P04R-01), jamais recalculés à l'écran. Annuler une commande payée :
// motif obligatoire, remboursement intégral au moyen d'origine, impossible après le code de remise (ADM-P04R-05).
import type { CodeZone, EtatDecision, Francs, Instant, Resultat } from '../communs'

export type EtatCommande = 'payee' | 'validee' | 'verification' | 'preparation' | 'en_route' | 'au_relais' | 'retiree' | 'litige' | 'annulee' | 'remboursee'
/** État de l'argent (ADM-05-R02). */
export type EtatArgent = 'attente' | 'bloque' | 'gele' | 'se_libere' | 'libere' | 'rembourse' | 'sans_escrow'

export interface CommandeCourte {
  ref: string // « BLV-52107 »
  article: string
  client: string // masqué
  telephoneClient: string // masqué : « +237 6•• •• •• 17 »
  vendeurs: string[]
  relais: string | null // null : livraison à domicile
  zone: CodeZone
  total: Francs
  paiement: string // « MTN MoMo ···· 17 », « Payable au retrait »
  payeeLe: Instant
  etat: EtatCommande
  argent: EtatArgent
  etiquette: string | null
  paquet: string | null
  litige: string | null
  enRetard: boolean // livraison au-delà de SLA-ZONE-H après « C'est prêt »
}

export interface EtapeCommande {
  t: string // « Payée », « C'est prêt », « C1 · remise au livreur »…
  le: Instant | null
  par: string | null
  preuve: string | null // « Photo · Melen ±6 m », « Code de remise validé »
  saisieLe: Instant | null // saisie hors connexion (« saisi à … · reçu à … », ADM-CACHEE-18)
  st: 'done' | 'cur' | 'bad' | ''
}

export interface SousCommande {
  vendeur: string
  articles: string
  montant: Francs
  argent: EtatArgent
  dossier: string | null
}

export interface ArgentCommande {
  paye: Francs
  article: Francs
  livraison: Francs
  commission: Francs // figée au paiement
  netVendeur: Francs
  partRelais: Francs
  partTransporteur: Francs
  revenus: Francs // commissions + frais de livraison retenus (ADM-MOD-07)
  versionGrille: string // « COM-V02 · 1er oct. 2026 »
  liberationLe: Instant | null
}

export interface CommandeFiche extends CommandeCourte {
  chronologie: EtapeCommande[]
  sousCommandes: SousCommande[]
  argentDetail: ArgentCommande | null // null : rôle sans accès à l'argent
  codeRetrait: 'non_envoye' | 'envoye' | 'utilise' | 'bloque'
  ifa: string // « Standard »
  commandesClient: number
  messages: { le: Instant; canal: string; quoi: string }[] // envois liés (destinataire masqué)
  annulable: boolean
  raisonNonAnnulable: string | null
  vue: 'complete' | 'argent' | 'lecture'
}

export interface DomaineCommandes {
  liste(): Promise<CommandeCourte[]>
  commande(ref: string): Promise<CommandeFiche | null>
  /** Démasque une donnée personnelle sur motif : la valeur en clair, une fois, journalisée (demasquer). */
  demasquer(ref: string, champ: 'telephoneClient', motif: string): Promise<{ ok: true; valeur: string } | { ok: false; raison: 'motif_court' }>
  /** Annule une commande payée (avant le code de remise) : remboursement intégral au moyen d'origine. */
  annuler(ref: string, motif: string): Promise<Resultat<{ etat: EtatDecision; id: string }, 'motif_court' | 'non_annulable'>>
}
