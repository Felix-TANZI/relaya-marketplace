// D17 (v1.4, DP-68) : la commission par catégorie et palier du vendeur rejoue les tests d'acceptation livrés avec les
// données (06_BelivaY_Donnees_a_saisir.json), comme moteurs/tests/test_v14.py.
import { describe, expect, it } from 'vitest'
import { PARAMETRES_COMMISSION14 as P, commissionExpedition, taux14 } from './commission14'
import { OffreRefusee, VenteInvalide } from './erreurs'
import type { Palier } from './registre'
import REF from '../../../logique-metier/reference/elements-dev-v1.4/BelivaY_elements_dev_16oct_v1.4/06_BelivaY_Donnees_a_saisir.json'

interface T { base: number; categorie: string; palier: Palier; prix: number; taux: number; commission: number; reste: number; frais_versement: number; net: number }
const C = (REF as unknown as { commission: { tests: T[]; categories: { code: string; taux_par_palier_pct: Record<Palier, number> }[] } }).commission

describe('D17 · commission par catégorie et palier', () => {
  for (const t of C.tests)
    it(`${t.categorie} ${t.palier} ${t.base} F`, () => {
      const r = commissionExpedition(P, t.palier, [{ categorie: t.categorie, prix: t.prix }])
      expect([r.base, r.taux[0], r.commission, r.reste, r.fraisVersement, r.net]).toEqual([t.base, t.taux, t.commission, t.reste, t.frais_versement, t.net])
    })
  it('grille complète, catégorie inconnue, minimum par expédition, refus', () => {
    for (const c of C.categories) for (const [palier, t] of Object.entries(c.taux_par_palier_pct)) expect(taux14(P, c.code, palier as Palier)).toBe(t)
    expect(taux14(P, 'INCONNUE', 'Bronze')).toBe(10)
    expect(() => taux14(P, 'TEL', 'Diamant' as Palier)).toThrow(VenteInvalide)
    expect(() => commissionExpedition(P, 'Bronze', [])).toThrow(VenteInvalide)
    const r = commissionExpedition(P, 'Bronze', [{ categorie: 'SUP', prix: 1000, quantite: 2 }, { categorie: 'MOD', prix: 1500 }])
    expect([r.base, r.commission, r.net]).toEqual([3500, 400, 3069])
    expect(commissionExpedition(P, 'Bronze', [{ categorie: 'SUP', prix: 400 }]).net).toBe(0)
    expect(() => commissionExpedition(P, 'Bronze', [{ categorie: 'SUP', prix: 300 }])).toThrow(OffreRefusee)
    // La commande témoin de la connectivité : défroisseur PEM, Bronze, 65 000 F.
    expect(commissionExpedition(P, 'Bronze', [{ categorie: 'PEM', prix: 65000 }])).toMatchObject({ commission: 5200, fraisVersement: 598, net: 59202 })
  })
})
