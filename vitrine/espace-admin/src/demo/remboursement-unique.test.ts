// Garde d'idempotence (REPRISES-FIN, pont console → client) : un seul remboursement par commande, que la console
// annule la commande (commande_annulee) ou exécute un remboursement (remboursement_execute).
import { beforeAll, describe, expect, it, vi } from 'vitest'

const memoire = new Map<string, string>()
beforeAll(() => {
  vi.stubGlobal('localStorage', { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v), removeItem: (k: string) => void memoire.delete(k), clear: () => memoire.clear(), key: () => null, length: 0 })
  vi.stubGlobal('window', { setInterval: () => 0, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true })
  vi.stubGlobal('CustomEvent', class extends Event {})
})

describe('un seul remboursement par commande', () => {
  it('une annulation déjà partie bloque l’exécution d’un remboursement de la même commande', async () => {
    const { publier } = await import('./pont')
    const { dejaRembourseeAuPont } = await import('./argent')
    expect(dejaRembourseeAuPont('BLV-52107', 'admin-remb-RB-0031')).toBe(false)
    publier({ type: 'commande_annulee', commande: 'BLV-52107', motif: 'Rupture', montant: 180280 }, 'admin-annulation-BLV-52107', Date.now())
    expect(dejaRembourseeAuPont('BLV-52107', 'admin-remb-RB-0031')).toBe(true)
    expect(dejaRembourseeAuPont('BLV-52107', 'admin-annulation-BLV-52107')).toBe(false)
    expect(dejaRembourseeAuPont('BLV-51877', 'admin-remb-RB-0032')).toBe(false)
  })
})
