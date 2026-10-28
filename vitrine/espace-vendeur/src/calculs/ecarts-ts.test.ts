// Écarts TS ↔ Python relevés par la concordance du serveur (moteurs/ECARTS-TS.md, branche l/integ-final, 70 515 cas) :
// chaque cas minimal du tableau rend ici exactement la sortie Python (belivay_moteurs/v20/…).
import { describe, expect, it } from 'vitest'
import { chercher, reglage, comptoir, dateRenvoi, livraisonDes, fraisLivraison, estRefus, horsGabarit, jourDeGarde, partsCibles, phase, phaseNommee, selection, totalMobileMoney, type Destination, type Offre } from '@client/calculs'
import { calculerCommission, apresRemboursement, MARGE_MIN_F, MARGE_MIN_PART } from './commission'
import { lireCommission, REGISTRE } from './registre'

const H = 3_600_000
const DEST: Destination = { zone: 'Z6', niveau: 'centre', quartier: null }
const offre = (o: Partial<Offre> & { id: string }): Offre => ({ prix: 15000, zone: 'Z6', niveau: 'centre', km: 0, format: 'P', trust: 75, delaiH: 4, stock: 5, note: 4, ...o })

describe('écarts TS ↔ Python corrigés', () => {
  it('1 · comptoir-carte (R42) : jamais pour une carte ni la diaspora', () => {
    const f = fraisLivraison('relais', DEST, [{ zone: 'Z6', colis: ['P'], km: 0, detour: 0, niveau: 'centre' }], [10000])
    if (estRefus(f)) throw new Error('refus')
    expect(comptoir(f, 15000).propose).toBe(true)
    expect(comptoir(f, 15000, 0, { carte: true })).toMatchObject({ propose: false, motif: 'carte-diaspora' })
    expect(comptoir(f, 15000, 0, { diaspora: true })).toMatchObject({ propose: false, motif: 'carte-diaspora' })
  })
  it('2 · fermetures-chevauchees (R37) : un temps fermé ne compte qu’une fois', () => {
    const ferm = [{ debut: 0, fin: 24 * H }, { debut: 12 * H, fin: 36 * H }]
    expect(jourDeGarde(0, 60 * H, ferm)).toBe(2)
    expect(dateRenvoi(0, ferm)).toBe(204 * H)
  })
  it('3 · vendeur-R14 : livraison offerte, part de BelivaY et marge minimale', () => {
    const p = lireCommission(REGISTRE)
    const r = calculerCommission([{ famille: 'D', prixUnitaire: 5000, quantite: 1 }], 'Platine', false, p, 900)
    expect(r.commission).toBe(1100)
    expect(calculerCommission([{ famille: 'D', prixUnitaire: 5000, quantite: 1 }], 'Platine', false, p).commission).toBe(700)
    expect(apresRemboursement(r, 2500, p).commission).toBe(550)
    expect([MARGE_MIN_F, Number(MARGE_MIN_PART)]).toEqual([reglage('marge_min_f'), reglage('marge_min_part')])
  })
  it('4 · parts-R31 : résolution du serveur (plafond puis plancher, sans fixation au premier tour)', () => {
    const p = partsCibles([83, 37.93, 50.43], [false, true, true])
    expect(p[0]).toBeCloseTo(0.5, 9)
    expect(p[1]).toBeCloseTo(0.1807, 4)
    expect(p[2]).toBeCloseTo(0.3193, 4)
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
    expect(partsCibles([70], [false])).toEqual([1])
  })
  it('5 · egalite-R31 : à égalité complète, l’identifiant départage', () => {
    const s = selection(phaseNommee(phase(1).nom), 'relais', DEST, [offre({ id: 'o1' }), offre({ id: 'o0' })])
    expect(s.retenue).toBe('o0')
  })
  it('6 · relais-XL-HG : XL et hors gabarit hors du CTL et de la course au relais', () => {
    const s = selection(phase(1), 'relais', DEST, [offre({ id: 'o0', prix: 14800, format: 'HG' }), offre({ id: 'o1', prix: 15000 })])
    expect(s.ctl.o0).toBeUndefined()
    expect(s.enCourse.map((e) => e.id)).toEqual(['o1'])
    expect(s.retenue).toBe('o1')
  })
  it('8 · hg-flottant (R10, R02) : au franc supérieur, en entiers', () => {
    expect(horsGabarit(20995690, 0)[0]).toBe(23095259)
  })
  it('11 · hors-domaine : erreur au lieu de 0 F ou de la première phase', () => {
    expect(() => totalMobileMoney(-1)).toThrow()
    expect(totalMobileMoney(0)).toBe(0)
    expect(() => phase(0)).toThrow()
  })
})

describe('écart d’affichage n° 7 (xl-livraison-des)', () => {
  it('un XL sans adresse n’est jamais « Livraison dès 0 F » : refus, comme le serveur', () => {
    expect(() => livraisonDes(chercher('Bastos')!, 'XL', null)).toThrow()
    expect(livraisonDes(chercher('Bastos')!, 'P', null)).toBe(900)
  })
})
