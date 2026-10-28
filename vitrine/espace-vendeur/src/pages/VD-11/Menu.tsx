// Menu vendeur (VD-11) : repris du prototype (route('menu')), branché sur la source.
// - Composition VD11-R05 en 7 groupes dans l'ordre d'usage (MEN-01, Q-79) : carte nuit de la boutique, À traiter,
//   Messages et aide, Mon argent, Mon catalogue, Vendre plus, Ma boutique, Mon compte ; le bloc « Écrans d'état et
//   d'accès » est retiré de la production (Q-79) : ces écrans s'ouvrent d'eux-mêmes selon l'état du compte ; le bloc
//   « Nouveautés » (L’île BelivaY) aussi : l'île est une démonstration retirée (inventaire-commun.mjs, RETIRES).
// - Compteurs = valeurs réelles, au même instant que les badges du dock et de la cloche (VD11-R01, MEN-02) ; un
//   compteur à zéro disparaît ; une pastille ne porte qu'un travail à faire, un nombre d'information s'écrit en texte
//   (MEN-03) ; compteur indisponible : la ligne sans pastille, jamais un chiffre inventé (VD11-R04).
// - Accès Préparation : ni « Mon argent », ni Nouvelle offre, Plans & tarifs, Se faire voir, Mon équipe (VD11-R02).
// - Ajouts : recherche d'un écran (« Chercher dans le menu »), langue, taille du texte et thème (Q-45), version lue dans la
//   construction, « Se déconnecter » qui ferme vraiment la session.
import { LiensLegaux } from '@client/composants/LiensLegaux'
import './vd11f.css'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { F } from '@client/i18n/format'
import logo from '../../assets/prototype/be926f70d2b8.png'
import { Ecran, nomPalier } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { PreferencesDuMenu } from '../../composants/PreferencesDuMenu'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { CHAMP } from './communs'
import { sourceAJA } from '../AJ-A/donnees/source' // AJ-A : questions des clients (INTEGRATION.md)
import { useMontantsVisibles, useRouteOuverte, useSession } from '../../session'
import { useMonVisuel } from '../../donnees/visuelProfil'

// Version lue dans la construction (vite.config.ts, package.json ; Q-79) : « 2.0 » pour 2.0.0, « 2.1.3 » sinon.
const VERSION = ((import.meta.env.VITE_VERSION_VENDEUR as string | undefined) ?? '2.0').replace(/^(\d+\.\d+)\.0$/, '$1')
const nrm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

interface Entree {
  vers: string
  icone: string
  libelle: string
  sous?: string | null
  droite?: ReactNode
  cle?: string // texte cherché en plus (mots proches)
  onClick?: (e: React.MouseEvent) => void
}

function Ligne({ e }: { e: Entree }) {
  const { t } = usePreferences()
  return (
    <Link to={e.vers} className="li" style={{ minHeight: '52px', padding: '10px 0' }} onClick={e.onClick}>
      <span style={{ color: 'var(--ink-2)', display: 'flex', flexShrink: '0' }}>
        <Icone nom={e.icone} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block', fontSize: '14.5px' }}>
          {t(e.libelle)}
        </span>
        {e.sous && (
          <span className="ls" style={{ display: 'block' }}>
            {e.sous}
          </span>
        )}
      </span>
      {e.droite}
      <span className="chev">
        <Icone nom="chevron-right" taille={17} />
      </span>
    </Link>
  )
}

export default function Menu() {
  const { t, tf, langue, soldeMasque } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const naviguer = useNavigate()
  const prep = s.membre?.role === 'preparation'
  // Employé : une entrée qu'il n'a pas le droit d'ouvrir est masquée (src/donnees/droits.ts, DROIT_DE_ROUTE).
  const ouverte = useRouteOuverte()
  const [q, setQ] = useState('')
  const accueil = useLecture(() => source.accueil.aujourdhui(), [s.membre?.role])
  const produits = useLecture(() => source.produits.liste(), [])
  const argent = useLecture(() => (montants ? source.argent.resume() : Promise.resolve(null)), [montants])
  const boutique = useLecture(() => source.boutique.boutique(), [])
  const visuel = useMonVisuel() // photo et couverture (Mon profil), à jour dès qu'elles changent
  const questions = useLecture(() => sourceAJA.questions.liste(), [])
  const c = accueil.donnees?.compteurs ?? null
  const b = s.boutique
  const badge = (n: number | null | undefined, rouge = false) => (n ? <span className={'badge-num' + (rouge ? ' red' : '')}>{n > 99 ? '99+' : n}</span> : null)
  const p = produits.donnees
  const enVerif = p?.compteurs.en_verification ?? 0
  const deconnecter = async (e: React.MouseEvent) => {
    e.preventDefault()
    await source.session.deconnecter()
    naviguer(chemin('connexion'), { replace: true })
  }

  const groupes: { titre: string; entrees: (Entree | false)[] }[] = [
    {
      titre: 'À traiter',
      entrees: [
        { vers: chemin('commandes'), icone: 'package-check', libelle: 'À préparer', droite: badge(c?.preparer), cle: 'commandes préparer' },
        { vers: chemin('litiges'), icone: 'scale', libelle: 'Litiges', droite: badge(c?.litiges, true) },
        { vers: chemin('retours'), icone: 'undo-2', libelle: 'Retours', droite: badge(c?.retours) },
      ],
    },
    {
      titre: 'Messages et aide',
      entrees: [
        { vers: chemin('notifications'), icone: 'bell', libelle: 'Notifications', droite: badge(s.badges.notifications) },
        { vers: chemin('messages'), icone: 'messages-square', libelle: 'Messagerie', droite: badge(s.badges.messages), cle: 'conversation client support' },
        { vers: chemin('questions'), icone: 'message-circle-question-mark', libelle: 'Questions des clients', sous: t('Sur vos fiches, réponses publiques'), droite: badge(questions.donnees?.compteurs.a_repondre), cle: 'question fiche produit répondre' },
        { vers: chemin('aide'), icone: 'circle-help', libelle: 'Aide', sous: t('Questions fréquentes · support WhatsApp'), cle: 'support whatsapp contact' },
      ],
    },
    {
      titre: 'Mon argent',
      entrees: montants
        ? [
            { vers: chemin('argent'), icone: 'wallet', libelle: 'Mon argent', droite: argent.donnees && <span className="v cg t13 b8">{tf('{montant} F vendredi', { montant: soldeMasque ? '•• •••' : F(argent.donnees.detailVersement.net) })}</span> },
            { vers: chemin('versements'), icone: 'banknote', libelle: 'Versements', sous: t('Chaque vendredi') },
            { vers: chemin('documents'), icone: 'file-text', libelle: 'Documents', sous: t('Contrat, factures, relevés') },
          ]
        : [],
    },
    {
      titre: 'Mon catalogue',
      entrees: [
        { vers: chemin('stock'), icone: 'boxes', libelle: 'Stock et inventaire', droite: badge(p?.produits.filter((x) => x.attention.includes('stock_bas')).length), cle: 'rupture réapprovisionner seuil inventaire' },
        { vers: chemin('produits'), icone: 'package', libelle: 'Mes produits', sous: p ? (enVerif ? tf('{n} produits · {v} en vérification', { n: p.compteurs.total, v: enVerif }) : tf('{n} produits', { n: p.compteurs.total })) : null, cle: 'stock offres' },
        !prep && { vers: chemin('offre1'), icone: 'plus', libelle: 'Ajouter un produit', cle: 'nouvelle offre nouveau produit publier' },
        { vers: chemin('saisie_assistee'), icone: 'users', libelle: 'Saisie assistée', sous: t('Un agent BelivaY saisit vos fiches') },
      ],
    },
    {
      titre: 'Vendre plus',
      entrees: [
        { vers: chemin('palier'), icone: 'award', libelle: 'Trust Score et palier', sous: t('Votre note de confiance, sur 100'), droite: b && <span className="v t14 b8">{Math.round(b.trustScore)}</span>, cle: 'score palier' },
        { vers: chemin('chiffres'), icone: 'chart-column', libelle: 'Mes chiffres', cle: 'statistiques ventes' },
        !prep && { vers: chemin('plans_liste'), icone: 'sparkles', libelle: 'Plans & tarifs', cle: 'abonnement boost pro' },
        !prep && { vers: chemin('promotions'), icone: 'ticket-percent', libelle: 'Promotions', sous: t('Ventes flash à remise réelle'), cle: 'réduction remise prix barré solde flash' },
        !prep && { vers: chemin('publicite'), icone: 'megaphone', libelle: 'Publicité', sous: t('Sponsorisé, À la une, Boost, ventes flash'), cle: 'publicité sponsorisé annonce boost à la une carrousel enchère' },
        !prep && { vers: chemin('visibilite'), icone: 'megaphone', libelle: 'Se faire voir', sous: t('Mettre vos offres en avant') },
      ],
    },
    {
      titre: 'Ma boutique',
      entrees: [
        { vers: chemin('boutique'), icone: 'store', libelle: 'Ma boutique', sous: t('Ce que voit le client'), cle: 'vitrine photo logo description' },
        { vers: chemin('horaires'), icone: 'clock', libelle: 'Horaires et fermetures', cle: 'fermer aujourd’hui pause vacances' },
        { vers: chemin('avis'), icone: 'star', libelle: 'Avis', cle: 'notes clients' },
        !prep && { vers: chemin('equipe'), icone: 'users', libelle: 'Mon équipe', cle: 'employé accès' },
        { vers: chemin('livraison'), icone: 'truck', libelle: 'Livraison et colis', sous: t('Colis, délai, paiement au retrait, ramassage'), cle: 'relais emballage ramassage créneau' },
        { vers: chemin('emplacement'), icone: 'map-pin', libelle: 'Emplacement', sous: boutique.donnees ? `${boutique.donnees.zone} · ${boutique.donnees.quartier}` : null, cle: 'carte point repère gps' },
      ],
    },
    {
      titre: 'Mon compte',
      entrees: [
        { vers: chemin('parametres'), icone: 'settings', libelle: 'Paramètres', sous: t('Langue, taille du texte, notifications'), cle: 'profil photo e-mail téléphone' },
        { vers: chemin('securite'), icone: 'shield-check', libelle: 'Sécurité, appareils et données', cle: 'mot de passe face id export clôture' },
        { vers: chemin('installer'), icone: 'download', libelle: 'Installer l’application' },
        { vers: chemin('connexion'), icone: 'log-out', libelle: 'Se déconnecter', onClick: (e) => void deconnecter(e) },
      ],
    },
  ]

  // ───── DÉBUT · entrées AJ-B (DP-58 : Mon profil, Rechercher, Ramassages, Apprendre, Activité, Mes ajustements) ─────
  // Bloc séparé (un autre groupe de pages ajoute les siennes ailleurs) : chaque entrée rejoint un groupe existant,
  // l'ordre des groupes ne change pas. Accès Préparation : Mes ajustements (argent) n'y paraît pas.
  const ENTREES_AJB: Record<string, Entree[]> = {
    'À traiter': [{ vers: chemin('ramassages'), icone: 'truck', libelle: 'Ramassages', sous: t('Passages du livreur, colis à remettre'), cle: 'livreur créneau remise calendrier' }],
    'Messages et aide': [{ vers: chemin('apprendre'), icone: 'graduation-cap', libelle: 'Apprendre', sous: t('Fiches courtes pour mieux vendre'), cle: 'formation photo prix colis conseils' }],
    'Mon argent': [{ vers: chemin('ajustements'), icone: 'list-checks', libelle: 'Mes ajustements', sous: t('Ventes et reprises, export comptable'), cle: 'comptable reprise remboursement' }],
    'Ma boutique': [{ vers: chemin('activite'), icone: 'history', libelle: 'Activité de la boutique', sous: t('Qui a fait quoi, et quand'), cle: 'journal historique équipe' }],
    'Mon compte': [{ vers: chemin('profil'), icone: 'circle-user-round', libelle: 'Mon profil', sous: t('Photo, couverture, nom, e-mail, téléphone, langue'), cle: 'photo nom email téléphone bio' }],
  }
  for (const g of groupes) {
    const plus = ENTREES_AJB[g.titre]?.filter(() => g.titre !== 'Mon argent' || montants) ?? []
    if (g.titre === 'Mon compte') g.entrees.unshift(...plus)
    else g.entrees.push(...plus)
  }
  const chercherPartout = (
    <Link to={chemin('recherche', { q: q.trim() || undefined })} className="row t14 b8 cor" style={{ gap: '6px', minHeight: '44px', marginTop: '4px' }}>
      <Icone nom="search" taille={16} />
      <span>{q.trim() ? tf('Chercher « {q} » partout', { q: q.trim() }) : t('Rechercher partout : commandes, produits, litiges, BLV-VS…')}</span>
    </Link>
  )
  // ───── FIN · entrées AJ-B ─────

  const m = nrm(q.trim())
  const visibles = useMemo(
    () =>
      groupes
        .map((g) => ({ ...g, entrees: g.entrees.filter((e): e is Entree => !!e && ouverte(e.vers.split('?')[0].slice(1) || 'accueil')).filter((e) => !m || nrm(`${t(e.libelle)} ${e.libelle} ${e.sous ?? ''} ${e.cle ?? ''} ${t(g.titre)}`).includes(m)) }))
        .filter((g) => g.entrees.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m, groupes.map((g) => g.entrees.length).join(), c, argent.donnees, p, langue, questions.donnees],
  )

  const ouverture = !b ? null : b.etat === 'fermee_aujourdhui' ? (
    <span className="pill red sm">
      <i className="d"></i>
      {t('Fermée')}
    </span>
  ) : b.etat === 'en_pause' ? (
    <span className="pill ink sm">
      <i className="d"></i>
      {t('En pause')}
    </span>
  ) : (
    <span className="pill green sm">
      <i className="d"></i>
      {t('Ouverte')}
    </span>
  )
  const photo = visuel.photo ?? boutique.donnees?.vitrine.logo ?? null
  return (
    <Ecran route="menu">
      {/* Carte de tête : elle ouvre Mon profil (informations personnelles, photo de profil et de couverture). */}
      <Link
        to={chemin('profil')}
        className={'hero night vd-carte-profil' + (visuel.couverture ? ' a-couv' : '')}
        aria-label={tf('{nom} · Mon profil', { nom: prep ? `${s.membre!.prenom} ${s.membre!.nom}` : (b?.nom ?? '') })}
        style={{ marginTop: '14px', padding: '14px 16px', display: 'block', color: '#fff', ...(visuel.couverture ? { backgroundImage: `linear-gradient(180deg,rgba(20,12,6,.45),rgba(20,12,6,.9) 70%),url(${visuel.couverture})` } : {}) }}
      >
        <div className="row">
          <span className="avatar" style={{ boxShadow: '0 0 0 2.5px var(--gold-l)', margin: '0', overflow: 'hidden', padding: photo ? 0 : undefined }}>
            {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : s.membre?.initiales}
          </span>
          <div className="grow">
            <div className="b8 t17">{prep ? `${s.membre!.prenom} ${s.membre!.nom}` : b?.nom}</div>
            <div className="t13" style={{ color: 'rgba(255,255,255,.75)' }}>
              {prep ? tf('{boutique} · accès Préparation', { boutique: b?.nom ?? '' }) : tf('{nom} · propriétaire', { nom: `${s.proprietaire?.prenom} ${s.proprietaire?.nom}` })}
            </div>
          </div>
          {ouverture}
        </div>
        {b && (
          <div className="meta">
            <span className="pill dk sm">{`${nomPalier(b.palier, langue)} · ${Math.round(b.trustScore)}`}</span>
            {!prep && <span className="pill dk sm">{b.decouverte.active ? tf('{plan} · découverte', { plan: b.plan }) : b.plan}</span>}
            <span className="vd-carte-profil-l">
              {t('Mon profil')}
              <Icone nom="chevron-right" taille={15} />
            </span>
          </div>
        )}
      </Link>
      {/* Chantier F, point 8 : six tuiles pour l'essentiel, puis la liste complète. */}
      {!q && (
        <nav className="vd11-tuiles" aria-label={t('Raccourcis')}>
          {[
            { route: 'commandes', icone: 'shopping-bag', valeur: c ? String(c.preparer) : '—', libelle: 'À préparer', ton: c?.preparer ? 'or' : '' },
            { route: 'litiges', icone: 'scale', valeur: c ? String(c.litiges + c.retours) : '—', libelle: 'Litiges et retours', ton: c && c.litiges + c.retours ? 'rouge' : '' },
            { route: 'produits', icone: 'package', valeur: p ? String(p.compteurs.en_vente) : '—', libelle: 'En vente', ton: '' },
            montants && { route: 'argent', icone: 'wallet', valeur: argent.donnees ? (soldeMasque ? '•••' : `${F(argent.donnees.detailVersement.net)} F`) : '—', libelle: 'Vendredi', ton: 'vert' },
            { route: 'questions', icone: 'message-circle', valeur: questions.donnees ? String(questions.donnees.compteurs.a_repondre) : '—', libelle: 'Questions', ton: questions.donnees?.compteurs.a_repondre ? 'rouge' : '' },
            b && { route: 'palier', icone: 'award', valeur: String(Math.round(b.trustScore)), libelle: 'Trust Score', ton: '' },
          ]
            .filter((x): x is { route: string; icone: string; valeur: string; libelle: string; ton: string } => !!x && ouverte(x.route))
            .map((x) => (
              <Link key={x.route} to={chemin(x.route)} className={'vd11-tuile ' + x.ton} data-tuile={x.route}>
                <span className="vd11-tuile-i">
                  <Icone nom={x.icone} taille={18} />
                </span>
                <b className="vd11-tuile-v">{x.valeur}</b>
                <span className="vd11-tuile-l">{t(x.libelle)}</span>
              </Link>
            ))}
        </nav>
      )}
      <div className="inp mt14" style={{ marginTop: '16px' }}>
        <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        <input className="grow" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Chercher dans le menu')} aria-label={t('Chercher dans le menu')} autoComplete="off" style={CHAMP} />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label={t('Effacer la recherche')} style={{ background: 'none', border: 0, color: 'var(--ink-3)', display: 'flex', minWidth: '44px', minHeight: '44px', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icone nom="x" taille={18} />
          </button>
        )}
      </div>
      {chercherPartout /* AJ-B */}
      {visibles.length === 0 && (
        <div className="card" style={{ marginTop: '14px' }}>
          <div className="b8 t15">{t('Aucun écran ne correspond')}</div>
          <div className="t13 c2 mt4">{t('Essayez un autre mot : commandes, argent, horaires, équipe…')}</div>
        </div>
      )}
      {visibles.map((g) => (
        <div key={g.titre}>
          <div className="divider-t">{t(g.titre)}</div>
          <div className="card tight" style={{ marginTop: '0' }}>
            {g.entrees.map((e) => (
              <Ligne key={e.vers + e.libelle} e={e} />
            ))}
          </div>
        </div>
      ))}
      {accueil.erreur && (
        <div className="hint-l">
          <Icone nom="wifi-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Compteurs indisponibles pour le moment : ouvrez chaque liste pour voir ce qu’il y a à faire.')}</span>
        </div>
      )}
      <PreferencesDuMenu />
      <div className="center" style={{ marginTop: '22px' }}>
        <img src={logo} alt="BelivaY" style={{ height: '26px', opacity: '.9' }} />
        <div className="t12 c3 mt6">{tf('Espace vendeur · version {v}', { v: VERSION })}</div>
        <LiensLegaux />
      </div>
    </Ecran>
  )
}
