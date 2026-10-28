// Dernière étape de la construction des six interfaces (outils/construire-tout.sh), sur dist/ :
// 1. « __SITE_URL__ » des pages HTML (adresse canonique, balises de partage) devient l'adresse du site ;
// 2. robots.txt et sitemap.xml : seulement les pages publiques (la console /admin/ en est exclue et reste « noindex » :
//    vercel.json et sa page) ;
// 3. aucun fichier de travail publié (les .md déposés avec les photos dans public/).
// Adresse du site : SITE_URL, sinon le domaine de production que Vercel donne au build (VERCEL_PROJECT_PRODUCTION_URL :
// pg-beliva-y.vercel.app aujourd'hui, belivay.com dès qu'il est le domaine de production du projet), sinon l'adresse
// actuelle. Rien à changer ici au passage à belivay.com (MISE-EN-LIGNE.md).
//   node outils/publication.mjs [dist]
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = process.argv[2] ?? fileURLToPath(new URL('../dist', import.meta.url))
const brut = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'https://pg-beliva-y.vercel.app')
const site = brut.replace(/\/+$/, '')
if (!/^https:\/\/[a-z0-9.-]+$/i.test(site)) throw new Error(`publication : adresse du site invalide « ${site} » (attendu : https://domaine)`)

// Pages ouvertes aux moteurs (les mêmes que src/composants/Referencement.ts, PAGES_OUVERTES), puis l'entrée des
// quatre espaces professionnels. Les fiches produits sont des exemples de démonstration : pas dans le plan.
export const PAGES_PUBLIQUES = [
  '/',
  '/categories',
  '/aide',
  '/faq',
  '/legal',
  ...['cgu', 'confidentialite', 'mentions', 'cookies', 'cgv', 'retours', 'garde'].map((d) => '/legal-doc?d=' + d),
  '/diaspora-infos',
  '/vendeur/',
  '/entreprise/',
  '/livreur/',
  '/relais/',
]

function fichiers(dossier) {
  return readdirSync(dossier).flatMap((n) => {
    const p = join(dossier, n)
    return statSync(p).isDirectory() ? fichiers(p) : [p]
  })
}

let pages = 0
let retires = 0
for (const f of fichiers(dist)) {
  if (f.endsWith('.html')) {
    const s = readFileSync(f, 'utf8')
    if (s.includes('__SITE_URL__')) {
      writeFileSync(f, s.replaceAll('__SITE_URL__', site))
      pages++
    }
  } else if (f.endsWith('.md')) {
    rmSync(f)
    retires++
  }
}

writeFileSync(
  join(dist, 'robots.txt'),
  ['# BelivaY : pages publiques ouvertes aux moteurs ; la console d’administration (/admin/) est en « noindex ».', 'User-agent: *', 'Allow: /', '', `Sitemap: ${site}/sitemap.xml`, ''].join('\n'),
)
const echapper = (s) => s.replaceAll('&', '&amp;')
writeFileSync(
  join(dist, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    PAGES_PUBLIQUES.map((p) => `  <url><loc>${echapper(site + p)}</loc></url>`).join('\n') +
    '\n</urlset>\n',
)
console.log(`publication : ${site} · ${pages} page(s) HTML · robots.txt et sitemap.xml (${PAGES_PUBLIQUES.length} adresses) · ${retires} fichier(s) .md retiré(s)`)
