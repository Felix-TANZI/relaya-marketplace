// Le registre réel se lit ; une valeur de forme ou d'unité inattendue arrête la lecture (aucune valeur devinée).
import { expect, it } from 'vitest'
import { ParametreAbsent, ParametreIllisible } from './erreurs'
import { lireAcces, lireDelais, lireLitiges, lirePaliers, lirePilote, REGISTRE, type Registre } from './registre'
import { palierSuivant, plafondDe, sousPlafond } from './paliers'

const avec = (code: string, valeur: string, unite?: string): Registre => ({ ...REGISTRE, [code]: { code, valeur, unite: unite ?? REGISTRE[code]?.unite ?? null } })

it('registre réel lisible', () => {
  expect(lireAcces(REGISTRE).echecsAvantBlocage).toBeGreaterThan(0)
  expect(lireDelais(REGISTRE).acceptationMin).toBeGreaterThan(0)
  expect(lirePilote(REGISTRE).dureeJours).toBeGreaterThan(0)
  expect(lireLitiges(REGISTRE).arrangementMin).toBeGreaterThan(0)
  const p = lirePaliers(REGISTRE)
  expect(p.plafonds.Or).toBeNull()
})

it.each([
  ['ENT-T-ACCEPT', 'quinze', undefined, 'entier'],
  ['ENT-T-ACCEPT', '15', 'heures', 'unité'],
  ['duree_session', '12 h', undefined, 'entier'],
  ['ENT-PLAFOND-OR', '500 000', undefined, 'sans plafond'],
  ['ENT-PLAFOND-NOUVEAU', '300 000', undefined, 'Nouveau doit être sous Confirmé'],
  ['ENT-SEUIL-OR', '60', undefined, 'Confirmé < Or'],
  ['delai_reponse_litige', '2 jours', undefined, 'forme attendue'],
])('illisible : %s = %s', (code, valeur, unite, motif) => {
  const r = avec(code, valeur, unite)
  const lire = () => (lireAcces(r), lireDelais(r), lirePaliers(r), lirePilote(r), lireLitiges(r))
  expect(lire).toThrow(ParametreIllisible)
  expect(lire).toThrow(motif)
})

it('paramètre absent', () => {
  const r = { ...REGISTRE }
  delete r['ENT-T-ACCEPT']
  expect(() => lireDelais(r)).toThrow(ParametreAbsent)
})

it('paliers : plafond et palier suivant', () => {
  const p = lirePaliers(REGISTRE)
  expect(plafondDe('Nouveau', p)).toBe(p.plafonds.Nouveau)
  expect(sousPlafond(p.plafonds.Nouveau!, 'Nouveau', p)).toBe(true)
  expect(sousPlafond(p.plafonds.Nouveau! + 1, 'Nouveau', p)).toBe(false)
  expect(sousPlafond(10 ** 9, 'Or', p)).toBe(true)
  expect(palierSuivant('Nouveau')).toBe('Confirme')
  expect(palierSuivant('Or')).toBeNull()
})
