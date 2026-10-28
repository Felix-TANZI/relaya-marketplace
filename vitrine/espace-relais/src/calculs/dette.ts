// Caisse des espèces de garde, relevé du vendredi et dette d'espèces : PORTAGE FIDÈLE de moteurs/belivay_moteurs/relais.py
// (garde_reglee, caisse, releve_hebdomadaire, encaissement_suspendu, trace_releve) ; mêmes exemples que
// moteurs/tests/test_relais.py. v6 D12 (le relais garde 100 F par jour, le reste des espèces revient à BelivaY au
// versement du vendredi), ARL-05 (dette : report, reversement par Mobile Money au-delà de PR-DETTE-MAX ou après
// PR-DETTE-SEMAINES semaines, sous PR-DETTE-DELAI-H, sinon encaissement suspendu), ARL-32 (journal), ARL-34 (retenue
// fiscale à 0 % sans NIU), ARL-39 (retour déposé payé comme une remise), PR-RC-03, PR-RC-17, PR-RC-30, PR-RC-31.
// soldeDuVendredi (comptoir.ts) reste pour les écrans qui l'utilisent ; ce relevé en donne le détail ligne à ligne.
import type { ClasseColis, Instant } from '../donnees/communs'
import { ecrire, etat, type GroupeEnGarde } from './garde'
import type { ParametresMoteursRelais } from './parametres-moteurs'
import { classeAuRelais } from './reception'
import { bonusComptoir, fraisVersement } from './regles20'
import { HEURE, type Jour } from './temps'

/** Garde d'un groupe réglée à sa remise, telle qu'écrite au journal des espèces (ARL-32). */
export interface GardeReglee {
  groupe: string
  especes: number // encaissées en une fois (0 : rien n'était dû)
  joursFactures: number
  tarifJour: number // RELAIS-GAIN-GARDE (ou -GROS)
  j1Belivay: number // 1er jour payé au relais par BelivaY
  annulee: boolean // remise annulée : contre-écriture, espèces rendues (PR-RC-31)
}
/** Gardée par le relais sur les espèces : 100 F par jour facturé. */
export const partRelais = (x: GardeReglee) => x.joursFactures * x.tarifJour
/** Espèces − part du relais ; négatif : BelivaY doit la différence au relais (ARL-130). */
export const partBelivay = (x: GardeReglee) => x.especes - partRelais(x)

export function gardeReglee(g: GroupeEnGarde, jour: Jour, p: Pick<ParametresMoteursRelais, 'garde'>, annulee = false, a?: number): GardeReglee {
  const e = etat(g, jour, p.garde, a)
  return { groupe: g.reference, especes: e.du, joursFactures: e.joursFactures, tarifJour: g.gros ? p.garde.gainRelaisJourGros : p.garde.gainRelaisJour, j1Belivay: e.payeParBelivay, annulee }
}

/** Idempotence (PR-RC-30) : une écriture rejouée à l'identique ne compte qu'une fois. */
function uniques<T>(xs: readonly T[]): T[] {
  const vus = new Set<string>()
  return xs.filter((x) => {
    const k = JSON.stringify(x)
    if (vus.has(k)) return false
    vus.add(k)
    return true
  })
}

export interface Caisse {
  especes: number
  partRelais: number
  partBelivay: number // déduite du versement du vendredi (ARL-05)
  j1Belivay: number
  contreEcritures: number
}
export function caisse(gardes: readonly GardeReglee[]): Caisse {
  const toutes = uniques(gardes)
  const vraies = toutes.filter((x) => !x.annulee)
  const somme = (f: (x: GardeReglee) => number) => vraies.reduce((s, x) => s + f(x), 0)
  return { especes: somme((x) => x.especes), partRelais: somme(partRelais), partBelivay: somme(partBelivay), j1Belivay: somme((x) => x.j1Belivay), contreEcritures: toutes.length - vraies.length }
}

/** Dette d'espèces du relais envers BelivaY (ARL-05). `echeance` : reversement par Mobile Money exigé avant. */
export interface Dette {
  montant: number
  semaines: number
  echeance: Instant | null
}
export const DETTE_NULLE: Dette = { montant: 0, semaines: 0, echeance: null }

export interface LigneReleve {
  code: string // colis_S, retour_M, garde_jours, garde_j1, garde_renvois, comptoir, especes, retenue_fiscale, report, frais_versement
  libelle: string
  quantite: number
  tarif: number
  montant: number
}
export interface SemaineDuRelais {
  relais: string
  arrete: Jour // jeudi de l'arrêté (VD-VER-ARRETE)
  remises?: Partial<Record<string, number>> // colis remis par classe
  retours?: Partial<Record<string, number>> // retours déposés par classe (ARL-39)
  gardes?: readonly GardeReglee[]
  renvois?: readonly { joursPayesAuRelais: number; gainRelais: number }[]
  niu?: boolean // NIU déclaré : pas de retenue à la source (ARL-34)
  comptoir?: number // colis payés au comptoir (R41 : + 50 F chacun)
}
export interface Releve {
  cle: string // un relevé et un versement par relais et par semaine (PR-RC-17)
  lignes: LigneReleve[]
  gains: number
  net: number
  aVerser: number
  dette: Dette
  reversementExige: boolean
}

const NOMS: Record<ClasseColis, string> = { S: 'petit', M: 'moyen', L: 'encombrant' }
const CLASSES: readonly ClasseColis[] = ['S', 'M', 'L']
/** pourcentage_de (argent.py) : au franc, moitié vers le haut. */
const pourcentageDe = (montant: number, taux: number) => Math.floor((montant * taux) / 100 + 0.5)

/** Relevé du vendredi en lignes (voir relais.py) : colis et retours × RELAIS-GAIN-COLIS, jours de garde, 1ers jours et
 * jours des colis renvoyés payés par BelivaY, + 50 F par colis payé au comptoir (R41), − espèces encaissées, − retenue
 * fiscale sans NIU, − dette reportée ; puis, sur un versement, 1 % CamPay retenu au franc supérieur (R43). */
export function releveHebdomadaire(s: SemaineDuRelais, detteAvant: Dette, verseLe: Instant, p: Pick<ParametresMoteursRelais, 'gainColis' | 'garde' | 'retenueFiscalePourCent' | 'detteMax' | 'detteSemaines' | 'detteDelaiHeures'>): Releve {
  const remises = s.remises ?? {}
  const retours = s.retours ?? {}
  for (const c of [...Object.keys(remises), ...Object.keys(retours)]) classeAuRelais(c)
  if ([detteAvant.montant, detteAvant.semaines, s.comptoir ?? 0, ...Object.values(remises), ...Object.values(retours)].some((v) => (v ?? 0) < 0)) throw new Error('compteur ou montant négatif')
  const lignes: LigneReleve[] = []
  for (const [genre, compte, nom] of [['colis', remises, 'Colis remis'], ['retour', retours, 'Retours déposés']] as const)
    for (const c of CLASSES) {
      const q = compte[c] ?? 0
      if (q) lignes.push({ code: `${genre}_${c}`, libelle: `${nom} · ${NOMS[c]}`, quantite: q, tarif: p.gainColis[c], montant: q * p.gainColis[c] })
    }
  const gardes = uniques(s.gardes ?? []).filter((x) => !x.annulee)
  for (const tarif of [...new Set(gardes.map((x) => x.tarifJour))].sort((a, b) => a - b)) {
    const q = gardes.filter((x) => x.tarifJour === tarif).reduce((n, x) => n + x.joursFactures, 0)
    if (q) lignes.push({ code: 'garde_jours', libelle: 'Jours de garde facturés', quantite: q, tarif, montant: q * tarif })
  }
  const j1 = gardes.filter((x) => x.j1Belivay)
  if (j1.length) lignes.push({ code: 'garde_j1', libelle: '1er jour payé par BelivaY', quantite: j1.length, tarif: p.garde.gainRelaisJour, montant: j1.reduce((n, x) => n + x.j1Belivay, 0) })
  const renvois = uniques(s.renvois ?? [])
  if (renvois.length)
    lignes.push({ code: 'garde_renvois', libelle: 'Garde des colis renvoyés (payée par BelivaY)', quantite: renvois.reduce((n, r) => n + r.joursPayesAuRelais, 0), tarif: p.garde.gainRelaisJour, montant: renvois.reduce((n, r) => n + r.gainRelais, 0) })
  if (s.comptoir) lignes.push({ code: 'comptoir', libelle: 'Colis payés au comptoir', quantite: s.comptoir, tarif: bonusComptoir(), montant: s.comptoir * bonusComptoir() })
  const gains = lignes.reduce((n, x) => n + x.montant, 0)
  const especes = gardes.reduce((n, x) => n + x.especes, 0)
  if (especes) lignes.push({ code: 'especes', libelle: 'Espèces de garde encaissées (déjà en main)', quantite: gardes.filter((x) => x.especes).length, tarif: 0, montant: -especes })
  if (!s.niu) lignes.push({ code: 'retenue_fiscale', libelle: 'Retenue à la source (sans NIU)', quantite: 1, tarif: 0, montant: 0 - pourcentageDe(gains, p.retenueFiscalePourCent) }) // 0 − x : jamais −0
  if (detteAvant.montant) lignes.push({ code: 'report', libelle: 'Report de la semaine précédente', quantite: 1, tarif: 0, montant: -detteAvant.montant })
  const net = lignes.reduce((n, x) => n + x.montant, 0)
  const cle = `${s.relais}·${s.arrete}`
  if (net >= 0) {
    const frais = fraisVersement(net) // R43
    if (frais) lignes.push({ code: 'frais_versement', libelle: 'Frais Mobile Money du versement (1 %)', quantite: 1, tarif: 0, montant: -frais })
    return { cle, lignes, gains, net: net - frais, aVerser: net - frais, dette: DETTE_NULLE, reversementExige: false }
  }
  const semaines = detteAvant.semaines + 1
  const exige = -net > p.detteMax || semaines >= p.detteSemaines
  const echeance = exige ? (detteAvant.echeance ?? verseLe + p.detteDelaiHeures * HEURE) : null
  return { cle, lignes, gains, net, aVerser: 0, dette: { montant: -net, semaines, echeance }, reversementExige: exige }
}

/** Reversement exigé et non fait à l'échéance : encaissement des gardes suspendu, administrateur alerté (ARL-05). */
export const encaissementSuspendu = (d: Dette, maintenant: Instant) => d.montant > 0 && d.echeance !== null && maintenant >= d.echeance

/** Le relevé en mots, comme à l'écran Versements. */
export function traceReleve(r: Releve): string[] {
  return [
    ...r.lignes.filter((x) => x.tarif).map((x) => `${x.libelle} : ${x.quantite} × ${ecrire(x.tarif)} = ${ecrire(x.montant)}`),
    ...r.lignes.filter((x) => !x.tarif).map((x) => `${x.libelle} : ${ecrire(x.montant)}`),
    `Net : ${ecrire(r.net)} ; versé : ${ecrire(r.aVerser)} ; dette : ${ecrire(r.dette.montant)}`,
  ]
}
