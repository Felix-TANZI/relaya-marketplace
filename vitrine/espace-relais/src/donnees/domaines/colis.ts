// MODÈLE CENTRAL du colis au relais (possédé par le SOCLE ; PR-02 « Modèle de données » et « Cycle de vie », v6 D12 à
// D15, DP-08, DP-20, DP-24, DP-26, DP-62). Lu par les domaines reception, retrait, stock, departs, incidents et
// historique : aucun d'eux ne redéfinit un colis. Démonstration : src/demo/colis.ts (une seule liste de colis).
// - CODE DE RETRAIT : un code à 6 chiffres + QR PAR COLIS (v6 D12 ; A-VALIDER ARL-01, « Proposé », remplace le code
//   par groupe de CAL-32), envoyé au client à l'arrivée du colis, jamais avant le paiement d'une commande payable au
//   retrait. Il n'existe que côté serveur, sous forme vérifiable : JAMAIS dans un type du relais ; le gérant SAISIT ou
//   SCANNE ce que le client présente. Après un premier code juste, le guichet montre les autres colis du même client
//   au relais (« 2 autres colis pour ce client : scannez leur code ») ; chacun exige son propre code.
// - Un colis appartient à un GROUPE DE REMISE (une commande au même relais) : la GARDE se compte par groupe
//   (CGA-13, ARL-02) ; J1 = GARDE-J1-DEBUT (arrivée du dernier colis du groupe) ; grille GARDE-GRILLE (+
//   GARDE-GROS-AJOUT pour un carton C1/C2, 0 F au lancement selon ARL-07) ; payée en ESPÈCES au gérant (ou à
//   l'employé, ARL-06), UNE SEULE FOIS, au premier retrait du groupe ; remise bloquée tant que l'encaissement n'est pas
//   confirmé ; part du relais 100 F par jour facturé, le 1er jour payé par BelivaY (GARDE-J1-BELIVAY).
// - Preuves (D15) : une photo à chaque changement de main, prise par le professionnel ; l'étape est refusée sans elle.
// - Anonymat (GEN-01) : ni nom, ni téléphone, ni adresse du client ou du vendeur ; seule exception `porteurDesigne`.
import type { Acteur, ClasseColis, EntreeJournal, Francs, Instant, Jour, Photo } from '../communs'

/** États du cycle (PR-02) : la machine et ses transitions sont dans src/calculs/cycle.ts. */
export type EtatColis =
  | 'attendu' // annoncé dans un lot (mission créée), pas encore reçu
  | 'recu' // résultat « ok » posé, lot pas encore validé
  | 'recu_reserve' // reçu avec réserve (photo), ou en trop
  | 'refuse_reception' // refusé à la réception (scellé cassé…) : repart avec le livreur
  | 'absent' // annoncé mais absent du lot
  | 'en_stock' // lot validé : en garde (J1 gratuit, J2 à J6 payants)
  | 'dernier_jour' // J7
  | 'a_renvoyer' // J8 sans retrait : renvoi au vendeur
  | 'en_constat' // constat ou refus motivé au comptoir : garde et renvoi suspendus, sans frais
  | 'en_groupage' // liste d'envies : attend les autres colis du groupe, sans frais, pas de code
  | 'transfert_demande' // le client change de relais (TRANSFERT-RELAIS, nouveau code)
  | 'refuse_comptoir' // commande payable au retrait refusée sans motif : annulée (DP-24)
  | 'a_faire_partir' // décision d'un constat : repart (retour au vendeur)
  | 'remis' // remis au client : « Tout est en ordre », photo, PIN
  | 'retour_depose' // retour d'un client au motif validé, déposé au relais (hors capacité, jamais facturé)
  | 'parti' // sorti du relais, confirmé par le livreur (renvoi, retour, transfert, refus, fermeture)

export type MotifSortie = 'renvoi' | 'retour' | 'transfert' | 'refus' | 'fermeture'
export type ResultatReception = 'ok' | 'reserve' | 'refus' | 'absent' | 'en_trop'

/** Comment le colis est arrivé au relais (lot du livreur, avec son code de dépôt). */
export interface ArriveeColis {
  lot: string | null // « PQ-Z1-261013-001 » (paquet de l'entreprise de livraison)
  mission: string | null // arrêt du livreur (« A3 »)
  livreur: string | null // « Serge A. »
  entreprise: string | null // « Yafé Express »
  le: Instant | null // dépôt confirmé par le livreur
  photo: Photo | null // photo du lot à la réception
  resultat: ResultatReception | null
  reserve: { note: string; photos: Photo[] } | null
}

/** Garde du groupe, vue du relais (calculée par le serveur, garde.ts), au jour de la lecture. */
export interface GardeColis {
  j1: Jour | null // null : avis pas encore délivré, ou groupe incomplet : rien n'est facturé
  rang: number | null // jour de garde (1 à 7, 8 et plus : à renvoyer)
  gratuit: boolean // 1er jour (offert au client)
  du: Francs // garde due aujourd'hui, en espèces, jour entamé compris
  duDemain: Francs
  dernierJour: Jour | null // dernier jour de retrait
  renvoiLe: Jour | null // date du renvoi au vendeur
  suspendue: boolean // constat, litige, groupage, transfert : sans frais
  /** Ce que le relais garde (jours facturés × 100 F, + 1er jour payé par BelivaY) ; null pour un membre sans le droit
   * « argent » (employé de comptoir : PR-RC-09, DRO-03), mis à null par le serveur. */
  partRelais: Francs | null
  payeParBelivay: Francs | null
  /** Espèces encaissées et confirmées au premier retrait du groupe (ARL-02 : les colis suivants ne doivent plus rien). */
  encaissee: { montant: Francs; le: Instant; par: string } | null
}

/** Paiement de la commande : déjà payée, ou à payer au comptoir en Mobile Money (jamais en espèces, v6 D14). */
export interface PaiementColis {
  mode: 'paye' | 'au_comptoir'
  /** Au comptoir : montant de la commande à payer en Mobile Money (le relais ne voit pas le détail des articles). */
  montant: Francs
  etat: 'paye' | 'a_payer' | 'demande_envoyee' | 'confirme' | 'echoue'
  /** Référence de l'agrégateur, une fois confirmé (« CP-5520931 »). */
  reference: string | null
}

/** Groupe de remise (une commande au même relais) : la garde est comptée et encaissée par groupe. */
export interface GroupeRemise {
  id: string // « BLV-00006 » (la commande)
  colis: string[] // tous les colis du groupe (au relais ou attendus)
  arrives: number
  total: number
}

/** Code de retrait du colis, vu du relais : jamais sa valeur, seulement son état (ARL-01, DP-26). */
export interface CodeColis {
  /** Envoyé au client (colis arrivé ; payable au retrait : paiement confirmé). */
  envoye: boolean
  /** 3 codes faux de suite : bloqué jusqu'à cette heure (DP-26 : le client redemande un code lui-même). */
  bloqueJusqua: Instant | null
  essaisRestants: number
}

/** Motifs d'un constat (ARL-17) : au comptoir non conforme, abîmé, contrefaçon ; à la réception colis manquant,
 * emballage ouvert. Le défaut caché se déclare par le client en litige (DP-27). */
export type MotifConstat = 'non_conforme' | 'abime' | 'contrefacon' | 'manquant' | 'emballage_ouvert'

/** Preuve d'un changement de main ou d'un constat (photos prises par le professionnel, D15). */
export interface Preuve {
  nature: 'reception' | 'reserve' | 'refus' | 'lot' | 'remise' | 'deballage' | 'constat' | 'retour' | 'sortie'
  photos: Photo[]
  par: Acteur
  le: Instant
}

export interface ColisRelais {
  id: string // « BLV-00006-1 »
  groupe: string // « BLV-00006 »
  rangDansGroupe: number // n sur N : voir GroupeRemise.total
  classe: ClasseColis
  /** Carton C1 ou C2 (DP-08 : +GARDE-GROS-AJOUT par jour, part du relais RELAIS-GAIN-GARDE-GROS). */
  gros: boolean
  fragile: boolean
  places: number
  emplacement: string | null // « A-01 », « B-04 », « C-02 »
  etat: EtatColis
  arrivee: ArriveeColis
  garde: GardeColis | null // null : pas en garde (attendu, retour déposé, parti, refusé)
  paiement: PaiementColis
  code: CodeColis
  /** Nom du porteur désigné par le client (seule identité visible au relais, GEN-01) ; null sinon. */
  porteurDesigne: string | null
  /** Groupage (liste d'envies) : date de libération prévue. */
  groupageJusquau: Jour | null
  /** Constat en cours sur ce colis. */
  constat: string | null
  /** Retour client déposé : référence « RT-0412 », motif validé, scellé, destination (boutique). */
  retour: { reference: string; motif: string; scelle: 'intact' | 'casse'; destination: string } | null
  /** Sortie confiée au livreur : motif, destination (boutique du vendeur ou relais), collecte. */
  sortie: { motif: MotifSortie; destination: string | null; collecte: string | null; le: Instant | null } | null
  /** Remise au client : quand, par qui, porteur, photo, pièce vérifiée. */
  remise: { le: Instant; par: Acteur; porteur: 'client' | 'tiers'; pieceVerifiee: boolean; photo: Photo } | null
  preuves: Preuve[]
  journal: EntreeJournal[]
}

/** Onglets du stock (PR-06) : chacun lu par un filtre sur l'état. */
export type OngletStock = 'tous' | 'prets' | 'dernier_jour' | 'a_faire_partir' | 'constats' | 'groupage' | 'retours'
