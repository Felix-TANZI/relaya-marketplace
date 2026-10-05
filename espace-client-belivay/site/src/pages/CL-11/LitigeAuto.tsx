// Écran « Remboursé » (CL-11), forme d'origine du prototype rendue réelle (DP-54) : un dossier réglé sans enquête
// (?id=) : pour un petit montant, BelivaY rembourse aussitôt, sans preuve de plus, et paie lui-même ; le vendeur
// n'est pas mis en cause ; l'argent va où le veut la règle (useRemboursement : carte, Portefeuille ou Mobile Money).
// Sans dossier de ce type : renvoi au suivi.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type Litige } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useRemboursement } from './Commun'

export function LitigeAuto() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id')
  const [l, setL] = useState<Litige | null | undefined>(undefined)
  const [payePar, setPayePar] = useState<string | null>(null)
  const remb = useRemboursement(payePar)
  useEffect(() => {
    source.litiges().then((d) => {
      const x = d.litiges.find((y) => y.origine === 'auto' && (!id || y.id === id)) ?? null
      setL(x)
      if (x) source.commandeLitige(x.ref).then((c) => setPayePar(c?.payePar ?? null))
    })
  }, [id])
  if (l === undefined) return null
  if (!l)
    return (
      <Ecran route="litige-auto">
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="zap" taille={26} />
            </div>
            <h3>{t('Ce dossier suit le parcours normal')}</h3>
            <p>{t('Le remboursement immédiat concerne les petits montants. Ton dossier est examiné : le vendeur répond sous 48 h.')}</p>
            <div className="btns">
              <Link to={id ? chemin('litige-suivi', { id }) : chemin('litiges')} className="btn primary">
                <span>{t(id ? 'Voir le dossier' : 'Mes litiges')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  return (
    <Ecran route="litige-auto" sousTitre={l.id}>
      <div className="hero green">
        <span className="ico-b">
          <Icone nom="circle-check" taille={24} />
        </span>
        <div className="cl11-ht">{t('Remboursé.')}</div>
        <div className="hs">
          {t('Tu recevras ')}
          <b>{F(l.montant)}&nbsp;F</b>
          {tf(' {ou}, {quand}.', { ou: remb.ou, quand: remb.quand })}
        </div>
      </div>
      <div className="card">
        <div className="cl11-pc">
          <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
            <Dessin id={l.dessin} />
          </span>
          <span className="grow">
            <b className="t15 b8" style={{ display: 'block' }}>
              {tf('Colis {n} · {p}', { n: l.colis, p: t(l.produit) })}
            </b>
            <span className="t13 c3" style={{ display: 'block', marginTop: '2px' }}>
              {t('Réglé tout de suite, sans enquête')}
            </span>
            <span className="t13 c3" style={{ display: 'block', marginTop: '2px' }}>
              {tf('{ref} · {p}', { ref: l.ref, p: t(l.probleme) })}
            </span>
          </span>
        </div>
        <div className="cl11-sep"></div>
        <div className="cl11-row">
          <span className="ic-sq green">
            <Icone nom="package-check" taille={20} />
          </span>
          <span className="grow">
            <span className="t" style={{ display: 'block' }}>
              {t('Tu n’as rien à rapporter')}
            </span>
            <span className="s" style={{ display: 'block' }}>
              {t('Pas de dossier à suivre : c’est terminé.')}
            </span>
          </span>
        </div>
        {l.decision && (
          <div className="kv mt8">
            <span className="k">{t('Remboursé le')}</span>
            <span className="v">{dateA(l.decision.le, langue)}</span>
          </div>
        )}
        <div className="kv">
          <span className="k">{t('Montant')}</span>
          <span className="v cg">{F(l.montant)}&nbsp;F</span>
        </div>
        <div className="kv">
          <span className="k">{t('Versé')}</span>
          <span className="v">{remb.portefeuille ? t('Portefeuille BelivaY') : remb.carte ? t('Carte qui a payé') : (payePar ?? t('Moyen qui a payé'))}</span>
        </div>
      </div>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Pour un petit montant, BelivaY rembourse tout de suite, sans te demander de preuve de plus.')}</p>
          <p>{t('C’est BelivaY qui paie ce remboursement : le vendeur n’est pas mis en cause.')}</p>
          <p>{tf('L’argent revient {ou}, {quand}.', { ou: remb.ou, quand: remb.quand })}</p>
          {remb.ensuite && <p>{remb.ensuite}</p>}
        </div>
      </details>
      {remb.portefeuille && (
        <div className="btns">
          <Link to={chemin('wallet')} className="btn secondary">
            <Icone nom="wallet" taille={18} />
            <span>{t('Voir mon Portefeuille')}</span>
          </Link>
        </div>
      )}
      <div className="btns">
        <Link to={chemin('commandes')} className="btn primary">
          <span>{t('Retour à mes commandes')}</span>
        </Link>
      </div>
      <p className="scrim-note">{tf('Référence {id} · à donner au support si besoin', { id: l.id })}</p>
      <div className="links">
        <Link to={chemin('aide')}>{t('Besoin d’aide ?')}</Link>
      </div>
    </Ecran>
  )
}
