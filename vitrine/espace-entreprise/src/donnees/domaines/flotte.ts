// Domaine « flotte » (ENT-P05, ENT-P07) : vue d'ensemble de la flotte et invitations de livreurs (SMS avec le nom de
// l'entreprise et le lien de l'application, valable expiration_invitation_livreur jours tant qu'il n'est pas ouvert,
// numéro +237 : ENT-DOC-06). Suivi de chaque invité : invitation, charte, pièces (vérifiées par BelivaY, jamais
// envoyées par l'entreprise : ENT-P07R-04), certification (quiz ≥ seuil), approbation de l'entreprise, activé
// (ENT-RG-R73, R74). Numéro d'un livreur actif d'une autre entreprise : 409 ; numéro en liste noire : 403 générique,
// la console est alertée (ENT-P07R-01, ENT-RG-R70).
// API : GET · POST /api/company/courier-invitations, …/{id}/resend (idempotent 60 s), …/{id}/cancel ;
// POST /api/company/riders/{id}/approve.
import type { CodeZone, Instant, Resultat } from '../communs'

export interface ResumeFlotte {
  total: number
  actifs: number
  enLigne: number
  enActivation: number
  suspendus: number
}

export type EtapeInvitation = 'invitation' | 'charte' | 'pieces' | 'certification' | 'approbation' | 'active'
export const ETAPES_INVITATION: EtapeInvitation[] = ['invitation', 'charte', 'pieces', 'certification', 'approbation', 'active']

export interface Invitation {
  id: string
  nom: string
  telephone: string // « +237 6 77 12 34 56 »
  envoyeeLe: Instant
  expireLe: Instant
  statut: 'envoyee' | 'acceptee' | 'expiree' | 'refusee' | 'abandonnee' | 'activee'
  /** Étape où en est l'invité (frise du suivi). */
  etape?: EtapeInvitation
  vehicule?: { type: 'moto' | 'tricycle' | 'voiture' | 'camionnette'; plaque: string } | null
  capacite?: number | null
  zones?: CodeZone[]
  ouverteLe?: Instant | null
  quiz?: number | null // bonnes réponses au quiz de certification
  refus?: string | null // refus de BelivaY : motif écrit pour l'entreprise
  livreurId?: string | null
}

export interface DetailsInvitation {
  vehicule: { type: 'moto' | 'tricycle' | 'voiture' | 'camionnette'; plaque: string }
  capacite: number
  zones: CodeZone[]
}
export type RefusInvitation = 'telephone' | 'doublon' | 'nom' | 'autre_entreprise' | 'refuse' | 'zones' | 'capacite' | 'plaque'

export interface DomaineFlotte {
  resume(): Promise<ResumeFlotte>
  invitations(): Promise<Invitation[]>
  inviter(nom: string, telephone: string, details?: DetailsInvitation): Promise<Resultat<{ invitation: Invitation }, RefusInvitation>>
  renvoyer(id: string): Promise<Resultat<{ invitation: Invitation }, 'statut' | 'trop_tot'>>
  abandonner(id: string): Promise<Resultat<object, 'statut'>>
  approuver(id: string): Promise<Resultat<{ livreurId: string }, 'pas_pret'>>
}
