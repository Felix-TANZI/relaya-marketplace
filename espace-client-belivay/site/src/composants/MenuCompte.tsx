// Gabarit « compte » des grands écrans (dès 1024 px, DISPOSITION-ECRANS.md § 4.2 et § 5.11) : carte d'identité en
// tête et menu du compte à gauche (264 px, collant). Ils lisent les mêmes données que l'écran Mon compte
// (source.compte(), source.menu(), la session) ; rien n'est ajouté : les entrées de la page Mon compte du téléphone,
// rangées dans l'ordre des captures d'inspiration (Principal, Compte, …) ; les modules fermés n'ont pas d'entrée
// (CCH-18), les compteurs à 0 sont masqués (CNV-07).
// En tablette portrait, pas de menu latéral : la page Mon compte joue ce rôle, comme sur le téléphone.
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAVIGATION, PAGES, chemin } from '../config/pages'
import { source } from '../donnees/source'
import { F } from '../i18n/format'
import { ChercherCompte } from '../pages/CL-13/ChercherCompte'
import { ECHELLES, usePreferences, type ChoixTheme } from '../preferences'
import { useCompteDiaspora, useSession } from '../session'
import { Dessin } from './Dessin'
import { useGarde, useMenuCoque } from './donneesCoque'
import { Icone } from './Icone'
import { Montant, PhotoClient } from './Profil'

// Une route est ouverte si son module l'est (pages sans interrupteur : toujours).
function useOuverte() {
  const { interrupteurs } = useSession()
  return (route: string) => {
    const p = PAGES.find((x) => x.route === route)
    return !!p && (!p.interrupteur || !!interrupteurs[p.interrupteur])
  }
}

type Entree = { route: string; texte: string; icone: string; params?: Record<string, string>; droite?: ReactNode; seul?: 'diaspora' | 'standard' }

export function MenuCompte() {
  const { t, langue, setLangue, choixTheme, setTheme, echelle, setEchelle } = usePreferences()
  const lieu = useLocation()
  const diaspora = useCompteDiaspora()
  const ouverte = useOuverte()
  const menu = useMenuCoque()
  const compte = useGarde('compte', () => source.compte())
  const prime = useGarde('prime', () => source.prime(), ouverte('mon-abonnement'))
  const route = lieu.pathname.slice(1)
  // Compte neuf montré en démonstration (« /compte?st=nouveau ») : aucun compteur, comme la page et sa carte.
  const neuf = route === 'compte' && new URLSearchParams(lieu.search).get('st') === 'nouveau'
  const n = (x: number | undefined) => (!neuf && x && x > 0 ? <span className="mc-n">{x}</span> : undefined)
  // Ordre des captures d'inspiration (le porteur, 5 oct. : il prime sur le document) : Principal, Compte, puis nos
  // services, l'aide, l'espace vendeur, la déconnexion et les préférences (« Accessibilité » des captures).
  const groupes: [string | null, Entree[]][] = [
    [
      'Principal',
      [
        { route: 'compte', texte: 'Vue d’ensemble', icone: 'house' },
        { route: 'commandes', texte: 'Mes commandes', icone: 'package', droite: n(menu?.commandes.aRetirer) },
        { route: 'sauvegardes', texte: 'Sauvegardés', icone: 'heart', droite: n(menu?.sauvegardesSuivis) },
        { route: 'messagerie', texte: 'Messagerie', icone: 'messages-square', droite: n(menu?.messagesNonLus) },
        { route: 'recus', texte: 'Reçus', icone: 'inbox', droite: n(menu?.recusATraiter) },
        { route: 'litiges', texte: 'Mes litiges', icone: 'scale', droite: n(menu?.litiges.badge) },
        { route: 'factures', texte: 'Factures', icone: 'file-text' },
        { route: 'avis-donner', texte: 'Avis à donner', icone: 'star', droite: n(compte?.avisADonner.length) },
      ],
    ],
    [
      'Compte',
      [
        { route: 'profil', texte: 'Mon profil', icone: 'user-round' },
        { route: 'adresses', texte: 'Adresses', icone: 'map-pin', seul: 'standard' },
        { route: 'moyens-paiement', texte: 'Moyens de paiement', icone: 'credit-card' },
        {
          route: 'wallet',
          texte: 'Wallet', // « Portefeuille » : une ligne à côté du solde (« Portefeuille BelivaY » passait sur deux)
          icone: 'wallet',
          seul: 'standard',
          droite: menu && !neuf ? (
            <span className="mc-v">
              <Montant>{F(menu.portefeuille.solde) + ' F'}</Montant>
            </span>
          ) : undefined,
        },
        { route: 'cagnotte', texte: 'Cagnotte', icone: 'piggy-bank', seul: 'standard' },
        { route: 'parrainage', texte: 'Parrainage', icone: 'user-plus', seul: 'standard' },
        { route: 'securite', texte: 'Numéro et connexion', icone: 'shield-check' },
        { route: 'confidentialite', texte: 'Confidentialité et données', icone: 'lock' },
        { route: 'notifs-reglages', texte: 'Réglages des notifications', icone: 'bell' },
        { route: 'reglages', texte: 'Réglages', icone: 'settings' },
      ],
    ],
    [
      'Mes services BelivaY',
      [
        { route: diaspora ? 'abonnement-offrir' : prime?.actif ? 'mon-abonnement' : 'abonnements', texte: diaspora ? 'Offrir Premium' : 'Premium', icone: 'gem' },
        { route: 'listes', texte: 'Listes d’envies', icone: 'gift' },
        { route: 'espace-diaspora', texte: 'Espace diaspora', icone: 'globe', seul: 'diaspora' },
        { route: 'proches', texte: 'Mes proches', icone: 'users', seul: 'diaspora' },
        { route: 'famille', texte: 'Panier famille', icone: 'users' },
        { route: 'cotisation', texte: 'Cotisation', icone: 'hand-coins' },
        { route: 'cote', texte: 'Mise de côté', icone: 'calendar-clock', seul: 'standard' },
        { route: 'rentree', texte: 'Rentrée', icone: 'graduation-cap' },
        { route: 'assistant', texte: 'Assistant', icone: 'bot' },
        { route: 'wa', texte: 'WhatsApp', icone: 'message-circle', seul: 'standard' },
      ],
    ],
    [
      'Aide',
      [
        { route: 'aide', texte: 'Aide et support', icone: 'life-buoy' },
        { route: 'rappel', texte: 'Être rappelé', icone: 'phone-call' },
        { route: 'legal', texte: 'Pages légales', icone: 'scroll-text' },
      ],
    ],
    [null, [{ route: 'devenir-vendeur', texte: compte?.boutique ? 'Espace vendeur' : 'Devenir vendeur', icone: 'store', seul: 'standard' }]],
  ]
  const garde = (e: Entree) => ouverte(e.route) && !(e.seul === 'diaspora' && !diaspora) && !(e.seul === 'standard' && diaspora)
  const actif = (r: string) => r === route
  const i = ECHELLES.indexOf(echelle)
  return (
    <nav className="mc" aria-label={t('Menu du compte')}>
      <ChercherCompte />
      {groupes.map(([titre, entrees], k) => {
        const vues = entrees.filter(garde)
        if (!vues.length) return null
        return (
          <div key={k} className="mc-g">
            {titre && <div className="kick">{t(titre)}</div>}
            <ul>
              {vues.map((e) => (
                <li key={e.route}>
                  <Link to={chemin(e.route, e.params)} className={actif(e.route) ? 'on' : undefined} aria-current={actif(e.route) ? 'page' : undefined}>
                    <Icone nom={e.icone} taille={19} />
                    <span className="grow">{t(e.texte)}</span>
                    {e.droite}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <div className="mc-g">
        <ul>
          <li>
            <Link to={chemin('compte', { sheet: 'deconnexion' })} className="mc-out">
              <Icone nom="log-out" taille={19} />
              <span className="grow">{t('Se déconnecter')}</span>
            </Link>
          </li>
        </ul>
      </div>
      <div className="mc-pref">
        <div className="kick">{t('Préférences rapides')}</div>
        <div className="mc-l">
          <span>{t('Langue')}</span>
          <div className="pp-choix" role="group" aria-label={t('Langue')}>
            {(['fr', 'en'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={langue === l} className={langue === l ? 'on' : undefined} onClick={() => setLangue(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="mc-l">
          <span>{t('Thème')}</span>
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
        <div className="mc-l">
          <span>{t('Taille du texte')}</span>
          <div className="pp-choix" role="group" aria-label={t('Taille du texte')}>
            <button type="button" aria-label={t('Texte plus petit')} disabled={i <= 0} onClick={() => setEchelle(ECHELLES[Math.max(0, i - 1)])}>
              A−
            </button>
            <button type="button" aria-label={t('Taille normale')} aria-pressed={echelle === 100} className={echelle === 100 ? 'on' : undefined} onClick={() => setEchelle(100)}>
              A
            </button>
            <button type="button" aria-label={t('Texte plus grand')} disabled={i >= ECHELLES.length - 1} onClick={() => setEchelle(ECHELLES[Math.min(ECHELLES.length - 1, i + 1)])}>
              A+
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

// Carte d'identité (en tête du gabarit compte) : portrait, prénom et nom, e-mail, numéro vérifié, relais habituel,
// palier (paiement au comptoir permis) et « Modifier mon profil ». Réduite à une ligne de 56 px hors de Mon compte
// et de ses sous-pages directes, pour ne pas pousser le contenu.
const NOMS_DEVISE: Record<string, string> = { XAF: 'F CFA', EUR: 'euros', USD: 'dollars US' }

export function CarteIdentite() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const lieu = useLocation()
  const route = lieu.pathname.slice(1)
  // Compte neuf montré en démonstration (« /compte?st=nouveau ») : la carte suit ce compte-là, comme la page.
  const nouveau = route === 'compte' && new URLSearchParams(lieu.search).get('st') === 'nouveau'
  const compte = useGarde(nouveau ? 'compte-nouveau' : 'compte', () => source.compte(nouveau ? 'nouveau' : undefined))
  const pleine = route === 'compte' || NAVIGATION[route]?.retour === 'compte'
  if (!s.client) return null
  const c = s.client
  const relais = compte ? compte.relais : s.relais
  const quartier = (relais?.nom ?? '').replace(/^Relais\s+/, '')
  const numero = compte && !compte.numeroVerifie ? t('Numéro à vérifier') : t(c.numeroMasque)
  return (
    <div className={'card ci' + (pleine ? '' : ' reduite')}>
      <span className="portrait ci-p">
        <PhotoClient>
          <Dessin id="ebb567019115" />
        </PhotoClient>
      </span>
      <span className="grow ci-t">
        <b>{t(c.nomComplet)}</b>
        <span className="ci-l">
          {[t(c.emailMasque), numero, quartier ? tf('Relais {q}', { q: t(quartier) }) : null].filter(Boolean).join(' · ')}
        </span>
      </span>
      {/* Palier : le paiement au comptoir permis. Un compte diaspora n'a pas de comptoir (DP-54) : sa pastille dit le
          compte et la devise d'affichage des prix. Pas de « membre depuis » : la donnée n'existe pas (rien d'inventé). */}
      {s.typeCompte === 'diaspora' ? (
        <span className="pill or ci-pal">{tf('Compte diaspora · prix en {d}', { d: t(NOMS_DEVISE[s.devise ?? 'XAF'] ?? s.devise ?? 'F CFA') })}</span>
      ) : (
        compte && <span className="pill or ci-pal">{t(`Paiement au comptoir jusqu’à ${F(compte.palier.comptoir)} F`)}</span>
      )}
      <Link to={chemin('profil')} className="btn secondary sm ci-mod">
        <Icone nom="pencil" taille={16} />
        <span>{t('Modifier mon profil')}</span>
      </Link>
    </div>
  )
}
