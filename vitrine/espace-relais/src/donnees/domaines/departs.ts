// Domaine « departs » (possédé par PR-06 Stock) : tout ce qui quitte le relais (DEP-01) et sa remise au livreur à la
// collecte (« A4 »), en miroir de la réception (PR-D07.A09) :
// - motifs : non retiré en 7 jours (renvoi au vendeur le premier jour ouvert après le 7e jour, jours fermés comptés,
//   jamais facturés : ARL-08, PR-RC-07) ; retour validé déposé (vers la boutique) ; transfert (le client a changé de
//   relais, frais payés dans son application, jamais au comptoir : ARL-23, PR-RC-23) ; refus au comptoir (décision du
//   constat, ou commande payable au retrait refusée) ; fermeture déclarée (vers le relais voisin) ;
// - chaque colis prévu est SCANNÉ (ou touché) quand il est tendu au livreur, ou marqué ABSENT avec un motif (DEP-02) ;
// - « Valider la sortie » exige que tout colis prévu soit scanné ou absent, une PHOTO de sortie (v6 D15, changement de
//   main) et le PIN du membre ; la sortie n'est effective qu'à la CONFIRMATION du livreur sur son téléphone (DEP-03) :
//   la garde lui passe, horodatée, et les places se libèrent à ce moment ;
// - un colis à renvoyer non remis à la collecte prévue reste en tête de liste ; après PR-DEP-ALERTE-H le support est
//   alerté (DEP-05, PR-RC-15).
// Le vendeur n'est nommé que par sa boutique, seulement comme destination d'un départ (communs.ts) ; jamais le client.
import type { ClasseColis, Francs, Instant, Origine, Photo, Resultat } from '../communs'
import type { ColisRelais, MotifSortie } from './colis'

export interface Collecte {
  id: string // arrêt du livreur (« A4 »)
  lot: string
  entreprise: string
  livreur: string
  heurePrevue: Instant
  colis: string[] // colis prévus à cette collecte
  presentes: string[] // scannés et présentés au livreur
  termineeA: Instant | null
  /** Colis prévus marqués absents (DEP-02), avec leur motif. */
  absents: { colis: string; motif: MotifAbsence; le: Instant }[]
  /** Sortie validée au relais (photo, PIN) : on attend la confirmation du livreur. */
  valideeA: Instant | null
  /** Colis confirmés par le livreur (la garde lui est passée). */
  confirmes: string[]
  /** Places libérées à la confirmation (retours exclus, CAL-21). */
  placesLiberees: number
}

/** Pourquoi un colis prévu ne part pas (DEP-02) : il reste au relais, en tête de liste. */
export type MotifAbsence = 'introuvable' | 'abime' | 'pas_de_place'

/** Un colis à faire partir, prêt pour la liste « À remettre ». */
export interface LigneDepart {
  colis: ColisRelais
  motif: MotifSortie
  /** Boutique (renvoi, retour) ou relais d'arrivée (transfert, fermeture) ; null : décidé par BelivaY. */
  destination: string | null
  collecte: string | null
  /** À faire partir depuis (renvoi : ouverture du jour de renvoi). */
  depuis: Instant | null
  /** DEP-05 : non remis depuis plus de PR-DEP-ALERTE-H : support alerté. */
  enRetard: boolean
  /** Frais de transfert payés par le client dans son application (TRANSFERT-RELAIS), pour information. */
  fraisTransfert: Francs | null
}

/** Passage prévu d'une entreprise de livraison (DEP-04) : ce qu'il dépose et ce qu'il reprend. */
export interface Passage {
  heure: Instant
  entreprise: string
  depose: number // colis annoncés
  reprend: number // colis à faire partir
  lot: string | null
  collecte: string | null
}

/** Sortie faite (onglet « Partis ») : signée par le livreur. */
export interface SortieFaite {
  collecte: string
  le: Instant
  colis: { id: string; reference: string; motif: MotifSortie; destination: string | null; classe: ClasseColis }[]
  livreur: string
  entreprise: string
  placesLiberees: number
}

export interface ReglesDeparts {
  pinLongueur: number // PIN-LONGUEUR
  alerteH: number // PR-DEP-ALERTE-H
  transfert: Record<ClasseColis, Francs> // TRANSFERT-RELAIS
  /** Garde retenue au renvoi d'une commande payée : total des 7 jours (GARDE-GRILLE), au plus la valeur (ARL-08). */
  gardeRenvoi: Francs
  renvoi: Francs // GARDE-RENVOI (v6 : 0 F)
}

export interface Departs {
  aFairePartir: ColisRelais[]
  collectes: Collecte[]
  lignes: LigneDepart[]
  passages: Passage[]
  partis: SortieFaite[]
}

export type RefusDepart = 'introuvable' | 'pas_a_faire_partir' | 'pas_dans_la_collecte' | 'photo_manquante' | 'pin_requis' | 'rien_a_valider' | 'colis_non_traites' | 'deja_validee' | 'deja_partie'

export interface DomaineDeparts {
  departs(): Promise<Departs>
  regles(): Promise<ReglesDeparts>
  /** Colis tendu au livreur (scan de son étiquette ou toucher) ; hors connexion, il part en file (OFF-01). */
  scanner(collecteId: string, colisId: string, o: Origine): Promise<Resultat<object, RefusDepart>>
  /** Retire un scan fait par erreur (avant la validation). */
  annulerScan(collecteId: string, colisId: string, o: Origine): Promise<Resultat<object, RefusDepart>>
  /** Colis prévu qui ne part pas : absent avec son motif (DEP-02) ; « introuvable » alerte BelivaY. */
  marquerAbsent(collecteId: string, colisId: string, motif: MotifAbsence, o: Origine): Promise<Resultat<object, RefusDepart>>
  /** Remet un colis marqué absent dans la liste (retrouvé). */
  annulerAbsent(collecteId: string, colisId: string, o: Origine): Promise<Resultat<object, RefusDepart>>
  /** Valide la sortie (photo, PIN) ; la confirmation du livreur suit sur son téléphone (DEP-03). */
  valider(collecteId: string, photo: Photo, pin: string, o: Origine): Promise<Resultat<{ partis: number }, RefusDepart>>
}
