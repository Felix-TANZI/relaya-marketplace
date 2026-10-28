// La console en mode API (VITE_SOURCE=api) contre le VRAI serveur : le projet d'essai du kit (backend-kit/_essai, Django
// + apps.console et les applications du kit), lancé par pw-api.config.ts (serveur 8060, base essai-console.sqlite3 neuve,
// charger_demo puis charger_demo_console ; console 5230).
//   npx playwright test -c pw-api.config.ts
// Chaque parcours passe par les écrans de la console (ou src/donnees/source.ts → src/api/domaines → client HTTP) et par
// les vraies routes du kit. Les employés sont ceux du jeu d'essai (apps/console/demo.py) : mot de passe d'essai, second
// facteur calculé ici comme une application d'authentification (même clé que demo.CLE_DEMO), code de secours par SMS
// relu par /api/_essai/codes.
import { createHmac } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { OUVERTES, adresse } from './commun'

const API = `http://localhost:${process.env.PORT_API_ADMIN || 8060}/api`
const MDP = 'Essai-BelivaY-2026' // backend-kit/apps/console/demo.py (MOT_DE_PASSE)
const CLE = 'JBSWY3DPEHPK3PXPJBSWY3DP' // backend-kit/apps/console/demo.py (CLE_DEMO, sans espaces)
export const EMPLOYES = {
  direction: 'franck@belivay.com',
  direction2: 'helene@belivay.com',
  finance: 'nadege@belivay.com',
  support: 'clarisse@belivay.com',
  mediation: 'mireille@belivay.com',
  operations: 'yannick@belivay.com',
  verification: 'armand@belivay.com',
  audit: 'beatrice@belivay.com',
  terrain: 'stephane@belivay.com',
  rh: 'pauline@belivay.com',
} as const

test.describe.configure({ mode: 'serial' })

/** Code TOTP (RFC 6238 : HMAC-SHA1, 6 chiffres, pas de 30 s) de la clé de démonstration, comme une application. */
export function totp(cle = CLE, t = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of cle) bits += alphabet.indexOf(c).toString(2).padStart(5, '0')
  const octets = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)))
  const compteur = Buffer.alloc(8)
  compteur.writeBigUInt64BE(BigInt(Math.floor(t / 1000 / 30)))
  const h = createHmac('sha1', octets).update(compteur).digest()
  const o = h[h.length - 1] & 0x0f
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}

async function limites(request: APIRequestContext) {
  await request.post(`${API}/_essai/limites`)
}

/** Jetons d'un employé par les vraies routes de connexion (étape 1, puis second facteur). */
async function jetons(request: APIRequestContext, email: string) {
  await limites(request)
  const e = await (await request.post(`${API}/console/auth/login`, { data: { identifiant: email, motDePasse: MDP, appareil: 'appareil-recette' } })).json()
  expect(e.ok, `étape 1 de ${email} : ${JSON.stringify(e)}`).toBe(true)
  const c = await (await request.post(`${API}/console/auth/code`, { data: { etape: e.etape, code: totp(), appareil: 'appareil-recette' } })).json()
  expect(c.ok, `second facteur de ${email} : ${JSON.stringify(c)}`).toBe(true)
  return { acces: c.jetons.access as string, rafraichissement: c.jetons.refresh as string }
}

/** Une page de la console ouverte au nom de cet employé (jetons posés avant le premier script). */
async function pageDe(browser: import('@playwright/test').Browser, request: APIRequestContext, email: string) {
  const j = await jetons(request, email)
  const page = await browser.newPage()
  await page.addInitScript(
    ([cle, v]) => {
      if (!sessionStorage.getItem('blv_a_recette')) {
        sessionStorage.setItem('blv_a_recette', '1')
        localStorage.setItem(cle, v)
      }
    },
    ['blv_api_jetons', JSON.stringify(j)],
  )
  return page
}

/** Erreurs de la page : exceptions non rattrapées, méthodes non branchées (avertissement « [non branché] »), réponses 5xx du
 * kit. Aucune n'est permise. */
function surveiller(page: Page) {
  const erreurs: string[] = []
  const ici = () => page.url().replace(/^.*\/admin\//, '/')
  page.on('pageerror', (e) => erreurs.push(`${ici()} : ${e.message}`))
  page.on('console', (m) => {
    if (m.text().startsWith('[non branché]')) erreurs.push(`${ici()} : ${m.text()}`)
  })
  page.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 500) erreurs.push(`${ici()} : ${r.status()} ${r.request().method()} ${r.url().slice(API.length)}`)
  })
  return erreurs
}

/** Appelle `domaine.methode` de la source de la console (le même module que les écrans) dans la page. */
async function src<T = unknown>(page: Page, cle: string, ...args: unknown[]): Promise<T> {
  const r = (await page.evaluate(
    async ([c, a]) => {
      const [d, m] = (c as string).split('.')
      const mod = (await import(/* @vite-ignore */ '/admin/src/donnees/source.ts')) as { source: Record<string, Record<string, (...x: unknown[]) => Promise<unknown>>> }
      try {
        return { ok: true, v: await mod.source[d][m](...(a as unknown[])) }
      } catch (e) {
        return { ok: false, nom: (e as Error).name, message: (e as Error).message }
      }
    },
    [cle, args] as const,
  )) as { ok: boolean; v?: unknown; nom?: string; message?: string }
  if (!r.ok) throw new Error(`${cle} : ${r.nom} ${r.message}`)
  return r.v as T
}

/** Appelle une fonction de Mon compte (src/donnees/mon-compte.ts, le module de l'écran) dans la page. */
async function compte<T = unknown>(page: Page, fn: string, ...args: unknown[]): Promise<T> {
  return (await page.evaluate(
    async ([f, a]) => {
      const mod = (await import(/* @vite-ignore */ '/admin/src/donnees/mon-compte.ts')) as Record<string, (...x: unknown[]) => Promise<unknown>>
      return mod[f as string](...(a as unknown[]))
    },
    [fn, args] as const,
  )) as T
}

async function codeRecu(request: APIRequestContext, destination: string): Promise<string> {
  const r = await request.get(`${API}/_essai/codes`, { params: { destination } })
  expect(r.ok(), `code envoyé à ${destination}`).toBe(true)
  return (await r.json()).code as string
}

const MOTIF = 'Recette de bout en bout de la console contre le kit : motif écrit et assez long pour le registre.'

/** Une page ouverte au nom de l'employé, sur la File d'action (le module de la source est chargé). */
async function ouvrir(browser: import('@playwright/test').Browser, request: APIRequestContext, email: string) {
  const page = await pageDe(browser, request, email)
  const erreurs = surveiller(page)
  await page.goto(adresse('file'))
  await page.waitForLoadState('networkidle')
  return { page, erreurs }
}

async function sansErreurDeLecture(page: Page, route: string) {
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/Impossible de charger/), `${route} : une lecture a échoué`).toHaveCount(0)
}

test('connexion d’un agent par les écrans : mot de passe, second facteur, arrivée', async ({ page, request }) => {
  await limites(request)
  const erreurs = surveiller(page)
  await page.goto('connexion')
  await page.getByLabel('Identifiant nominatif').fill(EMPLOYES.direction)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MDP)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.getByLabel('Code à 6 chiffres').fill(totp())
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByText('Bonjour Franck')).toBeVisible()
  await page.getByRole('button', { name: /Ouvrir la file d’action|Reprendre la page demandée/ }).click()
  await sansErreurDeLecture(page, 'file')
  expect(erreurs).toEqual([])
})

test('toutes les pages s’ouvrent sans erreur pour la Direction', async ({ browser, request }) => {
  test.setTimeout(600_000)
  const page = await pageDe(browser, request, EMPLOYES.direction)
  const erreurs = surveiller(page)
  const echecs: string[] = []
  for (const r of OUVERTES) {
    if (r === 'connexion' || r === 'activation') continue
    await limites(request) // en essai, chaque lecture croisée a sa requête préalable (CORS), comptée « anonyme » par adresse
    await page.goto(adresse(r))
    await page.waitForLoadState('networkidle')
    const n = await page.getByText(/Impossible de charger/).count()
    if (n) echecs.push(`${r} : ${(await page.getByText(/Impossible de charger/).first().textContent())?.trim()}`)
  }
  const tout = [...echecs, ...new Set(erreurs)]
  expect(tout, tout.join('\n')).toEqual([])
  await page.close()
})

test('files : cartes du rôle, verrou, délégation à un agent qui peut les traiter', async ({ browser, request }) => {
  const { page, erreurs } = await ouvrir(browser, request, EMPLOYES.direction)
  const cartes = await src<{ id: string; famille: string; confieA: string | null }[]>(page, 'files.file')
  expect(Array.isArray(cartes)).toBe(true)
  const ind = await src<{ jour: { commandes: number } }>(page, 'files.indicateurs')
  expect(typeof ind.jour.commandes).toBe('number')
  const delegues = await src<{ agentId: string; familles: string[] }[]>(page, 'files.delegues')
  expect(delegues.length).toBeGreaterThan(0)
  expect(await src(page, 'files.deleguer', [], delegues[0].agentId, 'x')).toMatchObject({ ok: false, raison: 'motif_court' })
  if (cartes.length) {
    const v = await src<{ ok: boolean }>(page, 'files.ouvrir', cartes[0].id)
    expect(v.ok).toBe(true)
    await src(page, 'files.liberer', cartes[0].id)
    const r = await src<{ ok: boolean; n: number }>(page, 'files.deleguer', [cartes[0].id], delegues[0].agentId, MOTIF)
    expect(r.ok).toBe(true)
  }
  expect(erreurs).toEqual([])
  await page.close()
})

test('quatre yeux : blocage de l’accès d’un vendeur demandé, contresigné par une autre Direction, puis rétabli', async ({ browser, request }) => {
  const a = await ouvrir(browser, request, EMPLOYES.direction)
  const vendeurs = await src<{ id: string; nom: string; zone: string }[]>(a.page, 'acteurs.vendeurs')
  const v = vendeurs.find((x) => x.nom === 'Tonton PG') ?? vendeurs[0]
  expect(v, 'une boutique du jeu de démonstration').toBeTruthy()
  const avant = await src<{ etat: string; peutChanger: boolean; quatreYeux: boolean }>(a.page, 'acteurs.accesActeur', 'vendeur', v.id, v.zone)
  expect(avant).toMatchObject({ etat: 'autorise', quatreYeux: true })
  const d = await src<{ ok: boolean; etat: string; id: string }>(a.page, 'acteurs.changerAcces', { espace: 'vendeur', acteurId: v.id, nom: v.nom, zone: v.zone, etat: 'bloque', motif: MOTIF })
  expect(d).toMatchObject({ ok: true, etat: 'a_contresigner' })
  expect(await src(a.page, 'quatreyeux.contresigner', d.id, MOTIF)).toMatchObject({ ok: false, raison: 'meme_compte' })
  const b = await ouvrir(browser, request, EMPLOYES.direction2)
  const attente = await src<{ id: string }[]>(b.page, 'quatreyeux.enAttente')
  expect(attente.some((x) => x.id === d.id)).toBe(true)
  expect(await src(b.page, 'quatreyeux.contresigner', d.id, MOTIF)).toMatchObject({ ok: true, etat: 'contresignee' })
  expect(await src(a.page, 'acteurs.accesActeur', 'vendeur', v.id, v.zone)).toMatchObject({ etat: 'bloque', demande: null })
  expect(await src(a.page, 'acteurs.changerAcces', { espace: 'vendeur', acteurId: v.id, nom: v.nom, zone: v.zone, etat: 'autorise', motif: MOTIF })).toMatchObject({ ok: true, etat: 'appliquee' })
  expect(await src(a.page, 'acteurs.accesActeur', 'vendeur', v.id, v.zone)).toMatchObject({ etat: 'autorise' })
  expect([...a.erreurs, ...b.erreurs]).toEqual([])
  await a.page.close()
  await b.page.close()
})

test('postes de décision : les sept genres se lisent, chaque dossier présent s’ouvre', async ({ browser, request }) => {
  const { page, erreurs } = await ouvrir(browser, request, EMPLOYES.direction)
  for (const genre of ['litige', 'kyc', 'remboursement', 'sanction', 'constat', 'kit', 'signalement']) {
    const file = await src<{ id: string }[]>(page, 'decisions.file', genre)
    expect(Array.isArray(file), genre).toBe(true)
    if (file.length) {
      const d = await src<{ issues: unknown[] } | null>(page, 'decisions.dossier', genre, file[0].id)
      expect(d, `${genre} ${file[0].id}`).not.toBeNull()
    }
  }
  expect(Array.isArray(await src(page, 'decisions.file'))).toBe(true)
  expect(Array.isArray(await src(page, 'decisions.ecarts'))).toBe(true)
  expect(erreurs).toEqual([])
  await page.close()
})

test('gouvernance et paramètres : journal signé, chaîne, fraude ; proposition préparée, soumise, retirée', async ({ browser, request }) => {
  const { page, erreurs } = await ouvrir(browser, request, EMPLOYES.direction)
  const ps = await src<{ code: string; statut: string; famille: string; proposable: boolean; valeur: string }[]>(page, 'pilotage.parametres')
  expect(ps.find((x) => x.code === 'LIV-R')).toMatchObject({ statut: 'Décidé' })
  const p = ps.find((x) => x.code === 'RAPPORT-ECHANTILLON-MIN')!
  const r = await src<{ ok: boolean; id: string }>(page, 'pilotage.preparer', { code: p.code, apres: 40, dateEffet: Date.now() + 10 * 86_400_000, motif: MOTIF, reference: 'DP-RECETTE' })
  expect(r.ok, JSON.stringify(r)).toBe(true)
  const prop = (await src<{ id: string; etat: string; simulation: { controles: unknown[] } }[]>(page, 'pilotage.propositions')).find((x) => x.id === r.id)!
  expect(prop.simulation.controles.length).toBeGreaterThan(0)
  if (prop.etat === 'simulee') expect(await src(page, 'pilotage.soumettre', r.id)).toMatchObject({ ok: true, etat: 'a_contresigner' })
  expect(await src(page, 'pilotage.retirer', r.id)).toMatchObject({ ok: true })
  expect((await src<{ id: string; etat: string }[]>(page, 'pilotage.propositions')).find((x) => x.id === r.id)!.etat).toBe('retiree')
  const j = await src<{ n: number; action: string }[]>(page, 'gouvernance.journal', { limite: 20 })
  expect(j.length).toBeGreaterThan(0)
  expect(await src(page, 'gouvernance.verifierChaine')).toMatchObject({ ok: true })
  const l = await src<{ action: string }>(page, 'gouvernance.ecrire', { action: 'export.csv', objet: 'Recette · a1b2c3d4' })
  expect(l.action).toBe('export.csv')
  expect(Array.isArray((await src<{ alertes: unknown[] }>(page, 'gouvernance.fraude')).alertes)).toBe(true)
  const mods = await src<{ code: string; parametres: unknown[] }[]>(page, 'pilotage.modules')
  expect(mods.length).toBeGreaterThan(0)
  expect(erreurs).toEqual([])
  await page.close()
})

test('équipe et accès : tableau, qui peut quoi, fiche d’un membre ; sessions ; voir comme le client', async ({ browser, request }) => {
  const rh = await ouvrir(browser, request, EMPLOYES.rh)
  const t = await src<{ membres: { agent: { id: string } }[] }>(rh.page, 'equipe.tableau')
  expect(t.membres.length).toBeGreaterThan(5)
  expect(await src(rh.page, 'equipe.membre', t.membres[0].agent.id)).not.toBeNull()
  expect(await src(rh.page, 'equipe.quiPeut')).toBeTruthy()
  const s = await src<{ sessions: { courante: boolean }[]; verrouillage: { avant: number } }>(rh.page, 'equipe.mesSessions')
  expect(s.sessions.length).toBeGreaterThan(0)
  const sup = await ouvrir(browser, request, EMPLOYES.support)
  const clients = await src<{ id: string }[]>(sup.page, 'acteurs.clients')
  expect(clients.length, 'clients du jeu de démonstration').toBeGreaterThan(0)
  expect(await src(sup.page, 'equipe.ouvrirVueClient', clients[0].id, 'x')).toMatchObject({ ok: false, raison: 'motif_court' })
  expect(await src(sup.page, 'equipe.ouvrirVueClient', clients[0].id, MOTIF)).toMatchObject({ ok: true })
  const v = await src<{ client: string; commandes: unknown[] }>(sup.page, 'equipe.vueClient', clients[0].id)
  expect(v.client).toMatch(/^Client •••/)
  expect([...rh.erreurs, ...sup.erreurs]).toEqual([])
  await rh.page.close()
  await sup.page.close()
})

test('contenu du site, promotions de la plateforme, abonnements', async ({ browser, request }) => {
  const { page, erreurs } = await ouvrir(browser, request, EMPLOYES.direction)
  const c = await src<{ version: number; moments: { id: string; actif: boolean; du: string; au: string }[]; categories: { id: string; enAvant: boolean }[] }>(page, 'pilotage.contenuSite')
  const r = await src<{ ok: boolean; version: number }>(page, 'pilotage.publierContenu', { moments: c.moments.map(({ id, actif, du, au }) => ({ id, actif, du, au })), categories: c.categories.filter((x) => x.enAvant).map((x) => x.id) }, MOTIF)
  expect(r, JSON.stringify(r)).toMatchObject({ ok: true })
  expect((await src<{ version: number }>(page, 'pilotage.contenuSite')).version).toBeGreaterThan(c.version)
  const vp = await src<{ remiseMaxPct: number }>(page, 'pilotage.promotionsPlateforme')
  const fin = Date.now() + 3 * 86_400_000
  const p = await src<{ ok: boolean; id: string }>(page, 'pilotage.creerPromotion', { titre: 'Recette · semaine de la console', remise: { genre: 'pourcentage', pct: Math.min(5, vp.remiseMaxPct) }, debut: Date.now() + 86_400_000, fin, cible: { genre: 'toutes' } }, MOTIF)
  expect(p, JSON.stringify(p)).toMatchObject({ ok: true })
  expect(await src(page, 'pilotage.lancerPromotion', p.id, MOTIF)).toMatchObject({ ok: true })
  expect(await src(page, 'pilotage.arreterPromotion', p.id, MOTIF)).toMatchObject({ ok: true })
  const promos = await src<{ promotions: { id: string; etat: string }[] }>(page, 'pilotage.promotionsPlateforme')
  expect(promos.promotions.find((x) => x.id === p.id)?.etat).toMatch(/arretee|terminee/)
  expect(Array.isArray((await src<{ flashes: unknown[] }>(page, 'pilotage.promotions')).flashes)).toBe(true)
  const ab = await src<{ liste: unknown[] }>(page, 'acteurs.abonnements')
  expect(Array.isArray(ab.liste)).toBe(true)
  expect(erreurs).toEqual([])
  await page.close()
})

test('Mon compte : nom confirmé par un code, e-mail changé par un code, mot de passe ; zones v2', async ({ browser, request }) => {
  const email = 'paul@belivay.com'
  const { page, erreurs } = await ouvrir(browser, request, email)
  const n = await compte<{ ok: boolean; vers: string | null }>(page, 'demanderCodeNom')
  expect(n.ok).toBe(true)
  expect(await compte(page, 'changerNom', '', 'Paul', 'Ndongo-Essai', await codeRecu(request, '690000150'), email)).toMatchObject({ ok: true })
  const neuf = `paul.recette.${Date.now().toString(36)}@belivay.com`
  expect(await compte(page, 'demanderCode', '', 'email', neuf, email)).toMatchObject({ ok: true })
  expect(await compte(page, 'confirmerCode', '', 'email', await codeRecu(request, neuf), email)).toMatchObject({ ok: true })
  expect(await compte(page, 'changerMotDePasse', '', true, 'faux-mot-de-passe-1', 'Nouveau-2026-x', neuf)).toMatchObject({ ok: false })
  // Zones v2 : la carte des douze zones du kit est celle de l'appli (logique-metier/livraison/zones-yaounde.geo.json).
  const z = await src<{ code: string; nom: string }[]>(page, 'logistique.zones')
  expect(z.map((x) => x.code)).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'Z10', 'Z11', 'Z12'])
  const geo = (await page.evaluate(async () => (await import(/* @vite-ignore */ '/admin/src/calculs/zones.ts')) as Record<string, unknown>)) as Record<string, unknown>
  expect(geo).toBeTruthy()
  expect(erreurs).toEqual([])
  await page.close()
})

for (const [role, email] of [['Finance', EMPLOYES.finance], ['Service client', EMPLOYES.support], ['Opérations', EMPLOYES.operations], ['Audit', EMPLOYES.audit]] as const) {
  test(`toutes les pages de son rôle s’ouvrent sans erreur : ${role}`, async ({ browser, request }) => {
    test.setTimeout(600_000)
    const page = await pageDe(browser, request, email)
    const erreurs = surveiller(page)
    const echecs: string[] = []
    for (const r of OUVERTES) {
      if (r === 'connexion' || r === 'activation') continue
      await limites(request) // en essai, chaque lecture croisée a sa requête préalable (CORS), comptée « anonyme » par adresse
      await page.goto(adresse(r))
      await page.waitForLoadState('networkidle')
      const n = await page.getByText(/Impossible de charger/).count()
      if (n) echecs.push(`${r} : ${(await page.getByText(/Impossible de charger/).first().textContent())?.trim()}`)
    }
    const tout = [...echecs, ...new Set(erreurs)]
    expect(tout, tout.join('\n')).toEqual([])
    await page.close()
  })
}
