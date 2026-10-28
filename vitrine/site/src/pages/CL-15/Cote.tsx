// Écran « Mettre de côté » (CL-15 ; EX-03), forme d'origine du prototype rendue réelle (DP-54) : pour un produit
// (?p=…), la page du produit (titre, variante, prix) et la feuille « Mettre de côté » : prix livré au relais,
// acompte (20 % au moins), rythme (toutes les 2 semaines ou chaque mois) avec le nombre de versements, leur montant
// et la date de fin calculés, réservation chez le vendeur, puis le plan. Sous 20 000 F livré : la feuille « Mise de
// côté possible dès 20 000 F ». Sans produit : tes mises de côté (en cours, payées, annulées).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { COTE, planCote, type Rythme } from '../../donnees/cote'
import { calculer, type Classe } from '../../donnees/frais'
import { source, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { paye, prochain, titreCote, useCotes, VignetteCote } from './Commun'

export function Cote() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const p = params.get('p')
  const [d] = useCotes()
  const [pr, setPr] = useState<Produit | null | undefined>(p ? undefined : null)
  const [relais, setRelais] = useState<string | null>(null)
  const [rythme, setRythme] = useState<Rythme>('2sem')
  // Dès 1024, sans produit, la barre de titre nomme la liste (« Mises de côté », sous Mon compte) au lieu de
  // « Produit » ; avec un produit, la feuille « Mettre de côté » posée sous la fiche.
  const grand = useDes('tab-l')
  useEffect(() => {
    if (p) source.produit(p).then(setPr)
    source.relaisListe().then((r) => setRelais(r.habituel))
  }, [p])
  if (!d || pr === undefined) return null
  const bandeau = !INTERRUPTEURS_DU_LANCEMENT['FF-EX03'] && (
    <div className="cl15-ff">
      <span className="cl15-pill">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl15-ex">{t('EX-03')}</span>
    </div>
  )

  // Sans produit : tes mises de côté.
  if (!pr) {
    const enCours = d.liste.filter((c) => c.etat === 'en_cours')
    return (
      <Ecran route="cote" titre={grand ? 'Mises de côté' : undefined} ariane="compte">
        <Styles id="ddcb0e469a" />
        {bandeau}
        <div className="pg">
          <h1 className="pg-t">{t('Mes mises de côté')}</h1>
          <p className="pg-s">{t('Réserve un article avec un acompte, puis paie en plusieurs fois. Sans intérêts, sans frais. Ce n’est pas un crédit : rien n’est remis avant le dernier versement.')}</p>
        </div>
        {d.liste.map((c) => (
          <Link key={c.id} to={chemin(c.etat === 'payee' ? 'cote-fini' : 'cote-suivre', { id: c.id })} className="card " style={{ display: 'block', color: 'inherit' }}>
            <div className="row">
              <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
                <VignetteCote c={c} />
              </span>
              <div className="grow">
                <div className="t15 b8" style={{ lineHeight: '1.3' }}>
                  {titreCote(c, t, tf)}
                </div>
                <div className="t13 c3 mt4">{c.etat === 'annulee' ? t('Annulée') : c.etat === 'payee' ? t('Payée en entier') : tf('{p} F payés sur {t} F', { p: F(paye(c)), t: F(c.prixLivre) })}</div>
                {c.etat === 'en_cours' && prochain(c) && <div className="t13 c3 mt4">{tf('Prochain versement : {m} F le {d}', { m: F(prochain(c)!.du), d: jourSeul(prochain(c)!.le, langue) })}</div>}
              </div>
              <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </div>
          </Link>
        ))}
        {!enCours.length && (
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Aucune mise de côté en cours. Sur une fiche produit de 20 000 F et plus, touche « Mettre de côté ».')}</span>
          </div>
        )}
        <Link to={chemin('rentree')} className="cl15-inf" style={{ color: 'inherit' }}>
          <Icone nom="backpack" taille={17} />
          <span className="grow">{t('Une liste de rentrée de 20 000 F et plus se met aussi de côté, en entier, avec des versements finis avant la rentrée.')}</span>
          <Icone nom="chevron-right" taille={17} />
        </Link>
        <div className="btns">
          <Link to={chemin('categories')} className="btn secondary">
            <span>{t('Découvrir les produits')}</span>
          </Link>
        </div>
      </Ecran>
    )
  }

  const fr = calculer('relais', [{ boutique: pr.vendeur.boutique, zone: pr.vendeur.zone, articles: [{ prix: pr.prix, quantite: 1, classe: pr.classe as Classe }] }])
  const prixLivre = fr.total
  const fermer = () => naviguer(chemin('fiche', { p: pr.p }))
  // La page du produit, sous la feuille.
  const page = (
    <>
      <Styles id="ddcb0e469a" />
      {bandeau}
      <div className="pg">
        <h1 className="pg-t">{t(pr.titre)}</h1>
      </div>
      <div className="card ">
        <div className="row">
          <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
            <Dessin id={pr.dessins[0] ?? ''} />
          </span>
          <div className="grow">
            <div className="t15 b8" style={{ lineHeight: '1.3' }}>
              {t(pr.titre)}
            </div>
            {pr.variante && <div className="t13 c3 mt4">{t(pr.variante)}</div>}
          </div>
          <span className="price">
            {F(pr.prix)}
            <small>{t(' F')}</small>
          </span>
        </div>
      </div>
    </>
  )

  // Sous 20 000 F livré : pas de mise de côté.
  if (prixLivre < COTE.minimum)
    return (
      <Ecran
        route="cote"
        titre={grand ? 'Mettre de côté' : undefined}
        fixes={
          <>
            <div className="veil" onClick={fermer}></div>
            <div className="sheet" role="dialog" aria-modal="true" aria-label={t('Mettre de côté')} data-forme="large">
              <div className="grab"></div>
              <div className="empty" style={{ padding: '6px 6px 0' }}>
                <div className="ei">
                  <Icone nom="piggy-bank" taille={26} />
                </div>
                <h3>{tf('Mise de côté possible dès {m} F', { m: F(COTE.minimum) })}</h3>
                <p>{tf('{p} coûte {m} F livré : il se paie en une fois.', { p: t(pr.titre), m: F(prixLivre) })}</p>
              </div>
              <div className="btns">
                <Link to={chemin('fiche', { p: pr.p })} className="btn secondary">
                  <span>{t('Compris')}</span>
                </Link>
              </div>
            </div>
          </>
        }
      >
        {page}
      </Ecran>
    )

  const plans = (['2sem', 'mois'] as const).map((r) => ({ r, v: planCote(prixLivre, r, d.maintenant) }))
  // Blocs de la feuille, rangés en deux colonnes dès 1024 (modale large, § 5.13) : le choix à gauche ; le
  // récapitulatif, le bouton et la note à droite. Sur téléphone, l'ordre d'origine.
  const tete = (
    <>
      <h3 className="cl15-sht">{t('Mettre de côté')}</h3>
      <p className="cl15-shs">{tf('Tu réserves {p} avec un acompte, puis tu paies en plusieurs fois. Sans intérêts, sans frais.', { p: t(pr.titre) })}</p>
    </>
  )
  const somme = (
    <>
      <div className="card cl15-sum flat">
        <div className="cl15-r">
          <span className="lb">{relais ? tf('Prix livré au {r}', { r: t(relais) }) : t('Prix livré au relais')}</span>
          <span className="v">{F(prixLivre)} F</span>
        </div>
        <div className="cl15-tot">
          <span className="l">{t('Acompte aujourd’hui · 20 % au moins')}</span>
          <span className="rt">
            <span className="price">
              {F(plans[0].v[0].du)}
              <small>{t(' F')}</small>
            </span>
          </span>
        </div>
      </div>
    </>
  )
  const choix = (
    <>
      {plans.map(({ r, v }) => (
        <a key={r} href="#" role="radio" aria-checked={rythme === r} className={'radio' + (rythme === r ? ' on' : '')} onClick={(e) => (e.preventDefault(), setRythme(r))}>
          <span className="rd"></span>
          <span className="grow">
            <span className="rt" style={{ display: 'block' }}>
              {t(r === '2sem' ? 'Toutes les 2 semaines' : 'Chaque mois')}
            </span>
            <span className="rs" style={{ display: 'block' }}>
              {tf(v.length - 1 > 1 ? '{n} versements de {m} F · fin le {d}' : '{n} versement de {m} F · fin le {d}', { n: v.length - 1, m: F(v[1].du), d: jourSeul(v[v.length - 1].le, langue) })}
            </span>
          </span>
        </a>
      ))}
      <div className="hint-l">
        <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Réservé chez le vendeur jusqu’à la fin : 60 jours au plus. Remis au relais une fois tout payé.')}</span>
      </div>
    </>
  )
  const fin = (
    <>
      <div className="btns">
        <Link to={chemin('cote-plan', { p: pr.p, rythme })} className="btn primary">
          <span>{t('Voir le plan')}</span>
        </Link>
      </div>
      <div className="cl15-fine">{t('Ce n’est pas un crédit : rien n’est remis avant le dernier versement.')}</div>
    </>
  )
  return (
    <Ecran
      route="cote"
      titre={grand ? 'Mettre de côté' : undefined}
      fixes={
        <>
          <div className="veil" onClick={fermer}></div>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t('Mettre de côté')} data-forme="large">
            <div className="grab"></div>
            {grand ? (
              <div className="g5-sh">
                <div className="g5-sh-g">
                  {tete}
                  {choix}
                </div>
                <div className="g5-sh-d">
                  {somme}
                  {fin}
                </div>
              </div>
            ) : (
              <>
                {tete}
                {somme}
                {choix}
                {fin}
              </>
            )}
          </div>
        </>
      }
    >
      {page}
    </Ecran>
  )
}
