// Inventaire de l'espace livreur, relu dans les routes déclarées (src/pages/LIV-xx/routes.ts) et dans l'extraction
// du paquet livreur (logique-metier/livreur/extraction/*.json, clés « ecrans » et « parametres ») :
// - src/genere/pages.json : une fiche par route (page LIV-Pxx, titre, groupe, statut, coque, états du prototype) ;
//   lue par les tests (squelette, boutons, retour) et les outils, jamais par l'application ;
// - src/genere/fiches.json : états, éléments et gestes attendus de chaque écran (pages provisoires) ;
// - src/pages/LIV-xx/provisoires/<Écran>.tsx : la page provisoire de chaque route (régénérée : ne pas la modifier) ;
// - src/genere/parametres-manquants.json : paramètres du paquet livreur absents du registre en vigueur (à y ajouter
//   avant d'écrire le moteur qui les lit : aucune valeur dans le code).
// Lancer : npm run inventaire (après un changement de routes.ts ou de l'extraction).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

const ici = (p) => new URL(p, import.meta.url)
const lireJson = (p) => JSON.parse(readFileSync(ici(p), 'utf-8'))
const EXTRACTION = '../../logique-metier/livreur/extraction/'

// Écrans de l'extraction, fusionnés par identifiant (un écran peut être détaillé dans plusieurs périmètres).
const ecrans = {}
const parametres = {}
for (const f of readdirSync(ici(EXTRACTION)).filter((x) => x.endsWith('.json')).sort()) {
  const d = lireJson(EXTRACTION + f)
  for (const e of d.ecrans ?? []) {
    const v = (ecrans[e.id] ??= { page: e.id, nom: e.nom, etats: [], elements: [], actions: [] })
    for (const k of ['etats', 'elements', 'actions']) for (const x of e[k] ?? []) if (!v[k].includes(x)) v[k].push(x)
  }
  for (const p of d.parametres ?? []) if (p.code) parametres[p.code] ??= { code: p.code, libelle: p.libelle, valeur: p.valeur, unite: p.unite ?? null, statut: p.statut_doc ?? null, ref: p.ref ?? null }
}

// Routes déclarées par les groupes.
const routes = []
for (const d of readdirSync(ici('../src/pages/'), { withFileTypes: true })) {
  const f = ici(`../src/pages/${d.name}/routes.ts`)
  if (!d.isDirectory() || !existsSync(f)) continue
  const texte = readFileSync(f, 'utf-8')
  for (const m of texte.matchAll(/\{\s*route:\s*'([\w-]+)'([^\n]*)\}/g)) {
    const champ = (k) => new RegExp(`${k}:\\s*'([^']*)'`).exec(m[2])?.[1] ?? null
    routes.push({ route: m[1], page: champ('page'), titre: champ('titre'), groupe: d.name, statut: champ('statut'), entete: champ('entete'), retour: champ('retour'), onglet: champ('onglet'), fichier: /import\('\.\/(provisoires\/[\w]+)'\)/.exec(m[2])?.[1] ?? null })
  }
}
if (new Set(routes.map((r) => r.route)).size !== routes.length) throw new Error('route déclarée deux fois')

// États du prototype : « #route?s=x libellé » → adresse et libellé.
const etatsDe = (e) =>
  (e?.etats ?? [])
    .filter((x) => x.startsWith('#'))
    .map((x) => {
      const i = x.indexOf(' ')
      return { adresse: i < 0 ? x : x.slice(0, i), libelle: i < 0 ? '' : x.slice(i + 1) }
    })

mkdirSync(ici('../src/genere/'), { recursive: true })
const ecrire = (p, d) => writeFileSync(ici(p), JSON.stringify(d, null, 1) + '\n')
const pages = routes.map(({ fichier: _f, ...r }) => ({ ...r, etats: etatsDe(ecrans[r.page]) }))
ecrire('../src/genere/pages.json', pages)
ecrire('../src/genere/fiches.json', Object.fromEntries(routes.map((r) => [r.route, ecrans[r.page] ?? { page: r.page, nom: r.titre, etats: [], elements: [], actions: [] }])))

// Pages provisoires (une par route, nom de fichier tiré de routes.ts).
let n = 0
for (const r of routes) {
  const nom = (r.fichier ?? 'provisoires/' + r.route.split('-').map((x) => x[0].toUpperCase() + x.slice(1)).join('')).split('/')[1]
  const dossier = ici(`../src/pages/${r.groupe}/provisoires/`)
  mkdirSync(dossier, { recursive: true })
  writeFileSync(
    new URL(nom + '.tsx', dossier),
    `// PAGE PROVISOIRE GÉNÉRÉE (outils/inventaire.mjs) — ${r.page} · ${r.titre}. Ne pas modifier : l'écran repris s'écrit à\n// côté (src/pages/${r.groupe}/${nom}.tsx) et routes.ts pointe vers lui (METHODE.md).\nimport { PageProvisoire } from '../../../composants/PageProvisoire'\n\nexport default function ${nom}Provisoire() {\n  return <PageProvisoire route="${r.route}" />\n}\n`,
  )
  n++
}

// Paramètres du paquet absents du registre en vigueur.
const registre = new Set(lireJson('../../logique-metier/parametres-en-vigueur.json').parametres.map((p) => p.code))
const manquants = Object.values(parametres).filter((p) => !registre.has(p.code))
ecrire('../src/genere/parametres-manquants.json', manquants)

const sansEcran = Object.keys(ecrans).filter((id) => !routes.some((r) => r.page === id))
console.log(`${routes.length} routes (${routes.filter((r) => r.statut === 'repris').length} reprises), ${n} pages provisoires ; ${Object.keys(ecrans).length} écrans dans l'extraction${sansEcran.length ? ', sans route : ' + sansEcran.join(', ') : ''} ; ${manquants.length} paramètres du paquet absents du registre`)
