// Assistant de mise en ligne (VAGUE n° 11) : le prix suggéré est le prix conseillé R34 sans prix saisi
// (max(médiane des prix gagnants des zones ; 10e centile du marché ; 1 000 F ; plancher)).
import { describe, expect, it } from 'vitest'
import { ficheDe, prixConseille } from './produits'

describe('prix suggéré de l’assistant (R34)', () => {
  it('ITEL AC52 : médiane des prix gagnants des quatre zones', () => {
    // Prix gagnants : 20 500 − 1 000 − 100 → 19 400 ; 20 400 ; 19 000 ; 20 100 → médiane 19 750 (10e centile : 18 800).
    expect(prixConseille(ficheDe('itel-ac52')!, 10_000_000, null)).toBe(19_750)
  })
  it('jamais sous le plancher privé du vendeur, jamais au-dessus du prix saisi', () => {
    expect(prixConseille(ficheDe('itel-ac52')!, 10_000_000, 21_000)).toBe(21_000)
    expect(prixConseille(ficheDe('itel-ac52')!, 18_000, null)).toBe(18_000)
  })
})
