// Écrit le tableau des méthodes de CONNECTEURS-RELAIS.md depuis le registre src/api/routes.ts (une seule vérité, comme
// espace-livreur/outils/connecteurs.mjs). Seule la partie entre <!-- connecteurs:debut --> et <!-- connecteurs:fin --> est
// réécrite. Lancement : node outils/connecteurs.mjs (Node 23.6 et plus : routes.ts est lu tel quel, types effacés).
import { readFileSync, writeFileSync } from 'node:fs'
import { CONNECTEURS_RELAIS } from '../src/api/routes.ts'

const FICHIER = new URL('../CONNECTEURS-RELAIS.md', import.meta.url)
const DEBUT = '<!-- connecteurs:debut -->'
const FIN = '<!-- connecteurs:fin -->'
const ETATS = { branche: 'branché', telephone: 'sur le téléphone (sans route)', demo: 'démonstration seulement' }
const TITRES = {
  session: 'Session et PIN', acces: 'Accès, candidature, activation', aujourdhui: 'Aujourd’hui', reception: 'Réception des lots',
  retrait: 'Remise au client', stock: 'Stock et plan', departs: 'Départs', incidents: 'Constats et retours', fermeture: 'Fermetures',
  historique: 'Historique', notifications: 'Notifications', messages: 'Messages', aide: 'Aide', argent: 'Argent (gérant)',
  qualite: 'Qualité', relais: 'Mon relais', horsligne: 'Hors connexion',
}
const cellule = (t) => (t ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')

const entrees = Object.entries(CONNECTEURS_RELAIS)
const autres = entrees.filter(([, c]) => !(c.etat in ETATS))
if (autres.length) throw new Error(`États inconnus : ${autres.map(([m, c]) => `${m} (${c.etat})`).join(', ')}`)
const compte = Object.fromEntries(Object.keys(ETATS).map((e) => [e, entrees.filter(([, c]) => c.etat === e).length]))
const lignes = [
  `${entrees.length} méthodes : **${compte.branche} branchées**, ${compte.telephone} servies sur le téléphone, ` +
    `${compte.demo} propres à la démonstration (gestes de l'application du client, de l'agrégateur ou de la console). ` +
    'Aucune « à brancher ».',
  '',
]
for (const d of [...new Set(entrees.map(([m]) => m.split('.')[0]))]) {
  const du = entrees.filter(([m]) => m.startsWith(d + '.'))
  const n = du.filter(([, c]) => c.etat !== 'demo').length
  lignes.push(`### ${TITRES[d] ?? d} (${n}/${du.length} branchées)`, '', '| Méthode | État | Route | Corps → réponse | Note |', '|---|---|---|---|---|')
  for (const [m, c] of du) lignes.push(`| \`${m}\` | ${ETATS[c.etat]} | ${cellule(c.route)} | ${cellule(c.echange)} | ${cellule(c.note)} |`)
  lignes.push('')
}
const doc = readFileSync(FICHIER, 'utf8')
const i = doc.indexOf(DEBUT)
const j = doc.indexOf(FIN)
if (i < 0 || j < i) throw new Error(`Balises ${DEBUT} et ${FIN} absentes de CONNECTEURS-RELAIS.md`)
writeFileSync(FICHIER, `${doc.slice(0, i + DEBUT.length)}\n\n${lignes.join('\n')}\n${doc.slice(j)}`)
console.log(`CONNECTEURS-RELAIS.md : ${entrees.length} méthodes.`)
