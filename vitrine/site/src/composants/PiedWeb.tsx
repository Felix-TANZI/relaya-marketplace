// Pied de page réduit des pages web publiques (DISPOSITION-ECRANS.md § 4.7, lot 13) : liste publique, offrir un
// article, cadeau offert, payer depuis l'étranger, suivi du cadeau, participer à une cotisation, offrir un
// abonnement. Celui qui ouvre le lien n'a souvent pas de compte : seulement le légal et le contact, pas de
// navigation du site. Dès 768 px ; rien sur téléphone (le téléphone ne change pas).
import { Link } from 'react-router-dom'
import logo from '../assets/logo-belivay.png'
import { chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { useCoordonnees } from './contenus'
import { useDes } from './ecran'
import { Icone } from './Icone'
import { Reseaux } from './Reseaux'

const LEGAL: [string, string][] = [
  ['Conditions', 'cgu'],
  ['Confidentialité', 'confidentialite'],
  ['Mentions légales', 'mentions'],
]

export function PiedWeb() {
  const { t } = usePreferences()
  const large = useDes('tab')
  const coord = useCoordonnees()
  if (!large) return null
  return (
    <footer className="pied-web">
      <img src={logo} alt="BelivaY" />
      <span>© 2026 BelivaY</span>
      <span className="grow" />
      {LEGAL.map(([texte, d]) => (
        <Link key={d} to={chemin('legal-doc', { d })}>
          {t(texte)}
        </Link>
      ))}
      <Link to={chemin('aide')}>
        <Icone nom="life-buoy" taille={15} />
        {t('Aide et contact')}
      </Link>
      <a href={coord.telephoneLien}>
        <Icone nom="phone" taille={15} />
        <span className="nw">{coord.telephone}</span>
      </a>
      <a href={coord.whatsapp} target="_blank" rel="noopener noreferrer">
        <Icone nom="message-circle" taille={15} />
        {t('WhatsApp')}
      </a>
      <Reseaux classe="rs-petit" />
    </footer>
  )
}
