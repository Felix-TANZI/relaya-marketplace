// Préférences de l'appareil (espace point relais) : langue FR / EN (GEN-10 ; pas de pidgin : DP-13, DP-63), thème
// clair / sombre / automatique (DS-08 : suit le téléphone au premier lancement, puis le choix est gardé ; synchronisé
// entre le bouton lune/soleil de l'en-tête et l'interrupteur des Paramètres), taille du texte libre sur 8 crans (comme
// le client ; DS-10 : Normale, Grande 115 %, Très grande 130 % en font partie), animations réduites, sons et
// vibrations (activés par défaut : au comptoir on entend et on sent avant de lire), données économes.
// Même interface que les préférences du client (site/src/preferences.tsx) : les composants neutres du client
// réutilisés par l'alias (Animations, Sons, Feuille, SaisieCode…) importent « ../preferences » et reçoivent ce module
// (redirection de vite.config.ts) ; le type PreferencesClient garantit à la compilation que rien ne leur manque.
// Clés de stockage propres au relais (blv_r_*).
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { installerSons, jouer, reglerSons, reglerVibrations } from '@client/composants/Sons'
import { anglais, chargerAnglais, i18n, interpoler, type Dico } from '@client/i18n/i18next'
import { cle, typographie, versAnglais } from '@client/i18n/texte'
import type { usePreferences as usePreferencesClient } from '@client/preferences'
import { appliquerFr, chargerDictionnaireAnglais } from './i18n/dictionnaire'
import { reglerVibrationsRelais } from './composants/signaux'

export type Langue = 'fr' | 'en'
export type Theme = 'light' | 'dark'
export type ChoixTheme = Theme | 'auto'
export type TailleTexte = 'normale' | 'grande' | 'tres'
export const ECHELLES = [85, 92, 100, 108, 115, 122, 130, 140]

type PreferencesClient = ReturnType<typeof usePreferencesClient>
export interface Preferences extends PreferencesClient {
  langue: Langue
  theme: Theme
  choixTheme: ChoixTheme
  taille: TailleTexte
  setLangue(l: Langue): void
  setTheme(t: ChoixTheme): void
  setTaille(t: TailleTexte): void
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

installerSons()

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [langue, setL] = useState<Langue>(() => lit('blv_r_lang', ['fr', 'en'] as const, 'fr'))
  const [choixTheme, setT] = useState<ChoixTheme>(() => lit('blv_r_theme', ['light', 'dark', 'auto'] as const, 'auto'))
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
  const [taille, setS] = useState<TailleTexte>(() => lit('blv_r_text', ['normale', 'grande', 'tres'] as const, 'normale'))
  const [echelle, setE] = useState<number>(() => Number(lit('blv_r_echelle', ECHELLES.map(String), '')) || { normale: 100, grande: 115, tres: 130 }[taille])
  const [animationsReduites, setAR] = useState(() => lit('blv_r_anim', ['reduites', 'normales'] as const, 'normales') === 'reduites')
  // Économie de données activée par défaut : forfaits mobiles, photos compressées avant envoi (OFF-04).
  const [donneesEconomes, setDE] = useState(() => lit('blv_r_eco', ['oui', 'non'] as const, 'oui') === 'oui')
  const [sons, setSo] = useState(() => lit('blv_r_sons', ['oui', 'non'] as const, 'oui') === 'oui')
  const [vibrations, setVi] = useState(() => lit('blv_r_vibr', ['oui', 'non'] as const, 'oui') === 'oui')
  const [soldeMasque, setM] = useState(() => lit('blv_r_solde', ['masque', 'visible'] as const, 'visible') === 'masque')
  const [mesure, setMe] = useState(() => lit('blv_r_mesure', ['oui', 'non'] as const, 'non') === 'oui')
  const [dico, setDico] = useState<Dico | null>(null)

  useEffect(() => {
    document.documentElement.lang = langue === 'en' && dico ? 'en' : 'fr'
    void i18n.changeLanguage(langue === 'en' && dico ? 'en' : 'fr')
    if (langue === 'en' && !dico)
      void chargerDictionnaireAnglais().then((tout) => {
        chargerAnglais(tout, {})
        setDico(tout)
      })
  }, [langue, dico])
  // Avant la peinture : le premier écran paraît déjà dans son thème (index.html l'a posé avant tout script).
  useLayoutEffect(() => {
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
  // Sons et vibrations des modules partagés (Sons du client, signaux du relais) : réglés dès l'ouverture.
  useEffect(() => {
    reglerSons(sons)
    reglerVibrations(vibrations)
    reglerVibrationsRelais(vibrations)
  }, [sons, vibrations])
  useEffect(() => {
    if (animationsReduites) document.documentElement.dataset.anim = 'reduites'
    else delete document.documentElement.dataset.anim
  }, [animationsReduites])

  const setLangue = useCallback((l: Langue) => (setL(l), garde('blv_r_lang', l)), [])
  const setTheme = useCallback((t: ChoixTheme) => (setT(t), garde('blv_r_theme', t)), [])
  const setTaille = useCallback((t: TailleTexte) => {
    setS(t)
    garde('blv_r_text', t)
    const n = { normale: 100, grande: 115, tres: 130 }[t]
    setE(n)
    garde('blv_r_echelle', String(n))
  }, [])
  const setEchelle = useCallback((n: number) => {
    setE(n)
    garde('blv_r_echelle', String(n))
    const t: TailleTexte = n <= 108 ? 'normale' : n <= 122 ? 'grande' : 'tres'
    setS(t)
    garde('blv_r_text', t)
  }, [])
  const setAnimationsReduites = useCallback((r: boolean) => (setAR(r), garde('blv_r_anim', r ? 'reduites' : 'normales')), [])
  const setDonneesEconomes = useCallback((e: boolean) => (setDE(e), garde('blv_r_eco', e ? 'oui' : 'non')), [])
  const setSons = useCallback((on: boolean) => {
    setSo(on)
    garde('blv_r_sons', on ? 'oui' : 'non')
    reglerSons(on)
    if (on) jouer('interrupteur', true)
  }, [])
  const setVibrations = useCallback((on: boolean) => {
    setVi(on)
    garde('blv_r_vibr', on ? 'oui' : 'non')
    reglerVibrations(on)
    if (on) navigator.vibrate?.(30)
  }, [])
  const setSoldeMasque = useCallback((m: boolean) => (setM(m), garde('blv_r_solde', m ? 'masque' : 'visible')), [])
  const setMesure = useCallback((m: boolean) => (setMe(m), garde('blv_r_mesure', m ? 'oui' : 'non')), [])

  // Tout texte affiché passe par t() : typographie du prototype (fixTypo), puis, en anglais, le dictionnaire (clé =
  // texte français, espaces normalisées) et les conventions anglaises des nombres (applyLang). Une clé absente garde
  // le français, jamais une clé brute.
  const t = useCallback(
    (fr: string) => {
      const v = appliquerFr(typographie(fr))
      if (langue === 'fr' || !dico) return v
      const k = cle(v)
      if (!k) return v
      let en = anglais(k)
      if (en === undefined) {
        if (import.meta.env.DEV) console.warn('[traduction manquante]', k)
        // Relevée pour les tests (tests/anglais.spec.ts : aucun texte français visible en anglais).
        ;((window as unknown as { __blvManquantes?: Set<string> }).__blvManquantes ??= new Set()).add(k)
        en = k
      }
      const debut = /^\s*/.exec(v)![0]
      const fin = /\s*$/.exec(v)![0]
      return debut + versAnglais(en) + fin
    },
    [langue, dico],
  )
  const tf = useCallback(
    (modele: string, valeurs: Record<string, string | number>) => {
      const v = interpoler(t(modele), valeurs).replace(/(\p{L})\.\./gu, '$1.')
      // Valeurs insérées : espaces insécables du français aussi (« 5 % », « 14 h 30 », « 75 000 F » jamais coupés).
      return langue === 'en' && dico ? versAnglais(v) : typographie(v)
    },
    [t, langue, dico],
  )
  const valeur = useMemo<Preferences>(
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
