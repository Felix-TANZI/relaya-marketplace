import { describe, expect, it } from 'vitest'
import { attribuerEmplacement, occupation, placesDuLot, type Case } from './capacite'
import { PARAMETRES } from './registre'

const P = PARAMETRES.relais
const cases = (a: number, b: number, c: number): Case[] => [
  { code: 'A-01', etagere: 'A', capacite: 4, occupee: a },
  { code: 'B-01', etagere: 'B', capacite: 4, occupee: b },
  { code: 'C-01', etagere: 'C', capacite: 6, occupee: c },
]

describe('capacité du relais', () => {
  it('places par classe et lot : PQ-Z1-261013-003 (S2 M2) occupe 6 places', () => expect(placesDuLot(['S', 'S', 'M', 'M'], P)).toBe(6))
  it('occupation : retours déposés exclus ; seuil PR-SATURATION', () => {
    const o = occupation([{ classe: 'L', retour: false }, { classe: 'M', retour: false }, { classe: 'S', retour: true }], 10, P)
    expect(o).toEqual({ occupees: 7, declarees: 10, libres: 3, taux: 70, seuilAtteint: false })
    expect(occupation(Array.from({ length: 54 }, () => ({ classe: 'S' as const, retour: false })), 60, P).seuilAtteint).toBe(true)
    expect(occupation(Array.from({ length: 53 }, () => ({ classe: 'S' as const, retour: false })), 60, P).seuilAtteint).toBe(false)
  })
  it('emplacement : petit en A, moyen en B, encombrant au sol C ; un petit prend B ou C si A est pleine', () => {
    expect(attribuerEmplacement('S', cases(0, 0, 0), P)).toBe('A-01')
    expect(attribuerEmplacement('S', cases(4, 0, 0), P)).toBe('B-01')
    expect(attribuerEmplacement('S', cases(4, 4, 0), P)).toBe('C-01')
    expect(attribuerEmplacement('M', cases(0, 3, 0), P)).toBeNull()
    expect(attribuerEmplacement('L', cases(0, 0, 1), P)).toBe('C-01')
    expect(attribuerEmplacement('L', cases(0, 0, 2), P)).toBeNull()
  })
})
