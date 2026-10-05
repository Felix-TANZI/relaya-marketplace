// Relève le balisage d'un écran du prototype (outil de l'étape 6) : chaque icône est nommée
// ({ic:nom taille}), les dessins (portraits, produits) sont mis à part dans <sortie>.arts.json, les styles
// insérés remplacés par [style], les images incluses abrégées.
//   node outils/releve.mjs <route> <sélecteur CSS> <sortie.html> [light|dark] [fr|en]
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const PROTO = new URL(
  '../../Work définitif pro — 6 interfaces/2 — BelivaY Espace client — paquet développeur/02_Prototype_HTML/BelivaY_Espace_Client_mobile.html',
  import.meta.url,
)
const [route, selecteur, sortie, theme = 'light', lang = 'fr'] = process.argv.slice(2)

const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
await page.goto(`${PROTO.href}?theme=${theme}&lang=${lang}#${route}`)
await page.waitForSelector('#app main', { state: 'attached' })
const r = await page.evaluate((sel) => {
  // Le navigateur réécrit le SVG : on compare les icônes une fois réécrites de la même façon.
  const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const norme = (h) => {
    tmp.innerHTML = h
    return tmp.innerHTML.replace(/\s+/g, '')
  }
  const icones = new Map(Object.entries(ICONS).map(([k, v]) => [norme(v), k])) // eslint-disable-line no-undef
  const racine = document.querySelector(sel).cloneNode(true)
  racine.querySelectorAll('style').forEach((s) => s.replaceWith('[style]'))
  const arts = []
  racine.querySelectorAll('svg').forEach((s) => {
    const nom = icones.get(norme(s.innerHTML))
    if (!nom) {
      arts.push(s.outerHTML)
      return s.replaceWith(`{art#${arts.length - 1}}`)
    }
    const trait = s.getAttribute('stroke-width') !== '1.9' ? ' sw=' + s.getAttribute('stroke-width') : ''
    const style = s.getAttribute('style') ? ` style="${s.getAttribute('style')}"` : ''
    s.replaceWith(`{ic:${nom} ${s.getAttribute('width')}${trait}${style}}`)
  })
  racine.querySelectorAll('img').forEach((i) => i.setAttribute('src', i.src.startsWith('data:') ? `data:…(${i.src.length})` : i.src))
  return { html: racine.outerHTML, arts }
}, selecteur)
await navigateur.close()

writeFileSync(sortie, r.html.replace(/></g, '>\n<'))
writeFileSync(sortie + '.arts.json', JSON.stringify(r.arts, null, 1))
console.log(`${r.arts.length} dessins mis à part`)
