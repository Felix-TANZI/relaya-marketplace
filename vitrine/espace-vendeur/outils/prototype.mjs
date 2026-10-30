// Lit le prototype vendeur EN MARCHE et écrit, dans src/genere :
// - en.json : le dictionnaire anglais du prototype (EN, 2 720 entrées), complété des paires français / anglais que le
//   prototype écrit directement dans son code (LX(fr, en), écrans du 1er octobre), relevées sur chaque état ;
// - icones.json : les icônes Lucide du prototype vendeur (ICONS ; 5 tracés diffèrent du client) ;
// et, dans src/assets : le logo de l'en-tête racine et la marque de l'en-tête enfant (images incluses du prototype).
// Lancer après outils/inventaire.mjs.
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { decalerDico } from '../../site/outils/decaler-dates.mjs'
import { logosOfficiels } from '../../site/outils/logos-marques.mjs'
import { exclu } from './inventaire-commun.mjs'
import { PROTO } from './proto.mjs'

const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const ecrire = (nom, v) => writeFileSync(new URL('../src/genere/' + nom, import.meta.url), JSON.stringify(v, null, 1) + '\n')
const trie = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))

const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
const erreurs = []
page.on('pageerror', (e) => erreurs.push(e.message))

await page.goto(PROTO.href + '?theme=light&lang=fr&nosplash=1#accueil')
await page.waitForSelector('#app main', { state: 'attached' })
const { en, icones, logo, marque, art, photos, lancement } = await page.evaluate(() => ({
  en: EN, // eslint-disable-line no-undef
  icones: ICONS, // eslint-disable-line no-undef
  // Illustrations nommées du prototype (ART : produits et portraits ; PHOTO : photos dessinées de preuve), sans marque.
  art: Object.fromEntries(Object.keys(ART).map((k) => [k, ART[k]()]).filter(([, v]) => !v.includes("undefined"))), // eslint-disable-line no-undef
  photos: Object.fromEntries(Object.keys(PHOTO).map((k) => [k, PHOTO[k]()])), // eslint-disable-line no-undef
  lancement: SPL_SVG, // eslint-disable-line no-undef
  logo: document.querySelector('.hd-logo img').getAttribute('src'),
  marque: null,
}))
await page.goto(PROTO.href + '?theme=light&lang=fr&nosplash=1#menu')
await page.waitForSelector('#app main', { state: 'attached' })
const m2 = await page.evaluate(() => document.querySelector('.hd-mark img')?.getAttribute('src') ?? null)

const ASSETS = new URL('../src/assets/', import.meta.url)
mkdirSync(ASSETS, { recursive: true })
const versFichier = (uri, nom) => {
  const m = /^data:image\/(png|jpeg|svg\+xml)(;base64)?,(.*)$/s.exec(uri)
  if (!m) throw new Error('image inconnue : ' + uri.slice(0, 40))
  const ext = { png: 'png', jpeg: 'jpg', 'svg+xml': 'svg' }[m[1]]
  writeFileSync(new URL(nom + '.' + ext, ASSETS), m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3])))
  return nom + '.' + ext
}
const fichiers = [versFichier(logo, 'logo-belivay'), m2 ? versFichier(m2, 'marque-belivay') : null]
void marque

// Paires LX(fr, en) : LX est remplacée par une fonction qui note chaque paire, puis l'état est redessiné.
const nrm = (t) => t.replace(/[\s  ]+/g, ' ').trim()
const paires = {}
for (const { etats } of PAGES)
  for (const { adresse } of etats) {
    if (exclu(adresse)) continue
    await page.goto('about:blank')
    await page.goto(PROTO.href + '?theme=light&lang=fr&nosplash=1&cap=1' + adresse)
    await page.waitForSelector('#app', { state: 'attached' })
    const vues = await page.evaluate(() => {
      const notees = []
      window.LX = (fr, en) => (notees.push([fr, en]), LANG === 'en' ? en : fr) // eslint-disable-line no-undef
      render() // eslint-disable-line no-undef
      // Une paire avec du balisage : texte à texte, nœud par nœud, si les deux ont la même forme.
      const textes = (html) => {
        const t = document.createElement('template')
        t.innerHTML = html
        const w = document.createTreeWalker(t.content, NodeFilter.SHOW_TEXT)
        const l = []
        let n
        while ((n = w.nextNode())) if (n.nodeValue.trim()) l.push(n.nodeValue)
        return l
      }
      const out = []
      for (const [fr, en] of notees) {
        if (typeof fr !== 'string' || typeof en !== 'string') continue
        const a = textes(fr)
        const b = textes(en)
        if (a.length === b.length) a.forEach((x, i) => out.push([x, b[i]]))
      }
      return out
    })
    for (const [fr, enTexte] of vues) {
      const k = nrm(fr)
      if (k && !(k in en) && k !== nrm(enTexte)) paires[k] = nrm(enTexte)
    }
  }
await navigateur.close()
if (erreurs.length) throw new Error('erreurs du prototype : ' + erreurs.slice(0, 3).join(' | '))

// Dates du jeu d'essai décalées au jour commun de la démonstration (13 oct., site/outils/decaler-dates.mjs).
ecrire('en.json', trie(decalerDico({ ...paires, ...en }, 22, { reference: Date.UTC(2026, 8, 21) })))
// Pomme du prototype = pomme-fruit : le tracé officiel d'Apple l'écrase (site/outils/logos-marques.mjs).
ecrire('icones.json', trie(logosOfficiels(icones)))
ecrire('illustrations.json', { art, photos, lancement })
console.log(`${Object.keys(en).length} traductions du dictionnaire + ${Object.keys(paires).length} paires LX ; ${Object.keys(icones).length} icônes ; ${fichiers.filter(Boolean).join(', ')}`)
