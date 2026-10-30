// Mêmes exemples que moteurs/tests/test_comptoir_annulation_carte.py (montant dû, deux refus, code, DP-24).
import { describe, expect, it } from 'vitest'
import { apresRefus, codeFaux, monnaieARendre, montantDuAuRetrait, pieceExigee, renvoiPossible, retenueApresRefus, soldeDuVendredi } from './comptoir'
import { PARAMETRES } from './registre'

const P = PARAMETRES.relais

describe('comptoir', () => {
  it('montant dû au retrait', () => {
    expect(montantDuAuRetrait(24_000, 0)).toBe(24_000) // BLV-51940, 1er jour
    expect(montantDuAuRetrait(0, 300)).toBe(300) // BLV-52018 payée, garde du jeudi (DP-08)
  })
  it('deux refus imposent le paiement d’avance', () => {
    const un = apresRefus(0, P)
    expect([un.refus, un.avanceObligatoire]).toEqual([1, false])
    const deux = apresRefus(un.refus, P)
    expect([deux.refus, deux.avanceObligatoire]).toEqual([2, true])
  })
  it('code de retrait : renvois, 3 codes faux ⇒ 24 h, le client redemande un code (DP-26)', () => {
    expect(renvoiPossible(2, P) && !renvoiPossible(3, P)).toBe(true)
    expect(codeFaux(0, P)).toEqual({ bloque: false, essaisRestants: 2, blocageHeures: 0, nouveauCodeSurDemande: false })
    const e = codeFaux(2, P)
    expect([e.bloque, e.blocageHeures, e.nouveauCodeSurDemande]).toEqual([true, 24, true])
  })
  it('retenue après refus (DP-24)', () => {
    expect(retenueApresRefus(900, 300)).toEqual({ retenue: 300, rendu: 0, nonReclame: 0 })
    const r = retenueApresRefus(900, 1_200)
    expect([r.retenue, r.nonReclame]).toEqual([900, 300])
    expect(() => retenueApresRefus(-1, 0)).toThrow()
  })
  it('pièce vérifiée : porteur désigné, ou colis de valeur (CODE-PORTEUR)', () => {
    expect([pieceExigee(20_000, false, P), pieceExigee(20_000, true, P), pieceExigee(100_000, false, P)]).toEqual([false, true, true])
  })
  it('monnaie à rendre (ARL-04)', () => {
    expect(monnaieARendre(1_800, 2_000)).toEqual({ suffisant: true, monnaie: 200 })
    expect(monnaieARendre(1_800, 1_000).suffisant).toBe(false)
    expect(monnaieARendre(1_800, null)).toEqual({ suffisant: true, monnaie: 0 })
  })
  it('versement du vendredi : part BelivaY des espèces déduite, dette reportée puis reversée (ARL-05)', () => {
    expect(soldeDuVendredi(11_600, 3_000, 0, 0, P)).toEqual({ verse: 8_600, report: 0, semainesNegatives: 0, aReverser: false })
    expect(soldeDuVendredi(2_000, 5_000, 0, 0, P)).toEqual({ verse: 0, report: 3_000, semainesNegatives: 1, aReverser: false })
    expect(soldeDuVendredi(2_000, 5_000, 3_000, 1, P).aReverser).toBe(true) // 2e semaine de suite
    expect(soldeDuVendredi(0, 21_000, 0, 0, P).aReverser).toBe(true) // au-delà de PR-DETTE-MAX
  })
})
