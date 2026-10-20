// États que le prototype n'atteint que par un lien (« Voir une feuille du bas » → #kit?st=feuille…) : absents du
// plan du prototype, donc de logique-metier/pages.json. Chaque adresse complète d'un lien du prototype, vers une
// route du site, est rendue ; si elle ne s'affiche pas comme l'état que le site montrerait à sa place (l'adresse
// nue de la route), elle devient un état de sa route : logique-metier/etats-lies.json, que
// logique-metier/outils/site.py ajoute aux états de src/genere/pages.json (DP-50 : tout le prototype visible).
//   node outils/etats-lies.mjs
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { cleEtat, exclu } from './adresses.mjs'

const PROTO = new URL(
  '../../Work définitif pro — 6 interfaces/2 — BelivaY Espace client — paquet développeur/02_Prototype_HTML/BelivaY_Espace_Client_mobile.html',
  import.meta.url,
)
const SORTIE = new URL('../../logique-metier/etats-lies.json', import.meta.url)
const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const ROUTES = new Set(PAGES.map((p) => p.route))
// États déjà connus : ceux du plan (sans ceux que cet outil a ajoutés), plus l'adresse nue de chaque route.
const connus = new Set(PAGES.flatMap((p) => ['#' + p.route, ...p.etats.filter((e) => !e.lie).map((e) => e.adresse)]).map(cleEtat))

// Adresses complètes des liens du prototype : « #route?… » écrite en entier (pas « #code?ref=' + ref »).
const source = readFileSync(fileURLToPath(PROTO), 'utf-8')
const liens = [...new Set([...source.matchAll(/['"](#[a-z0-9-]+\?[^'"\s<>]*)['"]/g)].map((m) => m[1].replace(/&amp;/g, '&')))]
  .filter((a) => ROUTES.has(a.slice(1).split('?')[0]) && !/[=?&]$/.test(a) && !exclu(a))
  .filter((a) => !connus.has(cleEtat(a)))
  .sort()

// Rendu comparable d'une adresse : #app sans le téléphone dessiné ni le message de revue, horloge figée.
async function rendu(page, adresse) {
  await page.goto('about:blank')
  await page.goto(PROTO.href + '?theme=light&lang=fr&text=normale' + adresse)
  await page.waitForSelector('#app main', { state: 'attached' })
  return page.evaluate(() => {
    const app = document.getElementById('app').cloneNode(true)
    app.querySelectorAll('.sb, .dyn, .dynb, .home-ind, #proto-toast').forEach((e) => e.remove())
    return app.innerHTML
  })
}

const navigateur = await chromium.launch()
const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 } })
await contexte.clock.install({ time: new Date('2026-09-24T09:15:00Z') })
await contexte.clock.pauseAt(new Date('2026-09-24T09:15:00.900Z'))
const page = await contexte.newPage()
const nus = {}
const lies = []
for (const adresse of liens) {
  const route = adresse.slice(1).split('?')[0]
  nus[route] ??= await rendu(page, '#' + route)
  if ((await rendu(page, adresse)) !== nus[route]) lies.push({ route, adresse, libelle: 'Atteint par un lien du prototype' })
}
await navigateur.close()
writeFileSync(SORTIE, JSON.stringify(lies, null, 1) + '\n')
console.log(`${liens.length} adresses de liens hors plan, ${lies.length} affichées autrement que l'adresse nue`)
