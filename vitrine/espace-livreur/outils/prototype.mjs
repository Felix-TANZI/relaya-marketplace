// Relit le prototype livreur (référence visuelle seulement, DP-60) et écrit dans src/genere/ :
// - icones.json : les icônes Lucide du prototype (constante ICONS : 24 × 24, trait), lues par composants/Icone.tsx ;
// - en.json : le dictionnaire anglais du prototype (blocs « Object.assign(EN, {…}) »), clé = texte français exact.
// Lecture statique du fichier HTML (aucun navigateur) : les deux constantes sont des littéraux JavaScript, évalués
// dans un bac à sable vide (node:vm) pour l'anglais.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import vm from 'node:vm'
import { FICHIER_PROTO } from './proto.mjs'

const html = readFileSync(FICHIER_PROTO, 'utf-8')
const GENERE = new URL('../src/genere/', import.meta.url)
mkdirSync(GENERE, { recursive: true })

/** Littéral { … } qui commence à l'indice i (accolades équilibrées, chaînes respectées). */
function litteral(texte, i) {
  let prof = 0
  let chaine = null
  for (let j = i; j < texte.length; j++) {
    const c = texte[j]
    if (chaine) {
      if (c === '\\') j++
      else if (c === chaine) chaine = null
    } else if (c === '"' || c === "'" || c === '`') chaine = c
    else if (c === '{') prof++
    else if (c === '}' && --prof === 0) return texte.slice(i, j + 1)
  }
  throw new Error('littéral non fermé')
}
const trie = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b, 'fr')))
const ecrire = (nom, d) => writeFileSync(new URL(nom, GENERE), JSON.stringify(d, null, 1) + '\n')

const iIcones = html.indexOf('const ICONS=')
if (iIcones < 0) throw new Error('ICONS absent du prototype')
const icones = JSON.parse(litteral(html, html.indexOf('{', iIcones)))

const en = {}
for (const m of html.matchAll(/Object\.assign\(EN,\s*/g)) Object.assign(en, vm.runInNewContext('(' + litteral(html, m.index + m[0].length) + ')', {}))

ecrire('icones.json', trie(icones))
ecrire('en.json', trie(en))
console.log(`${Object.keys(icones).length} icônes ; ${Object.keys(en).length} traductions du prototype`)
