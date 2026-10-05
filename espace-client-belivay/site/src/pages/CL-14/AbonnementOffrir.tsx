// Écran « Offrir un abonnement » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : la page web
// belivay.com/offrir (en-tête du site, langue) où un proche à l'étranger offre Plus, Prime ou Prime Duo pour 1 mois,
// 3 mois ou 1 an (?palier=plus&mois=1 : « offrir 1 mois de Plus ») : le numéro BelivaY du bénéficiaire (rien
// d'autre : ni adresse ni commandes), son prénom affiché au bénéficiaire, un mot facultatif, la durée et le palier
// (prix : donnees/prime.ts), la devise (euro à taux fixe, dollar au taux du prestataire), le récapitulatif (frais de
// carte 2 %), le paiement express (Apple Pay, Google Pay) ou la carte (contrôlée), 3-D Secure ; l'abonnement
// s'active sur le compte du bénéficiaire, qui reçoit une notification ; « C'est offert », la preuve du paiement
// (référence, dates, montant) à enregistrer en PDF, et offrir à quelqu'un d'autre.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import img_be926f70d2b8_png from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne, Zone } from '../../composants/Gabarits'
import { PiedWeb } from '../../composants/PiedWeb'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin, NAVIGATION } from '../../config/pages'
import { jetonExpress, messageCarte, tokeniser } from '../../connecteurs/paiementCarte'
import { chiffres, espacer, masquer } from '../../donnees/numeros'
import { enregistrerFichier, partagerFichier, pdfTexte } from '../../donnees/pdf'
import { DUREES_CADEAU, palier, prixCadeau, type DureeCadeau } from '../../donnees/prime'
import { libelleCarte, source, type CarteJeton } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { expireValide, grouper, luhn, marque } from '../CL-13/MoyensAutres'
import { EURO, PLAFOND_CARTE } from '../CL-12/Diaspora'
import { BandeauPrime } from './MonAbonnement'

const DOLLAR = 603.5 // taux du jour du prestataire (démonstration), figé au paiement : le même que la page du payeur
const EN_COURS = 'blv_offrir_xp' // cadeau en attente du paiement express (sur cet appareil, le temps du paiement)
type Choix = 'plus' | 'prime' | 'duo'
type Cadeau = { numero: string; prenom: string; palier: Choix; mois: DureeCadeau; message: string; carte: CarteJeton } // jeton, jamais le numéro (CAP-24)
type Fini = { pourCeCompte: boolean; prenom: string; palier: Choix; mois: DureeCadeau; message: string; numero: string; carte: string; ref: string; le: number; du: number | null; au: number | null }
const MESSAGE_MAX = 140
const lire = (): Cadeau | null => {
  try {
    const v = sessionStorage.getItem(EN_COURS)
    sessionStorage.removeItem(EN_COURS)
    return v ? (JSON.parse(v) as Cadeau) : null
  } catch {
    return null
  }
}
const garder = (c: Cadeau) => {
  try {
    sessionStorage.setItem(EN_COURS, JSON.stringify(c))
  } catch {
    /* sans stockage : le paiement express revient sans cadeau, rien n'est débité */
  }
}

export function AbonnementOffrir() {
  const { t, tf, langue, setLangue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const tabL = useDes('tab-l')
  const [numero, setNumero] = useState('')
  const [prenom, setPrenom] = useState('')
  const p0 = params.get('palier')
  const m0 = Number(params.get('mois'))
  const [choix, setChoix] = useState<Choix>(p0 === 'plus' || p0 === 'duo' ? p0 : 'prime')
  const [mois, setMois] = useState<DureeCadeau>((DUREES_CADEAU as readonly number[]).includes(m0) ? (m0 as DureeCadeau) : 12)
  const [message, setMessage] = useState('')
  const [pdfMsg, setPdfMsg] = useState<string | null>(null)
  const [devise, setDevise] = useState<'EUR' | 'USD'>('EUR')
  const [carte, setCarte] = useState('')
  const [expire, setExpire] = useState('')
  const [cvc, setCvc] = useState('')
  const [vu, setVu] = useState(false)
  const [troisDs, setTroisDs] = useState(false)
  const [code, setCode] = useState('')
  const [fini, setFini] = useState<Fini | null>(null)
  const [inconnu, setInconnu] = useState(false)
  const [refusCarte, setRefusCarte] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const repris = useRef(false)
  // Retour du paiement express : le cadeau gardé le temps du paiement est offert.
  useEffect(() => {
    if (params.get('xp') !== 'ok' || repris.current) return
    repris.current = true
    const c = lire()
    if (!c) return
    source.offrirAbonnement(c).then((r) => {
      if (r.ok) setFini({ ...c, carte: libelleCarte(c.carte), pourCeCompte: r.pourCeCompte, ref: r.ref, le: r.le, du: r.du, au: r.au })
      else (setNumero(c.numero), setPrenom(c.prenom), setChoix(c.palier), setMois(c.mois), setMessage(c.message), setInconnu(true))
    })
  }, [params])
  const p = palier(fini?.palier ?? choix)!
  const duree = fini?.mois ?? mois
  const prix = prixCadeau(p, duree)
  const frais = Math.round(prix * 0.02)
  const total = prix + frais
  const nomDuree = (n: number) => t(n === 12 ? '1 an' : n === 3 ? '3 mois' : '1 mois')
  const enDevise = devise === 'EUR' ? (total / EURO).toFixed(2).replace('.', ',') + ' €' : '$' + (total / DOLLAR).toFixed(2)
  const n = carte.replace(/\D/g, '')
  const erreurs = {
    numero: !/^6\d{8}$/.test(chiffres(numero)) ? 'Un numéro camerounais à 9 chiffres, qui commence par 6.' : null,
    prenom: prenom.trim().length < 2 ? 'Indique ton prénom.' : null,
    message: message.length > MESSAGE_MAX ? 'Ton mot : 140 caractères au plus.' : null,
    carte: !marque(n) ? 'Visa ou Mastercard seulement : vérifie les premiers chiffres.' : !luhn(n) ? 'Ce numéro de carte semble mal tapé.' : null,
    expire: !expireValide(expire) ? 'Date d’expiration invalide (MM/AA).' : null,
    cvc: !/^\d{3,4}$/.test(cvc) ? 'Le code au dos de la carte : 3 chiffres.' : null,
  }
  const enTete = (
    <header className="hd glass cl14-web">
      <div className="hd-sub">
        <img src={img_be926f70d2b8_png} alt="BelivaY" />
        <span className="hd-sp"></span>
        <button type="button" className="lang" aria-label={t('Langue')} onClick={() => setLangue(langue === 'en' ? 'fr' : 'en')}>
          {langue === 'en' ? 'EN' : 'FR'}
        </button>
      </div>
      <div className="cl14-url">
        <Icone nom="lock" taille={12} />
        {t('belivay.com/offrir')}
      </div>
    </header>
  )
  const navigation = { ...NAVIGATION['abonnement-offrir'], entete: 'propre' as const }
  const recap = (paye: boolean) => (
    <>
      <div className="kv">
        <span className="k">{tf('{p} · {n} mois', { p: t(p.id === 'prime' ? 'Prime ★' : p.nom), n: duree })}</span>
        <span className="v ">{F(prix)}&nbsp;F</span>
      </div>
      <div className="kv">
        <span className="k">{t('Frais de service carte (2 %)')}</span>
        <span className="v ">{F(frais)}&nbsp;F</span>
      </div>
      <div className="total">
        <span className="tl2">{t(paye ? 'Payé' : 'Total')}</span>
        <span>
          <span className="price">
            {F(total)}
            <small>{t(' F')}</small>
          </span>{' '}
          <span className="t13 c3 b7">≈ {enDevise}</span>
        </span>
      </div>
    </>
  )
  if (fini) {
    const pour = '+237 ' + masquer(chiffres(fini.numero))
    const lignes = [
      [t('Référence'), fini.ref],
      [t('Payé le'), dateA(fini.le, langue)],
      [t('Pour'), pour],
      [t('Palier'), t(p.nom)],
      [t('Durée'), nomDuree(fini.mois)],
      ...(fini.du && fini.au ? [[t('Valable'), tf('du {a} au {b}', { a: jourSeul(fini.du, langue), b: jourSeul(fini.au, langue) })]] : []),
      [t('Payé avec'), fini.carte],
      [t('De la part de'), fini.prenom],
    ]
    const pdf = () =>
      pdfTexte([
        { texte: 'BelivaY', taille: 22, gras: true },
        { texte: t('Preuve de paiement · abonnement offert'), taille: 15, gras: true, espace: 10 },
        { texte: t('Émise par BelivaY · Yaoundé, Cameroun'), taille: 10 },
        ...lignes.map(([k, v], n) => ({ texte: k, droite: v, espace: n ? 0 : 18 })),
        { texte: tf('{p} · {n} mois', { p: t(p.nom), n: fini.mois }), droite: F(prix) + ' F', espace: 12 },
        { texte: t('Frais de service carte (2 %)'), droite: F(frais) + ' F' },
        { texte: t('Payé'), droite: F(total) + ' F · ' + enDevise, gras: true, espace: 6 },
        ...(fini.message ? [{ texte: '« ' + fini.message + ' »', espace: 18 }] : []),
      ])
    const nomPdf = `BelivaY-cadeau-${fini.ref}.pdf`
    // Dès 1024 px (§ 4.7) : la preuve du paiement passe dans l'aside collant, à droite. Déplacée, jamais dupliquée.
    const preuvePaiement = (
      <>
      <div className="sec">
        <h2>{t('Preuve du paiement')}</h2>
      </div>
      <div className="card ">
        {lignes.map(([k, v]) => (
          <div key={k} className="kv">
            <span className="k">{k}</span>
            <span className="v ">{v}</span>
          </div>
        ))}
        {fini.message && <p className="t13 c2 mt8">« {fini.message} »</p>}
        <div className="btns mt12">
          <button type="button" className="btn secondary" onClick={() => partagerFichier(pdf(), nomPdf, t('Preuve de paiement · ') + fini.ref).then((r) => r === 'enregistre' && setPdfMsg(t('PDF enregistré sur le téléphone.')))}>
            <Icone nom="share-2" taille={18} />
            <span>{t('Partager la preuve')}</span>
          </button>
        </div>
        <div className="btns">
          <button type="button" className="btn ghost" onClick={() => (enregistrerFichier(pdf(), nomPdf), setPdfMsg(t('PDF enregistré sur le téléphone.')))}>
            <Icone nom="download" taille={18} />
            <span>{t('Enregistrer en PDF')}</span>
          </button>
        </div>
        {pdfMsg && (
          <div className="note green">
            <Icone nom="circle-check" taille={18} />
            <div>{pdfMsg}</div>
          </div>
        )}
      </div>
      </>
    )
    return (
      <Ecran route="abonnement-offrir" navigation={navigation} avant={enTete} gabarit="web">
        <Styles id="02f3dac5cd" />
        <Zone nom="haut">
          <BandeauPrime />
          <div className="cl14-check">
            <Icone nom="gift" taille={30} />
          </div>
          <div className="cl14-center">
            <div className="pg">
              <h1 className="pg-t">{tf('C’est offert, {p} !', { p: fini.prenom })}</h1>
              <p className="pg-s">{tf('Ton proche a {p} pour {n} mois. Il est prévenu dans son application, avec ton prénom.', { p: t(p.nom), n: fini.mois })}</p>
            </div>
          </div>
        </Zone>
        <Colonne>
          <div className="card ">{recap(true)}</div>
          {!tabL && preuvePaiement}
          <div className="note ink">
            <Icone nom="info" taille={18} />
            <div>{tf('Les {n} mois commencent dès la fin de son abonnement en cours, ou tout de suite s’il n’en a pas. Aucun prélèvement récurrent sur ta carte. Non remboursable une fois payé.', { n: fini.mois })}</div>
          </div>
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('BelivaY ne te montre ni ses commandes ni son adresse.')}</span>
          </div>
          {fini.pourCeCompte && (
            <div className="btns mt16">
              <Link to={chemin('mon-abonnement')} className="btn primary">
                <span>{t('Voir l’abonnement')}</span>
              </Link>
            </div>
          )}
          <div className="btns">
            <button
              type="button"
              className="btn secondary"
              onClick={() => (setFini(null), setNumero(''), setMessage(''), setCarte(''), setExpire(''), setCvc(''), setCode(''), setTroisDs(false), setVu(false), setPdfMsg(null))}
            >
              <Icone nom="gift" taille={18} />
              <span>{t('Offrir à quelqu’un d’autre')}</span>
            </button>
          </div>
        </Colonne>
        {tabL && <Aside titre="Preuve du paiement">{preuvePaiement}</Aside>}
        <Zone nom="bas">
          <PiedWeb />
        </Zone>
      </Ecran>
    )
  }
  const champ = (cle: keyof typeof erreurs, label: string, icone: string | null, input: React.ReactNode, aide?: string) => (
    <div className="fld">
      <label htmlFor={'ao-' + cle}>{t(label)}</label>
      <div className={'inp' + (vu && erreurs[cle] ? ' err' : cle === 'numero' && !erreurs.numero ? ' ok' : '')}>
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
  // Paiement express : le bénéficiaire et le prénom d'abord ; la carte du téléphone ensuite.
  const express = async (m: 'apple' | 'google') => {
    setVu(true)
    if (erreurs.numero || erreurs.prenom) return
    if (erreurs.message) return
    garder({ numero, prenom: prenom.trim(), palier: choix, mois, message: message.trim(), carte: await jetonExpress(m) })
    naviguer(chemin('xp-pay', { m, back: 'abonnement-offrir', t: String(total), ok: chemin('abonnement-offrir', { xp: 'ok' }) }))
  }
  // Dès 1024 px, page web publique (§ 4.7) : à qui l'on offre, la durée et le palier à gauche (7/12) ; le
  // récapitulatif et le paiement dans l'aside collant à droite (5/12). 3-D Secure : une colonne centrée.
  const paiement = (
    <>
    <div className="sec">
      <h2>{t('Récapitulatif')}</h2>
    </div>
    <div>
      <Styles id="10d630a833" />
      <div className="dev-seg" role="group" aria-label={t('Devise du paiement')}>
        <span className="lb">{t('Tu paies depuis l’étranger en')}</span>
        <span className="ch">
          {(['EUR', 'USD'] as const).map((x) => (
            <a key={x} href="#" className={devise === x ? 'on' : ''} aria-pressed={devise === x} onClick={(e) => (e.preventDefault(), setDevise(x))}>
              <b>{x === 'EUR' ? '€' : '$'}</b>
              {t(x === 'EUR' ? 'Euro' : 'Dollar US')}
            </a>
          ))}
        </span>
        <span className="rt">{t(devise === 'EUR' ? '1 € = 655,957 F · taux fixe' : 'Dollar US : taux du jour de notre prestataire, figé au moment du paiement.')}</span>
      </div>
    </div>
    <div className="card ">
      <div className="recap">{recap(false)}</div>
    </div>
    <Styles id="b472efbe3c" />
    <div className="xp-k">
      <Icone nom="zap" taille={14} />
      {t('Paiement express')}
    </div>
    <div className="xp-row">
      <a href="#" role="button" className="xp-b apple" aria-label={t('Payer avec Apple Pay')} onClick={(e) => (e.preventDefault(), express('apple'))}>
        <Icone nom="apple" taille={20} />
        <span>{t('Pay')}</span>
      </a>
      <a href="#" role="button" className="xp-b gpay" aria-label={t('Payer avec Google Pay')} onClick={(e) => (e.preventDefault(), express('google'))}>
        <Icone nom="gpay-g" taille={20} />
        <span>{t('Pay')}</span>
      </a>
    </div>
    <p className="xp-note">{t('Ta carte enregistrée dans le téléphone, validée par Face ID ou ton empreinte. Même frais que la carte (2 %).')}</p>
    <div className="xp-or">{t('ou par carte bancaire')}</div>
    {champ(
      'carte',
      'Numéro de carte',
      'landmark',
      <input id="ao-carte" className="grow" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={carte} onChange={(e) => setCarte(grouper(e.target.value))} />,
      tf('Visa ou Mastercard. 3-D Secure : ta banque te demande de confirmer. Plafond : {m} F par paiement.', { m: F(PLAFOND_CARTE) }),
    )}
    <div className="row" style={{ gap: 10 }}>
      <span className="grow">{champ('expire', 'Expiration', null, <input id="ao-expire" inputMode="numeric" placeholder="MM/AA" value={expire} onChange={(e) => setExpire(e.target.value.replace(/[^\d/]/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5))} />)}</span>
      <span className="grow">{champ('cvc', 'Code (CVC)', null, <input id="ao-cvc" inputMode="numeric" maxLength={4} value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))} />)}</span>
    </div>
    <div className="hint-l">
      <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
      <span>{tf('Pas de prélèvement récurrent : ton cadeau dure {n} mois, puis s’arrête.', { n: mois })}</span>
    </div>
    <div className="btns mt16">
      <button
        type="button"
        className="btn primary"
        onClick={() => {
          setVu(true)
          if (!Object.values(erreurs).some(Boolean)) (setInconnu(false), setTroisDs(true))
        }}
      >
        <Icone nom="lock" taille={18} />
        <span>{tf('Offrir · payer {m} F · {d}', { m: F(total), d: enDevise })}</span>
      </button>
    </div>
    </>
  )
  return (
    <Ecran route="abonnement-offrir" navigation={navigation} avant={enTete} gabarit={troisDs ? 'centre' : 'web'}>
      <Styles id="02f3dac5cd" />
      <Zone nom="haut">
        <BandeauPrime />
        {!troisDs && (
          <>
            <div className="pg">
              <div className="pg-k">{t('Payer depuis l’étranger')}</div>
              <h1 className="pg-t">{t('Offre un abonnement à un proche')}</h1>
              <p className="pg-s">{t('Il s’utilise au Cameroun, sur son compte BelivaY.')}</p>
            </div>
          </>
        )}
      </Zone>
      {troisDs ? (
        <div className="card or mt12">
          <div className="kick">{t('3-D Secure')}</div>
          <p className="t14 c2">{t('Ta banque vérifie que c’est bien toi.')}</p>
          <div className="kv">
            <span className="k">{t('Paiement à BelivaY · Yaoundé')}</span>
            <span className="v ">
              <b>{enDevise}</b> · {F(total)}&nbsp;F
            </span>
          </div>
          <div className="fld">
            <label htmlFor="ao-3ds">{t('Code reçu par SMS de ta banque')}</label>
            <div className="inp">
              <input id="ao-3ds" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </div>
            {refusCarte && (
              <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                {t(refusCarte)}
              </div>
            )}
          </div>
          <div className="btns">
            <button
              type="button"
              className={'btn primary' + (code.length >= 4 && !envoi ? '' : ' off')}
              onClick={async () => {
                if (code.length < 4 || envoi) return
                setEnvoi(true)
                // Le numéro et le CVC partent au prestataire (tokenisation, CAP-24) ; BelivaY reçoit le jeton.
                let jeton: CarteJeton
                try {
                  jeton = await tokeniser({ numero: n, expire, cvc })
                } catch (e) {
                  setEnvoi(false)
                  return setRefusCarte(messageCarte(e))
                }
                const c: Cadeau = { numero, prenom: prenom.trim(), palier: choix, mois, message: message.trim(), carte: jeton }
                const r = await source.offrirAbonnement(c)
                setEnvoi(false)
                if (r.ok) setFini({ ...c, carte: libelleCarte(jeton), pourCeCompte: r.pourCeCompte, ref: r.ref, le: r.le, du: r.du, au: r.au })
                else (setInconnu(true), setTroisDs(false))
              }}
            >
              <span>{t('Valider')}</span>
            </button>
          </div>
          <div className="btns">
            <button type="button" className="btn secondary" onClick={() => (setTroisDs(false), setCode(''), setRefusCarte(null))}>
              <span>{t('Annuler')}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <Colonne>
            {inconnu && (
              <div className="note red">
                <Icone nom="circle-alert" taille={18} />
                <div>{t('Aucun compte BelivaY avec ce numéro : vérifie-le avec ton proche. Rien n’a été débité.')}</div>
              </div>
            )}
            {champ(
              'numero',
              'Son numéro BelivaY',
              'smartphone',
              <>
                <b className="t15">+237</b>
                <input id="ao-numero" className="grow" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={numero} onChange={(e) => (setNumero(espacer(e.target.value)), setInconnu(false))} />
              </>,
              t('Tu n’as besoin ni de son adresse ni de ses commandes.'),
            )}
            {champ('prenom', 'Ton prénom (il le verra)', 'user', <input id="ao-prenom" className="grow" value={prenom} maxLength={40} onChange={(e) => setPrenom(e.target.value)} />)}
            <div className="fld">
              <label htmlFor="ao-message">{t('Un mot pour lui (facultatif)')}</label>
              <div className={'inp area' + (vu && erreurs.message ? ' err' : '')}>
                <textarea id="ao-message" rows={2} maxLength={MESSAGE_MAX} value={message} placeholder={t('Ex. : Joyeux anniversaire, profite bien !')} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <div className="hint">{tf('Il le lit dans son application. {n} caractères restants.', { n: MESSAGE_MAX - message.length })}</div>
            </div>
            <div className="sec">
              <h2>{t('Durée')}</h2>
            </div>
            <div className="seg" role="radiogroup" aria-label={t('Durée')}>
              {DUREES_CADEAU.map((x) => (
                <a key={x} href="#" role="radio" aria-checked={mois === x} className={mois === x ? 'on' : ''} onClick={(e) => (e.preventDefault(), setMois(x))}>
                  {nomDuree(x)}
                </a>
              ))}
            </div>
            <div className="hint-l">
              <Icone nom="calendar" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t(mois === 12 ? '1 an au tarif annuel : 10 mois payés pour 12.' : 'Au tarif mensuel, payé en une fois.')}</span>
            </div>
            <div className="sec">
              <h2>{t('Palier')}</h2>
            </div>
            {(['plus', 'prime', 'duo'] as const).map((id) => {
              const x = palier(id)!
              return (
                <a key={id} href="#" role="radio" aria-checked={choix === id} className={'radio' + (choix === id ? ' on' : '')} onClick={(e) => (e.preventDefault(), setChoix(id))}>
                  <span className="rd"></span>
                  <span className="grow">
                    <span className="rt" style={{ display: 'block' }}>
                      {tf('{p} · {m} F', { p: t(id === 'prime' ? 'Prime ★' : x.nom), m: F(prixCadeau(x, mois)) })}
                    </span>
                    <span className="rs" style={{ display: 'block' }}>
                      {id === 'plus'
                        ? tf('{n} livraisons en relais offertes par mois dès {m} F, +{g} jours de garde', { n: x.relais.offerts ?? 0, m: F(x.relais.des), g: x.gardeBonus })
                        : id === 'prime'
                          ? tf('Relais offert dès {m} F, cagnotte {c} %, +{g} jours de garde', { m: F(x.relais.des), c: x.cagnotte * 100, g: x.gardeBonus })
                          : tf('Prime pour {n} comptes', { n: x.comptes })}
                    </span>
                  </span>
                </a>
              )
            })}
            {!tabL && paiement}
          </Colonne>
          {tabL && <Aside titre="Récapitulatif">{paiement}</Aside>}
        </>
      )}
      <Zone nom="bas">
        <PiedWeb />
      </Zone>
    </Ecran>
  )
}
