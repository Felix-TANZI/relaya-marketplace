// Menu du profil sous l'avatar de l'en-tête racine (lot du 29 sept., demande du porteur) : balisage du prototype
// (#av-pop), ouvert par l'avatar (?pop=profil), fermé par le voile. Les chiffres viennent de la source ; les
// entrées d'un module fermé n'apparaissent pas (CCH-18). Compte diaspora (DP-54) : son espace à la place du
// portefeuille, de la cagnotte, des adresses et de « Devenir vendeur », qui n'ont pas de sens pour lui.
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { chemin } from '../config/pages'
import { useDonnees } from '../donnees/useDonnees'
import { source } from '../donnees/source'
import { F } from '../i18n/format'
import { usePreferences } from '../preferences'
import { useCompteDiaspora, useSession } from '../session'
import { Icone } from './Icone'
import { Dessin } from './Dessin'
import { Module } from './Module'
import { Styles } from './Styles'
import { PhotoClient } from './Profil'
import { useEcran, auMoins } from './ecran'
import { useDeroulant } from './PanneauNotifications'

const Entree = ({ vers, icone, texte, droite }: { vers: string; icone: string; texte: string; droite?: React.ReactNode }) => {
  const { t } = usePreferences()
  return (
    <Link to={vers} className="it" role="menuitem">
      <Icone nom={icone} taille={20} />
      <span className="grow">{t(texte)}</span>
      {droite ?? <Icone nom="chevron-right" taille={16} style={{ color: 'var(--ink-4)' }} />}
    </Link>
  )
}

export function MenuProfil() {
  const { t } = usePreferences()
  const s = useSession()
  const diaspora = useCompteDiaspora()
  const m = useDonnees(() => source.menu())
  const lieu = useLocation()
  const naviguer = useNavigate()
  // Dès 768 px (DISPOSITION-ECRANS.md § 3.7) : menu déroulant ancré sous l'avatar de l'en-tête de site, sans voile
  // sombre ; focus sur la première entrée, flèches haut et bas, Tab qui circule, Échap ou clic dehors qui ferme.
  // En tablette portrait seulement, Langue et Thème s'y ajoutent (l'en-tête ne les montre pas à ce palier).
  const ecran = useEcran()
  const large = auMoins(ecran, 'tab')
  const { langue, setLangue, theme, setTheme } = usePreferences()
  const fermer = () => {
    const p = new URLSearchParams(lieu.search)
    p.delete('pop')
    naviguer({ pathname: lieu.pathname, search: p.toString() }, { replace: true })
  }
  const { boite, clavier } = useDeroulant(fermer, '.hs-compte', large && !!m)
  if (!s.client || !m) return null
  const bd = (n: number, texte?: string) => (n > 0 ? <span className="bd">{t(texte ?? String(n))}</span> : undefined)
  return (
    <>
      <Styles id="0b0ccec1e3" />
      <div id="av-pop-veil" onClick={fermer}></div>
      <div id="av-pop" role="menu" aria-label={t('Menu du profil')} ref={boite} onKeyDown={clavier}>
        <Link to={chemin('compte')} className="hd" role="menuitem">
          <span className="pp">
            {/* Photo de la cliente (DP-52), sinon le portrait de la démonstration (dessin du prototype à 52 px). */}
            <span className="portrait" style={{ width: '52px', height: '52px' }}>
              <PhotoClient>
                <Dessin id="bf61b89c1cc1" />
              </PhotoClient>
            </span>
          </span>
          <span>
            <b>{t(s.client.nomComplet)}</b>
            <small>{t(s.client.emailMasque)}</small>
          </span>
        </Link>
        <div className="ls">
          <Entree vers={chemin('compte')} icone="user-round" texte="Mon compte" />
          <Entree vers={chemin('commandes')} icone="package" texte="Mes commandes" droite={bd(m.commandes.aRetirer, `${m.commandes.aRetirer} à retirer`)} />
          <Entree vers={chemin('sauvegardes')} icone="heart" texte="Sauvegardés" droite={bd(m.sauvegardesSuivis)} />
          {/* DP-54 : tout compte (Cameroun ou diaspora) crée ses listes, les met en statut et se fait offrir. */}
          <Module ff="FF-LISTE-ENVIES">
            <Entree vers={chemin('listes')} icone="gift" texte="Mes listes d’envies" />
          </Module>
          <Entree vers={chemin('messagerie')} icone="messages-square" texte="Messages" droite={bd(m.messagesNonLus)} />
          <Entree vers={chemin('recus')} icone="inbox" texte="Reçus" droite={bd(m.recusATraiter ?? 0)} />
          {diaspora ? (
            <>
              <Entree vers={chemin('espace-diaspora')} icone="globe" texte="Espace diaspora" />
              <Entree vers={chemin('paniers-proches')} icone="inbox" texte="À payer pour mes proches" />
              <Entree vers={chemin('proches')} icone="users" texte="Mes proches" />
            </>
          ) : (
          <Module ff="FF-WALLET">
            <Link to={chemin('wallet')} className="it wl" role="menuitem">
              <Icone nom="wallet" taille={20} />
              <span className="grow">{t('Wallet BelivaY')}</span>
              <span className="v">{t(F(m.portefeuille.solde) + ' F')}</span>
            </Link>
          </Module>
          )}
          <div className="kk">{t('Mon activité')}</div>
          <Entree vers={chemin('notifications')} icone="bell" texte="Notifications" droite={bd(m.notificationsNouvelles)} />
          {!diaspora && <Module ff="FF-ABONNEMENT">
            <Link to={chemin('cagnotte')} className="it" role="menuitem">
              <Icone nom="piggy-bank" taille={20} />
              <span className="grow">{t('Cagnotte')}</span>
              <span className="v">{t(F(m.portefeuille.cagnotteEnAttente) + ' F')}</span>
            </Link>
          </Module>}
          {!diaspora && <Module ff="FF-ABONNEMENT">
            <Entree vers={chemin('parrainage')} icone="gift" texte="Parrainage" />
          </Module>}
          <Module ff="FF-FLASH">
            <Entree vers={chemin('ventes-flash')} icone="zap" texte="Flash Deals" />
          </Module>
          <Entree vers={chemin('promotions')} icone="percent" texte="Promotions" />
          <div className="kk">{t('Paramètres du compte')}</div>
          {!diaspora && <Entree vers={chemin('adresses')} icone="map-pin" texte="Mes adresses" />}
          <Entree vers={chemin('reglages')} icone="settings" texte={diaspora ? 'Réglages et devise' : 'Réglages'} />
          {!diaspora && <Entree vers={chemin('devenir-vendeur')} icone="store" texte="Devenir vendeur" />}
          {ecran === 'tab' && (
            <>
              <button type="button" className="it" role="menuitem" onClick={() => setLangue(langue === 'en' ? 'fr' : 'en')}>
                <Icone nom="languages" taille={20} />
                <span className="grow">{t('Langue')}</span>
                <span className="v">{langue === 'en' ? 'EN' : 'FR'}</span>
              </button>
              <button type="button" className="it" role="menuitem" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                <Icone nom={theme === 'dark' ? 'sun' : 'moon'} taille={20} />
                <span className="grow">{t(theme === 'dark' ? 'Thème clair' : 'Thème sombre')}</span>
              </button>
            </>
          )}
          <Link to={chemin('connexion')} className="it out" role="menuitem">
            <Icone nom="log-out" taille={20} />
            <span className="grow">{t('Déconnexion')}</span>
          </Link>
        </div>
      </div>
    </>
  )
}
