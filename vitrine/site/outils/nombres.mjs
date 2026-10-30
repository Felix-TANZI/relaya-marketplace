// Nombres d'un texte, pour les recalculs « nœud » (src/demo/recalculs.json) : le texte du site garde la
// traduction du prototype, ses nombres remplacés un à un. Même logique que src/i18n/texte.ts (traduireMontants).
export const NOMBRE = /\d+(?:[\s  ,.]\d{3})*(?:,\d+)?/g
const chiffres = (n) => n.replace(/\D/g, '')

// Paires (nombre du prototype → nombre du site), dans l'ordre du texte.
export function paires(prototype, site) {
  const a = prototype.match(NOMBRE) || []
  const b = site.match(NOMBRE) || []
  return a.length === b.length ? a.map((x, i) => [chiffres(x), b[i]]) : null
}

// Remplace dans un texte (souvent la traduction anglaise) chaque nombre du prototype par celui du site.
export function echanger(texte, p) {
  let i = 0
  return texte.replace(NOMBRE, (n) => {
    const k = p.findIndex(([de], j) => j >= i && de === chiffres(n))
    if (k < 0) return n
    i = k + 1
    return p[k][1]
  })
}

// Conventions anglaises du prototype (applyLang) : copie de versAnglais (src/i18n/texte.ts).
export function versAnglais(v) {
  return v
    .replace(/(\d),(\d{1,2})(?![\d  ])/g, '$1.$2')
    .replace(/(\d)[   ](\d{3})(?!\d)/g, '$1,$2')
    .replace(/(\d)[   ](\d{3})(?!\d)/g, '$1,$2')
    .replace(/(····[   ]?)(\d),(\d{3})/g, '$1$2$3')
    .replace(/(\bcode(?:[   ]?:)?[   ])(\d{3}),(\d{3})(?!\d)/gi, '$1$2 $3')
    .replace(/(\d) Go\b/g, '$1 GB')
    .replace(/[   ]+([:;!?])(?=[\s ]|$)/g, '$1')
    .replace(/(\d) (F|FCFA)\b/g, '$1 $2')
    .replace(/ ····[  ]/g, ' ···· ')
}
export const cle = (t) => t.replace(/[\s  ]+/g, ' ').trim()
