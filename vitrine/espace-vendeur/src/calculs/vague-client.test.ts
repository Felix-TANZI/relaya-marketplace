// Vague d'améliorations (logique-metier/VAGUE-AMELIORATIONS.md) : les règles des écrans du client, rejouées comme les
// moteurs. N° 3 (panier) : livraison offerte par expédition (D10 v1.4, site/src/donnees/frais.ts) et accessoires
// compatibles (site/src/donnees/accessoires.ts).
import { describe, expect, it } from 'vitest'
import { calculer } from '@client/donnees/frais'
import { accessoiresCompatibles } from '@client/donnees/accessoires'
import { correspond, corriger, phonetique } from '@client/donnees/recherche'
import { basculerDans, lignesComparees, meilleureValeur } from '@client/donnees/comparateur'
import { BAISSE_MIN_F, baisseDePrix } from '@client/donnees/baissePrix'
import { TRAJET_MIN, vitrineDe } from '@client/donnees/suiviVitrine'
import { MOMENTS_PAR_DEFAUT, dansLaPeriode, momentDuJour } from '@client/donnees/moments'
import { gainsDuMois, palierConseille } from '@client/donnees/prime'
import type { Produit } from '@client/donnees/source'

const colis = (boutique: string, prix: number, classe: 'S' | 'M' | 'L' | 'XL' = 'M', km: number | null = 3) => ({ boutique, zone: 'Mvog-Ada', km, articles: [{ prix, quantite: 1, classe }] })

describe('n° 3 · livraison offerte sur le panier entier (R07, v2.0)', () => {
  it('relais : le seuil compte le panier entier, une seule livraison de base offerte', () => {
    // 67 500 F ≥ 30 000 F : 900 F offerts ; B et C dans la zone du relais (Mvog-Ada) : 900 + 2 × 500 F + 3 cartons C1.
    const f = calculer('relais', [colis('A', 25_000), colis('B', 30_000), colis('C', 12_500)])
    expect([f.offert, f.total, f.manque]).toEqual([900, 67_500 + 2_500, 0])
  })
  it('colis XL au relais : refusé', () => {
    expect(calculer('relais', [colis('A', 10_000, 'XL')]).interditRelais).toEqual(['A'])
  })
})

const produit = (p: string, sousCategorie: string, marque: string | null, prix: number, o: Partial<Produit> = {}): Produit =>
  ({ p, titre: p, prix, classe: 'S', marque, avis: 0, ventes: 0, stock: 10, univers: 'tel', universTitre: '', sousCategorie, tags: [], dessins: [p], options: [], vendeur: { boutique: 'Boutique Z', zone: 'Mvog-Ada', score: 90, palier: 'Or', km: 1 }, autres: [], description: '', specs: [], ...o }) as Produit

describe('n° 3 · accessoires compatibles', () => {
  const iphone = produit('iphone', 'Smartphones', 'Apple', 620_000, { vendeur: { boutique: 'Boutique A', zone: 'x', score: 1, palier: '', km: 1 } })
  const catalogue = [
    iphone,
    produit('magsafe', 'Accessoires', 'Apple', 35_000, { ventes: 900, vendeur: { boutique: 'Boutique D', zone: 'x', score: 1, palier: '', km: 1 } }),
    produit('buds', 'Audio', 'Samsung', 165_000, { ventes: 520 }),
    produit('anker', 'Énergie & batteries', 'Anker', 70_000, { ventes: 214, univers: 'elec' }),
    produit('airpods', 'Audio', 'Apple', 120_000, { ventes: 640, univers: 'elec' }),
    produit('jbl', 'Audio', 'JBL', 95_000, { ventes: 310, classe: 'M', univers: 'elec', vendeur: { boutique: 'Boutique A', zone: 'x', score: 1, palier: '', km: 1 } }),
    produit('sonos', 'Audio', 'Sonos', 650_000, { classe: 'XL', univers: 'elec' }),
    produit('epuise', 'Accessoires', 'Apple', 30_000, { stock: 0 }),
    produit('montre', 'Accessoires', 'Apple', 320_000, { univers: 'femme' }),
    produit('ps5', 'Jeux vidéo', 'Sony', 650_000, { classe: 'L', univers: 'elec' }),
    produit('dualsense', 'Jeux vidéo', 'Sony', 140_000, { univers: 'elec' }),
    produit('quest', 'Jeux vidéo', 'Meta', 420_000, { classe: 'M', univers: 'elec' }),
  ]
  it('marque fermée seulement pour sa marque ; même boutique d’abord, puis les plus vendus ; trois au plus', () => {
    // JBL (même boutique, universel) d'abord ; puis MagSafe et AirPods (Apple) ; ni Buds (Samsung), ni Sonos (XL), ni
    // l'épuisé, ni la montre de l'univers mode.
    expect(accessoiresCompatibles(iphone, catalogue).map((a) => a.p)).toEqual(['jbl', 'magsafe', 'airpods'])
  })
  it('déjà au panier : jamais proposé', () => {
    expect(accessoiresCompatibles(iphone, catalogue, ['jbl', 'magsafe']).map((a) => a.p)).toEqual(['airpods', 'anker'])
  })
  it('console : une manette de sa marque, jamais une autre console', () => {
    const ps5 = catalogue.find((x) => x.p === 'ps5')!
    expect(accessoiresCompatibles({ ...ps5, classe: 'M' }, catalogue).map((a) => a.p)).toEqual(['dualsense', 'jbl'])
  })
  it('pas un appareil (ou trop encombrant) : aucun accessoire', () => {
    expect(accessoiresCompatibles(produit('cuiseur', 'Petit électroménager', 'Tefal', 32_000), catalogue)).toEqual([])
    expect(accessoiresCompatibles(catalogue.find((x) => x.p === 'ps5')!, catalogue)).toEqual([])
  })
})

describe('n° 4 · recherche : équivalents et fautes corrigées', () => {
  const frigo = produit('frigo', 'Gros électroménager', 'Samsung', 560_000, { titre: 'Réfrigérateur combiné Samsung 384 L' })
  const iphone = produit('iphone', 'Smartphones', 'Apple', 620_000, { titre: 'iPhone 16' })
  const tecno = produit('tecno', 'Smartphones', 'Tecno', 650_000, { titre: 'Tecno Phantom V Fold2' })
  const galaxy = produit('galaxy', 'Smartphones', 'Samsung', 890_000, { titre: 'Samsung Galaxy S25 Ultra' })
  const tous = [frigo, iphone, tecno, galaxy]
  it('un mot de tous les jours trouve son équivalent (frigo, télé, portable)', () => {
    expect(correspond(frigo, 'frigo')).toBe(true)
    expect(correspond(frigo, 'frigo samsung')).toBe(true)
    expect(correspond(iphone, 'portable')).toBe(true) // « Smartphones »
    expect(correspond(frigo, 'portable')).toBe(false)
  })
  it('une faute est corrigée : à une lettre près, ou qui se prononce pareil', () => {
    expect(phonetique('ifone')).toBe(phonetique('iphone'))
    expect(corriger(tous, 'ifone')).toBe('iphone')
    expect(corriger(tous, 'samsoung')).toBe('samsung')
    expect(corriger(tous, 'tekno')).toBe('tecno')
    expect(corriger(tous, 'galaxi s25')).toBe('galaxy s25')
  })
  it('rien à corriger : un mot connu, un début de mot, un équivalent, un mot trop loin', () => {
    expect(corriger(tous, 'iphone')).toBeNull()
    expect(corriger(tous, 'phan')).toBeNull()
    expect(corriger(tous, 'frigo')).toBeNull()
    expect(corriger(tous, 'xyzwvut')).toBeNull()
  })
})

describe('n° 5 · comparateur', () => {
  const tel = (p: string, prix: number, note: string, o: Partial<Produit> = {}) => produit(p, 'Smartphones', 'Apple', prix, { note, avis: 10, ...o })
  const a = tel('a', 600_000, '4,8', { specs: [['Écran', '6,1″'], ['Puce', 'A18']] })
  const b = tel('b', 560_000, '4,6', { specs: [['Écran', '6,1″'], ['Puce', 'A17']] })
  const c = tel('c', 500_000, '4,2')
  const frigo = produit('frigo', 'Gros électroménager', 'LG', 560_000)
  const tous = [a, b, c, frigo]
  const trouver = (id: string) => tous.find((x) => x.p === id)
  it('trois au plus, d’une même catégorie ; toucher de nouveau retire', () => {
    expect(basculerDans(['a', 'b'], c, trouver)).toEqual({ ids: ['a', 'b', 'c'], refus: null })
    expect(basculerDans(['a', 'b', 'c'], tel('d', 1, '4'), trouver).refus).toBe('plein')
    expect(basculerDans(['a'], frigo, trouver).refus).toBe('categorie')
    expect(basculerDans(['a', 'b'], a, trouver)).toEqual({ ids: ['b'], refus: null })
  })
  it('meilleure valeur : le moins cher livré parmi les mieux notés (0,3 étoile), en stock', () => {
    const livre = (p: Produit) => p.prix + 900
    expect(meilleureValeur([a, b, c], livre)).toBe('b') // c, moins cher, est à 0,6 étoile de la meilleure note
    expect(meilleureValeur([a, { ...b, stock: 0 }, c], livre)).toBe('a')
    expect(meilleureValeur([a], livre)).toBeNull()
  })
  it('lignes : la meilleure de chaque ligne chiffrée, les égales repérées, les caractéristiques réunies', () => {
    const l = lignesComparees([a, b], (p) => p.prix + 900, (n) => String(n))
    const de = (k: string) => l.find((x) => x.libelle === k)!
    expect(de('Prix')).toMatchObject({ valeurs: ['600000 F', '560000 F'], meilleurs: [1], egales: false })
    expect(de('Note').meilleurs).toEqual([0])
    expect(de('Marque').egales).toBe(true)
    expect(de('Écran').egales).toBe(true)
    expect(de('Puce')).toMatchObject({ valeurs: ['A18', 'A17'], egales: false })
  })
})

describe('n° 8 · alerte de baisse de prix', () => {
  it('une baisse compte dès 500 F ; pourcentage arrondi (0 : moins de 1 %)', () => {
    expect(BAISSE_MIN_F).toBe(500)
    expect(baisseDePrix(750_000, 690_000)).toEqual({ montant: 60_000, pourcent: 8 })
    expect(baisseDePrix(625_000, 620_000)).toEqual({ montant: 5_000, pourcent: 1 })
    expect(baisseDePrix(300_000, 299_000)).toEqual({ montant: 1_000, pourcent: 0 })
  })
  it('pas de baisse : prix égal, en hausse, sous le seuil, ou prix d’ajout inconnu', () => {
    expect(baisseDePrix(10_000, 10_000)).toBeNull()
    expect(baisseDePrix(10_000, 12_000)).toBeNull()
    expect(baisseDePrix(10_000, 9_600)).toBeNull()
    expect(baisseDePrix(null, 9_000)).toBeNull()
  })
})

describe('n° 9 · suivi vitrine', () => {
  const H = 3_600_000
  const colis = (statut: string, arrive = false) => ({ n: 1, statut, arrive }) as never
  const base = { etat: 'preparation', pretLe: null, arriveeLe: null, fil: [] } as never as Parameters<typeof vitrineDe>[0]
  it('pas ramassé : à la boutique ; ramassé : la part du temps écoulé (5 à 95 %) ; arrivé ; retiré', () => {
    expect(vitrineDe({ ...base, colis: [colis('pret')] }, 0)).toMatchObject({ etape: 0, part: 0 })
    const fil = [{ titre: 'Ramassé', texte: '', le: 10 * H }]
    expect(vitrineDe({ ...base, colis: [colis('recupere')], fil, pretLe: 12 * H }, 11 * H)).toMatchObject({ etape: 1, part: 0.5, depart: 10 * H, arrivee: 12 * H })
    expect(vitrineDe({ ...base, colis: [colis('recupere')], fil, pretLe: 12 * H }, 10 * H).part).toBe(0.05)
    expect(vitrineDe({ ...base, colis: [colis('recupere')], fil, pretLe: 12 * H }, 13 * H).part).toBe(0.95)
    // Sans heure prévue : le départ plus TRAJET_MIN.
    expect(vitrineDe({ ...base, colis: [colis('recupere')], fil }, 10 * H).arrivee).toBe(10 * H + TRAJET_MIN * 60_000)
    expect(vitrineDe({ ...base, colis: [colis('recupere', true)], arriveeLe: 11 * H }, 12 * H)).toMatchObject({ etape: 2, part: 1, arrivee: 11 * H })
    expect(vitrineDe({ ...base, etat: 'retiree', colis: [colis('recupere', true)] } as never, 12 * H).etape).toBe(3)
  })
})

describe('n° 10 · accueil par moments', () => {
  const le = (j: string) => Date.parse(`2026-${j}T10:00:00Z`)
  it('le moment actif de la période, le plus prioritaire ; une période qui passe le 31 décembre', () => {
    // La Rentrée est retirée par le porteur (moment « rentree » désactivé) : aucun moment en septembre-octobre.
    expect(momentDuJour(MOMENTS_PAR_DEFAUT, le('09-24'))).toBeNull()
    expect(momentDuJour(MOMENTS_PAR_DEFAUT, le('10-13'))).toBeNull()
    expect(momentDuJour(MOMENTS_PAR_DEFAUT, le('10-17'))).toBeNull()
    expect(momentDuJour(MOMENTS_PAR_DEFAUT, le('12-24'))?.id).toBe('fetes')
    expect(momentDuJour(MOMENTS_PAR_DEFAUT, Date.parse('2027-01-03T10:00:00Z'))?.id).toBe('fetes')
    expect(dansLaPeriode({ du: '12-01', au: '01-06' }, '06-01')).toBe(false)
  })
  it('l’administrateur l’allume ou l’éteint', () => {
    expect(momentDuJour(MOMENTS_PAR_DEFAUT.map((m) => ({ ...m, actif: m.actif || m.id === 'rentree' })), le('09-24'))?.id).toBe('rentree')
    expect(momentDuJour(MOMENTS_PAR_DEFAUT.map((m) => ({ ...m, actif: m.id !== 'fetes' && m.actif })), le('12-24'))).toBeNull()
  })
  it('à Yaoundé : le 14 février à 23 h 30 (UTC) est déjà le 15', () => {
    expect(momentDuJour(MOMENTS_PAR_DEFAUT, Date.parse('2026-02-14T23:30:00Z'))).toBeNull()
  })
})

describe('n° 14 · Mon abonnement : ce mois-ci et palier conseillé', () => {
  // Les commandes payées ce matin avec Prime (jeu d'essai) : relais 13 000 F, domicile 28 000 F, relais 18 500 F.
  const mois = [
    { mode: 'relais' as const, sousTotal: 13_000, livraison: 900 },
    { mode: 'domicile' as const, sousTotal: 28_000, livraison: 2_000 },
    { mode: 'relais' as const, sousTotal: 18_500, livraison: 900 },
  ]
  it('gains d’un palier, quotas rejoués dans l’ordre', () => {
    expect(gainsDuMois('prime', mois)).toEqual({ livraison: 3_300, cagnotte: 1_190, total: 4_490, commandes: 3 })
    expect(gainsDuMois('plus', mois)).toEqual({ livraison: 2_250, cagnotte: 0, total: 2_250, commandes: 3 }) // domicile −30 %
  })
  it('conseillé : le plus de gain après son prix (ici Prime, le palier actuel) ; aucune commande : aucun', () => {
    expect(palierConseille(mois)).toMatchObject({ id: 'prime', net: 490 })
    expect(palierConseille([{ mode: 'relais', sousTotal: 12_000, livraison: 900 }])?.id).toBe('plus')
    expect(palierConseille([])).toBeNull()
  })
})
