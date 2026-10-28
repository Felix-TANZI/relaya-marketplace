// Mêmes exemples que moteurs/tests/test_livraison.py (paquets, Trust Score, contrôle, gains), rejoués sur le portage
// TypeScript ; l'achat des prestations est testé dans espace-entreprise.
import { describe, expect, it } from 'vitest'
import { ParametreIllisible } from '../erreurs'
import {
  LIVRAISON,
  REGISTRE,
  anciennete,
  controleAuRamassage,
  critere,
  echeances,
  enRetard,
  evolutionDuPalier,
  gains,
  heureLimite,
  lireEntreprise,
  poids,
  publication,
  trustEntreprise,
  trustScore,
  yaounde,
  HEURE,
  type Evenement,
} from '.'

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
