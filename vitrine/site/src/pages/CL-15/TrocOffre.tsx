// Écran « Reprise estimée » (CL-15 ; EX-04), forme d'origine du prototype rendue réelle (DP-54) : la fourchette
// d'estimation selon le modèle et l'état déclarés (?p=…&modele=…&e=…), le récapitulatif (prix livré du neuf, reprise
// estimée, montant à payer estimé) ; rien n'est payé avant la valeur confirmée ; les étapes au relais habituel ;
// « Déposer mon téléphone » crée la reprise et son code de dépôt.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type Produit } from '../../donnees/source'
import { estimer, MODELES_REPRISE, type EtatDeclare } from '../../donnees/troc'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { EtapesTroc, FfTroc, prixLivreNeuf } from './Troc'

export function TrocOffre() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const session = useSession()
  // Dès 1024 px : comment ça se passe à gauche ; l’estimation, le récapitulatif et le bouton à droite (§ 5.13).
  const grand = useDes('tab-l')
  const [pr, setPr] = useState<Produit | null | undefined>(undefined)
  const p = params.get('p') ?? 'camon30'
  const modele = params.get('modele') ?? 'camon20'
  const [a, ecran, b, coque] = (params.get('e') ?? '1.intact.1.bon').split('.')
  const declare: EtatDeclare = { allume: a === '1', ecran: (ecran as EtatDeclare['ecran']) || 'intact', batterie: b === '1', coque: (coque as EtatDeclare['coque']) || 'bon', compteRetire: true, codeRetire: true }
  useEffect(() => {
    source.produit(p).then(setPr)
  }, [p])
  if (pr === undefined) return null
  const est = estimer(modele, declare)
  if (!pr || !est)
    return (
      <Ecran route="troc-offre">
        <Styles id="ddcb0e469a" />
        <EtapesTroc n={1} />
        <div className="card mt12">
          <div className="empty">
            <h3>{t('Estimation impossible')}</h3>
            <div className="btns">
              <Link to={chemin('troc')} className="btn primary">
                <span>{t('Revenir à la reprise')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const prixLivre = prixLivreNeuf(pr)
  const nom = MODELES_REPRISE.find((m) => m.id === modele)?.nom ?? modele
  const relais = session.relais?.nom ?? 'Relais Mvog-Ada'
  const estimation1 = (
    <>
    <div className="card or cl15-pc">
      <div className="cl15-k">{tf('Reprise estimée · {m}', { m: t(nom) })}</div>
      <div className="cl15-pb">
        <b className="o">
          {tf('{a} à {b}', { a: F(est.min), b: F(est.max) })}
          <small>{t('F')}</small>
        </b>
      </div>
      <p className="cl15-p">{t('Estimation du reconditionneur partenaire d’après le modèle et l’état que tu as déclarés. La valeur exacte est confirmée à l’inspection.')}</p>
    </div>
    <div className="card cl15-sum">
      <div className="cl15-k o">{t('Récapitulatif')}</div>
      <div className="cl15-r">
        <span className="lb">{tf('{p} · prix livré', { p: t(pr.titre) + (pr.variante ? ' · ' + t(pr.variante) : '') })}</span>
        <span className="v">{F(prixLivre)}&nbsp;F</span>
      </div>
      <div className="cl15-r">
        <span className="lb">{t('Reprise estimée')}</span>
        <span className="v g">{tf('−{a} à −{b} F', { a: F(est.min), b: F(est.max) })}</span>
      </div>
      <div className="cl15-tot">
        <span className="l">{t('Montant à payer estimé')}</span>
        <span className="rt">
          <span className="rng">{tf('{a} à {b} F', { a: F(prixLivre - est.max), b: F(prixLivre - est.min) })}</span>
        </span>
      </div>
      <div className="hint-l">
        <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Tu ne paies rien avant la valeur confirmée.')}</span>
      </div>
    </div>
    </>
  )
  const estimation2 = (
    <>
    <div className="btns">
      <button type="button" className="btn primary" onClick={async () => naviguer(chemin('troc-depot', { id: (await source.creerTroc({ p, modele, declare })).id }), { replace: true })}>
        <span>{t('Déposer mon téléphone')}</span>
      </button>
    </div>
    <div className="cl15-fine">{t('BelivaY n’achète pas de téléphone d’occasion : la reprise est payée par le reconditionneur partenaire.')}</div>
    </>
  )
  return (
    <Ecran gabarit="colonnes" route="troc-offre">
      <Colonne>
      <Styles id="ddcb0e469a" />
      <EtapesTroc n={1} />
      <FfTroc />
      {!grand && estimation1}
      <div className="card info cl15-how">
        <b className="bt">{t('Comment ça se passe')}</b>
        <div className="st">
          <span className="n">1</span>
          <span>
            <b>{tf('Tu déposes ton téléphone au {r}', { r: t(relais) })}</b>
            <small>{t('Avec ta pièce d’identité ; le gérant vérifie l’IMEI')}</small>
          </span>
        </div>
        <div className="st">
          <span className="n">2</span>
          <span>
            <b>{t('Inspection en 48 h au plus')}</b>
            <small>{t('Valeur confirmée et données effacées, avec certificat')}</small>
          </span>
        </div>
        <div className="st">
          <span className="n">3</span>
          <span>
            <b>{t('Tu paies le montant confirmé')}</b>
            <small>{t('Puis tu retires ton neuf au relais, comme une commande')}</small>
          </span>
        </div>
      </div>
      <details className="more">
        <summary>
          <Icone nom="scan-line" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Si l’inspection trouve un écart')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Le reconditionneur te fait une contre-offre et t’en donne le motif : état constaté différent, pièce manquante, ou prix du marché qui a baissé, avec les photos du constat.')}</p>
          <p>
            <b>{t('Tu choisis')}</b>
            {t(' : accepter, refuser et récupérer ton téléphone gratuitement au relais, ou contester ; l’équipe BelivaY répond sous 48 h.')}
          </p>
          <p>{t('Un téléphone encore lié à un compte ou signalé volé est refusé, sans frais pour toi.')}</p>
        </div>
      </details>
      {!grand && estimation2}
      </Colonne>
      {grand && (
        <Aside titre="Reprise estimée">
          {estimation1}
          {estimation2}
        </Aside>
      )}
    </Ecran>
  )
}
