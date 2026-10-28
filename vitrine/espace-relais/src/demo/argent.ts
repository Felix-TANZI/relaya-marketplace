// DONNÉES DE DÉMONSTRATION — domaine « argent » (gérant seul, ARL-06) : le « serveur » des versements du relais.
// - Semaines de versement : du vendredi au jeudi, arrêté jeudi 23 h 59 (VD-VER-ARRETE, PR-VER-ARRETE), versement le
//   vendredi avant 12 h (VD-VER-JOUR) ; référence BLV-VP-nnnn annoncée à l'arrêté (PR-RC-17).
// - Chaque semaine passée est une DONNÉE d'activité (groupes remis par rang de garde, colis par classe, retours,
//   renvois) ; TOUS les montants sont CALCULÉS par les moteurs du socle : garde réglée de chaque groupe
//   (calculs/dette.ts : gardeReglee), renvoi au vendeur (calculs/renvoi.ts : 100 F par jour payés par BelivaY, ARL-08),
//   relevé du vendredi (releveHebdomadaire : lignes, espèces déduites, retenue fiscale, report, dette à reverser au-delà
//   de PR-DETTE-MAX ou après PR-DETTE-SEMAINES semaines, échéance PR-DETTE-DELAI-H) et encaissement suspendu.
// - Semaine en cours : SEMAINE_AVANT du jeu d'essai (vendredi 9 au lundi 12) + les encaissements du jour lus dans le
//   modèle central des colis (colis.ts).
// - Situations (paramètre « ?versement= », gardé pour l'onglet) : envoye (BLV-VP-0141 envoyé, pas encore crédité),
//   refuse (refusé, 3 nouveaux essais refusés : suspendu, appel du support), numero (nouveau numéro en vérification :
//   versement du vendredi suspendu, reporté), dette (semaine négative reportée), reverser (deux semaines négatives :
//   espèces à reverser, échéance dépassée, encaissement des gardes suspendu).
import { PARAMETRES } from '../calculs/registre'
import { DETTE_NULLE, caisse as caisseDe, encaissementSuspendu, gardeReglee, releveHebdomadaire, type Dette as DetteCalcul, type GardeReglee, type Releve } from '../calculs/dette'
import { etat as etatGarde, groupe as groupeEnGarde, horaires } from '../calculs/garde'
import { PARAMETRES_MOTEURS as PM } from '../calculs/parametres-moteurs'
import { renvoiAuVendeur } from '../calculs/renvoi'
import { JOUR, HEURE, aHeure, ajouterJours, jourDe, jourSemaine, type Jour } from '../calculs/temps'
import type { ClasseColis, Instant } from '../donnees/communs'
import type { Argent, CaisseDuJour, ChangementNumero, Dette, DomaineArgent, FichierReleve, LigneVersement, MotifRefus, NumeroVersement, PeriodeRapport, Rapport, Versement } from '../donnees/domaines/argent'
import { P09, operateurDe, segmentsDelai } from '../calculs/parametres-argent'
import { etatColis, gardeDuGroupe, tousLesColis } from './colis'
import { aujourdhui, maintenant } from './horloge'
import { CODE_SMS_DEMO, NUMERO_VERSEMENT, RELAIS, SEMAINE_AVANT, VERSEMENTS_PASSES } from './jeu-essai'
import { sansHistorique, scenario } from './scenario'
import { membreActuel } from './session'
import { magasin, repondre } from './stockage'

const P = PARAMETRES.relais
const CLASSES: ClasseColis[] = ['S', 'M', 'L']
type ParClasse = Record<ClasseColis, number>
const zero = (): ParClasse => ({ S: 0, M: 0, L: 0 })

// ── Situation de la démonstration (?versement=) ────────────────────────────────────────────────────────────────
export const SITUATIONS = ['envoye', 'refuse', 'numero', 'dette', 'reverser'] as const
export type SituationArgent = (typeof SITUATIONS)[number]
const CLE_SITUATION = 'blv_r_demo_versement'
let situationLue: SituationArgent | null | undefined
export function situation(): SituationArgent | null {
  if (situationLue !== undefined) return situationLue
  try {
    const q = new URLSearchParams(location.search)
    const v = q.get('versement')
    if (v !== null || q.get('demo') !== null) {
      const s = v && (SITUATIONS as readonly string[]).includes(v) ? (v as SituationArgent) : null
      if ((sessionStorage.getItem(CLE_SITUATION) ?? '') !== (s ?? '')) {
        localStorage.removeItem('blv_r_demo_argent')
        if (s) sessionStorage.setItem(CLE_SITUATION, s)
        else sessionStorage.removeItem(CLE_SITUATION)
      }
      return (situationLue = s)
    }
    const g = sessionStorage.getItem(CLE_SITUATION)
    return (situationLue = g && (SITUATIONS as readonly string[]).includes(g) ? (g as SituationArgent) : null)
  } catch {
    return (situationLue = null)
  }
}

/** Essais (Vitest) : choisir la situation sans adresse. */
export function choisirSituation(x: SituationArgent | null) {
  situationLue = x
  dernier = null
  etatArgent.reinitialiser()
}

// ── Données d'activité des semaines passées ────────────────────────────────────────────────────────────────────
/** Une semaine de versement : groupes remis par rang de garde (1 à 7), colis remis par classe (un groupe peut en
 * compter plusieurs), groupes renvoyés au vendeur après le 7e jour, retours déposés, colis reçus. */
export interface SemaineJeu {
  du: Jour
  rangs: [number, number, number, number, number, number, number]
  colis: ParClasse
  renvoyes: number
  retours: ParClasse
  recus: number
}
/** Ouverture du relais (jeu d'essai) ; semaines depuis le vendredi qui la précède. */
const OUVERT_LE = jourDe(RELAIS.ouvertLe)
/** `stock` : colis reçus dans la semaine et encore au relais à l'arrêté (les reçus = sortis + stock). */
const s = (du: Jour, rangs: SemaineJeu['rangs'], colis: [number, number, number], renvoyes: number, stock: number, retours: [number, number, number] = [0, 0, 0]): SemaineJeu => ({
  du,
  rangs,
  colis: { S: colis[0], M: colis[1], L: colis[2] },
  renvoyes,
  recus: colis[0] + colis[1] + colis[2] + renvoyes + stock,
  retours: { S: retours[0], M: retours[1], L: retours[2] },
})
/** Montée en charge depuis l'ouverture (15 juin) : données d'activité, semaine par semaine. Les trois dernières sont
 * celles des versements BLV-VP-0139 à 0141 du jeu d'essai (tests : le calcul retrouve leurs montants). */
const SEMAINES_JEU: SemaineJeu[] = [
  s('2026-06-12', [3, 1, 1, 0, 0, 0, 0], [4, 1, 0], 0, 4),
  s('2026-06-19', [5, 3, 1, 1, 0, 0, 0], [9, 2, 0], 0, 4),
  s('2026-06-26', [7, 3, 2, 1, 1, 0, 0], [12, 2, 1], 0, 4),
  s('2026-07-03', [8, 4, 2, 2, 1, 1, 0], [15, 3, 1], 0, 2),
  s('2026-07-10', [9, 5, 3, 2, 1, 0, 0], [17, 3, 1], 1, 4, [1, 0, 0]),
  s('2026-07-17', [10, 5, 3, 2, 1, 1, 0], [19, 3, 1], 0, 3),
  s('2026-07-24', [10, 6, 4, 2, 2, 1, 0], [21, 4, 1], 1, 3),
  s('2026-07-31', [11, 6, 4, 3, 1, 1, 0], [22, 4, 2], 0, 4, [0, 1, 0]),
  s('2026-08-07', [12, 7, 4, 3, 2, 1, 0], [24, 5, 2], 1, 4),
  s('2026-08-14', [12, 7, 5, 3, 2, 1, 0], [25, 5, 2], 0, 2),
  s('2026-08-21', [13, 7, 5, 3, 2, 2, 0], [27, 5, 2], 1, 4, [1, 0, 0]),
  s('2026-08-28', [13, 8, 5, 4, 2, 1, 0], [28, 5, 2], 0, 4),
  s('2026-09-04', [13, 8, 6, 4, 2, 1, 0], [29, 5, 2], 1, 3),
  s('2026-09-11', [14, 8, 6, 4, 2, 2, 0], [30, 5, 2], 0, 4),
  s('2026-09-18', [14, 8, 6, 4, 2, 2, 0], [31, 5, 2], 1, 4, [0, 1, 0]),
  s('2026-09-25', [15, 9, 6, 4, 3, 1, 0], [33, 5, 2], 1, 2),
  s('2026-10-02', [16, 10, 7, 4, 3, 2, 0], [35, 5, 2], 1, 2, [1, 1, 0]),
]
/** Situations « dette » et « reverser » : clients venus tard (beaucoup de 6e et 7e jours), espèces de garde au-delà
 * des gains : la part BelivaY dépasse le versement. */
const SEMAINES_DETTE: Record<string, SemaineJeu> = {
  '2026-10-02': s('2026-10-02', [4, 2, 1, 1, 1, 3, 8], [20, 0, 0], 1, 4),
  '2026-09-25': s('2026-09-25', [5, 2, 1, 1, 1, 3, 7], [20, 0, 0], 0, 3),
}
/** Répartition des 16 groupes de SEMAINE_AVANT (vendredi 9 au lundi 12) par rang de retrait : retrouve ses 24 jours
 * de garde et ses 3 900 F d'espèces (test). */
export const SEMAINE_AVANT_RANGS: SemaineJeu['rangs'] = [7, 4, 1, 1, 0, 3, 0]
/** Colis reçus du vendredi 9 au lundi 12 (donnée ; aujourd'hui se lit dans le modèle des colis). */
const SEMAINE_AVANT_RECUS = 29

/** Numéro marchand BelivaY pour reverser les espèces dues (donnée de configuration du serveur). */
const MARCHAND = 'BelivaY · marchand MTN MoMo 830 517'
const TELEPHONE_PERSONNEL = '6 •• •• •• 47'
const VERIFIE_LE = jourDe(RELAIS.ouvertLe)

// ── Calcul d'une semaine ───────────────────────────────────────────────────────────────────────────────────────
const toujoursOuvert = horaires(0, 24 * 60)
const groupeJeu = (ref: string, du: Jour) => groupeEnGarde(ref, du, 10_000_000, 10_000_000, false, toujoursOuvert)

export interface Totaux {
  colis: ParClasse
  retours: ParClasse
  gardes: GardeReglee[] // garde réglée de chaque groupe remis (calculs/dette.ts)
  renvois: { groupe: string; joursPayesAuRelais: number; gainRelais: number }[] // colis renvoyés (calculs/renvoi.ts)
}
/** Gardes et renvois d'une semaine de données : un groupe par rang de retrait, chacun réglé par les moteurs. */
const memo = new Map<string, Totaux>()
export function totauxDe(x: SemaineJeu): Totaux {
  const cle = JSON.stringify(x)
  const m = memo.get(cle)
  if (m) return { ...m, colis: { ...m.colis }, retours: { ...m.retours }, gardes: [...m.gardes], renvois: [...m.renvois] }
  const t = calculerTotaux(x)
  memo.set(cle, t)
  return totauxDe(x)
}
function calculerTotaux(x: SemaineJeu): Totaux {
  const gardes = x.rangs.flatMap((n, k) => Array.from({ length: n }, (_, i) => gardeReglee(groupeJeu(`${x.du}-r${k + 1}-${i}`, x.du), ajouterJours(x.du, k), PM)))
  const renvois = Array.from({ length: x.renvoyes }, (_, i) => {
    const r = renvoiAuVendeur(groupeJeu(`${x.du}-renvoi-${i}`, x.du), PM)!
    return { groupe: `${x.du}-renvoi-${i}`, joursPayesAuRelais: r.joursPayesAuRelais, gainRelais: r.gainRelais }
  })
  return { colis: { ...x.colis }, retours: { ...x.retours }, gardes, renvois }
}

const TYPES: Record<string, LigneVersement['type']> = { colis: 'colis', retour: 'retour', garde_jours: 'jour_garde', garde_j1: 'jour_offert_belivay', garde_renvois: 'jour_paye_belivay', comptoir: 'bonus_comptoir', frais_versement: 'frais_versement', retenue_fiscale: 'retenue_fiscale', report: 'report' }
/** Relevé du vendredi par le moteur (calculs/dette.ts : releveHebdomadaire), traduit en lignes de l'écran : chaque
 * classe de colis remis apparaît (même à 0) ; les espèces encaissées se montrent en deux lignes, la part du relais
 * (déjà en caisse) et la part BelivaY (calculs/dette.ts : caisse), dont la somme est la ligne « espèces » du moteur. */
export function releveDe(t: Totaux, detteAvant: DetteCalcul, arrete: Jour, verseLe: Instant): { releve: Releve; lignes: LigneVersement[]; gagne: number; especes: number } {
  const r = releveHebdomadaire({ relais: RELAIS.id, arrete, remises: t.colis, retours: t.retours, gardes: t.gardes, renvois: t.renvois }, detteAvant, verseLe, PM)
  const lignes: LigneVersement[] = []
  for (const k of CLASSES) if (!r.lignes.some((l) => l.code === 'colis_' + k)) lignes.push({ type: 'colis', classe: k, quantite: 0, taux: P.gainColis[k], montant: 0 })
  const c = caisseDe(t.gardes)
  for (const l of r.lignes) {
    const [genre, classe] = l.code.split('_') as [string, ClasseColis | undefined]
    if (l.code === 'especes') {
      lignes.push({ type: 'especes_part_relais', classe: null, quantite: 0, taux: 0, montant: -c.partRelais })
      lignes.push({ type: 'especes_part_belivay', classe: null, quantite: 0, taux: 0, montant: -c.partBelivay })
    } else if (genre === 'colis' || genre === 'retour') lignes.push({ type: TYPES[genre], classe: classe!, quantite: l.quantite, taux: l.tarif, montant: l.montant })
    else if (l.code === 'retenue_fiscale') lignes.push({ type: 'retenue_fiscale', classe: null, quantite: PM.retenueFiscalePourCent, taux: 0, montant: l.montant })
    else lignes.push({ type: TYPES[l.code], classe: null, quantite: l.quantite, taux: l.tarif, montant: l.montant })
  }
  lignes.sort((a, b) => ORDRE.indexOf(a.type) - ORDRE.indexOf(b.type) || CLASSES.indexOf(a.classe ?? 'S') - CLASSES.indexOf(b.classe ?? 'S'))
  return { releve: r, lignes, gagne: r.gains, especes: c.especes }
}
const ORDRE: LigneVersement['type'][] = ['colis', 'retour', 'jour_garde', 'jour_offert_belivay', 'jour_paye_belivay', 'bonus_comptoir', 'especes_part_relais', 'especes_part_belivay', 'retenue_fiscale', 'report', 'retenue_perte', 'frais_versement']

// ── Calendrier ─────────────────────────────────────────────────────────────────────────────────────────────────
/** Semaine de versement d'un jour : du vendredi au jeudi (arrêté), versée le vendredi suivant avant VD-VER-JOUR. */
export function semaineDe(j: Jour) {
  const recul = (jourSemaine(j) - (P.versement.arreteJourSemaine + 1) + 7) % 7
  const du = ajouterJours(j, -recul)
  const au = ajouterJours(du, 6)
  const vendredi = ajouterJours(au, (P.versement.jourSemaine - P.versement.arreteJourSemaine + 7) % 7)
  return { du, au, vendredi, versement: aHeure(vendredi, P.versement.avantHeure * 60), arrete: aHeure(au, P.versement.arreteMinutes) }
}
/** Premier vendredi de versement après un instant (VER-03 : « le vendredi qui suit la revue »). */
function vendrediApres(t: Instant): Instant {
  let j = jourDe(t)
  for (let k = 0; k < 8; k++, j = ajouterJours(j, 1)) {
    const v = aHeure(j, P.versement.avantHeure * 60)
    if (jourSemaine(j) === P.versement.jourSemaine && v > t) return v
  }
  throw new Error('aucun vendredi')
}
/** Lundi midi qui suit un signalement (PR-VER-RECLAM, VER-05). */
function reponseAvant(t: Instant): Instant {
  let j = ajouterJours(jourDe(t), 1)
  while (jourSemaine(j) !== P09.reclamation.jourSemaine) j = ajouterJours(j, 1)
  return aHeure(j, P09.reclamation.heure * 60)
}

// ── État gardé ─────────────────────────────────────────────────────────────────────────────────────────────────
const masque = (op: 'MTN' | 'Orange', fin: string) => `${op} ···· ${fin}`
export const etatArgent = magasin('argent', () => {
  const sit = situation()
  const numero: NumeroVersement = { operateur: NUMERO_VERSEMENT.operateur, masque: masque(NUMERO_VERSEMENT.operateur, NUMERO_VERSEMENT.fin), statut: 'verifie', verifieLe: aHeure(VERIFIE_LE, 10 * 60), versementsSuspendusJusqua: null }
  let changement: (ChangementNumero & { numeroComplet: string; essaisCodes: number }) | null = null
  if (sit === 'numero') {
    const demande = aHeure(ajouterJours(aujourdhui(), -2), 18 * 60)
    const revue = demande + P09.numeroVerifJours * JOUR
    changement = { etape: 'en_verification', nouveau: { operateur: 'MTN', masque: masque('MTN', '2118') }, codes: null, revueJusqua: revue, premierVersementLe: vendrediApres(revue), alerteEnvoyeeA: numero.masque, numeroComplet: '677402118', essaisCodes: 0 }
    numero.versementsSuspendusJusqua = revue
  }
  return {
    numero,
    changement,
    reclamations: {} as Record<string, { le: Instant; reponseAvant: Instant }>,
    detteReglee: null as { le: Instant; reference: string } | null,
    cles: [] as string[],
  }
})

// ── Versements ─────────────────────────────────────────────────────────────────────────────────────────────────
interface Calcul {
  semaine: SemaineJeu | null
  totaux: Totaux
  versement: Versement
  releve: Releve
}

const MASQUE_ACTUEL = () => etatArgent.lire().numero.masque
/** États d'un envoi refusé (VER-08) : un essai toutes les intervalleH heures, au plus PR-VER-ESSAIS nouveaux essais. */
export function apresRefus(envoi: Instant, refus: MotifRefus, essaisRefuses: number, t: Instant) {
  const essais = Array.from({ length: essaisRefuses }, (_, k) => ({ le: envoi + k * P.versement.intervalleH * HEURE, refus }))
  const suspendu = essaisRefuses > P09.versementEssais
  const prochain = suspendu ? null : envoi + essaisRefuses * P.versement.intervalleH * HEURE
  return { essais, etat: (suspendu ? 'suspendu' : 'refuse') as Versement['etat'], prochainEssai: prochain && prochain > t ? prochain : null }
}

function semainesJeu(): SemaineJeu[] {
  if (sansHistorique()) return []
  const sit = situation()
  return SEMAINES_JEU.filter((x) => ajouterJours(x.du, 6) >= OUVERT_LE).map((x) => (sit === 'reverser' || (sit === 'dette' && x.du === '2026-10-02') ? (SEMAINES_DETTE[x.du] ?? x) : x))
}

/** Les semaines passées, dans l'ordre, la dette du moteur passée d'une semaine à la suivante. */
function passes(): Calcul[] {
  const t = maintenant()
  const sit = situation()
  const ref = Object.fromEntries(VERSEMENTS_PASSES.map((v) => [v.du, v]))
  const out: Calcul[] = []
  let dette: DetteCalcul = DETTE_NULLE
  const liste = semainesJeu()
  liste.forEach((x, k) => {
    const cal = semaineDe(x.du)
    const tot = totauxDe(x)
    const r = releveDe(tot, dette, cal.au, cal.versement)
    const vp = ref[x.du]
    const numero = 'BLV-VP-' + String(141 - (liste.length - 1 - k)).padStart(4, '0')
    const envoi = vp?.date ?? cal.versement - 90 * 60_000
    const dernier = k === liste.length - 1
    const verse = r.releve.aVerser
    let etatV: Versement['etat'] = 'credite'
    let essais: Versement['essais'] = verse > 0 ? [{ le: envoi, refus: null }] : []
    let prochainEssai: Instant | null = null
    let motifRefus: MotifRefus | null = null
    let crediteLe: Instant | null = verse > 0 ? envoi + 4 * 60_000 : null
    if (dernier && sit === 'envoye') [etatV, crediteLe] = ['envoye', null]
    if (dernier && sit === 'refuse') {
      const x2 = apresRefus(envoi, 'numero_tiers', P09.versementEssais + 1, t)
      ;[etatV, essais, prochainEssai, motifRefus, crediteLe] = [x2.etat, x2.essais, x2.prochainEssai, 'numero_tiers', null]
    }
    const v: Versement = {
      id: 'V-' + x.du,
      reference: vp?.reference ?? numero,
      semaine: { du: x.du, au: cal.au },
      date: envoi,
      lignes: r.lignes,
      gagne: r.gagne,
      especes: r.especes,
      total: verse,
      report: r.releve.dette.montant,
      etat: etatV,
      provisoire: false,
      numero: MASQUE_ACTUEL(),
      envoyeLe: verse > 0 ? envoi : null,
      crediteLe,
      motifRefus,
      motifSuspension: etatV === 'suspendu' ? 'refus_repetes' : null,
      essais,
      prochainEssai,
      reporteAu: null,
      reclamation: null,
    }
    out.push({ semaine: x, totaux: tot, versement: v, releve: r.releve })
    dette = r.releve.dette
  })
  const e = etatArgent.lire()
  for (const c of out) {
    const rec = e.reclamations[c.versement.id]
    if (rec) c.versement.reclamation = { le: rec.le, reponseAvant: rec.reponseAvant, reponse: null }
  }
  return out
}

/** Groupes dont la garde a été encaissée un jour donné (modèle central des colis), réglés par le moteur. */
function encaissements(j: string) {
  const e = etatColis.lire()
  return Object.values(e.groupes)
    .filter((g) => g.encaissee && jourDe(g.encaissee.le) === j)
    .flatMap((g) => {
      const gg = gardeDuGroupe(e, g.id)
      if (!gg) return []
      // Réglée à l'heure de l'encaissement (R37 : tranches de 24 h) : le montant du moteur est celui qui a été encaissé.
      const reglee = gardeReglee(gg, j, PM, false, g.encaissee!.le)
      return [{ groupe: g.id, colis: Object.values(e.colis).filter((c) => c.groupe === g.id).map((c) => c.id), montant: g.encaissee!.montant, le: g.encaissee!.le, par: g.encaissee!.par, reglee, rang: etatGarde(gg, j, P.garde, g.encaissee!.le).rang }]
    })
}

export function caisse(j = aujourdhui()): CaisseDuJour {
  const l = encaissements(j).filter((x) => x.montant > 0)
  const c = caisseDe(l.map((x) => x.reglee))
  return { jour: j, encaissements: l.map(({ colis, montant, le, par }) => ({ colis, montant, le, par })), total: c.especes, partRelais: c.partRelais, partBelivay: c.partBelivay }
}

/** Totaux de la semaine en cours : SEMAINE_AVANT (jeu d'essai, groupes par rang SEMAINE_AVANT_RANGS) + ce que le
 * modèle des colis dit d'aujourd'hui (encaissements réglés par le moteur). */
function totauxEnCours(): { totaux: Totaux; rangs: number[]; recus: number } {
  const neuf = sansHistorique()
  const cal = semaineDe(aujourdhui())
  const rangs = neuf ? [0, 0, 0, 0, 0, 0, 0] : [...SEMAINE_AVANT_RANGS]
  const avant = totauxDe({ du: cal.du, rangs: rangs as SemaineJeu['rangs'], colis: neuf ? zero() : { ...SEMAINE_AVANT.colis }, renvoyes: 0, retours: zero(), recus: 0 })
  const t: Totaux = { ...avant, gardes: [...avant.gardes] }
  const j = aujourdhui()
  for (const c of tousLesColis()) {
    if (c.remise && jourDe(c.remise.le) === j) t.colis[c.classe] += 1
    if (c.journal.some((x) => x.action === 'retour_depose' && jourDe(x.le) === j)) t.retours[c.classe] += 1
  }
  for (const x of encaissements(j)) {
    t.gardes.push(x.reglee)
    if (x.rang) rangs[Math.min(x.rang, 7) - 1] += 1
  }
  const recus = (neuf ? 0 : SEMAINE_AVANT_RECUS) + tousLesColis().filter((c) => c.arrivee.le !== null && jourDe(c.arrivee.le) === j).length
  return { totaux: t, rangs, recus }
}

function enCours(avant: Calcul[]): Calcul {
  const t = maintenant()
  const cal = semaineDe(aujourdhui())
  const { totaux } = totauxEnCours()
  const der = avant[avant.length - 1]
  const e = etatArgent.lire()
  // Dette reportée par le moteur ; une dette à reverser déjà réglée par Mobile Money ne se déduit plus (ARL-05).
  const detteAvant = der && !(der.releve.reversementExige && e.detteReglee) ? der.releve.dette : DETTE_NULLE
  const r = releveDe(totaux, detteAvant, cal.au, cal.versement)
  const num = e.numero
  const ch = e.changement
  const suspenduNumero = !!num.versementsSuspendusJusqua && num.versementsSuspendusJusqua > cal.versement
  const suspenduDette = detteDe(avant).encaissementSuspendu
  const v: Versement = {
    id: 'V-prochain',
    reference: t >= cal.arrete ? 'BLV-VP-' + String(142).padStart(4, '0') : null,
    semaine: { du: cal.du, au: cal.au },
    date: cal.versement,
    lignes: r.lignes,
    gagne: r.gagne,
    especes: r.especes,
    total: r.releve.aVerser,
    report: r.releve.dette.montant,
    etat: suspenduNumero ? 'suspendu' : 'prevu',
    provisoire: t < cal.arrete,
    numero: ch?.etape === 'en_verification' ? ch.nouveau.masque : num.masque,
    envoyeLe: null,
    crediteLe: null,
    motifRefus: null,
    motifSuspension: suspenduNumero ? 'verification_numero' : suspenduDette ? 'dette' : null,
    essais: [],
    prochainEssai: null,
    reporteAu: suspenduNumero ? (ch?.premierVersementLe ?? vendrediApres(num.versementsSuspendusJusqua!)) : null,
    reclamation: null,
  }
  return { semaine: null, totaux, versement: v, releve: r.releve }
}

/** Dette d'espèces vue par le relais (ARL-05) : celle du dernier relevé arrêté, à reverser si le moteur l'exige. */
function detteDe(avant: Calcul[]): Dette {
  const e = etatArgent.lire()
  const der = avant[avant.length - 1]
  const vide: Dette = { montant: 0, semaines: 0, aReverser: false, reference: null, marchand: null, echeance: null, encaissementSuspendu: false, paiement: e.detteReglee ? { demandeLe: e.detteReglee.le, etat: 'confirme' } : null }
  if (!der || !der.releve.dette.montant) return vide
  const d = der.releve.dette
  if (der.releve.reversementExige && !e.detteReglee)
    return { montant: d.montant, semaines: d.semaines, aReverser: true, reference: 'BLV-DR-' + der.versement.reference!.slice(-4), marchand: MARCHAND, echeance: d.echeance, encaissementSuspendu: encaissementSuspendu(d, maintenant()), paiement: null }
  if (der.releve.reversementExige) return vide
  return { ...vide, montant: d.montant, semaines: d.semaines }
}

const gerant = () => membreActuel()?.role === 'proprietaire'
const refuse = () => Promise.reject(new Error('acces_reserve_au_proprietaire'))
const masqueNumero = (n: string) => `${n.slice(0, 1)} •• •• ${n.slice(5, 7)} ${n.slice(7)}`

/** Changement de numéro vu à cet instant : la revue terminée, le nouveau numéro devient actif (MOM-03). */
function numeroAJour() {
  const e = etatArgent.lire()
  const ch = e.changement
  if (ch?.etape === 'en_verification' && ch.revueJusqua! <= maintenant())
    etatArgent.ecrire((x) => {
      x.numero = { operateur: ch.nouveau.operateur, masque: ch.nouveau.masque, statut: 'verifie', verifieLe: ch.revueJusqua, versementsSuspendusJusqua: null }
      x.changement = null
    })
  return etatArgent.lire()
}

/** Versements calculés, gardés tant que rien ne change (états argent et colis, situation, minute) : un écran qui lit
 * plusieurs fois ne recalcule pas toute l'histoire du relais. */
let dernier: { cles: unknown[]; r: { avant: Calcul[]; prochain: Calcul } } | null = null
function tout() {
  numeroAJour()
  const cles = [etatArgent.lire(), etatColis.lire(), situation(), scenario(), Math.floor(maintenant() / 60_000)]
  if (dernier && dernier.cles.every((x, k) => x === cles[k])) return dernier.r
  const avant = passes()
  const prochain = enCours(avant)
  dernier = { cles, r: { avant, prochain } }
  return dernier.r
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function argent(): Argent {
  const { avant, prochain } = tout()
  const e = etatArgent.lire()
  const mois = aujourdhui().slice(0, 7)
  const recus = avant.map((c) => c.versement).filter((v) => v.etat === 'credite' && v.total > 0 && jourDe(v.date).slice(0, 7) === mois)
  const ch = e.changement
  return {
    prochain: prochain.versement,
    caisse: caisse(),
    numero: e.numero,
    changement: ch ? { etape: ch.etape, nouveau: ch.nouveau, codes: ch.codes, revueJusqua: ch.revueJusqua, premierVersementLe: ch.premierVersementLe, alerteEnvoyeeA: ch.alerteEnvoyeeA } : null,
    dette: detteDe(avant),
    recusDuMois: { mois: MOIS[Number(mois.slice(5)) - 1], versements: recus.reverse(), total: recus.reduce((n, v) => n + v.total, 0) },
  }
}

// ── Rapports ───────────────────────────────────────────────────────────────────────────────────────────────────
interface SemaineRapport {
  du: Jour
  au: Jour
  vendredi: Jour
  gagne: number
  enCours: boolean
  recus: number
  remis: number
  retours: number
  rangs: number[]
  renvoyes: number
}
function semainesRapport(): SemaineRapport[] {
  const { avant, prochain } = tout()
  const l: SemaineRapport[] = avant.map((c) => {
    const x = c.semaine!
    const cal = semaineDe(x.du)
    return { du: x.du, au: cal.au, vendredi: cal.vendredi, gagne: c.versement.gagne, enCours: false, recus: x.recus, remis: x.colis.S + x.colis.M + x.colis.L, retours: x.retours.S + x.retours.M + x.retours.L, rangs: [...x.rangs], renvoyes: x.renvoyes }
  })
  const cal = semaineDe(aujourdhui())
  const ec = totauxEnCours()
  const t = prochain.totaux
  l.push({ du: cal.du, au: cal.au, vendredi: cal.vendredi, gagne: prochain.versement.gagne, enCours: true, recus: ec.recus, remis: t.colis.S + t.colis.M + t.colis.L, retours: t.retours.S + t.retours.M + t.retours.L, rangs: ec.rangs, renvoyes: 0 })
  return l
}

function rapport(periode: PeriodeRapport): Rapport {
  const sem = semainesRapport()
  const mois = aujourdhui().slice(0, 7)
  const ouvert = scenario() === 'neuf' ? ajouterJours(aujourdhui(), -1) : OUVERT_LE
  const moisDe = (j: Jour) => j.slice(0, 7)
  const moisAvant = (m: string, n: number) => {
    const [a, x] = m.split('-').map(Number)
    const d = new Date(Date.UTC(a, x - 1 - n, 1))
    return d.toISOString().slice(0, 7)
  }
  let retenues: SemaineRapport[]
  let colonnes: Rapport['colonnes']
  if (periode === 'mois') {
    retenues = sem.filter((x) => moisDe(x.vendredi) === mois)
    colonnes = retenues.map((x) => ({ du: x.du, au: x.au, gagne: x.gagne, enCours: x.enCours, partiel: x.du < ouvert }))
  } else {
    const premier = periode === 'trimestre' ? moisAvant(mois, 2) : moisDe(sem[0]?.vendredi ?? aujourdhui())
    retenues = sem.filter((x) => moisDe(x.vendredi) >= premier)
    const liste: string[] = []
    for (let m = premier; m <= mois; m = moisAvant(m, -1)) liste.push(m)
    colonnes = liste.map((m) => {
      const w = retenues.filter((x) => moisDe(x.vendredi) === m)
      const du = m + '-01'
      return { du, au: ajouterJours(moisAvant(m, -1) + '-01', -1), gagne: w.reduce((n, x) => n + x.gagne, 0), enCours: m === mois, partiel: m === moisDe(ouvert) && ouvert > du }
    })
  }
  const somme = (f: (x: SemaineRapport) => number) => retenues.reduce((n, x) => n + f(x), 0)
  const rang = (a: number, b: number) => somme((x) => x.rangs.slice(a, b).reduce((n, y) => n + y, 0))
  return {
    periode,
    du: retenues[0]?.du ?? aujourdhui(),
    au: retenues[retenues.length - 1]?.au ?? aujourdhui(),
    colonnes,
    gagne: colonnes.reduce((n, c) => n + c.gagne, 0),
    colisRecus: somme((x) => x.recus),
    colisRemis: somme((x) => x.remis),
    retoursDeposes: somme((x) => x.retours),
    delais: [...segmentsDelai().map(([a, b]) => rang(a, b)), somme((x) => x.renvoyes)] as Rapport['delais'],
    semainesActivite: sem.filter((x) => x.au >= ouvert).length,
    ouvertLe: ouvert,
  }
}

// ── Relevés à télécharger (RAP-03 : pour la comptabilité du commerce, aucune mention fiscale non vérifiée) ───────
const ecrire = (n: number) => (n < 0 ? '-' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F'
const latin = (x: string) => x.replace(/[’‘]/g, "'").replace(/[  ]/g, ' ').replace(/−/g, '-').replace(/[·•]/g, '·').replace(/[^\x20-\xff]/g, '?')
const echapper = (x: string) => latin(x).replace(/[\\()]/g, (c) => '\\' + c)
/** PDF texte (une police standard, encodage WinAnsi, pages A4), écrit à la main : aucune bibliothèque. */
export function pdf(lignes: string[]): string {
  const parPage = 48
  const pages: string[][] = []
  for (let k = 0; k < lignes.length; k += parPage) pages.push(lignes.slice(k, k + parPage))
  const objets: string[] = []
  const n = pages.length
  objets.push('<< /Type /Catalog /Pages 2 0 R >>')
  objets.push(`<< /Type /Pages /Kids [${pages.map((_, k) => `${4 + 2 * k} 0 R`).join(' ')}] /Count ${n} >>`)
  objets.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  pages.forEach((p, k) => {
    const flux = ['BT', '/F1 10 Tf', '13 TL', '50 800 Td', ...p.map((l, i) => (i === 0 && k === 0 ? `/F1 14 Tf (${echapper(l)}) Tj T* /F1 10 Tf` : `(${echapper(l)}) Tj T*`)), 'ET'].join('\n')
    objets.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + 2 * k} 0 R >>`)
    objets.push(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`)
  })
  let sortie = '%PDF-1.4\n'
  const positions: number[] = []
  objets.forEach((o, k) => {
    positions.push(sortie.length)
    sortie += `${k + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = sortie.length
  sortie += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${positions.map((x) => String(x).padStart(10, '0') + ' 00000 n \n').join('')}`
  sortie += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return sortie
}

const LIBELLES: Record<LigneVersement['type'], string> = {
  colis: 'Colis remis',
  retour: 'Retours déposés',
  jour_garde: 'Jours de garde facturés',
  jour_offert_belivay: '1er jour payé par BelivaY',
  jour_paye_belivay: 'Jours de garde payés par BelivaY (renvois)',
  especes_part_relais: 'Espèces de garde : votre part, déjà en caisse',
  especes_part_belivay: 'Espèces de garde : part BelivaY',
  bonus_comptoir: 'Colis payés au comptoir',
  frais_versement: 'Frais Mobile Money du versement (1 %)',
  retenue_fiscale: 'Retenue fiscale',
  report: 'Report de la semaine précédente',
  retenue_perte: 'Retenue après arbitrage',
}

function releve(periode: PeriodeRapport, format: 'pdf' | 'csv'): FichierReleve {
  const r = rapport(periode)
  const { avant, prochain } = tout()
  const tous = [...avant.map((c) => c.versement), prochain.versement].filter((v) => v.semaine.au >= r.du && v.semaine.du <= r.au)
  const nom = `belivay-releve-${RELAIS.id}-${periode}-${r.du}-${r.au}`
  if (format === 'csv') {
    const entete = ['semaine_du', 'semaine_au', 'reference', 'etat', 'colis_S', 'colis_M', 'colis_L', 'retours', 'jours_garde', 'jours_offerts_belivay', 'jours_payes_belivay', 'gagne', 'especes_encaissees', 'part_belivay', 'retenue_fiscale', 'report', 'net_verse']
    const q = (v: Versement, t: LigneVersement['type'], k?: ClasseColis) => v.lignes.filter((l) => l.type === t && (!k || l.classe === k)).reduce((n, l) => n + l.quantite, 0)
    const m = (v: Versement, t: LigneVersement['type']) => -v.lignes.filter((l) => l.type === t).reduce((n, l) => n + l.montant, 0)
    const lignes = tous.map((v) => [v.semaine.du, v.semaine.au, v.reference ?? '', v.etat, q(v, 'colis', 'S'), q(v, 'colis', 'M'), q(v, 'colis', 'L'), q(v, 'retour'), q(v, 'jour_garde'), q(v, 'jour_offert_belivay'), q(v, 'jour_paye_belivay'), v.gagne, v.especes, m(v, 'especes_part_belivay'), m(v, 'retenue_fiscale'), m(v, 'report'), v.total].join(';'))
    const mouvements = tousLesColis()
      .flatMap((c) => c.journal.filter((j) => ['lot_valide', 'remis', 'retour_depose', 'parti'].includes(j.action)).map((j) => ({ c, j })))
      .filter((x) => jourDe(x.j.le) >= r.du)
      .sort((a, b) => a.j.le - b.j.le)
      .map(({ c, j }) => [new Date(j.le).toISOString(), j.action, c.id, c.classe, j.par.nom ?? ''].join(';'))
    return { nom: nom + '.csv', type: 'text/csv', contenu: [entete.join(';'), ...lignes, '', 'horodatage;mouvement;colis;classe;par', ...mouvements].join('\n') + '\n' }
  }
  const texte = [
    'BelivaY · Relevé du point relais',
    `${RELAIS.nom} · ${RELAIS.zone}`,
    `Période du ${r.du} au ${r.au} · ${r.semainesActivite} semaines d'activité depuis l'ouverture`,
    '',
    `Gagné sur la période : ${ecrire(r.gagne)}`,
    `Colis reçus : ${r.colisRecus} · remis : ${r.colisRemis} · retours déposés : ${r.retoursDeposes}`,
    '',
  ]
  for (const v of tous) {
    texte.push(`Semaine du ${v.semaine.du} au ${v.semaine.au} · ${v.reference ?? 'référence à l’arrêté'} · ${v.etat}${v.provisoire ? ' (provisoire)' : ''}`)
    for (const l of v.lignes) if (l.montant || l.type === 'colis') texte.push(`   ${LIBELLES[l.type]}${l.classe ? ' ' + l.classe : ''}${l.quantite ? ' · ' + l.quantite : ''} : ${ecrire(l.montant)}`)
    texte.push(`   Net versé : ${ecrire(v.total)}${v.report ? ` · reporté : ${ecrire(v.report)}` : ''}`, '')
  }
  texte.push('Relevé pour la comptabilité du commerce. Versement chaque vendredi avant 12 h, sans frais ni minimum.')
  return { nom: nom + '.pdf', type: 'application/pdf', contenu: pdf(texte) }
}

// ── Domaine ────────────────────────────────────────────────────────────────────────────────────────────────────
const fait = (cle: string) => etatArgent.lire().cles.includes(cle)

export const demoArgent: DomaineArgent = {
  argent: () => (gerant() ? repondre(argent()) : refuse()),
  versements() {
    if (!gerant()) return refuse()
    const { avant, prochain } = tout()
    return repondre([prochain.versement, ...avant.map((c) => c.versement).reverse()])
  },
  versement(id) {
    if (!gerant()) return refuse()
    const { avant, prochain } = tout()
    return repondre([prochain.versement, ...avant.map((c) => c.versement)].find((v) => v.id === id) ?? null)
  },
  async signalerNonRecu(id, o) {
    if (!gerant()) return refuse()
    const v = tout().avant.find((c) => c.versement.id === id)?.versement
    if (!v) return { ok: false, raison: 'introuvable' }
    if (!v.envoyeLe) return { ok: false, raison: 'pas_encore_envoye' }
    const deja = etatArgent.lire().reclamations[id]
    if (deja) return fait(o.cle) ? { ok: true, reponseAvant: deja.reponseAvant } : { ok: false, raison: 'deja_signale' }
    const rep = reponseAvant(o.heure)
    etatArgent.ecrire((e) => void ((e.reclamations[id] = { le: o.heure, reponseAvant: rep }), e.cles.push(o.cle)))
    return { ok: true, reponseAvant: rep }
  },
  async changerNumero(operateur, numero, o) {
    if (!gerant()) return refuse()
    const e = numeroAJour()
    if (e.changement?.etape === 'en_verification') return { ok: false, raison: 'verification_en_cours' }
    const n = numero.replace(/\D/g, '').replace(/^237(?=\d{9}$)/, '')
    const op = operateurDe(n)
    if (!op) return { ok: false, raison: 'prefixe_inconnu' }
    if (op !== operateur) return { ok: false, raison: 'prefixe_operateur' }
    if (op === e.numero.operateur && e.numero.masque.endsWith(n.slice(-4))) return { ok: false, raison: 'meme_numero' }
    const expireA = o.heure + P09.numeroCodes.minutes * 60_000
    etatArgent.ecrire((x) => {
      x.changement = {
        etape: 'codes_envoyes',
        nouveau: { operateur: op, masque: masque(op, n.slice(-4)) },
        codes: { versNouveau: masqueNumero(n), versPersonnel: TELEPHONE_PERSONNEL, expireA, renvoiPossibleA: o.heure + PARAMETRES.connexion.renvoiSecondes * 1000, essaisRestants: PARAMETRES.connexion.codeSmsEssais },
        revueJusqua: null,
        premierVersementLe: null,
        alerteEnvoyeeA: null,
        numeroComplet: n,
        essaisCodes: 0,
      }
    })
    return { ok: true, codesEnvoyes: P09.numeroCodes.nombre, expireA, codeDemo: CODE_SMS_DEMO }
  },
  async renvoyerCodes(o) {
    if (!gerant()) return refuse()
    const ch = etatArgent.lire().changement
    if (!ch || ch.etape !== 'codes_envoyes' || !ch.codes) return { ok: false, raison: 'aucune_demande' }
    if (o.heure < ch.codes.renvoiPossibleA) return { ok: false, raison: 'trop_tot' }
    const expireA = o.heure + P09.numeroCodes.minutes * 60_000
    etatArgent.ecrire((x) => void (x.changement!.codes = { ...ch.codes!, expireA, renvoiPossibleA: o.heure + PARAMETRES.connexion.renvoiSecondes * 1000, essaisRestants: PARAMETRES.connexion.codeSmsEssais }))
    return { ok: true, expireA }
  },
  async confirmerNumero(codes, o) {
    if (!gerant()) return refuse()
    const ch = etatArgent.lire().changement
    if (!ch || ch.etape !== 'codes_envoyes' || !ch.codes) return ch?.etape === 'en_verification' && fait(o.cle) ? { ok: true, suspendusJusqua: ch.revueJusqua!, premierVersementLe: ch.premierVersementLe! } : { ok: false, raison: 'aucune_demande' }
    if (o.heure > ch.codes.expireA) return { ok: false, raison: 'code_expire' }
    if (codes.some((c) => c.replace(/\D/g, '') !== CODE_SMS_DEMO)) {
      const reste = ch.codes.essaisRestants - 1
      etatArgent.ecrire((x) => {
        if (reste <= 0) x.changement = null
        else x.changement!.codes!.essaisRestants = reste
      })
      return { ok: false, raison: reste <= 0 ? 'trop_essais' : 'code_faux' }
    }
    const revue = o.heure + P09.numeroVerifJours * JOUR
    const premier = vendrediApres(revue)
    etatArgent.ecrire((x) => {
      x.changement = { ...x.changement!, etape: 'en_verification', codes: null, revueJusqua: revue, premierVersementLe: premier, alerteEnvoyeeA: x.numero.masque }
      x.numero.versementsSuspendusJusqua = revue
      x.cles.push(o.cle)
    })
    return { ok: true, suspendusJusqua: revue, premierVersementLe: premier }
  },
  async annulerChangement() {
    if (!gerant()) return refuse()
    if (!etatArgent.lire().changement) return { ok: false, raison: 'aucune_demande' }
    etatArgent.ecrire((x) => {
      x.changement = null
      x.numero.versementsSuspendusJusqua = null
    })
    return { ok: true }
  },
  async reverserDette(o) {
    if (!gerant()) return refuse()
    const d = detteDe(passes())
    if (!d.aReverser) return etatArgent.lire().detteReglee && fait(o.cle) ? { ok: true, reference: etatArgent.lire().detteReglee!.reference } : { ok: false, raison: 'aucune_dette' }
    // Démonstration : l'opérateur confirme aussitôt la demande de paiement validée sur le téléphone du gérant.
    etatArgent.ecrire((x) => void ((x.detteReglee = { le: o.heure, reference: d.reference! }), x.cles.push(o.cle)))
    return { ok: true, reference: d.reference! }
  },
  rapport: (periode) => (gerant() ? repondre(rapport(periode)) : refuse()),
  releve: (periode, format) => (gerant() ? repondre(releve(periode, format)) : refuse()),
}
