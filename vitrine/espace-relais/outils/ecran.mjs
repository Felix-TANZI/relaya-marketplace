// Moteur du transcripteur du prototype point relais (outils/transcription.mjs le pilote). Deux moitiés :
// 1. `releverEcran` : fonction exécutée DANS la page du prototype (Chromium) ; elle relève l'écran affiché (racine
//    #app > div) en arbre sérialisable : balises, attributs, style en ligne, textes ; en-tête (racine, secondaire ou
//    aucun ; titre ; cible du retour), barre du bas (onglet allumé). Les éléments du cadre du téléphone (barre d'état,
//    île, barre d'accueil : [data-iphone]) sont laissés.
// 2. Le reste, dans Node : chaque `style` en ligne devient une classe générée (dédoublonnée, nom court et stable
//    « p-xxxxxx », tirée d'une empreinte de ses déclarations), écrite dans src/styles/prototype.css ; chaque nœud
//    devient du JSX À L'IDENTIQUE (mêmes balises, même ordre, mêmes textes en t('…'), icônes en <Icone>, liens
//    « X.dc.html » en <Link to={chemin(…)}>).
// Transformations des déclarations (et seulement celles-là) :
// - couleurs → jetons (var(--…)) selon la table COULEURS ci-dessous et le CONTEXTE (fond de l'élément le plus proche :
//   héros, nuit, bouton d'accent, pastille de compte, appareil photo, carte claire) : l'orange du prototype devient le
//   bleu du relais pour l'IDENTITÉ ; il reste l'orange BelivaY pour l'URGENCE et l'ALERTE (pastilles de compte, garde
//   à payer, dernier jour, à renvoyer, preuve obligatoire, hors ligne : table URGENCE) ;
// - font-size en rem (la taille du texte choisie agrandit tout), jamais sous 12 px ;
// - hauteurs fixes des pastilles et des boutons en min-height (un libellé agrandi ne déborde pas) ; un élément qui
//   partage une rangée (flex: 1) peut rétrécir (min-width: 0, mots longs coupés) ;
// - verre : filtre d'arrière-plan en jetons (--verre-filtre, --cap-filtre : plus clair le jour, plus sombre la nuit) ;
// - rien de lié au cadre du téléphone : enveloppe du contenu sans le décalage de l'en-tête fixe ni la marge du dock
//   (la coque les porte), éléments absolus de la racine (appareil photo) en position fixe, police système d'iOS retirée.
// Tout jeton émis doit exister dans src/styles/jetons.css, en clair ET en sombre : sinon la transcription s'arrête.

// ---------------------------------------------------------------------------------------------------------------
// 1. Relevé dans la page
// ---------------------------------------------------------------------------------------------------------------

/** Exécutée dans la page du prototype (page.evaluate) : relève l'écran affiché. */
export function releverEcran() {
  const racine = document.querySelector('#app > div')
  const serial = (n) => {
    if (n.nodeType === 3) return n.nodeValue
    if (n.nodeType !== 1) return null
    if (n.hasAttribute('data-iphone')) return null
    const a = {}
    for (const x of n.attributes) a[x.name] = x.value
    const tag = n.localName // casse du SVG gardée (linearGradient)
    // Image du prototype (logo, marque) : seulement sa taille en octets, pour la reconnaître.
    if (tag === 'img') a.src = 'data:' + (a.src || '').length
    return { t: tag, a, c: [...n.childNodes].map(serial).filter((x) => x !== null) }
  }
  const header = racine.querySelector(':scope > header')
  const nav = racine.querySelector(':scope > nav')
  const main = racine.querySelector(':scope > main')
  let entete = 'aucun'
  let titre = null
  let retour = null
  if (header) {
    const rangs = header.children
    if (rangs.length >= 3) entete = 'racine'
    else {
      entete = 'enfant'
      const r = rangs[0]
      retour = r.querySelector('a[href]')?.getAttribute('href') ?? null
      titre = [...r.children].find((x) => x.tagName === 'DIV' && /font-size:\s*15px/.test(x.getAttribute('style') || ''))?.textContent.trim() ?? null
    }
  }
  let onglet = null
  if (nav)
    for (const a of nav.querySelectorAll('a[href]'))
      if (/background-image/.test(a.getAttribute('style') || '')) onglet = a.getAttribute('href')
  // Contenu : le <main> (son enveloppe), sinon (appareil photo) les enfants de la racine hors en-tête et barre.
  const contenu = main ? [...main.children].map(serial) : [...racine.children].filter((x) => x !== header && x !== nav).map(serial).filter(Boolean)
  return {
    entete,
    titre,
    retour,
    barre: !!nav,
    onglet,
    principal: !!main,
    contenu,
    header: header ? serial(header) : null,
    nav: nav ? serial(nav) : null,
  }
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Couleurs → jetons
// ---------------------------------------------------------------------------------------------------------------

/** Forme normalisée d'une couleur : « #ABCDEF » ou « RGBA(r,g,b,a) » (alpha sans zéro de tête : « .1 »). */
export function normerCouleur(c) {
  c = c.trim()
  if (c.startsWith('#')) {
    let h = c.slice(1).toUpperCase()
    if (h.length === 3) h = [...h].map((x) => x + x).join('')
    return '#' + h
  }
  const m = /rgba?\(([^)]*)\)/i.exec(c)
  if (!m) return c
  const p = m[1].split(/[\s,/]+/).filter(Boolean)
  const a = p.length > 3 ? String(Number(p[3])).replace(/^0\./, '.') : '1'
  return `RGBA(${p.slice(0, 3).map(Number).join(',')},${a})`
}

// Familles de fond (contexte d'un texte ou d'une icône) : la couleur de fond de l'élément le plus proche.
// clair : carte ou page ; heros : carte de tête (l'ancien « héros orange ») ; nuit : carte « nuit bleue » (en-tête
// dessiné, DP-54 : mêmes couleurs dans les deux thèmes) ; accent : bouton principal ou bulle pleine ; pastille :
// compteur orange ; camera : appareil photo ; vert : carte « Parler à quelqu'un ».
const FOND = {
  '#EF6A00': 'heros',
  '#E8A10E': 'heros',
  '#0E1B38': 'nuit',
  '#1B2E5C': 'nuit',
  '#0A1429': 'nuit',
  '#1A2A52': 'nuit',
  '#2A3A66': 'nuit',
  '#E05A00': 'accent',
  '#F58A1F': 'accent',
  '#3A6BEA': 'accent',
  '#2456D6': 'accent',
  '#1E4BC4': 'accent',
  '#050608': 'camera',
  'RGBA(0,0,0,.55)': 'camera',
  'RGBA(255,255,255,.14)': 'camera',
  'RGBA(255,255,255,.2)': 'camera',
  '#0F5132': 'vert',
  '#1E8E57': 'vert',
  '#25D366': 'vert',
  '#FFCC00': 'mtn',
}

// Table des couleurs. Une entrée : jeton par défaut, puis précisions par RÔLE (fond, texte, bord, ombre) et par FOND
// (famille ci-dessus) ; `urgence` : jeton quand l'élément dit une urgence ou une alerte (URGENCE plus bas).
// Rôles : fond = background*, texte = color, fill, stroke, stop-color ; bord = border*, outline ; ombre = box-shadow.
const C = (def, o = {}) => ({ def, ...o })
export const COULEURS = {
  // ----- Neutres (encre, papier, traits)
  '#171310': C('ink', { nuit: 'nuit-ink', texte_mtn: 'mtn-ink' }),
  '#5B524A': C('ink-2'),
  '#6F6358': C('ink-3'),
  '#B9ADA1': C('ink-4'),
  '#E7DDD2': C('ink-4'), // étoiles vides des avis : lisibles (AA)
  '#FFFFFF': C('card', { texte: 'card', texte_heros: 'heros-ink', texte_nuit: 'nuit-ink', texte_accent: 'acc-btn-ink', texte_pastille: 'badge-ink', texte_camera: 'camera-ink', texte_vert: 'vert-fonce-ink', texte_clair: 'acc-btn-ink', bord: 'card', ombre: 'card' }),
  '#F7F3EE': C('sand'),
  '#FBF8F4': C('card-2'),
  '#F4EEE8': C('sand-2'),
  '#F1ECE6': C('sand-2'),
  '#F3EDE6': C('sand-2'),
  '#EFE7DE': C('sand-2'),
  '#F1E8DF': C('sand-2'),
  '#EFE6DC': C('sand-3', { bord: 'line' }),
  '#ECE5DD': C('sand-3', { bord: 'line' }),
  '#EAE1D7': C('sand-3', { bord: 'line' }),
  '#E9DFD5': C('line'),
  '#E4D9CE': C('line', { fond: 'sand-3' }),
  '#E6DED5': C('line'),
  '#EADFD3': C('line'),
  '#E0D5CA': C('line'),
  '#D9CFC5': C('line-2'),
  '#D6CCC1': C('line-2'),
  '#CDBFB2': C('line-2'),
  '#000000': C('noir'),
  // ----- Bleu du relais (identité)
  '#2456D6': C('acc', { texte: 'acc-txt', texte_nuit: 'nuit-acc', fond: 'acc' }),
  '#173C9E': C('acc-txt', { texte_nuit: 'nuit-acc' }),
  '#1E4BC4': C('acc-g2'),
  '#3A6BEA': C('acc-g1'),
  '#EAF0FF': C('acc-soft'),
  '#C9D7FB': C('acc-line'),
  '#E8EDF8': C('acc-soft-2'),
  '#E3E8F4': C('acc-soft-2', { texte: 'nuit-ink-2' }),
  '#F6F8FD': C('acc-soft-3'),
  '#8FB0FF': C('nuit-acc'),
  // ----- Nuit bleue (en-têtes dessinés : DP-54, mêmes couleurs dans les deux thèmes)
  '#0E1B38': C('nuit-1', { texte: 'ink' }),
  '#1B2E5C': C('nuit-2'),
  '#0A1429': C('nuit-3'),
  '#1A2A52': C('nuit-4'),
  '#2A3A66': C('nuit-5'),
  '#9FAACB': C('nuit-ink-2'),
  '#C3CCE0': C('nuit-ink-3'),
  '#7F8BAE': C('nuit-ink-4'),
  '#5EF2B5': C('nuit-vert'),
  '#FFC845': C('nuit-or'),
  '#FF8A80': C('nuit-rouge'),
  // ----- Orange du prototype : identité → bleu ; urgence et alerte → orange BelivaY
  '#EF6A00': C('heros-3', { dans_accent: 'acc-btn', texte: 'acc', bord: 'acc', fond_urgence: 'or', texte_urgence: 'or', bord_urgence: 'or' }),
  '#E8A10E': C('heros-1', { bord: 'acc', texte: 'acc' }),
  '#EF7A0A': C('heros-2'),
  '#EF6200': C('heros-3'),
  '#DD5100': C('heros-4'),
  '#E05A00': C('acc-btn', { pastille: 'badge', fond_pastille: 'badge' }),
  '#F58A1F': C('acc-g1'),
  '#D95000': C('acc-g2'),
  '#B84A00': C('acc-txt', { texte_nuit: 'nuit-acc', urgence: 'or-txt' }),
  '#C24E00': C('acc-deep'),
  '#9E3E08': C('acc-deep'),
  '#FFF1E2': C('acc-soft', { urgence: 'or-soft' }),
  '#F6CFA8': C('acc-line', { urgence: 'or-line' }),
  '#FFD9B8': C('heros-ink-2', { texte_nuit: 'nuit-or-2' }),
  '#FFE9C2': C('heros-ink-2', { texte_accent: 'acc-btn-ink-2', texte_nuit: 'nuit-or-2' }),
  '#FFF3D6': C('heros-kicker', { texte_nuit: 'nuit-or-2' }),
  // ----- Ambre (dernier jour, attente, avertissement)
  '#FFF4D6': C('amber-soft'),
  '#FFF4DA': C('amber-line'),
  '#F0DA9C': C('amber-line'),
  '#8A5A00': C('amber'),
  '#6B4700': C('amber'),
  // ----- Vert (succès, vérifié)
  '#E6F4EC': C('green-soft'),
  '#BFE3CF': C('green-line'),
  '#CFE7DA': C('green-line'),
  '#1F7A4D': C('green'),
  '#155C39': C('green'),
  '#0F5132': C('vert-fonce-1'),
  '#1E8E57': C('vert-fonce-2'),
  '#CFF5E1': C('vert-fonce-ink-2'),
  '#25D366': C('vert-fonce-2'),
  // ----- Rouge (erreur, refus, blocage)
  '#FDECEA': C('red-soft'),
  '#F4C3BE': C('red-line'),
  '#B42318': C('red'),
  '#8E1B12': C('red'),
  // ----- Marques et appareil photo
  '#FFCC00': C('mtn'),
  '#050608': C('camera'),
  '#B7BECB': C('camera-ink-2'),
  // ----- Verre (en-tête, barre, capsules) : blanc translucide en clair, voile sombre la nuit
  'RGBA(255,255,255,.95)': C('v95'),
  'RGBA(255,255,255,.96)': C('v95'),
  'RGBA(255,255,255,.72)': C('v72'),
  'RGBA(255,255,255,.62)': C('v62'),
  'RGBA(255,255,255,.56)': C('v56'),
  'RGBA(255,255,255,.55)': C('v55'),
  'RGBA(255,255,255,.12)': C('v12', { fond_camera: 'blanc-12' }),
  'RGBA(210,224,255,.3)': C('verre-bleu'),
  'RGBA(255,226,196,.26)': C('verre-chaud'),
  'RGBA(226,235,255,.78)': C('cap-bas'),
  // Voiles blancs posés sur un fond sombre (nuit, héros, appareil photo) : les mêmes dans les deux thèmes.
  'RGBA(255,255,255,.08)': C('blanc-08'),
  'RGBA(255,255,255,.14)': C('blanc-14'),
  'RGBA(255,255,255,.2)': C('blanc-20'),
  'RGBA(255,255,255,.22)': C('blanc-22', { fond_heros: 'heros-puce' }),
  'RGBA(255,255,255,.25)': C('blanc-25'),
  'RGBA(255,255,255,.28)': C('blanc-28'),
  'RGBA(255,255,255,.4)': C('blanc-40'),
  'RGBA(0,0,0,.25)': C('noir-25'),
  'RGBA(0,0,0,.55)': C('noir-55'),
  'RGBA(80,90,110,.55)': C('camera-voile'),
  // ----- Ombres (brun chaud du prototype → ombre neutre du relais)
  'RGBA(84,52,24,.1)': C('line'),
  'RGBA(60,35,15,.05)': C('ombre-1'),
  'RGBA(60,35,15,.06)': C('ombre-1'),
  'RGBA(60,35,15,.16)': C('ombre-2'),
  'RGBA(60,35,15,.3)': C('ombre-3'),
  'RGBA(60,35,15,.4)': C('ombre-3'),
  'RGBA(20,40,90,.08)': C('verre-ombre-1'),
  'RGBA(20,40,90,.1)': C('verre-ombre-1'),
  'RGBA(20,40,90,.16)': C('verre-ombre-2'),
  'RGBA(14,27,56,.08)': C('verre-ombre-1'),
  'RGBA(14,27,56,.25)': C('nuit-ombre'),
  'RGBA(14,27,56,.4)': C('verre-ombre-3'),
  'RGBA(14,27,56,.45)': C('verre-ombre-3'),
  'RGBA(14,27,56,.75)': C('nuit-ombre'),
  // Halos et lueurs (orange et or du prototype → halos et lueurs du relais)
  'RGBA(239,106,0,.16)': C('halo-1'),
  'RGBA(36,86,214,.14)': C('halo-2'),
  'RGBA(232,161,14,.14)': C('halo-3'),
  'RGBA(239,106,0,.34)': C('acc-ombre'),
  'RGBA(239,106,0,.35)': C('acc-ombre'),
  'RGBA(239,106,0,.3)': C('acc-ombre'),
  'RGBA(239,106,0,.6)': C('acc-ombre'),
  'RGBA(217,80,0,.7)': C('acc-ombre'),
  'RGBA(221,81,0,.8)': C('acc-ombre'),
  'RGBA(30,75,196,.8)': C('acc-ombre'),
  'RGBA(90,40,0,.5)': C('acc-ombre'),
  'RGBA(184,74,0,.5)': C('acc-ombre'),
  'RGBA(36,86,214,.18)': C('acc-a18'),
  'RGBA(36,86,214,.3)': C('acc-a30'),
  'RGBA(36,86,214,.45)': C('acc-a45'),
  'RGBA(36,86,214,.5)': C('acc-a50'),
  'RGBA(255,200,69,.45)': C('heros-halo', { nuit: 'nuit-halo' }),
  'RGBA(255,200,69,.5)': C('heros-halo', { nuit: 'nuit-halo' }),
  'RGBA(255,200,69,.8)': C('heros-halo', { nuit: 'nuit-halo' }),
  'RGBA(255,197,69,.45)': C('heros-halo', { nuit: 'nuit-halo' }),
  'RGBA(255,214,120,.65)': C('heros-halo', { nuit: 'nuit-halo' }),
  'RGBA(255,220,140,.6)': C('heros-halo', { nuit: 'nuit-halo' }),
  'RGBA(232,161,14,.35)': C('heros-halo', { nuit: 'nuit-halo' }),
}

/**
 * Urgence et alerte : l'orange y reste orange (PR-02 : « Garde payante » orange ; DS-06 ; décision du porteur pour le
 * relais). Un élément est « urgent » quand son texte, ou celui de la carte qui le porte, dit une somme à payer, un
 * dernier jour, un renvoi, une preuve obligatoire, un blocage ou l'absence de réseau. Tout l'écran Stock (lignes de
 * garde payante, plan des étagères) suit la même règle.
 */
export const URGENCE = /DERNIER JOUR|Dernier jour|À renvoyer|obligatoire|À payer|Payant|payante|Hors ligne|bloqu|expir|à renvoyer/i
export const ECRANS_URGENTS = new Set(['Stock'])

function role(prop) {
  if (/^background/.test(prop)) return 'fond'
  if (/^(border|outline)/.test(prop)) return 'bord'
  if (prop === 'box-shadow') return 'ombre'
  return 'texte' // color, fill, stroke, stop-color, -webkit-text-fill-color
}

/** Couleurs rencontrées sans entrée dans COULEURS (la transcription s'arrête en les listant). */
export const MANQUANTES = new Set()

/** Jeton d'une couleur selon son rôle, le fond qui l'entoure et l'urgence de l'élément. */
export function jetonDe(couleur, prop, ctx) {
  const k = normerCouleur(couleur)
  if (/^RGBA\(\d+,\d+,\d+,0\)$/.test(k)) return 'transparent'
  const e = COULEURS[k]
  if (!e) {
    MANQUANTES.add(`${k} (${prop}, ${ctx.ecran})`)
    return 'var(--manquant)'
  }
  // Texte peint par son fond (background-clip: text) : les couleurs du fond sont celles du texte.
  const r = ctx.texteClip && /^background/.test(prop) ? 'texte' : role(prop)
  // Un fond se juge sur celui des parents ; un texte, un bord ou une ombre sur le fond de l'élément lui-même.
  const f = (r === 'fond' ? (ctx.fondParent ?? ctx.fond) : ctx.fond) ?? 'clair'
  const u = ctx.urgent
  const nom =
    (u && (e[`${r}_urgence`] ?? e.urgence)) ||
    (r === 'fond' && ctx.fond === 'accent' && e.dans_accent) ||
    e[`${r}_${f}`] ||
    (r === 'fond' && f === 'pastille' && e.fond_pastille) ||
    (ctx.pastille && e.pastille) ||
    e[f === 'clair' ? '__' : f] ||
    e[r] ||
    e.def
  // Couleur EXACTE du prototype (consigne du porteur) : un jeton porte la couleur de sa première source dans COULEURS ;
  // une autre couleur du prototype rangée sous le même jeton reçoit un jeton précisé « <jeton>--<couleur> », qui vaut
  // cette couleur (et sa nuit, DARK_MAP du prototype). Le nom de classe ignore la précision (Classes.nom) : les
  // classes des écrans repris ne changent pas.
  const v = variante(k, r)
  const fin = REPRESENTANT[nom] === v ? nom : `${nom}--${suffixe(v)}`
  EMISES.set(fin, v)
  return `var(--${fin})`
}

/** Variante d'une couleur pour la nuit du prototype : le blanc d'un FOND devient la carte de nuit, le blanc d'un texte,
 * d'un bord ou d'une ombre reste blanc (DARK_MAP : seule la règle « background: #FFFFFF » le change). */
const variante = (k, r) => (k === '#FFFFFF' && r !== 'fond' ? '#FFFFFF/t' : k)
const suffixe = (v) => (v === '#FFFFFF/t' ? 'blanc' : v.startsWith('#') ? v.slice(1).toLowerCase() : v.replace(/^RGBA\(|\)$/g, '').replace(/\./g, '').replace(/,/g, '-'))
/** Jeton → couleur (variante) de sa première source dans COULEURS (ordre du tableau, défaut puis précisions). */
export const REPRESENTANT = (() => {
  const rep = {}
  for (const [k, e] of Object.entries(COULEURS))
    for (const [cle, nom] of Object.entries(e)) {
      if (cle === 'def') rep[nom] ??= k === '#FFFFFF' ? '#FFFFFF' : k
      else rep[nom] ??= variante(k, /^(fond|dans_accent)/.test(cle) ? 'fond' : 'texte')
    }
  // Jetons à plusieurs sources : la source qui porte leur usage (la plus fréquente dans le prototype, ou celle que la
  // coque et les feuilles des écrans repris entendent : bouton orange en dégradé, encre blanche sur la nuit…).
  return Object.assign(rep, {
    'acc-txt': '#173C9E', 'acc-g1': '#F58A1F', 'acc-g2': '#D95000', line: '#E4D9CE', 'sand-3': '#EFE6DC',
    'nuit-ink': '#FFFFFF/t', 'nuit-acc': '#8FB0FF', 'nuit-ink-2': '#9FAACB', 'nuit-or-2': '#FFE9C2', 'heros-ink-2': '#FFE9C2',
  })
})()
/** Jetons émis par la transcription → couleur exacte du prototype (variante). */
export const EMISES = new Map()

/** Couleur d'une variante en clair et la nuit (darkify du prototype, sa table DARK_MAP en paramètre). */
export function valeursDe(v, darkMap) {
  if (v === '#FFFFFF/t') return ['#FFFFFF', '#FFFFFF']
  if (v === '#FFFFFF') return ['#FFFFFF', '#141C2F']
  const m = /^RGBA\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(v)
  const clair = m ? `rgba(${m[1]},${m[2]},${m[3]},${m[4]})` : v
  // Les règles rgba du prototype écrivent l'alpha sur un ou deux chiffres (« .6 », « .30 ») : on essaie les deux.
  const formes = m ? [clair, `rgba(${m[1]},${m[2]},${m[3]},${m[4].length === 2 ? m[4] + '0' : m[4]})`] : [clair]
  // Seul ajout à la nuit du prototype : le filet #EFE7DE (séparateurs) n'est pas dans DARK_MAP et resterait beige sur
  // la nuit ; il prend la valeur de ses voisins #EFE6DC, #ECE5DD (A-VALIDER.md, ARL des couleurs).
  if (v === '#EFE7DE') return [v, '#27314C']
  for (const f of formes) {
    let x = f
    for (const [re, r] of darkMap) if (!/background/.test(re.source)) x = x.replace(re, r)
    if (x !== f) return [clair, x]
  }
  return [clair, clair]
}

/** Famille de fond posée par les déclarations d'un élément (null : il ne change pas le fond). */
export function fondDe(decls, estPastille) {
  const famille = (v) => {
    for (const c of v.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi) ?? []) {
      const k = normerCouleur(c)
      if (/^RGBA\(\d+,\d+,\d+,0\)$/.test(k)) continue
      if (estPastille && k === '#E05A00') return 'pastille'
      if (FOND[k]) return FOND[k]
      const d = COULEURS[k]?.def ?? ''
      if (/^RGBA\(255,255,255,\.(9|8|7|6|5)/.test(k) || k === '#FFFFFF' || /^(sand|card|acc-soft|line)/.test(d) || /soft|line/.test(d)) return 'clair'
    }
    return null
  }
  // La DERNIÈRE déclaration de fond colorée l'emporte (un style peut redéfinir son fond) ; une image (dégradés) sans
  // couleur de famille renvoie à la couleur de fond déclarée ; un voile translucide seul laisse le fond des parents.
  const fonds = decls.filter(([p, v]) => /^background(-color|-image)?$/.test(p) && /#[0-9a-f]{3,8}\b|rgba?\(/i.test(v))
  const derniere = fonds.at(-1)
  if (!derniere) return null
  const f = famille(derniere[1])
  if (f || derniere[0] !== 'background-image') return f
  const couleur = fonds.filter(([p]) => p !== 'background-image').at(-1)
  return couleur ? famille(couleur[1]) : null
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Déclarations
// ---------------------------------------------------------------------------------------------------------------

/** « a: b; c: d » → [[a, b], [c, d]] (les « ; » dans des parenthèses sont respectés). */
export function declarations(style) {
  const out = []
  let prof = 0
  let d = 0
  const s = style ?? ''
  for (let i = 0; i <= s.length; i++) {
    const c = s[i]
    if (c === '(') prof++
    else if (c === ')') prof--
    else if ((c === ';' && prof === 0) || i === s.length) {
      const x = s.slice(d, i).trim()
      d = i + 1
      if (!x) continue
      const j = x.indexOf(':')
      if (j < 0) continue
      out.push([x.slice(0, j).trim().toLowerCase(), x.slice(j + 1).trim()])
    }
  }
  return out
}

const rem = (px) => `${+(Math.max(12, Number(px)) / 16).toFixed(4)}rem`
const INTERACTIFS = new Set(['a', 'button', 'label', 'input', 'select', 'textarea'])

/** Déclarations transformées d'un élément (couleurs, tailles, cadre du téléphone). */
export function transformer(decls, el, ctx) {
  const out = []
  const largeur = decls.find(([p]) => p === 'width')?.[1]
  const hauteur = decls.find(([p]) => p === 'height')?.[1]
  const rond = decls.some(([p, v]) => p === 'border-radius' && /999px|50%/.test(v))
  // Hauteur fixe d'un bouton, d'un lien ou d'une pastille (ronde, sans largeur égale) : plancher, jamais plafond.
  const plancher = /^\d+(\.\d+)?px$/.test(hauteur ?? '') && (INTERACTIFS.has(el.t) || (rond && largeur !== hauteur)) && parseFloat(hauteur) <= 64
  // Texte peint par un dégradé (background-clip: text) : une couleur pleine, la première du dégradé (lisible, mesurable).
  if (ctx.texteClip) {
    const img = decls.find(([p]) => p === 'background-image')?.[1] ?? ''
    const premiere = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/i.exec(img)?.[0]
    decls = decls.filter(([p]) => !/background-clip$|^background-image$/.test(p)).map(([p, v]) => (p === 'color' && v === 'transparent' && premiere ? ['color', premiere] : [p, v]))
  }
  for (let [p, v] of decls) {
    if (p === 'font-family' && /SF Pro/.test(v)) continue
    if (p === 'font-size') v = v.replace(/(\d+(?:\.\d+)?)px/g, (_, n) => rem(n))
    if (p === 'height' && plancher) p = 'min-height'
    if (ctx.racineFixe && p === 'position' && v === 'absolute') v = 'fixed'
    v = v.replace(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi, (c) => jetonDe(c, p, ctx))
    // Verre du prototype : éclaircissement en clair, assombrissement la nuit (DS-02, DS-09) : jetons de filtre.
    if (/backdrop-filter$/.test(p)) v = v.replace('brightness(1.26) saturate(185%)', 'var(--verre-filtre)').replace(/brightness\(1\.08\)/, 'var(--cap-filtre)')
    out.push([p, v])
  }
  // Élément qui partage une rangée (flex: 1, flex-grow) : il peut rétrécir sous la largeur de son texte, et un mot long
  // passe à la ligne ; à la plus grande taille du texte, rien ne déborde de l'écran.
  if (decls.some(([p, v]) => (p === 'flex' && /^1\b/.test(v)) || (p === 'flex-grow' && v === '1')) && !decls.some(([p]) => p === 'min-width')) {
    out.push(['min-width', '0'])
    if (el.t !== 'input') out.push(['overflow-wrap', 'anywhere'])
  }
  return out
}

/** Enveloppe du contenu (premier enfant du <main> du prototype) : décalage de l'en-tête fixe et marge du dock
 * retirés ; la coque porte l'en-tête dans le flux et l'espace de la barre du bas. */
export function enveloppe(decls, avecEnTete) {
  return decls.map(([p, v]) => (p === 'padding' ? [p, avecEnTete ? '12px 16px 24px' : 'calc(env(safe-area-inset-top, 0px) + 24px) 16px 24px'] : [p, v]))
}

// ---------------------------------------------------------------------------------------------------------------
// 4. Classes générées
// ---------------------------------------------------------------------------------------------------------------

/** Empreinte FNV-1a 32 bits, en base 36 sur 6 caractères. */
function empreinte(s) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36).padStart(6, '0').slice(-6)
}

export class Classes {
  constructor() {
    this.parTexte = new Map() // déclarations → nom
    this.parNom = new Map() // nom → déclarations
  }
  /** Nom de classe d'une liste de déclarations (« p-xxxxxx »), créée au besoin. */
  nom(decls) {
    if (!decls.length) return null
    const texte = decls.map(([p, v]) => `${p}:${v}`).join(';')
    let n = this.parTexte.get(texte)
    if (n) return n
    // Nom tiré du texte SANS les précisions de couleur (« --<jeton>--<couleur> » → « --<jeton> ») : les noms restent
    // ceux des écrans repris. Deux styles qui ne diffèrent que par la précision partagent la classe (la première gagne).
    n = 'p-' + empreinte(texte.replace(/var\(--([a-z0-9]+(?:-[a-z0-9]+)*)--[a-z0-9-]+\)/g, 'var(--$1)'))
    if (this.parNom.has(n)) {
      this.partagees = (this.partagees ?? 0) + 1
      this.parTexte.set(texte, n)
      return n
    }
    this.parTexte.set(texte, n)
    this.parNom.set(n, texte)
    return n
  }
  /** Classe NOMMÉE (coque : « p-hd-… ») d'une liste de déclarations. */
  nommer(nom, decls) {
    if (this.parNom.has(nom)) throw new Error('classe nommée deux fois : ' + nom)
    this.parNom.set(nom, decls.map(([p, v]) => `${p}:${v}`).join(';'))
    return nom
  }
  css() {
    return [...this.parNom.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([n, t]) => `.${n}{${t}}`)
      .join('\n')
  }
}

// ---------------------------------------------------------------------------------------------------------------
// 5. Icônes : SVG en ligne regroupés par dessin
// ---------------------------------------------------------------------------------------------------------------

const COULEUR_ATTR = /^(fill|stroke|stop-color)$/

/** Corps canonique d'un dessin (enfants d'un <svg>) : balises et attributs triés, couleurs « none » gardées. */
export function corpsCanonique(enfants) {
  const un = (n) => {
    if (typeof n === 'string') return n.trim() ? n.trim() : ''
    const a = Object.entries(n.a)
      .filter(([k]) => !/^(style|class|aria-hidden)$/.test(k))
      .sort(([x], [y]) => (x < y ? -1 : 1))
      .map(([k, v]) => `${k}="${v.trim().replace(/\s+/g, ' ')}"`)
      .join(' ')
    const c = n.c.map(un).join('')
    return c ? `<${n.t}${a ? ' ' + a : ''}>${c}</${n.t}>` : `<${n.t}${a ? ' ' + a : ''}/>`
  }
  return enfants.map(un).join('')
}

/** Arbre (forme du relevé) d'un fragment SVG écrit en texte : `<path d="…" /> <circle …/>`. */
export function lireSvg(texte) {
  const pile = [{ t: '#', a: {}, c: [] }]
  for (const m of texte.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, ferme, tag, attrs, auto] = m
    if (ferme) {
      pile.pop()
      continue
    }
    const a = {}
    for (const x of attrs.matchAll(/([\w:-]+)="([^"]*)"/g)) a[x[1]] = x[2]
    const n = { t: tag, a, c: [] }
    pile[pile.length - 1].c.push(n)
    if (!auto) pile.push(n)
  }
  return pile[0].c
}

/** Un <svg> relevé est-il une icône au trait du prototype (24 × 24, trait, sans couleur propre dans ses enfants) ? */
export function estIcone(n) {
  if (n.t !== 'svg' || n.a.viewBox !== '0 0 24 24' || !n.a.stroke || n.a.width !== n.a.height) return false
  const propre = (x) => typeof x === 'string' || (/^(path|circle|rect|line|polyline|polygon|ellipse)$/.test(x.t) && !Object.keys(x.a).some((k) => COULEUR_ATTR.test(k) || /opacity/.test(k)) && x.c.every(propre))
  return n.c.every(propre)
}

// ---------------------------------------------------------------------------------------------------------------
// 6. JSX
// ---------------------------------------------------------------------------------------------------------------

const ATTR_JSX = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-opacity': 'strokeOpacity',
  'fill-opacity': 'fillOpacity',
  'text-anchor': 'textAnchor',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'font-family': 'fontFamily',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'clip-path': 'clipPath',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  viewbox: 'viewBox',
  for: 'htmlFor',
  maxlength: 'maxLength',
  inputmode: 'inputMode',
  readonly: 'readOnly',
  autocomplete: 'autoComplete',
  tabindex: 'tabIndex',
}
const VIDES = new Set(['input', 'img', 'br', 'hr'])
const EN_LIGNE = new Set(['span', 'strong', 'b', 'em', 'i', 'a', 'img', 'svg', 'small', 'br', 'label'])
const chaine = (s) => JSON.stringify(s)
const lettres = /\p{L}/u

/** Texte d'un nœud relevé (pour la règle d'urgence). */
export function texteDe(n) {
  if (typeof n === 'string') return n
  return n.c.map(texteDe).join(' ')
}

/**
 * Transcrit un nœud relevé en JSX. `ctx` : { ecran, classes, icones (corps → nom), liens (écran du prototype → appel
 * chemin()), images (taille → import), fond, urgent, carte, profondeur, enveloppe, avecEnTete, racineFixe, usages }.
 */
export function versJsx(n, ctx, ind = '') {
  if (typeof n === 'string') {
    const t = n.replace(/\s+/g, ' ').trim()
    if (!t) return ''
    return ind + (lettres.test(t) ? `{t(${chaine(t)})}` : `{${chaine(t)}}`)
  }
  let decls = declarations(n.a.style)
  if (ctx.enveloppe) decls = enveloppe(decls, ctx.avecEnTete)
  const estPastille = n.t === 'span' && decls.some(([p, v]) => p === 'min-width' && /^1\d(\.\d+)?px$/.test(v)) && decls.some(([p, v]) => /^background/.test(p) && /#E05A00/i.test(v))
  const fond = fondDe(decls, estPastille)
  const texte = texteDe(n).replace(/\s+/g, ' ').trim()
  const urgent = ctx.urgent || ECRANS_URGENTS.has(ctx.ecran) || (texte.length <= 160 && URGENCE.test(texte))
  // Le fond propre de l'élément se juge avec le contexte de ses parents (une pastille sur un bouton, un voile sur la nuit).
  const texteClip = decls.some(([p, v]) => /background-clip$/.test(p) && v === 'text')
  const ctxSoi = { ...ctx, fond: fond ?? ctx.fond, fondParent: ctx.fond, urgent, pastille: estPastille, texteClip }
  const ctxEnfants = { ...ctx, fond: fond ?? ctx.fond, fondParent: undefined, urgent, enveloppe: false, racineFixe: false, pastille: false }

  // Icône du prototype → <Icone>
  if (n.t === 'svg' && estIcone(n)) {
    const nom = ctx.icones.get(corpsCanonique(n.c))
    if (!nom) throw new Error('icône sans nom (relancer outils/prototype.mjs) : ' + corpsCanonique(n.c).slice(0, 120))
    ctx.usages.icone = true
    const d = transformer(decls, n, ctxSoi)
    if (n.a.stroke && n.a.stroke !== 'currentColor') d.push(['color', jetonDe(n.a.stroke, 'stroke', ctxSoi)])
    const cl = ctx.classes.nom(d)
    const trait = Number(n.a['stroke-width'] ?? 1.9)
    return `${ind}<Icone nom=${chaine(nom)} taille={${Number(n.a.width)}}${trait !== 1.9 ? ` trait={${trait}}` : ''}${cl ? ` className=${chaine(cl)}` : ''} />`
  }

  let tag = n.t
  const attrs = []
  // Classe : déclarations transformées, plus les couleurs d'attributs SVG (fill, stroke, stop-color) en jetons.
  const d = transformer(decls, n, ctxSoi)
  for (const [k, v] of Object.entries(n.a)) if (COULEUR_ATTR.test(k) && /^(#|rgb)/i.test(v)) d.push([k, jetonDe(v, k, ctxSoi)])
  const cl = ctx.classes.nom(d)

  if (tag === 'a') {
    const h = n.a.href ?? ''
    const m = /^([A-Za-z0-9_]+)\.dc\.html$/.exec(h)
    if (m) {
      const cible = ctx.liens(m[1])
      tag = 'Link'
      attrs.push(`to={${cible}}`)
      ctx.usages.lien = true
    } else if (h) attrs.push(`href=${chaine(h)}`)
  }
  if (tag === 'img') {
    const taille = Number((n.a.src ?? '').slice(5))
    const img = ctx.images(taille)
    attrs.push(`src={${img}}`)
    attrs.push(`alt=${chaine(n.a.alt ?? '')}`)
  }
  for (const [k, v] of Object.entries(n.a)) {
    if (/^(style|href|src|alt|onclick|data-glass|xmlns)$/.test(k) || COULEUR_ATTR.test(k) && /^(#|rgb)/i.test(v)) continue
    if (k === 'id') {
      attrs.push(`id=${chaine(ctx.ecran + '-' + v)}`)
      continue
    }
    if (/^(fill|stroke)$/.test(k) && /^url\(#/.test(v)) {
      attrs.push(`${k}=${chaine(v.replace('#', '#' + ctx.ecran + '-'))}`)
      continue
    }
    if (k === 'aria-label' || k === 'placeholder' || k === 'title') {
      attrs.push(`${k}={t(${chaine(v)})}`)
      continue
    }
    if (k === 'value' && (tag === 'input' || tag === 'textarea')) {
      attrs.push(`defaultValue=${chaine(v)}`)
      continue
    }
    if (k === 'checked') {
      attrs.push('defaultChecked')
      continue
    }
    if (k === 'disabled' || k === 'readonly') {
      attrs.push(ATTR_JSX[k] ?? k)
      continue
    }
    attrs.push(`${ATTR_JSX[k] ?? k}=${chaine(v)}`)
  }
  // Enveloppe du contenu : « r-pile » (relais.css) range ses cartes en deux colonnes sur tablette (PR-12).
  const nomClasse = [cl, ctx.enveloppe && 'r-pile'].filter(Boolean).join(' ')
  if (nomClasse) attrs.push(`className=${chaine(nomClasse)}`)
  const ouverture = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}`
  if (VIDES.has(tag)) return `${ind}${ouverture} />`
  // Enfants : textes et éléments, espaces significatifs entre deux éléments en ligne gardés ({' '}).
  const enfants = []
  const c = n.c
  for (let i = 0; i < c.length; i++) {
    const x = c[i]
    if (typeof x === 'string') {
      const brut = x.replace(/\s+/g, ' ')
      const t = brut.trim()
      const avant = i > 0 && typeof c[i - 1] !== 'string' && EN_LIGNE.has(c[i - 1].t)
      const apres = i < c.length - 1 && typeof c[i + 1] !== 'string' && EN_LIGNE.has(c[i + 1].t)
      if (!t) {
        if (brut === ' ' && avant && apres) enfants.push(`${ind}  {' '}`)
        continue
      }
      if (avant && brut.startsWith(' ')) enfants.push(`${ind}  {' '}`)
      enfants.push(versJsx(t, ctxEnfants, ind + '  '))
      if (apres && brut.endsWith(' ')) enfants.push(`${ind}  {' '}`)
      continue
    }
    if (n.t === 'text' || n.t === 'tspan') {
      enfants.push(versJsx(x, ctxEnfants, ind + '  '))
      continue
    }
    enfants.push(versJsx(x, ctxEnfants, ind + '  '))
  }
  const corps = enfants.filter(Boolean)
  if (!corps.length) return `${ind}${ouverture} />`
  return `${ind}${ouverture}>\n${corps.join('\n')}\n${ind}</${tag}>`
}
