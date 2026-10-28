// Garde v2.0 en tranches de 24 h : mêmes exemples que moteurs/tests/test_v20_colis_garde.py, et tables de l'oracle
// BV-DEV-07_Donnees.json (livraison.garde_cumul, livraison.garde_relais, réglages garde_heures et garde_jours).
import { describe, expect, it } from 'vitest'
import { GARDE_HEURES, GARDE_JOURS, dateRenvoi, dernierJourDeRetrait, etat, gardeColis, gardeCommande, groupe, horaires, jourDeGarde, joursDeGarde, partRelaisGarde, rang, renvoi } from './garde'
import ORACLE from '../../../logique-metier/reference/BV-DEV-v2.0/A_envoyer_aux_developpeurs/BV-DEV-07_Donnees.json'
import { PARAMETRES } from './registre'
import { HEURE, JOUR, jourDe, yaounde } from './temps'

const P = PARAMETRES.relais.garde


describe('garde v2.0 (portage de v20/garde.py)', () => {
  it('suit les tables et réglages de l’oracle BV-DEV-07', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((j) => gardeColis(P, j, 1_000_000))).toEqual(ORACLE.livraison.garde_cumul)
    expect([1, 2, 3, 4, 5, 6, 7].map((j) => partRelaisGarde(P, j, 1)[0])).toEqual(ORACLE.livraison.garde_relais)
    expect(GARDE_HEURES).toBe(ORACLE.reglages.garde_heures.valeur)
    expect(GARDE_JOURS).toBe(ORACLE.reglages.garde_jours.valeur)
    expect(P.gainRelaisJour).toBe(ORACLE.reglages.garde_relais_jour.valeur)
    expect(P.j1PayeParBelivay).toBe(ORACLE.reglages.garde_j1_belivay.valeur === 1)
  })

  it('garde par colis plafonnée à sa valeur (R36)', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((j) => gardeColis(P, j, 50_000))).toEqual([0, 100, 200, 300, 500, 1000, 2000])
    expect(gardeColis(P, 7, 1500)).toBe(1500)
    expect(gardeCommande(P, 3, [10_000, 20_000])).toBe(400)
    expect(() => gardeColis(P, 8, 1000)).toThrow()
  })

  it('part du relais : 100 F par jour et par colis, le jour 1 payé par BelivaY (R38)', () => {
    expect(partRelaisGarde(P, 1, 2)).toEqual([200, 200])
    expect(partRelaisGarde(P, 7, 1)[0]).toBe(700)
  })

  it('jours en tranches de 24 h ; fermeture déclarée : compteur arrêté, renvoi reculé (R37)', () => {
    const t0 = yaounde(2026, 10, 13, 10, 0)
    expect(jourDeGarde(t0, t0 + 23 * HEURE)).toBe(1)
    expect(jourDeGarde(t0, t0 + 25 * HEURE)).toBe(2)
    expect(jourDeGarde(t0, t0 + 30 * JOUR)).toBe(7)
    const ferme = [{ debut: t0 + 20 * HEURE, fin: t0 + 44 * HEURE }]
    expect(jourDeGarde(t0, t0 + 47 * HEURE, ferme)).toBe(1)
    expect(dateRenvoi(t0)).toBe(t0 + 7 * JOUR)
    expect(dateRenvoi(t0, ferme)).toBe(t0 + 8 * JOUR)
    expect(dateRenvoi(t0, [{ debut: t0 + 7 * JOUR + HEURE, fin: t0 + 9 * JOUR }])).toBe(t0 + 7 * JOUR)
  })

  it('un groupe arrivé à une heure donnée : le montant suit l’heure, pas le jour du calendrier', () => {
    const arrivee = yaounde(2026, 10, 10, 17, 30) // samedi 17 h 30
    const g = groupe('BLV-T', jourDe(arrivee), 30_000, 30_000, false, horaires(8 * 60, 19 * 60, [6]), { arrivee, colis: [10_000, 20_000] })
    const lundi9h = yaounde(2026, 10, 12, 9, 0) // 39 h 30 après : jour 2 (le dimanche, fermé chaque semaine, compte : R37)
    expect(etat(g, '2026-10-12', P, lundi9h)).toMatchObject({ rang: 2, du: 200, duDemain: 400, gainRelais: 400, payeParBelivay: 200 })
    expect(etat(g, '2026-10-12', P, yaounde(2026, 10, 12, 18, 0)).rang).toBe(3) // 48 h 30 après : jour 3
    expect(joursDeGarde(g, '2026-10-12', P, lundi9h).map((l) => [l.jour, l.rang, l.tarif])).toEqual([['2026-10-10', 1, 0], ['2026-10-11', 2, 100]])
    expect(dernierJourDeRetrait(g)).toBe('2026-10-17')
    expect(renvoi(g, P)?.jour).toBe('2026-10-18') // la garde finit le samedi 17 à 17 h 30 : départ le lendemain
    // Fermeture exceptionnelle déclarée le lundi 12 : 24 h de plus.
    const f = groupe('BLV-F', jourDe(arrivee), 30_000, 30_000, false, horaires(8 * 60, 19 * 60, [], ['2026-10-12']), { arrivee, colis: [30_000] })
    expect(rang(f, '2026-10-12', lundi9h)).toBeNull()
    expect(etat(f, '2026-10-13', P, yaounde(2026, 10, 13, 9, 0)).rang).toBe(2)
    expect(dernierJourDeRetrait(f)).toBe('2026-10-18')
  })
})

describe('fermetures qui se chevauchent (moteurs/ECARTS-TS.md n° 2, R37)', () => {
  it('un temps fermé ne compte qu’une fois : jour 2, renvoi à 204 h', () => {
    const ferm = [{ debut: 0, fin: 24 * HEURE }, { debut: 12 * HEURE, fin: 36 * HEURE }]
    expect(jourDeGarde(0, 60 * HEURE, ferm)).toBe(2)
    expect(dateRenvoi(0, ferm)).toBe(204 * HEURE)
  })
})
