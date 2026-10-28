// Textes légaux communs aux six espaces (pages du client, même domaine : /legal-doc?d=…) : conditions d'utilisation,
// confidentialité, mentions légales. Pour les espaces professionnels (vendeur, entreprise, livreur, relais, console),
// en bas de leur menu ou de leur profil, à côté de la version, dans un autre onglet (une autre application : l'espace
// reste ouvert). Cibles de 44 px de haut (applications de terrain : livreur, relais). Langue : celle de la page (attribut lang de <html>).
import { Fragment } from 'react'

const TEXTES = {
  fr: [
    ['Conditions', 'cgu'],
    ['Confidentialité', 'confidentialite'],
    ['Mentions légales', 'mentions'],
  ],
  en: [
    ['Terms of use', 'cgu'],
    ['Privacy', 'confidentialite'],
    ['Legal notice', 'mentions'],
  ],
} as const

export function LiensLegaux() {
  const en = typeof document !== 'undefined' && document.documentElement.lang.startsWith('en')
  return (
    <p className="liens-legaux" style={{ margin: '8px 0 0', fontSize: '12px', lineHeight: 1.5, textAlign: 'center', opacity: 0.85 }}>
      {TEXTES[en ? 'en' : 'fr'].map(([texte, d], i) => (
        <Fragment key={d}>
          {i > 0 && ' · '}
          <a
            href={'/legal-doc?d=' + d + (en ? '&lang=en' : '')}
            target="_blank"
            rel="noopener"
            style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 4px', color: 'inherit', textDecoration: 'underline' }}
          >
            {texte}
          </a>
        </Fragment>
      ))}
    </p>
  )
}
