// DONNÉES DE DÉMONSTRATION — domaine « historique » : les paquets de Serge depuis son activation (jeudi 24 septembre
// 2026) à volume de trafic normal (quatre à six paquets par jour ouvré, 15 à 25 arrêts : tournées relais du matin et de
// l'après-midi, courses à domicile, retours), un dossier de litige en cours (PQ-Z1-261009-003), les deux paquets clos ce
// matin (PQ-Z1-261013-001 et -010) et le paquet du jour PQ-Z1-261013-003 lu dans la tournée. Ces missions validées sont
// la seule source des compteurs de l'activité, du Trust Score et du bilan de clôture (mêmes chiffres partout).
import { JOUR, ajouterJours, debutDuJour, jourDe, yaounde } from '../calculs/temps'
import type { ClasseColis, Jour } from '../donnees/communs'
import type { DetailMission, Dossier, DomaineHistorique, EtapeMission, MissionResume, NatureMission } from '../donnees/domaines/historique'
import { entier, parametre } from './horsligne'
import { maintenant } from './horloge'
import { COLIS } from './jeu-essai'
import { etatTournee } from './tournee'
import { repondre } from './stockage'

export interface PaquetFait {
  id: string
  jour: Jour
  heure: number // instant de l'affectation
  nature: NatureMission
  zone: string
  ramassages: number
  depots: number
  domiciles: number
  retours: number
  colis: number
  km: number
  libelle: string
  vendeurs: string[]
  classes: Partial<Record<ClasseColis, number>>
  dossier?: Dossier
  premiere: number // première étiquette (numéro du rouleau Yafé)
}

const VENDEURS = ['Tech Bastos', 'Maison Ngono', 'Afrik Déco', 'Tonton PG · Nlongkak', 'Afrik’Style', 'Sapeur Mode', 'Chez Mama Ewondo', 'Bastos Mode', 'Pharma Beauté', 'Électro Nlongkak']
const VENDEURS_Z3 = ['Mokolo Pagnes', 'Quincaillerie du Marché', 'Mama Rose Cosmétiques', 'Mokolo Électro']
const RELAIS: Record<string, string> = { 'Z1 Centre-ville': 'Relais Bastos Carrefour', 'Z3 Mokolo': 'Relais Mokolo · Agence Yafé Express' }

// [id, jour, heure, minute, nature, zone, ramassages, dépôts, domiciles, retours, colis, km, commande (domicile)]
type Ligne = [string, number, number, number, NatureMission, string, number, number, number, number, number, number, string?]
const LIGNES: Ligne[] = [
  ['PQ-Z1-260925-003', 4, 10, 5, 'relais', 'Z1 Centre-ville', 2, 1, 0, 0, 4, 11],
  ['PQ-Z1-260926-003', 5, 9, 40, 'relais', 'Z1 Centre-ville', 3, 1, 0, 0, 6, 15],
  ['PQ-Z3-260928-003', 7, 10, 20, 'relais', 'Z3 Mokolo', 2, 1, 0, 0, 5, 13],
  ['PQ-Z1-260928-003', 7, 15, 10, 'domicile', 'Z1 Centre-ville', 1, 0, 1, 0, 1, 6, 'BLV-00004'],
  ['PQ-Z1-260929-003', 8, 9, 55, 'relais', 'Z1 Centre-ville', 3, 1, 0, 0, 7, 16],
  ['PQ-Z1-260930-003', 9, 10, 30, 'relais', 'Z1 Centre-ville', 2, 1, 0, 0, 4, 12],
  ['PQ-Z1-260930-004', 9, 14, 45, 'retour', 'Z1 Centre-ville', 0, 0, 0, 2, 1, 7],
  ['PQ-Z3-261001-003', 10, 10, 0, 'relais', 'Z3 Mokolo', 3, 1, 0, 0, 6, 17],
  ['PQ-Z1-261002-003', 11, 9, 50, 'relais', 'Z1 Centre-ville', 2, 1, 0, 0, 5, 12],
  ['PQ-Z1-261002-004', 11, 15, 30, 'domicile', 'Z1 Centre-ville', 1, 0, 1, 0, 1, 5, 'BLV-00006'],
  ['PQ-Z1-261003-003', 12, 10, 10, 'relais', 'Z1 Centre-ville', 3, 1, 0, 0, 8, 16],
  ['PQ-Z1-261005-003', 14, 10, 0, 'relais', 'Z1 Centre-ville', 2, 1, 0, 0, 5, 12],
  ['PQ-Z3-261006-003', 15, 9, 45, 'relais', 'Z3 Mokolo', 3, 1, 0, 0, 7, 18],
  ['PQ-Z1-261007-003', 16, 10, 25, 'relais', 'Z1 Centre-ville', 2, 1, 0, 0, 4, 11],
  ['PQ-Z1-261007-004', 16, 15, 0, 'domicile', 'Z1 Centre-ville', 1, 0, 1, 0, 1, 6, 'BLV-00002'],
  ['PQ-Z1-261008-003', 17, 10, 5, 'relais', 'Z1 Centre-ville', 3, 1, 0, 0, 6, 15],
  ['PQ-Z1-261009-003', 18, 10, 15, 'relais', 'Z1 Centre-ville', 2, 1, 0, 0, 5, 13],
  ['PQ-Z1-261009-004', 18, 15, 20, 'domicile', 'Z1 Centre-ville', 1, 0, 1, 0, 1, 7, 'BLV-00005'],
  ['PQ-Z1-261010-003', 19, 9, 50, 'relais', 'Z1 Centre-ville', 3, 1, 0, 0, 7, 15],
  ['PQ-Z1-261010-004', 19, 15, 40, 'relais', 'Z1 Centre-ville', 2, 1, 0, 0, 4, 10],
]

// Jours ouvrés depuis l'activation sans ligne écrite ci-dessus : complétés au même rythme (tirage fixe par jour,
// identique à chaque ouverture). Suffixes -001, -002, -005, -006, -007 (les lignes écrites ont -003 et -004).
type Spec = { id: string; heure: number; nature: NatureMission; zone: string; r: number; d: number; dom: number; ret: number; colis: number; km: number; commande?: string; premiere?: number; vendeurs?: string[] }
function genere(): Spec[] {
  const out: Spec[] = []
  let graine = 7
  const hasard = () => ((graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648)
  const entre = (a: number, b: number) => a + Math.floor(hasard() * (b - a + 1))
  let commande = 100
  for (let jour = yaounde(2026, 9, 25); jour < yaounde(2026, 10, 13); jour += JOUR) {
    const d = new Date(jour + 12 * 3600_000)
    if (d.getUTCDay() === 0) continue // dimanche : repos
    const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
    const z3 = d.getUTCDay() === 2 || d.getUTCDay() === 5 // mardi et vendredi : Mokolo le matin
    const r1 = entre(3, 5)
    out.push({ id: `PQ-${z3 ? 'Z3' : 'Z1'}-${ymd}-001`, heure: jour + entre(7 * 60 + 30, 8 * 60) * 60_000, nature: 'relais', zone: z3 ? 'Z3 Mokolo' : 'Z1 Centre-ville', r: r1, d: 1, dom: 0, ret: 0, colis: r1 + entre(0, 2), km: entre(11, 17) })
    out.push({ id: `PQ-Z1-${ymd}-002`, heure: jour + entre(11 * 60, 11 * 60 + 40) * 60_000, nature: 'domicile', zone: 'Z1 Centre-ville', r: 1, d: 0, dom: 1, ret: 0, colis: 1, km: entre(4, 7), commande: 'BLV-00' + commande++ })
    if (hasard() < 0.6) {
      const r2 = entre(2, 4)
      out.push({ id: `PQ-Z1-${ymd}-005`, heure: jour + entre(12 * 60 + 20, 13 * 60) * 60_000, nature: 'relais', zone: 'Z1 Centre-ville', r: r2, d: 1, dom: 0, ret: 0, colis: r2 + entre(0, 1), km: entre(8, 12) })
    }
    if (hasard() < 0.5) out.push({ id: `PQ-Z1-${ymd}-006`, heure: jour + entre(14 * 60 + 30, 15 * 60 + 30) * 60_000, nature: 'retour', zone: 'Z1 Centre-ville', r: 0, d: 0, dom: 0, ret: 2, colis: entre(1, 2), km: entre(3, 6) })
    out.push({ id: `PQ-Z1-${ymd}-007`, heure: jour + entre(16 * 60 + 10, 17 * 60) * 60_000, nature: 'domicile', zone: 'Z1 Centre-ville', r: 1, d: 0, dom: 1, ret: 0, colis: 1, km: entre(4, 8), commande: 'BLV-00' + commande++ })
  }
  return out
}

/** Paquets clos ce matin (demo/paquets.ts) : dans l'historique dès leur clôture. */
const DU_MATIN: Spec[] = [
  { id: 'PQ-Z1-261013-001', heure: yaounde(2026, 10, 13, 8, 6), nature: 'relais', zone: 'Z1 Centre-ville', r: 2, d: 1, dom: 0, ret: 0, colis: 4, km: 7.8, premiere: 8200, vendeurs: ['Chez Mama Ewondo', 'Bastos Mode'] },
  { id: 'PQ-Z1-261013-010', heure: yaounde(2026, 10, 13, 10, 58), nature: 'retour', zone: 'Z1 Centre-ville', r: 0, d: 0, dom: 0, ret: 2, colis: 1, km: 2.4, premiere: 7702, vendeurs: ['Chez Mama Ewondo'] },
]

// Étiquettes : une suite du rouleau, dans l'ordre des paquets ; la dernière d'avant aujourd'hui est BV 24 8199 (le
// rouleau du jour commence à BV 24 8200, demo/kit.ts). Un retour reprend l'étiquette déjà posée sur son colis.
const PREMIERE_DU_JOUR = 8200

export const PAQUETS: PaquetFait[] = (() => {
  const ecrites: Spec[] = LIGNES.map(([id, j, hh, mm, nature, zone, r, d, dom, ret, colis, km, commande]) => ({
    // Jours du jeu d'essai (septembre) ramenés avant le mardi 13 octobre, même jour de la semaine (+ 21 jours).
    id, heure: yaounde(2026, 9, j, hh, mm) + 21 * JOUR, nature, zone, r, d, dom, ret, colis, km, commande,
  }))
  const passees = [...ecrites, ...genere()].sort((a, b) => a.heure - b.heure)
  let numero = PREMIERE_DU_JOUR - passees.reduce((n, x) => n + x.colis, 0)
  return [...passees, ...DU_MATIN].map(({ id, heure, nature, zone, r, d, dom, ret, colis, km, commande, premiere, vendeurs: v }, k) => {
    const liste = zone === 'Z3 Mokolo' ? VENDEURS_Z3 : VENDEURS
    const vendeurs = v ?? Array.from({ length: Math.max(r, ret ? 1 : 0) }, (_, i) => liste[(k + i) % liste.length])
    const s = Math.ceil(colis / 2)
    const p: PaquetFait = {
      id,
      jour: jourDe(heure),
      heure,
      nature,
      zone,
      ramassages: r,
      depots: d,
      domiciles: dom,
      retours: ret,
      colis,
      km,
      libelle: nature === 'relais' ? RELAIS[zone] : nature === 'domicile' ? 'Commande ' + commande : 'Retour au vendeur · ' + vendeurs[0],
      vendeurs,
      classes: colis === 1 ? { M: 1 } : { S: s, M: colis - s },
      premiere: premiere ?? numero,
    }
    if (premiere === undefined) numero += colis
    if (id === 'PQ-Z1-261009-003')
      p.dossier = {
        numero: 'DOS-2026-1009-07',
        commande: 'BLV-00003',
        motif: 'Colis abîmé constaté au retrait',
        etat: 'en_cours',
        ouvertLe: yaounde(2026, 10, 10, 11, 20),
        reponseEntrepriseAvant: yaounde(2026, 10, 10, 11, 20) + entier('LIT-REPONSE-ENT-H') * 3600_000,
        decision: null,
        decideLe: null,
        preuves: ['Photo 1 · article à découvert', 'Photo 2 · colis fermé et scellé', 'Dépôt au relais · lot confirmé'],
      }
    return p
  })
})()

const etiquettes = (p: PaquetFait) => Array.from({ length: p.colis }, (_, i) => 'BV 24 ' + (p.premiere + i))

function resume(p: PaquetFait): MissionResume {
  return { id: p.id, jour: p.jour, heure: p.heure, nature: p.nature, zone: p.zone, arrets: p.ramassages + p.depots + p.domiciles + p.retours, colis: p.colis, statut: p.dossier?.etat === 'en_cours' ? 'dossier' : 'termine', libelle: p.libelle, etiquettes: etiquettes(p) }
}

/** Paquet du jour, tel que la tournée le montre (en cours : la ligne ouvre la tournée). */
function duJour(): MissionResume | null {
  const t = etatTournee.lire()
  if (!t) return null
  const premier = t.arrets[0]
  const colis = COLIS.filter((c) => c.etiquette).map((c) => c.etiquette!)
  const fini = t.arrets.every((a) => a.etat === 'fait' || a.etat === 'echec')
  return { id: t.paquetId, jour: jourDe(premier.avant), heure: premier.avant - 50 * 60_000, nature: 'relais', zone: 'Z1 Centre-ville', arrets: t.arrets.length, colis: t.arrets.filter((a) => a.type === 'ramassage').reduce((n, a) => n + a.colis, 0), statut: fini ? 'termine' : 'en_cours', libelle: RELAIS['Z1 Centre-ville'], etiquettes: colis }
}

/** Missions (arrêts) validées d'un paquet : une mission liée à un dossier en cours est « en revue », hors compteurs. */
export const missionsValidees = (p: PaquetFait) => p.ramassages + p.depots + p.domiciles + p.retours - (p.dossier?.etat === 'en_cours' ? 1 : 0)

/** Paquets faits entre deux jours inclus : la même source pour l'activité et le Trust Score. */
export function paquetsEntre(de: Jour, a: Jour): PaquetFait[] {
  return PAQUETS.filter((p) => p.jour >= de && p.jour <= a)
}

function etapes(p: PaquetFait): EtapeMission[] {
  const e: EtapeMission[] = []
  let t = p.heure
  const pas = (min: number) => (t += min * 60_000)
  const ajoute = (texte: string, lieu: string | null, preuve: EtapeMission['preuve']) => e.push({ quand: t, recu: t + 4000, texte, lieu, preuve })
  ajoute('Paquet affecté par Yafé Express', null, null)
  const parVendeur = Math.max(1, Math.round(p.colis / Math.max(1, p.ramassages || 1)))
  for (const v of p.nature === 'retour' ? [] : p.vendeurs) {
    pas(25)
    ajoute('Arrivé chez le vendeur', v, 'position')
    pas(6)
    ajoute(parVendeur > 1 ? 'Contrôle des colis, 2 photos chacun' : 'Contrôle du colis, 2 photos', v, 'photo')
    pas(3)
    ajoute('Code de remise validé', v, 'code')
  }
  if (p.nature === 'relais') {
    pas(30)
    ajoute('Arrivé au relais', p.libelle, 'position')
    pas(5)
    ajoute('Lot confirmé : colis contrôlés par le gérant', p.libelle, 'scan')
  } else if (p.nature === 'domicile') {
    pas(35)
    ajoute('Arrivé à la zone de remise', p.zone, 'position')
    pas(4)
    ajoute('Code de livraison validé, photo de remise', p.libelle, 'code')
  } else {
    pas(25)
    ajoute('Colis de retour repris au relais', RELAIS[p.zone], 'scan')
    pas(30)
    ajoute('Retour remis au vendeur, code de réception validé', p.vendeurs[0], 'code')
  }
  return e
}

function detail(p: PaquetFait): DetailMission {
  const et = etapes(p)
  const ctrl = et.find((x) => x.preuve === 'photo') ?? et[1]
  const fin = et[et.length - 1]
  const legendes = p.nature === 'retour' ? ['Colis de retour repris', 'Pochette fermée et scellée', 'Retour au vendeur'] : ['Photo 1 · article à découvert', 'Photo 2 · colis fermé et scellé', p.nature === 'relais' ? 'Dépôt au relais' : 'Photo de remise']
  return {
    ...resume(p),
    classes: p.classes,
    etapes: et,
    photos: [ctrl, ctrl, fin].map((x, i) => ({ id: `${p.id}-ph${i + 1}`, legende: legendes[i], quand: x.quand + (i === 1 ? 30_000 : 0) })),
    incidents: p.id === 'PQ-Z1-261010-004' ? ['Ramassage en retard de 22 min après le créneau annoncé (événement Trust contestable)'] : [],
    dossier: p.dossier ?? null,
    visibleJusqua: debutDuJour(ajouterJours(p.jour, entier('LIV-PREUVES-VISIBLES-J'))),
  }
}

const visibles = () => {
  const auj = jourDe(maintenant())
  return { auj, depuis: ajouterJours(auj, -entier('LIV-PREUVES-VISIBLES-J')) }
}
const cacheJours = () => Number(parametre('history_offline_cache_days', '(\\d+) .*')[1])
const norme = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

export const demoHistorique: DomaineHistorique = {
  liste(de, a) {
    const v = visibles()
    const debut = de < v.depuis ? v.depuis : de
    const ps = paquetsEntre(debut, a)
    const missions: MissionResume[] = ps.map(resume)
    const j = duJour()
    if (j && j.jour >= debut && j.jour <= a) missions.push(j)
    missions.sort((x, y) => y.heure - x.heure)
    const jours: { jour: Jour; missions: MissionResume[] }[] = []
    for (const m of missions) {
      const g = jours.find((x) => x.jour === m.jour)
      if (g) g.missions.push(m)
      else jours.push({ jour: m.jour, missions: [m] })
    }
    const ramasses = ps.reduce((n, p) => n + (p.nature === 'retour' ? 0 : p.colis), 0) + (j && j.jour >= debut && j.jour <= a ? (etatTournee.lire()?.arrets.filter((x) => x.type === 'ramassage' && x.etat === 'fait').reduce((n, x) => n + x.colis, 0) ?? 0) : 0)
    return repondre({
      jours,
      heros: { paquets: missions.length, colisRamasses: ramasses, photos: ps.reduce((n, p) => n + p.colis * 2 + p.depots + p.domiciles + p.retours, 0), dossiersEnCours: ps.filter((p) => p.dossier?.etat === 'en_cours').length },
      aJourA: maintenant(),
      visiblesJours: entier('LIV-PREUVES-VISIBLES-J'),
      cacheJours: cacheJours(),
    })
  },
  mission(id) {
    const p = PAQUETS.find((x) => x.id === id)
    const v = visibles()
    return repondre(p && p.jour >= v.depuis ? detail(p) : null)
  },
  rechercher(saisie) {
    const s = norme(saisie)
    const v = visibles()
    if (s.length < 4) return repondre([])
    const quatre = /^\d{4}$/.test(s)
    const r = PAQUETS.filter((p) => p.jour >= v.depuis && (norme(p.id) === s || etiquettes(p).some((e) => (quatre ? e.endsWith(s) : norme(e) === s))))
    return repondre(r.map(resume).sort((x, y) => y.heure - x.heure))
  },
}
