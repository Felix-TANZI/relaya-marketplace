// Inventaire des écrans du prototype vendeur (73 routes) : écrit src/genere/pages.json.
// Pour chaque route : groupe VD (étiquette « doc » du prototype), titre, onglet, états (plan du prototype, feuilles de
// l'inventaire, états trouvés en suivant les liens), et statut :
//   - « provisoire » : page provisoire (balisage du prototype tel quel, outils/ecran.mjs) ;
//   - « repris »     : écran repris par un agent (logique, données, enrichi) — déclaré dans src/pages/VD-xx/routes.ts ;
//   - « retiré »     : écran sans utilité réelle (PLAN-VENDEUR.md, règle 3 : démonstrations du téléphone, île).
// Le statut se lit dans les fichiers routes.ts des groupes : relancer cet outil met pages.json à jour (vague
// d'intégration seulement : un agent de la vague 2 change le statut dans SON routes.ts, pas dans pages.json).
//   node outils/inventaire.mjs            (relit le prototype en marche)
//   node outils/inventaire.mjs --statuts  (relit seulement les statuts des routes.ts, sans navigateur)
import { chromium } from '@playwright/test'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { exclu, RETIRES } from './inventaire-commun.mjs'
import { FICHIER_PROTO, PROTO } from './proto.mjs'

const SORTIE = new URL('../src/genere/pages.json', import.meta.url)
const PAGES_DIR = new URL('../src/pages/', import.meta.url)

// Statuts déclarés dans src/pages/VD-xx/routes.ts : { route: 'accueil', statut: 'repris', … }. Une page ajoutée après
// le prototype (DP-58 : AJ-A, AJ-B) porte aussi titre, retour et onglet (elle n'a aucun état relevé dans le prototype).
function statutsDeclares() {
  const s = {}
  if (!existsSync(PAGES_DIR)) return s
  for (const d of readdirSync(PAGES_DIR, { withFileTypes: true })) {
    const f = new URL(d.name + '/routes.ts', PAGES_DIR)
    if (!d.isDirectory() || !existsSync(f)) continue
    const texte = readFileSync(f, 'utf-8')
    for (const m of texte.matchAll(/\{\s*route:\s*'([\w-]+)'([^}]*)\}/g)) {
      const champ = (n) => new RegExp(n + ":\\s*'([^']*)'").exec(m[2])?.[1] ?? null
      if (champ('statut')) s[m[1]] = { statut: champ('statut'), dossier: d.name, titre: champ('titre'), retour: champ('retour'), onglet: champ('onglet') }
    }
  }
  return s
}

// Pages ajoutées : fiche d'inventaire (groupe = dossier) et état de coque, copie de celle d'une page enfant du
// prototype (Aide : en-tête « retour · titre · marque », barre du bas), avec le titre, le retour et l'onglet déclarés.
const SORTIE_ETATS = new URL('../src/genere/etats.json', import.meta.url)
function pagesAjoutees(pages) {
  const s = statutsDeclares()
  const etats = JSON.parse(readFileSync(SORTIE_ETATS, 'utf-8'))
  const modele = etats.aide
  const connues = new Set(pages.filter((p) => !p.ajoutee).map((p) => p.route))
  const ajoutees = Object.entries(s)
    .filter(([r, d]) => !connues.has(r) && d.titre)
    .map(([route, d]) => ({ route, titre: d.titre, groupe: d.dossier, onglet: d.onglet, ajoutee: true, etats: [{ adresse: '#' + route, libelle: d.titre, source: 'ajoutée' }] }))
  for (const p of ajoutees) {
    const d = s[p.route]
    etats[p.route] = { ...modele, route: p.route, adresse: '#' + p.route, titre: d.titre, retour: d.retour ?? '#menu', barre: { ...modele.barre, onglet: d.onglet }, styles: [] }
  }
  writeFileSync(SORTIE_ETATS, JSON.stringify(Object.fromEntries(Object.entries(etats).sort(([a], [b]) => (a < b ? -1 : 1))), null, 1) + '\n')
  return [...pages.filter((p) => !p.ajoutee), ...ajoutees]
}

function appliquerStatuts(pages) {
  const s = statutsDeclares()
  pages = pagesAjoutees(pages)
  for (const p of pages) {
    if (RETIRES[p.route]) Object.assign(p, { statut: 'retiré', raison: RETIRES[p.route] })
    else p.statut = s[p.route]?.statut === 'repris' ? 'repris' : 'provisoire'
  }
  return pages
}

if (process.argv.includes('--statuts')) {
  const pages = appliquerStatuts(JSON.parse(readFileSync(SORTIE, 'utf-8')))
  writeFileSync(SORTIE, JSON.stringify(pages, null, 1) + '\n')
  console.log(Object.entries(Object.groupBy(pages, (p) => p.statut)).map(([k, v]) => `${v.length} ${k}`).join(', '))
  process.exit(0)
}

// Plan du prototype (liste G du script du plan) et feuilles que le plan ne liste pas.
const src = readFileSync(FICHIER_PROTO, 'utf-8')
const G = JSON.parse(/var G=(\[.*?\]\}\]),MODE=/s.exec(src)[1])
const FEUILLES = [
  ['#plans_liste?essai=pro', 'Plans · essai Pro (feuille)'],
  ['#visibilite?achat=1', 'Visibilité · achat (feuille)'],
  ['#services?demande=1', 'Services · demande (feuille)'],
  ['#horaires?prog=1', 'Horaires · programmer (feuille)'],
  ['#securite?cloture=1', 'Sécurité · clôture (feuille)'],
]

const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
await page.goto(PROTO.href + '?theme=light&lang=fr&nosplash=1#accueil')
await page.waitForSelector('#app main', { state: 'attached' })
const routes = await page.evaluate(() =>
  Object.entries(ROUTES).map(([id, r]) => ({ route: id, titre: r.title || id, groupe: r.doc || null, onglet: r.tab || null })), // eslint-disable-line no-undef
)
const connues = new Set(routes.map((r) => r.route))
const etats = new Map(routes.map((r) => [r.route, new Map([['#' + r.route, { adresse: '#' + r.route, libelle: r.titre, source: 'route' }]])]))
const ajouter = (adresse, libelle, source) => {
  const a = adresse.replace(/ /g, '%20')
  const r = a.slice(1).split('?')[0]
  if (!connues.has(r) || exclu(a)) return false
  if (etats.get(r).has(a)) return false
  etats.get(r).set(a, { adresse: a, libelle, source })
  return true
}
for (const g of G) for (const it of g.items) ajouter(it.h, it.l, 'plan')
for (const [h, l] of FEUILLES) ajouter(h, l, 'inventaire')

// États trouvés en suivant les liens de chaque état (une passe : liens des états du plan et de l'inventaire).
const aVisiter = [...etats.values()].flatMap((m) => [...m.keys()])
for (const a of aVisiter) {
  await page.goto('about:blank')
  await page.goto(PROTO.href + '?theme=light&lang=fr&nosplash=1' + a)
  await page.waitForSelector('#app', { state: 'attached' })
  const liens = await page.evaluate(() => [...document.querySelectorAll('#app a[href^="#"]')].map((x) => x.getAttribute('href')))
  for (const h of liens) if (h.length > 1 && h.includes('?')) ajouter(h, 'lien depuis ' + a, 'lien')
}
await navigateur.close()

const pages = appliquerStatuts(
  routes.map((r) => ({
    ...r,
    // Le Menu et les écrans du 1er octobre sans étiquette suivent le groupe de leur sujet.
    groupe: r.groupe ?? (r.route === 'menu' ? 'VD-11' : 'VD-04'),
    etats: [...etats.get(r.route).values()],
  })),
)
writeFileSync(SORTIE, JSON.stringify(pages, null, 1) + '\n')
const n = pages.reduce((s, p) => s + p.etats.length, 0)
console.log(`${pages.length} routes, ${n} états ; ` + Object.entries(Object.groupBy(pages, (p) => p.statut)).map(([k, v]) => `${v.length} ${k}`).join(', '))
