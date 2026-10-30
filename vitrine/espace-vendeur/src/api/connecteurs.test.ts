// Connecteurs de l'espace vendeur : chaque méthode de la SourceVendeur est branchée (src/api/domaines) et décrite une
// fois dans le registre (src/api/routes.ts → CONNECTEURS-VENDEUR.md, contrat openapi.yaml) ; une méthode « demo »
// (geste d'une autre interface) lève NonDisponible ; un 403 owner_only devient ReserveAuProprietaire.
import { describe, expect, it } from 'vitest'
import { creerClient, stockageMemoire } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import { ReserveAuProprietaire } from '../donnees/communs'
import { sourceDemo } from '../demo/source-demo'
import { BRANCHES } from './domaines'
import { CONNECTEURS_PAGES, CONNECTEURS_VENDEUR } from './routes'
import { sourcePages } from './pages/source'
import { sourceApi } from './source-api'

function serveur(statut: number, corps: unknown) {
  const appels: { url: string; methode: string; corps: unknown }[] = []
  const api = creerClient({
    baseUrl: 'http://essai/api',
    stockage: stockageMemoire({ acces: 'a', rafraichissement: null }),
    attendre: async () => {},
    tentatives: 0,
    fetch: (async (url: string, init: RequestInit) => {
      appels.push({ url: String(url), methode: init.method ?? 'GET', corps: init.body })
      return new Response(statut === 204 ? null : JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } })
    }) as typeof fetch,
  })
  return { api, appels }
}

describe('registre des connecteurs vendeur', () => {
  const { api } = serveur(200, {})
  const branches = BRANCHES(api) as unknown as Record<string, Record<string, unknown>>

  it('chaque méthode de la source a un connecteur, et rien de plus', () => {
    const attendues = Object.entries(sourceDemo).flatMap(([d, o]) => Object.keys(o).map((m) => `${d}.${m}`)).sort()
    const branchees = Object.entries(branches).flatMap(([d, o]) => Object.keys(o).map((m) => `${d}.${m}`)).sort()
    expect(branchees).toEqual(attendues)
    expect(Object.keys(CONNECTEURS_VENDEUR).sort()).toEqual(attendues)
  })

  it('chaque route branchée est sous /api/vendors/ ; une méthode « demo » lève NonDisponible', async () => {
    for (const [cle, c] of Object.entries(CONNECTEURS_VENDEUR)) {
      if (c.etat === 'branche' || c.etat === 'partiel') expect(c.route, cle).toMatch(/\/api\/vendors\//)
      if (c.etat === 'demo') {
        const [d, m] = cle.split('.')
        const f = branches[d][m] as (...a: unknown[]) => Promise<unknown>
        await expect(f('BLV-1', '000000'), cle).rejects.toBeInstanceOf(NonDisponible)
      }
    }
  })

  it('403 owner_only devient ReserveAuProprietaire', async () => {
    const { api: refus } = serveur(403, { error: { code: 'owner_only', message: 'Réservé au propriétaire de la boutique.' } })
    await expect(sourceApi(refus).argent.resume()).rejects.toBeInstanceOf(ReserveAuProprietaire)
  })

  it('403 forbidden_right (hors des droits de l’employé) devient ReserveAuProprietaire', async () => {
    const { api: refus } = serveur(403, { error: { code: 'forbidden_right', message: 'Cette action ne fait pas partie de vos droits.' } })
    await expect(sourceApi(refus).messages.fils()).rejects.toBeInstanceOf(ReserveAuProprietaire)
  })

  it('pages ajoutées : chaque connecteur prêt a son entrée du registre, sous /api/vendors/', async () => {
    const { api: a } = serveur(200, {})
    const prets = Object.entries(sourcePages(a)).flatMap(([d, o]) => Object.keys(o).map((m) => `${d}.${m}`))
    for (const cle of prets) expect(CONNECTEURS_PAGES, cle).toHaveProperty([cle])
    for (const [cle, c] of Object.entries(CONNECTEURS_PAGES)) expect(c.route, cle).toMatch(/\/api\/vendors\//)
    const s = serveur(200, [])
    await sourcePages(s.api).activite.ramassages(1, 2)
    expect(s.appels[0].url).toBe('http://essai/api/vendors/pickups?from=1&to=2')
  })

  it('les appels partent vers /api/vendors/…', async () => {
    const s = serveur(200, { compteurs: {}, detail: {}, total: 0, items: [], maintenant: 0 })
    await sourceApi(s.api).commandes.vue('prep')
    expect(s.appels[0].url).toMatch(/^http:\/\/essai\/api\/vendors\//)
  })
})
