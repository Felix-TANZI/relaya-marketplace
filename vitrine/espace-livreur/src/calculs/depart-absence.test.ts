// Départ, absences et nouvelle photo (DP-67) : mêmes cas que moteurs/tests/test_depart.py et test_absence.py.
import { describe, expect, it } from 'vitest'
import { IMPREVUS, MOTIFS_ABSENCE, TEXTE_MAX, dureeJours, heureDeSaisie, joursRestants, juger, photoBloque, photoEcheance, textePropre } from './absence'
import { affectationJusqua, affectationPermise, constatEchu, constatJusqua, dernierJour, dernierVersement, finPreavis, preavisEchu, retenuePlafonnee, vendrediSuivant } from './depart'
import { PARAMETRES } from './registre'
import { HEURE, JOUR, yaounde } from './temps'

const h = (j: number, heure: number, minute = 0) => yaounde(2026, 10, j, heure, minute)
const KIT = PARAMETRES.livreur.kitValeur.total

describe('départ : préavis, affectation jusqu’à la veille, constat du kit', () => {
  // Demande lundi 12 à 9 h, préavis 7 j : fin lundi 19 à 9 h ; dernier jour : lundi 19.
  const LE = h(12, 9)
  it('préavis de DEPART-PREAVIS-J jours', () => {
    expect(finPreavis(LE, 7)).toBe(LE + 7 * JOUR)
    expect(preavisEchu(LE, LE + 7 * JOUR - HEURE, 7)).toBe(false)
    expect(preavisEchu(LE, LE + 7 * JOUR, 7)).toBe(true)
    expect(() => finPreavis(LE, -1)).toThrow(RangeError)
  })
  it('paquets jusqu’à la veille du dernier jour ; plus rien dès minuit ce jour-là', () => {
    expect(dernierJour(LE, 7)).toBe('2026-10-19')
    expect(affectationJusqua(LE, 7)).toBe(yaounde(2026, 10, 19))
    expect(affectationPermise(LE, LE + JOUR, 7)).toBe(true)
    expect(affectationPermise(LE, h(18, 23, 59), 7)).toBe(true)
    expect(affectationPermise(LE, h(19, 0), 7)).toBe(false)
    expect(affectationPermise(LE, LE + 9 * JOUR, 7)).toBe(false)
  })
  it('constat du kit au plus tard DEPART-KIT-CONSTAT-H après la fin du préavis', () => {
    expect(constatJusqua(LE, 7, 72)).toBe(LE + 10 * JOUR)
    expect(constatEchu(LE, LE + 10 * JOUR - HEURE, 7, 72)).toBe(false)
    expect(constatEchu(LE, LE + 10 * JOUR, 7, 72)).toBe(true)
  })
  it('versement le vendredi qui suit la clôture', () => {
    expect(vendrediSuivant(h(12, 15))).toBe(yaounde(2026, 10, 16))
    expect(vendrediSuivant(h(15, 15))).toBe(yaounde(2026, 10, 16))
    expect(vendrediSuivant(h(16, 15))).toBe(yaounde(2026, 10, 23))
    expect(vendrediSuivant(h(17, 15))).toBe(yaounde(2026, 10, 23))
  })
})

describe('kit et dernier versement', () => {
  it('KIT-VALEUR-F lu au registre : total et éléments', () => {
    const k = PARAMETRES.livreur.kitValeur
    expect(k.total).toBe(21000)
    expect(k.elements.map((e) => e.valeur)).toEqual([12000, 4500, 3000, 1500])
    expect(k.elements[0].nom).toBe('sac de transport étanche')
  })
  it('retenue plafonnée à la valeur du kit', () => {
    expect(retenuePlafonnee(30000, KIT)).toBe(KIT)
    expect(retenuePlafonnee(800, KIT)).toBe(800)
    expect(() => retenuePlafonnee(-1, KIT)).toThrow(RangeError)
  })
  it('toutes les missions validées ; litiges retenus au plus le montant contesté', () => {
    expect(dernierVersement(18500)).toEqual({ du: 18500, retenuLitiges: 0, retenueKit: 0, kitDeCote: 0, verse: 18500 })
    const v = dernierVersement(18500, [{ gains: 3000, conteste: 1200 }, { gains: 500, conteste: 9000 }])
    expect([v.retenuLitiges, v.verse]).toEqual([1700, 16800])
    expect(() => dernierVersement(1000, [{ gains: 3000, conteste: 3000 }])).toThrow(RangeError)
  })
  it('kit : jamais au-delà de ce qui reste dû ; contesté, mis de côté', () => {
    const v = dernierVersement(18500, [{ gains: 3000, conteste: 1200 }], 12000, KIT)
    expect([v.retenueKit, v.kitDeCote, v.verse]).toEqual([12000, 0, 5300])
    expect(dernierVersement(5000, [], 12000, KIT)).toMatchObject({ retenueKit: 5000, verse: 0 })
    expect(dernierVersement(18500, [], 12000, KIT, true)).toMatchObject({ retenueKit: 0, kitDeCote: 12000, verse: 6500 })
    expect(dernierVersement(50000, [], 30000, KIT).retenueKit).toBe(KIT)
  })
  it('compteur seul (aucun tarif affiché) : pas de montant dû', () => {
    expect(dernierVersement(null, [{ gains: 0, conteste: 0 }], 30000, KIT)).toMatchObject({ du: null, verse: null, retenueKit: KIT, kitDeCote: 0 })
    expect(dernierVersement(null, [], 4500, KIT, true)).toMatchObject({ retenueKit: 0, kitDeCote: 4500 })
    expect(() => dernierVersement(-1)).toThrow(RangeError)
  })
})

describe('absences : prévue, imprévu, quatorze jours, heure de saisie', () => {
  const MARDI = '2026-10-13'
  const CRENEAU = h(13, 8) // premier créneau du mardi 13 à 8 h
  const jug = (o: { motif?: string; du?: string; au?: string; saisie?: number; creneau?: number } = {}) => juger(o.motif ?? 'demarches', o.du ?? MARDI, o.au ?? MARDI, o.saisie ?? h(12, 8), o.creneau ?? CRENEAU, 24, 14)
  it('listes du moteur', () => {
    expect(MOTIFS_ABSENCE).toEqual(['maladie', 'deuil_famille', 'panne_moto', 'demarches', 'autre'])
    expect(IMPREVUS).not.toContain('demarches')
    expect(TEXTE_MAX).toBe(120)
  })
  it('absence prévue : PLANNING-PREVENIR-H avant le premier créneau, sinon refusée', () => {
    expect(jug()).toEqual({ ok: true, imprevu: false, apresDebut: false })
    expect(jug({ saisie: h(12, 8, 1) })).toEqual({ ok: false, raison: 'delai' })
  })
  it('imprévu le jour même : sans pénalité avant le premier créneau, marqué après', () => {
    expect(jug({ motif: 'maladie', saisie: h(13, 7) })).toEqual(jug({ motif: 'panne_moto', saisie: h(12, 20) }))
    expect(jug({ motif: 'deuil_famille', saisie: h(13, 7, 59) })).toEqual({ ok: true, imprevu: true, apresDebut: false })
    expect(jug({ motif: 'maladie', saisie: h(13, 9) })).toEqual({ ok: true, imprevu: true, apresDebut: true })
  })
  it('refus : motif, dates inversées, plus de quatorze jours, date passée', () => {
    expect(jug({ motif: 'vacances' })).toEqual({ ok: false, raison: 'motif' })
    expect(jug({ au: '2026-10-12' })).toEqual({ ok: false, raison: 'dates_inversees' })
    expect(jug({ au: '2026-10-27' })).toEqual({ ok: false, raison: 'trop_longue' })
    expect(jug({ saisie: h(14, 7) })).toEqual({ ok: false, raison: 'date_passee' })
    expect(dureeJours(MARDI, '2026-10-26')).toBe(14)
    expect(jug({ au: '2026-10-26', saisie: h(10, 8) })).toEqual({ ok: true, imprevu: false, apresDebut: false })
    expect(() => juger('maladie', MARDI, MARDI, h(12, 8), CRENEAU, -1, 14)).toThrow(RangeError)
    expect(() => juger('maladie', MARDI, MARDI, h(12, 8), CRENEAU, 24, 0)).toThrow(RangeError)
  })
  it('texte facultatif : espaces réduits, 120 caractères au plus', () => {
    expect(textePropre('  Fièvre   depuis hier ')).toBe('Fièvre depuis hier')
    expect(textePropre('x'.repeat(300))).toHaveLength(120)
    expect(textePropre(null)).toBe('')
  })
  it('hors connexion : heure de saisie crue, jamais dans le futur ni avant la dernière synchronisation', () => {
    const recu = h(13, 10)
    const synchro = h(12, 18)
    expect(heureDeSaisie(h(12, 21), recu, synchro)).toBe(h(12, 21))
    expect(heureDeSaisie(h(13, 11), recu, synchro)).toBe(recu)
    expect(heureDeSaisie(h(10, 9), recu, synchro)).toBe(synchro)
    expect(heureDeSaisie(h(10, 9), recu, null)).toBe(h(10, 9))
    expect(heureDeSaisie(h(10, 9), h(12, 0), h(12, 18))).toBe(h(12, 0))
  })
})

describe('nouvelle photo : PHOTO-REVERIF-J jours, puis plus de nouvelle mission jusqu’à la validation', () => {
  const le = h(12, 10)
  it('échéance et blocage', () => {
    expect(photoEcheance(le, 7)).toBe(le + 7 * JOUR)
    expect(photoBloque(le, le + 6 * JOUR, 7, false)).toBe(false)
    expect(photoBloque(le, le + 7 * JOUR, 7, false)).toBe(true)
    expect(photoBloque(le, le + 9 * JOUR, 7, true)).toBe(false)
    expect(() => photoEcheance(le, -1)).toThrow(RangeError)
    expect(joursRestants(le + 7 * JOUR, h(13, 14, 5))).toBe(6)
    expect(joursRestants(le, h(13, 14))).toBe(0)
  })
  it('paramètres DP-67 lus au registre', () => {
    const p = PARAMETRES.livreur
    expect([p.planningPrevenirHeures, p.absenceMaxJours, p.photoReverifJours, p.departKitConstatHeures]).toEqual([24, 14, 7, 72])
  })
})
