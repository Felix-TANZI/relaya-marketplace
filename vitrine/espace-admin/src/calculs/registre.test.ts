// Registre de la console : chaque paramètre se lit avec sa forme et son unité ; une proposition du socle (A-VALIDER § 4)
// entrée depuis au registre officiel est signalée pour être retirée ; une forme inattendue arrête la lecture.
import { describe, expect, it } from 'vitest'
import donnees from '../../../logique-metier/parametres-en-vigueur.json' with { type: 'json' }
import { PARAMETRES_PROPOSES } from '../config/parametres-proposes'
import { PARAMETRES, chargerRegistre, entier, lireZonesExploitees } from './registre'

describe('registre de la console', () => {
  it('lit les paramètres de la console', () => {
    expect(PARAMETRES.console.motifMin).toBeGreaterThan(0)
    expect(PARAMETRES.console.seuilRemboursementQuatreYeux).toBeGreaterThan(0)
    expect(PARAMETRES.zonesExploitees.map((z) => z.code)).toEqual(['Z1', 'Z2', 'Z3', 'Z6'])
    expect(PARAMETRES.mentions.denomination).toBe('BELIVAY SARL')
  })
  it('aucune proposition du socle n’est déjà dans le registre officiel (sinon : la retirer)', () => {
    const officiels = new Set(donnees.parametres.map((p) => p.code))
    expect(PARAMETRES_PROPOSES.filter((p) => officiels.has(p.code)).map((p) => p.code)).toEqual([])
  })
  it('refuse une forme ou une unité inattendue', () => {
    const r = chargerRegistre({ parametres: [{ code: 'X', valeur: 'beaucoup', unite: 'heures' }, { code: 'ZONES-EXPLOITEES', valeur: 'Bastos et Mokolo' }] })
    expect(() => entier(r, 'X', /^heures/)).toThrow(/nombre entier/)
    expect(() => lireZonesExploitees(r)).toThrow(/ZONES-EXPLOITEES/)
  })
})
