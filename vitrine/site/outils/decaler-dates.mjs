// Décalage constant des dates écrites en dur d'un jeu d'essai (jour de la démonstration commun aux cinq
// applications : mardi 13 octobre 2026). Une seule règle, appliquée aux sources (outils/decaler-dates-sources.mjs)
// et au prototype comparé au pixel (outils/corrections.mjs), pour que les deux montrent les mêmes dates :
// - ISO « 2026-09-24 », Date.UTC(2026, 8, 24…), new Date(2026, 8, 24…), yaounde(2026, 9, 21…) (mois de 1 à 12) ;
// - français « 24 sept. », « jeu. 24 sept. », « jeudi 24 septembre 2026 », « 1er oct. » (jour de semaine recalculé) ;
// - anglais « 24 Sept », « Thu 24 Sept », « 24 September 2026 ».
// Une date sans année prend l'année la plus proche du jour d'origine. Les dates fixées par le calendrier (fêtes,
// Black Friday, Saint-Valentin) ne bougent pas : elles restent à leur jour.
const MOIS_FR = [
  ['janv.', 'janvier'], ['févr.', 'février'], ['mars', 'mars'], ['avr.', 'avril'], ['mai', 'mai'], ['juin', 'juin'],
  ['juil.', 'juillet'], ['août', 'août'], ['sept.', 'septembre'], ['oct.', 'octobre'], ['nov.', 'novembre'], ['déc.', 'décembre'],
]
const JOURS_FR = [['dim.', 'dimanche'], ['lun.', 'lundi'], ['mar.', 'mardi'], ['mer.', 'mercredi'], ['jeu.', 'jeudi'], ['ven.', 'vendredi'], ['sam.', 'samedi']]
const MOIS_EN = [
  ['Jan', 'January'], ['Feb', 'February'], ['Mar', 'March'], ['Apr', 'April'], ['May', 'May'], ['Jun', 'June'],
  ['Jul', 'July'], ['Aug', 'August'], ['Sept', 'September'], ['Oct', 'October'], ['Nov', 'November'], ['Dec', 'December'],
]
const JOURS_EN = [['Sun', 'Sunday'], ['Mon', 'Monday'], ['Tue', 'Tuesday'], ['Wed', 'Wednesday'], ['Thu', 'Thursday'], ['Fri', 'Friday'], ['Sat', 'Saturday']]
// Jours fixés par le calendrier (mois de 1 à 12, jour) : ils ne se décalent pas.
const FIXES = new Set(['12-24', '12-25', '12-26', '12-31', '1-1', '2-14'])

// Lignes déjà au jour commun ou qui datent une décision : jamais décalées.
export const GARDER = /commande témoin du 13|reference order|JOUR_DEMO|HEURE_DEMO|REFERENCE_V|consigne du porteur|revue indépendante|confirmé par le porteur|Les listes arrivent le|Émise? le 1er|Disponible le 1er/

const JOUR = 86400000
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const alt = (l) => l.flat().sort((a, b) => b.length - a.length).map(esc).join('|')
// Séparateur : espace, insécable, fine insécable, ou leur échappement dans une chaîne JS / HTML.
const SEP = '(?: |\\u00A0|\\u202F|\\\\u00A0|\\\\u202F|\\\\u00a0|\\\\u202f|&nbsp;)'
const MAJ = (s, modele) => (modele[0] === modele[0].toUpperCase() ? s[0].toUpperCase() + s.slice(1) : s)

function annee(m, j, ref) {
  let best = 2026
  for (const a of [2025, 2026, 2027]) if (Math.abs(Date.UTC(a, m, j) - ref) < Math.abs(Date.UTC(best, m, j) - ref)) best = a
  return best
}
function decaler(a, m, j, jours) {
  if (FIXES.has(`${m + 1}-${j}`)) return null
  const d = new Date(Date.UTC(a, m, j) + jours * JOUR)
  return { a: d.getUTCFullYear(), m: d.getUTCMonth(), j: d.getUTCDate(), js: d.getUTCDay() }
}

export function decalerDates(texte, jours, { reference = Date.UTC(2026, 8, 24) } = {}) {
  let s = texte
  // ISO
  s = s.replace(/\b(202[5-7])-(\d\d)-(\d\d)(?!\d)/g, (t, a, m, j) => {
    const n = decaler(+a, +m - 1, +j, jours)
    return n ? `${n.a}-${String(n.m + 1).padStart(2, '0')}-${String(n.j).padStart(2, '0')}` : t
  })
  // Date.UTC / new Date (mois 0-11), yaounde (mois 1-12)
  s = s.replace(/\b(Date\.UTC|new Date|yaounde)\((\s*)(202[5-7]),(\s*)(\d{1,2}),(\s*)(\d{1,2})\b/g, (t, f, e1, a, e2, m, e3, j) => {
    const base = f === 'yaounde' ? 1 : 0
    const n = decaler(+a, +m - base, +j, jours)
    return n ? `${f}(${e1}${n.a},${e2}${n.m + base},${e3}${n.j}` : t
  })
  s = langue(s, jours, reference, FR)
  s = langue(s, jours, reference, EN)
  return s
}

const FR = { mois: MOIS_FR, jours: JOURS_FR, liens: 'au|et|–|-', er: true, drapeaux: 'giu' }
const EN = { mois: [...MOIS_EN, ['Sep', 'Sep']], jours: JOURS_EN, liens: 'to|and|–|-', er: false, drapeaux: 'gu' }

// Dates écrites en toutes lettres d'une langue : « [jour] J[er] mois [année] », plages « du 8 au 14 sept. »,
// « jeu. 24 au lun. 28 sept. », et jour de semaine sans mois « sam. 26 au soir » (mois retrouvé autour du jour d'origine,
// celui où ce jour tombe bien ce jour de semaine).
function langue(s, jours, reference, L) {
  const WD = alt(L.jours)
  const MO = alt(L.mois)
  const ER = L.er ? '(er)?' : '()'
  const idxMois = (m) => {
    const k = L.mois.findIndex((x) => x.some((y) => y.toLowerCase() === m.toLowerCase()))
    return k === 12 ? 8 : k
  }
  const idxJour = (w) => L.jours.findIndex((x) => x.some((y) => y.toLowerCase() === w.toLowerCase()))
  const longM = (m) => { const k = idxMois(m); return L.mois[k][1].toLowerCase() === m.toLowerCase() && L.mois[k][0] !== L.mois[k][1] }
  const nomM = (k, modele) => MAJ(longM(modele) ? L.mois[k][1] : L.mois[k][0], modele)
  const nomJ = (k, modele) => MAJ(L.jours[k][L.jours.some((x) => x[1].toLowerCase() === modele.toLowerCase()) ? 1 : 0], modele)
  const jj = (n) => (L.er && n === 1 ? '1er' : String(n))
  const re = new RegExp(
    `(?<![\\p{L}\\d])(?:(?:(${WD})(,?${SEP}))?(\\d{1,2})${ER}(${SEP}?)(${L.liens})(${SEP}?)(?=\\d|${WD}))?` +
      `(?:(${WD})(,?${SEP}))?(\\d{1,2})${ER}(${SEP})(${MO})(?![\\p{L}])(?:(${SEP})(202[5-7])(?!\\d))?`,
    L.drapeaux,
  )
  s = s.replace(re, (t, wd0, w0, d0, er0, r1, lien, r2, wd, s1, j, er, s2, mois, s3, a) => {
    const im = idxMois(mois)
    if (im < 0 || +j < 1 || +j > 31) return t
    const an = a ? +a : annee(im, +j, reference)
    const n = decaler(an, im, +j, jours)
    if (!n) return t
    let out = `${jj(n.j)}${s2}${nomM(n.m, mois)}`
    if (wd) out = nomJ(n.js, wd) + s1 + out
    if (a) out += s3 + n.a
    if (d0) {
      const n0 = decaler(an, +d0 > +j ? im - 1 : im, +d0, jours)
      if (!n0) return t
      let debut = n0.m === n.m ? jj(n0.j) : `${jj(n0.j)}${s2}${nomM(n0.m, mois)}`
      if (wd0) debut = nomJ(n0.js, wd0) + w0 + debut
      out = debut + r1 + lien + r2 + out
    }
    return out
  })
  // Jour de semaine sans mois : « sam. 26 au soir », « Fri 25 at 5:15 pm ».
  const reJ = new RegExp(`(?<![\\p{L}\\d])(${WD})(,?${SEP})(\\d{1,2})(?!\\d)(?!${ER}${SEP}(?:${MO})(?![\\p{L}]))(?!${SEP}?(?:${L.liens})${SEP}?(?:\\d|${WD}))`, L.drapeaux)
  s = s.replace(reJ, (t, wd, s1, j) => {
    const k = idxJour(wd)
    let best = null
    for (let x = -60; x <= 60; x++) {
      const d = new Date(reference + x * JOUR)
      if (d.getUTCDate() === +j && d.getUTCDay() === k && (best === null || Math.abs(x) < Math.abs(best))) best = x
    }
    if (best === null) return t
    const d0 = new Date(reference + best * JOUR)
    const n = decaler(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate(), jours)
    if (!n) return t
    return nomJ(n.js, wd) + s1 + jj(n.j)
  })
  return s
}

// Dictionnaire anglais généré depuis un prototype (outils/prototype.mjs) : clés et traductions décalées pareil.
export function decalerDico(o, jours, opts) {
  const d = (t) => (GARDER.test(t) ? t : decalerDates(t, jours, opts))
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [d(k), typeof v === 'string' ? d(v) : v]))
}
