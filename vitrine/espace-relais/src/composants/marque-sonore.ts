// Marque sonore BelivaY : la même famille de sons dans les six applications (client, vendeur, entreprise, livreur,
// relais, console d'administration), synthétisée avec la Web Audio API, sans aucun fichier audio. Tableau des actions et de leurs sons :
// logique-metier/SONS.md.
// Ce fichier est LE MÊME, octet pour octet, dans les six applications (src/composants/marque-sonore.ts ; test :
// espace-relais/src/composants/marque-sonore.test.ts) ; seul src/composants/marque-sonore-app.ts (« APPLI ») diffère.
// Dans les espaces, le code du client réutilisé (Sons.ts, ApercuSons.tsx…) reçoit la copie de l'espace (vite.config.ts,
// REDIRECTIONS) : une seule marque sonore, un seul état, par application.
// Identité commune : sinus doux, attaque courte, extinction naturelle, une pointe de « verre » (partiel inharmonique
// 2,76) ; gammes de do majeur. Chaque intention a sa forme (montée, chute, répétition, cloche, pièces…) ; chaque
// application a sa couleur : la même famille transposée (COULEURS), pour reconnaître qui sonne quand plusieurs
// téléphones sont posés côte à côte.
// Règles :
// - aucun son au chargement : le contexte audio naît au premier geste (règle des navigateurs), avant, rien ne sonne ;
// - aucun son ni vibration sous navigateur piloté (navigator.webdriver) ; mode « enregistrement » pour les tests
//   (window.__BLV_SONS__ = 'enregistrer') : rien ne joue, chaque son demandé est noté dans window.__blvSons (retenu ou
//   tu par la file) ;
// - réglages « Sons » et « Vibrations » de chaque application (reglerSons, reglerVibrations) ; heures calmes
//   (reglerCalme) : les sons discrets (et ceux que l'application ajoute) se taisent ;
// - pas de double : un son déclenché par un autre dans les 350 ms se tait s'il n'est pas plus important ; le même son
//   ne se répète pas en rafale ; pas de chevauchement : une file courte (au plus 0,9 s d'attente), sinon il se tait ;
// - courts (moins de 600 ms, sauf les alertes), volume maîtrisé (gain, filtre doux, compresseur).
import { APPLI } from './marque-sonore-app'

export type Appli = 'client' | 'vendeur' | 'entreprise' | 'livreur' | 'relais' | 'admin'
export type Intention = 'leger' | 'discret' | 'reussite' | 'securite' | 'argent' | 'arrivee' | 'alerte' | 'erreur'
type Texte = { fr: string; en: string }

/** Les intentions, de la plus discrète à la plus importante (priorité : qui l'emporte quand deux sons se suivent). */
export const INTENTIONS: Record<Intention, Texte & { priorite: number; detail: Texte }> = {
  leger: { fr: 'Action légère', en: 'Light action', priorite: 1, detail: { fr: 'un tic bref, à peine audible', en: 'a brief tick' } },
  discret: { fr: 'Notification discrète', en: 'Quiet notification', priorite: 2, detail: { fr: 'deux notes cristallines', en: 'two crystal notes' } },
  reussite: { fr: 'Réussite', en: 'Success', priorite: 3, detail: { fr: 'des notes qui montent', en: 'rising notes' } },
  securite: { fr: 'Sécurité, code', en: 'Security, code', priorite: 3, detail: { fr: 'un déclic et un scintillement', en: 'a click and a sparkle' } },
  argent: { fr: 'Réussite importante (argent)', en: 'Big success (money)', priorite: 4, detail: { fr: 'un accord arpégé, des pièces', en: 'an arpeggio, coins' } },
  arrivee: { fr: 'Nouveauté, arrivée', en: 'Something new', priorite: 4, detail: { fr: 'un appel en cloche', en: 'a bell-like call' } },
  alerte: { fr: 'Alerte', en: 'Alert', priorite: 5, detail: { fr: 'des notes répétées, nettes', en: 'repeated clear notes' } },
  erreur: { fr: 'Erreur', en: 'Error', priorite: 6, detail: { fr: 'deux notes graves qui descendent', en: 'two low falling notes' } },
}

interface Note {
  f: number // fréquence (Hz) ; pour un souffle : fréquence de coupure du filtre
  a?: number // décalage (s)
  d?: number // durée d'extinction (s)
  g?: number // gain relatif (0 à 1)
  vers?: number // glissando : fréquence d'arrivée
  glisse?: number // durée du glissando (s)
  forme?: OscillatorType
  verre?: number // gain du partiel « verre » (rapport 2,76), 0 : aucun
  attaque?: number // durée de l'attaque (s), 8 ms par défaut
  souffle?: boolean // bruit filtré (déclic, obturateur, « tchink » des pièces) au lieu d'une note
}
interface DefSon {
  intention: Intention
  notes: Note[]
  vibration: number[] // motif (ms) au téléphone
  urgent?: boolean // passe devant tout (SOS, incident grave)
}

// Une pièce qui tinte : partiels d'une plaque mince (1 ; 1,59 ; 2,14 ; 2,65 ; 3,16), puis un souffle bref.
const piece = (a: number, f: number, g: number): Note[] => [
  ...(
    [
      [1, 1, 0.22],
      [1.59, 0.7, 0.16],
      [2.14, 0.5, 0.12],
      [2.65, 0.35, 0.09],
      [3.16, 0.25, 0.07],
    ] as const
  ).map(([r, gr, d]) => ({ f: f * r, a, d, g: g * gr, attaque: 0.002 })),
  { f: 5200, a, d: 0.03, g: g * 0.45, souffle: true },
]

// Les sons de la famille (fréquences de base, celles du client). Les sons déjà validés sont gardés tels quels (notes,
// gains, vibrations) : ceux du client (panier, paiement, notification, erreur, favori, favoriRetire, message → envoi,
// copie, interrupteur, retrait → remise, fin, code) et les pièces du vendeur (commande) ; les autres les complètent. Do majeur : C5 523, E5 659, G5 784, C6 1047,
// E6 1319, G6 1568.
export const SONS = {
  // ── Action légère ──
  // Ajout au panier : « pop » qui chute, puis petit glissando montant.
  panier: { intention: 'leger', vibration: [12], notes: [
    { f: 620, vers: 260, glisse: 0.05, d: 0.08, g: 0.7 },
    { f: 660, vers: 990, glisse: 0.12, a: 0.06, d: 0.2, g: 0.35, verre: 0.15 },
  ] },
  favori: { intention: 'leger', vibration: [10], notes: [{ f: 784, vers: 1175, glisse: 0.09, d: 0.22, g: 0.4, verre: 0.2 }] },
  favoriRetire: { intention: 'leger', vibration: [6], notes: [{ f: 700, vers: 520, glisse: 0.07, d: 0.12, g: 0.25 }] },
  copie: { intention: 'leger', vibration: [8], notes: [
    { f: 1568, d: 0.06, g: 0.25 },
    { f: 2093, a: 0.04, d: 0.08, g: 0.22 },
  ] },
  interrupteur: { intention: 'leger', vibration: [6], notes: [{ f: 1200, vers: 900, glisse: 0.02, d: 0.045, g: 0.28 }] },
  // Message envoyé : petit « envol » montant.
  envoi: { intention: 'leger', vibration: [10], notes: [
    { f: 520, vers: 980, glisse: 0.12, d: 0.17, g: 0.32 },
    { f: 1319, a: 0.1, d: 0.1, g: 0.18, verre: 0.2 },
  ] },
  // Photo prise : obturateur (deux souffles) et un reflet.
  photo: { intention: 'leger', vibration: [15], notes: [
    { f: 1800, d: 0.035, g: 0.55, souffle: true },
    { f: 1400, a: 0.065, d: 0.05, g: 0.45, souffle: true },
    { f: 1760, a: 0.07, d: 0.07, g: 0.12 },
  ] },
  // Annulé (geste repris dans les 5 s) : deux notes qui redescendent.
  annule: { intention: 'leger', vibration: [8, 40, 8], notes: [
    { f: 784, d: 0.08, g: 0.28 },
    { f: 587, a: 0.07, d: 0.14, g: 0.26 },
  ] },
  // ── Notification discrète ──
  notification: { intention: 'discret', vibration: [14, 60, 14], notes: [
    { f: 1175, d: 0.24, g: 0.38, verre: 0.3 },
    { f: 1568, a: 0.11, d: 0.26, g: 0.34, verre: 0.3 },
  ] },
  // Message reçu : « tou-tic », une note puis une plus haute, brèves.
  messageRecu: { intention: 'discret', vibration: [40, 80, 40], notes: [
    { f: 880, d: 0.07, g: 0.3 },
    { f: 1175, a: 0.09, d: 0.13, g: 0.3, verre: 0.15 },
  ] },
  // ── Réussite ──
  // Geste réussi : une quarte qui monte (sol → do).
  valide: { intention: 'reussite', vibration: [20, 50, 20], notes: [
    { f: 784, d: 0.16, g: 0.38, verre: 0.12 },
    { f: 1047, a: 0.08, d: 0.24, g: 0.4, verre: 0.18 },
  ] },
  // Scan accepté : un « bip » clair à l'octave, très court (un scan après l'autre).
  scan: { intention: 'reussite', vibration: [25], notes: [
    { f: 1319, d: 0.12, g: 0.42, verre: 0.25 },
    { f: 659, d: 0.1, g: 0.2 },
  ] },
  // Remise réussie (le colis change de mains) : deux accords, sixte puis octave, éclat de verre.
  remise: { intention: 'reussite', vibration: [18, 40, 18, 40, 30], notes: [
    { f: 784, d: 0.18, g: 0.32, verre: 0.15 },
    { f: 988, d: 0.18, g: 0.28, verre: 0.15 },
    { f: 1047, a: 0.12, d: 0.26, g: 0.34, verre: 0.25 },
    { f: 1319, a: 0.12, d: 0.26, g: 0.3, verre: 0.25 },
  ] },
  // ── Sécurité, code ──
  // Code affiché ou reçu : scintillement léger.
  code: { intention: 'securite', vibration: [10], notes: [
    { f: 1047, d: 0.12, g: 0.22, verre: 0.2 },
    { f: 1319, a: 0.04, d: 0.12, g: 0.22, verre: 0.2 },
    { f: 1568, a: 0.08, d: 0.16, g: 0.22, verre: 0.25 },
  ] },
  // Code juste : un déclic (serrure) puis une quinte qui s'ouvre.
  deverrouille: { intention: 'securite', vibration: [20, 30, 40], notes: [
    { f: 4000, d: 0.02, g: 0.35, souffle: true },
    { f: 1047, a: 0.03, d: 0.14, g: 0.34, verre: 0.2 },
    { f: 1568, a: 0.1, d: 0.26, g: 0.32, verre: 0.3 },
  ] },
  // ── Réussite importante (argent) ──
  // Paiement accepté, encaissement : accord ascendant joyeux, arpégé (do mi sol do).
  paiement: { intention: 'argent', vibration: [18, 40, 28], notes: [
    { f: 523, d: 0.26, g: 0.42, verre: 0.1 },
    { f: 659, a: 0.055, d: 0.26, g: 0.42, verre: 0.1 },
    { f: 784, a: 0.11, d: 0.26, g: 0.42, verre: 0.12 },
    { f: 1047, a: 0.165, d: 0.22, g: 0.38, verre: 0.15 },
  ] },
  // Versement reçu : deux pièces, puis l'arpège qui monte (sol do mi).
  versement: { intention: 'argent', vibration: [20, 40, 20, 40, 60], notes: [
    ...piece(0, 2350, 0.4),
    ...piece(0.06, 2790, 0.3),
    { f: 784, a: 0.13, d: 0.2, g: 0.36, verre: 0.12 },
    { f: 1047, a: 0.19, d: 0.2, g: 0.36, verre: 0.15 },
    { f: 1319, a: 0.25, d: 0.3, g: 0.36, verre: 0.2 },
  ] },
  // ── Nouveauté, arrivée ──
  // Nouvelle commande (vendeur) : des pièces qui s'entrechoquent, le son déjà validé de l'espace vendeur, tel quel ;
  // le plus marquant.
  commande: { intention: 'arrivee', vibration: [60, 80, 60, 80, 160], notes: [...piece(0, 2350, 0.55), ...piece(0.075, 2790, 0.42), ...piece(0.16, 2510, 0.32)] },
  // Nouveau paquet, nouvelle mission : un appel qui monte, plus lent que le paiement, fini sur un accord.
  nouveau: { intention: 'arrivee', vibration: [200, 100, 200], notes: [
    { f: 784, d: 0.14, g: 0.4, verre: 0.15 },
    { f: 1047, a: 0.12, d: 0.14, g: 0.4, verre: 0.15 },
    { f: 1319, a: 0.24, d: 0.3, g: 0.42, verre: 0.2 },
    { f: 1568, a: 0.24, d: 0.3, g: 0.2, verre: 0.2 },
  ] },
  // Quelqu'un approche (livreur en route, client attendu) : « ding-dong », tierce descendante.
  approche: { intention: 'arrivee', vibration: [120, 120, 120], notes: [
    { f: 1319, d: 0.3, g: 0.38, verre: 0.3 },
    { f: 1047, a: 0.2, d: 0.36, g: 0.36, verre: 0.3 },
  ] },
  // Colis arrivé (au relais, à l'arrêt) : « bloup » qui monte d'une octave, puis une cloche.
  colis: { intention: 'arrivee', vibration: [80, 60, 120], notes: [
    { f: 523, vers: 1047, glisse: 0.1, d: 0.16, g: 0.3 },
    { f: 1568, a: 0.14, d: 0.3, g: 0.32, verre: 0.35 },
  ] },
  // ── Alerte ──
  // À surveiller (retard, capacité, hors connexion, incident) : trois notes égales, nettes, sans aigu.
  attention: { intention: 'alerte', vibration: [80, 80, 80, 80, 80], notes: [
    { f: 880, d: 0.1, g: 0.36, forme: 'triangle' },
    { f: 880, a: 0.14, d: 0.1, g: 0.36, forme: 'triangle' },
    { f: 880, a: 0.28, d: 0.12, g: 0.36, forme: 'triangle' },
  ] },
  // Délai écoulé : deux tics égaux, puis une note plus basse.
  fin: { intention: 'alerte', vibration: [25, 60, 25], notes: [
    { f: 988, d: 0.07, g: 0.3 },
    { f: 988, a: 0.1, d: 0.07, g: 0.3 },
    { f: 740, a: 0.2, d: 0.17, g: 0.34, verre: 0.1 },
  ] },
  // Alerte grave (SOS, incident de sécurité) : deux tons alternés, médium, triangle filtré ; net, jamais strident.
  urgence: { intention: 'alerte', urgent: true, vibration: [400, 150, 400, 150, 400], notes: [0, 1, 2, 3, 4, 5].map((i) => ({ f: i % 2 ? 587 : 784, a: i * 0.15, d: 0.14, g: 0.42, forme: 'triangle' as const })) },
  // ── Erreur ──
  // Erreur : deux notes descendantes, graves et discrètes.
  erreur: { intention: 'erreur', vibration: [60, 50, 60], notes: [
    { f: 330, d: 0.16, g: 0.45, forme: 'triangle' },
    { f: 247, a: 0.13, d: 0.22, g: 0.45, forme: 'triangle' },
  ] },
  // Refusé (code faux, scan refusé) : deux notes basses identiques, sèches.
  refus: { intention: 'erreur', vibration: [120, 60, 40, 60, 120], notes: [
    { f: 233, d: 0.09, g: 0.5, forme: 'triangle' },
    { f: 233, a: 0.12, d: 0.14, g: 0.5, forme: 'triangle' },
  ] },
} satisfies Record<string, DefSon>

export type NomSon = keyof typeof SONS
const def = (s: NomSon): DefSon => SONS[s]

/** Durée d'un son (s), extinction comprise. */
export const duree = (s: NomSon) => Math.max(...def(s).notes.map((n) => (n.a ?? 0) + (n.d ?? 0.2)))

/** Couleur de chaque application : la famille transposée (demi-tons). */
export const COULEURS: Record<Appli, number> = { client: 0, vendeur: 2, relais: 4, livreur: 7, entreprise: -3, admin: -5 }

// Actions et leur son. Communes aux six applications, puis propres à chacune (nom affiché dans l'aperçu).
type Catalogue = Record<string, Texte & { son: NomSon }>
const COMMUNES = {
  valide: { son: 'valide', fr: 'Geste réussi', en: 'Action done' },
  erreur: { son: 'erreur', fr: 'Erreur, refus du serveur', en: 'Error' },
  codeFaux: { son: 'refus', fr: 'Code faux', en: 'Wrong code' },
  codeValide: { son: 'deverrouille', fr: 'Code juste', en: 'Code accepted' },
  code: { son: 'code', fr: 'Code affiché ou reçu', en: 'Code shown or received' },
  notification: { son: 'notification', fr: 'Notification reçue', en: 'Notification' },
  messageRecu: { son: 'messageRecu', fr: 'Message reçu', en: 'Message received' },
  envoi: { son: 'envoi', fr: 'Message envoyé', en: 'Message sent' },
  attention: { son: 'attention', fr: 'Alerte à surveiller', en: 'Warning' },
  fin: { son: 'fin', fr: 'Délai écoulé', en: 'Time is up' },
  photo: { son: 'photo', fr: 'Photo prise', en: 'Photo taken' },
  copie: { son: 'copie', fr: 'Code ou lien copié', en: 'Copied' },
  annule: { son: 'annule', fr: 'Geste annulé', en: 'Undone' },
  scan: { son: 'scan', fr: 'Code ou étiquette scannés', en: 'Code scanned' },
  interrupteur: { son: 'interrupteur', fr: 'Interrupteur', en: 'Switch' },
} satisfies Catalogue

export const ACTIONS = {
  client: {
    ...COMMUNES,
    panier: { son: 'panier', fr: 'Ajout au panier', en: 'Added to cart' },
    favori: { son: 'favori', fr: 'Ajouté aux favoris', en: 'Added to favourites' },
    favoriRetire: { son: 'favoriRetire', fr: 'Retiré des favoris', en: 'Removed from favourites' },
    paiement: { son: 'paiement', fr: 'Paiement accepté, commande confirmée', en: 'Payment accepted' },
    message: { son: 'envoi', fr: 'Message envoyé', en: 'Message sent' },
    retrait: { son: 'remise', fr: 'Retrait au comptoir réussi', en: 'Parcel collected' },
    colisAuRelais: { son: 'colis', fr: 'Colis arrivé au relais', en: 'Parcel at the pickup point' },
    livreurEnApproche: { son: 'approche', fr: 'Livreur en approche', en: 'Courier on the way' },
  },
  vendeur: {
    ...COMMUNES,
    nouvelleCommande: { son: 'commande', fr: 'Nouvelle commande', en: 'New order' },
    commandeEnRetard: { son: 'attention', fr: 'Commande à préparer en retard, litige', en: 'Late order, dispute' },
    cestPret: { son: 'valide', fr: '« C’est prêt » validé', en: '“Ready” confirmed' },
    remiseLivreur: { son: 'remise', fr: 'Colis remis au livreur', en: 'Parcel handed to the courier' },
    versementRecu: { son: 'versement', fr: 'Versement reçu', en: 'Payout received' },
    avisRecu: { son: 'notification', fr: 'Avis reçu', en: 'Review received' },
  },
  entreprise: {
    ...COMMUNES,
    nouveauPaquet: { son: 'nouveau', fr: 'Nouveau paquet à accepter', en: 'New batch to accept' },
    paquetAccepte: { son: 'valide', fr: 'Paquet accepté', en: 'Batch accepted' },
    paquetAffecte: { son: 'remise', fr: 'Paquet affecté à un livreur', en: 'Batch assigned' },
    transfert: { son: 'envoi', fr: 'Paquet transféré', en: 'Batch transferred' },
    incident: { son: 'attention', fr: 'Incident signalé, seuil bas', en: 'Incident reported' },
    incidentSecurite: { son: 'urgence', fr: 'Incident de sécurité', en: 'Safety incident' },
    livreurHorsConnexion: { son: 'attention', fr: 'Livreur hors connexion', en: 'Courier offline' },
    versementFait: { son: 'paiement', fr: 'Versement fait', en: 'Payout made' },
  },
  livreur: {
    ...COMMUNES,
    nouveauPaquet: { son: 'nouveau', fr: 'Nouveau paquet affecté', en: 'New batch assigned' },
    arriveeArret: { son: 'colis', fr: 'Arrivée à un arrêt', en: 'Arrived at a stop' },
    remiseReussie: { son: 'remise', fr: 'Remise réussie', en: 'Delivery done' },
    depart: { son: 'valide', fr: 'Tournée démarrée', en: 'Round started' },
    sos: { son: 'urgence', fr: 'SOS déclenché', en: 'SOS sent' },
    incident: { son: 'attention', fr: 'Incident signalé, écart de position', en: 'Incident reported' },
  },
  relais: {
    ...COMMUNES,
    livreurEnApproche: { son: 'approche', fr: 'Livreur en approche avec un lot', en: 'Courier on the way with a batch' },
    colisRecu: { son: 'scan', fr: 'Colis reçu (scan accepté)', en: 'Parcel received (scan OK)' },
    scanRefuse: { son: 'refus', fr: 'Scan refusé', en: 'Scan refused' },
    lotValide: { son: 'remise', fr: 'Lot validé : la garde passe au relais', en: 'Batch accepted' },
    remiseReussie: { son: 'remise', fr: 'Remise au client réussie', en: 'Parcel handed to the customer' },
    encaissement: { son: 'paiement', fr: 'Encaissement, paiement confirmé', en: 'Cash or payment received' },
    alerteCapacite: { son: 'attention', fr: 'Colis en trop, alerte capacité', en: 'Extra parcel, capacity alert' },
  },
  admin: {
    ...COMMUNES,
    nouvelleCarte: { son: 'nouveau', fr: 'Nouvelle carte dans la file', en: 'New card in the queue' },
    litigeOuvert: { son: 'colis', fr: 'Litige à arbitrer', en: 'Dispute to arbitrate' },
    decision: { son: 'valide', fr: 'Décision enregistrée', en: 'Decision recorded' },
    compteActive: { son: 'remise', fr: 'Compte activé', en: 'Account activated' },
    contreseing: { son: 'deverrouille', fr: 'Décision contresignée (quatre yeux)', en: 'Decision countersigned' },
    versementsLances: { son: 'versement', fr: 'Versements du vendredi lancés', en: 'Friday payouts sent' },
    remboursement: { son: 'paiement', fr: 'Remboursement exécuté', en: 'Refund sent' },
    alerteFraude: { son: 'attention', fr: 'Alerte de fraude, retard dans la file', en: 'Fraud alert, late card' },
    panne: { son: 'urgence', fr: 'Panne déclarée', en: 'Outage declared' },
  },
} satisfies Record<Appli, Catalogue>

export type Action = keyof (typeof ACTIONS)[typeof APPLI] & string
const catalogue = (): Catalogue => ACTIONS[APPLI as Appli]

// ── Réglages ──
const PREFIXES: Record<Appli, string> = { client: 'blv_c', vendeur: 'blv_v', entreprise: 'blv_e', livreur: 'blv_l', relais: 'blv_r', admin: 'blv_a' }
const lit = (cle: string) => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(cle)
  } catch {
    return null
  }
}
let sonsOn = lit(PREFIXES[APPLI as Appli] + '_sons') !== 'non'
let vibrationsOn = lit(PREFIXES[APPLI as Appli] + '_vibr') !== 'non'
let calme: () => boolean = () => false
let muettes: Intention[] = ['discret']
export const reglerSons = (on: boolean) => void (sonsOn = on)
export const reglerVibrations = (on: boolean) => void (vibrationsOn = on)
/** Heures calmes : tant que estCalme() dit oui, les intentions muettes (par défaut : discret) se taisent. */
export function reglerCalme(estCalme: (() => boolean) | null, intentions: Intention[] = ['discret']) {
  calme = estCalme ?? (() => false)
  muettes = intentions
}

// ── Mode enregistrement (tests) ──
export interface Trace {
  appli: Appli
  action: string
  son: NomSon
  intention: Intention
  retenu: boolean // faux : tu par la file (double, rafale, attente trop longue)
}
type FenetreSons = Window & { __BLV_SONS__?: string; __blvSons?: Trace[]; AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
const fenetre = () => (typeof window === 'undefined' ? null : (window as FenetreSons))
const enregistre = () => fenetre()?.__BLV_SONS__ === 'enregistrer'
const robot = () => typeof navigator !== 'undefined' && !!navigator.webdriver
/** Sons demandés depuis l'ouverture (mode enregistrement). */
export const journal = (): Trace[] => fenetre()?.__blvSons ?? []

// ── File : pas de double, pas de chevauchement ──
const CASCADE_MS = 350 // un son déclenché par un autre
const FILE_MAX_MS = 900 // attente au plus
let horloge = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
/** Tests : horloge fixée à la main. */
export const reglerHorloge = (h: (() => number) | null) => {
  horloge = h ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()))
  dernier = null
  libreA = 0
}
let dernier: { son: NomSon; priorite: number; t: number } | null = null
let libreA = 0
const priorite = (s: NomSon) => (def(s).urgent ? 9 : INTENTIONS[def(s).intention].priorite)
// Le même son en rafale : un scan après l'autre passe (150 ms), une annonce ne se répète pas avant 1,5 s.
const rafale = (s: NomSon) => (['arrivee', 'discret', 'alerte'].includes(def(s).intention) ? 1500 : 150)

/** Attente (ms) avant de jouer, ou null : le son se tait. */
function placer(s: NomSon, forcer: boolean): number | null {
  const t = horloge()
  const d = duree(s) * 1000 + 40
  if (forcer) {
    dernier = { son: s, priorite: priorite(s), t }
    libreA = t + d
    return 0
  }
  const p = priorite(s)
  if (dernier) {
    if (dernier.son === s && t - dernier.t < rafale(s)) return null
    if (t - dernier.t < CASCADE_MS && p <= dernier.priorite) return null
  }
  const attente = Math.max(0, libreA - t)
  if (attente > FILE_MAX_MS && !def(s).urgent) return null
  dernier = { son: s, priorite: p, t }
  libreA = t + attente + d
  return attente
}

// ── Synthèse ──
const VOLUME = 0.2 // volume général (0 à 1), sous le filtre et le compresseur
let ctx: AudioContext | null = null
let sortie: AudioNode | null = null

function contexte(): AudioContext | null {
  if (ctx) return ctx
  const w = fenetre()
  const C = w?.AudioContext ?? w?.webkitAudioContext
  if (!C) return null
  let c: AudioContext
  try {
    c = new C()
  } catch {
    return null
  }
  ctx = c
  const g = c.createGain()
  g.gain.value = VOLUME
  const filtre = c.createBiquadFilter()
  filtre.type = 'lowpass'
  filtre.frequency.value = 7000
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 4
  g.connect(filtre).connect(comp).connect(c.destination)
  sortie = g
  return c
}

// Premier geste : le contexte naît (ou reprend) dans le geste, comme l'exigent Safari et Chrome.
function deverrouiller() {
  if (!sonsOn || robot() || enregistre()) return
  const c = contexte()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  // Safari (iOS) : un échantillon muet joué dans le geste ouvre la sortie.
  const b = c.createBuffer(1, 1, 22050)
  const s = c.createBufferSource()
  s.buffer = b
  s.connect(c.destination)
  s.start(0)
}

function note(c: AudioContext, t0: number, n: Note, k: number) {
  const debut = t0 + (n.a ?? 0)
  const d = n.d ?? 0.2
  const gain = n.g ?? 0.6
  const att = n.attaque ?? 0.008
  if (n.souffle) {
    const len = Math.max(1, Math.floor(c.sampleRate * d))
    const b = c.createBuffer(1, len, c.sampleRate)
    const x = b.getChannelData(0)
    for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const s = c.createBufferSource()
    s.buffer = b
    const f = c.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = n.f
    const e = c.createGain()
    e.gain.setValueAtTime(gain, debut)
    e.gain.exponentialRampToValueAtTime(0.0001, debut + d)
    s.connect(f).connect(e).connect(sortie!)
    s.start(debut)
    return
  }
  const partiels: [number, number, number][] = [[1, gain, d]]
  if (n.verre) partiels.push([2.76, gain * n.verre, d * 0.6])
  for (const [r, g, dd] of partiels) {
    const o = c.createOscillator()
    o.type = r === 1 ? (n.forme ?? 'sine') : 'sine'
    o.frequency.setValueAtTime(n.f * r * k, debut)
    if (n.vers) o.frequency.exponentialRampToValueAtTime(n.vers * r * k, debut + (n.glisse ?? d * 0.6))
    const e = c.createGain()
    e.gain.setValueAtTime(0.0001, debut)
    e.gain.exponentialRampToValueAtTime(g, debut + att)
    e.gain.exponentialRampToValueAtTime(0.0001, debut + dd)
    o.connect(e).connect(sortie!)
    o.start(debut)
    o.stop(debut + dd + 0.02)
  }
}

// Anciens noms des sons du client, encore appelés par du code réutilisé dans les espaces.
const ANCIENS: Record<string, NomSon> = { message: 'envoi', retrait: 'remise' }

type Activation = { userActivation?: { hasBeenActive: boolean; isActive: boolean } }

/** Joue le son d'une action (et sa vibration). forcer : l'aperçu des réglages (ni file, ni heures calmes). Rend vrai
 * si le son est retenu. Une action inconnue de l'application mais qui porte le nom d'un son (ou un ancien nom) joue ce
 * son. */
export function sonner(action: Action, forcer = false): boolean {
  const w = fenetre()
  if (!w || typeof document === 'undefined') return false
  const a: string = action
  const son = (catalogue()[a]?.son ?? (a in SONS ? a : (ANCIENS[a] ?? null))) as NomSon | null
  if (!son) return false
  const enr = enregistre()
  if (enr ? !sonsOn : robot() || document.hidden || !(sonsOn || vibrationsOn)) return false
  const { intention } = def(son)
  if (!forcer && muettes.includes(intention) && calme()) return false
  const attente = placer(son, forcer)
  if (enr) (w.__blvSons ??= []).push({ appli: APPLI as Appli, action: a, son, intention, retenu: attente !== null })
  if (attente === null) return false
  if (enr) return true
  const act = (navigator as Navigator & Activation).userActivation
  if (vibrationsOn && act?.hasBeenActive !== false) {
    const v = () => navigator.vibrate?.(def(son).vibration)
    if (attente) setTimeout(v, attente)
    else v()
  }
  if (!sonsOn) return true
  // Contexte pas encore né : seulement dans un geste (sinon le navigateur le refuse) ; avant tout geste, rien.
  const c = ctx ?? (act?.isActive ? contexte() : null)
  if (!c || !sortie) return true
  if (c.state === 'suspended') c.resume().catch(() => {})
  const k = Math.pow(2, COULEURS[APPLI as Appli] / 12)
  const t0 = c.currentTime + 0.01 + attente / 1000
  for (const n of def(son).notes) note(c, t0, n, k)
  return true
}

/** Une vibration seule (toucher d'une touche) : jamais de son sur chaque toucher. */
export function vibrer(motif: number[] = [12]) {
  if (!vibrationsOn || robot() || enregistre() || typeof navigator === 'undefined') return
  navigator.vibrate?.(motif)
}

/** Aperçu (réglages) : les sons de l'application, groupés par intention, avec les actions qui les jouent. */
export function apercu(): { son: NomSon; intention: Intention; action: string; actions: Texte[] }[] {
  const par = new Map<NomSon, { son: NomSon; intention: Intention; action: string; actions: Texte[] }>()
  for (const [action, x] of Object.entries(catalogue())) {
    const e = par.get(x.son) ?? { son: x.son, intention: def(x.son).intention, action, actions: [] }
    // L'action propre à l'application nomme le son joué par l'aperçu (plutôt que l'action commune).
    if (action in COMMUNES) e.actions.push({ fr: x.fr, en: x.en })
    else {
      if (e.action in COMMUNES) e.action = action
      e.actions.unshift({ fr: x.fr, en: x.en })
    }
    par.set(x.son, e)
  }
  const ordre = Object.keys(INTENTIONS) as Intention[]
  return [...par.values()].sort((a, b) => ordre.indexOf(a.intention) - ordre.indexOf(b.intention))
}

let installe = false
/** Écoute le premier geste (le contexte audio naît dedans). Posé une fois, au démarrage. */
export function installerMarqueSonore() {
  const w = fenetre()
  if (installe || !w) return
  installe = true
  for (const e of ['pointerdown', 'keydown', 'touchend'] as const) w.addEventListener(e, deverrouiller, { capture: true, passive: true })
}
installerMarqueSonore()
