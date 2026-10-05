// Textes que le prototype écrit directement en anglais, sans passer par son dictionnaire (page du payeur,
// horloge d'une notification…) : pour chaque état des écrans construits, le prototype est rendu en français
// puis en anglais, les nœuds de texte sont appariés dans l'ordre. Un texte français que le prototype affiche
// partout autrement que son dictionnaire (absent, ou entrée fausse) devient une entrée de src/genere/en-etats.json
// (clé = texte français normalisé), qui l'emporte sur le dictionnaire ; un texte qu'une route seulement affiche
// autrement (titre d'une page légale, bouton de langue) devient une entrée de src/genere/en-routes.json, que
// t() lit d'abord sur cette route. Un état dont les deux rendus n'ont pas le même nombre de nœuds est signalé.
//   node outils/anglais.mjs
import { chromium } from '@playwright/test'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { exclu } from './adresses.mjs'

const PROTO = new URL(
  '../../Work définitif pro — 6 interfaces/2 — BelivaY Espace client — paquet développeur/02_Prototype_HTML/BelivaY_Espace_Client_mobile.html',
  import.meta.url,
)
const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const DICO = JSON.parse(readFileSync(new URL('../src/genere/en.json', import.meta.url), 'utf-8'))
const DOCS = new URL('../src/pages/', import.meta.url)
const cle = (t) => t.replace(/[\s  ]+/g, ' ').trim()

const adresses = readdirSync(DOCS)
  .filter((d) => existsSync(new URL(d + '/construits.json', DOCS)))
  .flatMap((d) => JSON.parse(readFileSync(new URL(d + '/construits.json', DOCS), 'utf-8')).routes)
  .flatMap((r) => [...new Set(['#' + r, ...PAGES.find((p) => p.route === r).etats.map((e) => e.adresse)])])
  .filter((a) => !exclu(a))

const textes = () => {
  const w = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement.closest('style, script, .sb, .dyn, .dynb, .home-ind') || !n.nodeValue.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  })
  const out = []
  let n
  while ((n = w.nextNode())) out.push(n.nodeValue)
  return out
}

const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
// Pour chaque texte français : ce que le prototype affiche en anglais, route par route.
const vus = {}
const desaccords = []
for (const adresse of adresses) {
  const rendu = {}
  for (const lang of ['fr', 'en']) {
    await page.goto('about:blank')
    await page.goto(PROTO.href + `?theme=light&lang=${lang}&text=normale` + adresse)
    await page.waitForSelector('#app main', { state: 'attached' })
    rendu[lang] = await page.evaluate(textes)
  }
  if (rendu.fr.length !== rendu.en.length) {
    desaccords.push(`${adresse} : ${rendu.fr.length} nœuds en français, ${rendu.en.length} en anglais`)
    continue
  }
  const route = adresse.slice(1).split('?')[0]
  rendu.fr.forEach((fr, i) => {
    const k = cle(fr)
    const en = cle(rendu.en[i])
    // Un texte laissé tel quel compte aussi (« FR » du payeur) : il décide de la traduction par défaut.
    if (!k || !/[A-Za-zÀ-ÿ]|\d:\d\d/.test(k + en)) return
    ;((vus[k] ??= {})[route] ??= new Set()).add(en)
  })
}
await navigateur.close()

// On compare les lettres, la mise en forme des nombres mise à part.
const lettres = (v) => v.replace(/[^A-Za-zÀ-ÿ]/g, '')
// Traduction par défaut : celle du dictionnaire si le prototype l'affiche quelque part, sinon la plus vue
// (entrée fausse ou absente du dictionnaire : src/genere/en-etats.json). Une route qui affiche autre chose
// (titre d'une page légale, texte écrit par le code d'un écran) a sa traduction à elle : src/genere/en-routes.json.
const entrees = {}
const parRoute = {}
const conflits = []
for (const [k, routes] of Object.entries(vus)) {
  const toutes = Object.values(routes).flatMap((s) => [...s])
  let defaut = k in DICO && toutes.some((en) => lettres(en) === lettres(DICO[k])) ? DICO[k] : null
  if (defaut === null) {
    const compte = {}
    for (const en of toutes) compte[en] = (compte[en] ?? 0) + 1
    defaut = Object.entries(compte).sort((x, y) => y[1] - x[1])[0][0]
    if (defaut !== k) entrees[k] = defaut
  }
  for (const [route, s] of Object.entries(routes)) {
    const autres = [...s].filter((en) => lettres(en) !== lettres(defaut))
    if (!autres.length) continue
    if (s.size > 1) conflits.push(`${JSON.stringify(k)} sur ${route} : ${[...s].map((x) => JSON.stringify(x)).join(' / ')}`)
    ;(parRoute[route] ??= {})[k] = autres[0]
  }
}
const trie = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)))
writeFileSync(new URL('../src/genere/en-etats.json', import.meta.url), JSON.stringify(trie(entrees), null, 1) + '\n')
writeFileSync(
  new URL('../src/genere/en-routes.json', import.meta.url),
  JSON.stringify(trie(Object.fromEntries(Object.entries(parRoute).map(([r, o]) => [r, trie(o)]))), null, 1) + '\n',
)
console.log(`${adresses.length} états, ${Object.keys(entrees).length} textes anglais hors dictionnaire, ${Object.values(parRoute).reduce((n, o) => n + Object.keys(o).length, 0)} propres à une route`)
if (conflits.length) console.log('traductions différentes sur une même route (première gardée) :\n  ' + conflits.join('\n  '))
if (desaccords.length) console.log('états non appariés :\n  ' + desaccords.join('\n  '))
