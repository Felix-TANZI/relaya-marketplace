// Règles d'ENT-05 et ENT-06 lues dans le registre (aucune valeur dans le code) : formes attendues et calculs purs.
import { expect, test } from 'vitest'
import { REGLES, creneau, tonMarge, trancheTournee } from './regles-ecrans'

test('le registre se lit en entier (une forme changée arrête la lecture)', () => {
  expect(REGLES.tournee).toHaveLength(3)
  expect(REGLES.plafonds.transfert).toHaveLength(2)
  expect(REGLES.rendus.max).toBeGreaterThan(0)
  expect(trancheTournee(8)).toBe(REGLES.tournee[1])
})
test('créneau : demi-heure supérieure, largeur du registre ; marge colorée', () => {
  const c = creneau(0, 10)!
  expect(c.debut % (30 * 60_000)).toBe(0)
  expect(c.fin - c.debut).toBe(REGLES.largeurCreneauH * 3_600_000)
  expect(creneau(0, null)).toBeNull()
  expect(tonMarge(-3)).toBe('rouge')
  expect(tonMarge(REGLES.margeAmbreMin + 1)).toBe('ok')
})
