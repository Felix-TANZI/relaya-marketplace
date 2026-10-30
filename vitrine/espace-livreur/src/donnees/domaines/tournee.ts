// Domaine « tournee » (LIV-05 : LIV-P08 tournée, LIV-P09 navigation, LIV-P33 appel) : les paquets du jour enchaînés
// dans l'ordre des heures limites, leurs arrêts dans l'ORDRE IMPOSÉ (calculé par le système : le livreur n'inverse,
// ne saute et n'ajoute rien, LIV-P08R-01), l'arrêt en cours, la position (suivie seulement pendant la mission), les
// preuves photo (POST media, avant l'action qui les cite) et les APPELS MASQUÉS (DP-61 : jamais un numéro, ouverts
// pendant la mission, journalisés sans contenu pour l'administrateur).
// Ce que la tournée ne renvoie jamais : contenu, prix ou valeur d'un colis (seulement sa classe et le plafond de
// l'entreprise), identité ou numéro d'un client (domicile : prénom et quartier, position de remise seulement quand
// l'arrêt devient l'arrêt en cours, effacée après la remise), numéro d'un vendeur ou d'un gérant.
import type { ClasseColis, Francs, Instant, Origine, Resultat, TypeArret } from '../communs'

export type EtatArret = 'a_faire' | 'en_cours' | 'fait' | 'echec' | 'dissocie'
/** Arrêt en cours : en route (itinéraire), puis sur place (« Je suis arrivé » : position et heure enregistrées). */
export type PhaseArret = 'en_route' | 'sur_place'

export interface PointCarte {
  lat: number
  lng: number
}
/** Lieu d'un arrêt : point posé, rayon d'incertitude, repère écrit tel quel (jamais réécrit), Plus Code. */
export interface LieuArret extends PointCarte {
  precisionM: number
  repere: string | null
  plusCode: string | null
  posePar: 'vendeur' | 'client' | 'relais' | 'systeme'
}

export interface Arret {
  id: string
  ordre: number
  paquetId: string
  type: TypeArret
  nom: string // boutique, relais, ou prénom du client (domicile)
  quartier: string
  zone: string // « Z1 Centre-ville »
  avant: Instant // créneau annoncé (vendeur) ou heure prévue
  etat: EtatArret
  phase: PhaseArret | null // arrêt en cours seulement
  arriveeA: Instant | null
  colis: number
  classes: Partial<Record<ClasseColis, number>>
  pretDepuis: Instant | null // ramassage : « marqué prêt il y a … »
  lieu: LieuArret | null // domicile : null tant que l'arrêt n'est pas l'arrêt en cours, et après la remise
  /** Étape franchie sur place (ramassage : 1 arrivé, 2 contrôle, 3 emballage, 4 code ; remises : 1 à 3). */
  etape: number
}

export type NaturePaquet = 'relais' | 'domicile' | 'retour'
export interface PaquetTournee {
  id: string
  nature: NaturePaquet
  heureLimite: Instant // min(prêt le plus ancien + délai de zone ; fermeture du relais − marge)
  colisTotal: number
  etat: 'a_venir' | 'en_cours' | 'termine'
}

/** Incident bloquant en validation (entreprise, à défaut l'opérateur de zone) : la tournée attend. */
/** Texte français à trous (« {vendeur} »), mis en mots par l'écran dans la langue du livreur. */
export interface TexteServeur {
  texte: string
  valeurs: Record<string, string | number>
}
export interface IncidentTournee {
  id: string
  titre: string
  consequence: TexteServeur
  depuis: Instant
  arretId: string | null
}

export interface Tournee {
  id: string
  paquetId: string // paquet en cours
  paquets: PaquetTournee[]
  arrets: Arret[]
  enCours: string | null
  etat: 'en_cours' | 'bloquee' | 'terminee'
  incident: IncidentTournee | null
  /** Changement venu du serveur (arrêt dissocié, colis retiré, ordre recalculé) : annoncé par un bandeau. */
  modification: (TexteServeur & { quand: Instant }) | null
  colisSousGarde: number
  plafondColis: Francs // plafond de valeur par colis du palier de l'entreprise (jamais la valeur d'un colis)
  entreprise: string
  telechargeeA: Instant // paquet hors connexion (arrêts, repères, trajets, empreintes des codes)
  trajet: PointCarte[] // trajet précalculé (OSRM) de toute la tournée
  /** Zones de la tournée (contour servi avec le paquet hors connexion) : tracées sur la carte ; absent : pas de contour. */
  zones?: { nom: string; contour: PointCarte[] }[]
  position: PointCarte & { precisionM: number } // dernière position de mission connue du serveur
  jour: { paquetsTermines: number; colisRemis: number }
}

/** Itinéraire de l'arrêt en cours : durée et distance du tronçon (OSRM), heure d'arrivée = maintenant + durée. */
export interface Itineraire {
  arretId: string
  distanceM: number
  dureeS: number
  trajet: PointCarte[]
}

/** Paramètres de la tournée (registre ; en production GET /config, téléchargés avec la tournée). */
export interface ReglesLivreur {
  codeLongueur: number
  codeEssais: number
  codeBlocageH: number
  resteAmbreMin: number
  resteRougeMin: number
  attenteVendeurMin: number
  ecartArriveeM: number
  ecartRemiseM: number
  noteMin: number // note d'un refus, d'un signalement, d'une boutique fermée
  depotConfirmMin: number
  absentAttenteMin: number
  absentAppels: number
  absentIntervalleMin: number
  positionClienteEffaceeMin: number
  inspectionRetourH: number
  collecteAlerteH: number
  routeCoupeeH: number
  auditMaxMin: number
  controleS: [number, number]
  photoMaxKo: number
  netteteSeuil: number
  plafondColis: Francs
  delaiZoneH: number
  placesParClasse: Partial<Record<ClasseColis, number>>
}

/** Preuve photo envoyée avant l'action qui la cite (POST /api/courier/media) : empreinte, heure et position d'origine. */
export interface PreuvePhoto {
  nature: string // « photo1 », « photo2 », « devanture », « lieu », « remise », « constat », « scelle »…
  objet: string // colis ou arrêt
  octets: number
  empreinte: string
  nette: boolean
}

// ---------- Appels masqués (LIV-P33, DP-61) ----------

export type Correspondant = 'client' | 'vendeur' | 'relais' | 'entreprise' | 'support'
export type ModeAppel = 'application' | 'rappel' | 'sms' | 'whatsapp'
/** Qui le livreur peut joindre maintenant : seulement les parties de l'arrêt en cours, son entreprise et le support. */
export interface Joignable {
  correspondant: Correspondant
  nom: string // « Maison Ngono », « Solange · Bastos », « Yafé Express · répartition »
  arretId: string | null
  ouvert: boolean
}
export interface Appel {
  id: string
  correspondant: Correspondant
  nom: string
  arretId: string | null
  mode: ModeAppel
  debut: Instant
  fin: Instant | null
  modele: string | null // message masqué : modèle choisi (texte fixe, jamais un numéro)
}

export interface DomaineTournee {
  courante(): Promise<Tournee | null>
  regles(): Promise<ReglesLivreur>
  itineraire(arretId: string): Promise<Itineraire | null>
  /** « Je suis arrivé » : refusé hors de l'arrêt en cours (409 ORDER_IMPOSED) ; écart > seuil : confirmation demandée. */
  arriver(arretId: string, origine: Origine, confirme?: boolean): Promise<Resultat<{ route: string }, 'ordre_impose' | 'ecart_position' | 'colis_manquants'> & { ecartM?: number }>
  /** Route coupée : visible des livreurs de la zone pendant ROUTE-COUPEE-H, remontée en console (POST road-reports). */
  signalerRoute(note: string, origine: Origine): Promise<Resultat<{ jusqua: Instant }, 'note_trop_courte'>>
  deposerPreuve(p: PreuvePhoto, origine: Origine): Promise<Resultat<{ id: string }, 'floue' | 'trop_lourde'>>
  joignables(): Promise<Joignable[]>
  appels(): Promise<Appel[]>
  appeler(correspondant: Correspondant, mode: ModeAppel, origine: Origine, modele?: string): Promise<Resultat<{ appel: Appel }, 'hors_mission'>>
  raccrocher(appelId: string, origine: Origine): Promise<Resultat>
  /** « Faire cet arrêt d'abord » (terrain : embouteillage) : l'arrêt passe en cours, l'entreprise est prévenue. Refusé
   * si c'est un dépôt dont le ramassage n'est pas fait (`avant` : le lieu à faire d'abord), ou si l'arrêt en cours est
   * déjà commencé sur place. Jamais sauter un arrêt : il reste dans la tournée, juste après. */
  prioriser(arretId: string, origine: Origine): Promise<Resultat<{ ordre: string[] }, 'ramassage_avant' | 'sur_place' | 'deja_en_cours' | 'termine'> & { avant?: string }>
  /** « Retard prévu » (pluie forte, panne légère) : la nouvelle heure part au client (domicile) ou au vendeur et à
   * l'entreprise ; aucun texte libre. */
  annoncerRetard(arretId: string, minutes: number, origine: Origine): Promise<Resultat<{ arriveeEstimee: Instant }, 'hors_mission'>>
  /** DÉMONSTRATION seulement (absent de la source API) : l'entreprise valide l'incident en cours. */
  simulerValidationIncident?(): Promise<void>
}
