// Relève, pour CHAQUE ÉTAT des routes ouvertes (adresses de logique-metier/pages.json), ce que le prototype en
// marche affiche autour du contenu : type d'en-tête, titre et sous-titre, parent du bouton retour, élément de
// droite, barre du bas (onglet allumé, badges), marge haute et style du contenu, classes de #app, et les blocs
// de styles que l'écran insère. Écrit src/genere/etats.json (adresse → relevé) et les blocs de styles
// manquants dans src/styles/ecrans/ (même nommage que outils/styles.mjs).
// Un écran construit (étape 6) lit le relevé de son état : l'en-tête, la barre du bas et les styles suivent
// le prototype état par état, sans rien recopier à la main.
//   node outils/etats.mjs [route…]   (sans argument : toutes les routes ouvertes)
// États exclus : le pidgin (DP-13, aucune langue pidgin sur le site).
import { chromium } from '@playwright/test'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { cleEtat, exclu } from './adresses.mjs'

const PROTO = new URL(
  '../../Work définitif pro — 6 interfaces/2 — BelivaY Espace client — paquet développeur/02_Prototype_HTML/BelivaY_Espace_Client_mobile.html',
  import.meta.url,
)
const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const ROUTES = new Set(PAGES.map((p) => p.route))
const SORTIE = new URL('../src/genere/etats.json', import.meta.url)
const ECRANS = new URL('../src/styles/ecrans/', import.meta.url)

const demandees = process.argv.slice(2)
const pages = PAGES.filter((p) => !demandees.length || demandees.includes(p.route)) // DP-50 : toutes les routes
const sortie = existsSync(SORTIE) && demandees.length ? JSON.parse(readFileSync(SORTIE, 'utf-8')) : {}

// Mêmes règles que outils/styles.mjs pour écrire un bloc (filtre, 12 px, images) : on réutilise ses fichiers ;
// un bloc qu'il n'a jamais vu (état non par défaut) est signalé pour relancer styles.mjs avec ces états.
const blocsManquants = new Map()

const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
const erreurs = []
page.on('pageerror', (e) => erreurs.push(e.message))

for (const { route, etats } of pages) {
  for (const adresse of [...new Set(['#' + route, ...etats.map((e) => e.adresse)])].filter((a) => !exclu(a))) {
    await page.goto('about:blank')
    await page.goto(PROTO.href + '?theme=light&lang=fr&text=normale' + adresse)
    await page.waitForSelector('#app main', { state: 'attached' })
    const v = await page.evaluate(() => {
      const q = (s) => document.querySelector(s)
      const sub = q('.hd-sub')
      const inv = new Map(
        Object.entries(ICONS).map(([k, c]) => {
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          t.innerHTML = c
          return [t.innerHTML, k]
        }),
      )
      const droite = sub
        ? [...sub.children].slice(2).map((e) => {
            const svg = e.querySelector('svg')
            return {
              balise: e.tagName.toLowerCase(),
              classe: String(e.className),
              adresse: e.getAttribute('href'),
              aria: e.getAttribute('aria-label'),
              texte: svg ? '' : e.textContent,
              icone: svg ? inv.get(svg.innerHTML) ?? null : null,
              taille: svg ? Number(svg.getAttribute('width')) : null,
            }
          })
        : []
      const h1 = q('.hd-sub h1')
      return {
        adresse: location.hash,
        // En-tête des pages web publiques (CL-14 : liste, cadeau) : propre à l'écran, transcrit avec lui.
        entete: q('header.hd.cl14-web') ? 'propre' : sub ? 'enfant' : q('.hd-row') ? 'racine' : 'aucun',
        classeEntete: q('header.hd') ? [...q('header.hd').classList].filter((c) => !['hd', 'glass'].includes(c)) : [],
        retour: sub ? sub.querySelector(':scope > a:first-child')?.getAttribute('href') ?? null : null,
        droite,
        titre: h1 ? (h1.childNodes[0]?.textContent ?? '').trim() : null,
        sousTitre: h1?.querySelector('small')?.innerText ?? null,
        // Le sous-titre nœud par nœud (le prototype traduit chaque nœud de texte à part).
        sousTitreNoeuds: h1?.querySelector('small')
          ? (function noeuds(e) {
              return [...e.childNodes].map((n) =>
                n.nodeType === 3 ? { texte: n.nodeValue } : { balise: n.tagName.toLowerCase(), classe: n.getAttribute('class'), enfants: noeuds(n) },
              )
            })(h1.querySelector('small'))
          : null,
        recherche: !!q('.hd .srch'),
        barre: !!q('.dock'),
        calme: !!q('.dock') && !q('.dock .bdg'),
        onglet: q('.dock .tab.on')?.getAttribute('href')?.slice(1) ?? null,
        styleMain: q('#app main').getAttribute('style') || '',
        classesApp: [...q('#app').classList].filter((c) => !/^(has-)?dyn/.test(c)),
        styles: [...document.querySelectorAll('#app style')].map((s) => s.textContent),
        // En-tête du panier : « · n articles » de l'état ; en-tête racine : badges et avatar de l'état.
        titrePanier: q('.cl07-hd h1 .n')?.textContent ?? null,
        badgesBarre: q('.dock')
          ? { panier: q('.dock a[href="#panier"] .bdg')?.textContent ?? null, compte: q('.dock a[href="#compte"] .bdg')?.textContent ?? null }
          : null,
        racine: q('.hd-row')
          ? {
              nonLus: q('.hd-row a[href="#notifications"] .bdg')?.textContent ?? null,
              panier: q('.hd-row a[href="#panier"] .bdg')?.textContent ?? null,
              invite: !!q('.hd-row .hd-av.guest'),
            }
          : null,
      }
    })
    if (decodeURIComponent(v.adresse) !== decodeURIComponent(adresse)) throw new Error(`${adresse} : le prototype a redirigé vers ${v.adresse}`)
    const m = /padding-top:(\d+)px/.exec(v.styleMain)
    if (!m) throw new Error(`${adresse} : marge haute du contenu introuvable (${v.styleMain})`)
    const d = v.droite[0]
    if (v.droite.length > 1) throw new Error(`${adresse} : plusieurs éléments à droite de l'en-tête`)
    const styles = v.styles.map((t) => {
      const h = createHash('sha1').update(t).digest('hex').slice(0, 10)
      if (!existsSync(new URL(h + '.css', ECRANS))) blocsManquants.set(h, adresse)
      return h
    })
    const retour = v.retour
    if (retour && retour !== '#' && !ROUTES.has(retour.replace(/^#/, '').split('?')[0])) throw new Error(`${adresse} : retour vers ${retour}`)
    sortie[cleEtat(adresse)] = {
      route,
      adresse,
      entete: v.entete,
      ...(v.classeEntete.length ? { classeEntete: v.classeEntete } : {}),
      titre: v.titre,
      sousTitre: v.sousTitre,
      ...(v.sousTitreNoeuds && (v.sousTitreNoeuds.length > 1 || v.sousTitreNoeuds[0]?.balise) ? { sousTitreNoeuds: v.sousTitreNoeuds } : {}),
      retour,
      droite: !d ? null : /\bcart\b/.test(d.classe) ? 'panier' : /\bhd-mark\b/.test(d.classe) ? 'accueil' : 'propre',
      ...(d && !/\bcart\b|\bhd-mark\b/.test(d.classe) ? { action: d } : {}),
      recherche: v.recherche,
      barre: v.barre,
      ...(v.calme ? { calme: true } : {}),
      onglet: v.onglet,
      margeHaute: Number(m[1]) - 50,
      styleMain: v.styleMain.replace(/padding-top:\d+px;?/, '').trim(),
      classesApp: v.classesApp,
      styles,
      ...(v.titrePanier !== null ? { titrePanier: v.titrePanier } : {}),
      ...(v.racine ? { racine: v.racine } : {}),
      ...(v.badgesBarre ? { badgesBarre: v.badgesBarre } : {}),
    }
  }
}
await navigateur.close()
if (erreurs.length) throw new Error('erreurs du prototype : ' + erreurs.slice(0, 3).join(' | '))
writeFileSync(SORTIE, JSON.stringify(Object.fromEntries(Object.entries(sortie).sort(([a], [b]) => (a < b ? -1 : 1))), null, 1) + '\n')
console.log(`${Object.keys(sortie).length} états relevés`)
if (blocsManquants.size) {
  console.log(`${blocsManquants.size} blocs de styles d'état absents de src/styles/ecrans : relancer outils/styles.mjs (il relève aussi les états)`)
  process.exitCode = 1
}
