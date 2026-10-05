// Écran « Objectif atteint » (CL-15 ; EX-02), forme d'origine du prototype rendue réelle (DP-54) : le montant
// réuni et quand, la commande passée toute seule au prix figé (numéro, relais et heure de retrait lus dans la
// commande, code de retrait à l'arrivée), le code à confier au bénéficiaire, changer de relais depuis la commande.
// Si le prix a monté de plus de 5 % : l'écart exact, et le choix : compléter la différence (Mobile Money) ou
// rembourser chaque participant ; sans choix avant la date limite, chacun est remboursé.
// Échanges (DP-54) : coche et confettis ; qui paie la livraison et la garantie des participants ; remercier tous les
// participants ; la liste d'envies d'où vient la cotisation.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { PayerMomo } from '../../composants/PayerMomo'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { source, type CommandeClient } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { reuni, useCotisations } from './Commun'
import { Remercier, useEchanges } from '../CL-14/Echanges'

export function CotisationAtteinte() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d, recharger] = useCotisations()
  const [choix, setChoix] = useState<'completer' | 'rembourser'>('completer')
  const [cmd, setCmd] = useState<{ commande: CommandeClient; maintenant: number } | null>(null)
  const [e, rechargerE] = useEchanges()
  const c = d ? (d.liste.find((x) => x.id === params.get('id')) ?? d.liste.find((x) => x.etat === 'atteinte' || x.etat === 'hausse')) : undefined
  useEffect(() => {
    if (c?.ref) source.commandeClient(c.ref).then(setCmd)
  }, [c?.ref])
  if (!d) return null
  if (!c) return <Navigate to={chemin('cotisation')} replace />
  if (c.etat === 'ouverte') return <Navigate to={chemin('cotisation-suivre', { id: c.id })} replace />
  if (c.etat === 'echue' || c.etat === 'remboursee') return <Navigate to={chemin('cotisation-echue', { id: c.id })} replace />
  const bandeau = !INTERRUPTEURS_DU_LANCEMENT['FF-EX02'] && (
    <div className="cl15-ff">
      <span className="cl15-pill">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl15-ex">{t('EX-02')}</span>
    </div>
  )
  const atteintLe = Math.max(...c.participations.map((p) => p.le), c.creeLe)
  const entete = (texte: string) => (
    <div className="card cl15-dn">
      <div className="cl15-dh">
        <span className="cl15-di green blv-succes">
          <Icone nom="check" taille={30} trait={2.2} />
        </span>
        <h2>{t('Objectif atteint')}</h2>
        <div className="s">{quand(atteintLe, d.maintenant, langue).replace(/^./, (x) => x.toUpperCase())}</div>
        <p className="cl15-p">{texte}</p>
      </div>
      <div className="cl15-db">
        <div className="cl15-kv">
          <span className="k">{t('Montant réuni')}</span>
          <span className="v g">
            <span className="price">
              {F(reuni(c))}
              <small>{t(' F')}</small>
            </span>
          </span>
        </div>
      </div>
    </div>
  )

  if (c.etat === 'hausse' && c.hausse)
    return (
      <Ecran route="cotisation-atteinte" gabarit="centre" sousTitre={c.nom}>
        <Styles id="ddcb0e469a" />
        {bandeau}
        {entete(tf(c.participations.length > 1 ? '{n} participations réunies pour {c}.' : '{n} participation réunie pour {c}.', { n: c.participations.length, c: t(c.nom) }))}
        <div className="card amber cl15-box">
          <span className="bi">
            <Icone nom="triangle-alert" taille={20} />
          </span>
          <div className="grow">
            <b className="bt">{tf('Le prix de {p} a augmenté', { p: t(c.titre) })}</b>
            <p>
              {tf('{n} F livré au lieu de {a} F, soit {e} F de plus que le prix figé (+{p} %).', {
                n: F(c.hausse.prix),
                a: F(c.prixLivre),
                e: F(c.hausse.ecart),
                p: ((c.hausse.ecart / c.prixLivre) * 100).toFixed(1).replace('.', ','),
              })}
            </p>
          </div>
        </div>
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('BelivaY prend en charge une hausse de 5 % au plus. Au-delà, c’est toi qui choisis.')}</span>
        </div>
        <div className="sec">
          <h2>{t('Que fait-on ?')}</h2>
        </div>
        <a href="#" role="radio" aria-checked={choix === 'completer'} className={'radio' + (choix === 'completer' ? ' on' : '')} onClick={(e) => (e.preventDefault(), setChoix('completer'))}>
          <span className="rd"></span>
          <span className="grow">
            <span className="rt" style={{ display: 'block' }}>
              {t('Compléter la différence')}
            </span>
            <span className="rs" style={{ display: 'block' }}>
              {tf('{m} F en Mobile Money, puis la commande part', { m: F(c.hausse.ecart) })}
            </span>
          </span>
        </a>
        <a href="#" role="radio" aria-checked={choix === 'rembourser'} className={'radio' + (choix === 'rembourser' ? ' on' : '')} onClick={(e) => (e.preventDefault(), setChoix('rembourser'))}>
          <span className="rd"></span>
          <span className="grow">
            <span className="rt" style={{ display: 'block' }}>
              {t('Rembourser chaque participant')}
            </span>
            <span className="rs" style={{ display: 'block' }}>
              {t('Sur son moyen de paiement, sans frais')}
            </span>
          </span>
        </a>
        {choix === 'completer' ? (
          <PayerMomo montant={c.hausse.ecart} texte={tf('Compléter · {m} F', { m: F(c.hausse.ecart) })} payer={async (m) => (await source.deciderHausse(c.id, 'completer', m), recharger())} />
        ) : (
          <div className="btns">
            <button type="button" className="btn primary" onClick={async () => (await source.deciderHausse(c.id, 'rembourser'), recharger())}>
              <span>{t('Rembourser chaque participant')}</span>
            </button>
          </div>
        )}
        <div className="cl15-fine">{tf('Sans choix avant le {d}, chacun est remboursé.', { d: jourSeul(c.jusqua, langue) })}</div>
      </Ecran>
    )

  const pret = cmd?.commande.pretLe ?? null
  return (
    <Ecran route="cotisation-atteinte" gabarit="centre" sousTitre={c.nom}>
      <Styles id="ddcb0e469a" />
      {bandeau}
      {entete(tf(c.participations.length > 1 ? '{n} participations. Merci à tous : chacun a reçu un message.' : '{n} participation. Merci : un message a été envoyé.', { n: c.participations.length }))}
      <div className="sec">
        <h2>{t('Commande passée automatiquement')}</h2>
      </div>
      <div className="card ">
        <div className="row">
          <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
            <Dessin id={c.dessin} />
          </span>
          <div className="grow">
            <div className="t15 b8" style={{ lineHeight: '1.3' }}>
              {t(c.titre)}
            </div>
            <div className="t13 c3 mt4">{tf('Au prix figé · {m} F livré', { m: F(c.prixLivre) })}</div>
          </div>
        </div>
        {c.ref && (
          <Link to={chemin('commande', { ref: c.ref })} className="kv" style={{ color: 'inherit' }}>
            <span className="k">{t('Commande')}</span>
            <span className="v ">
              {c.ref} <Icone nom="chevron-right" taille={14} />
            </span>
          </Link>
        )}
        <div className="kv">
          <span className="k">{t('Retrait')}</span>
          <span className="v ">{pret ? tf('{r} · dès {q}', { r: t(c.relais), q: quand(pret, cmd!.maintenant, langue) }) : t(c.relais)}</span>
        </div>
        <div className="kv">
          <span className="k">{t('Code de retrait')}</span>
          <span className="v ">{t('dans ton application, à l’arrivée')}</span>
        </div>
        <div className="kv">
          <span className="k">{t('Livraison')}</span>
          <span className="v ">{c.qui === 'destinataire' ? tf('{b} la paie au retrait ({m} F)', { b: c.beneficiaire, m: F(c.frais ?? 0) }) : t('payée par les participants')}</span>
        </div>
        {c.qui === 'destinataire' && <div className="t12 c3 mt6">{tf('Si {b} refuse le colis après l’expédition ou ne le retire pas, la livraison, la garde et le renvoi sont retenus sur le remboursement des participants, au prorata.', { b: c.beneficiaire })}</div>}
        {c.ref && e && <Remercier refCmd={c.ref} pour="tous" merci={e.mercis.find((m) => m.ref === c.ref)} apres={rechargerE} />}
        {c.liste && (
          <div className="links">
            <Link to={chemin('liste-publique', { l: c.liste.code })}>{tf('Voir la liste de {b}', { b: c.beneficiaire })}</Link>
          </div>
        )}
      </div>
      <div className="cl15-inf">
        <Icone nom="share" taille={17} />
        <span>{tf('Tu peux partager le code avec {b} quand le cadeau est au relais : il reçoit son propre code par SMS.', { b: c.beneficiaire })}</span>
      </div>
      {c.ref && (
        <div className="btns">
          <Link to={chemin('code-partage', { ref: c.ref })} className="btn primary">
            <span>{tf('Faire retirer par {b}', { b: c.beneficiaire })}</span>
          </Link>
        </div>
      )}
      <div className="hint-l">
        <Icone nom="map-pin" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Tu peux changer de relais jusqu’à la collecte du cadeau, depuis cette commande dans Mes commandes.')}</span>
      </div>
    </Ecran>
  )
}
