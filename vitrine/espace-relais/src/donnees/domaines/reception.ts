// Domaine « reception » (possédé par PR-04 Guichet 1) : lots annoncés par les entreprises de livraison et leur réception
// au comptoir. Lit le modèle central (colis.ts) : un lot est une liste de colis « attendus ».
// - Le livreur présente son CODE DE DÉPÔT : un QR qui porte le code, écrit aussi en 6 chiffres (DP-62, CAL-30) ; le
//   gérant le SCANNE ou le SAISIT ; il ne le voit jamais. Usage unique ; 3 codes faux : saisie bloquée 24 h
//   (CODE-ESSAIS, CODE-BLOCAGE-H), BelivaY alerté. Sans code : « Ne prenez pas le lot » (REC-01).
// - Puis colis par colis (REC-02 à REC-05, REC-10) : scan de l'étiquette, puis scellé intact (« contrôlé »), « reçu avec
//   réserve » (DP-62, 1 photo), refusé (2 photos, repart avec le livreur), absent, en trop (photo) ; une étiquette
//   d'un autre relais : « Ce colis n'est pas pour votre relais » (PR-RC-04). DP-20 : un relais ne refuse jamais un colis
//   S, M ou L pour manque de place ; le refus vise un colis abîmé ou au scellé cassé.
// - Enfin la validation du lot : UNE photo du lot (ARL-11) et le PIN du membre ; la garde passe au relais quand le
//   livreur CONFIRME dans son application (REC-07), après avoir accepté chaque réserve ou refus (PR-RC-08) ; sans
//   confirmation sous PR-LOT-CONFIRM-MIN, le support est alerté. Hors connexion : contre le lot déjà téléchargé
//   (OFF-02), mis en file.
import type { ClasseColis, Instant, Origine, Photo, Resultat } from '../communs'
import type { ColisRelais, MotifConstat, ResultatReception } from './colis'
import type { LotEnApproche } from './aujourdhui'

/** Ce que le relais sait d'un colis du lot en plus du modèle central. */
export interface DetailColisLot {
  /** Colis de remplacement (REC-13), reçu comme un colis normal. */
  remplacement: boolean
  /** Étiquette scannée (avant le toucher du scellé). */
  scanne: boolean
  /** Emplacement proposé par le serveur selon la taille (CAL-22) ; null : rangement provisoire au comptoir. */
  emplacementPropose: string | null
  /** Le livreur a accepté la réserve ou le refus dans son application (PR-RC-08). */
  constatAccepte: boolean
}

export interface Lot extends LotEnApproche {
  /** Arrêt du livreur au relais (« A3 ») et collecte au même passage (« A4 »). */
  arret: string | null
  collecte: string | null
  /** Code de dépôt vérifié : réception ouverte. */
  ouvertA: Instant | null
  valideA: Instant | null
  /** Le livreur a confirmé le dépôt dans son application (la garde passe au relais). */
  confirmeParLivreurA: Instant | null
  code: { essaisRestants: number; bloqueJusqua: Instant | null }
  colisDuLot: ColisRelais[]
  details: Record<string, DetailColisLot>
  /** Colis en trop (non annoncés) déclarés pendant la réception. */
  enTrop: string[]
  /** Le support est alerté : lot validé sans confirmation du livreur sous PR-LOT-CONFIRM-MIN. */
  supportAlerte: boolean
  /** Après la confirmation : ce qui est parti vers les clients (REC-08, ARL-01). */
  prevenus: { avisEtCode: number; auPaiement: number; groupage: number; incomplets: number; nonDelivres: number } | null
  /** Occupation du relais maintenant, puis après la collecte du même passage (colis à reprendre partis). */
  occupation: { occupees: number; declarees: number; apresCollecte: number | null; seuilAtteint: boolean }
}

export interface ResultatColis {
  resultat: Exclude<ResultatReception, 'en_trop'>
  scelle: 'intact' | 'casse' | null
  photos: Photo[]
  note: string | null
  motif: MotifConstat | null
}

/** Ce que dit le scan d'une étiquette pendant la réception. */
export type IssueScan =
  | { issue: 'dans_le_lot'; colis: string }
  | { issue: 'deja_scanne'; colis: string }
  | { issue: 'pas_pour_ce_relais'; relais: string } // PR-RC-04 : le livreur le garde
  | { issue: 'en_trop'; colis: string } // non annoncé, pour ce relais : à déclarer avec photo
  | { issue: 'illisible' }

export type RefusReception = 'code_faux' | 'bloque' | 'aucun_lot' | 'deja_valide' | 'reseau_requis' | 'photo_manquante' | 'pin_requis' | 'pin_faux' | 'colis_sans_resultat' | 'transition_interdite' | 'inconnu'

/** Règles de la réception, lues au registre par le serveur (aucune valeur dans l'écran). */
export interface ReglesReception {
  codeLongueur: number // CODE-LONGUEUR
  codeEssais: number // CODE-ESSAIS
  codeBlocageH: number // CODE-BLOCAGE-H
  photosReserve: number // REC-03
  photosRefus: number // REC-04
  photosEnTrop: number
  photosLot: number // PR-LOT-PHOTOS-MIN (ARL-11)
  pinLongueur: number // PIN-LONGUEUR
  pinBlocageMin: number // PR-PIN-BLOCAGE-MIN (ARL-12)
  confirmationMin: number // PR-LOT-CONFIRM-MIN
  places: Record<ClasseColis, number> // RELAIS-PLACES
  saturationPct: number // PR-SATURATION
  photoMaxKo: number // PHOTO-MAX-KO
}

export interface DomaineReception {
  lots(): Promise<Lot[]>
  lot(id: string): Promise<Lot | null>
  regles(): Promise<ReglesReception>
  /** Code de dépôt donné par le livreur (6 chiffres, ou contenu de son QR) : ouvre la réception de SON lot. */
  verifierCodeDepot(code: string, o: Origine): Promise<Resultat<{ lot: string }, RefusReception> & { deja?: Instant; essaisRestants?: number; bloqueJusqua?: Instant }>
  /** Scan (ou saisie) de l'étiquette d'un colis pendant la réception d'un lot. */
  scannerEtiquette(lotId: string, etiquette: string, o: Origine): Promise<IssueScan>
  resultat(lotId: string, colisId: string, r: ResultatColis, o: Origine): Promise<Resultat<object, RefusReception>>
  colisEnTrop(lotId: string, colisId: string, classe: ClasseColis, photos: Photo[], o: Origine): Promise<Resultat<object, RefusReception>>
  /** Photo du lot (tous les colis visibles) et PIN du membre ; en attente de la confirmation du livreur. */
  validerLot(lotId: string, photo: Photo, pin: string, o: Origine): Promise<Resultat<{ emplacements: Record<string, string | null> }, RefusReception>>
}
