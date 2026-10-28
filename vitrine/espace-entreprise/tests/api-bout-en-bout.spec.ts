// L'espace entreprise en mode API (VITE_SOURCE=api) contre le VRAI serveur : le projet d'essai du kit
// (backend-kit/_essai, Django + les applications entreprise_*, livreur_* et tout le kit), lancé par pw-api.config.ts
// (serveur 8030, base essai-entreprise.sqlite3 neuve ; appli 5200).
//   npx playwright test -c pw-api.config.ts
// Chaque parcours passe par les écrans de l'appli (ou src/donnees/source.ts → src/api/domaines → client HTTP) et par les
// vraies routes /api/company/… Le monde est Yafé Express (relaya_essai/essai_entreprise.py : quatre accès nominatifs,
// Serge Atangana en période d'essai, Junior Tchinda) ; ce que font le client, le vendeur, le livreur, le relais et la
// console passe par les routes réservées à l'essai (/api/_essai/…) ; les codes SMS et les e-mails sont lus comme la
// personne les lirait (/api/_essai/codes).
import { readFileSync } from 'node:fs'
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { PAGES, adresse } from './commun'

const API = `http://localhost:${process.env.PORT_API_ENTREPRISE || 8030}/api`

test.describe.configure({ mode: 'serial' })

type Role = 'proprietaire' | 'gerant' | 'repartiteur' | 'comptable'
interface Personne {
  id: number
  prenom: string
  nom: string
  telephone: string
  email: string
}
interface Monde {
  entreprise: { id: number; nom: string }
  motDePasse: string
  membres: Record<Role, Personne>
  livreurs: Record<'serge' | 'junior', { id: number; prenom: string; nom: string; telephone: string; zones: string[] }>
}
let monde: Monde

async function essai<T = Record<string, unknown>>(api: APIRequestContext, chemin: string, data: object = {}): Promise<T> {
  const r = await api.post(`${API}/_essai/${chemin}`, { data })
  expect(r.ok(), `POST /_essai/${chemin} : ${r.status()} ${await r.text()}`).toBe(true)
  return r.json() as Promise<T>
}
async function codeRecu(api: APIRequestContext, destination: string): Promise<string> {
  const r = await api.get(`${API}/_essai/codes`, { params: { destination } })
  expect(r.ok(), `code envoyé à ${destination}`).toBe(true)
  return (await r.json()).code as string
}

/** Jetons d'un accès par les vraies routes de connexion (mot de passe, puis code SMS s'il est demandé). */
async function jetons(api: APIRequestContext, role: Role, appareil = `recette-${role}`) {
  await api.post(`${API}/_essai/limites`)
  const p = monde.membres[role]
  const r = await (await api.post(`${API}/company/auth/login`, { data: { identifiant: p.email, motDePasse: monde.motDePasse, appareil } })).json()
  expect(r.ok, `connexion de ${role} : ${JSON.stringify(r)}`).toBe(true)
  const v = r.code ? await (await api.post(`${API}/company/auth/verify`, { data: { defi: r.defi, code: await codeRecu(api, p.telephone) } })).json() : r
  expect(v.ok, `code de ${role} : ${JSON.stringify(v)}`).toBe(true)
  return { acces: v.jetons.access as string, rafraichissement: v.jetons.refresh as string, appareil }
}

/** Une page de l'espace ouverte au nom de cet accès (jetons et appareil posés avant le premier script). */
async function pageDe(browser: Browser, api: APIRequestContext, role: Role): Promise<{ page: Page; erreurs: string[] }> {
  const j = await jetons(api, role)
  const page = await browser.newPage()
  await page.addInitScript(
    ([cle, v, app]) => {
      if (!sessionStorage.getItem('blv_e_recette')) {
        sessionStorage.setItem('blv_e_recette', '1')
        localStorage.setItem(cle, v)
        localStorage.setItem('blv_e_appareil', app)
      }
    },
    ['blv_api_jetons', JSON.stringify({ acces: j.acces, rafraichissement: j.rafraichissement }), j.appareil],
  )
  return { page, erreurs: surveiller(page) }
}

/** Requêtes de l'appli vers le kit encore en vol (hors flux du temps réel, ouvert tant que la session vit). */
const enVol = new WeakMap<Page, Set<unknown>>()
/** La page a fini de lire : aucune requête vers le kit en vol pendant un demi-seconde (le flux SSE ne compte pas). */
async function calme(page: Page) {
  const vol = enVol.get(page)
  if (!vol) return page.waitForLoadState('networkidle')
  let calmeDepuis = 0
  for (let i = 0; i < 120; i++) {
    if (vol.size === 0) {
      calmeDepuis ||= Date.now()
      if (Date.now() - calmeDepuis >= 500) return
    } else calmeDepuis = 0
    await page.waitForTimeout(100)
  }
}

/** Erreurs de la page : exceptions non rattrapées, méthodes non branchées, refus du kit. Aucune n'est permise. */
function surveiller(page: Page) {
  const erreurs: string[] = []
  const vol = new Set<unknown>()
  enVol.set(page, vol)
  const fin = (q: import('@playwright/test').Request) => vol.delete(q)
  page.on('request', (q) => q.url().startsWith(API) && !q.url().includes('/realtime/stream') && vol.add(q))
  page.on('requestfinished', fin)
  page.on('requestfailed', fin)
  const ici = () => page.url().replace(/^.*\/entreprise\//, '/')
  page.on('pageerror', (e) => erreurs.push(`${ici()} : ${e.message}`))
  page.on('console', (m) => {
    if (m.text().startsWith('[non branché]')) erreurs.push(`${ici()} : ${m.text()}`)
  })
  // 404 attendu : une fiche sans identifiant lit « introuvable » ; jamais 400, 401, 403 (rôle), 429 ni 5xx.
  page.on('response', (r) => {
    if (r.url().startsWith(API) && !r.url().includes('/_essai/') && r.status() >= 400 && r.status() !== 404)
      erreurs.push(`${ici()} : ${r.status()} ${r.request().method()} ${r.url().slice(API.length)}`)
  })
  return erreurs
}

/** Appelle `domaine.methode` de la source de l'appli (le même module que les écrans) dans la page. */
async function src<T = unknown>(page: Page, cle: string, ...args: unknown[]): Promise<T> {
  const r = (await page.evaluate(
    async ([c, a]) => {
      const [d, m] = (c as string).split('.')
      const mod = (await import(/* @vite-ignore */ '/entreprise/src/donnees/source.ts')) as { source: Record<string, Record<string, (...x: unknown[]) => Promise<unknown>>> }
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

test.beforeAll(async ({ request }) => {
  monde = await essai<Monde>(request, 'entreprise/monde')
})

// ——— Connexion ———

test('connexion à l’écran : mot de passe faux, puis code SMS lu sur le téléphone de la propriétaire, tableau de bord', async ({ browser, request }) => {
  await request.post(`${API}/_essai/limites`)
  const page = await browser.newPage()
  const erreurs = surveiller(page)
  await page.goto('connexion')
  const p = monde.membres.proprietaire
  await page.getByLabel('Numéro +237 ou e-mail').fill(p.email)
  await page.getByLabel('Mot de passe', { exact: true }).fill('Faux-2026')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByText(/mot de passe incorrect\. Encore \d essai/)).toBeVisible()
  await page.getByLabel('Mot de passe', { exact: true }).fill(monde.motDePasse)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByText('Code de vérification')).toBeVisible()
  const code = await codeRecu(request, p.telephone)
  await page.getByLabel('Chiffre 1 sur 6').click()
  await page.keyboard.type(code)
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page).toHaveURL(/\/entreprise\/?(\?.*)?$/, { timeout: 20_000 })
  const s = await src<{ connecte: boolean; utilisateur: { role: string; prenom: string }; entreprise: { nom: string } }>(page, 'session.session')
  expect(s.connecte).toBe(true)
  expect(s.utilisateur).toMatchObject({ role: 'proprietaire', prenom: 'Gaëlle' })
  expect(s.entreprise.nom).toBe('Yafé Express')
  expect(erreurs).toEqual([])
  await page.close()
})

// ——— Toutes les pages, pour chaque rôle ———

for (const role of ['proprietaire', 'gerant', 'repartiteur', 'comptable'] as const) {
  test(`pages de l’espace au nom du ${role} : aucune erreur, aucune méthode non branchée, aucun 5xx`, async ({ browser, request }) => {
    test.setTimeout(240_000)
    const { page, erreurs } = await pageDe(browser, request, role)
    const ouvertes = PAGES.filter((x) => !x.sansSession && (!x.roles || x.roles.includes(role)) && !x.route.includes(':'))
    for (const x of ouvertes) {
      const q = x.route === 'livreur' ? `id=${monde.livreurs.serge.id}` : ''
      // Limite de lecture du kit (240/min par compte, client_core/debits.py) : une personne n'ouvre pas 40 pages en une
      // minute ; la recette efface le compteur entre deux pages.
      await request.post(`${API}/_essai/limites`)
      // Une requête de la page quittée peut ne jamais signaler sa fin : seules comptent celles de la nouvelle page.
      enVol.get(page)?.clear()
      await page.goto(adresse(x.route, q))
      await calme(page)
      // Écran attendu (10 s au plus), pas lu à l'instant : Vite compile le morceau de l'écran à la demande.
      const affiche = await page.locator('main').first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false)
      if (!affiche) erreurs.push(`/${x.route} : rien d’affiché`)
      if (/connexion/.test(page.url())) erreurs.push(`/${x.route} : renvoyé à la connexion`)
      const refus = page.getByText(/Rechargez|n’a pas pu être lu|Réessayer/).first()
      if (await refus.isVisible().catch(() => false)) erreurs.push(`/${x.route} : ${(await refus.textContent())?.slice(0, 120)}`)
    }
    expect(erreurs).toEqual([])
    await page.close()
  })
}

// ——— Paquets, affectation, mission, appel masqué ———

test('paquets à l’écran (répartiteur) : accepter le paquet publié, affecter Serge, mission affectée ; appel masqué noté', async ({ browser, request }) => {
  const { paquets } = await essai<{ paquets: { paquet: string }[] }>(request, 'entreprise/paquets', { n: 1 })
  const ref = paquets[0].paquet
  expect(ref).toMatch(/^PQ-Z3-/)
  const { page, erreurs } = await pageDe(browser, request, 'repartiteur')
  await page.goto('paquets')
  const carte = page.locator('article.entb-pq', { has: page.locator(`[id="pq-${ref}"]`) })
  await expect(carte).toBeVisible()
  await expect(carte.getByText('Montant visible du propriétaire')).toBeVisible() // le répartiteur ne voit aucun montant
  await carte.getByRole('button', { name: 'Accepter' }).click()
  await expect.poll(async () => (await src<{ statut: string }>(page, 'paquets.paquet', ref)).statut, { timeout: 20_000 }).toBe('accepte')
  // Affectation : Serge et Junior sont éligibles (zone Z3, véhicule, certification) ; on choisit Serge.
  const el = await src<{ eligibles: { id: string; nom: string }[] }>(page, 'affectation.eligibles', ref)
  expect(el.eligibles.map((x) => x.nom).sort()).toEqual(['Junior T.', 'Serge A.'])
  await page.goto(adresse('affectation', `id=${ref}`))
  await page.getByRole('button', { name: 'Affecter Serge A.', exact: true }).click()
  await expect.poll(async () => (await src<{ statut: string; livreurId?: string | null }>(page, 'paquets.paquet', ref)).statut, { timeout: 20_000 }).toBe('affecte')
  const missions = await src<{ id: string; paquetId: string }[]>(page, 'missions.liste', 'affectees')
  const m = missions.find((x) => x.paquetId === ref)!
  expect(m).toBeTruthy()
  // Appel masqué au livreur, raccroché, puis noté (ce que l'entreprise retient, jamais le contenu).
  const a = await src<{ ok: boolean; appel: { id: string; ligne: string | null } }>(page, 'missions.appeler', m.id, 'numero_masque')
  expect(a.ok).toBe(true)
  expect(a.appel.ligne).not.toContain(monde.livreurs.serge.telephone)
  await src(page, 'missions.raccrocher', a.appel.id)
  await src(page, 'missions.noterAppel', a.appel.id, 'Arrive à la boutique dans 10 minutes.')
  const appels = await src<{ id: string; note?: string | null }[]>(page, 'missions.appels', m.id)
  expect(appels.find((x) => x.id === a.appel.id)?.note).toBe('Arrive à la boutique dans 10 minutes.')
  // La propriétaire voit la rémunération figée de la mission.
  const prop = await pageDe(browser, request, 'proprietaire')
  await prop.page.goto('missions')
  expect((await src<{ remuneration: number | null }>(prop.page, 'paquets.paquet', ref)).remuneration).toBeGreaterThan(0)
  expect([...erreurs, ...prop.erreurs]).toEqual([])
  await prop.page.close()
  await page.close()
})

// ——— Temps réel ———

test('temps réel (SSE, canal flotte) : un paquet publié pendant que le répartiteur regarde arrive à l’écran sans recharger', async ({ browser, request }) => {
  const { page, erreurs } = await pageDe(browser, request, 'repartiteur')
  const flux: string[] = []
  page.on('request', (q) => q.url().includes('/realtime/') && flux.push(q.url().replace(/\?.*$/, '')))
  await page.goto('paquets')
  await calme(page)
  await expect.poll(() => flux.filter((u) => u.endsWith('/realtime/stream')).length, { timeout: 15_000 }).toBeGreaterThan(0)
  const { paquets } = await essai<{ paquets: { paquet: string }[] }>(request, 'entreprise/paquets', { n: 1 })
  await expect(page.locator(`[id="pq-${paquets[0].paquet}"]`)).toBeVisible({ timeout: 20_000 })
  expect(flux.some((u) => u.endsWith('/realtime/ticket'))).toBe(true)
  expect(erreurs).toEqual([])
  await page.close()
})

// ——— Équipe : droits d'employeur, à l'écran ———

/** Décision motivée de la feuille (FormDecision) : motif, Continuer, Confirmer. */
async function decider(page: Page, bouton: string, motif: string, dates?: { du: string; au: string }) {
  await page.getByRole('button', { name: bouton, exact: true }).first().click()
  const f = page.getByRole('dialog')
  if (dates) {
    await f.getByLabel('Du').fill(dates.du)
    await f.getByLabel('Au (inclus)').fill(dates.au)
  }
  await f.locator('textarea').fill(motif)
  await f.getByRole('button', { name: 'Continuer' }).click()
  await f.getByRole('button', { name: /^Confirmer : / }).click()
  await expect(f).toBeHidden()
}
/** Ouvre une section repliable du dossier d'emploi (sans la refermer si elle l'est déjà). */
async function section(page: Page, id: string) {
  const d = page.locator(`#emploi-${id}`)
  if ((await d.getAttribute('open')) === null) await d.locator('summary').click()
  await expect(d).toHaveAttribute('open', '')
}
const jour = (decalage: number) => new Date(Date.now() + decalage * 86_400_000).toLocaleDateString('fr-CA', { timeZone: 'Africa/Douala' })

test('équipe à l’écran (gérant) : essai prolongé une fois, avertissement, horaires, congé, casier, fin de contrat annulée, attestation', async ({ browser, request }) => {
  test.setTimeout(180_000)
  const { page, erreurs } = await pageDe(browser, request, 'gerant')
  const serge = String(monde.livreurs.serge.id)
  await page.goto('equipe')
  await expect(page.getByRole('link', { name: 'Serge A.' })).toBeVisible()
  const registre = await src<{ livreur: { id: string; nom: string }; essai: { jusqua: number } | null }[]>(page, 'equipe.registre')
  expect(registre.find((x) => x.livreur.id === serge)?.essai).toBeTruthy()
  await page.getByRole('link', { name: 'Serge A.' }).click()
  await expect(page).toHaveURL(/t=emploi/)
  await expect(page.getByText('Contrat et essai')).toBeVisible()
  const avant = (await src<{ essai: { jusqua: number; dureeJours: number } }>(page, 'equipe.dossier', serge)).essai
  await decider(page, 'Prolonger une fois', 'Deux retards de ramassage à corriger avant de confirmer.')
  await expect(page.getByText('Période d’essai prolongée.')).toBeVisible()
  const apres = (await src<{ essai: { jusqua: number; prolonge: boolean } }>(page, 'equipe.dossier', serge)).essai
  expect(apres.prolonge).toBe(true)
  expect(Math.round((apres.jusqua - avant.jusqua) / 86_400_000)).toBe(avant.dureeJours)
  await expect(page.getByRole('button', { name: 'Prolonger une fois' })).toHaveCount(0) // une seule fois
  // Avertissement écrit : rang 1, le livreur en est prévenu.
  await section(page, 'discipline')
  await decider(page, 'Avertissement écrit', 'Colis laissé au comptoir sans la validation du gérant.')
  await expect(page.getByText('Avertissement envoyé.')).toBeVisible()
  // Horaires : samedi au repos.
  await section(page, 'horaires')
  await page.getByRole('button', { name: 'Modifier les horaires' }).click()
  const fh = page.getByRole('dialog')
  await fh.getByRole('checkbox', { name: 'Samedi' }).uncheck()
  await fh.getByLabel('Lundi · début').fill('07:30')
  await fh.getByRole('button', { name: 'Enregistrer et prévenir le livreur' }).click()
  await expect(fh).toBeHidden()
  const d1 = await src<{ horaires: { jour: number; de: string; a: string }[]; historique: { genre: string }[] }>(page, 'equipe.dossier', serge)
  expect(d1.horaires.find((x) => x.jour === 0)?.de).toBe('07:30')
  expect(d1.horaires.some((x) => x.jour === 5)).toBe(false)
  // Congé accordé dans dix jours.
  await section(page, 'conges')
  await decider(page, 'Accorder un congé', 'Mariage de sa sœur.', { du: jour(10), au: jour(11) })
  await expect(page.getByText('Congé accordé.')).toBeVisible()
  const d2 = await src<{ conges: { du: string; motif: string }[] }>(page, 'equipe.dossier', serge)
  expect(d2.conges).toEqual([expect.objectContaining({ du: jour(10), motif: 'Mariage de sa sœur.' })])
  // Casier judiciaire : à demander au livreur (il est prévenu).
  await section(page, 'contrat')
  await page.getByLabel('Casier judiciaire').selectOption('a_demander')
  await expect.poll(async () => (await src<{ pieces: { id: string; etat: string }[] }>(page, 'equipe.dossier', serge)).pieces.find((x) => x.id === 'casier')?.etat).toBe('manquante')
  // Fin de contrat, puis annulée pendant le préavis.
  await section(page, 'fin')
  await decider(page, 'Mettre fin au contrat', 'Réorganisation de la flotte de Mokolo.')
  await expect(page.getByText('Fin de contrat notifiée ; le préavis court.')).toBeVisible()
  expect((await src<{ finContrat: { motif: string } | null }>(page, 'equipe.dossier', serge)).finContrat?.motif).toBe('Réorganisation de la flotte de Mokolo.')
  await decider(page, 'Annuler la fin de contrat', 'Accord trouvé avec le livreur.')
  await expect(page.getByText('Fin de contrat annulée.')).toBeVisible()
  expect((await src<{ finContrat: unknown }>(page, 'equipe.dossier', serge)).finContrat).toBeNull()
  // Attestation de travail : un PDF.
  const att = await src<{ ok: boolean; contenu: string; type: string }>(page, 'equipe.attestation', serge)
  expect(att.ok && att.type === 'application/pdf' && att.contenu.startsWith('%PDF')).toBe(true)
  const h = await src<{ historique: { genre: string }[] }>(page, 'equipe.dossier', serge)
  expect(new Set(h.historique.map((x) => x.genre))).toEqual(new Set(['embauche', 'essai', 'avertissement', 'horaires', 'conge', 'piece', 'fin_contrat', 'attestation']))
  expect(erreurs).toEqual([])
  await page.close()
})

test('équipe, moindre privilège : le répartiteur fixe les horaires mais n’avertit pas ; le comptable lit sans motif disciplinaire', async ({ browser, request }) => {
  const serge = String(monde.livreurs.serge.id)
  const rep = await pageDe(browser, request, 'repartiteur')
  await rep.page.goto(adresse('livreur', `id=${serge}&t=emploi`))
  const d = await src<{ vue: string; avertissements: unknown[]; historique: { genre: string }[] }>(rep.page, 'equipe.dossier', serge)
  expect(d.vue).toBe('exploitation')
  expect(d.avertissements).toEqual([])
  expect(d.historique.some((x) => x.genre === 'avertissement')).toBe(false)
  await expect(src(rep.page, 'equipe.avertir', serge, 'Essai interdit.')).rejects.toThrow(/AccesRefuse/)
  await expect(rep.page.getByRole('button', { name: 'Avertissement écrit' })).toHaveCount(0)
  expect(await src(rep.page, 'equipe.fixerZones', serge, ['Z3', 'Z4'], 'Renfort au marché de Ngousso')).toEqual({ ok: true })
  const lignes = await src<{ livreur: { id: string }; avertissements: number }[]>(rep.page, 'equipe.registre')
  expect(lignes.find((x) => x.livreur.id === serge)?.avertissements).toBe(0)
  const cpt = await pageDe(browser, request, 'comptable')
  await cpt.page.goto('equipe')
  const c = await src<{ vue: string; retenueKitMax: number | null }>(cpt.page, 'equipe.dossier', serge)
  expect(c.vue).toBe('comptable')
  expect(c.retenueKitMax).toBeGreaterThan(0)
  await expect(src(cpt.page, 'equipe.fixerHoraires', serge, [{ jour: 0, de: '08:00', a: '12:00' }])).rejects.toThrow(/AccesRefuse/)
  // Les deux refus voulus ci-dessus (403 role_forbidden) sont les seuls permis.
  const voulus = /403 (POST \/company\/staff\/\d+\/warnings|PUT \/company\/staff\/\d+\/schedule)$/
  expect([...rep.erreurs, ...cpt.erreurs].filter((e) => !voulus.test(e))).toEqual([])
  await rep.page.close()
  await cpt.page.close()
})

// ——— Mon compte ———

/** Appelle une fonction de Mon compte (src/donnees/mon-compte.ts, le module de l'écran) dans la page. */
async function compte<T = unknown>(page: Page, fn: string, ...args: unknown[]): Promise<T> {
  return (await page.evaluate(
    async ([f, a]) => {
      const mod = (await import(/* @vite-ignore */ '/entreprise/src/donnees/mon-compte.ts')) as Record<string, (...x: unknown[]) => Promise<unknown>>
      return mod[f as string](...(a as unknown[]))
    },
    [fn, args] as const,
  )) as T
}
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

test('Mon compte (comptable) : photo, nom confirmé par SMS, nouveau numéro par code, appareil retenu', async ({ browser, request }) => {
  const { page, erreurs } = await pageDe(browser, request, 'comptable')
  await page.goto('profil')
  const s = await src<{ utilisateur: { id: string } }>(page, 'session.session')
  const id = s.utilisateur.id
  expect(await compte(page, 'changerPhoto', id, PNG)).toEqual({ ok: true })
  await expect(page.locator('img.portrait').first()).toBeVisible()
  const n = await compte<{ ok: boolean; vers: string }>(page, 'demanderCodeNom')
  expect(n.ok).toBe(true)
  expect(await compte(page, 'changerNom', id, 'Joëlle', 'Ngo Bassa-Essomba', '000000', '')).toEqual({ ok: false, raison: 'code' })
  expect(await compte(page, 'changerNom', id, 'Joëlle', 'Ngo Bassa-Essomba', await codeRecu(request, monde.membres.comptable.telephone), '')).toEqual({ ok: true })
  expect((await src<{ utilisateur: { nom: string } }>(page, 'session.session')).utilisateur.nom).toBe('Ngo Bassa-Essomba')
  const t = await compte<{ ok: boolean; vers: string }>(page, 'demanderCode', id, 'telephone', '699123456', '')
  expect(t).toMatchObject({ ok: true })
  expect(await compte(page, 'confirmerCode', id, 'telephone', await codeRecu(request, '699123456'), '')).toEqual({ ok: true })
  monde.membres.comptable.telephone = '699123456'
  // Google : prise prête, vérificateur pas encore branché.
  expect(await compte(page, 'associerGoogle', id, 'joelle.ngo@gmail.com', 'Joëlle Ngo', '')).toMatchObject({ ok: false })
  // L'appareil se souvient de la comptable : l'écran de connexion propose son e-mail.
  await compte(page, 'memoriserAppareil', { email: monde.membres.comptable.email, prenom: 'Joëlle', initiales: 'JN', photo: null })
  await expect.poll(async () => (await compte<{ email: string } | null>(page, 'synchroniserAppareil'))?.email).toBe(monde.membres.comptable.email)
  expect(erreurs).toEqual([])
  await page.close()
})

test('lien de connexion par e-mail : la propriétaire l’ouvre, le code SMS reste demandé, puis l’espace ; lien déjà servi refusé', async ({ browser, request }) => {
  await request.post(`${API}/_essai/limites`)
  const page = await browser.newPage()
  const erreurs = surveiller(page)
  await page.goto('connexion')
  const p = monde.membres.proprietaire
  await page.getByRole('button', { name: 'Recevoir un lien de connexion par e-mail' }).click()
  await page.locator('.cx-lien-b input').fill(p.email)
  await page.locator('.cx-lien-b').getByRole('button').first().click()
  await expect(page.getByText(/un lien est parti à g•••/)).toBeVisible()
  const { jeton } = (await (await request.get(`${API}/_essai/entreprise/lien`, { params: { destination: p.email } })).json()) as { jeton: string }
  await page.goto(adresse('connexion', `lien=${jeton}`))
  await expect(page.getByText('Code de vérification')).toBeVisible()
  await page.getByLabel('Chiffre 1 sur 6').click()
  await page.keyboard.type(await codeRecu(request, p.telephone))
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page).toHaveURL(/\/entreprise\/?(\?.*)?$/, { timeout: 20_000 })
  await src(page, 'session.deconnecter')
  await page.goto(adresse('connexion', `lien=${jeton}`))
  await expect(page.getByText('Ce lien de connexion n’est plus valable : demandez-en un nouveau, ou connectez-vous avec votre mot de passe.')).toBeVisible()
  expect(erreurs).toEqual([])
  await page.close()
})

// ——— Zones v2 ———

test('zones v2 avec le serveur : douze zones Z1–Z12 de la carte, table quartier → zone qui fait foi', async ({ browser, request }) => {
  const geo = JSON.parse(readFileSync(new URL('../../logique-metier/livraison/zones-yaounde.geo.json', import.meta.url), 'utf-8')) as { features: { id: string; properties: { nom: string; quartiers: string[] } }[] }
  const { page, erreurs } = await pageDe(browser, request, 'proprietaire')
  await page.goto('zones')
  const carte = await src<{ code: string; nom: string; declaree: boolean; polygone: unknown[] }[]>(page, 'zones.carte')
  expect(carte.map((z) => `${z.code} ${z.nom}`)).toEqual(geo.features.map((f) => `${f.id} ${f.properties.nom}`))
  expect(carte.filter((z) => z.declaree).map((z) => z.code)).toEqual(['Z3', 'Z4'])
  const quartiers = await src<{ nom: string; zone: string }[]>(page, 'zones.quartiers')
  const zoneDe = Object.fromEntries(geo.features.flatMap((f) => f.properties.quartiers.map((q) => [q, f.id])))
  expect(quartiers.length).toBe(Object.keys(zoneDe).length)
  for (const q of quartiers) expect(q.zone, q.nom).toBe(zoneDe[q.nom])
  const zones = await src<{ code: string; nom: string }[]>(page, 'zones.zones')
  expect(zones.map((z) => `${z.code} ${z.nom}`)).toEqual(['Z3 Mokolo', 'Z4 Ngousso'])
  expect(erreurs).toEqual([])
  await page.close()
})
