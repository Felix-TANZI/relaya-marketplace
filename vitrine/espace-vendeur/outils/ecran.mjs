// Écrit les pages provisoires d'un groupe VD depuis le prototype vendeur en marche : pour chaque route, tous ses
// états (src/genere/pages.json), un rendu par état, transcrit par outils/transcription.mjs (mêmes balises, mêmes
// classes, même ordre, textes en t()). L'en-tête, la barre du bas et les marges viennent du relevé de l'état
// (src/genere/etats.json, Ecran parEtat). Les états identiques partagent un rendu.
//   node outils/ecran.mjs VD-05                 (toutes les routes du groupe)
//   node outils/ecran.mjs VD-05 commande        (une route)
//   node outils/ecran.mjs --releve '#commande?ref=BLV-00009'   (affiche le JSX d'un état, pour reprendre un écran)
// Écrit src/pages/<groupe>/provisoires/<Écran>.tsx, et src/pages/<groupe>/routes.ts s'il n'existe pas encore.
// Une page provisoire n'est jamais modifiée à la main : un écran repris vit à côté (src/pages/VD-xx/<Écran>.tsx) et
// routes.ts pointe vers lui (METHODE.md).
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cleEtat, exclu, RETIRES } from './inventaire-commun.mjs'
import { releverEtat, Transcripteur } from './transcription.mjs'

const args = process.argv.slice(2)
const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))

export const nomComposant = (route) =>
  route
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[-_]/)
    .map((m) => m[0].toUpperCase() + m.slice(1))
    .join('')

const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
const erreurs = []
page.on('pageerror', (e) => erreurs.push(e.message))

if (args[0] === '--releve') {
  const tr = new Transcripteur()
  const { avant, contenu, fixes } = tr.jsx(await releverEtat(page, args[1]), 2)
  tr.enregistrer()
  console.log([...tr.imports].map(([v, f]) => `import ${v} from '../../assets/prototype/${f}'`).join('\n'))
  console.log(`// avant le contenu\n${avant}\n// contenu (main)\n${contenu}\n// après (feuilles, voiles)\n${fixes}`)
  await navigateur.close()
  process.exit(0)
}

const [groupe, ...seules] = args
if (!/^VD-\d\d$/.test(groupe ?? '')) throw new Error('usage : node outils/ecran.mjs <VD-xx> [route…] | --releve <#adresse>')
const pages = PAGES.filter((p) => p.groupe === groupe && !RETIRES[p.route] && (!seules.length || seules.includes(p.route)))
if (!pages.length) throw new Error(`${groupe} : aucune route`)
const DOSSIER = new URL(`../src/pages/${groupe}/`, import.meta.url)
const PROVISOIRES = new URL('provisoires/', DOSSIER)
mkdirSync(PROVISOIRES, { recursive: true })

for (const p of pages) {
  const tr = new Transcripteur()
  const adresses = [...new Set(['#' + p.route, ...p.etats.map((e) => e.adresse)])].filter((a) => !exclu(a))
  const rendus = new Map() // JSX → clés d'état
  for (const adresse of adresses) {
    const cle = cleEtat(adresse)
    const { avant, contenu, fixes } = tr.jsx(await releverEtat(page, adresse), 5)
    const prop = (nom, v) => (v.trim() ? ` ${nom}={\n          <>\n${v}\n          </>\n        }` : '')
    const jsx = `<Ecran route=${JSON.stringify(p.route)} parEtat${prop('avant', avant)}${prop('fixes', fixes)}>\n${contenu}\n        </Ecran>`
    if (!rendus.has(jsx)) rendus.set(jsx, [])
    rendus.get(jsx).push(cle)
  }
  tr.enregistrer()
  const corps = [...rendus].map(([jsx, cles], i) => {
    const cas = i === 0 ? '    default:\n' : ''
    return cles.filter((c, j) => !(i === 0 && j === 0 && c === p.route)).map((c) => `    case ${JSON.stringify(c)}:\n`).join('') + cas + `      return (\n        ${jsx}\n      )`
  })
  const nom = nomComposant(p.route)
  const utilise = (re) => [...rendus.keys()].some((j) => re.test(j))
  const code =
    `// Page provisoire « ${p.titre} » (${groupe}) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,\n` +
    `// un rendu par état (${adresses.length} adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).\n` +
    (utilise(/as CSSProperties/) ? `import type { CSSProperties } from 'react'\n` : '') +
    (utilise(/<Link /) ? `import { Link } from 'react-router-dom'\n` : '') +
    [...tr.imports].map(([v, f]) => `import ${v} from '../../../assets/prototype/${f}'\n`).join('') +
    `import { Ecran } from '../../../composants/coque'\n` +
    (utilise(/<Dessin /) ? `import { Dessin } from '../../../composants/Dessin'\n` : '') +
    (utilise(/<Icone /) ? `import { Icone } from '../../../composants/Icone'\n` : '') +
    `import { useEtat } from '../../../config/etats'\n` +
    `import { usePreferences } from '../../../preferences'\n\n` +
    `export default function ${nom}() {\n  const { t } = usePreferences()\n  switch (useEtat(${JSON.stringify(p.route)})) {\n` +
    corps.join('\n') +
    `\n  }\n}\n`
  writeFileSync(new URL(nom + '.tsx', PROVISOIRES), code)
  console.log(`${p.route} : ${adresses.length} adresses, ${rendus.size} rendus`)
}
await navigateur.close()
if (erreurs.length) throw new Error('erreurs du prototype : ' + erreurs.slice(0, 3).join(' | '))

// routes.ts du groupe : écrit une seule fois (ensuite, il appartient à l'agent du groupe).
const ROUTES_TS = new URL('routes.ts', DOSSIER)
if (!existsSync(ROUTES_TS)) {
  const toutes = PAGES.filter((p) => p.groupe === groupe && !RETIRES[p.route])
  writeFileSync(
    ROUTES_TS,
    `// Routes du groupe ${groupe} : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).\n` +
      `// statut « provisoire » : page générée (balisage du prototype) ; « repris » : écran repris, logique et testé.\n` +
      `import type { RoutesGroupe } from '../../config/routes'\n\n` +
      `export default {\n  groupe: '${groupe}',\n  routes: [\n` +
      toutes.map((p) => `    { route: '${p.route}', statut: 'provisoire', ecran: () => import('./provisoires/${nomComposant(p.route)}') },\n`).join('') +
      `  ],\n} satisfies RoutesGroupe\n`,
  )
}
