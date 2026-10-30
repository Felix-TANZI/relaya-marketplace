// DONNÉES DE DÉMONSTRATION — le pont entre les six interfaces sur le même appareil : client (/), vendeur (/vendeur/),
// entreprise de livraison (/entreprise/), livreur (/livreur/), point relais (/relais/) et console d'administration
// (/admin/). En production, les portails
// sont servis par le même domaine (DP-38 : belivay.com, /vendeur, /entreprise, /livreur, /relais) et le serveur relie
// tout ; la démonstration le fait par un journal d'événements partagé (localStorage « blv_pont », même origine : un
// seul déploiement sert les six applications, site/outils/construire-tout.sh ; logique-metier/CAHIER-CONNECTIVITE.md) :
// - client → vendeur : la commande payée ; vendeur → client : acceptée, rupture, annulée (remboursement) ;
// - vendeur → entreprise : « C'est prêt » ; entreprise → livreur, vendeur, client : le livreur affecté ;
// - l'entreprise affecte un paquet à Serge A. (le livreur de démonstration) ou le lui retire, décide d'un incident,
//   règle le tarif par mission qu'elle lui affiche, redemande une pièce (ou une nouvelle vérification de sa photo),
//   voit ses absences, constate l'état du kit rendu, clôture son départ et marque le dernier versement fait (DP-66,
//   DP-67) ;
// - le livreur part, fait ses arrêts, dépose ses preuves, déclare un incident, rend un paquet, renvoie une pièce,
//   prévient d'une absence, demande à quitter l'entreprise (ou annule sa demande), conteste une retenue sur son kit ;
// - relais ↔ livreur (logique-metier/relais/CONNEXIONS.md § 1 et 3) : au dépôt, le livreur en approche, le code de
//   dépôt vérifié au comptoir (QR de dépôt scanné ou 6 chiffres saisis, DP-62), le résultat de chaque colis, le
//   constat accepté par le livreur, le lot validé par le relais (photo du lot, ARL-11) puis confirmé par le livreur (la
//   garde passe au relais) ; à la collecte, les sorties prêtes (renvoi du 7e jour, retour, transfert), chaque colis
//   présenté, la photo d'un scellé abîmé, le colis manquant, la sortie confirmée ; le relais trouvé fermé ; l'occupation
//   du relais (saturation : paquets réorientés par l'entreprise, PR-RC-05) ;
// - ce que le serveur enverrait à chacun (avis d'arrivée, code envoyé, remise, retour déposé) est publié dans le même
//   journal : DESTINATAIRES dit qui voit quoi ; l'administrateur voit tout ;
// - console → les cinq (EvenementAdminPont, DESTINATAIRES_ADMIN) : les décisions de BelivaY redescendent dans les applis
//   concernées (activation après vérification, suspension, arbitrage d'un litige, remboursement, versement du vendredi,
//   paramètre annoncé, panne et maintenance, message diffusé…) ; un événement qui nomme son espace ne va qu'à lui.
// Types des événements diffusés : noms techniques de logique-metier/livraison/CONNEXIONS.md et
// logique-metier/relais/evenements-relais.json, les mêmes que le kit Django (backend-kit, journal.emettre) ; charge
// utile anonyme : jamais un nom, un téléphone ni un code en clair (PR-RC-11, PR-RC-20), refusée par publier() sinon.
// Chaque application lit les événements des autres et les applique à son propre état, une fois chacun (clé). Les
// démonstrations partagent aussi leur jeu d'essai commun (ACTEURS_DEMO, identifiants de la commande témoin) et les
// valeurs du relais de démonstration (RELAIS_DEMO) : un même jour, les mêmes personnes, les mêmes références partout.
// Ce fichier est LE MÊME, octet pour octet, dans les six applications (src/demo/pont.ts ; test :
// espace-relais/src/demo/pont.test.ts) ; seul src/demo/pont-app.ts (« APP ») diffère.
import { APP } from './pont-app'

export { APP }
export type AppPont = 'client' | 'vendeur' | 'entreprise' | 'livreur' | 'relais'
/** Qui voit un événement, et qui en publie : les cinq applications et l'administrateur (console, qui lit tout le journal). */
export type Destinataire = AppPont | 'admin'
/** Espace d'un acteur que la console active, suspend ou paie. */
export type EspacePont = 'client' | 'vendeur' | 'entreprise' | 'livreur' | 'relais'
/** Le livreur de démonstration, des deux côtés : « l-serge » chez l'entreprise, compte « serge » chez le livreur. */
export const LIVREUR_DEMO = 'l-serge'

// ---------- Le jeu d'essai commun (CAHIER-CONNECTIVITE.md § 0 et étape 1) ----------

/** Le jour de la démonstration commune : mardi 13 octobre 2026, 14 h 05 à Yaoundé (UTC + 1). */
export const JOUR_DEMO = '2026-10-13'
export const HEURE_DEMO = Date.UTC(2026, 9, 13, 13, 5)
/**
 * Les mêmes personnes partout. Chacun ne voit des autres que ce que la règle permet : le vendeur ne voit jamais le
 * client (GEN-01) ; le livreur, l'entreprise et le client voient « Rose M. », « Serge A. » ; le client voit le vendeur
 * sous son nom de vitrine (« Boutique B ») ; le livreur et l'entreprise sous le nom du point de ramassage.
 */
export const ACTEURS_DEMO = {
  client: { prenom: 'Carine', initiale: 'M', vu: 'Carine M.' },
  /** Le produit de la commande témoin : le défroisseur de Boutique B (65 000 F, sous le plafond du palier Nouveau). */
  produit: { id: 'fer', titre: 'Défroisseur vapeur Philips 3000', classe: 'M' as const },
  vendeur: { vitrine: 'Boutique B', boutique: 'Tonton PG', point: 'Tonton PG · Nlongkak', lieu: 'b-tontonnl', zone: 'Z1', quartier: 'Nlongkak' },
  entreprise: { id: 'ent-yafe', nom: 'Yafé Express' },
  livreur: { id: LIVREUR_DEMO, compte: 'serge', prenom: 'Serge', initiale: 'A', vu: 'Serge A.', vehicule: 'Moto' },
  relais: { id: 'rel-z1-001', nom: 'Relais Bastos Carrefour', court: 'Relais Bastos', gerante: 'Rose M.' },
}
/**
 * Table de correspondance des identifiants (une seule vérité, DED-01) :
 *   commande (client, vendeur)   BLV-52108         la commande payée par le client
 *   colis (tous)                 BLV-52108-1       n-ième colis de la commande (un par vendeur)
 *   paquet (entreprise, livreur) PQ-Z1-261013-020  le paquet publié à « C'est prêt » (zone, jour, rang)
 *   arrêt (livreur)              T1, T2…           arrêts du paquet dans l'ordre (ramassage, relais ou domicile)
 *   dépôt (relais)               PQ-Z1-261013-020  le lot déposé au relais porte le numéro du paquet
 */
export const colisDe = (commande: string, n = 1): string => `${commande}-${n}`
export const commandeDuColis = (colis: string): string => colis.replace(/-\d+$/, '')
export const paquetDuJour = (zone: string, rang: number): string => `PQ-${zone}-${JOUR_DEMO.slice(2).replaceAll('-', '')}-${String(rang).padStart(3, '0')}`
/**
 * Codes de démonstration (le « serveur ») : déterminés par l'objet et l'usage, jamais publiés dans le journal. Le
 * client lit son code de retrait (après paiement), le vendeur son code de remise, le livreur son code de dépôt ; le
 * relais et le livreur les vérifient en recalculant. Le code de retrait d'une commande suit la formule du client.
 */
export function codeDemo(objet: string, usage: 'remise' | 'depot' | 'reception' | 'retour'): string {
  if (usage === 'depot' && objet in RELAIS_DEMO.codesDepot) return RELAIS_DEMO.codesDepot[objet]
  let h = 2166136261
  for (const ch of usage + ':' + objet) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return String(100000 + (h % 900000))
}
export const codeRetraitDemo = (commande: string): string => String(100000 + ((Number(commande.replace(/\D/g, '')) * 7919) % 900000))
/**
 * Code de retrait d'UN colis (v6 D12, D14 : un code et un QR par colis) : le colis 1 garde le code de la commande,
 * chaque colis suivant a le sien. Le client l'affiche, le relais le vérifie en le recalculant.
 */
export function codeColisDemo(colis: string): string {
  const n = Number(/-(\d+)$/.exec(colis)?.[1] ?? 1)
  const commande = commandeDuColis(colis)
  return n <= 1 ? codeRetraitDemo(commande) : String(100000 + ((Number(commande.replace(/\D/g, '')) * 7919 + n * 104729) % 900000))
}

// ---------- Le relais de démonstration, vu des trois applications ----------

/**
 * Relais Bastos Carrefour (zone Z1 Centre-ville) : une seule source pour le livreur et l'entreprise, vérifiée contre le jeu
 * d'essai du relais (espace-relais/src/demo/jeu-essai.ts) par espace-relais/src/demo/pont.test.ts. Le gérant est vu
 * hors du relais par son prénom et l'initiale de son nom (ARL-13, ARL-160), jamais par son numéro (appel masqué, DP-61).
 */
export const RELAIS_DEMO = {
  id: 'rel-z1-001',
  nom: 'Relais Bastos Carrefour',
  zone: 'Z1 Centre-ville',
  quartier: 'Bastos',
  repere: 'Carrefour Bastos, boutique jaune à l’angle',
  position: { lat: 3.8842, lng: 11.5139, plusCode: '6FR5VGM7+MH' },
  gerant: { prenom: 'Rose', initiale: 'M' },
  /** Horaires (lundi = 0) : lun.-ven. 8 h – 19 h, pause 13 h – 13 h 30 ; sam. 8 h – 19 h ; dim. fermé. */
  horaires: [0, 1, 2, 3, 4, 5, 6].map((jour) => ({
    jour,
    ferme: jour === 6,
    ouverture: jour === 6 ? null : '08:00',
    fermeture: jour === 6 ? null : '19:00',
    pause: jour < 5 ? { de: '13:00', a: '13:30' } : null,
  })),
  placesDeclarees: 60,
  /** Places libres le mardi 13 octobre à 14 h 05 (calculées par le relais) ; ensuite, relay.stock.updated fait foi. */
  placesLibresAuDebut: 25,
  /** Codes de dépôt des lots (le « serveur » : le relais n'en garde que l'empreinte, le livreur les porte dans son QR de dépôt). */
  codesDepot: { 'PQ-Z1-261013-001': '275104', 'PQ-Z1-261013-003': '418306', 'PQ-Z1-261013-011': '630917' } as Record<string, string>,
  /** Lots du relais et arrêt du livreur qui les dépose ; collectes (identifiant = arrêt du livreur). */
  lots: { 'PQ-Z1-261013-001': 'M3', 'PQ-Z1-261013-003': 'A3', 'PQ-Z1-261013-011': 'V6' } as Record<string, string>,
  collectes: { R1: 'PQ-Z1-261013-010', A4: 'PQ-Z1-261013-003' } as Record<string, string>,
}
/** Le gérant tel que le voient le livreur, l'entreprise et le client : « Rose M. ». */
export const gerantVu = (): string => `${RELAIS_DEMO.gerant.prenom} ${RELAIS_DEMO.gerant.initiale}.`
const DECALAGE_YAOUNDE_MS = 3600_000
/** Heure de fermeture du relais le jour (à Yaoundé) de l'instant donné ; null un jour fermé. */
export function fermetureRelais(instant: number): number | null {
  const local = new Date(instant + DECALAGE_YAOUNDE_MS)
  const jour = RELAIS_DEMO.horaires[(local.getUTCDay() + 6) % 7]
  if (jour.ferme || !jour.fermeture) return null
  const [h, m] = jour.fermeture.split(':').map(Number)
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), h, m) - DECALAGE_YAOUNDE_MS
}
/** Lot du relais déposé à un arrêt du livreur (A3 → PQ-Z1-261013-003), et l'inverse. */
export const lotDeLArret = (arretId: string): string | null => Object.entries(RELAIS_DEMO.lots).find(([, a]) => a === arretId)?.[0] ?? null
export const arretDuLot = (lot: string): string | null => RELAIS_DEMO.lots[lot] ?? null

// ---------- Événements ----------

export interface ArretPont {
  id: string // identifiant de l'arrêt chez le livreur
  type: 'ramassage' | 'relais' | 'domicile' | 'collecte' | 'retour'
  nom: string
  quartier: string
  colis: { id: string; classe: 'S' | 'M' | 'L' | 'XL' | 'HG'; valeur: number; fragile: boolean }[]
  creneau: [string, string] | null
  /** Position et repère du lieu (paquets venus des commandes du client ; ceux du jeu d'essai ont les leurs). */
  position?: { lat: number; lng: number } | null
  repere?: string | null
}
export interface PaquetPont {
  genre: 'relais' | 'domicile' | 'retour'
  zone: string // « Z1 Bastos »
  heureLimite: number
  distanceKm: number
  arrets: ArretPont[]
}
/** Résultat d'un colis à la réception (PR-04 REC-02, PR-RC-04 : « pas pour ce relais » ; « en trop » : non annoncé). */
export type ResultatDepotPont = 'controle' | 'reserve' | 'refuse' | 'absent' | 'en_trop' | 'pas_pour_ce_relais'
/** Pourquoi un colis sort du relais (PR-06) : renvoi du 7e jour, retour validé, transfert, refus au comptoir, fermeture. */
export type MotifSortiePont = 'renvoi' | 'retour' | 'transfert' | 'refus_comptoir' | 'fermeture'

/** Événements relais ↔ livreur et ce que le serveur en dirait au client, au vendeur, à l'administrateur. */
export type EvenementRelaisPont =
  // Dépôt d'un lot — livreur → relais
  | { type: 'courier.approaching'; lot: string; arretId: string; arriveeEstimee: number | null }
  | { type: 'relay.drop.report_accepted'; lot: string; arretId: string; colis: string } // constat accepté en miroir (PR-RC-08)
  | { type: 'relay.drop.completed'; lot: string; arretId: string; remis: string[]; refuses: string[]; mode: 'scan' | 'registre' }
  | { type: 'relay.closure.undeclared'; lot: string | null; arretId: string; photo: boolean } // relais trouvé fermé (PR-RC-24)
  // Dépôt d'un lot — relais → livreur
  | { type: 'relay.drop_code.verified'; lot: string }
  | { type: 'relay.drop_code.blocked'; lot: string | null; jusqua: number }
  | { type: 'relay.drop.item_result'; lot: string; colis: string; resultat: ResultatDepotPont; motif: string | null; photos: number }
  | { type: 'relay.drop.validated'; lot: string; emplacements: Record<string, string | null>; photoLot: boolean }
  // Collecte — relais → livreur
  | { type: 'relay.departures.ready'; collecte: string; colis: { id: string; classe: 'S' | 'M' | 'L'; motif: MotifSortiePont }[] }
  | { type: 'relay.departure.scanned'; collecte: string; colis: string } // le gérant présente (tend) le colis
  // Collecte — les deux sens : le livreur confirme chaque colis pris ; le relais valide la sortie (photo, PIN)
  | { type: 'relay.departure.confirmed'; collecte: string; colis: string[]; par: 'livreur' | 'relais' }
  | { type: 'relay.departure.missing'; collecte: string; colis: string } // livreur ↔ relais : colis prévu qui ne part pas
  | { type: 'relay.departure.seal_photo'; collecte: string; colis: string } // livreur → relais
  // Relais → entreprise, client, administrateur
  | { type: 'relay.stock.updated'; occupees: number; declarees: number; sature: boolean }
  | { type: 'relay.closure.declared'; du: string; au: string; motif: string } // jours « AAAA-MM-JJ », « au » inclus
  | { type: 'relay.inventory.missing'; inventaire: string; colis: string[] } // colis non retrouvés à l'inventaire (console)
  // Ce que le serveur dit au client et au vendeur (jamais le code : il part au client par SMS, après paiement)
  | { type: 'parcel.arrival_notice'; colis: string; lot: string }
  | { type: 'parcel.pickup_code'; colis: string; paye: boolean }
  | { type: 'handover.completed'; colis: string }
  // Étape 6 — non retiré : au premier jour ouvert après le 7e, le colis passe « à renvoyer » (code invalidé) ; le client
  // et le vendeur le voient (garde retenue sur ce qui a été payé, jamais au-delà : DP-24, CGA-23).
  | { type: 'parcel.unclaimed'; colis: string; jours: number }
  // Étape 7 — retours et litiges : le client signale (motif, photos) ; le vendeur répond (accepte : retour par le relais
  // avec sa référence ; arrangement ; contestation : médiation) ; le colis rendu au vendeur (code de réception du vendeur,
  // photo), inspecté sous 48 h : remboursé au client, ou médiation de BelivaY (jamais seul).
  | { type: 'claim.opened'; commande: string; colis: string; dossier: string; motif: string; souhait: 'rembourse' | 'remplace' | 'signal'; photos: number }
  | { type: 'claim.answered'; commande: string; colis: string; dossier: string; posture: 'accepte' | 'arrangement' | 'conteste'; retour: string | null }
  | { type: 'parcel.returned'; paquet: string; colis: string[]; photo: boolean }
  | { type: 'return.closed'; commande: string; colis: string; issue: 'rembourse' | 'remplace' | 'mediation' }
  | { type: 'return.dropped'; colis: string; reference: string }

/**
 * La commande entre les cinq interfaces (logique-metier/livraison/CONNEXIONS.md § 1 à 6, CAHIER-CONNECTIVITE.md) :
 * mêmes noms que le kit Django. « pont.ping » : signal de diagnostic (chaque application dit qu'elle entend le pont).
 */
export type EvenementCommercePont =
  | { type: 'pont.ping'; de: AppPont }
  // Étape 2 — client → vendeur : la commande payée (paiement confirmé par l'agrégateur ; le vendeur ne voit jamais le
  // client, GEN-01) ; vendeur → client : prise en charge (bon ouvert), plus de temps, rupture (remboursement au moyen
  // d'origine, DP-17). Pas d'étape d'acceptation à part (v1.4, etape_acceptation_vendeur : false).
  // livraisonOfferte : part de la livraison offerte par BelivaY sur la commande (R07, francs) ; chaque vendeur en porte
  // la part de sa sous-commande au prorata du sous-total (plancher R14 de la commission, comme le kit).
  | { type: 'order.paid'; commande: string; mode: 'relais' | 'domicile'; lieu: string; relais: string | null; zone: string | null; payableAuRetrait: boolean; delaiH: number; colis: ColisCommandePont[]; livraisonOfferte: number }
  | { type: 'suborder.accepted'; commande: string; colis: string }
  | { type: 'suborder.delayed'; commande: string; colis: string; heures: number }
  | { type: 'suborder.out_of_stock'; commande: string; colis: string; rembourse: number }
  // Étape 3 — vendeur → entreprise : « C'est prêt » (colis emballé, photographié) ; le paquet publié aux entreprises de
  // la zone (BelivaY n'affecte jamais le livreur) ; l'entreprise l'accepte et l'affecte : le livreur reçoit le paquet
  // (« affectation »), le vendeur, le client et le relais voient le livreur affecté.
  | { type: 'suborder.ready'; commande: string; colis: string; classe: 'S' | 'M' | 'L' | 'XL'; valeur: number; lieu: string; zone: string; relais: string | null; quartier: string | null; photo: boolean }
  | { type: 'package.published'; paquet: string; zone: string; colis: string[]; heureLimite: number }
  | { type: 'package.assigned'; paquet: string; colis: string[]; livreur: string; entreprise: string; creneau: [string, string] | null; relais: string | null }
  // Étape 4 — livreur ↔ vendeur : le ramassage (arrivée, contrôle et photos, code de remise du vendeur) ; le refus
  // motivé (photo, note) ; la classe dépassée (reclassement facturé au vendeur).
  | { type: 'courier.arrived'; paquet: string; arret: string; colis: string[] }
  | { type: 'parcel.collected'; paquet: string; arret: string; colis: string[]; relais: string | null }
  | { type: 'parcel.refused_at_pickup'; paquet: string; colis: string; motif: string; photos: number }
  | { type: 'parcel.reclassified'; paquet: string; colis: string; de: string; vers: string }
  // Étape 5 — à domicile : le livreur part vers le client (suivi en direct, heure estimée, appel masqué), puis remet le
  // colis contre le code de réception du client (photo, position) ; au relais, les événements relay.* ci-dessus.
  | { type: 'home.departed'; paquet: string; colis: string[]; arriveeEstimee: number | null }
  | { type: 'parcel.delivered'; paquet: string; colis: string[]; photo: boolean }
  // Vers la console (activation des comptes, signalements) : une inscription complète attend la vérification de BelivaY
  // (KYC, R59, R81) ; un signalement (fraude, comportement, produit interdit, colis suspect…) arrive dans la File d'action.
  // « acteur » : identifiant de l'acteur dans l'application qui publie ; « dossier » : référence du dossier d'inscription.
  | { type: 'account.requested'; espace: EspacePont; acteur: string; dossier: string; pieces: number; denomination?: string; zones?: string[]; livreurs?: number } // candidature : dénomination de l'entreprise (jamais une personne)
  | { type: 'report.filed'; espace: EspacePont; objet: string; motif: string; gravite: 'normale' | 'grave' }
/** Un colis d'une commande : les articles d'une boutique (classe du colis D10, catégorie de commission D17). */
export interface ColisCommandePont {
  colis: string
  boutique: string // nom de vitrine (« Boutique B ») : le vendeur s'y reconnaît
  classe: 'S' | 'M' | 'L' | 'XL'
  // photo : adresse de la photo du produit sur le même domaine (la vitrine du client), ou null
  lignes: { produit: string; titre: string; variante: string | null; prix: number; qte: number; categorie: string | null; photo: string | null }[]
}

/** Événements diffusés (relais et commande) : chacun a ses destinataires (DESTINATAIRES) et une charge anonyme. */
export type EvenementDiffusePont = EvenementRelaisPont | EvenementCommercePont

export type EvenementPont =
  | { type: 'affectation'; paquetId: string; paquet: PaquetPont }
  | { type: 'retrait'; paquetId: string }
  | { type: 'depart'; paquetId: string }
  | { type: 'arret'; paquetId: string; arretId: string; etat: 'fait' | 'echec' | 'dissocie' }
  // Terrain (entreprise ↔ livreur) : ordre changé par le livreur (« Faire cet arrêt d'abord »), retard prévu, colis
  // laissé chez le vendeur (pas prêt : parti avec les autres), remise à un tiers qui a le code (R89).
  | { type: 'ordre'; paquetId: string; arretId: string; ordre: string[] }
  | { type: 'retard'; paquetId: string; arretId: string; minutes: number; arriveeEstimee: number }
  | { type: 'colis_laisse'; paquetId: string; arretId: string; colis: string }
  | { type: 'remise_tiers'; paquetId: string; arretId: string }
  | { type: 'preuve'; paquetId: string | null; objet: string; nature: string }
  | { type: 'incident'; id: string; paquetId: string | null; lieu: string | null; famille: string; genre: string; note: string; bloquant: boolean }
  | { type: 'decision'; id: string; decision: 'valide' | 'refuse'; motif: string | null; par: string }
  | { type: 'rendu'; paquetId: string; motif: string }
  | { type: 'tarif'; montant: number | null } // tarif par mission affiché au livreur (ENT-P06R-02), ou compteur seul
  // Compte du livreur (DP-66, DP-67). Livreur → entreprise :
  | { type: 'depart_demande'; id: string; motif: MotifDepartPont; texte: string | null; preavisJusqua: number }
  | { type: 'depart_annule'; id: string }
  // Absence : jours « AAAA-MM-JJ », « au » inclus ; motif de la liste, texte facultatif (120 caractères) ; « imprevu » :
  // prévenue dans le délai court (maladie, deuil ou famille, panne de moto) ; « apresDebut » : après le début du créneau.
  | { type: 'absence'; id: string; du: string; au: string; motif: MotifAbsencePont; texte: string | null; imprevu: boolean; apresDebut: boolean }
  | { type: 'absence_annulee'; id: string }
  | { type: 'piece_envoyee'; piece: PiecePont }
  | { type: 'kit_conteste'; id: string; motif: string } // le livreur conteste la retenue de son kit incomplet
  // Entreprise → livreur :
  | { type: 'absence_vue'; id: string }
  // Relance, ou nouvelle vérification de la photo (selfie) : « jusqua » = fin du délai PHOTO-REVERIF-J (selfie seulement).
  | { type: 'piece_demandee'; piece: PiecePont; motif: string; jusqua: number | null }
  // Constat du kit par l'entreprise (null : constat retiré) ; incomplet : éléments manquants (libellés) et retenue plafonnée.
  | { type: 'depart_kit'; id: string; constat: ConstatKitPont | null; manquants: string[]; retenue: number }
  // Clôture : « kitNonConteste » (l'administrateur, sans constat dans le délai : aucune retenue) ; dernier versement calculé.
  | { type: 'depart_clos'; id: string; par: 'entreprise' | 'admin'; versementLe: number; kitNonConteste: boolean; versement: VersementPont }
  | { type: 'versement_fait'; id: string; montant: number | null } // dernier versement Mobile Money fait (SMS au livreur)
  // L'entreprise employeur (DP-66, DP-67 : employeur du livreur contractuel) → son livreur (« livreurId » : celui qui
  // applique) : suspension et réintégration, avertissement écrit, zones et horaires de travail, fin de la période
  // d'essai, fin de contrat avec préavis (et son annulation).
  | { type: 'emploi_suspendu'; id: string; livreurId: string; motif: string; jusqua: number | null }
  | { type: 'emploi_retabli'; id: string; livreurId: string; motif: string }
  | { type: 'avertissement_ecrit'; id: string; livreurId: string; motif: string; rang: number }
  | { type: 'zones_changees'; livreurId: string; zones: string[]; motif: string | null }
  | { type: 'horaires_changes'; livreurId: string; creneaux: { jour: number; de: string; a: string }[] }
  | { type: 'essai_conclu'; livreurId: string; issue: 'confirme' | 'prolonge' | 'rompu'; jusqua: number | null }
  | { type: 'fin_contrat'; id: string; livreurId: string; motif: string; preavisJusqua: number }
  | { type: 'fin_contrat_annulee'; id: string; livreurId: string }
  | EvenementDiffusePont
  | EvenementAdminPont

/**
 * Décisions de la console (« app: 'admin' », logique-metier/admin/CONNEXIONS.md) : motivées, journalisées côté console ;
 * chaque application concernée les applique une fois (clé). « acteur » : l'identifiant de l'acteur DANS l'application
 * qui le reçoit (vendeur « b-tontonnl », relais « rel-z1-001 », entreprise « ent-yafe », livreur « l-serge »).
 */
export type EvenementAdminPont =
  // Activation et vie des comptes (KYC, R59, R81) :
  | { type: 'kyc_decide'; dossier: string; espace: EspacePont; acteur: string; decision: 'approuve' | 'rejete' | 'complement'; pieces: { nature: string; motif: string | null }[] }
  | { type: 'sanction_decidee'; acteurId: string; espace: EspacePont; niveau: number; etat: string; motif: string; recoursJusqua: number | null }
  | { type: 'palier_decide'; acteurId: string; espace: EspacePont; de: string; vers: string; decision: string; motif: string }
  | { type: 'livreur_suspendu'; livreurId: string; motif: string; jusqua: number | null }
  | { type: 'livreur_retabli'; livreurId: string; motif: string }
  | { type: 'kit_decide'; id: string; decision: 'retenue_maintenue' | 'retenue_annulee'; motif: string }
  | { type: 'fiche_a_valider'; fiche: string; espace: EspacePont; acteur: string }
  // Litiges et argent (R22, R25, R43, R68, R70, R72) :
  | { type: 'litige_decide'; id: string; commande: string; decision: string; motif: string; montant: number | null; transporteurEnCause: boolean }
  | { type: 'commande_annulee'; commande: string; motif: string; montant: number }
  | { type: 'remboursement_execute'; id: string; commande: string; montant: number; moyen: string }
  | { type: 'versement_credite'; lot: string; espace: EspacePont; beneficiaire: string; montant: number }
  | { type: 'versement_gele'; acteurId: string; alerte: string; motif: string }
  | { type: 'versement_degele'; acteurId: string; alerte: string; motif: string }
  | { type: 'reprise_vendeur'; vendeurId: string; montant: number; motif: string }
  | { type: 'grille_annoncee'; version: string; dateEffet: number }
  | { type: 'geste'; ticket: string; ref: string; montant: number }
  // Catalogue et modération :
  | { type: 'ifa_decide'; client: string; palier: string; avantages: string }
  | { type: 'fiche_decidee'; demande: string; vendeurId: string; decision: string; motif: string | null }
  | { type: 'offre_moderee'; offre: string; vendeurId: string; decision: string; motif: string; suggestion: number | null }
  | { type: 'avis_modere'; avis: string; decision: string; motif: string }
  | { type: 'flash'; id: string; etat: 'programmee' | 'annulee' | 'arretee'; vendeur: string; motif: string | null }
  | { type: 'rabais_retire'; id: string; vendeur: string; motif: string }
  // Pilotage et communication (« panne » : incident de service déclaré par la console, bandeau des six espaces) :
  | { type: 'parametre_annonce'; code: string; version: number; valeur: string; dateEffet: number; pour: EspacePont[] }
  | { type: 'interrupteur'; code: string; ouvert: boolean }
  | { type: 'panne'; id: string; etat: 'declare' | 'papier' | 'maj' | 'retabli' | 'clos'; zones: string[]; message: string; relais: string[] }
  | { type: 'ressaisie_relancee'; incident: string; remise: string; relais: string }
  | { type: 'diffusion'; id: string; espaces: string[]; zones: string[]; programmeeLe: number; texte: string }
  | { type: 'support_reponse'; ticket: string; espace: string; texte: string }
  | { type: 'modele_publie'; modele: string; version: number }
  | { type: 'sms_renvoye'; envoi: string; cle: string }
  // Système :
  | { type: 'maintenance_annoncee'; id: string; service: string; debut: number; fin: number }
  | { type: 'maintenance_annulee'; id: string; service: string }
  | { type: 'texte_annonce'; texte: string; version: string; effet: number }
  | { type: 'donnees_exportees'; demande: string }
  | { type: 'espace_ouvert'; pays: string }
  // Équipe et terrain de la console (logique-metier/ACCES-CONSOLE.md § 9) : un relais est prévenu d'une inspection.
  | { type: 'inspection_annoncee'; relais: string; descente: string; prevueLe: number }
  // Fin de convention d'un relais : plus aucun nouveau colis à compter de `effet` ; les colis en stock partent (retours).
  | { type: 'convention_terminee'; relais: string; motif: string; effet: number }
  // Contenu du site client piloté par la console : moments et bannières de l'accueil, catégories mises en avant.
  | { type: 'contenu_publie'; version: number; moments: { id: string; actif: boolean; du: string | null; au: string | null }[]; categories: string[] } // du, au : « MM-JJ »
  // Promotions de la plateforme (ADM-P26) : programmée (début, fin, cible), lancée, arrêtée ou finie ; « cible » :
  // « toutes », une catégorie, une zone ou des vitrines (libellé lisible) ; « remise » : « −10 % », « livraison offerte ».
  | { type: 'promotion'; id: string; etat: 'programmee' | 'en_cours' | 'arretee' | 'terminee'; titre: string; debut: number; fin: number; cible: string; remise: string | null }
  // Photo ajoutée ou remplacée par la console : bannière ou moment de l'accueil, catégorie, produit signalé, pièce d'un
  // dossier ; « photo » : adresse ou image réduite (null : photo retirée, celle d'origine revient).
  | { type: 'photo_remplacee'; cible: 'banniere' | 'moment' | 'categorie' | 'produit' | 'piece'; id: string; photo: string | null; motif: string }
  // Accès d'un compte d'acteur bloqué ou rétabli par la console (motif journalisé) ; « acteur » : son identifiant.
  | { type: 'acces_change'; espace: EspacePont; acteur: string; etat: 'bloque' | 'autorise'; motif: string }
/** Motifs d'un départ (moteurs/belivay_moteurs/depart.py MOTIFS). */
export type MotifDepartPont = 'autre_emploi' | 'horaires' | 'remuneration' | 'demenagement' | 'sante' | 'personnel' | 'autre'
/** Motifs d'une absence (moteurs/belivay_moteurs/absence.py MOTIFS). */
export type MotifAbsencePont = 'maladie' | 'deuil_famille' | 'panne_moto' | 'demarches' | 'autre'
/** Constat du kit (moteurs/belivay_moteurs/depart.py CONSTATS_KIT). */
export type ConstatKitPont = 'restitue' | 'incomplet'
/** Dernier versement (depart.py dernier_versement) : montants en francs ; null quand l'entreprise n'affiche pas de tarif. */
export interface VersementPont {
  du: number | null
  missions: number
  retenuLitiges: number
  litiges: number
  retenueKit: number
  kitDeCote: number
  verse: number | null
}
/** Pièce du livreur, avec les mots du livreur (l'entreprise : identite ↔ cni). */
export type PiecePont = 'cni' | 'selfie' | 'permis'
/** cle : clé d'idempotence ; app : qui publie ; le : heure de la démonstration de l'application ; n : heure réelle. */
export type Evenement = EvenementPont & { cle: string; app: Destinataire; le: number; n?: number }
export type TypeAdminPont = EvenementAdminPont['type']
export type TypeRelaisPont = EvenementRelaisPont['type']
export type TypeDiffusePont = EvenementDiffusePont['type']

/** Qui voit chaque événement diffusé (CONNEXIONS.md de la livraison et du relais) ; l'administrateur voit tout. */
export const DESTINATAIRES: Record<TypeDiffusePont, Destinataire[]> = {
  'pont.ping': ['client', 'vendeur', 'entreprise', 'livreur', 'relais', 'admin'],
  'order.paid': ['vendeur', 'admin'],
  'suborder.accepted': ['client', 'admin'],
  'suborder.delayed': ['client', 'admin'],
  'suborder.out_of_stock': ['client', 'admin'],
  'suborder.ready': ['entreprise', 'client', 'admin'],
  'package.published': ['admin'],
  'package.assigned': ['vendeur', 'client', 'relais', 'admin'],
  'courier.arrived': ['vendeur', 'entreprise', 'admin'],
  'parcel.collected': ['vendeur', 'client', 'entreprise', 'relais', 'admin'],
  'parcel.refused_at_pickup': ['vendeur', 'client', 'entreprise', 'admin'],
  'parcel.reclassified': ['vendeur', 'entreprise', 'admin'],
  'home.departed': ['client', 'entreprise', 'admin'],
  'parcel.delivered': ['client', 'vendeur', 'entreprise', 'admin'],
  'courier.approaching': ['relais', 'admin'],
  'relay.drop.report_accepted': ['relais', 'entreprise', 'admin'],
  'relay.drop.completed': ['relais', 'entreprise', 'vendeur', 'admin'],
  'relay.closure.undeclared': ['relais', 'entreprise', 'admin'],
  'relay.drop_code.verified': ['livreur', 'admin'],
  'relay.drop_code.blocked': ['livreur', 'entreprise', 'admin'],
  'relay.drop.item_result': ['livreur', 'entreprise', 'admin'],
  'relay.drop.validated': ['livreur', 'admin'],
  'relay.departures.ready': ['livreur', 'entreprise', 'vendeur', 'admin'],
  'relay.departure.scanned': ['livreur', 'admin'],
  'relay.departure.confirmed': ['relais', 'livreur', 'entreprise', 'client', 'vendeur', 'admin'],
  'relay.departure.missing': ['relais', 'livreur', 'entreprise', 'admin'], // l'un ou l'autre le constate
  'relay.departure.seal_photo': ['relais', 'entreprise', 'admin'],
  'relay.stock.updated': ['livreur', 'entreprise', 'client', 'admin'],
  'relay.closure.declared': ['entreprise', 'client', 'admin'],
  'relay.inventory.missing': ['admin'],
  'parcel.arrival_notice': ['client', 'admin'],
  'parcel.pickup_code': ['client', 'admin'],
  'handover.completed': ['client', 'vendeur', 'admin'],
  'parcel.unclaimed': ['client', 'vendeur', 'admin'],
  'claim.opened': ['vendeur', 'admin'],
  'claim.answered': ['client', 'relais', 'admin'],
  'parcel.returned': ['vendeur', 'client', 'entreprise', 'admin'],
  'return.closed': ['client', 'admin'],
  'return.dropped': ['vendeur', 'client', 'entreprise', 'admin'],
  'account.requested': ['admin'],
  'report.filed': ['admin'],
}
const estDiffuse = (t: string): t is TypeDiffusePont => t in DESTINATAIRES
/** Les événements propres à l'entreprise et au livreur (affectation, départ, absence…) : entre eux deux seulement. */
const ENTRE_ENT_ET_LIV: Destinataire[] = ['entreprise', 'livreur']

const CINQ: EspacePont[] = ['client', 'vendeur', 'entreprise', 'livreur', 'relais']
/** Qui reçoit chaque décision de la console (avant le filtre par espace, quand l'événement nomme le sien). */
export const DESTINATAIRES_ADMIN: Record<TypeAdminPont, EspacePont[]> = {
  kyc_decide: ['vendeur', 'entreprise', 'livreur', 'relais'],
  sanction_decidee: ['vendeur', 'entreprise', 'livreur', 'relais'],
  palier_decide: ['vendeur', 'entreprise', 'relais'],
  livreur_suspendu: ['entreprise', 'livreur'],
  livreur_retabli: ['entreprise', 'livreur'],
  kit_decide: ['entreprise', 'livreur'],
  fiche_a_valider: ['vendeur', 'relais'],
  litige_decide: ['client', 'vendeur', 'entreprise'],
  commande_annulee: ['client', 'vendeur'],
  remboursement_execute: ['client'],
  versement_credite: ['vendeur', 'entreprise', 'relais'],
  versement_gele: ['vendeur'],
  versement_degele: ['vendeur'],
  reprise_vendeur: ['vendeur'],
  grille_annoncee: ['entreprise'],
  geste: ['client'],
  ifa_decide: ['client'],
  fiche_decidee: ['vendeur'],
  offre_moderee: ['vendeur'],
  avis_modere: ['vendeur', 'client'],
  flash: ['vendeur', 'client'],
  rabais_retire: ['vendeur', 'client'],
  parametre_annonce: CINQ,
  interrupteur: CINQ,
  panne: CINQ,
  ressaisie_relancee: ['relais'],
  diffusion: CINQ,
  support_reponse: CINQ,
  modele_publie: [],
  sms_renvoye: [],
  maintenance_annoncee: CINQ,
  maintenance_annulee: CINQ,
  texte_annonce: CINQ,
  donnees_exportees: ['client'],
  espace_ouvert: [],
  inspection_annoncee: ['relais'],
  convention_terminee: ['relais', 'entreprise'],
  contenu_publie: ['client'],
  promotion: ['client', 'vendeur'],
  photo_remplacee: ['client', 'vendeur'],
  acces_change: CINQ,
}
const estAdmin = (t: string): t is TypeAdminPont => t in DESTINATAIRES_ADMIN
/** Destinataires d'une décision de la console : sa table, réduite à l'espace (ou aux espaces) que l'événement nomme. */
function cibleAdmin(e: Evenement): Destinataire[] {
  if (!estAdmin(e.type)) return ENTRE_ENT_ET_LIV
  const x = e as unknown as { espace?: string; espaces?: string[]; pour?: string[] }
  const l = DESTINATAIRES_ADMIN[e.type]
  if (typeof x.espace === 'string') return l.filter((a) => a === x.espace)
  const choisis = x.espaces ?? x.pour
  return Array.isArray(choisis) ? l.filter((a) => choisis.includes(a)) : l
}

const CLE = 'blv_pont'
/**
 * Chaque application écrit aussi son propre journal (« blv_pont:<app> », un seul écrivain) : deux onglets qui publient
 * au même instant ne peuvent pas effacer l'événement de l'autre dans le journal commun (lecture-écriture non atomique
 * entre onglets) ; la lecture réunit le journal commun et les six journaux, sans doublon (clé).
 */
const APPS_PONT: Destinataire[] = ['client', 'vendeur', 'entreprise', 'livreur', 'relais', 'admin']
const CLE_APP = (app: Destinataire) => `${CLE}:${app}`
const CLE_DEBUT = 'blv_demo_debut'
/** Une démonstration repart du jeu d'essai après une longue absence (la journée de démonstration dure 10 h). */
const DUREE_MAX_MS = 10 * 3600_000

function liste(cle: string): Evenement[] {
  try {
    const v = JSON.parse(localStorage.getItem(cle) ?? '[]') as unknown
    return Array.isArray(v) ? (v as Evenement[]) : []
  } catch {
    return []
  }
}
function lireBrut(): Evenement[] {
  const commun = liste(CLE)
  const vus = new Set(commun.map((e) => e.cle))
  const perdus = APPS_PONT.flatMap((a) => liste(CLE_APP(a)))
    .filter((e) => !vus.has(e.cle))
    .sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
  return perdus.length ? [...commun, ...perdus] : commun
}

/** Événements publiés par une autre application, dans l'ordre. */
export const evenementsDe = (app: Destinataire): Evenement[] => lireBrut().filter((e) => e.app === app)
/** Événements qu'un destinataire voit, publiés par une autre application (l'administrateur : tous), dans l'ordre. */
export const evenementsPour = (d: Destinataire): Evenement[] =>
  lireBrut().filter((e) => d === 'admin' || (e.app !== d && (estDiffuse(e.type) ? DESTINATAIRES[e.type] : e.app === 'admin' ? cibleAdmin(e) : ENTRE_ENT_ET_LIV).includes(d)))

/** Clés interdites dans un événement diffusé : identité, contact, code en clair (PR-RC-11, PR-RC-20). */
const INTERDITS = /^(nom|prenom|telephone|numero|adresse|client|vendeur|code|pin|montant)$/i
/** Vrai si la charge utile d'un événement diffusé ne porte ni identité ni code (6 chiffres seuls) ; les autres passent. */
export function anonyme(e: EvenementPont): boolean {
  if (!estDiffuse(e.type)) return true
  const fouiller = (v: unknown): boolean =>
    typeof v === 'string' ? !/^\d{6}$/.test(v) : Array.isArray(v) ? v.every(fouiller) : v && typeof v === 'object' ? Object.entries(v).every(([k, x]) => !INTERDITS.test(k) && fouiller(x)) : true
  return fouiller(e)
}

/** Publie un événement (une seule fois par clé : un geste rejoué n'en publie pas deux ; refusé s'il n'est pas anonyme). */
export function publier(e: EvenementPont, cle: string, le: number) {
  if (!anonyme(e)) {
    console.error('pont : événement refusé, la charge utile porte une identité ou un code', e.type)
    return
  }
  try {
    if (lireBrut().some((x) => x.cle === cle)) return
    const ev = { ...e, cle, app: APP, le, n: Date.now() } as Evenement
    const l = liste(CLE)
    l.push(ev)
    localStorage.setItem(CLE, JSON.stringify(l.slice(-400)))
    const m = liste(CLE_APP(APP))
    m.push(ev)
    localStorage.setItem(CLE_APP(APP), JSON.stringify(m.slice(-200)))
  } catch {
    /* stockage refusé : chaque application garde son état */
  }
}

/**
 * Heure de départ partagée de la démonstration : la première application ouverte la pose, les autres la reprennent
 * (même appareil). Au-delà de la journée de démonstration, elle repart de l'instant présent.
 */
export function debutPartage(reel: number): number {
  try {
    const d = Number(localStorage.getItem(CLE_DEBUT))
    if (d && reel - d < DUREE_MAX_MS && reel >= d) return d
    localStorage.setItem(CLE_DEBUT, String(reel))
    localStorage.removeItem(CLE)
    for (const a of APPS_PONT) localStorage.removeItem(CLE_APP(a))
    return reel
  } catch {
    return reel
  }
}

// ---------- Présence : quelle application est ouverte dans ce navigateur ----------
// Chaque application ouverte bat toutes les PRESENCE_MS (heure réelle) dans « blv_pont_presence_<app> » et efface son
// battement en quittant la page. Une autre application la croit ouverte tant que le dernier battement date de moins de
// trois périodes : la démonstration attend alors ses gestes réels par le pont au lieu de les simuler.
const CLE_PRESENCE = 'blv_pont_presence_'
const PRESENCE_MS = 5000
/** Vrai si l'application `app` est ouverte dans ce navigateur (même origine), d'après son battement de présence. */
export function appliOuverte(app: Destinataire): boolean {
  try {
    const t = Number(localStorage.getItem(CLE_PRESENCE + app))
    const d = Date.now() - t
    return !!t && d < 3 * PRESENCE_MS && d > -PRESENCE_MS
  } catch {
    return false
  }
}
if (typeof window !== 'undefined') {
  const battre = () => {
    try {
      localStorage.setItem(CLE_PRESENCE + APP, String(Date.now()))
    } catch {
      /* stockage refusé : l'application paraît fermée, les autres simulent ses gestes */
    }
  }
  battre()
  window.setInterval(battre, PRESENCE_MS)
  window.addEventListener('pagehide', () => {
    try {
      localStorage.removeItem(CLE_PRESENCE + APP)
    } catch {
      /* rien */
    }
  })
}

// Une autre application a écrit : les écrans ouverts relisent leurs données.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (ev) => {
    if (ev.key === CLE || ev.key?.startsWith(CLE + ':')) window.dispatchEvent(new CustomEvent('blv:donnees', { detail: { domaine: 'pont' } }))
  })
  // Diagnostic de la démonstration (recettes multi-applis, console du navigateur) : publier et lire le journal.
  Object.defineProperty(window, '__blvPont', { configurable: true, value: { app: APP, publier, evenementsPour, appliOuverte } })
}
