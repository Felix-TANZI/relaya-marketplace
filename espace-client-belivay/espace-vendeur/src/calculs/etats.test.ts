// Mêmes contrôles que moteurs/tests/test_etats.py, pour la machine du versement : chaque transition permise quand sa
// garde est remplie, refusée sinon, événement inconnu refusé, structure (états finaux, atteignabilité, doublons).
import { describe, expect, it } from 'vitest'
import { TransitionRefusee, VERSEMENT, type Contexte } from './etats'

const ident = (t: { de: string; evenement: string; vers: string }) => `${t.de}--${t.evenement}->${t.vers}`
const exiges = (t: { exige: string[] }): Contexte => Object.fromEntries(t.exige.map((k) => [k, true]))

describe('machine du versement', () => {
  it.each(VERSEMENT.transitions.map((t) => [ident(t), t] as const))('permise quand sa garde est remplie : %s', (_, t) => {
    expect(VERSEMENT.appliquer(t.de, t.evenement, exiges(t))).toBe(t)
  })

  const gardees = VERSEMENT.transitions.flatMap((t) => [
    ...t.exige.map((k) => [`${ident(t)}:exige:${k}`, t, k, 'exige'] as const),
    ...t.interdit.map((k) => [`${ident(t)}:interdit:${k}`, t, k, 'interdit'] as const),
  ])
  it.each(gardees)('refusée quand sa garde n’est pas remplie : %s', (_, t, cle, sens) => {
    const contexte = { ...exiges(t), [cle]: sens !== 'exige' }
    let obtenue
    try {
      obtenue = VERSEMENT.appliquer(t.de, t.evenement, contexte)
    } catch (e) {
      expect(e).toBeInstanceOf(TransitionRefusee)
      return
    }
    // Une autre transition du même événement peut prendre le relais, jamais celle dont la garde n'est pas remplie.
    expect(obtenue).not.toBe(t)
  })

  it('événement inconnu refusé', () => {
    for (const etat of VERSEMENT.etats) expect(() => VERSEMENT.appliquer(etat, 'evenement.inconnu', {})).toThrow(TransitionRefusee)
  })

  it('structure', () => {
    const departs = new Set(VERSEMENT.transitions.map((t) => t.de))
    // Les états finaux n'ont aucune transition sortante ; tout état non final en a au moins une.
    for (const f of VERSEMENT.etatsFinaux) expect(departs.has(f)).toBe(false)
    for (const e of VERSEMENT.etats) if (!VERSEMENT.etatsFinaux.has(e) && e !== '—') expect(departs.has(e)).toBe(true)
    // Tout état est atteignable depuis « — ».
    const atteints = new Set(['—'])
    const pile = ['—']
    while (pile.length)
      for (const t of VERSEMENT.possibles(pile.pop()!))
        if (!atteints.has(t.vers)) {
          atteints.add(t.vers)
          pile.push(t.vers)
        }
    expect([...atteints].sort()).toEqual([...VERSEMENT.etats].sort())
    // Pas deux transitions identiques (même départ, même événement, même garde).
    const cles = VERSEMENT.transitions.map((t) => JSON.stringify([t.de, t.evenement, t.exige, t.interdit]))
    expect(new Set(cles).size).toBe(cles.length)
  })

  it('nombre de transitions', () => {
    expect(VERSEMENT.transitions.length).toBe(9)
  })
})
