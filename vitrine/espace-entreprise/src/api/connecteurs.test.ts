// Connecteurs de l'entreprise : chaque méthode de la SourceEntreprise est branchée (src/api/domaines) et décrite une fois
// dans le registre (src/api/routes.ts → CONNECTEURS-ENTREPRISE.md, contrat openapi.yaml) ; une méthode « demo » lève
// NonDisponible ; un 403 role_forbidden devient AccesRefuse avec les rôles admis.
import { describe, expect, it } from 'vitest'
import { creerClient, stockageMemoire } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import { AccesRefuse } from '../donnees/communs'
import { DOMAINES } from '../donnees/source'
import { BRANCHES } from './domaines'
import { CONNECTEURS_ENTREPRISE } from './routes'
import { sourceApi } from './source-api'

function serveur(statut: number, corps: unknown) {
  const appels: { url: string; methode: string; corps: unknown; entetes: Record<string, string> }[] = []
  const api = creerClient({
    baseUrl: 'http://essai/api',
    stockage: stockageMemoire({ acces: 'a', rafraichissement: null }),
    attendre: async () => {},
    tentatives: 0,
    fetch: (async (url: string, init: RequestInit) => {
      appels.push({ url: String(url), methode: init.method ?? 'GET', corps: init.body, entetes: Object.fromEntries(new Headers(init.headers).entries()) })
      return new Response(statut === 204 ? null : JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } })
    }) as typeof fetch,
  })
  return { api, appels }
}

describe('registre des connecteurs de l’entreprise', () => {
  const { api } = serveur(200, {})
  const branches = BRANCHES(api) as unknown as Record<string, Record<string, unknown>>

  it('chaque domaine de la source est branché, et chaque méthode a son entrée au registre', () => {
    expect(Object.keys(branches).sort()).toEqual([...DOMAINES].sort())
    const branchees = Object.entries(branches).flatMap(([d, o]) => Object.keys(o).map((m) => `${d}.${m}`)).sort()
    expect(Object.keys(CONNECTEURS_ENTREPRISE).sort()).toEqual(branchees)
  })

  it('chaque route branchée est sous /api/company/ ; une méthode « demo » lève NonDisponible', async () => {
    for (const [cle, c] of Object.entries(CONNECTEURS_ENTREPRISE)) {
      if (c.etat === 'branche' || c.etat === 'partiel') expect(c.route, cle).toMatch(/\/api\/company\//)
      if (c.etat === 'demo') {
        const [d, m] = cle.split('.')
        await expect((branches[d][m] as (...a: unknown[]) => Promise<unknown>)('x'), cle).rejects.toBeInstanceOf(NonDisponible)
      }
    }
  })

  it('403 role_forbidden devient AccesRefuse avec les rôles admis', async () => {
    const { api: refus } = serveur(403, { error: { code: 'role_forbidden', message: 'Votre rôle ne permet pas cette action.', data: { roles: ['proprietaire', 'comptable'] } } })
    const e = await sourceApi(refus).reglements.prochain().catch((x) => x)
    expect(e).toBeInstanceOf(AccesRefuse)
    expect((e as AccesRefuse).roles).toEqual(['proprietaire', 'comptable'])
  })

  it('les appels partent vers /api/company/…', async () => {
    const s = serveur(200, { aFaire: [] })
    await sourceApi(s.api).tableau.tableau()
    expect(s.appels[0].url).toMatch(/^http:\/\/essai\/api\/company\//)
  })
})
