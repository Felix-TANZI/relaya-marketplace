// Calendrier d'ouverture (src/calculs/ouverture.ts) : heures d'ouverture de la boutique (VD05-R02, VD11-R13,
// REFVD-R134), échéance absolue en 24 heures d'ouverture (DP-56, Q-38), « Plus de temps » et passage du livreur (P-6).
// Boutique du jeu d'essai : lundi à vendredi 08 h – 18 h, samedi 08 h – 14 h, dimanche fermé ; livreur 14 h – 16 h en
// semaine, 11 h – 13 h le samedi.
import { describe, expect, it } from 'vitest'
import { ajouterOuvertes, heuresOuvertes, optionsDeDelai, ouvertureSuivante, passageSuivant, type CalendrierBoutique } from './ouverture'
import { yaounde } from './temps'

const H = 3600 * 1000
const CAL: CalendrierBoutique = {
  horaires: [0, 1, 2, 3, 4, 5, 6].map((jour) => ({ jour, ouvert: jour < 6, de: '08:00', a: jour === 5 ? '14:00' : '18:00' })),
  fermeeLe: null,
  fermetures: [],
  passages: [
    { jours: [0, 1, 2, 3, 4], de: '14:00', a: '16:00' },
    { jours: [5], de: '11:00', a: '13:00' },
  ],
}

describe('heures d’ouverture', () => {
  it('BLV-00008 : payée lundi 08 h 42, prête avant 12 h 42 (4 h ouvrées) ; à 09 h 48, il reste 2 h 54', () => {
    const paye = yaounde(2026, 9, 21, 8, 42)
    expect(ajouterOuvertes(paye, 4 * H, CAL)).toBe(yaounde(2026, 9, 21, 12, 42))
    expect(heuresOuvertes(yaounde(2026, 9, 21, 9, 48), yaounde(2026, 9, 21, 12, 42), CAL)).toBe((2 * 60 + 54) * 60 * 1000)
  })
  it('payée samedi 15 h (boutique fermée) : départ lundi 08 h, échéance 12 h, absolue mercredi 12 h (Q-38)', () => {
    const paye = yaounde(2026, 9, 26, 15, 0)
    const debut = ouvertureSuivante(paye, CAL)
    expect(debut).toBe(yaounde(2026, 9, 28, 8, 0))
    expect(ajouterOuvertes(debut, 4 * H, CAL)).toBe(yaounde(2026, 9, 28, 12, 0))
    expect(ajouterOuvertes(debut, 24 * H, CAL)).toBe(yaounde(2026, 9, 30, 12, 0))
  })
  it('le décompte s’arrête la nuit et le dimanche', () => {
    expect(heuresOuvertes(yaounde(2026, 9, 26, 13, 0), yaounde(2026, 9, 28, 9, 0), CAL)).toBe(2 * H)
  })
  it('« Fermer aujourd’hui » et fermeture programmée retirent la journée', () => {
    const lundi = yaounde(2026, 9, 21, 9, 0)
    expect(ouvertureSuivante(lundi, { ...CAL, fermeeLe: '2026-09-21' })).toBe(yaounde(2026, 9, 22, 8, 0))
    expect(ouvertureSuivante(lundi, { ...CAL, fermetures: [{ du: '2026-09-21', au: '2026-09-22' }] })).toBe(yaounde(2026, 9, 23, 8, 0))
  })
})

describe('plus de temps et passage du livreur (VD05-R13, P-6)', () => {
  it('BLV-00008 (12 h 42) : + 1 h inchangé, + 2 h le livreur attend, demain 08 h passage demain', () => {
    const e = yaounde(2026, 9, 21, 12, 42)
    const o = optionsDeDelai(e, yaounde(2026, 9, 23, 12, 42), CAL)
    expect(o.ramassage).toEqual({ debut: yaounde(2026, 9, 21, 14), fin: yaounde(2026, 9, 21, 16) })
    expect(o.options.map((x) => [x.choix, x.echeance, x.effet, x.possible])).toEqual([
      ['+1h', yaounde(2026, 9, 21, 13, 42), 'inchange', true],
      ['+2h', yaounde(2026, 9, 21, 14, 42), 'attend', true],
      ['demain', yaounde(2026, 9, 22, 8), 'suivant', true],
    ])
    expect(o.options[2].ramassage).toEqual({ debut: yaounde(2026, 9, 22, 14), fin: yaounde(2026, 9, 22, 16) })
  })
  it('P-6 : prête avant 15 h 30, + 2 h = 17 h 30 dépasse le créneau : ramassage au créneau suivant, écrit avant l’envoi', () => {
    const o = optionsDeDelai(yaounde(2026, 9, 21, 15, 30), yaounde(2026, 9, 23, 12), CAL)
    const plus2 = o.options[1]
    expect(plus2.echeance).toBe(yaounde(2026, 9, 21, 17, 30))
    expect(plus2.effet).toBe('suivant')
    expect(plus2.ramassage).toEqual({ debut: yaounde(2026, 9, 22, 14), fin: yaounde(2026, 9, 22, 16) })
  })
  it('vendredi 17 h 30 + 1 h ouvrée : samedi 08 h 30 ; demain à l’ouverture = samedi 08 h ; passage samedi 11 h – 13 h', () => {
    const o = optionsDeDelai(yaounde(2026, 9, 25, 17, 30), yaounde(2026, 9, 30, 12), CAL)
    expect(o.options[0].echeance).toBe(yaounde(2026, 9, 26, 8, 30))
    expect(o.options[2].echeance).toBe(yaounde(2026, 9, 26, 8))
    expect(o.options[0].ramassage).toEqual({ debut: yaounde(2026, 9, 26, 11), fin: yaounde(2026, 9, 26, 13) })
  })
  it('DEL-03 : un choix au-delà de l’échéance absolue est grisé', () => {
    const o = optionsDeDelai(yaounde(2026, 9, 21, 12, 42), yaounde(2026, 9, 21, 14, 0), CAL)
    expect(o.options.map((x) => x.possible)).toEqual([true, false, false])
  })
  it('passage du livreur : jamais un jour fermé (dimanche → lundi)', () => {
    expect(passageSuivant(yaounde(2026, 9, 26, 13, 30), CAL)).toEqual({ debut: yaounde(2026, 9, 28, 14), fin: yaounde(2026, 9, 28, 16) })
  })
})
