// Domaine « trust » : Trust Score (six critères pondérés, valeur exacte, recalcul la nuit), événements qui le font
// monter ou baisser, état du compte (sanction, contrôle au ramassage), historique des décisions et contestation (une
// fois par décision, réponse humaine sous 72 h ouvrées). Le score vient du service Scores de relaya (Q-37) : l'écran
// ne calcule rien. API : GET /score, GET /account/status, GET /account/decisions, POST /score/appeal (VD-02 p12,
// VD10-R25, REFVD-R205). ANONYMAT : un événement nomme la commande, jamais le client.
import type { Instant, Palier, ReferenceCommande, Resultat } from '../communs'

export type CleCritere = 'ponctualite' | 'qualite' | 'satisfaction' | 'litiges' | 'documents' | 'anciennete'

export interface CritereScore {
  cle: CleCritere
  nom: string // « Ponctualité »
  poids: number // en % (25)
  note: number // sur 100, une décimale (69,6)
  points: number // note × poids, une décimale (17,4)
  detail: string // ce qui fait la note, en mots (« 7 commandes prêtes dans le délai »)
}

/** Effet d'un événement, dit en mots à l'écran (SCO-05) : les codes g1, g2, g3 restent dans le moteur. */
export type EffetEvenement = 'succes' | 'neutre' | 'leger' | 'moyen' | 'grave' | 'aucun'

export interface EvenementScore {
  a: Instant
  libelle: string // « Prête dans le délai »
  effet: EffetEvenement
  critere: CleCritere | null
  ref: ReferenceCommande | null // commande liée (le vendeur l'ouvre ; jamais le client)
}

export interface Score {
  total: number // 62,7 : valeur exacte du service Scores, affichée arrondie (63)
  calculeA: Instant // dernier recalcul de la nuit (montré hors connexion, VD10-R09)
  criteres: CritereScore[]
  evenements: EvenementScore[] // journal immuable, le plus récent d'abord (SCO-04)
  bareme: { evenement: string; effet: EffetEvenement | 'grave_sanction' | 'documents_zero' }[] // même table que le moteur (SCO-06)
  historique: { jour: string; score: number }[] // un relevé par nuit (30 derniers jours), le plus ancien d'abord
  gele: boolean // inactivité de 30 jours (SCO-03) ou suspension
  sanction: { niveau: number; depuis: Instant; motif: string } | null
  controleAuRamassage: string // « 1 sur 20 » (résumé de GET /account/status)
}

/** Fréquence du contrôle au ramassage (CTRL-RAMASSAGE, VD-CTRL-RENFORCE, VD-PROBATOIRE ; SAN-03). */
export interface ControleRamassage {
  sur: number // 1 commande sur `sur` (1 : toutes)
  raison: 'premieres' | 'sous_seuil' | 'au_dessus' | 'renforce' | 'probatoire'
  seuilReduction: number | null // « À partir de 70 de Trust Score · 1 sur 100 » (null : déjà au plus bas)
  surApres: number | null // 100
  premieres: number // les 5 premières commandes sont toutes contrôlées
  ramassees: number // commandes déjà ramassées
  renforceSous: number // 60 : toutes contrôlées sous ce score
  renforceBaisse: number // 8 points perdus en une semaine : toutes contrôlées
  probatoire: { controlees: number; total: number } | null
}

export type TypeDecision = 'avertissement' | 'visibilite_reduite' | 'suspension' | 'exclusion' | 'descente'

export interface Decision {
  id: string
  type: TypeDecision
  niveau: 1 | 2 | 3 | 4 | null // null pour une descente de palier
  palierVise: Palier | null // descente : palier d'arrivée
  decideeA: Instant
  effetA: Instant
  motif: string
  valideePar: string | null // null pour l'avertissement (niveau 1, automatique : SAN-01)
  contestation: {
    envoyeeA: Instant
    texte: string
    preuves: string[]
    reponseAvant: Instant // 72 h ouvrées, dimanche non compté (CON-01, DP-15, Q-53)
    reponse: { a: Instant; issue: 'maintenue' | 'annulee'; motif: string } | null
  } | null
}

export interface StatutCompte {
  etat: 'aucune' | 'avertissement' | 'visibilite_reduite' | 'suspendu' | 'exclu'
  enCours: Decision | null // sanction ou descente en cours
  controle: ControleRamassage
  alerteAvantSeuil: boolean // « Vous serez alerté avant chaque seuil » (SAN-02, VD-ALERTE-SEUIL)
  regles: {
    visibiliteJours: number // niveau 2 : 14 jours (VD-SAN-VISIBILITE)
    suspensionSous: number // suspension proposée sous 40…
    nonPreparations: number // … ou après 3 non-préparations…
    nonPreparationsJours: number // … en 30 jours glissants
    suspensionMaxJours: number // jusqu'à la décision humaine, 30 jours au plus
    probatoireCommandes: number // 20 commandes contrôlées après une suspension (VD-PROBATOIRE)
  }
  finEffet: number | null // fin de la visibilité réduite, ou de la suspension au plus tard
}

export type RefusContestation = 'deja_contestee' | 'trop_court' | 'trop_long' | 'introuvable'

export interface DomaineTrust {
  score(): Promise<Score>
  statut(): Promise<StatutCompte>
  /** Historique des décisions, la plus récente en tête (SAN-05, VD10-R25). */
  decisions(): Promise<Decision[]>
  decision(id: string): Promise<Decision | null>
  /** POST /score/appeal : une fois par décision ; explication de 40 à 1 000 caractères ; preuves datées. */
  contester(decision: string, texte: string, preuves: string[]): Promise<Resultat<{ reponseAvant: Instant }, RefusContestation>>
}
