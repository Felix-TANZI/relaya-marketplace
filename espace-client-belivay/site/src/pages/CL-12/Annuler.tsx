// Écran « Annuler ma commande » (CL-12), forme d'origine du prototype rendue réelle (DP-54) : la commande (?ref=…)
// boutique par boutique : état côté vendeur, montant récupéré si on annule (article + différence des frais
// recalculés) ; un colis récupéré par le livreur ne s'annule plus (il se refuse au comptoir : litige) ; motif
// facultatif (choisi puis rappelé, modifiable) ; hors ligne, l'annulation attend le réseau ; une boutique annulée
// dit par qui, quand et ce qui a été remboursé ; une commande annulée montre article, livraison et remboursement.
// L'argent rendu va où le veut la règle (useRemboursement : la carte qui a payé, sinon le Portefeuille BelivaY
// quand il est ouvert, sinon le moyen d'origine) ; un client qui annule reçoit une notification, pas de SMS (DP-36).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type ApercuAnnulation, type ColisCommande, type CommandeClient } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { useRemboursement } from '../CL-11/Commun'
import { annulable, Boutique, MOTIFS, Onglets, Retour, useEnLigne } from './Commun'

// Aussi le fond de « Confirmer l'annulation » (feuille posée dessus) et, après l'annulation, la commande qui
// continue (en-tête du remboursement, récapitulatif) : mêmes boutiques, mêmes montants.
export function Annuler(p: { route?: string; fixes?: ReactNode; entete?: ReactNode; intro?: ReactNode; suite?: ReactNode; fait?: boolean }) {
  const route = p.route ?? 'annuler'
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-52107'
  const enLigne = useEnLigne()
  const [c, setC] = useState<CommandeClient | null | undefined>(undefined)
  const [apercus, setApercus] = useState<Record<number, ApercuAnnulation>>({})
  const [motif, setMotif] = useState<string | null>(params.get('motif'))
  const remb = useRemboursement(Object.values(apercus)[0]?.payePar ?? null)
  useEffect(() => {
    source.commandeClient(ref).then(async (d) => {
      setC(d?.commande ?? null)
      if (!d) return
      const a: Record<number, ApercuAnnulation> = {}
      for (const x of d.commande.colis) {
        const p = await source.apercuAnnulation(ref, x.n)
        if (p) a[x.n] = p
      }
      setApercus(a)
    })
  }, [ref])
  if (c === undefined) return null
  if (!c) return <CommandeIntrouvable route={route} />
  const payePar = Object.values(apercus)[0]?.payePar ?? null
  // Où l'argent revient : la carte ou le moyen d'origine, ou le Portefeuille BelivaY quand il est ouvert.
  const vers = remb.portefeuille ? t('ton Portefeuille BelivaY') : payePar

  const boutique = (x: ColisCommande, i: number, bas: ReactNode) => (
    <Boutique key={x.n} x={x} i={i}>
      {bas}
    </Boutique>
  )

  if (c.etat === 'annulee') {
    const article = c.colis.reduce((s, x) => s + x.prix * x.qte, 0)
    const rembourse = c.annulee?.rembourse ?? article + c.livraison
    const par = c.colis.find((x) => x.annule)?.annule
    return (
      <Ecran route={route} sousTitre={c.ref}>
        <div className="pg">
          <h1 className="pg-t">{t('Commande annulée')}</h1>
          <p className="pg-s">
            <span className="nw">{tf('{ref} · {n} boutique(s).', { ref: c.ref, n: c.colis.length })}</span>
            {par && par.par !== 'toi' && t(par.par === 'vendeur' ? ' Le vendeur a annulé : tu as été remboursée le jour même.' : ' BelivaY a annulé : tu as été remboursée le jour même.')}
          </p>
        </div>
        <div className="hero green">
          <div className="hk">{c.annulee ? tf('Remboursée le {d}', { d: jourSeul(c.annulee.le, langue) }) : t('Remboursée')}</div>
          <div className="big">
            {F(rembourse)}
            <small>{t('F')}</small>
          </div>
          <div className="hs">
            {vers ? (
              <>
                {t('Sur ')}
                <span className="nw">{vers}</span>
                {t('. Article et livraison : tout t’a été rendu.')}
              </>
            ) : (
              t('Sur le moyen qui a payé. Article et livraison : tout t’a été rendu.')
            )}
          </div>
        </div>
        {c.colis.map((x, i) =>
          boutique(
            x,
            i,
            <>
              <div className="hr"></div>
              <div className="kv">
                <span className="k">{t('Article')}</span>
                <span className="v ">{F(x.prix * x.qte)}&nbsp;F</span>
              </div>
              {i === 0 && (
                <div className="kv">
                  <span className="k">{t(c.mode === 'relais' ? 'Livraison au relais' : 'Livraison à domicile')}</span>
                  <span className="v ">{F(c.livraison)}&nbsp;F</span>
                </div>
              )}
              <div className="kv">
                <span className="k">{t('Remboursé')}</span>
                <span className="v cg">
                  <b>{F(x.annule?.rembourse ?? (c.colis.length === 1 ? rembourse : x.prix * x.qte))}&nbsp;F</b>
                </span>
              </div>
            </>,
          ),
        )}
        {par?.motif && (
          <div className="card cl12-box info">
            <div className="bt">{t('Ce qui s’est passé')}</div>
            <p>{t(par.motif)}</p>
          </div>
        )}
        {par && par.par !== 'toi' && (
          <div className="card cl12-box green">
            <p>{t('Cette annulation ne compte pas contre toi.')}</p>
          </div>
        )}
        {c.colis[0]?.p && (
          <div className="btns mt16">
            <Link to={chemin('fiche', { p: c.colis[0].p })} className="btn primary">
              <Icone nom="search" taille={18} />
              <span>{t('Voir le produit aujourd’hui')}</span>
            </Link>
          </div>
        )}
        <Retour c={c} />
      </Ecran>
    )
  }

  const ouverte = c.etat === 'preparation' || c.etat === 'paiement'
  if (c.etat === 'retiree')
    return (
      <Ecran route={route} sousTitre={c.ref}>
        <Onglets c={c} actif="annuler" />
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="package-x" taille={26} />
            </div>
            <h3>{t('Annulation impossible')}</h3>
            <p>{t('Commande déjà retirée : un problème se signale depuis la commande.')}</p>
            <div className="btns">
              <Link to={chemin('litige', { ref: c.ref })} className="btn primary">
                <span>{t('Signaler un problème')}</span>
              </Link>
            </div>
          </div>
        </div>
        <Retour c={c} />
      </Ecran>
    )

  return (
    <Ecran route={route} sousTitre={c.ref} fixes={p.fixes}>
      {p.entete}
      {!p.fait && <Onglets c={c} actif="annuler" />}
      {p.intro}
      {!enLigne && (
        <div className="offline-banner">
          <Icone nom="wifi-off" taille={18} />
          <span>{t('Hors ligne : tu vois ta commande telle qu’elle était à ta dernière connexion.')}</span>
        </div>
      )}
      {ouverte &&
        !p.fait &&
        (motif ? (
          <div className="cl12-mot">
            <Icone nom="message-square-text" taille={16} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <span>
              {t('Motif : ')}
              <b>{t(motif)}</b>
            </span>
            <a href="#" onClick={(e) => (e.preventDefault(), setMotif(null))}>
              {t('Changer')}
            </a>
          </div>
        ) : (
          <>
            <h3 className="cl11-k" style={{ marginTop: '16px' }}>{t('Pourquoi ? (facultatif)')}</h3>
            <div className="chips">
              {MOTIFS.map((m) => (
                <a key={m} href="#" className="chip" aria-pressed={false} onClick={(e) => (e.preventDefault(), setMotif(m))}>
                  {t(m)}
                </a>
              ))}
            </div>
          </>
        ))}
      <p className="cl12-lead">{t(p.fait ? 'Le reste de ta commande continue.' : ouverte ? 'Choisis la boutique à annuler. Le reste de ta commande continue.' : 'Tes colis sont partis avec le livreur : ils ne s’annulent plus.')}</p>
      {c.colis.map((x, i) => {
        const a = apercus[x.n]
        const bas = x.annule ? (
          <>
            <div className="cl12-rf green">
              <span>
                {vers ? (
                  <>
                    {t('Remboursé sur ')}
                    <span className="nw">{vers}</span>
                  </>
                ) : (
                  t('Remboursé')
                )}
              </span>
              <b>{F(x.annule.rembourse)}&nbsp;F</b>
            </div>
            {x.annule.par !== 'toi' && <div className="cl12-why">{t('Cette annulation ne compte pas contre toi.')}</div>}
          </>
        ) : ouverte && annulable(c, x) && a ? (
          <>
            <div className="cl12-rf">
              <span>{t('Si tu annules, tu récupères')}</span>
              <b>{F(a.rembourse)}&nbsp;F</b>
            </div>
            {enLigne ? (
              <div className="btns">
                <Link to={chemin('annuler-confirmer', { ref: c.ref, n: String(x.n), ...(motif ? { motif } : {}) })} className="btn danger">
                  <span>{t('Annuler cette boutique')}</span>
                </Link>
              </div>
            ) : (
              <div className="cl12-off" aria-disabled="true">
                <Icone nom="wifi-off" taille={18} />
                <span>{t('Annulation : attend le réseau')}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="cl12-off" aria-disabled="true">
              <span>{t('Annulation impossible')}</span>
            </div>
            <div className="cl12-why">
              {t(x.arrive ? 'Au comptoir, tu peux le refuser : cela ouvre un litige.' : 'Emballé et scellé par le livreur : il ne s’annule plus. À son arrivée, tu pourras le refuser au comptoir (litige).')}
            </div>
          </>
        )
        return boutique(x, i, bas)
      })}
      {!enLigne && (
        <div className="hint-l">
          <Icone nom="wifi-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Une annulation touche à ton argent : elle se fait en ligne, pour vérifier l’état réel de chaque colis.')}</span>
        </div>
      )}
      {p.suite}
      {!p.fait && (
        <>
      <div className="card cl12-box green">
        <div className="bt">{t('Remboursement immédiat')}</div>
        <p>
          {vers ? (
            <>
              {t('Sur ')}
              <span className="nw">{vers}</span>
            </>
          ) : (
            t('Sur le moyen qui a payé')
          )}
          {t('. Aucun frais. Les frais de livraison sont recalculés : la différence te revient.')}
        </p>
        {remb.ensuite && <p>{remb.ensuite}</p>}
        {remb.carte && <p>{t('Payée par carte : les 2 % de frais de service de la boutique que tu annules ne sont pas rendus.')}</p>}
      </div>
      <div className="card cl12-box info">
        <div className="ib">
          <Icone nom="info" taille={18} />
          <div className="grow">
            <p>{t('Une fois récupéré par le livreur, un colis ne s’annule plus. À son arrivée, tu peux le refuser au comptoir : cela ouvre un litige.')}</p>
            <Link to={chemin('litige-comptoir', { ref: c.ref })} className="lk">
              {t('Refuser au comptoir : comment ça marche')}
            </Link>
          </div>
        </div>
      </div>
      <details className="more">
        <summary>
          <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Changer la quantité ?')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Impossible après le paiement : annule la boutique, puis recommande la bonne quantité.')}</p>
        </div>
      </details>
        </>
      )}
      <Retour c={c} />
    </Ecran>
  )
}
