// Relève du prototype entreprise ce que l'application en garde (DP-60 : le prototype n'est qu'un squelette) : les
// icônes Lucide au trait (constante ICONS du prototype), complétées par celles du vendeur (même famille) pour la coque.
// Écrit src/genere/icones.json. Usage : node outils/prototype.mjs (après une mise à jour du paquet).
import { readFileSync, writeFileSync } from 'node:fs'
import { logosOfficiels } from '../../site/outils/logos-marques.mjs'
import { trouverPrototype } from './proto.mjs'

const ICI = new URL('../', import.meta.url)
const fichier = trouverPrototype()
if (!fichier) throw new Error('prototype entreprise introuvable : poser PROTO_ENTREPRISE=<chemin du fichier HTML>')
const html = readFileSync(fichier, 'utf-8')

/** Objet littéral JSON qui suit « const NOM = » (accolades équilibrées, chaînes comprises). */
function objet(nom) {
  const m = new RegExp('const\\s+' + nom + '\\s*=\\s*').exec(html)
  if (!m) throw new Error(`${nom} absent du prototype`)
  let i = m.index + m[0].length
  const debut = i
  let prof = 0
  let chaine = null
  for (; i < html.length; i++) {
    const c = html[i]
    if (chaine) {
      if (c === '\\') i++
      else if (c === chaine) chaine = null
    } else if (c === '"' || c === "'") chaine = c
    else if (c === '{') prof++
    else if (c === '}' && --prof === 0) break
  }
  return JSON.parse(html.slice(debut, i + 1))
}

const proto = objet('ICONS')
const vendeur = JSON.parse(readFileSync(new URL('../espace-vendeur/src/genere/icones.json', ICI), 'utf-8'))
// Icônes Lucide (même famille, licence ISC) demandées par les enrichissements et absentes du prototype et du vendeur.
const EN_PLUS = {
  'zoom-out': '<circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /><line x1="8" x2="14" y1="11" y2="11" />',
  'maximize-2': '<polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" x2="14" y1="3" y2="10" /><line x1="3" x2="10" y1="21" y2="14" />',
  'minimize-2': '<polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" x2="21" y1="10" y2="3" /><line x1="3" x2="10" y1="21" y2="14" />',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" />',
  play: '<polygon points="6 3 20 12 6 21 6 3" />',
  briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" />',
  'bell-plus': '<path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M15 8h6" /><path d="M18 5v6" /><path d="M20.002 14.464a9 9 0 0 0 .738.863A1 1 0 0 1 20 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 8.75-5.332" />',
}
// Le tracé officiel d'Apple l'emporte sur la pomme-fruit du prototype (site/outils/logos-marques.mjs).
const icones = logosOfficiels({ ...EN_PLUS, ...vendeur, ...proto })
const trie = Object.fromEntries(Object.keys(icones).sort().map((k) => [k, icones[k].replace(/\s+/g, ' ').trim()]))
writeFileSync(new URL('src/genere/icones.json', ICI), JSON.stringify(trie, null, 0) + '\n')
console.log(`icônes : ${Object.keys(proto).length} du prototype, ${Object.keys(trie).length} au total → src/genere/icones.json`)
