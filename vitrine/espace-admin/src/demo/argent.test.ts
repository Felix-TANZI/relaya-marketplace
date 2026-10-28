// Démonstration de l'argent (S2) : l'escrow est équilibré, les lots du vendredi suivent les règles, les droits tiennent.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { SourceAdmin } from '../donnees/source'
import { REFERENCE } from './horloge'

let src: SourceAdmin
const memoire = new Map<string, string>()
beforeAll(async () => {
  vi.stubGlobal('localStorage', { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v), removeItem: (k: string) => void memoire.delete(k), clear: () => memoire.clear(), key: () => null, length: 0 })
  vi.stubGlobal('window', { setInterval: () => 0, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true })
  vi.stubGlobal('CustomEvent', class extends Event {})
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(REFERENCE)
  src = (await import('./source-demo')).sourceDemo
})
const role = (r: 'superviseur' | 'finance' | 'support' | 'operations' | 'audit') => src.session.changerRole(r)

describe('argent de la démonstration', () => {
  it('escrow : Σ débits = Σ crédits, états déduits', async () => {
    await role('superviseur')
    const v = await src.argent.escrow()
    expect(v.equilibre).toBe(true)
    const e = Object.fromEntries(v.commandes.map((c) => [c.ref, c.etat]))
    expect(e['BLV-51877']).toBe('gele')
    expect(e['BLV-52198']).toBe('se_libere')
    expect(e['BLV-00004']).toBe('verse')
    expect(e['BLV-52150']).toBe('rembourse')
  })
  it('Finance : référence du litige seule', async () => {
    await role('finance')
    const v = await src.argent.escrow()
    expect(v.commandes.find((c) => c.ref === 'BLV-51877')!.dossierLisible).toBe(false)
  })
  it('Opérations : ses zones seulement, pas de Wallet', async () => {
    await role('operations')
    const v = await src.argent.escrow()
    expect(v.commandes.every((c) => ['Z1', 'Z2', 'Z3', 'Z6'].includes(c.zone))).toBe(true)
    await expect(src.argent.wallet()).rejects.toThrow()
  })
  it('Support : jamais les versements', async () => {
    await role('support')
    await expect(src.argent.versements()).rejects.toThrow()
  })
  it('versements : lot élevé à contrôler, numéro bloqué reporté, dette du relais', async () => {
    await role('finance')
    const v = await src.argent.versements()
    const lot = (n: string) => v.courant.lots.find((l) => l.beneficiaire === n)!
    console.log(v.courant.lots.map((l) => `${l.beneficiaire} ${l.etat} ${l.verse} ${l.dette}`).join('\n'))
    expect(lot('Techno Bastos').etat).toBe('controle_requis')
    expect(lot('Beauté Melen').etat).toBe('reporte')
    expect(lot('Relais Mokolo Marché').verse).toBe(0)
    expect(lot('Relais Biyem-Assi Lycée').reports).toBe(4)
  })
  it('R43 et R22 : 1 % retenu sur chaque versement, payé par celui qui le reçoit, arrondi au franc supérieur', async () => {
    await role('finance')
    const v = await src.argent.versements()
    for (const l of [...v.courant.lots, ...(v.dernier?.lots ?? [])]) {
      expect(l.fraisBelivay).toBe(0)
      const brut = l.verse + l.frais
      expect(l.frais).toBe(brut > 0 ? Math.ceil(brut / 100 - 1e-9) : 0)
    }
    expect(v.courant.lots.some((l) => l.genre === 'entreprise' && l.frais > 0)).toBe(true)
    expect(v.courant.lots.some((l) => l.genre === 'relais' && l.frais > 0)).toBe(true)
  })
  it('remboursements et rapprochement se lisent', async () => {
    await role('finance')
    const r = await src.argent.remboursements()
    console.log(r.liste.map((x) => `${x.id} ${x.etat} ${x.montant}`).join('\n'))
    const rp = await src.argent.rapprochement()
    expect(rp.cloture.exports.length).toBe(3)
    const c = await src.argent.commissions()
    expect(c.vendeurs.length).toBe(6)
  })
})
