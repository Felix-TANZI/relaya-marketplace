// Textes français du socle et des écrans (clés du dictionnaire anglais) : t('…'), tf('…'), titres des routes
// (src/pages/*/routes.ts), de la navigation (config/navigation.ts, config/pages.ts) et libellés (config/libelles.ts).
// src/api (registre des connecteurs : routes et notes pour les développeurs) n'affiche rien : hors dictionnaire.
// composants/marque-sonore.ts (commun aux cinq applis) porte ses libellés en paires { fr, en } : hors dictionnaire.
// Usage : node outils/textes.mjs → liste des clés sans traduction anglaise (src/i18n/*.en.json) ; sortie en erreur
// s'il en manque (tests/squelette.spec.ts l'appelle aussi par son export).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../src/', import.meta.url))
const fichiers = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? fichiers(join(d, f)) : [join(d, f)]))
const normer = (t) => t.replace(/[\s\u00a0\u202f]+/g, ' ').trim()

export function clesFrancaises() {
  const cles = new Set()
  for (const f of fichiers(SRC).filter((x) => /\.tsx?$/.test(x) && !/\.test\.ts$/.test(x) && !x.includes('/demo/') && !x.includes('/calculs/') && !x.includes('/api/') && !x.endsWith('marque-sonore.ts'))) {
    // Sans les commentaires : seules les chaînes du code comptent.
    const s = readFileSync(f, 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"])\/\/.*$/gm, '$1')
    for (const m of s.matchAll(/\bt[f]?\(\s*'((?:[^'\\]|\\.)+)'/g)) cles.add(m[1])
    // Libellés passés par une variable (titres des routes et de la navigation, choix, lignes de menu, ternaires) :
    // toute chaîne qui commence par une majuscule est un texte affiché.
    for (const m of s.matchAll(/'(\p{Lu}(?:[^'\\\n]|\\.)*)'/gu)) if (!/^(Escape|Enter|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Tab|Home|End|AccesRefuse|ReserveAuProprietaire|ParametreAbsent|ParametreIllisible|ROLE_FORBIDDEN|R|F)$/.test(m[1])) cles.add(m[1])
    for (const m of s.matchAll(/\btitre="([^"]+)"/g)) cles.add(m[1])
  }
  return [...cles].map((k) => normer(k.replace(/\\'/g, "'"))).filter((k) => /\p{Ll}/u.test(k) && !/^[\w-]+\/[\w/-]+$/.test(k) && !/^(ENT-|BelivaY SARL|PQ-|Plus Jakarta|Confirme$)/.test(k))
}

export function sansTraduction() {
  const dico = Object.assign({}, ...readdirSync(join(SRC, 'i18n')).filter((f) => f.endsWith('.en.json')).map((f) => JSON.parse(readFileSync(join(SRC, 'i18n', f), 'utf-8'))))
  return clesFrancaises().filter((k) => !(k in dico))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manque = sansTraduction()
  for (const k of manque) console.log(k)
  if (manque.length) {
    console.error(`${manque.length} texte(s) sans traduction anglaise`)
    process.exit(1)
  }
  console.log('toutes les clés ont leur traduction anglaise')
}
