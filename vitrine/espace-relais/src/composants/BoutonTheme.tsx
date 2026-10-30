// Thème et langue de la barre du haut (en-tête du porteur, 24 oct.) : la MÊME méthode et le même rendu que la console
// d'administration et l'espace entreprise (espace-admin/src/composants/coque.tsx, styles/vie.css) :
// - thème : pastille ronde entière de 44 px, l'icône du thème où l'on irait (lune en clair, soleil en sombre) ; bouton
//   bascule « Thème sombre » dont aria-pressed dit l'état ;
// - langue : pilule segmentée FR | EN de même hauteur, un curseur en relief sous la langue choisie, l'autre en retrait.
// Styles : « Barre du haut » de styles/relais.css ; couleurs : jetons.css (--vie-*).
import { usePreferences } from '../preferences'

export function BoutonTheme() {
  const { t, theme, setTheme } = usePreferences()
  const sombre = theme === 'dark'
  return (
    <button type="button" className={'r-theme vie-theme ' + (sombre ? 'nuit' : 'jour')} onClick={() => setTheme(sombre ? 'light' : 'dark')} aria-label={t('Thème sombre')} aria-pressed={sombre} title={t(sombre ? 'Thème clair' : 'Thème sombre')}>
      <span className="vt-ic vt-soleil" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity=".25" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </span>
      <span className="vt-ic vt-lune" aria-hidden="true">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" fill="currentColor" fillOpacity=".12" />
        </svg>
      </span>
    </button>
  )
}

export function BoutonLangue() {
  const { t, langue, setLangue } = usePreferences()
  const en = langue === 'en'
  return (
    <button type="button" className={'lang vie-lang ' + (en ? 'en' : 'fr')} onClick={() => setLangue(en ? 'fr' : 'en')} aria-label={t(en ? 'Passer en français' : 'Passer en anglais')}>
      <i className="vl-curseur" aria-hidden="true"></i>
      <span className={'vl-o' + (en ? '' : ' on')} aria-hidden="true">
        FR
      </span>
      <span className={'vl-o' + (en ? ' on' : '')} aria-hidden="true">
        EN
      </span>
    </button>
  )
}
