// Écran « Confirmer l'annulation » (CL-12), forme d'origine du prototype rendue réelle (DP-54) : la feuille posée
// sur la commande (?ref=…&n=colis) : ce que l'on récupère, l'article, le détail du remboursement (article + frais
// payés − frais recalculés sans la boutique), le moyen qui a payé, ce qui continue ; l'annulation est faite tout
// de suite. Le colis vient d'être récupéré par le livreur : trop tard, rien n'a changé. Après : la boutique
// annulée, le reste de la commande qui continue (un seul code), les frais recalculés et le nouveau total.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Ecran } from '../../composants/coque'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type ApercuAnnulation, type FraisDetail } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useRemboursement } from '../CL-11/Commun'
import { Annuler } from './Annuler'

export function AnnulerConfirmer() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const detail = (f: FraisDetail) =>
    f.ramassages ? tf(f.offert ? 'Ramassages {a} + remises {b} − offert {c}' : 'Ramassages {a} + remises {b}', { a: F(f.ramassages), b: F(f.remises), c: F(f.offert) }) : t('Plus de colis')
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-52107'
  const n = Number(params.get('n') ?? params.get('boutique') ?? 2) || 2
  const motif = params.get('motif') ?? ''
  const [a, setA] = useState<ApercuAnnulation | null | undefined>(undefined)
  const [fait, setFait] = useState<{ rembourse: number; reste: number } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const remb = useRemboursement(a?.payePar ?? null)
  // Où l'argent revient (useRemboursement) : la carte ou le moyen d'origine, ou le Portefeuille BelivaY.
  const vers = remb.portefeuille ? t('ton Portefeuille BelivaY') : (a?.payePar ?? '')
  useEffect(() => {
    source.apercuAnnulation(ref, n).then(setA)
  }, [ref, n])
  if (a === undefined) return null
  const garder = () => naviguer(chemin('annuler', { ref, ...(motif ? { motif } : {}) }))

  if (fait && a) {
    if (!a.reste.length)
      return (
        <Ecran route="annuler-confirmer" sousTitre={ref}>
          <div className="hero green">
            <div className="hk">{tf('{b} annulée', { b: t(a.colis.boutique) })}</div>
            <div className="big">
              {F(fait.rembourse)}
              <small>{t('F remboursés')}</small>
            </div>
            <div className="hs">{tf('Sur {p}, à l’instant. Le vendeur est prévenu : ce colis ne sera pas collecté.', { p: vers })}</div>
          </div>
          <p className="t14 c2">{t('C’était la dernière boutique : ta commande est annulée et entièrement remboursée.')}</p>
          <div className="btns">
            <Link to={chemin('commande', { ref })} className="btn primary">
              <span>{t('Revenir à ma commande')}</span>
            </Link>
          </div>
        </Ecran>
      )
    return (
      <Annuler
        key="fait"
        route="annuler-confirmer"
        fait
        entete={
          <div className="hero green">
            <div className="hk">{tf('{b} annulée', { b: t(a.colis.boutique) })}</div>
            <div className="big">
              {F(fait.rembourse)}
              <small>{t('F remboursés')}</small>
            </div>
            <div className="hs">
              {t('Sur ')}
              <span className="nw">{vers}</span>
              {t(', à l’instant. Le vendeur est prévenu : ce colis ne sera pas collecté.')}
            </div>
          </div>
        }
        suite={
          <>
            <div className="card flat mt12" style={{ padding: '6px 14px' }}>
              <div className="kv">
                <span className="k">{t('Tes colis')}</span>
                <span className="v ">
                  {a.reste.length === 1
                    ? tf('Colis {n}', { n: a.reste[0].n })
                    : tf('{l} et Colis {n}, un seul code', { l: a.reste.slice(0, -1).map((x) => tf('Colis {n}', { n: x.n })).join(', '), n: a.reste[a.reste.length - 1].n })}
                </span>
              </div>
              <div className="kv">
                <span className="k">{t('Frais de livraison recalculés')}</span>
                <span className="v ">{a.fraisApres.total ? F(a.fraisApres.total) + ' F' : t('offerts')}</span>
              </div>
              <div className="kv">
                <span className="k">{t('Total payé désormais')}</span>
                <span className="v ">
                  <b>{F(fait.reste)}&nbsp;F</b>
                </span>
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="bell" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Tes colis restants se retirent ensemble, avec un seul code. Confirmation par notification.')}</span>
            </div>
            <div className="btns">
              <Link to={chemin('commande', { ref })} className="btn primary">
                <span>{t('Revenir à ma commande')}</span>
              </Link>
            </div>
          </>
        }
      />
    )
  }

  const confirmer = async () => {
    if (!a || envoi) return
    setEnvoi(true)
    const r = await source.annulerColis(ref, n, motif)
    const d = await source.commandeClient(ref)
    setFait({ rembourse: r, reste: d?.commande.total ?? 0 })
  }

  // Trop tard (colis récupéré entre-temps) ou rien à annuler : la feuille le dit, rien n'a changé.
  const feuille =
    !a || a.colis.statut === 'recupere' ? (
      <Feuille ouverte fermer={garder} titre={t(a ? 'Trop tard pour ce colis' : 'Rien à annuler ici')}>
        <div className="row">
          <span className="ic-sq" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
            <Icone nom="circle-alert" taille={22} />
          </span>
          <div className="grow">
            <div className="cl12-kick">{t('L’état a changé')}</div>
            <h2 className="cl12-st-t">{a ? tf('Trop tard pour le Colis {n}', { n: a.colis.n }) : t('Rien à annuler ici')}</h2>
          </div>
        </div>
        <p className="t14 c2" style={{ lineHeight: '1.5', margin: '12px 0 0' }}>
          {t(a ? 'Le livreur vient de le récupérer : il est emballé et scellé. Il ne peut plus être annulé.' : 'Ce colis est déjà annulé, ou la commande n’existe pas.')}
        </p>
        <div className="note ink">
          <Icone nom="shield-check" taille={18} />
          <div>{t('Rien n’a changé : aucun remboursement, aucun débit.')}</div>
        </div>
        {a && (
          <div className="hint-l">
            <Icone nom="package-x" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('À son arrivée au relais, tu pourras le refuser au comptoir : cela ouvre un litige.')}</span>
          </div>
        )}
        <div className="btns mt16">
          <button type="button" className="btn primary" onClick={garder}>
            <span>{t('Revenir à ma commande')}</span>
          </button>
        </div>
        {a && (
          <div className="btns">
            <Link to={chemin('litige-comptoir', { ref })} className="btn ghost">
              <span>{t('Refuser au comptoir : comment ça marche')}</span>
            </Link>
          </div>
        )}
      </Feuille>
    ) : (
      <Feuille ouverte fermer={garder} titre={tf('Annuler la {b}', { b: t(a.colis.boutique) })}>
        <div className="cl12-kick">{tf('Annuler la {b}', { b: t(a.colis.boutique) })}</div>
        <h2 className="cl12-st-t">{tf('Tu récupères {m} F', { m: F(a.rembourse) })}</h2>
        <div className="cl12-art">
          <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
            <Dessin id={a.colis.dessin} />
          </span>
          <div className="grow">
            <div className="cl12-an">{t(a.colis.produit)}</div>
            <div className="cl12-av">{tf('× {q}', { q: a.colis.qte })}</div>
          </div>
          <span className="price">
            {F(a.article)}
            <small>{t(' F')}</small>
          </span>
        </div>
        <table className="tbl cl12-tbl mt12">
          <tbody>
            <tr>
              <td>
                {t('Frais de livraison payés')}
                <small>{detail(a.fraisAvant)}</small>
              </td>
              <td className="r nw">{F(a.fraisAvant.total)}&nbsp;F</td>
            </tr>
            <tr>
              <td>
                {tf('Frais recalculés sans la {b}', { b: t(a.colis.boutique) })}
                <small>{detail(a.fraisApres)}</small>
              </td>
              <td className="r nw">{F(a.fraisApres.total)}&nbsp;F</td>
            </tr>
            <tr className="tot">
              <td>
                {t('Remboursement')}
                <small>
                  {F(a.article)} + ({F(a.fraisAvant.total)} − {F(a.fraisApres.total)})
                </small>
              </td>
              <td className="r nw">{F(a.rembourse)}&nbsp;F</td>
            </tr>
          </tbody>
        </table>
        <div className="hint-l">
          <Icone nom="banknote" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>
            {t('Sur ')}
            <span className="nw">{vers}</span>
            {t(', tout de suite. Aucun frais, aucune validation.')}
          </span>
        </div>
        {remb.carte && (
          <div className="hint-l">
            <Icone nom="credit-card" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Payée par carte : les 2 % de frais de service de cette boutique ne sont pas rendus quand tu annules.')}</span>
          </div>
        )}
        {a.reste.length > 0 && (
          <div className="hint-l">
            <Icone nom="package" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>
              {tf('Le reste continue : {l}, retirables ensemble avec un seul code.', { l: a.reste.map((x) => tf('Colis {n}', { n: x.n })).join(', ') })}
              {a.fraisApres.offert > 0 && t(' Ta livraison reste offerte.')}
            </span>
          </div>
        )}
        {motif && (
          <div className="hint-l">
            <Icone nom="message-square-text" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Motif : {m}', { m: t(motif) })}</span>
          </div>
        )}
        <div className="btns mt16">
          <button type="button" className={'btn danger' + (envoi ? ' off' : '')} onClick={confirmer}>
            <Icone nom="circle-x" taille={18} />
            <span>{tf('Annuler la {b}', { b: t(a.colis.boutique) })}</span>
          </button>
        </div>
        <div className="btns">
          <button type="button" className="btn secondary" onClick={garder}>
            <span>{tf('Garder la {b}', { b: t(a.colis.boutique) })}</span>
          </button>
        </div>
      </Feuille>
    )
  return <Annuler key="avant" route="annuler-confirmer" fixes={feuille} />
}
