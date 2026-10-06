// Illustrations du jeu d'essai, dessinées par le prototype (portraits, vignettes des univers), reprises
// telles quelles dans src/demo/illustrations.json. Ce sont des données de démonstration : en production,
// ce seront les photos servies par l'API. Lancer avec npm run donnees.
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const PROTO = new URL(
  '../../Work définitif pro — 6 interfaces/2 — BelivaY Espace client — paquet développeur/02_Prototype_HTML/BelivaY_Espace_Client_mobile.html',
  import.meta.url,
)
const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
const ouvrir = async (route, theme = 'light') => {
  await page.goto('about:blank')
  await page.goto(PROTO.href + '?theme=' + theme + '&lang=fr#' + route)
  await page.waitForSelector('#app main', { state: 'attached' })
}

// Les vignettes des univers sont dessinées aux couleurs du thème : on les relève en clair et en sombre.
const sortie = { portraits: {}, univers: {}, universSombre: {} }
await ouvrir('accueil')
sortie.portraits['carine-36'] = await page.$eval('.hd-av .portrait', (e) => e.innerHTML)
await ouvrir('menu')
sortie.portraits['carine-48'] = await page.$eval('main a.card.row[href="#compte"] .portrait', (e) => e.innerHTML)
const vignettes = () =>
  page.$$eval('.mn-uni a', (as) =>
    Object.fromEntries(as.map((a) => [new URLSearchParams(a.getAttribute('href').split('?')[1]).get('cat'), a.querySelector('.th').innerHTML])),
  )
Object.assign(sortie.univers, await vignettes())
await ouvrir('menu', 'dark')
Object.assign(sortie.universSombre, await vignettes())
const portraitSombre = await page.$eval('main a.card.row[href="#compte"] .portrait', (e) => e.innerHTML)
if (portraitSombre !== sortie.portraits['carine-48']) throw new Error('le portrait change avec le thème : à relever aussi en sombre')
await navigateur.close()

writeFileSync(new URL('../src/demo/illustrations.json', import.meta.url), JSON.stringify(sortie, null, 1) + '\n')
console.log(`illustrations de démonstration : ${Object.keys(sortie.portraits).length} portraits, ${Object.keys(sortie.univers).length} univers`)
