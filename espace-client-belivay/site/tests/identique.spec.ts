// Le site doit être identique au prototype du 1er octobre, au pixel près (DP-43), aux corrections de la
// spécification près (DP-44), appliquées aussi au prototype avant la comparaison (outils/corrections.mjs).
// Chaque test ouvre la même route dans le prototype et dans le site, à 390 × 844, et compare les images :
// - sur toutes les routes ouvertes : l'en-tête (la coque ; la barre du bas en est exclue, voir BARRE_OVALE) ;
// - sur les écrans construits : l'écran entier, déroulé, dans chacun de leurs états.
// Le prototype dessine la barre d'état, l'île et la barre d'accueil du téléphone : elles sont masquées, et la zone sûre du site (--sb) est fixée à 50 px comme dans le prototype. Les animations sont
// figées. Les écrans construits se comparent en mode prototype de la démonstration (tous les modules
// ouverts, repères de revue visibles), seul état où le prototype et le site montrent la même chose.
import { expect, test, type Page } from '@playwright/test'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import pixelmatch from 'pixelmatch'

// Seuil de couleur de pixelmatch : 0,01 ignore les écarts d'un ou deux niveaux (sur 255) que le rendu du
// processeur graphique donne parfois aux ombres et aux dégradés ; tout texte, position ou couleur réelle
// différente reste compté.
const SEUIL = 0.01
import { PNG } from 'pngjs'
import { corrigerPrototype } from '../outils/corrections.mjs'

const PROTO = new URL(
  '../../Work définitif pro — 6 interfaces/2 — BelivaY Espace client — paquet développeur/02_Prototype_HTML/BelivaY_Espace_Client_mobile.html',
  import.meta.url,
).href
interface P {
  route: string
  interrupteur: string | null
  etats: { adresse: string }[]
}
const PAGES: P[] = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const NAV: Record<string, { entete: string; barre: boolean }> = JSON.parse(readFileSync(new URL('../src/genere/navigation.json', import.meta.url), 'utf-8'))
// Une route est ouverte si elle n'a pas d'interrupteur ou si le sien l'est (src/config/interrupteurs.json, DP-50).
const INTERRUPTEURS: Record<string, boolean> = JSON.parse(readFileSync(new URL('../src/config/interrupteurs.json', import.meta.url), 'utf-8'))
const ouverte = (p: P) => !p.interrupteur || INTERRUPTEURS[p.interrupteur]
const OUVERTES = PAGES.filter(ouverte).map((p) => p.route)
const chemin = (r: string) => (r === 'accueil' ? '/' : '/' + r)
// Adresse d'un état du prototype (« #route?a=b ») sur le site (« /route?a=b »).
const adresseDuSite = (a: string) => {
  const [r, q] = a.replace(/^#/, '').split('?')
  return chemin(r) + (q ? '?' + q : '')
}

// Écrans construits (étape 6) : le Menu, et les routes de chaque document (src/pages/CL-xx/construits.json),
// comparés dans TOUS leurs états, sauf le pidgin (DP-13) et les états exclus avec leur raison.
// DP-54 : « repris » : routes reprises pour l'usage réel ; elles ne suivent plus le prototype et sortent de la
// comparaison (leurs gestes sont vérifiés par tests/gestes.spec.ts).
interface Construits {
  routes: string[]
  exclus?: Record<string, string>
  repris?: Record<string, string>
}
const DOCS = new URL('../src/pages/', import.meta.url)
const listes: Construits[] = readdirSync(DOCS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(new URL(d.name + '/construits.json', DOCS)))
  .map((d) => JSON.parse(readFileSync(new URL(d.name + '/construits.json', DOCS), 'utf-8')))
const EXCLUS: Record<string, string> = Object.assign({}, ...listes.map((l) => l.exclus || {}))
// DP-54 : routes reprises pour l'usage réel : ni l'écran ni la coque (en-tête, barre) ne suivent plus le prototype.
const REPRIS = new Set(listes.flatMap((l) => Object.keys(l.repris || {})))
const ETATS_CONSTRUITS = [
  ...(['#menu'] as string[]).filter((a) => !(a in EXCLUS)),
  ...listes
    .flatMap((l) => l.routes.filter((r) => !(l.repris && r in l.repris)))
    .flatMap((r) => [...new Set(['#' + r, ...PAGES.find((p) => p.route === r)!.etats.map((e) => e.adresse)])])
    // Exclus du site (outils/adresses.mjs) : le pidgin (DP-13), le remboursement sans retour (DP-10).
    .filter((a) => !/[?&](langue=pcm|pcm=1|st=sans-retour)\b/.test(a) && !(a in EXCLUS)),
]

const RENDUS = [
  { nom: 'clair', theme: 'light', lang: 'fr', text: 'normale' },
  { nom: 'sombre', theme: 'dark', lang: 'fr', text: 'normale' },
  { nom: 'anglais', theme: 'light', lang: 'en', text: 'normale' },
  { nom: 'texte grand', theme: 'light', lang: 'fr', text: 'grande' },
  { nom: 'texte très grand', theme: 'light', lang: 'fr', text: 'tres' },
] as const
type Rendu = (typeof RENDUS)[number]

// Masque le téléphone dessiné (prototype) et fixe la zone sûre (site).
// L'île BelivaY (.dyn, .dynb) est réservée à l'application : hors site, masquée comme la barre d'état.
const TELEPHONE = '.sb,.home-ind,.dyn,.dynb{visibility:hidden!important}'
// Coque seule : l'en-tête et la barre du bas sont en verre et floutent ce qui passe dessous ; pour juger
// la coque d'une page dont l'écran n'est pas encore construit, on cache tout le reste, des deux côtés.
const COQUE_SEULE = '#app>*:not(header.hd):not(nav.dock){visibility:hidden!important}'
// Barre du bas (nav.dock) exclue de la comparaison : barre ovale liquid glass, consigne du porteur (5 oct. 2026,
// vidéo WhatsApp iOS 26) — capsule flottante à 12 px des bords, onglet actif en capsule ovale, bulle de verre ovale
// (src/styles/animations.css, src/composants/BarreBas.tsx). Elle ne suit plus le prototype : masquée des deux côtés,
// partout ; l'en-tête et les écrans restent comparés au pixel. Ses onglets et sa place : tests/squelette.spec.ts, tests/larges.spec.ts.
const BARRE_OVALE = 'nav.dock{visibility:hidden!important}'
// Écran déroulé, comme le mode capture du prototype.
const DEROULE = '#app{height:auto!important;min-height:844px}main{position:relative!important;overflow:visible!important;height:auto!important}'

// Les animations finies (feuille qui monte, apparition) se terminent avant la capture, des deux côtés ;
// les animations sans fin (bandeau rotatif) sont figées par la capture elle-même.
const animationsFinies = (page: Page) =>
  page.waitForFunction(
    () => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
    undefined,
    { timeout: 5000 },
  )

// Horloge figée des deux côtés : un compte à rebours ne bouge pas pendant la comparaison.
const figerHorloge = async (page: Page) => {
  await page.clock.install({ time: new Date('2026-09-24T09:15:00Z') })
  await page.clock.pauseAt(new Date('2026-09-24T09:15:00.900Z')) // moins d'une seconde : aucun tic d'un compte à rebours
}

async function prototype(page: Page, route: string, r: Rendu, deroule: boolean) {
  await figerHorloge(page)
  await page.goto(`${PROTO}?theme=${r.theme}&lang=${r.lang}&text=${r.text}#${route.replace(/^#/, '')}`)
  await page.waitForSelector('#app main', { state: 'attached' })
  await page.addStyleTag({ content: TELEPHONE + BARRE_OVALE + (deroule ? DEROULE : COQUE_SEULE) })
  await corrigerPrototype(page, r.lang, route)
  await page.evaluate(() => document.fonts.ready)
  await animationsFinies(page)
}

async function site(page: Page, route: string, r: Rendu, deroule: boolean, modePrototype: boolean) {
  await figerHorloge(page)
  await page.addInitScript(
    ([t, l, x, p]) => {
      localStorage.setItem('blv_c_theme', t)
      localStorage.setItem('blv_c_lang', l)
      localStorage.setItem('blv_c_text', x)
      localStorage.setItem('blv_demo_prototype', p === '1' ? '1' : '0')
    },
    [r.theme, r.lang, r.text, modePrototype ? '1' : ''] as const,
  )
  await page.goto(route.startsWith('#') ? adresseDuSite(route) : chemin(route))
  await page.waitForSelector('#app main', { state: 'attached' })
  await page.waitForLoadState('networkidle') // fichier du document, dessins
  if (r.lang === 'en') await page.waitForFunction(() => document.documentElement.lang === 'en')
  await page.addStyleTag({ content: '#app{--sb:50px!important}' + BARRE_OVALE + (deroule ? DEROULE : COQUE_SEULE) })
  await page.evaluate(() => document.fonts.ready)
  await animationsFinies(page)
}

const png = async (page: Page, clip?: { x: number; y: number; width: number; height: number }) =>
  PNG.sync.read(await page.screenshot({ clip, fullPage: !clip, animations: 'disabled', caret: 'hide' }))

function ecart(a: PNG, b: PNG) {
  if (a.width !== b.width || a.height !== b.height) return { taille: `${a.width}×${a.height} ≠ ${b.width}×${b.height}`, pixels: -1 }
  const diff = new PNG({ width: a.width, height: a.height })
  const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: SEUIL })
  return { taille: '', pixels, diff }
}

async function boite(page: Page, sel: string) {
  return page.$eval(sel, (e) => {
    const r = e.getBoundingClientRect()
    return { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.width), height: Math.ceil(r.height) }
  })
}

for (const r of RENDUS) {
  test.describe(`coque identique au prototype, ${r.nom}`, () => {
    for (const route of OUVERTES.filter((x) => !REPRIS.has(x))) {
      const nav = NAV[route]
      const zones = nav.entete !== 'aucun' ? ['header.hd'] : [] // nav.dock : voir BARRE_OVALE
      if (!zones.length) continue
      test(route, async ({ browser }, info) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
        const [pp, ps] = [await ctx.newPage(), await ctx.newPage()]
        await prototype(pp, route, r, false)
        await site(ps, route, r, false, false)
        for (const sel of zones) {
          const [bp, bs] = [await boite(pp, sel), await boite(ps, sel)]
          expect(bs, `${sel} : position et taille`).toEqual(bp)
          const e = ecart(await png(pp, bp), await png(ps, bs))
          if (e.pixels) await info.attach(`${sel}-ecart.png`, { body: PNG.sync.write(e.diff!), contentType: 'image/png' })
          expect(e.pixels, `${sel} : pixels différents`).toBe(0)
        }
        await ctx.close()
      })
    }
  })
}

for (const r of RENDUS) {
  test.describe(`écran entier identique au prototype, ${r.nom}`, () => {
    for (const route of ETATS_CONSTRUITS) {
      test(route, async ({ browser }, info) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
        const [pp, ps] = [await ctx.newPage(), await ctx.newPage()]
        await prototype(pp, route, r, true)
        await site(ps, route, r, true, true)
        const [a, b] = [await png(pp), await png(ps)]
        const e = ecart(a, b)
        if (e.pixels) {
          // Images écrites aussi sur disque (test-results/…) pour les lire sans le rapport.
          writeFileSync(info.outputPath('prototype.png'), PNG.sync.write(a))
          writeFileSync(info.outputPath('site.png'), PNG.sync.write(b))
          if (e.diff) writeFileSync(info.outputPath('ecart.png'), PNG.sync.write(e.diff))
          await info.attach('prototype.png', { path: info.outputPath('prototype.png'), contentType: 'image/png' })
        }
        expect(e.taille, 'taille de l’écran').toBe('')
        expect(e.pixels, 'pixels différents').toBe(0)
        await ctx.close()
      })
    }
  })
}
