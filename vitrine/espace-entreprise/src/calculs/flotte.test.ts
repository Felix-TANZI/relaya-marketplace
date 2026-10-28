// Paramètres des groupes ENT-03 et ENT-04 : le registre réel se lit ; une forme inattendue arrête la lecture.
import { expect, it } from 'vitest'
import { ParametreIllisible } from './erreurs'
import { REGISTRE, type Registre } from './registre'
import { delaiTenu, lireClasses, lireFlotte, motDePasseValide, noteTrust, palierLivreur, porte } from './flotte'

const avec = (code: string, valeur: string): Registre => ({ ...REGISTRE, [code]: { code, valeur, unite: REGISTRE[code]?.unite ?? null } })

it('registre réel lisible', () => {
  const p = lireFlotte(REGISTRE)
  expect(p.classes.moto).toEqual(['S', 'M', 'L'])
  expect(p.classes.tricycle).toEqual(['S', 'M', 'L', 'XL'])
  expect(p.classes.camionnette.at(-1)).toBe('HG')
  expect(p.poidsTrust.reduce((n, c) => n + c.poids, 0)).toBe(100)
  expect(p.rappelsAssurance.length).toBeGreaterThan(1)
  expect(p.quizMin).toBeLessThanOrEqual(p.quizSur)
  expect(p.service.debut).toBeLessThan(p.service.fin)
})

it('jamais de XL sur une moto (ENT-RG-R76)', () => {
  expect(porte('moto', 'XL')).toBe(false)
  expect(porte('voiture', 'XL')).toBe(true)
})

it.each([
  ['classes_par_type_vehicule', 'moto S à L ; tricycle et voiture jusqu’à XL'],
  ['classes_par_type_vehicule', 'moto S–L ; tricycle jusqu’à XL'],
  ['trust_poids', 'Ponctualité 30 %, Qualité 25 %'],
  ['seuil_quiz_certification', 'seize sur vingt'],
  ['ENT-HEURES-SERVICE', 'lundi–samedi'],
])('%s « %s » : refusé', (code, valeur) => {
  expect(() => lireFlotte(avec(code, valeur))).toThrow(ParametreIllisible)
})

it('mot de passe : forme du registre exigée', () => {
  expect(() => lireFlotte(REGISTRE, 'huit')).toThrow(ParametreIllisible)
  const p = lireFlotte(REGISTRE, '8 caractères au moins, dont un chiffre')
  expect(motDePasseValide('abcdefg1', p)).toBe(true)
  expect(motDePasseValide('abcdefgh', p)).toBe(false)
  expect(motDePasseValide('abc1', p)).toBe(false)
})

it('Trust : les critères totalisent la note ; paliers ; délai tenu sans base = rien', () => {
  const p = lireFlotte(REGISTRE)
  const tous = Object.fromEntries(p.poidsTrust.map((c) => [c.critere, 80]))
  expect(noteTrust(tous, p)).toBe(80)
  expect(palierLivreur(p.paliersLivreur.Or, p)).toBe('Or')
  expect(palierLivreur(p.paliersLivreur.Confirme - 1, p)).toBe('Nouveau')
  expect(delaiTenu(0, 0, p)).toBeNull()
  expect(delaiTenu(7, 9, p)).toEqual({ pct: 78, alerte: 78 < p.seuilDelaiTenu })
  expect(lireClasses(REGISTRE).voiture).toContain('XL')
})

it('tableau de bord : échéance rouge sous 10 min (ENT-03-R12), distincte de l’anneau de ENT-P10 (5 min)', () => {
  expect(lireFlotte(REGISTRE).echeanceRougeMin).toBe(10)
  expect(REGISTRE.seuil_anneau_rouge.valeur).toMatch(/^5 min/)
})
