// Reprend la feuille de styles du prototype livreur (paquet 6, 02_Prototype_HTML/BelivaY_Livreur_mobile.html), telle
// qu'elle est écrite, pour que les écrans reprennent le BALISAGE et les CLASSES du prototype (méthode de l'espace
// vendeur : espace-vendeur/outils/styles.mjs). Écrit src/styles/prototype.css (généré : ne jamais le modifier à la
// main ; les écarts décidés vivent dans src/styles/ecarts-prototype.css).
// Gardé : les composants du kit commun (pastilles, titres, cartes, héros, tuiles, listes, boutons, encadrés, segments,
// puces, interrupteur, champs, progression, anneaux, codes, divers mobiles) et les classes propres au livreur
// (liva-, lr-, livc-…). Retiré : ce qui n'existe que dans le prototype ou que la coque de l'application porte déjà
// (jetons de couleur — ceux de DP-64 sont dans livreur.css —, polices intégrées, cadre du téléphone, barre d'état,
// en-têtes, barre du bas, feuilles et voiles du client, plan des états, mode capture, console d'ordinateur).
// Deux corrections, les mêmes que l'espace vendeur (DP-44 (3), Q-43) : tailles de police en rem (la taille du texte
// choisie agrandit tout) et jamais sous 12 px.
//   node outils/styles.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { FICHIER_PROTO } from './proto.mjs'

const html = readFileSync(FICHIER_PROTO, 'utf-8')
const debut = html.indexOf('<style>')
const css = html.slice(debut + 7, html.indexOf('</style>', debut))

// Sections gardées : du kit commun (« Pastilles » → avant la console) et du livreur (« Espace livreur » → fin).
function section(depuis, jusque) {
  const i = css.indexOf(depuis)
  if (i < 0) throw new Error('section absente du prototype : ' + depuis)
  const j = jusque ? css.indexOf(jusque, i) : css.length
  if (j < 0) throw new Error('fin de section absente : ' + jusque)
  return css.slice(i, j)
}
const source = section('/* ===== Pastilles ===== */', '/* ===== Console ordinateur') + '\n' + section('/* ===== Espace livreur · agent liv-a')
// De la console, seulement l'encart de carte des zones (.mapbox, .map-…) et les graphiques (.chart), employés par les écrans du livreur.
const console_ = section('/* ===== Console ordinateur', '/* ===== Espace livreur · agent liv-a')

// Sélecteurs du prototype seulement, ou portés par la coque et le client.
const HORS_APP = [
  /\.m-app\b/, /html\.cap\b/, /#frame\b/, /\.plan\b/, /\.proto-bar\b/, /html\[data-text/, /html\[data-device/,
  /(^|[\s,>+~])\.sb\b/, /\.home-ind\b/, /header\.hd\b/, /\.hd-[\w-]+/, /nav\.dock\b/, /(^|[\s,>+~])\.tab\b/,
  /\.ibtn\b/, /\.avatar\b/, /(^|[\s,>+~])\.lang\b/, /\.glass\b/, /(^|[\s,>+~])\.veil\b/, /(^|[\s,>+~])\.sheet\b/,
  /\.grab\b/, /(^|[\s,>+~])\.toast\b/, /\.fab\b/, /\.bottom-cta\b/, /\.livc-minh\b/,
]

/** Règles de premier niveau : { tete, corps } (une règle @media garde son contenu, filtré à son tour). */
function regles(texte) {
  const out = []
  let i = 0
  while (i < texte.length) {
    const a = texte.indexOf('{', i)
    if (a < 0) break
    let prof = 0
    let j = a
    for (; j < texte.length; j++) {
      if (texte[j] === '{') prof++
      else if (texte[j] === '}' && --prof === 0) break
    }
    const tete = texte.slice(i, a).replace(/\/\*[\s\S]*?\*\//g, '').trim()
    out.push({ tete, corps: texte.slice(a + 1, j) })
    i = j + 1
  }
  return out
}

const rem = (px) => `${+(Math.max(12, Number(px)) / 16).toFixed(4)}rem`
const tailles = (corps) => corps.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (_, px) => 'font-size:' + rem(px))

function ecrire(liste) {
  const lignes = []
  for (const r of liste) {
    if (r.tete.startsWith('@')) {
      const dedans = ecrire(regles(r.corps))
      if (dedans.trim()) lignes.push(`${r.tete}{\n${dedans}\n}`)
      continue
    }
    const selecteurs = r.tete.split(/,(?![^(]*\))/).map((s) => s.trim()).filter((s) => s && !HORS_APP.some((m) => m.test(s)))
    if (!selecteurs.length) continue
    lignes.push(`${selecteurs.join(',')}{${tailles(r.corps.trim())}}`)
  }
  return lignes.join('\n')
}

const cartes = regles(console_).filter((r) => !r.tete.startsWith('@') && r.tete.split(',').every((x) => /\.map(box|-[\w-]+)\b|^\.chart\b/.test(x)))

const sortie = `/* GÉNÉRÉ par outils/styles.mjs depuis le prototype livreur (paquet 6) : ne pas modifier à la main.
   Les écarts décidés (couleurs DP-64, cibles de 44 px, lisibilité) sont dans ecarts-prototype.css. */
${ecrire(regles(source))}
${ecrire(cartes)}
`
writeFileSync(new URL('../src/styles/prototype.css', import.meta.url), sortie)

// Carte schématique des 12 zones : plus tirée du prototype (MAPGEO, formes de principe) ; les polygones réels viennent
// de logique-metier/livraison/zones-yaounde.geo.json (src/calculs/zones.ts).
console.log(`src/styles/prototype.css : ${sortie.split('\n').length} lignes`)
