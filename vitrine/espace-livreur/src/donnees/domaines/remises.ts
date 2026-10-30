// Domaine « remises » (LIV-07 : P16 relais, P17-P18 domicile, P19 départs du relais, P20 retour au vendeur). Chaque
// colis quitte la garde du livreur d'une seule façon prouvée ; un échec a toujours une suite décidée par le système.
// - Dépôt au relais (C2) : QR de dépôt (DP-62 : jeton signé qui porte le code de dépôt, écrit aussi en 6 chiffres,
//   lisible seulement pendant l'arrêt en cours), scanné une fois par la gérante (ou les 6 chiffres saisis) ; résultat
//   par colis en miroir (contrôlé, réserve, refusé, absent) ; le relais valide le lot (photo du lot, ARL-11) quand chaque
//   colis a le sien, puis le livreur confirme : la garde passe au relais, horodatée par le serveur ; un refus constaté est
//   accepté en miroir et reste sous la garde de l'entreprise.
// - Domicile : code de livraison du client ∧ photo (le client a toujours payé en ligne) ; position enregistrée
//   (signalée au-delà de l'écart permis). Le livreur ne voit aucun montant.
// - Échec : six motifs, preuves exigées cochées par le système (attente et appels masqués mesurés par le serveur).
// - Départs : colis présentés par la gérante, confirmés un par un ; manquant signalé ; scellé abîmé photographié.
// - Retour : code de réception du vendeur + photo ; vendeur absent ou qui refuse : relais de sa zone.
import type { ClasseColis, Instant, Origine, Resultat } from '../communs'

export type ResultatDepot = 'controle' | 'reserve' | 'refuse' | 'absent'
export interface ColisDepot {
  id: string
  etiquette: string
  classe: ClasseColis
  resultat: ResultatDepot | null
  emplacement: string | null // attribué par le relais, lecture seule
  photos: number // photos de la gérante (réserve : 1, refus : 2)
  motif: string | null // réserve ou refus constaté par la gérante
  constatAccepte: boolean
}
export interface DepotRelais {
  arretId: string
  relais: string
  gerant: string // prénom de la gérante inscrite
  fermeture: Instant
  places: { libres: number; total: number; lot: number }
  qr: { jeton: string; code: string } | null // seulement pendant l'arrêt en cours, masqué après la confirmation
  scanneA: Instant | null
  resultatsA: Instant | null // dernier résultat de la gérante : sans confirmation après DEPOT-CONFIRM-MIN, « à confirmer »
  colis: ColisDepot[]
  confirmeA: Instant | null
  /** Le relais a donné les résultats mais n'a pas encore validé le lot (photo du lot, PIN) : la confirmation attend. */
  attendValidation?: boolean
  etatRelais: 'ouvert' | 'ferme' | 'hors_ligne'
  fermeConstate: { photo: string; quand: Instant } | null
  registre: { photo: string; quand: Instant } | null
}

export type MotifEchec = 'absent' | 'injoignable' | 'introuvable' | 'refus_colis' | 'danger'
export interface SuiteEchec {
  destination: 'relais_zone' | 'vendeur'
  relais: string
  ouvertJusqua: Instant
}
export interface RemiseDomicile {
  arretId: string
  prenom: string // prénom seul, jamais le nom ni le numéro
  quartier: string
  repere: string | null
  creneau: [Instant, Instant]
  colis: { id: string; etiquette: string; classe: ClasseColis }[]
  arriveeA: Instant | null
  remiseA: Instant | null
  porteur: string | null // prénom du porteur s'il n'est pas le client (il a le code)
  constat: { photos: string[]; note: string } | null
  code: { essaisRestants: number; bloqueJusqua: Instant | null }
  echec: { motif: MotifEchec; quand: Instant; suite: SuiteEchec } | null
  /** DÉMONSTRATION seulement : le code que la cliente lit dans son application. */
  codeDemo?: string
}
/** Preuves exigées pour un motif d'échec, mesurées par le serveur (jamais déclarées par le livreur). */
export interface PreuvesEchec {
  attenteMin: number // depuis l'arrivée
  appels: Instant[] // appels masqués au client (journal POST calls)
}

export type MotifDepart = 'garde_depassee' | 'retour_valide' | 'changement_relais' | 'refus_comptoir' | 'fermeture'
export interface ColisDepart {
  id: string
  etiquette: string // BV… ou RT…
  classe: ClasseColis
  motif: MotifDepart
  destination: string
  presenteA: Instant | null // la gérante l'a présenté dans son application
  confirmeA: Instant | null
  manquant: Instant | null
  scelleAbime: string | null // photo du scellé abîmé, avant de le prendre
}
export interface Collecte {
  arretId: string
  relais: string
  gerant: string
  fermeture: Instant
  colis: ColisDepart[]
  termineeA: Instant | null
}

export interface ColisRetour {
  id: string
  etiquette: string
  classe: ClasseColis
  motif: string
  nature: 'retour' | 'renvoi'
}
export interface RetourVendeur {
  arretId: string
  vendeur: string
  quartier: string
  repere: string | null
  preavisA: Instant | null
  colis: ColisRetour[]
  arriveeA: Instant | null
  code: { essaisRestants: number; bloqueJusqua: Instant | null }
  remisA: Instant | null
  impossible: { raison: 'vendeur_absent' | 'vendeur_refuse'; quand: Instant; relais: string } | null
  /** DÉMONSTRATION seulement : le code de réception que le vendeur lit dans son application. */
  codeDemo?: string
}

export interface DomaineRemises {
  depotRelais(arretId: string): Promise<DepotRelais | null>
  accepterConstat(arretId: string, colisId: string, origine: Origine): Promise<Resultat>
  confirmerDepot(arretId: string, origine: Origine): Promise<Resultat<object, 'colis_sans_resultat' | 'non_scanne' | 'constat_a_accepter' | 'lot_non_valide'>>
  relaisFerme(arretId: string, photo: string, origine: Origine): Promise<Resultat>
  registrePapier(arretId: string, photo: string, origine: Origine): Promise<Resultat>

  domicile(arretId: string): Promise<RemiseDomicile | null>
  livrerDomicile(arretId: string, code: string, photo: string, porteur: string | null, origine: Origine): Promise<Resultat<{ ecartM: number | null }, 'code_faux' | 'bloque'> & { essaisRestants?: number }>
  constat(arretId: string, photos: string[], note: string, origine: Origine): Promise<Resultat<object, 'note_trop_courte'>>
  preuvesEchec(arretId: string): Promise<PreuvesEchec>
  echecDomicile(arretId: string, motif: MotifEchec, preuves: { photo: string | null; note: string }, origine: Origine): Promise<Resultat<{ suite: SuiteEchec }, 'preuves_incompletes' | 'note_trop_courte'>>

  collecte(arretId: string): Promise<Collecte | null>
  confirmerDepart(arretId: string, colisId: string, origine: Origine): Promise<Resultat<object, 'non_presente'>>
  photoScelle(arretId: string, colisId: string, photo: string, origine: Origine): Promise<Resultat>
  departManquant(arretId: string, colisId: string, origine: Origine): Promise<Resultat>
  terminerCollecte(arretId: string, origine: Origine): Promise<Resultat<object, 'colis_a_traiter'>>

  retour(arretId: string): Promise<RetourVendeur | null>
  remettreRetour(arretId: string, code: string, photo: string, origine: Origine): Promise<Resultat<object, 'code_faux' | 'bloque'> & { essaisRestants?: number }>
  retourImpossible(arretId: string, raison: 'vendeur_absent' | 'vendeur_refuse', photo: string, origine: Origine): Promise<Resultat<{ relais: string }>>

  /** DÉMONSTRATION seulement (absent de la source API) : ce que fait l'autre téléphone. */
  simulerScanRelais?(arretId: string, avecAnomalies: boolean): Promise<void>
  simulerPresentation?(arretId: string): Promise<void>
}
