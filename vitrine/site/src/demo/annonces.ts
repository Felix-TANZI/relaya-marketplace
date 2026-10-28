// DONNÉES DE DÉMONSTRATION — campagnes publicitaires (DP-59) vues du client, et leur retour vers le vendeur.
// Deux sources de campagnes, comme sur le serveur (backend-kit/apps/publicite/services.py) :
// - la boutique de démonstration de l'espace vendeur (« Tonton PG », espace-vendeur/src/demo/publicite.ts) : ses
//   campagnes sont lues dans l'état que l'espace vendeur garde sur l'appareil (localStorage blv_v_demo_publicite,
//   même origine quand le site et /vendeur/ sont servis ensemble) ; sans lui, une copie de son jeu d'essai. Elles
//   sont jugées à l'heure de l'espace vendeur (mardi 13 oct. 2026, 09 h 48, qui avance au rythme réel) : en pause,
//   arrêtée, finie, programmée, budget du jour épuisé, enchère de la semaine non gagnée ou candidature flash sans
//   réponse = pas montrée. Les impressions, clics et ventes faits ici sont écrits dans cet état : les statistiques
//   d'AJ-P se remplissent, et la dépense des clics (donc le solde) suit. Ses produits sont ceux du catalogue client
//   (OFFRE_VERS_PRODUIT) ; l'iPhone 16 a sa fiche dans le catalogue de démonstration (iphone15pm, Boutique B) : ses
//   campagnes sont montrées comme les autres ;
// - d'autres boutiques (Boutiques A à D du catalogue) : campagnes fixes, cohérentes avec le catalogue.
// Le serveur choisit seul les annonces éligibles (stock, Trust Score, aucun litige, budget, solde) ; ici, une annonce
// au clic est retenue quand la recherche contient un de ses mots ou que la catégorie est la sienne.
import type { AnnonceSponsorisee, AnnoncesListe, DiapoSponsorisee, EmplacementVu, MotifSignalement, ReglesAnnonces } from '../donnees/source'
import { ATTRIBUTION_MS } from '../donnees/parametresPub'
import { REFERENCE } from './horloge'

// VD-PUB-DENSITE et VD-PUB-BOOST (paramètres de console).
export const REGLES_ANNONCES: ReglesAnnonces = { partMaxPourCent: 20, maxParFenetre: 2, fenetre: 10, boostMultiplicateur: 1.5 }

// ── Autres boutiques (fixes) ─────────────────────────────────────────────────────────────────────────────

interface Sponsorisee extends AnnonceSponsorisee {
  cat: string
  mots: string[]
  enchere: number
}
const SPONSORISES: Sponsorisee[] = [
  { id: 'ann-galaxya15', p: 'galaxya15', campagne: 'cmp-smartphones-rentree', fiche: 'galaxya15', cat: 'tel', enchere: 60, mots: ['telephone', 'smartphone', 'samsung', 'galaxy', 'android'] },
  { id: 'ann-batterie', p: 'batterie', campagne: 'cmp-energie', fiche: 'batterie', cat: 'elec', enchere: 50, mots: ['batterie', 'chargeur', 'powerbank', 'delestage'] },
  { id: 'ann-robewax', p: 'robewax', campagne: 'cmp-wax-saison', fiche: 'robewax', cat: 'femme', enchere: 32, mots: ['wax', 'pagne', 'robe'] },
  { id: 'ann-cremevisage', p: 'cremevisage', campagne: 'cmp-soins', fiche: 'cremevisage', cat: 'beaute', enchere: 30, mots: ['karite', 'creme', 'visage', 'soin'] },
]
// Boost en cours (24 h ou 7 jours) : produit → jeton de sa campagne.
const BOOSTS: Record<string, string> = { camon30: 'cmp-boost-camon', mixeur: 'cmp-boost-mixeur' }

// Emplacements de la semaine ; « paye » : montant payé, poids de la rotation.
type Paye<T> = T & { paye: number }
const A_LA_UNE: Paye<AnnonceSponsorisee>[] = [
  { id: 'une-marmite', p: 'marmite', campagne: 'cmp-une-cuisine', fiche: 'marmite', paye: 15000 },
  { id: 'une-batterie', p: 'batterie', campagne: 'cmp-une-energie', fiche: 'batterie', paye: 13500 },
  { id: 'une-cafe', p: 'cafe', campagne: 'cmp-une-terroir', fiche: 'cafe', paye: 11000 },
]
const CARROUSEL: Paye<DiapoSponsorisee>[] = [{ id: 'car-tv43', p: 'tv43', campagne: 'cmp-car-tv', fiche: 'tv43', titre: 'Samsung Neo QLED 4K 55″', sousTitre: 'Mini LED 4K, livré et installé chez toi', paye: 25000 }]

// Offres flash de la sélection BelivaY (commission majorée pendant la vente : VD-PUB-FLASH-MAJORATION) : produit → jeton.
export const SELECTION_FLASH: Record<string, string> = { chargeur33: 'cmp-flash-chargeur', portebebe: 'cmp-flash-portebebe' }

// ── Boutique de l'espace vendeur ─────────────────────────────────────────────────────────────────────────

// Offre du vendeur → produit du catalogue client (même produit) ; mots, catégorie et diapo de ce produit.
const OFFRE_VERS_PRODUIT: Record<string, string> = { 'itel-noir': 'itelac52', 'itel-bleu': 'itelac52', 'itel-64': 'itelac52', 'pagne-bleu': 'pagne', 'pagne-rouge': 'pagne', iphone: 'iphone15pm' }
const PRODUITS: Record<string, { cat: string; mots: string[]; titre: string; sousTitre: string }> = {
  itelac52: { cat: 'tel', mots: ['samsung', 'montre', 'galaxy', 'watch'], titre: 'Samsung Galaxy Watch7', sousTitre: 'Santé, sport et GPS au poignet' },
  iphone15pm: { cat: 'tel', mots: ['iphone', 'apple', 'telephone', 'portable', 'smartphone'], titre: 'iPhone 16', sousTitre: 'Puce A18, 128 Go, garanti 12 mois' },
  pagne: { cat: 'femme', mots: ['pagne', 'wax', 'tissu'], titre: 'Pagne Vlisco Super Wax 6 yards', sousTitre: 'Motifs de saison, retrait au relais' },
}

type EmplacementV = 'recherche' | 'categories' | 'une' | 'carrousel' | 'boost_24h' | 'boost_7j' | 'flash'
interface JourV {
  impressions: number
  clics: number
  doublons: number
  ventes: number
}
// Forme de l'état gardé par l'espace vendeur (seuls les champs lus ou écrits ici).
interface CampagneV {
  id: string
  emplacement: EmplacementV
  offreId: string
  debut: number
  fin: number | null
  enchere: number | null
  budgetJour: number | null
  mode: 'fixe' | 'enchere' | null
  forfait: number | null
  jours: JourV[] // sponsorisé : un par jour écoulé, le dernier = aujourd'hui
  stats: { impressions: number; clics: number; ventes: number } // forfaits, Boost, flash
  pauseA: number | null
  arreteeA: number | null
  decision: 'acceptee' | 'refusee' | null
}
const CLE_VENDEUR = 'blv_v_demo_publicite'
const CLE_PROMOS = 'blv_v_demo_aja_promotions'
const HEURE = 3600_000
const JOUR = 24 * HEURE
// Heure de l'espace vendeur (espace-vendeur/src/demo/horloge.ts) : mardi 13 oct. 2026, 09 h 48 à Yaoundé (UTC+1).
// Les jours du jeu vendeur restent écrits en septembre et sont décalés de 22 jours, comme dans l'espace vendeur.
const REFERENCE_V = Date.UTC(2026, 9, 13, 8, 48)
const yd = (j: number, h = 0) => Date.UTC(2026, 8, j + 22, h - 1)
const jr = (impressions: number, clics: number, ventes = 0, doublons = 0): JourV => ({ impressions, clics, ventes, doublons })
const cv = (o: Partial<CampagneV> & Pick<CampagneV, 'id' | 'emplacement' | 'offreId' | 'debut'>): CampagneV => ({ fin: null, enchere: null, budgetJour: null, mode: null, forfait: null, jours: [], stats: { impressions: 0, clics: 0, ventes: 0 }, pauseA: null, arreteeA: null, decision: null, ...o })
// Copie du jeu d'essai de l'espace vendeur (campagnes qui touchent un produit du site, ou sont en pause).
const JEU_VENDEUR: CampagneV[] = [
  cv({ id: 'cp-1', emplacement: 'recherche', offreId: 'itel-noir', debut: yd(14, 8), enchere: 40, budgetJour: 1000, jours: [jr(610, 18, 1, 2), jr(700, 22, 1), jr(980, 31, 1, 3), jr(760, 25), jr(590, 19, 1, 1), jr(820, 27, 1), jr(930, 30, 1, 2), jr(260, 9)] }),
  cv({ id: 'cp-2', emplacement: 'categories', offreId: 'iphone', debut: yd(10, 8), enchere: 120, budgetJour: 3000, pauseA: yd(18, 21) }),
  cv({ id: 'cp-3', emplacement: 'categories', offreId: 'itel-noir', debut: yd(1, 8), fin: yd(8, 8), enchere: 30, budgetJour: 600 }),
  cv({ id: 'cp-4', emplacement: 'carrousel', offreId: 'itel-noir', mode: 'fixe', debut: yd(28), fin: yd(28) + 7 * JOUR, forfait: 25000 }),
  cv({ id: 'cp-5', emplacement: 'une', offreId: 'iphone', mode: 'fixe', debut: yd(17), fin: yd(24), forfait: 15000 }),
  cv({ id: 'cp-7', emplacement: 'boost_24h', offreId: 'itel-noir', debut: yd(21, 8), fin: yd(22, 8), forfait: 1500, stats: { impressions: 420, clics: 15, ventes: 0 } }),
  cv({ id: 'cp-10', emplacement: 'flash', offreId: 'itel-noir', debut: yd(26, 8), fin: yd(27, 8) }),
  cv({ id: 'cp-11', emplacement: 'flash', offreId: 'itel-noir', debut: yd(19, 8), fin: yd(20, 8), decision: 'acceptee' }),
]
// Enchères des autres vendeurs (espace vendeur, AUTRES_ENCHERES) : coût du clic = second prix + 1 F, plancher sinon.
const AUTRES_ENCHERES: Partial<Record<EmplacementV, number[]>> = { recherche: [35, 22], categories: [30, 26, 25] }
const PLANCHER_CLIC = 25

function maintenantVendeur(): number {
  const reel = Date.now()
  if (reel >= REFERENCE_V - HEURE && reel < REFERENCE_V + JOUR) return reel
  try {
    // Même départ que l'espace vendeur s'il a été ouvert dans cet onglet, sinon celui du site.
    const debut = Number(sessionStorage.getItem('blv_v_demo_debut')) || Number(sessionStorage.getItem('blv_demo_debut')) || reel
    return REFERENCE_V + (reel - debut)
  } catch {
    return REFERENCE_V
  }
}

function lireGarde<T>(cle: string): { version: number; forme?: string; etat: T } | null {
  try {
    const brut = localStorage.getItem(cle)
    return brut ? JSON.parse(brut) : null
  } catch {
    return null
  }
}
const campagnesVendeur = (): CampagneV[] => lireGarde<{ campagnes: CampagneV[] }>(CLE_VENDEUR)?.etat.campagnes ?? JEU_VENDEUR
interface PromoV {
  offreId: string
  origine: string
  type: string
  valeur: number
  debut: number
  arreteeA: number | null
}
const promoDe = (x: CampagneV) => (lireGarde<{ promos: PromoV[] }>(CLE_PROMOS)?.etat.promos ?? []).find((p) => p.origine === 'selection' && p.offreId === x.offreId && p.debut === x.debut) ?? null

const coutClic = (x: CampagneV) => {
  const dessous = (AUTRES_ENCHERES[x.emplacement] ?? []).filter((m) => m < (x.enchere ?? 0))
  return Math.min(x.enchere ?? 0, dessous.length ? Math.max(...dessous) + 1 : PLANCHER_CLIC)
}
// Montrée maintenant ? Règles d'état de l'espace vendeur (etatDe), et budget du jour pour le clic.
function enCours(x: CampagneV, t = maintenantVendeur()): boolean {
  if (x.arreteeA || x.pauseA || x.debut > t || (x.fin !== null && x.fin <= t)) return false
  if (x.emplacement === 'flash') return x.decision === 'acceptee' && !promoDe(x)?.arreteeA
  if (x.mode === 'enchere' && x.decision !== 'acceptee') return false
  if (x.emplacement === 'recherche' || x.emplacement === 'categories') {
    const j = x.jours.at(-1)
    return !j || x.budgetJour === null || j.clics * coutClic(x) < x.budgetJour
  }
  return true
}
const jetonV = (x: CampagneV) => 'v:' + x.id
const produitV = (x: CampagneV) => OFFRE_VERS_PRODUIT[x.offreId]
const annonceV = (x: CampagneV): AnnonceSponsorisee => ({ id: jetonV(x), p: produitV(x), campagne: x.id, fiche: produitV(x) })
const vendeurEnCours = (em: EmplacementV[]) => campagnesVendeur().filter((x) => em.includes(x.emplacement) && produitV(x) && enCours(x))

// ── Lecture : annonces d'une liste, emplacements de l'accueil, sélection flash ────────────────────────────

const sansAccents = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function annoncesDemo(ou: 'recherche' | 'categorie', q: string | null, cat: string | null): AnnoncesListe {
  const mots = sansAccents(q ?? '').split(/[^a-z0-9]+/).filter(Boolean)
  const retenue = (c: string, m: string[]) => (ou === 'categorie' ? !cat || c === cat : mots.some((x) => m.some((y) => y.startsWith(x) || x.startsWith(y))))
  const vendeur = vendeurEnCours([ou === 'recherche' ? 'recherche' : 'categories'])
    .filter((x) => retenue(PRODUITS[produitV(x)].cat, PRODUITS[produitV(x)].mots))
    .map((x) => ({ a: annonceV(x), enchere: x.enchere ?? 0 }))
  const autres = SPONSORISES.filter((a) => retenue(a.cat, a.mots)).map(({ id, p, campagne, fiche, enchere }) => ({ a: { id, p, campagne, fiche }, enchere }))
  // Rangées par l'enchère, du plus offrant au moins offrant (le serveur : encheres_au_clic).
  const annonces = [...vendeur, ...autres].sort((x, y) => y.enchere - x.enchere).map((x) => x.a)
  const jetonsBoost: Record<string, string> = { ...BOOSTS, ...Object.fromEntries(vendeurEnCours(['boost_24h', 'boost_7j']).map((x) => [produitV(x), jetonV(x)])) }
  return { annonces, boosts: Object.keys(jetonsBoost).sort(), jetonsBoost, regles: REGLES_ANNONCES }
}

// Rotation pondérée par le montant payé (services.rotation : clé u^(1/poids), tirée à chaque lecture) : chaque
// place vendue est montrée ; qui a payé plus passe plus souvent devant.
function rotation<T extends { paye: number }>(l: T[]): Omit<T, 'paye'>[] {
  return l
    .map((x) => ({ x, k: Math.random() ** (1 / Math.max(1, x.paye)) }))
    .sort((a, b) => b.k - a.k)
    .map(({ x: { paye: _, ...reste } }) => reste)
}

export function emplacementsDemo(): { aLaUne: AnnonceSponsorisee[]; carrousel: DiapoSponsorisee[] } {
  const une = vendeurEnCours(['une']).map((x) => ({ ...annonceV(x), paye: x.forfait ?? 0 }))
  const caro = vendeurEnCours(['carrousel']).map((x) => ({ ...annonceV(x), titre: PRODUITS[produitV(x)].titre, sousTitre: PRODUITS[produitV(x)].sousTitre, paye: x.forfait ?? 0 }))
  return { aLaUne: rotation([...une, ...A_LA_UNE]), carrousel: rotation([...caro, ...CARROUSEL]) }
}

// Ventes flash de la sélection acceptées pour le vendeur et en cours : leur créneau est rendu à l'heure du site
// (même écart à la fin), leur remise est celle de Promotions (prix payé par le client).
export function selectionFlashVendeur(): { p: string; annonce: string; debut: number; fin: number; remisePourCent: number }[] {
  const ecart = REFERENCE - REFERENCE_V
  return vendeurEnCours(['flash']).flatMap((x) => {
    const pr = promoDe(x)
    return x.fin ? [{ p: produitV(x), annonce: jetonV(x), debut: x.debut + ecart, fin: x.fin + ecart, remisePourCent: pr?.type === 'pourcent' ? pr.valeur : 10 }] : []
  })
}

// ── Retour vers le vendeur : impressions, clics, ventes ; signalements ───────────────────────────────────

const JOURNAL = 'blv_demo_pub'
interface Journal {
  clics: Record<string, number> // `${jeton}|${jour}` → clics de ce client ce jour
  derniers: Record<string, { jeton: string; le: number }> // produit → dernier clic sur une annonce (vente sous 7 jours)
  signalees: Record<string, MotifSignalement>
}
function journal(): Journal {
  try {
    return { clics: {}, derniers: {}, signalees: {}, ...(JSON.parse(localStorage.getItem(JOURNAL) ?? '{}') as Partial<Journal>) }
  } catch {
    return { clics: {}, derniers: {}, signalees: {} }
  }
}
function ecrireJournal(j: Journal) {
  try {
    localStorage.setItem(JOURNAL, JSON.stringify(j))
  } catch {
    /* stockage refusé : la visite seule */
  }
}

// Écrit dans l'état de l'espace vendeur (même forme, même version : il le relit tel quel à sa prochaine lecture).
// Sans état gardé (espace vendeur jamais ouvert sur l'appareil), rien n'est écrit : son jeu d'essai reste intact.
function majVendeur(jeton: string, f: (x: CampagneV, aujourdhui: JourV | null) => void) {
  if (!jeton.startsWith('v:')) return
  const g = lireGarde<{ campagnes: CampagneV[] }>(CLE_VENDEUR)
  const x = g?.etat.campagnes.find((c) => c.id === jeton.slice(2))
  if (!g || !x) return
  f(x, x.emplacement === 'recherche' || x.emplacement === 'categories' ? (x.jours.at(-1) ?? null) : null)
  try {
    localStorage.setItem(CLE_VENDEUR, JSON.stringify(g))
  } catch {
    /* stockage refusé */
  }
}

export function voirDemo(jeton: string, _emplacement: EmplacementVu) {
  majVendeur(jeton, (x, j) => void (j ? j.impressions++ : x.stats.impressions++))
}

export function cliquerDemo(jeton: string) {
  const jl = journal()
  const cle = `${jeton}|${Math.floor(maintenantVendeur() / JOUR)}`
  const deja = (jl.clics[cle] ?? 0) > 0
  jl.clics[cle] = (jl.clics[cle] ?? 0) + 1
  const p = produitDeJeton(jeton)
  if (p) jl.derniers[p] = { jeton, le: Date.now() }
  ecrireJournal(jl)
  // Un clic par client et par jour ; les suivants sont des doublons, jamais facturés.
  majVendeur(jeton, (x, j) => void (j ? (deja ? j.doublons++ : j.clics++) : x.stats.clics++))
}

// Commande payée : chaque produit touché sur une annonce dans les 7 jours compte une vente à sa campagne.
export function venteDemo(produits: string[]) {
  const jl = journal()
  for (const p of new Set(produits)) {
    const d = jl.derniers[p]
    if (!d || Date.now() - d.le > ATTRIBUTION_MS) continue
    majVendeur(d.jeton, (x, j) => void (j ? j.ventes++ : x.stats.ventes++))
    delete jl.derniers[p]
  }
  ecrireJournal(jl)
}

export function signalerDemo(jeton: string, motif: MotifSignalement) {
  const jl = journal()
  jl.signalees[jeton] = motif
  ecrireJournal(jl)
}

function produitDeJeton(jeton: string): string | null {
  if (jeton.startsWith('v:')) {
    const x = campagnesVendeur().find((c) => c.id === jeton.slice(2))
    return x ? (produitV(x) ?? null) : null
  }
  const fixe = [...SPONSORISES, ...A_LA_UNE, ...CARROUSEL].find((a) => a.id === jeton)
  return fixe?.p ?? Object.entries({ ...BOOSTS, ...SELECTION_FLASH }).find(([, j]) => j === jeton)?.[0] ?? null
}
