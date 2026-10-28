// Les droits expliqués à l'écran (droits.ts) suivent les rôles des routes : une capacité liée à une page est permise
// exactement aux rôles qui ouvrent cette page (src/pages/<groupe>/routes.ts, ENT-RG-R25).
import { describe, expect, it } from 'vitest'
import { ROLES, rolePermis, type Role } from '../donnees/communs'
import { DROITS, droitsDe } from './droits'

const TEXTES = import.meta.glob<string>('../pages/*/routes.ts', { query: '?raw', import: 'default', eager: true })
const rolesDeRoute: Record<string, string[] | null> = {}
for (const texte of Object.values(TEXTES)) {
  for (const m of texte.matchAll(/\{ route: '([\w-]+)'[^\n]*/g)) rolesDeRoute[m[1]] = /roles: \[([^\]]*)\]/.exec(m[0])?.[1].match(/\w+/g) ?? null
}

describe('droits par rôle', () => {
  it('chaque capacité liée à une page a les rôles de la page', () => {
    // Le gérant ouvre aussi les pages du répartiteur (rolePermis) : la comparaison suit le droit effectif.
    const ouvrent = (r: string[] | null) => ROLES.filter((x) => !r || rolePermis(x, r as Role[]))
    for (const d of DROITS.filter((x) => x.route)) expect([...d.roles].sort(), d.id).toEqual(ouvrent(rolesDeRoute[d.route!]).sort())
  })
  it('chaque interdit dit pourquoi ; le propriétaire peut tout', () => {
    for (const d of DROITS) expect(d.pourquoi.length, d.id).toBeGreaterThan(20)
    expect(droitsDe('proprietaire').non).toEqual([])
    for (const r of ROLES) expect(droitsDe(r).oui.length + droitsDe(r).non.length).toBe(DROITS.length)
  })
})
