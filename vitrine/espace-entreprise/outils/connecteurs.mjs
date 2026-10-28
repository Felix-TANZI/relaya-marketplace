// Écrit le tableau des méthodes de CONNECTEURS-ENTREPRISE.md depuis le registre src/api/routes.ts (une seule vérité, comme
// espace-vendeur/outils/connecteurs.mjs). Seule la partie entre <!-- connecteurs:debut --> et <!-- connecteurs:fin --> est
// réécrite. Lancement : node ../backend-kit/outils/node_modules/.bin/tsx outils/connecteurs.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { CONNECTEURS_ENTREPRISE } from '../src/api/routes.ts'

const FICHIER = new URL('../CONNECTEURS-ENTREPRISE.md', import.meta.url)
const DEBUT = '<!-- connecteurs:debut -->'
const FIN = '<!-- connecteurs:fin -->'
const ETATS = { branche: 'branché', partiel: 'branché, partiel', serveur: 'à créer côté serveur', front: 'à finir côté écran', demo: 'démonstration seulement' }
const cellule = (t) => (t ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')

const entrees = Object.entries(CONNECTEURS_ENTREPRISE)
const compte = Object.fromEntries(Object.keys(ETATS).map((e) => [e, entrees.filter(([, c]) => c.etat === e).length]))
const lignes = [
  `${entrees.length} méthodes : **${compte.branche} branchées**, ${compte.partiel} branchées en partie, ` +
    `**${compte.serveur} à créer côté serveur**, ${compte.front} à finir côté écran, ${compte.demo} propres à la démonstration ` +
    "(gestes d'une autre interface ou de la console).",
  '',
]
for (const d of [...new Set(entrees.map(([, c]) => c.domaine))]) {
  const du = entrees.filter(([, c]) => c.domaine === d)
  const n = du.filter(([, c]) => c.etat === 'branche' || c.etat === 'partiel').length
  lignes.push(`### ${d} (${n}/${du.length} branchées)`, '', '| Méthode | État | Route | Corps → réponse | Note |', '|---|---|---|---|---|')
  for (const [m, c] of du) lignes.push(`| \`${m}\` | ${ETATS[c.etat]} | ${cellule(c.route)} | ${cellule(c.echange)} | ${cellule(c.note)} |`)
  lignes.push('')
}
const doc = readFileSync(FICHIER, 'utf8')
const i = doc.indexOf(DEBUT)
const j = doc.indexOf(FIN)
if (i < 0 || j < i) throw new Error(`Balises ${DEBUT} et ${FIN} absentes de CONNECTEURS-ENTREPRISE.md`)
writeFileSync(FICHIER, `${doc.slice(0, i + DEBUT.length)}\n\n${lignes.join('\n')}\n${doc.slice(j)}`)
console.log(`CONNECTEURS-ENTREPRISE.md : ${entrees.length} méthodes.`)
