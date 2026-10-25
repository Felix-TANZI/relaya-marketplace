// Règles d'argent de la console (groupe S2 : escrow, remboursements, versements, rapprochement, commissions, export).
// Aucune valeur dans le code (CCH-15) : tout montant, taux, délai ou seuil est LU au registre officiel par
// src/calculs/registre.ts (les codes proposés par S2 y sont entrés : A-VALIDER § 4) ; une valeur de forme inattendue
// arrête la lecture (ParametreIllisible). Calculs purs, partagés par la démonstration (le « serveur ») et les écrans.
// Sources : v6 (DP-63, DP-65) ; QUESTIONS A01, A04, A07, A09, A11, A12 ; REGLES-CACHEES 07 à 14, 30, 31.
// Écarts v6 / registre (A-VALIDER § 4) : le registre fait foi (WALLET-PLAFOND, WALLET-RETRAIT-FRAIS, VD-COM-MODELE).
import { REGISTRE, montant, texte, type Registre } from './registre'
import { ParametreIllisible } from './erreurs'

const nb = (s: string) => Number(s.replace(/[\s  ]/g, "").replace(",", "."))
/** Premier groupe capturé par `re` dans la valeur (et son unité) ; absent : la lecture s'arrête. */
function extraire(r: Registre, code: string, re: RegExp): number {
  const m = re.exec(texte(r, code))
  if (!m) throw new ParametreIllisible(`${code} : « ${texte(r, code)} » ne suit pas la forme attendue`)
  return nb(m[1])
}
const pct = (r: Registre, code: string) => extraire(r, code, /^\s*([\d,]+)\s*%/)
const entier = (r: Registre, code: string, unite: string) => extraire(r, code, new RegExp(`^\\s*(\\d+)\\s*${unite}`))

// ── Vendeurs : paliers et familles de la commission V02 (DP-65) ────────────────────────────────────────────────────
export type Palier = "Bronze" | "Argent" | "Or" | "Platine"
export const PALIERS: Palier[] = ["Bronze", "Argent", "Or", "Platine"]
export type Famille = "telephonie" | "mode" | "electromenager" | "maison" | "supermarche" | "famille" | "livres"
export const FAMILLES: { id: Famille; code: string; nom: string; exemples: string }[] = [
  { id: "telephonie", code: "VD-TAUX-TELEPHONIE", nom: 'Téléphonie, électronique', exemples: 'Téléphones et accessoires, informatique, TV' },
  { id: "mode", code: "VD-TAUX-MODE", nom: 'Mode, beauté', exemples: 'Vêtements, pagnes et bazin, chaussures, cosmétiques' },
  { id: "electromenager", code: "VD-TAUX-ELECTROMENAGER", nom: 'Électroménager', exemples: 'Gros et petit électroménager' },
  { id: "maison", code: "VD-TAUX-MAISON", nom: 'Maison, déco, bricolage', exemples: 'Cuisine, quincaillerie, pièces auto' },
  { id: "supermarche", code: "VD-TAUX-SUPERMARCHE", nom: 'Supermarché, frais', exemples: 'Épicerie, boissons, produits frais et premium' },
  { id: "famille", code: "VD-TAUX-FAMILLE", nom: 'Bébé, sport, animaux', exemples: 'Puériculture, sport et loisirs, animaux' },
  { id: "livres", code: "VD-TAUX-LIVRES", nom: 'Livres, médias', exemples: 'Livres, fournitures, musique, jeux' },
]
export type Classe = "S" | "M" | "L"

// ── Lecture ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function lireArgent(r: Registre) {
  const taux = Object.fromEntries(
    FAMILLES.map((f) => {
      const v = texte(r, f.code).split("%")[0].split("·").map((x) => nb(x))
      if (v.length !== 4 || v.some((x) => !Number.isFinite(x))) throw new ParametreIllisible(`${f.code} : quatre taux attendus (Bronze · Argent · Or · Platine)`)
      return [f.id, Object.fromEntries(PALIERS.map((p, i) => [p, v[i]]))]
    }),
  ) as Record<Famille, Record<Palier, number>>
  const plan = (code: string) => ({ prix: extraire(r, code, /([\d\s  ]+) F par mois/), remise: extraire(r, code, /remise de (\d+) %/) })
  const gain = /([\d\s  ]+) F \/ ([\d\s  ]+) F \/ ([\d\s  ]+) F/.exec(texte(r, "RELAIS-GAIN-COLIS"))
  const transport = /([\d\s  ]+) F par colis S, ([\d\s  ]+) F par colis M, ([\d\s  ]+) F par colis L/.exec(texte(r, "LIV-REM-RELAIS"))
  if (!gain || !transport) throw new ParametreIllisible("RELAIS-GAIN-COLIS ou LIV-REM-RELAIS : forme inattendue")
  const grille = r["GARDE-GRILLE"]?.valeur.split(",").map((x) => nb(x)) ?? []
  if (grille.length !== 7 || grille.some((x) => !Number.isFinite(x))) throw new ParametreIllisible("GARDE-GRILLE : sept montants attendus")
  return {
    // Frais Mobile Money (v6 « Frais : qui paie », QUESTIONS A01)
    fraisClient: pct(r, "PAY-CAMPAY-FRAIS"), // payés par le client sur un paiement Mobile Money : argent de passage
    fraisVersementVendeur: pct(r, "VD-VER-FRAIS"), // retenus sur le versement du vendeur
    // Contrôles à quatre yeux
    seuilRemboursement: montant(r, "REMB-CONTROLE-SEUIL"),
    seuilVersement: montant(r, "VERSEMENT-CONTROLE-SEUIL"),
    controleFinH: entier(r, "VERSEMENT-CONTROLE-FIN-H", "heures"),
    // Rapprochement
    toleranceF: montant(r, "RAPPRO-TOLERANCE-F"),
    attenteH: entier(r, "RAPPRO-ATTENTE-H", "heures"),
    ecartCarteH: entier(r, "RAPPRO-ECART-CARTE-H", "heures"),
    minPerception: pct(r, "FIN-MIN-PERCEPTION"),
    tva: pct(r, "VD-TVA"),
    // Commission V02
    taux,
    tauxMin: pct(r, "VD-TAUX-MIN"),
    pointsPetitPrix: extraire(r, "VD-COM-POINTS", /\+(\d+) points si le prix unitaire est sous/),
    seuilPetitPrix: extraire(r, "VD-COM-POINTS", /sous ([\d\s  ]+) F/),
    pointsMic: extraire(r, "VD-COM-POINTS", /−(\d+) points si Made in Cameroon/),
    decouverte: extraire(r, "VD-DECOUV-MULT", /×\s*([\d,]+)/),
    comMin: extraire(r, "VD-COM-MIN", /^([\d\s  ]+) F/),
    comMinTaux: pct(r, "VD-COM-MIN-TAUX"),
    plans: { Boost: plan("VD-PLAN-BOOST"), Pro: plan("VD-PLAN-PRO") },
    planGraceJ: extraire(r, "VD-PLAN-GRACE", /^(\d+) jours/),
    // Libération et versement
    retourJ: extraire(r, "VD-RET-FENETRE", /^(\d+) jours/),
    libereJ: { Bronze: extraire(r, "VD-LIB-BRONZE-ARGENT", /^(\d+) jours?/), Argent: extraire(r, "VD-LIB-BRONZE-ARGENT", /^(\d+) jours?/), Or: extraire(r, "VD-LIB-OR-PLATINE", /^(\d+) jours?/), Platine: extraire(r, "VD-LIB-OR-PLATINE", /^(\d+) jours?/) } as Record<Palier, number>,
    blocageNumeroJ: entier(r, "blocage_versements_changement_numero", "jours"),
    essaisVersement: extraire(r, "VD-VER-ESSAIS", /^(\d+) essais/),
    limiteVersementH: extraire(r, "VD-VER-JOUR", /avant (\d+) h/),
    arreteVersement: r["VD-VER-ARRETE"]?.valeur ?? "",
    reportDetteVendredis: extraire(r, "ENT-SOLDE-NEGATIF", /(\d+) vendredis/),
    // Relais : rémunération et garde (v6 D12, QUESTIONS A04)
    relaisColis: { S: nb(gain[1]), M: nb(gain[2]), L: nb(gain[3]) } as Record<Classe, number>,
    relaisGardeJour: extraire(r, "RELAIS-GAIN-GARDE", /^([\d\s  ]+) F par jour/),
    gardeGrille: grille,
    gardeJ1Belivay: /^activé/.test(r["GARDE-J1-BELIVAY"]?.valeur ?? ""),
    gardeRenvoi: montant(r, "GARDE-RENVOI"),
    // Livraison et transport
    livRelais: montant(r, "LIV-RELAIS-BASE"),
    livDomMin: extraire(r, "LIV-DOM-MIN", /^([\d\s  ]+) F/),
    offertRelais: extraire(r, "LIV-SEUIL-RELAIS", /([\d\s  ]+) F/),
    offertDom: extraire(r, "LIV-SEUIL-DOM", /([\d\s  ]+) F/),
    transport: { S: nb(transport[1]), M: nb(transport[2]), L: nb(transport[3]) } as Record<Classe, number>,
    transportDom: extraire(r, "LIV-REM-DOM", /^([\d\s  ]+) F/),
    retourTrajet: extraire(r, "RET-TRAJET", /^([\d\s  ]+) F/),
    // Remboursement automatique sans retour (v6 D18, QUESTIONS A09)
    autoStd: extraire(r, "LIT-AUTO-STD", /([\d\s  ]+) F/),
    autoEleve: extraire(r, "LIT-AUTO-ELEVE", /([\d\s  ]+) F/),
    autoDelaiH: extraire(r, "RET-DEFAUT-H", /^(\d+) h/),
    autoPlafondMois: montant(r, "AUTO-REMB-PLAFOND-MENSUEL"),
    autoAlerte: pct(r, "AUTO-REMB-ALERTE"),
    autoPar30j: entier(r, "AUTO-REMB-PAR-30J", "remboursements"),
    autoParAn: entier(r, "AUTO-REMB-PAR-AN", "remboursements"),
    autoMinCmd: entier(r, "AUTO-REMB-MIN-CMD", "commandes"),
    // Wallet (v6 D16)
    walletPlafond: montant(r, "WALLET-PLAFOND"),
    walletRetraitFrais: pct(r, "WALLET-RETRAIT-FRAIS"),
    walletRetraitFraisMin: extraire(r, "WALLET-RETRAIT-FRAIS", /([\d\s  ]+) F au moins/),
    walletRetraitMin: montant(r, "WALLET-RETRAIT-MIN"),
    walletCodeSeuil: montant(r, "WALLET-CODE-SEUIL"),
    fraudeRetraitsN: entier(r, "FRAUDE-RETRAITS-N", "retraits"),
    fraudeRetraitsF: montant(r, "FRAUDE-RETRAITS-F"),
  }
}
export type ReglesArgent = ReturnType<typeof lireArgent>
export const ARGENT: ReglesArgent = lireArgent(REGISTRE)

// ── Calculs ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Un seul arrondi, au franc, moitié vers le haut (VD-COM-MODELE). */
export const arrondi = (x: number) => Math.floor(x + 0.5 + 1e-9)
export const partDe = (montantF: number, pourcent: number) => arrondi((montantF * pourcent) / 100)

export interface LigneVente {
  famille: Famille
  prix: number // prix payé de l'article (quantité comprise)
  unitaire?: number // prix unitaire (points « petit prix ») ; par défaut le prix
  mic?: boolean // Made in Cameroon
}
/** Taux d'un article (V02) : taux catégorie × palier, + points petit prix, − points Made in Cameroon, jamais sous le minimum. */
export function tauxArticle(l: LigneVente, palier: Palier, a: ReglesArgent = ARGENT): number {
  const t = a.taux[l.famille][palier] + ((l.unitaire ?? l.prix) < a.seuilPetitPrix ? a.pointsPetitPrix : 0) - (l.mic ? a.pointsMic : 0)
  return Math.max(a.tauxMin, t)
}

export interface CalculCommission {
  base: number // somme des prix
  calculee: number // avant plancher, découverte appliquée, non arrondie
  plancher: number
  retenue: number // commission retenue (arrondie)
  auPlancher: boolean
  tva: number
  garde: number // ce que le vendeur garde avant les frais de versement
  tauxEffectif: number // % du prix
  perte: boolean // le vendeur garderait 0 F ou moins : refusé à la publication (BelivaY ne perd jamais)
  lignes: { famille: Famille; prix: number; taux: number }[]
}
/**
 * Commission d'une sous-commande (un vendeur) : taux V02 sur TOUT le prix, sans tranche ni plafond par article (DP-65),
 * offre de découverte en multiplicateur, plancher MAX(VD-COM-MIN ; VD-COM-MIN-TAUX × prix), un seul arrondi à la fin.
 */
export function commission(lignes: LigneVente[], palier: Palier, decouverte: boolean, a: ReglesArgent = ARGENT): CalculCommission {
  const detail = lignes.map((l) => ({ famille: l.famille, prix: l.prix, taux: tauxArticle(l, palier, a) }))
  const base = detail.reduce((n, l) => n + l.prix, 0)
  const brut = detail.reduce((n, l) => n + (l.prix * l.taux) / 100, 0) * (decouverte ? a.decouverte : 1)
  const plancher = Math.max(a.comMin, (base * a.comMinTaux) / 100)
  const auPlancher = brut < plancher
  const retenue = arrondi(Math.max(brut, plancher))
  const tva = partDe(retenue, a.tva)
  const garde = base - retenue - tva
  return { base, calculee: brut, plancher: arrondi(plancher), retenue, auPlancher, tva, garde, tauxEffectif: base ? (retenue / base) * 100 : 0, perte: garde <= 0, lignes: detail }
}

/** Remise d'un plan sur la commission du mois, jamais au-delà du prix du plan (VD-PLAN-REMISE-PLAFOND). */
export function remiseDePlan(plan: "Boost" | "Pro", commissionDuMois: number, a: ReglesArgent = ARGENT): number {
  return Math.min(a.plans[plan].prix, partDe(commissionDuMois, a.plans[plan].remise))
}

/** Frais Mobile Money payés par le client sur un paiement Mobile Money (inclus dans le total montré avant paiement). */
export const fraisClient = (montantF: number, a: ReglesArgent = ARGENT) => partDe(montantF, a.fraisClient)

/** Versement d'un vendeur : montant dû moins les reprises, puis le 1 % Mobile Money retenu (v6). */
export function versementVendeur(du: number, reprises: number, a: ReglesArgent = ARGENT) {
  const brut = Math.max(0, du - reprises)
  // R22 / R43 : 1 % retenu sur le versement, arrondi au franc SUPÉRIEUR (entiers : ⌈brut × p ÷ 100⌉).
  const frais = Math.ceil((brut * a.fraisVersementVendeur) / 100)
  return { du, reprises: Math.min(du, reprises), resteReprise: Math.max(0, reprises - du), brut, frais, verse: brut - frais }
}

/** Garde payée par le client en espèces pour `jours` jours (grille v6 : 0, 100, 100, 100, 200, 500, 1 000 F). */
export const gardePayee = (jours: number, a: ReglesArgent = ARGENT) => a.gardeGrille.slice(0, Math.max(0, Math.min(jours, a.gardeGrille.length))).reduce((n, x) => n + x, 0)

/**
 * Versement d'un relais (QUESTIONS A04, ADM-CACHEE-07) : rémunération par colis remis + 100 F par jour de garde (le 1er
 * payé par BelivaY) − espèces de garde encaissées au comptoir − dette reportée. Négatif : versé 0 F, dette reportée.
 */
export function versementRelais(p: { colis: Record<Classe, number>; joursGarde: number; especes: number; detteAnterieure: number }, a: ReglesArgent = ARGENT) {
  const remuneration = (["S", "M", "L"] as Classe[]).reduce((n, c) => n + p.colis[c] * a.relaisColis[c], 0)
  const garde = p.joursGarde * a.relaisGardeJour
  const solde = remuneration + garde - p.especes - p.detteAnterieure
  return { remuneration, garde, especes: p.especes, detteAnterieure: p.detteAnterieure, solde, verse: Math.max(0, solde), dette: Math.max(0, -solde) }
}

export type OrigineRemboursement = "auto" | "litige" | "annulation" | "rupture" | "renvoi_garde"
/**
 * Montant calculé d'un remboursement (le serveur le calcule ; personne ne le saisit). Renvoi pour garde dépassée :
 * payé − garde des 7 jours − renvoi (GARDE-RENVOI : 0 F, v6). Remboursement automatique : l'article seul.
 */
export function remboursementCalcule(origine: OrigineRemboursement, p: { articles: number; livraison: number; joursGarde?: number }, a: ReglesArgent = ARGENT) {
  if (origine === "auto") return { total: p.articles, retenues: 0 }
  if (origine === "renvoi_garde") {
    const retenues = gardePayee(p.joursGarde ?? a.gardeGrille.length, a) + a.gardeRenvoi
    return { total: Math.max(0, p.articles + p.livraison - retenues), retenues }
  }
  return { total: p.articles + p.livraison, retenues: 0 }
}

/** Contrôles du remboursement automatique sans retour (v6 D18) : chaque condition, et l'issue. */
export function controleAuto(c: { article: number; palierEleve: boolean; commandesSansLitige: number; photo: boolean; delaiH: number; sur30j: number; surAn: number; doute: boolean }, a: ReglesArgent = ARGENT) {
  const seuil = c.palierEleve ? a.autoEleve : a.autoStd
  const checks = [
    { id: "seuil", ok: c.article <= seuil },
    { id: "commandes", ok: c.commandesSansLitige >= a.autoMinCmd },
    { id: "photo", ok: c.photo },
    { id: "delai", ok: c.delaiH <= a.autoDelaiH },
    { id: "30j", ok: c.sur30j < a.autoPar30j },
    { id: "an", ok: c.surAn < a.autoParAn },
    { id: "doute", ok: !c.doute },
  ]
  return { seuil, checks, eligible: checks.every((x) => x.ok) }
}

/** Retrait du Wallet (v6 D16) : 3 % de frais payés par le client, minimum, seulement le solde retirable. */
export function retraitWallet(demande: number, retirable: number, a: ReglesArgent = ARGENT) {
  const frais = Math.max(partDe(demande, a.walletRetraitFrais), a.walletRetraitFraisMin)
  const raison = demande < a.walletRetraitMin ? "minimum" : demande > retirable ? "solde" : null
  return { frais, recu: demande - frais, ok: raison === null, raison, code: demande > a.walletCodeSeuil }
}

/** Minimum de perception : sur les revenus SEULS (commissions et livraison), jamais l'argent de passage. */
export const minimumPerception = (revenus: number, a: ReglesArgent = ARGENT) => arrondi((revenus * a.minPerception) / 100)
