// Domaine « accueil » : ce qu'il y a à faire, la plus urgente d'abord (GEN-07) ; quand il n'y a rien à faire, les
// chiffres (gagné avec BelivaY, prochain versement, une idée pour vendre plus). API : GET /seller/today (VD-02 p13).
// Les compteurs viennent des autres domaines (commandes, litiges, retours, produits) : jamais écrits.
import type { CalendrierBoutique } from '../../calculs/ouverture'
import type { ArticleVendu, ClasseColis, Francs, Instant, Jour, Livreur, Palier, ReferenceCommande } from '../communs'

export type ElementAFaire =
  | { type: 'preparer'; ref: ReferenceCommande; echeance: Instant; payeeA: Instant; payableAuRetrait: boolean; article: ArticleVendu; quantite: number; colis: ClasseColis; garde: Francs | null; livreur: Livreur; ramassage: { debut: Instant; fin: Instant }; calendrier: CalendrierBoutique }
  | { type: 'litige'; ref: ReferenceCommande; echeance: Instant; motif: string; gele: Francs | null; article: ArticleVendu }
  | { type: 'retour'; ref: ReferenceCommande; article: ArticleVendu; motif: string; arrivee: { jour: string; creneau: [string, string] }; gele: Francs | null; inspectionH: number }

export interface Aujourdhui {
  maintenant: Instant
  aFaire: ElementAFaire[] // triés : la plus urgente d'abord
  compteurs: { preparer: number; litiges: number; retours: number; total: number }
  // « Votre score approche de 65 » (propriétaire seulement) : points qui manquent, gain par vente de référence au palier
  // suivant (calculé), commandes livrées qui manquent.
  // masquee : « Masquer » touché cette semaine (une fois par seuil et par semaine) ; l'écran ne la montre pas.
  alerteScore: { sens: 'montee' | 'descente'; score: number; seuil: number; points: number; palier: Palier; gainParVente: Francs; titreReference: string; livrees: number; livreesCible: number; masquee: boolean } | null
  stockBas: { offreId: string; titre: string; dessin: string; stock: number; seuil: number }[]
  enAttenteEnvoi: number // actions gardées hors connexion (VD-02 p9)
}

// ── « Rien à faire » (accueil_calme ; ACC-10, ACC-11, ACC-12, ACC-13, ACC-20, VD04-R10, VD04-R11) ─────────────────
// Les chiffres n'apparaissent que quand la file est vide (l'écran le décide : compteurs.total === 0). argent : null
// pour l'accès Préparation (aucun montant). Un bloc qui n'a rien à dire est null (jamais de tuile vide).
export interface Calme {
  argent: {
    gagne: Francs // Σ gardé des ventes libérées depuis l'inscription (GET /money/earnings?scope=lifetime)
    liberationDuJour: { garde: Francs; ref: ReferenceCommande; a: Instant } | null // une libération qui tombe aujourd'hui
    prochainVersement: { vendredi: Jour; montant: Francs; deja: Francs; ceSoir: Francs; numero: string } | null // GET /payouts/next
    mois: { debut: Jour; garde: Francs; ventes: Francs; impayes: Francs; transport: Francs } | null // ventes libérées du mois
    progres: { palier: Palier; gainParVente: Francs; titre: string; points: number; commandes: number } | null // ACC-13
  } | null
  commandesDuMois: number // commandes reçues (payées ou validées) depuis le 1er du mois
  idee: { recherche: string; fois: number; jours: number } | null // recherche sans résultat de la zone (GET /demand?limit=1)
  meilleurProduit: { offreId: string; titre: string; ventes: number } | null // nombre de ventes, sans répéter un montant
}

// ── « Premier jour » (premier_jour ; ACC-14 à ACC-16, ACC-21, VD04-R12, VD04-R13 ; Q-81 ; DP-57 I-3) ─────────────
export type GestePremierJour = 'produits' | 'horaires' | 'numero'
export interface PremierJour {
  termine: boolean // dès la première commande reçue, ou les trois gestes faits (I-3)
  jour: number // jour depuis la signature du contrat (« jour 1 »)
  gestes: { cle: GestePremierJour; fait: boolean }[] // dans l'ordre ; le bouton plein va sur le premier non fait
  produitsEnLigne: number
  numero: string | null // numéro de versement masqué (propriétaire seulement)
  lancement: { palier: Palier; actifs: number; seuils: Record<'Argent' | 'Or' | 'Platine', number>; fin: Jour } | null // VD04-R12
  decouverte: { gainParVente: Francs | null; reference: string; prixReference: Francs | null; mois: number; commandes: number; fin: Jour | null; restantes: number; active: boolean }
  saisieAssisteeGratuite: boolean
}

// ── « Compte suspendu » (suspendu ; SUS-01 à SUS-03, VD04-R15 ; GET /account/status) ────────────────────────────
export interface Suspension {
  niveau: number // 3
  depuis: Instant
  motif: string // motif écrit
  decision: string // identifiant de la décision (domaine trust) : « Contester » mène à contester?d=…
  contestation: { envoyeeLe: Instant } | null // appeal_id : le bouton « Contester » disparaît
  reponseHeuresOuvrees: number // un humain répond par écrit sous 72 h ouvrées
  scoreGeleSous: number // 40
  controleProbatoire: number // commandes contrôlées à 100 % au retour (DP-57, L-1)
  preparerEnCours: number // commandes déjà reçues, toujours à préparer
  exemple: boolean // démonstration : exemple montré sur un compte qui n'est pas suspendu
}

// ── File hors connexion (horsligne ; OFF-01 à OFF-05, VD02-H02, VD02-H04, VD04-R14 ; Q-93) ────────────────────
// En file (72 h) : « C'est prêt », photo, stock, masquer, « Fermer aujourd'hui » (et rouvrir) — sans argent ni code.
// Hors file (attend le réseau) : numéro de versement, profil, réponse à un litige, publication d'une offre.
export type TypeAction = 'pret' | 'photo' | 'stock' | 'masquer' | 'fermer' | 'rouvrir'
export interface ActionEnFile {
  id: string
  type: TypeAction
  objet: string // référence de commande ou titre du produit
  detail: { offreId?: string; stock?: number } | null
  origine: Instant // heure d'origine, envoyée avec l'action (origin_time)
  lieu: string | null // lieu d'origine (origin_geo), en mots
  auteur: string // membre qui a fait le geste
  etat: 'en_attente' | 'expiree' | 'refusee'
  motif: string | null // refusée : la raison du serveur
}
export interface FileHorsLigne {
  actions: ActionEnFile[]
  heures: number // âge maximal d'une action (72 h)
  horsLigneDepuis: Instant | null // heure des données affichées (« Données de 09 h 14 »)
  dernierEnvoi: { a: Instant; envoyees: number; expirees: number; refusees: number } | null
}

export interface DomaineAccueil {
  aujourdhui(): Promise<Aujourdhui>
  /** « Masquer » l'alerte avant un seuil : rangée pour la semaine (une fois par seuil et par semaine). */
  masquerAlerte(): Promise<void>
  /** Chiffres de l'état « Rien à faire ». */
  calme(): Promise<Calme>
  /** Premier jour (GET /seller/onboarding). */
  premierJour(): Promise<PremierJour>
  /** Suspension en cours (GET /account/status), ou null. exemple : la démonstration montre un exemple. */
  suspension(o?: { exemple?: boolean }): Promise<Suspension | null>
  /** File d'actions gardées hors connexion. */
  file(): Promise<FileHorsLigne>
  /** Note le passage hors connexion (heure des données) ou le retour du réseau (null). */
  noterReseau(horsLigneDepuis: number | null): Promise<void>
  /** Met un geste en file, avec son heure et son lieu d'origine. */
  mettreEnFile(a: { type: TypeAction; objet: string; detail?: ActionEnFile['detail'] }): Promise<ActionEnFile>
  /** Au retour du réseau : rejoue la file dans l'ordre ; une action de plus de 72 h expire et ne part pas. */
  envoyerFile(): Promise<NonNullable<FileHorsLigne['dernierEnvoi']>>
  /** Retire une action de la file (annulée par le vendeur, ou expirée à refaire). */
  retirer(id: string): Promise<void>
}
