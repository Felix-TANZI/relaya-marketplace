// Préférences de l'appareil (Profil ; BRIEF-ENRICHISSEMENT §4, regroupées simplement) : Affichage (langue FR / EN,
// DP-13, Q-44 ; thème clair, sombre ou automatique ; taille du texte libre ; animations réduites) puis Sons et données
// (sons et vibrations à l'arrivée d'un paquet ou d'un incident, données économes). Les boutons de l'en-tête basculent
// vite ; ce bloc est le réglage durable, gardé sur l'appareil.
import { usePreferences } from '../preferences'
import { Icone } from './Icone'
import { Tg } from './prototype'
import { TailleDuTexte } from './TailleDuTexte'

export function PreferencesDuMenu() {
  const { t, langue, setLangue, choixTheme, setTheme, animationsReduites, setAnimationsReduites, sons, setSons, vibrations, setVibrations, donneesEconomes, setDonneesEconomes } = usePreferences()
  const bascule = (icone: string, libelle: string, aide: string, on: boolean, poser: (v: boolean) => void) => (
    <div className="row e-bascule">
      <Icone nom={icone} taille={20} />
      <span className="grow">
        <b>{t(libelle)}</b>
        <span>{t(aide)}</span>
      </span>
      <Tg on={on} changer={poser} libelle={t(libelle)} />
    </div>
  )
  const choix = <T extends string>(valeur: T, actuel: T, poser: (v: T) => void, libelle: string) => (
    <button type="button" role="radio" aria-checked={valeur === actuel} className={valeur === actuel ? 'on' : ''} onClick={() => poser(valeur)}>
      {t(libelle)}
    </button>
  )
  const titre = (icone: string, libelle: string) => (
    <div className="row-t">
      <Icone nom={icone} taille={20} />
      <span>{t(libelle)}</span>
    </div>
  )
  return (
    <section className="card prefs" data-preferences-menu aria-label={t('Préférences de l’appareil')}>
      {titre('languages', 'Langue')}
      <div className="seg" role="radiogroup" aria-label={t('Langue')}>
        {choix('fr', langue, setLangue, 'Français')}
        {choix('en', langue, setLangue, 'English')}
      </div>
      <TailleDuTexte />
      {titre('moon', 'Thème')}
      <div className="seg" role="radiogroup" aria-label={t('Thème')}>
        {choix('light', choixTheme, setTheme, 'Clair')}
        {choix('dark', choixTheme, setTheme, 'Sombre')}
        {choix('auto', choixTheme, setTheme, 'Automatique')}
      </div>
      {bascule('pause', 'Animations réduites', 'Moins de mouvement à l’écran', animationsReduites, setAnimationsReduites)}
      {titre('volume-2', 'Sons et données')}
      {bascule('volume-2', 'Sons', 'À l’arrivée d’un paquet ou d’un incident', sons, setSons)}
      {bascule('smartphone', 'Vibrations', 'Sur téléphone, avec les sons', vibrations, setVibrations)}
      {bascule('gauge', 'Données économes', 'Cartes et photos plus légères sur réseau mobile', donneesEconomes, setDonneesEconomes)}
    </section>
  )
}
