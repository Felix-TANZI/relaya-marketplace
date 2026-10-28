// DONNÉES DE DÉMONSTRATION — les prestations de Yafé Express depuis le début du pilote (lundi 21 sept. 2026) : une seule
// liste, lue par les règlements, les relevés, les rapports et le score (mêmes chiffres partout, ENT-P25R-03). Les trois
// premières semaines sont tirées par un générateur à graine fixe (trafic normal : une vingtaine de missions par jour
// ouvré dans les quatre zones, moins le dimanche) ; lundi 12 et mardi 13 octobre sont écrits à la main (BRUTES).
// Les prix acceptés sont des DONNÉES (grille Yafé v1 du jeu d'essai) ; la minoration de retard, le palier et les délais
// viennent du registre (src/calculs). Statuts : validée (payée vendredi), en revue (litige ouvert sur la mission :
// payée le vendredi qui suit la fin du litige, DED-12), non payée (colis perdu, LT-029).
import type { ClasseColis, CodeZone } from '../donnees/communs'
import type { Prestation } from '../donnees/domaines/reglements'
import type { Gravite } from '../calculs/ent07'
import { prixMinore } from '../calculs/ent07'
import { yaounde } from '../calculs/temps'
import { REGLES, plafondRelais, trancheTournee } from '../calculs/livraison/regles-ecrans'
import { ACTIF_DEPUIS_JOURS, LIVREURS, livreurCourt } from './jeu-essai'

/** Lundi 12 (j = -1) ou mardi 13 octobre (j = 0), heure de Yaoundé. */
export const J = (j: number, h: number, m = 0) => yaounde(2026, 10, 13 + j, h, m)

interface Brute {
  n: number
  ref?: string // identifiant du paquet quand il vient d'ailleurs (« PQ-Z1-260925-003 », espace livreur)
  jour: number
  genre: Prestation['genre']
  zone: CodeZone
  classes: ClasseColis[]
  livreur: string
  prix: number
  retard?: boolean
  statut?: Prestation['statut']
  raison?: string
  litigeId?: string
}

const BRUTES: Brute[] = [
  { n: 2338, jour: J(-1, 14, 10), genre: 'domicile', zone: 'Z3', classes: ['S'], livreur: 'l-junior', prix: 1_000 },
  { n: 2349, jour: J(-1, 14, 20), genre: 'relais', zone: 'Z6', classes: ['M'], livreur: 'l-hugo', prix: 600, statut: 'non_payee', raison: 'Colis perdu (LT-029)', litigeId: 'LT-029' },
  { n: 2341, jour: J(-1, 15, 20), genre: 'relais', zone: 'Z2', classes: ['S', 'S', 'M', 'S', 'M'], livreur: 'l-paul', prix: 2_250 },
  { n: 2344, jour: J(-1, 15, 45), genre: 'domicile', zone: 'Z1', classes: ['M'], livreur: 'l-brice', prix: 1_200 },
  { n: 2355, jour: J(-1, 16, 40), genre: 'relais', zone: 'Z3', classes: ['S', 'M', 'S'], livreur: 'l-junior', prix: 1_800, statut: 'en_revue', raison: 'Litige LT-031 ouvert', litigeId: 'LT-031' },
  { n: 2346, jour: J(-1, 18, 25), genre: 'domicile', zone: 'Z6', classes: ['S'], livreur: 'l-ines', prix: 1_000, retard: true },
  { n: 2361, jour: J(0, 9, 30), genre: 'domicile', zone: 'Z1', classes: ['S'], livreur: 'l-brice', prix: 1_200, statut: 'en_revue', raison: 'Litige LT-030 en examen', litigeId: 'LT-030' },
  { n: 2384, jour: J(0, 10, 5), genre: 'domicile', zone: 'Z2', classes: ['M'], livreur: 'l-junior', prix: 1_000 },
  { n: 2380, jour: J(0, 11, 40), genre: 'relais', zone: 'Z6', classes: ['S', 'M', 'S'], livreur: 'l-paul', prix: 1_800 },
  { n: 2387, jour: J(0, 12, 20), genre: 'relais', zone: 'Z3', classes: ['S', 'S', 'M', 'S'], livreur: 'l-junior', prix: 2_400 },
]

// ---------- Trois semaines de trafic (générateur à graine fixe : mêmes chiffres à chaque chargement) ----------

function alea(graine: number) {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
/** Litiges anciens, décidés (src/demo/litiges.ts) : la prestation de la mission en cause. */
export const LITIGES_ANCIENS: Record<string, { n: number; statut: 'validee' | 'non_payee' }> = {
  'LT-021': { n: 1130, statut: 'validee' },
  'LT-022': { n: 1172, statut: 'validee' },
  'LT-023': { n: 1215, statut: 'non_payee' },
  'LT-024': { n: 1260, statut: 'validee' },
  'LT-025': { n: 1302, statut: 'validee' },
  'LT-026': { n: 1347, statut: 'validee' },
  'LT-027': { n: 1388, statut: 'validee' },
  'LT-028': { n: 1425, statut: 'validee' },
}
const RETARDS = [0.34, 0.2, 0.07]
// Livreurs moins ponctuels (mêmes que leurs notes de ponctualité, livreurs.ts : PROFILS) : Inès d'abord.
const MOINS_PONCTUELS: Record<string, number> = { 'l-ines': 2.4, 'l-landry': 1.8, 'l-kevin': 1.4, 'l-brice': 1.3 }
const PREMIER_JOUR = -22
/** Missions de Serge A. depuis son activation, telles que l'espace livreur les montre (espace-livreur/src/demo/
 * historique.ts, PAQUETS, hors retours qui ne sont pas des prestations du relevé) : mêmes paquets, mêmes heures, mêmes
 * classes des deux côtés. Copie vérifiée par src/demo/trafic.test.ts (dérive = échec). [id, affecté le, nature, zone, classes] */
export const SERGE_HISTORIQUE: [string, number, 'relais' | 'domicile', CodeZone, string][] = [
  ["PQ-Z3-260925-001", 1790318340000, 'relais', 'Z3', 'SSSMM'],
  ["PQ-Z1-260925-003", 1790327100000, 'relais', 'Z1', 'SSMM'],
  ["PQ-Z1-260925-002", 1790332020000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-260925-007", 1790349180000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-260926-001", 1790404500000, 'relais', 'Z1', 'SSSMM'],
  ["PQ-Z1-260926-003", 1790412000000, 'relais', 'Z1', 'SSSMMM'],
  ["PQ-Z1-260926-002", 1790417700000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-260926-005", 1790423820000, 'relais', 'Z1', 'SSSMM'],
  ["PQ-Z1-260926-007", 1790438100000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-260928-001", 1790577240000, 'relais', 'Z1', 'SSSMM'],
  ["PQ-Z3-260928-003", 1790587200000, 'relais', 'Z3', 'SSSMM'],
  ["PQ-Z1-260928-002", 1790591400000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-260928-003", 1790604600000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-260928-007", 1790610420000, 'domicile', 'Z1', 'M'],
  ["PQ-Z3-260929-001", 1790663640000, 'relais', 'Z3', 'SSSMM'],
  ["PQ-Z1-260929-003", 1790672100000, 'relais', 'Z1', 'SSSSMMM'],
  ["PQ-Z1-260929-002", 1790676720000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-260929-005", 1790682120000, 'relais', 'Z1', 'SSMM'],
  ["PQ-Z1-260929-007", 1790695860000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-260930-001", 1790750880000, 'relais', 'Z1', 'SSSMMM'],
  ["PQ-Z1-260930-003", 1790760600000, 'relais', 'Z1', 'SSMM'],
  ["PQ-Z1-260930-002", 1790763840000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-260930-005", 1790767380000, 'relais', 'Z1', 'SSM'],
  ["PQ-Z1-260930-007", 1790783340000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261001-001", 1790837760000, 'relais', 'Z1', 'SSMM'],
  ["PQ-Z3-261001-003", 1790845200000, 'relais', 'Z3', 'SSSMMM'],
  ["PQ-Z1-261001-002", 1790851080000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261001-005", 1790855100000, 'relais', 'Z1', 'SSMM'],
  ["PQ-Z1-261001-007", 1790869740000, 'domicile', 'Z1', 'M'],
  ["PQ-Z3-261002-001", 1790923260000, 'relais', 'Z3', 'SSSMM'],
  ["PQ-Z1-261002-003", 1790931000000, 'relais', 'Z1', 'SSSMM'],
  ["PQ-Z1-261002-002", 1790935860000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261002-005", 1790940120000, 'relais', 'Z1', 'SSMM'],
  ["PQ-Z1-261002-004", 1790951400000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261002-007", 1790954460000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261003-001", 1791009660000, 'relais', 'Z1', 'SSSMM'],
  ["PQ-Z1-261003-003", 1791018600000, 'relais', 'Z1', 'SSSSMMMM'],
  ["PQ-Z1-261003-002", 1791021840000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261003-005", 1791027840000, 'relais', 'Z1', 'SSMM'],
  ["PQ-Z1-261003-007", 1791040980000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261005-001", 1791182520000, 'relais', 'Z1', 'SSSMMM'],
  ["PQ-Z1-261005-003", 1791190800000, 'relais', 'Z1', 'SSSMM'],
  ["PQ-Z1-261005-002", 1791196680000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261005-005", 1791200100000, 'relais', 'Z1', 'SSSMM'],
  ["PQ-Z1-261005-007", 1791215640000, 'domicile', 'Z1', 'M'],
  ["PQ-Z3-261006-001", 1791268800000, 'relais', 'Z3', 'SSM'],
  ["PQ-Z3-261006-003", 1791276300000, 'relais', 'Z3', 'SSSSMMM'],
  ["PQ-Z1-261006-002", 1791282420000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261006-005", 1791286260000, 'relais', 'Z1', 'SSM'],
  ["PQ-Z1-261006-007", 1791302160000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261007-001", 1791355860000, 'relais', 'Z1', 'SSM'],
  ["PQ-Z1-261007-003", 1791365100000, 'relais', 'Z1', 'SSMM'],
  ["PQ-Z1-261007-002", 1791367980000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261007-004", 1791381600000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261007-007", 1791387660000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261008-001", 1791442680000, 'relais', 'Z1', 'SSSMM'],
  ["PQ-Z1-261008-003", 1791450300000, 'relais', 'Z1', 'SSSMMM'],
  ["PQ-Z1-261008-002", 1791453780000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261008-007", 1791472320000, 'domicile', 'Z1', 'M'],
  ["PQ-Z3-261009-001", 1791528180000, 'relais', 'Z3', 'SSSMMM'],
  ["PQ-Z1-261009-003", 1791537300000, 'relais', 'Z1', 'SSSMM'],
  ["PQ-Z1-261009-002", 1791540360000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261009-005", 1791545280000, 'relais', 'Z1', 'SM'],
  ["PQ-Z1-261009-004", 1791555600000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261009-007", 1791560340000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261010-001", 1791615300000, 'relais', 'Z1', 'SSSMM'],
  ["PQ-Z1-261010-003", 1791622200000, 'relais', 'Z1', 'SSSSMMM'],
  ["PQ-Z1-261010-002", 1791626940000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261010-005", 1791631920000, 'relais', 'Z1', 'SSMM'],
  ["PQ-Z1-261010-004", 1791643200000, 'relais', 'Z1', 'SSMM'],
  ["PQ-Z1-261010-007", 1791645300000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261012-001", 1791787080000, 'relais', 'Z1', 'SSM'],
  ["PQ-Z1-261012-002", 1791800220000, 'domicile', 'Z1', 'M'],
  ["PQ-Z1-261012-005", 1791804000000, 'relais', 'Z1', 'SM'],
  ["PQ-Z1-261012-007", 1791818400000, 'domicile', 'Z1', 'M'],
]
 // lundi 21 septembre 2026, début du pilote (ENTREPRISE.debutPilote)

function historique(): Brute[] {
  const r = alea(20260921)
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  const out: Brute[] = []
  const litige = Object.fromEntries(Object.entries(LITIGES_ANCIENS).map(([id, x]) => [x.n, { id, ...x }]))
  let n = 1100
  for (let j = PREMIER_JOUR; j <= -2; j++) {
    const dimanche = new Date(J(j, 12)).getUTCDay() === 0
    // Serge A. : ses missions sont celles de l'espace livreur (SERGE_HISTORIQUE), pas tirées ici.
    const actifs = LIVREURS.filter((l) => l.id !== 'l-serge' && (ACTIF_DEPUIS_JOURS[l.id] ?? -1) >= -j && (l.id !== 'l-landry' || j < -1))
    if (!actifs.length) continue
    const volume = dimanche ? 6 + Math.floor(r() * 4) : 18 + Math.floor(r() * 11)
    for (let k = 0; k < volume; k++) {
      const l = pick(actifs)
      const zone = pick(l.zones) as CodeZone
      const domicile = r() < 0.4
      const nb = domicile ? 1 : 2 + Math.floor(r() * 6)
      const classes: ClasseColis[] = Array.from({ length: nb }, () => (r() < 0.7 ? 'S' : r() < 0.85 ? 'M' : 'L'))
      const t = trancheTournee(nb)
      const prix = domicile ? REGLES.domicile[zone === 'Z1' ? 1 : 0] : classes.reduce((a, c) => a + Math.min(t, plafondRelais(c) ?? t), 0)
      const h = 8 + Math.floor((k / volume) * 10)
      n++
      const lit = litige[n]
      out.push({
        n,
        jour: J(j, h, Math.floor(r() * 60)),
        genre: domicile ? 'domicile' : 'relais',
        zone,
        classes,
        livreur: l.id,
        prix,
        // Montée en charge : plus de retards les deux premières semaines du pilote, puis la flotte se rode.
        retard: !lit && r() < (j <= -16 ? RETARDS[0] : j <= -9 ? RETARDS[1] : RETARDS[2]) * (MOINS_PONCTUELS[l.id] ?? 1),
        ...(lit ? { statut: lit.statut === 'non_payee' ? ('non_payee' as const) : undefined, raison: lit.statut === 'non_payee' ? `Colis perdu (${lit.id})` : undefined, litigeId: lit.id } : {}),
      })
    }
  }
  for (const [ref, heure, nature, zone, classes] of SERGE_HISTORIQUE) {
    const cl = [...classes] as ClasseColis[]
    const t = trancheTournee(cl.length)
    out.push({
      n: ++n,
      ref,
      jour: heure + (nature === 'domicile' ? 45 : 95) * 60_000, // clos à la remise ou au dépôt
      genre: nature,
      zone,
      classes: cl,
      livreur: 'l-serge',
      prix: nature === 'domicile' ? REGLES.domicile[zone === 'Z1' ? 1 : 0] : cl.reduce((a, c) => a + Math.min(t, plafondRelais(c) ?? t), 0),
      retard: r() < 0.05,
    })
  }
  return out.sort((a, b) => a.jour - b.jour)
}
const TOUTES: Brute[] = [...historique(), ...BRUTES]

/** Prestations, avec l'état des litiges du moment (un litige décidé définitivement libère la prestation en revue). */
export function prestations(litigesOuverts: Set<string> = new Set(['LT-030', 'LT-031'])): Prestation[] {
  return TOUTES.map((b) => {
    const enRevue = b.statut === 'en_revue' && b.litigeId !== undefined && litigesOuverts.has(b.litigeId)
    const statut = b.statut === 'non_payee' ? 'non_payee' : enRevue ? 'en_revue' : 'validee'
    return {
      id: 'PR-' + (b.ref ? b.ref.slice(3) : b.n),
      jour: b.jour,
      paquetId: b.ref ?? 'PQ-' + b.n,
      missionId: 'MS-' + (b.ref ? b.ref.slice(3) : b.n),
      genre: b.genre,
      zone: b.zone,
      classes: b.classes,
      livreur: livreurCourt(b.livreur),
      prixAccepte: b.prix,
      montant: statut === 'non_payee' ? 0 : b.retard ? prixMinore(b.prix) : b.prix,
      minoree: !!b.retard,
      statut,
      raison: statut === 'validee' ? null : (b.raison ?? null),
      litigeId: b.litigeId ?? null,
    }
  })
}

/** Événement de score d'une prestation : remise dans le délai (succès), retard (g1) ; un colis perdu ne pèse qu'à la
 *  décision définitive de son litige (ENT-TSC-05). */
export function graviteDe(p: Prestation): Gravite | null {
  if (p.statut === 'non_payee') return null
  return p.minoree ? 'g1' : 'succes'
}

/** Événements propres à l'entreprise (ENT-P20R-04). */
export const EVENEMENTS_PROPRES = [{ id: 'EV-R2352', le: J(-1, 15, 2), gravite: 'g1' as Gravite, libelle: 'Paquet rendu (non affecté dans le délai)', zone: 'Z2' as CodeZone, paquetId: 'PQ-2352' }]

/** Tournées relais : colis par tournée (remplissage, ENT-P25R-02). */
export const colisDe = (p: Prestation) => p.classes.length
