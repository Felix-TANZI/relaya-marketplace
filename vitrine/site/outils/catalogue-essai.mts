// Écrit le catalogue du jeu d'essai du site (src/demo/catalogue.ts) au format lu par la commande charger_demo du serveur
// d'essai du kit (backend-kit/_essai/relaya_essai/donnees/catalogue.json) : le serveur d'essai sert ainsi les mêmes
// produits, prix, stocks, classes de colis et boutiques que la démonstration.
//   npx tsx outils/catalogue-essai.mts
import { writeFileSync } from 'node:fs'
import { CATALOGUE } from '../src/demo/catalogue'

const produits = Object.values(CATALOGUE).map((p) => ({
  cle: p.p,
  titre: p.titre,
  prix: p.prix,
  prixBarre: p.prixBarre ?? null,
  classe: p.classe,
  stock: p.stock,
  univers: p.univers,
  universTitre: p.universTitre,
  note: p.note ? Number(String(p.note).replace(',', '.')) : null,
  avis: p.avis ?? 0,
  description: p.description ?? '',
  boutique: p.vendeur.boutique,
  zone: p.vendeur.zone,
  palier: p.vendeur.palier,
}))
const sortie = new URL('../../backend-kit/_essai/relaya_essai/donnees/catalogue.json', import.meta.url)
writeFileSync(sortie, JSON.stringify({ source: 'site/src/demo/catalogue.ts', produits }, null, 1) + '\n')
console.log(`${produits.length} produits → ${sortie.pathname}`)
