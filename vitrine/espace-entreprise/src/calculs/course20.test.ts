// R54, R48 (BV-DEV-05) : mêmes exemples que moteurs/tests/test_v20_entreprises.py.
import { describe, expect, it } from 'vitest'
import { paiementPrestation, plafondAchat, plafondDomicile, plafondRelais } from './course20'

describe('plafond d’achat (R54) et retard (R48)', () => {
  it('relais par format : pochette 540 F (ligne 5 de la grille, R86)', () => {
    expect(plafondRelais('P')).toBe(540)
    expect(() => plafondRelais('XL')).toThrow()
  })
  it('domicile et formule', () => {
    expect([plafondDomicile(1500), plafondAchat(900, 400, 100), plafondAchat(100, 400)]).toEqual([1360, 360, 0])
  })
  it('retard', () => expect([paiementPrestation(1000, true), paiementPrestation(1000, true, true), paiementPrestation(1000, false)]).toEqual([800, 1000, 1000]))
})
