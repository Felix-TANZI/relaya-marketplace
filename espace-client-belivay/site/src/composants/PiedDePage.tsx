// Pied de page (dès 768 px, DISPOSITION-ECRANS.md § 3.14) : dernier enfant de main, il défile avec la page ; absent
// sur téléphone, comme aujourd'hui, et des écrans sans en-tête de site (lancement, galerie, paiements en cours).
// Quatre colonnes dès 1024 px, deux en tablette portrait : BelivaY, Acheter, Aide, BelivaY et toi. Ligne basse :
// droits, liens légaux, langue et thème (mêmes actions que dans Réglages) ; en tablette portrait, les messages
// du bandeau de confiance (CDS-24) s'y ajoutent. Un module fermé n'a pas de lien (CFS-02). Aucun chiffre ni lien
// inventé : coordonnées officielles et réseaux sociaux de BelivaY (config/coordonnees.ts, remplaçables par le serveur).
import { Link } from 'react-router-dom'
import logo from '../assets/logo-belivay.png'
import { chemin } from '../config/pages'
import type { Interrupteur } from '../config/interrupteurs'
import { F } from '../i18n/format'
import { usePreferences, type ChoixTheme } from '../preferences'
import { useCompteDiaspora, useSession } from '../session'
import { useMenuCoque } from './donneesCoque'
import { Icone } from './Icone'
import { Contacts, Reseaux } from './Reseaux'
import { useCoordonnees } from './contenus'

type Lien = { texte: string; route: string; params?: Record<string, string>; ff?: Interrupteur; sauf?: 'diaspora' }

const ACHETER: Lien[] = [
  { texte: 'Catégories', route: 'categories' },
  { texte: 'Promotions', route: 'promotions' },
  { texte: 'Ventes flash', route: 'ventes-flash', ff: 'FF-FLASH' },
  { texte: 'Sélection', route: 'selection' },
  { texte: 'Premium', route: 'abonnements', ff: 'FF-ABONNEMENT' },
  { texte: 'Listes d’envies', route: 'listes', ff: 'FF-LISTE-ENVIES' },
  { texte: 'Panier famille', route: 'famille', ff: 'FF-EX05' },
  { texte: 'Rentrée', route: 'rentree', ff: 'FF-EX01' },
]
const AIDE: Lien[] = [
  { texte: 'Aide et support', route: 'aide' },
  { texte: 'Questions fréquentes', route: 'faq' },
  { texte: 'Comment ça marche', route: 'bienvenue' },
  { texte: 'Retourner un article', route: 'retour' },
  { texte: 'Mes litiges', route: 'litiges' },
  { texte: 'Être rappelé', route: 'rappel' },
  { texte: 'Connexion et données', route: 'reseau' },
]
const TOI: Lien[] = [
  { texte: 'Devenir vendeur', route: 'devenir-vendeur', sauf: 'diaspora' },
  { texte: 'Comptes diaspora : tout savoir', route: 'diaspora-infos' },
  { texte: 'Offrir un abonnement', route: 'abonnement-offrir', ff: 'FF-ABONNEMENT' },
  { texte: 'Parrainer un proche', route: 'parrainage', ff: 'FF-ABONNEMENT' },
  { texte: 'Pages légales', route: 'legal' },
  { texte: 'Plan du site', route: 'menu' },
]
const LEGAL: [string, string][] = [
  ['Conditions', 'cgu'],
  ['Confidentialité', 'confidentialite'],
  ['Mentions légales', 'mentions'],
]

export function PiedDePage() {
  const { t, tf, langue, setLangue, choixTheme, setTheme } = usePreferences()
  const s = useSession()
  const diaspora = useCompteDiaspora()
  const menu = useMenuCoque()
  const coord = useCoordonnees()
  const ouvert = (l: Lien) => (!l.ff || s.interrupteurs[l.ff]) && !(l.sauf === 'diaspora' && diaspora)
  const colonne = (titre: string, liens: Lien[]) => (
    <div className="pp-col">
      <h2 className="kick">{t(titre)}</h2>
      <ul>
        {liens.filter(ouvert).map((l) => (
          <li key={l.route}>
            <Link to={chemin(l.route, l.params)}>{t(l.texte)}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
  const confiance: [string, string][] = [
    ['shield-check', 'Paiement sécurisé via MoMo · Escrow BelivaY'],
    ['hand-coins', 'Le vendeur est payé après ton retrait'],
    ...(s.bandeau.quartiersExploites > 0 ? [['map-pin', `Retrait au relais dans ${s.bandeau.quartiersExploites} quartiers de Yaoundé`] as [string, string]] : []),
    ...(s.bandeau.seuilRetraitOffert > 0 ? [['gift', `Retrait offert dès ${F(s.bandeau.seuilRetraitOffert)} F d’achat`] as [string, string]] : []),
    ['rotate-ccw', 'Retour gratuit si problème validé'],
  ]
  const support = menu?.support
  return (
    <footer className="pied">
      <div className="pp-in">
        <div className="pp-cols">
          <div className="pp-col pp-marque">
            <Link className="hd-brand" to={chemin('accueil')} aria-label={t('Accueil')}>
              <img src={logo} alt="BelivaY" />
              <small>
                <span>{t('Tout près de toi')}</span>
              </small>
            </Link>
            <p className="pp-accroche">{t(coord.accroche)}</p>
            <p>{t('Ton argent reste bloqué jusqu’à ton retrait au relais : le vendeur n’est payé qu’après.')}</p>
            <h2 className="kick pp-suivre">{t('Nous suivre')}</h2>
            <Reseaux />
          </div>
          {colonne('Acheter', ACHETER)}
          {colonne('Aide', AIDE)}
          <div className="pp-col">
            <h2 className="kick">{t('BelivaY et toi')}</h2>
            <ul>
              {TOI.filter(ouvert).map((l) => (
                <li key={l.route}>
                  <Link to={chemin(l.route, l.params)}>{t(l.texte)}</Link>
                </li>
              ))}
            </ul>
            <ul className="pp-contact">
              {support && (
                <li>
                  <Icone nom="headset" taille={16} />
                  <span>{tf('Support de {o} h à {f} h', { o: support.ouverture, f: support.fermeture })}</span>
                </li>
              )}
              <li>
                <Icone nom="messages-square" taille={16} />
                <Link to={chemin('fil', { id: 'support', st: 'nouveau' })}>{t('Écrire au support')}</Link>
              </li>
            </ul>
            <Contacts />
          </div>
        </div>
        <ul className="pp-confiance">
          {confiance.map(([ic, m]) => (
            <li key={ic}>
              <Icone nom={ic} taille={15} />
              <span>{t(m)}</span>
            </li>
          ))}
        </ul>
        <div className="pp-bas">
          <span>© 2026 BelivaY</span>
          <span className="grow" />
          {LEGAL.map(([texte, d]) => (
            <Link key={d} to={chemin('legal-doc', { d })}>
              {t(texte)}
            </Link>
          ))}
          <div className="pp-choix" role="group" aria-label={t('Langue')}>
            {(['fr', 'en'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={langue === l} className={langue === l ? 'on' : undefined} onClick={() => setLangue(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="pp-choix" role="group" aria-label={t('Thème')}>
            {(
              [
                ['auto', 'Automatique', 'contrast'],
                ['light', 'Clair', 'sun'],
                ['dark', 'Sombre', 'moon'],
              ] as [ChoixTheme, string, string][]
            ).map(([v, texte, ic]) => (
              <button key={v} type="button" aria-pressed={choixTheme === v} className={choixTheme === v ? 'on' : undefined} aria-label={t(texte)} title={t(texte)} onClick={() => setTheme(v)}>
                <Icone nom={ic} taille={16} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
