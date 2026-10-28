// Relit le prototype point relais (lecture statique du fichier HTML, sans navigateur) et écrit dans src/genere/ :
// - en.json : le dictionnaire anglais du prototype (constante EN, clé = texte français exact, espaces normalisées),
//   évalué dans un bac à sable vide (node:vm) ;
// - icones.json : les icônes du prototype. Le prototype n'a pas de bibliothèque d'icônes : chaque écran porte ses SVG
//   en ligne. Ils sont relevés dans les gabarits (PAGES[…].tpl) et dans le script (bouton de thème), puis REGROUPÉS
//   PAR DESSIN (corps canonique : balises et attributs triés) ; un dessin reconnu dans la bibliothèque Lucide du
//   client (site/src/genere/icones.json) ou du livreur prend son nom Lucide, les autres un nom « r-… » (table NOMS, par
//   empreinte du dessin). La bibliothèque Lucide entière est jointe : la coque, les composants du client et les écrans repris
//   emploient les mêmes noms (<Icone nom="…">, composants/Icone.tsx).
// Lancer : npm run prototype (après une mise à jour du paquet), puis npm run transcrire.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import vm from 'node:vm'
import { logosOfficiels } from '../../site/outils/logos-marques.mjs'
import { corpsCanonique, lireSvg } from './ecran.mjs'
import { FICHIER_PROTO } from './proto.mjs'

const html = readFileSync(FICHIER_PROTO, 'utf-8')
const GENERE = new URL('../src/genere/', import.meta.url)
mkdirSync(GENERE, { recursive: true })

/** Littéral { … } qui commence à l'indice i (accolades équilibrées, chaînes respectées). */
function litteral(texte, i) {
  let prof = 0
  let chaine = null
  for (let j = i; j < texte.length; j++) {
    const c = texte[j]
    if (chaine) {
      if (c === '\\') j++
      else if (c === chaine) chaine = null
    } else if (c === '"' || c === "'" || c === '`') chaine = c
    else if (c === '{') prof++
    else if (c === '}' && --prof === 0) return texte.slice(i, j + 1)
  }
  throw new Error('littéral non fermé')
}
const trie = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b, 'fr')))
const ecrire = (nom, d) => writeFileSync(new URL(nom, GENERE), JSON.stringify(d, null, 1) + '\n')

// ---------- Anglais ----------
const iEn = html.indexOf('const EN = ')
if (iEn < 0) throw new Error('EN absent du prototype')
const en = vm.runInNewContext('(' + litteral(html, html.indexOf('{', iEn)) + ')', {})
for (const m of html.matchAll(/Object\.assign\(EN,\s*/g)) Object.assign(en, vm.runInNewContext('(' + litteral(html, m.index + m[0].length) + ')', {}))

// ---------- Icônes ----------
/** Empreinte FNV-1a 32 bits en base 36 (5 caractères). */
function empreinte(s) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36).padStart(5, '0').slice(-5)
}

// Bibliothèque Lucide de référence (client, puis livreur) : corps canonique → nom.
const LUCIDE = {}
for (const f of ['../../site/src/genere/icones.json', '../../espace-livreur/src/genere/icones.json'])
  Object.assign(LUCIDE, JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf-8')))
const parCorps = new Map()
for (const [nom, corps] of Object.entries(LUCIDE)) {
  const k = corpsCanonique(lireSvg(corps))
  if (!parCorps.has(k)) parCorps.set(k, nom)
}

// Textes où chercher les SVG : chaque gabarit (chaîne JavaScript « tpl:"…" », décodée) et le script lui-même.
const sources = [html]
for (const m of html.matchAll(/tpl:("(?:[^"\\]|\\.)*")/g)) sources.push(JSON.parse(m[1]))

// Noms des dessins propres au prototype (empreinte du dessin → nom « r-… »). Un dessin modifié dans le paquet change
// d'empreinte et reprend un nom « proto-xxxxx » : à nommer ici.
const NOMS = {
  '05lk0': 'r-cloche',
  '19a16': 'r-cadenas',
  '1edk8': 'r-couches',
  '1vvoc': 'r-aide',
  '3a6i9': 'r-balance',
  '3adww': 'r-telephone',
  '3g92d': 'r-annuler',
  '3rw1q': 'r-fermer',
  '4ua1s': 'r-etoile',
  '5rg8n': 'r-menu',
  '65yv9': 'r-graphique',
  '66106': 'r-qr',
  'am1rt': 'r-formation',
  '681as': 'r-appareil-photo',
  '9vgz7': 'r-cle',
  'bgv4t': 'r-etiquette',
  'bozxn': 'r-reseau',
  'cbsok': 'r-entrer',
  'cky0g': 'r-pile',
  'e8hpd': 'r-horloge',
  'ep987': 'r-document',
  'fct1x': 'r-telecharger',
  'fqfzm': 'r-carte-paiement',
  'gwnd2': 'r-plus',
  'hqx7k': 'r-oeil',
  'ht2ol': 'r-grille',
  'i51hd': 'r-reglages',
  'j406n': 'r-recherche',
  'k1hf0': 'r-alerte',
  'kei7a': 'r-bouclier',
  'ku3q7': 'r-colis',
  'l1q6g': 'r-envoyer',
  'oo691': 'r-lune',
  'pqqnf': 'r-message',
  'q1u31': 'r-chevron-droite',
  'qsqij': 'r-lieu',
  'r9sh9': 'r-globe',
  'spoig': 'r-historique',
  'tbkrm': 'r-soleil',
  'w0n12': 'r-fermeture',
  'wi911': 'r-calendrier',
  'xauie': 'r-camion',
  'xhjol': 'r-personne',
  'xl9k1': 'r-chevron-gauche',
  'zhbgq': 'r-boutique',
}

const icones = {}
let relevees = 0
for (const s of sources)
  for (const m of s.matchAll(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/g)) {
    const a = Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]))
    // Icônes au trait du prototype : 24 × 24, trait, enfants sans couleur propre.
    if (a.viewBox !== '0 0 24 24' || !a.stroke) continue
    const enfants = lireSvg(m[2])
    if (enfants.some((x) => Object.keys(x.a).some((k) => /^(fill|stroke|stop-color)$/.test(k) || /opacity/.test(k)))) continue
    const corps = corpsCanonique(enfants)
    if (!corps || /\{\{/.test(corps)) continue
    relevees++
    const nom = parCorps.get(corps) ?? NOMS[empreinte(corps)] ?? 'proto-' + empreinte(corps)
    icones[nom] = corps
  }

const tout = { ...Object.fromEntries(Object.entries(LUCIDE).map(([n, c]) => [n, corpsCanonique(lireSvg(c))])), ...icones }
// Pomme = tracé officiel d'Apple, jamais la pomme-fruit d'un prototype (site/outils/logos-marques.mjs).
ecrire('icones.json', trie(logosOfficiels(tout)))
ecrire('en.json', trie(en))
const propres = Object.keys(icones).filter((n) => n.startsWith('r-')).length
const sansNom = Object.keys(icones).filter((n) => n.startsWith('proto-'))
if (sansNom.length) console.warn('dessins sans nom (à nommer dans NOMS) : ' + sansNom.join(', '))
console.log(`${Object.keys(en).length} traductions du prototype ; ${relevees} SVG relevés, ${Object.keys(icones).length} dessins (${propres} propres au prototype) ; ${Object.keys(tout).length} icônes en tout`)
