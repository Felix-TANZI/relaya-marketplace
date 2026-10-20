// Lit le prototype EN MARCHE (version complète du 1er octobre) et écrit, dans src/genere :
// - en.json : le dictionnaire anglais final (CRD-04), tel que le prototype l'a complété pendant son
//   exécution (le texte du fichier n'en contient qu'une partie) ;
// - icones.json : les icônes Lucide finales (CDS-09) ;
// - navigation.json : la navigation de chaque route (état par défaut, clair, français) : type d'en-tête,
//   parent du bouton retour, élément de droite, recherche, bandeau, barre du bas, onglet allumé, titre.
// Il vérifie aussi que les textes anglais propres au site (src/i18n/en-complements.json) ne doublent
// aucune clé du prototype (CRD-04).
//
// Le prototype superpose plusieurs couches de corrections (par exemple l'en-tête « logo à droite » du
// 29 septembre) : seul son rendu fait foi. Lancer après outils/site.py : npm run donnees.
//
// Écarts imposés par la spécification (elle l'emporte, CDS-01) : voir ECARTS ci-dessous.
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'

const PROTO = new URL(
  '../../Work définitif pro — 6 interfaces/2 — BelivaY Espace client — paquet développeur/02_Prototype_HTML/BelivaY_Espace_Client_mobile.html', // version complète du 1er oct. (référence, décision du porteur du 3 oct.)
  import.meta.url,
)
const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const ROUTES = new Set(PAGES.map((p) => p.route))

// CNV-10 : « aucun retour ne mène au Menu, sauf depuis le Menu lui-même ». Le prototype fait revenir
// la planche de composants au Menu ; le site la fait revenir à l'accueil.
const ECARTS = { kit: { retour: 'accueil', motif: 'CNV-10 : aucun retour ne mène au Menu (prototype : #menu)' } }

// Titres et sous-titres d'en-tête qui portent une donnée du jeu d'essai (numéro de commande ou de litige,
// compteur, nom d'un produit ou d'un proche) : le site garde le nom du registre (CL-01) et n'affiche pas
// le sous-titre ; l'écran les lira dans les données à l'étape 6. Le titre de la fiche est l'univers du produit.
const DONNEE = /\b(BLV|LIT)-\d|\d produits|\d boutiques|Junior|Tecno|Ventilateur|Maman|CE1|Rentrée \d{4}/
const TITRE_DONNEE = new Set(['fiche'])

const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
const erreurs = []
page.on('pageerror', (e) => erreurs.push(e.message))

const ecrire = (nom, v) => writeFileSync(new URL('../src/genere/' + nom, import.meta.url), JSON.stringify(v, null, 1) + '\n')
const trie = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))

// ---------- dictionnaire et icônes ----------
await page.goto(PROTO.href + '?cap=1&theme=light&lang=fr#accueil')
await page.waitForSelector('#app main', { state: 'attached' })
const { en, icones } = await page.evaluate(() => ({ en: EN, icones: ICONS })) // eslint-disable-line no-undef

// CRD-04 : un texte français a une seule traduction ; les compléments du site ne doublent pas le prototype.
const complements = JSON.parse(readFileSync(new URL('../src/i18n/en-complements.json', import.meta.url), 'utf-8'))
const doubles = Object.keys(complements).filter((k) => k in en)
if (doubles.length) throw new Error('traductions du site en double avec le prototype : ' + doubles.join(' | '))
// Clés avec des espaces en bord : jamais atteintes, ni dans le prototype (nrm) ni sur le site.
const horsAtteinte = Object.keys(en).filter((k) => k !== k.replace(/[\s\u00A0\u202F]+/g, ' ').trim())
ecrire('en.json', trie(en))
ecrire('icones.json', trie(icones))

// ---------- navigation ----------
const sortie = {}
for (const { route } of PAGES) {
  await page.goto('about:blank')
  await page.goto(PROTO.href + '?cap=1&theme=light&lang=fr&text=normale#' + route)
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
      entete: sub ? 'enfant' : q('.hd-row') ? 'racine' : 'aucun',
      retour: sub ? sub.querySelector(':scope > a:first-child')?.getAttribute('href') ?? null : null,
      droite,
      titre: h1 ? (h1.childNodes[0]?.textContent ?? '').trim() : null,
      sousTitre: h1?.querySelector('small')?.innerText ?? null,
      bandeau: !!q('.hd .hd-strip'),
      recherche: !!q('.hd .srch'),
      barre: !!q('.dock'),
      // CNV-07 : un écran qui masque les badges (nouveau client) les masque tous (dock({ calm })).
      calme: !!q('.dock') && !q('.dock .bdg'),
      onglet: q('.dock .tab.on')?.getAttribute('href')?.slice(1) ?? null,
      styleMain: q('#app main').getAttribute('style') || '',
      classesApp: [...q('#app').classList].filter((c) => !/^(has-)?dyn/.test(c)), // classes de l'île : hors site
    }
  })
  if (v.adresse !== '#' + route) throw new Error(`${route} : le prototype a redirigé vers ${v.adresse}`)

  const routeDe = (h) => (h ? h.replace(/^#/, '').split('?')[0] : null)
  let retour = routeDe(v.retour)
  if (retour && !ROUTES.has(retour)) throw new Error(`${route} : retour vers une route inconnue ${v.retour}`)
  const ecart = ECARTS[route]
  if (ecart?.retour) retour = ecart.retour

  // Élément de droite de l'en-tête enfant (CNV-03, CDS-04) : le panier, le chariot du logo vers
  // l'accueil, ou une action propre à l'écran (construite avec l'écran, à l'étape 6).
  const d = v.droite[0]
  const droite = !d ? null : /\bcart\b/.test(d.classe) ? 'panier' : /\bhd-mark\b/.test(d.classe) ? 'accueil' : 'propre'
  if (v.droite.length > 1) throw new Error(`${route} : plusieurs éléments à droite de l'en-tête`)
  if (droite === 'propre' && d.icone === null && d.balise !== 'span' && !d.texte) throw new Error(`${route} : icône d'action inconnue`)
  if (d?.adresse && d.adresse !== '#' && !ROUTES.has(routeDe(d.adresse))) throw new Error(`${route} : action vers une route inconnue ${d.adresse}`)

  const registre = PAGES.find((p) => p.route === route).titre
  const titre = v.titre && !DONNEE.test(v.titre) && !TITRE_DONNEE.has(route) ? v.titre : registre
  const sousTitre = v.sousTitre && !DONNEE.test(v.sousTitre) ? v.sousTitre : null

  // Marge haute du contenu : le prototype l'écrit en ligne, barre d'état de 50 px comprise ; le site
  // remplace ces 50 px par la zone sûre du téléphone (--sb, CNV-05).
  const m = /padding-top:(\d+)px/.exec(v.styleMain)
  if (!m) throw new Error(`${route} : marge haute du contenu introuvable (${v.styleMain})`)
  const margeHaute = Number(m[1]) - 50
  const styleMain = v.styleMain.replace(/padding-top:\d+px;?/, '').trim()

  sortie[route] = {
    entete: v.entete,
    margeHaute,
    ...(styleMain ? { styleMain } : {}),
    ...(v.classesApp.length ? { classesApp: v.classesApp } : {}),
    titre,
    sousTitre,
    retour,
    droite,
    // Action propre à l'écran, à droite de l'en-tête enfant (partager le panier, réglages…).
    ...(droite === 'propre'
      ? { action: { balise: d.balise, classe: d.classe, adresse: d.adresse, aria: d.aria, texte: d.texte, icone: d.icone, taille: d.taille } }
      : {}),
    recherche: v.recherche,
    bandeau: v.bandeau,
    barre: v.barre,
    ...(v.calme ? { calme: true } : {}),
    onglet: v.onglet,
    prototype: {
      titre: v.titre,
      sousTitre: v.sousTitre,
      retour: v.retour,
      droite: v.droite.map((x) => x.classe + (x.adresse ? ' → ' + x.adresse : '')),
    },
    ...(ecart ? { ecart: ecart.motif } : {}),
  }
}
await navigateur.close()
if (erreurs.length) throw new Error('erreurs du prototype : ' + erreurs.slice(0, 3).join(' | '))

ecrire('navigation.json', sortie)
const n = Object.values(sortie)
console.log(`${Object.keys(en).length} traductions, ${Object.keys(icones).length} icônes`)
if (horsAtteinte.length) console.log('clés anglaises jamais atteintes (espaces en bord) : ' + horsAtteinte.map((k) => JSON.stringify(k)).join(' | '))
console.log(
  `${n.length} routes : ${n.filter((x) => x.entete === 'racine').length} en-têtes racine, ` +
    `${n.filter((x) => x.entete === 'enfant').length} enfant, ${n.filter((x) => x.entete === 'aucun').length} sans en-tête ; ` +
    `${n.filter((x) => !x.barre).length} sans barre du bas ; ${Object.keys(ECARTS).length} écart imposé par la spécification`,
)
