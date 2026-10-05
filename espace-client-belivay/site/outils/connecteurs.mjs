// Écrit le tableau des méthodes de CONNECTEURS.md depuis le registre src/api/routes.ts (une seule vérité).
// Seule la partie entre les balises <!-- connecteurs:debut --> et <!-- connecteurs:fin --> est réécrite.
// Lancement : node outils/connecteurs.mjs (Node 22.6+ lit le TypeScript du registre sans compilation).
import { readFileSync, writeFileSync } from 'node:fs'
import { CONNECTEURS } from '../src/api/routes.ts'

const FICHIER = new URL('../CONNECTEURS.md', import.meta.url)
const DEBUT = '<!-- connecteurs:debut -->'
const FIN = '<!-- connecteurs:fin -->'

const ETATS = {
  branche: 'branché',
  partiel: 'branché, partiel',
  serveur: 'à créer côté serveur',
  front: 'à finir côté site',
  demo: 'démonstration seulement',
}
const cellule = (t) => (t ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')

const entrees = Object.entries(CONNECTEURS)
const compte = Object.fromEntries(Object.keys(ETATS).map((e) => [e, entrees.filter(([, c]) => c.etat === e).length]))

const lignes = []
lignes.push(`${entrees.length} méthodes : **${compte.branche} branchées**, **${compte.partiel} branchées en partie** (champs manquants côté serveur), ` +
  `**${compte.serveur} à créer côté serveur**, ${compte.front} à finir côté site, ${compte.demo} propre${compte.demo > 1 ? 's' : ''} à la démonstration.`)
lignes.push('')
const domaines = [...new Set(entrees.map(([, c]) => c.domaine))]
for (const d of domaines) {
  const du = entrees.filter(([, c]) => c.domaine === d)
  const n = du.filter(([, c]) => c.etat === 'branche' || c.etat === 'partiel').length
  lignes.push(`### ${d} (${n}/${du.length} branchées)`)
  lignes.push('')
  lignes.push('| Méthode | État | Route | Corps → réponse | Note |')
  lignes.push('|---|---|---|---|---|')
  for (const [m, c] of du) lignes.push(`| \`${m}\` | ${ETATS[c.etat]} | ${cellule(c.route)} | ${cellule(c.echange)} | ${cellule(c.note)} |`)
  lignes.push('')
}

const doc = readFileSync(FICHIER, 'utf8')
const i = doc.indexOf(DEBUT)
const j = doc.indexOf(FIN)
if (i < 0 || j < i) throw new Error(`Balises ${DEBUT} et ${FIN} absentes de CONNECTEURS.md`)
writeFileSync(FICHIER, `${doc.slice(0, i + DEBUT.length)}\n\n${lignes.join('\n')}\n${doc.slice(j)}`)
console.log(`CONNECTEURS.md : ${entrees.length} méthodes écrites.`)
