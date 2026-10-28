// Modules communs des six applications, lus par l'alias @client (site/src) : regroupement et dessin des marqueurs de
// carte, recommandation de l'accueil (meilleure offre), traducteur du contenu saisi (cache, détection de langue,
// démonstration). Calculs purs : vérifiés ici une fois pour toutes les applications.
import { describe, expect, it, vi } from 'vitest'
import { ACTEURS, capVers, couleurs, svgMarqueur } from '@client/composants/carte/acteurs'
import { deplier, regrouper } from '@client/composants/carte/regroupement'
import { ordonner, recommander } from '@client/donnees/recommandation'
import type { Produit } from '@client/donnees/source'
import { avecCache, detecterLangue, type Traducteur } from '@client/traduction/traducteur'
import { traducteurDemo } from '@client/demo/traducteur-demo'

describe('marqueurs de carte', () => {
  it('regroupe les points trop proches, garde les autres seuls, centre le groupe', () => {
    const g = regrouper(
      [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 10, y: 0 },
        { id: 'c', x: 100, y: 100 },
        { id: 'd', x: Number.NaN, y: 0 },
      ],
      20,
    )
    expect(g.map((x) => x.membres.map((m) => m.id))).toEqual([['a', 'b'], ['c']])
    expect(g[0]).toMatchObject({ id: 'a', x: 5, y: 0 })
    expect(regrouper([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }], 0)).toHaveLength(2)
  })
  it('déplie un groupe en cercle autour de son centre, sans chevauchement', () => {
    const [g] = regrouper(['a', 'b', 'c', 'd'].map((id) => ({ id, x: 50, y: 50 })), 10)
    const places = deplier(g, 30)
    expect(places).toHaveLength(4)
    for (const p of places) expect(Math.hypot(p.x - 50, p.y - 50)).toBeCloseTo(30)
    expect(places[0]).toMatchObject({ x: 50, y: 20 })
  })
  it('cap : nord 0°, est 90°, sud 180° ; aucun cap sur place', () => {
    expect(capVers({ lat: 3.8, lng: 11.5 }, { lat: 3.9, lng: 11.5 })).toBeCloseTo(0)
    expect(capVers({ lat: 3.8, lng: 11.5 }, { lat: 3.8, lng: 11.6 })).toBeCloseTo(90, 0)
    expect(capVers({ lat: 3.9, lng: 11.5 }, { lat: 3.8, lng: 11.5 })).toBeCloseTo(180)
    expect(capVers({ lat: 3.8, lng: 11.5 }, { lat: 3.8, lng: 11.5 })).toBeNull()
  })
  it('chaque acteur a sa couleur et son icône ; le livreur change selon son état ; aucun logo', () => {
    expect(new Set(Object.values(ACTEURS).map((a) => a.libelle)).size).toBe(Object.keys(ACTEURS).length)
    expect(couleurs('livreur', { etat: 'hors_ligne' }).fond).not.toBe(couleurs('livreur', { etat: 'mission' }).fond)
    expect(couleurs('livreur', { etat: 'disponible' }).fond).toBe('#FFFFFF')
    const svg = svgMarqueur('livreur', 32, { etat: 'mission', cap: 45 }, 'Serge <A>')
    expect(svg).toContain('rotate(45)')
    expect(svg).toContain('aria-label="Serge &lt;A&gt;"')
    expect(svg).not.toMatch(/logo|<image/i)
    expect(svgMarqueur('livreur', 32, { etat: 'hors_ligne', cap: 45 })).not.toContain('rotate(')
  })
})

const produit = (p: string, offre: Produit['offre'], extra: Partial<Produit> = {}) => ({ p, stock: 3, ventes: 0, offre, ...extra }) as Produit

describe('recommandation de l’accueil (meilleure offre)', () => {
  it('met en avant les produits qui ont une offre retenue, le meilleur score d’abord', () => {
    const l = [
      produit('a', { score: 70, ctl: 10_000, meilleurCtl: 10_000 }),
      produit('b', null),
      produit('c', { score: 82, ctl: 5_000, meilleurCtl: 5_000 }),
      produit('d', { score: 82, ctl: 5_500, meilleurCtl: 5_000 }),
      produit('e', { score: 90, ctl: 1, meilleurCtl: 1 }, { stock: 0 }),
    ]
    expect(recommander(l).map((x) => x.p)).toEqual(['c', 'd', 'a'])
    expect(ordonner(l).map((x) => x.p)).toEqual(['e', 'c', 'd', 'a', 'b'])
  })
  it('sans offre servie (serveur qui ne la calcule pas encore) : l’ordre du catalogue, rien de retiré', () => {
    const l = [produit('x', undefined), produit('y', undefined)]
    expect(recommander(l)).toBe(l)
    expect(ordonner(l).map((x) => x.p)).toEqual(['x', 'y'])
  })
})

describe('traducteur du contenu saisi', () => {
  it('détecte le français et l’anglais ; ne tranche pas sans indice', () => {
    expect(detecterLangue('Très bon produit, livraison rapide au relais.')).toBe('fr')
    expect(detecterLangue('Great product, the delivery was very fast and it works well.')).toBe('en')
    expect(detecterLangue('iPhone 15 · 256 Go')).toBeNull()
    expect(detecterLangue('')).toBeNull()
  })
  it('garde chaque traduction : une seule demande pour un même texte, même en même temps ; une erreur n’est pas gardée', async () => {
    let n = 0
    const lent: Traducteur = { nom: 'essai', traduire: vi.fn(async (t: string) => (n++, { texte: t.toUpperCase(), automatique: true as const, fournisseur: 'essai' })) }
    const c = avecCache(lent)
    const [a, b] = await Promise.all([c.traduire('bonjour', 'fr', 'en'), c.traduire('bonjour', 'fr', 'en')])
    expect(a.texte).toBe('BONJOUR')
    expect(b).toBe(a)
    await c.traduire('bonjour', 'fr', 'en')
    expect(n).toBe(1)
    await c.traduire('bonjour', 'en', 'fr')
    expect(n).toBe(2)
    let echecs = 0
    const casse = avecCache({ nom: 'casse', traduire: async () => (echecs++, Promise.reject(new Error('quota'))) })
    await expect(casse.traduire('x', 'fr', 'en')).rejects.toThrow('quota')
    await expect(casse.traduire('x', 'fr', 'en')).rejects.toThrow('quota')
    expect(echecs).toBe(2)
  })
  it('borne le cache (les plus anciennes partent d’abord)', async () => {
    let n = 0
    const c = avecCache({ nom: 'essai', traduire: async (t) => (n++, { texte: t, automatique: true, fournisseur: 'essai' }) }, 2)
    await c.traduire('a', 'fr', 'en')
    await c.traduire('b', 'fr', 'en')
    await c.traduire('c', 'fr', 'en')
    await c.traduire('a', 'fr', 'en')
    expect(n).toBe(4)
  })
  it('démonstration : mot à mot, toujours marquée automatique, majuscule gardée', async () => {
    const r = await traducteurDemo.traduire('Très bon produit, merci', 'fr', 'en')
    expect(r).toEqual({ texte: 'Very good product, thank you', automatique: true, fournisseur: 'démonstration' })
  })
})
