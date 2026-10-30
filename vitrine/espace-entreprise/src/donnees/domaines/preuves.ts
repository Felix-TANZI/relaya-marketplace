// Domaine « preuves » (ENT-P16) : chaîne de preuves par paquet dans l'ordre (C1 par vendeur, transport, C2 ou remise
// à domicile, clôture : ENT-RG-R10, RG-R123), photos horodatées deux fois (téléphone et serveur, ENT-CYC-05), heure de
// validation des codes (jamais leur valeur, ENT-02-R08), synchronisation (en file au-delà de seuil_file_revue_
// synchronisation heures : revue ; expiration_preuve_en_file heures : expirée), taux de preuves complètes par livreur
// (RG-R124). L'entreprise ne supprime ni ne remplace une preuve (ENT-P16R-01) : elle signale ou joint un complément
// (photos seulement, v6). Export du dossier en PDF signé (empreintes SHA-256, horodatages, positions), journalisé ;
// conservées conservation_preuves jours. API : GET /api/company/proofs?package=, /proofs/review ; POST …/{id}/flag,
// …/{id}/complement ; GET /proofs/export.
// DP-63 : PHOTO DE PREUVE OBLIGATOIRE à chaque changement de main ; l'étape est BLOQUÉE sans photo ; hors connexion,
// la preuve attend dans une file et part au retour du réseau ; sans preuve, la responsabilité reste à l'acteur qui
// tenait le colis.
import type { Instant, LivreurCourt, Resultat } from '../communs'
import type { GenrePaquet } from './paquets'

export type ChangementDeMain = 'vendeur_livreur' | 'livreur_relais' | 'livreur_client' | 'livreur_livreur' | 'relais_livreur'
export type StatutPreuve = 'synchronisee' | 'en_file' | 'rejetee' | 'expiree' | 'attendue'

export interface Preuve {
  id: string
  paquetId: string
  maillon: 'C1' | 'transport' | 'C2' | 'domicile' | 'cloture'
  genre: 'photo_produit' | 'photo_scelle' | 'code' | 'position' | 'photo_incident' | 'scan_depot' | 'photo_remise' | 'confirmation'
  changementDeMain: ChangementDeMain | null // null : preuve de transport
  lieu: string
  etiquette: string | null
  le: Instant | null // heure d'origine (téléphone)
  recuLe: Instant | null // heure du serveur
  statut: StatutPreuve
  resultat: 'controle' | 'reserve' | 'refuse' | 'absent' | null // C2, par colis
  signalement: { par: string; le: Instant; commentaire: string } | null
  complements: { par: string; le: Instant; commentaire: string; photos: number }[]
}

export interface Maillon {
  code: Preuve['maillon']
  lieu: string
  etat: 'complet' | 'attente' | 'probleme' | 'a_venir'
  preuves: Preuve[]
}

export interface DossierPreuves {
  paquetId: string
  genre: GenrePaquet
  zone: string
  livreur: LivreurCourt | null
  etat: 'complet' | 'en_cours' | 'attente' | 'illisible'
  maillons: Maillon[]
  exports: { par: string; le: Instant }[]
}

export interface ResumePreuves {
  missions: { paquetId: string; livreur: string | null; etat: DossierPreuves['etat'] }[]
  revue: { preuve: Preuve; raison: 'illisible' | 'manquante' | 'attente_longue'; expireLe: Instant | null }[]
  taux: { livreur: LivreurCourt; completes: number; attendues: number }[]
}

export interface DomainePreuves {
  resume(): Promise<ResumePreuves>
  dossier(paquetId: string): Promise<DossierPreuves | null>
  signaler(preuveId: string, commentaire: string): Promise<Resultat<object, 'commentaire'>>
  completer(preuveId: string, commentaire: string, photos: number): Promise<Resultat<object, 'commentaire'>>
  exporter(paquetId: string): Promise<{ le: Instant; par: string }>
  relancer(paquetId: string): Promise<{ envoyeLe: Instant }>
}
