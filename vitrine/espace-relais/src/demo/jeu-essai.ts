// DONNÉES DE DÉMONSTRATION — le jeu d'essai du point relais : « Relais Bastos Carrefour » (zone Z1 Centre-ville,
// logique-metier/livraison/ZONES.md), boutique jaune au carrefour, le mardi 13 octobre 2026 à 14 h 05, une journée à
// volume normal. Mêmes lots, colis, heures et livreur que les démonstrations du livreur et de l'entreprise
// (espace-livreur/src/demo/{paquets,tournee,remises}.ts) : Yafé Express, Serge A. ; PQ-Z1-261013-001 déposé à 11 h 10,
// PQ-Z1-261013-003 (arrêt A3, vers 15 h 15) et sa collecte A4 (vers 15 h 25), PQ-Z1-261013-011 (arrêt V6, vers 18 h 35),
// la collecte du matin R1 (PQ-Z1-261013-010). Ce sont des DONNÉES (chiffres de démonstration) : tous les montants,
// rangs, dates, places et compteurs sont CALCULÉS par src/calculs à partir d'elles (aucun écran ne les recopie).
import { yaounde } from '../calculs/temps'
import type { ClasseColis } from '../donnees/communs'
import type { Droit, Membre } from '../donnees/domaines/session'

/** Instant du mardi 13 octobre 2026 (heure de Yaoundé). */
export const h = (heure: number, minute = 0) => yaounde(2026, 10, 13, heure, minute)
/** Instant d'un jour d'octobre 2026 (heure de Yaoundé). */
export const oct = (jour: number, heure: number, minute = 0) => yaounde(2026, 10, jour, heure, minute)

export const RELAIS = {
  id: 'rel-z1-001',
  nom: 'Relais Bastos Carrefour',
  quartier: 'Bastos',
  // Libellé verrouillé par le pont commun aux six applications (src/demo/pont.ts, RELAIS_DEMO.zone) : il passera à
  // « Z1 Centre-ville » (carte du 23 oct. 2026) quand les six copies du pont seront mises à jour ensemble.
  zone: 'Z1 Centre-ville',
  zoneCode: 'Z1',
  /** Carrefour Bastos (relevé à la visite d'ouverture, annexe 3). */
  position: { lat: 3.89512, lng: 11.51158 },
  repere: 'Carrefour Bastos, boutique jaune à l’angle',
  ouvertLe: yaounde(2026, 6, 15, 8, 0),
  fondateur: true,
  placesDeclarees: 60,
}

/** Horaires structurés (lundi = 0) : lun.-ven. 8 h – 19 h avec pause 13 h – 13 h 30, sam. 8 h – 19 h, dim. fermé. */
export const HORAIRES = [0, 1, 2, 3, 4, 5, 6].map((jour) => ({
  jour,
  ferme: jour === 6,
  ouverture: jour === 6 ? null : '08:00',
  fermeture: jour === 6 ? null : '19:00',
  pause: jour < 5 ? { de: '13:00', a: '13:30' } : null,
}))

/** Plan des étagères : A (petits) 6 cases de 4 places, B (moyens) 6 cases de 4, C (encombrants, au sol) 2 zones de 6. */
export const PLAN = [
  ...Array.from({ length: 6 }, (_, k) => ({ code: `A-0${k + 1}`, etagere: 'A' as const, capacite: 4 })),
  ...Array.from({ length: 6 }, (_, k) => ({ code: `B-0${k + 1}`, etagere: 'B' as const, capacite: 4 })),
  ...Array.from({ length: 2 }, (_, k) => ({ code: `C-0${k + 1}`, etagere: 'C' as const, capacite: 6 })),
]

const TOUS: Droit[] = ['recevoir', 'remettre', 'faire_partir', 'fermeture_jour', 'historique', 'argent', 'capacite', 'equipe', 'parametres']
export const ROSE: Membre = { id: 'm-rose', prenom: 'Rose', nom: 'Mbarga', initiales: 'RM', role: 'proprietaire', droits: TOUS, photo: null, formationOk: true }
export const PAUL: Membre = { id: 'm-paul', prenom: 'Paul', nom: 'Essomba', initiales: 'PE', role: 'employe', droits: ['recevoir', 'remettre', 'faire_partir', 'historique'], photo: null, formationOk: true }
/** Numéros des membres (seule clé de connexion ; jamais renvoyés en clair). */
export const TELEPHONES: Record<string, string> = { 'm-rose': '677245310', 'm-paul': '699318442' }
/** PIN de démonstration (6 chiffres) et code SMS de démonstration : seule la démonstration les connaît. */
export const PIN_DEMO = '240913'
export const CODE_SMS_DEMO = '481920'

export const ENTREPRISE = 'Yafé Express'
export const LIVREUR = 'Serge A.'

/** Codes de dépôt des lots (donnés par le livreur au comptoir ; le relais ne les voit jamais). PQ-Z1-261013-003 : le
 * même code que la démonstration du livreur (espace-livreur/src/demo/remises.ts). */
export const CODES_DEPOT: Record<string, string> = { 'PQ-Z1-261013-001': '275104', 'PQ-Z1-261013-003': '418306', 'PQ-Z1-261013-011': '630917' }

export interface LotJeu {
  id: string
  arret: string
  collecte: string | null
  heurePrevue: number
  suivi: 'prevu' | 'en_route' | 'en_approche' | 'arrive' | 'depose'
  depotA: number | null // dépôt confirmé par le livreur (lot reçu)
}
export const LOTS: LotJeu[] = [
  { id: 'PQ-Z1-261013-001', arret: 'M3', collecte: null, heurePrevue: h(11, 0), suivi: 'depose', depotA: h(11, 10) },
  { id: 'PQ-Z1-261013-003', arret: 'A3', collecte: 'A4', heurePrevue: h(15, 15), suivi: 'en_route', depotA: null },
  { id: 'PQ-Z1-261013-011', arret: 'V6', collecte: null, heurePrevue: h(18, 35), suivi: 'prevu', depotA: null },
]
export const COLLECTES = [
  { id: 'R1', lot: 'PQ-Z1-261013-010', heurePrevue: h(11, 25), termineeA: h(11, 27) as number | null },
  { id: 'A4', lot: 'PQ-Z1-261013-003', heurePrevue: h(15, 25), termineeA: null as number | null },
]

/**
 * Un colis du jeu d'essai. `j1` (jour de J1, quand il est arrivé) et `depot` : l'avis est délivré deux minutes après le
 * dépôt, sauf `avis` donné. `valeur` (plafond de la garde) et `paye` (ce que le client a payé : retenue au plus, DP-24)
 * restent côté serveur, jamais montrés au relais.
 */
export interface ColisJeu {
  id: string
  classe: ClasseColis
  gros?: boolean
  fragile?: boolean
  valeur: number
  /** Commande payable au comptoir : montant en Mobile Money (la livraison a été payée d'avance). */
  auComptoir?: number
  client: string // « Awa N. » : prénom et initiale (GEN-01)
  lot: string | null
  depot: number | null
  avis?: number | null
  emplacement: string | null
  etat: 'attendu' | 'en_stock' | 'en_constat' | 'en_groupage' | 'remis' | 'retour_depose' | 'parti'
  groupeTotal?: number // groupe incomplet au relais (n sur N)
  groupageJusquau?: string
  porteurDesigne?: string
  reserve?: string
  remise?: { a: number; par: 'm-rose' | 'm-paul'; tiers?: boolean; paiement?: string }
  retour?: { reference: string; motif: string; destination: string; deposeA: number }
  sortie?: { motif: 'renvoi' | 'retour'; destination: string; collecte: string | null; le: number | null }
}

const lot = (d: number) => `PQ-Z1-2610${d}-001`
const stock = (id: string, classe: ClasseColis, jour: number, emplacement: string, valeur: number, client: string, o: Partial<ColisJeu> = {}): ColisJeu => ({ id, classe, valeur, client, lot: lot(jour), depot: oct(jour, jour % 2 ? 11 : 16, jour % 2 ? 10 : 30), emplacement, etat: 'en_stock', ...o })
const attendu = (id: string, classe: ClasseColis, lotId: string, valeur: number, client: string, o: Partial<ColisJeu> = {}): ColisJeu => ({ id, classe, valeur, client, lot: lotId, depot: null, emplacement: null, etat: 'attendu', ...o })
const remis = (id: string, classe: ClasseColis, jour: number, a: number, par: 'm-rose' | 'm-paul', valeur: number, client: string, o: Partial<ColisJeu> = {}): ColisJeu => ({ ...stock(id, classe, jour, '', valeur, client), emplacement: null, etat: 'remis', remise: { a, par }, ...o })

export const COLIS: ColisJeu[] = [
  // Lot du matin, PQ-Z1-261013-001 (déposé à 11 h 10) : 1er jour, offert.
  { ...stock('BLV-00006-1', 'S', 13, 'A-01', 12_000, 'Awa N.'), lot: 'PQ-Z1-261013-001', depot: h(11, 10) },
  { ...stock('BLV-00006-2', 'S', 13, 'A-01', 9_500, 'Awa N.'), lot: 'PQ-Z1-261013-001', depot: h(11, 10) },
  { ...stock('BLV-00007-1', 'M', 13, 'B-01', 27_000, 'Hervé K.'), lot: 'PQ-Z1-261013-001', depot: h(11, 10) },
  { ...stock('BLV-00007-2', 'M', 13, 'B-01', 31_000, 'Hervé K.'), lot: 'PQ-Z1-261013-001', depot: h(11, 10), reserve: 'Angle du carton enfoncé, contenu non touché' },
  // Lundi 12 : 2e jour.
  stock('BLV-00031-1', 'S', 12, 'A-02', 15_000, 'Clarisse B.'),
  stock('BLV-00032-1', 'S', 12, 'A-02', 12_500, 'Junior T.', { auComptoir: 12_500 }),
  stock('BLV-00033-1', 'M', 12, 'B-02', 23_000, 'Nadège E.'),
  stock('BLV-00034-1', 'L', 12, 'C-01', 85_000, 'Patrice M.', { gros: true, porteurDesigne: 'Simon M.' }),
  stock('BLV-00035-1', 'S', 12, 'A-02', 6_500, 'Linda F.'),
  // Samedi 10 au soir, avis délivré dimanche matin (téléphone éteint) : J1 un dimanche, relais fermé ; le compteur
  // part le lundi (R37).
  stock('BLV-00036-1', 'S', 10, 'A-03', 8_000, 'Ibrahim S.', { depot: oct(10, 18, 50), avis: oct(11, 7, 10) }),
  // R37 : le dimanche 11, fermé, ne compte pas : chaque jour d'arrivée avant lui recule d'un jour.
  // Vendredi 9 : 4e jour.
  stock('BLV-00037-1', 'S', 9, 'A-03', 11_000, 'Mireille A.'),
  stock('BLV-00038-1', 'M', 9, 'B-03', 18_000, 'Franck O.', { auComptoir: 18_000 }),
  stock('BLV-00039-1', 'S', 9, 'A-03', 4_500, 'Sandrine N.'),
  // Jeudi 8 : 5e jour.
  stock('BLV-00040-1', 'S', 8, 'A-04', 9_000, 'Yannick D.'),
  stock('BLV-00041-1', 'M', 8, 'B-03', 26_000, 'Estelle M.', { fragile: true }),
  // Mercredi 7 : 6e jour ; BLV-00043-1 en constat depuis lundi (abîmé, constaté au comptoir).
  stock('BLV-00042-1', 'S', 7, 'A-04', 7_000, 'Rodrigue E.'),
  { ...stock('BLV-00043-1', 'S', 7, 'A-04', 14_000, 'Carine W.'), etat: 'en_constat' },
  // Mardi 6 : 7e jour, dernier jour.
  stock('BLV-00044-1', 'S', 6, 'A-05', 10_500, 'Boris L.'),
  stock('BLV-00045-1', 'M', 6, 'B-04', 32_000, 'Aïcha H.'),
  // Lundi 5 : non retirés en 7 jours, à renvoyer aujourd'hui. BLV-00003-1 part à la collecte A4 (même colis que le
  // livreur) ; BLV-00046-1, payable au comptoir, compte comme un refus (GARDE-COMPTOIR) et part à la prochaine collecte.
  { ...stock('BLV-00003-1', 'M', 5, 'B-04', 24_000, 'Didier F.'), sortie: { motif: 'renvoi', destination: 'Tech Bastos', collecte: 'A4', le: null } },
  { ...stock('BLV-00046-1', 'S', 5, 'A-05', 9_000, 'Guy N.', { auComptoir: 9_000 }), sortie: { motif: 'renvoi', destination: 'Chez Mama Ewondo', collecte: null, le: null } },
  // Groupage d'une liste d'envies : sans frais, pas de code avant la libération.
  { ...stock('BLV-00047-1', 'S', 12, 'A-06', 16_000, 'Ruth K.'), etat: 'en_groupage', avis: null, groupageJusquau: '2026-10-20' },
  // Groupe incomplet : 1 colis sur 2 arrivé ; la garde ne commence qu'à l'arrivée du dernier (GARDE-J1-DEBUT).
  { ...stock('BLV-00048-1', 'M', 12, 'B-05', 21_000, 'Olivier P.'), groupeTotal: 2 },

  // Retours clients déposés (hors capacité, jamais facturés).
  { id: 'BLV-00004-2', classe: 'S', valeur: 9_000, client: 'Martial T.', lot: null, depot: null, emplacement: 'A-06', etat: 'retour_depose', retour: { reference: 'RT-0412', motif: 'Taille différente de la commande', destination: 'Tech Bastos', deposeA: oct(12, 16, 5) }, sortie: { motif: 'retour', destination: 'Tech Bastos', collecte: 'A4', le: null } },
  { id: 'BLV-00028-1', classe: 'M', valeur: 19_500, client: 'Joëlle B.', lot: null, depot: null, emplacement: 'C-02', etat: 'retour_depose', retour: { reference: 'RT-0415', motif: 'Produit non conforme à l’annonce', destination: 'Bastos Mode', deposeA: h(10, 40) }, sortie: { motif: 'retour', destination: 'Bastos Mode', collecte: null, le: null } },
  // Collecte du matin R1 (PQ-Z1-261013-010) : retour repris par Serge A. et rendu à son vendeur.
  { id: 'BLV-00001-2', classe: 'S', valeur: 14_000, client: 'Brice Z.', lot: null, depot: null, emplacement: null, etat: 'parti', retour: { reference: 'RT-0409', motif: 'Article abîmé', destination: 'Chez Mama Ewondo', deposeA: oct(12, 9, 30) }, sortie: { motif: 'retour', destination: 'Chez Mama Ewondo', collecte: 'R1', le: h(11, 27) } },

  // Retraits faits aujourd'hui (garde encaissée en espèces au premier retrait du groupe).
  remis('BLV-00049-1', 'S', 12, h(8, 20), 'm-paul', 13_000, 'Steve A.'),
  remis('BLV-00050-1', 'M', 9, h(9, 5), 'm-rose', 22_500, 'Prisca O.'),
  remis('BLV-00051-1', 'S', 8, h(9, 40), 'm-paul', 8_000, 'Gaëlle N.'),
  remis('BLV-00051-2', 'S', 8, h(9, 41), 'm-paul', 5_500, 'Gaëlle N.'),
  remis('BLV-00052-1', 'S', 12, h(10, 15), 'm-rose', 9_500, 'Thierry B.', { auComptoir: 9_500, remise: { a: h(10, 15), par: 'm-rose', paiement: 'CP-5521877' } }),
  remis('BLV-00053-1', 'M', 6, h(11, 45), 'm-rose', 29_000, 'Alain K.'),
  remis('BLV-00054-1', 'S', 7, h(12, 30), 'm-paul', 7_500, 'Laure M.'),
  remis('BLV-00055-1', 'S', 12, h(13, 40), 'm-rose', 17_000, 'Pauline D.', { porteurDesigne: 'Martine O.', remise: { a: h(13, 40), par: 'm-rose', tiers: true } }),

  // Lot PQ-Z1-261013-003 (arrêt A3, vers 15 h 15) : S2 M2, valeurs de la démonstration du livreur.
  attendu('BLV-00008-1', 'S', 'PQ-Z1-261013-003', 18_000, 'Kevin N.'),
  attendu('BLV-00009-1', 'M', 'PQ-Z1-261013-003', 64_000, 'Christelle A.', { fragile: true }),
  attendu('BLV-00011-1', 'S', 'PQ-Z1-261013-003', 7_500, 'Jean-Paul M.', { auComptoir: 7_500 }),
  attendu('BLV-00014-1', 'M', 'PQ-Z1-261013-003', 22_000, 'Viviane T.'),
  // Lot du soir PQ-Z1-261013-011 (arrêt V6, vers 18 h 35).
  attendu('BLV-00021-1', 'S', 'PQ-Z1-261013-011', 8_500, 'Arlette B.'),
  attendu('BLV-00021-2', 'S', 'PQ-Z1-261013-011', 6_000, 'Arlette B.'),
  attendu('BLV-00022-1', 'M', 'PQ-Z1-261013-011', 19_000, 'Marcel E.'),
  attendu('BLV-00023-1', 'M', 'PQ-Z1-261013-011', 42_000, 'Danielle K.', { fragile: true }),
  attendu('BLV-00024-1', 'S', 'PQ-Z1-261013-011', 11_000, 'Romuald F.', { auComptoir: 11_000 }),
  attendu('BLV-00025-1', 'M', 'PQ-Z1-261013-011', 36_000, 'Sylvie N.'),
]

/** Livraison payée d'avance par commande (LIV-RELAIS-BASE) : ce que le client a payé en plus des articles. */
export const LIVRAISON_PAYEE = 900

/** Constat ouvert au comptoir lundi par Paul (BLV-00043-1, abîmé) : garde et renvoi suspendus, sans frais. */
export const CONSTAT = { id: 'CS-2207', colis: 'BLV-00043-1', motif: 'abime' as const, ouvertA: oct(12, 16, 20), par: 'm-paul' as const, note: 'Carton écrasé sur un côté ; la cliente a refusé devant le comptoir, déballage photographié.' }

/** Semaine en cours avant aujourd'hui (vendredi 9 au lundi 12) : opérations déjà comptées au prochain versement. */
export const SEMAINE_AVANT = { colis: { S: 19, M: 6, L: 1 }, joursGarde: 24, joursOffertsBelivay: 16, especes: 3_900, partRelaisEspeces: 2_400 }
/** Versements passés (crédités). */
// Montants versés, 1 % CamPay déduit au franc supérieur (R43).
export const VERSEMENTS_PASSES = [
  { reference: 'BLV-VP-0139', du: '2026-09-18', au: '2026-09-24', date: yaounde(2026, 9, 25, 10, 12), total: 11_484 },
  { reference: 'BLV-VP-0140', du: '2026-09-25', au: '2026-10-01', date: yaounde(2026, 10, 2, 9, 48), total: 12_226 },
  { reference: 'BLV-VP-0141', du: '2026-10-02', au: '2026-10-08', date: yaounde(2026, 10, 9, 10, 31), total: 12_969 },
]
export const NUMERO_VERSEMENT = { operateur: 'MTN' as const, fin: '8350' }
export const TRUST = { score: 78, evolution: [74, 75, 75, 76, 77, 77, 78] }
