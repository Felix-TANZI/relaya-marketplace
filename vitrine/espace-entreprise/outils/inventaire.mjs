// Inventaire de l'espace entreprise, relu à chaque changement de routes ou d'extraction (npm run inventaire) :
// - src/genere/pages.json : une fiche par route déclarée dans src/pages/ENT-xx/routes.ts (route, écran ENT-Pxx, titre,
//   groupe, statut, parent, onglet, rôles), lue par les tests ; l'application lit les routes elles-mêmes ;
// - src/genere/ecrans.json : ce que l'extraction du paquet attend de chaque écran ENT-P01 à ENT-P27 (états, éléments,
//   actions et leurs destinations), montré par les pages provisoires et repris écran par écran ;
// - src/genere/parametres-manquants.json : les paramètres de l'extraction (code, valeur, unité, référence) encore
//   absents du registre officiel (logique-metier/parametres-en-vigueur.json, seule source de src/calculs/registre.ts) :
//   à y entrer par une décision du porteur avant qu'un écran ne les lise.
// Source : logique-metier/livraison/extraction/01, 02, 03 (02 et 03 précisent les écrans de leur périmètre). Un code
// de paramètre présent dans plusieurs fichiers garde sa première valeur ; une valeur différente est signalée.
// --verifier : n'écrit rien, sort en erreur si un fichier généré n'est plus à jour (tests/squelette.spec.ts).
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'

const ICI = new URL('../', import.meta.url)
const EXTRACTION = new URL('../logique-metier/livraison/extraction/', ICI)
const FICHIERS = ['01-fondations-donnees-acces.json', '02-flotte-prix-missions.json', '03-litiges-registre-contrat.json']
const verifier = process.argv.includes('--verifier')

// ── Routes déclarées ───────────────────────────────────────────────────────────────────────────────────────────────
const champ = (bloc, nom) => new RegExp(nom + ":\\s*'((?:[^'\\\\]|\\\\.)*)'").exec(bloc)?.[1]?.replace(/\\'/g, "'") ?? null
const liste = (bloc, nom) => {
  const m = new RegExp(nom + ':\\s*\\[([^\\]]*)\\]').exec(bloc)
  return m ? [...m[1].matchAll(/'([\w-]+)'/g)].map((x) => x[1]) : null
}
const pages = []
const dossierPages = new URL('src/pages/', ICI)
for (const d of readdirSync(dossierPages, { withFileTypes: true }).filter((x) => x.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const f = new URL(d.name + '/routes.ts', dossierPages)
  if (!existsSync(f)) continue
  const texte = readFileSync(f, 'utf-8')
  const groupe = /groupe:\s*'([\w-]+)'/.exec(texte)?.[1]
  if (groupe !== d.name) throw new Error(`${d.name}/routes.ts : groupe « ${groupe} » au lieu de « ${d.name} »`)
  for (const bloc of texte.split(/\{\s*route:/).slice(1).map((b) => 'route:' + b)) {
    pages.push({
      route: champ(bloc, 'route'),
      ecran: champ(bloc, 'ecran'),
      titre: champ(bloc, 'titre'),
      groupe,
      statut: champ(bloc, 'statut'),
      parent: champ(bloc, 'parent'),
      onglet: champ(bloc, 'onglet'),
      roles: liste(bloc, 'roles'),
      sansSession: /sansSession:\s*true/.test(bloc),
    })
  }
}
const vues = new Set()
for (const p of pages) {
  if (!p.route || !p.ecran || !p.titre || !p.statut) throw new Error(`fiche incomplète : ${JSON.stringify(p)}`)
  if (vues.has(p.route)) throw new Error(`route « ${p.route} » déclarée deux fois`)
  vues.add(p.route)
}
for (const p of pages) if (p.parent && !vues.has(p.parent)) throw new Error(`${p.route} : parent « ${p.parent} » inconnu`)

// ── Extraction : écrans et paramètres ──────────────────────────────────────────────────────────────────────────────
const ecrans = {}
const parametres = []
const codes = new Map()
const ecarts = []
for (const nom of FICHIERS) {
  const d = JSON.parse(readFileSync(new URL(nom, EXTRACTION), 'utf-8'))
  for (const e of d.ecrans ?? []) ecrans[e.id] = { nom: e.nom, ref: e.ref, etats: e.etats ?? [], elements: e.elements ?? [], actions: e.actions ?? [] }
  for (const p of d.parametres ?? []) {
    const valeur = String(p.valeur).trim()
    const code = String(p.code).trim()
    if (codes.has(code)) {
      if (codes.get(code) !== valeur) ecarts.push(`${code} : « ${codes.get(code)} » gardé, « ${valeur} » (${nom}) écarté`)
      continue
    }
    codes.set(code, valeur)
    parametres.push({ code, valeur, unite: p.unite ?? null, ref: p.ref ?? null, source: nom.slice(0, 2) })
  }
}
const registre = new Set(JSON.parse(readFileSync(new URL('../logique-metier/parametres-en-vigueur.json', ICI), 'utf-8')).parametres.map((p) => p.code))
const manquants = Object.keys(ecrans).filter((id) => !pages.some((p) => p.ecran === id))

// ── Écriture ou vérification ───────────────────────────────────────────────────────────────────────────────────────
const sorties = {
  'src/genere/pages.json': JSON.stringify(pages, null, 1) + '\n',
  'src/genere/ecrans.json': JSON.stringify(ecrans, null, 1) + '\n',
  'src/genere/parametres-manquants.json': JSON.stringify(parametres.filter((p) => !registre.has(p.code)), null, 1) + '\n',
}
let perimes = 0
for (const [f, contenu] of Object.entries(sorties)) {
  const u = new URL(f, ICI)
  const actuel = existsSync(u) ? readFileSync(u, 'utf-8') : null
  if (actuel === contenu) continue
  if (verifier) {
    console.error(`${f} n'est plus à jour : npm run inventaire`)
    perimes++
  } else writeFileSync(u, contenu)
}
if (manquants.length) console.warn(`écrans de l'extraction sans route : ${manquants.join(', ')}`)
if (ecarts.length && !verifier) console.warn(`paramètres en double, valeurs différentes :\n  ${ecarts.join('\n  ')}`)
console.log(`${pages.length} routes, ${Object.keys(ecrans).length} écrans, ${parametres.length} paramètres (${parametres.filter((p) => !registre.has(p.code)).length} hors registre)${verifier ? (perimes ? ' : périmé' : ' : à jour') : ''}`)
process.exit(perimes ? 1 : 0)
