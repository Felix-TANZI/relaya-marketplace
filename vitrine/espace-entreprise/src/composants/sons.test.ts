// Plage calme de l'entreprise (ENT-08) lue par la marque sonore : seuls les sons discrets se taisent.
import { describe, expect, it, vi } from 'vitest'

const reglerCalme = vi.fn()
vi.mock('./marque-sonore', () => ({ reglerCalme, sonner: vi.fn() }))
vi.mock('../donnees/source', () => ({ source: {} }))
vi.mock('../session', () => ({ useSession: () => ({}) }))

describe('plage calme de l’entreprise', () => {
  it('passe minuit et ne tait que les sons discrets', async () => {
    const { appliquerPlageCalme, dansPlageCalme } = await import('./sons')
    expect([21, 23, 0, 6].map((h) => dansPlageCalme(h, { de: 21, a: 7 }))).toEqual([true, true, true, true])
    expect([7, 12, 20].map((h) => dansPlageCalme(h, { de: 21, a: 7 }))).toEqual([false, false, false])
    // 22 h 30 à Yaoundé = 21 h 30 UTC.
    appliquerPlageCalme({ de: 21, a: 7 }, () => Date.UTC(2026, 9, 18, 21, 30))
    const [estCalme, intentions] = reglerCalme.mock.calls[0]
    expect(estCalme()).toBe(true)
    expect(intentions).toEqual(['discret'])
    appliquerPlageCalme(null)
    expect(reglerCalme.mock.calls[1][0]).toBeNull()
  })
})
