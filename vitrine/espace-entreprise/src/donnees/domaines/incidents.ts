// Domaine « incidents » (ENT-P14) : incidents déclarés par les livreurs, à valider dans ENT-INCIDENT-DELAI minutes
// quand ils bloquent (sinon l'opérateur de zone BelivaY décide : ENT-P14R-01 ; décision tardive refusée 409), refus
// avec motif d'au moins longueur_min_motif_refus caractères ; chaque décision porte son auteur et son motif (RG-R113,
// RG-R114) ; valider ne sanctionne rien (ENT-P14R-02). Incident de sécurité : priorité absolue, validé d'office,
// jamais refusé (RG-R109, RG-R112). Transfert d'un paquet à un autre livreur éligible : rencontre, scan de chaque
// étiquette par le second, garde transférée au scan (ENT-P14R-03, DED-28).
// API : GET /api/company/incidents?status= ; POST …/{id}/decision ; POST /packages/{id}/transfer.
import type { Instant, LivreurCourt, Resultat } from '../communs'

export type GenreIncident = 'client_absent' | 'boutique_fermee' | 'colis_abime' | 'adresse' | 'panne' | 'accident' | 'agression' | 'non_conforme'

export interface PhotoIncident {
  id: string
  le: Instant // heure d'origine du téléphone
  recuLe: Instant // heure du serveur
  sujet: 'lieu' | 'colis' | 'vehicule' | 'devanture'
}

export interface Incident {
  id: string
  missionId: string
  paquetId: string
  livreur: LivreurCourt
  genre: GenreIncident
  famille: 'blocage' | 'colis' | 'vehicule' | 'securite'
  bloquant: boolean
  lieu: string // arrêt concerné (« Tech Bastos »)
  distanceArretM: number | null
  declareLe: Instant // heure d'origine du téléphone
  recuLe: Instant // heure du serveur : l'échéance court de là
  decideAvant: Instant | null
  statut: 'a_valider' | 'valide' | 'refuse' | 'escalade' | 'securite'
  photos: PhotoIncident[]
  note: string
  consequence: 'arret_retire' | 'nouvelle_tentative' | 'transfert' | 'reserve' | 'retour_relais' | 'aucune'
  decision: { par: string; le: Instant; motif: string | null; operateur: boolean } | null
}

export interface Transfert {
  id: string
  paquetId: string
  de: LivreurCourt
  vers: LivreurCourt
  demandeLe: Instant
  etape: 'rencontre' | 'scan' | 'transferee'
  etiquettes: { etiquette: string; scanneLe: Instant | null }[]
}

export interface DomaineIncidents {
  liste(statut?: Incident['statut']): Promise<Incident[]>
  decider(id: string, decision: 'valider' | 'refuser', motif: string): Promise<Resultat<object, 'motif' | 'deja_decide' | 'securite'>>
  transferer(paquetId: string, versLivreurId: string): Promise<Resultat<{ transfert: Transfert }, 'non_eligible' | 'statut'>>
  transferts(): Promise<Transfert[]>
}
