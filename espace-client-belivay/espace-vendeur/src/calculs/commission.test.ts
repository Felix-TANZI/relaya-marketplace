// Mêmes exemples que moteurs/tests/test_commission.py (VD-02 p6, VD-10 p28, R-C1 à R-C4 ; DP-55, DP-56).
import { describe, expect, it } from 'vitest'
import { Dec } from './argent'
import {
  apresRemboursement, calculerCommission, commissionArticle, compteurDecouverte, decouverteActive, familleDe, finDecouverte,
  prixMinimumPubliable, remiseDePlan, seuilCommissionMinimale, simulerPlans, verifierPublication, type Famille, type Palier,
} from './commission'
import { OffreRefusee, VenteInvalide } from './erreurs'
import { chargerRegistre, lireCommission, REGISTRE } from './registre'

const P = lireCommission(REGISTRE)
const avec = (modifs: Record<string, string>) => lireCommission({ ...REGISTRE, ...modifs })
const vente = (famille: Famille, prix: number, palier: Palier = 'Bronze', decouverte = false, quantite = 1, mic = false, p = P) =>
  calculerCommission([{ famille, prixUnitaire: prix, quantite, madeInCameroon: mic }], palier, decouverte, p)
const D = (s: string | number) => Dec.de(s)

describe('paramètres', () => {
  it('lus dans le registre', () => {
    expect(P.bareme.A.map((t) => [t.borne, t.tauxPourCent.texte()])).toEqual([[20000, '13.5'], [100000, '5'], [500000, '2.5'], [null, '2']])
    expect(P.bareme.B.at(-1)!.tauxPourCent.eq(D('13.5'))).toBe(true)
    expect(P.bareme.D.at(-1)!.tauxPourCent.eq(D('8.5'))).toBe(true)
    expect(P.bareme.E.at(-1)!.tauxPourCent.eq(9)).toBe(true)
    expect(Object.fromEntries(Object.entries(P.multiplicateurs).map(([k, v]) => [k, v.texte()]))).toEqual({ Bronze: '1', Argent: '0.85', Or: '0.70', Platine: '0.60' })
    expect([P.decouverteMult.texte(), P.decouverteMois, P.decouverteCommandes]).toEqual(['0.80', 3, 50])
    expect([P.plancherCommande, P.plancherTauxPourCent.texte(), P.tvaPourCent.texte(), P.prixMin]).toEqual([700, '2', '0', 500])
    expect([P.pointsPetitPrix.texte(), P.seuilPetitPrix, P.pointsMadeInCameroon.texte()]).toEqual(['3', 5000, '2'])
    expect([P.plans.Boost.prixMensuel, P.plans.Pro.prixMensuel]).toEqual([2500, 7500])
  })
  it('famille de la catégorie', () => {
    expect(familleDe('Électronique', P)).toBe('A')
    expect(familleDe('Beauté & Cosmétique', P)).toBe('B')
    expect(familleDe('Frais & Premium', P)).toBe('C')
    expect(familleDe('Animaux', P)).toBe('D')
    expect(familleDe('Livres & Médias', P)).toBe('E')
    expect(() => familleDe('Armes', P)).toThrow(/catégorie inconnue/)
  })
})

describe('jeu d’essai VD-02 p6', () => {
  it.each([
    ['A', 20000, 'Bronze', true, 2160, 17840], // ITEL AC52 : 2 700 × 0,80
    ['A', 21000, 'Bronze', true, 2200, 18800],
    ['A', 18900, 'Bronze', true, 2041, 16859], // 2 041,2 → 2 041 (R-C4)
    ['A', 20000, 'Argent', true, 1836, 18164], // 2 700 × 0,85 × 0,80 (+324 F, R-C2)
    ['A', 20000, 'Or', true, 1512, 18488],
    ['A', 20000, 'Platine', true, 1296, 18704],
    ['A', 150000, 'Bronze', false, 7950, 142050],
    ['A', 5000, 'Bronze', false, 700, 4300], // 675 F → plancher
    ['A', 20000, 'Or', false, 1890, 18110],
    ['A', 20000, 'Bronze', false, 2700, 17300],
  ] as [Famille, number, Palier, boolean, number, number][])('%s %i F %s découverte=%s', (f, prix, palier, dec, commission, garde) => {
    const r = vente(f, prix, palier, dec)
    expect([r.commission, r.garde, r.tva]).toEqual([commission, garde, 0])
    expect(r.commission + r.garde).toBe(prix)
  })
  it('trace de l’ITEL', () => {
    const r = vente('A', 20000, 'Bronze', true)
    expect(r.trace[0].startsWith('20 000 F × 1, famille A : barème 2700 F')).toBe(true)
    expect(r.trace[1]).toContain('× 0.80 (découverte) = 2160 F')
    expect(r.trace.at(-1)).toBe('Commission = 2 160 F, arrondie une fois (DP-55) ; TVA 0 % = 0 F ; gardé = 17 840 F')
  })
  it('barème seul des trois références M05/M06 (en attente, Q-02)', () => {
    const r = vente('A', 350000, 'Bronze', true)
    expect([r.commission, r.garde]).toEqual([10360, 339640])
    expect(vente('B', 84000).garde).toBe(67460)
    expect(vente('C', 30000).garde).toBe(28050)
  })
})

describe('règles de DP-55', () => {
  it('points ajoutés au taux de chaque tranche, puis palier, puis arrondi unique', () => {
    const r = vente('A', 4900, 'Argent')
    expect([r.bareme.texte(), r.reduite.texte(), r.commission, r.garde, r.plancherApplique]).toEqual(['808.5', '687.225', 700, 4200, true])
    expect(r.trace[0]).toContain('+3 points')
  })
  it('Made in Cameroon retire deux points, jamais sous zéro', () => {
    expect(commissionArticle({ famille: 'A', prixUnitaire: 50000, madeInCameroon: true }, P).eq(3200)).toBe(true)
    expect(commissionArticle({ famille: 'A', prixUnitaire: 600000, madeInCameroon: true }, P).eq(commissionArticle({ famille: 'A', prixUnitaire: 500000, madeInCameroon: true }, P))).toBe(true)
    const moinsCinq = avec({ 'VD-COM-POINTS': '+3 points si le prix unitaire est sous 5 000 F · −5 points si Made in Cameroon' })
    expect(commissionArticle({ famille: 'A', prixUnitaire: 100000, madeInCameroon: true }, moinsCinq).eq(1700)).toBe(true)
    expect(commissionArticle({ famille: 'B', prixUnitaire: 4000, madeInCameroon: true }, P).eq(980)).toBe(true)
  })
  it('tranches sans taux : le dernier taux continue (Q-06)', () => {
    expect(vente('B', 600000).commission).toBe(87000)
    expect(commissionArticle({ famille: 'D', prixUnitaire: 600000 }, P).eq(3000 + 9200 + 34000 + 8500)).toBe(true)
    expect(commissionArticle({ famille: 'E', prixUnitaire: 60000 }, P).eq(1250 + 3600 + 900)).toBe(true)
  })
  it('plancher de 2 % même Platine (Q-07)', () => {
    const r = vente('A', 1000000, 'Platine')
    expect([r.reduite.eq(16020), r.plancher.eq(20000), r.commission, r.garde, r.margeSurPlancher]).toEqual([true, true, 20000, 980000, 0])
  })
  it('planchers par sous-commande', () => {
    const r = vente('B', 500, 'Bronze', false, 3)
    expect([r.prixArticles, r.commission, r.garde]).toEqual([1500, 700, 800])
    const deux = calculerCommission([{ famille: 'A', prixUnitaire: 20000 }, { famille: 'B', prixUnitaire: 3000, quantite: 2 }], 'Bronze', true, P)
    expect([deux.prixArticles, deux.commission]).toEqual([26000, 3432])
  })
  it('plancher de 2 % non entier, arrondi une fois', () => {
    const r = vente('A', 1000025, 'Platine', true)
    expect([r.plancher.texte(), r.commission, r.margeSurPlancher]).toEqual(['20000.5', 20001, 0])
  })
  it('BelivaY ne perd jamais : vente refusée (Q-08)', () => {
    expect(() => vente('B', 500)).toThrow(OffreRefusee)
    expect(() => vente('B', 500)).toThrow(/−200/)
    expect(vente('B', 700).garde).toBe(0)
  })
  it('TVA en plus de la commission (Q-09)', () => {
    const p = avec({ 'VD-TVA': '19,25 % de la commission ; nouveau taux annoncé 30 jours avant' })
    const r = vente('A', 20000, 'Bronze', true, 1, false, p)
    expect([r.commission, r.tva, r.garde]).toEqual([2160, 416, 17424])
  })
  it('lignes invalides', () => {
    expect(() => calculerCommission([], 'Bronze', false, P)).toThrow(/sans article/)
    expect(() => vente('Z' as Famille, 1000)).toThrow(/famille inconnue/)
    expect(() => vente('A', 0)).toThrow(/prix invalide/)
    expect(() => vente('A', 1000, 'Bronze', false, 0)).toThrow(VenteInvalide)
  })
  it('après remboursement (VD-COM-MIN-REMB)', () => {
    const r = vente('A', 20000, 'Bronze', true)
    expect(apresRemboursement(r, 20000, P).commission).toBe(0)
    expect(apresRemboursement(r, 15000, P)).toEqual({ commission: 540, tva: 0, garde: 4460 })
    expect(apresRemboursement(r, 0, P).commission).toBe(2160)
    expect(() => apresRemboursement(r, 20001, P)).toThrow(VenteInvalide)
  })
})

describe('publication et seuil affiché', () => {
  it('prix minimum publiable', () => {
    for (const f of ['A', 'B', 'C', 'D', 'E'] as Famille[]) expect(prixMinimumPubliable(f, false, P)).toBe(700)
    const p = avec({ 'VD-TVA': '19,25 % de la commission ; nouveau taux annoncé 30 jours avant' })
    expect(prixMinimumPubliable('A', false, p)).toBe(835)
    verifierPublication(700, 'B', false, P)
    expect(() => verifierPublication(699, 'B', false, P)).toThrow(/publiable dès 700/)
  })
  it('seuil de la commission minimale calculé (Q-55)', () => {
    expect(seuilCommissionMinimale('A', 'Bronze', false, false, P)).toBe(5182)
    expect(vente('A', 5181).plancherApplique && !vente('A', 5182).plancherApplique).toBe(true)
    expect(seuilCommissionMinimale('B', 'Bronze', false, false, P)).toBe(2640)
    expect(vente('B', 2639).plancherApplique && !vente('B', 2640).plancherApplique).toBe(true)
    const s = seuilCommissionMinimale('C', 'Platine', true, false, P)
    expect(s).toBe(21789)
    expect(vente('C', s, 'Platine', true).plancherApplique).toBe(false)
    expect(vente('C', s - 1, 'Platine', true).plancherApplique).toBe(true)
  })
})

describe('offre de découverte', () => {
  it('fin et activité', () => {
    expect(finDecouverte('2026-08-27', P)).toBe('2026-11-27')
    expect(finDecouverte('2026-11-30', P)).toBe('2027-02-28')
    expect(decouverteActive('2026-08-27', '2026-09-21', 9, P)).toBe(true)
    expect(decouverteActive('2026-08-27', '2026-11-27', 49, P)).toBe(true)
    expect(decouverteActive('2026-08-27', '2026-11-28', 9, P)).toBe(false)
    expect(decouverteActive('2026-08-27', '2026-09-21', 50, P)).toBe(false)
    expect(decouverteActive(null, '2026-09-21', 0, P)).toBe(true)
  })
  it('compteur (Q-62)', () => {
    expect(compteurDecouverte(10, 1)).toBe(9)
    expect(() => compteurDecouverte(3, 4)).toThrow(VenteInvalide)
  })
})

describe('plans', () => {
  const itels = (n: number) => Array.from({ length: n }, () => vente('A', 20000, 'Bronze', true))
  it('remise de plan (Q-04)', () => {
    expect(remiseDePlan('Boost', itels(3), P).remise).toBe(324)
    expect(remiseDePlan('Pro', itels(3), P).remise).toBe(648)
    const free = remiseDePlan('Free', itels(3), P)
    expect([free.remise, free.prixDuPlan, free.commissionDuMois]).toEqual([0, 0, 6480])
    expect(remiseDePlan('Boost', itels(3), P).trace[0]).toContain('⇒ remise 324')
  })
  it('remise plafonnée au prix du plan', () => {
    expect(remiseDePlan('Boost', itels(25), P).remise).toBe(2500)
    expect(remiseDePlan('Pro', itels(25), P).remise).toBe(5400)
  })
  it('remise jamais sous les planchers', () => {
    expect(remiseDePlan('Pro', Array.from({ length: 10 }, () => vente('A', 5000)), P).remise).toBe(0)
    const melange = [vente('A', 5000), vente('A', 5400)]
    expect(melange[1].margeSurPlancher).toBe(29)
    expect(remiseDePlan('Pro', melange, P).remise).toBe(29)
  })
  it.each([
    [3, 53520, 51344, 46668], // 60 000 F (R-C1) : le simulateur du prototype
    [25, 446000, 446000, 443900],
    [35, 624400, 624400, 624400],
  ])('simulateur, %i ITEL', (n, free, boost, pro) => {
    const s = simulerPlans(itels(n), P)
    expect([s.gardes.Free, s.gardes.Boost, s.gardes.Pro, s.meilleur]).toEqual([free, boost, pro, 'Free'])
  })
  it('un plan ne rapporte jamais plus que son prix', () => {
    const s = simulerPlans([...Array.from({ length: 5 }, () => vente('A', 1000000)), ...itels(60)], P)
    expect(s.gardes.Free === s.gardes.Boost && s.gardes.Boost === s.gardes.Pro).toBe(true)
  })
})

it('le registre se recharge depuis un autre fichier', () => {
  expect(chargerRegistre({ parametres: [{ code: 'X', valeur: 'y' }] })).toEqual({ X: 'y' })
})
