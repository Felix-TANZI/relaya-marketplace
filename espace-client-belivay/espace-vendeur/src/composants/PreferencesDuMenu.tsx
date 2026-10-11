// Langue (français, anglais : DP-13, Q-44), taille du texte et thème (clair, sombre, automatique) dans le Menu, comme
// le client (Q-45 ; site/src/pages/Menu.tsx : langue, taille du texte, thème). Les boutons de l'en-tête racine du
// prototype restent (en-tête intouchable, DP-54) ; ce bloc est le réglage durable (gardé sur l'appareil).
// Posé par la coque à la fin du Menu tant qu'il est provisoire ; l'écran Menu repris (VD-11) l'inclut lui-même.
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

export function PreferencesDuMenu() {
  const { t, langue, setLangue, taille, setTaille, choixTheme, setTheme } = usePreferences()
  const choix = <T extends string>(valeur: T, actuel: T, poser: (v: T) => void, libelle: string) => (
    <a
      role="radio"
      tabIndex={0}
      aria-checked={valeur === actuel}
      className={valeur === actuel ? 'on' : ''}
      onClick={() => poser(valeur)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), poser(valeur))}
    >
      {t(libelle)}
    </a>
  )
  return (
    <div className="card" style={{ marginTop: '18px' }} data-preferences-menu>
      <div className="row" style={{ gap: '10px' }}>
        <Icone nom="languages" taille={20} />
        <span className="grow b7 t15">{t('Langue')}</span>
      </div>
      <div className="seg" role="radiogroup" aria-label={t('Langue')} style={{ marginTop: '10px' }}>
        {choix('fr', langue, setLangue, 'Français')}
        {choix('en', langue, setLangue, 'English')}
      </div>
      <div className="row" style={{ gap: '10px', marginTop: '16px' }}>
        <span aria-hidden="true" style={{ width: '20px', textAlign: 'center', fontSize: '15px', fontWeight: '800', letterSpacing: '-.02em' }}>
          {t('Aa')}
        </span>
        <span className="grow b7 t15">{t('Taille du texte')}</span>
      </div>
      <div className="seg" role="radiogroup" aria-label={t('Taille du texte')} style={{ marginTop: '10px' }}>
        {choix('normale', taille, setTaille, 'Normale')}
        {choix('grande', taille, setTaille, 'Grande')}
        {choix('tres', taille, setTaille, 'Très grande')}
      </div>
      <div className="row" style={{ gap: '10px', marginTop: '16px' }}>
        <Icone nom="moon" taille={20} />
        <span className="grow b7 t15">{t('Thème')}</span>
      </div>
      <div className="seg" role="radiogroup" aria-label={t('Thème')} style={{ marginTop: '10px' }}>
        {choix('light', choixTheme, setTheme, 'Clair')}
        {choix('dark', choixTheme, setTheme, 'Sombre')}
        {choix('auto', choixTheme, setTheme, 'Automatique')}
      </div>
    </div>
  )
}
