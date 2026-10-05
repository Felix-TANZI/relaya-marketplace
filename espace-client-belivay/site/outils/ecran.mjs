// Écrit les écrans du site d'un document, depuis le prototype en marche (étape 6) : pour chaque route, tous
// ses états (adresses de logique-metier/pages.json, plus l'adresse nue), un rendu par état, transcrit par
// outils/transcription.mjs (mêmes balises, mêmes classes, même ordre, corrections du porteur appliquées).
// L'en-tête, la barre du bas, les marges et les classes viennent du relevé de l'état (genere/etats.json,
// Ecran parEtat). Les états identiques partagent un rendu.
//   node outils/ecran.mjs CL-03            (toutes les routes ouvertes du document)
//   node outils/ecran.mjs CL-03 numero     (une route)
//   --ecraser : réécrit aussi les écrans déjà écrits (sinon un écran existant, peut-être repris à la main, est gardé)
// Écrit src/pages/<document>/<Écran>.tsx, index.ts (ECRANS) et construits.json (routes comparées au
// prototype ; un état « exclus » y garde sa raison et affiche la page provisoire tant qu'il l'est).
// Étape suivante, sous la garde des tests au pixel : remplacer les données écrites par celles de la source.
import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { cleEtat, exclu } from './adresses.mjs'
import { releverEtat, Transcripteur } from './transcription.mjs'

const args = process.argv.slice(2)
const ecraser = args.includes('--ecraser')
const [doc, ...seules] = args.filter((a) => a !== '--ecraser')
if (!doc) throw new Error('usage : node outils/ecran.mjs <CL-xx> [route…]')
const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const DOSSIER = new URL(`../src/pages/${doc}/`, import.meta.url)
mkdirSync(DOSSIER, { recursive: true })
const LISTE = new URL('construits.json', DOSSIER)
const construits = existsSync(LISTE) ? JSON.parse(readFileSync(LISTE, 'utf-8')) : { routes: [], exclus: {} }
const pages = PAGES.filter((p) => p.document === doc && (!seules.length || seules.includes(p.route))) // DP-50 : toutes les routes
if (!pages.length) throw new Error(`${doc} : aucune route ouverte`)

const nomComposant = (route) =>
  route
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split('-')
    .map((m) => m[0].toUpperCase() + m.slice(1))
    .join('')

const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
const erreurs = []
page.on('pageerror', (e) => erreurs.push(e.message))

for (const p of pages) {
  // Écrans repris à la main pour être logiques (DP-53, site/PAGES-LOGIQUES.md) : jamais réécrits, même avec --ecraser.
  const fichier = new URL(nomComposant(p.route) + '.tsx', DOSSIER)
  if (existsSync(fichier) && readFileSync(fichier, 'utf-8').includes('outils/ecran.mjs ne le réécrit plus')) {
    console.log(`${p.route} : écran repris à la main (DP-53), gardé`)
    continue
  }
  if (!ecraser && existsSync(new URL(nomComposant(p.route) + '.tsx', DOSSIER))) {
    console.log(`${p.route} : écran déjà écrit, gardé (--ecraser pour le réécrire)`)
    if (!construits.routes.includes(p.route)) construits.routes.push(p.route)
    continue
  }
  const tr = new Transcripteur()
  const adresses = [...new Set(['#' + p.route, ...p.etats.map((e) => e.adresse)])].filter((a) => !exclu(a))
  const rendus = new Map() // JSX → clés d'état
  const exclus = []
  for (const adresse of adresses) {
    const cle = cleEtat(adresse)
    if (construits.exclus?.[adresse]) {
      exclus.push(cle)
      continue
    }
    const { avant, contenu, fixes } = tr.jsx(await releverEtat(page, adresse), 4)
    const prop = (nom, v) => (v.trim() ? ` ${nom}={\n          <>\n${v.replace(/^/gm, '    ')}\n          </>\n        }` : '')
    const jsx = `<Ecran route=${JSON.stringify(p.route)} parEtat${prop('avant', avant)}${prop('fixes', fixes)}>\n${contenu}\n        </Ecran>`
    if (!rendus.has(jsx)) rendus.set(jsx, [])
    rendus.get(jsx).push(cle)
  }
  tr.enregistrer()
  const corps = [...rendus].map(([jsx, cles], i) => {
    const cas = i === 0 ? '    default:\n' : ''
    return cles.map((c) => `    case ${JSON.stringify(c)}:\n`).join('') + cas + `      return (\n        ${jsx}\n      )`
  })
  // L'adresse nue est le premier rendu : il sert aussi d'état par défaut (adresse inconnue).
  const nom = nomComposant(p.route)
  const utilise = (re) => [...rendus.keys()].some((j) => re.test(j))
  const code =
    `// Écran « ${p.titre} » (${doc}) : généré par outils/ecran.mjs depuis le prototype du 1er octobre, un rendu par\n` +
    `// état (${adresses.length} adresses). En-tête, barre du bas et marges suivent l'état (Ecran parEtat).\n` +
    `// Les données sont encore écrites dans le rendu (démonstration) ; elles passeront par la source, sous la\n` +
    `// garde des tests au pixel (tests/identique.spec.ts).\n` +
    (utilise(/as CSSProperties/) ? `import type { CSSProperties } from 'react'\n` : '') +
    (utilise(/<Link /) ? `import { Link } from 'react-router-dom'\n` : '') +
    [...tr.imports].map(([v, f]) => `import ${v} from '../../assets/prototype/${f}'\n`).join('') +
    `import { Ecran } from '../../composants/coque'\n` +
    (tr.composants.has('CompteARebours') ? `import { CompteARebours } from '../../composants/CompteARebours'\n` : '') +
    (utilise(/<Dessin /) ? `import { Dessin } from '../../composants/Dessin'\n` : '') +
    (utilise(/<Icone /) ? `import { Icone } from '../../composants/Icone'\n` : '') +
    (utilise(/<Styles /) ? `import { Styles } from '../../composants/Styles'\n` : '') +
    `import { useEtat } from '../../config/etats'\n` +
    (exclus.length ? `import { PAGES } from '../../config/pages'\nimport { PageProvisoire } from '../PageProvisoire'\n` : '') +
    `import { usePreferences } from '../../preferences'\n\n` +
    `export function ${nom}() {\n  const { t } = usePreferences()\n  switch (useEtat(${JSON.stringify(p.route)})) {\n` +
    (exclus.length
      ? exclus.map((c) => `    case ${JSON.stringify(c)}:\n`).join('') +
        `      // États exclus de la comparaison (construits.json) : page provisoire en attendant.\n` +
        `      return <PageProvisoire page={PAGES.find((x) => x.route === ${JSON.stringify(p.route)})!} />\n`
      : '') +
    corps.join('\n') +
    `\n  }\n}\n`
  writeFileSync(new URL(nom + '.tsx', DOSSIER), code)
  // Les commandes de préférence (langue, thème, taille) suivent la préférence en cours.
  execFileSync('python3', [fileURLToPath(new URL('preferences_actives.py', import.meta.url)), fileURLToPath(new URL(nom + '.tsx', DOSSIER))])
  if (!construits.routes.includes(p.route)) construits.routes.push(p.route)
  console.log(`${p.route} : ${adresses.length} adresses, ${rendus.size} rendus, ${exclus.length} exclus`)
}
await navigateur.close()
if (erreurs.length) throw new Error('erreurs du prototype : ' + erreurs.slice(0, 3).join(' | '))

// Index du document : tous les écrans écrits dans le dossier.
const routes = PAGES.filter((p) => p.document === doc && construits.routes.includes(p.route)).map((p) => p.route)
construits.routes = routes
writeFileSync(LISTE, JSON.stringify(construits, null, 1) + '\n')
writeFileSync(
  new URL('index.ts', DOSSIER),
  `// Écrans de ${doc} construits (outils/ecran.mjs).\n` +
    routes.map((r) => `import { ${nomComposant(r)} } from './${nomComposant(r)}'\n`).join('') +
    `\nexport const ECRANS = {\n` +
    routes.map((r) => `  ${JSON.stringify(r)}: ${nomComposant(r)},\n`).join('') +
    `}\n`,
)
