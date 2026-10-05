// Écran « Payer le panier famille » (CL-15 ; EX-05), forme d'origine du prototype rendue réelle (DP-54) : le panier
// (?panier=…) offert à la personne liée, au relais choisi ; la devise de paiement depuis l'étranger (euro à taux fixe,
// dollar au taux du jour), le récapitulatif (articles, retrait, remise d'un colis L, 2 % de frais de carte, total ≈
// en devise) ; le paiement express (Apple Pay, Google Pay), ou la carte bancaire (Visa, Mastercard ; 3-D Secure de
// la banque, en feuille) ; chaque mois au jour choisi ou une seule fois ; l'e-mail de la preuve ; remboursement sur
// la carte ; 150 000 F au plus par paiement.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { jetonExpress, messageCarte, tokeniser } from '../../connecteurs/paiementCarte'
import { calculFamille, FAMILLE } from '../../donnees/famille'
import { source } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { EURO, PLAFOND_CARTE } from '../CL-12/Diaspora'
import { expireValide, grouper, luhn, marque } from '../CL-13/MoyensAutres'
import { VideFamille, useFamille } from './Commun'
import { EtapesFamille, FfFamille, kg } from './Famille'

const DOLLAR = 603.5

export function FamillePayer() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d] = useFamille()
  // Dès 1024 px : e-mail et carte à gauche ; devise, récapitulatif, remboursement et « Payer » à droite (§ 5.13).
  const grand = useDes('tab-l')
  const [devise, setDevise] = useState<'EUR' | 'USD'>('EUR')
  const [mensuel, setMensuel] = useState(true)
  const [jour, setJour] = useState(21)
  const [email, setEmail] = useState('')
  const [carte, setCarte] = useState('')
  const [expire, setExpire] = useState('')
  const [cvc, setCvc] = useState('')
  const [vu, setVu] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [refusCarte, setRefusCarte] = useState<string | null>(null)
  const xp = params.get('xp')
  const fait = useRef(false)
  const p = d?.paniers.find((x) => x.id === params.get('panier'))
  // Retour de la feuille de paiement express acceptée : le panier est payé avec ce qui a été enregistré avant.
  useEffect(() => {
    if (!p || (xp !== 'apple' && xp !== 'google') || fait.current) return
    fait.current = true
    jetonExpress(xp)
      .then((carte) => source.payerPanierFamille(p.id, { carte, email: p.email, mensuel: p.mensuel, jour: p.jour }))
      .then(() => naviguer(chemin('famille-mensuel', { panier: p.id }), { replace: true }))
  }, [p, xp, naviguer])
  if (!d) return null
  if (!p || !p.destinataire)
    return (
      <Ecran route="famille-payer">
        <Styles id="ddcb0e469a" />
        <VideFamille panier={p?.id ?? null} icone="credit-card" titre="Choisis d’abord qui retire le panier" />
      </Ecran>
    )
  const c = calculFamille(d.articles, p.articles)
  const frais = Math.round(c.total * FAMILLE.fraisCarte)
  const total = c.total + frais
  const enDevise = devise === 'EUR' ? (total / EURO).toFixed(2).replace('.', ',') + ' €' : '$' + (total / DOLLAR).toFixed(2)
  const n = carte.replace(/\D/g, '')
  const erreurs = {
    email: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ? 'Indique une adresse e-mail valide.' : null,
    carte: !marque(n) ? 'Visa ou Mastercard seulement : vérifie les premiers chiffres.' : !luhn(n) ? 'Ce numéro de carte semble mal tapé.' : null,
    expire: !expireValide(expire) ? 'Date d’expiration invalide (MM/AA).' : null,
    cvc: !/^\d{3,4}$/.test(cvc) ? 'Le code au dos de la carte : 3 chiffres.' : null,
  }
  const trop = total > PLAFOND_CARTE
  const prenom = p.destinataire.prenom.split(' ')[0]
  const champ = (k: keyof typeof erreurs, label: string, input: ReactNode) => (
    <div className="fld">
      <label htmlFor={'fp-' + k}>{t(label)}</label>
      <div className={'inp' + (vu && erreurs[k] ? ' err' : '')}>{input}</div>
      {vu && erreurs[k] && (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t(erreurs[k]!)}
        </div>
      )}
    </div>
  )
  // Paiement express : l'e-mail de la preuve et le rythme sont enregistrés avant la feuille du téléphone.
  const express = async (m: 'apple' | 'google') => {
    setVu(true)
    if (trop || erreurs.email) return
    await source.enregistrerPanierFamille({ id: p.id, email: email.trim(), mensuel, jour })
    naviguer(chemin('xp-pay', { m, t: String(total), back: chemin('famille-payer', { panier: p.id }), ok: chemin('famille-payer', { panier: p.id, xp: m }) }))
  }
  const carteSaisie = marque(n) && luhn(n) ? `${marque(n)} ···· ${n.slice(-4)}` : null
  const feuille3ds =
    code !== null ? (
      <Feuille ouverte fermer={() => setCode(null)} titre={t('3-D Secure · ta banque')}>
        <div className="row">
          <span className="ic-sq">
            <Icone nom="shield-check" taille={22} />
          </span>
          <div className="grow">
            <h3 className="cl15-sht">{t('3-D Secure · ta banque')}</h3>
            <div className="t13 c3 mt4">{tf('Paiement de {m} à BelivaY', { m: enDevise })}</div>
          </div>
        </div>
        <p className="t14" style={{ margin: '12px 0 0', lineHeight: '1.45' }}>
          {t('Saisis le code que ta banque vient de t’envoyer.')}
        </p>
        <label className="otp" style={{ position: 'relative', display: 'flex' }}>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={i < code.length ? 'f' : i === code.length ? 'cur' : ''}>
              {code[i] ?? ''}
            </span>
          ))}
          <input
            aria-label={t('Code reçu par SMS de ta banque')}
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%' }}
          />
        </label>
        {refusCarte && (
          <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
            {t(refusCarte)}
          </div>
        )}
        <div className="btns">
          <button
            type="button"
            className={'btn primary' + (code.length >= 4 ? '' : ' off')}
            onClick={async () => {
              if (code.length < 4) return
              // Le numéro et le CVC partent au prestataire (tokenisation, CAP-24) ; BelivaY reçoit le jeton.
              let carte
              try {
                carte = await tokeniser({ numero: n, expire, cvc })
              } catch (e) {
                return setRefusCarte(messageCarte(e))
              }
              await source.payerPanierFamille(p.id, { carte, email: email.trim(), mensuel, jour })
              naviguer(chemin('famille-mensuel', { panier: p.id }), { replace: true })
            }}
          >
            <span>{t('Valider')}</span>
          </button>
        </div>
        <div className="hint-l">
          <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Écran de ta banque : BelivaY ne voit jamais ce code.')}</span>
        </div>
      </Feuille>
    ) : null
  const recap1 = (
    <>
    <div>
      <Styles id="10d630a833" />
      <div className="dev-seg" role="radiogroup" aria-label={t('Devise du paiement')}>
        <span className="lb">{t('Tu paies depuis l’étranger en')}</span>
        <span className="ch">
          {(['EUR', 'USD'] as const).map((x) => (
            <a key={x} href={chemin('famille-payer', { panier: p.id })} role="radio" aria-checked={devise === x} className={devise === x ? 'on' : ''} onClick={(e) => (e.preventDefault(), setDevise(x))}>
              <b>{x === 'EUR' ? '€' : '$'}</b>
              {t(x === 'EUR' ? 'Euro' : 'Dollar US')}
            </a>
          ))}
        </span>
        <span className="rt">{devise === 'EUR' ? t('1 € = 655,957 F · taux fixe') : tf('1 $ = {x} F · taux du jour, figé au paiement', { x: String(DOLLAR).replace('.', ',') })}</span>
      </div>
    </div>
    <div className="card cl15-sum">
      <div className="cl15-r">
        <span className="lb">{t('Colis')}</span>
        <span className="v">{tf('{p} kg · 1 colis {c}', { p: kg(c.poids), c: c.classe })}</span>
      </div>
      <div className="cl15-r">
        <span className="lb">{tf('Articles · {n}', { n: c.lignes.reduce((a, x) => a + x.qte, 0) })}</span>
        <span className="v">{F(c.sousTotal)}&nbsp;F</span>
      </div>
      <div className="cl15-r">
        <span className="lb">{t('Retrait au relais')}</span>
        <span className="v">
          {c.offert ? (
            <>
              <s>{F(c.montantOffert)}&nbsp;F</s>
              <span className="free">{t('offert')}</span>
            </>
          ) : (
            <>{F(c.livraison)}&nbsp;F</>
          )}
        </span>
      </div>
      {c.supplement > 0 && (
        <div className="cl15-r">
          <span className="lb">{tf('Remise du colis {c}, non couverte', { c: c.classe })}</span>
          <span className="v">{F(c.supplement)}&nbsp;F</span>
        </div>
      )}
      <div className="cl15-r">
        <span className="lb">{t('Frais de service carte (2 %)')}</span>
        <span className="v">{F(frais)}&nbsp;F</span>
      </div>
      <div className="cl15-tot">
        <span className="l">{t('Total')}</span>
        <span className="rt">
          <span className="price">
            {F(total)}
            <small>{t(' F')}</small>
          </span>
          <small className="eur">≈ {enDevise}</small>
        </span>
      </div>
    </div>
    {trop && (
      <div className="note amber">
        <Icone nom="triangle-alert" taille={18} />
        <div>{t('150 000 F au plus par paiement par carte : retire des articles ou fais deux paniers.')}</div>
      </div>
    )}
    </>
  )
  const recap2 = (
    <>
    <div className="card green cl15-box">
      <span className="bi">
        <Icone nom="undo-2" taille={20} />
      </span>
      <div className="grow">
        <b className="bt">{tf('Tu seras remboursé, pas {p}', { p: prenom })}</b>
        <p>{t('Tout remboursement revient sur cette carte.')}</p>
      </div>
    </div>
    <div className="btns">
      <button
        type="button"
        className={'btn primary' + (trop || code !== null ? ' off' : '')}
        onClick={() => {
          setVu(true)
          if (!trop && !Object.values(erreurs).some(Boolean)) setCode('')
        }}
      >
        <Icone nom="lock" taille={18} />
        <span>{tf('Payer {m} F · {d}', { m: F(total), d: enDevise })}</span>
      </button>
    </div>
    <div className="hint-l">
      <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
      <span>{t('Rien n’est débité avant la validation de ta banque. Ton argent reste bloqué chez BelivaY jusqu’au retrait.')}</span>
    </div>
    <div className="cl15-fine">{t('150 000 F au plus par paiement ; au-delà, le panier est payé en plusieurs commandes.')}</div>
    </>
  )
  return (
    <Ecran gabarit="colonnes" route="famille-payer" fixes={feuille3ds}>
      <Colonne>
      <Styles id="ddcb0e469a" />
      <EtapesFamille n={2} />
      <FfFamille />
      <div className="pg">
        <h1 className="pg-t">{tf('Tu offres « {n} » à {p}', { n: t(p.nom), p: p.destinataire.prenom })}</h1>
        <p className="pg-s">{tf('Le panier ira au {r}.', { r: t(p.destinataire.relais) })}</p>
      </div>
      {!grand && recap1}
      {champ('email', 'Ton e-mail, pour la preuve de retrait', <input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />)}
      <Styles id="b472efbe3c" />
      <div className="xp-k">
        <Icone nom="zap" taille={14} />
        {t('Paiement express')}
      </div>
      <div className="xp-row">
        <a href={chemin('famille-payer', { panier: p.id })} className="xp-b apple" aria-label={t('Payer avec Apple Pay')} onClick={(e) => (e.preventDefault(), express('apple'))}>
          <Icone nom="apple" taille={20} />
          <span>{t('Pay')}</span>
        </a>
        <a href={chemin('famille-payer', { panier: p.id })} className="xp-b gpay" aria-label={t('Payer avec Google Pay')} onClick={(e) => (e.preventDefault(), express('google'))}>
          <Icone nom="gpay-g" taille={20} />
          <span>{t('Pay')}</span>
        </a>
      </div>
      <p className="xp-note">{t('Ta carte enregistrée dans le téléphone, validée par Face ID ou ton empreinte. Même frais que la carte (2 %).')}</p>
      <div className="xp-or">{t('ou par carte bancaire')}</div>
      <div className="card tight cl15-cb">
        <div className="cl15-k">{t('Carte bancaire')}</div>
        <div className="li">
          <span className="ic or">
            <Icone nom="credit-card" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {carteSaisie ?? t('Visa ou Mastercard')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('3-D Secure : ta banque te demande de confirmer')}
            </span>
          </span>
        </div>
        <div style={{ padding: '0 14px 2px' }}>
          {champ('carte', 'Numéro de carte', <input id="fp-carte" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={carte} onChange={(e) => setCarte(grouper(e.target.value))} />)}
          <div className="row" style={{ gap: 10 }}>
            <span className="grow">{champ('expire', 'Expiration', <input id="fp-expire" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={expire} onChange={(e) => setExpire(e.target.value.replace(/[^\d/]/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5))} />)}</span>
            <span className="grow">{champ('cvc', 'Code (CVC)', <input id="fp-cvc" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))} />)}</span>
          </div>
        </div>
      </div>
      <div className={'card' + (mensuel ? ' or' : '')}>
        <div className="row">
          <div className="grow">
            <div className="t15 b8">{mensuel ? tf('Chaque mois, le {j}', { j: jour }) : t('Une seule fois')}</div>
            <div className="t13 c3 mt4">{t('Annoncé 3 jours avant, avec le prix du jour. Suspensible en un geste.')}</div>
          </div>
          <button type="button" className={'tg' + (mensuel ? ' on' : '')} role="switch" aria-checked={mensuel} aria-label={t('Chaque mois')} onClick={() => setMensuel(!mensuel)}></button>
        </div>
        {mensuel && (
          <div className="chips mt8" role="radiogroup" aria-label={t('Jour du débit')}>
            {[1, 5, 10, 15, 21, 25, 28].map((j) => (
              <a key={j} href={chemin('famille-payer', { panier: p.id })} role="radio" aria-checked={jour === j} className={'chip' + (jour === j ? ' on' : '')} onClick={(e) => (e.preventDefault(), setJour(j))}>
                {tf('le {j}', { j })}
              </a>
            ))}
          </div>
        )}
      </div>
      {!grand && recap2}
      <div className="links cl15-lk">
        <Link to={chemin('legal-doc', { d: 'diaspora' })}>{t('Conditions des comptes diaspora')}</Link>
        <Link to={chemin('famille-destinataire', { panier: p.id })}>{t('Changer qui retire')}</Link>
      </div>
      </Colonne>
      {grand && (
        <Aside titre="Récapitulatif">
          {recap1}
          {recap2}
        </Aside>
      )}
    </Ecran>
  )
}
