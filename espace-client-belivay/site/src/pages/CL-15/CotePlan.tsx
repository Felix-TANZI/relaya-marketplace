// Écran « Ton plan de versements » (CL-15 ; EX-03), forme d'origine du prototype rendue réelle (DP-54) : le produit
// (?p=…, rythme ?rythme=2sem|mois), chaque versement daté (acompte aujourd'hui), le total égal au prix livré, la
// réservation chez le vendeur jusqu'au dernier versement, les rappels, la grâce de 7 jours et le forfait
// d'annulation exact ; le numéro Mobile Money, puis payer l'acompte (validé sur le téléphone) crée la mise de côté.
// Liste de rentrée entière (?l=…&exclus=…&eq=…) : la liste compte comme un seul achat ; le rythme se choisit ici ;
// le dernier versement tombe une semaine au moins avant la rentrée ; la commande groupée part au dernier versement.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { PayerMomo } from '../../composants/PayerMomo'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { COTE, forfaitCote, planCote, planCoteRentree, type Rythme } from '../../donnees/cote'
import { calculer, type Classe } from '../../donnees/frais'
import { source, type DonneesRentree, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { calculListe, useCotes, useRentree } from './Commun'

export function CotePlan() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const p = params.get('p') ?? 'camon30'
  const rythme = (params.get('rythme') === 'mois' ? 'mois' : '2sem') as Rythme
  const [d] = useCotes()
  const [r] = useRentree()
  const liste = params.get('l')
  const [pr, setPr] = useState<Produit | null | undefined>(undefined)
  useEffect(() => {
    source.produit(p).then(setPr)
  }, [p])
  if (liste) return r ? <PlanListe r={r} id={liste} rythme={rythme} /> : null
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
  if (!pr)
    return (
      <Ecran route="cote-plan">
        <Styles id="ddcb0e469a" />
        {bandeau}
        <div className="card mt12">
          <div className="empty">
            <div className="ei">
              <Icone nom="search" taille={26} />
            </div>
            <h3>{t('Produit introuvable')}</h3>
            <div className="btns">
              <Link to={chemin('cote')} className="btn primary">
                <span>{t('Mes mises de côté')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const fr = calculer('relais', [{ boutique: pr.vendeur.boutique, zone: pr.vendeur.zone, articles: [{ prix: pr.prix, quantite: 1, classe: pr.classe as Classe }] }])
  const prixLivre = fr.total
  const retrait = prixLivre - pr.prix
  const v = planCote(prixLivre, rythme, d.maintenant)
  const fin = v[v.length - 1].le
  return (
    <Ecran gabarit="colonnes" route="cote-plan">
      <Colonne>
      <Styles id="ddcb0e469a" />
      {bandeau}
      <div className="pg">
        <h1 className="pg-t">{t('Ton plan de versements')}</h1>
        <p className="pg-s">{t('Sans intérêts, sans frais. Le total égale le prix livré.')}</p>
      </div>
      <div className="card ">
        <div className="row">
          <Link to={chemin('fiche', { p: pr.p })} className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }} aria-label={t(pr.titre)}>
            <Dessin id={pr.dessins[0] ?? ''} />
          </Link>
          <div className="grow">
            <div className="t15 b8" style={{ lineHeight: '1.3' }}>
              {t(pr.titre)}
            </div>
            <div className="t13 c3 mt4">
              {[pr.variante ? t(pr.variante) : null, retrait ? tf('+ {m} F de retrait au relais', { m: F(retrait) }) : t('retrait offert')].filter(Boolean).join(' · ')}
            </div>
          </div>
          <span className="price">
            {F(prixLivre)}
            <small>{t(' F')}</small>
          </span>
        </div>
      </div>
      <div className="card cl15-sum">
        <div className="cl15-k o">{t('Tes versements')}</div>
        {v.map((x, i) => (
          <div key={i} className={'cl15-pl ' + (i === 0 ? 'on' : '')}>
            <span className="n">{i + 1}</span>
            <span className="t">
              {i === 0 ? t('Acompte') : tf('Versement {n}', { n: i + 1 })}
              <small>{i === 0 ? t('aujourd’hui') : jourSeul(x.le, langue)}</small>
            </span>
            <span className="v">{F(x.du)} F</span>
          </div>
        ))}
        <div className="cl15-tot">
          <span className="l">{tf('Total des {n} versements', { n: v.length })}</span>
          <span className="price">
            {F(v.reduce((n, x) => n + x.du, 0))}
            <small>{t(' F')}</small>
          </span>
        </div>
        <div className="cl15-ok">
          <Icone nom="check" taille={15} trait={2.6} />
          <span>{t('Égal au prix livré : rien d’autre à payer.')}</span>
        </div>
      </div>
      <div className="card tight">
        <div className="li">
          <span className="ic or">
            <Icone nom="lock" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {tf('Réservé pour toi jusqu’au {d}', { d: jourSeul(fin, langue) })}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Le vendeur garde l’article')}
            </span>
          </span>
        </div>
        <div className="li">
          <span className="ic ">
            <Icone nom="bell" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Rappel 2 jours avant chaque versement')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Puis le jour même')}
            </span>
          </span>
        </div>
      </div>
      <details className="more">
        <summary>
          <Icone nom="calendar-clock" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Un versement manqué, une annulation')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>
            <b>{tf('{n} jours de grâce', { n: COTE.grace })}</b>
            {t(' après chaque échéance, sans frais.')}
          </p>
          <p>
            <b>{t('Annulation possible')}</b>
            {tf(' : tes versements te reviennent, moins un forfait de 5 % du prix, 5 000 F au plus : ici {m} F.', { m: F(forfaitCote(prixLivre)) })}
          </p>
        </div>
      </details>
      </Colonne>
      <Aside titre="Payer l’acompte">
      <PayerMomo
        montant={v[0].du}
        texte={tf('Payer l’acompte · {m} F', { m: F(v[0].du) })}
        payer={async (moyen) => {
          const c = await source.creerMiseDeCote(pr.p, rythme, moyen)
          naviguer(chemin('cote-suivre', { id: c.id }), { replace: true })
        }}
      />
      <div className="cl15-fine">{t('L’article part au relais seulement après le dernier versement.')}</div>
      </Aside>
    </Ecran>
  )
}

// Le plan d'une liste de rentrée entière (RNT-08, CRS-16).
function PlanListe({ r, id, rythme }: { r: DonneesRentree; id: string; rythme: Rythme }) {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const l = r.listes.find((x) => x.id === id)
  const exclus = params.get('exclus')?.split(',').filter(Boolean) ?? []
  const eq = params.get('eq')?.split(',').filter(Boolean) ?? []
  const retour = chemin('rentree-liste', { l: id, ...(exclus.length ? { exclus: exclus.join(',') } : {}), ...(eq.length ? { eq: eq.join(',') } : {}) })
  const c = l ? calculListe(l, exclus, eq) : null
  const plans = c ? (['2sem', 'mois'] as const).map((x) => ({ r: x, v: planCoteRentree(c.total, x, r.maintenant, r.rentreeLe) })).filter((x) => x.v) : []
  const choisi = plans.find((x) => x.r === rythme) ?? plans[0]
  if (!l || !c || !choisi)
    return (
      <Ecran route="cote-plan">
        <Styles id="ddcb0e469a" />
        <div className="card mt12">
          <div className="empty">
            <div className="ei">
              <Icone nom="piggy-bank" taille={26} />
            </div>
            <h3>{t('Cette liste ne peut pas être mise de côté')}</h3>
            <p>{c && c.total < COTE.minimum ? tf('Mise de côté possible dès {m} F pour toute la liste.', { m: F(COTE.minimum) }) : tf('Trop près de la rentrée du {d} : elle se paie en une fois.', { d: jourSeul(r.rentreeLe, langue) })}</p>
            <div className="btns">
              <Link to={l ? retour : chemin('rentree')} className="btn primary">
                <span>{t('Revenir à la liste')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const v = choisi.v!
  const ecole = r.ecoles.find((x) => x.id === l.ecole)
  const fin = v[v.length - 1].le
  return (
    <Ecran gabarit="colonnes" route="cote-plan">
      <Colonne>
      <Styles id="ddcb0e469a" />
      <div className="pg">
        <h1 className="pg-t">{t('Ton plan de versements')}</h1>
        <p className="pg-s">{t('Toute la liste compte comme un seul achat. Sans intérêts, sans frais. Le total égale le prix livré.')}</p>
      </div>
      <div className="card ">
        <div className="row">
          <Link to={retour} className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }} aria-label={tf('Liste {c}', { c: l.classe })}>
            <Icone nom="backpack" taille={26} style={{ color: 'var(--ink-3)' }} />
          </Link>
          <div className="grow">
            <div className="t15 b8" style={{ lineHeight: '1.3' }}>
              {tf('Liste {c} · {n} articles', { c: l.classe, n: c.pris.length })}
            </div>
            <div className="t13 c3 mt4">{[t(ecole?.nom ?? ''), c.livraison ? tf('+ {m} F de livraison au relais', { m: F(c.livraison) }) : t('livraison offerte')].filter(Boolean).join(' · ')}</div>
          </div>
          <span className="price">
            {F(c.total)}
            <small>{t(' F')}</small>
          </span>
        </div>
      </div>
      {plans.map((x) => (
        <a key={x.r} href="#" role="radio" aria-checked={x.r === choisi.r} className={'radio' + (x.r === choisi.r ? ' on' : '')} onClick={(e) => (e.preventDefault(), naviguer(chemin('cote-plan', { l: id, rythme: x.r, ...(exclus.length ? { exclus: exclus.join(',') } : {}), ...(eq.length ? { eq: eq.join(',') } : {}) }), { replace: true }))}>
          <span className="rd"></span>
          <span className="grow">
            <span className="rt" style={{ display: 'block' }}>
              {t(x.r === '2sem' ? 'Toutes les 2 semaines' : 'Chaque mois')}
            </span>
            <span className="rs" style={{ display: 'block' }}>
              {tf(x.v!.length - 1 > 1 ? '{n} versements de {m} F · fin le {d}' : '{n} versement de {m} F · fin le {d}', { n: x.v!.length - 1, m: F(x.v![1].du), d: jourSeul(x.v![x.v!.length - 1].le, langue) })}
            </span>
          </span>
        </a>
      ))}
      {plans.length < 2 && (
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Un versement par mois finirait après le {d} : seul le rythme de 2 semaines tient avant la rentrée.', { d: jourSeul(r.rentreeLe - COTE.avantRentree * 864e5, langue) })}</span>
        </div>
      )}
      <div className="card cl15-sum">
        <div className="cl15-k o">{t('Tes versements')}</div>
        {v.map((x, i) => (
          <div key={i} className={'cl15-pl ' + (i === 0 ? 'on' : '')}>
            <span className="n">{i + 1}</span>
            <span className="t">
              {i === 0 ? t('Acompte') : tf('Versement {n}', { n: i + 1 })}
              <small>{i === 0 ? t('aujourd’hui') : jourSeul(x.le, langue)}</small>
            </span>
            <span className="v">{F(x.du)} F</span>
          </div>
        ))}
        <div className="cl15-tot">
          <span className="l">{tf('Total des {n} versements', { n: v.length })}</span>
          <span className="price">
            {F(v.reduce((n, x) => n + x.du, 0))}
            <small>{t(' F')}</small>
          </span>
        </div>
        <div className="cl15-ok">
          <Icone nom="check" taille={15} trait={2.6} />
          <span>{t('Égal au prix livré : rien d’autre à payer.')}</span>
        </div>
      </div>
      <div className="card tight">
        <div className="li">
          <span className="ic or">
            <Icone nom="school" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {tf('Dernier versement le {d}', { d: jourSeul(fin, langue) })}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {tf('Rentrée le {d} : la liste a le temps d’arriver au relais.', { d: jourSeul(r.rentreeLe, langue) })}
            </span>
          </span>
        </div>
        <div className="li">
          <span className="ic or">
            <Icone nom="lock" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {tf('Réservée pour toi jusqu’au {d}', { d: jourSeul(fin, langue) })}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Chaque boutique garde ses articles ; toute la liste part au dernier versement, avec un seul code de retrait.')}
            </span>
          </span>
        </div>
        <div className="li">
          <span className="ic ">
            <Icone nom="bell" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Rappel 2 jours avant chaque versement')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Puis le jour même')}
            </span>
          </span>
        </div>
      </div>
      <details className="more">
        <summary>
          <Icone nom="calendar-clock" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Un versement manqué, une annulation')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>
            <b>{tf('{n} jours de grâce', { n: COTE.grace })}</b>
            {t(' après chaque échéance, sans frais.')}
          </p>
          <p>
            <b>{t('Annulation possible')}</b>
            {tf(' : tes versements te reviennent, moins un forfait de 5 % du prix, 5 000 F au plus : ici {m} F.', { m: F(forfaitCote(c.total)) })}
          </p>
        </div>
      </details>
      </Colonne>
      <Aside titre="Payer l’acompte">
      <PayerMomo
        montant={v[0].du}
        texte={tf('Payer l’acompte · {m} F', { m: F(v[0].du) })}
        payer={async (moyen) => {
          const m = await source.creerMiseDeCoteListe(l.id, { exclus, equivalents: eq, rythme: choisi.r, moyen })
          naviguer(chemin('cote-suivre', { id: m.id }), { replace: true })
        }}
      />
      <div className="cl15-fine">{t('La liste part au relais seulement après le dernier versement.')}</div>
      </Aside>
    </Ecran>
  )
}
