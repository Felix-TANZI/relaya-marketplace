// Domaine « argent » (possédé par PR-09 Argent ; gérant seul, ARL-06, VER-06) : versements du vendredi (arrêté jeudi
// minuit, référence BLV-VP-nnnn, envoi le vendredi avant 12 h sans frais ni minimum, 5 états, 3 nouveaux essais à 24 h
// après un refus : PR-RC-17, VER-01 à VER-08), relevé ligne par ligne (colis remis par classe, retours déposés ARL-39,
// jours de garde facturés, 1er jour payé par BelivaY v6 D12, espèces de garde : part du relais gardée en
// caisse et part BelivaY déduite ARL-05, retenue fiscale 0 % ARL-34, report), dette d'espèces (report, puis « Espèces
// à reverser » par Mobile Money au-delà de PR-DETTE-MAX ou après PR-DETTE-SEMAINES semaines, échéance PR-DETTE-DELAI-H),
// caisse du jour, numéro de versement (masqué « MTN ···· 8350 » ; changement par deux codes SMS puis vérification par
// une personne PR-NUM-VERIF-J jours, jamais effectif tout de suite, « Ce n'est pas vous ? » : MOM-01 à MOM-07, PR-RC-26),
// rapports d'activité et de gains (RAP-01 à RAP-04) et leurs relevés à télécharger (PDF, CSV).
// Le relais VOIT et DEMANDE ; il ne décide ni du montant ni de la date (DP-66 appliquée au relais).
import type { ClasseColis, Francs, Instant, Jour, Origine, Resultat } from '../communs'

export type EtatVersement = 'prevu' | 'envoye' | 'credite' | 'refuse' | 'suspendu'
/** Motifs de refus de l'opérateur (VER-08). */
export type MotifRefus = 'numero_tiers' | 'compte_plein' | 'prefixe'
/** Pourquoi un versement est suspendu : vérification d'un nouveau numéro (VER-03), refus répétés (VER-08), dette non
 * reversée à l'échéance (ARL-05). */
export type MotifSuspension = 'verification_numero' | 'refus_repetes' | 'dette'

export type TypeLigne =
  | 'colis' // colis remis au client (RELAIS-GAIN-COLIS, par classe)
  | 'retour' // retour d'un client déposé au relais (ARL-39 : payé comme une remise de sa classe)
  | 'jour_garde' // jours de garde facturés au client (RELAIS-GAIN-GARDE)
  | 'jour_offert_belivay' // 1er jour, gratuit pour le client, payé par BelivaY (GARDE-J1-BELIVAY)
  | 'jour_paye_belivay' // jours de garde d'un colis renvoyé ou d'une commande au comptoir non retirée (ARL-08, ARL-09)
  | 'especes_part_relais' // espèces de garde : la part du relais, déjà dans sa caisse (négatif)
  | 'especes_part_belivay' // espèces de garde : la part de BelivaY, déduite (négatif, ARL-05)
  | 'bonus_comptoir' // colis payés au comptoir : + 50 F chacun (R41)
  | 'frais_versement' // 1 % Mobile Money retenu sur le versement, au franc supérieur (R43)
  | 'retenue_fiscale' // PR-RETENUE-FISCALE-PCT (0 % au lancement, ARL-34)
  | 'report' // solde négatif de la semaine précédente (négatif)
  | 'retenue_perte' // perte fautive, après arbitrage (ARL-22 ; au plus la moitié d'un versement)

export interface LigneVersement {
  type: TypeLigne
  classe: ClasseColis | null
  quantite: number
  taux: Francs // tarif unitaire (0 quand la ligne n'en a pas)
  montant: Francs // négatif pour ce qui est déduit
}

export interface Versement {
  id: string
  /** « BLV-VP-0142 » : annoncée à l'arrêté du jeudi minuit (PR-VER-ARRETE), transmise à l'opérateur ; null avant. */
  reference: string | null
  semaine: { du: Jour; au: Jour }
  /** Vendredi avant 12 h (PR-VER-HEURE) : envoi prévu ou fait. */
  date: Instant
  lignes: LigneVersement[]
  /** Gagné dans la semaine (colis, retours, jours de garde, jours payés par BelivaY) : le même chiffre que
   * la colonne de la semaine dans Rapports. */
  gagne: Francs
  /** Espèces de garde encaissées au comptoir dans la semaine. */
  especes: Francs
  /** Net versé (ou à verser) : jamais négatif ; un solde négatif devient une dette (report). */
  total: Francs
  /** Solde négatif de la semaine, reporté (0 sinon). */
  report: Francs
  etat: EtatVersement
  /** Montant encore provisoire (avant l'arrêté du jeudi minuit, VER-04). */
  provisoire: boolean
  /** Numéro sur lequel il est (ou sera) versé, masqué. */
  numero: string
  envoyeLe: Instant | null
  crediteLe: Instant | null
  motifRefus: MotifRefus | null
  motifSuspension: MotifSuspension | null
  /** Envois refusés (VER-08 : au plus PR-VER-ESSAIS nouveaux essais à 24 h d'intervalle). */
  essais: { le: Instant; refus: MotifRefus | null }[]
  prochainEssai: Instant | null
  /** Versement suspendu pendant la vérification d'un numéro : versé ce jour-là, rien n'est perdu. */
  reporteAu: Instant | null
  /** « Versement non reçu » signalé (VER-05) : réponse avant le lundi midi suivant, avec la preuve de l'opérateur. */
  reclamation: { le: Instant; reponseAvant: Instant; reponse: string | null } | null
}

export interface CaisseDuJour {
  jour: Jour
  encaissements: { colis: string[]; montant: Francs; le: Instant; par: string }[]
  total: Francs
  partRelais: Francs
  partBelivay: Francs
}

export interface NumeroVersement {
  operateur: 'MTN' | 'Orange'
  masque: string // « MTN ···· 8350 »
  statut: 'verifie' | 'en_verification' | 'remplace'
  verifieLe: Instant | null
  /** Pendant la vérification d'un nouveau numéro : versements suspendus jusqu'à cette heure (PR-NUM-VERIF-J). */
  versementsSuspendusJusqua: Instant | null
}

/** Changement de numéro en cours (MOM-03, PR-RC-26) : le nouveau numéro n'est actif qu'après la revue. */
export interface ChangementNumero {
  etape: 'codes_envoyes' | 'en_verification'
  nouveau: { operateur: 'MTN' | 'Orange'; masque: string }
  /** Codes envoyés : au nouveau numéro et au téléphone personnel du gérant (masqués), valables jusqu'à. */
  codes: { versNouveau: string; versPersonnel: string; expireA: Instant; renvoiPossibleA: Instant; essaisRestants: number } | null
  /** En vérification : revue par une personne jusqu'à, puis premier versement ce vendredi-là. */
  revueJusqua: Instant | null
  premierVersementLe: Instant | null
  /** SMS « Ce n'est pas vous ? » parti vers l'ancien numéro. */
  alerteEnvoyeeA: string | null
}

/** Espèces à reverser (ARL-05) : le solde négatif dépasse PR-DETTE-MAX ou dure PR-DETTE-SEMAINES semaines. */
export interface Dette {
  montant: Francs // 0 : aucune dette
  semaines: number // semaines négatives de suite
  aReverser: boolean
  /** Reversement par Mobile Money au numéro marchand BelivaY, avec cette référence, avant l'échéance. */
  reference: string | null
  marchand: string | null
  echeance: Instant | null
  /** Échéance dépassée : l'encaissement des gardes est suspendu (les colis à garde due vont au relais voisin). */
  encaissementSuspendu: boolean
  /** Demande de paiement Mobile Money envoyée sur le téléphone du gérant, en attente de sa confirmation. */
  paiement: { demandeLe: Instant; etat: 'demande_envoyee' | 'confirme' | 'echoue' } | null
}

export interface Argent {
  prochain: Versement
  caisse: CaisseDuJour
  numero: NumeroVersement
  changement: ChangementNumero | null
  dette: Dette
  /** Versements reçus (crédités) dans le mois en cours ; avec le prochain, ce qui est versé dans le mois (PR-09-R01). */
  recusDuMois: { mois: string; versements: Versement[]; total: Francs }
}

/** Période d'un rapport (RAP, PR-09-R02). */
export type PeriodeRapport = 'mois' | 'trimestre' | 'ouverture'
export interface Rapport {
  periode: PeriodeRapport
  du: Jour
  au: Jour
  /** Une colonne par semaine de versement (mois) ou par mois (trimestre, depuis l'ouverture) : gagné. */
  colonnes: { du: Jour; au: Jour; gagne: Francs; enCours: boolean; partiel: boolean }[]
  gagne: Francs // = somme des colonnes
  colisRecus: number
  colisRemis: number
  retoursDeposes: number
  /** Délai de retrait des colis sortis dans la période, sur la grille de garde : 1er jour · 2e au 4e jour · 5e au 7e
   * jour · renvoyés (non retirés en 7 jours, RAP-01, RAP-04). */
  delais: [number, number, number, number]
  semainesActivite: number
  ouvertLe: Jour
}
/** Relevé téléchargé (RAP-03) : mensuel en PDF (versements, colis, garde) ou d'activité en CSV (chaque mouvement). */
export interface FichierReleve {
  nom: string
  type: 'application/pdf' | 'text/csv'
  contenu: string // texte du fichier (PDF en caractères Latin-1)
}

export interface DomaineArgent {
  argent(): Promise<Argent>
  /** Versements, le prochain d'abord, puis les passés du plus récent au plus ancien. */
  versements(): Promise<Versement[]>
  versement(id: string): Promise<Versement | null>
  /** « Versement non reçu » (VER-05) : une réclamation par versement envoyé ou crédité. */
  signalerNonRecu(id: string, o: Origine): Promise<Resultat<{ reponseAvant: Instant }, 'introuvable' | 'pas_encore_envoye' | 'deja_signale'>>
  /** Nouveau numéro : réseau obligatoire, préfixe vérifié pour l'opérateur choisi, deux codes SMS (MOM-04, MOM-05). */
  changerNumero(operateur: 'MTN' | 'Orange', numero: string, o: Origine): Promise<Resultat<{ codesEnvoyes: number; expireA: Instant; codeDemo?: string }, 'prefixe_inconnu' | 'prefixe_operateur' | 'meme_numero' | 'verification_en_cours'>>
  renvoyerCodes(o: Origine): Promise<Resultat<{ expireA: Instant }, 'aucune_demande' | 'trop_tot'>>
  /** Les deux codes : le nouveau numéro passe en vérification par une personne ; versements suspendus. */
  confirmerNumero(codes: [string, string], o: Origine): Promise<Resultat<{ suspendusJusqua: Instant; premierVersementLe: Instant }, 'code_faux' | 'code_expire' | 'aucune_demande' | 'trop_essais'>>
  /** Annuler un changement (pendant la saisie des codes ou la vérification) : l'ancien numéro reste actif. */
  annulerChangement(o: Origine): Promise<Resultat<object, 'aucune_demande'>>
  /** Reverser la dette par Mobile Money (réseau obligatoire) : demande de paiement sur le téléphone du gérant. */
  reverserDette(o: Origine): Promise<Resultat<{ reference: string }, 'aucune_dette' | 'deja_en_cours'>>
  rapport(periode: PeriodeRapport): Promise<Rapport>
  /** Relevé mensuel (PDF) ou d'activité (CSV) de la période. */
  releve(periode: PeriodeRapport, format: 'pdf' | 'csv'): Promise<FichierReleve>
}
