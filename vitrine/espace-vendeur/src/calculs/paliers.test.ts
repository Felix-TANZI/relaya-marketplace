// Mêmes exemples que moteurs/tests/test_paliers_demarrage.py (la libération côté litiges est dans litiges.test.ts).
import { describe, expect, it } from 'vitest'
import { Dec } from './argent'
import { livreesSansIncident, plafondActif, quantiteAttribuable, type Incident } from './demarrage'
import { evolution, palierAtteint, palierDeLancement, paliersEffectifs, type EtatDuJour } from './paliers'
import { lirePaliers, REGISTRE, type Palier } from './registre'
import { ajouterJours } from './temps'

const P = lirePaliers(REGISTRE)
const AUJOURD_HUI = '2026-09-21'
const etat = (score: string | number, livrees = 0, note = '4.5', visite = false, audit = false, jour = AUJOURD_HUI): EtatDuJour => ({
  jour, trustScore: Dec.de(String(score)), commandesLivrees: livrees, note: Dec.de(note), visite, audit,
})
const historique = (jours: number, score: number, livrees = 0, note = '4.5', visite = false) =>
  Array.from({ length: jours }, (_, i) => etat(score, livrees, note, visite, false, ajouterJours(AUJOURD_HUI, -(jours - 1 - i))))

it('paramètres', () => {
  const c = P.conditions
  expect([c.Argent.trustScore, c.Argent.commandesLivrees, c.Argent.note.texte()]).toEqual([65, 10, '4.0'])
  expect([c.Or.trustScore, c.Or.commandesLivrees, c.Or.note.texte(), c.Or.visite]).toEqual([80, 50, '4.3', true])
  expect([c.Platine.trustScore, c.Platine.audit]).toEqual([90, true])
  expect([P.monteeJours, P.descenteJours, P.lancementMois]).toEqual([14, 14, 2])
  expect(P.lancementProduits).toEqual({ Argent: 15, Or: 40, Platine: 80 })
  expect([P.plafondDemarrage, P.demarrageCommandes]).toEqual([500000, 10])
})

it.each([
  [etat('62.7', 7), 'Bronze'], // Tonton PG
  [etat(65, 10, '4.0'), 'Argent'],
  [etat(65, 10, '3.9'), 'Bronze'],
  [etat('64.9', 10), 'Bronze'],
  [etat(85, 60, '4.4'), 'Argent'],
  [etat(85, 60, '4.4', true), 'Or'],
  [etat(95, 60, '4.4', true), 'Or'],
  [etat(95, 60, '4.4', true, true), 'Platine'],
  [etat(95, 20, '4.8', false, true), 'Argent'],
] as [EtatDuJour, Palier][])('palier atteint %#', (e, palier) => {
  expect(palierAtteint(e, P)).toBe(palier)
})

it('montée après 14 jours de suite (C4)', () => {
  expect(evolution('Bronze', historique(14, 66, 12, '4.2'), P).montee).toBe('Argent')
  expect(evolution('Bronze', historique(13, 66, 12, '4.2'), P).montee).toBe(null)
  const coupe = historique(14, 66, 12, '4.2')
  coupe[5] = etat(64, 12, '4.2', false, false, coupe[5].jour)
  expect(evolution('Bronze', coupe, P).montee).toBe(null)
  expect(evolution('Argent', historique(14, 66, 12, '4.2'), P)).toEqual(evolution('Argent', [], P))
})

it('descente proposée après 14 jours sous le seuil (DP-21)', () => {
  const e = evolution('Or', historique(14, 79, 60, '4.4', true), P)
  expect([e.montee, e.descenteProposee]).toEqual([null, 'Argent'])
  expect(evolution('Or', historique(13, 79, 60, '4.4', true), P).descenteProposee).toBe(null)
  expect(evolution('Or', historique(14, 80, 60, '4.4', true), P).descenteProposee).toBe(null)
  expect(evolution('Bronze', historique(14, 10), P).descenteProposee).toBe(null)
})

it('relevés non consécutifs refusés', () => {
  const h = historique(3, 70)
  expect(() => evolution('Bronze', [h[0], h[2]], P)).toThrow(/un jour manque/)
})

it('palier de lancement (ACC-15, Q-10)', () => {
  expect(palierDeLancement('2026-09-01', '2026-10-15', 45, P)).toBe('Or')
  expect(palierDeLancement('2026-09-01', '2026-11-01', 80, P)).toBe('Platine')
  expect(palierDeLancement('2026-09-01', '2026-11-02', 80, P)).toBe(null)
  expect(palierDeLancement('2026-09-01', '2026-09-02', 15, P)).toBe('Argent')
  expect(palierDeLancement('2026-09-01', '2026-09-02', 14, P)).toBe('Bronze')
})

it('paliers effectifs : multiplicateur seulement (Q-10)', () => {
  expect(paliersEffectifs('Bronze', '2026-09-01', '2026-09-21', 45, P)).toEqual({ commission: 'Or', liberation: 'Bronze' })
  expect(paliersEffectifs('Platine', '2026-09-01', '2026-09-21', 20, P)).toEqual({ commission: 'Platine', liberation: 'Platine' })
  expect(paliersEffectifs('Bronze', '2026-09-01', '2026-12-01', 45, P)).toEqual({ commission: 'Bronze', liberation: 'Bronze' })
})

describe('plafond de démarrage (Q-14)', () => {
  it('livrées sans incident', () => {
    const commandes: Incident[][] = [[], ['rupture'], [], ['litige perdu', 'retour validé pour défaut'], [], []]
    expect(livreesSansIncident(commandes)).toBe(4)
    expect(plafondActif(9, P) && !plafondActif(10, P)).toBe(true)
  })
  it.each([
    [200000, 3, 0, 0, 2],
    [500000, 1, 0, 0, 1],
    [500001, 1, 0, 0, 0],
    [200000, 3, 10, 0, 3],
    [200000, 2, 9, 400000, 0],
    [50000, 5, 0, 300000, 4],
    [50000, 5, 0, 600000, 0],
  ])('quantité attribuable %#', (prix, qte, sans, deja, attendu) => {
    expect(quantiteAttribuable(prix, qte, sans, P, deja)).toBe(attendu)
  })
  it('quantité invalide', () => {
    expect(() => quantiteAttribuable(0, 1, 0, P)).toThrow()
  })
})
