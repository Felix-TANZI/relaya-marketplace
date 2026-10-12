// Contrat des échanges avec les autres interfaces (src/donnees/echanges.ts, INTERFACES.md) : chaque événement a son
// canal et un exemple dans la démonstration ; aucun champ ne porte l'identité ou le point de retrait du client.
import { describe, expect, it } from 'vitest'
import { CANAUX_ENTRANTS, CANAUX_SORTANTS } from './echanges'
import { EXEMPLES_ENTRANTS, EXEMPLES_SORTANTS } from '../demo/echanges'

describe('échanges avec les autres interfaces', () => {
  it('chaque événement entrant et sortant a un exemple, et chaque exemple un canal', () => {
    expect(new Set(EXEMPLES_ENTRANTS.map((e) => e.type))).toEqual(new Set(Object.keys(CANAUX_ENTRANTS)))
    expect(new Set(EXEMPLES_SORTANTS.map((e) => e.type))).toEqual(new Set(Object.keys(CANAUX_SORTANTS)))
  })
  it('anonymat : aucun champ du client (GEN-01)', () => {
    const champs = [...EXEMPLES_ENTRANTS, ...EXEMPLES_SORTANTS].flatMap((e) => Object.keys(e))
    for (const c of champs) expect(c).not.toMatch(/client(Nom|Prenom|Telephone|Adresse|Quartier)|relais|totalPaye|adresse/i)
  })
  it('identifiants uniques (rejouables sans doublon)', () => {
    const ids = [...EXEMPLES_ENTRANTS, ...EXEMPLES_SORTANTS].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
