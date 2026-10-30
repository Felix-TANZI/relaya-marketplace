// Domaine « retrait » (possédé par PR-05 Guichet 2) : la remise au client. Lit le modèle central (colis.ts).
// Déroulé (PR-05 v2.0 aligné sur v6 D12 à D15, DP-24, DP-26, DP-27, DP-28, ARL-01 à 06, 17, 32, 36, 42, ARL-70 à 79) :
// 1. CODE. Le client présente son code de retrait (QR ou 6 chiffres) : le gérant le SCANNE ou le SAISIT ; il ne le
//    voit JAMAIS. Un code PAR COLIS (ARL-01) : après un premier code juste, les autres colis du même client au relais
//    s'affichent (« 2 autres colis pour ce client : scannez leur code ») ; chacun exige son propre code. 3 codes faux de
//    suite sur les colis du client : bloqués CODE-BLOCAGE-H heures, le client redemande lui-même un code (DP-26).
//    Commande payable au retrait : pas encore de code ; recherche par la référence ou le numéro que le client dicte
//    (jamais renvoyé) ; paiement Mobile Money demandé au client (jamais en espèces, jamais hors ligne) ; la
//    confirmation (webhook, PR-PAY-COMPTOIR-DELAI-MIN) débloque son code, que le client présente ensuite.
// 2. TICKET. Garde du groupe, en ESPÈCES, une seule fois au premier retrait du groupe (ARL-02) ; « Montant reçu »
//    facultatif et monnaie à rendre (ARL-04) ; confirmée par le membre connecté, gérant ou employé (ARL-06), écrite au
//    journal (ARL-32), signée par le PIN de la remise (ARL-74) ; remise bloquée tant qu'elle n'est pas confirmée.
// 3. « TOUT EST EN ORDRE ? » Le gérant invite le client : seule l'application du client enregistre « Tout est en ordre »
//    (DP-28) ; « Le client préfère ne pas ouvrir » est un geste du gérant inscrit au journal (ARL-36) ; « Un problème »
//    ouvre un constat au comptoir (domaine incidents), la remise s'arrête (ARL-73).
// 4. PREUVE. Photo de remise obligatoire (D15) ; porteur : le client, le porteur désigné (pièce vérifiée) ou une autre
//    personne nommée par le gérant (RET-06) ; colis de valeur : seul le porteur nommé par le client (RET-07).
// 5. PIN. Le PIN du membre signe ; PR-PIN-REMISE-ESSAIS faux pendant une remise l'annulent (colis remis en stock,
//    contre-écriture des espèces, gérant prévenu) ; au PIN-ESSAIS-e faux de suite, PIN bloqué (ARL-42).
// Anonymat (GEN-01) : le client se nomme « prénom et initiale » ; aucune valeur de colis, aucun numéro, aucun code.
import type { ClasseColis, ClientVu, Francs, Instant, Jour, Origine, Photo, Resultat } from '../communs'

/** Une ligne du détail de la garde (ticket) : le serveur la calcule, l'écran la met en mots. */
export interface LigneGarde {
  jour: Jour
  /** Rang du jour de garde (1 à 7) ; null : jour gelé par un constat, non compté (le calendrier est repoussé, ARL-43).
   * Un jour fermé n'est jamais facturé. */
  rang: number | null
  nature: 'offert' | 'ferme' | 'suspendu' | 'payant'
  aujourdhui: boolean
  montant: Francs
}

export interface ColisARemettre {
  id: string
  groupe: string
  rangDansGroupe: number
  totalGroupe: number
  classe: ClasseColis
  emplacement: string | null
  /** Arrivée au relais (lot déposé). */
  arriveLe: Instant | null
  rang: number | null
  renvoiLe: Jour | null
  /** Code juste présenté pour ce colis. */
  codeVerifie: boolean
  /** Commande payable au retrait : articles à payer en Mobile Money (code débloqué au paiement). */
  auComptoir: boolean
  fragile: boolean
}

/** « Tout est en ordre ? » (DP-28) : attente de l'appui du client dans son application, sa confirmation, le choix de ne
 * pas ouvrir (geste du gérant, ARL-36), ou un problème (constat). */
export type ControleRemise = 'attente_client' | 'en_ordre' | 'sans_ouverture' | 'probleme'

export interface EncaissementGarde {
  montant: Francs
  recu: Francs | null
  monnaie: Francs
  /** Initiales du membre qui a confirmé (journal). */
  par: string
  le: Instant
}

export interface PreuveRemise {
  photo: Photo
  porteur: 'client' | 'designe' | 'tiers'
  /** Nom saisi par le gérant quand une autre personne retire (envoyé au client à l'instant, RET-06). */
  nomPorteur: string | null
  /** Numéro de la personne qui retire à la place du client (R89 : nom et numéro saisis par le gérant). */
  telephonePorteur?: string | null
  pieceVerifiee: boolean
}

export interface PaiementComptoir {
  montant: Francs
  etat: 'a_payer' | 'demande_envoyee' | 'confirme' | 'echoue' | 'expire'
  operateur: 'MTN' | 'Orange' | null
  reference: string | null
  demandeA: Instant | null
  /** Au-delà, sans webhook : « Paiement non reçu · renvoyer la demande » (PR-PAY-COMPTOIR-DELAI-MIN). */
  expireA: Instant | null
}

export interface Remise {
  id: string
  client: ClientVu
  colis: ColisARemettre[]
  /** Autres colis de ce client au relais, prêts, dont le code n'a pas encore été présenté (ARL-01). */
  autresColis: { id: string; classe: ClasseColis; emplacement: string | null }[]
  /** Garde des groupes de la remise due aujourd'hui, en espèces ; 0 si déjà encaissée au premier retrait (ARL-02). */
  garde: { du: Francs; detail: LigneGarde[]; dejaReglee: boolean; encaissement: EncaissementGarde | null }
  /** Commande payable au retrait : articles en Mobile Money, demandés sur le téléphone du client. */
  paiement: PaiementComptoir | null
  porteurDesigne: string | null
  /** Pièce d'identité à vérifier (porteur désigné, colis de valeur). */
  pieceExigee: boolean
  /** Colis de valeur (CODE-PORTEUR) : seul le porteur nommé par le client peut retirer (RET-07). Jamais la valeur. */
  colisDeValeur: boolean
  controle: ControleRemise | null
  inviteA: Instant | null
  preuve: PreuveRemise | null
  /** Code faux sur cette remise : essais restants avant le blocage des colis du client (DP-26). */
  essaisRestants: number
  bloqueJusqua: Instant | null
  /** PIN de la remise : essais restants avant annulation (ARL-42). */
  pinEssaisRestants: number
  annulee: { motif: 'pin' | 'abandon' | 'probleme' | 'refus'; le: Instant; especesRendues: Francs; constat: string | null } | null
  creeeA: Instant
  remiseA: Instant | null
  /** Rémunération du relais pour cette remise (gérant seulement : null pour l'employé, filtré par le serveur). */
  gain: { colis: Francs; garde: Francs } | null
}

export type RefusRetrait =
  | 'code_faux'
  | 'bloque'
  | 'introuvable'
  | 'deja_remis'
  | 'pas_au_relais' // étiquette ou code d'un colis destiné à un autre relais
  | 'etiquette' // étiquette du colis scannée au lieu du code du client
  | 'non_remettable' // en constat, en groupage, à renvoyer, à faire partir (detail : l'état)
  | 'paiement_requis'
  | 'reseau_requis'
  | 'montant_insuffisant'
  | 'encaissement_non_confirme'
  | 'controle_requis'
  | 'probleme_signale'
  | 'photo_manquante'
  | 'porteur_requis'
  | 'porteur_non_autorise'
  | 'pin_faux'
  | 'pin_bloque'
  | 'remise_annulee'
  | 'piece_non_verifiee'
  | 'formation_incomplete'
  | 'plafond_hors_ligne'
  | 'transition_interdite'
  | 'trop_de_codes'

/** Détail d'un refus de code (au lieu d'un texte : l'écran le met en mots). */
export interface DetailCode {
  essaisRestants?: number
  bloqueJusqua?: Instant
  etat?: string
  colis?: string
  constat?: string | null
}

export interface DomaineRetrait {
  /** Code ou QR présenté par le client : ouvre (ou complète) la remise. Refus : `detail` = DetailCode en JSON. */
  verifierCode(saisie: { methode: 'code' | 'qr'; valeur: string }, remiseId: string | null, o: Origine): Promise<Resultat<{ remise: Remise }, RefusRetrait>>
  /** Commande payable au retrait, sans code : par la référence (« BLV-00038 ») ou le numéro dicté par le client. */
  rechercher(q: { reference: string } | { telephone: string }): Promise<Remise | null>
  remise(id: string): Promise<Remise | null>
  /** Demande Mobile Money sur le téléphone du client (jamais hors ligne, OFF-02). */
  demanderPaiement(remiseId: string, o: Origine): Promise<Resultat<object, RefusRetrait>>
  annulerPaiement(remiseId: string, o: Origine): Promise<Resultat<object, RefusRetrait>>
  /** Espèces de garde reçues : confirmées par le membre (« Montant reçu » facultatif, monnaie à rendre). */
  confirmerEncaissement(remiseId: string, recu: Francs | null, o: Origine): Promise<Resultat<{ monnaie: Francs }, RefusRetrait>>
  /** « Tout est en ordre » : la demande part dans l'application du client, qui seul confirme (DP-28). */
  inviterControle(remiseId: string, o: Origine): Promise<Resultat<object, RefusRetrait>>
  /** « Le client préfère ne pas ouvrir · continuer » : inscrit au journal, fenêtre de retour ouverte (ARL-36). */
  nePasOuvrir(remiseId: string, o: Origine): Promise<Resultat<object, RefusRetrait>>
  /** Photo de remise et porteur, avant la signature par le PIN. */
  poserPreuve(remiseId: string, p: PreuveRemise, o: Origine): Promise<Resultat<object, RefusRetrait>>
  /** Signature par le PIN du membre : la remise se fait (ou s'annule au PR-PIN-REMISE-ESSAIS-e PIN faux). */
  remettre(remiseId: string, pin: string, o: Origine): Promise<Resultat<{ remise: Remise }, RefusRetrait>>
  /** Commande payable au retrait refusée sans motif : annulée, garde retenue sur la livraison payée (DP-24). */
  refusSansMotif(remiseId: string, pin: string, o: Origine): Promise<Resultat<object, RefusRetrait>>
  /** Arrêt de la remise (client qui renonce, problème) : colis en stock, espèces rendues (contre-écriture). */
  abandonner(remiseId: string, motif: 'abandon' | 'probleme', constat: string | null, o: Origine): Promise<Resultat<{ especesRendues: Francs }, RefusRetrait>>
  /** DÉMONSTRATION SEULEMENT : clients au relais qui peuvent présenter un code (l'application du client). */
  presentables(): Promise<{ colis: string; client: string; classe: ClasseColis }[]>
  /** DÉMONSTRATION SEULEMENT : le client présente son QR (l'application du client). */
  simulerPresentation(colisId: string): Promise<{ methode: 'qr'; valeur: string } | null>
  /** DÉMONSTRATION SEULEMENT : le client refuse la demande Mobile Money (solde insuffisant). */
  simulerRefusPaiement(remiseId: string): Promise<void>
}
