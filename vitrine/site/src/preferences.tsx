// Préférences de l'appareil : langue (CRD-02, CRD-04), thème (CDS-03), taille du texte (CRD-05), solde du
// portefeuille masqué (DP-52 : l'œil de la carte le masque sur place, partout où la carte paraît).
// Gardées sur l'appareil ; en production, aussi dans le compte (champs langue et thème, 2.6).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { installerSons, jouer, reglerSons, reglerVibrations } from './composants/Sons'
import { anglais, chargerAnglais, i18n, interpoler, type Dico } from './i18n/i18next'
import { cle, francise, renommerEn, traduireMontants, traduireNoeud, typographie, versAnglais } from './i18n/texte'

export type Langue = 'fr' | 'en'

export type Theme = 'light' | 'dark'
// « Automatique » : comme le téléphone (prefers-color-scheme), suivi en direct.
export type ChoixTheme = Theme | 'auto'
export type TailleTexte = 'normale' | 'grande' | 'tres'
// Tailles proposées (pour cent) : plus petites, intermédiaires, plus grandes.
export const ECHELLES = [85, 92, 100, 108, 115, 122, 130, 140]

interface Preferences {
  langue: Langue
  theme: Theme // thème affiché
  choixTheme: ChoixTheme
  taille: TailleTexte
  // Taille du texte fine (DP-54) : pour cent, de 85 à 140 ; « taille » en est la famille (mise en page).
  echelle: number
  setEchelle(n: number): void
  animationsReduites: boolean
  setAnimationsReduites(r: boolean): void
  // Données économes (Connexion et données) : les images ne se chargent qu'au toucher.
  donneesEconomes: boolean
  setDonneesEconomes(e: boolean): void
  setLangue(l: Langue): void
  setTheme(t: ChoixTheme): void
  setTaille(t: TailleTexte): void
  soldeMasque: boolean
  setSoldeMasque(m: boolean): void
  // Sons et vibrations des gestes (ajout au panier, paiement, notification…) : activés par défaut.
  sons: boolean
  setSons(on: boolean): void
  vibrations: boolean
  setVibrations(on: boolean): void
  // Mesure d'audience (CRG, cookies) : seulement avec l'accord du client ; éteinte par défaut.
  mesure: boolean
  setMesure(m: boolean): void
  t(fr: string): string
  // Phrase avec des données (« BelivaY ne livre pas encore à {ville} ») : la phrase modèle se traduit entière
  // (src/i18n/en-complements.json), puis chaque {nom} reçoit sa valeur (DP-53).
  tf(modele: string, valeurs: Record<string, string | number>): string
}

const Ctx = createContext<Preferences | null>(null)

function lit<T extends string>(cle: string, permis: readonly T[], defaut: T): T {
  try {
    const v = localStorage.getItem(cle) as T | null
    return v && permis.includes(v) ? v : defaut
  } catch {
    return defaut
  }
}

function garde(cle: string, v: string) {
  try {
    localStorage.setItem(cle, v)
  } catch {
    /* stockage indisponible : le choix vaut pour la visite */
  }
}

// Dictionnaire anglais : la clé est le texte français exact, espaces normalisées (CRD-04).
// Chargé seulement quand l'anglais est choisi : celui du prototype, plus les textes propres au site
// (i18n/en-complements.json, à valider ; outils/prototype.mjs vérifie qu'aucune clé n'y est en double).
// Il est versé dans i18next (i18n/i18next.ts), qui fait la recherche ; t() et tf() restent l'interface des pages.

// Sons et vibrations (composants/Sons.ts) : branchés dès le chargement, muets jusqu'au premier geste du client.
installerSons()

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [langue, setL] = useState<Langue>(() => lit('blv_c_lang', ['fr', 'en'] as const, 'fr'))
  // L'application s'ouvre en clair (CDS-03, CRG-04) ; elle ne suit le réglage du téléphone que si
  // « Automatique » est choisi dans les réglages.
  const [choixTheme, setT] = useState<ChoixTheme>(() => lit('blv_c_theme', ['light', 'dark', 'auto'] as const, 'light'))
  const sombreTel = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  const [telSombre, setTelSombre] = useState(sombreTel)
  useEffect(() => {
    if (choixTheme !== 'auto' || typeof matchMedia !== 'function') return
    const m = matchMedia('(prefers-color-scheme: dark)')
    const suivre = () => setTelSombre(m.matches)
    suivre()
    m.addEventListener('change', suivre)
    return () => m.removeEventListener('change', suivre)
  }, [choixTheme])
  const theme: Theme = choixTheme === 'auto' ? (telSombre ? 'dark' : 'light') : choixTheme
  const [mesure, setMe] = useState(() => lit('blv_c_mesure', ['oui', 'non'] as const, 'non') === 'oui')
  const [taille, setS] = useState<TailleTexte>(() => lit('blv_c_text', ['normale', 'grande', 'tres'] as const, 'normale'))
  const [echelle, setE] = useState<number>(() => {
    const v = Number(lit('blv_c_echelle', ECHELLES.map(String), ''))
    return v || { normale: 100, grande: 115, tres: 130 }[taille]
  })
  const [animationsReduites, setAR] = useState(() => lit('blv_c_anim', ['reduites', 'normales'] as const, 'normales') === 'reduites')
  const [donneesEconomes, setDE] = useState(() => {
    const v = lit('blv_c_eco', ['oui', 'non', 'auto'] as const, 'auto')
    // Sans choix enregistré : le réglage « économie de données » du téléphone, s'il est connu.
    return v === 'auto' ? !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData : v === 'oui'
  })
  const [sons, setSo] = useState(() => lit('blv_c_sons', ['oui', 'non'] as const, 'oui') === 'oui')
  const [vibrations, setVi] = useState(() => lit('blv_c_vibr', ['oui', 'non'] as const, 'oui') === 'oui')
  const [soldeMasque, setM] = useState(() => lit('blv_c_solde', ['masque', 'visible'] as const, 'visible') === 'masque')
  const [dico, setDico] = useState<Dico | null>(null)
  // Route ouverte : certains textes ont, sur une route, une traduction à elle (src/genere/en-routes.json).
  const chemin = useLocation().pathname
  const route = chemin === '/' ? 'accueil' : chemin.slice(1)

  useEffect(() => {
    // La page n'est déclarée en anglais qu'une fois le dictionnaire arrivé : avant, le texte est encore en français.
    document.documentElement.lang = langue === 'en' && dico ? 'en' : 'fr'
    void i18n.changeLanguage(langue === 'en' && dico ? 'en' : 'fr')
    if (langue === 'en' && !dico)
      Promise.all([
        import('./genere/en.json'),
        import('./genere/en-etats.json'),
        import('./i18n/en-complements.json'),
        import('./i18n/en-structures.json'),
        import('./genere/en-routes.json'),
      ]).then(([proto, etats, site, structures, routes]) => {
        // Ce que le prototype affiche vraiment (en-etats) l'emporte sur son dictionnaire ; les textes ajoutés par
        // les structures recalculées (DP-47) ont leur traduction (outils/structures.mjs).
        const tout: Dico = { ...(site.default as Dico), ...(structures.default as Dico), ...(proto.default as Dico), ...(etats.default as Dico) }
        chargerAnglais(tout, routes.default as Record<string, Dico>)
        setDico(tout)
      })
  }, [langue, dico])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    document.documentElement.dataset.text = taille
  }, [taille])
  useEffect(() => {
    const h = document.documentElement
    if (echelle === { normale: 100, grande: 115, tres: 130 }[taille]) delete h.dataset.echelle
    else h.dataset.echelle = String(echelle)
    h.style.setProperty('--zoom', String(echelle / 100))
  }, [echelle, taille])
  useEffect(() => {
    if (animationsReduites) document.documentElement.dataset.anim = 'reduites'
    else delete document.documentElement.dataset.anim
  }, [animationsReduites])

  const setDonneesEconomes = useCallback((e: boolean) => (setDE(e), garde('blv_c_eco', e ? 'oui' : 'non')), [])
  const setLangue = useCallback((l: Langue) => (setL(l), garde('blv_c_lang', l)), [])
  const setTheme = useCallback((t: ChoixTheme) => (setT(t), garde('blv_c_theme', t)), [])
  const setMesure = useCallback((m: boolean) => (setMe(m), garde('blv_c_mesure', m ? 'oui' : 'non')), [])
  const setTaille = useCallback((t: TailleTexte) => {
    setS(t)
    garde('blv_c_text', t)
    const n = { normale: 100, grande: 115, tres: 130 }[t]
    setE(n)
    garde('blv_c_echelle', String(n))
  }, [])
  const setEchelle = useCallback((n: number) => {
    setE(n)
    garde('blv_c_echelle', String(n))
    const t: TailleTexte = n <= 108 ? 'normale' : n <= 122 ? 'grande' : 'tres'
    setS(t)
    garde('blv_c_text', t)
  }, [])
  const setAnimationsReduites = useCallback((r: boolean) => (setAR(r), garde('blv_c_anim', r ? 'reduites' : 'normales')), [])
  const setSons = useCallback((on: boolean) => {
    setSo(on)
    garde('blv_c_sons', on ? 'oui' : 'non')
    reglerSons(on)
    if (on) jouer('interrupteur', true) // le tic confirme que le son revient
  }, [])
  const setVibrations = useCallback((on: boolean) => {
    setVi(on)
    garde('blv_c_vibr', on ? 'oui' : 'non')
    reglerVibrations(on)
    if (on) navigator.vibrate?.(30)
  }, [])
  const setSoldeMasque = useCallback((m: boolean) => (setM(m), garde('blv_c_solde', m ? 'masque' : 'visible')), [])

  // Tout texte affiché passe par t(), comme tout nœud de texte du prototype passe par fixTypo puis,
  // en anglais, par applyLang. Tant que le dictionnaire se charge, le texte reste en français.
  const t = useCallback(
    (fr: string) => {
      const v = typographie(fr)
      if (langue === 'fr' || !dico) return francise(v)
      const k = cle(v)
      if (!k) return v
      let en = anglais(k, route) ?? traduireNoeud(k, dico) ?? traduireMontants(k, dico)
      // Comme le balisage du prototype « <span>1 387</span> produits », un nombre en tête se traduit à part.
      const m = en === undefined ? /^([\d\u00A0\u202F ]+\d)(\s.+)$/.exec(k) : null
      const reste = m ? anglais(cle(m[2])) : undefined
      if (m && reste !== undefined) en = m[1] + ' ' + reste
      if (en === undefined) {
        // Une clé absente affiche le français, jamais une clé brute (CRD-04) ; signalée au développeur.
        if (import.meta.env.DEV) console.warn('[traduction manquante]', k)
        en = k
      }
      // Comme applyLang : les espaces de début et de fin du texte d'origine sont gardées.
      const debut = /^\s*/.exec(v)![0]
      const fin = /\s*$/.exec(v)![0]
      return debut + renommerEn(versAnglais(en)) + fin
    },
    [langue, dico, route],
  )

  const tf = useCallback(
    (modele: string, valeurs: Record<string, string | number>) => {
      // Chaque {nom} reçoit sa valeur (interpolation i18next, délimiteurs « { } ») ; un {nom} sans valeur reste.
      const v = interpoler(t(modele), valeurs)
        // « jusqu'au {d}. » avec d = « ven. 4 sept. » : un seul point.
        .replace(/(\p{L})\.\./gu, '$1.')
      // En anglais, les nombres glissés dans la phrase prennent les conventions anglaises (« 27,340 F »).
      return langue === 'en' && dico ? versAnglais(v) : v
    },
    [t, langue, dico],
  )
  const valeur = useMemo(
    () => ({ langue, theme, choixTheme, taille, echelle, setEchelle, animationsReduites, setAnimationsReduites, donneesEconomes, setDonneesEconomes, setLangue, setTheme, setTaille, soldeMasque, setSoldeMasque, sons, setSons, vibrations, setVibrations, mesure, setMesure, t, tf }),
    [langue, theme, choixTheme, taille, echelle, setEchelle, animationsReduites, setAnimationsReduites, donneesEconomes, setDonneesEconomes, setLangue, setTheme, setTaille, soldeMasque, setSoldeMasque, sons, setSons, vibrations, setVibrations, mesure, setMesure, t, tf],
  )
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>
}

export function usePreferences(): Preferences {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePreferences hors de PreferencesProvider')
  return v
}
