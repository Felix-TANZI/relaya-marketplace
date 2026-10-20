// Écran « Constat au comptoir » (CL-11), forme d'origine du prototype rendue réelle (DP-54) : depuis « Un problème » au comptoir
// (?ref=…) : le client choisit le colis, le problème et son souhait ; le gérant constate et photographie le
// déballage ; le dossier s'ouvre aussitôt, le colis reste au relais sans frais de garde, l'argent reste bloqué ;
// les autres colis, en ordre, sont emportés. Ensuite : le constat (gérant du relais, photo du déballage), l'argent
// bloqué, l'échéance du vendeur, la décision de BelivaY (24 h après, DP-35), où ira l'argent, l'article gardé,
// les colis emportés, le suivi et le dossier.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient, type Litige, type ProblemeLitige, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { decisionAvant, useRemboursement } from './Commun'

const PROBLEMES: [ProblemeLitige, string][] = [
  ['abime', 'Abîmé'],
  ['pas-commande', 'Pas ce que j’ai commandé'],
  ['manque', 'Il manque quelque chose'],
  ['autre', 'Autre chose'],
]

export function LitigeComptoir() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-51877'
  const [c, setC] = useState<CommandeClient | null | undefined>(undefined)
  const [l, setL] = useState<Litige | null>(null)
  const [colis, setColis] = useState<number | null>(null)
  const [pb, setPb] = useState<ProblemeLitige | null>(null)
  const [souhait, setSouhait] = useState<'rembourse' | 'remplace'>('rembourse')
  const [detail, setDetail] = useState('')
  const [version, setVersion] = useState(0)
  const [relais, setRelais] = useState<Relais[]>([])
  // Payée par un proche depuis l'étranger : remboursée sur sa carte ; sinon la règle du portefeuille.
  const remb = useRemboursement(c?.payeur ? tf('Carte de {p} · {c}', { p: c.payeur.prenom, c: c.payeur.carte }) : null)
  useEffect(() => {
    source.relaisListe().then((d) => setRelais(d.relais))
  }, [])
  useEffect(() => {
    source.commandeClient(ref).then((d) => setC(d?.commande ?? null))
    source.litiges().then((d) => setL(d.litiges.find((x) => x.ref === ref && x.origine === 'comptoir') ?? null))
  }, [ref, version])
  if (c === undefined) return null
  if (!c) return <CommandeIntrouvable route="litige-comptoir" />

  if (l) {
    const gerant = relais.find((r) => r.nom === l.relais)?.gerant ?? null
    const preuve = l.preuves[0]
    const autres = c.colis.filter((x) => x.n !== l.colis)
    return (
      <Ecran route="litige-comptoir" sousTitre={l.id}>
        <div className="hero night">
          <div className="hk">
            {t('Ouvert au comptoir · ')}
            <span className="nu">{dateA(l.ouvertLe, langue)}</span>
          </div>
          <div className="cl11-num">{l.id}</div>
          <div className="row mt10">
            <span className="portrait" style={{ width: '40px', height: '40px' }}>
              <Dessin id="02814f9138ce" />
            </span>
            <div className="hs grow" style={{ marginTop: '0' }}>
              {gerant ? tf('{g} a constaté le problème et photographié le déballage. ', { g: gerant }) : t('Le gérant a constaté le problème et photographié le déballage. ')}
              <b>{t('Tu n’as rien à remplir.')}</b>
            </div>
          </div>
        </div>
        <div className="cl11-pics">
          <div className="cl11-pic">
            <div className="photo">
              {preuve?.photo ? (
                <img src={preuve.photo} alt={t(preuve.titre)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Dessin id={preuve?.dessin ?? l.dessin} />
              )}
            </div>
            <span>
              <b>{t(l.probleme)}</b>
              {' · '}
              {dateA(l.ouvertLe, langue)}
            </span>
          </div>
          <div className="card flat" style={{ marginTop: '0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
            <span className="t13 c3">{tf('Colis {n}', { n: l.colis })}</span>
            <b className="t14 b8">{t(l.produit)}</b>
            <span className="t13 c2">
              {t('Ton souhait, noté au comptoir\u00A0: ')}
              <b>{t(l.souhait === 'remplace' ? 'un remplacement' : 'un remboursement')}</b>
            </span>
          </div>
        </div>
        {l.description && <p className="t13 c3">{t(l.description)}</p>}
        <div className="note ink cl11-money">
          <Icone nom="lock" taille={18} />
          <div>
            <b>{t('Ton paiement reste bloqué, rien n’est versé au vendeur.')}</b>
            {tf(' {m} F en attente de la décision.', { m: F(l.montant) })}
          </div>
        </div>
        <div className="card">
          <div className="cl11-row">
            <span className="ic-sq or">
              <Icone nom="clock" taille={20} />
            </span>
            <span className="grow">
              <span className="t" style={{ display: 'block' }}>
                {tf('Le vendeur a jusqu’au {d} pour répondre.', { d: dateA(l.echeance, langue) })}
              </span>
              <span className="s" style={{ display: 'block' }}>
                {t('Sans réponse, BelivaY décide, avec la règle en ta faveur.')}
              </span>
            </span>
          </div>
          <div className="cl11-sep"></div>
          <div className="cl11-row">
            <span className="ic-sq ">
              <Icone nom="scale" taille={20} />
            </span>
            <span className="grow">
              <span className="t" style={{ display: 'block' }}>
                {tf('Si besoin, BelivaY décide avant le {d}.', { d: dateA(decisionAvant(l), langue) })}
              </span>
              <span className="s" style={{ display: 'block' }}>
                {t('Toujours avec un motif écrit. Une décision contre toi se conteste une fois, sous 48 h.')}
              </span>
            </span>
          </div>
          {l.souhait === 'rembourse' && (
            <>
              <div className="cl11-sep"></div>
              <div className="cl11-row">
                <span className="ic-sq green">
                  <Icone nom="banknote" taille={20} />
                </span>
                <span className="grow">
                  <span className="t" style={{ display: 'block' }}>
                    {tf('Si ta demande est retenue : {m} F {ou}.', { m: F(l.montant), ou: remb.ou })}
                  </span>
                  <span className="s" style={{ display: 'block' }}>
                    {tf('{q}. Si le vendeur ou le transporteur est en tort, la livraison du colis aussi.', { q: remb.quand.charAt(0).toUpperCase() + remb.quand.slice(1) })}
                  </span>
                </span>
              </div>
            </>
          )}
          <div className="cl11-sep"></div>
          <div className="cl11-row">
            <span className="ic-sq ">
              <Icone nom="map-pin" taille={20} />
            </span>
            <span className="grow">
              <span className="t" style={{ display: 'block' }}>
                {tf('Ton article reste au {r}, sans frais de garde.', { r: t(l.relais) })}
              </span>
              <span className="s" style={{ display: 'block' }}>
                {t('Il y est gardé pendant tout l’examen.')}
              </span>
            </span>
          </div>
          {autres.map((x) => (
            <div key={x.n}>
              <div className="cl11-sep"></div>
              <div className="cl11-row">
                <span className="ic-sq green">
                  <Icone nom="package-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="t" style={{ display: 'block' }}>
                    {tf('Colis {n} · {p} : en ordre', { n: x.n, p: t(x.produit) })}
                  </span>
                  <span className="s" style={{ display: 'block' }}>
                    {c.retourJusqua ? tf('Tu l’emportes. Jusqu’au {d}, tu peux encore le signaler.', { d: jourSeul(c.retourJusqua, langue) }) : t('Tu l’emportes.')}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
        <details className="more">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Comment ça marche')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>{gerant ? tf('Au comptoir, le colis est là et {g} est témoin\u00A0: ce litige se règle bien plus vite.', { g: gerant }) : t('Au comptoir, le colis est là et le gérant est témoin : ce litige se règle bien plus vite.')}</p>
            <p>{gerant ? tf('Le constat de {g} est versé au dossier : le vendeur y répond, puis BelivaY tranche si besoin.', { g: gerant }) : t('Le constat du gérant est versé au dossier : le vendeur y répond, puis BelivaY tranche si besoin.')}</p>
            <p>{t('La suite est la même que pour tout litige\u00A0: le vendeur répond sous 48\u00A0h, puis BelivaY décide si besoin, avec un motif écrit.')}</p>
          </div>
        </details>
        <div className="btns">
          <Link to={chemin('litige-suivi', { id: l.id })} className="btn primary">
            <span>{t('Suivre mon litige')}</span>
          </Link>
        </div>
        <div className="btns">
          <Link to={chemin('fil', { id: l.id, from: 'litige' })} className="btn secondary">
            <Icone nom="message-square-text" taille={18} />
            <span>{t('Écrire dans le dossier')}</span>
          </Link>
        </div>
        <div className="links">
          <Link to={chemin('aide')}>{t('Besoin d’aide ?')}</Link>
        </div>
      </Ecran>
    )
  }

  const auRelais = c.etat === 'retirable' || c.etat === 'comptoir'
  const choisi = c.colis.length === 1 ? c.colis[0].n : colis
  const pret = auRelais && choisi !== null && pb !== null
  const ouvrir = async () => {
    if (!pret) return
    await source.ouvrirLitige({ ref: c.ref, colis: choisi!, pb: pb!, description: ('Constat au comptoir, au déballage. ' + detail).trim(), souhait, photos: [], origine: 'comptoir' })
    setVersion((v) => v + 1)
  }
  return (
    <Ecran route="litige-comptoir" sousTitre={c.ref}>
      {!auRelais ? (
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="store" taille={26} />
            </div>
            <h3>{t('Le constat se fait au comptoir')}</h3>
            <p>{t('Il sert quand tes colis sont au relais, devant le gérant. Après le retrait, signale le problème depuis la commande.')}</p>
            <div className="btns">
              <Link to={chemin(c.etat === 'retiree' ? 'litige' : 'commande', { ref: c.ref })} className="btn primary">
                <span>{t(c.etat === 'retiree' ? 'Signaler un problème' : 'Voir la commande')}</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <h1 className="pg-t">{t('Un problème au déballage')}</h1>
          <p className="pg-s">{t('Le gérant constate et photographie. Le colis reste au relais, ton argent reste bloqué.')}</p>
          {c.colis.length > 1 && (
            <div className="card tight">
              {c.colis.map((x) => (
                <a key={x.n} href="#" role="radio" aria-checked={choisi === x.n} className={'li cl11-it' + (choisi === x.n ? ' on' : '')} onClick={(e) => (e.preventDefault(), setColis(x.n))}>
                  <span className="thumb" style={{ width: 44, height: 44, borderRadius: 12 }}>
                    <Dessin id={x.dessin} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ display: 'block' }}>
                      {tf('Colis {n}', { n: x.n })}
                    </span>
                    <span className="ls" style={{ display: 'block' }}>
                      {t(x.produit)}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          )}
          <h3 className="cl11-k">{t('Le problème')}</h3>
          <div className="chips">
            {PROBLEMES.map(([k, x]) => (
              <a key={k} href="#" className={'chip' + (pb === k ? ' on' : '')} aria-pressed={pb === k} onClick={(e) => (e.preventDefault(), setPb(k))}>
                {t(x)}
              </a>
            ))}
          </div>
          <div className="fld">
            <label htmlFor="lc-detail">{t('Ce que tu vois (facultatif)')}</label>
            <div className="inp">
              <input id="lc-detail" value={detail} maxLength={140} onChange={(e) => setDetail(e.target.value)} placeholder={t('Ex. semelle fendue')} />
            </div>
          </div>
          <h3 className="cl11-k">{t('Ton souhait')}</h3>
          <div className="chips">
            {(['rembourse', 'remplace'] as const).map((k) => (
              <a key={k} href="#" className={'chip' + (souhait === k ? ' on' : '')} aria-pressed={souhait === k} onClick={(e) => (e.preventDefault(), setSouhait(k))}>
                {t(k === 'rembourse' ? 'Être remboursé' : 'Un remplacement')}
              </a>
            ))}
          </div>
          <div className="btns mt16">
            <button type="button" className={'btn primary' + (pret ? '' : ' off')} onClick={ouvrir}>
              <Icone nom="scale" taille={18} />
              <span>{t('Ouvrir le litige au comptoir')}</span>
            </button>
          </div>
          {!pret && (
            <p className="scrim-note" style={{ marginTop: '8px' }}>
              {t(choisi === null ? 'Choisis le colis et le problème pour ouvrir le litige.' : 'Choisis le problème pour ouvrir le litige.')}
            </p>
          )}
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Pas de frais de garde pendant l’examen. Le vendeur a 48 h pour répondre.')}</span>
          </div>
          <div className="hint-l">
            <Icone nom="banknote" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>
              {souhait === 'rembourse'
                ? tf('Remboursement {ou}, {quand}, si ta demande est retenue.', { ou: remb.ou, quand: remb.quand })
                : t('Le vendeur renvoie le même article neuf à ce relais, livraison offerte ; sinon tu es remboursée.')}
            </span>
          </div>
        </>
      )}
      <div className="links">
        <Link to={chemin('commande', { ref: c.ref })}>{t('Revenir à la commande')}</Link>
      </div>
    </Ecran>
  )
}
