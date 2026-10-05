// La coque de l'application, balisage de rootHeader, subHeader, dock et screen du prototype (CL-01) :
// mêmes balises, mêmes classes, même ordre. La navigation de chaque route (type d'en-tête, parent, élément
// de droite, barre du bas, marge haute) vient du prototype en marche (genere/navigation.json).
import { createContext, createElement, Fragment, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import chariot from '../assets/chariot-belivay.png'
import logo from '../assets/logo-belivay.png'
import { ETATS, useCleEtat, type Noeud } from '../config/etats'
import { ARIANE, NAVIGATION, ONGLETS, TITRES_ARIANE, adresseDuSite, chemin, type ActionEntete, type Navigation, type Onglet } from '../config/pages'
import stylesEcrans from '../genere/styles-ecrans.json'
import { F, badge } from '../i18n/format'
import { usePreferences } from '../preferences'
import { useSession } from '../session'
import { Icone } from './Icone'
import { interagir } from './interactions'
import { useBulle } from './BarreBas'
import { FeuillePourQui } from './PourQui'
import { MenuProfil } from './MenuProfil'
import { BandeauHorsLigne, Illustration } from './socle'
import { Portrait } from './Profil'
import { ColonneCategories, useEtatColonne } from './ColonneCategories'
import { useMenuCoque } from './donneesCoque'
import { auMoins, useEcran } from './ecran'
import { FilAriane, parentsDe } from './FilAriane'
import { Gabarit, LARGEUR_DE, Zone, type FormeGabarit, type Largeur } from './Gabarits'
import { CarteIdentite, MenuCompte } from './MenuCompte'
import { NavSite } from './NavSite'
import { PanneauNotifications } from './PanneauNotifications'
import { PiedDePage } from './PiedDePage'
import { RechercheSite } from './RechercheSite'
import type { Palier } from './ecran'

// Styles que le prototype insère dans l'écran (outils/styles.mjs), insérés de même, dans le même ordre.
const BLOCS = import.meta.glob('../styles/ecrans/*.css', { query: '?inline', import: 'default', eager: true }) as Record<string, string>
const STYLES = stylesEcrans as Record<string, string[]>
const blocsDe = (route: string) => (STYLES[route] || []).map((h) => BLOCS[`../styles/ecrans/${h}.css`])

// En-tête racine (CNV-04) : bandeau rotatif de cinq messages vrais (CDS-24), menu, logo et « Tout près de
// toi », cloche, panier, avatar ; la recherche sur l'accueil, les catégories et Mes commandes.
const avecMenu = (recherche: string) => {
  const p = new URLSearchParams(recherche)
  p.set('pop', 'profil')
  return p.toString()
}

// Logo vers l'accueil : déjà sur l'accueil, il le dit (aria-current) et remonte en haut de la page en douceur, sans
// nouvelle navigation ni nouveau rendu.
function logoAccueil(chemin: string) {
  if (chemin !== '/') return {}
  return {
    'aria-current': 'page' as const,
    onClick: (e: MouseEvent) => {
      e.preventDefault()
      const doux = !document.documentElement.dataset.anim && !matchMedia('(prefers-reduced-motion: reduce)').matches
      document.querySelector('#app main')?.scrollTo({ top: 0, behavior: doux ? 'smooth' : 'auto' })
    },
  }
}

export function EnTeteRacine({ recherche, etat }: { recherche: boolean; etat?: { nonLus: string | null; panier: string | null; invite: boolean } }) {
  const { t } = usePreferences()
  const s = useSession()
  const lieu = useLocation()
  const bandeau: [string, string][] = [
    // Compte diaspora (DP-54) : il paie par carte, son proche retire.
    ['shield-check', s.connecte && s.typeCompte === 'diaspora' ? 'Paiement sécurisé par carte · Escrow BelivaY' : 'Paiement sécurisé via MoMo · Escrow BelivaY'],
    ['hand-coins', s.connecte && s.typeCompte === 'diaspora' ? 'Le vendeur est payé après le retrait par ton proche' : 'Le vendeur est payé après ton retrait'],
    ...(s.bandeau.quartiersExploites > 0 ? [['map-pin', `Retrait au relais dans ${s.bandeau.quartiersExploites} quartiers de Yaoundé`] as [string, string]] : []),
    ...(s.bandeau.seuilRetraitOffert > 0 ? [['gift', `Retrait offert dès ${F(s.bandeau.seuilRetraitOffert)} F d’achat`] as [string, string]] : []),
    ['rotate-ccw', 'Retour gratuit si problème validé'],
  ]
  // Un écran construit suit son état (nouveau client sans badges, visiteur) ; sinon, la session.
  const nonLus = etat ? etat.nonLus : badge(s.badges.nonLus)
  const panier = etat ? etat.panier : badge(s.badges.panier)
  const connecte = etat ? !etat.invite : s.connecte
  return (
    <header className="hd glass">
      <div className="hd-strip tick" role="marquee">
        {bandeau.map(([ic, m], i) => (
          <span key={i} className="tk" style={{ animationDelay: i * 4 + 's' }}>
            <Icone nom={ic} taille={14} />
            <span>{t(m)}</span>
          </span>
        ))}
      </div>
      <div className="hd-row">
        <Link className="ibtn" to={chemin('menu')} aria-label={t('Menu')}>
          <Icone nom="menu" taille={24} />
        </Link>
        <Link className="hd-brand" to={chemin('accueil')} aria-label={t('Accueil')} {...logoAccueil(lieu.pathname)}>
          <img src={logo} alt="BelivaY" />
          <small>
            <span>{t('Tout près de toi')}</span>
          </small>
        </Link>
        <span className="hd-sp" />
        <Link className="ibtn" to={chemin('notifications')} aria-label={t('Notifications')}>
          <Icone nom="bell" taille={22} />
          {nonLus && <span className="bdg">{nonLus}</span>}
        </Link>
        <Link className="ibtn" to={chemin('panier')} aria-label={t('Panier')}>
          <Icone nom="shopping-cart" taille={22} />
          {panier && <span className="bdg">{panier}</span>}
        </Link>
        {connecte && s.client ? (
          // L'avatar ouvre le menu du profil (?pop=profil), comme dans le prototype.
          <Link className="hd-av" to={{ pathname: lieu.pathname, search: avecMenu(lieu.search) }} replace aria-label={t('Mon compte')}>
            <Portrait taille={36}>
              <Illustration image={s.client.portrait[36]} classe="portrait" style={{ width: 36, height: 36 }} />
            </Portrait>
          </Link>
        ) : (
          <Link className="hd-av guest" to={chemin('connexion')} aria-label={t('Se connecter')}>
            <Icone nom="user-round" taille={20} />
          </Link>
        )}
      </div>
      {recherche && (
        // Pas d'entonnoir : les filtres ne s'ouvrent qu'après une recherche (CRE-37).
        <div className="srch glass">
          <Link className="srch-a" to={chemin('recherche')} aria-label={t('Rechercher')}>
            <Icone nom="search" taille={19} />
            <span className="grow">{t('Rechercher un produit, une marque…')}</span>
          </Link>
          <Link className="srch-mic" to={chemin('recherche', { st: 'voix' })} aria-label={t('Recherche vocale')}>
            <Icone nom="mic" taille={19} />
          </Link>
          <Link className="srch-go" to={chemin('recherche')} aria-label={t('Lancer la recherche')}>
            <Icone nom="search" taille={20} trait={2.4} />
          </Link>
        </div>
      )}
    </header>
  )
}

// En-tête de site des grands écrans (dès 768 px, DISPOSITION-ECRANS.md § 3.2) : un seul en-tête, collant, pour les
// pages à en-tête racine et enfant. Il reprend les éléments de l'en-tête racine (bandeau, logo, cloche, panier,
// avatar, recherche) avec leurs classes, icônes, badges et verre. Ordre : [menu (tablette portrait)] logo, recherche
// (vrai champ), [langue, thème (dès 1200)], notifications (panneau), panier, [favoris (dès 1024)], compte (avatar,
// prénom dès 1200, chevron : menu du profil ; visiteur : « Vendre sur BelivaY » (dès 1200), « Se connecter » et
// « Créer un compte » dès 1024, l'icône seule en tablette portrait). Ordre des captures d'inspiration (il prime sur le
// document). Bandeau de confiance et barre de navigation dès 1024.
export function EnTeteSite({ etat }: { etat?: { nonLus: string | null; panier: string | null; invite: boolean } }) {
  const { t, langue, setLangue, theme, setTheme } = usePreferences()
  const s = useSession()
  const lieu = useLocation()
  const ecran = useEcran()
  const tabL = auMoins(ecran, 'tab-l')
  const pc = auMoins(ecran, 'pc')
  const menu = useMenuCoque(tabL && s.connecte)
  const nonLus = etat ? etat.nonLus : badge(s.badges.nonLus)
  const panier = etat ? etat.panier : badge(s.badges.panier)
  const connecte = etat ? !etat.invite : s.connecte
  const pop = new URLSearchParams(lieu.search).get('pop')
  const vers = (nom: string) => {
    const p = new URLSearchParams(lieu.search)
    if (pop === nom) p.delete('pop')
    else p.set('pop', nom)
    return { pathname: lieu.pathname, search: p.toString() }
  }
  const bandeau: [string, string][] = [
    // Compte diaspora (DP-54) : il paie par carte, son proche retire.
    ['shield-check', s.connecte && s.typeCompte === 'diaspora' ? 'Paiement sécurisé par carte · Escrow BelivaY' : 'Paiement sécurisé via MoMo · Escrow BelivaY'],
    ['hand-coins', s.connecte && s.typeCompte === 'diaspora' ? 'Le vendeur est payé après le retrait par ton proche' : 'Le vendeur est payé après ton retrait'],
    ...(s.bandeau.quartiersExploites > 0 ? [['map-pin', `Retrait au relais dans ${s.bandeau.quartiersExploites} quartiers de Yaoundé`] as [string, string]] : []),
    ...(s.bandeau.seuilRetraitOffert > 0 ? [['gift', `Retrait offert dès ${F(s.bandeau.seuilRetraitOffert)} F d’achat`] as [string, string]] : []),
    ['rotate-ccw', 'Retour gratuit si problème validé'],
  ]
  // Compte neuf montré en démonstration (« /compte?st=nouveau ») : pas de favori, comme la page.
  const neuf = lieu.pathname === chemin('compte') && new URLSearchParams(lieu.search).get('st') === 'nouveau'
  const favoris = menu && !neuf ? badge(menu.sauvegardesSuivis) : null
  return (
    <header className="hd hd-site glass">
      {tabL && (
        <div className="hd-strip tick" role="marquee">
          {bandeau.map(([ic, m], i) => (
            <span key={i} className="tk" style={{ animationDelay: i * 4 + 's' }}>
              <Icone nom={ic} taille={14} />
              <span>{t(m)}</span>
            </span>
          ))}
        </div>
      )}
      <div className="hs-row">
        {!tabL && (
          <Link className="ibtn" to={chemin('menu')} aria-label={t('Menu')}>
            <Icone nom="menu" taille={24} />
          </Link>
        )}
        <Link className="hd-brand" to={chemin('accueil')} aria-label={t('Accueil')} {...logoAccueil(lieu.pathname)}>
          <img src={logo} alt="BelivaY" />
          <small>
            <span>{t('Tout près de toi')}</span>
          </small>
        </Link>
        <RechercheSite />
        <span className="hd-sp" />
        {pc && (
          <>
            <button type="button" className="hs-txt" aria-label={t(langue === 'en' ? 'Passer en français' : 'Passer en anglais')} onClick={() => setLangue(langue === 'en' ? 'fr' : 'en')}>
              <Icone nom="globe" taille={19} />
              <span>{langue === 'en' ? 'EN' : 'FR'}</span>
            </button>
            {s.typeCompte === 'diaspora' && s.devise && (
              <Link className="hs-txt" to={chemin('reglages')} aria-label={t('Devise d’affichage')}>
                <span>{s.devise}</span>
              </Link>
            )}
            <button type="button" className="ibtn" aria-label={t(theme === 'dark' ? 'Thème clair' : 'Thème sombre')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              <Icone nom={theme === 'dark' ? 'sun' : 'moon'} taille={21} />
            </button>
          </>
        )}
        {connecte ? (
          <Link className="ibtn hs-cloche" to={vers('notifs')} replace aria-label={t('Notifications')} aria-haspopup="dialog" aria-expanded={pop === 'notifs'}>
            <Icone nom="bell" taille={22} />
            {nonLus && <span className="bdg">{nonLus}</span>}
          </Link>
        ) : (
          <Link className="ibtn" to={chemin('notifications')} aria-label={t('Notifications')}>
            <Icone nom="bell" taille={22} />
          </Link>
        )}
        <Link className="ibtn" to={chemin('panier')} aria-label={t('Panier')}>
          <Icone nom="shopping-cart" taille={22} />
          {panier && <span className="bdg">{panier}</span>}
        </Link>
        {tabL && (
          <Link className="ibtn" to={chemin('sauvegardes')} aria-label={t('Sauvegardés')}>
            <Icone nom="heart" taille={22} />
            {favoris && <span className="bdg">{favoris}</span>}
          </Link>
        )}
        {connecte && s.client ? (
          <Link className="hs-compte" to={vers('profil')} replace aria-label={t('Mon compte')} aria-haspopup="menu" aria-expanded={pop === 'profil'}>
            <span className="hd-av">
              <Portrait taille={36}>
                <Illustration image={s.client.portrait[36]} classe="portrait" style={{ width: 36, height: 36 }} />
              </Portrait>
            </span>
            {pc && <span className="hs-nom">{t(s.client.prenom)}</span>}
            <Icone nom="chevron-down" taille={16} />
          </Link>
        ) : tabL ? (
          <>
            {auMoins(ecran, 'pc') && (
              <Link className="hs-lien" to={chemin('devenir-vendeur')}>
                {t('Vendre sur BelivaY')}
              </Link>
            )}
            <Link className="hs-lien" to={chemin('connexion')}>
              {t('Se connecter')}
            </Link>
            <Link className="btn primary sm hs-insc" to={chemin('connexion', { mode: 'inscription' })}>
              {t('Créer un compte')}
            </Link>
          </>
        ) : (
          <Link className="hd-av guest" to={chemin('connexion')} aria-label={t('Se connecter')}>
            <Icone nom="user-round" taille={20} />
          </Link>
        )}
      </div>
      {tabL && <NavSite />}
    </header>
  )
}

// Lien d'évitement (§ 3.15) : visible au focus seulement, il mène au contenu (main).
function LienEvitement() {
  const { t } = usePreferences()
  return (
    <a
      href="#contenu"
      className="evitement"
      onClick={(e) => {
        e.preventDefault()
        document.querySelector<HTMLElement>('#app main')?.focus()
      }}
    >
      {t('Aller au contenu')}
    </a>
  )
}

// En-tête enfant (CNV-03, CNV-10) : retour vers le parent naturel (un lien, pas l'historique), titre et
// sous-titre, puis à droite le panier, le chariot du logo vers l'accueil (CDS-04) ou l'action de l'écran.
export function EnTeteEnfant(p: {
  titre: ReactNode
  sousTitre?: string | null
  sousTitreNoeuds?: Noeud[]
  classe?: string // classe en plus, propre à une famille d'écrans (ex. cl07-hd du panier)
  avant?: ReactNode // bloc au-dessus de la ligne de titre (ex. bandeau de réassurance du panier)
  retour: string
  droite: 'panier' | 'accueil' | 'propre' | null
  action?: ReactNode
  actionPrototype?: ActionEntete
  // Grands écrans (DISPOSITION-ECRANS.md § 3.4) : la même ligne de titre devient la barre de titre de la page, en
  // tête du contenu (pas de verre, pas fixée), avec le fil d'Ariane (dès 1024 px) et le nom du parent écrit à côté
  // du chevron. Le panier et le chariot vers l'accueil sont dans l'en-tête de site : masqués ici.
  enPage?: { fil: ReactNode; nomRetour: string | null }
}) {
  const { t } = usePreferences()
  const panier = badge(useSession().badges.panier)
  const Balise = p.enPage ? 'div' : 'header'
  return (
    <Balise className={p.enPage ? 'hd-page' + (p.classe ? ' ' + p.classe : '') : 'hd glass' + (p.classe ? ' ' + p.classe : '')}>
      {p.avant}
      {p.enPage?.fil}
      <div className="hd-sub">
        <Link className="ibtn" to={p.retour} aria-label={t('Revenir')}>
          <Icone nom="chevron-left" taille={22} />
          {p.enPage?.nomRetour && <span className="hd-ret">{t(p.enPage.nomRetour)}</span>}
        </Link>
        <h1>
          {typeof p.titre === 'string' ? t(p.titre) : p.titre}
          {p.sousTitreNoeuds ? (
            <small>
              <Noeuds liste={p.sousTitreNoeuds} />
            </small>
          ) : (
            p.sousTitre && <small>{t(p.sousTitre)}</small>
          )}
        </h1>
        {p.droite === 'panier' && !p.enPage && (
          <Link className="ibtn cart" to={chemin('panier')} aria-label={t('Panier')}>
            <Icone nom="shopping-cart" taille={22} />
            {panier && <span className="bdg">{panier}</span>}
          </Link>
        )}
        {p.droite === 'accueil' && !p.enPage && (
          <Link className="ibtn hd-mark" to={chemin('accueil')} aria-label={t('BelivaY · accueil')}>
            <img src={chariot} alt="" width={33} height={32} style={{ display: 'block', width: 33, height: 32 }} />
          </Link>
        )}
        {p.droite === 'propre' && (p.action ?? (p.actionPrototype && <Action a={p.actionPrototype} />))}
        {/* Barre de titre de page (grands écrans) : l'action de l'écran se pose à droite du titre partout, même quand
            l'en-tête du téléphone a le panier ou le chariot à droite (masqués ici). */}
        {p.enPage && p.droite !== 'propre' && p.action}
      </div>
    </Balise>
  )
}

// Nœuds relevés (sous-titre) : chaque texte par t(), les éléments avec leur classe.
function Noeuds({ liste }: { liste: Noeud[] }) {
  const { t } = usePreferences()
  return (
    <>
      {liste.map((n, i) =>
        'texte' in n ? <Fragment key={i}>{t(n.texte)}</Fragment> : createElement(n.balise, { key: i, className: n.classe ?? undefined }, <Noeuds liste={n.enfants} />),
      )}
    </>
  )
}

// Action propre à l'écran, telle que le prototype la dessine (lien ou bouton avec son icône).
function Action({ a }: { a: ActionEntete }) {
  const { t, langue, setLangue } = usePreferences()
  const icone = a.icone && <Icone nom={a.icone} taille={a.taille ?? 22} />
  if (a.balise === 'span') return <span className={a.classe} aria-hidden="true" />
  if (a.balise === 'button')
    // Seul bouton relevé : le choix de langue des pages publiques (FR · EN).
    return (
      <button type="button" className={a.classe} aria-label={a.aria ? t(a.aria) : undefined} onClick={() => setLangue(langue === 'en' ? 'fr' : 'en')}>
        {langue === 'en' ? 'EN' : 'FR'}
      </button>
    )
  return (
    // « Partager le panier » relevé du prototype (#panier?st=partage, état sans écran) : le partage du panier se fait
    // dans « Un proche paie pour toi » (/diaspora), comme le bouton du panier.
    <Link className={a.classe} to={a.adresse === '#panier?st=partage' ? chemin('diaspora') : adresseDuSite(a.adresse || '#accueil')} aria-label={a.aria ? t(a.aria) : undefined}>
      {icone}
      {a.texte && t(a.texte)}
    </Link>
  )
}

// Barre du bas (CNV-01) : cinq onglets ; badges du serveur (CNV-07). Bulle de verre qu'on fait glisser
// (BarreBas.tsx) : au repos, la barre reste celle du prototype.
export function BarreDuBas({ actif, calme, etat }: { actif: string | null; calme?: boolean; etat?: { panier: string | null; compte: string | null } }) {
  const { t } = usePreferences()
  const { badges } = useSession()
  const nombres: Record<string, number> = calme ? {} : { panier: badges.panier, compte: badges.compte }
  const bulle = useBulle(
    ONGLETS.map((o) => chemin(o.id)),
    ONGLETS.findIndex((o) => o.id === actif),
  )
  // Un écran construit suit les badges de son état (panier vide…) ; sinon, la session.
  const badgeDe = (id: string) => (etat ? ((etat as Record<string, string | null>)[id] ?? null) : badge(nombres[id] ?? 0))
  return (
    <nav className={'dock glass' + (bulle.bouge ? ' bouge' : '')} aria-label={t('Navigation principale')} {...bulle.props}>
      {ONGLETS.map((o) => {
        const b = badgeDe(o.id)
        const on = o.id === actif
        return (
          <Link key={o.id} className={'tab' + (on ? ' on' : '')} to={chemin(o.id)} aria-current={on ? 'page' : undefined}>
            <Icone nom={o.icone} taille={22} />
            <span>{t(o.titre)}</span>
            {b && <span className="bdg">{b}</span>}
          </Link>
        )
      })}
      {bulle.lentille(
        ONGLETS.map((o) => {
          const b = badgeDe(o.id)
          return (
            <span key={o.id} className="tab-copie">
              <Icone nom={o.icone} taille={22} />
              <span>{t(o.titre)}</span>
              {b && <span className="bdg">{b}</span>}
            </span>
          )
        }),
      )}
    </nav>
  )
}

// Feuille posée sur un autre écran (cl03Under du prototype) : l'écran de dessous reçoit la feuille après ses
// éléments fixes, et les classes de #app de l'état (fixed : l'écran de dessous ne défile pas).
export const FeuillePosee = createContext<{ fixes: ReactNode; classes: string[] } | null>(null)

// Un écran (screen() du prototype) : en-tête, contenu, barre du bas, éléments fixes de l'écran.
// Famille du panier (CL-07) : bandeau de réassurance fixe, sur nuit, en tête du panier (CDS-24) et titre
// « Mon panier · n articles » (n = somme des quantités, celle du badge, CPN-56).
const ENTETE_PANIER = new Set(['panier', 'panier-retrait', 'paiement-moyen', 'xp-pay'])

// Paiement en cours et ses suites (CL-08) : sur grand écran, ni en-tête de site ni navigation (on ne quitte pas un
// paiement d'un clic), mais un en-tête minimal cohérent avec le site : le logo (vers l'accueil) et l'aide.
const ENTETE_MINIMAL = new Set(['paiement-attente', 'paiement-echec', 'prix-change', 'confirmee', 'validee'])
function EnTeteMinimal() {
  const { t } = usePreferences()
  const lieu = useLocation()
  return (
    <header className="hd-min">
      <Link className="hd-brand" to={chemin('accueil')} aria-label={t('Accueil')} {...logoAccueil(lieu.pathname)}>
        <img src={logo} alt="BelivaY" />
      </Link>
      <span className="hd-min-s">
        <Icone nom="shield-check" taille={16} />
        <span>{t('Paiement sécurisé via MoMo · Escrow BelivaY')}</span>
      </span>
      <Link className="hd-min-a" to={chemin('aide')}>
        <Icone nom="life-buoy" taille={18} />
        <span>{t('Aide')}</span>
      </Link>
    </header>
  )
}
function BandeauPanier() {
  const { t } = usePreferences()
  return (
    <div className="cl07-strip">
      <i>
        <Icone nom="lock" taille={14} />
      </i>
      <span>{t('Paiement sécurisé via MoMo · Escrow BelivaY')}</span>
    </div>
  )
}
// texte : celui de l'état (null : panier vide, sans compte) ; à défaut, le badge de la session.
function TitrePanier({ texte }: { texte?: string | null }) {
  const { t } = usePreferences()
  const n = useSession().badges.panier
  if (texte === null) return <>{t('Mon panier')}</>
  return (
    <>
      {t('Mon panier ')}
      <span className="n">{t(texte ?? `· ${n} ${n > 1 ? 'articles' : 'article'}`)}</span>
    </>
  )
}

export function Ecran(p: {
  route: string
  navigation?: Navigation // à défaut, celle de la route relevée dans le prototype
  // Écran construit à l'étape 6 : en-tête, barre du bas, marges et classes suivent l'état affiché
  // (genere/etats.json) ; ses blocs de styles sont à leur place dans le contenu (<Styles>).
  parEtat?: boolean
  // État du prototype dont l'écran prend l'en-tête, la barre et les marges, quand ses données le décident
  // (DP-53 : « ?st=modifier&id=… » garde l'en-tête de « adresses?st=modifier ») ; à défaut, celui de l'adresse.
  etat?: string
  titre?: string // à défaut, le titre relevé dans le prototype (ou le nom du registre)
  ariane?: string // grands écrans : parent du fil d'Ariane et du retour nommé, s'il dépend de l'état affiché
  sousTitre?: string | null
  action?: ReactNode // action propre à l'écran, à droite de l'en-tête enfant
  styleMain?: CSSProperties
  avant?: ReactNode // ce que l'écran place avant l'en-tête (blocs de styles, bandeau)
  fixes?: ReactNode // éléments fixes après la barre du bas (feuilles, barres flottantes)
  // Grands écrans (DISPOSITION-ECRANS.md § 4, composants/Gabarits.tsx) : gabarit de la page, conteneur, colonnes.
  // Sans effet sous 768 px : le téléphone garde son flux, au pixel.
  gabarit?: FormeGabarit
  largeur?: Largeur // conteneur ; à défaut, celui du gabarit, sinon « etroit » (colonne du téléphone centrée)
  des?: Palier // palier où le gabarit se met en colonnes, s'il diffère du sien (maître-détail dès 1024 : 'tab-l')
  inverse?: boolean // colonnes : aside à gauche (avis)
  asideEnTete?: boolean // colonnes : en tablette portrait, l'aside avant le contenu (montants à payer)
  gauche?: ReactNode // catalogue : remplace la colonne Catégories (page Catégories : sa liste d'univers)
  etiquetteGauche?: string // nom accessible de la colonne gauche quand elle remplace les Catégories (« Filtres »)
  droite?: ReactNode // catalogue : colonne droite de l'accueil (dès 1200)
  enteteSite?: boolean // écran sans en-tête (« aucun ») qui prend tout de même l'en-tête de site sur grand écran
  pied?: boolean // false : pas de pied de page (paiement en cours…)
  children?: ReactNode
}) {
  const { t, setLangue, setTheme, setTaille, langue, theme } = usePreferences()
  const ecran = useEcran()
  const lieu = useLocation()
  const naviguer = useNavigate()
  const posee = useContext(FeuillePosee)
  const sessionEcran = useSession()
  const cle = useCleEtat(p.route)
  const etat = p.parEtat ? (ETATS[p.etat ?? cle] ?? ETATS[p.route]) : undefined
  const base = p.navigation ?? NAVIGATION[p.route]
  const nav: Navigation = etat
    ? {
        ...base,
        entete: etat.entete,
        titre: etat.titre ?? base.titre,
        sousTitre: etat.sousTitre,
        margeHaute: etat.margeHaute,
        styleMain: etat.styleMain || undefined,
        classesApp: etat.classesApp,
        droite: etat.droite,
        action: etat.action,
        recherche: etat.recherche,
        barre: etat.barre,
        calme: etat.calme,
        onglet: etat.onglet as Onglet | null,
      }
    : base
  // En-tête du panier : celui que l'état relevé porte (« Avant de payer » de la première commande n'en a pas,
  // une feuille posée sur le panier l'a) ; sans relevé, sur les écrans du panier.
  const entetePanier = etat ? !!etat.classeEntete?.includes('cl07-hd') : ENTETE_PANIER.has(p.route)
  const retour = etat ? (etat.retour ? adresseDuSite(etat.retour) : chemin('accueil')) : chemin(nav.retour || 'accueil')
  const titre = p.titre ?? nav.titre
  const sousTitre = p.sousTitre !== undefined ? p.sousTitre : nav.sousTitre
  useEffect(() => {
    document.title = t(titre) + ' · BelivaY'
  }, [titre, t])
  // Aperçu d'une taille de texte sur un écran (&txt=grande|tres, CL-13) : le temps de cet écran seulement.
  const apercuTexte = new URLSearchParams(lieu.search).get('txt')
  useEffect(() => {
    if (!p.parEtat || (apercuTexte !== 'grande' && apercuTexte !== 'tres')) return
    const avant = document.documentElement.dataset.text
    document.documentElement.dataset.text = apercuTexte
    return () => {
      if (avant !== undefined) document.documentElement.dataset.text = avant
    }
  }, [p.parEtat, apercuTexte])
  // Grands écrans : en-tête de site (racine et enfant), barre de titre de page (enfant), pied de page, gabarit.
  const large = auMoins(ecran, 'tab')
  const site = large && (nav.entete === 'racine' || nav.entete === 'enfant' || !!p.enteteSite)
  const tabL = auMoins(ecran, 'tab-l')
  const pop = new URLSearchParams(lieu.search).get('pop')
  const [etatCat, changerCat, catALaMain] = useEtatColonne()
  // main reçoit le focus à chaque changement de page (Espace, Page suivante et les flèches font défiler la page).
  const refMain = useRef<HTMLElement>(null)
  useEffect(() => {
    // Une feuille ou un menu ouvert par l'adresse garde le focus.
    if (large && !posee && !refMain.current?.contains(document.activeElement) && !document.querySelector('#app .sheet, #av-pop, #app .pop-pan')) refMain.current?.focus({ preventScroll: true })
    // À l'arrivée sur la page seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lieu.pathname])
  // Alt + ↑ : remonter en haut (même action que data-act=top).
  useEffect(() => {
    if (!large) return
    const haut = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault()
        refMain.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', haut)
    return () => window.removeEventListener('keydown', haut)
  }, [large])
  const retourRelu = etat ? (etat.retour ? etat.retour.replace(/^#/, '').split('?')[0] : 'accueil') : (nav.retour || 'accueil').split('?')[0]
  // Un visiteur n'a pas de « Mon compte » : sur grand écran, les pages publiques rangées sous le compte (aide, FAQ,
  // légal, réglages…) remontent à l'accueil, dans le fil comme dans le bouton de retour.
  // Grands écrans : le parent du fil d'Ariane, quand il diffère du retour du téléphone (config/pages.ts, ARIANE).
  const parentRelu = (site && (p.ariane ?? ARIANE[p.route])) || retourRelu
  const sansCompte = site && !sessionEcran.connecte && parentRelu === 'compte'
  const retourRoute = sansCompte ? 'accueil' : parentRelu
  // Écran posé sur son parent sous le même titre (feuille de Mon abonnement, listes sous les Favoris…) : dès 1024,
  // le fil et le retour sont ceux du parent, sans « Mon abonnement › Mon abonnement ».
  const chaine = parentsDe(p.route, retourRoute).filter((e) => !(site && !sessionEcran.connecte && e.vers === chemin('compte')))
  const doublon = tabL && chaine.length > 1 && typeof titre === 'string' && t(chaine[chaine.length - 1].texte) === t(titre)
  const chaineVue = doublon ? chaine.slice(0, -1) : chaine
  const enPage = site && nav.entete === 'enfant'
    ? {
        fil: tabL ? <FilAriane elements={[...chaineVue, { texte: typeof titre === 'string' ? titre : '' }]} /> : null,
        nomRetour: tabL ? (doublon ? chaineVue[chaineVue.length - 1].texte : retourRoute === 'accueil' ? 'Accueil' : (TITRES_ARIANE[retourRoute] ?? NAVIGATION[retourRoute]?.titre ?? null)) : null,
      }
    : undefined
  const barreTitre = enPage && (
    <EnTeteEnfant
      titre={entetePanier ? <TitrePanier texte={etat ? (etat.titrePanier ?? null) : undefined} /> : titre}
      classe={entetePanier ? 'cl07-hd' : undefined}
      avant={entetePanier ? <BandeauPanier /> : undefined}
      sousTitre={sousTitre}
      sousTitreNoeuds={p.sousTitre === undefined ? etat?.sousTitreNoeuds : undefined}
      retour={doublon ? (chaineVue[chaineVue.length - 1].vers ?? retour) : sansCompte ? chemin('accueil') : parentRelu !== retourRelu ? chemin(parentRelu) : retour}
      droite={nav.droite}
      action={p.action}
      actionPrototype={nav.action}
      enPage={enPage}
    />
  )
  const gabarit = large ? p.gabarit : undefined
  // Pages du compte dès 1024 px, dans l'ordre des captures (11.32.54) : la carte d'identité pleine largeur sous
  // l'en-tête, puis le menu à gauche et, à droite, le fil d'Ariane et le titre de la page en tête du contenu.
  const titreDansCompte = gabarit === 'compte' && tabL
  const largeur: Largeur = p.largeur ?? (p.gabarit ? LARGEUR_DE[p.gabarit] : 'etroit')
  const contenu = !gabarit ? (
    p.children
  ) : gabarit === 'catalogue' ? (
    <Gabarit forme="catalogue" des={p.des}>
      {tabL && <Zone nom="gauche" etiquette={p.etiquetteGauche ?? 'Catégories'}>{p.gauche ?? <ColonneCategories etat={etatCat} changer={changerCat} aLaMain={catALaMain} avecDroite={!!p.droite && auMoins(ecran, 'pc')} />}</Zone>}
      <Zone nom="contenu">{p.children}</Zone>
      {p.droite && auMoins(ecran, 'pc') && <Zone nom="droite" etiquette="Pour toi">{p.droite}</Zone>}
    </Gabarit>
  ) : gabarit === 'compte' ? (
    <Gabarit forme="compte" des={p.des}>
      {tabL && (
        <Zone nom="identite">
          <CarteIdentite />
        </Zone>
      )}
      {tabL && (
        <Zone nom="menu">
          <MenuCompte />
        </Zone>
      )}
      <Zone nom="contenu">
        {titreDansCompte && barreTitre}
        {p.children}
      </Zone>
    </Gabarit>
  ) : (
    <Gabarit forme={gabarit} des={p.des} inverse={p.inverse} asideEnTete={p.asideEnTete}>
      {p.children}
    </Gabarit>
  )
  // Assistant (FF-IA) : bouton rond en bas à droite dès 1200 px, le bouton « remonter » s'empile au-dessus (§ 3.11).
  const { interrupteurs } = useSession()
  const avecIa = site && auMoins(ecran, 'pc') && !!interrupteurs['FF-IA'] && p.route !== 'assistant'
  // Écran peu haut : le bandeau de confiance se masque dès que la page défile (larges.css, #app.a-defile). La classe est
  // posée directement sur #app, sans nouveau rendu : un rendu pendant le défilement couperait le défilement doux de
  // main (ancres, « remonter »). Elle est reposée après chaque rendu (React réécrit className). Nom « a-defile » : la
  // classe « defile » est celle des rails horizontaux (site.css), qui faisait de #app un rail et cassait le défilement.
  const suivreDefile = useRef<() => void>(() => undefined)
  useEffect(() => {
    const m = refMain.current
    const app = m?.parentElement
    if (!tabL || !m || !app) return
    const suivre = () => void app.classList.toggle('a-defile', m.scrollTop > 8)
    suivreDefile.current = suivre
    suivre()
    m.addEventListener('scroll', suivre, { passive: true })
    return () => {
      m.removeEventListener('scroll', suivre)
      app.classList.remove('a-defile')
      suivreDefile.current = () => undefined
    }
  }, [tabL])
  useLayoutEffect(() => {
    suivreDefile.current()
  })
  const classesApp = [
    ...(nav.classesApp || []),
    ...(posee?.classes || []),
    ...(large ? ['l-' + largeur, ...(site ? ['a-site'] : []), ...(gabarit ? ['g-' + gabarit] : []), ...(avecIa ? ['avec-ia'] : [])] : []),
  ]
  // Actions du prototype (data-act) : langue, thème, taille du texte, haut de page.
  const agir = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('[data-act]')
    if (!a) return
    const act = a.getAttribute('data-act')
    const v = a.getAttribute('data-v')
    if (a.tagName === 'A' && a.getAttribute('href') === '#') e.preventDefault()
    if (act === 'theme') setTheme(theme === 'dark' ? 'light' : 'dark')
    if (act === 'lang') setLangue(langue === 'en' ? 'fr' : 'en')
    if (act === 'set-theme' && (v === 'light' || v === 'dark' || v === 'auto')) setTheme(v)
    if (act === 'set-lang' && (v === 'fr' || v === 'en')) {
      e.preventDefault()
      setLangue(v)
    }
    if (act === 'set-text' && (v === 'normale' || v === 'grande' || v === 'tres')) setTaille(v)
    if (act === 'top') document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <div
      id="app"
      className={classesApp.join(' ') || undefined}
      onClick={agir}
      // Gestes sur place (interrupteurs, choix, voile…), avant qu'un lien ne navigue.
      onClickCapture={p.parEtat ? (e) => interagir(e, (v, o) => (typeof v === 'number' ? naviguer(v) : naviguer(v, o)), lieu.pathname + lieu.search) : undefined}
    >
      {site && <LienEvitement />}
      {p.avant}
      {site && <EnTeteSite etat={etat?.racine} />}
      {!site && nav.entete === 'racine' && <EnTeteRacine recherche={nav.recherche} etat={etat?.racine} />}
      {!site && nav.entete === 'enfant' && (
        <EnTeteEnfant
          titre={entetePanier ? <TitrePanier texte={etat ? (etat.titrePanier ?? null) : undefined} /> : titre}
          classe={entetePanier ? 'cl07-hd' : undefined}
          avant={entetePanier ? <BandeauPanier /> : undefined}
          sousTitre={sousTitre}
          sousTitreNoeuds={p.sousTitre === undefined ? etat?.sousTitreNoeuds : undefined}
          retour={retour}
          droite={nav.droite}
          action={p.action}
          actionPrototype={nav.action}
        />
      )}
      <main
        ref={refMain}
        id={large ? 'contenu' : undefined}
        tabIndex={large ? -1 : undefined}
        // Sous l'en-tête de site, la hauteur de l'en-tête (--hd-h, larges.css) ; sans en-tête de site (« aucun »,
        // « propre » : pages web, reçus, arrivée), la marge du téléphone, à tous les paliers (l'en-tête propre de
        // l'écran est le même qu'au téléphone).
        style={{ paddingTop: site ? `calc(var(--sb) + var(--hd-h, ${nav.margeHaute}px))` : `calc(var(--sb) + ${nav.margeHaute}px)`, ...styleEnLigne(nav.styleMain), ...p.styleMain }}
      >
        {!p.parEtat &&
          blocsDe(p.route).map((css, i) => (
            <style key={i}>{css}</style>
          ))}
        {large && !site && ENTETE_MINIMAL.has(p.route) && <EnTeteMinimal />}
        {!titreDansCompte && barreTitre}
        <HorsLigne />
        {contenu}
        {site && p.pied !== false && <PiedDePage />}
      </main>
      {nav.barre && !tabL && <BarreDuBas actif={nav.onglet} calme={nav.calme} etat={etat?.badgesBarre} />}
      {p.fixes}
      {posee?.fixes}
      {(nav.entete === 'racine' || site) && pop === 'profil' && <MenuProfil />}
      {sessionEcran.connecte && sessionEcran.typeCompte === 'diaspora' && <FeuillePourQui />}
      {site && pop === 'notifs' && <PanneauNotifications />}
      {avecIa && (
        <Link className="fab-ia" to={chemin('assistant')} aria-label={t('Assistant BelivaY')}>
          <Icone nom="bot" taille={26} />
        </Link>
      )}
    </div>
  )
}

// Mode dégradé (CRD-11, CDM-01) : en tête du contenu, comme C.offline dans les écrans du prototype.
// « Connexion lente » (au-delà de NET-LENT) viendra du client d'API, à l'étape 5.
function HorsLigne() {
  const { t } = usePreferences()
  const [enLigne, setEnLigne] = useState(() => navigator.onLine)
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine)
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    return () => {
      window.removeEventListener('online', maj)
      window.removeEventListener('offline', maj)
    }
  }, [])
  return enLigne ? null : <BandeauHorsLigne>{t('Hors ligne')}</BandeauHorsLigne>
}

// « padding-bottom:240px;background:var(--esp-3) » → objet de style React.
function styleEnLigne(s?: string): CSSProperties {
  if (!s) return {}
  return Object.fromEntries(
    s
      .split(';')
      .filter((d) => d.includes(':'))
      .map((d) => {
        const [k, ...v] = d.split(':')
        return [k.trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v.join(':').trim()]
      }),
  ) as CSSProperties
}
