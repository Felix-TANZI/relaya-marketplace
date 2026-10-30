// Le relais et le livreur ouverts dans le même navigateur (deux onglets, même origine, comme belivay.com/relais et
// /livreur, DP-38) : le dépôt du lot PQ-Z1-261013-003 de bout en bout par le pont (src/demo/pont.ts). Serge présente son
// QR de dépôt, Rose M. saisit le code, contrôle chaque colis, photographie le lot et le valide sous PIN ; le livreur voit
// les résultats, sa confirmation est refusée avant la validation, puis il confirme : la garde passe au relais. Le relais
// n'a rien simulé (l'application du livreur est ouverte : battement de présence).
// Un petit serveur sert les deux applications construites (espace-relais/dist et espace-livreur/dist) sous une même
// origine ; sans la construction du livreur (npm run build dans espace-livreur), le test est sauté.
import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { arriver, ramasserA2, re } from '../../espace-livreur/tests/LIV-06.parcours'

const ICI = fileURLToPath(new URL('..', import.meta.url))
const DIST = { relais: join(ICI, 'dist'), livreur: join(ICI, '../espace-livreur/dist') }
const PORT = Number(process.env.PORT_RELAIS || 4178) + 100
const ORIGINE = `http://localhost:${PORT}`
const JEU = readFileSync(join(ICI, 'src/demo/jeu-essai.ts'), 'utf-8')
const PIN = /PIN_DEMO = '(\d+)'/.exec(JEU)![1]
const CODE = /'PQ-Z1-261013-003': '(\d+)'/.exec(JEU)![1]
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' }

let serveur: Server | null = null
test.beforeAll(async () => {
  test.skip(!existsSync(join(DIST.livreur, 'index.html')) || !existsSync(join(DIST.relais, 'index.html')), 'construire espace-livreur et espace-relais')
  serveur = createServer((req, res) => {
    const chemin = decodeURIComponent((req.url ?? '/').split('?')[0])
    const app = chemin.startsWith('/livreur') ? 'livreur' : chemin.startsWith('/relais') ? 'relais' : null
    if (!app) return void res.writeHead(404).end()
    const racine = DIST[app]
    let f = normalize(join(racine, chemin.slice(app.length + 1)))
    if (!f.startsWith(racine) || !existsSync(f) || !extname(f)) f = join(racine, 'index.html')
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f))
  })
  await new Promise<void>((ok) => serveur!.listen(PORT, ok))
})
test.afterAll(() => void serveur?.close())

test('dépôt de bout en bout, relais et livreur dans deux onglets : aucune confirmation simulée', async ({ browser }) => {
  test.setTimeout(240_000)
  const context = await browser.newContext({ baseURL: `${ORIGINE}/livreur/`, viewport: { width: 390, height: 844 } })
  // Un état neuf une seule fois pour les deux onglets (même origine : un seul localStorage), préférences des deux applis.
  await context.addInitScript(() => {
    if (localStorage.getItem('blv_essai_deux_onglets')) return
    localStorage.clear()
    localStorage.setItem('blv_essai_deux_onglets', '1')
    for (const p of ['blv_l_', 'blv_r_']) {
      localStorage.setItem(p + 'theme', 'light')
      localStorage.setItem(p + 'lang', 'fr')
      localStorage.setItem(p + 'text', 'normale')
    }
    const md = navigator.mediaDevices
    if (md) Object.defineProperty(md, 'getUserMedia', { configurable: true, value: () => Promise.reject(Object.assign(new Error('aucun appareil'), { name: 'NotFoundError' })) })
  })
  const livreur = await context.newPage()
  const relais = await context.newPage()
  for (const p of [livreur, relais]) await p.clock.setFixedTime(new Date('2026-10-13T13:05:00.500Z'))

  // Serge ramasse chez Maison Ngono puis arrive au relais : son QR de dépôt porte le code du lot.
  await livreur.goto('tournee')
  await ramasserA2(livreur)
  await livreur.goto('tournee')
  await arriver(livreur, 'Je suis au relais')
  await expect(livreur.locator('.lr-code')).toHaveText(CODE)

  // Rose M., au comptoir : code de dépôt, chaque colis scanné et touché (scellé intact).
  await relais.goto(`${ORIGINE}/relais/reception`)
  const pave = async (chiffres: string) => {
    for (const k of chiffres) await relais.locator('main').getByRole('button', { name: k, exact: true }).click()
  }
  await pave(CODE)
  await expect(relais.getByText('CODE DE DÉPÔT VALIDÉ', { exact: true })).toBeVisible()
  for (const ref of ['BLV-00008-1', 'BLV-00009-1', 'BLV-00011-1', 'BLV-00014-1']) {
    const [, a, b] = /BLV-(\d{5})-(\d)/.exec(ref)!
    await pave(a + b)
    await expect(relais.locator('#r4-colis-' + ref)).toContainText('scanné')
  }

  // Scans faits, lot pas encore signé : la confirmation du livreur attend la validation du lot (ARL-162).
  await livreur.reload()
  await expect(livreur.getByRole('button', { name: re('Confirmer la remise du lot') })).toBeDisabled()

  // Photo du lot et PIN : le relais attend le livreur, sans rien simuler.
  await relais.getByRole('button', { name: 'Terminer' }).click()
  const feuille = relais.getByRole('dialog')
  await feuille.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') })
  for (const k of PIN) await feuille.getByRole('button', { name: k, exact: true }).click()
  await expect(relais.getByRole('heading', { name: 'Le livreur confirme le lot' })).toBeVisible()
  await relais.waitForTimeout(6000) // plus que le délai de la confirmation simulée (4 s)
  await expect(relais.getByRole('heading', { name: 'Lot reçu · 4 colis' })).toHaveCount(0)

  // Serge confirme : la garde passe au relais.
  await livreur.reload()
  await livreur.getByRole('button', { name: re('Confirmer la remise du lot') }).click()
  await livreur.locator('.sheet').getByRole('button', { name: re('Confirmer la remise') }).click()
  await expect(livreur.getByText(re('Dépôt complet · garde transférée'))).toBeVisible()
  await expect(async () => {
    await relais.goto(`${ORIGINE}/relais/reception?lot=PQ-Z1-261013-003`)
    await expect(relais.getByRole('heading', { name: 'Lot reçu · 4 colis' })).toBeVisible({ timeout: 3000 })
  }).toPass({ timeout: 30_000 })
  const journal = await relais.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string; app: string }[])
  expect(journal.filter((e) => e.app === 'relais').map((e) => e.type)).toEqual(expect.arrayContaining(['relay.drop_code.verified', 'relay.drop.item_result', 'relay.drop.validated', 'parcel.arrival_notice', 'parcel.pickup_code']))
  expect(journal.some((e) => e.app === 'livreur' && e.type === 'relay.drop.completed')).toBe(true)
  await context.close()
})
