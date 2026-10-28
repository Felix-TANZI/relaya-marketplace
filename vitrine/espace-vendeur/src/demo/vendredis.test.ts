// R22 : un seul versement par vendredi ; BLV-VS-4071 (ven. 2 oct.) et BLV-VS-4085 (ven. 9 oct.) ne tombent plus le même jour.
import { describe, expect, it } from 'vitest'
import { versementsPasses } from './versements'

describe('versements du jeu d’essai', () => {
  it('un versement par vendredi', () => {
    const v = versementsPasses()
    expect(new Set(v.map((x) => x.vendredi)).size).toBe(v.length)
    expect(v.filter((x) => ['BLV-VS-4071', 'BLV-VS-4085'].includes(x.reference)).map((x) => [x.reference, x.vendredi])).toEqual([
      ['BLV-VS-4085', '2026-10-09'],
      ['BLV-VS-4071', '2026-10-02'],
    ])
  })
})
