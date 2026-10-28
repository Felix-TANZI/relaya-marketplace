// La coque de l'espace livreur, TÉLÉPHONE D'ABORD (le livreur est sur la route, souvent d'une main, en plein soleil) :
// - en-tête racine (onglets), celui du prototype (rootHeader, APP.hdLang = false) : « ☰ » tout à gauche, qui ouvre la
//   page MENU (navigation groupée, affichage, verrouillage), logo, bouton d'INCIDENT toujours à un geste (LIV-UIX-03)
//   ou bouton SOS (pages du compte : LIVC_HD_SOS), thème (le sombre pour la nuit), langue en pilule segmentée FR | EN
//   (comme la console et l'entreprise), cloche, avatar qui ouvre le PROFIL
//   (« Moi », LIV-P29) ; « Espace livreur · <entreprise> » ; pastilles d'état (disponibilité, colis sous garde, Trust
//   Score ; compte non actif : son état à la place). Menu et Profil sont deux pages distinctes, comme le prototype ;
//   la langue se change aussi dans le Menu et les Réglages (pas de recherche globale : DP-66, l'historique a la sienne) ;
// - en-tête enfant (subHeader) : retour (mémorisé : RetourMemoire du client), titre, bouton d'incident ou SOS, marque
//   BelivaY (panier, vers l'accueil : « ibtn cart » du prototype) sur tous les formats ;
// - barre du bas : 4 onglets (Aujourd'hui, Tournée, Messages, Moi), bulle de verre liquide du client (useBulle),
//   badges (arrêts restants, messages non lus) ; cibles de 56 px ;
// - bandeau hors connexion en tête du contenu de tous les écrans.
// Tablette et ordinateur : la même application, centrée (colonne de lecture), barre du bas en capsule.
// La coque d'une route (titre, en-tête, parent du retour, onglet) est déclarée dans son routes.ts (config/routes.ts).
// Un écran repris sur le prototype (`proto`) pose son contenu comme le <main> du prototype (blocs à marges propres,
// classes de src/styles/prototype.css), sans l'espacement en colonne des autres écrans.
import { StylesVie } from '@client/vie/vie'
import { BoutonLangue, BoutonTheme } from './BoutonTheme'
import { useEffect, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useBulle } from '@client/composants/BarreBas'
import { badge } from '@client/i18n/format'
import logo from '../assets/logo-belivay.png'
import marque from '../assets/marque-belivay.png'
import { ACCUEIL, ONGLETS, chemin } from '../config/pages'
import { ROUTES, type EnTete } from '../config/routes'
import { REGISTRE, lire } from '../calculs/registre'
import type { SessionLivreur } from '../donnees/domaines/session'
import { source } from '../donnees/source'
import { usePreferences } from '../preferences'
import { useSession } from '../session'
import { BandeauHorsLigne } from './BandeauHorsLigne'
import { BandeauConsole } from './BandeauConsole'
import { BandeauEmploi } from './BandeauEmploi'
import { Icone } from './Icone'

// ---------- Pastilles de l'en-tête racine ----------

export interface Pastille {
  ton: 'vert' | 'ambre' | 'rouge' | 'neutre' | 'accent'
  point?: boolean
  icone?: string
  texte: string // déjà traduit
  vers: string // route qui en dit plus
}

const ETATS_COMPTE: Record<Exclude<SessionLivreur['etatCompte'], 'actif'>, [Pastille['ton'], string]> = {
  en_activation: ['ambre', 'En activation'],
  en_verification: ['ambre', 'En vérification'],
  restreint: ['ambre', 'Compte restreint'],
  suspendu: ['rouge', 'Compte suspendu'],
  rattachement_ferme: ['rouge', 'Rattachement fermé'],
  rattachement_suspendu: ['rouge', 'Rattachement suspendu'],
  retire: ['rouge', 'Compte retiré'],
}

/** Pastilles de la session : disponibilité (ou état du compte), colis sous garde, Trust Score. */
export function usePastilles(): Pastille[] {
  const s = useSession()
  const { t, tf } = usePreferences()
  const garde: Pastille = {
    ton: s.colisSousGarde > 0 ? 'accent' : 'neutre',
    icone: 'package',
    texte: s.colisSousGarde === 0 ? t('Aucun colis') : s.colisSousGarde === 1 ? t('1 colis sur vous') : tf('{n} colis sur vous', { n: s.colisSousGarde }),
    vers: 'tournee',
  }
  const trust: Pastille = { ton: 'neutre', icone: 'award', texte: s.trustScore === null ? t('Trust —') : tf('Trust {score}', { score: Math.round(s.trustScore) }), vers: 'trust' }
  // Restreint : il travaille (disponibilité gardée), l'état en ambre d'abord ; les autres états non actifs le remplacent.
  if (s.etatCompte !== 'actif') {
    const [ton, texte] = ETATS_COMPTE[s.etatCompte]
    const etat: Pastille = { ton, point: true, texte: t(texte), vers: s.etatCompte.startsWith('en_') ? 'activation' : 'compte' }
    if (s.etatCompte !== 'restreint') return [etat, garde, trust]
    return [etat, disponibilite(s.disponibilite, t), garde, trust]
  }
  return [disponibilite(s.disponibilite, t), garde, trust]
}

function disponibilite(d: SessionLivreur['disponibilite'], t: (x: string) => string): Pastille {
  return d === 'disponible'
    ? { ton: 'vert', point: true, texte: t('Disponible'), vers: 'statut' }
    : d === 'en_pause'
      ? { ton: 'ambre', point: true, texte: t('En pause'), vers: 'statut' }
      : { ton: 'neutre', point: true, texte: t('Hors service'), vers: 'statut' }
}

function Avatar({ s }: { s: SessionLivreur }) {
  const photo = s.livreur?.photo
  return <span className={'l-avatar vie-anneau' + (photo ? ' a-photo' : '')}>{photo ? <img src={photo} alt="" /> : (s.livreur?.initiales ?? '')}</span>
}

/** Bouton d'incident : à un geste de partout (LIV-UIX-03), aussi visible que la validation. */
function BoutonIncident() {
  const { t } = usePreferences()
  return (
    <Link className="l-ibtn l-incident" to={chemin('incident')} aria-label={t('Signaler un incident')}>
      <Icone nom="triangle-alert" taille={22} trait={2.1} />
    </Link>
  )
}

/** Bouton SOS des pages du compte (LIVC_HD_SOS du prototype) : ouvre l'appui long de l'Aide et SOS. */
function BoutonSos() {
  const { t } = usePreferences()
  return (
    <Link className="l-ibtn l-sos" to={chemin('aide', { s: 'sos' })} aria-label={t('SOS : danger immédiat')}>
      SOS
    </Link>
  )
}

/** Bouton de droite de l'en-tête : incident (défaut), SOS, aucun, ou un bouton propre à l'écran (appel masqué d'un fil). */
export type ActionEnTete = 'incident' | 'sos' | 'aucune' | ReactNode
const ACTIONS = { incident: <BoutonIncident />, sos: <BoutonSos />, aucune: null }
const bouton = (a: ActionEnTete) => (typeof a === 'string' && a in ACTIONS ? ACTIONS[a as keyof typeof ACTIONS] : a)

// ---------- En-têtes ----------

export function EnTeteRacine({ action = 'incident' }: { action?: ActionEnTete }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const pastilles = usePastilles()
  const cloche = badge(s.badges.notifications)
  return (
    <header className="l-hd l-verre">
      <div className="l-hd-rang">
        <Link className="l-ibtn" to={chemin('menu')} aria-label={t('Menu')}>
          <Icone nom="menu" taille={24} />
        </Link>
        <Link className="l-logo" to={chemin(ACCUEIL)} aria-label={t('Aujourd’hui')}>
          <img src={logo} alt="BelivaY" />
        </Link>
        <span className="l-sp"></span>
        {bouton(action)}
        <BoutonTheme />
        <BoutonLangue />
        <Link className="l-ibtn" to={chemin('notifications')} aria-label={cloche ? tf('Notifications, {n} non lues', { n: cloche }) : t('Notifications')}>
          <Icone nom="bell" taille={22} />
          {cloche && <span className="l-bdg">{cloche}</span>}
        </Link>
        <Link className="l-ibtn l-ibtn-av" to={chemin('moi')} aria-label={t('Mon profil')}>
          <Avatar s={s} />
        </Link>
      </div>
      <div className="l-hd-label">
        <i></i>
        {s.livreur ? tf('Espace livreur · {entreprise}', { entreprise: s.livreur.entreprise }) : t('Espace livreur')}
      </div>
      <div className="l-pastilles">
        {pastilles.map((p) => (
          <Link key={p.vers + p.texte} className={'l-pill l-' + p.ton} to={chemin(p.vers)}>
            {p.point && <i className="l-point"></i>}
            {p.icone && <Icone nom={p.icone} taille={15} />}
            {p.texte}
          </Link>
        ))}
      </div>
    </header>
  )
}

export function EnTeteEnfant({ titre, retour, action = 'incident' }: { titre: ReactNode; retour: string; action?: ActionEnTete }) {
  const { t } = usePreferences()
  return (
    <header className="l-hd l-verre l-hd-enfant">
      <div className="l-hd-sub">
        <Link className="l-ibtn" to={retour} aria-label={t('Revenir')}>
          <Icone nom="chevron-left" taille={28} />
        </Link>
        <h1>{titre}</h1>
        {bouton(action)}
        <Link className="l-ibtn l-marque" to={chemin(ACCUEIL)} aria-label={t('BelivaY · accueil')}>
          <img src={marque} alt="" width="33" height="32" />
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
  const badgeDe = (id: string) => (id === 'tournee' ? badge(s.badges.tournee) : id === 'messages' ? badge(s.badges.messages) : null)
  const contenu = (o: (typeof ONGLETS)[number]) => {
    const b = badgeDe(o.id)
    return (
      <>
        <Icone nom={o.icone} taille={24} />
        <span>{t(o.titre)}</span>
        {b && <span className="bdg">{b}</span>}
      </>
    )
  }
  return (
    <nav className={'dock l-dock' + (bulle.bouge ? ' bouge' : '')} aria-label={t('Navigation principale')} {...bulle.props}>
      {ONGLETS.map((o) => {
        const on = o.id === actif
        return (
          <Link key={o.id} className={'tab' + (on ? ' on' : '')} to={chemin(o.id)} aria-current={on ? 'page' : undefined}>
            {contenu(o)}
          </Link>
        )
      })}
      {bulle.lentille(
        ONGLETS.map((o) => (
          <span key={o.id} className="tab-copie">
            {contenu(o)}
          </span>
        )),
      )}
    </nav>
  )
}

// ---------- Inactivité pendant une preuve (LIV-P01R-01) ----------

/** Étapes de preuve : un téléphone laissé sans geste se verrouille, la connexion ramène à l'étape. */
const ETAPES_DE_PREUVE = new Set(['arrivee', 'controle', 'audit', 'emballage', 'code-remise', 'refus', 'depot-relais', 'domicile', 'echec-domicile', 'collecte', 'retour-vendeur', 'cloture'])
const INACTIVITE_MS = Number(lire(REGISTRE, 'INACTIVITE-PREUVE-MIN', '(\\d+)')[1]) * 60_000

function useInactivitePreuve(actif: boolean) {
  const lieu = useLocation()
  const naviguer = useNavigate()
  useEffect(() => {
    if (!actif) return
    let dernier = Date.now()
    const geste = () => void (dernier = Date.now())
    const evts = ['pointerdown', 'keydown', 'touchstart'] as const
    for (const e of evts) window.addEventListener(e, geste, { passive: true })
    const minuteur = window.setInterval(() => {
      if (Date.now() - dernier < INACTIVITE_MS) return
      window.clearInterval(minuteur)
      void source.session.deconnecter().then(() => naviguer(chemin('connexion', { next: lieu.pathname + lieu.search }), { replace: true }))
    }, 15_000)
    return () => {
      window.clearInterval(minuteur)
      for (const e of evts) window.removeEventListener(e, geste)
    }
  }, [actif, lieu.pathname, lieu.search, naviguer])
}

// ---------- Écran ----------

/**
 * Un écran : en-tête (selon la route), contenu (<main>), barre du bas, éléments fixes (feuilles, voiles).
 * `titre` / `retour` : quand ils portent une donnée (« Arrêt 2 · Maison Ngono »), sinon ceux de la route.
 * `proto` : contenu posé comme le <main> du prototype ; `action` : bouton d'incident (défaut), SOS, aucun ou propre à
 * l'écran ; `entete` / `barre` : coque d'un état de la page qui en change (fil ouvert, écran verrouillé, SOS en cours).
 */
export function Ecran(p: { route: string; titre?: string; retour?: string; avant?: ReactNode; fixes?: ReactNode; children?: ReactNode; proto?: boolean; action?: ActionEnTete; entete?: EnTete; barre?: boolean }) {
  const { t } = usePreferences()
  const r = ROUTES[p.route]
  const titre = p.titre ?? t(r?.titre ?? '')
  useEffect(() => {
    document.title = t('BelivaY livreur') + ' — ' + titre
  }, [titre, t])
  // Un état de page peut changer de coque, comme le prototype (fil ouvert : en-tête secondaire, sans barre du bas).
  const entete = p.entete ?? r?.entete ?? 'enfant'
  const retour = p.retour ?? chemin(r?.retour ?? ACCUEIL)
  const barre = p.barre ?? r?.onglet !== undefined
  useInactivitePreuve(ETAPES_DE_PREUVE.has(p.route))
  return (
    <div id="app" className={'l-app' + (barre ? ' a-barre' : '') + (entete === 'aucun' ? ' a-seul' : '')}>
      {p.avant}
      {entete === 'racine' && <EnTeteRacine action={p.action} />}
      {entete === 'enfant' && <EnTeteEnfant titre={titre} retour={retour} action={p.action} />}
      <StylesVie acc="var(--acc)" fort="#15803D" />
      <main className={'l-main vie-cascade' + (entete === 'racine' ? ' a-racine' : entete === 'enfant' ? ' a-enfant' : ' l-seul') + (p.proto ? ' l-proto' : '')}>
        <BandeauHorsLigne />
        <BandeauConsole />
        <BandeauEmploi />
        {p.children}
      </main>
      {barre && <BarreDuBas actif={r?.onglet ?? null} />}
      {p.fixes}
    </div>
  )
}
