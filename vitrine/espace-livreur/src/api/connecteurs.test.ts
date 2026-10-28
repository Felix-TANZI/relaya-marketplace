// Connecteurs du livreur : chaque méthode de la SourceLivreur est branchée (src/api/domaines) et décrite une fois dans le
// registre (src/api/routes.ts → CONNECTEURS-LIVREUR.md, contrat openapi.yaml) ; une méthode « demo » lève NonDisponible ;
// une action métier part avec son origine (corps) et Idempotency-Key = origine.cle (rejeu hors connexion sans double effet).
import { describe, expect, it } from 'vitest'
import { creerClient, stockageMemoire } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import type { Origine } from '../donnees/communs'
import { NOMS } from '../donnees/source'
import { BRANCHES } from './domaines'
import { CONNECTEURS_LIVREUR } from './routes'
import { sourceApi } from './source-api'

function serveur(statut: number, corps: unknown) {
  const appels: { url: string; methode: string; corps: string | null; entetes: Record<string, string> }[] = []
  const api = creerClient({
    baseUrl: 'http://essai/api',
    stockage: stockageMemoire({ acces: 'a', rafraichissement: null }),
    attendre: async () => {},
    tentatives: 0,
    fetch: (async (url: string, init: RequestInit) => {
      appels.push({ url: String(url), methode: init.method ?? 'GET', corps: (init.body as string) ?? null, entetes: Object.fromEntries(new Headers(init.headers).entries()) })
      return new Response(statut === 204 ? null : JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } })
    }) as typeof fetch,
  })
  return { api, appels }
}

describe('registre des connecteurs du livreur', () => {
  const { api } = serveur(200, {})
  const branches = BRANCHES(api) as unknown as Record<string, Record<string, unknown>>

  it('chaque domaine de la source est branché, et chaque méthode a son entrée au registre', () => {
    expect(Object.keys(branches).sort()).toEqual([...NOMS].sort())
    const branchees = Object.entries(branches).flatMap(([d, o]) => Object.keys(o).map((m) => `${d}.${m}`)).sort()
    expect(Object.keys(CONNECTEURS_LIVREUR).sort()).toEqual(branchees)
  })

  it('chaque route branchée est sous /api/courier/ ; une méthode « demo » lève NonDisponible', async () => {
    for (const [cle, c] of Object.entries(CONNECTEURS_LIVREUR)) {
      if (c.etat === 'branche' || c.etat === 'partiel') expect(c.route, cle).toMatch(/\/api\/courier\//)
      if (c.etat === 'demo') {
        const [d, m] = cle.split('.')
        await expect((branches[d][m] as (...a: unknown[]) => Promise<unknown>)('x'), cle).rejects.toBeInstanceOf(NonDisponible)
      }
    }
  })

  it('une action part avec son origine et la clé d’idempotence de l’origine', async () => {
    const s = serveur(200, { ok: true })
    const o: Origine = { cle: 'cle-essai-0001', heure: 1_760_000_000_000, position: { lat: 3.87, lng: 11.5, precisionM: 12 } }
    await sourceApi(s.api).disponibilite.changer('en_pause', o, { motif: 'Repas', minutes: 30 })
    expect(s.appels[0].url).toMatch(/^http:\/\/essai\/api\/courier\//)
    expect(s.appels[0].entetes['idempotency-key']).toBe('cle-essai-0001')
    expect(JSON.parse(s.appels[0].corps ?? '{}').origine).toEqual(o)
  })
})

describe('file hors connexion du téléphone', () => {
  it('la charge d’un geste devient sa requête exacte, envoyée par le lot avec l’identifiant provisoire de la photo', async () => {
    const memoire = new Map<string, string>()
    globalThis.localStorage = { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v) } as unknown as Storage
    const s = serveur(200, { a: 1, envoyees: 2, refusees: 0, resultats: [], conflits: [], heureServeur: 1, expirationH: 72, photoMaxKo: 400, wifiAttenteMaxH: 6, ecartHorlogeMaxH: 1 })
    const src = sourceApi(s.api)
    const o1: Origine = { cle: 'photo-0001-cle', heure: Date.now() - 2000, position: null }
    const o2: Origine = { cle: 'incident-0002-cle', heure: Date.now() - 1000, position: null }
    const photo = { nature: 'incident', objet: 'A2', octets: 1200, empreinte: 'ab'.repeat(32), nette: true }
    await src.horsligne.mettreEnFile('photo', 'A2', o1, { charge: { domaine: 'tournee', methode: 'deposerPreuve', args: [photo, o1] } })
    const decl = { famille: 'route' as const, type: 'panne', note: 'Le moteur ne démarre plus.', photos: ['file-' + o1.cle], arretId: null }
    await src.horsligne.mettreEnFile('incident', '', o2, { charge: { domaine: 'incidents', methode: 'declarer', args: [decl, o2, true] } })
    s.appels.length = 0
    await src.horsligne.envoyerFile()
    const lot = s.appels.find((a) => a.url.endsWith('/courier/sync/batch'))
    const actions = JSON.parse(lot?.corps ?? '{}').actions
    expect(actions.map((a: { requete: { chemin: string } }) => a.requete.chemin)).toEqual(['/api/courier/media', '/api/courier/incidents'])
    expect(actions[0].requete.corps).toEqual({ ...photo, origine: o1 })
    expect(actions[1].requete.corps.photos).toEqual(['file-' + o1.cle])
    expect(actions[1].requete.corps.origine).toEqual(o2)
  })
})
