// Domaine « stock » (possédé par PR-06 Stock) : les colis au relais, la fiche d'un colis (parcours, preuves, journal,
// garde jour par jour, part du relais), le plan des étagères (A petits, B moyens, C encombrants au sol) et l'inventaire
// (pointage des étagères). Lit le modèle central (colis.ts) ; la garde se lit dans src/calculs/garde.ts (rang, montant
// dû, jours non facturés, renvoi), l'occupation dans src/calculs/capacite.ts (retours déposés exclus, CAL-21).
// - Onglets (STK-02, A-VALIDER pr06 ARL-80/81) : Urgents (à faire partir, dernier jour), Payants (J2 à J7 avec garde
//   due), Groupage (seulement s'il y a un colis de liste d'envies : fonction d'après le lancement, v6), Gratuits (J1,
//   ou garde pas encore commencée), Hors garde (constat en cours, retour déposé) : chaque colis dans un seul onglet.
// - Montants : garde DUE à ce jour (ce que le comptoir encaisse en espèces, v6 D12) visible de tous ; la part du
//   relais (sa rémunération) est réservée au propriétaire : le serveur la met à null pour l'employé (PR-RC-09).
// - Anonymat (GEN-01, FIC-01, PR-RC-11) : ni nom, ni téléphone, ni adresse ; jamais le code de retrait.
import type { ClasseColis, EntreeJournal, Francs, Instant, Jour, Origine, Resultat } from '../communs'
import type { Case, Occupation } from '../../calculs/capacite'
import type { ColisRelais, OngletStock, Preuve } from './colis'

/** Ancienne lecture par onglet du socle (aujourd'hui, session, tests du jeu d'essai). */
export interface Stock {
  onglet: OngletStock
  colis: ColisRelais[]
  compteurs: Record<OngletStock, number>
  occupation: { occupees: number; declarees: number; libres: number; taux: number; seuilAtteint: boolean }
}

// ── Liste du stock ─────────────────────────────────────────────────────────────────────────────────────────────
export type CategorieStock = 'urgents' | 'payants' | 'groupage' | 'gratuits' | 'hors_garde'
export const CATEGORIES: readonly CategorieStock[] = ['urgents', 'payants', 'groupage', 'gratuits', 'hors_garde']

/** Étiquette d'un colis (STK-01 : couleur de sa case et de sa ligne). */
export type EtiquetteStock =
  | 'a_renvoyer' // J8 : non retiré en 7 jours (rouge)
  | 'a_faire_partir' // refus au comptoir, décision d'un constat (rouge)
  | 'transfert' // le client a changé de relais (rouge : il part)
  | 'dernier_jour' // J7 (ambre)
  | 'payant' // garde due (orange)
  | 'groupage' // liste d'envies (bleu)
  | 'gratuit' // J1 (vert)
  | 'pas_prevenu' // avis d'arrivée pas encore délivré : la garde ne court pas (vert)
  | 'incomplet' // groupe de remise incomplet : la garde attend le dernier colis (vert)
  | 'constat' // constat en cours : garde suspendue (neutre)
  | 'retour' // retour client déposé, hors places, jamais facturé (neutre)

export interface LigneStock {
  colis: ColisRelais
  categorie: CategorieStock
  etiquette: EtiquetteStock
  /** Colis du même groupe de remise au relais / attendus : « commande de 2 colis ». */
  groupe: { id: string; total: number; auRelais: number }
  /** Départ prévu (à faire partir) : collecte et heure, ou null (prochaine collecte). */
  depart: { collecte: string | null; heure: Instant | null } | null
  /** Colis de remplacement (STK-13). */
  remplacement: boolean
}

export interface FiltresStock {
  categorie?: CategorieStock
  /** Référence (BLV-…, RT-…) ou emplacement (A-01) ; insensible à la casse, sans espaces. */
  q?: string
  classe?: ClasseColis | null
  /** Code de retrait bloqué (3 codes faux, DP-26). */
  codeBloque?: boolean
  /** Commande à payer au comptoir en Mobile Money (v6 D14). */
  auComptoir?: boolean
  /** Une case du plan. */
  emplacement?: string | null
}

/** Une case du plan, avec ses colis (le plus urgent donne sa couleur). */
export interface CasePlan extends Case {
  colis: string[]
  etiquette: EtiquetteStock | null
}

/** Grille de garde lue dans le registre (GARDE-GRILLE, v6 D12), regroupée par paliers égaux pour la carte. */
export interface GrilleVue {
  paliers: { de: number; a: number; tarif: Francs }[]
  totalSeptJours: Francs
  renvoi: Francs // GARDE-RENVOI (v6 : 0 F)
  /** Part du relais par jour (RELAIS-GAIN-GARDE) ; null pour l'employé. */
  gainJour: Francs | null
  j1PayeParBelivay: boolean
  ajoutGros: Francs
  heureRappel: number // minutes depuis minuit
  rangsDesRappels: readonly number[]
  /** PR-GRILLE-PREAVIS-J : un changement de grille est annoncé ce nombre de jours avant (EXT-11, jamais rétroactif). */
  preavisJours: number
}

export interface VueStock {
  lignes: LigneStock[] // filtrées
  compteurs: Record<CategorieStock, number> // selon les filtres autres que l'onglet
  /** Colis en stock (retours déposés exclus). */
  totalColis: number
  occupation: Occupation & { seuilPct: number; parClasse: Record<ClasseColis, { colis: number; places: number }>; retours: number }
  plan: CasePlan[]
  grille: GrilleVue
  /** Colis à code bloqué, commandes à payer au comptoir (puces de filtre), colis en groupage (onglet, ARL-80). */
  speciaux: { codeBloque: number; auComptoir: number; groupage: number }
  /** RELAIS-PLACES par classe ; PR-GROUPAGE-LIBERATION-J (libération au plus tard d'une liste groupée). */
  regles: { places: Record<ClasseColis, number>; groupageLiberationJ: number }
}

// ── Fiche d'un colis ───────────────────────────────────────────────────────────────────────────────────────────
/** Étape du parcours (frise, FIC-01, FIC-05) : seulement des faits logistiques, jamais une personne ni une boutique. */
export type EtapeParcours =
  | { type: 'scelle'; le: Instant | null; photos: number; encombrant: boolean }
  | { type: 'pris_en_charge'; le: Instant | null; entreprise: string | null }
  | { type: 'recu'; le: Instant; scelle: 'intact' | 'reserve'; emplacement: string | null }
  | { type: 'prevenu'; le: Instant | null }
  | { type: 'rappel'; code: string; le: Instant; dernierJour: boolean; du: Francs; duDemain: Francs }
  | { type: 'payante'; depuis: Jour; du: Francs }
  | { type: 'constat'; le: Instant; reference: string | null }
  | { type: 'retour_depose'; le: Instant; reference: string }
  | { type: 'encaisse'; le: Instant; montant: Francs | null }
  | { type: 'remis'; le: Instant; tiers: boolean }
  | { type: 'parti'; le: Instant; motif: string }

/** Un jour de la garde (carte « Garde », FIC-06, et le détail jour par jour). */
export interface JourGarde {
  rang: number
  jour: Jour
  tarif: Francs // facturé ce jour-là (0 : offert, fermé, suspendu)
  cumul: Francs // total dû à la fin de ce jour, plafond compris
  statut: 'offert' | 'facture' | 'ferme' | 'suspendu'
  quand: 'passe' | 'aujourdhui' | 'avenir'
  /** Part du relais pour ce jour (null pour l'employé). */
  partRelais: Francs | null
}

/** Pourquoi « Remettre » est fermé (FIC-03). */
export type MotifNonRemettable = 'groupage' | 'constat' | 'a_renvoyer' | 'a_faire_partir' | 'transfert' | 'retour' | 'incomplet' | 'code_bloque' | 'remis' | 'parti' | 'pas_arrive'

export interface FicheColis {
  colis: ColisRelais
  etiquette: EtiquetteStock | null
  categorie: CategorieStock | null
  groupe: { id: string; total: number; auRelais: string[] }
  parcours: EtapeParcours[]
  /** Messages datés envoyés au client (avis d'arrivée et rappels) : « Client prévenu n fois » (NTF-09). */
  clientPrevenu: number
  avisDelivreA: Instant | null
  /** Garde jour par jour ; null : la garde n'a pas commencé (groupe incomplet, client pas encore prévenu). */
  garde: {
    jours: JourGarde[]
    gratuitJusquau: Jour | null
    nonFactures: { jour: Jour; motif: 'ferme' | 'suspendu' }[]
    dernierJour: Jour | null
    cumulDernierJour: Francs
    renvoi: { jour: Jour; retenue: Francs } | null
    suspendue: boolean
    figee: boolean // garde encaissée au premier retrait du groupe : figée
  } | null
  /** Ce que le relais touchera pour ce colis (propriétaire seulement ; null pour l'employé). */
  remuneration: { remise: Francs; parJour: Francs; joursFactures: number; premierJourBelivay: Francs; garde: Francs; total: Francs; remiseComptee: boolean } | null
  remettable: { ok: true } | { ok: false; motif: MotifNonRemettable }
  /** Cases compatibles avec la classe, ayant la place (FIC-02). */
  casesLibres: { code: string; libres: number }[]
  depart: { collecte: string | null; heure: Instant | null } | null
  preuves: Preuve[]
  journal: EntreeJournal[]
  remplacement: boolean
}

// ── Inventaire (pointage des étagères) ─────────────────────────────────────────────────────────────────────────
export interface Inventaire {
  id: string
  commenceA: Instant
  par: string // initiales du membre
  /** Colis attendus sur les étagères au début (présents, retours compris). */
  attendus: { id: string; emplacement: string | null; classe: ClasseColis }[]
  pointes: { id: string; trouveEn: string | null; le: Instant }[]
  termineA: Instant | null
  bilan: { pointes: number; manquants: string[]; deplaces: number } | null
}

export type RefusStock = 'introuvable' | 'case_pleine' | 'etagere_interdite' | 'pas_au_relais' | 'deja_pointe' | 'aucun_inventaire' | 'inventaire_en_cours' | 'pin_requis'

export interface DomaineStock {
  stock(onglet?: OngletStock, recherche?: string): Promise<Stock>
  /** Liste filtrée du stock, compteurs des onglets, plan, occupation par classe, grille de garde. */
  vue(filtres?: FiltresStock): Promise<VueStock>
  fiche(id: string): Promise<ColisRelais | null>
  /** Fiche complète (parcours, garde jour par jour, preuves, journal, actions possibles) ; null : inconnu au relais. */
  ficheComplete(id: string): Promise<FicheColis | null>
  plan(): Promise<Case[]>
  deplacer(colisId: string, emplacement: string, o: Origine): Promise<Resultat<object, 'introuvable' | 'case_pleine' | 'etagere_interdite'>>
  inventaire(): Promise<Inventaire | null>
  commencerInventaire(o: Origine): Promise<Resultat<{ id: string }, RefusStock>>
  /** Pointe un colis trouvé (scan de son étiquette ou toucher) ; `trouveEn` : case où il est, si ce n'est pas la sienne. */
  pointer(colisId: string, trouveEn: string | null, o: Origine): Promise<Resultat<{ ecart: 'aucun' | 'deplace' }, RefusStock>>
  /** Clôt l'inventaire (PIN) : les colis non pointés sont signalés manquants à BelivaY. */
  terminerInventaire(pin: string, o: Origine): Promise<Resultat<{ bilan: NonNullable<Inventaire['bilan']> }, RefusStock>>
}
