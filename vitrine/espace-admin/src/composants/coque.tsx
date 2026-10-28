// La coque de la console d'administration, sur la STRUCTURE EXACTE du prototype (rootHeader, subHeader, dock, sidebar,
// topbar, page() du prototype ADMIN, data-app="adm" ; mêmes balises et classes, styles/prototype.css), avec le contenu
// réel : agent, rôle et périmètre, compteurs, droits (config/droits.ts), couleur graphite (jetons.css).
// La PASTILLE RÔLE · PÉRIMÈTRE est toujours visible dans l'en-tête (ADM-ROL-01) : barre du haut à l'ordinateur, en-tête
// racine et sous-titre de l'en-tête secondaire au téléphone.
// Le format est posé sur <html data-device> comme dans le prototype (ORDINATEUR D'ABORD) :
// - Ordinateur (dès 1024 px) : barre latérale (logo, carte « Espace pays », navigation groupée avec compteurs, agent
//   et déconnexion, mentions), barre du haut (fil d'Ariane, recherche, pastilles, thème, langue, cloche → File
//   d'action, avatar → Profil), en-tête de page ;
// - Tablette (768 à 1023 px) : la barre latérale en tiroir (« ☰ » de la barre du haut, « ?pop=menu ») ;
// - Téléphone : en-tête racine (☰ Menu, logo, thème, langue, cloche, avatar ; libellé ; pastilles) ou secondaire
//   (‹ retour, nom de la page, rôle rappelé) ; barre du bas File, Litiges, Argent, Menu (onglets propres à chaque rôle,
//   config/pages.ts ONGLETS_ROLE). Les actions d'une page passent, au téléphone, dans le flux sous les tuiles.
// Partout : ⌘K, Ctrl+K ou « / » cherche, « g » puis une lettre ouvre une page, « ? » liste les raccourcis.
import { Fonctions, type Fonction } from './Fonctions'
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent as ToucheReact, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useBulle } from '@client/composants/BarreBas'
import { useDes } from '@client/composants/ecran'
import { badge } from '@client/i18n/format'
import logo from '../assets/logo-belivay.png'
import marque from '../assets/marque-belivay.png'
import { PARAMETRES } from '../calculs/registre'
import { NOM_ROLE, PERIMETRE_ROLE } from '../config/libelles'
import { ENTREES, NAVIGATION } from '../config/navigation'
import { ACCUEIL, ONGLETS_ROLE, chemin } from '../config/pages'
import { ROUTES, ongletDe } from '../config/routes'
import { usePreferences } from '../preferences'
import { useRouteOuverte, useSeDeconnecter, useSession } from '../session'
import { BandeauHorsLigne } from './BandeauHorsLigne'
import { BandeauPanne } from './BandeauPanne'
import { FileEnAttente } from './prototype'
import { Raccourcis } from './Raccourcis'
import { adresseDirecte, filtrer, indexDesPages, recentes, retenir, type Resultat } from './recherche'
import { Portrait } from './Portrait'
import { RangSecondaire } from './rang'
import { Icone } from './Icone'

// ---------- Format (html[data-device], comme le prototype) ----------

export type Appareil = 'mobile' | 'tablet' | 'desktop'
export function useAppareil(): Appareil {
  const tab = useDes('tab')
  const ord = useDes('tab-l')
  return ord ? 'desktop' : tab ? 'tablet' : 'mobile'
}

// ---------- Pastilles (ADM-ROL-01 : rôle et périmètre toujours affichés) ----------

/** « Direction · tous périmètres », « Opérations et logistique · Z1, Z2, Z3, Z6 » (court : le rôle seul). */
export function useTexteRole(court = false): string {
  const { t } = usePreferences()
  const s = useSession()
  const role = t(NOM_ROLE[s.role])
  if (court) return role
  const zones = (s.role === 'operations' || s.role === 'terrain') && s.agent?.zones ? s.agent.zones.join(', ') : t(PERIMETRE_ROLE[s.role])
  return `${role} · ${zones}`
}

/** Pastilles du prototype (APP.pills / mpills) : rôle · périmètre (→ Profil, où l'on change de rôle) et espace pays. */
function Pastilles({ court }: { court?: boolean }) {
  const { t } = usePreferences()
  const s = useSession()
  const texte = useTexteRole(court)
  if (!s.agent) return null
  return (
    <>
      <Link className="pill acc e-role" to={chemin('profil')} aria-label={t('Rôle et périmètre') + ' : ' + texte}>
        <Icone nom="shield-check" taille={13} />
        {texte}
      </Link>
      {court ? (
        s.astreinte && (
          <span className="pill or">
            <i className="d"></i>
            {t('Astreinte')}
          </span>
        )
      ) : (
        <span className="pill ink">{`${t(s.pays.nom)} · ${s.pays.devise}`}</span>
      )}
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

/** Cloche (APP.notif = 'file') : la File d'action, avec le nombre de cartes qui attendent ce rôle. */
// Cloche qui sonne (styles/finitions.css) : un léger balancement quand le nombre de cartes en attente monte (et une
// fois à l'ouverture de la console s'il y en a). Le dernier nombre vu survit au changement de page.
let dernierNombre: number | null = null
function useSonne(nombre: number): boolean {
  const [sonne, setSonne] = useState(false)
  useEffect(() => {
    const monte = dernierNombre === null ? nombre > 0 : nombre > dernierNombre
    dernierNombre = nombre
    // Sans mouvement permis (html[data-mouv]), aucune classe posée : rien ne change à l'écran.
    if (!monte || !document.documentElement.hasAttribute('data-mouv')) return
    setSonne(true)
    const m = window.setTimeout(() => setSonne(false), 1100)
    return () => window.clearTimeout(m)
  }, [nombre])
  return sonne
}

function Cloche({ taille }: { taille: number }) {
  const { t, tf } = usePreferences()
  const ouverte = useRouteOuverte()
  const s = useSession()
  const n = badge(s.badges.file)
  const sonne = useSonne(s.badges.file)
  const vers = ouverte('file') ? 'file' : 'menu'
  return (
    <Link className={'ibtn' + (sonne ? ' fin-sonne' : '')} to={chemin(vers)} aria-label={n ? tf('File d’action, {n} cartes en attente', { n }) : t('File d’action')}>
      <Icone nom="bell" taille={taille} />
      {n && <span className="bdg">{n}</span>}
    </Link>
  )
}

/** Avatar de l'en-tête : il ouvre le Profil (la personne connectée ; distinct du Menu, comme le prototype). */
function Avatar() {
  const { t } = usePreferences()
  const u = useSession().agent
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
  const attente = s.badges.quatreyeux + s.badges.fraude > 0
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
        <Link className="hd-logo" to={chemin(ACCUEIL)} aria-label={t('Accueil de la console')}>
          <img src={logo} alt="BelivaY" />
        </Link>
        <span className="hd-sp"></span>
        <Reglages />
        <Cloche taille={22} />
        <Avatar />
      </div>
      <div className="hd-label">
        <i></i>
        {t('Console d’administration')}
      </div>
      <div className="hd-pills">
        <Pastilles court />
      </div>
    </header>
  )
}

/** En-tête secondaire (subHeader) : ‹ retour, nom de la page, logo BelivaY vers l'accueil ; le rôle et le périmètre
 * rappelés dessous (APP.msublabel, ADM-ROL-01). */
function EnTeteSecondaire({ titre, retour }: { titre: string; retour: string }) {
  const { t } = usePreferences()
  const role = useTexteRole()
  return (
    <header className="hd glass hd-2">
      <div className="hd-sub">
        <Link className="ibtn" to={retour} aria-label={t('Revenir')}>
          <Icone nom="chevron-left" taille={26} />
        </Link>
        <h1>{titre}</h1>
        <Link className="ibtn cart" to={chemin(ACCUEIL)} aria-label={t('Accueil de la console')}>
          <img src={marque} alt="" />
        </Link>
      </div>
      <div className="hd-label e-role-l">
        <i></i>
        {role}
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

// ---------- Barre du bas (dock du prototype : File, Litiges, Argent, Menu ; propres à chaque rôle) ----------

/** Onglets du rôle (ONGLETS_ROLE), sans jamais une page qu'il n'ouvre pas. */
export function useOnglets() {
  const ouverte = useRouteOuverte()
  const { role } = useSession()
  return ONGLETS_ROLE[role].filter((o) => o.id === 'menu' || ouverte(o.id))
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
  const badgeDe = (id: string) => (id in s.badges ? badge(s.badges[id as keyof typeof s.badges]) : null)
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
          <Link key={o.id} className={'tab' + (on ? ' on' : '')} data-onglet={o.id} to={chemin(o.id)} aria-current={on ? 'page' : undefined} aria-label={b ? tf('{onglet}, {n} en attente', { onglet: t(o.titre), n: b }) : undefined}>
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

/** Carte « Espace pays » (sd-space du prototype, APP.space) : pays et devise, zones exploitées ou périmètre de
 * l'agent, rôle et quatre yeux en attente ; elle mène aux Espaces pays (Direction), sinon au Profil. */
export function CartePays({ aller }: { aller?: Aller }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const ouverte = useRouteOuverte()
  const vers = chemin(ouverte('pays') ? 'pays' : 'profil')
  const zones = (s.role === 'operations' || s.role === 'terrain') && s.agent?.zones
  return (
    <Link className="sd-space" to={vers} onClick={aller?.(vers)} aria-label={tf('Espace pays : {pays}', { pays: `${t(s.pays.nom)} · ${s.pays.devise}` })}>
      <div className="k">{t('Espace pays')}</div>
      <div className="n">{`${t(s.pays.nom)} · ${s.pays.devise}`}</div>
      <div className="s">{zones ? tf('Périmètre : {zones}', { zones: zones.join(', ') }) : tf('{ville} · {n} zones exploitées sur {total}', { ville: s.pays.ville, n: s.pays.zonesExploitees.length, total: s.pays.zonesTotal })}</div>
      <div className="pl">
        <span className="pill dk sm">{t(NOM_ROLE[s.role])}</span>
        {s.badges.quatreyeux > 0 ? <span className="pill dk sm">{tf('Quatre yeux : {n} en attente', { n: s.badges.quatreyeux })}</span> : zones && <span className="pill dk sm">{t('Périmètre limité')}</span>}
      </div>
    </Link>
  )
}

/** Barre latérale du prototype (sidebar) : logo, carte « Espace pays », navigation, agent, mentions.
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
  const u = s.agent
  return (
    <aside className="sd sl" aria-label={t('Barre latérale')}>
      <Link className="sd-logo" to={chemin(ACCUEIL)} onClick={aller(chemin(ACCUEIL))} aria-label={t('Accueil de la console')}>
        <img src={logo} alt="BelivaY" />
      </Link>
      <CartePays aller={aller} />
      <nav className="sd-nav" aria-label={t('Navigation de la console')}>
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
              <span>{`${t(NOM_ROLE[s.role])} · ${t(s.pays.nom)}`}</span>
            </span>
            <button type="button" className="ibtn" onClick={() => void deconnecter()} aria-label={t('Se déconnecter')}>
              <Icone nom="log-out" taille={17} />
            </button>
          </div>
        )}
        <div className="sd-mentions">{`${t('Console v1')} · ${PARAMETRES.mentions.denomination} · RCCM ${PARAMETRES.mentions.rccm}`}</div>
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
 * Recherche de la barre du haut (« Commande, étiquette, paquet, acteur… », ⌘K) : suggestions pendant la saisie (pages
 * ouvertes au rôle ; un identifiant entier — BLV-…, PQ-…, LT-…, KYC-…, RB-…, QY-…, SP-… — ouvre sa fiche), flèches et
 * Entrée pour choisir, Échap pour fermer ; sinon « Tout voir » mène à la page Rechercher partout avec la saisie.
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
    if (!index) setIndex(indexDesPages(ouverte, t))
  }
  useEffect(() => {
    const viser = () => {
      champ.current?.focus()
      champ.current?.select()
    }
    window.addEventListener('blv-a-chercher', viser)
    return () => window.removeEventListener('blv-a-chercher', viser)
  }, [])
  const res = q.trim() && index ? filtrer(index, q, 7) : []
  const tout = res.length // dernière option : « Tout voir »
  // Champ vide : les recherches récentes de l'appareil (6 au plus), à reprendre d'un toucher.
  const [anciennes, setAnciennes] = useState<string[]>([])
  const vide = !q.trim()
  const versAncienne = (a: string) => adresseDirecte(a, ouverte) ?? chemin('recherche', { q: a })
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
      if (a) aller(versAncienne(a))
      return
    }
    if (actif >= 0 && actif < res.length) return aller(res[actif].vers)
    aller(adresseDirecte(v, ouverte) ?? chemin('recherche', { q: v }))
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
        placeholder={t('Commande, étiquette, paquet, acteur…')}
        aria-label={t('Rechercher une commande, un paquet ou un acteur')}
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
              <Link to={versAncienne(a)} tabIndex={-1} onClick={(e) => (e.preventDefault(), aller(versAncienne(a)))} onMouseDown={(e) => e.preventDefault()}>
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
  const { t } = usePreferences()
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
        <Link to={chemin(ACCUEIL)} aria-label={t('Accueil de la console')}>
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
          <Link to={chemin(ACCUEIL)} aria-label={t('Accueil de la console')}>
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
        <Pastilles />
      </div>
      <Reglages taille={20} />
      <Cloche taille={20} />
      <Avatar />
    </header>
  )
}

// ---------- Écran ----------

/** Chiffre clé de l'en-tête de page : le compteur de l'entrée de navigation de la page (déjà affiché dans la barre
 * latérale). Rien quand il vaut zéro ou que le titre le dit déjà. */
function ChiffreCle({ route, titre }: { route: string; titre: string }) {
  const { t } = usePreferences()
  const s = useSession()
  const e = NAVIGATION.flatMap((g) => g.entrees).find((x) => x.route === route)
  const n = e?.badge ? badge(s.badges[e.badge] ?? 0) : null
  if (!e?.badge || !n || titre.includes(n)) return null
  return (
    <span className={'fin-chiffre' + (e.ton === 'alerte' ? ' alerte' : '')}>
      <b>{n}</b>
      {t('en attente')}
    </span>
  )
}

/**
 * Un écran du prototype (page()) : en-tête de page (surtitre `kicker`, titre, sous-titre `sous`, `actions`), puis le
 * contenu. Le titre et le parent viennent de la fiche de la route (src/pages/ADM-xx/routes.ts) ; `titre` et `retour`
 * les remplacent quand ils portent une donnée (« Litige LT-0412 ») ; `nom` : nom court de l'en-tête secondaire du
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
  plein?: boolean // écran plein, sans coque (connexion du prototype)
  /** Fonctions d'abord : les gestes de la page avec leur nombre, posés sous le titre (composants/Fonctions.tsx). */
  fonctions?: Fonction[]
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
  const racine = !fiche?.parent || (s.connecte && ONGLETS_ROLE[s.role].some((o) => o.id === p.route))
  const retour = p.retour ?? (fiche?.parent ? chemin(fiche.parent) : chemin('menu'))
  const entree = NAVIGATION.flatMap((g) => g.entrees).find((e) => e.route === p.route)
  const nom = p.nom ?? (entree ? t(entree.titre) : titre)
  useEffect(() => {
    document.title = t('BelivaY console') + ' — ' + titre
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
  // Téléphone : les actions de la page dans le flux, sous les tuiles (rien ne passe dessous ; retour du coordinateur, 19 oct.).
  const pouce = appareil === 'mobile' && s.connecte && !!p.actions && !p.plein
  const enTeteDePage =
    p.entete === false ? null : (
      <div className="dk-head">
        <div className="grow">
          <div className="pg">
            {p.kicker && <div className="pg-k">{p.kicker}</div>}
            {titreH2 ? <h2 className={'pg-t' + (titre === nom ? ' vh' : '')}>{titre}</h2> : <h1 className="pg-t">{titre}</h1>}
            {p.sous && <p className="pg-s">{p.sous}</p>}
            {s.connecte && <ChiffreCle route={p.route} titre={titre} />}
          </div>
        </div>
        {p.actions && !pouce && <div className="acts">{p.actions}</div>}
      </div>
    )
  // Rang de la page (composants/rang.ts) : principale (accueil du rôle, Vue d'ensemble, Menu, onglets du rôle) ou
  // secondaire (tout le reste : filtres et ligne de résumé au lieu des tuiles).
  const secondaire = s.connecte && !racine && p.route !== 'direct'
  const corps = (
    <RangSecondaire.Provider value={secondaire}>
      <BandeauHorsLigne />
      <BandeauPanne />
      {s.connecte && <FileEnAttente />}
      {enTeteDePage}
      {p.fonctions && p.fonctions.length > 0 && <Fonctions items={p.fonctions} />}
      {/* Téléphone : les actions de la page dans le flux, sous les tuiles (jamais par-dessus le contenu ni la barre du bas). */}
      {pouce && (
        <div className="e-pouce e-pouce-flux" role="toolbar" aria-label={t('Actions principales')}>
          {p.actions}
        </div>
      )}
      {p.children}
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
      <div id="app" ref={refApp} className={'m-app ' + classes + (s.connecte ? '' : ' a-sans') + (pouce ? ' a-pouce' : '')}>
        {entete}
        <main ref={refMain} id="contenu" className="px" tabIndex={-1}>
          {corps}
        </main>
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
