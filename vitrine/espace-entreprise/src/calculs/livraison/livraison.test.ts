// Mêmes exemples que moteurs/tests/test_livraison.py, rejoués sur le portage TypeScript.
import { describe, expect, it } from 'vitest'
import { ParametreIllisible } from '../erreurs'
import {
  LIVRAISON,
  PrestationInvalide,
  REGISTRE,
  acheterCourseDomicile,
  acheterMission,
  acheterPaquetRelais,
  anciennete,
  colisVisible,
  controleAuRamassage,
  critere,
  echeances,
  enRetard,
  evolutionDuPalier,
  gains,
  heureLimite,
  lignesAuDessusDuPlafond,
  lireEntreprise,
  minoration,
  plafondAchat,
  plafondDeLaPrestation,
  plafondDeValeur,
  poids,
  prixClient,
  publication,
  retenueEnTort,
  trustEntreprise,
  trustScore,
  vendrediDeVersement,
  versementDuVendredi,
  yaounde,
  HEURE,
  type Evenement,
  type GrilleEntreprise,
} from '.'

const YAFE: GrilleEntreprise = {
  tournee: [
    { de: 1, a: 4, tarif: 600 },
    { de: 5, a: 9, tarif: 450 },
    { de: 10, a: null, tarif: 350 },
  ],
  horsZone: 100,
  cartonC2: 300,
  domicile: 1000,
  domicileZones: [['Z1', 1200]],
}
const t = (j: number, h: number, m = 0) => yaounde(2026, 10, j, h, m) // 12 octobre 2026 : un lundi
const PE = LIVRAISON.entreprise

describe('registre de la livraison', () => {
  it('lit les paramètres en vigueur (DP-62, DP-65)', () => {
    expect([PE.margePourCent, PE.partRelais, PE.trajetRetour]).toEqual([10, { S: 200, M: 250, L: 400 }, 500])
    expect(PE.plafondsValeur).toEqual({ Nouveau: 75000, Confirmé: 250000, Or: null })
    expect([PE.joursService, PE.debutServiceH, PE.finServiceH, PE.delaiHeures, PE.margeFermetureMin, PE.heureReportH]).toEqual([[0, 1, 2, 3, 4, 5], 8, 18, 5, 15, 10])
    expect([PE.seuilPublication, PE.creneauPublication, PE.acceptationMin, PE.ramassageMin, PE.prioriteMin, PE.minorationPourCent]).toEqual([5, 2, 15, 90, 5, 20])
    expect([PE.jourVersement, PE.heureVersementH, PE.jourArrete, PE.heureArrete, PE.reportVendredis]).toEqual([4, 12, 3, { h: 23, min: 59 }, 4])
    expect(PE.trust.poids).toEqual({ Ponctualité: 30, Qualité: 25, Litiges: 20, Ancienneté: 15, Formation: 10 })
    expect([PE.trust.vetoPlafond, PE.trust.baisseMax, PE.trust.gelJours, PE.trust.seuils, PE.trust.ecartDescenteEntreprise]).toEqual([39, 8, 30, { Confirmé: 70, Or: 85 }, 5])
    expect(LIVRAISON.client.remiseRelais).toEqual({ S: 400, M: 450, L: 600 })
    expect(LIVRAISON.controle).toEqual({ premieres: 5, sousSeuil: 20, seuilScore: 70, ensuite: 100 })
  })
  it('s’arrête sur une valeur de forme inattendue', () => {
    expect(() => lireEntreprise({ ...REGISTRE, 'ENT-SERVICE': 'lundi au samdi, 8 h à 18 h' })).toThrow(ParametreIllisible)
    expect(() => lireEntreprise({ ...REGISTRE, 'LVR-GAINS': 'toujours un montant' })).toThrow(ParametreIllisible)
    expect(() => lireEntreprise({ ...REGISTRE, 'ENT-TRUST-POIDS': 'Ponctualité 30 · Qualité 25 · Litiges 20 · Ancienneté 15 · Formation 20' })).toThrow(/100/)
  })
})

describe('plafonds d’achat et écrêtage (A-01, RNF-01, RNF-02)', () => {
  it('calcule les plafonds sur la grille client', () => {
    for (const c of ['S', 'M', 'L'] as const) {
      expect(prixClient('relais', c)).toBe({ S: 900, M: 950, L: 1100 }[c])
      expect(plafondDeLaPrestation('relais', c)).toBe(630)
      expect(plafondDeLaPrestation('relais', c, { premierDeLaZone: false })).toBe(520)
    }
    expect(plafondDeLaPrestation('domicile', 'S')).toBe(1360)
    expect([3, 7, 12].map((d) => plafondDeLaPrestation('domicile', 'XL', { distanceKm: d }))).toEqual([2720, 3180, 4090])
    expect(['S', 'M', 'L'].map((c) => plafondDeLaPrestation('transfert', c as 'S'))).toEqual([360, 360, 360]) // R69 : 400 F quel que soit le colis
    expect(plafondDeLaPrestation('retour', 'S')).toBe(450)
    expect(plafondAchat(100, 200)).toBe(0)
    expect(() => prixClient('relais', 'XL')).toThrow(PrestationInvalide)
    expect(() => prixClient('domicile', 'XL')).toThrow(PrestationInvalide)
    expect(() => plafondAchat(-1, 0)).toThrow(PrestationInvalide)
  })
  it('écrête chaque colis au plafond de sa classe', () => {
    const p = acheterPaquetRelais(
      [
        { reference: 'a', classe: 'S' },
        { reference: 'b', classe: 'M', premierDeLaZone: false },
        { reference: 'c', classe: 'L', horsZone: true },
        { reference: 'd', classe: 'L', cartonC2: true },
      ],
      YAFE,
    )
    expect(p.lignes.map((l) => l.paye)).toEqual([600, 520, 630, 630])
    expect([p.total, p.ecrete, p.lignes[1].ecrete]).toEqual([2380, 420, 80])
    expect(acheterPaquetRelais(Array.from({ length: 5 }, (_, i) => ({ reference: `${i}`, classe: 'S' as const })), YAFE).total).toBe(2250)
    expect(() => acheterPaquetRelais([{ reference: 'x', classe: 'S', cartonC2: true }], YAFE)).toThrow(PrestationInvalide)
    expect(() => acheterPaquetRelais([], YAFE)).toThrow(PrestationInvalide)
    expect(() => acheterPaquetRelais([{ reference: 'x', classe: 'S' }], { tournee: [{ de: 1, a: 4, tarif: 600 }] })).toThrow(PrestationInvalide)
  })
  it('course domicile, transfert, retour et lignes à signaler', () => {
    expect(acheterCourseDomicile('S', ['Z3', 'Z6'], YAFE).paye).toBe(1000)
    const z1 = acheterCourseDomicile('S', ['Z1', 'Z6'], YAFE, { cartonC2: true })
    expect([z1.tarif, z1.plafond, z1.paye]).toEqual([1500, 1360, 1360])
    expect(acheterCourseDomicile('XL', ['Z3'], YAFE, { distanceKm: 5.2 }).plafond).toBe(3180)
    expect(acheterMission('transfert', 'L', 600).paye).toBe(360) // R69
    const alertes = lignesAuDessusDuPlafond(YAFE)
    expect(alertes).toContain('tournée 1 à 4 colis, colis S, hors zone : 700 F > 630 F')
    expect(alertes).toContain('tournée 10 colis et plus, colis L, carton C2 : 650 F > 630 F')
    expect(alertes.some((x) => x.includes('colis S, carton C2'))).toBe(false)
    expect(lignesAuDessusDuPlafond({ tournee: [{ de: 1, a: null, tarif: 500 }] })).toEqual([])
  })
})

describe('valeur transportée, retenues, versement', () => {
  it('plafond de valeur et visibilité (ENT-PAL-01 à 04)', () => {
    expect([plafondDeValeur('Nouveau', true), plafondDeValeur('Or', true), plafondDeValeur('Or', false)]).toEqual([75000, null, 250000])
    expect([colisVisible(350000, 'Confirmé', true), colisVisible(350000, 'Or', true)]).toEqual([false, true])
  })
  it('retenue en tort (A-06)', () => {
    expect(retenueEnTort('LIT-1', 110000, 900, 'Nouveau', true)).toEqual({ dossier: 'LIT-1', article: 75000, livraison: 900, trajetRetour: 500, nonRetenu: 35000, total: 76400 })
    expect(retenueEnTort('LIT-2', 400000, 1500, 'Or', true, { trajetRetour: false }).total).toBe(401500)
  })
  it('vendredi de versement', () => {
    expect(vendrediDeVersement(t(15, 23, 59))).toBe('2026-10-16')
    expect(vendrediDeVersement(t(16, 0))).toBe('2026-10-23')
    expect(vendrediDeVersement(t(12, 10))).toBe('2026-10-16')
    expect(vendrediDeVersement(t(15, 18, 1), { ...PE, heureArrete: { h: 18, min: 0 } })).toBe('2026-10-23')
  })
  it('relevé, minoration et solde négatif (A-05, A-08)', () => {
    const missions = [
      { reference: 'M1', prix: 630, validee: true },
      { reference: 'M2', prix: 630, validee: true, retard: true },
      { reference: 'M3', prix: 630, validee: true, retard: true, incidentTiers: true },
      { reference: 'M4', prix: 630, validee: true, enRevue: true },
      { reference: 'M5', prix: 630, validee: false },
      { reference: 'M6', prix: 630, validee: true, litigeOuvert: true },
    ]
    const v = versementDuVendredi(missions, [])
    expect([v.payees.map((l) => l.paye), v.reportees, v.aVerser]).toEqual([[630, 504, 630], ['M4', 'M5', 'M6'], 1764])
    const ret = retenueEnTort('LIT-1', 110000, 900, 'Nouveau', true)
    const d = versementDuVendredi(missions, [ret], { reportPrecedent: 100, vendredisDeReport: 3 })
    expect([d.aVerser, d.soldeReporte, d.vendredisDeReport, d.planDApurement]).toEqual([0, 74736, 4, false])
    expect(versementDuVendredi([], [ret], { vendredisDeReport: 4 }).planDApurement).toBe(true)
    expect(minoration(630)).toBe(126)
  })
})

describe('heure limite, publication, échéances (O-01, RNF-03)', () => {
  it('heure limite', () => {
    expect(heureLimite([t(12, 9, 10), t(12, 10)])).toBe(t(12, 14, 10))
    expect(heureLimite([t(12, 15)], { fermetureRelais: [18, 0] })).toBe(t(12, 17, 45))
    expect(heureLimite([t(12, 16)])).toBe(t(13, 10))
    expect(heureLimite([t(12, 17, 50)], { fermetureRelais: [18, 0] })).toBe(t(13, 10))
    expect(heureLimite([t(12, 6)])).toBe(t(12, 13))
    expect(heureLimite([t(17, 19)])).toBe(t(19, 13))
    expect(heureLimite([t(18, 11)])).toBe(t(19, 13))
    expect(() => heureLimite([])).toThrow(RangeError)
    expect([enRetard(t(12, 14, 10), t(12, 14, 10)), enRetard(t(12, 14, 9), t(12, 14, 10))]).toEqual([true, false])
  })
  it('publication des paquets', () => {
    const limite = t(12, 14, 10)
    expect(publication(3, 1, t(12, 9), limite, 2 * HEURE)).toEqual({ publier: false, motif: null, auPlusTard: t(12, 12, 10) })
    expect(publication(5, 1, t(12, 9), limite, 2 * HEURE).motif).toBe('seuil')
    expect(publication(1, 2, t(12, 9), limite, 2 * HEURE).motif).toBe('deuxième créneau')
    expect(publication(1, 1, t(12, 12, 10), limite, 2 * HEURE).motif).toBe('heure limite')
    expect(publication(1, 1, t(12, 9), null, null, { domicile: true }).motif).toBe('domicile')
    expect(() => publication(1, 1, t(12, 9), null, 2 * HEURE)).toThrow(RangeError)
  })
  it('échéances', () => {
    expect(echeances(t(12, 9))).toEqual({ prioriteJusquA: t(12, 9, 5), accepterAvant: t(12, 9, 15), ramasserAvant: null })
    expect(echeances(t(12, 9), t(12, 9, 7)).ramasserAvant).toBe(t(12, 10, 37))
  })
})

describe('Trust Score et paliers', () => {
  const ev = (critere: Evenement['critere'], gravite: Evenement['gravite'], ageJours = 0): Evenement => ({ critere, gravite, ageJours })
  it('poids et critères', () => {
    expect([poids(0), poids(90), poids(180)]).toEqual([1, 0.5, 0.25])
    expect(critere([ev('Ponctualité', 'succès'), ev('Ponctualité', 'succès'), ev('Ponctualité', 'succès'), ev('Ponctualité', 'g1')], 'Ponctualité')).toBe(75)
    expect(critere([], 'Qualité')).toBe(50)
    expect(critere([ev('Litiges', 'g3'), ev('Litiges', 'succès')], 'Litiges')).toBe(20)
    expect([anciennete(6, 40), anciennete(24, 300)]).toEqual([45, 100])
  })
  it('score du livreur', () => {
    const neuf = trustScore([], 0, 0, true)
    expect([neuf.score, neuf.affiche]).toEqual([50, 50])
    const bons = (['Ponctualité', 'Qualité', 'Litiges'] as const).flatMap((c) => Array.from({ length: 10 }, () => ev(c, 'succès')))
    const s = trustScore(bons, 12, 100, true)
    expect([s.calcule.toFixed(4), s.affiche]).toEqual(['95.4545', 95])
    expect(trustScore([...bons, ev('Qualité', 'veto')], 12, 100, true, { precedent: 90 }).score).toBe(39)
    expect(trustScore(Array.from({ length: 5 }, () => ev('Ponctualité', 'g3')), 1, 40, false, { precedent: 80 }).score).toBe(72)
    const g = trustScore([], 1, 40, false, { precedent: 63.4, joursSansMission: 30 })
    expect([g.score, g.gele, g.revue, g.affiche]).toEqual([63.4, true, false, 63])
  })
  it('score de l’entreprise et paliers', () => {
    expect(trustEntreprise([[80, 30], [60, 10]], 2)).toBe(73)
    expect(trustEntreprise([], 0)).toBe(50)
    const tenu = Array(14).fill(86)
    expect(evolutionDuPalier('Nouveau', tenu, { entreprise: true }).palier).toBe('Or')
    expect(evolutionDuPalier('Nouveau', tenu, { entreprise: true, conditionsOr: false }).palier).toBe('Confirmé')
    const bas = Array(14).fill(66)
    expect(evolutionDuPalier('Confirmé', bas, { entreprise: true }).descenteProposee).toBeNull()
    expect(evolutionDuPalier('Confirmé', bas, { entreprise: false })).toEqual({ palier: 'Confirmé', descenteProposee: 'Nouveau' })
    expect(evolutionDuPalier('Or', Array(14).fill(79), { entreprise: true }).descenteProposee).toBe('Confirmé')
  })
})

describe('livreur : contrôle au ramassage et gains', () => {
  it('contrôle (O-05)', () => {
    expect(controleAuRamassage(7, 62.7, 1 / 40)).toEqual({ c1: true, photos: 2, auditC4: true, chaqueColis: false, frequence: 1 / 20 })
    expect(controleAuRamassage(7, 62.7, 1 / 10).auditC4).toBe(false)
    expect(controleAuRamassage(2, 90, 0.99).auditC4).toBe(true)
    expect(controleAuRamassage(50, 90, 0.5, { renforce: true })).toMatchObject({ auditC4: false, chaqueColis: true })
    expect(() => controleAuRamassage(1, 90, 1)).toThrow(RangeError)
  })
  it('gains (I-04)', () => {
    const missions = ['ramassage', 'dépôt', 'remise à domicile', 'retour']
    expect(gains(missions, null)).toEqual({ missions: 4, montant: null })
    expect(gains(missions, { ramassage: 150, dépôt: 150, 'remise à domicile': 400 }).montant).toBe(700)
  })
})
