// Domaine « incidents » (LIV-P21 ; LIV-08-R10 à R32, LIV-RG-R171 à R176, LIV-P21R-01 à R03, DED-25, CONNEXIONS 17-18, 21).
// - Six familles (Chez le vendeur, En route, Au relais, À domicile, Sur le colis, Sécurité), chacune avec ses types ;
//   la conséquence (qui est prévenu, ce qui change dans la tournée, l'effet sur les scores) est annoncée AVANT l'envoi ;
//   aucun incident ne pénalise automatiquement le livreur.
// - Envoi seulement avec un type, les photos exigées par le type et une note d'au moins LIV-INCIDENT-NOTE-MIN
//   caractères ; position jointe automatiquement ; contrôle sur le téléphone et sur le serveur.
// - Hors connexion : l'incident est gardé sur le téléphone et mis en file (LIV-P22), la tournée continue.
// - Bloquant : l'entreprise valide ou refuse (motif mot pour mot) ; sans réponse en LIV-INCIDENT-VALID-MIN minutes,
//   l'opérateur de zone BelivaY décide ; le livreur voit qui a décidé. Validé : la tournée est ajustée par le système ;
//   panne après un ramassage : transfert au remplaçant, colis par colis, à chaque scan.
// - « À domicile » renvoie à l'échec de remise (LIV-P18) ; « Sécurité » mène au SOS (LIV-P30).
import type { Instant, Origine, Position, Resultat } from '../communs'

export type FamilleId = 'vendeur' | 'route' | 'relais' | 'domicile' | 'colis' | 'securite'

export interface TypeIncident {
  id: string
  titre: string
  bloquant: boolean // attend une décision (entreprise, puis opérateur de zone)
  photos: number // photos exigées (0 : facultatives, seulement si c'est sans danger)
  transfert: boolean // le paquet passe à un remplaçant s'il y a des colis sous garde
}
export interface FamilleIncident {
  id: FamilleId
  titre: string
  icone: string
  exemples: string
  consequence: string // conséquence courte, sur la tuile
  prevenus: string // qui est prévenu
  tournee: string // ce qui change dans la tournée
  scores: string // effet sur les scores
  route: string | null // famille réglée par un autre écran (À domicile → echec-domicile)
  types: TypeIncident[]
}
export interface CatalogueIncidents {
  familles: FamilleIncident[]
  noteMin: number // LIV-INCIDENT-NOTE-MIN
  validationMin: number // LIV-INCIDENT-VALID-MIN
  clientPrevenuMin: number // INC-NOTIF-MIN
  photoMaxKo: number // LIV-PHOTO-POIDS-KO
  photosMax: number // photos jointes au plus (la seconde est facultative)
}

export type EtatIncident = 'en_file' | 'enregistre' | 'en_attente' | 'valide' | 'refuse'
export interface EtapeIncident {
  a: Instant | null // null : à venir
  texte: string
}
export interface Incident {
  id: string
  famille: FamilleId
  type: string
  note: string
  photos: number
  cree: Instant // heure du téléphone
  recu: Instant | null // heure du serveur (null tant qu'il est en file)
  arret: { id: string; ordre: number; nom: string } | null
  position: Position | null
  bloquant: boolean
  etat: EtatIncident
  echeance: Instant | null // décision attendue au plus tard (sinon l'opérateur de zone décide)
  decision: { par: 'entreprise' | 'operateur'; nom: string; a: Instant; motif: string | null } | null
  ajustement: { texte: string; arrets: { ordre: number; nom: string; avant: Instant; etat: 'retire' | 'decale' | 'inchange' }[] } | null
  transfert: { remplacant: { prenom: string; initiales: string; vehicule: string }; colis: { id: string; reprisA: Instant | null }[] } | null
  chronologie: EtapeIncident[]
}

export interface Declaration {
  famille: FamilleId
  type: string
  note: string
  photos: string[] // identifiants des preuves déposées d'abord (tournee.deposerPreuve, nature « incident ») ; « file-… » hors connexion
  arretId: string | null
}

export interface DomaineIncidents {
  catalogue(): Promise<CatalogueIncidents>
  liste(): Promise<Incident[]>
  incident(id: string): Promise<Incident | null>
  /** Déclare un incident ; hors connexion (enLigne faux), il est gardé et mis en file avec son origine. */
  declarer(d: Declaration, origine: Origine, enLigne: boolean): Promise<Resultat<{ id: string }, 'note_trop_courte' | 'photos_manquantes' | 'type_inconnu'>>
}
