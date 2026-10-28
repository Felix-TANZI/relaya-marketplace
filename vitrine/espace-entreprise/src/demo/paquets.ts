// DONNÉES DE DÉMONSTRATION — domaine « paquets » (ENT-P10, ENT-P11) et le monde des tournées de Yafé Express ce mardi
// 13 octobre à 14 h 05 : lieux (boutiques, relais, point de stockage), paquets publiés, acceptés, affectés, en cours,
// déposés et clos. Une seule vérité par paquet (DED-01) : les missions, la carte, les colis et les preuves se lisent
// ici (missions.ts, carte.ts, colis.ts, preuves.ts) ; chaque geste écrit ici et prévient les écrans.
// Règles appliquées comme le serveur : délais et plafonds du registre (pages/ENT-05/regles.ts, calculs/), visibilité
// (zone déclarée, palier, capacité : ENT-P10R-01, ENT-PAL-01), anonymat avant l'acceptation (ENT-P10R-02), premier
// servi (ENT-RG-R87), capacité dure (ENT-PUB-06), « aucun livreur disponible » refusé (RG-R93), rendre avant tout
// ramassage seulement (ENT-PUB-02), rendus sur 7 jours et fenêtre de priorité (ENT-PUB-03), comptable refusé.
import type { ClasseColis, CodeZone, Francs, Instant, LivreurCourt, Resultat } from '../donnees/communs'
import type { Arret, DetailPaquet, DomainePaquets, GenrePaquet, LigneRemuneration, Paquet, RefusAcceptation, StatutPaquet } from '../donnees/domaines/paquets'
import type { Appel } from '../donnees/domaines/missions'
import { PARAMETRES } from '../calculs/registre'
import { sousPlafond } from '../calculs/paliers'
import { JOUR, MINUTE } from '../calculs/temps'
import { FORMAT_DE_CLASSE, plafondDomicile, plafondRelais } from '../calculs/course20'
import { reglage } from '../../../site/src/calculs'
import { REGLES } from '../calculs/livraison/regles-ecrans'
import { maintenant } from './horloge'
import { ENTREPRISE, T, UTILISATEURS, livreurCourt } from './jeu-essai'
import { exiger, montantsVisibles, sessionDemo } from './acces'
import { magasin, repondre } from './stockage'
import { zonesDemo } from './zones'
import { remunerer } from './prix'
import { eligibilite } from './affectation'
import { prestations } from './prestations'

// ---------- Lieux (coordonnées de démonstration ; OSRM et le GPS en production) ----------

export interface LieuDemo {
  id: string
  type: 'boutique' | 'relais' | 'domicile' | 'stockage'
  nom: string
  zone: CodeZone
  quartier: string
  lat: number
  lng: number
}
const lieu = (id: string, type: LieuDemo['type'], nom: string, zone: CodeZone, quartier: string, lat: number, lng: number): LieuDemo => ({ id, type, nom, zone, quartier, lat, lng })
export const LIEUX: Record<string, LieuDemo> = Object.fromEntries(
  [
    lieu('r-z3', 'relais', 'Relais Mokolo Marché', 'Z3', 'Mokolo', 3.873, 11.5),
    lieu('r-z2', 'relais', 'Relais Obili', 'Z2', 'Obili', 3.8575, 11.496),
    lieu('r-z1', 'relais', 'Relais Bastos Carrefour', 'Z1', 'Bastos', 3.8842, 11.5139),
    lieu('r-z6', 'relais', 'Relais Biyem-Assi Lycée', 'Z6', 'Biyem-Assi', 3.835, 11.486),
    lieu('stock', 'stockage', 'Agence Yafé Express', 'Z3', 'Mokolo', 3.876, 11.4975),
    lieu('b-ngono', 'boutique', 'Ets Ngono', 'Z3', 'Mokolo', 3.8758, 11.4995),
    lieu('b-elobi', 'boutique', 'Mode Elobi', 'Z3', 'Elobi', 3.8785, 11.495),
    lieu('b-tonton', 'boutique', 'Tonton PG', 'Z2', 'Obili', 3.8565, 11.4945),
    lieu('b-ngoa', 'boutique', 'Librairie de Ngoa', 'Z2', 'Ngoa-Ekellé', 3.859, 11.499),
    lieu('b-bazin', 'boutique', 'Élégance Bazin', 'Z6', 'Biyem-Assi', 3.8378, 11.4842),
    lieu('b-etoug', 'boutique', 'Saveurs d’Etoug-Ebe', 'Z6', 'Etoug-Ebe', 3.8505, 11.476),
    lieu('b-tech', 'boutique', 'Tech Bastos', 'Z1', 'Bastos', 3.8935, 11.5112),
    lieu('b-deco', 'boutique', 'Afrik Déco', 'Z1', 'Nlongkak', 3.885, 11.517),
    // Boutiques de la tournée de Serge (mêmes lieux que l'espace livreur).
    lieu('b-mngono', 'boutique', 'Maison Ngono', 'Z1', 'Bastos', 3.8869, 11.5162),
    lieu('b-mama', 'boutique', 'Chez Mama Ewondo', 'Z1', 'Bastos', 3.8915, 11.5108),
    lieu('b-bmode', 'boutique', 'Bastos Mode', 'Z1', 'Bastos', 3.8901, 11.5131),
    lieu('b-sapeur', 'boutique', 'Sapeur Mode', 'Z1', 'Bastos', 3.8928, 11.5149),
    lieu('b-pharma', 'boutique', 'Pharma Beauté', 'Z1', 'Etoa-Meki', 3.8815, 11.5262),
    lieu('b-tontonnl', 'boutique', 'Tonton PG · Nlongkak', 'Z1', 'Nlongkak', 3.8838, 11.5186),
    lieu('b-electro', 'boutique', 'Électro Nlongkak', 'Z1', 'Nlongkak', 3.8826, 11.5171),
    // Domiciles : le quartier seul (jamais l'adresse ni le client : DED-13) ; la carte n'en montre que la zone.
    lieu('d-bastos', 'domicile', '', 'Z1', 'Bastos', 3.898, 11.509),
    lieu('d-etoa', 'domicile', '', 'Z1', 'Etoa-Meki', 3.8817, 11.5276),
    lieu('d-nlongkak', 'domicile', '', 'Z1', 'Nlongkak', 3.8846, 11.5196),
    lieu('d-biyem', 'domicile', '', 'Z6', 'Biyem-Assi', 3.8345, 11.4875),
    lieu('d-etoug', 'domicile', '', 'Z6', 'Etoug-Ebe', 3.849, 11.473),
    // Trafic du reste de la flotte (paquets tirés par trafic(), plus bas).
    lieu('b-quinc', 'boutique', 'Quincaillerie du Marché', 'Z3', 'Mokolo', 3.8745, 11.5031),
    lieu('b-mercerie', 'boutique', 'Mercerie d’Obili', 'Z2', 'Obili', 3.859, 11.4975),
    lieu('b-cosme', 'boutique', 'Cosmétiques Biyem', 'Z6', 'Biyem-Assi', 3.8402, 11.4871),
    lieu('b-nlong', 'boutique', 'Boutique Nlongkak', 'Z1', 'Nlongkak', 3.8879, 11.5203),
    lieu('d-mokolo', 'domicile', '', 'Z3', 'Mokolo', 3.8768, 11.5072),
    lieu('d-obili', 'domicile', '', 'Z2', 'Obili', 3.8555, 11.495),
    lieu('d-nlong', 'domicile', '', 'Z1', 'Nlongkak', 3.8893, 11.5231),
  ].map((l) => [l.id, l]),
)

// ---------- Paquets ----------

interface ArretDemo {
  lieu: string
  sens: Arret['sens']
  colis: number
  c4?: boolean
  fait: Instant | null
}
export interface ColisDemo {
  etiquette: string
  arret: number
  classe: ClasseColis
  valeur: Francs
  fragile?: boolean
  payable?: boolean
}
export interface PaquetDemo {
  id: string
  genre: GenrePaquet
  commandes: number
  statut: StatutPaquet
  zone: CodeZone
  relais: string | null
  premierRang: boolean
  publieLe: Instant
  accepterAvant: Instant
  prioriteJusqua: Instant | null
  heureLimite: Instant
  prisAilleursLe: Instant | null
  accepteLe: Instant | null
  acceptePar: string | null
  ramassageAvant: Instant | null
  distanceKm: number
  dureeMin: number
  modifie: boolean
  arrets: ArretDemo[]
  colis: ColisDemo[]
  lignes: LigneRemuneration[]
  versionGrille: string
  journal: { le: Instant; quoi: string; par: string | null }[]
  // Mission (dès l'affectation)
  livreurId: string | null
  affecteLe: Instant | null
  creneau: { debut: Instant; fin: Instant } | null
  depart: Instant | null
  eta: Instant | null
  horsConnexionDepuis: Instant | null
  incidentId: string | null
  deposeLe: Instant | null
  closLe: Instant | null
  appels: Appel[]
  relances: { le: Instant; sujet: string }[]
  transfert: { deId: string; versId: string; demandeLe: Instant; termineLe: Instant } | null // ENT-P14R-03
}

const D = PARAMETRES.delais
function paquet(p: Partial<PaquetDemo> & Pick<PaquetDemo, 'id' | 'genre' | 'zone' | 'arrets' | 'colis' | 'publieLe' | 'heureLimite' | 'distanceKm' | 'dureeMin'>): PaquetDemo {
  const z1 = p.genre === 'domicile' && p.arrets.some((a) => LIEUX[a.lieu].zone === 'Z1')
  const premier = LIEUX[p.arrets[0].lieu]
  const horsZone = p.genre === 'tournee_relais' && !!p.relais && premier.zone !== LIEUX[p.relais].zone
  return {
    commandes: p.genre === 'domicile' ? 1 : p.colis.length,
    statut: 'publie',
    relais: null,
    premierRang: false,
    accepterAvant: p.publieLe + D.acceptationMin * MINUTE,
    prioriteJusqua: p.premierRang ? p.publieLe + D.fenetrePrioriteMin * MINUTE : null,
    prisAilleursLe: null,
    accepteLe: null,
    acceptePar: null,
    ramassageAvant: null,
    modifie: false,
    lignes: remunerer(p.genre, p.colis.map((x) => x.classe), { horsZone, z1 }),
    versionGrille: 'v1',
    journal: [{ le: p.publieLe, quoi: 'publie', par: null }],
    livreurId: null,
    affecteLe: null,
    creneau: null,
    depart: null,
    eta: null,
    horsConnexionDepuis: null,
    incidentId: null,
    deposeLe: null,
    closLe: null,
    appels: [],
    relances: [],
    transfert: null,
    ...p,
  } as PaquetDemo
}
/**
 * Paquet publié pour un colis « prêt » chez un vendeur (pont commun : « suborder.ready ») : tournée relais vers le relais
 * de la zone, ou course à domicile (le quartier seul, jamais l'adresse). Publié tout de suite (heure limite proche : un
 * seul colis), au premier rang de la zone ; mêmes règles de visibilité, d'acceptation et de prix que les autres.
 */
export function paquetDeCommande(o: { id: string; colis: string; classe: ClasseColis; valeur: Francs; lieu: string; relais: string | null; quartier: string | null; le: Instant }): PaquetDemo {
  const relais = o.relais ? (Object.values(LIEUX).find((l) => l.type === 'relais' && l.zone === LIEUX[o.lieu]?.zone)?.id ?? 'r-z1') : null
  const domicile = Object.values(LIEUX).find((l) => l.type === 'domicile' && l.quartier === o.quartier)?.id ?? 'd-nlongkak'
  // R54 (BV-DEV-05) : chaque colis est payé au plus son plafond d'achat (relais : livraison du format − part du relais
  // − jour 1, ÷ 1,1 à la dizaine inférieure ; domicile : 1 500 F au moins faute de distance) ; BelivaY ne perd jamais.
  const p = paquetBrut(o, relais, domicile)
  // Un XL ou un hors gabarit n'est jamais livré au relais (R10) : un tel événement reçu du pont est payé comme un C2.
  const fmt = FORMAT_DE_CLASSE[o.classe]
  const max = relais ? plafondRelais(fmt === 'XL' || fmt === 'HG' ? 'C2' : fmt) : plafondDomicile(reglage('niv_centre'))
  p.lignes = p.lignes.map((l) => (l.montant > l.quantite * max ? { ...l, montant: l.quantite * max, ecrete: true } : l))
  return p
}
function paquetBrut(o: { id: string; colis: string; classe: ClasseColis; valeur: Francs; lieu: string; le: Instant }, relais: string | null, domicile: string): PaquetDemo {
  return paquet({
    id: o.id,
    genre: relais ? 'tournee_relais' : 'domicile',
    zone: LIEUX[o.lieu]?.zone ?? 'Z1',
    relais,
    premierRang: true,
    publieLe: o.le,
    heureLimite: o.le + 5 * 60 * MINUTE,
    distanceKm: 1.4,
    dureeMin: 30,
    arrets: [
      { lieu: o.lieu, sens: 'ramassage', colis: 1, fait: null },
      { lieu: relais ?? domicile, sens: relais ? 'depot' : 'remise', colis: 1, fait: null },
    ],
    colis: [{ etiquette: o.colis, arret: 0, classe: o.classe, valeur: o.valeur }],
  })
}
/** Course de retour (pont commun : « return.dropped ») : collecte au relais où le client a déposé l'article, remise à la
 * boutique ; publiée tout de suite, mêmes règles d'acceptation et de prix que les autres. */
export function paquetDeRetour(o: { id: string; colis: string; classe: ClasseColis; relais: string; boutique: string; le: Instant }): PaquetDemo {
  return paquet({
    id: o.id,
    genre: 'retour',
    zone: LIEUX[o.relais]?.zone ?? 'Z1',
    relais: o.relais,
    premierRang: true,
    publieLe: o.le,
    heureLimite: o.le + 5 * 60 * MINUTE,
    distanceKm: 1.4,
    dureeMin: 30,
    arrets: [
      { lieu: o.relais, sens: 'ramassage', colis: 1, fait: null },
      { lieu: o.boutique, sens: 'remise', colis: 1, fait: null },
    ],
    colis: [{ etiquette: o.colis, arret: 0, classe: o.classe, valeur: 0 }],
  })
}
const c = (n: number, arret: number, classe: ClasseColis, valeur: Francs, o: Partial<ColisDemo> = {}): ColisDemo => ({ etiquette: `BV 24 ${8100 + n}`, arret, classe, valeur, ...o })
/** Accepté, affecté : journal du paquet écrit comme le serveur. */
function accepte(p: PaquetDemo, le: Instant, par: string): PaquetDemo {
  p.statut = 'accepte'
  p.accepteLe = le
  p.acceptePar = par
  p.ramassageAvant = le + D.ramassageMin * MINUTE
  p.journal.push({ le, quoi: 'accepte', par })
  return p
}
function affecte(p: PaquetDemo, le: Instant, livreurId: string, par: string, creneau: { debut: Instant; fin: Instant } | null): PaquetDemo {
  p.statut = 'affecte'
  p.livreurId = livreurId
  p.affecteLe = le
  p.creneau = creneau
  p.journal.push({ le, quoi: 'affecte', par })
  return p
}
const hier = (h: number, m = 0) => T(-JOUR / MINUTE + (h - 14) * 60 + (m - 5))
const aujourdhui = (h: number, m = 0) => T((h - 14) * 60 + (m - 5))

function monde(): PaquetDemo[] {
  const gaelle = 'Gaëlle Wankeu'
  const serge = 'Serge Mbarga'
  // Publiés (ENT-P10)
  const publies = [
    paquet({
      id: 'PQ-Z3-261013-009', genre: 'tournee_relais', zone: 'Z3', relais: 'r-z3', premierRang: true, publieLe: T(-4), heureLimite: T(250), distanceKm: 6.8, dureeMin: 85,
      arrets: [{ lieu: 'b-ngono', sens: 'ramassage', colis: 4, fait: null }, { lieu: 'b-elobi', sens: 'ramassage', colis: 2, c4: true, fait: null }, { lieu: 'r-z3', sens: 'depot', colis: 6, fait: null }],
      colis: [c(41, 0, 'S', 18_000), c(42, 0, 'S', 12_500), c(43, 0, 'M', 42_000, { fragile: true }), c(44, 0, 'S', 9_000), c(45, 1, 'M', 26_000), c(46, 1, 'S', 11_000)],
    }),
    paquet({
      id: 'PQ-Z2-261013-016', genre: 'tournee_relais', zone: 'Z2', relais: 'r-z2', publieLe: T(-11), heureLimite: T(215), distanceKm: 9.4, dureeMin: 110,
      arrets: [{ lieu: 'b-tonton', sens: 'ramassage', colis: 5, fait: null }, { lieu: 'b-bazin', sens: 'ramassage', colis: 3, fait: null }, { lieu: 'r-z2', sens: 'depot', colis: 8, fait: null }],
      colis: [c(51, 0, 'S', 15_000), c(52, 0, 'S', 8_500), c(53, 0, 'M', 31_000), c(54, 0, 'S', 12_000), c(55, 0, 'L', 68_000), c(56, 1, 'S', 22_000), c(57, 1, 'M', 47_000), c(58, 1, 'S', 14_000)],
    }),
    paquet({
      id: 'PQ-Z1-261013-004', genre: 'domicile', zone: 'Z1', premierRang: true, publieLe: T(-2), heureLimite: T(270), distanceKm: 3.1, dureeMin: 40,
      arrets: [{ lieu: 'b-tech', sens: 'ramassage', colis: 1, fait: null }, { lieu: 'd-bastos', sens: 'remise', colis: 1, fait: null }],
      colis: [c(61, 0, 'M', 62_000, { fragile: true })],
    }),
    paquet({
      id: 'PQ-Z6-261013-011', genre: 'domicile', zone: 'Z6', publieLe: T(-7), heureLimite: T(240), distanceKm: 2.6, dureeMin: 35, prisAilleursLe: T(6),
      arrets: [{ lieu: 'b-etoug', sens: 'ramassage', colis: 1, fait: null }, { lieu: 'd-biyem', sens: 'remise', colis: 1, fait: null }],
      colis: [c(66, 0, 'S', 18_000, { payable: true })],
    }),
    paquet({
      id: 'PQ-Z3-261013-012', genre: 'retour', zone: 'Z3', premierRang: true, publieLe: T(-1), heureLimite: T(290), distanceKm: 1.1, dureeMin: 25,
      arrets: [{ lieu: 'r-z3', sens: 'ramassage', colis: 2, fait: null }, { lieu: 'b-ngono', sens: 'remise', colis: 2, fait: null }],
      colis: [c(71, 0, 'S', 15_000), c(72, 0, 'M', 22_000)],
    }),
    // Jamais envoyés à Yafé : un colis au-dessus du plafond du palier Nouveau (ENT-PAL-01), un paquet déjà pris.
    paquet({
      id: 'PQ-Z1-261013-005', genre: 'domicile', zone: 'Z1', publieLe: T(-3), heureLimite: T(260), distanceKm: 2.2, dureeMin: 30,
      arrets: [{ lieu: 'b-tech', sens: 'ramassage', colis: 1, fait: null }, { lieu: 'd-bastos', sens: 'remise', colis: 1, fait: null }],
      colis: [c(62, 0, 'M', 350_000)],
    }),
    paquet({
      id: 'PQ-Z2-261013-010', genre: 'tournee_relais', zone: 'Z2', relais: 'r-z2', publieLe: T(-9), heureLimite: T(200), distanceKm: 5.2, dureeMin: 70, statut: 'pris',
      arrets: [{ lieu: 'b-ngoa', sens: 'ramassage', colis: 5, fait: null }, { lieu: 'r-z2', sens: 'depot', colis: 5, fait: null }],
      colis: [c(81, 0, 'S', 9_000), c(82, 0, 'S', 7_000), c(83, 0, 'S', 12_000), c(84, 0, 'M', 19_000), c(85, 0, 'S', 6_000)],
    }),
  ]
  // Accepté, pas encore affecté (alerte « non affecté » passée : ENT-P12R-01)
  const aAffecter = accepte(
    paquet({
      id: 'PQ-Z3-261013-007', genre: 'tournee_relais', zone: 'Z3', relais: 'r-z3', publieLe: T(-26), heureLimite: T(230), distanceKm: 5.9, dureeMin: 75,
      arrets: [{ lieu: 'b-elobi', sens: 'ramassage', colis: 3, fait: null }, { lieu: 'b-ngono', sens: 'ramassage', colis: 2, fait: null }, { lieu: 'r-z3', sens: 'depot', colis: 5, fait: null }],
      colis: [c(31, 0, 'S', 14_000), c(32, 0, 'S', 9_500), c(33, 0, 'M', 27_000), c(34, 1, 'S', 16_000), c(35, 1, 'S', 7_500)],
    }),
    T(-18),
    serge,
  )
  // Affecté, pas encore parti : créneau annoncé au vendeur, position affichée au départ (ENT-P13R-01)
  const affecteNonParti = affecte(
    accepte(
      paquet({
        id: 'PQ-Z6-261013-008', genre: 'domicile', zone: 'Z6', publieLe: T(-19), heureLimite: T(225), distanceKm: 2.4, dureeMin: 35,
        arrets: [{ lieu: 'b-bazin', sens: 'ramassage', colis: 1, fait: null }, { lieu: 'd-etoug', sens: 'remise', colis: 1, fait: null }],
        colis: [c(21, 0, 'S', 24_000)],
      }),
      T(-14),
      gaelle,
    ),
    T(-8),
    'l-ines',
    gaelle,
    { debut: aujourdhui(13, 30), fin: aujourdhui(14, 30) },
  )
  // En cours : retard prévisible (marge négative), incident bloquant, livreur hors connexion
  const enRetard = affecte(
    accepte(
      paquet({
        id: 'PQ-Z3-261013-001', genre: 'tournee_relais', zone: 'Z3', relais: 'r-z3', publieLe: T(-235), heureLimite: T(10), distanceKm: 7.1, dureeMin: 90,
        arrets: [{ lieu: 'b-ngono', sens: 'ramassage', colis: 3, fait: T(-70) }, { lieu: 'b-elobi', sens: 'ramassage', colis: 3, fait: T(-48) }, { lieu: 'r-z3', sens: 'depot', colis: 6, fait: null }],
        colis: [c(1, 0, 'S', 11_000), c(2, 0, 'S', 16_500), c(3, 0, 'M', 38_000), c(4, 1, 'S', 8_000), c(5, 1, 'M', 29_000), c(6, 1, 'S', 13_000)],
      }),
      T(-228),
      serge,
    ),
    T(-224),
    'l-junior',
    serge,
    { debut: aujourdhui(11, 30), fin: aujourdhui(12, 30) },
  )
  Object.assign(enRetard, { statut: 'en_cours', depart: T(-95), eta: T(18) })
  enRetard.journal.push({ le: T(-95), quoi: 'depart', par: null }, { le: T(-70), quoi: 'ramasse', par: null }, { le: T(-48), quoi: 'ramasse', par: null })
  const incident = affecte(
    accepte(
      paquet({
        id: 'PQ-Z1-261013-002', genre: 'tournee_relais', zone: 'Z1', relais: 'r-z1', publieLe: T(-120), heureLimite: T(150), distanceKm: 4.8, dureeMin: 65,
        arrets: [{ lieu: 'b-deco', sens: 'ramassage', colis: 2, fait: T(-30) }, { lieu: 'b-tech', sens: 'ramassage', colis: 2, fait: null }, { lieu: 'r-z1', sens: 'depot', colis: 4, fait: null }],
        colis: [c(11, 0, 'S', 21_000), c(12, 0, 'M', 34_000), c(13, 1, 'S', 45_000, { fragile: true }), c(14, 1, 'S', 17_000)],
      }),
      T(-112),
      gaelle,
    ),
    T(-105),
    'l-hugo',
    gaelle,
    { debut: aujourdhui(12, 0), fin: aujourdhui(13, 0) },
  )
  Object.assign(incident, { statut: 'incident', depart: T(-50), eta: null, incidentId: 'IN-121' })
  incident.journal.push({ le: T(-50), quoi: 'depart', par: null }, { le: T(-30), quoi: 'ramasse', par: null }, { le: T(-6), quoi: 'incident', par: null })
  const horsConnexion = affecte(
    accepte(
      paquet({
        id: 'PQ-Z2-261013-003', genre: 'tournee_relais', zone: 'Z2', relais: 'r-z2', publieLe: T(-150), heureLimite: T(95), distanceKm: 8.2, dureeMin: 100,
        arrets: [{ lieu: 'b-tonton', sens: 'ramassage', colis: 4, fait: T(-62) }, { lieu: 'b-ngoa', sens: 'ramassage', colis: 3, fait: T(-31) }, { lieu: 'r-z2', sens: 'depot', colis: 7, fait: null }],
        colis: [c(91, 0, 'S', 9_000), c(92, 0, 'S', 14_000), c(93, 0, 'M', 23_000), c(94, 0, 'S', 7_000), c(95, 1, 'S', 12_000), c(96, 1, 'L', 55_000), c(97, 1, 'S', 6_500)],
      }),
      T(-141),
      serge,
    ),
    T(-136),
    'l-paul',
    serge,
    { debut: aujourdhui(11, 30), fin: aujourdhui(12, 30) },
  )
  Object.assign(horsConnexion, { statut: 'en_cours', depart: T(-80), eta: T(20), horsConnexionDepuis: T(-14) })
  horsConnexion.journal.push({ le: T(-80), quoi: 'depart', par: null }, { le: T(-62), quoi: 'ramasse', par: null }, { le: T(-31), quoi: 'ramasse', par: null })
  // Déposés : remis ce midi (photo de remise encore en file), hier (une photo en file depuis hier : en revue)
  const depose = affecte(
    accepte(
      paquet({
        id: 'PQ-Z6-261013-002', genre: 'domicile', zone: 'Z6', publieLe: T(-130), heureLimite: T(160), distanceKm: 3.4, dureeMin: 45,
        arrets: [{ lieu: 'b-etoug', sens: 'ramassage', colis: 1, fait: T(-75) }, { lieu: 'd-biyem', sens: 'remise', colis: 1, fait: T(-20) }],
        colis: [c(25, 0, 'S', 16_000, { payable: true })],
      }),
      T(-124),
      gaelle,
    ),
    T(-118),
    'l-ines',
    gaelle,
    { debut: aujourdhui(11, 30), fin: aujourdhui(12, 30) },
  )
  Object.assign(depose, { statut: 'depose', depart: T(-90), deposeLe: T(-20) })
  depose.journal.push({ le: T(-75), quoi: 'ramasse', par: null }, { le: T(-20), quoi: 'remis', par: null })
  const deposeHier = affecte(
    accepte(
      paquet({
        id: 'PQ-Z3-261012-009', genre: 'tournee_relais', zone: 'Z3', relais: 'r-z3', publieLe: hier(13, 30), heureLimite: hier(18, 10), distanceKm: 6.1, dureeMin: 80,
        arrets: [{ lieu: 'b-ngono', sens: 'ramassage', colis: 4, fait: hier(14, 35) }, { lieu: 'b-elobi', sens: 'ramassage', colis: 2, fait: hier(15, 2) }, { lieu: 'r-z3', sens: 'depot', colis: 6, fait: hier(15, 41) }],
        colis: [c(901, 0, 'S', 10_000), c(902, 0, 'S', 7_000), c(903, 0, 'M', 19_000), c(904, 0, 'S', 12_000), c(905, 1, 'S', 8_000), c(906, 1, 'M', 25_000)],
      }),
      hier(13, 36),
      serge,
    ),
    hier(13, 41),
    'l-brice',
    serge,
    { debut: hier(14, 30), fin: hier(15, 30) },
  )
  Object.assign(deposeHier, { statut: 'depose', depart: hier(14, 12), deposeLe: hier(15, 41) })
  // Clos (preuves complètes) : payés au vendredi qui suit (ENT-REM-01)
  const clos = (p: PaquetDemo, l: string, depart: Instant, fin: Instant) => {
    affecte(accepte(p, p.publieLe + 6 * MINUTE, gaelle), p.publieLe + 10 * MINUTE, l, gaelle, null)
    p.arrets.forEach((a, i) => (a.fait = depart + ((fin - depart) * (i + 1)) / p.arrets.length))
    p.journal.push({ le: fin + 6 * MINUTE, quoi: 'clos', par: null })
    return Object.assign(p, { statut: 'clos', depart, deposeLe: fin, closLe: fin + 6 * MINUTE })
  }
  const closHier = clos(
    paquet({
      id: 'PQ-Z2-261012-014', genre: 'tournee_relais', zone: 'Z2', relais: 'r-z2', publieLe: hier(12, 45), heureLimite: hier(16, 40), distanceKm: 9.0, dureeMin: 105,
      arrets: [{ lieu: 'b-tonton', sens: 'ramassage', colis: 5, fait: null }, { lieu: 'b-bazin', sens: 'ramassage', colis: 3, fait: null }, { lieu: 'r-z2', sens: 'depot', colis: 8, fait: null }],
      colis: [c(801, 0, 'S', 9_000), c(802, 0, 'S', 13_000), c(803, 0, 'S', 7_000), c(804, 0, 'S', 11_000), c(805, 0, 'S', 6_000), c(806, 1, 'S', 15_000), c(807, 1, 'S', 8_000), c(808, 1, 'S', 12_000)],
    }),
    'l-junior',
    hier(13, 36),
    hier(15, 6),
  )
  const closMatin = clos(
    paquet({
      id: 'PQ-Z6-261013-001', genre: 'domicile', zone: 'Z6', publieLe: aujourdhui(8, 5), heureLimite: aujourdhui(12, 50), distanceKm: 2.9, dureeMin: 38,
      arrets: [{ lieu: 'b-bazin', sens: 'ramassage', colis: 1, fait: null }, { lieu: 'd-biyem', sens: 'remise', colis: 1, fait: null }],
      colis: [c(701, 0, 'S', 21_000)],
    }),
    'l-paul',
    aujourdhui(8, 40),
    aujourdhui(9, 39),
  )
  // Serge A. (le livreur de l'espace livreur, même appareil : src/demo/pont.ts) : tournée du matin close, tournée en
  // cours, course de retour et course à domicile enchaînées, un paquet affecté puis modifié (repère précisé à 14 h 01).
  const col = (etiquette: string, arret: number, classe: ClasseColis, valeur: Francs, o: Partial<ColisDemo> = {}): ColisDemo => ({ etiquette, arret, classe, valeur, ...o })
  const sergeMatin = clos(
    paquet({
      id: 'PQ-Z1-261013-001', genre: 'tournee_relais', zone: 'Z1', relais: 'r-z1', publieLe: aujourdhui(7, 52), heureLimite: aujourdhui(12, 40), distanceKm: 7.8, dureeMin: 62,
      arrets: [{ lieu: 'b-mama', sens: 'ramassage', colis: 2, fait: null }, { lieu: 'b-bmode', sens: 'ramassage', colis: 2, fait: null }, { lieu: 'r-z1', sens: 'depot', colis: 4, fait: null }],
      colis: [col('BV 24 8200', 0, 'S', 12_000), col('BV 24 8201', 0, 'S', 9_500), col('BV 24 8202', 1, 'M', 27_000), col('BV 24 8203', 1, 'M', 31_000)],
    }),
    'l-serge',
    aujourdhui(8, 50),
    aujourdhui(11, 10),
  )
  const sergeTournee = affecte(
    accepte(
      paquet({
        id: 'PQ-Z1-261013-003', genre: 'tournee_relais', zone: 'Z1', relais: 'r-z1', publieLe: aujourdhui(12, 20), heureLimite: aujourdhui(16, 20), distanceKm: 9.6, dureeMin: 75,
        arrets: [{ lieu: 'b-tech', sens: 'ramassage', colis: 2, fait: aujourdhui(13, 30) }, { lieu: 'b-mngono', sens: 'ramassage', colis: 2, c4: true, fait: null }, { lieu: 'r-z1', sens: 'depot', colis: 4, fait: null }],
        colis: [col('BV 24 8204', 0, 'S', 18_000), col('BV 24 8205', 0, 'M', 64_000, { fragile: true }), col('BLV-00011-1', 1, 'S', 7_500, { payable: true }), col('BLV-00014-1', 1, 'M', 22_000)],
      }),
      aujourdhui(12, 31),
      gaelle,
    ),
    aujourdhui(12, 34),
    'l-serge',
    gaelle,
    { debut: aujourdhui(14, 0), fin: aujourdhui(14, 30) },
  )
  Object.assign(sergeTournee, { statut: 'en_cours', depart: aujourdhui(12, 52), eta: aujourdhui(15, 15) })
  sergeTournee.journal.push({ le: aujourdhui(12, 52), quoi: 'depart', par: null }, { le: aujourdhui(13, 30), quoi: 'ramasse', par: null })
  const sergeRetour = affecte(
    accepte(
      paquet({
        id: 'PQ-Z1-261013-006', genre: 'retour', zone: 'Z1', publieLe: aujourdhui(12, 22), heureLimite: aujourdhui(17, 30), distanceKm: 1.9, dureeMin: 20,
        arrets: [{ lieu: 'r-z1', sens: 'ramassage', colis: 2, fait: null }, { lieu: 'b-tech', sens: 'remise', colis: 2, fait: null }],
        colis: [col('BV 24 7741', 0, 'S', 9_000), col('BV 24 7740', 0, 'M', 24_000)],
      }),
      aujourdhui(12, 31),
      gaelle,
    ),
    aujourdhui(12, 34),
    'l-serge',
    gaelle,
    null,
  )
  const sergeDomicile = affecte(
    accepte(
      paquet({
        id: 'PQ-Z1-261013-008', genre: 'domicile', zone: 'Z1', publieLe: aujourdhui(13, 35), heureLimite: aujourdhui(18, 0), distanceKm: 3.2, dureeMin: 30,
        arrets: [{ lieu: 'b-deco', sens: 'ramassage', colis: 1, fait: null }, { lieu: 'd-bastos', sens: 'remise', colis: 1, fait: null }],
        colis: [col('BLV-00017-1', 0, 'M', 31_000)],
      }),
      aujourdhui(13, 40),
      gaelle,
    ),
    aujourdhui(13, 44),
    'l-serge',
    gaelle,
    { debut: aujourdhui(16, 15), fin: aujourdhui(16, 45) },
  )
  const sergeModifie = affecte(
    accepte(
      paquet({
        id: 'PQ-Z1-261013-007', genre: 'tournee_relais', zone: 'Z1', relais: 'r-z1', publieLe: aujourdhui(13, 45), heureLimite: aujourdhui(18, 45), distanceKm: 3.4, dureeMin: 35, modifie: true,
        arrets: [{ lieu: 'b-sapeur', sens: 'ramassage', colis: 2, fait: null }, { lieu: 'r-z1', sens: 'depot', colis: 2, fait: null }],
        colis: [col('BLV-00019-1', 0, 'L', 21_000), col('BLV-00020-1', 0, 'M', 15_500, { fragile: true, payable: true })],
      }),
      aujourdhui(13, 52),
      serge,
    ),
    aujourdhui(13, 58),
    'l-serge',
    serge,
    { debut: aujourdhui(17, 30), fin: aujourdhui(18, 0) },
  )
  sergeModifie.journal.push({ le: aujourdhui(14, 1), quoi: 'modifie', par: serge })
  // Journée de Serge à volume normal (même journée que l'espace livreur, src/demo/paquets.ts) : course de retour du
  // matin close, puis la tournée relais du soir et deux courses à domicile affectées pendant la tournée.
  const sergeRetourMatin = clos(
    paquet({
      id: 'PQ-Z1-261013-010', genre: 'retour', zone: 'Z1', publieLe: aujourdhui(10, 48), heureLimite: aujourdhui(17, 0), distanceKm: 2.4, dureeMin: 25,
      arrets: [{ lieu: 'r-z1', sens: 'ramassage', colis: 1, fait: null }, { lieu: 'b-mama', sens: 'remise', colis: 1, fait: null }],
      colis: [col('BV 24 7702', 0, 'S', 14_000)],
    }),
    'l-serge',
    aujourdhui(11, 20),
    aujourdhui(12, 10),
  )
  const sergeSoir = affecte(
    accepte(
      paquet({
        id: 'PQ-Z1-261013-011', genre: 'tournee_relais', zone: 'Z1', relais: 'r-z1', publieLe: aujourdhui(13, 14), heureLimite: aujourdhui(18, 45), distanceKm: 6.1, dureeMin: 70,
        arrets: [
          { lieu: 'b-pharma', sens: 'ramassage', colis: 2, fait: null },
          { lieu: 'b-bmode', sens: 'ramassage', colis: 1, fait: null },
          { lieu: 'b-tontonnl', sens: 'ramassage', colis: 1, fait: null },
          { lieu: 'b-mama', sens: 'ramassage', colis: 1, fait: null },
          { lieu: 'b-electro', sens: 'ramassage', colis: 1, fait: null },
          { lieu: 'r-z1', sens: 'depot', colis: 6, fait: null },
        ],
        colis: [col('BLV-00021-1', 0, 'S', 8_500), col('BLV-00021-2', 0, 'S', 6_000), col('BLV-00022-1', 1, 'M', 19_000), col('BLV-00023-1', 2, 'M', 42_000, { fragile: true }), col('BLV-00024-1', 3, 'S', 11_000, { payable: true }), col('BLV-00025-1', 4, 'M', 36_000)],
      }),
      aujourdhui(13, 20),
      gaelle,
    ),
    aujourdhui(13, 49),
    'l-serge',
    gaelle,
    { debut: aujourdhui(17, 0), fin: aujourdhui(17, 20) },
  )
  const sergeDomicileEtoa = affecte(
    accepte(
      paquet({
        id: 'PQ-Z1-261013-012', genre: 'domicile', zone: 'Z1', publieLe: aujourdhui(13, 50), heureLimite: aujourdhui(19, 15), distanceKm: 3.6, dureeMin: 30,
        arrets: [{ lieu: 'b-sapeur', sens: 'ramassage', colis: 1, fait: null }, { lieu: 'd-etoa', sens: 'remise', colis: 1, fait: null }],
        colis: [col('BLV-00026-1', 0, 'M', 27_000)],
      }),
      aujourdhui(13, 55),
      gaelle,
    ),
    aujourdhui(14, 3),
    'l-serge',
    gaelle,
    { debut: aujourdhui(18, 30), fin: aujourdhui(18, 50) },
  )
  const sergeDomicileNlongkak = affecte(
    accepte(
      paquet({
        id: 'PQ-Z1-261013-013', genre: 'domicile', zone: 'Z1', publieLe: aujourdhui(13, 52), heureLimite: aujourdhui(19, 45), distanceKm: 2.9, dureeMin: 30,
        arrets: [{ lieu: 'b-tech', sens: 'ramassage', colis: 1, fait: null }, { lieu: 'd-nlongkak', sens: 'remise', colis: 1, fait: null }],
        colis: [col('BLV-00027-1', 0, 'S', 16_500, { payable: true })],
      }),
      aujourdhui(13, 58),
      gaelle,
    ),
    aujourdhui(14, 4),
    'l-serge',
    gaelle,
    { debut: aujourdhui(18, 50), fin: aujourdhui(19, 10) },
  )
  return [...publies, aAffecter, affecteNonParti, enRetard, incident, horsConnexion, depose, deposeHier, closHier, closMatin, sergeMatin, sergeRetourMatin, sergeTournee, sergeRetour, sergeDomicile, sergeModifie, sergeSoir, sergeDomicileEtoa, sergeDomicileNlongkak, ...trafic(clos)]
}

// ---------- Trafic normal du reste de la flotte (aujourd'hui et hier) ----------
// Tournées et courses à domicile des autres livreurs, écrites par un petit générateur (pas de hasard : même jeu à chaque
// chargement) : clos ce matin et hier, en cours, affectés pour l'après-midi, déposés ; plus des paquets publiés et
// acceptés à affecter. Mêmes règles que les paquets écrits à la main (rémunération par la grille, délais du registre).
const BOUTIQUES: Record<CodeZone, string[]> = { Z1: ['b-tech', 'b-deco', 'b-nlong', 'b-bmode'], Z3: ['b-ngono', 'b-elobi', 'b-quinc'], Z2: ['b-tonton', 'b-ngoa', 'b-mercerie'], Z6: ['b-bazin', 'b-etoug', 'b-cosme'] }
const DOMICILES: Record<CodeZone, string> = { Z1: 'd-nlong', Z3: 'd-mokolo', Z2: 'd-obili', Z6: 'd-biyem' }
const RELAIS: Record<CodeZone, string> = { Z1: 'r-z1', Z3: 'r-z3', Z2: 'r-z2', Z6: 'r-z6' }
const CLASSES: ClasseColis[] = ['S', 'S', 'M', 'S', 'L', 'S', 'M']

/** Ce que fait chaque livreur : [zone, état, heure de départ (heure locale), jour (0 aujourd'hui, -1 hier), domicile ?]. */
type Etat = 'clos' | 'en_cours' | 'affecte' | 'depose'
const PLAN: [string, CodeZone, Etat, number, 0 | -1, boolean][] = [
  ['l-aime', 'Z3', 'clos', 8.5, 0, false], ['l-aime', 'Z3', 'clos', 11, 0, true], ['l-aime', 'Z3', 'en_cours', 13.2, 0, false],
  ['l-carine', 'Z2', 'clos', 8, 0, false], ['l-carine', 'Z6', 'clos', 10.5, 0, true], ['l-carine', 'Z6', 'en_cours', 13, 0, false], ['l-carine', 'Z2', 'affecte', 16, 0, true],
  ['l-david', 'Z3', 'clos', 9, 0, false], ['l-david', 'Z2', 'en_cours', 12.4, 0, false],
  ['l-estelle', 'Z1', 'clos', 8.2, 0, true], ['l-estelle', 'Z1', 'clos', 10, 0, false], ['l-estelle', 'Z1', 'en_cours', 13.6, 0, true],
  ['l-fabrice', 'Z6', 'clos', 9.5, 0, false], ['l-fabrice', 'Z1', 'depose', 12, 0, true], ['l-fabrice', 'Z1', 'affecte', 15.5, 0, false],
  ['l-gilles', 'Z6', 'clos', 8, 0, false], ['l-gilles', 'Z6', 'clos', 10.2, 0, true], ['l-gilles', 'Z6', 'depose', 12.3, 0, false], ['l-gilles', 'Z6', 'en_cours', 13.5, 0, true],
  ['l-josiane', 'Z3', 'clos', 8.4, 0, false], ['l-josiane', 'Z3', 'clos', 10.6, 0, true],
  ['l-kevin', 'Z2', 'clos', 9.1, 0, true], ['l-kevin', 'Z2', 'en_cours', 12.8, 0, false],
  ['l-olivier', 'Z2', 'clos', 8.7, 0, false], ['l-olivier', 'Z3', 'affecte', 15, 0, false],
  ['l-rose', 'Z1', 'clos', 9, -1, false], ['l-rose', 'Z1', 'clos', 14, -1, true],
  ['l-landry', 'Z6', 'clos', 8.5, -1, false], ['l-landry', 'Z6', 'clos', 13, -1, false],
  ...(['l-aime', 'l-carine', 'l-david', 'l-estelle', 'l-fabrice', 'l-gilles', 'l-josiane', 'l-kevin', 'l-olivier'] as const).flatMap((l, i): [string, CodeZone, Etat, number, 0 | -1, boolean][] => [
    [l, (['Z3', 'Z2', 'Z3', 'Z1', 'Z6', 'Z6', 'Z3', 'Z2', 'Z2'] as CodeZone[])[i], 'clos', 8.5 + (i % 3), -1, false],
    [l, (['Z3', 'Z6', 'Z2', 'Z1', 'Z1', 'Z6', 'Z3', 'Z2', 'Z3'] as CodeZone[])[i], 'clos', 13 + (i % 4), -1, i % 2 === 0],
  ]),
]
/** Publiés en plus (zones et heures variées) et acceptés à affecter. */
const PUBLIES: [CodeZone, number, boolean][] = [['Z6', -6, false], ['Z1', -9, true], ['Z2', -3, false], ['Z3', -12, true]]
const A_AFFECTER: [CodeZone, number][] = [['Z2', -16], ['Z6', -21]]

function trafic(clos: (p: PaquetDemo, l: string, depart: Instant, fin: Instant) => PaquetDemo): PaquetDemo[] {
  const out: PaquetDemo[] = []
  const rang: Record<string, number> = {}
  let etiquette = 3000
  const id = (zone: CodeZone, jour: 0 | -1) => {
    const k = zone + jour
    rang[k] = (rang[k] ?? 20) + 1
    return `PQ-${zone}-26101${jour === 0 ? 3 : 2}-${String(rang[k]).padStart(3, '0')}`
  }
  const corps = (zone: CodeZone, domicile: boolean, k: number, publie: Instant): PaquetDemo => {
    const b1 = BOUTIQUES[zone][k % BOUTIQUES[zone].length]
    const b2 = BOUTIQUES[zone][(k + 1) % BOUTIQUES[zone].length]
    if (domicile) {
      const cl = CLASSES[k % CLASSES.length] === 'L' ? 'M' : CLASSES[k % CLASSES.length]
      return paquet({
        id: '', genre: 'domicile', zone, publieLe: publie, heureLimite: publie + 5 * 60 * MINUTE, distanceKm: 2 + (k % 4) * 0.7, dureeMin: 30 + (k % 3) * 5,
        arrets: [{ lieu: b1, sens: 'ramassage', colis: 1, fait: null }, { lieu: DOMICILES[zone], sens: 'remise', colis: 1, fait: null }],
        colis: [c(etiquette++, 0, cl, 9_000 + (k % 9) * 2_500, { payable: k % 4 === 0 })],
      })
    }
    const n1 = 2 + (k % 3)
    const n2 = 1 + (k % 2)
    const colis = [...Array.from({ length: n1 }, (_, i) => c(etiquette++, 0, CLASSES[(k + i) % CLASSES.length], 7_000 + ((k + i) % 8) * 3_000)), ...Array.from({ length: n2 }, (_, i) => c(etiquette++, 1, CLASSES[(k + i + 3) % CLASSES.length], 6_500 + ((k + i) % 6) * 2_800))]
    return paquet({
      id: '', genre: 'tournee_relais', zone, relais: RELAIS[zone], publieLe: publie, heureLimite: publie + 5 * 60 * MINUTE, distanceKm: 4.5 + (k % 5) * 0.9, dureeMin: 55 + (k % 4) * 10,
      arrets: [{ lieu: b1, sens: 'ramassage', colis: n1, fait: null }, { lieu: b2, sens: 'ramassage', colis: n2, fait: null }, { lieu: RELAIS[zone], sens: 'depot', colis: n1 + n2, fait: null }],
      colis,
    })
  }
  const heure = (jour: 0 | -1, h: number) => (jour === 0 ? aujourdhui : hier)(Math.floor(h), Math.round((h % 1) * 60))
  PLAN.forEach(([l, zone, etat, h, jour, domicile], k) => {
    const depart = heure(jour, h)
    const p = corps(zone, domicile, k, depart - 50 * MINUTE)
    p.id = id(zone, jour)
    const duree = p.dureeMin * MINUTE
    if (etat === 'clos') return void out.push(clos(p, l, depart, depart + duree))
    accepte(p, p.publieLe + 5 * MINUTE, k % 2 ? 'Serge Mbarga' : 'Gaëlle Wankeu')
    affecte(p, p.publieLe + 9 * MINUTE, l, k % 2 ? 'Serge Mbarga' : 'Gaëlle Wankeu', etat === 'affecte' ? { debut: depart, fin: depart + 30 * MINUTE } : null)
    if (etat === 'affecte') return void out.push(p)
    p.depart = depart
    p.journal.push({ le: depart, quoi: 'depart', par: null })
    const ecoule = T(0) - depart
    const nbFaits = etat === 'depose' ? p.arrets.length : Math.min(p.arrets.length - 1, Math.floor((ecoule / duree) * p.arrets.length))
    p.arrets.forEach((a, i) => {
      if (i < nbFaits) {
        a.fait = depart + ((i + 1) * duree) / p.arrets.length
        p.journal.push({ le: a.fait, quoi: a.sens === 'ramassage' ? 'ramasse' : 'remis', par: null })
      }
    })
    if (etat === 'depose') Object.assign(p, { statut: 'depose', deposeLe: depart + duree })
    // En cours : une tournée sur trois prévoit d'arriver après sa promesse (retard prévisible signalé).
    else Object.assign(p, { statut: 'en_cours', eta: depart + duree + (k % 3 === 0 ? 40 * MINUTE : 5 * MINUTE) })
    if (etat === 'en_cours' && k % 3 === 0) p.heureLimite = depart + duree + 20 * MINUTE
    // Incident bloquant en attente de décision (incidents.ts : IN-110).
    if (p.id === 'PQ-Z6-261013-027') {
      Object.assign(p, { statut: 'incident', eta: null, incidentId: 'IN-110' })
      p.journal.push({ le: T(-3), quoi: 'incident', par: null })
    }
    out.push(p)
  })
  PUBLIES.forEach(([zone, il, domicile], k) => {
    const p = corps(zone, domicile, 40 + k, T(il))
    p.id = id(zone, 0)
    p.premierRang = k % 2 === 0
    p.prioriteJusqua = p.premierRang ? p.publieLe + D.fenetrePrioriteMin * MINUTE : null
    out.push(p)
  })
  A_AFFECTER.forEach(([zone, il], k) => {
    const p = corps(zone, false, 50 + k, T(il - 10))
    p.id = id(zone, 0)
    out.push(accepte(p, T(il), 'Gaëlle Wankeu'))
  })
  return out
}

export const paquetsDemo = magasin('paquets', () => ({
  paquets: monde(),
  rendus: [T(-3 * 24 * 60)] as Instant[],
  alertes: {} as Record<string, Record<string, { son: boolean; notification: boolean }>>,
}))

/** Le pont avec l'espace livreur (src/demo/pont-livreur.ts, posé au chargement de la démonstration) : ce que le
 * livreur a fait est appliqué avant chaque lecture ; une affectation à Serge A. et une décision partent vers lui. */
export const PONT: {
  avantLecture: (() => void) | null
  affectation: ((p: PaquetDemo, avant: string | null, le: Instant) => void) | null
  decision: ((i: import('../donnees/domaines/incidents').Incident, decision: 'valide' | 'refuse', motif: string | null, par: string, le: Instant) => void) | null
} = { avantLecture: null, affectation: null, decision: null }
const lirePaquets = paquetsDemo.lire
paquetsDemo.lire = () => (PONT.avantLecture?.(), lirePaquets())

// ---------- Vues (ce que l'API renvoie à l'entreprise) ----------

export const nomUtilisateur = () => {
  const u = UTILISATEURS.find((x) => x.id === sessionDemo.lire().utilisateurId)!
  return `${u.prenom} ${u.nom}`
}
/** Statut à l'instant (pris ailleurs, délai d'acceptation passé : ENT-RG-R22). */
export function statutA(p: PaquetDemo, t: Instant): StatutPaquet {
  if (p.statut !== 'publie') return p.statut
  if (p.prisAilleursLe && p.prisAilleursLe <= t) return 'pris'
  if (p.accepterAvant <= t) return 'expire'
  return 'publie'
}
/** Le paquet est à Yafé (accepté, puis tout le cycle) : noms des boutiques, mission, preuves. */
export const aNous = (s: StatutPaquet) => !['publie', 'pris', 'expire', 'ignore', 'rendu'].includes(s)
/** Livreur qui tient le paquet à l'instant : après un transfert, le second dès le scan du dernier colis (ENT-P14R-03). */
export const idLivreur = (p: PaquetDemo, t = maintenant()): string | null => (p.transfert && p.transfert.termineLe <= t ? p.transfert.versId : p.livreurId)
export const livreurDe = (p: PaquetDemo, t = maintenant()): LivreurCourt | null => {
  const id = idLivreur(p, t)
  return id ? livreurCourt(id) : null
}
export const remuneration = (p: PaquetDemo) => p.lignes.reduce((s, l) => s + l.montant, 0)

export function vuePaquet(p: PaquetDemo, t = maintenant()): Paquet {
  const statut = statutA(p, t)
  const valeurs = p.colis.map((x) => x.valeur)
  const perdue = prioritePerdue(t)
  return {
    id: p.id,
    genre: p.genre,
    commandes: p.commandes,
    statut,
    zone: p.zone,
    relais: p.relais ? LIEUX[p.relais].nom : null,
    colis: { nombre: p.colis.length, classes: p.colis.map((x) => x.classe), valeurMax: Math.max(...valeurs), valeurTotale: valeurs.length > 1 ? valeurs.reduce((a, b) => a + b, 0) : null },
    remuneration: montantsVisibles() ? remuneration(p) : null,
    arrets: p.arrets.map((a, i): Arret => {
      const l = LIEUX[a.lieu]
      // Avant l'acceptation, ni nom de boutique ni adresse (ENT-P10R-02) ; un domicile n'a jamais de nom.
      const nom = l.type === 'domicile' ? null : l.type === 'boutique' && !aNous(statut) ? null : l.nom
      return { ordre: i + 1, type: l.type, sens: a.sens, nom, zone: l.zone, quartier: l.quartier, colis: a.colis, c4: !!a.c4 && aNous(statut), fait: a.fait }
    }),
    distanceKm: p.distanceKm,
    dureeMin: p.dureeMin,
    publieLe: p.publieLe,
    accepterAvant: p.accepterAvant,
    premierRang: p.premierRang && !perdue,
    prioriteJusqua: p.premierRang && !perdue ? p.prioriteJusqua : null,
    heureLimite: p.heureLimite,
    accepteLe: p.accepteLe,
    acceptePar: p.acceptePar,
    ramassageAvant: p.ramassageAvant,
    livreur: livreurDe(p, t),
    modifie: p.modifie,
  }
}

const FORMAT: Record<ClasseColis, string> = { S: 'S', M: 'M', L: 'L', XL: 'C2', HG: 'C2' }
export function vueDetail(p: PaquetDemo, t = maintenant()): DetailPaquet {
  const v = vuePaquet(p, t)
  const kit = new Map<string, number>()
  for (const x of p.colis) kit.set(FORMAT[x.classe], (kit.get(FORMAT[x.classe]) ?? 0) + 1)
  return {
    ...v,
    lignes: montantsVisibles() ? p.lignes : [],
    versionGrille: p.versionGrille,
    kit: [...kit].map(([format, nombre]) => ({ format, nombre })),
    colisDetail: p.colis.map((x) => ({ etiquette: aNous(v.statut) && p.arrets[x.arret].fait ? x.etiquette : null, arret: x.arret + 1, classe: x.classe, valeurDeclaree: x.valeur, fragile: !!x.fragile, payableAuRetrait: !!x.payable })),
    journal: p.journal,
    ramasse: p.arrets.some((a) => a.sens === 'ramassage' && a.fait),
  }
}

// ---------- Visibilité, capacité, priorité ----------

const D7 = REGLES.rendus
const rendusRecents = (t: Instant): Instant[] => paquetsDemo.lire().rendus.filter((r) => r > t - D7.surJours * JOUR)
/** Plus de « max » paquets rendus sur la fenêtre glissante : priorité perdue (ENT-PUB-03). */
export function prioritePerdue(t: Instant): Instant | null {
  const r = rendusRecents(t).sort((a, b) => a - b)
  return r.length > D7.max ? r[D7.max] + D7.perteJours * JOUR : null
}
function zoneOuverte(code: CodeZone) {
  const z = zonesDemo.lire().zones.find((x) => x.code === code)
  return !!z && z.declaree && z.etat === 'ouverte'
}
const sousLePlafond = (p: PaquetDemo) => p.colis.every((x) => sousPlafond(x.valeur, ENTREPRISE.palier))
/** Un paquet visible par Yafé : publié, dans une zone déclarée, chaque colis sous le plafond du palier (ENT-PAL-01). */
const visible = (p: PaquetDemo, t: Instant) => statutA(p, t) === 'publie' && zoneOuverte(p.zone) && sousLePlafond(p)

export const paquetsPublies = (): Paquet[] => {
  const t = maintenant()
  return paquetsDemo
    .lire()
    .paquets.filter((p) => visible(p, t))
    .sort((a, b) => a.accepterAvant - b.accepterAvant)
    .map((p) => vuePaquet(p, t))
}

export const trouverPaquet = (id: string) => paquetsDemo.lire().paquets.find((x) => x.id === id)

/** Paquet clos des jours passés (une prestation de prestations.ts, « PQ-<n> ») : reconstitué pour la lecture seule
 * (règlements, relevés, score et litiges y mènent), avec la même règle de rémunération. Jamais modifiable. */
export function paquetHistorique(id: string): PaquetDemo | undefined {
  const pr = prestations(new Set()).find((x) => x.paquetId === id)
  if (!pr) return undefined
  const zone = pr.zone
  const domicile = pr.genre === 'domicile'
  const fin = pr.jour
  const debut = fin - (domicile ? 35 : 70) * MINUTE
  const b = BOUTIQUES[zone][Number(id.replace(/\D/g, '')) % BOUTIQUES[zone].length]
  const colis = pr.classes.map((cl, i) => ({ etiquette: 'BV 23 ' + (5000 + ((Number(id.replace(/\D/g, '')) * 3) % 4000) + i), arret: 0, classe: cl, valeur: 8_000 + i * 2_500 }))
  const p = paquet({
    id,
    genre: domicile ? 'domicile' : 'tournee_relais',
    zone,
    relais: domicile ? null : RELAIS[zone],
    publieLe: debut - 40 * MINUTE,
    heureLimite: debut - 40 * MINUTE + 5 * 60 * MINUTE,
    distanceKm: domicile ? 2.8 : 5.6,
    dureeMin: domicile ? 35 : 70,
    arrets: [
      { lieu: b, sens: 'ramassage', colis: colis.length, fait: null },
      { lieu: domicile ? DOMICILES[zone] : RELAIS[zone], sens: domicile ? 'remise' : 'depot', colis: colis.length, fait: null },
    ],
    colis,
  })
  affecte(accepte(p, p.publieLe + 5 * MINUTE, 'Gaëlle Wankeu'), p.publieLe + 9 * MINUTE, pr.livreur.id, 'Gaëlle Wankeu', null)
  p.arrets.forEach((a, i) => (a.fait = debut + ((fin - debut) * (i + 1)) / p.arrets.length))
  if (pr.minoree) p.heureLimite = fin - 20 * MINUTE
  p.journal.push({ le: debut, quoi: 'depart', par: null }, { le: p.arrets[0].fait!, quoi: 'ramasse', par: null }, { le: fin, quoi: 'remis', par: null }, { le: fin + 6 * MINUTE, quoi: 'clos', par: null })
  return Object.assign(p, { statut: 'clos' as const, depart: debut, deposeLe: fin, closLe: fin + 6 * MINUTE })
}

export const demoPaquets: DomainePaquets = {
  async disponibles() {
    exiger(['proprietaire', 'repartiteur'], 'Paquets disponibles')
    const t = maintenant()
    return repondre({
      paquets: paquetsPublies(),
      capacites: zonesDemo
        .lire()
        .zones.filter((z) => z.declaree)
        .map((z) => ({ zone: z.code, nom: z.nom, capacite: z.capacite, acceptes: z.acceptes })),
      rendus7j: rendusRecents(t).length,
      prioritePerdueJusqua: prioritePerdue(t),
    })
  },
  async paquet(id) {
    exiger(['proprietaire', 'repartiteur'], 'Détail du paquet')
    const t = maintenant()
    const p = trouverPaquet(id) ?? paquetHistorique(id)
    // L'API ne renvoie jamais un paquet que Yafé ne doit pas voir (zone, palier : ENT-02-R25).
    if (!p || (!aNous(statutA(p, t)) && (!sousLePlafond(p) || !zoneOuverte(p.zone)))) return repondre(null)
    return repondre(vueDetail(p, t))
  },
  async accepter(id) {
    exiger(['proprietaire', 'repartiteur'], 'Accepter un paquet')
    const t = maintenant()
    const refus = (raison: RefusAcceptation) => repondre<Resultat<{ paquet: DetailPaquet }, RefusAcceptation>>({ ok: false, raison })
    const p = trouverPaquet(id)
    if (!p) return refus('pris')
    const s = statutA(p, t)
    if (s === 'expire') return refus('expire')
    if (s !== 'publie') return refus('pris')
    if (!sousLePlafond(p)) return refus('plafond')
    const z = zonesDemo.lire().zones.find((x) => x.code === p.zone)
    if (!z || z.capacite - z.acceptes < p.colis.length) return refus('capacite')
    if ((await eligibilite(p.id)).eligibles.length === 0) return refus('aucun_livreur')
    const par = nomUtilisateur()
    zonesDemo.ecrire((s) => void (s.zones.find((x) => x.code === p.zone)!.acceptes += p.colis.length))
    const e = paquetsDemo.ecrire((s) => void accepte(s.paquets.find((x) => x.id === id)!, t, par))
    return repondre<Resultat<{ paquet: DetailPaquet }, RefusAcceptation>>({ ok: true, paquet: vueDetail(e.paquets.find((x) => x.id === id)!, t) })
  },
  async ignorer(id) {
    exiger(['proprietaire', 'repartiteur'], 'Ignorer un paquet')
    const t = maintenant()
    const par = nomUtilisateur()
    paquetsDemo.ecrire((s) => {
      const q = s.paquets.find((x) => x.id === id)
      if (q && statutA(q, t) === 'publie') {
        q.statut = 'ignore'
        q.journal.push({ le: t, quoi: 'ignore', par })
      }
    })
    return repondre({ ok: true as const })
  },
  async rendre(id) {
    exiger(['proprietaire', 'repartiteur'], 'Rendre un paquet')
    const t = maintenant()
    const p = trouverPaquet(id)
    if (!p || !['accepte', 'affecte'].includes(p.statut)) return repondre({ ok: false as const, raison: 'statut' as const })
    if (p.arrets.some((a) => a.sens === 'ramassage' && a.fait)) return repondre({ ok: false as const, raison: 'deja_ramasse' as const })
    const par = nomUtilisateur()
    zonesDemo.ecrire((s) => {
      const z = s.zones.find((x) => x.code === p.zone)
      if (z) z.acceptes = Math.max(0, z.acceptes - p.colis.length)
    })
    paquetsDemo.ecrire((s) => {
      const q = s.paquets.find((x) => x.id === id)!
      Object.assign(q, { statut: 'rendu', livreurId: null, creneau: null })
      q.journal.push({ le: t, quoi: 'rendu', par })
      s.rendus.push(t)
    })
    return repondre({ ok: true as const })
  },
  async alertes() {
    const u = sessionDemo.lire().utilisateurId
    const a = paquetsDemo.lire().alertes[u] ?? {}
    // Son et notification activés par défaut pour chaque zone déclarée (son_par_zone).
    return repondre(zonesDemo.lire().zones.filter((z) => z.declaree).map((z) => ({ zone: z.code, son: a[z.code]?.son ?? true, notification: a[z.code]?.notification ?? true })))
  },
  async reglerAlerte(zone, quoi, on) {
    const u = sessionDemo.lire().utilisateurId
    paquetsDemo.ecrire((s) => {
      const a = (s.alertes[u] ??= {})
      a[zone] = { son: a[zone]?.son ?? true, notification: a[zone]?.notification ?? true, [quoi]: on }
    })
  },
}
