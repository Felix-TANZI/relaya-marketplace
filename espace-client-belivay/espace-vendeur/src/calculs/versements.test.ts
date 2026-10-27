// Mêmes exemples que moteurs/tests/test_versements.py (jeu d'essai : lundi 21 sept. 2026, 09 h 48, Tonton PG).
import { describe, expect, it } from 'vitest'
import { lireVersements, REGISTRE } from './registre'
import { yaounde } from './temps'
import {
  appliquerReprise, dateDeLiberation, essaisApresRefus, fermetureDuRetour, finDeRevue, heureLimite, liberationApresLitige, montantDu,
  premierVersementApresCorrection, progressionPourCent, suspendu, vendrediDeVersement, type Gain,
} from './versements'
import type { Palier } from './registre'

const P = lireVersements(REGISTRE)
const t = (mois: number, jour: number, h = 0, mi = 0, s = 0) => yaounde(2026, mois, jour, h, mi, s)

it('paramètres', () => {
  expect([P.fenetreRetourJours, P.libStandardJours, P.libOrJours, P.libCarteJours]).toEqual([7, 3, 1, 14])
  expect([P.jourVersement, P.heureVersement, P.jourArrete, P.heureArrete]).toEqual([4, 12, 3, [23, 59]])
  expect([P.essais, P.intervalleEssaisHeures, P.revueNumeroJours, P.repriseDemandeJours]).toEqual([3, 24, 7, 30])
})

it('fermeture du retour (Q-58)', () => {
  expect(fermetureDuRetour(t(9, 17, 10), t(9, 18, 18), P)).toBe(t(9, 18, 18))
  expect(fermetureDuRetour(t(9, 17, 10), null, P)).toBe(t(9, 24, 10))
  expect(fermetureDuRetour(t(9, 10, 10), t(9, 18, 18), P)).toBe(t(9, 17, 10))
})

it.each([
  ['Bronze', false, t(9, 21, 18)], // BLV-00007 : confirmée ven. 18 à 18 h, libérée lun. 21 à 18 h
  ['Argent', false, t(9, 21, 18)],
  ['Or', false, t(9, 19, 18)],
  ['Platine', false, t(9, 19, 18)],
  ['Platine', true, t(10, 2, 18)], // carte : 14 jours (DP-23)
  ['Bronze', true, t(10, 2, 18)],
] as [Palier, boolean, number][])('libération %s carte=%s', (palier, carte, liberee) => {
  expect(dateDeLiberation(t(9, 18, 18), palier, carte, P)).toBe(liberee)
})

it('progression de BLV-00007', () => {
  expect(progressionPourCent(t(9, 18, 18), t(9, 21, 18), t(9, 21, 9, 48))).toBe(89)
  expect(progressionPourCent(t(9, 18, 18), t(9, 21, 18), t(9, 18, 12))).toBe(0)
  expect(progressionPourCent(t(9, 18, 18), t(9, 21, 18), t(9, 22, 9))).toBe(100)
})

it('libération après un litige gagné (Q-60)', () => {
  expect(liberationApresLitige(t(9, 21, 18), t(9, 24, 10))).toBe(t(9, 24, 10))
  expect(liberationApresLitige(t(9, 28, 18), t(9, 24, 10))).toBe(t(9, 28, 18))
})

it.each([
  [t(9, 21, 18), '2026-09-25'],
  [t(9, 24, 23, 59, 59), '2026-09-25'],
  [t(9, 25, 0, 0), '2026-10-02'],
  [t(9, 25, 10), '2026-10-02'], // Q-59
  [t(9, 26, 9), '2026-10-02'],
  [t(9, 27, 9), '2026-10-02'],
  [Date.UTC(2026, 8, 24, 23, 30), '2026-10-02'], // Q-65 : jeudi 23 h 30 UTC = vendredi 0 h 30 à Douala
  [Date.UTC(2026, 8, 24, 22, 30), '2026-09-25'],
])('vendredi de versement %#', (liberation, vendredi) => {
  expect(vendrediDeVersement(liberation, P)).toBe(vendredi)
})

it('vendredi férié maintenu, heure limite (Q-13)', () => {
  expect(heureLimite('2026-12-25', P)).toBe(yaounde(2026, 12, 25, 12))
  expect(vendrediDeVersement(t(12, 21, 9), P)).toBe('2026-12-25')
})

it('montant dû du jeu d’essai : 35 680 F le vendredi 25 (ARG-06)', () => {
  const gains: Gain[] = [
    { reference: 'BLV-00001', garde: 17840, liberation: t(9, 10, 9), verse: true },
    { reference: 'BLV-00003', garde: 17840, liberation: t(9, 19, 11) },
    { reference: 'BLV-00007', garde: 17840, liberation: t(9, 21, 18) },
    { reference: 'BLV-00008', garde: 17840, liberation: null },
    { reference: 'BLV-00005', garde: 335324, liberation: null },
    { reference: 'BLV-00010', garde: 600, liberation: t(9, 24, 21) },
    { reference: 'BLV-00011', garde: 17840, liberation: t(9, 25, 10) },
  ]
  expect(montantDu('2026-09-25', gains, P)).toBe(17840 * 2 + 600)
  expect(montantDu('2026-10-02', gains, P)).toBe(17840 * 3 + 600)
})

it('refus et suspension (F7)', () => {
  expect(essaisApresRefus(t(9, 25, 10), P)).toEqual([t(9, 26, 10), t(9, 27, 10), t(9, 28, 10)])
  expect(suspendu(3, P)).toBe(false)
  expect(suspendu(4, P)).toBe(true)
})

it('reprise après correction et revue du numéro (Q-13, Q-19)', () => {
  expect(finDeRevue(t(9, 21, 9), P)).toBe(t(9, 28, 9))
  expect(premierVersementApresCorrection(t(9, 21, 9), true, P)).toBe('2026-10-02')
  expect(premierVersementApresCorrection(t(9, 29, 10), true, P)).toBe('2026-10-09')
  expect(premierVersementApresCorrection(t(9, 29, 10), false, P)).toBe('2026-10-02')
})

describe('reprise d’un montant déjà libéré (Q-11)', () => {
  it('déduite puis reportée', () => {
    expect(appliquerReprise(10000, 17840, '2026-09-20', '2026-09-25', P)).toEqual({ verse: 0, repris: 10000, repriseReportee: 7840, demandeMobileMoney: false })
    expect(appliquerReprise(30000, 7840, '2026-09-20', '2026-10-02', P)).toEqual({ verse: 22160, repris: 7840, repriseReportee: 0, demandeMobileMoney: false })
    expect(appliquerReprise(0, 7840, '2026-09-20', '2026-10-23', P).demandeMobileMoney).toBe(true)
    expect(appliquerReprise(0, 7840, '2026-09-20', '2026-10-20', P).demandeMobileMoney).toBe(false)
    expect(appliquerReprise(5000, 0, null, '2026-10-02', P).verse).toBe(5000)
    expect(() => appliquerReprise(-1, 0, null, '2026-10-02', P)).toThrow()
  })
})

it('cadeaux groupés : commandes normales (Q-15)', () => {
  const premier = dateDeLiberation(fermetureDuRetour(t(9, 14, 10), null, P), 'Bronze', false, P)
  const second = dateDeLiberation(fermetureDuRetour(t(9, 14, 10) + 10 * 86400000, null, P), 'Bronze', false, P)
  expect([vendrediDeVersement(premier, P), vendrediDeVersement(second, P)]).toEqual(['2026-09-25', '2026-10-09'])
})
