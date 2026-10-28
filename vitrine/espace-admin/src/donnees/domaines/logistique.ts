// Domaine « logistique » (ADM-08, ADM-09, page ajoutée « candidatures » ; tenu par S4) : relais, entreprises de
// livraison, livreurs, paquets, zones, carte, emballages, candidatures. La console observe, active, tranche et
// escalade ; elle n'affecte JAMAIS un livreur ni un paquet (DP-63, A-02, ADM-P19R-04, ADM-PQ-02). Opérations : ses
// zones seulement (la source filtre, exports compris : ADM-ROL-03). Toute décision passe par DecisionMotivee
// (source.quatreyeux.decider : motif, preuves, quatre yeux) ; la source l'applique (verifier() la refuse d'avance
// au rôle, à la zone ou à l'état qui ne la permet pas) et publie à l'entreprise et au livreur ce qui les touche (pont).
import type { CodeZone, Francs, Instant, Resultat, Role } from '../communs'

export interface Zone {
  code: CodeZone
  nom: string
  exploitee: boolean
}

export type Classe = 'S' | 'M' | 'L'
export type Ton = 'green' | 'amber' | 'red' | 'ink' | 'acc' | 'blue' | 'or'
/** Étape d'une chaîne (activation d'un relais, d'une entreprise, d'un livreur). */
export interface Etape {
  titre: string
  detail: string
  etat: 'fait' | 'en_cours' | 'a_faire' | 'bloque'
  route?: string
}
/** Point de chronologie (journée d'un relais, d'un paquet, d'une suspension). */
export interface Moment {
  le: Instant | null
  titre: string
  detail?: string
  etat: 'fait' | 'en_cours' | 'mauvais' | 'a_venir'
}

// ── Relais (ADM-P17) ──────────────────────────────────────────────────────────────────────────────────────────────
export type StatutRelais = 'en_configuration' | 'ouvert' | 'sature' | 'ferme' | 'fin_convention'
export interface RelaisCourt {
  id: string
  nom: string // « Relais Bastos Carrefour »
  gerant: string // « Rose Mbarga »
  zone: CodeZone
  zoneNom: string
  statut: StatutRelais
  capacite: number // places déclarées et mesurées (S = 1, M = 2, L = 5 : RELAIS-PLACES-CLASSE)
  occupes: number
  taux: number // % des places, arrondi
  enGarde: number
  parClasse: Record<Classe, number>
  fermeA: string
  trustScore: number | null
  lat: number
  lng: number
  /** Versement du vendredi (CACHEE-07) : gains − espèces de garde encaissées ; négatif → 0 F et report. */
  versement: { vendredi: Instant; colisRemis: number; jours: number; gains: Francs; especes: Francs; solde: Francs; aVerser: Francs; report: Francs; vendredisReport: number; plan: { le: Instant; par: string } | null }
  bascule: { versId: string; versNom: string; le: Instant; par: string } | null
  attente: { le: Instant; par: string } | null
  secours: { id: string; nom: string; zone: CodeZone; occupes: number; capacite: number; distanceKm: number } | null
  fermeture: { depuis: Instant; signalePar: string; relance: Instant | null; transfert: { versId: string; versNom: string; le: Instant; colis: number } | null } | null
  convention: { signeeLe: Instant | null; version: number; finLe: Instant | null }
  etapes: Etape[]
  constatsOuverts: number
  /** Fermeture annoncée par le gérant (pont : relay.closure.declared), jours « AAAA-MM-JJ », « au » inclus. */
  annonce: { du: string; au: string; motif: string } | null
  /** Colis non retrouvés à l'inventaire du relais (pont : relay.inventory.missing) : à instruire par la console. */
  manquants: { inventaire: string; colis: string[]; le: Instant }[]
}
export interface RelaisFiche extends RelaisCourt {
  kyc: { piece: 'verifiee' | 'a_revoir' | 'manquante'; momo: string | null; dossier: string | null }
  visite: { le: Instant; agents: string; points: { t: string; ok: boolean }[] } | null
  formationLe: Instant | null
  photos: { nature: string; le: Instant }[]
  journee: Moment[]
  autresRelaisZone: number
}

// ── Entreprises (ADM-P18) ─────────────────────────────────────────────────────────────────────────────────────────
export type Palier = 'Nouveau' | 'Confirme' | 'Or'
export type StatutEntreprise = 'configuration' | 'pilote' | 'active' | 'restreinte' | 'suspendue'
export interface EntrepriseCourte {
  id: string
  nom: string // « Yafé Express »
  quartier: string
  zones: CodeZone[]
  capacites: Record<CodeZone, { capacite: number; acceptes: number }>
  livreurs: number
  livreursActifs: number
  palier: Palier
  plafond: Francs | null // plafond de valeur par colis du palier (null : sans plafond)
  statut: StatutEntreprise
  trustScore: number | null
  acceptation: { acceptes: number; publies: number } | null
  delaiMin: number | null
  pertes: number
  rendus7j: number
  restrictionJusqua: Instant | null
}
export type ControleGrille = 'ok' | 'bloquee' | 'colis' | 'refacturee' | 'minoration' | 'indicative'
export interface LigneGrille {
  id: string
  prestation: string
  detail: string
  prix: Francs | null
  plafond: Francs | null
  calcul: string
  marge: Francs | null
  controle: ControleGrille
  supplement: boolean
}
export interface PieceEntreprise {
  nature: string // « RCCM », « Autorisation de transport (MINT) »
  statut: 'verifiee' | 'en_verification' | 'expiree' | 'non_requise' | 'manquante'
  expireLe: Instant | null
  regle: string
}
export interface EntrepriseFiche extends EntrepriseCourte {
  dirigeant: string
  contrat: string
  acces: { noms: string[]; max: number }
  reglement: string // masqué : « MTN MoMo ···· 4 51 »
  etapes: Etape[]
  pieces: PieceEntreprise[]
  pilote: { debut: Instant; jour: number; duree: number; bilanLe: Instant; rapport: { jour: Instant; paquets: number; colis: number; acceptationMin: number | null; ramassageMin: number | null; sous5h: [number, number]; remuneration: Francs }[] } | null
  suspension: { motif: string; niveau: string; depuis: Instant; par: string; recours: string } | null
  grille: LigneGrille[]
  grilleVersion: string
  paquetsJour: number
  incidents: number
  retenues: number
}
export interface CouvertureZone {
  zone: CodeZone
  nom: string
  entreprises: { id: string; nom: string; capacite: number; active: boolean }[]
  actives: number
}
export interface PlacementQuartier {
  quartier: string
  zone: CodeZone | null
  alias: string | null
  demandes: number
}

// ── Livreurs (ADM-P19) ────────────────────────────────────────────────────────────────────────────────────────────
export type StatutLivreur = 'en_activation' | 'actif' | 'suspendu' | 'retire' | 'parti'
export interface LivreurCourt {
  id: string
  nom: string // « Serge A. »
  entreprise: string
  entrepriseId: string
  zones: CodeZone[]
  statut: StatutLivreur
  vehicule: { type: 'moto' | 'tricycle' | 'voiture'; plaque: string }
  trustScore: number | null
  palier: Palier | null
  missionsJour: number
  enMission: string | null // paquet en cours
  incidents30j: number
  pieceAlerte: { piece: string; expireLe: Instant } | null
  enPreavis: { depart: string; jusqua: Instant } | null
  reverification: Instant | null // fin du délai PHOTO-REVERIF-J
  suspension: { motif: string; depuis: Instant; jusqua: Instant | null; par: string } | null
}
export interface LivreurFiche extends LivreurCourt {
  certification: { modules: number; total: number; quiz: number | null; le: Instant | null }
  pieces: { nature: string; statut: 'verifiee' | 'en_revue' | 'manquante' }[]
  etiquettes: { plage: string; consommees: number; total: number } | null
  missions: { paquet: string; etat: string; detail: string }[]
  derniereSync: Instant | null
}
export type EtatDepart = 'en_preavis' | 'attente_constat' | 'echu' | 'clos'
export interface VersementDepart {
  du: Francs | null
  missions: number
  retenuLitiges: Francs
  litiges: number
  retenueKit: Francs
  kitDeCote: Francs
  verse: Francs | null
}
export interface Depart {
  id: string // « DP-0398 »
  livreurId: string
  livreur: string
  entreprise: string
  zones: CodeZone[]
  demandeLe: Instant
  motif: string
  preavisJusqua: Instant
  constatJusqua: Instant // fin du préavis + DEPART-KIT-CONSTAT-H
  etat: EtatDepart
  missionEnCours: boolean
  colisSousGarde: number
  kit: { constat: 'restitue' | 'incomplet' | null; manquants: string[]; retenue: Francs; constateLe: Instant | null }
  contestation: { le: Instant; motif: string; decision: 'retenue_maintenue' | 'retenue_annulee' | null; decideLe: Instant | null; par: string | null } | null
  clos: { le: Instant; par: 'entreprise' | 'admin'; kitNonConteste: boolean; versementLe: Instant } | null
  versement: VersementDepart
  source: 'jeu' | 'pont'
}
export interface ChangementIdentifiant {
  id: string // « CI-0012 »
  livreurId: string
  livreur: string
  entreprise: string
  zone: CodeZone
  nature: 'telephone' | 'appareil'
  ancien: string // masqué
  nouveau: string // masqué
  raison: string // dite par l'entreprise
  demandeLe: Instant
  controles: { listeNoire: boolean; doublon: boolean }
  etat: 'a_decider' | 'a_contresigner' | 'accepte' | 'refuse'
}

// ── Paquets (ADM-P20) ─────────────────────────────────────────────────────────────────────────────────────────────
export type EtatPaquet = 'constitution' | 'publie' | 'sans_preneur' | 'accepte' | 'en_route' | 'en_retard' | 'incident' | 'livre' | 'rendu' | 'retire'
export interface PaquetCourt {
  id: string // « PQ-Z1-261013-003 »
  zone: CodeZone
  genre: 'relais' | 'domicile' | 'retour'
  destination: string // relais ou quartier (jamais l'adresse du client : ADM-P22R-02)
  entreprise: string | null
  livreur: string | null
  colis: number
  valeurMax: Francs
  heureLimite: Instant
  publieLe: Instant | null
  etat: EtatPaquet
  margeMin: number // minutes avant l'heure limite (négatif : dépassée)
  paliersEligibles: Palier[]
  escalade: { elargi: Instant | null; priorite: Instant | null; prevenu: Instant | null }
}
export interface PaquetFiche extends PaquetCourt {
  arrets: { n: number; t: string; s: string; etat: 'fait' | 'en_cours' | 'a_venir' | 'mauvais'; depot: boolean }[]
  colisDetail: { etiquette: string; classe: Classe; vendeur: string; valeur: Francs; paiement: string; preuves: string }[]
  eligibles: { entreprise: string; palier: Palier; trustScore: number | null; rang: number | null; raison: string }[]
  chronologie: Moment[]
  argent: { relais: Francs; achat: Francs } | null // achat à l'entreprise (grille) et part du relais ; prix client : fiche de la commande
  grilleVersion: string
}

// ── Zones (ADM-P21) ───────────────────────────────────────────────────────────────────────────────────────────────
export type SanteZone = 'saine' | 'surveiller' | 'alerte' | 'vente'
export interface ZonePilotage {
  code: CodeZone
  nom: string
  exploitee: boolean
  commandes7j: number
  delaiMoyenMin: number | null
  taux5h: number | null // % sur 7 jours
  livres7j: [number, number] // dans le délai, livrés
  relais: { nom: string; taux: number; statut: StatutRelais }[]
  entreprisesActives: number
  vendeurs: number
  remplissageTournees: number | null
  litigesOuverts: number
  demandesNonServies: number
  composantes: { delai: number; remplissage: number; litiges: number; couverture: number } | null
  sante: number | null
  etat: SanteZone
  raisons: string[]
  plan: { le: Instant; par: string; motif: string; echeance: Instant } | null
  saison: { depuis: Instant; par: string } | null
  preparation: { t: string; ok: boolean }[]
  recherches: { q: string; n: number }[]
}

// ── Carte (ADM-P22) ───────────────────────────────────────────────────────────────────────────────────────────────
export interface PointCarte {
  id: string
  calque: 'relais' | 'boutiques' | 'entreprises' | 'livreurs' | 'paquets' | 'alertes'
  nom: string
  sous: string
  lat: number
  lng: number
  zone: CodeZone
  ton: Ton
  route: string // fiche complète
  params?: Record<string, string>
  horsConnexion?: Instant | null // livreur : dernière position connue
  livreurId?: string
  trajet?: [number, number][] // paquet : arrêts imposés (boutiques, relais ou quartier)
}

// ── Emballages (ADM-P23) ──────────────────────────────────────────────────────────────────────────────────────────
export type RefEmballage = 'S' | 'M' | 'L' | 'C1' | 'C2'
export interface StockEmballage {
  ref: RefEmballage
  format: string
  siege: number
  avance: number // avancé aux entreprises, non consommé
  total: number
  consoJour: number
  couvertureJ: number | null
  prevuPct: number
  reelPct: number
  aCommander: number // consommation × couverture cible − stock (0 au-dessus du seuil)
}
export interface EcartEntreprise {
  entrepriseId: string
  entreprise: string
  lignes: { ref: RefEmballage; remis: number; etiquettes: number; doitRester: number; compte: number; justifie: number }[]
  avancesMois: number
  nonJustifie: number
  ecartPct: number
  coutUnitaire: Francs
  facture: { le: Instant; montant: Francs } | null
  justificationDemandee: Instant | null
}
export interface PlageEtiquettes {
  id: string
  entreprise: string
  livreur: string
  plage: string // « BV 24 8130 – BV 24 8158 »
  total: number
  consommees: number
  prochaine: string
  etat: 'active' | 'invalidee'
}
export interface Emballages {
  stock: StockEmballage[]
  mouvements: { le: Instant; nature: string; quantites: string; piece: string | null }[]
  ecarts: EcartEntreprise[]
  plages: PlageEtiquettes[]
  avances: { entreprise: string; nonConsommes: number; remisLe: Instant | null }[]
  sansPlage: { livreurId: string; livreur: string; entreprise: string }[]
}

// ── Candidatures (page ajoutée) ───────────────────────────────────────────────────────────────────────────────────
export interface Candidature {
  id: string // « CAND-0031 »
  genre: 'entreprise' | 'relais'
  nom: string
  responsable: string
  zone: CodeZone
  zones: CodeZone[]
  deposeLe: Instant
  pieces: { nature: string; recue: boolean }[]
  controles: { rccm: 'ok' | 'invalide' | 'sans_objet'; niu: 'ok' | 'invalide' | 'sans_objet'; listeNoire: boolean; doublon: string | null }
  etat: 'nouvelle' | 'prise' | 'complement' | 'acceptee' | 'refusee'
  prisePar: string | null
  complement: { le: Instant; demande: string } | null
  issue: { le: Instant; par: string; motif: string } | null
  secondDansZone: boolean // relais : un relais ouvert existe déjà dans la zone (RELAIS-PAR-ZONE : décision Direction)
  /** Inscription reçue d'une autre application (pont : account.requested) : l'acteur dans l'application qui la reçoit. */
  origine?: { acteur: string; dossier: string } | null
}
/** Demande d'activation d'un livreur reçue de son application (pont : account.requested, espace livreur). */
export interface DossierLivreur {
  dossier: string
  acteur: string // identifiant dans l'espace livreur (« l-serge »)
  livreurId: string | null // fiche de la console qui lui correspond, s'il y en a une
  nom: string
  entreprise: string | null
  pieces: number // pièces reçues (CNI, selfie, permis)
  le: Instant
  etat: 'a_activer' | 'active'
}

// ── Gestes (décisions motivées, appliquées par la source) ─────────────────────────────────────────────────────────
export type ActionLogistique =
  | 'relais.basculer'
  | 'relais.attendre'
  | 'relais.transferer'
  | 'relais.relancer'
  | 'relais.activer'
  | 'relais.fin_convention'
  | 'relais.fermer'
  | 'relais.apurement'
  | 'entreprise.suspendre'
  | 'entreprise.lever'
  | 'entreprise.activer'
  | 'zone.placer'
  | 'livreur.suspendre'
  | 'livreur.retablir'
  | 'livreur.activer'
  | 'depart.clore'
  | 'kit.maintenir'
  | 'kit.annuler'
  | 'identifiant.accepter'
  | 'identifiant.refuser'
  | 'paquet.elargir'
  | 'paquet.priorite'
  | 'paquet.prevenir'
  | 'paquet.retirer'
  | 'zone.plan'
  | 'zone.saison'
  | 'emballage.commander'
  | 'emballage.facturer'
  | 'emballage.justifier'
  | 'etiquettes.attribuer'
  | 'etiquettes.invalider'
  | 'candidature.prendre'
  | 'candidature.completer'
  | 'candidature.accepter'
  | 'candidature.refuser'
/** Règle d'un geste : rôles qui le font, quatre yeux, second validateur, page où il s'exerce. */
export interface RegleGeste {
  roles: Role[]
  quatreYeux: boolean
  rolesSecond: Role[]
  route: string
}
export type RaisonRefus = 'role' | 'zone' | 'etat' | 'inconnu'

export interface DomaineLogistique {
  zones(): Promise<Zone[]>
  relais(): Promise<RelaisCourt[]>
  relaisFiche(id: string): Promise<RelaisFiche | null>
  entreprises(): Promise<EntrepriseCourte[]>
  entrepriseFiche(id: string): Promise<EntrepriseFiche | null>
  couverture(): Promise<CouvertureZone[]>
  placements(): Promise<PlacementQuartier[]>
  livreurs(): Promise<LivreurCourt[]>
  livreurFiche(id: string): Promise<LivreurFiche | null>
  departs(): Promise<Depart[]>
  changements(): Promise<ChangementIdentifiant[]>
  paquets(): Promise<PaquetCourt[]>
  paquetFiche(id: string): Promise<PaquetFiche | null>
  pilotage(): Promise<ZonePilotage[]>
  carte(): Promise<PointCarte[]>
  /** Consultation de la position d'un livreur en mission (journalisée, ADM-P22R-01/03). */
  consulterPosition(livreurId: string): Promise<Resultat<{ le: Instant }, 'hors_mission'>>
  emballages(): Promise<Emballages>
  candidatures(): Promise<Candidature[]>
  /** Demandes d'activation des livreurs reçues de leur application (pont). */
  dossiersLivreurs(): Promise<DossierLivreur[]>
  /** Le geste est-il permis à ce rôle, dans sa zone, dans cet état ? (le serveur refuse de même : 403 / 409). */
  verifier(action: ActionLogistique, objet: string): Promise<Resultat<{ regle: RegleGeste; detail: string | null }, RaisonRefus>>
  /** Suspend un livreur (décision motivée, journalisée) : publiée à l'entreprise et au livreur (pont). Jamais une affectation. */
  suspendreLivreur(id: string, motif: string, jusqua: Instant | null): Promise<{ ok: true } | { ok: false; raison: 'motif_court' }>
}
