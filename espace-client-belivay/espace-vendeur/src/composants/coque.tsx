// La coque de l'espace vendeur : balisage EXACT de rootHeader, subHeader, dock et screen du prototype vendeur (mêmes
// balises, mêmes classes, même ordre). Les en-têtes à design (logo, carte de tête, pastilles) sont INTOUCHABLES
// (DP-54, PLAN-VENDEUR.md règle 3) : tests/identique.spec.ts les compare au pixel sur toutes les routes.
// - En-tête racine (onglets) : menu, logo, thème (lune / soleil), langue FR / EN (Q-45), cloche, avatar qui ouvre le
//   menu du profil (?pop=profil) ; « Espace vendeur · <boutique> » ; pastilles d'état (ouverte ou fermée, palier et
//   score, plan et offre de découverte ; accès Préparation : son nom à la place du palier ; suspendu).
// - En-tête enfant : retour (mémorisé : RetourMemoire du client), titre, marque BelivaY vers l'accueil.
// - Barre du bas : 4 onglets, bulle de verre liquide du client (useBulle, BarreBas.tsx), badge Commandes, point
//   « Argent gelé » (jamais pour l'accès Préparation).
// - Bandeau hors connexion (VD04-R14) en tête du contenu de tous les écrans (BandeauHorsLigne).
// Une page provisoire (parEtat) prend l'en-tête et la barre relevés dans l'état du prototype (src/genere/etats.json) ;
// un écran repris les prend de la session (données réelles).
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useBulle } from '@client/composants/BarreBas'
import { useDes } from '@client/composants/ecran'
import { badge } from '@client/i18n/format'
import logo from '../assets/logo-belivay.png'
import marque from '../assets/marque-belivay.png'
import { ETATS, useEtat, type Etat, type PastilleReleve } from '../config/etats'
import { ONGLETS, PAGE_DE, adresseDuSite, chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { useRouteOuverte, useSession } from '../session'
import { heure } from '../i18n/temps'
import { BandeauHorsLigne } from './BandeauHorsLigne'
import { Icone } from './Icone'
import { ROUTES_LARGES } from '../config/navigation'
import { BarreLaterale, BarreTitre, PiedVendeur, TiroirVendeur, avecTiroir } from './larges'
import { MenuProfil } from './MenuProfil'
import { useMonVisuel } from '../donnees/visuelProfil'
import { PreferencesDuMenu } from './PreferencesDuMenu'

// ---------- Pastilles de l'en-tête racine ----------

const PALIERS_EN: Record<string, string> = { Bronze: 'Bronze', Argent: 'Silver', Or: 'Gold', Platine: 'Platinum' }
/** Nom d'un palier (« Argent » est « Silver », jamais « Money »). */
export const nomPalier = (p: string, langue: 'fr' | 'en') => (langue === 'en' ? (PALIERS_EN[p] ?? p) : p)

export interface Pastille {
  ton: string // green, red, bronze, or, ink…
  point?: boolean
  icone?: string | null
  texte: string // déjà traduit
}

/** Pastilles de la session : ouverte ou fermée ; palier · score (ou le membre de l'accès Préparation) ; plan · découverte. */
export function usePastilles(): Pastille[] {
  const s = useSession()
  const { t, tf, langue } = usePreferences()
  const b = s.boutique
  if (!b) return []
  if (b.etat === 'suspendue')
    return [
      { ton: 'red', point: true, texte: t('Compte suspendu') },
      { ton: 'ink', icone: 'lock', texte: t('Trust Score gelé') },
    ]
  const prep = s.membre?.role === 'preparation'
  // En pause (Q-39) : la boutique ne reçoit plus de commandes jusqu'à la date choisie.
  const ouverture: Pastille =
    b.etat === 'en_pause'
      ? { ton: 'ink', point: true, texte: t('En pause') }
      : b.etat === 'fermee_aujourdhui'
        ? { ton: 'red', point: true, texte: t('Fermée aujourd’hui') }
        : { ton: 'green', point: true, texte: tf('Ouverte · {h}', { h: heure(b.fermeA, langue) }) }
  const qui: Pastille = prep
    ? { ton: 'ink', icone: 'user-round', texte: tf('{nom} · accès Préparation', { nom: `${s.membre!.prenom} ${s.membre!.nom}` }) }
    : { ton: 'bronze', icone: 'award', texte: tf('{palier} · {score}', { palier: nomPalier(b.palier, langue), score: Math.round(b.trustScore) }) }
  const liste = [ouverture, qui]
  if (!prep && b.etat !== 'fermee_aujourdhui' && b.etat !== 'en_pause') liste.push({ ton: 'or', texte: b.decouverte.active ? tf('{plan} · découverte', { plan: b.plan }) : b.plan })
  return liste
}

function PastilleEntete({ p }: { p: Pastille }) {
  return (
    <span className={'pill ' + p.ton}>
      {p.point && <i className="d"></i>}
      {p.icone && <Icone nom={p.icone} taille={13} />}
      {p.texte}
    </span>
  )
}

// ---------- En-tête racine ----------

const avecProfil = (recherche: string) => {
  const p = new URLSearchParams(recherche)
  if (p.get('pop') === 'profil') p.delete('pop')
  else p.set('pop', 'profil')
  const s = p.toString()
  return s ? '?' + s : ''
}

export function EnTeteRacine({ releve, large }: { releve?: Etat['racine']; large?: boolean }) {
  const { t, tf, theme, langue } = usePreferences()
  const s = useSession()
  const lieu = useLocation()
  const pastillesSession = usePastilles()
  const pastilles: Pastille[] = releve ? releve.pastilles.map((p: PastilleReleve) => ({ ...p, texte: t(p.texte) })) : pastillesSession
  const cloche = releve ? releve.cloche : badge(s.badges.notifications)
  // Photo de profil (Mon profil) : visible aussitôt dans l'avatar ; sans photo, les initiales du prototype.
  const visuel = useMonVisuel()
  const photo = releve ? null : visuel.photo
  const avatar = photo ? <img src={photo} alt="" /> : releve ? releve.avatar : (s.membre?.initiales ?? '')
  const clAvatar = 'avatar' + (photo ? ' a-photo' : '')
  const libelle = releve?.libelle ? t(releve.libelle) : s.boutique?.nom ? tf('Espace vendeur · {nom}', { nom: s.boutique.nom }) : t('Espace vendeur')
  // Ordinateur (dès 1024 px) : en-tête fin à droite de la barre latérale ; l'avatar ouvre Mon profil.
  const ord = useDes('tab-l') && !!large
  // Grands écrans : la hauteur de l'en-tête (une ou deux lignes, plus la navigation dès 1024 px) est mesurée et posée
  // sur #app (--hd-h) : le contenu commence juste dessous, les colonnes collantes s'y arrêtent.
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const h = ref.current
    const app = h?.closest<HTMLElement>('#app')
    if (!large || !h || !app) return
    const poser = () => app.style.setProperty('--hd-h', h.offsetHeight + 'px')
    poser()
    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(poser)
    ro.observe(h)
    return () => ro.disconnect()
  }, [large])
  const logoAccueil = (
    <Link className="hd-logo" to={chemin('accueil')} aria-label={t('Accueil')}>
      <img src={logo} alt="BelivaY" />
    </Link>
  )
  const reglages = (
    <>
      <button type="button" className="ibtn" data-act="theme" aria-label={t(theme === 'dark' ? 'Thème clair' : 'Thème sombre')}>
        {theme === 'dark' ? <Icone nom="sun" taille={21} style={{ color: '#FFC845' }} /> : <Icone nom="moon" taille={21} />}
      </button>
      <button type="button" className="lang" data-act="lang" aria-label={t('Langue')}>
        {langue === 'en' ? 'EN' : 'FR'}
      </button>
    </>
  )
  const actions = (
    <>
      {reglages}
      <Link className="ibtn" to={chemin('notifications')} aria-label={t('Notifications')}>
        <Icone nom="bell" taille={22} />
        {cloche && <span className="bdg">{cloche}</span>}
      </Link>
      {ord ? (
        <Link className={clAvatar} to={chemin('profil')} aria-label={t('Mon profil')}>
          {avatar}
        </Link>
      ) : (
        <Link className={clAvatar} to={{ pathname: lieu.pathname, search: avecProfil(lieu.search) }} replace aria-label={t('Menu du profil')}>
          {avatar}
        </Link>
      )}
    </>
  )
  const etiquette = (
    <div className="hd-label">
      <i></i>
      {libelle}
    </div>
  )
  const rangee = (
    <div className="hd-pills">
      {pastilles.map((p, i) => (
        <PastilleEntete key={i} p={p} />
      ))}
    </div>
  )
  // Dès 768 px : l'icône Menu ouvre le tiroir latéral (groupes de l'interface vendeur réelle).
  const tiroirOuvert = new URLSearchParams(lieu.search).get('pop') === 'menu'
  const menuTiroir = (
    <Link className="ibtn" to={avecTiroir(lieu.pathname, lieu.search, !tiroirOuvert)} replace aria-label={t('Menu')} aria-haspopup="dialog" aria-expanded={tiroirOuvert}>
      <Icone nom="menu" taille={24} />
    </Link>
  )
  // Dès 768 px : les mêmes éléments, sur une ligne (menu, logo, boutique et pastilles, thème, langue, cloche, avatar).
  // Sans session (ouverture de la boutique, code, pièces) : le logo, le thème et la langue seulement.
  if (large && !s.connecte)
    return (
      <header ref={ref} className="hd glass hd-site">
        <div className="hs-row">
          <span className="hd-logo">
            <img src={logo} alt="BelivaY" />
          </span>
          <div className="hs-id">{etiquette}</div>
          <span className="hd-sp"></span>
          {reglages}
        </div>
      </header>
    )
  if (large)
    return (
      <header ref={ref} className="hd glass hd-site">
        <div className="hs-row">
          {!ord && menuTiroir}
          {!ord && logoAccueil}
          <div className="hs-id">
            {etiquette}
            {rangee}
          </div>
          <span className="hd-sp"></span>
          {actions}
        </div>
      </header>
    )
  return (
    <header className="hd glass">
      <div className="hd-row">
        <Link className="ibtn" to={chemin('menu')} aria-label={t('Menu')}>
          <Icone nom="menu" taille={24} />
        </Link>
        <Link className="hd-logo" to={chemin('accueil')} aria-label={t('Accueil')}>
          <img src={logo} alt="BelivaY" />
        </Link>
        <span className="hd-sp"></span>
        <button type="button" className="ibtn" data-act="theme" aria-label={t(theme === 'dark' ? 'Thème clair' : 'Thème sombre')}>
          {theme === 'dark' ? <Icone nom="sun" taille={21} style={{ color: '#FFC845' }} /> : <Icone nom="moon" taille={21} />}
        </button>
        <button type="button" className="lang" data-act="lang" aria-label={t('Langue')}>
          {langue === 'en' ? 'EN' : 'FR'}
        </button>
        <Link className="ibtn" to={chemin('notifications')} aria-label={t('Notifications')}>
          <Icone nom="bell" taille={22} />
          {cloche && <span className="bdg">{cloche}</span>}
        </Link>
        <Link className={clAvatar} to={{ pathname: lieu.pathname, search: avecProfil(lieu.search) }} replace aria-label={t('Menu du profil')}>
          {avatar}
        </Link>
      </div>
      <div className="hd-label">
        <i></i>
        {libelle}
      </div>
      <div className="hd-pills">
        {pastilles.map((p, i) => (
          <PastilleEntete key={i} p={p} />
        ))}
      </div>
    </header>
  )
}

// ---------- En-tête enfant ----------

export function EnTeteEnfant({ titre, retour, style }: { titre: ReactNode; retour: string; style?: CSSProperties }) {
  const { t } = usePreferences()
  return (
    <header className="hd glass" style={style ?? { paddingBottom: '8px' }}>
      <div className="hd-sub">
        <Link className="ibtn" to={retour} aria-label={t('Revenir')}>
          <Icone nom="chevron-left" taille={26} />
        </Link>
        <h1>{titre}</h1>
        <Link className="ibtn hd-mark" to={chemin('accueil')} aria-label={t('BelivaY · accueil')}>
          <img src={marque} alt="" width="33" height="32" style={{ display: 'block', width: '33px', height: '32px' }} />
        </Link>
      </div>
    </header>
  )
}

// ---------- Barre du bas ----------

export function BarreDuBas({ actif, releve, calme }: { actif: string | null; releve?: Etat['barre']; calme?: boolean }) {
  const { t } = usePreferences()
  const s = useSession()
  const prep = s.membre?.role === 'preparation'
  // Employé : les onglets qu'il n'a pas le droit d'ouvrir disparaissent (src/donnees/droits.ts, DROIT_DE_ROUTE).
  const ouverte = useRouteOuverte()
  const onglets = ONGLETS.filter((o) => ouverte(o.id))
  const bulle = useBulle(
    onglets.map((o) => chemin(o.id)),
    onglets.findIndex((o) => o.id === actif),
  )
  const badgeDe = (id: string) => (releve ? (releve.badges[id] ?? null) : calme ? null : id === 'commandes' ? badge(s.badges.commandes) : null)
  const point = (id: string) => id === 'argent' && (releve ? releve.point : !calme && !prep && s.argentGele)
  return (
    <nav className={'dock glass' + (bulle.bouge ? ' bouge' : '')} aria-label={t('Navigation principale')} {...bulle.props}>
      {onglets.map((o) => {
        const b = badgeDe(o.id)
        const on = o.id === actif
        return (
          <Link key={o.id} className={'tab' + (on ? ' on' : '')} to={chemin(o.id)} aria-current={on ? 'page' : undefined}>
            <Icone nom={o.icone} taille={22} />
            <span>{t(o.titre)}</span>
            {b && <span className="bdg">{b}</span>}
            {point(o.id) && <span className="dot" aria-label={t('Argent gelé')}></span>}
          </Link>
        )
      })}
      {bulle.lentille(
        onglets.map((o) => {
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

// ---------- Écran ----------

// Parent logique d'un écran ouvert directement (sans page précédente dans la visite), quand celui du prototype mène
// trop loin (l'accueil) ou à une étape qui demande un paramètre.
const PARENT_LOGIQUE: Record<string, string> = {
  score: 'palier',
  paliers: 'palier',
  plans: 'plans_liste',
  visibilite: 'menu',
  services: 'visibilite',
  dupliquer: 'produits',
  remplacement: 'retours',
}

const styleEnLigne = (s: string): CSSProperties =>
  Object.fromEntries(
    s
      .split(';')
      .filter((d) => d.includes(':'))
      .map((d) => {
        const i = d.indexOf(':')
        return [
          d
            .slice(0, i)
            .trim()
            .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
          d.slice(i + 1).trim(),
        ]
      }),
  ) as CSSProperties

/**
 * Un écran : en-tête, contenu (<main>), barre du bas, éléments fixes (feuilles, voiles), menu du profil.
 * - parEtat : page provisoire, l'en-tête et la barre suivent l'état du prototype ouvert par l'adresse ;
 * - sinon : la session donne pastilles, badges et avatar ; le titre et le retour sont ceux de la route (relevé de
 *   l'état par défaut), sauf `titre` / `retour` donnés par l'écran (titre qui porte une donnée : « Commande BLV-… »).
 */
export function Ecran(p: {
  route: string
  parEtat?: boolean
  titre?: string
  retour?: string
  calme?: boolean // sans badges (Rien à faire, Premier jour)
  pied?: boolean // false : pas de pied de page
  styleMain?: CSSProperties
  avant?: ReactNode
  fixes?: ReactNode
  children?: ReactNode
}) {
  const { t } = usePreferences()
  const cleEtat = useEtat(p.route)
  const etat: Etat | undefined = p.parEtat ? ETATS[cleEtat] : ETATS[p.route]
  const lieu = useLocation()
  const profil = new URLSearchParams(lieu.search).get('pop') === 'profil'
  const { connecte, boutique } = useSession()
  const large = useDes('tab')
  const ord = useDes('tab-l')
  useEffect(() => {
    // Un titre donné par l'écran est déjà mis en forme et traduit (« Customer of BLV-00008 ») ; celui de la route non.
    document.title = t('BelivaY vendeur') + ' — ' + (p.titre ?? t(PAGE_DE[p.route]?.titre ?? ''))
  }, [p.route, p.titre, t])
  // main reçoit le focus à chaque changement de page sur grand écran (Espace et les flèches font défiler la page).
  const refMain = useRef<HTMLElement>(null)
  useEffect(() => {
    if (large && !refMain.current?.contains(document.activeElement) && !document.querySelector('#app .sheet, #app .pm')) refMain.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lieu.pathname])
  if (!etat) return <main>{p.children}</main>
  const marge = etat.margeHaute ?? 8
  const style: CSSProperties = { paddingTop: `calc(var(--sb) + ${marge}px)`, ...styleEnLigne(etat.styleMain), ...p.styleMain }
  // Retour : la page précédente de la visite (RetourMemoire) ; ouverte directement, le parent logique de l'écran.
  // Le relevé du prototype en donne un pour chaque route ; quelques-uns sont corrigés (PARENT_LOGIQUE).
  const parent = p.route === 'contester' ? (boutique?.etat === 'suspendue' ? 'suspendu' : 'sanctions') : PARENT_LOGIQUE[p.route]
  const retour = p.retour ?? (parent ? chemin(parent) : etat.retour ? adresseDuSite(etat.retour) : chemin('accueil'))
  // Tablette (dès 768 px) :
  // un en-tête de site (racine et enfant), le titre des pages enfants dans le contenu, la barre du bas en capsule, le
  // pied de page ; un écran sans en-tête (connexion, caméra) garde le sien, centré.
  const site = large && etat.entete !== 'aucun'
  // Ordinateur (dès 1024 px, avec une session) : barre latérale groupée à gauche, en-tête fin, pas de barre du bas ;
  // contenu centré, plus large pour les pages de listes et de tableaux (ROUTES_LARGES).
  const bureau = site && ord && connecte
  const titre = p.titre ?? t(etat.titre ?? '')
  const classes = [...etat.classesApp, ...(large ? ['l-etroit', ...(site ? ['a-site'] : [])] : []), ...(bureau ? ['a-ord', 'r-' + p.route, ...(ROUTES_LARGES.has(p.route) ? ['l-large'] : [])] : [])]
  if (site) style.paddingTop = `calc(var(--sb) + var(--hd-h, 76px) + 16px)`
  return (
    <div id="app" className={classes.join(' ') || undefined}>
      {p.avant}
      {bureau && <BarreLaterale />}
      {site && <EnTeteRacine releve={p.parEtat && etat.entete === 'racine' ? etat.racine : undefined} large />}
      {!site && etat.entete === 'racine' && <EnTeteRacine releve={p.parEtat ? etat.racine : undefined} />}
      {!site && etat.entete === 'enfant' && <EnTeteEnfant titre={titre} retour={retour} style={etat.styleEntete ? styleEnLigne(etat.styleEntete) : undefined} />}
      <main ref={refMain} style={style} id={large ? 'contenu' : undefined} tabIndex={large ? -1 : undefined}>
        {site && etat.entete === 'enfant' && <BarreTitre titre={titre} retour={retour} />}
        <BandeauHorsLigne />
        {p.children}
        {p.parEtat && p.route === 'menu' && <PreferencesDuMenu />}
        {site && p.pied !== false && connecte && <PiedVendeur />}
      </main>
      {etat.barre && !bureau && <BarreDuBas actif={etat.barre.onglet} releve={p.parEtat ? etat.barre : undefined} calme={p.calme} />}
      {p.fixes}
      {profil && <MenuProfil />}
      {site && !bureau && connecte && new URLSearchParams(lieu.search).get('pop') === 'menu' && <TiroirVendeur />}
    </div>
  )
}
