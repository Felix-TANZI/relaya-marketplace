// Moteur de traduction : i18next (même pile que le front relaya), derrière nos fonctions t() et tf()
// (src/preferences.tsx). Les pages n'appellent jamais i18next directement.
//
// - Le français est la langue source : la clé est le texte français exact, espaces normalisées (CRD-04) ;
//   aucune ressource française, le texte s'affiche tel quel (avec la typographie et les anglicismes corrigés).
// - L'anglais est chargé à la demande (preferences.tsx) puis versé ici : l'espace de noms « translation » reçoit
//   le dictionnaire complet, et chaque route qui a ses propres traductions (src/genere/en-routes.json) a son espace
//   « route/<route> », consulté d'abord.
// - Pas de séparateur de clé ni d'espace de noms : un texte français peut contenir « . » et « : ».
// - Interpolation sur « {nom} » (et non « {{nom}} ») : c'est la forme de nos phrases modèles (tf, DP-53).
// - Pour du code nouveau écrit à la façon relaya, useTranslation() de react-i18next fonctionne aussi
//   (initReactI18next) ; il donne le texte brut du dictionnaire, sans la typographie ni les conventions anglaises
//   que t() applique : préférer usePreferences().t pour l'affichage.
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

export const i18n = i18next.createInstance()

void i18n.use(initReactI18next).init({
  lng: 'fr',
  fallbackLng: false,
  // Chargement synchrone : les ressources sont versées par addResourceBundle, jamais chargées par i18next.
  initAsync: false,
  resources: {},
  ns: ['translation'],
  defaultNS: 'translation',
  keySeparator: false,
  nsSeparator: false,
  // Un texte vide du dictionnaire est une traduction (comme avant : seul « absent » retombe sur le français).
  returnEmptyString: true,
  returnNull: false,
  interpolation: { prefix: '{', suffix: '}', escapeValue: false },
  react: { useSuspense: false },
  showSupportNotice: false,
})

export type Dico = Record<string, string>

const ABSENT = '\u0000absent'

/** Verse le dictionnaire anglais (et les traductions propres à chaque route) dans i18next. */
export function chargerAnglais(dico: Dico, parRoute: Record<string, Dico>) {
  i18n.addResourceBundle('en', 'translation', dico, true, true)
  for (const [route, d] of Object.entries(parRoute)) i18n.addResourceBundle('en', 'route/' + route, d, true, true)
}

/** Traduction anglaise exacte d'une clé (route d'abord, puis dictionnaire), ou undefined si elle manque. */
export function anglais(k: string, route?: string): string | undefined {
  const ns = route && i18n.hasResourceBundle('en', 'route/' + route) ? ['route/' + route, 'translation'] : ['translation']
  const v = i18n.t(k, { lng: 'en', ns, defaultValue: ABSENT, skipInterpolation: true })
  return v === ABSENT ? undefined : v
}

/** Remplace chaque {nom} par sa valeur ; un {nom} sans valeur reste tel quel. */
export function interpoler(phrase: string, valeurs: Record<string, string | number>): string {
  return i18n.services.interpolator.interpolate(phrase, valeurs, i18n.language, {})
}
