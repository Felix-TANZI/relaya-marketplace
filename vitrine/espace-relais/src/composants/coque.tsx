// La coque de l'espace point relais, EXACTEMENT celle du prototype (balisage relevé par outils/transcription.mjs :
// classes nommées « p-hd-* », « p-hs-* », « p-dock-* » de styles/prototype.css, icônes de src/genere/coque.json), avec
// les données réelles de la session :
// - en-tête racine (NAV-03 ; écrans des onglets) : « ☰ » (→ page Menu), logo (→ Aujourd'hui), lune/soleil (thème,
//   synchronisé avec les Paramètres), langue en pilule segmentée FR | EN (comme la console), cloche (→ Notifications, compteur), avatar (→ Paramètres, « Mon compte »), ligne
//   « POINT RELAIS · NOM, QUARTIER », trois pastilles réelles : ouverture (ouvert et heure de fermeture, fermé et
//   réouverture, suspendu…), places occupées / déclarées (alerte au seuil CAL-21), Trust Score ;
// - en-tête secondaire (NAV-04) : retour mémorisé (RetourMemoire du client : la page d'avant dans la visite, sinon le
//   parent déclaré), titre, logo panier BelivaY (→ Aujourd'hui) ;
// - barre du bas en verre (NAV-01, NAV-02 ; verre liquide du client : useBulle) : Aujourd'hui, Réception (colis
//   annoncés non reçus), Retrait, Stock (colis en stock) ; compteurs masqués à 0 ; aucun onglet allumé hors onglets ;
// - bandeau hors connexion en tête du contenu de tous les écrans (OFF-03).
// Téléphone d'abord (cibles de 48 px, 56 px pour la barre et l'action principale ; DS-07) ; TABLETTE et ORDINATEUR DE
// COMPTOIR selon PR-12 : même en-tête pleine largeur, même barre centrée sur 520 px, contenu en deux colonnes de cartes
// (classe r-pile) ; une colonne centrée de 540 px pour les écrans à clavier (connexion, invitation, PIN de remise) ;
// appareil photo plein écran (relais.css).
// La coque d'une route est déclarée dans son routes.ts (config/routes.ts) ; un état de page peut la changer (props).
import { StylesVie } from '@client/vie/vie'
import { BoutonLangue, BoutonTheme } from './BoutonTheme'
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useBulle } from '@client/composants/BarreBas'
import { badge } from '@client/i18n/format'
import logo from '../assets/logo-belivay.png'
import marque from '../assets/marque-belivay.png'
import { ACCUEIL, ONGLETS, chemin } from '../config/pages'
import { ROUTES, type EnTete } from '../config/routes'
import { peutOuvrir } from '../config/droits'
import coque from '../genere/coque.json'
import type { SessionRelais } from '../donnees/domaines/session'
import { heure, jourCourt } from '../i18n/temps'
import { usePreferences } from '../preferences'
import { useSession } from '../session'
import { BandeauHorsLigne } from './BandeauHorsLigne'
import { BandeauConsole } from './BandeauConsole'
import { Icone } from './Icone'

// ---------- Pastilles de l'en-tête racine ----------

export interface Pastille {
  ton: 'vert' | 'accent' | 'alerte' | 'ambre' | 'rouge' | 'neutre'
  point?: boolean
  texte: string // déjà traduit
  vers: string // route qui en dit plus
}

/** Pastilles de la session : ouverture, places occupées / déclarées, Trust Score (NAV-03). */
export function usePastilles(): Pastille[] {
  const s = useSession()
  const { t, tf, langue } = usePreferences()
  const r = s.relais
  if (!r) return []
  const ouverture: Pastille =
    r.statut === 'suspendu'
      ? { ton: 'rouge', point: true, texte: t('Relais suspendu'), vers: 'statut-relais' }
      : r.statut === 'clos'
        ? { ton: 'rouge', point: true, texte: t('Relais clos'), vers: 'statut-relais' }
        : r.statut === 'candidat' || r.statut === 'en_configuration'
          ? { ton: 'ambre', point: true, texte: t('En configuration'), vers: 'statut-relais' }
          : r.ouvertMaintenant
            ? { ton: 'vert', point: true, texte: r.fermeA ? tf('Ouvert · {h}', { h: heure(r.fermeA, langue) }) : t('Ouvert'), vers: 'capacite' }
            : {
                ton: 'neutre',
                point: true,
                texte: r.rouvreLe ? tf('Fermé · rouvre {quand}', { quand: rouvre(r.rouvreLe, s.maintenant, langue) }) : t('Fermé'),
                vers: 'capacite',
              }
  // Raccourcis du comptoir : l'ouverture mène à la fermeture exceptionnelle (fermer vite, R37), les places au stock
  // (au départ des colis quand le relais est plein, R41), le Trust Score à son détail ; une route que le membre ne
  // peut pas ouvrir retombe sur la plus proche qu'il peut ouvrir (jamais « Accès réservé » depuis l'en-tête).
  const ou = (vers: string, sinon: string) => (peutOuvrir(s.membre, vers) ? vers : sinon)
  if (ouverture.vers === 'capacite' && r.ouvertMaintenant) ouverture.vers = ou('fermeture', ou('capacite', 'stock'))
  else if (ouverture.vers === 'capacite') ouverture.vers = ou('capacite', 'stock')
  const places: Pastille = { ton: r.sature ? 'alerte' : 'accent', texte: tf('{n} / {total} places', { n: r.placesOccupees, total: r.placesDeclarees }), vers: r.sature ? 'departs' : 'stock' }
  const trust: Pastille = { ton: 'accent', texte: r.trust === null ? t('Trust · nouveau') : tf('Trust {score}', { score: Math.round(r.trust) }), vers: ou('trust', 'stock') }
  return [ouverture, places, trust]
}

/** « 8 h » aujourd'hui, sinon « lundi 14 · 8 h ». */
function rouvre(instant: number, maintenant: number, langue: 'fr' | 'en'): string {
  const memeJour = Math.floor((instant + 3600_000) / 86400_000) === Math.floor((maintenant + 3600_000) / 86400_000)
  return memeJour ? heure(instant, langue) : `${jourCourt(instant, langue)} · ${heure(instant, langue)}`
}

function Avatar({ s }: { s: SessionRelais }) {
  const { t } = usePreferences()
  const m = s.membre
  return (
    <Link className={'p-hd-avatar r-avatar' + (m?.photo ? ' a-photo' : '')} to={chemin('parametres')} aria-label={t('Mon compte')}>
      {m?.photo ? <img src={m.photo} alt="" /> : (m?.initiales ?? '')}
    </Link>
  )
}

// ---------- En-têtes ----------

export function EnTeteRacine() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const pastilles = usePastilles()
  const cloche = badge(s.badges.notifications)
  return (
    <header className="p-hd r-hd" data-glass="">
      <div className="p-hd-rang">
        <Link className="p-hd-menu r-ibtn" to={chemin('menu')} aria-label={t('Menu')}>
          <Icone nom={coque.icones.menu} taille={22} trait={2.2} className="p-hd-menu-i" />
        </Link>
        <Link className="p-hd-logo r-logo" to={chemin(ACCUEIL)} aria-label={t('BelivaY, accueil')}>
          <img src={logo} alt="BelivaY" className="p-hd-logo-img" />
        </Link>
        <div className="p-hd-sp"></div>
        <BoutonTheme />
        <BoutonLangue />
        <Link className="p-hd-cloche r-ibtn" to={chemin('notifications')} aria-label={cloche ? tf('Notifications, {n} non lues', { n: cloche }) : t('Notifications')}>
          <Icone nom={coque.icones.cloche} taille={21} className="p-hd-cloche-i" />
          {cloche && <span className="p-hd-bdg r-bdg">{cloche}</span>}
        </Link>
        <Avatar s={s} />
      </div>
      <div className="p-hd-label">
        <span className="p-hd-label-i"></span>
        <div className="p-hd-label-t r-label">{s.relais ? tf('Point relais · {nom}, {quartier}', { nom: s.relais.nom, quartier: s.relais.quartier }) : t('Point relais')}</div>
      </div>
      <div className="p-hd-pastilles r-pastilles">
        {pastilles.map((p) => (
          <Link key={p.vers + p.texte} className={'p-hd-pill r-pill r-ton-' + p.ton} to={chemin(p.vers)}>
            {p.point && <i className="r-point" aria-hidden="true"></i>}
            {p.texte}
          </Link>
        ))}
      </div>
    </header>
  )
}

export function EnTeteEnfant({ titre, retour }: { titre: ReactNode; retour: string }) {
  const { t } = usePreferences()
  return (
    <header className="p-hs r-hd r-hd-enfant" data-glass="">
      <div className="p-hs-rang">
        <Link className="p-hs-retour r-ibtn" to={retour} aria-label={t('Revenir')}>
          <Icone nom={coque.icones.retour} taille={22} trait={2.2} className="p-hs-retour-i" />
        </Link>
        <h1 className="p-hs-titre r-titre">{titre}</h1>
        <div className="p-hs-sp"></div>
        <Link className="p-hs-marque r-ibtn" to={chemin(ACCUEIL)} aria-label={t('BelivaY, accueil')}>
          <img src={marque} alt="" className="p-hs-marque-img" />
        </Link>
      </div>
    </header>
  )
}

// ---------- Barre du bas ----------

export function BarreDuBas({ actif }: { actif: string | null }) {
  const { t } = usePreferences()
  const s = useSession()
  const bulle = useBulle(
    ONGLETS.map((o) => chemin(o.id)),
    ONGLETS.findIndex((o) => o.id === actif),
  )
  // NAV-02 : Réception = colis annoncés non reçus ; Stock = colis en stock ; masqués à 0.
  const badgeDe = (id: string) => (id === 'reception' ? badge(s.badges.reception) : id === 'stock' ? badge(s.badges.stock) : null)
  const contenu = (o: (typeof ONGLETS)[number], on: boolean) => {
    const b = badgeDe(o.id)
    return (
      <>
        <div className="p-dock-i">
          <Icone nom={o.icone} taille={22} className={on ? 'p-dock-ico-on' : 'p-dock-ico'} />
          {b && <span className="p-dock-bdg r-bdg">{b}</span>}
        </div>
        <span className={on ? 'p-dock-l-on' : 'p-dock-l'}>{t(o.titre)}</span>
      </>
    )
  }
  return (
    <nav className={'dock p-dock r-dock' + (bulle.bouge ? ' bouge' : '')} aria-label={t('Navigation du guichet')} {...bulle.props}>
      {ONGLETS.map((o) => {
        const on = o.id === actif
        return (
          <Link key={o.id} className={'tab ' + (on ? 'on p-dock-tab-on' : 'p-dock-tab')} to={chemin(o.id)} aria-current={on ? 'page' : undefined}>
            {contenu(o, on)}
          </Link>
        )
      })}
      {bulle.lentille(
        ONGLETS.map((o) => (
          <span key={o.id} className="tab-copie">
            {contenu(o, true)}
          </span>
        )),
      )}
    </nav>
  )
}

// ---------- Écran ----------

/** Écrans à clavier ou à parcours : une colonne centrée de 540 px sur tablette (PR-12, règle 6). */
const UNE_COLONNE = new Set(['connexion', 'invitation', 'pin-remise'])

/**
 * Un écran : en-tête (selon la route), contenu (<main>), barre du bas, éléments fixes (feuilles, voiles).
 * `titre` / `retour` : quand ils portent une donnée (« Colis BLV-00008-1 »), sinon ceux de la route. `entete` /
 * `barre` : coque d'un état de la page qui en change (fil de messagerie ouvert, appareil photo).
 */
export function Ecran(p: { route: string; titre?: string; retour?: string; avant?: ReactNode; fixes?: ReactNode; children?: ReactNode; entete?: EnTete; barre?: boolean }) {
  const { t } = usePreferences()
  const r = ROUTES[p.route]
  const titre = p.titre ?? t(r?.titre ?? '')
  useEffect(() => {
    document.title = t('BelivaY Point relais') + ' — ' + titre
  }, [titre, t])
  const entete = p.entete ?? r?.entete ?? 'enfant'
  const retour = p.retour ?? chemin(r?.retour ?? ACCUEIL)
  const barre = p.barre ?? r?.barre ?? false
  const classes = ['r-app', barre ? 'a-barre' : '', entete === 'aucun' ? 'a-seul' : '', UNE_COLONNE.has(p.route) ? 'a-une' : '', p.route === 'camera' ? 'a-camera' : ''].filter(Boolean).join(' ')
  return (
    <div id="app" className={classes}>
      {p.avant}
      {entete === 'racine' && <EnTeteRacine />}
      {entete === 'enfant' && <EnTeteEnfant titre={titre} retour={retour} />}
      <StylesVie acc="var(--acc-btn)" fort="#B24F00" />
      <main className={'r-main vie-cascade' + (entete === 'racine' ? ' a-racine' : entete === 'enfant' ? ' a-enfant' : ' r-seul')}>
        <BandeauHorsLigne />
        <BandeauConsole />
        {p.children}
      </main>
      {barre && <BarreDuBas actif={r?.onglet ?? null} />}
      {p.fixes}
    </div>
  )
}
