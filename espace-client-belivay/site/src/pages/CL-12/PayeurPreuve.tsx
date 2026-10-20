// Écran « Suivi du cadeau » (CL-12), forme d'origine du prototype rendue réelle (DP-54) : ce que voit le proche qui
// a payé (?id=panier), lu dans la commande : payé, préparé, au relais, retiré. Retiré : la notification reçue sur
// son téléphone, puis la preuve de retrait (jour, heure, relais, avec son code). Avant : le suivi, le reçu envoyé
// par e-mail (repli des notifications), ce qui arrive si le vendeur n'a plus l'article. Le code reste au client ;
// un remboursement reviendrait sur la carte du payeur.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import img_0718fddbf299_png from '../../assets/prototype/0718fddbf299.png'
import img_be926f70d2b8_png from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { PiedWeb } from '../../composants/PiedWeb'
import { Aside, Colonne, Zone } from '../../composants/Gabarits'
import { useColonnes } from '../CL-09/Commun'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient, type PanierPartage } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, dateLongue, heureSeule } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { EURO } from './Diaspora'

const DOLLAR = 603.5

export function PayeurPreuve() {
  const { t, tf, langue, setLangue } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const [pp, setPp] = useState<PanierPartage | null | undefined>(undefined)
  const [c, setC] = useState<CommandeClient | null>(null)
  const lg = useColonnes()
  useEffect(() => {
    source.panierPartage(id).then(async (p) => {
      setPp(p)
      if (p?.ref) setC((await source.commandeClient(p.ref))?.commande ?? null)
    })
  }, [id])
  if (pp === undefined) return null
  const safari = (
    <div className="cl12-safari glass">
      <Icone nom="lock" taille={15} />
      <span>{t('belivay.com')}</span>
    </div>
  )
  const entete = (
    <div className="cl12-wh">
      <img src={img_be926f70d2b8_png} alt="BelivaY" />
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
  if (!pp || !pp.ref || !pp.payeur)
    return (
      <Ecran route="payeur-preuve" fixes={safari}>
        {entete}
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="gift" taille={26} />
            </div>
            <h3>{t('Pas encore de cadeau à suivre')}</h3>
            <p>{t('Le suivi commence une fois le panier payé.')}</p>
            {pp && (
              <div className="btns">
                <Link to={chemin('payeur', { id: pp.id })} className="btn primary">
                  <span>{t('Payer ce panier')}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </Ecran>
    )
  const py = pp.payeur
  const enDevise = py.devise === 'EUR' ? (pp.total / EURO).toFixed(2).replace('.', ',') + ' €' : '$' + (pp.total / DOLLAR).toFixed(2)
  const etapes = [
    { titre: 'Payé', le: py.le, sous: tf('Carte {c}', { c: py.carte }) },
    { titre: 'Le vendeur prépare le colis', le: c?.etapes[1]?.le ?? null, sous: t('Emballé et scellé devant le vendeur.') },
    { titre: tf('Au {r}', { r: t(pp.relais) }), le: c?.arriveeLe ?? null, sous: tf('{p} reçoit son code de retrait — toi, jamais.', { p: pp.prenom }) },
    { titre: tf('Retiré par {p}', { p: pp.prenom }), le: c?.retireeLe ?? null, sous: t('Tu recevras la preuve de retrait.') },
  ]
  const cur = etapes.findIndex((x) => !x.le)
  const tl = (
    <div className="card">
      <div className="tl">
        {etapes.map((e, i) => (
          <div key={i} className={'ti ' + (e.le ? 'done' : cur === i ? 'cur' : '')}>
            <div className="tt">{t(e.titre)}</div>
            <div className="td">{e.le ? dateA(e.le, langue) + (i === 3 ? t(', heure de Yaoundé.') : '') : e.sous}</div>
          </div>
        ))}
      </div>
    </div>
  )
  const retireeLe = c?.retireeLe ?? null

  if (retireeLe)
    return (
      <Ecran route="payeur-preuve" sousTitre={pp.ref} fixes={safari}>
        <div className="cl12-cap">
          <Icone nom="smartphone" taille={15} />
          <span>{tf('Sur le téléphone de {p}', { p: py.prenom })}</span>
        </div>
        <div className="lock cl12-lock mt8">
          <div className="lt">{heureSeule(retireeLe, langue)}</div>
          <div className="ld">{dateLongue(retireeLe, langue)}</div>
          <div className="push">
            <span className="pi">
              <img src={img_0718fddbf299_png} alt="" />
            </span>
            <div className="grow">
              <div className="row" style={{ gap: '6px' }}>
                <span className="pt grow">{t('Cadeau retiré')}</span>
                <span className="pw">{heureSeule(retireeLe, langue)}</span>
              </div>
              <div className="pb">{tf('{p} a retiré son colis le {d} au {r} (heure de Yaoundé).', { p: pp.prenom, d: dateA(retireeLe, langue), r: t(pp.relais) })}</div>
            </div>
          </div>
        </div>
        <div className="cl12-cap">
          <Icone nom="globe" taille={15} />
          <span>{t('En touchant la notification')}</span>
        </div>
        {entete}
        <div className="hero green">
          <div className="hk">{t('Preuve de retrait')}</div>
          <div className="cl12-bigt">{tf('{p} a son cadeau', { p: pp.prenom })}</div>
          <div className="hs">{tf('Retiré le {d} au {r}, avec son code.', { d: dateA(retireeLe, langue), r: t(pp.relais) })}</div>
        </div>
        {tl}
        <div className="card ">
          <div className="b8 t15">{t('Et après ?')}</div>
          <p className="t13 c2" style={{ margin: '6px 0 0', lineHeight: '1.5' }}>
            {tf('{p} a 7 jours pour signaler un problème. Un remboursement éventuel reviendrait sur ta carte {c}.', { p: pp.prenom, c: py.carte })}
          </p>
        </div>
      </Ecran>
    )

  return (
    <Ecran route="payeur-preuve" sousTitre={pp.ref} fixes={safari} gabarit="web" largeur={lg.largeur}>
      {/* Grands écrans (§ 4.7, 5.10) : les étapes du cadeau à gauche, le reçu envoyé par e-mail à droite. */}
      <Zone nom="haut">
      {entete}
      <div className="pg">
        <h1 className="pg-t">{t('Suivi du cadeau')}</h1>
        <p className="pg-s">
          <span className="nw">{tf('{ref}.', { ref: pp.ref })}</span>
          {t(' Tu n’as rien à faire : nous te prévenons à chaque étape.')}
        </p>
      </div>
      </Zone>
      <Colonne>{tl}</Colonne>
      <Aside titre={t('Le reçu envoyé par e-mail')}>
      <div className="cl12-cap">
        <Icone nom="mail" taille={15} />
        <span>{t('Le reçu envoyé par e-mail')}</span>
      </div>
      <div className="card cl12-mail mt8">
        <div className="mh">
          {tf('De : BelivaY · À : {e}', { e: py.email })}
          <br />
          {dateA(py.le, langue)}
        </div>
        <div className="ms">{tf('Paiement confirmé · ton cadeau pour {p}', { p: pp.prenom })}</div>
        <div className="hr"></div>
        <p>{tf('Bonjour {p},', { p: py.prenom })}</p>
        <p>
          {t('Ton paiement de ')}
          <b>
            {F(pp.total)}&nbsp;F ({enDevise})
          </b>
          {tf(' est confirmé. Le colis de {p} part au {r}.', { p: pp.prenom, r: t(pp.relais) })}
        </p>
        <p>{tf('Tu recevras la preuve de son retrait. Le code de retrait est pour {p} seule.', { p: pp.prenom })}</p>
        <p className="t12 c3" style={{ margin: '10px 0 0' }}>
          {tf('Commande {ref} · carte {c}', { ref: pp.ref, c: py.carte })}
        </p>
      </div>
      <div className="hint-l">
        <Icone nom="bell-ring" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Si les notifications sont autorisées, le même message arrive d’abord en notification ; l’e-mail sert de repli.')}</span>
      </div>
      <div className="hint-l">
        <Icone nom="rotate-ccw" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('{p} a 7 jours après le retrait pour signaler un problème. Un remboursement éventuel reviendrait sur ta carte {c}.', { p: pp.prenom, c: py.carte })}</span>
      </div>
      </Aside>
      <Zone nom="bas">
      <details className="more">
        <summary>
          <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Et si le vendeur n’a plus l’article ?')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Un autre vendeur certifié le prépare au même prix. S’il n’y en a pas, tu es remboursé sur ta carte, le jour même.')}</p>
          <p>{t('BelivaY essaie au plus deux autres vendeurs avant de te rembourser.')}</p>
        </div>
      </details>
      <details className="more">
        <summary>
          <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{tf('Et si {p} ne retire pas son colis ?', { p: pp.prenom })}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{tf('{p} reçoit des rappels. Sans retrait, le colis repart au vendeur et tu es remboursé sur ta carte, moins la garde due au relais : jamais plus que ce que tu as payé.', { p: pp.prenom })}</p>
        </div>
      </details>
      <div className="links">
        <Link to={chemin('faq', { t: 'diaspora' })}>{t('Questions sur le paiement depuis l’étranger')}</Link>
      </div>
      <PiedWeb />
      </Zone>
    </Ecran>
  )
}
