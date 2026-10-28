// Domaine « prix » (ENT-P09) : grille d'ACHAT de l'entreprise (jamais la grille de vente, ENT-P09R-04), en lecture
// seule (ENT-P09R-01 : aucune route d'écriture), chaque ligne contrôlée sous le plafond de sa classe (ENT-TAR-05,
// ENT-REM-02 ; DP-62 / A-01 : un colis au-dessus est écrêté au plafond de sa classe ; une ligne bloquée par la console
// attend la décision écrite d'Aureon et ne paie rien), versions et préavis d'une nouvelle grille (ENT-P09R-02),
// délais promis (SLA), suppléments et minoration, paliers et plafond de valeur, paquet type (gain affiché, RG-R84).
// Demander une révision : un message à BelivaY (fil « Révision de grille », topic grid_revision).
// API : GET /api/company/price-grid, /sla ; POST /api/company/threads {topic: grid_revision} ;
// GET · PUT /api/company/sla/alerts (alertes avant échéance).
import type { ClasseColis, Francs, Instant, PalierEntreprise, Resultat } from '../communs'

export type TypePrestation = 'tournee_relais' | 'domicile' | 'collecte' | 'retour' | 'transfert' | 'supplement'
/** Code d'une ligne : le libellé est écrit par l'écran (FR / EN). */
export type CodeLigne = 'relais_1_4' | 'relais_5_9' | 'relais_10' | 'relais_autre_zone' | 'carton_c2' | 'domicile_zones' | 'domicile_z1' | 'collecte' | 'retour' | 'transfert_sm' | 'transfert_l'

export interface LigneGrille {
  code: CodeLigne
  type: TypePrestation
  prix: Francs // par colis (tournée, retour, transfert), par course (domicile), en supplément
  plafonds: { classe: ClasseColis | null; montant: Francs }[] // plafond BelivaY par classe (null : la course)
  controle: 'ok' | 'ecrete' | 'au_dessus' // écrêté : payé au plafond pour la classe dépassée ; au-dessus : bloquée
  version: string
  depuis: Instant
  paquetType: boolean // ligne du paquet type (surlignée)
}

export interface VersionGrille {
  version: string
  du: Instant
  au: Instant | null
  statut: 'en_vigueur' | 'annoncee' | 'archivee'
  acceptee: boolean // une version annoncée doit être acceptée par le propriétaire (ENT-P03)
  changements: { code: CodeLigne; avant: Francs | null; apres: Francs; controle: LigneGrille['controle'] }[]
}

export interface Grille {
  version: string
  enVigueurDepuis: Instant
  lignes: LigneGrille[]
  versions: VersionGrille[]
  prochaine: VersionGrille | null
  paquetType: { colis: number; classe: ClasseColis; lignes: { code: CodeLigne; quantite: number; montant: Francs }[]; total: Francs }
}

export interface Delais {
  acceptationMin: number
  prioriteMin: number
  ramassageMin: number
  livraisonH: number
  depotAvantFermetureMin: number
  incidentMin: number
  heuresService: string
  tourneesJour: number
  seuilDepart: number
}

export interface Supplement {
  code: 'client_absent' | 'refus_conforme' | 'deplacement' | 'carton_c2' | 'autre_zone' | 'minoration'
  montant: Francs | null // null : pourcentage
  pourcentage: number | null
  base: 'course' | 'colis' | 'prestation' | 'forfait'
}

/**
 * Alertes avant échéance (réglage de l'entreprise, ENT-P09) : prévenir l'équipe quand il reste N minutes pour accepter
 * un paquet ou terminer ses ramassages ; les comptes à rebours passent en ambre au même seuil (P10 à P12). Bornes lues
 * dans le registre : au moins le seuil rouge de l'anneau, au plus le délai lui-même. Prend effet dès l'enregistrement,
 * pour les échéances encore en cours ; journalisé avec son auteur (parametres-journal).
 */
export interface AlertesDelais {
  acceptationMin: number
  ramassageMin: number
  bornes: { acceptation: { min: number; max: number }; ramassage: { min: number; max: number } }
  modifieLe: Instant | null
  par: string | null
}

export interface DomainePrix {
  grille(): Promise<Grille>
  delais(): Promise<Delais>
  supplements(): Promise<Supplement[]>
  paliers(): Promise<{ actuel: PalierEntreprise; plafonds: { palier: PalierEntreprise; plafond: Francs | null; seuil: number | null }[] }>
  /** Demande de révision : un message à BelivaY, jamais une modification de la grille. */
  demanderRevision(texte: string): Promise<Resultat<{ filId: string }, 'texte'>>
  alertesDelais(): Promise<AlertesDelais>
  /** Propriétaire et répartiteur ; hors des bornes du registre : refus « bornes ». */
  reglerAlertesDelais(p: { acceptationMin: number; ramassageMin: number }): Promise<Resultat<object, 'bornes'>>
}
