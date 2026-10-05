// Barre de navigation des grands écrans (dès 1024 px, DISPOSITION-ECRANS.md § 3.3) : sous la ligne principale de
// l'en-tête de site, à la place de la barre du bas. Ordre des captures : Accueil, Catégories (méga-menu), Promotions
// (plus forte remise vraie), Mes commandes (paiements en attente), Sauvegardés, Compte, Sélection, Premium, puis
// Ventes flash (compte à rebours le plus proche) et Listes d'envies (ou Espace diaspora) ; à droite, la pastille du
// relais et, pour un client connecté, « Vendre sur BelivaY » (un visiteur l'a dans l'en-tête, comme sur les captures).
// Un module fermé n'a pas de lien (CFS-02). Les liens sont dans une capsule ovale de verre liquide, comme la barre
// du bas du téléphone (consigne du porteur, 5 oct. 2026) ; la bulle de verre suit le survol et le focus du clavier,
// se saisit et se fait glisser à la souris (useBulle en mode « survol », § 6.5). Si la barre déborde, les derniers
// liens passent dans « Plus », au bout de la capsule (repli mesuré).
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { chemin } from '../config/pages'
import { source } from '../donnees/source'
import { usePreferences } from '../preferences'
import { useCompteDiaspora, useSession } from '../session'
import { useBulle } from './BarreBas'
import { CompteARebours } from './CompteARebours'
import { remiseMax, useGarde, useProduitsCoque } from './donneesCoque'
import { PastillePourQui } from './PourQui'
import { Icone } from './Icone'
import { MegaMenu } from './MegaMenu'

interface Lien {
  id: string
  route: string
  icone: string
  texte: string
  court?: string // libellé de 1024 à 1199 px
  pastille?: ReactNode
  badge?: number
}

// Lien actif : la route ouverte, ou sa famille (une commande allume « Mes commandes »).
const FAMILLES: Record<string, string[]> = {
  categories: ['categories', 'liste'],
  commandes: ['commandes', 'commande', 'suivi', 'code', 'garde', 'comptoir', 'comptoir-payer'],
  listes: ['listes', 'liste-envies', 'liste-creer', 'liste-statut', 'liste-envoyer'],
  'espace-diaspora': ['espace-diaspora', 'proches', 'paniers-proches', 'commander-pour'],
  abonnements: ['abonnements', 'mon-abonnement', 'abonnement-souscrire'],
  compte: ['compte', 'profil', 'profil-email', 'securite', 'confidentialite', 'numero-changer', 'adresses', 'moyens-paiement', 'wallet', 'factures', 'avis-donner', 'messagerie', 'fil', 'reglages', 'notifs-reglages', 'supprimer', 'cagnotte', 'parrainage'],
}

export function NavSite() {
  const { t } = usePreferences()
  const s = useSession()
  const diaspora = useCompteDiaspora()
  const lieu = useLocation()
  const route = lieu.pathname === '/' ? 'accueil' : lieu.pathname.slice(1)
  const ff = s.interrupteurs
  const produits = useProduitsCoque() ?? []
  const flash = useGarde('flash', () => source.ventesFlash(), !!ff['FF-FLASH'])
  const prime = useGarde('prime', () => source.prime(), !!ff['FF-ABONNEMENT'] && s.connecte)
  const commandes = useGarde('commandes', () => source.commandes(), s.connecte)
  const remise = remiseMax(produits)
  const enCours = flash ? flash.offres.filter((o) => o.debut <= flash.maintenant && o.fin > flash.maintenant).sort((a, b) => a.fin - b.fin)[0] : null
  const aPayer = commandes ? commandes.commandes.filter((c) => c.etat === 'paiement').length : 0
  // Ordre des captures d'inspiration (le porteur, 5 oct. : il prime sur le document) : Accueil, Catégories,
  // Promotions, Mes commandes, Sauvegardés, Compte, Sélection, Premium ; puis nos modules en plus (Ventes flash,
  // Listes d'envies ou Espace diaspora), qui passent les premiers dans « Plus » quand la barre est serrée.
  const liens: Lien[] = [
    { id: 'accueil', route: 'accueil', icone: 'house', texte: 'Accueil' },
    { id: 'categories', route: 'categories', icone: 'layout-grid', texte: 'Catégories' },
    { id: 'promotions', route: 'promotions', icone: 'tag', texte: 'Promotions', pastille: remise > 0 ? '−' + remise + ' %' : undefined },
    { id: 'commandes', route: 'commandes', icone: 'package', texte: 'Mes commandes', court: 'Commandes', badge: aPayer },
    { id: 'sauvegardes', route: 'sauvegardes', icone: 'heart', texte: 'Sauvegardés' },
    { id: 'compte', route: 'compte', icone: 'user-round', texte: 'Compte' },
    { id: 'selection', route: 'selection', icone: 'star', texte: 'Sélection' },
    ...(ff['FF-ABONNEMENT'] ? [{ id: 'abonnements', route: diaspora ? 'abonnement-offrir' : prime?.actif ? 'mon-abonnement' : 'abonnements', icone: 'gem', texte: diaspora ? 'Offrir Premium' : 'Premium' }] : []),
    ...(ff['FF-FLASH'] ? [{ id: 'ventes-flash', route: 'ventes-flash', icone: 'zap', texte: 'Ventes flash', pastille: enCours ? <CompteARebours key={enCours.p} secondes={Math.round((enCours.fin - flash!.maintenant) / 1000)} classe="hn-cd" /> : undefined }] : []),
    ...(diaspora
      ? [{ id: 'espace-diaspora', route: 'espace-diaspora', icone: 'globe', texte: 'Espace diaspora' }]
      : ff['FF-LISTE-ENVIES']
        ? [{ id: 'listes', route: 'listes', icone: 'gift', texte: 'Listes d’envies', court: 'Listes' }]
        : []),
  ]
  const actifDe = (l: Lien) => (FAMILLES[l.id] ?? [l.route]).includes(route) || l.route === route

  // Les libellés, pastilles et badges changent la largeur des liens : à chaque changement, on remesure.
  const { langue } = usePreferences()
  const cleMesure = langue + liens.map((l) => l.id + (l.pastille ? (l.id === 'promotions' ? String(l.pastille) : 'p') : '') + (l.badge ?? '')).join('|')
  const cleMesuree = useRef('')
  // Repli mesuré : autant de liens que la largeur le permet, le reste dans « Plus ».
  const ligne = useRef<HTMLDivElement>(null)
  const droite = useRef<HTMLDivElement>(null)
  const largeurs = useRef<number[]>([])
  const [n, setN] = useState<number | null>(null)
  useLayoutEffect(() => {
    const l = ligne.current
    const conteneur = l?.querySelector<HTMLElement>('.hn-in')
    if (!l || !conteneur || !droite.current) return
    if (n !== null && cleMesuree.current !== cleMesure) return setN(null)
    if (n === null) cleMesuree.current = cleMesure
    if (n === null) largeurs.current = [...conteneur.querySelectorAll<HTMLElement>(':scope > a.hn')].map((a) => a.offsetWidth + 2)
    const cs = getComputedStyle(l)
    const cc = getComputedStyle(conteneur)
    // Marges intérieures de la capsule et écarts de la ligne (2 × 8, moins le retrait de 4 de la capsule) compris.
    const dispo = l.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - droite.current.offsetWidth - (fleche.current?.offsetWidth ?? 0) - parseFloat(cc.paddingLeft) - parseFloat(cc.paddingRight) - 12
    const tout = largeurs.current.reduce((a, b) => a + b, 0)
    let k = liens.length
    if (tout > dispo) {
      k = 0
      let somme = 78 // bouton « Plus » (76 avec son écart)
      while (k < largeurs.current.length && somme + largeurs.current[k] <= dispo) somme += largeurs.current[k++]
      k = Math.max(1, k)
    }
    if (k !== (n ?? liens.length)) setN(k)
  })
  useEffect(() => {
    const l = ligne.current
    if (!l || typeof ResizeObserver !== 'function') return
    let w = l.clientWidth
    const ro = new ResizeObserver(() => {
      if (Math.abs(l.clientWidth - w) < 1) return
      w = l.clientWidth
      setN(null)
    })
    ro.observe(l)
    // Les polices arrivent après le premier rendu : les libellés s'élargissent, on remesure.
    let vivant = true
    document.fonts?.ready.then(() => vivant && setN(null))
    return () => {
      vivant = false
      ro.disconnect()
    }
  }, [])

  const visibles = n === null ? liens : liens.slice(0, n)
  const replies = n === null ? [] : liens.slice(n)
  const actif = visibles.findIndex(actifDe)
  const bulle = useBulle(
    visibles.map((l) => chemin(l.route)),
    actif,
    'survol',
    'a.hn',
  )

  // Méga-menu : clic sur la flèche, ou survol du lien Catégories après 150 ms ; fermé 300 ms après la sortie,
  // par Échap ou un clic dehors.
  const [mega, setMega] = useState(false)
  const minuteur = useRef(0)
  const ouvrirApres = (ms: number) => {
    window.clearTimeout(minuteur.current)
    minuteur.current = window.setTimeout(() => setMega(true), ms)
  }
  const fermerApres = (ms: number) => {
    window.clearTimeout(minuteur.current)
    minuteur.current = window.setTimeout(() => setMega(false), ms)
  }
  const fleche = useRef<HTMLButtonElement>(null)
  useEffect(() => () => window.clearTimeout(minuteur.current), [])
  useEffect(() => {
    if (!mega) return
    const echap = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMega(false)
      fleche.current?.focus()
    }
    const dehors = (e: PointerEvent) => {
      if (!(e.target as Element).closest('.mm, .hn-mega, .hn-mm-z')) setMega(false)
    }
    window.addEventListener('keydown', echap)
    window.addEventListener('pointerdown', dehors)
    return () => (window.removeEventListener('keydown', echap), window.removeEventListener('pointerdown', dehors))
  }, [mega])
  // Changement de page : le menu se ferme.
  useEffect(() => setMega(false), [lieu.pathname, lieu.search])

  const [plus, setPlus] = useState(false)
  useEffect(() => {
    if (!plus) return
    const fermer = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !(e.target as Element).closest('.hn-plus')) setPlus(false)
    }
    window.addEventListener('keydown', fermer)
    window.addEventListener('pointerdown', fermer)
    return () => (window.removeEventListener('keydown', fermer), window.removeEventListener('pointerdown', fermer))
  }, [plus])

  const quartier = (s.relais?.nom ?? '').replace(/^Relais\s+/, '')
  const contenu = (l: Lien) => (
    <>
      <Icone nom={l.icone} taille={18} />
      {l.court ? (
        <>
          <span className="hn-l">{t(l.texte)}</span>
          <span className="hn-c">{t(l.court)}</span>
        </>
      ) : (
        <span>{t(l.texte)}</span>
      )}
      {l.pastille && <span className="hn-pas">{l.pastille}</span>}
      {!!l.badge && <span className="bdg">{l.badge}</span>}
    </>
  )
  return (
    <nav className="hd-nav" aria-label={t('Navigation principale')}>
      <div className="hn-row" ref={ligne}>
        <div className={'hn-in' + (bulle.bouge ? ' bouge' : '')} {...bulle.props}>
          {visibles.map((l) => {
            const on = actifDe(l)
            const cat = l.id === 'categories'
            const lienNav = (
              <Link
                key={l.id}
                to={chemin(l.route)}
                className={'hn' + (on ? ' on' : '') + (cat ? ' hn-mega' : '')}
                aria-current={on ? 'page' : undefined}
                onPointerEnter={cat ? (e) => e.pointerType === 'mouse' && ouvrirApres(150) : undefined}
                onPointerLeave={cat ? (e) => e.pointerType === 'mouse' && fermerApres(300) : undefined}
              >
                {contenu(l)}
              </Link>
            )
            return cat ? (
              <Fragment key={l.id}>
                {lienNav}
                <button
                  ref={fleche}
                  type="button"
                  className="hn-fl hn-mega"
                  aria-label={t('Ouvrir le menu des catégories')}
                  aria-expanded={mega}
                  aria-controls="hn-mm"
                  onClick={() => (window.clearTimeout(minuteur.current), setMega(!mega))}
                >
                  <Icone nom="chevron-down" taille={16} />
                </button>
              </Fragment>
            ) : (
              lienNav
            )
          })}
          {replies.length > 0 && (
            <div className="hn-plus">
              <button type="button" className="hn" aria-haspopup="menu" aria-expanded={plus} onClick={() => setPlus(!plus)}>
                <span>{t('Plus')}</span>
                <Icone nom="chevron-down" taille={16} />
              </button>
              {plus && (
                <div className="hn-menu" role="menu">
                  {replies.map((l) => (
                    <Link key={l.id} role="menuitem" to={chemin(l.route)} className={actifDe(l) ? 'on' : undefined} aria-current={actifDe(l) ? 'page' : undefined} onClick={() => setPlus(false)}>
                      {contenu(l)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Loupe de la bulle : copie des liens, posée exactement sur eux (BarreBas.tsx). */}
          {bulle.lentille(
            visibles.map((l) => (
              <span key={l.id} className="hn hn-copie">
                {contenu(l)}
              </span>
            )),
          )}
        </div>
        <span className="hd-sp" />
        <div className="hn-dr" ref={droite}>
          {diaspora && <PastillePourQui classe="rly hn-rly" />}
          {s.relais && !diaspora && (
            <Link className="rly hn-rly" to={chemin('relais-selecteur', { retour: route + lieu.search })}>
              <Icone nom="map-pin" taille={16} />
              <span className="grow">
                <span className="hn-rl">{t('Retrait à ')}</span>
                <b>{t(quartier)}</b>
                <span className="hn-rl">{t(' · Changer')}</span>
              </span>
            </Link>
          )}
          {!diaspora && s.connecte && (
            <Link className="hn-vendre" to={chemin('devenir-vendeur')}>
              <Icone nom="store" taille={17} />
              <span>{t('Vendre sur BelivaY')}</span>
            </Link>
          )}
        </div>
      </div>
      {mega && (
        <div className="hn-mm-z" onPointerEnter={() => window.clearTimeout(minuteur.current)} onPointerLeave={(e) => e.pointerType === 'mouse' && fermerApres(300)}>
          <MegaMenu id="hn-mm" fermer={() => setMega(false)} />
        </div>
      )}
    </nav>
  )
}
