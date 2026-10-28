// DONNÉES DE DÉMONSTRATION — domaine « paquets » : les paquets de Serge le mardi 13 octobre.
// - PQ-Z1-261013-001 : tournée relais du matin, clos à 11 h 10 (4 colis déposés au Relais Bastos Carrefour) ;
// - PQ-Z1-261013-003 : tournée relais en cours (demo/tournee.ts : A1 Tech Bastos fait, A2 Maison Ngono en route, A3 dépôt
//   au Relais Bastos Carrefour, A4 départs du même relais) ;
// - PQ-Z1-261013-006 : course de retour enchaînée (A5 Tech Bastos : les colis repris en A4) ;
// - PQ-Z1-261013-008 : course à domicile enchaînée (A6 Afrik Déco, A7 remise à domicile ; un seul client, LIV-PAQ-02) ;
// - PQ-Z1-261013-010 : course de retour du matin, close à 12 h 10 (colis repris au relais, rendu à Chez Mama Ewondo) ;
// - PQ-Z1-261013-007 : affecté par Yafé Express à 13 h 58, modifié à 14 h 01 (repère précisé, à relire), kit insuffisant
//   (une pochette L manque) et à faire après les paquets de la tournée (heure limite plus tard) ;
// - PQ-Z1-261013-011 : tournée relais du soir (5 vendeurs, 6 colis, dépôt au Relais Bastos Carrefour) ;
// - PQ-Z1-261013-012 et -013 : deux courses à domicile du soir (Etoa-Meki, Nlongkak).
// Journée à volume de trafic normal : 9 paquets, 24 arrêts (5 faits le matin, 7 dans la tournée en cours, 12 à venir).
// Les mêmes paquets, colis et arrêts que l'espace entreprise (src/demo/pont.ts) et que la tournée (LIV-05 à LIV-07).
// Heure limite, durée estimée, dépôt prévu, marge et kit sont CALCULÉS ici comme le serveur les calcule (règles du
// paquet livreur, paramètres du registre) ; les trajets, heures « prêt » et valeurs déclarées sont des données.
import { PARAMETRES } from '../calculs/registre'
import { HEURE } from '../calculs/temps'
import type { ClasseColis as ClasseColisVu, ColisVu, Instant } from '../donnees/communs'
import type { ArretPaquet, DomainePaquets, EtatPaquet, LigneKit, Paquet, TypePaquet } from '../donnees/domaines/paquets'
import { formatConseille } from '../donnees/domaines/paquets'
import type { FormatKit, Quantites } from '../donnees/domaines/kit'
import { maintenant } from './horloge'
import { COLIS, h } from './jeu-essai'
import { kitVu, stockDisponible } from './kit'
import { scenario } from './scenario'
import { etatSession, nombre } from './session'
import { etatTournee } from './tournee'
import { RELAIS_DEMO, gerantVu, publier } from './pont'
import { colisPont, estArretPont } from './objets-pont'
import { ajouterRamassagePont } from './ramassage'
import { ajouterDepotPont } from './remises'
import { ajouterPaquetPont } from './tournee'
import { magasin, repondre } from './stockage'

const colis = (id: string): ColisVu => COLIS.find((c) => c.id === id) ?? { id, classe: 'M', fragile: false, etiquette: null }
const NOUVEAUX: Record<string, ColisVu> = {
  'BLV-00006-1': { id: 'BLV-00006-1', classe: 'S', fragile: false, etiquette: 'BV 24 8200' },
  'BLV-00006-2': { id: 'BLV-00006-2', classe: 'S', fragile: false, etiquette: 'BV 24 8201' },
  'BLV-00007-1': { id: 'BLV-00007-1', classe: 'M', fragile: false, etiquette: 'BV 24 8202' },
  'BLV-00007-2': { id: 'BLV-00007-2', classe: 'M', fragile: false, etiquette: 'BV 24 8203' },
  'BLV-00003-1': { id: 'BLV-00003-1', classe: 'M', fragile: false, etiquette: 'BV 24 7740' },
  'BLV-00004-2': { id: 'BLV-00004-2', classe: 'S', fragile: false, etiquette: 'BV 24 7741' },
  'BLV-00017-1': { id: 'BLV-00017-1', classe: 'M', fragile: false, etiquette: null },
  'BLV-00019-1': { id: 'BLV-00019-1', classe: 'L', fragile: false, etiquette: null },
  'BLV-00020-1': { id: 'BLV-00020-1', classe: 'M', fragile: true, etiquette: null },
  'BLV-00001-2': { id: 'BLV-00001-2', classe: 'S', fragile: false, etiquette: 'BV 24 7702' },
  'BLV-00021-1': { id: 'BLV-00021-1', classe: 'S', fragile: false, etiquette: null },
  'BLV-00021-2': { id: 'BLV-00021-2', classe: 'S', fragile: false, etiquette: null },
  'BLV-00022-1': { id: 'BLV-00022-1', classe: 'M', fragile: false, etiquette: null },
  'BLV-00023-1': { id: 'BLV-00023-1', classe: 'M', fragile: true, etiquette: null },
  'BLV-00024-1': { id: 'BLV-00024-1', classe: 'S', fragile: false, etiquette: null },
  'BLV-00025-1': { id: 'BLV-00025-1', classe: 'M', fragile: false, etiquette: null },
  'BLV-00026-1': { id: 'BLV-00026-1', classe: 'M', fragile: false, etiquette: null },
  'BLV-00027-1': { id: 'BLV-00027-1', classe: 'S', fragile: false, etiquette: null },
}
// Colis d'un paquet venu d'une commande du client (pont commun) : classe et fragilité servies avec le paquet.
const duPont = (id: string): ColisVu | null => {
  const x = colisPont(id)
  return x ? { id, classe: x.classe, fragile: x.fragile, etiquette: null } : null
}
const c = (id: string) => NOUVEAUX[id] ?? duPont(id) ?? colis(id)

export interface ArretDemo extends Omit<ArretPaquet, 'colis' | 'fait'> {
  colis: string[]
  fait: boolean
}
export interface PaquetDemo {
  id: string
  type: TypePaquet
  etat: EtatPaquet
  version: number
  versionRelue: number
  zone: string
  accepteA: Instant
  affecteA: Instant
  arrets: ArretDemo[]
  distanceKm: number
  departA: Instant | null
  termineA: Instant | null
  valeurs: Record<string, number> // valeur déclarée par colis : jamais envoyée au livreur, seulement le total
  changements: Paquet['changements']
  telechargeA: Instant | null
  rendu: Paquet['rendu']
  retireLe: Instant | null
  /** Heure limite reçue du serveur pour une course sans « C'est prêt » ni relais (retour : délai d'inspection). */
  limite?: Instant
}

const arret = (p: Partial<ArretDemo> & Pick<ArretDemo, 'id' | 'ordre' | 'type' | 'nom' | 'colis' | 'trajetMin'>): ArretDemo => ({
  quartier: 'Bastos',
  zone: 'Z1',
  creneau: null,
  pretDepuis: null,
  gerant: null,
  fermeA: null,
  fait: false,
  ...p,
})
/** Le relais de la zone, commun aux trois applications (src/demo/pont.ts) : gérante vue « Rose M. », fermeture du mardi. */
const RELAIS = { nom: RELAIS_DEMO.nom, gerant: gerantVu(), fermeA: RELAIS_DEMO.horaires[1].fermeture }

function initial(): Record<string, PaquetDemo> {
  const aucun = scenario() === 'aucun_paquet'
  const p: Record<string, PaquetDemo> = {
    'PQ-Z1-261013-001': {
      id: 'PQ-Z1-261013-001',
      type: 'relais',
      etat: 'clos',
      version: 1,
      versionRelue: 1,
      zone: 'Z1 Centre-ville',
      accepteA: h(8, 2),
      affecteA: h(8, 6),
      arrets: [
        arret({ id: 'M1', ordre: 1, type: 'ramassage', nom: 'Chez Mama Ewondo', colis: ['BLV-00006-1', 'BLV-00006-2'], pretDepuis: h(7, 55), creneau: ['09:00', '09:30'], trajetMin: 14, fait: true }),
        arret({ id: 'M2', ordre: 2, type: 'ramassage', nom: 'Bastos Mode', colis: ['BLV-00007-1', 'BLV-00007-2'], pretDepuis: h(8, 10), creneau: ['09:30', '10:00'], trajetMin: 8, fait: true }),
        arret({ id: 'M3', ordre: 3, type: 'relais', nom: RELAIS.nom, gerant: RELAIS.gerant, fermeA: RELAIS.fermeA, colis: ['BLV-00006-1', 'BLV-00006-2', 'BLV-00007-1', 'BLV-00007-2'], trajetMin: 12, fait: true }),
      ],
      distanceKm: 7.8,
      departA: h(8, 50),
      termineA: h(11, 10),
      valeurs: { 'BLV-00006-1': 12_000, 'BLV-00006-2': 9_500, 'BLV-00007-1': 27_000, 'BLV-00007-2': 31_000 },
      changements: null,
      telechargeA: h(8, 7),
      rendu: null,
      retireLe: null,
    },
    'PQ-Z1-261013-003': {
      id: 'PQ-Z1-261013-003',
      type: 'relais',
      etat: aucun ? 'clos' : 'en_cours',
      version: 1,
      versionRelue: 1,
      zone: 'Z1 Centre-ville',
      accepteA: h(12, 31),
      affecteA: h(12, 34),
      arrets: [
        arret({ id: 'A1', ordre: 1, type: 'ramassage', nom: 'Tech Bastos', colis: ['BLV-00008-1', 'BLV-00009-1'], pretDepuis: h(11, 20), creneau: ['13:00', '13:30'], trajetMin: 12, fait: true }),
        arret({ id: 'A2', ordre: 2, type: 'ramassage', nom: 'Maison Ngono', colis: ['BLV-00011-1', 'BLV-00014-1'], pretDepuis: h(13, 53), creneau: ['14:00', '14:30'], trajetMin: 9, fait: aucun }),
        arret({ id: 'A3', ordre: 3, type: 'relais', nom: RELAIS.nom, gerant: RELAIS.gerant, fermeA: RELAIS.fermeA, colis: ['BLV-00008-1', 'BLV-00009-1', 'BLV-00011-1', 'BLV-00014-1'], trajetMin: 14, fait: aucun }),
        arret({ id: 'A4', ordre: 4, type: 'collecte', nom: RELAIS.nom, gerant: RELAIS.gerant, fermeA: RELAIS.fermeA, colis: ['BLV-00004-2', 'BLV-00003-1'], trajetMin: 1, fait: aucun }),
      ],
      distanceKm: 9.6,
      departA: h(12, 52),
      termineA: aucun ? h(15, 32) : null,
      valeurs: { 'BLV-00008-1': 18_000, 'BLV-00009-1': 64_000, 'BLV-00011-1': 7_500, 'BLV-00014-1': 22_000 },
      changements: null,
      telechargeA: h(12, 50),
      rendu: null,
      retireLe: null,
    },
  }
  // Course de retour et course à domicile, enchaînées dans la tournée après PQ-Z1-261013-003 (demo/tournee.ts).
  p['PQ-Z1-261013-006'] = {
    id: 'PQ-Z1-261013-006',
    type: 'retour',
    etat: aucun ? 'clos' : 'affecte',
    version: 1,
    versionRelue: 1,
    zone: 'Z1 Centre-ville',
    accepteA: h(12, 31),
    affecteA: h(12, 34),
    arrets: [arret({ id: 'A5', ordre: 1, type: 'retour', nom: 'Tech Bastos', colis: ['BLV-00004-2', 'BLV-00003-1'], trajetMin: 12, fait: aucun })],
    distanceKm: 1.9,
    departA: aucun ? h(15, 33) : null,
    termineA: aucun ? h(15, 48) : null,
    valeurs: { 'BLV-00004-2': 9_000, 'BLV-00003-1': 24_000 },
    limite: h(17, 30),
    changements: null,
    telechargeA: h(12, 50),
    rendu: null,
    retireLe: null,
  }
  p['PQ-Z1-261013-008'] = {
    id: 'PQ-Z1-261013-008',
    type: 'domicile',
    etat: aucun ? 'clos' : 'affecte',
    version: 1,
    versionRelue: 1,
    zone: 'Z1 Centre-ville',
    accepteA: h(13, 40),
    affecteA: h(13, 44),
    arrets: [
      arret({ id: 'A6', ordre: 1, type: 'ramassage', nom: 'Afrik Déco', quartier: 'Nlongkak', colis: ['BLV-00017-1'], pretDepuis: h(14, 0), creneau: ['16:15', '16:45'], trajetMin: 9 , fait: aucun }),
      arret({ id: 'A7', ordre: 2, type: 'domicile', nom: 'Remise à domicile', colis: ['BLV-00017-1'], trajetMin: 11, fait: aucun }),
    ],
    distanceKm: 3.2,
    departA: aucun ? h(15, 50) : null,
    termineA: aucun ? h(16, 2) : null,
    valeurs: { 'BLV-00017-1': 31_000 },
    limite: h(18, 0),
    changements: null,
    telechargeA: h(13, 46),
    rendu: null,
    retireLe: null,
  }
  if (!aucun)
    p['PQ-Z1-261013-007'] = {
      id: 'PQ-Z1-261013-007',
      type: 'relais',
      etat: 'modifie',
      version: 2,
      versionRelue: 1,
      zone: 'Z1 Centre-ville',
      accepteA: h(13, 52),
      affecteA: h(13, 58),
      arrets: [
        arret({ id: 'B1', ordre: 1, type: 'ramassage', nom: 'Sapeur Mode', colis: ['BLV-00019-1', 'BLV-00020-1'], pretDepuis: h(13, 45), creneau: ['17:30', '18:00'], trajetMin: 8 }),
        arret({ id: 'B2', ordre: 2, type: 'relais', nom: RELAIS.nom, gerant: RELAIS.gerant, fermeA: RELAIS.fermeA, colis: ['BLV-00019-1', 'BLV-00020-1'], trajetMin: 15 }),
      ],
      distanceKm: 3.4,
      departA: null,
      termineA: null,
      valeurs: { 'BLV-00019-1': 21_000, 'BLV-00020-1': 15_500 },
      changements: {
        a: h(14, 1),
        liste: [{ libelle: 'Repère de Sapeur Mode', avant: 'Face à la pharmacie du Lac', apres: 'Face à la pharmacie du Lac, portail vert, 1er étage' }],
        inchange: ['Ordre des arrêts', 'Colis et classes', 'Heure limite', 'Relais de dépôt'],
      },
      telechargeA: null,
      rendu: null,
      retireLe: null,
    }
  // Course de retour du matin : colis refusé par la cliente hier, repris au relais et rendu à son vendeur.
  p['PQ-Z1-261013-010'] = {
    id: 'PQ-Z1-261013-010',
    type: 'retour',
    etat: 'clos',
    version: 1,
    versionRelue: 1,
    zone: 'Z1 Centre-ville',
    accepteA: h(10, 54),
    affecteA: h(10, 58),
    arrets: [
      arret({ id: 'R1', ordre: 1, type: 'collecte', nom: RELAIS.nom, gerant: RELAIS.gerant, fermeA: RELAIS.fermeA, colis: ['BLV-00001-2'], trajetMin: 6, fait: true }),
      arret({ id: 'R2', ordre: 2, type: 'retour', nom: 'Chez Mama Ewondo', colis: ['BLV-00001-2'], trajetMin: 9, fait: true }),
    ],
    distanceKm: 2.4,
    departA: h(11, 20),
    termineA: h(12, 10),
    valeurs: { 'BLV-00001-2': 14_000 },
    limite: h(17, 0),
    changements: null,
    telechargeA: h(11, 0),
    rendu: null,
    retireLe: null,
  }
  // Paquets du soir, affectés pendant la tournée : à faire après elle (heures limites plus tard).
  if (!aucun) {
    p['PQ-Z1-261013-011'] = {
      id: 'PQ-Z1-261013-011',
      type: 'relais',
      etat: 'affecte',
      version: 1,
      versionRelue: 1,
      zone: 'Z1 Centre-ville',
      accepteA: h(13, 20),
      affecteA: h(13, 49),
      arrets: [
        arret({ id: 'V1', ordre: 1, type: 'ramassage', nom: 'Pharma Beauté', quartier: 'Etoa-Meki', colis: ['BLV-00021-1', 'BLV-00021-2'], pretDepuis: h(14, 40), creneau: ['17:00', '17:20'], trajetMin: 10 }),
        arret({ id: 'V2', ordre: 2, type: 'ramassage', nom: 'Bastos Mode', colis: ['BLV-00022-1'], pretDepuis: h(15, 5), creneau: ['17:20', '17:40'], trajetMin: 7 }),
        arret({ id: 'V3', ordre: 3, type: 'ramassage', nom: 'Tonton PG · Nlongkak', quartier: 'Nlongkak', colis: ['BLV-00023-1'], pretDepuis: h(15, 30), creneau: ['17:35', '17:55'], trajetMin: 8 }),
        arret({ id: 'V4', ordre: 4, type: 'ramassage', nom: 'Chez Mama Ewondo', colis: ['BLV-00024-1'], pretDepuis: h(15, 10), creneau: ['17:50', '18:10'], trajetMin: 6 }),
        arret({ id: 'V5', ordre: 5, type: 'ramassage', nom: 'Électro Nlongkak', quartier: 'Nlongkak', colis: ['BLV-00025-1'], pretDepuis: h(15, 45), creneau: ['18:05', '18:25'], trajetMin: 7 }),
        arret({ id: 'V6', ordre: 6, type: 'relais', nom: RELAIS.nom, gerant: RELAIS.gerant, fermeA: RELAIS.fermeA, colis: ['BLV-00021-1', 'BLV-00021-2', 'BLV-00022-1', 'BLV-00023-1', 'BLV-00024-1', 'BLV-00025-1'], trajetMin: 9 }),
      ],
      distanceKm: 6.1,
      departA: null,
      termineA: null,
      valeurs: { 'BLV-00021-1': 8_500, 'BLV-00021-2': 6_000, 'BLV-00022-1': 19_000, 'BLV-00023-1': 42_000, 'BLV-00024-1': 11_000, 'BLV-00025-1': 36_000 },
      changements: null,
      telechargeA: null,
      rendu: null,
      retireLe: null,
    }
    p['PQ-Z1-261013-012'] = {
      id: 'PQ-Z1-261013-012',
      type: 'domicile',
      etat: 'affecte',
      version: 1,
      versionRelue: 1,
      zone: 'Z1 Centre-ville',
      accepteA: h(13, 55),
      affecteA: h(14, 3),
      arrets: [
        arret({ id: 'D1', ordre: 1, type: 'ramassage', nom: 'Sapeur Mode', colis: ['BLV-00026-1'], pretDepuis: h(14, 0), creneau: ['18:30', '18:50'], trajetMin: 8 }),
        arret({ id: 'D2', ordre: 2, type: 'domicile', nom: 'Remise à domicile', quartier: 'Etoa-Meki', colis: ['BLV-00026-1'], trajetMin: 12 }),
      ],
      distanceKm: 3.6,
      departA: null,
      termineA: null,
      valeurs: { 'BLV-00026-1': 27_000 },
      limite: h(19, 15),
      changements: null,
      telechargeA: null,
      rendu: null,
      retireLe: null,
    }
    p['PQ-Z1-261013-013'] = {
      id: 'PQ-Z1-261013-013',
      type: 'domicile',
      etat: 'affecte',
      version: 1,
      versionRelue: 1,
      zone: 'Z1 Centre-ville',
      accepteA: h(13, 58),
      affecteA: h(14, 4),
      arrets: [
        arret({ id: 'E1', ordre: 1, type: 'ramassage', nom: 'Tech Bastos', colis: ['BLV-00027-1'], pretDepuis: h(14, 2), creneau: ['18:50', '19:10'], trajetMin: 9 }),
        arret({ id: 'E2', ordre: 2, type: 'domicile', nom: 'Remise à domicile', quartier: 'Nlongkak', colis: ['BLV-00027-1'], trajetMin: 10 }),
      ],
      distanceKm: 2.9,
      departA: null,
      termineA: null,
      valeurs: { 'BLV-00027-1': 16_500 },
      limite: h(19, 45),
      changements: null,
      telechargeA: null,
      rendu: null,
      retireLe: null,
    }
  }
  // Compte suspendu, retiré ou rattachement fermé : les paquets non commencés sont retirés (LIV-P32R-01, DED-29).
  const s = scenario()
  if (s === 'suspendu' || s === 'retire' || s === 'rattachement_ferme' || s === 'rattachement_suspendu')
    for (const id of ['PQ-Z1-261013-007', 'PQ-Z1-261013-011', 'PQ-Z1-261013-012', 'PQ-Z1-261013-013'])
      if (p[id]) Object.assign(p[id], { etat: 'retire', retireLe: h(13, 59) })
  return p
}

export const etatPaquets = magasin<Record<string, PaquetDemo>>('paquets', initial)

/** Le pont avec l'espace entreprise (src/demo/pont-entreprise.ts) : un paquet affecté ou retiré par Yafé Express sur
 * le même appareil est appliqué avant chaque lecture. */
export const PONT: { avantLecture: (() => void) | null } = { avantLecture: null }
const lirePaquets = etatPaquets.lire
etatPaquets.lire = () => (PONT.avantLecture?.(), lirePaquets())

// ---------- Règles (serveur) ----------
const ramasse = (p: PaquetDemo, id: string) => p.arrets.some((a) => a.fait && (a.type === 'ramassage' || a.type === 'collecte') && a.colis.includes(id))
/** Arrêts faits : la tournée en cours (demo/tournee.ts) fait foi pour le paquet qu'elle porte. */
function avecTournee(p: PaquetDemo): PaquetDemo {
  const t = etatTournee.lire()
  if (!t || t.paquetId !== p.id || p.etat !== 'en_cours') return p
  return { ...p, arrets: p.arrets.map((a) => ({ ...a, fait: a.fait || t.arrets.some((x) => x.id === a.id && x.etat === 'fait') })) }
}
const tousLesColis = (p: PaquetDemo) => [...new Set(p.arrets.flatMap((a) => a.colis))]

/** Heure limite = min(prêt le plus ancien + délai de zone ; fermeture du relais − marge) (LIV-RG-R64). */
function heureLimite(p: PaquetDemo): Instant {
  if (p.limite !== undefined) return p.limite
  const prets = p.arrets.map((a) => a.pretDepuis).filter((x): x is number => x !== null)
  const sla = prets.length ? Math.min(...prets) + PARAMETRES.livreur.delaiZoneHeures * HEURE : Infinity
  const fermetures = p.arrets
    .filter((a) => a.type === 'relais' && a.fermeA)
    .map((a) => {
      const [hh, mm] = a.fermeA!.split(':').map(Number)
      return h(hh, mm) - nombre('MARGE-FERMETURE-RELAIS-MIN') * 60_000
    })
  return Math.min(sla, ...fermetures)
}
/** Durée estimée = Σ trajets + temps par ramassage + temps par colis déposé (LIV-RG-R65). */
function duree(p: PaquetDemo): number {
  const trajets = p.arrets.reduce((n, a) => n + a.trajetMin, 0)
  const ramassages = p.arrets.filter((a) => a.type === 'ramassage' || a.type === 'collecte').length
  const deposes = p.arrets.filter((a) => a.type === 'relais' || a.type === 'domicile').reduce((n, a) => n + a.colis.length, 0)
  return trajets + ramassages * nombre('DUREE-RAMASSAGE-MIN') + deposes * nombre('DUREE-DEPOT-COLIS-MIN')
}
/** Ce qui reste à emballer : colis ramassés chez un vendeur et pas encore emballés (une collecte est déjà emballée). */
function besoins(p: PaquetDemo): Partial<Quantites> {
  const b: Partial<Quantites> = {}
  for (const a of p.arrets)
    if (a.type === 'ramassage' && !a.fait)
      for (const id of a.colis) {
        const x = c(id)
        const f = formatConseille(x.classe, x.fragile)
        if (f !== 'origine') b[f] = (b[f] ?? 0) + 1
      }
  return b
}
const actifs = (l: PaquetDemo[]) => l.filter((p) => p.etat === 'affecte' || p.etat === 'modifie' || p.etat === 'en_cours').sort((a, b) => heureLimite(a) - heureLimite(b))
const paquetsDuLivreur = () => (etatSession.lire().compte === 'serge' ? Object.values(etatPaquets.lire()).map(avecTournee) : [])

/** Besoins en emballages des paquets à venir, dans l'ordre des heures limites (demo/kit.ts : couverture). */
export function besoinsDesPaquets(): { paquetId: string; besoins: Partial<Quantites> }[] {
  return actifs(paquetsDuLivreur()).map((p) => ({ paquetId: p.id, besoins: besoins(p) }))
}

function vue(p: PaquetDemo): Paquet {
  const t = maintenant()
  const limite = heureLimite(p)
  const d = duree(p)
  const depart = p.departA ?? t
  const tous = tousLesColis(p)
  const plafond = nombre('PLAFOND-NOUVEAU') // Yafé Express : palier Nouveau
  // Kit : stock moins ce que les paquets d'avant (heure limite plus tôt) consomment encore.
  const stock = stockDisponible()
  for (const x of besoinsDesPaquets()) {
    if (x.paquetId === p.id) break
    for (const [f, n] of Object.entries(x.besoins) as [FormatKit, number][]) stock[f] -= n
  }
  const kit: LigneKit[] = (Object.entries(besoins(p)) as [FormatKit, number][]).map(([format, ilFaut]) => {
    const surVous = Math.max(0, stock[format])
    return { format, ilFaut, surVous, manque: Math.max(0, ilFaut - surVous) }
  })
  const avant = actifs(paquetsDuLivreur()).find((x) => x.id !== p.id && heureLimite(x) < limite && (p.etat === 'affecte' || p.etat === 'modifie'))
  const ramasses = tous.filter((id) => ramasse(p, id)).length
  const valeurMax = Math.max(...tous.map((id) => p.valeurs[id] ?? 0))
  // Plage d'étiquettes du paquet : celles déjà liées, puis les suivantes du rouleau pour les colis à emballer (les
  // paquets d'avant prennent les leurs d'abord).
  const kitV = kitVu()
  const liees = kitV.consommation.find((x) => x.paquetId === p.id)?.etiquettes ?? null
  const aEmballer = Object.values(besoins(p)).reduce((n, x) => n + (x ?? 0), 0)
  let etiquettesPrevues: Paquet['etiquettesPrevues'] = liees
  if (aEmballer > 0 && kitV.etiquettes?.prochaine) {
    const avantMoi = besoinsDesPaquets().slice(0, Math.max(0, besoinsDesPaquets().findIndex((x) => x.paquetId === p.id)))
    const decalage = avantMoi.reduce((n, x) => n + Object.values(x.besoins).reduce((m, y) => m + (y ?? 0), 0), 0)
    const pref = kitV.etiquettes.prochaine.replace(/\d+$/, '')
    const n0 = Number(/(\d+)$/.exec(kitV.etiquettes.prochaine)![1]) + decalage
    etiquettesPrevues = { de: liees?.de ?? pref + n0, a: pref + (n0 + aEmballer - 1) }
  }
  return {
    id: p.id,
    type: p.type,
    etat: (p.etat === 'affecte' || p.etat === 'modifie') && valeurMax > plafond ? 'bloque' : p.etat === 'modifie' && p.versionRelue >= p.version ? 'affecte' : p.etat,
    version: p.version,
    zone: p.zone,
    entreprise: 'Yafé Express',
    accepteA: p.accepteA,
    affecteA: p.affecteA,
    arrets: p.arrets.map((a) => ({ ...a, colis: a.colis.map((id) => ({ ...c(id), format: formatConseille(c(id).classe, c(id).fragile), ramasse: ramasse(p, id) })) })),
    heureLimite: limite,
    dureeEstimeeMin: d,
    distanceKm: p.distanceKm,
    departA: p.departA,
    depotPrevu: depart + d * 60_000,
    margeMin: Math.round((limite - (depart + d * 60_000)) / 60_000),
    // Un paquet d'un seul colis ne dit pas sa valeur totale : ce serait celle du colis (jamais montrée au livreur).
    valeurTotale: tous.length > 1 ? tous.reduce((n, id) => n + (p.valeurs[id] ?? 0), 0) : null,
    plafondPalier: plafond,
    palier: 'Nouveau',
    kit,
    kitCouvert: kit.every((l) => l.manque === 0),
    etiquettesPrevues,
    changements: p.etat === 'modifie' && p.versionRelue < p.version ? p.changements : null,
    telechargeA: p.telechargeA,
    colisRamasses: ramasses,
    colisTotal: tous.length,
    rendu: p.rendu,
    retireLe: p.retireLe,
    blocage: valeurMax > plafond ? 'Un colis dépasse le plafond de valeur du palier de Yafé Express : le paquet est renvoyé à l’entreprise.' : null,
    avant: avant?.id ?? null,
  }
}

/** Les paquets du jour, vus par le livreur (Aujourd'hui). */
export function paquetsVus(): Paquet[] {
  return paquetsDuLivreur().map(vue)
}
export const termineA = (id: string) => etatPaquets.lire()[id]?.termineA ?? null

export const demoPaquets: DomainePaquets = {
  paquet(id) {
    const l = paquetsVus()
    if (id) return repondre(l.find((p) => p.id === id) ?? null)
    const ordre = l.filter((p) => ['en_cours', 'affecte', 'modifie', 'bloque'].includes(p.etat)).sort((a, b) => (a.etat === 'en_cours' ? -1 : 0) - (b.etat === 'en_cours' ? -1 : 0) || a.heureLimite - b.heureLimite)
    return repondre(ordre[0] ?? null)
  },
  async marquerRelu(id, version) {
    etatPaquets.ecrire((e) => {
      const p = e[id]
      if (p && version >= p.versionRelue) {
        p.versionRelue = version
        if (p.etat === 'modifie' && version >= p.version) p.etat = 'affecte'
      }
    })
  },
  demarrer(id, o) {
    const p = paquetsVus().find((x) => x.id === id)
    if (!p) return repondre({ ok: false as const, raison: 'retire' as const })
    if (p.etat === 'retire') return repondre({ ok: false as const, raison: 'retire' as const }) // 410 package_withdrawn
    if (p.etat === 'bloque') return repondre({ ok: false as const, raison: 'bloque' as const }) // 409 package_blocked
    if (p.etat !== 'affecte' && p.etat !== 'modifie') return repondre({ ok: false as const, raison: 'deja_demarre' as const })
    if (p.changements) return repondre({ ok: false as const, raison: 'a_relire' as const })
    if (p.avant) return repondre({ ok: false as const, raison: 'autre_paquet_avant' as const })
    if (!p.kitCouvert) return repondre({ ok: false as const, raison: 'kit_insuffisant' as const })
    etatPaquets.ecrire((e) => {
      e[id].etat = 'en_cours'
      e[id].departA = o.heure // heure du téléphone : un départ mis en file garde son heure d'origine
    })
    // Un paquet venu d'une commande du client (pont commun) : ses arrêts entrent dans la tournée, son ramassage est prêt.
    const brut = etatPaquets.lire()[id]
    if (brut.arrets.some((a) => estArretPont(a.id))) {
      const classes = (ids: string[]) => ids.reduce<Partial<Record<ClasseColisVu, number>>>((m, x) => ((m[c(x).classe] = (m[c(x).classe] ?? 0) + 1), m), {})
      ajouterPaquetPont(
        { id, nature: brut.type === 'domicile' ? 'domicile' : brut.type === 'retour' ? 'retour' : 'relais', heureLimite: p.heureLimite },
        brut.arrets.map((a) => ({ id: a.id, type: a.type, nom: a.nom, quartier: a.quartier, colis: a.colis.length, classes: classes(a.colis), pretDepuis: a.pretDepuis, trajetMin: a.trajetMin })),
      )
      for (const a of brut.arrets.filter((x) => x.type === 'ramassage')) ajouterRamassagePont(a.id, a.nom, a.quartier, a.creneau, a.colis.map((x) => ({ id: x, classe: c(x).classe, fragile: c(x).fragile })))
      for (const a of brut.arrets.filter((x) => x.type === 'relais')) ajouterDepotPont(a.id)
    }
    publier({ type: 'depart', paquetId: id }, 'depart-' + o.cle, o.heure)
    return repondre({ ok: true as const })
  },
  impossible(id, motif, o) {
    const p = paquetsVus().find((x) => x.id === id)
    if (!p || !['affecte', 'modifie', 'en_cours', 'bloque'].includes(p.etat)) return repondre({ ok: false as const, raison: 'non_rendable' as const })
    // Colis déjà ramassés : le paquet ne se rend plus tel quel (409 already_collected) → incident « livreur et véhicule ».
    if (p.colisRamasses > 0) return repondre({ ok: false as const, raison: 'deja_ramasse' as const, colisSousGarde: etatSession.lire().colisSousGarde })
    etatPaquets.ecrire((e) => {
      e[id].etat = 'rendu'
      e[id].rendu = { le: o.heure, motif } // l'entreprise est prévenue tout de suite (paquet « À affecter », motif)
    })
    publier({ type: 'rendu', paquetId: id, motif }, 'rendu-' + o.cle, o.heure)
    return repondre({ ok: true as const })
  },
  telecharger(id) {
    const t = maintenant()
    etatPaquets.ecrire((e) => void (e[id] && (e[id].telechargeA = t)))
    return repondre({ ok: true as const, le: t })
  },
}

