// Garde au relais et série de rappels S0 à S5 : PORTAGE FIDÈLE de moteurs/belivay_moteurs/garde.py (mêmes notions,
// mêmes noms, mêmes exemples de test : garde.test.ts reprend moteurs/tests/test_garde.py). CL-10 ; CAL-19 à CAL-23 ;
// CGA-13, CGA-17, CGA-24 à CGA-28 ; DP-08, DP-24, DP-29 ; v6 D12 (DP-63, DP-65) ; DP-62.
// - La garde s'applique par GROUPE DE REMISE (un code) (CGA-13).
// - J1 (GARDE-J1-DEBUT, j1De) : jour du dépôt confirmé du dernier colis du groupe si l'avis est délivré ce jour-là,
//   sinon jour où l'avis est délivré au téléphone du client. Sans avis délivré (j0 null), rien n'est facturé ; la
//   relance part par le canal de repli GARDE-NONVU-H heures après l'arrivée.
// - Tarif du rang r (1 à 7) : GARDE-GRILLE[r] ; gros colis (cartons C1, C2) : + GARDE-GROS-AJOUT chaque jour dès le
//   rang 1 (DP-08). Un jour de fermeture n'est ni compté au rang ni facturé (R37, ci-dessous). Un jour de constat, de
//   litige, de groupage ou de transfert en cours (joursSuspendus) n'est ni compté au rang ni facturé : rangs suivants,
//   dernier jour, rappels S0 à S5 et renvoi sont repoussés d'autant, le compte reprend à la levée (CAL-04, PR-RC-06,
//   ARL-43). Constat tranché par un retour au vendeur (retourDecide) : plus de garde du tout. Jour entier (DP-29).
// - Garde plafonnée à la valeur des colis du groupe (CAL-19).
// - Renvoi au vendeur le premier jour ouvert après le rang 7 : retenue = garde + GARDE-RENVOI (v6 : 0 F), jamais plus
//   que ce qui a été payé (DP-24) ; une commande à payer au comptoir non retirée compte comme un refus (GARDE-COMPTOIR).
// - Part du relais : RELAIS-GAIN-GARDE (ou -GROS) par jour facturé, quel que soit ce que le client paie vraiment (v6 D12,
//   « reçu par le relais : 100 F par jour » ; ARL-08, ARL-09, ARL-130) : ni le plafond de la valeur (ARL-10) ni la
//   retenue ramenée au montant payé (DP-24) ne la réduisent ; le 1er jour, gratuit pour le client, est payé au relais
//   par BelivaY (GARDE-J1-BELIVAY). Au renvoi, le relais n'a rien encaissé : BelivaY lui paie tout au versement.
// - v2.0 (DP-69, BV-DEV-01 § 9), comme garde.py : R36, la garde se compte PAR COLIS, quel que soit son format, chacune
//   plafonnée à la valeur de son colis (« colis » : valeurs des colis du groupe ; vide, un colis de la valeur du groupe) ;
//   le relais reçoit ses 100 F par jour et par colis (R38). R37 : une fermeture du relais arrête le compteur : le jour
//   fermé n'est ni compté au rang ni facturé, le 7e jour et le renvoi reculent d'autant (toujours 7 jours de garde).
// - Garde payée en ESPÈCES au gérant, en une fois, au retrait ; la remise reste bloquée tant que l'encaissement n'est
//   pas confirmé ; au versement du vendredi, le relais garde sa part, le reste revient à BelivaY (GARDE-ESPECES).
import type { Instant } from '../donnees/communs'
import type { ParametresGarde } from './registre'
import { HEURE, JOUR, ajouterJours, debutDuJour, ecartJours, jourDe, jourSemaine, type Jour } from './temps'

export const DERNIER_RANG = 7
/** Rangs de S0, S1, S2, S3, S4 (CGA-24). */
export const RANGS_DES_RAPPELS = [2, 3, 5, 6, 7] as const

/** Écriture d'un montant pour les traces, comme argent.ecrire : « 1 000 F », « −900 F » (espaces insécables). */
export const ecrire = (n: number) => (n < 0 ? '−' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F'

/** Premier jour de garde (RNF-08, DP-62) : jour de la délivrance de l'avis (le jour du dépôt s'il est délivré ce
 * jour-là), à l'heure de Yaoundé. L'avis ne précède jamais le dépôt. */
export function j1De(depotConfirme: Instant, avisDelivre: Instant): Jour {
  if (avisDelivre < depotConfirme) throw new Error('avis délivré avant le dépôt confirmé : impossible')
  return jourDe(avisDelivre)
}
/** Jour J0 à Yaoundé d'un accusé fort (un accusé reçu à 23 h 30 UTC tombe le lendemain à Douala). */
export const j0De = (accuseFort: Instant): Jour => jourDe(accuseFort)

export interface HorairesRelais {
  ouverture: number // minutes depuis minuit
  fermeture: number
  joursFermesSemaine: readonly number[] // 0 = lundi … 6 = dimanche
  fermetures: readonly Jour[] // fermetures exceptionnelles
}
export function horaires(ouverture: number, fermeture: number, joursFermesSemaine: readonly number[] = [], fermetures: readonly Jour[] = []): HorairesRelais {
  if ([0, 1, 2, 3, 4, 5, 6].every((j) => joursFermesSemaine.includes(j))) throw new Error('un relais fermé tous les jours de la semaine ne peut pas garder de colis')
  return { ouverture, fermeture, joursFermesSemaine, fermetures }
}
export const ouvert = (h: HorairesRelais, jour: Jour) => !h.joursFermesSemaine.includes(jourSemaine(jour)) && !h.fermetures.includes(jour)

/** Un groupe de remise (un code) arrivé au relais. */
export interface GroupeEnGarde {
  reference: string
  j0: Jour | null // premier jour de garde ; null tant que l'avis n'est pas délivré
  valeur: number // valeur des colis du groupe : plafond de la garde
  montantPaye: number // ce que le client a payé : retenue au plus (DP-24)
  gros: boolean // au moins un carton C1 ou C2
  horaires: HorairesRelais
  joursSuspendus: readonly Jour[] // constat, litige, groupage, transfert (CAL-21)
  rappelsNonDelivres: readonly Jour[] // jours où un rappel n'a pas été délivré : garde de la période annulée (CSM-30)
  auComptoir: boolean // commande à payer au comptoir : non retirée, elle compte comme un refus (v6)
  colis: readonly number[] // valeur de chaque colis du groupe (R36) ; vide : un colis de la valeur du groupe
  retourDecide?: boolean // constat tranché par un retour au vendeur : plus de garde ; le relais garde ses jours (ARL-43)
  /** v2.0 (R37) : scan d'arrivée du dernier colis. Présent : les jours de garde sont des TRANCHES DE 24 H depuis cet
   * instant (moteurs/belivay_moteurs/v20/garde.py : jour_de_garde, date_renvoi), le compteur s'arrêtant pendant les
   * fermetures déclarées (et les jours suspendus) ; absent : jours calendaires depuis J0 (ancien garde.py). */
  arrivee?: Instant | null
}
export function groupe(reference: string, j0: Jour | null, valeur: number, montantPaye: number, gros: boolean, h: HorairesRelais, o: Partial<Pick<GroupeEnGarde, 'joursSuspendus' | 'rappelsNonDelivres' | 'auComptoir' | 'retourDecide' | 'colis' | 'arrivee'>> = {}): GroupeEnGarde {
  return { reference, j0, valeur, montantPaye, gros, horaires: h, joursSuspendus: o.joursSuspendus ?? [], rappelsNonDelivres: o.rappelsNonDelivres ?? [], auComptoir: o.auComptoir ?? false, colis: o.colis ?? [], retourDecide: o.retourDecide ?? false, arrivee: o.arrivee ?? null }
}

// ── v2.0 : tranches de 24 h (portage fidèle de v20/garde.py) ─────────────────────────────────────────────────────
/** Durée d'un jour de garde (garde_heures, R37) et nombre de jours avant renvoi (garde_jours, R39). */
export const GARDE_HEURES = 24
export const GARDE_JOURS = 7
/** Une fermeture déclarée [debut, fin) (Fermeture de v20/garde.py). */
export interface Fermeture {
  debut: Instant
  fin: Instant
}
/** Temps fermé entre debut et fin (_fermee) ; deux fermetures qui se chevauchent ne comptent qu'une fois (R37). */
export function tempsFerme(debut: Instant, fin: Instant, fermetures: readonly Fermeture[]): number {
  let total = 0
  let jusqua = debut
  for (const f of [...fermetures].sort((x, y) => x.debut - y.debut)) {
    const a = Math.max(jusqua, f.debut)
    const b = Math.min(fin, f.fin)
    if (b > a) total += b - a
    jusqua = Math.max(jusqua, Math.min(fin, f.fin))
  }
  return total
}
/** Jour de garde (1 à 7) au moment du retrait : tranches de 24 h, sans les fermetures déclarées (jour_de_garde). */
export function jourDeGarde(arrivee: Instant, maintenant: Instant, fermetures: readonly Fermeture[] = []): number {
  const ouvertMs = maintenant - arrivee - tempsFerme(arrivee, maintenant, fermetures)
  const jour = Math.floor(ouvertMs / (GARDE_HEURES * HEURE)) + 1
  return Math.max(1, Math.min(jour, GARDE_JOURS))
}
/** Début de la tranche r (1 à 8), reculé de chaque fermeture qui la précède ; r = 8 : la date de renvoi (date_renvoi). */
export function debutTranche(arrivee: Instant, r: number, fermetures: readonly Fermeture[] = []): Instant {
  const base = arrivee + (r - 1) * GARDE_HEURES * HEURE
  let fin = base
  for (;;) {
    const recule = base + tempsFerme(arrivee, fin, fermetures)
    if (recule === fin) return fin
    fin = recule
  }
}
/** Fin des 7 jours de garde (date_renvoi). */
export const dateRenvoi = (arrivee: Instant, fermetures: readonly Fermeture[] = []) => debutTranche(arrivee, GARDE_JOURS + 1, fermetures)
/** Cumul de la garde d'un colis au jour r (garde_cumul : 0, 100, 200, 300, 500, 1 000, 2 000 F). */
export const cumulGarde = (p: Pick<ParametresGarde, 'grille'>, r: number) => p.grille.slice(0, Math.max(0, r)).reduce((a, b) => a + b, 0)
/** Garde due au retrait le jour r pour un colis de cette valeur (garde_colis, R36). */
export function gardeColis(p: Pick<ParametresGarde, 'grille'>, r: number, valeur: number): number {
  if (r < 1 || r > GARDE_JOURS) throw new Error(`jour de garde hors de 1 à ${GARDE_JOURS} : ${r}`)
  return Math.min(cumulGarde(p, r), valeur)
}
/** Une commande de plusieurs colis paie la garde de chaque colis (garde_commande). */
export const gardeCommande = (p: Pick<ParametresGarde, 'grille'>, r: number, valeurs: readonly number[]) => valeurs.reduce((n, v) => n + gardeColis(p, r, v), 0)
/** (part du relais, dont payée par BelivaY) : 100 F par jour et par colis, le jour 1 payé par BelivaY (part_relais, R38). */
export function partRelaisGarde(p: Pick<ParametresGarde, 'gainRelaisJour' | 'j1PayeParBelivay'>, r: number, colis: number): [number, number] {
  return [p.gainRelaisJour * r * colis, p.j1PayeParBelivay ? p.gainRelaisJour * colis : 0]
}
/** Fermetures déclarées d'un groupe en périodes : jours de fermeture exceptionnelle et jours suspendus (constat…). */
export const fermeturesDe = (g: GroupeEnGarde): Fermeture[] => [...new Set([...g.horaires.fermetures, ...g.joursSuspendus])].sort().map((j) => ({ debut: debutDuJour(j), fin: debutDuJour(j) + JOUR }))
/** Horloge de lecture (branchée par la démonstration ou le serveur) : « aujourd'hui » se lit à l'instant présent. */
let horloge: (() => Instant) | null = null
export const brancherHorloge = (f: (() => Instant) | null) => void (horloge = f)
/** Instant de lecture d'un jour : l'instant donné ; aujourd'hui, maintenant ; sinon la fin du jour (à Yaoundé). */
function lecture(jour: Jour, a?: Instant): Instant {
  if (a !== undefined) return a
  const t = horloge?.()
  return t !== undefined && jourDe(t) === jour ? t : debutDuJour(jour) + JOUR - 1
}
const enTranches = (g: GroupeEnGarde): g is GroupeEnGarde & { arrivee: Instant } => g.arrivee !== null && g.arrivee !== undefined
/** Valeur de chaque colis (R36) : un colis de la valeur du groupe si elles ne sont pas données. */
export const valeursColis = (g: GroupeEnGarde): readonly number[] => (g.colis.length ? g.colis : [g.valeur])
/** Jour qui compte dans la garde : ni suspendu (PR-RC-06), ni fermé (R37 : le compteur s'arrête). */
export const compte = (g: GroupeEnGarde, jour: Jour) => !g.joursSuspendus.includes(jour) && ouvert(g.horaires, jour)

/** Rang du jour : jours depuis J0, jours suspendus et fermés non comptés ; null un tel jour. */
export function rang(g: GroupeEnGarde, jour: Jour, a?: Instant): number | null {
  if (enTranches(g)) {
    if (g.j0 === null || lecture(jour, a) < g.arrivee || g.joursSuspendus.includes(jour) || g.horaires.fermetures.includes(jour)) return null
    const fin = dateRenvoi(g.arrivee, fermeturesDe(g))
    return lecture(jour, a) >= fin ? GARDE_JOURS + 1 : jourDeGarde(g.arrivee, lecture(jour, a), fermeturesDe(g))
  }
  if (g.j0 === null || jour < g.j0 || !compte(g, jour)) return null
  let n = 0
  for (let k = 0; k <= ecartJours(g.j0, jour); k++) if (compte(g, ajouterJours(g.j0, k))) n++
  return n
}
/** Jour du rang donné, en sautant les jours suspendus et fermés (un constat ou une fermeture repousse tout, R37). */
export function jourDuRang(g: GroupeEnGarde, r: number): Jour {
  if (g.j0 === null) throw new Error(`${g.reference} : pas d'avis délivré, aucun rang`)
  // Après le 7e jour, le renvoi part le jour qui suit le dernier jour de retrait (la garde finit dans la journée).
  if (enTranches(g)) return r > GARDE_JOURS ? ajouterJours(jourDe(dateRenvoi(g.arrivee, fermeturesDe(g)) - 1), r - GARDE_JOURS) : jourDe(debutTranche(g.arrivee, r, fermeturesDe(g)))
  let jour = g.j0
  let n = 0
  for (;;) {
    if (compte(g, jour) && ++n >= r) return jour
    jour = ajouterJours(jour, 1)
  }
}
/** Relais ouvert et garde non suspendue (constat, litige, groupage, transfert). */
export const retirableCeJour = compte

/** CSM-30 : du jour du rappel non délivré jusqu'au rappel suivant (non compris), aucun frais (DP-48). */
export function joursSansFrais(g: GroupeEnGarde): Set<Jour> {
  const libres = new Set<Jour>()
  if (!g.rappelsNonDelivres.length || g.j0 === null) return libres
  const jours = RANGS_DES_RAPPELS.map((r) => jourDuRang(g, r)).sort()
  for (const nd of g.rappelsNonDelivres) {
    const suivant = jours.find((j) => j > nd && !g.rappelsNonDelivres.includes(j))
    const fin = suivant ?? jourDuRang(g, DERNIER_RANG + 1)
    for (let k = 0; k < ecartJours(nd, fin); k++) libres.add(ajouterJours(nd, k))
  }
  return libres
}

export function tarifDuJour(g: GroupeEnGarde, jour: Jour, p: ParametresGarde): number {
  if (enTranches(g)) {
    const r = rang(g, jour)
    return r === null || r > DERNIER_RANG ? 0 : p.grille[r - 1]
  }
  const r = rang(g, jour)
  if (r === null || r > DERNIER_RANG || !ouvert(g.horaires, jour)) return 0
  if (joursSansFrais(g).has(jour)) return 0
  return p.grille[r - 1] + (g.gros ? p.ajoutGros : 0)
}

export interface EtatGarde {
  jour: Jour
  rang: number | null
  du: number // garde due ce jour-là, jour entamé compris, plafonnée à la valeur
  tarifDuJour: number // tarif de la grille pour ce jour (0 s'il n'est pas facturé)
  ajoutDuJour: number // ce que ce jour ajoute vraiment au montant dû, plafond compris
  duDemain: number // ce qui sera dû demain (« 500 F demain »)
  joursFactures: number
  gainRelais: number // 100 F par jour facturé, plus le 1er jour payé par BelivaY (v6 D12, ARL-130)
  payeParBelivay: number // part du gain payée par BelivaY : le 1er jour, gratuit pour le client
}

function j1PayeParBelivay(g: GroupeEnGarde, jour: Jour, p: ParametresGarde): boolean {
  // ARL-07 : GARDE-GROS-AJOUT à 0, le 1er jour d'un gros colis est gratuit et payé par BelivaY, comme garde.py.
  if (!p.j1PayeParBelivay || g.j0 === null || p.grille[0] + (g.gros ? p.ajoutGros : 0) !== 0) return false
  const j1 = jourDuRang(g, 1) // un constat ouvert dès l'arrivée repousse le 1er jour (PR-RC-06)
  return jour >= j1 && !joursSansFrais(g).has(j1)
}

/** Garde due le jour donné, jour entamé compris (« Montant dû : 300 F · 500 F demain »). */
export function etat(g: GroupeEnGarde, jour: Jour, p: ParametresGarde, a?: Instant): EtatGarde {
  if (enTranches(g)) return etatEnTranches(g, jour, p, a)
  const cumul = (jusquAu: Jour): [number, number] => {
    if (g.j0 === null || jusquAu < g.j0) return [0, 0]
    const jours = Array.from({ length: DERNIER_RANG }, (_, k) => jourDuRang(g, k + 1)).filter((j) => j <= jusquAu)
    const tarifs = jours.map((j) => tarifDuJour(g, j, p))
    // R36 : chaque colis paie la grille, plafonnée à sa valeur. Retour décidé (PR-RC-06) : rien n'est dû au client ;
    // les jours déjà facturés restent payés au relais.
    const somme = tarifs.reduce((a, b) => a + b, 0)
    const du = valeursColis(g).reduce((n, v) => n + Math.min(somme, v), 0)
    return [g.retourDecide ? 0 : du, tarifs.filter((t) => t > 0).length]
  }
  const [du, factures] = cumul(jour)
  const [veille] = cumul(ajouterJours(jour, -1))
  const [duDemain] = cumul(ajouterJours(jour, 1))
  // v6 D12 : 100 F par jour facturé, même sous le plafond de la valeur ; BelivaY paie la différence (ARL-130).
  const n = valeursColis(g).length
  const gain = factures * (g.gros ? p.gainRelaisJourGros : p.gainRelaisJour) * n
  const belivay = j1PayeParBelivay(g, jour, p) ? p.gainRelaisJour * n : 0
  return { jour, rang: rang(g, jour), du, tarifDuJour: tarifDuJour(g, jour, p), ajoutDuJour: du - veille, duDemain, joursFactures: factures, gainRelais: gain + belivay, payeParBelivay: belivay }
}

/** v2.0 : la garde au moment `a` (ou à la fin du jour), en tranches de 24 h depuis l'arrivée (R36, R37, R38). */
function etatEnTranches(g: GroupeEnGarde & { arrivee: Instant }, jour: Jour, p: ParametresGarde, a?: Instant): EtatGarde {
  const quand = lecture(jour, a)
  const n = valeursColis(g).length
  if (g.j0 === null || quand < g.arrivee) return { jour, rang: null, du: 0, tarifDuJour: 0, ajoutDuJour: 0, duDemain: 0, joursFactures: 0, gainRelais: 0, payeParBelivay: 0 }
  const r = jourDeGarde(g.arrivee, quand, fermeturesDe(g))
  const du = (k: number) => (g.retourDecide ? 0 : gardeCommande(p, Math.min(Math.max(k, 1), GARDE_JOURS), valeursColis(g)))
  const [gain, belivay] = partRelaisGarde(p, r, n)
  return { jour, rang: rang(g, jour, a), du: du(r), tarifDuJour: p.grille[r - 1], ajoutDuJour: du(r) - (r > 1 ? du(r - 1) : 0), duDemain: du(r + 1), joursFactures: p.grille.slice(0, r).filter((x) => x > 0).length, gainRelais: p.j1PayeParBelivay ? gain : gain - p.gainRelaisJour * n, payeParBelivay: belivay }
}

/** Une ligne du détail de la garde (ticket du retrait) : « 1er jour · offert », « relais fermé », « constat, sans frais ». */
export interface JourDeGarde {
  jour: Jour
  rang: number | null // null : jour suspendu, non compté
  tarif: number
  ferme: boolean
  suspendu: boolean
}
/** Jours du J0 au jour donné, au plus jusqu'au rang 7 (jours_de_garde de garde.py) ; vide sans avis délivré. */
export function joursDeGarde(g: GroupeEnGarde, jusquAu: Jour, p: ParametresGarde, a?: Instant): JourDeGarde[] {
  if (g.j0 === null) return []
  if (enTranches(g)) {
    if (lecture(jusquAu, a) < g.arrivee) return []
    const r = jourDeGarde(g.arrivee, lecture(jusquAu, a), fermeturesDe(g))
    return Array.from({ length: r }, (_, k) => ({ jour: jourDe(debutTranche(g.arrivee, k + 1, fermeturesDe(g))), rang: k + 1, tarif: p.grille[k], ferme: false, suspendu: false }))
  }
  const fin = [jusquAu, jourDuRang(g, DERNIER_RANG)].sort()[0]
  return Array.from({ length: ecartJours(g.j0, fin) + 1 }, (_, k) => ajouterJours(g.j0!, k)).map((jour) => ({ jour, rang: rang(g, jour), tarif: tarifDuJour(g, jour, p), ferme: !ouvert(g.horaires, jour), suspendu: g.joursSuspendus.includes(jour) }))
}

/** Dernier jour ouvert et non suspendu jusqu'au rang 7 compris (« retrait avant le sam. 26 au soir »). */
export function dernierJourDeRetrait(g: GroupeEnGarde): Jour | null {
  if (g.j0 === null || g.retourDecide) return null
  if (enTranches(g)) return jourDe(dateRenvoi(g.arrivee, fermeturesDe(g)) - 1)
  return jourDuRang(g, DERNIER_RANG) // R37 : un jour de rang est toujours ouvert et non suspendu
}

export interface Renvoi {
  jour: Jour
  garde: number
  retenue: number // garde + renvoi, jamais plus que le payé (DP-24)
  rembourse: number // vers le moyen d'origine, avec S5
  gainRelais: number // 100 F par jour facturé et le 1er jour, quelle que soit la retenue (ARL-08, ARL-09)
  trace: string[]
  compteCommeRefus: boolean // commande à payer au comptoir (GARDE-COMPTOIR)
  payeParBelivay: number // tout le gain : le relais n'a rien encaissé, BelivaY le paie au versement (ARL-08)
}


/** Renvoi au vendeur le premier jour ouvert après le rang 7, jamais pendant un constat, un litige, un groupage ou un
 * transfert (CAL-22, CAL-21) ; null sans avis délivré. */
export function renvoi(g: GroupeEnGarde, p: ParametresGarde): Renvoi | null {
  if (g.j0 === null || g.retourDecide) return null // retour décidé : le colis part comme retour, pas comme renvoi
  const jour = jourDuRang(g, DERNIER_RANG + 1) // le premier jour ouvert et non suspendu après le 7e (R37)
  const e = etat(g, jourDuRang(g, DERNIER_RANG), p)
  const garde = e.du
  const brut = garde + p.renvoi
  const retenue = Math.min(brut, g.montantPaye)
  // Retenue ramenée au montant payé (DP-24). Le relais, lui, n'a rien encaissé : BelivaY lui paie tous ses jours au
  // versement, quelle que soit la retenue (v6 D12, ARL-08, ARL-09 ; avant : au plus la garde retenue, CGA-18).
  const gain = e.gainRelais
  const trace = [`Garde des rangs 1 à 7 : ${ecrire(garde)} (CAL-19, GARDE-GRILLE, DP-08)`, `Retenue = ${ecrire(garde)} + ${ecrire(p.renvoi)} = ${ecrire(brut)} (CAL-22, GARDE-RENVOI, v6)`]
  if (retenue < brut) trace.push(`Retenue ramenée au montant payé : ${ecrire(retenue)} (DP-24)`)
  trace.push(`Remboursé = ${ecrire(g.montantPaye)} − ${ecrire(retenue)} = ${ecrire(g.montantPaye - retenue)} (CGA-17)`)
  if (g.auComptoir) trace.push('Commande à payer au comptoir non retirée : comptée comme un refus (GARDE-COMPTOIR)')
  trace.push(`Relais : ${ecrire(gain)} payés par BelivaY au versement (RELAIS-GAIN-GARDE par jour, ARL-08, ARL-09)`)
  return { jour, garde, retenue, rembourse: g.montantPaye - retenue, gainRelais: gain, trace, compteCommeRefus: g.auComptoir, payeParBelivay: gain }
}

export interface ReglementAuRetrait {
  remisePossible: boolean // la remise reste bloquée tant que le gérant n'a pas confirmé l'encaissement
  especesAEncaisser: number // garde due, en espèces, en une fois
  partDuRelais: number // gardée par le relais sur les espèces (et le 1er jour payé par BelivaY)
  aReverserABelivay: number // retenu au versement du vendredi du relais ; négatif : BelivaY doit au relais
}

/** Retrait au relais (GARDE-ESPECES) : le système calcule la garde, le gérant la reçoit en espèces et confirme
 * l'encaissement ; sans confirmation, la remise reste bloquée (sauf garde nulle). 3e jour : 200 F encaissés, 300 F
 * au relais (100 F du 1er jour payés par BelivaY), −100 F reversés (BelivaY doit 100 F au relais). */
export function reglementAuRetrait(g: GroupeEnGarde, jour: Jour, encaissementConfirme: boolean, p: ParametresGarde): ReglementAuRetrait {
  const e = etat(g, jour, p)
  return { remisePossible: e.du === 0 || encaissementConfirme, especesAEncaisser: e.du, partDuRelais: e.gainRelais, aReverserABelivay: e.du - e.gainRelais }
}

/** Sans avis délivré, relance par le canal de repli et alerte « colis non vu » (CAL-20, GARDE-NONVU-H). */
export const relanceNonVu = (arrivee: Instant, p: ParametresGarde): Instant => arrivee + p.nonVuHeures * HEURE

export type Canal = 'push' | 'SMS'
export interface Rappel {
  code: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5'
  jour: Jour
  heure: number | null // minutes depuis minuit ; null : au départ du colis (S5)
  canal: Canal
  envoye: boolean
  motif: string // pourquoi il part ou ne part pas
  du: number
  duDemain: number
  dernierJour: Jour | null
  dernierJourDeRetrait: boolean // rappel « dernier jour », à l'ouverture du relais (CGA-25, CGA-26)
}

/** Série S0 à S5 (CAL-23, CGA-24 à CGA-28), revérifiée juste avant l'envoi : colis retiré, constat, jour fermé. Sous
 * SMS-ECO, S1 et S2 partent en push (CSM-14). `montantPanier` : le sous-total de la commande (DP-48). */
export function rappels(g: GroupeEnGarde, p: ParametresGarde, montantPanier: number, retireLe: Jour | null = null): Rappel[] {
  if (g.j0 === null || g.retourDecide) return []
  const limite = dernierJourDeRetrait(g)
  const sms: Canal = montantPanier < p.seuilSmsEco ? 'push' : 'SMS'
  const rappel = (code: Rappel['code'], jour: Jour, canal: Canal, dernier: boolean): Rappel => {
    const e = etat(g, jour, p)
    let motif = 'à envoyer'
    let envoye = true
    if (retireLe !== null && retireLe <= jour) [motif, envoye] = ['colis retiré', false]
    return { code, jour, heure: dernier ? g.horaires.ouverture : p.heureRappel, canal, envoye, motif, du: e.du, duDemain: e.duDemain, dernierJour: limite, dernierJourDeRetrait: dernier }
  }
  // Le rappel qui tombe le dernier jour de retrait devient « dernier jour », à l'ouverture du relais, quel que soit
  // son rang ; s'il n'y en a pas, S4 est placé ce jour-là.
  const serie: Rappel[] = (
    [
      ['S0', 2, 'push'],
      ['S1', 3, sms],
      ['S2', 5, sms],
      ['S3', 6, 'push'],
    ] as const
  ).map(([code, r, canal]) => {
    const jour = jourDuRang(g, r)
    return rappel(code, jour, canal, jour === limite)
  })
  serie.push(rappel('S4', limite!, 'push', true)) // R37 : le 7e jour est toujours ouvert, le dernier jour
  const r = renvoi(g, p)!
  if (retireLe !== null && retireLe <= r.jour) serie.push({ code: 'S5', jour: r.jour, heure: null, canal: 'push', envoye: false, motif: 'colis retiré', du: 0, duDemain: 0, dernierJour: null, dernierJourDeRetrait: false })
  else serie.push({ code: 'S5', jour: r.jour, heure: null, canal: 'push', envoye: true, motif: 'renvoi au vendeur', du: r.retenue, duDemain: 0, dernierJour: limite, dernierJourDeRetrait: false })
  return serie
}
