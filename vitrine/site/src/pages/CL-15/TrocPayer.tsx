// Écran « Ton téléphone neuf » (CL-15 ; EX-04), forme d'origine du prototype rendue réelle (DP-54) : la reprise
// confirmée (?id=…) : le neuf (dessin, variante, retrait au relais), le récapitulatif (prix livré du neuf moins la
// reprise payée par le reconditionneur), payer la différence en Mobile Money (argent bloqué jusqu'au retrait) ;
// une commande normale. Payée : la commande.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { PayerMomo } from '../../composants/PayerMomo'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { pageTroc, useTrocs } from './Commun'
import { EtapesTroc, FfTroc } from './Troc'

export function TrocPayer() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const [d, recharger] = useTrocs()
  const [pr, setPr] = useState<Produit | null>(null)
  const tr = d ? (d.liste.find((x) => x.id === params.get('id')) ?? d.liste.find((x) => x.etat === 'confirme')) : undefined
  const p = tr?.p
  useEffect(() => {
    if (p) source.produit(p).then(setPr)
  }, [p])
  if (!d) return null
  if (!tr) return <Navigate to={chemin('troc')} replace />
  if (tr.etat !== 'confirme' && tr.etat !== 'paye') return <Navigate to={chemin(pageTroc(tr), { id: tr.id })} replace />
  const montant = tr.prixLivre - (tr.valeur ?? 0)
  return (
    <Ecran gabarit="colonnes" route="troc-payer" sousTitre={tr.id}>
      <Colonne>
      <Styles id="ddcb0e469a" />
      <EtapesTroc n={4} />
      <FfTroc />
      <div className="pg">
        <h1 className="pg-t">{t('Ton téléphone neuf')}</h1>
        <p className="pg-s">{t('La reprise est confirmée : tu paies la différence, puis tu retires ton neuf au relais.')}</p>
      </div>
      <div className="card ">
        <div className="row">
          <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
            {pr?.dessins[0] && <Dessin id={pr.dessins[0]} />}
          </span>
          <div className="grow">
            <div className="t15 b8" style={{ lineHeight: '1.3' }}>
              {t(tr.titre)}
            </div>
            <div className="t13 c3 mt4">{pr?.variante ? tf('{v} · retrait offert au {r}', { v: t(pr.variante), r: t(tr.relais) }) : tf('Retrait offert au {r}', { r: t(tr.relais) })}</div>
          </div>
        </div>
      </div>
      </Colonne>
      <Aside titre="Récapitulatif">
      <div className="card cl15-sum">
        <div className="cl15-k o">{t('Récapitulatif')}</div>
        <div className="cl15-r">
          <span className="lb">{t('Prix livré du neuf')}</span>
          <span className="v">{F(tr.prixLivre)}&nbsp;F</span>
        </div>
        <div className="cl15-r">
          <span className="lb">{tf('Reprise confirmée du {m}', { m: t(tr.modeleNom) })}</span>
          <span className="v g">−{F(tr.valeur ?? 0)}&nbsp;F</span>
        </div>
        <div className="cl15-tot">
          <span className="l">{t('Montant à payer')}</span>
          <span className="rt">
            <span className="price">
              {F(montant)}
              <small>{t(' F')}</small>
            </span>
          </span>
        </div>
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('La reprise est payée par le reconditionneur partenaire.')}</span>
        </div>
      </div>
      {tr.etat === 'paye' ? (
        <>
          <div className="note green">
            <Icone nom="circle-check" taille={18} />
            <div>{tf('Payé. Commande {ref} : ton code de retrait arrive quand le téléphone est au relais.', { ref: tr.ref ?? '' })}</div>
          </div>
          {tr.ref && (
            <div className="btns">
              <Link to={chemin('commande', { ref: tr.ref })} className="btn primary">
                <span>{t('Voir la commande')}</span>
              </Link>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="card green cl15-box">
            <span className="bi">
              <Icone nom="shield-check" taille={20} />
            </span>
            <div className="grow">
              <b className="bt">{t('Ton argent reste bloqué jusqu’à ton retrait')}</b>
              <p>{t('Le vendeur n’est payé qu’après.')}</p>
            </div>
          </div>
          <PayerMomo montant={montant} texte={tf('Payer {m} F', { m: F(montant) })} payer={async (m) => (await source.payerTroc(tr.id, m), recharger())} />
          <div className="cl15-fine">{t('Commande normale : ton code de retrait arrive quand le téléphone est au relais.')}</div>
        </>
      )}
      </Aside>
    </Ecran>
  )
}
