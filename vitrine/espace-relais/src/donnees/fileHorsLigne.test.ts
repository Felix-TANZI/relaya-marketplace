// File hors connexion (ARL-46) : aucun PIN n'est jamais gardé dans la file ; la charge garde la preuve de la
// signature faite sur le téléphone.
import { describe, expect, it, vi } from 'vitest'
import type { Origine } from './communs'

describe('file hors connexion : jamais de PIN', async () => {
  vi.stubGlobal('navigator', { onLine: false })
  const { sansPin, signeParPin } = await import('./fileHorsLigne')
  const o: Origine = { cle: 'cle-1', heure: 1_000, position: null }
  const PIN = '240913'

  it('remettre, valider un lot, un départ, un inventaire : le PIN est remplacé par la preuve', () => {
    for (const [d, m, args] of [
      ['retrait', 'remettre', ['R-1', PIN, o]],
      ['retrait', 'refusSansMotif', ['R-1', PIN, o]],
      ['reception', 'validerLot', ['PQ-1', 'ph-1', PIN, o]],
      ['departs', 'valider', ['A4', 'ph-2', PIN, o]],
      ['stock', 'terminerInventaire', [PIN, o]],
    ] as const) {
      expect(signeParPin(d, m)).toBe(true)
      const c = JSON.stringify(sansPin(d, m, [...args], o))
      expect(c).not.toContain(PIN)
      expect(c).toMatch(/preuve-pin:1000:[0-9a-f]{8}/)
    }
  })

  it('constat et dépôt de retour : le champ pin est remplacé ; un geste sans PIN est gardé tel quel', () => {
    const c = sansPin('incidents', 'ouvrirConstat', [{ colis: 'BLV-1', motif: 'abime', photos: ['a', 'b'], note: null, devantLeClient: true, pin: PIN }, o], o)
    expect(JSON.stringify(c)).not.toContain(PIN)
    expect(JSON.stringify(sansPin('incidents', 'deposerRetour', [{ reference: 'RT-1', scelle: 'intact', photos: [], pin: PIN }, o], o))).not.toContain(PIN)
    expect(sansPin('messages', 'envoyer', ['T-1', 'Bonjour', [], o], o)).toEqual(['T-1', 'Bonjour', [], o])
    expect(signeParPin('messages', 'envoyer')).toBe(false)
  })
})
