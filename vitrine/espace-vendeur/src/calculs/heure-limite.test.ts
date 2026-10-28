import { describe, expect, it } from 'vitest'
import { promesseDepuis } from '@client/calculs'
import { heureLimite } from './heure-limite'
import { yaounde } from './temps'

const hm = (t: number) => new Date(t + 3600e3).toISOString().slice(0, 16)

describe('heure limite de « C’est prêt » (R45, R47)', () => {
  it('mardi 9 h 48 : prêt avant 13 h, livré aujourd’hui avant 15 h', () => {
    const r = heureLimite(yaounde(2026, 10, 13, 9, 48))
    expect(hm(r.limite!)).toBe('2026-10-13T13:00')
    expect(hm(r.livreAvant)).toBe('2026-10-13T15:00')
    expect(promesseDepuis(yaounde(2026, 10, 13, 9, 48), 'domicile', 0)).toBe('Livré aujourd’hui avant 15 h')
  })
  it('mardi 13 h 30 : livré mercredi avant 13 h', () => {
    const r = heureLimite(yaounde(2026, 10, 13, 13, 30))
    expect(r.limite).toBeNull()
    expect(hm(r.livreAvant)).toBe('2026-10-14T13:00')
  })
  it('samedi 14 h : livré lundi avant 13 h (pas de service le dimanche, R46)', () => {
    const r = heureLimite(yaounde(2026, 10, 17, 14, 0))
    expect(r.limite).toBeNull()
    expect(hm(r.livreAvant)).toBe('2026-10-19T13:00')
  })
  it('dimanche : le décompte part de lundi 8 h', () => {
    const r = heureLimite(yaounde(2026, 10, 18, 10, 0))
    expect(hm(r.limite!)).toBe('2026-10-19T13:00')
    expect(hm(r.livreAvant)).toBe('2026-10-19T13:00')
  })
  it('12 h : livré aujourd’hui avant 17 h ; 12 h 30 : avant 18 h (fermeture)', () => {
    expect(hm(heureLimite(yaounde(2026, 10, 13, 12, 0)).livreAvant)).toBe('2026-10-13T17:00')
    expect(hm(heureLimite(yaounde(2026, 10, 13, 12, 30)).livreAvant)).toBe('2026-10-13T18:00')
  })
})
