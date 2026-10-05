// Mise en forme des textes, reprise telle quelle du prototype (fonctions fixTypo et applyLang) :
// - en français : espaces insécables des heures, des milliers, avant « : ; ! ? » » et après « « », avant
//   les unités (CCH-30, CCH-31) ;
// - en anglais : le texte vient du dictionnaire (clé = texte français, espaces normalisées, CRD-04), puis
//   les nombres passent à la convention anglaise (« 272,579 F », « 4.6 », CCH-31).
import anglicismes from './anglicismes.json'

export const NB = '\u00A0' // espace insécable des milliers (CCH-31) et des unités

export function typographie(v: string): string {
  if (!v.trim()) return v
  return v
    .replace(/(\d{1,2}) h (\d{2})(?!\d)/g, '$1' + NB + 'h' + NB + '$2')
    .replace(/(\d) (\d{3})(?!\d)/g, '$1' + NB + '$2')
    .replace(/(\d) (\d{3})(?!\d)/g, '$1' + NB + '$2')
    .replace(/ ([:;!?»])/g, NB + '$1')
    .replace(/« /g, '«' + NB)
    .replace(/ ···· /g, NB + '····' + NB)
    .replace(/(\d) (F|FCFA|h|min|j|%|pts?|km|m|kg|cm|mois|jours?|ans?|commandes?|€)(?![\wÀ-ÿ])/g, '$1' + NB + '$2')
}

// DP-44 (5) : aucun anglicisme dans l'interface française (CCH-30). Les textes du prototype gardent leur
// clé française d'origine pour le dictionnaire anglais ; seul l'affichage français est corrigé.
// Liste unique (anglicismes.json), reprise par les tests de comparaison (outils/corrections.mjs).
const ANGLICISMES: [RegExp, string][] = (anglicismes as [string, string][]).map(([re, par]) => [new RegExp(re, 'g'), par])
export const francise = (v: string) => ANGLICISMES.reduce((s, [re, par]) => s.replace(re, par), v)
// DP-54 : renommages de l'interface anglaise (« Saved » devient « Favourites »), après la traduction.
import renommagesEn from './renommages-en.json'
const RENOMMAGES_EN: [RegExp, string][] = (renommagesEn as [string, string][]).map(([re, par]) => [new RegExp(re, 'g'), par])
export const renommerEn = (v: string) => RENOMMAGES_EN.reduce((s, [re, par]) => s.replace(re, par), v)

export const cle = (t: string) => t.replace(/[\s\u00A0\u202F]+/g, ' ').trim()

// Conversion d'un texte anglais (déjà traduit) aux conventions anglaises du prototype.
export function versAnglais(v: string): string {
  return v
    .replace(/(\d),(\d{1,2})(?![\d\u202F\u00A0])/g, '$1.$2')
    .replace(/(\d)[\u202F\u00A0 ](\d{3})(?!\d)/g, '$1,$2')
    .replace(/(\d)[\u202F\u00A0 ](\d{3})(?!\d)/g, '$1,$2')
    .replace(/(····[\u202F\u00A0 ]?)(\d),(\d{3})/g, '$1$2$3')
    .replace(/(\bcode(?:[\u00A0\u202F ]?:)?[\u00A0\u202F ])(\d{3}),(\d{3})(?!\d)/gi, '$1$2\u00A0$3')
    .replace(/(\d) Go\b/g, '$1 GB')
    .replace(/[\u202F\u00A0 ]+([:;!?])(?=[\s\u00A0]|$)/g, '$1')
    .replace(/(\d) (F|FCFA)\b/g, '$1\u00A0$2')
    .replace(/ ····[ \u00A0]/g, '\u00A0····\u00A0')
}

// Montants recalculés (DP-47, src/demo/recalculs.json) : « Payer 273 379 F » se traduit comme le texte du
// prototype « Payer 272 579 F », puis le montant recalculé reprend sa place. Rien d'autre n'est traduit
// par ressemblance : un texte absent du dictionnaire reste tel quel, comme dans le prototype.
import recalculs from '../demo/recalculs.json'

const groupes = (montant: string) => montant.split(/[\s\u00A0\u202F]/)
// Recalculs « nœud » : le texte du site se traduit comme celui du prototype, ses nombres échangés un à un.
const NOMBRE_TEXTE = /\d+(?:[\s\u00A0\u202F,.]\d{3})*(?:,\d+)?/g
const chiffres = (n: string) => n.replace(/\D/g, '')
const NOEUDS = (recalculs as { prototype: string; site: string; noeud?: boolean; en?: string }[])
  .filter((r) => r.noeud)
  .map((r) => ({ cleSite: r.site.replace(/[\s\u00A0\u202F]+/g, ' ').trim(), prototype: r.prototype, en: r.en, de: r.prototype.match(NOMBRE_TEXTE) || [], vers: r.site.match(NOMBRE_TEXTE) || [] }))
  .filter((r) => r.en || r.de.length === r.vers.length)

export function traduireNoeud(k: string, dico: Record<string, string>): string | undefined {
  const r = NOEUDS.find((x) => x.cleSite === k)
  if (r?.en) return r.en // traduction écrite (le nombre de montants change)
  const en = r && dico[cle(r.prototype)]
  if (!r || en === undefined) return undefined
  let i = 0
  return en.replace(NOMBRE_TEXTE, (n) => {
    const j = r.de.findIndex((d, x) => x >= i && chiffres(d) === chiffres(n))
    if (j < 0) return n
    i = j + 1
    return r.vers[j]
  })
}

const litteral = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const MONTANTS = (recalculs as { prototype: string; site: string; texte?: boolean; noeud?: boolean }[]).filter((r) => !r.noeud).map((r) =>
  r.texte
    ? // Passage exact (montant en euros « 189,55 ») : le même texte, dans les deux sens.
      { site: new RegExp(litteral(r.site), 'g'), prototype: new RegExp(litteral(r.prototype), 'g'), versPrototype: r.prototype, versSite: r.site }
    : {
        site: new RegExp(groupes(r.site).join('[\\s\\u00A0\\u202F]'), 'g'),
        prototype: new RegExp(groupes(r.prototype).join('[\\s\\u00A0\\u202F,]'), 'g'),
        versPrototype: groupes(r.prototype).join(' '),
        versSite: groupes(r.site).join(' '),
      },
)

export function traduireMontants(k: string, dico: Record<string, string>): string | undefined {
  let cleProto = k
  const appliques = MONTANTS.filter((m) => {
    m.site.lastIndex = 0
    return m.site.test(k)
  })
  if (!appliques.length) return undefined
  for (const m of appliques) cleProto = cleProto.replace(m.site, m.versPrototype)
  const en = dico[cle(cleProto)]
  if (en === undefined) return undefined
  // Tous les montants du prototype présents dans la traduction viennent de la clé : chacun reprend sa valeur
  // recalculée, y compris écrit à l'anglaise (« 188.93 » → « 189.55 »).
  return MONTANTS.reduce((v, m) => {
    m.prototype.lastIndex = 0
    return v.replace(m.prototype, m.versSite)
  }, en)
}
