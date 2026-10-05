// Écran « Ventes flash » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : en-tête avec le compte à
// rebours vivant de la prochaine fin d'offre, retrait offert dès 30 000 F, le rail des Flash Deals (barre du temps
// restant sur 48 h, stock de l'offre), « Tous les Flash Deals » filtrés par univers (« Ajouter » met au panier au
// prix de l'offre), les promotions, les offres terminées, l'alerte, pourquoi ces prix sont honnêtes. Toucher une
// offre ouvre sa feuille (?offre=…) : prix d'avant, fin, stock, retrait, ajouter au panier, voir la fiche. Sans
// offre en cours : « Aucune vente flash pour ton relais ».
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { UNIVERS } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { Chiffres, Chrono, urgenceDe } from '../../composants/Chrono'
import { Dessin } from '../../composants/Dessin'
import { useLieu } from '../../composants/PourQui'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type OffreFlash, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'

const H = 3600e3
const deux = (n: number) => (n < 10 ? '0' : '') + n
// « Fin aujourd'hui à 20 h », « Fin demain à 9 h » (heure de Yaoundé, UTC + 1).
function finEn(fin: number, now: number, t: (s: string) => string, tf: (m: string, v: Record<string, string | number>) => string) {
  const j = (ms: number) => Math.floor((ms + H) / 864e5)
  const h = new Date(fin + H).getUTCHours()
  const m = new Date(fin + H).getUTCMinutes()
  const heure = m ? `${h} h ${deux(m)}` : `${h} h`
  const d = j(fin) - j(now)
  return d <= 0 ? tf('Fin aujourd’hui à {h}', { h: heure }) : d === 1 ? tf('Fin demain à {h}', { h: heure }) : t('Fin dans plus de 2 jours')
}
const encore = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 3600)} h ${deux(Math.floor((s % 3600) / 60))}`
}

export function VentesFlash() {
  const { t, tf } = usePreferences()
  const lieuR = useLieu()
  const majSession = useMajSession()
  const [params, setParams] = useSearchParams()
  const [d, setD] = useState<{ offres: OffreFlash[]; alerte: boolean; relais: string | null; maintenant: number } | null>(null)
  const [produits, setProduits] = useState<Produit[]>([])
  const [favoris, setFavoris] = useState<string[]>([])
  const [ecart, setEcart] = useState(0)
  const [tic, setTic] = useState(Date.now())
  const [u, setU] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const charger = () => source.ventesFlash().then((x) => (setD(x), setEcart(x.maintenant - Date.now())))
  useEffect(() => {
    charger()
    source.produits().then(setProduits)
    source.favoris().then((f) => setFavoris(f.favoris.map((x) => x.p)))
    const i = setInterval(() => setTic(Date.now()), 1000)
    return () => clearInterval(i)
  }, [])
  if (!d) return null
  const now = tic + ecart
  const relais = d.relais ?? 'Relais Mvog-Ada'
  const enCours = d.offres.filter((o) => o.debut <= now && o.fin > now).sort((a, b) => a.fin - b.fin)
  const finies = d.offres.filter((o) => o.fin <= now)
  const aVenir = d.offres.filter((o) => o.debut > now)
  const promos = produits.filter((p) => (p.prixBarre ?? 0) > p.prix && !enCours.some((o) => o.p === p.p)).length + enCours.length
  const remise = (o: OffreFlash) => Math.round((1 - o.prix / o.avant) * 100)
  const sel = enCours.find((o) => o.p === params.get('offre')) ?? null
  const variante = (p: string) => produits.find((x) => x.p === p)?.variante ?? null
  const ouvrir = (p: string | null) => setParams(p ? { offre: p } : {}, { replace: true })
  const ajouter = async (o: OffreFlash, e?: MouseEvent) => {
    e?.preventDefault()
    const r = await source.ajouterFlash(o.p)
    setMessage(r.ok ? tf('« {p} » ajouté au panier à {m} F.', { p: t(o.titre), m: F(o.prix) }) : t('Offre terminée ou épuisée : rien n’a été ajouté.'))
    majSession(await source.session())
    charger()
    ouvrir(null)
  }
  const coeur = async (p: string, e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const f = await source.basculerFavori(p)
    setFavoris(f ? [...favoris, p] : favoris.filter((x) => x !== p))
    majSession(await source.session())
  }
  const universEnCours = [...new Set(enCours.map((o) => o.univers))]
  const coeurIcone = (p: string) => (
    <span className="fd-h" role="button" tabIndex={0} aria-pressed={favoris.includes(p)} aria-label={t(favoris.includes(p) ? 'Retirer des favoris' : 'Ajouter aux favoris')} onClick={(e) => coeur(p, e)}>
      <Icone nom="heart" taille={15} style={favoris.includes(p) ? { fill: 'currentColor', color: 'var(--or)' } : undefined} />
    </span>
  )
  const alerte = (
    <div className="card tight">
      <div className="li">
        <span className="ic ">
          <Icone nom="bell" taille={20} />
        </span>
        <span className="grow">
          <span className="lt" style={{ display: 'block' }}>
            {t('Me prévenir des Flash Deals')}
          </span>
          <span className="ls" style={{ display: 'block' }}>
            {t('Push seulement, 3 par semaine au plus, entre 9 h et 20 h. Jamais de SMS.')}
          </span>
        </span>
        <button type="button" className={'tg' + (d.alerte ? ' on' : '')} role="switch" aria-checked={d.alerte} aria-label={t('Me prévenir des Flash Deals')} onClick={async () => (await source.alerteFlash(!d.alerte), charger())}></button>
      </div>
    </div>
  )
  const honnetes = (
    <details className="more">
      <summary>
        <Icone nom="shield-check" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{t('Pourquoi ces prix sont honnêtes')}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">
        <p>{t('Le prix barré est le prix vraiment pratiqué avant l’offre, et la remise fait au moins 10 %.')}</p>
        <p>{t('Chaque offre dure 48 h au plus. Son compte à rebours s’arrête à sa vraie fin ; le stock affiché est celui de l’offre.')}</p>
        <p>{t('La remise est payée par le vendeur ou par BelivaY, jamais par le relais ni par le livreur.')}</p>
        <p>{t('Un article en vente flash a les mêmes droits que les autres : paiement bloqué jusqu’à ton retrait, retour possible dans les 7 jours s’il n’est pas conforme.')}</p>
        <p>{t('Le prix de l’offre vaut tant qu’elle court et qu’il reste du stock : le panier vérifie le prix avant de payer.')}</p>
      </div>
    </details>
  )

  if (!enCours.length)
    return (
      <Ecran route="ventes-flash" gabarit="catalogue" avant={<Styles id="1c3d953197" />}>
        <Styles id="02f3dac5cd" />
        <div className="empty">
          <div className="ei">
            <Icone nom="zap" taille={26} />
          </div>
          <h3>{lieuR.r('Aucune vente flash pour ton relais en ce moment')}</h3>
          <p>{tf('Au {r}, elles apparaissent quand une tournée a de la place. Active l’alerte pour être prévenu.', { r: t(relais) })}</p>
        </div>
        {alerte}
        <div className="btns">
          <Link to="/" className="btn secondary">
            <span>{t('Retour à l’accueil')}</span>
          </Link>
        </div>
        {honnetes}
      </Ecran>
    )

  const prochaine = Math.max(0, Math.floor((enCours[0].fin - now) / 1000))
  const feuille = sel && (
    <>
      <div className="veil" onClick={() => ouvrir(null)}></div>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t(sel.titre)}>
        <div className="grab"></div>
        <i className="cl14-mk"></i>
        <div className="row" style={{ alignItems: 'flex-start', gap: '14px' }}>
          <span className="cl14-fi" style={{ width: '104px', height: '104px' }}>
            <Dessin id={sel.dessin} />
          </span>
          <div className="grow">
            <div className="cl14-sheet-h" style={{ fontSize: '18px' }}>
              {t(sel.titre)}
              {variante(sel.p) ? ' · ' + t(variante(sel.p)!) : ''}
            </div>
            <div className="mt6 cl14-po">
              <span className="price big">
                {F(sel.prix)}
                <small>{t(' F')}</small>
              </span>{' '}
              <s className="was">{F(sel.avant)} F</s> <span className="off">−{remise(sel)}&nbsp;%</span>
            </div>
          </div>
        </div>
        <div className="card flat mt14">
          <div className="kv">
            <span className="k">{t('Prix pratiqué avant l’offre')}</span>
            <span className="v ">{F(sel.avant)} F</span>
          </div>
          <div className="kv">
            <span className="k">{t('Tu économises')}</span>
            <span className="v ">{F(sel.avant - sel.prix)} F</span>
          </div>
          <div className="kv">
            <span className="k">{t('Fin de l’offre')}</span>
            <span className="v ">
              {finEn(sel.fin, now, t, tf).replace(/^Fin /, '').replace(/^Ends /, '')} ({tf('encore {d}', { d: encore(sel.fin - now) })})
            </span>
          </div>
          <div className="kv">
            <span className="k">{t('Stock à ce prix')}</span>
            <span className="v ">{sel.stock}</span>
          </div>
          <div className="kv">
            <span className="k">{tf('Retrait au {r}', { r: t(relais) })}</span>
            <span className="v ">{sel.livraison ? '+ ' + F(sel.livraison) + ' F' : t('offert')}</span>
          </div>
        </div>
        <div className="btns">
          <button type="button" className={'btn primary' + (sel.stock ? '' : ' off')} onClick={() => sel.stock && ajouter(sel)}>
            <span>{sel.stock ? tf('Ajouter au panier · {m} F', { m: F(sel.prix) }) : t('Épuisé à ce prix')}</span>
          </button>
        </div>
        <div className="btns">
          <Link to={chemin('fiche', { p: sel.p })} className="btn secondary">
            <span>{t('Voir la fiche')}</span>
          </Link>
        </div>
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Si l’offre se termine avant ton paiement, le panier te montre le prix habituel avant de payer.')}</span>
        </div>
        <div className="btns">
          <button type="button" className="btn ghost" onClick={() => ouvrir(null)}>
            <span>{t('Fermer')}</span>
          </button>
        </div>
      </div>
    </>
  )
  return (
    <Ecran route="ventes-flash" gabarit="catalogue" avant={<Styles id="1c3d953197" />} fixes={feuille || undefined}>
      <Styles id="a623237236" />
      <Styles id="0b0ccec1e3" />
      <section className="fd-top">
        <span className="wm" aria-hidden="true">
          <Icone nom="zap" taille={110} style={{ fill: 'currentColor' }} />
        </span>
        <div className="k">{tf('OFFRES LIMITÉES · {r}', { r: t(relais).toUpperCase() })}</div>
        <h1>{t('Promotions du moment')}</h1>
        <div className="fd-cd blv-tuiles" data-s={prochaine} data-urgence={urgenceDe(prochaine)} role="timer">
          <span className="b">
            <b className="h"><Chiffres texte={deux(Math.floor(prochaine / 3600))} /></b>
            <small>{t('HEURES')}</small>
          </span>
          <span className="sep">:</span>
          <span className="b">
            <b className="m"><Chiffres texte={deux(Math.floor((prochaine % 3600) / 60))} /></b>
            <small>{t('MIN')}</small>
          </span>
          <span className="sep">:</span>
          <span className="b">
            <b className="s"><Chiffres texte={deux(prochaine % 60)} /></b>
            <small>{t('SEC')}</small>
          </span>
          <span className="lb">
            {t('Fin de la')}
            <br />
            {t('prochaine offre')}
          </span>
        </div>
      </section>
      <div className="fd-info">
        <Icone nom="gift" taille={20} style={{ flexShrink: '0' }} />
        <span>
          <b>{t('Retrait offert dès 30 000 F d’achat')}</b>
          {tf('Au {r}, en dessous : 900 F.', { r: t(relais) })}
        </span>
      </div>
      {message && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>
            {message} <Link to={chemin('panier')}>{t('Voir le panier')}</Link>
          </div>
        </div>
      )}
      <section className="fd-panel">
        <div className="fd-ph">
          <h2>
            <Icone nom="zap" taille={20} style={{ fill: 'currentColor' }} />
            {t('Flash Deals')}
          </h2>
          <span className="pl">
            <Icone nom="clock" taille={13} />
            {t('Fin dans ')}
            <Chrono secondes={prochaine} />
          </span>
        </div>
        <div className="fd-rail">
          {enCours.map((o) => (
            <Link key={o.p} to={`?offre=${o.p}`} replace className="fd-c">
              <span className="im">
                <Dessin id={o.dessin} />
                <i className="fd-b">−{remise(o)}&nbsp;%</i>
                {coeurIcone(o.p)}
              </span>
              <span className="tx">
                <span className="n">{t(o.titre)}</span>
                <span className="fd-pr">
                  <b>{F(o.prix)}&nbsp;F</b>
                  <s>{F(o.avant)}&nbsp;F</s>
                </span>
                <span className="fd-bar" title={t('Temps restant sur 48 h')}>
                  <i style={{ width: `${Math.max(2, Math.min(100, Math.round(((o.fin - now) / (48 * H)) * 100)))}%` }}></i>
                </span>
                <span className="fd-tm">
                  <Icone nom="timer" taille={12} />
                  {tf('Encore {d} · {n} en stock', { d: encore(o.fin - now), n: o.stock })}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <div className="fd-sec">
        <Icone nom="flame" taille={18} style={{ color: 'var(--or-txt)' }} />
        <h2>{t('Tous les Flash Deals')}</h2>
        <span>{tf('{n} offres', { n: enCours.length })}</span>
      </div>
      <div className="chips mt14 dx-filt">
        <a href={chemin('ventes-flash')} className={'chip' + (!u ? ' on' : '')} aria-pressed={!u} onClick={(e) => (e.preventDefault(), setU(''))}>
          {t('Tout voir')}
        </a>
        {universEnCours.map((x) => (
          <a key={x} href={chemin('ventes-flash')} className={'chip' + (u === x ? ' on' : '')} aria-pressed={u === x} onClick={(e) => (e.preventDefault(), setU(x))}>
            {t(UNIVERS.find((y) => y.id === x)?.titre ?? x)}
          </a>
        ))}
      </div>
      <div className="fd-grid mt12">
        {enCours
          .filter((o) => !u || o.univers === u)
          .map((o) => (
            <div key={o.p} className="fd-g">
              <Link to={`?offre=${o.p}`} replace>
                <span className="im">
                  <Dessin id={o.dessin} />
                  <i className="fd-b">−{remise(o)}&nbsp;%</i>
                  {coeurIcone(o.p)}
                  <span className="ov">
                    <Icone nom="timer" taille={12} />
                    {finEn(o.fin, now, t, tf)}
                  </span>
                </span>
                <span className="tx">
                  <span className="n">{t(o.titre)}</span>
                  <span className="fd-pr">
                    <b>{F(o.prix)}&nbsp;F</b>
                    <s>{F(o.avant)}&nbsp;F</s>
                  </span>
                </span>
              </Link>
              <a href={chemin('ventes-flash', { offre: o.p })} className={'ad' + (o.stock ? '' : ' off')} aria-label={tf('Ajouter au panier : {p}', { p: t(o.titre) })} onClick={(e) => (o.stock ? ajouter(o, e) : e.preventDefault())}>
                <Icone nom="shopping-cart" taille={15} />
                {t(o.stock ? 'Ajouter' : 'Épuisé')}
              </a>
            </div>
          ))}
      </div>
      <Link to={chemin('promotions')} className="pm-flash" style={{ marginTop: '12px' }}>
        <Icone nom="percent" taille={18} style={{ color: 'var(--or-txt)' }} />
        <span className="grow">
          <b>{t('Voir toutes les promotions')}</b>
          {tf(' · {n} produits en promo', { n: promos })}
        </span>
        <Icone nom="chevron-right" taille={16} />
      </Link>
      {aVenir.length > 0 && (
        <>
          <div className="sec bar">
            <h2>{t('Bientôt')}</h2>
          </div>
          {aVenir.map((o) => (
            <div key={o.p} className="card ">
              <div className="fd-end">
                <span className="th">
                  <Dessin id={o.dessin} />
                </span>
                <div className="grow">
                  <div className="t14 b7">{t(o.titre)}</div>
                  <div className="mt4">
                    <span className="price">
                      {F(o.prix)}
                      <small>{t(' F')}</small>
                    </span>{' '}
                    <s className="t12 c3">{F(o.avant)} F</s>
                  </div>
                  <div className="t12 c3 mt4">
                    <Icone nom="clock" taille={13} style={{ verticalAlign: '-2px' }} /> {finEn(o.debut, now, t, tf).replace('Fin', t('Début'))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      {finies.length > 0 && (
        <>
          <div className="sec bar">
            <h2>{t('Terminée aujourd’hui')}</h2>
          </div>
          {finies.map((o) => (
            <div key={o.p} className="card ">
              <div className="fd-end">
                <span className="th">
                  <Dessin id={o.dessin} />
                </span>
                <div className="grow">
                  <div className="t14 b7 c3">{t(o.titre)}</div>
                  <div className="mt4">
                    <span className="price">
                      {F(o.avant)}
                      <small>{t(' F')}</small>
                    </span>
                  </div>
                  <div className="t12 c3 mt4">
                    <Icone nom="circle-check" taille={13} style={{ verticalAlign: '-2px' }} /> {tf('Terminée à {h} · prix habituel', { h: `${new Date(o.fin + H).getUTCHours()} h` })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      {alerte}
      {honnetes}
    </Ecran>
  )
}
