// Créer une campagne en trois gestes (AJ-P, DP-59) :
// 1. le produit — éligibilité affichée (stock, Trust Score, litiges en cours) ; un produit non éligible ne se choisit pas ;
// 2. l'emplacement et ses réglages — sponsorisé recherche / catégories (enchère ≥ plancher, budget du jour), « À la
//    une » / carrousel (à la semaine), Boost 24 h / 7 j, candidature à une vente flash sur sélection (remise ≥ 10 %,
//    « vous gardez » recalculé avec la commission majorée) ;
// 3. l'aperçu côté client (étiquette « Sponsorisé »), l'estimation, le solde après, la confirmation.
// Le calcul vient de la source (même calcul qu'à la confirmation). Adresses : ?p=<offre> (fiche produit, Promotions),
// ?type=flash|sponsorise|une|boost.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Campagne, DemandeCampagne, Emplacement, Estimation, ProduitAnnoncable, ProduitPub, ReglesPub } from '../../donnees/domaines/publicite'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { ApercuClient, Bouton, Chargement, EcranAJP, Erreur, ICONE_EMPLACEMENT, NOM_EMPLACEMENT, texteRefus, useEnLigne, useF } from './commun'

const ROUTE = 'publicite_nouvelle'
const RAISON: Record<string, string> = { pas_en_vente: 'pas en vente', rupture: 'en rupture', score: 'Trust Score trop bas', litige: 'litige en cours' }
const SOUS: Record<ProduitPub, [Emplacement, string][]> = {
  sponsorise: [
    ['recherche', 'Dans la recherche'],
    ['categories', 'Dans les catégories'],
  ],
  une: [
    ['une', 'À la une'],
    ['carrousel', 'Carrousel de l’accueil'],
  ],
  boost: [
    ['boost_24h', '24 heures'],
    ['boost_7j', '7 jours'],
  ],
  flash: [['flash', 'Vente flash']],
}

function Etapes({ etape, aller }: { etape: number; aller: (e: number) => void }) {
  const { t } = usePreferences()
  return (
    <nav className="ajp-pas" aria-label={t('Étapes')}>
      {['Produit', 'Emplacement', 'Confirmation'].map((x, i) => (
        <a
          key={x}
          role="button"
          tabIndex={i + 1 < etape ? 0 : -1}
          aria-current={i + 1 === etape ? 'step' : undefined}
          aria-disabled={i + 1 >= etape || undefined}
          className={i + 1 === etape ? 'on' : i + 1 < etape ? 'fait' : ''}
          onClick={() => i + 1 < etape && aller(i + 1)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && i + 1 < etape && (e.preventDefault(), aller(i + 1))}
        >
          <i></i>
          {`${i + 1}. ${t(x)}`}
        </a>
      ))}
    </nav>
  )
}

function ChoixProduit({ produits, choisi, choisir }: { produits: ProduitAnnoncable[]; choisi: string; choisir: (id: string) => void }) {
  const { t, tf } = usePreferences()
  const f = useF()
  return (
    <div className="ajp-choix deux" role="radiogroup" aria-label={t('Produit')}>
      {produits.map((p) => {
        const ok = p.raisons.length === 0
        return (
          <button key={p.offreId} type="button" role="radio" className="ajp-opt" data-offre={p.offreId} aria-checked={choisi === p.offreId} aria-disabled={!ok || undefined} onClick={() => ok && choisir(p.offreId)}>
            <Vignette nom={p.dessin} taille={44} />
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="t14 b8 ajp-ell" style={{ display: 'block' }}>{`${p.titre} · ${t(p.variante)}`}</span>
              <span className="t12 c3" style={{ display: 'block' }}>{f(p.prix)}</span>
              <span className="ajp-crit">
                <span className={p.stock > 0 ? '' : 'non'}>{tf('Stock {n}', { n: p.stock })}</span>
                <span className={p.raisons.includes('score') ? 'non' : ''}>{tf('Trust Score {s}', { s: String(p.trustScore).replace('.', ',') })}</span>
                <span className={p.litiges ? 'non' : ''}>{p.litiges ? tf('{n} litige(s) en cours', { n: p.litiges }) : t('Aucun litige')}</span>
              </span>
              {!ok && <span className="t12 cr b7" style={{ display: 'block', marginTop: '4px' }}>{tf('Non éligible : {r}', { r: p.raisons.map((r) => t(RAISON[r])).join(', ') })}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Reglages({ regles, d, changer, maintenant, selections }: { regles: ReglesPub; d: DemandeCampagne; changer: (x: Partial<DemandeCampagne>) => void; maintenant: number; selections: number[] }) {
  const { t, tf, langue } = usePreferences()
  const prod: ProduitPub = d.emplacement === 'recherche' || d.emplacement === 'categories' ? 'sponsorise' : d.emplacement === 'une' || d.emplacement === 'carrousel' ? 'une' : d.emplacement === 'flash' ? 'flash' : 'boost'
  const defaut: Record<ProduitPub, Partial<DemandeCampagne>> = {
    sponsorise: { emplacement: 'recherche', enchere: regles.clicPlancher * 2, budgetJour: regles.budgetJourMin * 2 },
    une: { emplacement: 'une', semaines: 1, mode: 'fixe' },
    boost: { emplacement: 'boost_24h' },
    flash: { emplacement: 'flash', remisePourCent: regles.flashRemiseMin, debut: selections[0] },
  }
  const types: [ProduitPub, string, string][] = [
    ['sponsorise', 'Sponsorisé', tf('Recherche ou catégories, payé au clic réel (dès {p} F).', { p: F(regles.clicPlancher) })],
    ['une', 'À la une', tf('Accueil du client, à la semaine (dès {p} F).', { p: F(regles.uneSemaine) })],
    ['boost', 'Boost', tf('Remonte dans les listes : {a} F 24 h, {b} F 7 jours.', { a: F(regles.boost24h), b: F(regles.boost7j) })],
    ['flash', 'Vente flash sur sélection', tf('Candidature : remise de {r} % au moins, commission +{p} points pendant la vente.', { r: regles.flashRemiseMin, p: regles.flashMajorationPoints })],
  ]
  const lundi = (() => {
    const j = (new Date(maintenant + 3600_000).getUTCDay() + 6) % 7
    const minuit = maintenant - ((maintenant + 3600_000) % 86_400_000)
    return minuit + (7 - j) * 86_400_000
  })()
  return (
    <>
      <div className="ajp-choix deux" role="radiogroup" aria-label={t('Type de campagne')}>
        {types.map(([id, nom, sous]) => (
          <button key={id} type="button" role="radio" className="ajp-opt" data-type={id} aria-checked={prod === id} onClick={() => prod !== id && changer({ enchere: undefined, budgetJour: undefined, mode: undefined, semaines: undefined, remisePourCent: undefined, debut: undefined, ...defaut[id] })}>
            <span className="ic">
              <Icone nom={ICONE_EMPLACEMENT[SOUS[id][0][0]]} taille={18} />
            </span>
            <span className="grow">
              <span className="t14 b8" style={{ display: 'block' }}>{t(nom)}</span>
              <span className="t12 c3" style={{ display: 'block', lineHeight: 1.4 }}>{sous}</span>
            </span>
          </button>
        ))}
      </div>
      {SOUS[prod].length > 1 && (
        <div className="chips mt12" role="radiogroup" aria-label={t('Emplacement')}>
          {SOUS[prod].map(([e, nom]) => (
            <button key={e} type="button" role="radio" aria-checked={d.emplacement === e} className={'chip' + (d.emplacement === e ? ' on' : '')} onClick={() => changer({ emplacement: e, ...(d.mode === 'enchere' ? { enchere: e === 'carrousel' ? regles.carrouselEnchereMin : regles.uneEnchereMin } : {}) })}>
              {t(nom)}
            </button>
          ))}
        </div>
      )}
      {prod === 'sponsorise' && (
        <div className="aja-ligne-ch">
          <div className="fld">
            <label htmlFor="ajp-enchere">{t('Prix par clic (F)')}</label>
            <div className="inp">
              <input id="ajp-enchere" className="ajp-champ" inputMode="numeric" value={String(d.enchere ?? '')} onChange={(x) => changer({ enchere: Number(x.target.value.replace(/\D/g, '').slice(0, 6)) })} />
            </div>
          </div>
          <div className="fld">
            <label htmlFor="ajp-budget">{t('Budget par jour (F)')}</label>
            <div className="inp">
              <input id="ajp-budget" className="ajp-champ" inputMode="numeric" value={String(d.budgetJour ?? '')} onChange={(x) => changer({ budgetJour: Number(x.target.value.replace(/\D/g, '').slice(0, 7)) })} />
            </div>
          </div>
        </div>
      )}
      {prod === 'une' && (
        <div className="chips mt8" role="radiogroup" aria-label={t('Mode d’achat')}>
          {(
            [
              ['fixe', tf('Tarif fixe · {p} F', { p: F(d.emplacement === 'carrousel' ? regles.carrouselSemaine : regles.uneSemaine) })],
              ['enchere', tf('Enchère de la semaine · dès {p} F', { p: F(d.emplacement === 'carrousel' ? regles.carrouselEnchereMin : regles.uneEnchereMin) })],
            ] as const
          ).map(([m, nom]) => (
            <button key={m} type="button" role="radio" data-mode={m} aria-checked={(d.mode ?? 'fixe') === m} className={'chip' + ((d.mode ?? 'fixe') === m ? ' on' : '')} onClick={() => changer(m === 'enchere' ? { mode: m, semaines: 1, debut: undefined, enchere: d.emplacement === 'carrousel' ? regles.carrouselEnchereMin : regles.uneEnchereMin } : { mode: m, enchere: undefined })}>
              {nom}
            </button>
          ))}
        </div>
      )}
      {prod === 'une' && d.mode === 'enchere' && (
        <>
          <div className="fld">
            <label htmlFor="ajp-enchere-semaine">{tf('Votre enchère pour la semaine du {j} (F)', { j: jourLong(lundi, langue) })}</label>
            <div className="inp">
              <input id="ajp-enchere-semaine" className="ajp-champ" inputMode="numeric" value={String(d.enchere ?? '')} onChange={(x) => changer({ enchere: Number(x.target.value.replace(/\D/g, '').slice(0, 7)) })} />
            </div>
          </div>
          <p className="t12 c3" style={{ lineHeight: 1.45, margin: 0 }}>
            {t('Les places qui restent vont aux plus hautes enchères, au début de la semaine. Vous payez la meilleure enchère perdante + 1 F, jamais plus que la vôtre ; perdue, rien n’est pris.')}
          </p>
        </>
      )}
      {prod === 'une' && d.mode !== 'enchere' && (
        <>
          <div className="fld" style={{ marginBottom: 0 }}>
            <label>{t('Durée')}</label>
          </div>
          <div className="chips" role="radiogroup" aria-label={t('Durée')}>
            {[1, 2, 3, 4].map((s) => (
              <button key={s} type="button" role="radio" aria-checked={d.semaines === s} className={'chip' + (d.semaines === s ? ' on' : '')} onClick={() => changer({ semaines: s })}>
                {tf(s > 1 ? '{n} semaines' : '{n} semaine', { n: s })}
              </button>
            ))}
          </div>
          <div className="chips mt8" role="radiogroup" aria-label={t('Début')}>
            {[
              [undefined, t('Dès maintenant')],
              [lundi, jourLong(lundi, langue)],
            ].map(([v, nom]) => (
              <button key={String(v)} type="button" role="radio" aria-checked={d.debut === v} className={'chip' + (d.debut === v ? ' on' : '')} onClick={() => changer({ debut: v as number | undefined })}>
                {nom as string}
              </button>
            ))}
          </div>
        </>
      )}
      {prod === 'flash' && (
        <>
          <div className="fld" style={{ marginBottom: 0 }}>
            <label>{t('Sélection BelivaY')}</label>
          </div>
          <div className="chips" role="radiogroup" aria-label={t('Sélection BelivaY')}>
            {selections.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={d.debut === s} className={'chip' + (d.debut === s ? ' on' : '')} onClick={() => changer({ debut: s })}>
                {echeance(s, maintenant, langue)}
              </button>
            ))}
          </div>
          <div className="fld">
            <label htmlFor="ajp-remise">{t('Remise (%)')}</label>
            <div className="inp">
              <input id="ajp-remise" className="ajp-champ" inputMode="numeric" value={String(d.remisePourCent ?? '')} onChange={(x) => changer({ remisePourCent: Number(x.target.value.replace(/\D/g, '').slice(0, 2)) })} />
              <span className="t14 b7 c3">%</span>
            </div>
          </div>
          <div className="chips">
            {[regles.flashRemiseMin, 15, 20, 25].filter((x, i, l) => x >= regles.flashRemiseMin && l.indexOf(x) === i).map((x) => (
              <button key={x} type="button" className={'chip' + (d.remisePourCent === x ? ' on' : '')} onClick={() => changer({ remisePourCent: x })}>
                {`${x} %`}
              </button>
            ))}
          </div>
          <p className="t12 c3 mt8" style={{ lineHeight: 1.45 }}>
            {t('BelivaY choisit les produits de la sélection et répond sous 24 h. Rien n’est pris sur votre solde : la commission est majorée sur les seules ventes faites pendant la vente flash.')}
          </p>
        </>
      )}
    </>
  )
}

function Resume({ d, e, p, regles }: { d: DemandeCampagne; e: Estimation; p: ProduitAnnoncable; regles: ReglesPub }) {
  const { t, tf } = usePreferences()
  const f = useF()
  const sponsorise = d.emplacement === 'recherche' || d.emplacement === 'categories'
  const plage = ([a, b]: [number, number]) => (a === b ? F(a) : `${F(a)} – ${F(b)}`)
  return (
    <div className="card">
      <h3 className="b8 t15" style={{ margin: 0 }}>
        {t('Estimation')}
      </h3>
      <div className="kv mt8">
        <span className="k">{t(sponsorise ? 'Vues par jour' : 'Vues sur la période')}</span>
        <span className="v">{plage(e.impressionsEstimees)}</span>
      </div>
      <div className="kv">
        <span className="k">{t(sponsorise ? 'Clics par jour' : 'Clics sur la période')}</span>
        <span className="v">{plage(e.clicsEstimes)}</span>
      </div>
      {sponsorise ? (
        <>
          <div className="kv">
            <span className="k">{t('Payé au plus par jour')}</span>
            <span className="v">{f(e.plafondJour ?? 0)}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Prix du clic')}</span>
            <span className="v">{e.coutClic === null ? '—' : tf('{c} F (second prix + 1 F)', { c: F(e.coutClic) })}</span>
          </div>
          <div className="t12 c3 mt4">{tf('{n} clics payés au plus par jour ; un client qui clique deux fois le même jour ne compte qu’une fois.', { n: e.clicsJourMax ?? 0 })}</div>
        </>
      ) : e.flash ? (
        <div className="keep" style={{ display: 'block', marginTop: '12px' }}>
          <div className="row" style={{ gap: '8px' }}>
            <span className="grow kl">{t('Vous gardez par vente')}</span>
            <span className="kv2" data-garde={e.flash.gardeFlash}>
              {f(e.flash.gardeFlash)}
            </span>
          </div>
          <div className="t12 c2" style={{ marginTop: '4px', lineHeight: '1.45' }}>
            {tf('Prix flash {p} F au lieu de {a} F (−{r} %). Commission {c} F : {n} F sur le prix remisé, plus {m} F ({pts} points) pendant la vente. Sans la vente : {g} F.', { p: F(e.flash.prixPromo), a: F(p.prix), r: e.flash.remiseAffichee, c: F(e.flash.commission), n: F(e.flash.commissionNormale), m: F(e.flash.majoration), pts: regles.flashMajorationPoints, g: F(e.flash.gardeAvant) })}
          </div>
        </div>
      ) : e.enchereMax !== null ? (
        <>
          <div className="kv">
            <span className="k">{t('À payer maintenant')}</span>
            <span className="v b8">{f(0)}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Payé si elle gagne, au plus')}</span>
            <span className="v">{f(e.enchereMax)}</span>
          </div>
          {e.placesRestantes !== null && (
            <div className="kv">
              <span className="k">{t('Places mises aux enchères')}</span>
              <span className="v">{String(e.placesRestantes)}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="kv">
            <span className="k">{t('À payer maintenant')}</span>
            <span className="v b8">{f(e.aPayer)}</span>
          </div>
          {e.placesRestantes !== null && (
            <div className="kv">
              <span className="k">{t('Places libres cette semaine')}</span>
              <span className="v">{String(e.placesRestantes)}</span>
            </div>
          )}
        </>
      )}
      {!e.flash && (
        <div className="kv">
          <span className="k">{t('Solde après')}</span>
          <span className={'v' + (e.solde - (sponsorise ? (e.plafondJour ?? 0) : e.aPayer) < 0 ? ' cr' : '')}>{sponsorise ? tf('{s} F, moins les clics', { s: F(e.solde) }) : f(e.solde - e.aPayer)}</span>
        </div>
      )}
    </div>
  )
}

export default function NouvelleCampagne() {
  const { t, tf } = usePreferences()
  const maintenant = useHorloge()
  const enLigne = useEnLigne()
  const [params] = useSearchParams()
  const lecture = useLecture(() => Promise.all([source.publicite.tableau(), source.publicite.produits()]), [])
  const [etape, setEtape] = useState(1)
  const [d, setD] = useState<DemandeCampagne | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [creee, setCreee] = useState<Campagne | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const est = useLecture<Estimation | null>(() => (d && etape === 3 ? source.publicite.estimer(d) : Promise.resolve(null)), [JSON.stringify(d), etape])
  if (lecture.erreur) return <Erreur route={ROUTE} erreur={lecture.erreur} relire={lecture.relire} />
  if (!lecture.donnees) return <Chargement route={ROUTE} />
  const [tb, produits] = lecture.donnees
  const regles = tb.regles
  const typeDemande = params.get('type') as ProduitPub | null
  const premier = produits.find((p) => p.offreId === params.get('p') && !p.raisons.length) ?? produits.find((p) => !p.raisons.length) ?? null
  const dem: DemandeCampagne = d ?? {
    offreId: premier?.offreId ?? '',
    ...(typeDemande === 'flash' ? { emplacement: 'flash' as Emplacement, remisePourCent: regles.flashRemiseMin, debut: tb.selectionsFlash[0] } : typeDemande === 'une' ? { emplacement: 'une' as Emplacement, semaines: 1 } : typeDemande === 'boost' ? { emplacement: 'boost_24h' as Emplacement } : { emplacement: 'recherche' as Emplacement, enchere: regles.clicPlancher * 2, budgetJour: regles.budgetJourMin * 2 }),
  }
  const changer = (x: Partial<DemandeCampagne>) => setD((cur) => ({ ...(cur ?? dem), ...x }))
  const p = produits.find((x) => x.offreId === dem.offreId) ?? null
  const e = est.donnees
  const confirmer = async () => {
    if (!e || e.refus || envoi) return
    setEnvoi(true)
    setErreur(null)
    const r = await source.publicite.creer(dem)
    setEnvoi(false)
    if (!r.ok) {
      jouer('erreur')
      setErreur(texteRefus(r.raison, regles, tf))
      return
    }
    jouer('paiement')
    setCreee(r.campagne)
  }
  if (creee)
    return (
      <EcranAJP route={ROUTE}>
        <div className="card blv-succes ajp-entree" style={{ marginTop: '18px' }} data-creee={creee.id}>
          <div className="empty">
            <div className="ei" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
              <Icone nom="circle-check" taille={26} />
            </div>
            <h3>{t(creee.etat === 'candidature' ? (creee.mode === 'enchere' ? 'Enchère envoyée' : 'Candidature envoyée') : creee.etat === 'programmee' ? 'Campagne programmée' : 'Campagne en ligne')}</h3>
            <p>
              {creee.mode === 'enchere' && creee.forfait === null
                ? t('Attribution au début de la semaine : vous payez la meilleure enchère perdante + 1 F, jamais plus que la vôtre. Perdue : rien n’est pris.')
                : creee.etat === 'candidature'
                ? t('BelivaY vous répond sous 24 h. Rien n’est facturé tant que la vente flash n’a pas eu lieu.')
                : creee.forfait
                  ? tf('{m} F pris sur votre solde. Les heures non diffusées vous seront remboursées.', { m: F(creee.forfait) })
                  : t('Vous ne payez que les clics réels, dans la limite du budget du jour.')}
            </p>
          </div>
          <div className="split2">
            <Bouton classe="secondary" icone="plus" onClick={() => (setCreee(null), setD(null), setEtape(1))}>
              {t('Une autre')}
            </Bouton>
            <Bouton classe="primary" icone="megaphone" vers={chemin('publicite', { o: creee.etat === 'en_cours' ? 'en_cours' : 'programmees' })}>
              {t('Mes campagnes')}
            </Bouton>
          </div>
        </div>
      </EcranAJP>
    )
  return (
    <EcranAJP route={ROUTE}>
      <div className="pg" style={{ paddingTop: '14px' }}>
        <h1 className="pg-t">{t('Nouvelle campagne')}</h1>
        <p className="pg-s">{tf('Solde publicitaire : {s} F.', { s: F(tb.solde) })}</p>
      </div>
      <Etapes etape={etape} aller={setEtape} />

      {etape === 1 && (
        <div className="card ajp-entree" key="e1">
          <h2 className="b8 t17" style={{ margin: 0 }}>
            {t('Quel produit mettre en avant ?')}
          </h2>
          <p className="t13 c3 mt4">{tf('Seuil de qualité : du stock, un Trust Score de {s} au moins, aucun litige en cours.', { s: regles.scoreMin })}</p>
          {produits.length === 0 ? (
            <div className="empty">
              <h3>{t('Aucun produit en vente')}</h3>
            </div>
          ) : (
            <ChoixProduit produits={produits} choisi={dem.offreId} choisir={(offreId) => changer({ offreId })} />
          )}
          <div className="mt14">
            <Bouton classe="primary" icone="arrow-right" inactif={!p || p.raisons.length > 0} onClick={() => (setD(dem), setEtape(2))}>
              {t('Continuer')}
            </Bouton>
          </div>
        </div>
      )}

      {etape === 2 && p && (
        <div className="card ajp-entree" key="e2">
          <h2 className="b8 t17" style={{ margin: 0 }}>
            {t('Où le montrer ?')}
          </h2>
          <p className="t13 c3 mt4">{`${p.titre} · ${t(p.variante)}`}</p>
          <Reglages regles={regles} d={dem} changer={changer} maintenant={maintenant} selections={tb.selectionsFlash} />
          <div className="split2 mt14">
            <Bouton classe="secondary" onClick={() => setEtape(1)}>
              {t('Retour')}
            </Bouton>
            <Bouton classe="primary" icone="eye" onClick={() => setEtape(3)}>
              {t('Voir l’aperçu')}
            </Bouton>
          </div>
        </div>
      )}

      {etape === 3 && p && (
        <>
          <div className="ajp-deux">
            <div className="card ajp-entree">
              <h2 className="b8 t17" style={{ margin: 0 }}>
                {t('Ce que voit le client')}
              </h2>
              <p className="t13 c3 mt4">{t(NOM_EMPLACEMENT[dem.emplacement])}</p>
              <div className="mt8">
                <ApercuClient c={{ emplacement: dem.emplacement, titre: p.titre, variante: p.variante, dessin: p.dessin, prix: p.prix, prixPromo: e?.flash?.prixPromo ?? null, remisePourCent: dem.remisePourCent ?? null }} apercu={e?.apercu ?? []} regles={regles} />
              </div>
            </div>
            {e ? <Resume d={dem} e={e} p={p} regles={regles} /> : <div className="card ajp-attente">{t('Chargement…')}</div>}
          </div>
          {e?.refus && (
            <div className="note red" role="alert">
              <Icone nom="circle-alert" taille={16} />
              <div>
                {texteRefus(e.refus, regles, tf)}
                {e.refus === 'solde_insuffisant' && (
                  <>
                    {' '}
                    <Link to={chemin('publicite_solde', { recharger: 1 })}>{t('Recharger')}</Link>
                  </>
                )}
              </div>
            </div>
          )}
          {erreur && (
            <div className="note red" role="alert">
              <Icone nom="circle-alert" taille={16} />
              <div>{erreur}</div>
            </div>
          )}
          <div className="split2 mt14">
            <Bouton classe="secondary" onClick={() => setEtape(2)}>
              {t('Modifier')}
            </Bouton>
            <Bouton classe="primary" icone={dem.emplacement === 'flash' ? 'zap' : 'circle-check'} inactif={!e || !!e.refus || envoi || !enLigne} onClick={() => void confirmer()}>
              {dem.emplacement === 'flash' ? t('Envoyer ma candidature') : dem.mode === 'enchere' ? t('Envoyer mon enchère') : e && e.aPayer > 0 ? tf('Payer {m} F et lancer', { m: F(e.aPayer) }) : t('Lancer la campagne')}
            </Bouton>
          </div>
          {!enLigne && <p className="t13 cr mt6">{t('Pas de connexion : réessayez dans un moment.')}</p>}
        </>
      )}
    </EcranAJP>
  )
}
