// Applique outils/decaler-dates.mjs aux sources d'une application : node outils/decaler-dates-sources.mjs
// --jours 19 [--reference 2026-09-24] [--essai] chemins… Les commentaires ne bougent pas (ils datent les
// documents et les décisions : « prototype du 1er octobre », « DP-44, 3 oct. ») ; seuls les données, les textes
// affichés et les tests changent. À n'exécuter qu'une fois par jeu d'essai (le 21 et le 24 sept. → 13 oct. 2026 :
// vendeur --jours 22 --reference 2026-09-21, client --jours 19) : une seconde passe décalerait encore. Les tests des règles (calculs/*.test.ts) gardent leurs dates : ils ne sont pas la
// démonstration. --essai liste les remplacements sans rien écrire.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { GARDER, decalerDates } from './decaler-dates.mjs'


const args = process.argv.slice(2)
const val = (n) => args[args.indexOf(n) + 1]
const jours = Number(val('--jours'))
const reference = args.includes('--reference') ? Date.parse(val('--reference')) : undefined
const essai = args.includes('--essai')
const chemins = args.filter((a, i) => !a.startsWith('--') && !['--jours', '--reference'].includes(args[i - 1]))
if (!jours) throw new Error('--jours manquant')

const fichiers = []
const parcourir = (c) => {
  if (statSync(c).isDirectory()) {
    for (const n of readdirSync(c)) if (!['node_modules', 'dist', 'test-results'].includes(n)) parcourir(join(c, n))
  } else if (/\.(tsx?|json|mjs)$/.test(c) && !/calculs\/.*\.test\.ts$/.test(c)) fichiers.push(c)
}
chemins.forEach(parcourir)

let total = 0
for (const f of fichiers) {
  const lignes = readFileSync(f, 'utf-8').split('\n')
  let bloc = false
  let change = false
  const sortie = lignes.map((l, i) => {
    if (f.endsWith('.json')) return remplacer(l, i)
    const tl = l.trimStart()
    if (bloc) {
      if (l.includes('*/')) bloc = false
      return l
    }
    if (tl.startsWith('//') || tl.startsWith('*')) return l
    if (/^\{?\/\*/.test(tl)) {
      if (!l.includes('*/')) bloc = true
      return l
    }
    // Commentaire en fin de ligne : « code // texte » (pas « https:// »).
    const m = l.match(/(^|[^:"'`\\])\s\/\/\s/)
    if (m) {
      const k = m.index + m[1].length
      return remplacer(l.slice(0, k), i) + l.slice(k)
    }
    return remplacer(l, i)
  })
  function remplacer(t, i) {
    if (GARDER.test(t)) return t
    const n = decalerDates(t, jours, reference ? { reference } : {})
    if (n !== t) {
      change = true
      total++
      if (essai) console.log(`${f}:${i + 1}\n  - ${t.trim().slice(0, 220)}\n  + ${n.trim().slice(0, 220)}`)
    }
    return n
  }
  if (change && !essai) writeFileSync(f, sortie.join('\n'))
}
console.error(`${total} lignes changées dans ${fichiers.length} fichiers`)
