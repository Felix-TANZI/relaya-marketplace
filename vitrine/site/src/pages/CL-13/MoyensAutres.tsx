// Moyens de paiement autres que Mobile Money (DP-54) : carte Visa ou Mastercard (DP-23), Portefeuille BelivaY
// (DP-06), paiement au comptoir (plafonds du palier, CCO-02), un proche à l'étranger qui paie (payeur).
// Pour le client : carte expirée ou qui expire bientôt signalée, règles de la carte dans sa feuille (frais, plafond,
// 3-D Secure, remboursement), règles du Portefeuille lues dans les données, palier suivant du comptoir.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Montant } from '../../composants/Profil'
import { Bouton } from '../../composants/socle'
import { chemin } from '../../config/pages'
import { messageCarte, tokeniser } from '../../connecteurs/paiementCarte'
import { source, type Carte, type DonneesPortefeuille } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'

// Marque reconnue aux premiers chiffres ; contrôle de Luhn (numéro mal tapé).
export const marque = (n: string): Carte['marque'] | null => (/^4/.test(n) ? 'Visa' : /^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n) ? 'Mastercard' : null)
export function luhn(n: string): boolean {
  let s = 0
  for (let i = 0; i < n.length; i++) {
    let c = Number(n[n.length - 1 - i])
    if (i % 2) c = c * 2 > 9 ? c * 2 - 9 : c * 2
    s += c
  }
  return n.length >= 13 && s % 10 === 0
}
export const grouper = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')
export function expireValide(v: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(v)
  if (!m || +m[1] < 1 || +m[1] > 12) return false
  const fin = new Date(2000 + +m[2], +m[1], 1)
  return fin.getTime() > Date.now()
}
// État d'une carte enregistrée : valable jusqu'à la fin du mois écrit dessus.
export function etatCarte(exp: string, maintenant = Date.now()): 'ok' | 'bientot' | 'expiree' {
  const m = /^(\d{2})\/(\d{2})$/.exec(exp)
  if (!m) return 'ok'
  const fin = new Date(2000 + +m[2], +m[1], 1).getTime()
  return fin <= maintenant ? 'expiree' : fin - maintenant < 62 * 24 * 3600 * 1000 ? 'bientot' : 'ok'
}
const CARTE_MAX = 150000 // PAY-CARTE-MAX
const CARTE_FRAIS = 0.02 // PAY-CARTE-FRAIS

function AjoutCarte({ ouverte, fermer, ajoutee }: { ouverte: boolean; fermer: () => void; ajoutee: () => void }) {
  const { t } = usePreferences()
  const [numero, setNumero] = useState('')
  const [expire, setExpire] = useState('')
  const [cvc, setCvc] = useState('')
  const [titulaire, setTitulaire] = useState('')
  const [vu, setVu] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const n = numero.replace(/\D/g, '')
  const m = marque(n)
  const err = {
    numero: !m ? 'Visa ou Mastercard seulement : vérifie les premiers chiffres.' : !luhn(n) ? 'Ce numéro de carte semble mal tapé.' : null,
    expire: !expireValide(expire) ? 'Date d’expiration : MM/AA, pas encore passée.' : null,
    cvc: !/^\d{3,4}$/.test(cvc) ? 'Les 3 chiffres au dos de la carte.' : null,
    titulaire: titulaire.trim().length < 3 ? 'Le nom écrit sur la carte.' : null,
  }
  const vider = () => (setNumero(''), setExpire(''), setCvc(''), setTitulaire(''), setVu(false), setRefus(null))
  const enregistrer = async () => {
    setVu(true)
    if (Object.values(err).some(Boolean)) return
    // Le numéro et le CVC partent au prestataire (tokenisation dans le navigateur, CAP-24) ; BelivaY reçoit le jeton.
    let carte
    try {
      carte = await tokeniser({ numero: n, expire, cvc })
    } catch (e) {
      return setRefus(messageCarte(e))
    }
    const r = await source.ajouterCarte({ carte, titulaire })
    if (!r.ok) return setRefus('Cette carte est déjà enregistrée.')
    vider()
    ajoutee()
  }
  const champ = (id: string, label: string, e: string | null, input: React.ReactNode) => (
    <div className="fld">
      <label htmlFor={id}>{t(label)}</label>
      <div className={'inp' + (vu && e ? ' err' : '')}>{input}</div>
      {vu && e && (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t(e)}
        </div>
      )}
    </div>
  )
  return (
    <Feuille ouverte={ouverte} fermer={() => (vider(), fermer())} titre={t('Ajouter une carte')}>
      <h3 className="t17 b8" style={{ margin: '0' }}>
        {t('Ajouter une carte')}
      </h3>
      <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
        {t('Visa ou Mastercard. Ta banque confirme chaque paiement (3-D Secure).')}
      </p>
      {champ(
        'cb-numero',
        'Numéro de la carte',
        err.numero,
        <>
          <Icone nom="credit-card" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <input id="cb-numero" inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" value={numero} onChange={(e) => setNumero(grouper(e.target.value))} />
          {m && <span className="suf"><span className="pill ink sm">{m}</span></span>}
        </>,
      )}
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div className="grow">
          {champ(
            'cb-exp',
            'Expire fin',
            err.expire,
            <input
              id="cb-exp"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder={t('MM/AA')}
              value={expire}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '').slice(0, 4)
                setExpire(d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d)
              }}
            />,
          )}
        </div>
        <div className="grow">
          {champ('cb-cvc', 'Code au dos', err.cvc, <input id="cb-cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} />)}
        </div>
      </div>
      {champ('cb-nom', 'Nom sur la carte', err.titulaire, <input id="cb-nom" autoComplete="cc-name" value={titulaire} onChange={(e) => setTitulaire(e.target.value.toUpperCase())} />)}
      {refus && (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t(refus)}
        </div>
      )}
      <div className="note ink">
        <Icone nom="lock" taille={18} />
        <div>{t('Le numéro complet reste chez le prestataire de paiement : BelivaY garde seulement la marque et les 4 derniers chiffres. Le code au dos n’est jamais gardé.')}</div>
      </div>
      <div className="btns">
        <button type="button" className="btn primary" onClick={enregistrer}>
          <Icone nom="check" taille={18} />
          <span>{t('Enregistrer la carte')}</span>
        </button>
      </div>
    </Feuille>
  )
}

// Les feuilles passent par les éléments fixes de l'écran (Ecran fixes) : elles se posent par-dessus.
export function useMoyensAutres() {
  const { t, tf } = usePreferences()
  const [cartes, setCartes] = useState<Carte[]>([])
  const [solde, setSolde] = useState<number | null>(null)
  const [comptoir, setComptoir] = useState<number | null>(null)
  const [suivant, setSuivant] = useState<{ comptoir: number; commandes: number } | null>(null)
  const [regles, setRegles] = useState<DonneesPortefeuille['regles'] | null>(null)
  const [ajout, setAjout] = useState(false)
  const [choisie, setChoisie] = useState<Carte | null>(null)
  const [retraitCarte, setRetraitCarte] = useState(false)
  const charger = () => {
    source.cartes().then(setCartes)
    source.compte().then((c) => (setSolde(c.portefeuille.solde), setComptoir(c.palier.comptoir), setSuivant(c.palier.suivant)))
    source.portefeuille().then((p) => setRegles(p.regles))
  }
  useEffect(charger, [])
  const corps = (
    <>
      <div className="card vedette">
        <div className="cl13-kh">
          <span className="kick">{t('Carte bancaire')}</span>
        </div>
        {cartes.map((c) => (
          <div key={c.id} className="cl13-pm" role="button" tabIndex={0} style={{ padding: '8px 0', cursor: 'pointer' }} onClick={() => setChoisie(c)} onKeyDown={(e) => e.key === 'Enter' && setChoisie(c)}>
            <span className="cl13-op" style={{ background: c.marque === 'Visa' ? '#1a1f71' : '#eb001b', color: '#fff' }}>
              {c.marque === 'Visa' ? 'VISA' : 'MC'}
            </span>
            <span className="num">
              <b style={{ display: 'block', color: 'var(--ink)' }}>
                {c.marque} ·••• {c.derniers}
              </b>
              <span className="sub" style={{ display: 'block', marginTop: '2px' }}>
                {tf('Expire fin {e} · {n}', { e: c.expire, n: c.titulaire })}
              </span>
              {etatCarte(c.expire) !== 'ok' && (
                <span className={'pill sm ' + (etatCarte(c.expire) === 'expiree' ? 'red' : 'amber')} style={{ marginTop: 4 }}>
                  {t(etatCarte(c.expire) === 'expiree' ? 'Expirée : ajoute ta nouvelle carte' : 'Expire bientôt')}
                </span>
              )}
            </span>
            {c.parDefaut && <span className="def">{t('par défaut')}</span>}
          </div>
        ))}
        {!cartes.length && <p className="t13 c3" style={{ margin: '6px 0 0' }}>{t('Aucune carte. Utile pour une grosse commande, ou si ton Mobile Money est vide.')}</p>}
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Frais de service de 2 %, affichés avant de payer · {m} F au plus par paiement · jamais pour une commande payée au comptoir.', { m: F(CARTE_MAX) })}</span>
        </div>
        <div className="btns">
          <button type="button" className="btn secondary sm" style={{ width: 'auto' }} onClick={() => setAjout(true)}>
            <Icone nom="plus" taille={18} />
            <span>{t('Ajouter une carte')}</span>
          </button>
        </div>
      </div>

      <div className="card vedette">
        <div className="cl13-kh">
          <span className="kick">{t('Portefeuille BelivaY')}</span>
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <span className="grow">
            <b className="t17 b8" style={{ display: 'block' }}>
              {solde === null ? '…' : <Montant solde>{F(solde) + '\u00A0F'}</Montant>}
            </b>
            <span className="t13 c3">{t('Paie tout ou une partie d’une commande. Tes remboursements y arrivent.')}</span>
            {regles && (
              <span className="t13 c3" style={{ display: 'block', marginTop: 2 }}>
                {tf('Recharge sans frais dès {r} F · {p} F au plus sur le Portefeuille · retrait vers Mobile Money dès {m} F.', { r: F(regles.rechargeMin), p: F(regles.plafond), m: F(regles.retraitMin) })}
              </span>
            )}
          </span>
          <Link to={chemin('wallet')} className="btn ghost sm" style={{ width: 'auto' }}>
            <span>{t('Ouvrir')}</span>
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="cl13-kh">
          <span className="kick">{t('Payer au retrait, au comptoir')}</span>
        </div>
        <p className="t13 c2" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
          {comptoir !== null && tf('Tu paies la livraison d’avance, puis le reste en Mobile Money au relais. Ton plafond : {m} F par commande.', { m: F(comptoir) })}
        </p>
        {suivant && <p className="t13 c3" style={{ margin: '4px 0 0', lineHeight: '1.45' }}>{tf('Ton plafond passe à {m} F après {n} commandes retirées sans incident.', { m: F(suivant.comptoir), n: suivant.commandes })}</p>}
        <p className="t13 c3" style={{ margin: '4px 0 0', lineHeight: '1.45' }}>{t('Jamais en espèces. Pas pour une livraison à domicile, ni avec une carte.')}</p>
        <div className="links" style={{ justifyContent: 'flex-start' }}>
          <Link to={chemin('legal-doc', { d: 'comptoir' })}>{t('Plafonds et règles')}</Link>
        </div>
      </div>
    </>
  )
  const feuilles = (
    <>
      <AjoutCarte ouverte={ajout} fermer={() => setAjout(false)} ajoutee={() => (setAjout(false), charger())} />
      <Feuille ouverte={!!choisie} fermer={() => (setRetraitCarte(false), setChoisie(null))} titre={t('Cette carte')}>
        {choisie && (
          <>
            <h3 className="t17 b8" style={{ margin: '0' }}>
              {choisie.marque} ·••• {choisie.derniers}
            </h3>
            <p className="t13 c3" style={{ margin: '6px 0 0' }}>{tf('Expire fin {e} · {n}', { e: choisie.expire, n: choisie.titulaire })}</p>
            {etatCarte(choisie.expire) === 'expiree' && <p className="t13" style={{ margin: '6px 0 0', color: 'var(--red)' }}>{t('Cette carte est expirée : elle ne peut plus payer. Retire-la et ajoute ta nouvelle carte.')}</p>}
            <div className="mt10">
              <div className="kv">
                <span className="k">{t('Frais de service')}</span>
                <span className="v">{tf('2 % · {f} F sur {m} F', { f: F(Math.round(10000 * CARTE_FRAIS)), m: F(10000) })}</span>
              </div>
              <div className="kv">
                <span className="k">{t('Par paiement')}</span>
                <span className="v">{tf('{m} F au plus', { m: F(CARTE_MAX) })}</span>
              </div>
              <div className="kv">
                <span className="k">{t('Sécurité')}</span>
                <span className="v">{t('3-D Secure, confirmé par ta banque')}</span>
              </div>
            </div>
            {!choisie.parDefaut && etatCarte(choisie.expire) !== 'expiree' && (
              <div className="mt16">
                <Bouton icone="check" onClick={() => source.carteParDefaut(choisie.id).then(() => (setChoisie(null), charger()))}>
                  {t('Utiliser par défaut')}
                </Bouton>
              </div>
            )}
            <div className="mt10">
              {retraitCarte ? (
                <>
                  <p className="t13 b7" style={{ margin: '0 0 8px' }}>{tf('Retirer la carte ·••• {d} ?', { d: choisie.derniers })}</p>
                  <Bouton genre="danger" icone="trash-2" onClick={() => source.retirerCarte(choisie.id).then(() => (setRetraitCarte(false), setChoisie(null), charger()))}>
                    {t('Oui, retirer')}
                  </Bouton>
                  <div className="links">
                    <a href="#" onClick={(e) => (e.preventDefault(), setRetraitCarte(false))}>
                      {t('Garder cette carte')}
                    </a>
                  </div>
                </>
              ) : (
                <Bouton genre="danger" icone="trash-2" onClick={() => setRetraitCarte(true)}>
                  {t('Retirer cette carte')}
                </Bouton>
              )}
            </div>
            <p className="t13 c3">{t('Les commandes déjà payées avec elle ne changent pas : leur remboursement revient quand même sur cette carte.')}</p>
          </>
        )}
      </Feuille>
    </>
  )
  return { corps, feuilles, plafondPortefeuille: regles?.plafond ?? null }
}
