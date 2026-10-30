// Relit le PROTOTYPE de la console (navigateur sans écran, Playwright) et écrit src/genere/ecrans.json : pour chaque
// route du prototype, ce que l'écran montre — page ADM-Pxx, document ADM-xx, titre, surtitre, sous-titre, états (plan
// du prototype, MANIFEST) et titres des sections et panneaux, dans l'ordre. Les pages provisoires l'affichent
// (src/pages/Provisoire.tsx) ; l'agent qui reprend l'écran garde ces blocs dans cet ordre (METHODE.md).
// Usage : node outils/ecrans.mjs (après une mise à jour du paquet ; npm run donnees).
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { trouverPrototype } from './proto.mjs'

const fichier = trouverPrototype()
if (!fichier) throw new Error('prototype de la console introuvable : poser PROTO_ADMIN=<chemin du fichier HTML>')
const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(pathToFileURL(fichier).href + '?device=desktop&lang=fr&theme=light#file')
await page.waitForFunction(() => typeof window.MANIFEST === 'function')
const manifeste = await page.evaluate(() => window.MANIFEST())
const routes = [...new Set(manifeste.map((m) => m.route))]
const nettoyer = (x) => x.replace(/[\s  ]+/g, ' ').trim()
const sortie = {}
for (const route of routes) {
  await page.evaluate((r) => (location.hash = r), route)
  await page.waitForTimeout(60)
  const vu = await page.evaluate(() => {
    const txt = (s) => document.querySelector(s)?.textContent ?? ''
    const sections = [...document.querySelectorAll('main .sec h2, main .panel .ph h3, main .card-t, main .divider-t, main .hero .hk')].map((e) => e.textContent ?? '')
    return { titre: txt('main .dk-head .pg-t'), kicker: txt('main .dk-head .pg-k'), sous: txt('main .dk-head .pg-s'), sections }
  })
  const etats = manifeste.filter((m) => m.route === route)
  sortie[route] = {
    page: etats[0].page,
    titre: nettoyer(vu.titre || etats[0].title),
    doc: etats[0].doc ?? '',
    kicker: nettoyer(vu.kicker),
    sous: nettoyer(vu.sous),
    etats: etats.map((m) => nettoyer(m.label)),
    sections: [...new Set(vu.sections.map(nettoyer).filter(Boolean))].slice(0, 40),
  }
}
await navigateur.close()
writeFileSync(new URL('../src/genere/ecrans.json', import.meta.url), JSON.stringify(sortie, null, 1) + '\n')
console.log(`${routes.length} écrans du prototype → src/genere/ecrans.json`)
