// File du comptoir (VAGUE-AMELIORATIONS.md n° 7, calculs/file.ts) : clients attendus, les plus pressés d'abord ;
// colis prêts dans l'ordre des étagères.
import { describe, expect, it } from 'vitest'
import type { ColisRelais } from '../donnees/domaines/colis'
import { clientsAttendus, ordreEtagere, tourneeEtageres } from './file'

const colis = (id: string, o: { groupe?: string; emplacement?: string | null; etat?: ColisRelais['etat']; rang?: number; du?: number; envoye?: boolean; comptoir?: number }) =>
  ({
    id,
    groupe: o.groupe ?? id.replace(/-\d+$/, ''),
    emplacement: o.emplacement ?? null,
    etat: o.etat ?? 'en_stock',
    classe: 'S',
    garde: { rang: o.rang ?? 1, du: o.du ?? 0 },
    code: { envoye: o.envoye ?? true },
    paiement: o.comptoir ? { mode: 'au_comptoir', montant: o.comptoir, etat: 'a_payer' } : { mode: 'paye', montant: 0, etat: 'paye' },
  }) as unknown as ColisRelais

describe('file du comptoir', () => {
  it('ordre des étagères : lettre puis numéro, sans emplacement à la fin', () => {
    expect(['B-01', null, 'A-10', 'A-02', 'C-01'].sort(ordreEtagere)).toEqual(['A-02', 'A-10', 'B-01', 'C-01', null])
  })
  it('clients attendus : dernier jour, puis jour de garde, puis à payer au comptoir ; un par commande', () => {
    const l = [
      colis('BLV-1-1', { emplacement: 'B-02', rang: 2 }),
      colis('BLV-1-2', { emplacement: 'A-01', rang: 2, du: 300 }),
      colis('BLV-2-1', { etat: 'dernier_jour', rang: 6, du: 600 }),
      colis('BLV-3-1', { rang: 1, envoye: false, comptoir: 12000 }),
      colis('BLV-4-1', { rang: 1 }),
      colis('BLV-5-1', { envoye: false }), // pas encore prévenu : pas attendu
      colis('BLV-6-1', { etat: 'attendu' }),
    ]
    const c = clientsAttendus(l)
    expect(c.map((x) => x.groupe)).toEqual(['BLV-2', 'BLV-1', 'BLV-3', 'BLV-4'])
    expect(c[1]).toMatchObject({ colis: ['BLV-1-1', 'BLV-1-2'], emplacements: ['A-01', 'B-02'], gardeDue: 300, rang: 2 })
    expect(c[2].aPayer).toBe(12000)
    expect(tourneeEtageres(l).map((x) => x.id)).toEqual(['BLV-1-2', 'BLV-1-1', 'BLV-2-1', 'BLV-3-1', 'BLV-4-1']) // sans emplacement : à la fin
  })
})
