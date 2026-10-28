// Relève, pour CHAQUE ÉTAT des routes (src/genere/pages.json), ce que le prototype vendeur en marche affiche autour du
// contenu : type d'en-tête, titre, parent du bouton retour, contenu de l'en-tête racine (pastilles, avatar, cloche),
// barre du bas (onglet allumé, badges, point), marge haute et style du contenu, blocs de styles de l'écran.
// Écrit src/genere/etats.json (clé de l'état → relevé). La coque (src/composants/coque.tsx, Ecran parEtat) s'en sert
// pour les pages provisoires : l'en-tête et la barre suivent le prototype état par état, sans rien recopier.
//   node outils/etats.mjs [route…]   (sans argument : toutes les routes)
import { chromium } from '@playwright/test'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { cleEtat, exclu } from './inventaire-commun.mjs'
import { PROTO } from './proto.mjs'

const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const ROUTES = new Set(PAGES.map((p) => p.route))
const SORTIE = new URL('../src/genere/etats.json', import.meta.url)
const demandees = process.argv.slice(2)
// Les pages ajoutées (DP-58) n'existent pas dans le prototype : leur état est écrit par outils/inventaire.mjs, gardé ici.
const pages = PAGES.filter((p) => !p.ajoutee && (!demandees.length || demandees.includes(p.route)))
const ancien = existsSync(SORTIE) ? JSON.parse(readFileSync(SORTIE, 'utf-8')) : {}
const sortie = demandees.length ? ancien : Object.fromEntries(PAGES.filter((p) => p.ajoutee && ancien[p.route]).map((p) => [p.route, ancien[p.route]]))

const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
const erreurs = []
page.on('pageerror', (e) => erreurs.push(e.message))

for (const { route, etats } of pages) {
  for (const { adresse } of etats) {
    if (exclu(adresse)) continue
    await page.goto('about:blank')
    await page.goto(PROTO.href + '?theme=light&lang=fr&text=normale&nosplash=1' + adresse)
    await page.waitForSelector('#app', { state: 'attached' })
    const v = await page.evaluate(() => {
      const q = (s) => document.querySelector(s)
      const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      const norme = (h) => ((tmp.innerHTML = h), tmp.innerHTML.replace(/\s+/g, ''))
      const inv = new Map(Object.entries(ICONS).map(([k, c]) => [norme(c), k])) // eslint-disable-line no-undef
      const icone = (e) => {
        const s = e?.querySelector(':scope > svg')
        return s ? (inv.get(norme(s.innerHTML)) ?? null) : null
      }
      const sub = q('.hd-sub')
      const main = q('#app > main')
      const racine = q('.hd-row')
        ? {
            pastilles: [...document.querySelectorAll('.hd-pills .pill')].map((p) => ({
              ton: [...p.classList].filter((c) => c !== 'pill').join(' '),
              point: !!p.querySelector('i.d'),
              icone: icone(p),
              texte: p.textContent,
            })),
            libelle: q('.hd-label')?.textContent ?? null,
            avatar: q('.hd-row .avatar')?.textContent ?? null,
            cloche: q('.hd-row a[href="#notifications"] .bdg')?.textContent ?? null,
          }
        : null
      const dock = q('nav.dock')
      return {
        adresse: location.hash,
        entete: sub ? 'enfant' : q('.hd-row') ? 'racine' : 'aucun',
        titre: sub ? (q('.hd-sub h1')?.textContent ?? '') : null,
        retour: sub ? (sub.querySelector(':scope > a:first-child')?.getAttribute('href') ?? null) : null,
        styleEntete: q('header.hd')?.getAttribute('style') ?? null,
        racine,
        barre: dock
          ? {
              onglet: dock.querySelector('.tab.on')?.getAttribute('href')?.slice(1).split('?')[0] ?? null,
              badges: Object.fromEntries([...dock.querySelectorAll('.tab')].map((t) => [t.getAttribute('href').slice(1).split('?')[0], t.querySelector('.bdg')?.textContent ?? null])),
              point: !!dock.querySelector('.dot'),
            }
          : null,
        styleMain: main?.getAttribute('style') ?? '',
        classesApp: [...q('#app').classList].filter((c) => !/^(has-)?dyn/.test(c)),
        styles: [...document.querySelectorAll('#app style')].map((s) => s.textContent),
        profil: !!q('#app .pm'),
      }
    })
    if (decodeURIComponent(v.adresse) !== decodeURIComponent(adresse)) throw new Error(`${adresse} : le prototype a redirigé vers ${v.adresse}`)
    const m = /padding-top:(\d+)px/.exec(v.styleMain)
    if (v.retour && v.retour !== '#' && !ROUTES.has(v.retour.replace(/^#/, '').split('?')[0])) throw new Error(`${adresse} : retour vers ${v.retour}`)
    sortie[cleEtat(adresse)] = {
      route,
      adresse,
      entete: v.entete,
      titre: v.titre,
      retour: v.retour,
      ...(v.styleEntete ? { styleEntete: v.styleEntete } : {}),
      ...(v.racine ? { racine: v.racine } : {}),
      barre: v.barre,
      // Marge haute : le prototype la donne barre d'état de 50 px comprise ; l'application prend la zone sûre (--sb).
      margeHaute: m ? Number(m[1]) - 50 : null,
      styleMain: v.styleMain.replace(/padding-top:\d+px;?/, '').trim(),
      classesApp: v.classesApp,
      styles: v.styles.map((t) => createHash('sha1').update(t).digest('hex').slice(0, 10)),
      ...(v.profil ? { profil: true } : {}),
    }
  }
}
await navigateur.close()
if (erreurs.length) throw new Error('erreurs du prototype : ' + erreurs.slice(0, 3).join(' | '))
writeFileSync(SORTIE, JSON.stringify(Object.fromEntries(Object.entries(sortie).sort(([a], [b]) => (a < b ? -1 : 1))), null, 1) + '\n')
console.log(`${Object.keys(sortie).length} états relevés`)
