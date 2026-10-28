// Domaine « règlements » (ENT-P18) : versement automatique chaque vendredi avant midi de ce qui est validé au plus tard
// le jeudi 23 h 59 (ENT-VER-JOUR, ENT-VER-ARRETE, DP-63), sans demande, sans frais, sans minimum, jamais anticipé ni
// en espèces (ENT-ARG-01, -02, ENT-REM-08). Montant = prestations validées − retenues définitives (jamais saisi) ; une
// prestation en revue ou sous litige ouvert attend le vendredi qui suit (DED-12, ENT-REM-01) ; une retenue n'existe
// qu'avec son dossier et sa décision (ENT-P18R-04) ; solde négatif reporté sur ENT-REPORT-VENDREDIS vendredis au plus,
// puis plan d'apurement (ENT-REM-05). Versement refusé : ENT-VER-ESSAIS tentatives à 24 h, puis suspension (ENT-ARG-04).
// Changement de moyen (propriétaire, code SMS) : versements bloqués blocage_versements_changement_numero jours et revue
// humaine (ENT-ARG-03) ; numéro +237 à 9 chiffres au nom de l'entreprise (422 sinon). Un versement ne part jamais deux
// fois (clé d'idempotence). Propriétaire et comptable (le comptable lit, ne change pas le moyen).
// API : GET /api/company/payouts/next, /payouts, /holdbacks ; POST /api/company/payment-method.
import type { ClasseColis, CodeZone, Francs, Instant, LivreurCourt, Resultat } from '../communs'

export interface Prestation {
  id: string // « PR-2338 »
  jour: Instant
  paquetId: string
  missionId: string
  genre: 'relais' | 'domicile'
  zone: CodeZone
  classes: ClasseColis[]
  livreur: LivreurCourt
  prixAccepte: Francs // prix accepté au contrat pour la prestation
  montant: Francs // payé (après minoration éventuelle)
  minoree: boolean // retard au-delà de la promesse (ENT-REM-06)
  statut: 'validee' | 'en_revue' | 'non_payee'
  raison: string | null // « Litige LT-031 ouvert », « Colis perdu (LT-029) »
  litigeId: string | null
}

export interface Retenue {
  id: string
  litigeId: string
  libelle: string // « Valeur de l'article (net payé au vendeur) »
  montant: Francs
  decideLe: Instant
  definitiveLe: Instant
  statut: 'en_attente' | 'definitive' | 'suspendue' // en attente du délai de recours ; suspendue par un recours
  imputee: 'ce_vendredi' | 'vendredi_suivant' | null
}

export interface MoyenReglement {
  operateur: 'MTN' | 'Orange'
  numero: string // masqué : « ···· 01 »
  titulaire: string
  verifieLe: Instant | null
  statut: 'verifie' | 'en_revue'
  bloqueJusqua: Instant | null
}

export interface VersementPrevu {
  limite: Instant // vendredi avant 12 h
  arrete: Instant // jeudi 23 h 59
  statut: 'en_cours' | 'bloque' | 'reporte'
  prestations: Prestation[]
  retenues: Retenue[]
  totalValide: Francs
  totalRetenues: Francs // retenues définitives imputées à ce vendredi
  aVerser: Francs
  report: Francs // solde négatif reporté
  reportJusqua: Instant | null // dernier vendredi du report
  frais: Francs // toujours 0
}

export interface Versement {
  id: string
  date: Instant
  montant: Francs
  statut: 'verse' | 'refuse' | 'reporte'
  reference: string | null
  tentatives: number
}

export interface IndicateursArgent {
  semaine: Francs
  mois: Francs
  volumeValide: number // prestations validées du mois
  retenuesMois: Francs
}

export type RefusMoyen = 'numero' | 'titulaire' | 'code' | 'en_revue'

export interface DomaineReglements {
  prochain(): Promise<VersementPrevu>
  historique(): Promise<Versement[]>
  indicateurs(): Promise<IndicateursArgent>
  moyen(): Promise<MoyenReglement>
  /** Code SMS envoyé au propriétaire avant un changement de moyen (second facteur). */
  demanderCode(): Promise<{ defi: string; destination: string; codeDemo: string | null }>
  changerMoyen(p: { operateur: 'MTN' | 'Orange'; numero: string; auNomDeLEntreprise: boolean; defi: string; code: string }): Promise<Resultat<object, RefusMoyen>>
}
