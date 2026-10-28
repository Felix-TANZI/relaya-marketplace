// Décisions de la console vues du relais : inspection annoncée (notification), fin de convention (plus de nouveaux colis,
// colis en garde à faire partir, motif « fermeture »).
import { describe, expect, it, vi } from 'vitest'
import { REFERENCE } from './horloge'

const memoire = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, String(v)), removeItem: (k: string) => void memoire.delete(k) })
const deLaConsole = (e: Record<string, unknown>, cle: string) => memoire.set('blv_pont', JSON.stringify([...JSON.parse(memoire.get('blv_pont') ?? '[]'), { ...e, cle, app: 'admin', le: REFERENCE }]))

describe('console → relais', async () => {
  vi.setSystemTime(REFERENCE)
  const { avisConsole } = await import('./pont-console')
  const p = await import('./pont-livreur')
  const { etatRelais } = await import('./relais')
  const { etatColis } = await import('./colis')

  it('inspection annoncée : le relais de démonstration est prévenu, pas un autre', () => {
    const e = { type: 'inspection_annoncee', relais: 'rel-z1-001', descente: 'DT-0017', prevueLe: REFERENCE + 3600_000, cle: 'x', app: 'admin', le: REFERENCE } as const
    expect(avisConsole(e, 'relais')?.titre).toBe('BelivaY · Inspection prévue')
    expect(avisConsole({ ...e, relais: 'rel-z3-009' }, 'relais')).toBeNull()
  })
  it('fin de convention échue : relais clos au dépôt, colis en garde à faire partir', () => {
    deLaConsole({ type: 'convention_terminee', relais: 'rel-z1-001', motif: 'Fin de convention à la demande du gérant', effet: REFERENCE }, 'fin-1')
    p.appliquerPont()
    expect(etatRelais.lire().statut).toBe('clos')
    const l = Object.values(etatColis.lire().colis)
    expect(l.some((c) => c.sortie?.motif === 'fermeture' && c.etat === 'a_faire_partir')).toBe(true)
    expect(l.some((c) => c.etat === 'en_stock')).toBe(false)
  })
})
