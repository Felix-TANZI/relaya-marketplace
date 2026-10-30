// R70 (BV-DEV v2.0, décision finale) tenu par la source : remplacement non fait sous 72 h ouvrées (dimanche non compté)
// ⇒ remboursement ; client silencieux 5 jours après une demande de complément ⇒ litige clos. Une fois chacun.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { SourceAdmin } from '../donnees/source'

let s: SourceAdmin
const memoire = new Map<string, string>()
const REF = Date.UTC(2026, 9, 13, 13, 5)
const J = 86_400_000
beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(REF)
  vi.stubGlobal('localStorage', { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v), removeItem: (k: string) => void memoire.delete(k), clear: () => memoire.clear(), key: () => null, length: 0 })
  vi.stubGlobal('window', { setInterval: () => 0, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true })
  vi.stubGlobal('CustomEvent', class extends Event {})
  s = (await import('./source-demo')).sourceDemo
})
afterAll(() => void vi.useRealTimers())

describe('R70', () => {
  it('72 h ouvrées, dimanche non compté', async () => {
    const { plusHeuresOuvrees } = await import('./litiges')
    expect(plusHeuresOuvrees(REF, 72)).toBe(REF + 3 * J) // mardi → vendredi
    const samedi10h = Date.UTC(2026, 9, 17, 9, 0)
    expect(plusHeuresOuvrees(samedi10h, 72)).toBe(Date.UTC(2026, 9, 21, 9, 0)) // le dimanche ne compte pas
  })
  it('client silencieux 5 jours après une demande de complément : litige clos, une seule fois', async () => {
    await s.session.changerRole('support')
    const r = await s.litiges.demanderComplement('LT-0412', 'client', 'Merci d’envoyer la photo de l’étiquette du vêtement reçu.')
    expect(r.ok).toBe(true)
    expect((await s.litiges.litige('LT-0412'))?.etat).not.toBe('decide')
    // L'heure de la démonstration ne saute pas des jours : la demande est datée de 6 jours (comme au serveur, plus tard).
    const { litigesDemo } = await import('./litiges')
    litigesDemo.ecrire((e) => void (e.dossiers['LT-0412'].complements.at(-1)!.le = REF - 6 * J))
    const d = await s.litiges.litige('LT-0412')
    expect(d?.etat).toBe('decide')
    expect(d?.decision?.motif).toMatch(/R70 : client silencieux/)
    await s.litiges.liste()
    const pont = JSON.parse(memoire.get('blv_pont') ?? '[]') as { type: string; id?: string; cle: string }[]
    expect(pont.filter((e) => e.type === 'litige_decide' && e.id === 'LT-0412')).toHaveLength(1)
  })
})
