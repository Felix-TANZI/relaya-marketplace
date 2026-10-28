// Reprend la feuille de styles du prototype de la console, telle qu'elle est écrite (même méthode que
// espace-vendeur/outils/styles.mjs), pour que chaque écran garde le balisage et les classes du prototype
// (BRIEF-PROTOTYPE, 11 oct. : la STRUCTURE du prototype est la référence, le contenu est amélioré dedans).
// - la feuille <style> de l'en-tête du prototype, dans son ordre, sans ce qui n'existe que dans le prototype : cadre du
//   téléphone et de la tablette, barre d'état et barre d'accueil dessinées, plan des états, barre du prototype, mode
//   capture, fenêtre de navigateur dessinée ;
// - sans les polices (déjà dans src/assets/polices) ni les feuilles et voiles du prototype (Feuille du client, base.css) ;
// - les VARIABLES déjà définies par src/styles/jetons.css (palette DP-64, contrastes AA) sont retirées : jetons.css
//   reste le seul fichier de couleurs ; les variables propres au prototype (verre, halos, carte, vignettes) restent ;
// - tailles de police en rem (taille du texte libre : --zoom sur <html>), aucune sous 12 px (DP-44, CRD-07) ;
// - barre d'état : le prototype dessine 50 px en haut de l'en-tête ; l'application prend la zone sûre (--sb).
// Écrit src/styles/prototype.css. Usage : node outils/styles.mjs (après une mise à jour du paquet).
import { readFileSync, writeFileSync } from 'node:fs'
import { DEBUT_CONTENU, mediaRepris, portee } from './contenu-prototype.mjs'
import { trouverPrototype } from './proto.mjs'

const ICI = new URL('../', import.meta.url)
const fichier = trouverPrototype()
if (!fichier) throw new Error('prototype de la console introuvable : poser PROTO_ADMIN=<chemin du fichier HTML>')
const html = readFileSync(fichier, 'utf-8')
const m = /<style>([\s\S]*?)<\/style>/.exec(html)
if (!m) throw new Error('feuille <style> absente du prototype')

// Sélecteurs propres au prototype (outil de revue, dessin des appareils), jamais dans l'application.
const HORS_SITE = [
  /#frame(?![\w-])/, /html\.cap(?![\w-])/, /\.win(?![\w-])/, /\.win-[\w-]+/, /\.plan(?![\w-])/, /\.plan-[\w-]+/, /\.proto-bar/,
  /(^|[\s,>+~(])\.sb(?![\w-])/, /\.home-ind(?![\w-])/, /body\.has-plan/, /html\.embed/,
]
// Règles entières retirées (sélecteur exact) : fond de page du prototype, feuilles et voiles (ceux du client et de
// base.css couvrent toute la fenêtre), appareil dessiné.
const REGLES_RETIREES = new Set([
  'html,body', 'html[data-theme=dark],html[data-theme=dark] body', '.veil', '.sheet', '.sheet .grab', 'html[data-theme=dark] .sheet',
  'html[data-device=tablet] .dk-body', 'html[data-device=tablet] .cns', 'html[data-device=tablet] body',
  'html[data-device=mobile],html[data-device=mobile] body',
])
// Mises en page du prototype sur grand écran (téléphone dessiné, place du plan).
const MEDIAS_HORS_SITE = [/\(min-width:\s*520px\)/, /\(min-width:\s*1100px\)/, /\(max-width:\s*1099px\)/]

const jetons = readFileSync(new URL('src/styles/jetons.css', ICI), 'utf-8')
const DEFINIES = new Set([...jetons.matchAll(/(--[\w-]+)\s*:/g)].map((x) => x[1]))

function regles(css) {
  const out = []
  let i = 0
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++
    if (i >= css.length) break
    const debut = i
    let prof = 0
    let chaine = null
    for (; i < css.length; i++) {
      const c = css[i]
      if (chaine) {
        if (c === '\\') i++
        else if (c === chaine) chaine = null
        continue
      }
      if (c === '"' || c === "'") chaine = c
      else if (c === '{') prof++
      else if (c === '}') {
        prof--
        if (prof === 0) {
          i++
          break
        }
      } else if (c === ';' && prof === 0) {
        i++
        break
      }
    }
    out.push(css.slice(debut, i).trim())
  }
  return out
}

let retirees = 0
let variables = 0
/** Déclarations d'un bloc, sans les variables que jetons.css définit déjà. */
function sansVariablesDefinies(corps) {
  const decl = corps.split(/;(?![^(]*\))/).map((d) => d.trim()).filter(Boolean)
  return decl
    .filter((d) => {
      const nom = /^(--[\w-]+)\s*:/.exec(d)?.[1]
      if (nom && DEFINIES.has(nom)) return (variables++, false)
      return true
    })
    .join(';')
}
const barreEtat = (selecteur, corps) => (/header\.hd/.test(selecteur) ? corps.replace(/padding(-top)?:50px/g, (x, top) => 'padding' + (top || '') + ':var(--sb)') : corps)

// Un seul kit (BRIEF-ENRICHISSEMENT) : le CONTENU des écrans (pastilles, panneaux, lignes, tableaux…) est repris par
// outils/contenu-prototype.mjs sous « .px » (styles/contenu.css, jetons DP-64) ; cette feuille ne garde que la COQUE
// (téléphone, en-têtes, barre du bas, console, connexion, boutons, champs du clavier) et ce que contenu.css ne reprend
// pas. Les pastilles restent aussi ici : la coque en pose hors du contenu (état du compte, rôle).
const AUSSI_COQUE = /^\.pill(?![\w-])/
let kit = 0
/** Sélecteur de la partie contenu déjà repris par contenu.css (sous un média qu'elle reprend). */
const dansLeKit = (s, media) => (media === null || mediaRepris(media)) && portee(s) !== null && !AUSSI_COQUE.test(s.trim())

function filtre(css, contenu = false, media = null) {
  const garde = []
  for (const r of regles(css)) {
    const tete = r.slice(0, r.indexOf('{') < 0 ? r.length : r.indexOf('{')).trim()
    if (tete.startsWith('@font-face')) retirees++
    else if (tete.startsWith('@media') && MEDIAS_HORS_SITE.some((re) => re.test(tete))) retirees++
    else if (tete.startsWith('@media') || tete.startsWith('@supports')) {
      const m2 = tete.replace(/^@media\s*/, '')
      const dedans = filtre(r.slice(r.indexOf('{') + 1, r.lastIndexOf('}')), contenu, tete.startsWith('@media') ? (media ? media + ' and ' + m2 : m2) : media)
      if (dedans.trim()) garde.push(tete + '{' + dedans + '}')
    } else if (tete.startsWith('@')) garde.push(r)
    else {
      if (REGLES_RETIREES.has(tete.replace(/\s*,\s*/g, ','))) {
        retirees++
        continue
      }
      const tous = tete.split(/,(?![^()]*\))/).map((s) => s.trim()).filter((s) => !HORS_SITE.some((re) => re.test(s)))
      const restants = contenu ? tous.filter((s) => !dansLeKit(s, media)) : tous
      if (restants.length < tous.length) kit++
      const corps = restants.length ? sansVariablesDefinies(r.slice(r.indexOf('{') + 1, r.lastIndexOf('}'))) : ''
      if (!corps.trim()) {
        retirees++
        continue
      }
      const sel = restants.join(',')
      garde.push(sel + barreEtat(sel, '{' + corps + '}'))
    }
  }
  return garde.join('\n')
}

// Tailles de police en rem (16 px = 1 rem), aucune sous 12 px.
let douzes = 0
const rem = (px) => {
  let v = Number(px)
  if (v < 12) (douzes++, (v = 12))
  return +(v / 16).toFixed(4) + 'rem'
}
const enRem = (css) =>
  css
    .replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (x, v) => 'font-size:' + rem(v))
    .replace(/(--fs-\d+):\s*(\d+(?:\.\d+)?)px/g, (x, n, v) => n + ':' + rem(v))

const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const debutContenu = m[1].indexOf(DEBUT_CONTENU)
if (debutContenu < 0) throw new Error('début du contenu introuvable dans la feuille du prototype')
const sortie = enRem(filtre(sansCommentaires(m[1].slice(0, debutContenu))) + '\n' + filtre(sansCommentaires(m[1].slice(debutContenu)), true))
writeFileSync(
  new URL('src/styles/prototype.css', ICI),
  '/* Généré par outils/styles.mjs depuis le prototype de la console : ne pas modifier à la main (corrections : ecarts.css).\n' +
    '   COQUE du prototype seulement : le contenu des écrans est dans contenu.css (outils/contenu-prototype.mjs, sous .px).\n' +
    '   Retiré : cadre des appareils, plan, mode capture, polices, feuilles du prototype, variables de jetons.css.\n' +
    '   Tailles de police en rem (taille du texte libre), aucune sous 12 px (DP-44). */\n' +
    sortie +
    '\n',
)
console.log(`prototype.css : ${Math.round(sortie.length / 1024)} ko ; ${retirees} règles retirées, ${kit} règles laissées au kit (contenu.css), ${variables} variables laissées à jetons.css, ${douzes} tailles portées à 12 px`)
