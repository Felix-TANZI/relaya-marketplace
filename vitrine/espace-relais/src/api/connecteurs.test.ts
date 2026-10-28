// Connecteurs du point relais : chaque méthode de la SourceRelais est branchée (src/api/domaines) et décrite une fois
// dans le registre (src/api/routes.ts → CONNECTEURS-RELAIS.md, contrat openapi.yaml) ; plus aucune « à brancher » ;
// une méthode « demo » lève NonDisponible ; une action métier part avec son origine (corps) et Idempotency-Key =
// origine.cle ; l'appareil se nomme (X-Device-Id) ; les listes paginées sont lues en entier (X-Next-Cursor) ; un refus
// de droits devient « droit_refuse » ; la file hors connexion part avec sa charge et la preuve signée, jamais le PIN.
import { describe, expect, it } from 'vitest'
import { creerClient, stockageMemoire } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import type { Origine } from '../donnees/communs'
import { NOMS } from '../donnees/source'
import { BRANCHES } from './domaines'
import { signer } from './domaines/horsligne'
import { urlMedia } from './outils'
import { CONNECTEURS_RELAIS } from './routes'
import { fetchPagine, sourceApi } from './source-api'

type Appel = { url: string; methode: string; corps: string | null; entetes: Record<string, string> }
type Reponse = { statut: number; corps: unknown; entetes?: Record<string, string> }

function serveur(repondre: (a: Appel) => Reponse) {
  const appels: Appel[] = []
  const brut = (async (url: string, init: RequestInit = {}) => {
    const a = { url: String(url), methode: init.method ?? 'GET', corps: (init.body as string) ?? null, entetes: Object.fromEntries(new Headers(init.headers).entries()) }
    appels.push(a)
    const r = repondre(a)
    return new Response(r.statut === 204 ? null : JSON.stringify(r.corps), { status: r.statut, headers: { 'Content-Type': 'application/json', ...r.entetes } })
  }) as typeof fetch
  const api = creerClient({
    baseUrl: 'http://essai/api',
    stockage: stockageMemoire({ acces: 'a', rafraichissement: null }),
    attendre: async () => {},
    tentatives: 0,
    appareil: () => 'appareil-essai-0001',
    fetch: fetchPagine(brut),
  })
  return { api, appels }
}
const fixe = (statut: number, corps: unknown) => serveur(() => ({ statut, corps }))
const o: Origine = { cle: 'cle-essai-0001', heure: 1_760_000_000_000, position: { lat: 3.87, lng: 11.5, precisionM: 12 } }

describe('registre des connecteurs du point relais', () => {
  const { api } = fixe(200, {})
  const branches = BRANCHES(api) as unknown as Record<string, Record<string, unknown>>

  it('chaque domaine de la source est branché, et chaque méthode a son entrée au registre', () => {
    expect(Object.keys(branches).sort()).toEqual([...NOMS].sort())
    const branchees = Object.entries(branches).flatMap(([d, x]) => Object.keys(x).map((m) => `${d}.${m}`)).sort()
    expect(Object.keys(CONNECTEURS_RELAIS).sort()).toEqual(branchees)
  })

  it('plus aucune méthode « à brancher » : branchée sous /api/relay/, servie sur le téléphone, ou démonstration', async () => {
    const etats = new Set(Object.values(CONNECTEURS_RELAIS).map((c) => c.etat))
    expect([...etats].sort()).toEqual(['branche', 'demo', 'telephone'])
    for (const [cle, c] of Object.entries(CONNECTEURS_RELAIS)) {
      if (c.etat === 'branche') expect(c.route, cle).toMatch(/^(GET|POST|PUT|DELETE) \/api\/relay\//)
      if (c.etat === 'demo') {
        const [d, m] = cle.split('.')
        await expect((branches[d][m] as (...a: unknown[]) => Promise<unknown>)('x'), cle).rejects.toBeInstanceOf(NonDisponible)
      }
    }
    expect(Object.values(CONNECTEURS_RELAIS).filter((c) => c.etat === 'demo')).toHaveLength(4)
  })

  it('chaque méthode branchée appelle la méthode et le chemin de son entrée au registre', async () => {
    const valeur = (nom: string): unknown => (nom === 'o' ? o : nom === 'q' ? { reference: 'BLV-1' } : nom === 'saisie' ? { methode: 'code', valeur: '123456' } : nom === 'b' ? { convention: { signature: null }, pieces: {} } : 'x1')
    for (const [cle, c] of Object.entries(CONNECTEURS_RELAIS)) {
      if (c.etat !== 'branche' || cle === 'horsligne.envoyerFile') continue
      const lecture = (u: string) => (u.includes('/inventory') ? { id: '7', termineA: null } : /\/missions(\?|$)/.test(u) ? [] : u.includes('/me/profile') ? { equipe: [] } : { ok: true })
      const s = serveur((a) => ({ statut: 200, corps: a.methode === 'GET' ? lecture(a.url) : { ok: true } }))
      const [d, m] = cle.split('.')
      const f = (BRANCHES(s.api) as unknown as Record<string, Record<string, (...a: unknown[]) => Promise<unknown>>>)[d][m]
      const noms = /\(([^)]*)\)/.exec(f.toString())?.[1].split(',').map((x) => x.trim().split(/[\s=]/)[0]).filter(Boolean) ?? []
      await f(...noms.map((n) => (n === 'o' ? o : n === 'reponses' || n === 'droits' || n === 'photos' || n === 'semaine' || n === 'pieces' ? [] : valeur(n))))
      const [verbe, chemin] = c.route.split(' ')
      const motif = new RegExp('^http://essai' + chemin.split('?')[0].replace(/\{[^}]+\}/g, '[^/?]+') + '(\\?|$)')
      const appel = s.appels.find((x) => x.methode === verbe && motif.test(x.url))
      expect(appel, `${cle} : ${verbe} ${chemin} (appels : ${s.appels.map((x) => x.methode + ' ' + x.url).join(', ')})`).toBeTruthy()
      if (/\(Idempotency-Key\)/.test(c.route)) expect(appel!.entetes['idempotency-key'], cle).toBe(o.cle)
    }
  })

  it('une action part avec son origine, la clé d’idempotence et le nom de l’appareil', async () => {
    const s = fixe(200, { ok: true })
    await sourceApi(s.api).retrait.remettre('12', '482915', o)
    expect(s.appels[0].url).toBe('http://essai/api/relay/handover/12/complete')
    expect(s.appels[0].entetes['idempotency-key']).toBe(o.cle)
    expect(s.appels[0].entetes['x-device-id']).toBe('appareil-essai-0001')
    expect(JSON.parse(s.appels[0].corps ?? '{}')).toEqual({ pin: '482915', origine: o })
  })

  it('un refus de droits (403 droit_refuse | owner_only) devient le refus « droit_refuse »', async () => {
    for (const code of ['droit_refuse', 'owner_only']) {
      const s = fixe(403, { error: { code, message: 'Réservé au gérant.' } })
      expect(await sourceApi(s.api).relais.demanderFin('activite', o)).toEqual({ ok: false, raison: 'droit_refuse' })
      expect(await sourceApi(s.api).historique.exporter({ periode: 'semaine' })).toEqual({ ok: false, raison: 'droit_refuse' })
    }
  })

  it('DELETE /account/closure : « aucune » du serveur reste « aucune » (accès) et devient « aucune_demande » (mon relais)', async () => {
    const s = fixe(200, { ok: false, raison: 'aucune' })
    expect(await sourceApi(s.api).acces.annulerFin(o)).toEqual({ ok: false, raison: 'aucune' })
    expect(await sourceApi(s.api).relais.annulerFin(o)).toEqual({ ok: false, raison: 'aucune_demande' })
    expect(s.appels[0].methode).toBe('DELETE')
    expect(JSON.parse(s.appels[0].corps ?? '{}').origine).toEqual(o)
  })

  it('une liste paginée (X-Next-Cursor) est lue en entier', async () => {
    const s = serveur((a) => {
      const c = new URL(a.url).searchParams.get('cursor')
      if (!c) return { statut: 200, corps: [{ id: '3' }, { id: '2' }], entetes: { 'X-Next-Cursor': 'p2' } }
      return { statut: 200, corps: [{ id: '1' }] }
    })
    const l = await sourceApi(s.api).notifications.notifications()
    expect(l.map((x) => x.id)).toEqual(['3', '2', '1'])
    expect(s.appels.map((x) => new URL(x.url).searchParams.get('cursor'))).toEqual([null, 'p2'])
  })

  it('le lot confirmé par le livreur quitte les lots annoncés : relu et gardé le jour même (« Lot reçu »)', async () => {
    const lot = { lot: 'PQ-Z3-1', confirmeParLivreurA: null as number | null }
    let annonce = true
    const s = serveur((a) => (/\/missions\?/.test(a.url) ? { statut: 200, corps: annonce ? [lot] : [] } : { statut: 200, corps: { ...lot, confirmeParLivreurA: Date.now() } }))
    const src = sourceApi(s.api)
    expect((await src.reception.lots()).map((x) => x.lot)).toEqual(['PQ-Z3-1'])
    annonce = false
    const l = await src.reception.lots()
    expect(l.map((x) => x.lot)).toEqual(['PQ-Z3-1'])
    expect(l[0].confirmeParLivreurA).toBeTruthy()
  })

  it('photo du serveur « /media/… » : adresse complète sur une autre origine', () => {
    expect(urlMedia('/media/relais/a.jpg', 'http://localhost:8050/api')).toBe('http://localhost:8050/media/relais/a.jpg')
    expect(urlMedia('https://cdn.belivay.com/a.jpg', 'http://localhost:8050/api')).toBe('https://cdn.belivay.com/a.jpg')
    expect(urlMedia(null, 'http://localhost:8050/api')).toBeNull()
    expect(urlMedia('/media/a.jpg', '/api')).toBe('/media/a.jpg')
  })

  it('404 → null sur une lecture « … | null » ; GET /inventory sans inventaire → null', async () => {
    const s = fixe(404, { error: { code: 'not_found', message: 'Introuvable.' } })
    expect(await sourceApi(s.api).retrait.remise('9')).toBeNull()
    expect(await sourceApi(s.api).incidents.verifierRetour('RT-1')).toEqual({ ok: false, raison: 'introuvable' })
    expect(await sourceApi(fixe(200, null).api).stock.inventaire()).toBeNull()
  })
})

describe('file hors connexion du téléphone', () => {
  it('la charge part sans PIN, avec la preuve HMAC de la clé de l’appareil ; le bilan du serveur range la file', async () => {
    const memoire = new Map<string, string>()
    globalThis.localStorage = { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v), removeItem: (k: string) => void memoire.delete(k) } as unknown as Storage
    memoire.set('blv_r_cle_hl', 'cle-appareil-essai')
    const t = Date.now()
    const s = serveur((a) =>
      a.url.endsWith('/relay/sync/batch')
        ? { statut: 200, corps: { a: t, envoyees: 1, refusees: 1, resultats: [{ cle: 'geste-signe-0001', ok: true, raison: null }, { cle: 'paiement-0002', ok: false, raison: 'reseau_requis' }] } }
        : { statut: 200, corps: { expirationH: 72, photoMaxKo: 400, remisesHorsLigneParJour: 5, papierSaisieH: 24 } },
    )
    const src = sourceApi(s.api)
    const o1: Origine = { cle: 'geste-signe-0001', heure: t - 2000, position: null }
    const o2: Origine = { cle: 'paiement-0002', heure: t - 1000, position: null }
    await src.horsligne.mettreEnFile('remise', '12', o1, { charge: { domaine: 'retrait', methode: 'remettre', args: ['12', 'preuve-pin:1:abcd', o1] }, appliquee: true })
    await src.horsligne.mettreEnFile('remise', '12', o2, { charge: { domaine: 'retrait', methode: 'demanderPaiement', args: ['12', o2] } })
    const bilan = await src.horsligne.envoyerFile()
    expect(bilan).toEqual({ a: t, envoyees: 1, refusees: 1 })
    const lot = s.appels.find((x) => x.url.endsWith('/relay/sync/batch'))
    const actions = JSON.parse(lot?.corps ?? '{}').actions
    expect(actions.map((x: { origine: Origine }) => x.origine.cle)).toEqual(['geste-signe-0001', 'paiement-0002'])
    expect(actions[0].preuve).toBe(await signer('cle-appareil-essai', 'geste-signe-0001'))
    expect(actions[1].preuve).toBeUndefined()
    expect(JSON.stringify(actions)).not.toContain('482915')
    const f = await src.horsligne.file()
    expect(f.actions.map((x) => [x.etat, x.motif])).toEqual([
      ['envoyee', null],
      ['refusee', 'reseau_requis'],
    ])
    expect(f.remisesHorsLigneDuJour).toBe(1)
  })
})
