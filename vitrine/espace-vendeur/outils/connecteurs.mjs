// Écrit le tableau des méthodes de CONNECTEURS-VENDEUR.md depuis le registre src/api/routes.ts (une seule vérité, comme
// site/outils/connecteurs.mjs). Seule la partie entre <!-- connecteurs:debut --> et <!-- connecteurs:fin --> est réécrite.
// Lancement : node ../backend-kit/outils/node_modules/.bin/tsx outils/connecteurs.mjs (tsx : imports TypeScript sans extension).
import { readFileSync, writeFileSync } from 'node:fs'
import { CONNECTEURS_PAGES, CONNECTEURS_VENDEUR, TYPES_PAGES } from '../src/api/routes.ts'

const FICHIER = new URL('../CONNECTEURS-VENDEUR.md', import.meta.url)
const DEBUT = '<!-- connecteurs:debut -->'
const FIN = '<!-- connecteurs:fin -->'

const ETATS = {
  branche: 'branché',
  partiel: 'branché, partiel',
  appareil: 'sur l’appareil',
  serveur: 'à créer côté serveur',
  front: 'à finir côté site',
  demo: 'démonstration seulement',
}
const cellule = (t) => (t ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')

const entrees = Object.entries(CONNECTEURS_VENDEUR)
const compte = Object.fromEntries(Object.keys(ETATS).map((e) => [e, entrees.filter(([, c]) => c.etat === e).length]))

const lignes = []
const tableau = (liste, titre) => {
  for (const d of [...new Set(liste.map(([, c]) => c.domaine))]) {
    const du = liste.filter(([, c]) => c.domaine === d)
    const n = du.filter(([, c]) => c.etat === 'branche' || c.etat === 'partiel' || c.etat === 'appareil').length
    lignes.push(`${titre} ${d} (${n}/${du.length} branchées)`)
    lignes.push('')
    lignes.push('| Méthode | État | Route | Corps → réponse | Note |')
    lignes.push('|---|---|---|---|---|')
    for (const [m, c] of du) lignes.push(`| \`${m}\` | ${ETATS[c.etat]} | ${cellule(c.route)} | ${cellule(c.echange)} | ${cellule(c.note)} |`)
    lignes.push('')
  }
}
lignes.push(
  `${entrees.length} méthodes : **${compte.branche} branchées**, ${compte.partiel} branchées en partie (un fournisseur ` +
    `externe), ${compte.appareil} calculées sur l’appareil avec la règle du serveur, **${compte.serveur} à créer côté serveur**, ` +
    `${compte.front} à finir côté site, ${compte.demo} propres à la démonstration ` +
    `(gestes d'une autre interface : livreur, prestataire, client, changer de membre).`,
)
lignes.push('')
tableau(entrees, '###')

// Pages ajoutées (DP-58) et domaines hors SourceVendeur : src/api/routes/pages.ts.
const pages = Object.entries(CONNECTEURS_PAGES)
const types = [...new Set(Object.values(TYPES_PAGES).map((t) => `\`${t.fichier}\``))].join(', ')
lignes.push('### Pages ajoutées et domaines hors de la source')
lignes.push('')
lignes.push(
  `${pages.length} méthodes (types : ${types}) : AJ-A les appelle en mode API (\`src/pages/AJ-A/donnees/source.ts\`) ; ` +
    'les autres passent par `src/api/pages/source.ts` (écrans : `src/api/pages/actif.ts` ; flux d’événements : `src/api/ecoute.ts`).',
)
lignes.push('')
tableau(pages, '####')

const doc = readFileSync(FICHIER, 'utf8')
const i = doc.indexOf(DEBUT)
const j = doc.indexOf(FIN)
if (i < 0 || j < i) throw new Error(`Balises ${DEBUT} et ${FIN} absentes de CONNECTEURS-VENDEUR.md`)
writeFileSync(FICHIER, `${doc.slice(0, i + DEBUT.length)}\n\n${lignes.join('\n')}\n${doc.slice(j)}`)
console.log(`CONNECTEURS-VENDEUR.md : ${entrees.length} méthodes de la source et ${pages.length} des pages écrites.`)
