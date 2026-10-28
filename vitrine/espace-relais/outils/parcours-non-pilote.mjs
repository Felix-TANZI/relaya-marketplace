// Parcours de tous les écrans de l'espace point relais dans un Chromium NON piloté en apparence
// (navigator.webdriver = false posé avant tout script) : les animations, observateurs et minuteurs du vrai téléphone
// tournent comme chez le gérant. Pour chaque route et chaque état du prototype (pages.json), et pour chaque page
// ajoutée par un groupe (déclarée dans src/pages/PR-xx/routes.ts, sans état du prototype : la route elle-même), l'outil
// ouvre la page,
// vérifie que le fil principal répond (deux images d'animation sous 3 s, deux fois à 1,5 s d'écart), fait défiler,
// touche le premier bouton principal s'il existe, revérifie, et prend une capture.
//
//   npx vite preview --port 4178 &      (après npm run build)
//   node outils/parcours-non-pilote.mjs [--base http://localhost:4178/relais/] [--sortie dossier] [--routes a,b] [--theme dark] [--lang en]
//
// Sortie : une ligne par adresse (OK / GEL / ERREUR), captures <sortie>/<route>__<etat>.png ; code de sortie 1 si un
// écran gèle ou lève une erreur.
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n)
  return i > 0 ? process.argv[i + 1] : d
}
const BASE = arg('base', `http://localhost:${process.env.PORT_RELAIS || 4178}/relais/`)
const SORTIE = resolve(arg('sortie', 'test-results/non-pilote'))
const THEME = arg('theme', 'light')
const LANG = arg('lang', 'fr')
const FILTRE = arg('routes', '')
  .split(',')
  .filter(Boolean)
mkdirSync(SORTIE, { recursive: true })

const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const adresses = []
for (const p of PAGES) {
  if (FILTRE.length && !FILTRE.includes(p.route)) continue
  for (const e of p.etats) if (!/[?&](lang|langue)=pcm\b/.test(e.adresse)) adresses.push([p.route, e.id, e.adresse])
}
// Pages ajoutées par les groupes (aucun état du prototype) : la route elle-même.
const connues = new Set(PAGES.filter((p) => p.etats.length).map((p) => p.route))
for (const d of readdirSync(new URL('../src/pages/', import.meta.url), { withFileTypes: true })) {
  const f = new URL(`../src/pages/${d.name}/routes.ts`, import.meta.url)
  if (!d.isDirectory() || !existsSync(f)) continue
  for (const m of readFileSync(f, 'utf-8').matchAll(/route:\s*'([\w-]+)'/g)) {
    if (connues.has(m[1]) || (FILTRE.length && !FILTRE.includes(m[1]))) continue
    connues.add(m[1])
    adresses.push([m[1], 'ajoutee', '#' + m[1]])
  }
}

const rel = (a) => {
  const [r, q] = a.replace(/^#/, '').split('?')
  return (r === 'accueil' ? '' : r) + (q ? '?' + q : '')
}

const navigateur = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] })
let echecs = 0
const repond = async (page) => {
  try {
    await Promise.race([
      page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))),
      new Promise((_, rej) => setTimeout(() => rej(new Error('gel')), 3000)),
    ])
    return true
  } catch {
    return false
  }
}

for (const [route, etat, a] of adresses) {
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await ctx.addInitScript(
    ([t, l]) => {
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true })
      try {
        if (!sessionStorage.getItem('blv_r_np')) {
          localStorage.clear()
          sessionStorage.setItem('blv_r_np', '1')
          localStorage.setItem('blv_r_theme', t)
          localStorage.setItem('blv_r_lang', l)
        }
      } catch {
        /* rien */
      }
    },
    [THEME, LANG],
  )
  const page = await ctx.newPage()
  const erreurs = []
  page.on('pageerror', (e) => erreurs.push(String(e.message || e)))
  let etatFinal = 'OK'
  try {
    await page.goto(BASE + rel(a), { timeout: 15000 })
    await page.waitForSelector('#app', { state: 'attached', timeout: 10000 })
    await page.waitForTimeout(600)
    if (!(await repond(page))) etatFinal = 'GEL (chargement)'
    else {
      await page.waitForTimeout(1500)
      if (!(await repond(page))) etatFinal = 'GEL (après 1,5 s)'
    }
    if (etatFinal === 'OK') {
      await page.mouse.wheel(0, 900)
      await page.waitForTimeout(300)
      if (!(await repond(page))) etatFinal = 'GEL (défilement)'
    }
    if (etatFinal === 'OK') {
      await page.mouse.wheel(0, -2000)
      await page.screenshot({ path: `${SORTIE}/${route}__${etat}.png` })
      const b = page.locator('main .r-principal:visible, main button:visible').first()
      if (await b.count()) {
        await b.click({ timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(800)
        if (!(await repond(page))) etatFinal = 'GEL (après un geste)'
      }
    }
    if (etatFinal === 'OK' && erreurs.length) etatFinal = 'ERREUR ' + erreurs[0].slice(0, 160)
  } catch (e) {
    etatFinal = 'ERREUR ' + String(e.message || e).split('\n')[0].slice(0, 160)
  }
  if (etatFinal !== 'OK') echecs++
  console.log(`${etatFinal === 'OK' ? 'OK   ' : 'ÉCHEC'} ${a}${etatFinal === 'OK' ? '' : ' · ' + etatFinal}`)
  await ctx.close()
}
await navigateur.close()
console.log(`\n${adresses.length} adresses, ${echecs} en échec · captures dans ${SORTIE}`)
process.exit(echecs ? 1 : 0)
