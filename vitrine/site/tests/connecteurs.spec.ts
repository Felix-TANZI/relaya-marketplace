// Connecteurs vers le serveur (src/config/env.ts, src/api/) : la démonstration reste la source par défaut, le
// client HTTP rafraîchit le jeton sur un 401 et rejoue la requête, et chaque méthode de Source a son connecteur
// (branché, ou route attendue écrite dans CONNECTEURS.md).
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { creerClient, stockageMemoire } from '../src/api/client'
import { ErreurApi, ErreurNonAuthentifie, ErreurServeur, ErreurTropDeRequetes, ErreurValidation, NonDisponible } from '../src/api/erreurs'
import { reponseSpeciale } from '../src/api/reponses-speciales'
import { CONNECTEURS } from '../src/api/routes'
import { creerSourceApi, domainesApi } from '../src/api/source-api'
import { ErreurConfiguration, lireEnv } from '../src/config/env'

// ——— Environnement ———

test('sans variable, la source est la démonstration', () => {
  const e = lireEnv({})
  expect(e.source).toBe('demo')
  expect(e.apiUrl).toBeNull()
  expect(lireEnv({ VITE_SOURCE: '' }).source).toBe('demo')
})

test('« api » sans adresse, ou une valeur inconnue, arrête le démarrage avec un message clair', () => {
  expect(() => lireEnv({ VITE_SOURCE: 'api' })).toThrow(ErreurConfiguration)
  expect(() => lireEnv({ VITE_SOURCE: 'api' })).toThrow(/VITE_API_URL/)
  expect(() => lireEnv({ VITE_SOURCE: 'prod' })).toThrow(/VITE_SOURCE/)
  expect(() => lireEnv({ VITE_SOURCE: 'api', VITE_API_URL: 'http://belivay.com/api', PROD: true })).toThrow(/HTTPS/)
  const e = lireEnv({ VITE_SOURCE: 'api', VITE_API_URL: 'https://belivay.com/api/' })
  expect(e.source).toBe('api')
  expect(e.apiUrl).toBe('https://belivay.com/api')
})

test('le site servi tourne sur la démonstration', async ({ page }) => {
  await page.goto('/')
  // Serveur de développement : le module de la source se charge tel quel ; build : on vérifie le bandeau de données.
  const nom = await page.evaluate(async () => {
    try {
      const m = await import(/* @vite-ignore */ '/src/donnees/source.ts')
      return (m as { source: { nom: string } }).source.nom
    } catch {
      return null
    }
  })
  if (nom !== null) expect(nom).toBe('démonstration')
  else expect(await page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('blv')))).toBe(true)
})

// ——— Client HTTP (fetch simulé) ———

type Appel = { url: string; methode: string; entetes: Record<string, string>; corps: unknown }
function serveur(reponses: ((a: Appel) => Response | Promise<Response>)[]) {
  const appels: Appel[] = []
  const f = (async (url: string, init: RequestInit) => {
    const a: Appel = {
      url: String(url),
      methode: init.method ?? 'GET',
      entetes: init.headers as Record<string, string>,
      corps: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
    }
    appels.push(a)
    const r = reponses.shift()
    if (!r) throw new Error(`appel inattendu : ${a.methode} ${a.url}`)
    return r(a)
  }) as unknown as typeof fetch
  return { f, appels }
}
const json = (statut: number, corps: unknown, h: Record<string, string> = {}) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json', ...h } })

const options = (f: typeof fetch, jetons = stockageMemoire({ acces: 'vieux', rafraichissement: 'r1' })) => ({
  baseUrl: 'https://api.test/api',
  fetch: f,
  stockage: jetons,
  attendre: async () => {},
  langue: () => 'fr',
  appareil: () => 'appareil-1',
})

test('401 → rafraîchissement du jeton → la requête est rejouée avec le nouveau jeton', async () => {
  const { f, appels } = serveur([
    () => json(401, { detail: 'Given token not valid for any token type', code: 'token_not_valid' }),
    () => json(200, { access: 'neuf', refresh: 'r2' }),
    () => json(200, { id: 7, email: 'carine@example.com' }),
  ])
  const jetons = stockageMemoire({ acces: 'vieux', rafraichissement: 'r1' })
  const api = creerClient(options(f, jetons))
  const moi = await api.get<{ id: number }>('/auth/me/')
  expect(moi.id).toBe(7)
  expect(appels.map((a) => `${a.methode} ${a.url}`)).toEqual([
    'GET https://api.test/api/auth/me/',
    'POST https://api.test/api/auth/refresh/',
    'GET https://api.test/api/auth/me/',
  ])
  expect(appels[0].entetes.Authorization).toBe('Bearer vieux')
  expect(appels[1].corps).toEqual({ refresh: 'r1' })
  expect(appels[1].entetes.Authorization).toBeUndefined()
  expect(appels[2].entetes.Authorization).toBe('Bearer neuf')
  expect(appels[2].entetes['Accept-Language']).toBe('fr')
  expect(appels[2].entetes['X-Device-Id']).toBe('appareil-1')
  expect(jetons.lire()).toEqual({ acces: 'neuf', rafraichissement: 'r2' })
})

test('plusieurs 401 en même temps : un seul rafraîchissement', async () => {
  let rafraichissements = 0
  const f = (async (url: string, init: RequestInit) => {
    if (String(url).endsWith('/auth/refresh/')) {
      rafraichissements++
      await new Promise((r) => setTimeout(r, 20))
      return json(200, { access: 'neuf' })
    }
    const h = init.headers as Record<string, string>
    return h.Authorization === 'Bearer neuf' ? json(200, { ok: true }) : json(401, { detail: 'expiré' })
  }) as unknown as typeof fetch
  const api = creerClient(options(f))
  const r = await Promise.all([api.get('/a/'), api.get('/b/'), api.get('/c/')])
  expect(r).toEqual([{ ok: true }, { ok: true }, { ok: true }])
  expect(rafraichissements).toBe(1)
})

test('rafraîchissement refusé : session perdue, jetons effacés, erreur typée', async () => {
  const { f } = serveur([() => json(401, { detail: 'expiré' }), () => json(401, { detail: 'Token is invalid or expired' })])
  const jetons = stockageMemoire({ acces: 'vieux', rafraichissement: 'r1' })
  let perdue = 0
  const api = creerClient({ ...options(f, jetons), surSessionPerdue: () => perdue++ })
  await expect(api.get('/auth/me/')).rejects.toBeInstanceOf(ErreurNonAuthentifie)
  expect(perdue).toBe(1)
  expect(jetons.lire()).toBeNull()
})

test('nouvelles tentatives sur une lecture seulement ; clé d’idempotence sur un paiement ; erreurs par champ', async () => {
  const { f, appels } = serveur([
    () => json(503, {}),
    () => json(200, [1]),
    () => json(503, {}),
    () => json(400, { old_password: ['Mot de passe actuel incorrect.'] }),
  ])
  const api = creerClient(options(f))
  expect(await api.get('/catalog/products/')).toEqual([1])
  await expect(api.post('/payments/v2/me/payments/PAY-1/pay/', { payer_operator: 'MTN' }, { idempotence: 'commande-1-essai-1' })).rejects.toBeInstanceOf(ErreurServeur)
  expect(appels.filter((a) => a.methode === 'POST')).toHaveLength(1) // jamais rejouée
  expect(appels[2].entetes['Idempotency-Key']).toBe('commande-1-essai-1')
  const e = await api.post('/auth/change-password/', {}).catch((x) => x)
  expect(e).toBeInstanceOf(ErreurValidation)
  expect((e as ErreurValidation).champs.old_password).toEqual(['Mot de passe actuel incorrect.'])
})

// ——— Couverture de Source ———

const methodesDeSource = () => {
  const t = readFileSync(new URL('../src/donnees/source.ts', import.meta.url), 'utf8')
  const bloc = t.slice(t.indexOf('export interface Source {'), t.indexOf('\n}\n', t.indexOf('export interface Source {')))
  return [...bloc.matchAll(/^ {2}([a-zA-Z]+)\(/gm)].map((m) => m[1])
}

test('chaque méthode de Source a son connecteur, et CONNECTEURS.md les nomme toutes', async () => {
  const methodes = methodesDeSource()
  expect(methodes.length).toBeGreaterThan(150)
  expect(Object.keys(CONNECTEURS).sort()).toEqual([...methodes].sort())

  // Branchée ⇔ « branche » ou « partiel » dans le registre : on appelle chaque méthode avec un faux client.
  const refus = () => Promise.reject(new Error('appel'))
  const api = creerSourceApi({
    requete: refus,
    get: refus,
    post: refus,
    put: refus,
    patch: refus,
    supprimer: refus,
    jetons: { lire: () => null, ecrire: () => {}, rafraichir: async () => false },
  }, { interrupteurs: {} as never })
  for (const m of methodes) {
    const r = await (api as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[m]().then(
      () => 'ok',
      (e) => e,
    )
    const branchee = !(r instanceof NonDisponible)
    const etat = CONNECTEURS[m as keyof typeof CONNECTEURS].etat
    expect(`${m} : ${branchee ? 'branchée' : 'NonDisponible'}`).toBe(`${m} : ${etat === 'branche' || etat === 'partiel' ? 'branchée' : 'NonDisponible'}`)
  }

  const doc = readFileSync(new URL('../CONNECTEURS.md', import.meta.url), 'utf8')
  for (const m of methodes) expect(doc, `CONNECTEURS.md : ${m}`).toContain(`\`${m}\``)
})

test('une seule implémentation par méthode : aucun domaine ne redéfinit la méthode d’un autre, rien d’écrit dans l’assemblage', () => {
  const refus = () => Promise.reject(new Error('appel'))
  const faux = { requete: refus, get: refus, post: refus, put: refus, patch: refus, supprimer: refus, jetons: { lire: () => null, ecrire: () => {}, rafraichir: async () => false } }
  const domaines = domainesApi(faux, { interrupteurs: {} as never })
  const vu = new Map<string, string>()
  const doublons: string[] = []
  for (const [domaine, methodes] of Object.entries(domaines)) {
    for (const m of Object.keys(methodes)) {
      const avant = vu.get(m)
      if (avant) doublons.push(`${m} : ${avant} et ${domaine}`)
      else vu.set(m, domaine)
    }
  }
  expect(doublons).toEqual([])
  // Chaque méthode branchée vient d'un domaine ; l'assemblage n'en écrit aucune lui-même.
  const assemblage = readFileSync(new URL('../src/api/source-api.ts', import.meta.url), 'utf8')
  const corps = assemblage.slice(assemblage.indexOf('const branchees = {'), assemblage.indexOf('} satisfies Partial<Source>'))
  expect(corps.replace(/\.\.\.d\.\w+,|nom: 'api',|const branchees = \{|\/\/[^\n]*/g, '').trim()).toBe('')
  const methodes = methodesDeSource()
  for (const m of vu.keys()) expect(methodes, `méthode inconnue de Source : ${m}`).toContain(m)
})

// ——— Réponses spéciales (src/api/reponses-speciales.ts, traitées par src/composants/AvisErreurs.tsx) ———

test('réponses spéciales : prix changé au paiement, 3-D Secure, 429 avec délai, 401 sans rafraîchissement', async () => {
  const { f } = serveur([
    () => json(409, { error: { code: 'price_changed', message: 'Un prix a changé.', data: { lignes: [{ id: 'l1', avant: 1000, apres: 1200 }] } } }),
    () => json(422, { error: { code: 'action_requise', message: 'Ta banque demande une confirmation (3-D Secure).', data: { redirection: 'https://3ds.exemple/R1' } } }),
    () => json(429, { error: { code: 'too_early', message: 'Trop tôt.' } }, { 'Retry-After': '42' }),
    () => json(401, { detail: 'Given token not valid for any token type' }),
  ])
  const vues: { nom: string; detail: Record<string, unknown> }[] = []
  let perdue = 0
  const jetons = stockageMemoire({ acces: 'vieux', rafraichissement: null })
  const api = creerClient({
    ...options(f, jetons),
    tentatives: 0,
    surSessionPerdue: () => perdue++,
    surErreur: (e, r) => {
      const s = reponseSpeciale(e, r)
      if (s) vues.push(s)
    },
  })
  const e1 = await api.post('/checkout', {}, { idempotence: 'k' }).catch((x) => x)
  expect(e1).toBeInstanceOf(ErreurApi)
  expect((e1 as ErreurApi).code).toBe('price_changed')
  const e2 = await api.post('/me/subscription', {}).catch((x) => x)
  expect((e2 as ErreurApi).code).toBe('action_requise')
  const e3 = await api.post('/wishlists/ABC/remind', {}).catch((x) => x)
  expect(e3).toBeInstanceOf(ErreurTropDeRequetes)
  expect((e3 as ErreurTropDeRequetes).reessayerDans).toBe(42)
  const e4 = await api.get('/me').catch((x) => x)
  expect(e4).toBeInstanceOf(ErreurNonAuthentifie)
  expect(perdue).toBe(1)
  expect(jetons.lire()).toBeNull()
  expect(vues).toEqual([
    { nom: 'blv:prix-change', detail: { data: { lignes: [{ id: 'l1', avant: 1000, apres: 1200 }] } } },
    { nom: 'blv:action-requise', detail: { redirection: 'https://3ds.exemple/R1', data: { redirection: 'https://3ds.exemple/R1' } } },
  ])
  // Un 409 price_changed hors du paiement du panier (cadeau, changement de relais) reste à l'écran qui l'attend.
  expect(reponseSpeciale({ statut: 409, code: 'price_changed', data: null }, { methode: 'PUT', chemin: '/orders/1/relais' })).toBeNull()
  // Une adresse de banque non https n'est jamais suivie.
  expect(reponseSpeciale({ statut: 422, code: 'action_requise', data: { redirection: 'javascript:alert(1)' } }, { methode: 'POST', chemin: '/x' })?.detail.redirection).toBeNull()
})
