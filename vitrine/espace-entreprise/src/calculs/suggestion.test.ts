// Affectation suggérée (VAGUE-AMELIORATIONS.md n° 6, calculs/suggestion.ts) : zone, charge du jour, Trust Score, puis
// distance ; la suggestion n'est qu'une proposition (DP-63).
import { describe, expect, it } from 'vitest'
import { classer, noter } from './suggestion'

const l = (id: string, trustScore: number | null, missionsDuJour: number, distanceKm: number | null, zones = ['Z1']) => ({ id, nom: id, trustScore, missionsDuJour, distanceKm, zones })

describe('suggestion d’affectation', () => {
  it('note sur 100 : Trust 35, charge 30, distance 20, zone principale 15', () => {
    expect(noter(l('a', 100, 0, 0), 'Z1')).toMatchObject({ note: 100, zonePrincipale: true })
    expect(noter(l('b', 80, 3, 5), 'Z1').parts).toEqual({ trust: 28, charge: 15, distance: 10, zone: 15 })
    // Rattaché sans être sa zone principale : la moitié des points de zone ; position inconnue : 0,3 de la distance.
    expect(noter(l('c', 60, 0, null, ['Z3', 'Z1']), 'Z1')).toMatchObject({ note: 65, zonePrincipale: false }) // 21 + 30 + 6 + 7,5
  })
  it('le plus proche ne gagne plus seul : un livreur moins chargé et mieux noté passe devant', () => {
    const proche = l('proche', 62, 4, 0.8)
    const equilibre = l('equilibre', 91, 1, 3.5)
    expect(classer([proche, equilibre], 'Z1').map((s) => s.id)).toEqual(['equilibre', 'proche'])
  })
  it('à note égale : la distance connue la plus courte, puis le nom', () => {
    expect(classer([l('b', 80, 2, 4), l('a', 80, 2, 4), l('c', 80, 2, null)], 'Z1').map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })
  it('Trust Score à venir : compté 50 ; personne : aucune suggestion', () => {
    expect(noter(l('n', null, 0, 0), 'Z1').parts.trust).toBe(17.5)
    expect(classer([], 'Z1')).toEqual([])
  })
})

describe('ordre total du serveur à égalité (moteurs/ECARTS-TS.md n° 9, suggestion.py)', () => {
  it('nom sans accents ni casse, puis nom exact, puis identifiant', () => {
    const c = (id: string, nom: string) => ({ id, nom, trustScore: 80, missionsDuJour: 1, distanceKm: 2, zones: ['Z1'] })
    expect(classer([c('l1', 'Ana'), c('L02', 'ana'), c('b', 'Bello'), c('a', 'Bello')], 'Z1').map((s) => s.id)).toEqual(['l1', 'L02', 'a', 'b'])
    expect(classer([c('x', 'Émile'), c('y', 'Eric')], 'Z1').map((s) => s.id)).toEqual(['x', 'y'])
  })
})
