// Inventaire de la console, relu à chaque changement de routes (npm run inventaire) :
// - src/genere/pages.json : une fiche par route déclarée dans src/pages/<groupe>/routes.ts (route, écran ADM-Pxx,
//   titre, groupe, statut, parent, onglet), lue par les tests ; l'application lit les routes elles-mêmes ;
// - vérifie que chaque écran du prototype (src/genere/ecrans.json, outils/ecrans.mjs) a sa route.
// Les droits ne sont pas dans les fiches : ils sont dans la matrice unique (src/config/droits.ts).
// --verifier : n'écrit rien, sort en erreur si un fichier généré n'est plus à jour (tests/squelette.spec.ts).
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'

const ICI = new URL('../', import.meta.url)
const verifier = process.argv.includes('--verifier')

// ── Routes déclarées ───────────────────────────────────────────────────────────────────────────────────────────────
const champ = (bloc, nom) => new RegExp(nom + ":\\s*'((?:[^'\\\\]|\\\\.)*)'").exec(bloc)?.[1]?.replace(/\\'/g, "'") ?? null
const pages = []
const dossierPages = new URL('src/pages/', ICI)
for (const d of readdirSync(dossierPages, { withFileTypes: true }).filter((x) => x.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const f = new URL(d.name + '/routes.ts', dossierPages)
  if (!existsSync(f)) continue
  const texte = readFileSync(f, 'utf-8')
  const groupe = /groupe:\s*'([\w-]+)'/.exec(texte)?.[1]
  if (groupe !== d.name) throw new Error(`${d.name}/routes.ts : groupe « ${groupe} » au lieu de « ${d.name} »`)
  for (const bloc of texte.split(/\{\s*route:/).slice(1).map((b) => 'route:' + b)) {
    pages.push({
      route: champ(bloc, 'route'),
      ecran: champ(bloc, 'ecran'),
      titre: champ(bloc, 'titre'),
      groupe,
      statut: champ(bloc, 'statut'),
      parent: champ(bloc, 'parent'),
      onglet: champ(bloc, 'onglet'),
      sansSession: /sansSession:\s*true/.test(bloc),
    })
  }
}
const vues = new Set()
for (const p of pages) {
  if (!p.route || !p.ecran || !p.titre || !p.statut) throw new Error(`fiche incomplète : ${JSON.stringify(p)}`)
  if (vues.has(p.route)) throw new Error(`route « ${p.route} » déclarée deux fois`)
  vues.add(p.route)
}
for (const p of pages) if (p.parent && !vues.has(p.parent)) throw new Error(`${p.route} : parent « ${p.parent} » inconnu`)

// ── Écriture ou vérification ───────────────────────────────────────────────────────────────────────────────────────
const sorties = {
  'src/genere/pages.json': JSON.stringify(pages, null, 1) + '\n',
}
let perimes = 0
for (const [f, contenu] of Object.entries(sorties)) {
  const u = new URL(f, ICI)
  const actuel = existsSync(u) ? readFileSync(u, 'utf-8') : null
  if (actuel === contenu) continue
  if (verifier) {
    console.error(`${f} n'est plus à jour : npm run inventaire`)
    perimes++
  } else writeFileSync(u, contenu)
}
// Chaque écran du prototype (src/genere/ecrans.json, outils/ecrans.mjs) a sa route.
const ecrans = existsSync(new URL('src/genere/ecrans.json', ICI)) ? Object.keys(JSON.parse(readFileSync(new URL('src/genere/ecrans.json', ICI), 'utf-8'))) : []
const manquants = ecrans.filter((r) => !vues.has(r))
if (manquants.length) console.warn(`écrans du prototype sans route : ${manquants.join(', ')}`)
console.log(`${pages.length} routes, ${ecrans.length} écrans du prototype${verifier ? (perimes ? ' : périmé' : ' : à jour') : ''}`)
process.exit(perimes || manquants.length ? 1 : 0)
