// Domaine « session » (VD-03) : qui est connecté (membre et rôle), quelle boutique, ses pastilles d'en-tête et ses
// badges ; la connexion (identifiant ou e-mail et mot de passe, Google, Apple, numéro et code), le second facteur
// d'un appareil inconnu, le mot de passe oublié ; l'ouverture d'une boutique en trois étapes (ouvrir, publier, être
// payé), l'arrivée depuis l'espace client, Face ID ou l'empreinte, la saisie assistée par l'agent de zone.
// API attendue (VD-02 p12, REFVD-R187, REFVD-R299 ; routes d'authentification de relaya, DP-57 T-1) :
// POST /auth/login → {need_2fa, challenge_id} · POST /auth/2fa · POST /auth/otp · POST /auth/verify ·
// POST /auth/password-reset · GET /account/status · POST /shops · POST /shops/{id}/kyc · POST /contract/sign ·
// GET /assisted-entry · POST /assisted-entry/approve · PUT /assisted-entry/{id}. Même jeton que l'espace client.
// ANONYMAT : rien ici ne parle d'un client ; l'arrivée depuis l'espace client est le compte du vendeur lui-même.
import type { Francs, Instant, Jour, Palier, Plan, Role } from '../communs'
import type { Droit, ProfilAcces } from '../droits'

export type EtatBoutique = 'ouverte' | 'fermee_aujourdhui' | 'en_pause' | 'suspendue'

export interface Membre {
  id: string
  prenom: string
  nom: string
  initiales: string
  role: Role
  /** Ce que ce membre peut faire : tous les droits pour le propriétaire, ceux cochés pour un employé (src/donnees/droits.ts). */
  droits: Droit[]
  profil: ProfilAcces | null // null : le propriétaire
}

export interface BoutiqueSession {
  nom: string // nom interne (jamais montré au client)
  etat: EtatBoutique
  fermeA: string // « 18:00 » (horaires du jour)
  palier: Palier
  trustScore: number // valeur exacte du service Scores (62,7), affichée arrondie (63)
  plan: Plan
  decouverte: { active: boolean; fin: Jour | null; commandes: number }
}

export interface SessionVendeur {
  connecte: boolean
  membre: Membre | null
  proprietaire: { prenom: string; nom: string } | null
  boutique: BoutiqueSession | null
  badges: { notifications: number; commandes: number; messages: number }
  argentGele: boolean // point rouge de l'onglet Argent
  maintenant: Instant // heure du serveur à la lecture
  /** Source hybride (comptes réels, site/COMPTES-REELS.md) : le compte réel ouvert et son statut (« en_attente » :
   *  pas encore validé par BelivaY). Absent en démonstration seule et en mode API. */
  compteReel?: { statut: 'actif' | 'en_attente' | 'refuse' | 'suspendu'; email: string }
}

// ── Codes à 6 chiffres (CNX-04, CNX-06, OTP-LONG, OTP-DUREE, OTP-ESSAIS, OTP-RENVOI ; DP-52) ─────────────────────

export type Canal = 'sms' | 'whatsapp'

/** Un code envoyé : où (masqué), par quel canal, combien de temps il vaut, quand on peut en redemander un. */
export interface EnvoiCode {
  id: string
  canal: Canal
  destination: string // « 677 •• •• 90 » : numéro masqué
  envoyeA: Instant
  valideMinutes: number // 10 (OTP-DUREE)
  renvoiSecondes: number // 60 (OTP-RENVOI) : délai avant un nouvel envoi
  renvoisRestants: number // 3 envois par heure (OTP-RENVOI)
  codeDemo?: string // démonstration seulement : le serveur ne le renvoie jamais
}

/** Réponse à un code tapé : bon, faux (essais restants), trop d'essais (heure de reprise), expiré. */
export type ResultatCode = { ok: true } | { ok: false; raison: 'code'; essaisRestants: number } | { ok: false; raison: 'bloque'; jusqua: Instant } | { ok: false; raison: 'expire' }

/** Nouvel envoi refusé : trop tôt (secondes à attendre) ou plus d'envoi possible dans l'heure. */
export type ResultatRenvoi = { ok: true; envoi: EnvoiCode } | { ok: false; raison: 'trop_tot'; secondes: number } | { ok: false; raison: 'limite'; jusqua: Instant }

// ── Connexion (CNX-01 à CNX-07, VD03-R01 à R05 ; DP-57 S-3) ──────────────────────────────────────────────────────

/** Appareil qui demande la connexion, montré sur l'écran du second facteur (VD03-R02). */
export interface AppareilDemandeur {
  nom: string // « iPhone · Safari »
  lieu: string // « Yaoundé »
}

/** Second facteur demandé (appareil inconnu) : le code part par SMS au numéro du compte. */
export interface DefiConnexion extends EnvoiCode {
  appareil: AppareilDemandeur
  demandeA: Instant
}

export type ResultatConnexion =
  | { ok: true; session: SessionVendeur }
  | { ok: false; raison: 'identifiants'; essaisRestants: number } // jamais d'erreur technique (VD03-R03)
  | { ok: false; raison: 'bloque'; jusqua: Instant } // 5 essais faux : 15 minutes, le propriétaire est prévenu (CNX-03)
  | { ok: false; raison: 'deuxieme_facteur'; defi: DefiConnexion }
  /** Google ou Apple (connecterAvec) : fournisseur non branché sur ce site (indisponible), jeton refusé, ou aucune
   *  boutique pour cette identité (inconnu). */
  | { ok: false; raison: 'indisponible' }
  | { ok: false; raison: 'refuse' }
  | { ok: false; raison: 'inconnu' }

export interface OptionsConnexion {
  /** « Se souvenir de moi » : la session reste ouverte sur l'appareil (30 jours sans ouverture au plus, DP-57 S-3) ;
   *  sinon elle se ferme avec le navigateur (téléphone partagé). */
  seSouvenir?: boolean
}

/** Connexion par numéro : le code part par WhatsApp ou par SMS ; un numéro sans compte vendeur est dit (« inconnu »). */
export type ResultatCodeNumero = { ok: true; envoi: EnvoiCode } | { ok: false; raison: 'numero' | 'inconnu' } | { ok: false; raison: 'limite'; jusqua: Instant }

/** Mot de passe oublié (VD03-R04) : la réponse ne dit jamais si le compte existe ; le lien vaut 15 minutes. */
export interface LienMotDePasse {
  envoyeA: Instant
  valideMinutes: number // 15 (PWD_RESET_LINK_TTL_MIN, DP-56 Q-22)
  renvoiSecondes: number
  jetonDemo?: string // démonstration seulement : ouvre le lien reçu
}
export interface NouveauMotDePasse {
  envoi: EnvoiCode // code SMS qui confirme que c'est le titulaire (VD03-R04)
  identifiant: string // identifiant du compte (« @Penga12 »), pour se reconnecter
  /** Compte réel (source hybride) : le lien reçu par e-mail suffit, l'écran n'affiche pas l'étape du code SMS. */
  sansCode?: boolean
}

// ── Ouverture de la boutique en trois étapes (OUV-01 à 05, KYC-01 à 09, VD03-R06 à R14 ; REFCL-R090) ─────────────

export type StatutVendeur = 'particulier' | 'entreprise'
export interface Zone {
  code: string // « Z10 »
  quartiers: string // nom complet de la zone sur la carte : « Mimboman / Kondengui »
  exploitee: boolean // zone exploitée (ZONES-EXPLOITEES) ; les douze zones sont acceptées, les autres sans tournée groupée
}
export interface PointBoutique {
  lat: number
  lon: number
  precision: number // mètres (GPS) ; 0 : point posé à la main
}

/** Étape du dossier : ouvrir (étape 1), pièces (étape 2), attente (vérification), contrat (étape 3), signée ;
 *  refusée : vérification refusée pour de bon (3 refus ou fraude, DP-57 S-2). */
export type EtapeOuverture = 'ouvrir' | 'pieces' | 'attente' | 'contrat' | 'signee' | 'refusee'
export type EtatElement = 'a_faire' | 'recu' | 'verifie' | 'refuse'
export interface ElementKyc {
  etat: EtatElement
  a: Instant | null // reçu, vérifié ou refusé à
  motif: string | null // motif écrit d'un refus (VD03-R14)
}
export interface ContratVendeur {
  version: string // « 2026-10 »
  // Les cinq lignes (VD03-R12), lues dans les paramètres en vigueur : aucune valeur écrite dans l'écran.
  gardeMinPourCent: string // « 76,5 »
  gardeMaxPourCent: string // « 98 »
  minimumParCommande: Francs // 700 F (VD-COM-MIN)
  plafondDemarrage: Francs // 500 000 F (VD-PLAFOND-DEMARRAGE)
  commandesDemarrage: number // 10
  preavisJours: number // 30 (RESILIATION_PREAVIS_J)
  exemple: { titre: string; prix: Francs; garde: Francs; gainDecouverte: Francs } // même calcul que « Vous gardez »
  decouverte: { mois: number; commandes: number }
  lancement: { mois: number; argent: number; or: number; platine: number }
  immatricule: boolean
  rccm: string
  niu: string
  signeA: Instant | null
}
export interface DossierOuverture {
  ref: string // « VD-2026-0913 »
  depuisClient: boolean // ouverte depuis le compte client (« Devenir vendeur »)
  etape: EtapeOuverture
  boutique: { nom: string; categorie: string; statut: StatutVendeur; telephone: string; zone: Zone | null; point: PointBoutique | null }
  numeroVerifie: boolean
  pieces: { recto: ElementKyc; verso: ElementKyc; selfie: ElementKyc }
  versement: ElementKyc & { operateur: 'MTN' | 'Orange' | null; masque: string | null }
  envoyeA: Instant | null // dossier envoyé pour vérification
  reponseAvant: Instant | null // date de réponse toujours affichée (VD03-R08)
  refus: number // refus successifs (DP-57 S-2 : 3 refus, vérification refusée)
  refusMax: number
  brouillons: number // produits en brouillon, en ligne dès l'accord (KYC-02)
  enLigne: number // produits passés en ligne à l'accord
  contrat: ContratVendeur
  delais: { autoMinutes: number; humainHeures: number } // 15 min, 48 h ouvrées (VD03-R08)
}

export interface ChampsOuverture {
  nom: string
  categorie: string
  statut: StatutVendeur
  telephone: string // chiffres du numéro camerounais (9 chiffres, commence par 6)
  point: PointBoutique | null
}
export type RefusOuverture = 'nom' | 'categorie' | 'numero' | 'point' | 'hors_zone' | 'deux_comptes'

/** Ce que l'espace client transmet (« Devenir vendeur ») : le compte du vendeur lui-même, rien à ressaisir. */
export interface ArriveeClient {
  ref: string // demande « VD-2026-0913 »
  prenom: string
  boutique: { nom: string; categorie: string; statut: StatutVendeur }
  telephone: string // numéro du compte client, masqué, déjà vérifié par code
  operateur: 'MTN' | 'Orange' | null
}

export type PieceKyc = 'recto' | 'verso' | 'selfie'

// ── Saisie assistée (SAI-01 à 04, VD03-R15 ; DP-56 Q-34, Q-40) ────────────────────────────────────────────────────

export type Controle = 'photo' | 'doublon' | 'prix' | 'description'
export interface FicheAgent {
  id: string
  titre: string
  dessin: string // illustration ou vraie photo prise par l'agent (remplaçable)
  prix: Francs
  stock: number
  photos: number
  controles: Record<Controle, 'ok' | 'echec'>
  rattachee: boolean // doublon rattaché à la fiche maître existante
  mediane: Francs | null // prix habituel de la catégorie (contrôle du prix anormal)
  modifieeA: Instant | null
}
export interface SaisieAssistee {
  agent: { prenom: string; zone: string }
  le: Jour // visite de l'agent
  gratuite: boolean // gratuite pour les premières boutiques de la zone (SAI-03)
  premieresBoutiques: number // 10 premières boutiques de chaque zone exploitée (SAI_FREE_FIRST_SHOPS)
  prixSession: Francs | null // tarif d'une session suivante ; null pour l'accès Préparation (aucun montant)
  fiches: FicheAgent[] // à valider
  validees: { id: string; titre: string; enVerification: boolean; a: Instant }[]
  seuilPrix: { basPourCent: number; hautFois: number } // prix anormal : sous 50 % ou au-delà de 3 fois la médiane
}

// ── Face ID ou empreinte (DP-56 Q-41 V4/V10 ; DP-57 S-1) ──────────────────────────────────────────────────────────

export interface Biometrie {
  proposee: boolean // proposée une seule fois
  active: boolean
}

export interface DomaineSession {
  session(): Promise<SessionVendeur>
  connecter(identifiant: string, motDePasse: string, o?: OptionsConnexion): Promise<ResultatConnexion>
  connecterAvec(fournisseur: 'google' | 'apple', o?: OptionsConnexion): Promise<ResultatConnexion>
  /** Code du second facteur (POST /auth/2fa {challenge_id, code}). */
  validerDeuxiemeFacteur(code: string): Promise<ResultatCode>
  defiEnCours(): Promise<DefiConnexion | null>
  renvoyerDeuxiemeFacteur(): Promise<ResultatRenvoi>
  demanderCodeNumero(telephone: string, canal: Canal, o?: OptionsConnexion): Promise<ResultatCodeNumero>
  envoiNumero(): Promise<EnvoiCode | null>
  validerCodeNumero(code: string): Promise<ResultatCode>
  renvoyerCodeNumero(canal: Canal): Promise<ResultatRenvoi>
  demanderLienMotDePasse(identifiant: string): Promise<{ ok: true; lien: LienMotDePasse } | { ok: false; raison: 'vide' }>
  ouvrirLienMotDePasse(jeton: string): Promise<{ ok: true; nouveau: NouveauMotDePasse } | { ok: false; raison: 'expire' }>
  choisirMotDePasse(jeton: string, code: string, motDePasse: string): Promise<ResultatCode | { ok: false; raison: 'faible' }>
  deconnecter(): Promise<SessionVendeur>
  /** Démonstration : se connecter comme un autre membre de l'équipe (propriétaire ou accès Préparation). */
  changerMembre(id: string): Promise<SessionVendeur>
  /** Cet appareil n'est plus reconnu (Sécurité, VD-11) : la prochaine connexion demandera un code SMS. */
  oublierAppareil(): Promise<void>
  /** Lien de connexion par e-mail (« Recevoir un lien de connexion ») : même réponse que l'adresse ait une boutique ou
   *  non ; le lien vaut quelques minutes et ne sert qu'une fois. */
  demanderLienConnexion(email: string): Promise<{ ok: true; destination: string; valideMinutes: number } | { ok: false; raison: 'email' }>
  /** Le lien ouvert (?lien= de l'adresse) : comme une connexion (appareil inconnu : code SMS d'abord). */
  ouvrirLienConnexion(jeton: string, o?: OptionsConnexion): Promise<ResultatConnexion | { ok: false; raison: 'expire' | 'invalide' }>

  // Ouverture (étapes 1 à 3)
  categories(): Promise<string[]>
  zoneDuPoint(point: { lat: number; lon: number }): Promise<Zone | null>
  ouverture(): Promise<DossierOuverture | null>
  demarrerOuverture(champs: ChampsOuverture): Promise<{ ok: true; envoi: EnvoiCode } | { ok: false; raison: RefusOuverture }>
  envoiOuverture(): Promise<EnvoiCode | null>
  validerCodeOuverture(code: string): Promise<ResultatCode>
  renvoyerCodeOuverture(): Promise<ResultatRenvoi>
  envoyerPiece(piece: PieceKyc, image: string): Promise<{ ok: true; dossier: DossierOuverture } | { ok: false; raison: 'illisible' | 'visage' }>
  demanderCodeVersement(telephone: string): Promise<{ ok: true; envoi: EnvoiCode } | { ok: false; raison: 'numero' | 'operateur' }>
  validerCodeVersement(code: string): Promise<ResultatCode>
  envoyerPourVerification(): Promise<{ ok: true; dossier: DossierOuverture } | { ok: false; raison: 'incomplet' }>
  /** Démonstration : la réponse du prestataire de vérification (accord, ou recto refusé avec son motif). */
  reponseVerificationDemo(accord: boolean): Promise<DossierOuverture>
  signerContrat(o: { immatricule: boolean; rccm?: string; niu?: string }): Promise<{ ok: true; dossier: DossierOuverture } | { ok: false; raison: 'rccm' | 'niu' | 'etape' }>
  arriveeClient(): Promise<ArriveeClient | null>
  confirmerArriveeClient(point: PointBoutique): Promise<{ ok: true; dossier: DossierOuverture } | { ok: false; raison: 'point' | 'hors_zone' }>

  // Face ID ou empreinte
  biometrie(): Promise<Biometrie>
  reglerBiometrie(active: boolean): Promise<Biometrie>

  // Saisie assistée
  saisieAssistee(): Promise<SaisieAssistee>
  validerFiches(ids: string[]): Promise<SaisieAssistee>
  modifierFiche(id: string, champs: { prix: Francs; stock: number }): Promise<{ ok: true; saisie: SaisieAssistee } | { ok: false; raison: 'prix' | 'stock' }>
}
