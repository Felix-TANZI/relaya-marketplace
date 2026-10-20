// Reçus (DP-54, consigne du porteur du 5 oct.) : ce que partagent la boîte « Reçus » et la vue de réception.
// - groupes de la boîte (à offrir, à payer, à rejoindre, à accepter, à retirer pour quelqu'un, parrainages) ;
// - nom d'un envoi selon son type et son occasion (mariage de Mireille & Paul, panier de Junior…), traduit ;
// - état d'un envoi, vu du destinataire ou de l'envoyeur ;
// - payer avec les moyens du compte (portefeuille, Mobile Money du compte ou un autre numéro, carte enregistrée ;
//   compte diaspora : carte, Apple Pay, Google Pay, 2 % de frais de service), puis la validation.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { SERVICE_CARTE } from '../../donnees/echanges'
import { espacer, nomMoMo } from '../../donnees/numeros'
import { GROUPE_ENVOI, source, type DonneesRecus, type EnvoiRecu, type GroupeRecu, type MoyensRecu, type TypeEnvoi } from '../../donnees/source'
import { F } from '../../i18n/format'
import { quandCourt } from '../../i18n/dates'
import { usePreferences } from '../../preferences'

export function useRecus(): [DonneesRecus | null, () => void] {
  const [d, setD] = useState<DonneesRecus | null>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    source.recus().then(setD)
  }, [v])
  return [d, () => setV((x) => x + 1)]
}

export const GROUPES: { id: GroupeRecu; titre: string; icone: string; aide: string }[] = [
  { id: 'offrir', titre: 'À offrir', icone: 'gift', aide: 'Les listes de tes proches : mariage, anniversaire, naissance, fêtes.' },
  { id: 'payer', titre: 'À payer', icone: 'wallet', aide: 'Paniers et liens qu’un proche t’envoie pour que tu les paies.' },
  { id: 'rejoindre', titre: 'À rejoindre', icone: 'hand-coins', aide: 'Cagnottes et cotisations : chacun met ce qu’il peut.' },
  { id: 'accepter', titre: 'À accepter', icone: 'package-check', aide: 'Colis offerts, invitations de lien famille, abonnements offerts.' },
  { id: 'retirer', titre: 'À retirer pour quelqu’un', icone: 'key-round', aide: 'Un proche te confie le retrait de son colis.' },
  { id: 'parrainages', titre: 'Parrainages et partages', icone: 'user-plus', aide: 'Invitations à BelivaY, questions et avis partagés.' },
]

export const TYPE_NOM: Record<TypeEnvoi, string> = {
  liste: 'Liste d’envies',
  cagnotte: 'Cagnotte',
  cotisation: 'Cotisation',
  panier: 'Panier à payer',
  'lien-paiement': 'Lien de paiement',
  'demande-diaspora': 'Panier d’un proche',
  rentree: 'Liste de rentrée',
  colis: 'Colis offert',
  'lien-famille': 'Lien famille',
  abonnement: 'Abonnement offert',
  'panier-famille': 'Panier famille',
  'code-retrait': 'Retrait confié',
  parrainage: 'Parrainage',
  partage: 'Partage',
}
export const TYPE_ICONE: Record<TypeEnvoi, string> = {
  liste: 'gift',
  cagnotte: 'piggy-bank',
  cotisation: 'hand-coins',
  panier: 'shopping-basket',
  'lien-paiement': 'link',
  'demande-diaspora': 'shopping-basket',
  rentree: 'graduation-cap',
  colis: 'package',
  'lien-famille': 'users',
  abonnement: 'gem',
  'panier-famille': 'shopping-bag',
  'code-retrait': 'key-round',
  parrainage: 'user-plus',
  partage: 'message-circle',
}
const OCCASION: Record<string, string> = {
  mariage: 'Liste de mariage de {p}',
  dot: 'Dot de {p}',
  anniversaire: 'Anniversaire de {p}',
  naissance: 'Naissance : la liste de {p}',
  'baby-shower': 'Baby shower de {p}',
  cremaillere: 'Crémaillère de {p}',
  diplome: 'Diplôme de {p}',
  fete: 'Fête de {p}',
  rentree: 'Rentrée de {p}',
}
export const NOMS_OCCASION: [string, string, string][] = [
  ['anniversaire', 'Anniversaire', 'cake'],
  ['mariage', 'Mariage', 'heart'],
  ['dot', 'Dot', 'gem'],
  ['naissance', 'Naissance', 'baby'],
  ['baby-shower', 'Baby shower', 'baby'],
  ['cremaillere', 'Crémaillère', 'house'],
  ['diplome', 'Diplôme', 'graduation-cap'],
  ['fete', 'Fête', 'party-popper'],
  ['rentree', 'Rentrée', 'backpack'],
  ['autre', 'Autre', 'gift'],
]

type T = (m: string) => string
type Tf = (m: string, v: Record<string, string | number>) => string
export const hotesDe = (x: EnvoiRecu) => (x.hotes.length ? x.hotes.join(' & ') : x.de)

/** Le nom d'un envoi, dit pour celui qui le regarde (destinataire : qui t'envoie quoi ; envoyeur : pour qui). */
export function nomEnvoi(x: EnvoiRecu, sens: 'recu' | 'envoye', t: T, tf: Tf): string {
  if (sens === 'envoye') return tf('{t} · pour {p}', { t: t(TYPE_NOM[x.type]), p: x.pour })
  const p = x.de
  switch (x.type) {
    case 'liste':
      return x.occasion && OCCASION[x.occasion] ? tf(OCCASION[x.occasion], { p: hotesDe(x) }) : tf('Liste d’envies de {p}', { p })
    case 'cagnotte':
      return x.occasion === 'mariage' ? tf('Cagnotte du mariage de {p}', { p: hotesDe(x) }) : tf('Cagnotte de {p}', { p })
    case 'cotisation':
      return tf('{p} t’invite à une cotisation', { p })
    case 'panier':
      return tf('{p} t’envoie son panier à payer', { p })
    case 'lien-paiement':
      return tf('{p} te demande de payer sa commande', { p })
    case 'demande-diaspora':
      return tf('{p} t’a envoyé son panier', { p })
    case 'rentree':
      return tf('{p} t’envoie une liste de rentrée', { p })
    case 'colis':
      return tf('{p} t’offre un colis', { p })
    case 'lien-famille':
      return tf('{p} veut être relié à ton compte', { p })
    case 'abonnement':
      return tf('{p} t’offre un abonnement', { p })
    case 'panier-famille':
      return tf('{p} t’envoie un panier chaque mois', { p })
    case 'code-retrait':
      return tf('{p} te confie le retrait de son colis', { p })
    case 'parrainage':
      return tf('{p} t’invite sur BelivaY', { p })
    case 'partage':
      return tf('{p} te partage une question', { p })
  }
}

/** L'état d'un envoi : texte (à traduire avec tf, {p} : l'autre) et couleur de la pastille. */
export function etatEnvoi(x: EnvoiRecu, sens: 'recu' | 'envoye'): [string, string] {
  if (x.etat === 'expire') return ['Expiré', 'amber']
  if (x.etat === 'refuse') return [sens === 'recu' ? 'Refusé' : 'Refusé par {p}', 'red']
  if (sens === 'envoye') {
    if (x.etat === 'a_traiter') return [x.dansLApplication ? 'Dans son application' : 'Lien à partager', 'amber']
    return [x.actions.length ? 'Réponse reçue' : 'Fait', 'green']
  }
  if (x.etat === 'accepte') return [x.type === 'code-retrait' ? 'À retirer' : 'Accepté', 'green']
  if (x.etat === 'fait') return ['Fait', 'green']
  const g = GROUPE_ENVOI[x.type]
  return [g === 'offrir' ? 'À offrir' : g === 'payer' ? 'À payer' : g === 'rejoindre' ? 'À rejoindre' : g === 'retirer' ? 'À retirer' : g === 'parrainages' ? 'Nouveau' : 'À accepter', 'or']
}

/** Une ligne de la boîte. */
export function LigneRecu({ x, sens, on, remplacer, maintenant }: { x: EnvoiRecu; sens: 'recu' | 'envoye'; on?: boolean; remplacer?: boolean; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const [etat, couleur] = etatEnvoi(x, sens)
  const montant = x.type === 'liste' ? null : x.lignes.length && GROUPE_ENVOI[x.type] === 'payer' ? x.lignes.reduce((n, l) => n + l.prix * l.qte, 0) : x.objectif
  return (
    <Link to={chemin('recu', { id: x.id })} replace={remplacer} aria-current={on ? 'true' : undefined} className={'li' + (on ? ' on' : '')}>
      <span className={'ic' + (x.etat === 'a_traiter' && sens === 'recu' ? ' or' : '')}>
        <Icone nom={TYPE_ICONE[x.type]} taille={20} />
      </span>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="lt" style={{ display: 'block' }}>
          {nomEnvoi(x, sens, t, tf)}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {[t(TYPE_NOM[x.type]), montant ? F(montant) + ' F' : null, quandCourt(x.le, maintenant, langue)].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className={'pill sm ' + couleur}>{tf(etat, { p: x.pour })}</span>
    </Link>
  )
}

// ——— Payer avec les moyens du compte ———

export interface Choix {
  moyen: string // wallet | momo:<id> | momo:+<numéro> | carte:<id> | apple | google
  carte: boolean // frais de service carte (2 %)
  libelle: string
}

/** Les frais de carte (2 %) sur un montant. */
export const fraisCarte = (montant: number, c: Choix | null) => (c?.carte ? Math.round(montant * SERVICE_CARTE) : 0)

/**
 * Le choix du moyen (pré-rempli : le moyen par défaut du compte), le bouton « Payer », puis la validation
 * (Mobile Money : sur le téléphone ; carte : 3-D Secure ; Apple Pay, Google Pay : Face ID ; portefeuille : tout de
 * suite). payer reçoit le moyen et rend un message d'erreur, ou null.
 */
export function PayerAvecMonCompte({ montant, moyens, texte, payer }: { montant: number; moyens: MoyensRecu; texte: string; payer: (moyen: string) => Promise<string | null> }) {
  const { t, tf } = usePreferences()
  const choix: Choix[] = [
    ...(moyens.diaspora ? [] : [{ moyen: 'wallet', carte: false, libelle: 'Portefeuille BelivaY' }]),
    ...moyens.mobile.map((m) => ({ moyen: 'momo:' + m.id, carte: false, libelle: `${nomMoMo(m.operateur)} · ${m.numeroMasque}` })),
    ...moyens.cartes.map((c) => ({ moyen: 'carte:' + c.id, carte: true, libelle: `${c.marque} •••• ${c.derniers}` })),
    ...(moyens.diaspora ? [{ moyen: 'apple', carte: true, libelle: 'Apple Pay' }, { moyen: 'google', carte: true, libelle: 'Google Pay' }] : []),
  ]
  const parDefaut = moyens.diaspora ? choix.find((c) => c.carte) : (choix.find((c) => c.moyen === 'momo:' + (moyens.mobile.find((m) => m.parDefaut) ?? moyens.mobile[0])?.id) ?? null)
  const [sel, setSel] = useState<string>(parDefaut?.moyen ?? (moyens.diaspora ? 'apple' : 'autre'))
  const [numero, setNumero] = useState('')
  const [etape, setEtape] = useState<'choix' | 'valider'>('choix')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const autre = sel === 'autre'
  const c: Choix | null = autre ? { moyen: 'momo:' + numero.replace(/\D/g, ''), carte: false, libelle: 'Mobile Money · ' + numero } : (choix.find((x) => x.moyen === sel) ?? null)
  const frais = fraisCarte(montant, c)
  const total = montant + frais
  const walletCourt = sel === 'wallet' && moyens.portefeuille < total
  const confirmer = async () => {
    if (!c || envoi) return
    setEnvoi(true)
    const e = await payer(c.moyen)
    setEnvoi(false)
    if (e) {
      setErreur(e)
      setEtape('choix')
    }
  }
  const radio = (id: string, titre: string, sous: string, icone: string, off = false) => (
    <a key={id} href="#" role="radio" aria-checked={sel === id} aria-disabled={off || undefined} className={'radio' + (sel === id ? ' on' : '')} onClick={(e) => (e.preventDefault(), setSel(id), setErreur(null))}>
      <span className="rd"></span>
      <span className="grow">
        <span className="rt" style={{ display: 'block' }}>
          {titre}
        </span>
        <span className="rs" style={{ display: 'block' }}>
          {sous}
        </span>
      </span>
      <Icone nom={icone} taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
    </a>
  )
  if (etape === 'valider' && c)
    return (
      <div className="card or">
        {c.moyen.startsWith('momo:') ? (
          <div className="cl08-wait">
            <span className="cl08-spin"></span>
            <div className="grow">
              <b>{t('Valide la demande sur ton téléphone')}</b>
              <span className="s">{tf('{m} F · {o}', { m: F(total), o: t(c.libelle) })}</span>
            </div>
          </div>
        ) : c.moyen === 'wallet' ? (
          <p className="t14">{tf('{m} F seront pris sur ton portefeuille BelivaY.', { m: F(total) })}</p>
        ) : c.moyen === 'apple' || c.moyen === 'google' ? (
          <p className="t14">{tf('{o} : confirme {m} F avec Face ID ou ton empreinte.', { o: c.libelle, m: F(total) })}</p>
        ) : (
          <p className="t14">{tf('3-D Secure : ta banque confirme le paiement de {m} F.', { m: F(total) })}</p>
        )}
        <div className="btns">
          <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={confirmer}>
            <Icone nom="circle-check" taille={18} />
            <span>{t(c.moyen.startsWith('momo:') ? 'J’ai validé sur mon téléphone' : c.moyen === 'wallet' ? 'Confirmer' : 'Valider')}</span>
          </button>
        </div>
        <div className="btns">
          <button type="button" className="btn secondary" onClick={() => setEtape('choix')}>
            <span>{t('Changer de moyen')}</span>
          </button>
        </div>
      </div>
    )
  const numeroValide = /^6\d{8}$/.test(numero.replace(/\D/g, ''))
  return (
    <div className="blv-payer">
      <div className="sec">
        <h2>{t('Payer avec')}</h2>
      </div>
      {moyens.diaspora && (
        <div className="hint-l">
          <Icone nom="globe" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Depuis l’étranger, tu paies par carte (2 % de frais de service). Ton proche ne paie rien.')}</span>
        </div>
      )}
      {choix.map((x) =>
        radio(
          x.moyen,
          t(x.libelle),
          x.moyen === 'wallet' ? tf('Solde : {s} F', { s: F(moyens.portefeuille) }) : x.carte ? t('2 % de frais de service · 3-D Secure') : t('Sans frais · validé sur ton téléphone'),
          x.moyen === 'wallet' ? 'wallet' : x.carte ? 'credit-card' : 'smartphone',
          x.moyen === 'wallet' && moyens.portefeuille < total,
        ),
      )}
      {!moyens.diaspora && radio('autre', t(moyens.mobile.length ? 'Un autre numéro Mobile Money' : 'Mon numéro Mobile Money'), t('MTN ou Orange · sans frais'), 'smartphone')}
      {autre && (
        <div className="fld">
          <label htmlFor="rc-numero">{t('Numéro MTN ou Orange')}</label>
          <div className="inp">
            <b className="t15">+237</b>
            <input id="rc-numero" className="grow" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={numero} onChange={(e) => setNumero(espacer(e.target.value))} />
          </div>
        </div>
      )}
      {walletCourt && (
        <div className="note amber">
          <Icone nom="wallet" taille={18} />
          <div>
            {tf('Solde insuffisant ({s} F).', { s: F(moyens.portefeuille) })} <Link to={chemin('wallet')}>{t('Recharger mon portefeuille')}</Link>
          </div>
        </div>
      )}
      <div className="card tight">
        <div className="kv">
          <span className="k">{t('Montant')}</span>
          <span className="v">{F(montant)}&nbsp;F</span>
        </div>
        {frais > 0 && (
          <div className="kv">
            <span className="k">{t('Frais de service carte (2 %)')}</span>
            <span className="v">{F(frais)}&nbsp;F</span>
          </div>
        )}
        <div className="kv">
          <span className="k">
            <b>{t('Tu paies')}</b>
          </span>
          <span className="v">
            <b>{F(total)}&nbsp;F</b>
          </span>
        </div>
      </div>
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{t(erreur)}</div>
        </div>
      )}
      <div className="btns">
        <button
          type="button"
          className={'btn primary' + ((autre && !numeroValide) || walletCourt ? ' off' : '')}
          aria-disabled={(autre && !numeroValide) || walletCourt || undefined}
          onClick={() => {
            if (autre && !numeroValide) return setErreur('Entre un numéro MTN ou Orange à 9 chiffres.')
            if (walletCourt) return setErreur('Solde insuffisant : choisis un autre moyen.')
            setErreur(null)
            setEtape('valider')
          }}
        >
          <Icone nom="lock" taille={18} />
          <span>{tf(texte, { m: F(total) })}</span>
        </button>
      </div>
      <p className="t12 c3" style={{ textAlign: 'center' }}>
        {t('Ton argent reste bloqué chez BelivaY jusqu’à la remise. Jamais en espèces.')}
      </p>
    </div>
  )
}

/** Raisons d'un refus de la source, en clair. */
export const RAISONS: Record<string, string> = {
  traite: 'C’est déjà fait : rien n’a été débité.',
  expire: 'Cet envoi a expiré : rien n’a été débité.',
  offert: 'Quelqu’un vient de l’offrir : rien n’a été débité. Choisis un autre article.',
  montant: 'Ce montant n’est pas possible : dès 1 000 F, au plus ce qui manque.',
  garantie: 'Pour ce colis, la livraison ne peut pas être laissée au destinataire.',
  solde: 'Solde insuffisant : choisis un autre moyen.',
  moyen: 'Ce moyen de paiement n’est pas accepté ici.',
  diaspora: 'Ce panier se paie depuis un compte diaspora.',
}
