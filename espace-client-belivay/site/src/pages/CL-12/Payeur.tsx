// Écran « Payer depuis l'étranger » (CL-12), forme d'origine du prototype rendue réelle (DP-54) : la page que reçoit
// le proche (?id=panier envoyé) : ce qu'il offre et à qui, le relais, le détail et le total en francs et en euros
// ou en dollars (devise choisie), ses coordonnées (prénom, e-mail pour le reçu), le paiement express (Apple Pay,
// Google Pay) ou la carte (Visa ou Mastercard, contrôlée), 3-D Secure dans sa feuille (annuler : rien n'est
// débité, réessayer ou changer de carte), « autres moyens » (pas de comptoir), puis la commande et la preuve de
// retrait. 150 000 F au plus par paiement. Panier déjà payé : la confirmation, la suite et le reçu.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import logo from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { PiedWeb } from '../../composants/PiedWeb'
import { Aside, Colonne, Zone } from '../../composants/Gabarits'
import { useColonnes } from '../CL-09/Commun'
import { Dessin } from '../../composants/Dessin'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { jetonExpress, tokeniser } from '../../connecteurs/paiementCarte'
import { source, type PanierPartage } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { expireValide, grouper, luhn, marque } from '../CL-13/MoyensAutres'
import { EURO, PLAFOND_CARTE } from './Diaspora'

const DOLLAR = 603.5 // taux du jour du prestataire (démonstration), figé au paiement

// Paiement express : le prénom et l'e-mail attendent le retour de la feuille Apple Pay / Google Pay, dans ce
// navigateur seulement (jamais dans l'adresse).
const CLE_XP = 'blv_payeur_xp'
const lireXp = (): { id: string; prenom: string; email: string; devise: 'EUR' | 'USD' } | null => {
  try {
    return JSON.parse(sessionStorage.getItem(CLE_XP) ?? 'null')
  } catch {
    return null
  }
}
const ecrireXp = (v: { id: string; prenom: string; email: string; devise: 'EUR' | 'USD' } | null) => {
  try {
    if (v) sessionStorage.setItem(CLE_XP, JSON.stringify(v))
    else sessionStorage.removeItem(CLE_XP)
  } catch {
    // Stockage indisponible : le paiement express redemandera le prénom.
  }
}
// Fuseau du proche (ville), pour l'heure des messages.
const ville = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()!.replace(/_/g, ' ')
  } catch {
    return null
  }
}

export function Payeur() {
  const { t, tf, langue, setLangue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const id = params.get('id') ?? ''
  const xp = params.get('xp')
  const [pp, setPp] = useState<PanierPartage | null | undefined>(undefined)
  const [devise, setDevise] = useState<'EUR' | 'USD'>('EUR')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [numero, setNumero] = useState('')
  const [expire, setExpire] = useState('')
  const [cvc, setCvc] = useState('')
  const [vu, setVu] = useState(false)
  const [troisDs, setTroisDs] = useState(false)
  const [refusee, setRefusee] = useState(false)
  const [autres, setAutres] = useState(false)
  const [code, setCode] = useState('')
  const lg = useColonnes()
  const [notif, setNotif] = useState<string | null>(null)
  useEffect(() => {
    source.panierPartage(id).then(setPp)
  }, [id])
  // Retour de la feuille de paiement express acceptée : le panier est payé, puis le suivi du cadeau.
  useEffect(() => {
    if (!xp) return
    const v = lireXp()
    ecrireXp(null)
    if (!v || v.id !== id) return
    jetonExpress(xp === 'google' ? 'google' : 'apple')
      .then((carte) => source.payerPanierPartage(id, { prenom: v.prenom, email: v.email, carte, devise: v.devise }))
      .then(() => naviguer(chemin('payeur-preuve', { id }), { replace: true }))
  }, [xp, id])
  if (pp === undefined) return null
  const tz = ville()
  const safari = (
    <div className="cl12-safari glass">
      <Icone nom="lock" taille={15} />
      <span>{t('belivay.com')}</span>
    </div>
  )
  const entete = (
    <div className="cl12-wh">
      <img src={logo} alt="BelivaY" />
      <span className="grow"></span>
      <span className="cl12-sec">
        <Icone nom="lock" taille={14} />
        {t('Paiement sécurisé')}
      </span>
      <span className="cl12-lg">
        {(['fr', 'en'] as const).map((l) => (
          <a key={l} href="#" className={langue === l ? 'on' : ''} onClick={(e) => (e.preventDefault(), setLangue(l))}>
            {l.toUpperCase()}
          </a>
        ))}
      </span>
    </div>
  )
  if (!pp)
    return (
      <Ecran route="payeur" fixes={safari}>
        {entete}
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="link" taille={26} />
            </div>
            <h3>{t('Ce lien de paiement n’existe pas')}</h3>
            <p>{t('Demande à ton proche de t’envoyer un nouveau lien depuis son application BelivaY.')}</p>
          </div>
        </div>
      </Ecran>
    )
  const enDeviseDe = (d: 'EUR' | 'USD', m: number) => (d === 'EUR' ? (m / EURO).toFixed(2).replace('.', ',') + ' €' : '$' + (m / DOLLAR).toFixed(2))
  const enDevise = enDeviseDe(devise, pp.total)
  const sousTotal = pp.lignes.reduce((s, l) => s + l.prix * l.qte, 0)
  const nbArticles = pp.lignes.reduce((s, l) => s + l.qte, 0)
  const comment = (
    <details className="more">
      <summary>
        <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{t('Comment ça marche')}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">
        <p>
          <b>{t('1.')}</b>
          {t(' Tu paies ici par carte, frais de service compris, avant l’envoi.')}
        </p>
        <p>
          <b>{t('2.')}</b>
          {tf(' Le vendeur prépare ; le colis part au relais de {p}.', { p: pp.prenom })}
        </p>
        <p>
          <b>{t('3.')}</b>
          {tf(' {p} reçoit son code de retrait. Toi, jamais : tu paies, tu ne retires pas.', { p: pp.prenom })}
        </p>
        <p>
          <b>{t('4.')}</b>
          {t(' Tu reçois la preuve de son retrait.')}
        </p>
      </div>
    </details>
  )

  // Déjà payé : la confirmation, la suite, le reçu.
  if (pp.ref) {
    const py = pp.payeur
    const d = py?.devise ?? 'EUR'
    const demanderNotif = () => {
      if (!('Notification' in window)) return setNotif(t('Ce navigateur ne propose pas de notifications : tu recevras un e-mail.'))
      Notification.requestPermission().then((r) => setNotif(t(r === 'granted' ? 'Notifications autorisées.' : 'Notifications refusées : tu recevras un e-mail.')))
    }
    return (
      <Ecran route="payeur" fixes={safari}>
        {entete}
        <div className="hero green">
          <div className="hk">{t('Paiement confirmé')}</div>
          <div className="big">
            {F(pp.total)}
            <small>{t('F')}</small>
          </div>
          <div className="hs">
            {py
              ? tf('≈ {d} · Merci {p} ! Ton cadeau part au {r}, pour {q}.', { d: enDeviseDe(d, pp.total), p: py.prenom, r: t(pp.relais), q: pp.prenom })
              : tf('Ton cadeau part au {r}, pour {q}.', { r: t(pp.relais), q: pp.prenom })}
          </div>
        </div>
        <div className="sec">
          <h2>{t('La suite')}</h2>
        </div>
        <div className="card">
          <div className="tl">
            <div className="ti done">
              <div className="tt">{t('Payé')}</div>
              <div className="td">{py ? dateA(py.le, langue) : t('Rien d’autre à payer.')}</div>
            </div>
            <div className="ti cur">
              <div className="tt">{t('Le vendeur prépare le colis')}</div>
              <div className="td">{tf('Il part au {r}, Yaoundé.', { r: t(pp.relais) })}</div>
            </div>
            <div className="ti">
              <div className="tt">{tf('{p} reçoit son code de retrait', { p: pp.prenom })}</div>
              <div className="td">{t('Elle seule : tu paies, tu ne retires pas.')}</div>
            </div>
            <div className="ti">
              <div className="tt">{t('Tu reçois la preuve de son retrait')}</div>
              <div className="td">{t('Par notification, sinon par e-mail.')}</div>
            </div>
          </div>
        </div>
        <div className="card tight">
          <div className="li">
            <span className="ic or">
              <Icone nom="bell-ring" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Notifications de ce navigateur')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {py ? tf('Sinon, e-mail à {e}.', { e: py.email }) : t('Sinon, par e-mail.')}
              </span>
            </span>
          </div>
          <div className="li">
            <span className="ic ">
              <Icone nom="moon" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {tz ? tf('Jamais entre 22 h et 7 h, heure de {v}', { v: tz }) : t('Jamais entre 22 h et 7 h')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Sauf message urgent.')}
              </span>
            </span>
          </div>
        </div>
        {notif && <p className="t13 c3">{notif}</p>}
        <div className="btns mt16">
          <button type="button" className="btn primary" onClick={demanderNotif}>
            <Icone nom="bell-ring" taille={18} />
            <span>{t('Autoriser les notifications')}</span>
          </button>
        </div>
        <div className="btns">
          <Link to={chemin('payeur-preuve', { id: pp.id })} className="btn secondary">
            <span>{t('Suivre le cadeau')}</span>
          </Link>
        </div>
        <div className="sec">
          <h2>{t('Ton reçu')}</h2>
        </div>
        <div className="card" style={{ padding: '6px 16px' }}>
          <div className="kv">
            <span className="k">{t('Commande')}</span>
            <span className="v ">{pp.ref}</span>
          </div>
          {py && (
            <div className="kv">
              <span className="k">{t('Carte')}</span>
              <span className="v ">{py.carte}</span>
            </div>
          )}
          <div className="kv">
            <span className="k">{t('Payé')}</span>
            <span className="v ">
              {F(pp.total)}&nbsp;F ≈ {enDeviseDe(d, pp.total)}
            </span>
          </div>
          <div className="kv">
            <span className="k">{t('Dont frais de service carte (2 %)')}</span>
            <span className="v ">{F(pp.frais)}&nbsp;F</span>
          </div>
        </div>
        <details className="more">
          <summary>
            <Icone nom="shield-check" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Ton argent est protégé')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>{t('Ton paiement reste bloqué chez BelivaY : le vendeur n’est payé que 14 jours après la fin du délai de retour.')}</p>
            <p>{tf('Si {p} signale un problème, le remboursement revient sur ta carte.', { p: pp.prenom })}</p>
          </div>
        </details>
      </Ecran>
    )
  }

  const n = numero.replace(/\D/g, '')
  const erreurs = {
    prenom: prenom.trim().length < 2 ? 'Indique ton prénom.' : null,
    email: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ? 'Indique une adresse e-mail valide.' : null,
    numero: !marque(n) ? 'Visa ou Mastercard seulement : vérifie les premiers chiffres.' : !luhn(n) ? 'Ce numéro de carte semble mal tapé.' : null,
    expire: !expireValide(expire) ? 'Date d’expiration invalide (MM/AA).' : null,
    cvc: !/^\d{3,4}$/.test(cvc) ? 'Le code au dos de la carte : 3 chiffres.' : null,
  }
  const trop = pp.total > PLAFOND_CARTE
  const payer = () => {
    setVu(true)
    if (trop || Object.values(erreurs).some(Boolean)) return
    setRefusee(false)
    setCode('')
    setTroisDs(true)
  }
  const valider = async () => {
    // Le numéro et le CVC partent au prestataire (tokenisation, CAP-24) ; BelivaY reçoit le jeton. Échec : rien
    // n'est débité, l'écran « Paiement non validé » le dit.
    let carte
    try {
      carte = await tokeniser({ numero: n, expire, cvc })
    } catch {
      return (setTroisDs(false), setRefusee(true))
    }
    await source.payerPanierPartage(pp.id, { prenom: prenom.trim(), email: email.trim(), carte, devise })
    naviguer(chemin('payeur-preuve', { id: pp.id }))
  }
  const express = (m: 'apple' | 'google') => {
    setVu(true)
    if (erreurs.prenom || erreurs.email || trop) return
    ecrireXp({ id: pp.id, prenom: prenom.trim(), email: email.trim(), devise })
    naviguer(chemin('xp-pay', { m, t: String(pp.total), back: chemin('payeur', { id: pp.id }), ok: chemin('payeur', { id: pp.id, xp: m }) }))
  }
  const champ = (cle: keyof typeof erreurs, label: string, input: ReactNode, aide?: string, icone?: string) => (
    <div className="fld">
      <label htmlFor={'py-' + cle}>{t(label)}</label>
      <div className={'inp' + (vu && erreurs[cle] ? ' err' : '')}>
        {icone && <Icone nom={icone} taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />}
        {input}
      </div>
      {vu && erreurs[cle] ? (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t(erreurs[cle]!)}
        </div>
      ) : (
        aide && <div className="hint">{aide}</div>
      )}
    </div>
  )
  const deviseSeg = (
    <div>
      <Styles id="10d630a833" />
      <div className="dev-seg" role="group" aria-label={t('Devise du paiement')}>
        <span className="lb">{t('Tu paies depuis l’étranger en')}</span>
        <span className="ch">
          {(['EUR', 'USD'] as const).map((d) => (
            <a key={d} href="#" className={devise === d ? 'on' : ''} aria-pressed={devise === d} onClick={(e) => (e.preventDefault(), setDevise(d))}>
              <b>{d === 'EUR' ? '€' : '$'}</b>
              {t(d === 'EUR' ? 'Euro' : 'Dollar US')}
            </a>
          ))}
        </span>
        <span className="rt">{t(devise === 'EUR' ? '1 € = 655,957 F · taux fixe' : 'Taux du jour, figé au paiement')}</span>
      </div>
    </div>
  )
  const feuilles = (
    <>
      {safari}
      <Feuille ouverte={troisDs} fermer={() => setTroisDs(false)} titre={t('3-D Secure')}>
        <div className="row">
          <span className="ic-sq night">
            <Icone nom="shield-check" taille={22} />
          </span>
          <div className="grow">
            <div className="b8 t17">{t('3-D Secure')}</div>
            <div className="t13 c3">{t('Ta banque vérifie que c’est bien toi.')}</div>
          </div>
        </div>
        <div className="cl12-bank">
          <div className="bm">{t('Paiement à BelivaY · Yaoundé')}</div>
          <div className="ba">{enDevise}</div>
          <div className="bx">{F(pp.total)}&nbsp;F</div>
        </div>
        <p className="t14 c2 center" style={{ lineHeight: '1.5', margin: '14px 0 0' }}>
          {t('Valide dans l’application de ta banque, ou saisis le code reçu par SMS.')}
        </p>
        <div className="fld">
          <label htmlFor="py-3ds">{t('Code reçu par SMS de ta banque')}</label>
          <div className="inp">
            <input id="py-3ds" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </div>
        </div>
        <div className="btns mt16">
          <button type="button" className={'btn primary' + (code.length >= 4 ? '' : ' off')} onClick={() => code.length >= 4 && valider()}>
            <span>{t('Valider')}</span>
          </button>
        </div>
        <p className="scrim-note" style={{ marginTop: '8px' }}>
          {t('Rien n’est débité avant ta validation.')}
        </p>
        <div className="btns">
          <button type="button" className="btn ghost" onClick={() => (setTroisDs(false), setRefusee(true))}>
            <span>{t('Annuler le paiement')}</span>
          </button>
        </div>
      </Feuille>
      <Feuille ouverte={autres} fermer={() => setAutres(false)} titre={t('Comment payer ?')}>
        <div className="cl12-kick">{t('Comment payer ?')}</div>
        <h2 className="cl12-st-t">{t('Ici, on paie par carte')}</h2>
        <div className="card flat mt12" style={{ padding: '4px 14px' }}>
          <div className="cl12-mode">
            <span className="ic-sq green">
              <Icone nom="credit-card" taille={20} />
            </span>
            <div className="grow">
              <div className="mt">{t('Carte Visa ou Mastercard')}</div>
              <div className="ms">{t('Le seul moyen sur cette page, avec 3-D Secure.')}</div>
            </div>
            <Icone nom="check" taille={20} style={{ color: 'var(--green)', flexShrink: '0' }} />
          </div>
          <div className="cl12-mode">
            <span className="ic-sq">
              <Icone nom="store" taille={20} />
            </span>
            <div className="grow">
              <div className="mt">{t('Paiement au comptoir du relais')}</div>
              <div className="ms">{t('Jamais pour un paiement depuis l’étranger : tout est réglé avant l’envoi.')}</div>
            </div>
            <Icone nom="x" taille={20} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          </div>
        </div>
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('{p} n’aura rien à payer au retrait, sauf des frais de garde si elle laisse le colis plus d’un jour au relais.', { p: pp.prenom })}</span>
        </div>
        <div className="btns mt16">
          <button type="button" className="btn primary" onClick={() => setAutres(false)}>
            <Icone nom="credit-card" taille={18} />
            <span>{t('Payer par carte')}</span>
          </button>
        </div>
      </Feuille>
    </>
  )

  if (refusee)
    return (
      <Ecran route="payeur" fixes={feuilles}>
        {entete}
        <div className="hero red">
          <div className="hk">{t('Paiement non validé')}</div>
          <div className="cl12-bigt">{t('Aucune somme débitée')}</div>
          <div className="hs">{t('La validation 3-D Secure n’a pas été faite : ta banque n’a rien débité.')}</div>
        </div>
        <div className="sec">
          <h2>{t('Ce que tu peux faire')}</h2>
        </div>
        <div className="card tight">
          <div className="li">
            <span className="ic or">
              <Icone nom="rotate-ccw" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Réessayer avec la même carte')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Garde ton téléphone près de toi pour valider.')}
              </span>
            </span>
          </div>
          <div className="li">
            <span className="ic ">
              <Icone nom="credit-card" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Utiliser une autre carte')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Visa ou Mastercard.')}
              </span>
            </span>
          </div>
          <div className="li">
            <span className="ic ">
              <Icone nom="landmark" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Demander à ta banque')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Certaines cartes bloquent les paiements vers le Cameroun.')}
              </span>
            </span>
          </div>
        </div>
        {deviseSeg}
        <div className="btns mt16">
          <button type="button" className="btn primary" onClick={payer}>
            <Icone nom="lock" taille={18} />
            <span>{tf('Réessayer · {m} F ≈ {d}', { m: F(pp.total), d: enDevise })}</span>
          </button>
        </div>
        <div className="btns">
          <button type="button" className="btn secondary" onClick={() => (setRefusee(false), setNumero(''), setExpire(''), setCvc(''), setVu(false))}>
            <span>{t('Utiliser une autre carte')}</span>
          </button>
        </div>
      </Ecran>
    )

  const brand = marque(n)
  return (
    <Ecran route="payeur" fixes={feuilles} gabarit="web" largeur={lg.largeur}>
      {/* Grands écrans (§ 4.7, 5.10) : ce qu'on offre à gauche (7/12), le paiement à droite (5/12, collant). */}
      <Zone nom="haut">
      {entete}
      <div className="pg">
        <h1 className="pg-t">{t('Payer depuis l’étranger')}</h1>
        <p className="pg-s">
          {pp.lignes.length === 1
            ? tf('Tu offres « {a} » à {p}. Le colis ira à son relais.', { a: t(pp.lignes[0].titre), p: pp.prenom })
            : tf('Tu offres ce panier à {p}. Le colis ira à son relais.', { p: pp.prenom })}
        </p>
      </div>
      </Zone>
      <Colonne>
      {trop && (
        <div className="card cl12-box amber">
          <div className="ib">
            <Icone nom="triangle-alert" taille={18} />
            <div className="grow">
              <div className="bt">{t('Ce panier dépasse la limite de la carte.')}</div>
              <p>{tf('Il fait {m} F avec les frais de service ; une carte paie {p} F au plus par paiement, frais compris. Demande à {q} de partager son panier en deux.', { m: F(pp.total), p: F(PLAFOND_CARTE), q: pp.prenom })}</p>
            </div>
          </div>
        </div>
      )}
      {deviseSeg}
      <div className="card cl12-sum">
        {pp.lignes.map((l, i) => (
          <div key={i} className={'row' + (i ? ' mt8' : '')}>
            <span className="thumb" style={{ width: '52px', height: '52px', borderRadius: '13px' }}>
              <Dessin id={l.dessin} />
            </span>
            <div className="grow">
              <div className="b8 t15">{t(l.titre)}</div>
              <div className="t13 c3 mt4">{tf('{n} article(s) · {m} F', { n: l.qte, m: F(l.prix * l.qte) })}</div>
            </div>
          </div>
        ))}
        <div className="cl12-rel">
          <Icone nom="map-pin" taille={16} />
          <div>
            <b>{tf('{r} · Yaoundé', { r: t(pp.relais) })}</b>
            {tf('{p} retire le colis avec son propre code.', { p: pp.prenom })}
          </div>
        </div>
        <div className="hr"></div>
        <div className="kv">
          <span className="k">{t(nbArticles > 1 ? 'Articles' : 'Article')}</span>
          <span className="v ">{F(sousTotal)}&nbsp;F</span>
        </div>
        <div className="kv">
          <span className="k">{t('Retrait au relais')}</span>
          <span className="v ">{pp.livraison ? F(pp.livraison) + ' F' : t('offert')}</span>
        </div>
        <div className="kv">
          <span className="k">{t('Frais de service carte (2 %)')}</span>
          <span className="v ">{F(pp.frais)}&nbsp;F</span>
        </div>
        <div className="cl12-tot">
          <span className="tl2">{t('Total')}</span>
          <span className="r">
            <span className="price">
              {F(pp.total)}
              <small>{t(' F')}</small>
            </span>
            <span className="cl12-eur">≈ {enDevise}</span>
          </span>
        </div>
      </div>
      <div className="hint-l">
        <Icone nom="arrow-left-right" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('1 € = 655,957 F, taux fixe, arrondi au centime. Dollar US : taux du jour de notre prestataire, figé au moment du paiement.')}</span>
      </div>
      </Colonne>
      <Aside titre={t('Paiement')}>
      <div className="card cl12-form">
        <div className="cl12-ck">{t('Tes coordonnées')}</div>
        {champ('prenom', 'Ton prénom', <input id="py-prenom" className="grow" value={prenom} maxLength={40} autoComplete="given-name" onChange={(e) => setPrenom(e.target.value)} />, tf('{p} verra qui lui offre ce cadeau.', { p: pp.prenom }))}
        {champ('email', 'Ton e-mail', <input id="py-email" className="grow" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />, t('Pour le reçu, et nos messages si les notifications sont coupées.'))}
      </div>
      <Styles id="b472efbe3c" />
      <div className="xp-k">
        <Icone nom="zap" taille={14} />
        {t('Paiement express')}
      </div>
      <div className="xp-row">
        <a href="#" className={'xp-b apple' + (trop ? ' off' : '')} aria-label={t('Payer avec Apple Pay')} onClick={(e) => (e.preventDefault(), express('apple'))}>
          <Icone nom="apple" taille={20} />
          <span>{t('Pay')}</span>
        </a>
        <a href="#" className={'xp-b gpay' + (trop ? ' off' : '')} aria-label={t('Payer avec Google Pay')} onClick={(e) => (e.preventDefault(), express('google'))}>
          <Icone nom="gpay-g" taille={20} />
          <span>{t('Pay')}</span>
        </a>
      </div>
      <p className="xp-note">{t('Ta carte enregistrée dans le téléphone, validée par Face ID ou ton empreinte. Même frais que la carte (2 %).')}</p>
      <div className="xp-or">{t('ou par carte bancaire')}</div>
      <div className="card cl12-form">
        <div className="cl12-ck">{t('Carte bancaire')}</div>
        <div className="cl12-brand" aria-label={t('Cartes acceptées')}>
          <span className={brand !== 'Mastercard' ? 'on' : ''}>{t('VISA')}</span>
          <span className={brand === 'Mastercard' ? 'on' : ''}>{t('Mastercard')}</span>
        </div>
        {champ('numero', 'Numéro de carte', <input id="py-numero" className="grow" inputMode="numeric" autoComplete="cc-number" value={numero} onChange={(e) => setNumero(grouper(e.target.value))} placeholder="4242 4242 4242 4242" />, undefined, 'credit-card')}
        <div className="split2">
          {champ('expire', 'Expiration', <input id="py-expire" className="grow" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={expire} onChange={(e) => setExpire(e.target.value.replace(/[^\d/]/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5))} />)}
          {champ('cvc', 'Code (CVC)', <input id="py-cvc" className="grow" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))} />)}
        </div>
        <div className="hint-l">
          <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Visa ou Mastercard. 3-D Secure obligatoire : ta banque te demande de confirmer.')}</span>
        </div>
      </div>
      <div className="card cl12-box green">
        <div className="bt">{tf('Tu seras remboursé, pas {p}', { p: pp.prenom })}</div>
        <p>{tf('S’il y a un remboursement, il revient sur cette carte, jamais sur le Mobile Money de {p}. Tu reçois aussi la preuve de son retrait.', { p: pp.prenom })}</p>
      </div>
      <div className="btns mt16">
        <button type="button" className={'btn primary' + (trop ? ' off' : '')} onClick={payer}>
          <span>{tf('Payer {m} F ≈ {d}', { m: F(pp.total), d: enDevise })}</span>
        </button>
      </div>
      <p className="cl12-fn">{tf('Tu n’as besoin ni de l’adresse ni du numéro de {p}.', { p: pp.prenom })}</p>
      <div className="hint-l">
        <Icone nom="store" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Paiement au comptoir non proposé : paiement depuis l’étranger.')}</span>
      </div>
      <div className="links cl12-lk">
        <a href="#" onClick={(e) => (e.preventDefault(), setAutres(true))}>
          {t('Autres moyens de paiement ?')}
        </a>
        <Link to={chemin('diaspora-infos')}>{t('Tu commandes souvent pour tes proches ? Le compte diaspora')}</Link>
      </div>
      </Aside>
      <Zone nom="bas">
      {comment}
      {tz && (
        <div className="foot">
          <Icone nom="clock" taille={16} />
          <span>{tf('Fuseau horaire détecté : {v}. Nos messages arrivent entre 7 h et 22 h, heure de {v}.', { v: tz })}</span>
        </div>
      )}
      <PiedWeb />
      </Zone>
    </Ecran>
  )
}
