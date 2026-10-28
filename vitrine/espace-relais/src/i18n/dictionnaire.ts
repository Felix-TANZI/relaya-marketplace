// Dictionnaires de l'espace point relais (clé = texte français exact, espaces normalisées : CRD-04) :
// - src/genere/en.json : dictionnaire anglais du prototype point relais, écrit par outils/prototype.mjs ;
// - src/i18n/<PR-xx>.en.json : textes ajoutés par chaque groupe d'écrans (un fichier par groupe : aucun agent ne
//   touche le fichier d'un autre) ; src/i18n/commun.en.json : textes de la coque et du socle ;
// - src/i18n/<PR-xx>.fr.json : corrections du texte français ({ "texte d'origine": "texte corrigé" }), quand une
//   décision du porteur change un texte : la clé anglaise reste celle d'origine.
// Une même clé française n'a qu'une traduction : tests/squelette.spec.ts vérifie qu'aucun fichier n'en double une autre.
import type { Dico } from '@client/i18n/i18next'

const ANGLAIS = import.meta.glob<{ default: Dico }>('./*.en.json')
const FRANCAIS = import.meta.glob<Dico>('./*.fr.json', { eager: true, import: 'default' })

const CORRECTIONS_FR: Dico = Object.assign({}, ...Object.values(FRANCAIS))
const normer = (t: string) => t.replace(/[\s  ]+/g, ' ').trim()

/** Texte français affiché : corrigé s'il fait l'objet d'une correction de groupe (fichier PR-xx.fr.json). */
export function appliquerFr(v: string): string {
  const k = normer(v)
  const c = k && CORRECTIONS_FR[k]
  if (!c) return v
  return /^\s*/.exec(v)![0] + c + /\s*$/.exec(v)![0]
}

/** Dictionnaire anglais complet, chargé seulement quand l'anglais est choisi. */
export async function chargerDictionnaireAnglais(): Promise<Dico> {
  const [proto, ...groupes] = await Promise.all([import('../genere/en.json'), ...Object.values(ANGLAIS).map((f) => f())])
  return Object.assign({}, proto.default as Dico, ...groupes.map((g) => g.default))
}
