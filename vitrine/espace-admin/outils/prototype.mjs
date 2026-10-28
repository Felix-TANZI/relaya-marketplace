// Relève du prototype de la console ce que l'application en garde (DP-60 : le prototype n'est qu'un squelette) : les
// icônes Lucide au trait (constante ICONS du prototype), complétées par celles de l'entreprise (même famille : vendeur
// et enrichissements compris) pour la coque.
// Écrit src/genere/icones.json. Usage : node outils/prototype.mjs (après une mise à jour du paquet).
import { readFileSync, writeFileSync } from 'node:fs'
import { logosOfficiels } from '../../site/outils/logos-marques.mjs'
import { trouverPrototype } from './proto.mjs'

const ICI = new URL('../', import.meta.url)
const fichier = trouverPrototype()
if (!fichier) throw new Error('prototype de la console introuvable : poser PROTO_ADMIN=<chemin du fichier HTML>')
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
const famille = JSON.parse(readFileSync(new URL('../espace-entreprise/src/genere/icones.json', ICI), 'utf-8'))
// Le tracé officiel d'Apple l'emporte sur la pomme-fruit du prototype (site/outils/logos-marques.mjs).
const icones = logosOfficiels({ ...famille, ...proto })
const trie = Object.fromEntries(Object.keys(icones).sort().map((k) => [k, icones[k].replace(/\s+/g, ' ').trim()]))
writeFileSync(new URL('src/genere/icones.json', ICI), JSON.stringify(trie, null, 0) + '\n')
console.log(`icônes : ${Object.keys(proto).length} du prototype de la console, ${Object.keys(trie).length} au total → src/genere/icones.json`)
