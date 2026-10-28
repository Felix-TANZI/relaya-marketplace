// La coque de l'espace entreprise, sur la STRUCTURE EXACTE du prototype (BRIEF-PROTOTYPE, 11 oct. : rootHeader,
// subHeader, dock, sidebar, topbar, page() du prototype entreprise ; mêmes balises et classes, styles/prototype.css),
// avec le contenu réel : session, compteurs, rôles (ENT-RG-R25), état du compte, couleurs DP-64 (jetons.css).
// Le format est posé sur <html data-device> comme dans le prototype :
// - Téléphone (moins de 768 px) : page de la barre du bas (Tableau, Paquets, Missions) et Menu → en-tête racine
//   (☰ Menu à gauche du logo, thème, langue, cloche, avatar → Profil ; libellé de l'espace ; pastilles) ; autre page →
//   en-tête secondaire (‹ retour, nom de la page, panier BelivaY vers le tableau de bord). Barre du bas de verre à trois
//   onglets : le Menu n'en est pas un (consigne du porteur, 12 oct.), « ☰ » l'ouvre. Les actions principales d'une page
//   (`actions` d'Ecran) descendent dans la zone du pouce, juste au-dessus de la barre du bas.
// - Tablette (768 à 1023 px) : console du prototype sans barre latérale ; « ☰ » de la barre du haut ouvre la barre
//   latérale en tiroir (« ?pop=menu », Échap ou le voile la referment).
// - Ordinateur (dès 1024 px) : console du prototype — barre latérale (logo, carte de l'entreprise, navigation groupée
//   avec compteurs, utilisateur et déconnexion, mentions), barre du haut (fil d'Ariane, recherche, pastilles, thème,
//   langue, cloche, avatar), en-tête de page (surtitre, titre, sous-titre, actions en tête).
// Partout : ⌘K, Ctrl+K ou « / » cherche (barre du haut, sinon page Rechercher partout), « g » puis une lettre ouvre une
// page, « ? » liste les raccourcis (composants/Raccourcis.tsx).
// Toute page ouvre par l'en-tête de page du prototype (dk-head : pg-k, pg-t, pg-s, acts), au téléphone aussi.
// Bandeau quand l'état du compte n'est ni pilote ni actif (ENT-01-R17), bandeau hors connexion.
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent as ToucheReact, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useBulle } from '@client/composants/BarreBas'
import { useDes } from '@client/composants/ecran'
import { F, badge } from '@client/i18n/format'
import logo from '../assets/logo-belivay.png'
import marque from '../assets/marque-belivay.png'
import { PARAMETRES } from '../calculs/registre'
import { NOM_ETAT, NOM_PALIER, NOM_ROLE } from '../config/libelles'
import { ENTREES, NAVIGATION } from '../config/navigation'
import { ACCUEIL, ONGLETS, chemin } from '../config/pages'
import { ROUTES, ongletDe } from '../config/routes'
import type { EtatCompte } from '../donnees/domaines/compte'
import type { Notification } from '../donnees/domaines/notifications'
import { source } from '../donnees/source'
import { usePreferences } from '../preferences'
import { useRouteOuverte, useSeDeconnecter, useSession } from '../session'
import { BandeauHorsLigne } from './BandeauHorsLigne'
import { BandeauConsole } from './BandeauConsole'
import { FileEnAttente } from './prototype'
import { Raccourcis } from './Raccourcis'
import { adresseDirecte, chargerIndex, filtrer, recentes, retenir, type Resultat } from './recherche'
import { Portrait } from './Portrait'
import { useCouverture } from '../donnees/mon-compte'
import { Icone } from './Icone'
import { RangSecondaire } from './rang'
import { EnTeteContexte, type EmplacementsEnTete } from './entete'

// ---------- Format (html[data-device], comme le prototype) ----------

export type Appareil = 'mobile' | 'tablet' | 'desktop'
export function useAppareil(): Appareil {
  const tab = useDes('tab')
  const ord = useDes('tab-l')
  return ord ? 'desktop' : tab ? 'tablet' : 'mobile'
}

// ---------- Pastilles ----------

/** Ton de la pastille d'état du compte (classes .pill du prototype). */
export const TON_PILL: Record<EtatCompte, string> = { configuration: 'amber', pilote: 'acc', actif: 'green', restreint: 'amber', suspendu: 'red', preavis: 'amber', resilie: 'red' }

/** Texte de la pastille d'état : « Pilote · jour 2 sur 30 » (court : « Pilote · jour 2/30 »), « Compte actif »… */
export function useTexteEtat(court = false): string {
  const { t, tf } = usePreferences()
  const e = useSession().entreprise
  if (!e) return ''
  if (e.etat === 'pilote' && e.pilote) return tf(court ? 'Pilote · jour {j}/{n}' : 'Pilote · jour {j} sur {n}', { j: e.pilote.jour, n: e.pilote.duree })
  return t(NOM_ETAT[e.etat])
}

/** Pastilles du prototype (APP.pills / mpills) : état du compte (→ État du compte) et rôle. Sur le tableau de bord,
 * le rôle seul (son héros dit déjà l'état : ENT-03-R02). */
function Pastilles({ route, court }: { route: string; court?: boolean }) {
  const { t } = usePreferences()
  const s = useSession()
  const texte = useTexteEtat(court)
  if (!s.entreprise || !s.utilisateur) return null
  return (
    <>
      {route !== ACCUEIL && (
        <Link className={'pill ' + TON_PILL[s.entreprise.etat]} to={chemin('etat')} aria-label={t('État du compte') + ' : ' + texte}>
          <i className="d"></i>
          {texte}
        </Link>
      )}
      <span className="pill ink">
        {!court && <Icone nom="user-round" taille={13} />}
        {t(NOM_ROLE[s.utilisateur.role])}
      </span>
    </>
  )
}

// ---------- Boutons de l'en-tête ----------

/** Adresse de la page ouverte avec ou sans une fenêtre posée par l'adresse (« ?pop=menu »). */
export function avecPop(pathname: string, recherche: string, pop: string | null) {
  const p = new URLSearchParams(recherche)
  if (pop) p.set('pop', pop)
  else p.delete('pop')
  const q = p.toString()
  return { pathname, search: q ? '?' + q : '' }
}

function Reglages({ taille = 21 }: { taille?: number }) {
  const { t, theme, setTheme, langue, setLangue } = usePreferences()
  return (
    <>
      {/* Thème : pastille ronde entière, l'icône du thème où l'on irait (lune en clair, soleil en sombre) ; bouton
          bascule « Thème sombre » dont aria-pressed dit l'état (styles/vie.css). */}
      <button type="button" className={'ibtn vie-theme ' + (theme === 'dark' ? 'nuit' : 'jour')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t('Thème sombre')} aria-pressed={theme === 'dark'} title={t(theme === 'dark' ? 'Thème clair' : 'Thème sombre')}>
        <span className="vt-ic vt-soleil">
          <Icone nom="sun" taille={taille - 1} />
        </span>
        <span className="vt-ic vt-lune">
          <Icone nom="moon" taille={taille - 2} />
        </span>
      </button>
      {/* Langue : pilule segmentée FR | EN, le curseur glisse vers la langue choisie. */}
      <button type="button" className={'lang vie-lang ' + (langue === 'en' ? 'en' : 'fr')} onClick={() => setLangue(langue === 'en' ? 'fr' : 'en')} aria-label={t(langue === 'en' ? 'Passer en français' : 'Passer en anglais')}>
        <i className="vl-curseur" aria-hidden="true"></i>
        <span className={'vl-o' + (langue === 'en' ? '' : ' on')} aria-hidden="true">
          FR
        </span>
        <span className={'vl-o' + (langue === 'en' ? ' on' : '')} aria-hidden="true">
          EN
        </span>
      </button>
    </>
  )
}

// Cloche qui sonne (styles/finitions.css) : un léger balancement quand le nombre de notifications non lues monte (et
// une fois à l'ouverture de l'espace s'il y en a). Le dernier nombre vu survit au changement de page.
let dernierNonLu: number | null = null
function useSonne(nombre: number): boolean {
  const [sonne, setSonne] = useState(false)
  useEffect(() => {
    const monte = dernierNonLu === null ? nombre > 0 : nombre > dernierNonLu
    dernierNonLu = nombre
    // Sans mouvement permis (html[data-mouv]), aucune classe posée : rien ne change à l'écran.
    if (!monte || !document.documentElement.hasAttribute('data-mouv')) return
    setSonne(true)
    const m = window.setTimeout(() => setSonne(false), 1100)
    return () => window.clearTimeout(m)
  }, [nombre])
  return sonne
}

function Cloche({ taille, panneau }: { taille: number; panneau?: boolean }) {
  const { t, tf } = usePreferences()
  const lieu = useLocation()
  const nonLues = useSession().badges.notifications
  const n = badge(nonLues)
  const sonne = useSonne(nonLues) ? ' fin-sonne' : ''
  const libelle = n ? tf('Notifications, {n} non lues', { n }) : t('Notifications')
  if (!panneau)
    return (
      <Link className={'ibtn' + sonne} to={chemin('notifications')} aria-label={libelle}>
        <Icone nom="bell" taille={taille} />
        {n && <span className="bdg">{n}</span>}
      </Link>
    )
  // Ordinateur et tablette (motif M15) : la cloche ouvre un panneau des dernières notifications (« ?pop=cloche »).
  const ouvert = new URLSearchParams(lieu.search).get('pop') === 'cloche'
  return (
    <span className="e-cloche-a">
      <Link className={'ibtn' + (ouvert ? ' on' : '') + sonne} to={avecPop(lieu.pathname, lieu.search, ouvert ? null : 'cloche')} replace aria-label={libelle} aria-haspopup="dialog" aria-expanded={ouvert}>
        <Icone nom="bell" taille={taille} />
        {n && <span className="bdg">{n}</span>}
      </Link>
      {ouvert && <PanneauCloche />}
    </span>
  )
}

/** Panneau sous la cloche : les dernières notifications (non lues d'abord), lire en touchant, tout marquer lu. */
function PanneauCloche() {
  const { t } = usePreferences()
  const lieu = useLocation()
  const naviguer = useNavigate()
  const ouverte = useRouteOuverte()
  const { heure } = useHeureCourte()
  const [liste, setListe] = useState<Notification[] | null>(null)
  const [erreur, setErreur] = useState(false)
  const boite = useRef<HTMLDivElement>(null)
  const fermer = () => naviguer(avecPop(lieu.pathname, lieu.search, null), { replace: true })
  const lire = () =>
    source.notifications.liste().then(
      (l) => setListe([...l].sort((a, b) => Number(a.lue) - Number(b.lue) || b.le - a.le).slice(0, 6)),
      () => setErreur(true),
    )
  useEffect(() => {
    void lire()
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && fermer()
    const dehors = (e: PointerEvent) => !boite.current?.parentElement?.contains(e.target as Node) && fermer()
    window.addEventListener('keydown', echap)
    window.addEventListener('pointerdown', dehors)
    return () => {
      window.removeEventListener('keydown', echap)
      window.removeEventListener('pointerdown', dehors)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const ouvrir = async (x: Notification) => {
    if (!x.lue) await source.notifications.lire(x.id).catch(() => undefined)
    naviguer(ouverte(x.route) ? chemin(x.route, x.params) : chemin('notifications'))
  }
  return (
    <div ref={boite} className="e-cloche glass" role="dialog" aria-label={t('Dernières notifications')}>
      <div className="e-cloche-h">
        <b className="grow">{t('Dernières notifications')}</b>
        {liste?.some((x) => !x.lue) && (
          <button type="button" className="lien-b" style={{ textDecoration: 'none', color: 'var(--e-txt)' }} onClick={async () => (await source.notifications.marquerLues().catch(() => undefined), void lire())}>
            {t('Tout marquer comme lu')}
          </button>
        )}
      </div>
      {erreur && <p className="e-cloche-v">{t('Impossible de charger les notifications.')}</p>}
      {!liste && !erreur && <p className="e-cloche-v">{t('Chargement')}</p>}
      {liste?.length === 0 && <p className="e-cloche-v">{t('Rien de nouveau : vous êtes à jour.')}</p>}
      <ul>
        {liste?.map((x) => (
          <li key={x.id}>
            <button type="button" className={x.lue ? '' : 'nl'} onClick={() => void ouvrir(x)}>
              <span className="grow">
                <b>{t(x.titre)}</b>
                <span>{`${t(x.texte)} · ${heure(x.le)}`}</span>
              </span>
              {!x.lue && <i className="pt" aria-label={t('non lue')}></i>}
            </button>
          </li>
        ))}
      </ul>
      <Link className="btn ghost sm" to={chemin('notifications')}>
        {t('Toutes les notifications')}
      </Link>
    </div>
  )
}

/** Heure courte de Yaoundé (« 14 h 05 », « 14:05 »). */
function useHeureCourte() {
  const { langue } = usePreferences()
  const heure = (ms: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Douala', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
    return langue === 'en' ? `${p.hour}:${p.minute}` : `${Number(p.hour)} h ${p.minute}`
  }
  return { heure }
}

/** Avatar de l'en-tête : il ouvre le Profil (la personne connectée ; distinct du Menu, comme le prototype). */
function Avatar() {
  const { t } = usePreferences()
  const u = useSession().utilisateur
  return (
    <span className="fin-av">
      <Link className="avatar" to={chemin('profil')} aria-label={t('Mon profil')}>
        <Portrait id={u?.id} initiales={u?.initiales} />
      </Link>
      <i className="fin-en-ligne" aria-hidden="true"></i>
    </span>
  )
}

/** « ☰ » Menu (rootHeader du prototype) : la page Menu ; un point quand quelque chose attend dans le Menu. */
function BoutonMenu({ route }: { route: string }) {
  const { t } = usePreferences()
  const s = useSession()
  const attente = s.badges.incidents + s.badges.litiges + s.badges.messages > 0
  return (
    <Link className={'ibtn e-menu' + (route === 'menu' ? ' on' : '')} to={chemin('menu')} aria-label={t('Menu')} aria-current={route === 'menu' ? 'page' : undefined}>
      <Icone nom="menu" taille={24} />
      {attente && <span className="dot"></span>}
    </Link>
  )
}

// ---------- En-têtes du téléphone ----------

/** En-tête racine (rootHeader) : ☰, logo, thème, langue, cloche, avatar ; libellé de l'espace ; pastilles. */
function EnTeteRacine({ route }: { route: string }) {
  const { t } = usePreferences()
  return (
    <header className="hd glass">
      <div className="hd-row">
        <BoutonMenu route={route} />
        <Link className="hd-logo" to={chemin(ACCUEIL)} aria-label={t('Tableau de bord')}>
          <img src={logo} alt="BelivaY" />
        </Link>
        <span className="hd-sp"></span>
        <Reglages />
        <Cloche taille={22} />
        <Avatar />
      </div>
      <div className="hd-label">
        <i></i>
        {t('Espace entreprise partenaire')}
      </div>
      <div className="hd-pills">
        <Pastilles route={route} court />
      </div>
    </header>
  )
}

/** En-tête secondaire (subHeader) : ‹ retour, nom de la page, panier BelivaY vers le tableau de bord. */
function EnTeteSecondaire({ titre, retour }: { titre: string; retour: string }) {
  const { t } = usePreferences()
  return (
    <header className="hd glass hd-2">
      <div className="hd-sub">
        <Link className="ibtn" to={retour} aria-label={t('Revenir')}>
          <Icone nom="chevron-left" taille={26} />
        </Link>
        <h1>{titre}</h1>
        <Link className="ibtn cart" to={chemin(ACCUEIL)} aria-label={t('Tableau de bord')}>
          <img src={marque} alt="" />
        </Link>
      </div>
    </header>
  )
}

/** Thème et langue (aussi sur l'écran de connexion, plein écran). */
export { Reglages }

/** Sans session : le logo, le thème et la langue. */
function EnTeteSansSession() {
  return (
    <header className="hd glass hd-2">
      <div className="hd-row">
        <span className="hd-logo">
          <img src={logo} alt="BelivaY" />
        </span>
        <span className="hd-sp"></span>
        <Reglages />
      </div>
    </header>
  )
}

// ---------- Barre du bas (dock du prototype : Tableau, Paquets, Missions, Livreurs ; le Menu est « ☰ ») ----------

/** Onglets d'un rôle : un onglet fermé à ce rôle (Paquets et Missions au comptable, ENT-02-R64, R66) laisse sa place à
 * une page qu'il ouvre (Règlements, Relevés), jamais à une page « Réservé à d'autres rôles ». */
const REMPLACANTS = [
  { id: 'reglements', titre: 'Règlements', icone: 'banknote' },
  { id: 'releves', titre: 'Relevés', icone: 'file-text' },
]
function useOnglets() {
  const ouverte = useRouteOuverte()
  const libres = REMPLACANTS.filter((r) => ouverte(r.id))
  return ONGLETS.map((o) => (ouverte(o.id) ? o : (libres.shift() ?? o)))
}

// Barre du bas vivante (styles/finitions.css) : la capsule active glisse depuis l'onglet quitté ; un compteur qui change
// « saute ». La barre est reconstruite à chaque page : la position de l'onglet quitté et les compteurs vus sont gardés ici.
let ongletQuitte: number | null = null
const compteursVus = new Map<string, string | null>()
function useBarreVivante(actif: string | null, compteurs: [string, string | null][]) {
  useLayoutEffect(() => {
    const on = document.querySelector<HTMLElement>('nav.dock .tab.on')
    if (!on) return void (ongletQuitte = null)
    const x = on.offsetLeft
    if (ongletQuitte !== null && ongletQuitte !== x && document.documentElement.hasAttribute('data-mouv')) {
      on.style.setProperty('--fin-dx', `${ongletQuitte - x}px`)
      on.classList.add('fin-glisse')
      const m = window.setTimeout(() => (on.classList.remove('fin-glisse'), on.style.removeProperty('--fin-dx')), 450)
      ongletQuitte = x
      return () => window.clearTimeout(m)
    }
    ongletQuitte = x
  }, [actif])
  const cle = compteurs.map(([id, n]) => id + ':' + n).join('|')
  useEffect(() => {
    for (const [id, n] of compteurs) {
      const avant = compteursVus.get(id)
      compteursVus.set(id, n)
      if (n === null || avant === n || !document.documentElement.hasAttribute('data-mouv')) continue
      const b = document.querySelector<HTMLElement>(`nav.dock .tab[data-onglet="${id}"] .bdg`)
      if (!b) continue
      b.classList.remove('fin-saute')
      void b.offsetWidth
      b.classList.add('fin-saute')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle])
}

export function BarreDuBas({ actif: parent, route }: { actif: string | null; route?: string }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const onglets = useOnglets()
  const actif = route && onglets.some((o) => o.id === route) ? route : parent
  const bulle = useBulle(
    onglets.map((o) => chemin(o.id)),
    onglets.findIndex((o) => o.id === actif),
  )
  // Paquets : paquets à accepter ; Livreurs : demandes des livreurs (départs, absences) qui attendent l'entreprise.
  const badgeDe = (id: string) => (id === 'paquets' ? badge(s.badges.paquets) : id === 'flotte' ? badge(s.badges.demandes ?? 0) : null)
  useBarreVivante(actif, onglets.map((o) => [o.id, badgeDe(o.id)]))
  const contenu = (o: (typeof onglets)[number]) => {
    const b = badgeDe(o.id)
    return (
      <>
        <Icone nom={o.icone} taille={22} />
        <span>{t(o.titre)}</span>
        {b && <span className="bdg">{b}</span>}
      </>
    )
  }
  return (
    <nav className={'dock glass' + (bulle.bouge ? ' bouge' : '')} aria-label={t('Navigation principale')} {...bulle.props}>
      {onglets.map((o) => {
        const b = badgeDe(o.id)
        const on = o.id === actif
        return (
          <Link key={o.id} className={'tab' + (on ? ' on' : '')} data-onglet={o.id} to={chemin(o.id)} aria-current={on ? 'page' : undefined} aria-label={b ? tf(o.id === 'flotte' ? '{onglet}, {n} demande(s)' : '{onglet}, {n} à accepter', { onglet: t(o.titre), n: b }) : undefined}>
            {contenu(o)}
          </Link>
        )
      })}
      {bulle.lentille(
        onglets.map((o) => (
          <span key={o.id} className="tab-copie">
            {contenu(o)}
          </span>
        )),
      )}
    </nav>
  )
}

// ---------- Navigation groupée (barre latérale, tiroir, Menu) ----------

/** Entrée de navigation allumée pour une route : elle-même, sinon son entrée déclarée, sinon celle d'un parent. */
export function entreeActive(route: string): string | null {
  for (let r = route, n = 0; r && n < 8; n++) {
    if (ENTREES.has(r)) return r
    const f = ROUTES[r]
    if (f?.nav) return f.nav
    if (!f?.parent) return null
    r = f.parent
  }
  return null
}

/** Groupes de navigation filtrés par rôle (une entrée fermée au rôle disparaît, puis un groupe vide). */
export function useNavigation() {
  const ouverte = useRouteOuverte()
  return NAVIGATION.map((g) => ({ ...g, entrees: g.entrees.filter((e) => ouverte(e.route)) })).filter((g) => g.entrees.length > 0)
}

type Aller = (vers: string) => (e: React.MouseEvent) => void

/** Carte de l'entreprise (sd-space du prototype) : nom, quartier, flotte et zones, état et plafond → État du compte. */
export function CarteEntreprise({ aller }: { aller?: Aller }) {
  const { t, tf } = usePreferences()
  const e = useSession().entreprise
  const texte = useTexteEtat()
  const couverture = useCouverture(e?.id)
  if (!e) return null
  const plafond = e.plafond === null ? t('sans plafond') : tf('≤ {montant} F', { montant: F(e.plafond) })
  return (
    <Link className={'sd-space' + (couverture ? ' avec-couv' : '')} style={couverture ? ({ '--couv': `url("${couverture}")` } as CSSProperties) : undefined} to={chemin('etat')} onClick={aller?.(chemin('etat'))} aria-label={tf('{nom} · État du compte', { nom: e.nom })}>
      <div className="k">{t('Entreprise partenaire')}</div>
      <div className="n">{e.nom}</div>
      <div className="s">{tf('{quartier} · {l} livreurs · {z} zones', { quartier: e.quartier, l: e.livreurs, z: e.zones })}</div>
      <div className="pl">
        <span className="pill dk sm">{texte}</span>
        <span className="pill dk sm">{`${t(NOM_PALIER[e.palier])} · ${plafond}`}</span>
      </div>
    </Link>
  )
}

/** Barre latérale du prototype (sidebar) : logo, carte de l'entreprise, navigation, utilisateur, mentions.
 * fermer : tiroir de la tablette (une entrée touchée referme d'abord le tiroir). */
function BarreLaterale({ fermer, route }: { fermer?: { pathname: string; search: string }; route: string }) {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const s = useSession()
  const deconnecter = useSeDeconnecter()
  const groupes = useNavigation()
  const actif = entreeActive(route)
  const aller: Aller = (vers) => (e) => {
    if (!fermer || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    naviguer(fermer, { replace: true })
    naviguer(vers)
  }
  const u = s.utilisateur
  return (
    <aside className="sd sl" aria-label={t('Barre latérale')}>
      <Link className="sd-logo" to={chemin(ACCUEIL)} onClick={aller(chemin(ACCUEIL))} aria-label={t('Tableau de bord')}>
        <img src={logo} alt="BelivaY" />
      </Link>
      <CarteEntreprise aller={aller} />
      <nav className="sd-nav" aria-label={t('Navigation de l’espace entreprise')}>
        {groupes.map((g) => (
          <div key={g.titre}>
            <div className="sd-g">{t(g.titre)}</div>
            {g.entrees.map((e) => {
              const n = e.badge ? badge(s.badges[e.badge] ?? 0) : null
              const on = e.route === actif
              return (
                <Link key={e.route} to={chemin(e.route)} onClick={aller(chemin(e.route))} className={'sd-i nav-it' + (on ? ' on' : '')} aria-current={on ? 'page' : undefined} aria-label={n ? tf('{entree}, {n}', { entree: t(e.titre), n }) : undefined}>
                  <Icone nom={e.icone} taille={18} />
                  <span>{t(e.titre)}</span>
                  {n && <span className={'n compteur ' + (e.ton === 'alerte' ? 'red' : 'acc')}>{n}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="sd-foot">
        {u && (
          <div className="sd-user">
            <Link className="av" to={chemin('profil')} onClick={aller(chemin('profil'))} aria-label={t('Mon profil')}>
              <Portrait id={u.id} initiales={u.initiales} />
            </Link>
            <span className="grow">
              <b>{`${u.prenom} ${u.nom}`}</b>
              <span>{`${t(NOM_ROLE[u.role])} · ${s.entreprise?.nom ?? ''}`}</span>
            </span>
            <button type="button" className="ibtn" onClick={() => void deconnecter()} aria-label={t('Se déconnecter')}>
              <Icone nom="log-out" taille={17} />
            </button>
          </div>
        )}
        <div className="sd-mentions">{`${PARAMETRES.saisies.mentions.denomination} · RCCM ${PARAMETRES.saisies.mentions.rccm}`}</div>
      </div>
    </aside>
  )
}

/** Tiroir de la tablette : la barre latérale par-dessus la page (« ?pop=menu »). */
function Tiroir({ route }: { route: string }) {
  const { t } = usePreferences()
  const lieu = useLocation()
  const naviguer = useNavigate()
  const fermer = avecPop(lieu.pathname, lieu.search, null)
  const boite = useRef<HTMLDivElement>(null)
  useEffect(() => {
    boite.current?.querySelector<HTMLElement>('.sd-i')?.focus({ preventScroll: true })
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && naviguer(fermer, { replace: true })
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Link className="tr-veil" to={fermer} replace aria-label={t('Fermer le menu')}></Link>
      <div ref={boite} className="tr" role="dialog" aria-modal="true" aria-label={t('Menu')}>
        <Link className="ibtn tr-x" to={fermer} replace aria-label={t('Fermer le menu')}>
          <Icone nom="x" taille={20} />
        </Link>
        <BarreLaterale fermer={fermer} route={route} />
      </div>
    </>
  )
}

// ---------- Barre du haut de la console (topbar) ----------

/** Ancre d'un groupe de navigation dans le Menu (fil d'Ariane → groupe). */
export const idGroupe = (titre: string) => 'g-' + titre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, '-')

/**
 * Recherche de la barre du haut (« Paquet, colis, livreur… », ⌘K) : suggestions pendant la saisie (paquets, missions,
 * colis, livreurs, incidents, litiges, véhicules, zones, pages ; lues dans la source, filtrées par rôle), flèches et
 * Entrée pour choisir, Échap pour fermer. Un identifiant entier ouvre sa fiche ; sinon « Tout voir » mène à la page
 * Rechercher partout avec la saisie.
 */
function Recherche() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const ouverte = useRouteOuverte()
  const id = useId()
  const champ = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(-1)
  const [index, setIndex] = useState<Resultat[] | null>(null)
  const charger = () => {
    if (!index) void chargerIndex(ouverte, t).then(setIndex, () => setIndex([]))
  }
  useEffect(() => {
    const viser = () => {
      champ.current?.focus()
      champ.current?.select()
    }
    window.addEventListener('blv-e-chercher', viser)
    return () => window.removeEventListener('blv-e-chercher', viser)
  }, [])
  const res = q.trim() && index ? filtrer(index, q, 7) : []
  const tout = res.length // dernière option : « Tout voir »
  // Champ vide : les recherches récentes de l'appareil (6 au plus), à reprendre d'un toucher.
  const [anciennes, setAnciennes] = useState<string[]>([])
  const vide = !q.trim()
  const aller = (vers: string) => {
    retenir(q)
    setQ('')
    setOuvert(false)
    setActif(-1)
    champ.current?.blur()
    naviguer(vers)
  }
  const chercher = (e: FormEvent) => {
    e.preventDefault()
    const v = q.trim()
    if (!v) {
      const a = actif >= 0 ? anciennes[actif] : undefined
      if (a) aller(adresseDirecte(a) ?? chemin('recherche', { q: a }))
      return
    }
    if (actif >= 0 && actif < res.length) return aller(res[actif].vers)
    aller(adresseDirecte(v) ?? chemin('recherche', { q: v }))
  }
  const touche = (e: ToucheReact<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOuvert(true)
      const n = vide ? anciennes.length || 1 : tout + 1
      setActif((a) => (e.key === 'ArrowDown' ? (a + 1) % n : (a - 1 + n) % n))
    } else if (e.key === 'Escape') {
      if (ouvert && (q || anciennes.length > 0)) {
        e.stopPropagation()
        setOuvert(false)
      } else champ.current?.blur()
    }
  }
  const montrer = ouvert && (!vide || anciennes.length > 0)
  return (
    <form className="srch" role="search" onSubmit={chercher} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOuvert(false)}>
      <Icone nom="search" taille={17} />
      <input
        ref={champ}
        type="search"
        value={q}
        onFocus={() => {
          charger()
          setAnciennes(recentes())
          setOuvert(true)
        }}
        onChange={(e) => {
          setQ(e.target.value)
          setOuvert(true)
          setActif(-1)
        }}
        onKeyDown={touche}
        placeholder={t('Paquet, colis, livreur…')}
        aria-label={t('Rechercher un paquet, une mission ou un livreur')}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={montrer}
        aria-controls={id}
        aria-activedescendant={montrer && actif >= 0 ? `${id}-${actif}` : undefined}
        autoComplete="off"
      />
      <kbd className="srch-k" aria-hidden="true">
        ⌘K
      </kbd>
      {montrer && vide && (
        <ul className="srch-l glass" id={id} role="listbox" aria-label={t('Recherches récentes')}>
          <li className="srch-r" role="presentation">
            {t('Recherches récentes')}
          </li>
          {anciennes.map((a, i) => (
            <li key={a} id={`${id}-${i}`} role="option" aria-selected={i === actif}>
              <Link to={adresseDirecte(a) ?? chemin('recherche', { q: a })} tabIndex={-1} onClick={(e) => (e.preventDefault(), aller(adresseDirecte(a) ?? chemin('recherche', { q: a })))} onMouseDown={(e) => e.preventDefault()}>
                <Icone nom="history" taille={17} />
                <span className="grow">
                  <b>{a}</b>
                </span>
                <Icone nom="chevron-right" taille={16} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {montrer && !vide && (
        <ul className="srch-l glass" id={id} role="listbox" aria-label={t('Suggestions')}>
          {!index && <li className="srch-v">{t('Chargement')}</li>}
          {index && res.length === 0 && <li className="srch-v">{tf('Aucun résultat direct pour « {q} »', { q: q.trim() })}</li>}
          {res.map((r, i) => (
            <li key={r.genre + r.id} id={`${id}-${i}`} role="option" aria-selected={i === actif}>
              <Link to={r.vers} tabIndex={-1} onClick={(e) => (e.preventDefault(), aller(r.vers))} onMouseDown={(e) => e.preventDefault()}>
                <Icone nom={r.icone} taille={17} />
                <span className="grow">
                  <b>{r.titre}</b>
                  {r.sous && <span>{r.sous}</span>}
                </span>
              </Link>
            </li>
          ))}
          <li id={`${id}-${tout}`} role="option" aria-selected={actif === tout} className="srch-tout">
            <Link to={chemin('recherche', { q: q.trim() })} tabIndex={-1} onClick={(e) => (e.preventDefault(), aller(chemin('recherche', { q: q.trim() })))} onMouseDown={(e) => e.preventDefault()}>
              <Icone nom="search" taille={17} />
              <span className="grow">{tf('Tout voir pour « {q} »', { q: q.trim() })}</span>
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </li>
        </ul>
      )}
    </form>
  )
}

function BarreDuHaut({ route, titre, appareil, retour }: { route: string; titre: string; appareil: Appareil; retour: string | null }) {
  const { t, tf } = usePreferences()
  // Messages et notifications dans l'en-tête, partout (ORGANISATION.md).
  const ouverte = useRouteOuverte()
  const nMessages = badge(useSession().badges.messages)
  const lieu = useLocation()
  const pop = new URLSearchParams(lieu.search).get('pop')
  const active = entreeActive(route)
  const groupe = NAVIGATION.find((g) => g.entrees.some((e) => e.route === active))
  const entree = groupe?.entrees.find((e) => e.route === active)
  return (
    <header className="tb glass">
      <span className="tb-tab">
        {appareil === 'tablet' && (
          <Link className="ibtn" to={avecPop(lieu.pathname, lieu.search, pop === 'menu' ? null : 'menu')} replace aria-label={t('Menu')} aria-haspopup="dialog" aria-expanded={pop === 'menu'}>
            <Icone nom="menu" taille={22} />
          </Link>
        )}
        <Link to={chemin(ACCUEIL)} aria-label={t('Tableau de bord')}>
          <img src={logo} alt="BelivaY" />
        </Link>
      </span>
      {retour && (
        <Link className="ibtn tb-retour" to={retour} aria-label={t('Revenir')}>
          <Icone nom="chevron-left" taille={22} />
        </Link>
      )}
      <div className="grow" style={{ minWidth: 0 }}>
        <nav className="crumbs" aria-label={t('Fil d’Ariane')}>
          <Link to={chemin(ACCUEIL)} aria-label={t('Tableau de bord')}>
            <Icone nom="house" taille={15} />
          </Link>
          {groupe && (
            <>
              <Icone nom="chevron-right" taille={13} />
              <Link to={chemin('menu') + '#' + idGroupe(groupe.titre)}>{t(groupe.titre)}</Link>
            </>
          )}
          {entree && entree.route !== route && (
            <>
              <Icone nom="chevron-right" taille={13} />
              <Link to={chemin(entree.route)}>{t(entree.titre)}</Link>
            </>
          )}
          <Icone nom="chevron-right" taille={13} />
          <span className="cur" aria-current="page">
            {titre}
          </span>
        </nav>
      </div>
      <Recherche />
      <div className="tb-pills">
        <Pastilles route={route} />
      </div>
      <Reglages taille={20} />
      {ouverte('messages') && (
        <Link className={'ibtn' + (route === 'messages' ? ' on' : '')} to={chemin('messages')} aria-label={nMessages ? tf('{entree}, {n}', { entree: t('Messages'), n: nMessages }) : t('Messages')}>
          <Icone nom="message-circle" taille={20} />
          {nMessages && <span className="bdg">{nMessages}</span>}
        </Link>
      )}
      <Cloche taille={20} panneau />
      <Avatar />
      {/* Page secondaire : panier BelivaY en haut à droite vers le tableau de bord, comme au téléphone (EnTeteSecondaire)
          et comme le client, le livreur et le point relais. */}
      {retour && (
        <Link className="ibtn cart tb-marque" to={chemin(ACCUEIL)} aria-label={t('Tableau de bord')}>
          <img src={marque} alt="" />
        </Link>
      )}
    </header>
  )
}

// ---------- Bandeau d'état du compte (ENT-01-R17) ----------

function BandeauCompte() {
  const { t, tf } = usePreferences()
  const e = useSession().entreprise
  if (!e || e.etat === 'pilote' || e.etat === 'actif') return null
  const rouge = e.etat === 'suspendu' || e.etat === 'resilie'
  return (
    <div className={'dk-banner ' + (rouge ? 'red' : 'amber')} role="status">
      <Icone nom={rouge ? 'shield-x' : 'shield-alert'} taille={20} />
      <div className="grow">
        {tf('{etat} : décidé par BelivaY.', { etat: t(NOM_ETAT[e.etat]) })} <Link to={chemin('etat')}>{t('Voir ce que cela change')}</Link>
      </div>
    </div>
  )
}

// ---------- Écran ----------

/** Chiffre clé de l'en-tête de page : le compteur de l'entrée de navigation de la page (déjà affiché dans la barre
 * latérale), avec ce qu'il compte. Rien quand il vaut zéro ou que le titre le dit déjà. */
const COMPTE_DE: Record<string, string> = { paquets: 'à accepter', missions: 'en cours', incidents: 'à valider', demandes: 'demandes en attente', pieces: 'à contrôler', litiges: 'en cours', messages: 'non lus' }
function ChiffreCle({ route, titre }: { route: string; titre: string }) {
  const { t } = usePreferences()
  const s = useSession()
  const e = NAVIGATION.flatMap((g) => g.entrees).find((x) => x.route === route)
  const n = e?.badge ? badge(s.badges[e.badge] ?? 0) : null
  if (!e?.badge || !n || titre.includes(n)) return null
  return (
    <span className={'fin-chiffre' + (e.ton === 'alerte' ? ' alerte' : '')}>
      <b>{n}</b>
      {t(COMPTE_DE[e.badge] ?? 'en attente')}
    </span>
  )
}

/**
 * Un écran du prototype (page()) : en-tête de page (surtitre `kicker`, titre, sous-titre `sous`, `actions`), puis le
 * contenu. Le titre et le parent viennent de la fiche de la route (src/pages/ENT-xx/routes.ts) ; `titre` et `retour`
 * les remplacent quand ils portent une donnée (« Paquet PQ-2417 ») ; `nom` : nom court de l'en-tête secondaire du
 * téléphone (par défaut, l'entrée de navigation de la page, sinon le titre). `entete={false}` : sans en-tête de page.
 */
export function Ecran(p: {
  route: string
  titre?: string
  nom?: string
  kicker?: ReactNode
  sous?: ReactNode
  retour?: string
  actions?: ReactNode
  entete?: boolean
  plein?: boolean // écran plein, sans coque (connexion du prototype : visuel et carte de connexion)
  fixes?: ReactNode
  children?: ReactNode
}) {
  const { t } = usePreferences()
  const s = useSession()
  const lieu = useLocation()
  const fiche = ROUTES[p.route]
  const appareil = useAppareil()
  const pop = new URLSearchParams(lieu.search).get('pop')
  const titre = p.titre ?? t(fiche?.titre ?? '')
  const racine = !fiche?.parent || ONGLETS.some((o) => o.id === p.route)
  const retour = p.retour ?? (fiche?.parent ? chemin(fiche.parent) : chemin('menu'))
  const entree = NAVIGATION.flatMap((g) => g.entrees).find((e) => e.route === p.route)
  const nom = p.nom ?? (entree ? t(entree.titre) : titre)
  useEffect(() => {
    document.title = t('BelivaY entreprise') + ' — ' + titre
  }, [t, titre])
  useLayoutEffect(() => {
    document.documentElement.dataset.device = appareil
  }, [appareil])
  // Téléphone : l'en-tête est posé au-dessus du contenu ; sa hauteur (qui suit la taille du texte) est mesurée.
  const refApp = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const app = refApp.current
    const hd = app?.querySelector<HTMLElement>(':scope > header.hd')
    if (!app || !hd) return
    const poser = () => app.style.setProperty('--hd-h', hd.offsetHeight + 'px')
    poser()
    const ro = new ResizeObserver(poser)
    ro.observe(hd)
    return () => ro.disconnect()
  })
  // Dès 768 px, le contenu reçoit le focus à chaque changement de page (Espace et les flèches le font défiler).
  const refMain = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    if (appareil !== 'mobile' && !refMain.current?.contains(document.activeElement) && !document.querySelector('#app .sheet, #app .tr')) refMain.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lieu.pathname])
  // Au téléphone, l'en-tête secondaire porte déjà le titre de niveau 1 : celui de la page passe en niveau 2.
  const titreH2 = appareil === 'mobile' && !racine && s.connecte
  // …et ne s'y répète pas en grand quand c'est le même mot (il reste lu par les lecteurs d'écran) : la bande de la page
  // ne garde que la ligne d'information, le chiffre clé et les actions (styles/finitions.css, 4).
  // Téléphone : les actions principales vont dans la zone du pouce, au-dessus de la barre du bas (BRIEF-ENRICHISSEMENT).
  const zonePouce = appareil === 'mobile' && s.connecte && !p.plein
  const pouce = zonePouce && !!p.actions
  // En-tête unique (REFONTE-PRESENTATION.md) : surtitre, titre, sous-titre, actions ; la tête d'un écran repris
  // (Tete) y dépose son surtitre, son sous-titre et, au téléphone, ses actions secondaires par ces emplacements.
  const [elSurtitre, setElSurtitre] = useState<HTMLElement | null>(null)
  const [elSous, setElSous] = useState<HTMLElement | null>(null)
  const [elActes, setElActes] = useState<HTMLElement | null>(null)
  const emplacements: EmplacementsEnTete | null = p.entete === false || p.plein ? null : { surtitre: elSurtitre, sous: elSous, actions: elActes }
  const enTeteDePage =
    p.entete === false ? null : (
      <div className="dk-head e-tete">
        <div className="grow">
          <div className="pg">
            <div className="pg-k" ref={setElSurtitre}>
              {p.kicker}
            </div>
            {titreH2 ? <h2 className={'pg-t' + (titre === nom ? ' vh' : '')}>{titre}</h2> : <h1 className="pg-t">{titre}</h1>}
            <p className="pg-s" ref={setElSous}>
              {p.sous}
            </p>
            {s.connecte && <ChiffreCle route={p.route} titre={titre} />}
          </div>
        </div>
        <div className="acts" ref={setElActes}>
          {p.actions && !pouce && p.actions}
        </div>
      </div>
    )
  // Rang de la page (composants/rang.ts) : principale (Tableau, onglets de la barre du bas, Menu) ou secondaire
  // (tout le reste : filtres et ligne de résumé, jamais de rangée de tuiles).
  const secondaire = s.connecte && !racine
  const corps = (
    <RangSecondaire.Provider value={secondaire}>
    <EnTeteContexte.Provider value={emplacements}>
      {s.connecte && p.route !== 'etat' && <BandeauCompte />}
      <BandeauHorsLigne />
      {s.connecte && <BandeauConsole />}
      {s.connecte && <FileEnAttente />}
      {enTeteDePage}
      {p.children}
    </EnTeteContexte.Provider>
    </RangSecondaire.Provider>
  )
  const classes = ['r-' + p.route, fiche?.etroit ? 'l-etroit' : '', secondaire ? 'p-sec' : 'p-pri'].filter(Boolean).join(' ')
  if (p.plein)
    return (
      <div id="app" ref={refApp} className={'a-plein ' + classes}>
        <main ref={refMain} id="contenu" className="px" tabIndex={-1}>
          {p.children}
        </main>
        <div className="px">{p.fixes}</div>
      </div>
    )
  if (appareil === 'mobile' || !s.connecte) {
    const entete = !s.connecte ? <EnTeteSansSession /> : racine ? <EnTeteRacine route={p.route} /> : <EnTeteSecondaire titre={nom} retour={retour} />
    return (
      <div id="app" ref={refApp} className={'m-app ' + classes + (s.connecte ? '' : ' a-sans')}>
        {entete}
        <main ref={refMain} id="contenu" className="px" tabIndex={-1}>
          {corps}
        </main>
        {pouce && (
          <div className="e-pouce px" role="toolbar" aria-label={t('Actions principales')}>
            {p.actions}
          </div>
        )}
        {s.connecte && <BarreDuBas actif={fiche ? ongletDe(p.route) : null} route={p.route} />}
        {s.connecte && <Raccourcis />}
        <div className="px">{p.fixes}</div>
      </div>
    )
  }
  return (
    <div id="app" ref={refApp} className={'cns ' + classes}>
      {appareil === 'desktop' && <BarreLaterale route={p.route} />}
      <div className="dk-main">
        <BarreDuHaut route={p.route} titre={nom} appareil={appareil} retour={racine || ENTREES.has(p.route) ? null : retour} />
        <main ref={refMain} id="contenu" className="dk-body px" tabIndex={-1}>
          {corps}
        </main>
      </div>
      <div className="px">{p.fixes}</div>
      {appareil === 'tablet' && pop === 'menu' && <Tiroir route={p.route} />}
      {s.connecte && <Raccourcis />}
    </div>
  )
}
