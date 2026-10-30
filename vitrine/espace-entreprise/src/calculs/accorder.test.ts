import { expect, it } from 'vitest'
import { accorder } from '../preferences'

it('« (s) » suit le dernier nombre : singulier à 0 et 1 en français, à 1 seulement en anglais', () => {
  expect(accorder('{n} mission(s) aujourd’hui', { n: 0 }, 'fr')).toBe('{n} mission aujourd’hui')
  expect(accorder('{n} livreur(s) prêt(s)', { n: 5 }, 'fr')).toBe('{n} livreurs prêts')
  expect(accorder('{n} mission(s)', { n: 0 }, 'en')).toBe('{n} missions')
  expect(accorder('{p} % · {l} litige(s)', { p: 92, l: 1 }, 'fr')).toBe('{p} % · {l} litige')
  expect(accorder('essai(s)', {}, 'fr')).toBe('essai(s)')
  expect(accorder('{d} point(s) depuis', { d: '+8,8' }, 'fr')).toBe('{d} points depuis')
  expect(accorder('{d} point(s)', { d: '−1' }, 'fr')).toBe('{d} point')
})
