// Tablette de l'espace vendeur (DISPOSITION-ECRANS.md du vendeur) : même famille que le client
// (site/DISPOSITION-ECRANS.md). Paliers du client (600, 768 ; useEcran de @client/composants/ecran) ; sous 768 px rien
// ne change, au pixel. Dès 1024 px, vue ordinateur : BarreLaterale (mêmes groupes que le tiroir), en-tête fin.
// - BarreTitre : en-tête enfant posé en tête du contenu (même balisage .hd-sub) ;
// - PiedVendeur : pied de page dès 768 px (raccourcis, coordonnées et réseaux officiels de BelivaY) ;
// - TiroirVendeur : tiroir latéral (dès 768 px, ouvert par l'icône Menu de l'en-tête : « ?pop=menu »), avec les groupes
//   de l'interface vendeur réelle (config/navigation.ts : Ventes, Catalogue, Croissance, Boutique, Mon compte) et
//   « Retour au site » ; la même liste (ListeNav) sert à la barre latérale de l'ordinateur (BarreLaterale).
import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogoReseau } from '@client/composants/Reseaux'
import { badge } from '@client/i18n/format'
import { COORDONNEES } from '@client/config/coordonnees'
import logo from '../assets/logo-belivay.png'
import { navigationPour } from '../config/navigation'
import { chemin, routeDe } from '../config/pages'
import { usePreferences } from '../preferences'
import { useMontantsVisibles, useRouteOuverte, useSession } from '../session'
import { nomPalier } from './coque'
import { Icone } from './Icone'
import { useMonVisuel } from '../donnees/visuelProfil'

// ---------- Barre de titre des pages enfants (dès 768 px) ----------

/** En-tête enfant du téléphone posé en tête du contenu (même balisage .hd-sub) : retour mémorisé, titre. */
export function BarreTitre({ titre, retour }: { titre: ReactNode; retour: string }) {
  const { t } = usePreferences()
  return (
    <div className="hd-page">
      <div className="hd-sub">
        <Link className="ibtn" to={retour} aria-label={t('Revenir')}>
          <Icone nom="chevron-left" taille={26} />
        </Link>
        <h1>{titre}</h1>
      </div>
    </div>
  )
}

// ---------- Pied de page (dès 768 px) ----------

const RACCOURCIS: [string, string][] = [
  ['commandes', 'Commandes'],
  ['produits', 'Produits'],
  ['litiges', 'Litiges'],
  ['retours', 'Retours'],
  ['messages', 'Messagerie'],
]
const COMPTE: [string, string][] = [
  ['boutique', 'Ma boutique'],
  ['horaires', 'Horaires et fermetures'],
  ['equipe', 'Mon équipe'],
  ['parametres', 'Paramètres'],
  ['securite', 'Sécurité et appareils'],
]
const AIDE: [string, string][] = [
  ['aide', 'Aide'],
  ['paliers', 'Les paliers'],
  ['plans_liste', 'Les plans'],
  ['notifications', 'Notifications'],
]

export function PiedVendeur() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const prep = s.membre?.role === 'preparation'
  const ouverte = useRouteOuverte()
  const ici = routeDe(useLocation().pathname)
  // Le lien de la page ouverte le dit (aria-current), comme l'onglet actif.
  const lien = (r: string, x: string) => (
    <Link to={chemin(r)} aria-current={r === ici ? 'page' : undefined}>
      {t(x)}
    </Link>
  )
  const colonne = (titre: string, liens: [string, string][]) => (
    <div className="pp-col">
      <p className="kick">{t(titre)}</p>
      <ul>
        {liens
          .filter(([r]) => ouverte(r) && (!prep || !['plans_liste'].includes(r)))
          .map(([r, x]) => (
            <li key={r}>{lien(r, x)}</li>
          ))}
      </ul>
    </div>
  )
  return (
    <footer className="pied">
      <div className="pp-in">
        <div className="pp-cols">
          <div className="pp-marque">
            <img src={logo} alt="BelivaY" height={28} style={{ height: 28, width: 'auto', display: 'block' }} />
            <p>{t('Espace vendeur : vos commandes, vos produits et votre argent, payé après le retrait du client.')}</p>
            <ul className="rs-liens" aria-label={t('Nous suivre')}>
              {COORDONNEES.reseaux.map((r) => (
                <li key={r.nom}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label={tf('BelivaY sur {r} (nouvel onglet)', { r: r.libelle })} title={r.libelle}>
                    <LogoReseau nom={r.nom} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {colonne('Au quotidien', RACCOURCIS)}
          {colonne('Ma boutique', COMPTE)}
          <div className="pp-col">
            <p className="kick">{t('Aide et contact')}</p>
            <ul>
              {AIDE.filter(([r]) => ouverte(r) && (!prep || r !== 'plans_liste')).map(([r, x]) => (
                <li key={r}>{lien(r, x)}</li>
              ))}
              <li>
                <a href={COORDONNEES.telephoneLien}>
                  <span className="nw">{COORDONNEES.telephone}</span>
                </a>
              </li>
              <li>
                <a href={'mailto:' + COORDONNEES.email}>{COORDONNEES.email}</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pp-bas">
          <span>{tf('© {a} BelivaY · Espace vendeur', { a: new Date().getFullYear() })}</span>
          <span className="grow" />
          <a href="/">{t('Espace client')}</a>
        </div>
      </div>
    </footer>
  )
}

// ---------- Tiroir latéral (dès 768 px) ----------

// Écran détail → entrée du tiroir qui s'allume (une commande allume Commandes).
const PARENT_NAV: Record<string, string> = {
  ...Object.fromEntries(['commande', 'rupture', 'delai', 'bon', 'journal', 'commande_prete', 'commande_remise', 'recu', 'erreurs'].map((r) => [r, 'commandes'])),
  litige: 'litiges',
  litige_envoye: 'litiges',
  inspection: 'retours',
  remplacement: 'retours',
  ...Object.fromEntries(['offre_detail', 'fiche', 'offre2', 'camera', 'offre3', 'offre4', 'offre_publiee', 'dupliquer'].map((r) => [r, 'produits'])),
  ...Object.fromEntries(['gele', 'gains', 'numero_versement'].map((r) => [r, 'argent'])),
  ...Object.fromEntries(['score', 'paliers', 'sanctions', 'contester'].map((r) => [r, 'palier'])),
  plans: 'plans_liste',
  services: 'visibilite',
  emplacement: 'boutique',
  ajustements: 'argent', // page ajoutée (DP-58, AJ-B), sous Mon argent
  profil: 'parametres',
  accueil_calme: 'accueil',
  premier_jour: 'accueil',
  horsligne: 'accueil',
}

/** Adresse de la page ouverte, avec ou sans le tiroir (« ?pop=menu »). */
export function avecTiroir(pathname: string, recherche: string, ouvert: boolean) {
  const p = new URLSearchParams(recherche)
  if (ouvert) p.set('pop', 'menu')
  else p.delete('pop')
  const q = p.toString()
  return { pathname, search: q ? '?' + q : '' }
}

/** Groupes de navigation (config/navigation.ts), « Tout le menu » et « Retour au site » : tiroir et barre latérale. */
function ListeNav({ ici, fermer }: { ici: string; fermer?: { pathname: string; search: string } }) {
  const { t } = usePreferences()
  const naviguer = useNavigate()
  // Tiroir : une entrée touchée referme d'abord le tiroir (« ?pop=menu » remplacé), puis ouvre la page ; son retour
  // ramène ainsi à la page d'où le tiroir a été ouvert, tiroir fermé.
  const aller = (vers: string) => (e: React.MouseEvent) => {
    if (!fermer || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    naviguer(fermer, { replace: true })
    naviguer(vers)
  }
  const s = useSession()
  const montants = useMontantsVisibles()
  const ouverte = useRouteOuverte()
  const actif = PARENT_NAV[ici] ?? ici
  const commandes = badge(s.badges.commandes)
  return (
    <nav className="tr-ls" aria-label={t('Navigation de l’espace vendeur')}>
      {navigationPour(montants)
        .map((g) => ({ ...g, entrees: g.entrees.filter((e) => ouverte(e.route)) }))
        .filter((g) => g.entrees.length > 0)
        .map((g) => (
        <div key={g.titre} className="tr-g">
          <p className="tr-gt">{t(g.titre)}</p>
          {g.entrees.map((e) => (
            <Link key={e.route} to={chemin(e.route)} onClick={aller(chemin(e.route))} className={'tr-it' + (e.route === actif ? ' on' : '')} aria-current={e.route === actif ? 'page' : undefined}>
              <Icone nom={e.icone} taille={19} />
              <span>{t(e.titre)}</span>
              {e.route === 'commandes' && commandes && <b className="tr-bdg">{commandes}</b>}
            </Link>
          ))}
        </div>
      ))}
      <div className="tr-g">
        <Link to={chemin('menu')} onClick={aller(chemin('menu'))} className={'tr-it' + (ici === 'menu' ? ' on' : '')} aria-current={ici === 'menu' ? 'page' : undefined}>
          <Icone nom="menu" taille={19} />
          <span>{t('Tout le menu et les préférences')}</span>
        </Link>
        {/* L'espace client (même origine, à la racine du site). */}
        <a href="/" className="tr-it tr-site">
          <Icone nom="arrow-left" taille={19} />
          <span>{t('Retour au site')}</span>
        </a>
      </div>
    </nav>
  )
}

/** Carte de la boutique (tête du tiroir et de la barre latérale) : photo de profil sur la couverture, nom, plan et
 *  palier (ou l'accès Préparation). Elle ouvre Mon profil (photo, couverture, informations personnelles). */
function CarteBoutique({ children, fermer }: { children?: ReactNode; fermer?: { pathname: string; search: string } }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const naviguer = useNavigate()
  const visuel = useMonVisuel()
  const prep = s.membre?.role === 'preparation'
  const ouvrir = (e: React.MouseEvent) => {
    if (!fermer || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    naviguer(fermer, { replace: true })
    naviguer(chemin('profil'))
  }
  return (
    <div className={'tr-hd tr-carte' + (visuel.couverture ? ' a-couv' : '')} style={visuel.couverture ? { backgroundImage: `linear-gradient(90deg,rgba(20,12,6,.86),rgba(20,12,6,.55)),url(${visuel.couverture})` } : undefined}>
      <Link className="tr-carte-l" to={chemin('profil')} onClick={ouvrir} aria-label={tf('{nom} · Mon profil', { nom: s.boutique?.nom ?? '' })} title={t('Mon profil')}>
        <span className={'avatar' + (visuel.photo ? ' a-photo' : '')}>{visuel.photo ? <img src={visuel.photo} alt="" /> : s.membre?.initiales}</span>
        <span className="grow">
          <b>{s.boutique?.nom}</b>
          <span>{prep ? tf('{nom} · accès Préparation', { nom: `${s.membre!.prenom} ${s.membre!.nom}` }) : s.boutique ? tf('Plan {plan} · {palier}', { plan: s.boutique.plan, palier: nomPalier(s.boutique.palier, langue) }) : ''}</span>
        </span>
      </Link>
      {children}
    </div>
  )
}

// ---------- Barre latérale (ordinateur, dès 1024 px) ----------

/** Barre latérale de l'ordinateur (interface vendeur réelle, en plus simple) : logo, carte de la boutique, groupes. */
export function BarreLaterale() {
  const { t } = usePreferences()
  const lieu = useLocation()
  return (
    <aside className="sl" aria-label={t('Barre latérale')}>
      <Link className="sl-logo" to={chemin('accueil')} aria-label={t('Accueil')}>
        <img src={logo} alt="BelivaY" />
      </Link>
      <CarteBoutique />
      <ListeNav ici={routeDe(lieu.pathname)} />
    </aside>
  )
}

export function TiroirVendeur() {
  const { t } = usePreferences()
  const lieu = useLocation()
  const naviguer = useNavigate()
  const fermer = avecTiroir(lieu.pathname, lieu.search, false)
  const boite = useRef<HTMLDivElement>(null)
  useEffect(() => {
    boite.current?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true })
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && naviguer(fermer, { replace: true })
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Link className="tr-veil" to={fermer} replace aria-label={t('Fermer le menu')}></Link>
      <div ref={boite} className="tr" role="dialog" aria-modal="true" aria-label={t('Menu')}>
        <CarteBoutique fermer={fermer}>
          <Link className="ibtn" to={fermer} replace aria-label={t('Fermer le menu')}>
            <Icone nom="x" taille={20} />
          </Link>
        </CarteBoutique>
        <ListeNav ici={routeDe(lieu.pathname)} fermer={fermer} />
      </div>
    </>
  )
}
