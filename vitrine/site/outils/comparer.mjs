// Compare un écran du site à celui du prototype et montre où ils diffèrent (outil de l'étape 6).
// Le site doit tourner : npm run build, puis npx vite preview --port 4175 (ou PORT_SITE).
// La route peut porter un état : « numero?st=code&from=panier ».
//   node outils/comparer.mjs <route> <page | sélecteur CSS> <préfixe des fichiers> [light|dark] [fr|en] [mode prototype 0|1] [déroulé 0|1]
// Écrit <préfixe>-proto.png, -site.png, -ecart.png (captures en double densité) et une image par bande
// de différences (-zN-proto.png, -zN-site.png). Mêmes réglages que tests/identique.spec.ts.
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import pixelmatch from 'pixelmatch'

// Seuil de couleur de pixelmatch : 0,01 ignore les écarts d'un ou deux niveaux (sur 255) que le rendu du
// processeur graphique donne parfois aux ombres et aux dégradés ; tout texte, position ou couleur réelle
// différente reste compté.
const SEUIL = 0.01
import { PNG } from 'pngjs'
import { bandes } from './bandes.mjs'
import { corrigerPrototype } from './corrections.mjs'

const PROTO = new URL(
  '../../Work définitif pro — 6 interfaces/2 — BelivaY Espace client — paquet développeur/02_Prototype_HTML/BelivaY_Espace_Client_mobile.html',
  import.meta.url,
).href
const [route, cible, sortie, theme = 'light', lang = 'fr', modePrototype = '0', derouleArg = '0'] = process.argv.slice(2)
const deroule = derouleArg === '1'
const TELEPHONE = '.sb,.home-ind,.dyn,.dynb{visibility:hidden!important}'
const COQUE_SEULE = '#app>*:not(header.hd):not(nav.dock){visibility:hidden!important}'
const DEROULE = '#app{height:auto!important;min-height:844px}main{position:relative!important;overflow:visible!important;height:auto!important}'
const reglage = cible === 'page' ? (deroule ? DEROULE : '') : COQUE_SEULE

const navigateur = await chromium.launch()
const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const pp = await ctx.newPage()
const ps = await ctx.newPage()

await pp.goto(`${PROTO}?theme=${theme}&lang=${lang}&text=normale#${route}`)
await pp.waitForSelector('#app main', { state: 'attached' })
await pp.addStyleTag({ content: TELEPHONE + reglage })
await corrigerPrototype(pp, lang, route) // corrections du porteur (DP-44)
await pp.evaluate(() => document.fonts.ready)

await ps.addInitScript(
  ([t, l, p]) => {
    localStorage.setItem('blv_c_theme', t)
    localStorage.setItem('blv_c_lang', l)
    localStorage.setItem('blv_demo_prototype', p)
  },
  [theme, lang, modePrototype],
)
const [r0, q0] = route.split('?')
await ps.goto(`http://localhost:${process.env.PORT_SITE || 4175}` + (r0 === 'accueil' ? '/' : '/' + r0) + (q0 ? '?' + q0 : ''))
await ps.waitForSelector('#app main', { state: 'attached' })
if (lang === 'en') await ps.waitForFunction(() => document.documentElement.lang === 'en')
await ps.addStyleTag({ content: '#app{--sb:50px!important}' + reglage })
await ps.evaluate(() => document.fonts.ready)

const capture = async (p) => {
  if (cible === 'page') return p.screenshot({ fullPage: true, animations: 'disabled' })
  const clip = await p.$eval(cible, (e) => {
    const r = e.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  return p.screenshot({ clip, animations: 'disabled' })
}
const a = await capture(pp)
const b = await capture(ps)
await navigateur.close()

writeFileSync(sortie + '-proto.png', a)
writeFileSync(sortie + '-site.png', b)
const A = PNG.sync.read(a)
const B = PNG.sync.read(b)
if (A.width !== B.width || A.height !== B.height) {
  console.log(`tailles différentes : prototype ${A.width}×${A.height}, site ${B.width}×${B.height}`)
} else {
  const d = new PNG({ width: A.width, height: A.height })
  console.log('pixels différents :', pixelmatch(A.data, B.data, d.data, A.width, A.height, { threshold: SEUIL }))
  writeFileSync(sortie + '-ecart.png', PNG.sync.write(d))
  bandes(sortie)
}
