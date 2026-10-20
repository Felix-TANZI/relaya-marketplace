// Écran « Participer » (CL-15 ; EX-02), forme d'origine du prototype rendue réelle (DP-54) : la page web qu'ouvre un
// proche par le lien (?c=code), sans compte : l'organisateur, le bénéficiaire, le cadeau, ce qui est réuni (barre),
// ce qui manque, les participants (les discrets restent cachés), la date limite ; le montant (1 000, 2 000, 5 000 F,
// compléter, ou autre : dès 1 000 F, au plus ce qui manque), le prénom, discret (et ce que verront les autres), un
// mot ; payer avec Mobile Money sans frais (numéro) ou carte Visa / Mastercard (+ 2 %, contrôlée, 3-D Secure),
// paiement express Apple Pay / Google Pay, devise de qui paie depuis l'étranger (euro à taux fixe, dollar US),
// détail du débit ; validation, merci, objectif atteint ; l'argent reste bloqué chez BelivaY.
// Échanges (DP-54) : la jauge se remplit ; coche et confettis au merci ; qui paie la livraison ; la liste d'envies
// d'où vient la cotisation. Depuis une liste vue de l'étranger (?devise=EUR|USD, DP-54) : la carte et la devise
// sont choisies d'avance.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import img_be926f70d2b8_png from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne, Zone } from '../../composants/Gabarits'
import { PiedWeb } from '../../composants/PiedWeb'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { jetonExpress, messageCarte, tokeniser } from '../../connecteurs/paiementCarte'
import { chiffres, erreurNumero, espacer, masquer, nomMoMo, operateur } from '../../donnees/numeros'
import { source, type CarteJeton, type Cotisation } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { EURO } from '../CL-12/Diaspora'
import { expireValide, grouper, luhn, marque } from '../CL-13/MoyensAutres'
import { reuni } from './Commun'

const DOLLAR = 603.5 // taux du jour du prestataire (démonstration), figé au paiement

export function CotisationParticiper() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const code = params.get('c') ?? '7KQ2M'
  const [c, setC] = useState<Cotisation | null | undefined>(undefined)
  const [montant, setMontant] = useState(0)
  const [discret, setDiscret] = useState(false)
  const [mot, setMot] = useState('')
  const [prenom, setPrenom] = useState('')
  const deviseLien = params.get('devise')
  const [moyen, setMoyen] = useState<'momo' | 'carte'>(deviseLien === 'EUR' || deviseLien === 'USD' ? 'carte' : 'momo')
  const [express, setExpress] = useState<'apple' | 'google' | null>(null)
  const [devise, setDevise] = useState<'EUR' | 'USD'>(deviseLien === 'USD' ? 'USD' : 'EUR')
  const [numero, setNumero] = useState('')
  const [carte, setCarte] = useState('')
  const [expire, setExpire] = useState('')
  const [cvc, setCvc] = useState('')
  const [vu, setVu] = useState(false)
  const [valider, setValider] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [merci, setMerci] = useState<Cotisation | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const tabL = useDes('tab-l')
  useEffect(() => {
    // « Compléter » choisi d'avance, comme dans le prototype.
    source.cotisationPublique(code).then((x) => (setC(x), x && setMontant((m) => m || Math.max(0, x.objectif - reuni(x)))))
  }, [code, merci])
  if (c === undefined) return null
  const vers = chemin('cotisation-participer', { c: code })
  const barre = (
    <>
      <Styles id="ddcb0e469a" />
      <div className="cl15-web">
        <img src={img_be926f70d2b8_png} alt="BelivaY" />
        <span className="u">
          <Icone nom="lock" taille={13} />
          {location.host + vers}
        </span>
      </div>
      {!INTERRUPTEURS_DU_LANCEMENT['FF-EX02'] && (
        <div className="cl15-ff">
          <span className="cl15-pill">
            <Icone nom="lock" taille={13} />
            {t('Après le lancement · interrupteur fermé')}
          </span>
          <span className="cl15-ex">{t('EX-02')}</span>
        </div>
      )}
    </>
  )
  if (!c)
    return (
      <Ecran route="cotisation-participer">
        {barre}
        <div className="card mt12">
          <div className="empty">
            <div className="ei">
              <Icone nom="link" taille={26} />
            </div>
            <h3>{t('Cette cotisation n’existe pas')}</h3>
            <p>{t('Vérifie le lien avec la personne qui te l’a envoyé.')}</p>
          </div>
        </div>
      </Ecran>
    )
  const r = reuni(c)
  const manque = Math.max(0, c.objectif - r)
  const plancher = Math.min(1000, manque)
  const nommes = c.participations.filter((x) => !x.discret).map((x) => x.prenom)
  const discrets = c.participations.filter((x) => x.discret).length
  const n = carte.replace(/\D/g, '')
  const parCarte = moyen === 'carte' || !!express
  const frais = parCarte ? Math.round(montant * 0.02) : 0
  const debite = montant + frais
  const enDevise = devise === 'EUR' ? '≈ ' + (debite / EURO).toFixed(2).replace('.', ',') + ' €' : '≈ $' + (debite / DOLLAR).toFixed(2)
  const erreurs = {
    montant: montant < plancher || montant > manque ? tf('Entre {a} F et {b} F.', { a: F(plancher), b: F(manque) }) : null,
    prenom: prenom.trim().length < 2 ? t('Indique ton prénom.') : null,
    numero: moyen === 'momo' && !express ? erreurNumero(numero) : null,
    carte: moyen === 'carte' && !express ? (!marque(n) ? t('Visa ou Mastercard seulement : vérifie les premiers chiffres.') : !luhn(n) ? t('Ce numéro de carte semble mal tapé.') : null) : null,
    expire: moyen === 'carte' && !express && !expireValide(expire) ? t('Date d’expiration invalide (MM/AA).') : null,
    cvc: moyen === 'carte' && !express && !/^\d{3,4}$/.test(cvc) ? t('Le code au dos de la carte : 3 chiffres.') : null,
  }
  const libelle = express ? (express === 'apple' ? 'Apple Pay' : 'Google Pay') : moyen === 'carte' ? `${marque(n)} •••• ${n.slice(-4)}` : `${nomMoMo(operateur(chiffres(numero)))} · ${masquer(chiffres(numero))}`
  const verifier = (exp: 'apple' | 'google' | null) => {
    setVu(true)
    setExpress(exp)
    const bloquants = exp ? [erreurs.montant, erreurs.prenom] : Object.values(erreurs)
    if (!bloquants.some(Boolean)) (setRefus(null), setValider(true))
  }
  const confirmer = async () => {
    if (envoi) return
    setEnvoi(true)
    // Carte : le numéro et le CVC partent au prestataire (tokenisation, CAP-24) ; BelivaY reçoit le jeton.
    let jeton: CarteJeton | null = null
    if (parCarte)
      try {
        jeton = express ? await jetonExpress(express) : await tokeniser({ numero: n, expire, cvc })
      } catch (e) {
        return (setEnvoi(false), setRefus(messageCarte(e)), setValider(false), setExpress(null))
      }
    const x = await source.participer(code, { prenom, montant, discret, mot, moyen: libelle, carte: jeton })
    setEnvoi(false)
    if (x.ok) setMerci(x.cotisation)
    else (setRefus(x.raison === 'fermee' ? 'Cette cotisation est close : rien n’a été débité.' : 'Le montant a changé entre-temps : vérifie ce qui manque.'), setValider(false), setExpress(null))
  }
  const champ = (k: keyof typeof erreurs, label: string, input: ReactNode, aide?: string) => (
    <div className="fld">
      <label htmlFor={'cp-' + k}>{t(label)}</label>
      <div className={'inp' + (vu && erreurs[k] ? ' err' : '')}>{input}</div>
      {vu && erreurs[k] ? (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {erreurs[k]}
        </div>
      ) : aide ? (
        <div className="hint">{t(aide)}</div>
      ) : null}
    </div>
  )
  const participants = nommes.length && discrets
    ? tf('{a} et {b}', { a: nommes.join(', '), b: tf(discrets > 1 ? '{n} participations discrètes' : '{n} participation discrète', { n: discrets }) })
    : nommes.length
      ? nommes.join(', ')
      : tf(discrets > 1 ? '{n} participations discrètes' : '{n} participation discrète', { n: discrets })
  // Dès 1024 px, page web publique (§ 4.7, 5.13) : le cadeau et ce qui est réuni à gauche (7/12) ; la participation
  // et le paiement dans l'aside collant à droite (5/12). Déplacés, jamais dupliqués.
  const participation = merci ? (
    <div className="note green blv-succes" role="status">
      <Icone nom="circle-check" taille={18} />
      <div>{merci.etat === 'atteinte' ? tf('Merci {p} ! L’objectif est atteint : la commande part vers le {r}.', { p: prenom.trim(), r: t(c.relais) }) : tf('Merci {p} ! Ta participation de {m} F est enregistrée. Elle reste bloquée chez BelivaY jusqu’au cadeau.', { p: prenom.trim(), m: F(montant) })}</div>
    </div>
  ) : c.etat !== 'ouverte' ? (
    <div className="note ink">
      <Icone nom="info" taille={18} />
      <div>{t(c.etat === 'echue' || c.etat === 'remboursee' ? 'Cette cotisation est terminée : chacun a été remboursé.' : 'L’objectif est atteint : on ne participe plus.')}</div>
    </div>
  ) : valider ? (
    <div className="card or">
      {express ? (
        <div className="xp-fid">
          <Styles id="b472efbe3c" />
          <Icone nom={express === 'apple' ? 'apple' : 'gpay-g'} taille={30} />
          <b>{tf('{m} F · {o}', { m: F(debite), o: libelle })}</b>
          <span>{t('Confirme avec Face ID ou ton empreinte.')}</span>
        </div>
      ) : moyen === 'momo' ? (
        <div className="cl08-wait">
          <span className="cl08-spin"></span>
          <div className="grow">
            <b>{t('Valide la demande sur ton téléphone')}</b>
            <span className="s">{tf('{m} F · {o}', { m: F(montant), o: libelle })}</span>
          </div>
        </div>
      ) : (
        <p className="t14">{tf('3-D Secure : ta banque confirme le paiement de {m} F.', { m: F(debite) })}</p>
      )}
      <div className="btns">
        <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={confirmer}>
          <span>{t(express ? 'Confirmer' : moyen === 'momo' ? 'J’ai validé sur mon téléphone' : 'Valider')}</span>
        </button>
      </div>
      <div className="btns">
        <button type="button" className="btn secondary" onClick={() => (setValider(false), setExpress(null))}>
          <span>{t('Modifier')}</span>
        </button>
      </div>
    </div>
  ) : (
    <>
      {refus && (
        <div className="note red">
          <Icone nom="circle-alert" taille={18} />
          <div>{t(refus)}</div>
        </div>
      )}
      <div className="sec">
        <h2>{t('Ta participation')}</h2>
      </div>
      <div className="chips">
        {[1000, 2000, 5000]
          .filter((x) => x >= plancher && x < manque)
          .map((x) => (
            <a key={x} href="#" className={'chip' + (montant === x ? ' on' : '')} aria-pressed={montant === x} onClick={(e) => (e.preventDefault(), setMontant(x))}>
              {F(x)} F
            </a>
          ))}
        <a href="#" className={'chip' + (montant === manque ? ' on' : '')} aria-pressed={montant === manque} onClick={(e) => (e.preventDefault(), setMontant(manque))}>
          {t('Compléter')}
        </a>
      </div>
      {champ(
        'montant',
        'Autre montant (F)',
        <input id="cp-montant" className="grow" inputMode="numeric" value={montant || ''} onChange={(e) => setMontant(Number(e.target.value.replace(/\D/g, '')) || 0)} />,
        'Dès 1 000 F, au plus ce qui manque.',
      )}
      {champ('prenom', 'Ton prénom', <input id="cp-prenom" className="grow" value={prenom} maxLength={30} onChange={(e) => setPrenom(e.target.value)} />)}
      <div className={'card' + (discret ? ' or' : ' ')}>
        <div className="row">
          <div className="grow">
            <div className="t15 b8">{t('Participer discrètement')}</div>
            <div className="t13 c3 mt4">{t('Ton nom n’apparaît pas aux autres.')}</div>
          </div>
          <span className="cl15-tga">
            <button type="button" className={'tg' + (discret ? ' on' : '')} role="switch" aria-checked={discret} aria-label={t('Participer discrètement')} onClick={() => setDiscret(!discret)}></button>
          </span>
        </div>
        {discret && (
          <div className="note ink">
            <Icone nom="eye-off" taille={18} />
            <div>{t('Les autres verront « une participation discrète ».')}</div>
          </div>
        )}
      </div>
      <div className="fld">
        <label htmlFor="cp-mot">{tf('Un mot pour {b} (facultatif)', { b: c.beneficiaire })}</label>
        <div className="inp">
          <input id="cp-mot" className="grow" value={mot} maxLength={80} placeholder={tf('Joyeux anniversaire, {b} !', { b: c.beneficiaire })} onChange={(e) => setMot(e.target.value)} />
        </div>
      </div>
      <div className="sec">
        <h2>{t('Payer avec')}</h2>
      </div>
      {(['momo', 'carte'] as const).map((m) => (
        <a key={m} href="#" role="radio" aria-checked={moyen === m} className={'radio' + (moyen === m ? ' on' : '')} onClick={(e) => (e.preventDefault(), setMoyen(m))}>
          <span className="rd"></span>
          <span className="grow">
            <span className="rt" style={{ display: 'block' }}>
              {t(m === 'momo' ? 'Mobile Money' : 'Carte Visa ou Mastercard')}
            </span>
            <span className="rs" style={{ display: 'block' }}>
              {t(m === 'momo' ? 'MTN ou Orange · sans frais' : '2 % de frais · 3-D Secure')}
            </span>
          </span>
        </a>
      ))}
      {moyen === 'momo' ? (
        champ(
          'numero',
          'Ton numéro MTN ou Orange',
          <>
            <b className="t15">+237</b>
            <input id="cp-numero" className="grow" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={numero} onChange={(e) => setNumero(espacer(e.target.value))} />
          </>,
        )
      ) : (
        <>
          <Styles id="b472efbe3c" />
          <div className="xp-k">
            <Icone nom="zap" taille={14} />
            {t('Paiement express')}
          </div>
          <div className="xp-row">
            <a href="#" className="xp-b apple" aria-label={t('Payer avec Apple Pay')} onClick={(e) => (e.preventDefault(), verifier('apple'))}>
              <Icone nom="apple" taille={20} />
              <span>{t('Pay')}</span>
            </a>
            <a href="#" className="xp-b gpay" aria-label={t('Payer avec Google Pay')} onClick={(e) => (e.preventDefault(), verifier('google'))}>
              <Icone nom="gpay-g" taille={20} />
              <span>{t('Pay')}</span>
            </a>
          </div>
          <p className="xp-note">{t('Ta carte enregistrée dans le téléphone, validée par Face ID ou ton empreinte. Même frais que la carte (2 %).')}</p>
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
              <span className="rt">{t(devise === 'EUR' ? '1 € = 655,957 F · taux fixe' : 'Dollar US : taux du jour, figé au paiement.')}</span>
            </div>
          </div>
          {champ('carte', 'Numéro de carte', <input id="cp-carte" className="grow" inputMode="numeric" placeholder="4242 4242 4242 4242" value={carte} onChange={(e) => setCarte(grouper(e.target.value))} />)}
          <div className="row" style={{ gap: 10 }}>
            <span className="grow">{champ('expire', 'Expiration', <input id="cp-expire" className="grow" inputMode="numeric" placeholder="MM/AA" value={expire} onChange={(e) => setExpire(e.target.value.replace(/[^\d/]/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5))} />)}</span>
            <span className="grow">{champ('cvc', 'Code (CVC)', <input id="cp-cvc" className="grow" inputMode="numeric" maxLength={4} value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))} />)}</span>
          </div>
          <div className="card cl15-sum">
            <div className="cl15-r">
              <span className="lb">{t('Ta participation')}</span>
              <span className="v">{F(montant)} F</span>
            </div>
            <div className="cl15-r">
              <span className="lb">{t('Frais de service carte (2 %)')}</span>
              <span className="v">{F(frais)} F</span>
            </div>
            <div className="cl15-tot">
              <span className="l">{t('Débité')}</span>
              <span className="rt">
                <span className="price">
                  {F(debite)}
                  <small>{t(' F')}</small>
                </span>
                <small className="eur">{enDevise}</small>
              </span>
            </div>
          </div>
        </>
      )}
      <div className="btns">
        <button type="button" className="btn primary" onClick={() => verifier(null)}>
          <span>{tf('Participer · {m} F', { m: F(debite) })}</span>
        </button>
      </div>
    </>
  )
  return (
    <Ecran route="cotisation-participer" gabarit="web">
      <Zone nom="haut">
        {barre}
        <div className="pg">
          <div className="pg-k">{t('Invitation')}</div>
          <h1 className="pg-t">{t(c.nom)}</h1>
          <p className="pg-s">{tf('Cotisation organisée par {o}. Le cadeau sera remis au {r}.', { o: c.organisateur, r: t(c.relais) })}</p>
        </div>
      </Zone>
      <Colonne>
        <div className="card ">
          <div className="row">
            <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
              <Dessin id={c.dessin} />
            </span>
            <div className="grow">
              <div className="t15 b8" style={{ lineHeight: '1.3' }}>
                {t(c.titre)}
              </div>
              <div className="t13 c3 mt4">{t('Le cadeau choisi')}</div>
            </div>
          </div>
          <div className="cl15-pb" style={{ marginTop: '14px' }}>
            <b>
              {F(r)}
              <small>{t('F')}</small>
            </b>
            <span>{tf('sur {o} F', { o: F(c.objectif) })}</span>
          </div>
          <div className="bar cl15-bar">
            <i style={{ width: `${Math.min(100, Math.round((r / c.objectif) * 100))}%` }}></i>
          </div>
          <div className="t13 b7 cor mt8">{manque ? tf('Il manque {m} F', { m: F(manque) }) : t('Objectif atteint : merci à tous !')}</div>
          {c.qui === 'destinataire' && <div className="t13 c3 mt6">{tf('Livraison payée par {b} au retrait ({m} F) : elle n’est pas dans l’objectif.', { b: c.beneficiaire, m: F(c.frais ?? 0) })}</div>}
          {c.liste && (
            <div className="links">
              <Link to={chemin('liste-publique', { l: c.liste.code })}>{tf('Voir la liste de {b}', { b: c.beneficiaire })}</Link>
            </div>
          )}
          <div className="t13 c3 mt6">
            {c.participations.length
              ? tf(c.participations.length > 1 ? '{n} participants : {p} · jusqu’au {d}' : '{n} participant : {p} · jusqu’au {d}', { n: c.participations.length, p: participants, d: jourSeul(c.jusqua, langue) })
              : tf('Aucune participation pour l’instant · jusqu’au {d}', { d: jourSeul(c.jusqua, langue) })}
          </div>
        </div>
        {!tabL && participation}
        <div className="card green cl15-box">
          <span className="bi">
            <Icone nom="shield-check" taille={20} />
          </span>
          <div className="grow">
            <b className="bt">{t('L’argent reste bloqué chez BelivaY.')}</b>
            <p>{t('Il sert au cadeau, sinon il te revient sur ton moyen de paiement, sans frais. Jamais en espèces.')}</p>
          </div>
        </div>
      </Colonne>
      {tabL && <Aside titre="Ta participation">{participation}</Aside>}
      <Zone nom="bas">
        <PiedWeb />
      </Zone>
    </Ecran>
  )
}
