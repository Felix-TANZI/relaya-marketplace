// Reprend la feuille de styles du prototype vendeur (version du 1er octobre), telle qu'elle est écrite, pour que
// l'espace vendeur soit identique au pixel près (même méthode que site/outils/styles.mjs) :
// - toutes les feuilles <style> de l'en-tête, dans leur ordre, y compris celles qu'un écran n'ajoute qu'à son premier
//   affichage (texte d'origine, pas la reformulation du navigateur) ;
// - les polices Plus Jakarta Sans du prototype écrites dans src/assets/polices ;
// - sans ce qui n'existe que dans le prototype : cadre du téléphone, barre d'état et barre d'accueil dessinées, plan
//   des états (.blv-plan, .blv-bar), mode capture, île BelivaY (réservée à une application native, comme côté client).
// Écrit src/styles/prototype.css, les blocs de styles insérés DANS un écran (src/styles/ecrans/<empreinte>.css) et la
// liste des blocs de chaque état (src/genere/styles-ecrans.json). Lancer après outils/inventaire.mjs.
// Seule correction (DP-44 (3), CRD-07 ; Q-43 : mêmes règles que le client) : les tailles de police sous 12 px portées
// à 12 px, comme site/outils/styles.mjs ; tests/identique.spec.ts applique la même correction au prototype comparé.
// Les autres corrections de DP-44 (braise, contraste) sont dans src/styles/ecarts.css.
import { chromium } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { exclu } from './inventaire-commun.mjs'
import { PROTO } from './proto.mjs'

// Sélecteurs propres au prototype (outil de revue, dessin du téléphone, île), jamais dans l'application.
const HORS_SITE = [
  /#frame(?![\w-])/, /html\.cap(?![\w-])/, /\.blv-plan/, /\.blv-bar/, /#proto-toast(?![\w-])/,
  /(^|[\s,>+~(])\.sb(?![\w-])/, /\.home-ind(?![\w-])/, /#app\.has-dyn(?![\w-])/, /\.has-dyn(?![\w-])/,
  /\.dynb?(?![\w-])/, /\.ile-[\w-]+/, /\.dyn-[\w-]+/,
]
// Mises en page du prototype sur grand écran (téléphone dessiné, place du plan).
const MEDIAS_HORS_SITE = [/\(min-width:\s*520px\)/, /\(min-width:\s*1100px\)/]

// Barre d'état : le prototype la dessine sur 50 px et y glisse l'en-tête ; l'application prend la zone sûre (--sb).
const barreEtat = (selecteur, corps) =>
  /header\.hd/.test(selecteur) ? corps.replace(/padding(-top)?:50px/g, (m, top) => 'padding' + (top || '') + ':var(--sb)') : corps

const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
await page.goto(PROTO.href + '?theme=light&lang=fr&nosplash=1#accueil')
await page.waitForSelector('#app main', { state: 'attached' })
const feuilles = await page.evaluate(() => [...document.querySelectorAll('head style')].map((s) => ({ texte: s.textContent })))
const vues = new Set(feuilles.map((f) => f.texte))
const feuillesTardives = async () => {
  for (const texte of await page.evaluate(() => [...document.querySelectorAll('head style')].map((s) => s.textContent)))
    if (!vues.has(texte)) {
      vues.add(texte)
      feuilles.push({ texte })
    }
}

const blocs = new Map()
const stylesEcrans = {}
const releve = async (adresse) => {
  await page.goto('about:blank')
  await page.goto(PROTO.href + '?theme=light&lang=fr&nosplash=1' + adresse)
  await page.waitForSelector('#app', { state: 'attached' })
  await feuillesTardives()
  const textes = await page.evaluate(() => [...document.querySelectorAll('#app style')].map((s) => s.textContent))
  return textes.map((t) => {
    const h = createHash('sha1').update(t).digest('hex').slice(0, 10)
    if (!blocs.has(h)) blocs.set(h, t)
    return h
  })
}
for (const { route, etats } of PAGES) {
  stylesEcrans[route] = await releve('#' + route)
  for (const { adresse } of etats) if (adresse !== '#' + route && !exclu(adresse)) await releve(adresse)
}
await navigateur.close()

// Découpe une feuille en règles de premier niveau, en tenant compte des accolades et des chaînes.
function regles(css) {
  const out = []
  let i = 0
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++
    if (i >= css.length) break
    const debut = i
    let prof = 0
    let chaine = null
    for (; i < css.length; i++) {
      const c = css[i]
      if (chaine) {
        if (c === '\\') i++
        else if (c === chaine) chaine = null
        continue
      }
      if (c === '"' || c === "'") chaine = c
      else if (c === '{') prof++
      else if (c === '}') {
        prof--
        if (prof === 0) {
          i++
          break
        }
      } else if (c === ';' && prof === 0) {
        i++
        break
      }
    }
    out.push(css.slice(debut, i).trim())
  }
  return out
}

const polices = []
let retirees = 0
function filtre(css) {
  const garde = []
  for (const r of regles(css)) {
    const tete = r.slice(0, r.indexOf('{') < 0 ? r.length : r.indexOf('{')).trim()
    if (tete.startsWith('@font-face')) {
      const poids = /font-weight:\s*(\d+)/.exec(r)[1]
      const m = /url\(data:font\/woff2;base64,([^)]+)\)/.exec(r)
      polices.push({ poids, donnees: m[1] })
      garde.push(r.replace(m[0], `url(../assets/polices/plus-jakarta-sans-${poids}.woff2)`))
    } else if (tete.startsWith('@media') && MEDIAS_HORS_SITE.some((re) => re.test(tete))) {
      retirees++
    } else if (tete.startsWith('@media') || tete.startsWith('@supports')) {
      const corps = r.slice(r.indexOf('{') + 1, r.lastIndexOf('}'))
      const dedans = filtre(corps)
      if (dedans.trim()) garde.push(tete + '{' + dedans + '}')
    } else if (tete.startsWith('@')) {
      garde.push(r)
    } else {
      const selecteurs = tete.split(/,(?![^()]*\))/).map((s) => s.trim())
      const restants = selecteurs.filter((s) => !HORS_SITE.some((re) => re.test(s)))
      if (restants.length === selecteurs.length) garde.push(tete + barreEtat(tete, r.slice(r.indexOf('{'))))
      else if (restants.length) garde.push(restants.join(',') + barreEtat(restants.join(','), r.slice(r.indexOf('{'))))
      else retirees++
    }
  }
  return garde.join('\n')
}
const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

// Images incluses (data:) → fichiers, nommés par leur empreinte.
const IMAGES = new URL('../src/assets/prototype/', import.meta.url)
mkdirSync(IMAGES, { recursive: true })
let images = 0
const sansImages = (css, prefixe) =>
  css.replace(/url\((["']?)data:image\/(png|jpeg|jpg|webp|gif|svg\+xml)(;base64)?,([^)"']+)\1\)/g, (m, q, type, b64, donnees) => {
    const octets = b64 ? Buffer.from(donnees, 'base64') : Buffer.from(decodeURIComponent(donnees))
    const ext = { png: 'png', jpeg: 'jpg', jpg: 'jpg', webp: 'webp', gif: 'gif', 'svg+xml': 'svg' }[type]
    const nom = createHash('sha1').update(octets).digest('hex').slice(0, 12) + '.' + ext
    writeFileSync(new URL(nom, IMAGES), octets)
    images++
    return `url(${prefixe}assets/prototype/${nom})`
  })

// DP-44 (3) : aucun texte sous 12 px (CRD-07). Toute taille de police plus petite passe à 12 px.
let douzes = 0
const douze = (css) =>
  css
    .replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (m, v) => (Number(v) < 12 ? (douzes++, 'font-size:12px') : m))
    .replace(/--fs-11:\s*11px/g, () => (douzes++, '--fs-11:12px'))
const sortie = feuilles.map((f, i) => `/* ---------- feuille ${i + 1} du prototype ---------- */\n` + sansImages(douze(filtre(sansCommentaires(f.texte))), '../')).join('\n')
const ECRANS = new URL('../src/styles/ecrans/', import.meta.url)
rmSync(ECRANS, { recursive: true, force: true })
mkdirSync(ECRANS, { recursive: true })
for (const [h, t] of blocs)
  writeFileSync(new URL(h + '.css', ECRANS), '/* Généré par outils/styles.mjs (styles insérés dans l’écran par le prototype). */\n' + sansImages(douze(filtre(sansCommentaires(t))), '../../') + '\n')
writeFileSync(new URL('../src/genere/styles-ecrans.json', import.meta.url), JSON.stringify(stylesEcrans, null, 1) + '\n')
mkdirSync(new URL('../src/assets/polices/', import.meta.url), { recursive: true })
for (const p of polices) writeFileSync(new URL(`../src/assets/polices/plus-jakarta-sans-${p.poids}.woff2`, import.meta.url), Buffer.from(p.donnees, 'base64'))
writeFileSync(
  new URL('../src/styles/prototype.css', import.meta.url),
  '/* Généré par outils/styles.mjs depuis le prototype vendeur du 1er octobre : ne pas modifier à la main.\n   Seule correction : les tailles de police sous 12 px portées à 12 px (DP-44, CRD-07). */\n' + sortie + '\n',
)
console.log(
  `${feuilles.length} feuilles, ${polices.length} polices, ${retirees} règles propres au prototype retirées, ${Math.round(sortie.length / 1024)} ko ; ` +
    `${blocs.size} blocs de styles d'écran, ${images} images extraites ; ${douzes} tailles de police portées à 12 px (DP-44)`,
)
