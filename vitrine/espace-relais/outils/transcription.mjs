// TRANSCRIPTEUR du prototype point relais (paquet 4, 02_Prototype_HTML/BelivaY_Point_Relais_mobile.html). Chaque écran
// du prototype est un gabarit à styles en ligne (objet PAGES) ; ses états sont posés par go(nom) puis
// get(nom).setState(s) (tableau G du plan du prototype). Le transcripteur rend CHAQUE état dans Chromium (390 × 844,
// ?cap=1 : sans le plan), relève l'écran (outils/ecran.mjs : releverEcran) et écrit :
// - src/pages/<GROUPE>/provisoires/<Écran>.tsx : l'écran transcrit en JSX à l'identique, un composant par état
//   (variantes), et sa page provisoire (vraie coque, ?etat=<id> choisit l'état) — GÉNÉRÉ, ne pas modifier : l'écran
//   repris s'écrit à côté, en partant de ce balisage (structure du prototype intacte, contenu enrichi : METHODE.md) ;
// - src/styles/prototype.css : une classe par style en ligne (dédoublonnée, « p-xxxxxx »), et les classes NOMMÉES de
//   la coque (en-tête racine « p-hd-* », en-tête secondaire « p-hs-* », barre du bas « p-dock-* ») ;
// - src/genere/coque.json : les icônes et libellés de la coque relevés dans le prototype ;
// - src/genere/pages.json : une fiche par route (écran du prototype, titre, groupe, statut, en-tête, retour, barre,
//   onglet, états) — relue dans les routes déclarées (src/pages/PR-xx/routes.ts), lue par les tests et les outils ;
// - src/genere/fiches.json : états, éléments, gestes et règles de chaque écran (relevé de l'extraction du paquet,
//   logique-metier/relais/extraction/*.json, quand elle existe) pour les pages provisoires ;
// - src/pages/<GROUPE>/routes.ts : SEULEMENT s'il n'existe pas encore (ensuite, il appartient à l'agent du groupe).
// Lancer : npm run transcrire (après npm run prototype, qui écrit les icônes et l'anglais).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { Classes, EMISES, MANQUANTES, REPRESENTANT, corpsCanonique, declarations, estIcone, fondDe, jetonDe, releverEcran, transformer, valeursDe, versJsx } from './ecran.mjs'
import { FICHIER_PROTO, PROTO } from './proto.mjs'

const ici = (p) => new URL(p, import.meta.url)
const lireJson = (p) => JSON.parse(readFileSync(ici(p), 'utf-8'))
const ecrireJson = (p, d) => writeFileSync(ici(p), JSON.stringify(d, null, 1) + '\n')

// Écran du prototype → route, groupe, et identifiant d'état quand l'écran est un ÉTAT d'une autre route (journée
// calme et hors connexion sont des états de l'accueil).
const ECRANS = {
  Connexion: ['connexion', 'PR-03'],
  Invitation: ['invitation', 'PR-03'],
  Inscription: ['inscription', 'PR-03'],
  Activation: ['activation', 'PR-03'],
  StatutRelais: ['statut-relais', 'PR-03'],
  Installer: ['installer', 'PR-03'],
  Accueil: ['accueil', 'PR-04'],
  AccueilVide: ['accueil', 'PR-04', 'vide'],
  HorsLigne: ['accueil', 'PR-04', 'hors-ligne'],
  Reception: ['reception', 'PR-04'],
  Camera: ['camera', 'PR-04'],
  Retrait: ['retrait', 'PR-05'],
  PinRemise: ['pin-remise', 'PR-05'],
  Erreurs: ['erreurs', 'PR-05'],
  Stock: ['stock', 'PR-06'],
  ColisDetail: ['colis', 'PR-06'],
  Departs: ['departs', 'PR-06'],
  Litiges: ['litiges', 'PR-07'],
  Fermeture: ['fermeture', 'PR-07'],
  Historique: ['historique', 'PR-07'],
  Notifications: ['notifications', 'PR-08'],
  Messagerie: ['messagerie', 'PR-08'],
  Aide: ['aide', 'PR-08'],
  Versements: ['versements', 'PR-09'],
  ChangerMoMo: ['changer-momo', 'PR-09'],
  Rapports: ['rapports', 'PR-09'],
  TrustScore: ['trust', 'PR-09'],
  Avis: ['avis', 'PR-09'],
  Paliers: ['paliers', 'PR-09'],
  Menu: ['menu', 'PR-10'],
  Capacite: ['capacite', 'PR-10'],
  Equipe: ['equipe', 'PR-10'],
  Documents: ['documents', 'PR-10'],
  Formation: ['formation', 'PR-10'],
  Parametres: ['parametres', 'PR-10'],
}
export const GROUPES = {
  'PR-03': 'Accès',
  'PR-04': 'Guichet 1',
  'PR-05': 'Guichet 2',
  'PR-06': 'Stock',
  'PR-07': 'Incidents',
  'PR-08': 'Communication',
  'PR-09': 'Argent',
  'PR-10': 'Mon relais',
}
// Images du prototype (data: PNG), reconnues à leur taille : le logo BelivaY et la marque (panier).
const IMAGES = { 156978: 'logo', 42374: 'marque' }

/** Adresse d'un écran du prototype dans l'application (appel de chemin()). */
function lien(ecran) {
  const e = ECRANS[ecran]
  if (!e) throw new Error('lien vers un écran inconnu : ' + ecran)
  return e[2] ? `chemin(${JSON.stringify(e[0])}, { etat: ${JSON.stringify(e[2])} })` : `chemin(${JSON.stringify(e[0])})`
}
const pascal = (s) => s.replace(/(^|[-_\s])(\w)/g, (_, __, c) => c.toUpperCase())

// ---------------------------------------------------------------------------------------------------------------
// Rendu de chaque état dans Chromium
// ---------------------------------------------------------------------------------------------------------------
const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'light' })
await page.addInitScript(() => {
  try {
    localStorage.setItem('blv_theme', 'light')
  } catch {
    /* rien */
  }
})
await page.goto(PROTO.href + '?cap=1')
const G = await page.evaluate(() => {
  const t = [...document.scripts].find((s) => s.id === 'blv-plan-js').textContent
  return JSON.parse(t.slice(t.indexOf('var G=') + 6, t.lastIndexOf(']', t.indexOf('var n=0')) + 1))
})
const releves = [] // { ecran, etat (objet), libelle, rel }
for (const g of G)
  for (const it of g.items) {
    const rel = await page.evaluate(
      ([p, s, fn]) => {
        /* global go, get */
        go(p, false)
        if (s) get(p).setState(s)
        return new Function('return (' + fn + ')()')()
      },
      [it.p, it.s ?? null, releverEcran.toString()],
    )
    releves.push({ ecran: it.p, s: it.s ?? null, libelle: it.l, rel })
  }
await navigateur.close()
const absents = Object.keys(ECRANS).filter((e) => !releves.some((r) => r.ecran === e))
if (absents.length) throw new Error('écrans absents du plan du prototype : ' + absents.join(', '))
const inconnus = [...new Set(releves.map((r) => r.ecran))].filter((e) => !ECRANS[e])
if (inconnus.length) throw new Error('écrans du prototype sans route : ' + inconnus.join(', '))

// ---------------------------------------------------------------------------------------------------------------
// Transcription
// ---------------------------------------------------------------------------------------------------------------
const classes = new Classes()
const icones = new Map(Object.entries(lireJson('../src/genere/icones.json')).map(([nom, corps]) => [corps, nom]))

/** Routes : écran(s) du prototype, états (variantes), coque relevée sur le premier état. */
const routes = new Map()
for (const r of releves) {
  const [route, groupe, etatFixe] = ECRANS[r.ecran]
  const id = etatFixe ?? (r.s ? String(Object.values(r.s)[0]) : 'defaut')
  const etatPremier = !routes.has(route)
  if (etatPremier) routes.set(route, { route, groupe, ecran: r.ecran, titre: r.rel.titre ?? r.libelle, rel: r.rel, etats: [] })
  const R = routes.get(route)
  // Accueil : l'état principal garde l'identifiant « defaut ».
  R.etats.push({ id: R.etats.length === 0 ? 'defaut' : id, libelle: r.libelle, ecran: r.ecran, s: r.s, rel: r.rel })
}

function transcrireEtat(R, e) {
  const usages = {}
  const ctx = {
    ecran: e.ecran,
    classes,
    icones,
    liens: lien,
    images: (taille) => {
      const nom = IMAGES[taille]
      if (!nom) throw new Error(`image inconnue (${taille} octets) dans ${e.ecran}`)
      usages[nom] = true
      return nom
    },
    usages,
    fond: 'clair',
    urgent: false,
    avecEnTete: e.rel.entete !== 'aucun',
  }
  const morceaux = e.rel.contenu.map((n, i) => versJsx(n, { ...ctx, enveloppe: e.rel.principal && i === 0, racineFixe: !e.rel.principal }, '      '))
  const jsx = morceaux.filter(Boolean).join('\n')
  usages.t = /\bt\(/.test(jsx)
  return { jsx, usages }
}

// Fiches de l'extraction du paquet (si elle existe) : états, éléments, gestes, règles par écran du prototype.
const EXTRACTION = '../../logique-metier/relais/extraction/'
const fichesExtraction = {}
if (existsSync(ici(EXTRACTION)))
  for (const f of readdirSync(ici(EXTRACTION)).filter((x) => x.endsWith('.json')).sort()) {
    let d
    try {
      d = lireJson(EXTRACTION + f)
    } catch {
      continue // extraction en cours d'écriture
    }
    for (const e of d.ecrans ?? []) {
      const v = (fichesExtraction[e.id] ??= { etats: [], elements: [], actions: [], regles: [] })
      for (const k of ['etats', 'elements', 'actions', 'regles']) for (const x of e[k] ?? []) if (!v[k].includes(x)) v[k].push(x)
    }
  }

const fiches = {}
let n = 0
for (const R of routes.values()) {
  const dossier = ici(`../src/pages/${R.groupe}/provisoires/`)
  mkdirSync(dossier, { recursive: true })
  const variantes = R.etats.map((e) => ({ e, ...transcrireEtat(R, e) }))
  const tout = { lien: false, icone: false, logo: false, marque: false }
  for (const v of variantes) for (const k of Object.keys(tout)) tout[k] ||= !!v.usages[k]
  const nomFichier = R.ecran
  const imports = [
    tout.lien && "import { Link } from 'react-router-dom'",
    tout.logo && "import logo from '../../../assets/logo-belivay.png'",
    tout.marque && "import marque from '../../../assets/marque-belivay.png'",
    tout.icone && "import { Icone } from '../../../composants/Icone'",
    "import { PageProvisoire } from '../../../composants/PageProvisoire'",
    tout.lien && "import { chemin } from '../../../config/pages'",
    variantes.some((v) => v.usages.t) && "import { usePreferences } from '../../../preferences'",
  ].filter(Boolean)
  const composants = variantes.map(
    ({ e, jsx, usages }) => `/** ${e.libelle} (prototype : ${e.ecran}${e.s ? ' · ' + JSON.stringify(e.s) : ''}) — ?etat=${e.id} */
export function Etat${pascal(e.id)}() {
${usages.t ? '  const { t } = usePreferences()\n' : ''}  return (
    <>
${jsx}
    </>
  )
}`,
  )
  const source = `// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (${R.ecran} · ${R.titre}) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/${R.groupe}/${nomFichier}.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
${imports.join('\n')}

${composants.join('\n\n')}

const ETATS = [
${variantes.map(({ e }) => `  { id: ${JSON.stringify(e.id)}, libelle: ${JSON.stringify(e.libelle)}, Rendu: Etat${pascal(e.id)} },`).join('\n')}
]

export default function ${nomFichier}Provisoire() {
  return <PageProvisoire route=${JSON.stringify(R.route)} etats={ETATS} />
}
`
  writeFileSync(new URL(nomFichier + '.tsx', dossier), source)
  n++
  const ex = R.etats.map((e) => fichesExtraction[e.ecran]).filter(Boolean)
  fiches[R.route] = {
    ecrans: [...new Set(R.etats.map((e) => e.ecran))],
    etats: R.etats.map((e) => `${e.id} · ${e.libelle}`),
    elements: [...new Set(ex.flatMap((x) => x.elements))],
    actions: [...new Set(ex.flatMap((x) => x.actions))],
    regles: [...new Set(ex.flatMap((x) => x.regles))],
    etatsExtraction: [...new Set(ex.flatMap((x) => x.etats))],
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Coque : classes nommées et icônes relevées (en-tête racine sur l'accueil, secondaire sur les versements)
// ---------------------------------------------------------------------------------------------------------------
const coque = { icones: {}, onglets: [] }
const ctxCoque = { ecran: 'coque', fond: 'clair', urgent: false }
/** Classe nommée d'un nœud de la coque, sans les propriétés que la coque de l'application porte elle-même. */
function nommer(nom, n, retirer = [], ajout = []) {
  const brutes = declarations(n.a.style)
  const pastille = /-bdg$/.test(nom)
  const ctx = { ...ctxCoque, fond: fondDe(brutes, pastille) ?? 'clair', fondParent: 'clair', pastille }
  const d = transformer(
    brutes.filter(([p]) => !retirer.includes(p)),
    n,
    ctx,
  )
  if (n.t === 'svg' && n.a.stroke) d.push(['color', jetonDe(n.a.stroke, 'stroke', ctx)])
  classes.nommer(nom, [...d, ...ajout])
}
const iconeDe = (svg) => {
  if (!estIcone(svg)) throw new Error('icône de la coque illisible')
  return icones.get(corpsCanonique(svg.c))
}
const el = (n) => n.c.filter((x) => typeof x !== 'string')
{
  const acc = routes.get('accueil').etats[0].rel
  const [rang, label, pastilles] = el(acc.header)
  nommer('p-hd', acc.header, ['position', 'top', 'left', 'right', 'padding-top', 'z-index'])
  nommer('p-hd-rang', rang)
  const [menu, logoA, sp, theme, cloche, avatar] = el(rang)
  nommer('p-hd-menu', menu)
  nommer('p-hd-menu-i', el(menu)[0])
  coque.icones.menu = iconeDe(el(menu)[0])
  nommer('p-hd-logo', logoA)
  nommer('p-hd-logo-img', el(logoA)[0])
  nommer('p-hd-sp', sp)
  nommer('p-hd-theme', theme)
  nommer('p-hd-theme-i', el(theme)[0])
  coque.icones.themeSombre = iconeDe(el(theme)[0])
  nommer('p-hd-cloche', cloche)
  nommer('p-hd-cloche-i', el(cloche)[0])
  coque.icones.cloche = iconeDe(el(cloche)[0])
  nommer('p-hd-bdg', el(cloche)[1])
  nommer('p-hd-avatar', avatar)
  nommer('p-hd-label', label)
  nommer('p-hd-label-i', el(label)[0])
  nommer('p-hd-label-t', el(label)[1])
  nommer('p-hd-pastilles', pastilles)
  nommer('p-hd-pill', el(pastilles)[0], ['background', 'background-color', 'color', 'border', 'box-shadow'])
  const nav = acc.nav
  nommer('p-dock', nav, ['position', 'left', 'right', 'bottom', 'z-index'])
  const tabs = el(nav)
  const on = tabs.findIndex((a) => /background-image/.test(a.a.style ?? ''))
  const off = tabs.findIndex((a, i) => i !== on)
  nommer('p-dock-tab-on', tabs[on])
  nommer('p-dock-tab', tabs[off])
  nommer('p-dock-i', el(tabs[off])[0])
  nommer('p-dock-ico-on', el(el(tabs[on])[0])[0])
  nommer('p-dock-ico', el(el(tabs[off])[0])[0])
  nommer('p-dock-l-on', el(tabs[on])[1])
  nommer('p-dock-l', el(tabs[off])[1])
  const bdg = tabs.map((a) => el(el(a)[0])[1]).find(Boolean)
  if (bdg) nommer('p-dock-bdg', bdg)
  for (const a of tabs) {
    const ecran = /^(\w+)\.dc\.html$/.exec(a.a.href)[1]
    coque.onglets.push({ route: ECRANS[ecran][0], titre: el(a)[1].c.join('').trim(), icone: iconeDe(el(el(a)[0])[0]) })
  }
  const vers = routes.get('versements').etats[0].rel
  const [rangS] = el(vers.header)
  nommer('p-hs', vers.header, ['position', 'top', 'left', 'right', 'padding-top', 'z-index'])
  nommer('p-hs-rang', rangS)
  const [retourA, titre, spS, marqueA] = el(rangS)
  nommer('p-hs-retour', retourA)
  nommer('p-hs-retour-i', el(retourA)[0])
  coque.icones.retour = iconeDe(el(retourA)[0])
  nommer('p-hs-titre', titre)
  nommer('p-hs-sp', spS)
  nommer('p-hs-marque', marqueA)
  nommer('p-hs-marque-img', el(marqueA)[0])
}
coque.icones.themeClair = 'r-soleil'

// ---------------------------------------------------------------------------------------------------------------
// Jetons : chaque var(--…) émise existe dans src/styles/jetons.css, en clair et en sombre
// ---------------------------------------------------------------------------------------------------------------
if (MANQUANTES.size) {
  console.error('couleurs sans jeton (à ajouter à COULEURS, outils/ecran.mjs) :\n  ' + [...MANQUANTES].sort().join('\n  '))
  process.exit(1)
}
const css = classes.css()
// Couleurs du prototype (consigne du porteur : EXACTEMENT celles du prototype, en clair et la nuit) : chaque jeton de
// COULEURS vaut sa couleur source, sa nuit est celle de darkify (DARK_MAP du prototype) ; écrites entre les repères
// « couleurs du prototype » de src/styles/jetons.css, le reste du fichier (jetons de la coque) est à la main.
const texteProto = readFileSync(FICHIER_PROTO, 'utf-8')
const DARK_MAP = new Function('return ' + texteProto.slice(texteProto.indexOf('[', texteProto.indexOf('DARK_MAP')), texteProto.indexOf('];', texteProto.indexOf('DARK_MAP')) + 1))()
const genere = new Map(Object.entries(REPRESENTANT).map(([j, v]) => [j, v]))
for (const [j, v] of EMISES) genere.set(j, v)
const lignes = (i) => [...genere.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([j, v]) => `  --${j}:${valeursDe(v, DARK_MAP)[i]};`).join('\n')
const fichierJetons = ici('../src/styles/jetons.css')
let jetonsCss = existsSync(fichierJetons) ? readFileSync(fichierJetons, 'utf-8') : ''
for (const [i, nom] of [[0, 'clair'], [1, 'sombre']]) {
  const re = new RegExp(`(/\\* <prototype-${nom}> \\*/\\n)[\\s\\S]*?(\\n  /\\* </prototype-${nom}> \\*/)`)
  if (!re.test(jetonsCss)) throw new Error(`repères <prototype-${nom}> absents de src/styles/jetons.css`)
  jetonsCss = jetonsCss.replace(re, (_, a, b) => a + lignes(i) + b)
}
writeFileSync(fichierJetons, jetonsCss)
if (classes.partagees) console.log(`${classes.partagees} styles ne diffèrent d'une classe existante que par la précision d'une couleur (classe partagée)`)
const blocSombre = jetonsCss.slice(jetonsCss.indexOf('html[data-theme=dark]'))
const emis = [...new Set([...css.matchAll(/var\(--([\w-]+)\)/g)].map((m) => m[1]))].sort()
const sansClair = emis.filter((j) => !new RegExp(`--${j}\\s*:`).test(jetonsCss))
const sansSombre = emis.filter((j) => !new RegExp(`--${j}\\s*:`).test(blocSombre))
if (sansClair.length || sansSombre.length) {
  console.error(`jetons absents de src/styles/jetons.css — clair : ${sansClair.join(' ') || 'aucun'} ; sombre : ${sansSombre.join(' ') || 'aucun'}`)
  process.exitCode = 1
}

writeFileSync(
  ici('../src/styles/prototype.css'),
  `/* GÉNÉRÉ par outils/transcription.mjs depuis le prototype point relais : ne pas modifier à la main.
   Une classe par style en ligne du prototype (« p-xxxxxx », nom tiré de ses déclarations), et les classes nommées de
   la coque (« p-hd-* » en-tête racine, « p-hs-* » en-tête secondaire, « p-dock-* » barre du bas). Couleurs en jetons
   (styles/jetons.css), tailles de police en rem (jamais sous 12 px), hauteurs des boutons et pastilles en min-height. */
${css}
`,
)
ecrireJson('../src/genere/coque.json', coque)
ecrireJson('../src/genere/fiches.json', fiches)

// ---------------------------------------------------------------------------------------------------------------
// Routes : routes.ts de chaque groupe (s'il manque), puis pages.json relu dans les routes déclarées
// ---------------------------------------------------------------------------------------------------------------
const versRoute = (href) => (href ? ECRANS[/^(\w+)\.dc\.html$/.exec(href)?.[1]]?.[0] ?? null : null)
for (const [groupe, nom] of Object.entries(GROUPES)) {
  const f = ici(`../src/pages/${groupe}/routes.ts`)
  if (existsSync(f)) continue
  mkdirSync(ici(`../src/pages/${groupe}/`), { recursive: true })
  const lignes = [...routes.values()]
    .filter((R) => R.groupe === groupe)
    .map((R) => {
      const r = R.rel
      const champs = [
        `route: '${R.route}'`,
        `ecran: '${R.ecran}'`,
        `titre: ${JSON.stringify(R.titre)}`,
        `entete: '${r.entete}'`,
        r.entete === 'enfant' && versRoute(r.retour) ? `retour: '${versRoute(r.retour)}'` : null,
        `barre: ${r.barre}`,
        r.onglet ? `onglet: '${versRoute(r.onglet)}'` : null,
        R.route === 'connexion' || R.route === 'invitation' || R.route === 'inscription' || R.route === 'installer' ? 'sansSession: true' : null,
        `statut: 'provisoire'`,
        `charger: () => import('./provisoires/${R.ecran}')`,
      ].filter(Boolean)
      return `    { ${champs.join(', ')} },`
    })
  writeFileSync(
    f,
    `// Routes du groupe ${groupe} · ${nom} (seul fichier de routage que l'agent du groupe touche : METHODE.md). Pour brancher
// un écran repris : « charger » pointe vers lui et « statut » passe à 'repris', puis npm run transcrire (pages.json).
import type { RoutesGroupe } from '../../config/routes'

const groupe: RoutesGroupe = {
  groupe: '${groupe}',
  routes: [
${lignes.join('\n')}
  ],
}
export default groupe
`,
  )
}

// pages.json : relu dans les routes déclarées (le statut et la coque sont ceux du groupe), états du prototype.
const pages = []
for (const groupe of Object.keys(GROUPES)) {
  const texte = readFileSync(ici(`../src/pages/${groupe}/routes.ts`), 'utf-8')
  for (const m of texte.matchAll(/\{\s*route:\s*'([\w-]+)'([^\n]*)\}/g)) {
    const champ = (k) => new RegExp(`\\b${k}:\\s*'([^']*)'`).exec(m[2])?.[1] ?? null
    const R = routes.get(m[1])
    pages.push({
      route: m[1],
      ecran: champ('ecran'),
      titre: /titre:\s*("(?:[^"\\]|\\.)*")/.exec(m[2]) ? JSON.parse(/titre:\s*("(?:[^"\\]|\\.)*")/.exec(m[2])[1]) : null,
      groupe,
      statut: champ('statut'),
      entete: champ('entete'),
      retour: champ('retour'),
      barre: /barre:\s*true/.test(m[2]),
      onglet: champ('onglet'),
      sansSession: /sansSession:\s*true/.test(m[2]),
      etats: R ? R.etats.map((e) => ({ id: e.id, libelle: e.libelle, adresse: e.id === 'defaut' ? m[1] : `${m[1]}?etat=${e.id}` })) : [],
    })
  }
}
ecrireJson('../src/genere/pages.json', pages)

const etats = [...routes.values()].reduce((s, R) => s + R.etats.length, 0)
console.log(`${releves.length} états relevés ; ${routes.size} routes, ${etats} variantes, ${n} pages provisoires ; ${classes.parNom.size} classes ; ${emis.length} jetons`)
