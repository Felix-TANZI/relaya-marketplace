// Entreprise de livraison : achat des prestations, plafonds, valeur transportée, retenues et versement du vendredi.
// Portage fidèle de moteurs/belivay_moteurs/livraison.py (mêmes règles, mêmes exemples dans livraison.test.ts) :
//   plafond d'achat = ⌊(prix client − part du relais) ÷ 1,1⌋ à la dizaine (ENT-PLAFOND-ACHAT, RNF-02)
//   prix payé       = MIN(tarif de la grille ; plafond), colis par colis (A-01) ; − 20 % en retard (A-05)
// BelivaY ne perd jamais. L'entreprise et le livreur ne voient jamais le prix payé par le client (DED-27) : ces calculs
// servent au serveur et à la console ; l'écran de l'entreprise n'affiche que le prix accepté et ses retenues.
import { DECALAGE_YAOUNDE_MS, JOUR, MINUTE } from './temps'
import { LIVRAISON, PrestationInvalide, type Classe, type ParametresClient, type ParametresEntreprise } from './vigueur'

export type TypePrestation = 'relais' | 'domicile' | 'transfert' | 'retour'
export type PalierEntreprise = 'Nouveau' | 'Confirmé' | 'Or'

const CLASSES: Classe[] = ['S', 'M', 'L', 'XL', 'HG']
const positif = (nom: string, v: number) => {
  if (!Number.isInteger(v) || v < 0) throw new PrestationInvalide(`${nom} invalide ${v} (francs entiers positifs ou nuls)`)
}
const classeValide = (c: string): Classe => {
  if (!CLASSES.includes(c as Classe)) throw new PrestationInvalide(`classe de colis inconnue « ${c} »`)
  return c as Classe
}

/** ⌊(prix client − part du relais) ÷ (1 + marge)⌋ à la dizaine inférieure, jamais négatif : (900 − 200) ÷ 1,1 → 630 F. */
export function plafondAchat(prixClient: number, partRelais: number, pe: ParametresEntreprise = LIVRAISON.entreprise): number {
  positif('prix client', prixClient)
  positif('part du relais', partRelais)
  const net = Math.max(prixClient - partRelais, 0)
  return Math.floor((net * 100) / ((100 + pe.margePourCent) * 10)) * 10
}

/** Supplément XL selon la distance (DP-07) : « moins de 5 km » exclut 5 km, « 5 à 10 km » comprend 10 km. */
function supplement(classe: Classe, distanceKm: number | null, pc: ParametresClient): number {
  if (classe === 'S') return 0
  if (classe === 'M' || classe === 'L') return pc.supplementML
  if (distanceKm === null || !(distanceKm >= 0)) throw new PrestationInvalide(`colis ${classe} sans distance de livraison à domicile (LIV-SUPPL-XL)`)
  const p = pc.supplementXL.find((x) => x.borneKm === null || distanceKm < x.borneKm || (x.comprise && distanceKm === x.borneKm))!
  return p.montant
}

export interface Options {
  premierDeLaZone?: boolean
  distanceKm?: number | null
}

/** Ce que le client paie pour la prestation, sur la grille client en vigueur (RNF-02) : la base du plafond. */
export function prixClient(prestation: TypePrestation, classe: Classe, o: Options = {}, pc: ParametresClient = LIVRAISON.client, pe: ParametresEntreprise = LIVRAISON.entreprise): number {
  classeValide(classe)
  if (prestation === 'retour') return pe.trajetRetour
  if (prestation === 'transfert') {
    if (classe === 'XL' || classe === 'HG') throw new PrestationInvalide(`transfert d'un colis ${classe} : jamais au relais`)
    return pc.transfert[classe]
  }
  const ramassage = o.premierDeLaZone === false ? pc.ramassageSuivant : pc.ramassage
  if (prestation === 'relais') {
    if (classe === 'XL' || classe === 'HG') throw new PrestationInvalide(`colis ${classe} interdit en relais (LIV-XL-RELAIS) : livraison à domicile seulement`)
    return ramassage + pc.remiseRelais[classe]
  }
  return ramassage + pc.remiseDomicile + supplement(classe, o.distanceKm ?? null, pc)
}

/** Part du gérant du relais : 200 / 250 / 400 F pour un dépôt S, M, L ; 0 F ailleurs. */
export function partRelais(prestation: TypePrestation, classe: Classe, pe: ParametresEntreprise = LIVRAISON.entreprise): number {
  return prestation === 'relais' && classe !== 'XL' && classe !== 'HG' ? pe.partRelais[classe] : 0
}

export function plafondDeLaPrestation(prestation: TypePrestation, classe: Classe, o: Options = {}, pc: ParametresClient = LIVRAISON.client, pe: ParametresEntreprise = LIVRAISON.entreprise): number {
  return plafondAchat(prixClient(prestation, classe, o, pc, pe), partRelais(prestation, classe, pe), pe)
}

// ── Grille de l'entreprise ─────────────────────────────────────────────────────────────────────────────────────────

export interface TrancheTournee {
  de: number
  a: number | null // null : et plus
  tarif: number
}
/** Grille contractuelle d'une entreprise (données du contrat, pas du registre). */
export interface GrilleEntreprise {
  tournee: TrancheTournee[]
  horsZone?: number
  cartonC2?: number
  domicile?: number
  domicileZones?: [string, number][] // ['Z1', 1200] : course qui part de cette zone ou y arrive
}

export function verifierGrille(g: GrilleEntreprise): GrilleEntreprise {
  if (!g.tournee.length) throw new PrestationInvalide('grille sans tranche de tournée')
  let attendu: number | null = 1
  for (const t of g.tournee) {
    positif('tarif de tournée', t.tarif)
    if (attendu === null || t.de !== attendu || (t.a !== null && t.a < t.de)) throw new PrestationInvalide('tranches de tournée continues, de 1 colis à « et plus »')
    attendu = t.a === null ? null : t.a + 1
  }
  if (attendu !== null) throw new PrestationInvalide('la dernière tranche de tournée va « et plus »')
  for (const v of [g.horsZone ?? 0, g.cartonC2 ?? 0, g.domicile ?? 0, ...(g.domicileZones ?? []).map(([, x]) => x)]) positif('supplément de grille', v)
  return g
}

export function tarifTournee(g: GrilleEntreprise, colisDuPaquet: number): number {
  if (colisDuPaquet < 1) throw new PrestationInvalide('paquet sans colis')
  return g.tournee.find((t) => t.a === null || colisDuPaquet <= t.a)!.tarif
}
export const tarifDomicile = (g: GrilleEntreprise, zones: string[]): number => Math.max(g.domicile ?? 0, ...(g.domicileZones ?? []).filter(([z]) => zones.includes(z)).map(([, v]) => v))

export interface ColisAchete {
  reference: string
  classe: Classe
  premierDeLaZone?: boolean
  horsZone?: boolean
  cartonC2?: boolean // colis L seulement (RNF-07)
}
export interface LigneAchat {
  reference: string
  tarif: number
  plafond: number
  paye: number
  ecrete: number
}
const ligne = (reference: string, tarif: number, plafond: number): LigneAchat => {
  const paye = Math.min(tarif, plafond)
  return { reference, tarif, plafond, paye, ecrete: tarif - paye }
}

/** Prix accepté d'un paquet relais : tarif de la tranche (+ hors zone, + C2), écrêté au plafond de chaque classe. */
export function acheterPaquetRelais(colis: ColisAchete[], g: GrilleEntreprise, pc: ParametresClient = LIVRAISON.client, pe: ParametresEntreprise = LIVRAISON.entreprise) {
  verifierGrille(g)
  if (!colis.length) throw new PrestationInvalide('paquet sans colis')
  const base = tarifTournee(g, colis.length)
  const lignes = colis.map((c) => {
    classeValide(c.classe)
    if (c.cartonC2 && c.classe !== 'L') throw new PrestationInvalide(`${c.reference} : carton C2 pour un colis L seulement (RNF-07)`)
    const tarif = base + (c.horsZone ? (g.horsZone ?? 0) : 0) + (c.cartonC2 ? (g.cartonC2 ?? 0) : 0)
    return ligne(c.reference, tarif, plafondDeLaPrestation('relais', c.classe, { premierDeLaZone: c.premierDeLaZone !== false }, pc, pe))
  })
  return { lignes, total: lignes.reduce((t, l) => t + l.paye, 0), ecrete: lignes.reduce((t, l) => t + l.ecrete, 0) }
}

/** Course domicile, une commande seule (v6) : tarif de la grille écrêté au plafond des frais du client. */
export function acheterCourseDomicile(classe: Classe, zones: string[], g: GrilleEntreprise, o: { distanceKm?: number | null; cartonC2?: boolean } = {}, pc: ParametresClient = LIVRAISON.client, pe: ParametresEntreprise = LIVRAISON.entreprise): LigneAchat {
  verifierGrille(g)
  const tarif = tarifDomicile(g, zones) + (o.cartonC2 ? (g.cartonC2 ?? 0) : 0)
  return ligne('domicile', tarif, plafondDeLaPrestation('domicile', classe, { distanceKm: o.distanceKm ?? null }, pc, pe))
}

/** Transfert ou course de retour (A-03) : tarif de tournée, écrêté au plafond (360 / 540 F ; 450 F). */
export function acheterMission(prestation: 'transfert' | 'retour', classe: Classe, tarif: number, pc: ParametresClient = LIVRAISON.client, pe: ParametresEntreprise = LIVRAISON.entreprise): LigneAchat {
  positif('tarif', tarif)
  return ligne(prestation, tarif, plafondDeLaPrestation(prestation, classe, {}, pc, pe))
}

const F = (n: number) => `${n.toLocaleString('fr-FR').replace(/[ \s]/g, ' ')} F`

/** Lignes de la grille au-dessus d'un plafond, pour la console (ENT-REM-02) ; écrêtées au paiement (A-01). */
export function lignesAuDessusDuPlafond(g: GrilleEntreprise, pc: ParametresClient = LIVRAISON.client, pe: ParametresEntreprise = LIVRAISON.entreprise): string[] {
  verifierGrille(g)
  const alertes: string[] = []
  for (const t of g.tournee) {
    const tranche = t.a !== null ? `${t.de} à ${t.a} colis` : `${t.de} colis et plus`
    for (const classe of ['S', 'M', 'L'] as const)
      for (const [premier, quoi] of [[true, ''], [false, ', 2e boutique de la zone']] as const) {
        const plafond = plafondDeLaPrestation('relais', classe, { premierDeLaZone: premier }, pc, pe)
        for (const [ajout, nom] of [[0, ''], [g.horsZone ?? 0, ', hors zone'], [g.cartonC2 ?? 0, ', carton C2']] as const) {
          if ((nom && !ajout) || (nom === ', carton C2' && classe !== 'L')) continue
          if (t.tarif + ajout > plafond) alertes.push(`tournée ${tranche}, colis ${classe}${quoi}${nom} : ${F(t.tarif + ajout)} > ${F(plafond)}`)
        }
      }
  }
  return alertes
}

// ── Valeur transportée et retenues ─────────────────────────────────────────────────────────────────────────────────

/** Nouveau 75 000 F, Confirmé 250 000 F, Or sans plafond (null) ; Or sans assurance valide : plafond de Confirmé. */
export function plafondDeValeur(palier: PalierEntreprise, assuranceValide: boolean, pe: ParametresEntreprise = LIVRAISON.entreprise): number | null {
  return pe.plafondsValeur[palier === 'Or' && !assuranceValide ? 'Confirmé' : palier]
}
/** Un colis au-delà du plafond du palier n'est jamais proposé (ENT-PAL-01, ENT-PAL-04). */
export function colisVisible(valeur: number, palier: PalierEntreprise, assuranceValide: boolean, pe: ParametresEntreprise = LIVRAISON.entreprise): boolean {
  positif('valeur', valeur)
  const p = plafondDeValeur(palier, assuranceValide, pe)
  return p === null || valeur <= p
}

export interface Retenue {
  dossier: string
  article: number
  livraison: number
  trajetRetour: number
  nonRetenu: number
  total: number
}
/** Transporteur en tort (A-06, DED-10) : article plafonné au palier ; livraison et trajet retour en plus, sans plafond. */
export function retenueEnTort(dossier: string, netVendeur: number, livraisonRemboursee: number, palier: PalierEntreprise, assuranceValide: boolean, o: { trajetRetour?: boolean } = {}, pe: ParametresEntreprise = LIVRAISON.entreprise): Retenue {
  positif('net vendeur', netVendeur)
  positif('livraison remboursée', livraisonRemboursee)
  const p = plafondDeValeur(palier, assuranceValide, pe)
  const article = p === null ? netVendeur : Math.min(netVendeur, p)
  const trajetRetour = o.trajetRetour === false ? 0 : pe.trajetRetour
  return { dossier, article, livraison: livraisonRemboursee, trajetRetour, nonRetenu: netVendeur - article, total: article + livraisonRemboursee + trajetRetour }
}

// ── Versement du vendredi ──────────────────────────────────────────────────────────────────────────────────────────

/** Jour civil (« AAAA-MM-JJ ») du vendredi de versement d'une mission validée à l'instant `valideLe`. */
export function vendrediDeVersement(valideLe: number, pe: ParametresEntreprise = LIVRAISON.entreprise): string {
  const local = valideLe + DECALAGE_YAOUNDE_MS
  const minuit = Math.floor(local / JOUR) * JOUR
  const jourSemaine = (new Date(minuit).getUTCDay() + 6) % 7
  let arrete = minuit + (((pe.jourArrete - jourSemaine) % 7) + 7) % 7 * JOUR
  if (local >= arrete + (pe.heureArrete.h * 60 + pe.heureArrete.min + 1) * MINUTE) arrete += 7 * JOUR
  return new Date(arrete + ((((pe.jourVersement - pe.jourArrete) % 7) + 7) % 7) * JOUR).toISOString().slice(0, 10)
}

export interface Prestation {
  reference: string
  prix: number
  validee: boolean
  enRevue?: boolean
  litigeOuvert?: boolean
  retard?: boolean
  incidentTiers?: boolean
}
export interface LigneReleve {
  reference: string
  prix: number
  minoration: number
  paye: number
}
export interface Versement {
  payees: LigneReleve[]
  reportees: string[]
  prestations: number
  retenues: number
  reportPrecedent: number
  aVerser: number
  soldeReporte: number
  vendredisDeReport: number
  planDApurement: boolean
}

/** 20 % du prix d'un colis en retard, au franc, moitié vers le haut : 630 F → 126 F. */
export function minoration(prix: number, pe: ParametresEntreprise = LIVRAISON.entreprise): number {
  return Math.floor((prix * Math.round(pe.minorationPourCent * 100) + 5000) / 10000)
}

/** Relevé du vendredi : missions validées, hors revue et sans litige ; retenues et dette déduites ; 0 F au plus bas,
 * dette reportée 4 vendredis au plus, puis plan d'apurement ; jamais de caution (ENT-REM-01 à 08, A-05, A-08). */
export function versementDuVendredi(prestations: Prestation[], retenues: Retenue[], o: { reportPrecedent?: number; vendredisDeReport?: number } = {}, pe: ParametresEntreprise = LIVRAISON.entreprise): Versement {
  const reportPrecedent = o.reportPrecedent ?? 0
  positif('report précédent', reportPrecedent)
  const payees: LigneReleve[] = []
  const reportees: string[] = []
  for (const x of prestations) {
    positif(`${x.reference} : prix`, x.prix)
    if (!x.validee || x.enRevue || x.litigeOuvert) {
      reportees.push(x.reference)
      continue
    }
    const m = x.retard && !x.incidentTiers ? minoration(x.prix, pe) : 0
    payees.push({ reference: x.reference, prix: x.prix, minoration: m, paye: x.prix - m })
  }
  const total = payees.reduce((t, l) => t + l.paye, 0)
  const ret = retenues.reduce((t, r) => t + r.total, 0)
  const solde = total - ret - reportPrecedent
  const dette = Math.max(-solde, 0)
  const report = dette ? (o.vendredisDeReport ?? 0) + 1 : 0
  return { payees, reportees, prestations: total, retenues: ret, reportPrecedent, aVerser: Math.max(solde, 0), soldeReporte: dette, vendredisDeReport: report, planDApurement: report > pe.reportVendredis }
}
