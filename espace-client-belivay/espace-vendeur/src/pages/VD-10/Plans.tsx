// Le simulateur (VD-10, fig. 8) : repris du prototype (route('plans')), branché sur GET /plans/simulate (domaine
// plans : src/calculs/commission.ts simulerPlans, remise plafonnée au prix du plan, à l'année au prix annuel ÷ 12).
// - Carte nuit « Vos ventes du mois » (VD10-R36) : base du calcul (catégorie · palier), montant, VRAI curseur de 0 à
//   1 000 000 F (une vente de l'article de référence par cran), recalcul après 300 ms d'arrêt.
// - « Vous gardez » Free · Boost · Pro (SIM-02) : le meilleur cerclé de vert, une ligne de lecture sous chacun ; le
//   simulateur dit la vérité, même quand un plan ne vaut pas le coup (SIM-01) ; seuils de remboursement en francs de
//   ventes ; repères repliés dans « Voir le détail ».
// - Le bouton plein suit le meilleur plan : « Rester en Free » → Se faire voir ; sinon l'essai ou le choix du plan.
// - Ajouts : au mois ou à l'année (A-3), « Revenir à mes ventes du mois », nombre de ventes que représente le curseur,
//   retour tactile au passage d'un seuil ; lignes de lecture sans visibilité payante (DP-14 : plus de « mises en avant »).
// - Accès Préparation : réservé au propriétaire.
import { useEffect, useRef, useState } from 'react'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { nomPalier } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Plan } from '../../donnees/communs'
import type { OffrePlan, Simulation } from '../../donnees/domaines/plans'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { Attente, Bouton, HorsLigne, Plus, Segments, SEG_PLANS, useEnLigne, useMontant } from './commun'

function Curseur({ s, valeur, changer }: { s: Simulation; valeur: number; changer: (v: number) => void }) {
  const { t, tf } = usePreferences()
  const montant = useMontant()
  const pc = (valeur / s.max) * 100
  return (
    <div style={{ position: 'relative', height: '28px', marginTop: '10px' }}>
      <div style={{ position: 'absolute', top: '12px', left: '0', right: '0', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,.18)' }}></div>
      <div className="vd10-plein" style={{ position: 'absolute', top: '12px', left: '0', width: `${pc}%`, height: '5px', borderRadius: '3px', background: 'var(--gold-l)' }}></div>
      <input
        className="vd10-curseur"
        type="range"
        min={0}
        max={s.max}
        step={s.pas}
        value={valeur}
        aria-label={t('Vos ventes du mois')}
        aria-valuetext={tf('{v} de ventes', { v: montant(valeur) })}
        onChange={(e) => changer(Number(e.target.value))}
      />
      <div className="vd10-pouce" style={{ position: 'absolute', top: '4px', left: `calc(${pc}% - 11px)`, width: '22px', height: '22px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.4)', pointerEvents: 'none' }}></div>
    </div>
  )
}

function Contenu({ base, offres }: { base: Simulation; offres: OffrePlan[] }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  const enLigne = useEnLigne()
  const [valeur, setValeur] = useState(base.ventes)
  const [facturation, setFacturation] = useState<'mensuelle' | 'annuelle'>('mensuelle')
  const [s, setS] = useState(base)
  const [attente, setAttente] = useState(false)
  const avant = useRef(base.meilleur)
  // Anti-rebond de 300 ms : le serveur recalcule quand le doigt s'arrête (VD10-R36).
  useEffect(() => {
    if (valeur === s.ventes && facturation === s.facturation) return
    setAttente(true)
    const id = setTimeout(() => {
      void source.plans.simuler(valeur, facturation).then((r) => {
        setS(r)
        setAttente(false)
        if (r.meilleur !== avant.current) {
          avant.current = r.meilleur
          jouer('interrupteur')
        }
      })
    }, 300)
    return () => clearTimeout(id)
  }, [valeur, facturation]) // eslint-disable-line react-hooks/exhaustive-deps
  const lecture = (plan: Plan) => {
    if (plan === s.meilleur) return t('Garde le plus')
    if (plan === 'Free') return t('Sans abonnement')
    if (s.rembourse[plan as 'Boost' | 'Pro']) return t('Remboursé : ce qu’il contient est gratuit')
    return t('Pas encore remboursé')
  }
  const meilleurOffre = offres.find((o) => o.plan === s.meilleur)
  const unites = Math.round(valeur / s.pas)
  return (
    <Ecran route="plans">
      <div className="pg">
        <h1 className="pg-t">{t('Le simulateur')}</h1>
        <p className="pg-s">{t('Ce que vous garderiez ce mois-ci avec chaque plan.')}</p>
      </div>
      <Segments items={SEG_PLANS} actif="plans" />
      {!enLigne && <HorsLigne />}
      <div className="hero night">
        <div className="otop">
          <span className="hk">{t('Vos ventes du mois')}</span>
          <span className="pill dk sm" style={{ fontSize: '12px' }}>
            {`${t(s.base.categorie)} · ${nomPalier(s.base.palier, langue)}`}
          </span>
        </div>
        <div className="big">
          {t(F(valeur))}
          <small>{t('FCFA')}</small>
        </div>
        <Curseur s={s} valeur={valeur} changer={setValeur} />
        <div className="row t12" style={{ color: 'rgba(255,255,255,.7)' }}>
          <span className="grow">{t('0')}</span>
          <span>{montant(s.max)}</span>
        </div>
        <div className="hs">
          {unites === 1 ? tf('Soit une vente à {prix} ({titre}).', { titre: s.base.titre, prix: montant(s.base.prix) }) : tf('Soit {n} ventes à {prix} ({titre}).', { n: unites, titre: s.base.titre, prix: montant(s.base.prix) })}
        </div>
        {valeur !== s.ventesDuMois && (
          <button type="button" className="t13 b8" onClick={() => setValeur(s.ventesDuMois)} style={{ marginTop: '8px', minHeight: '44px', padding: '0', background: 'none', border: '0', color: 'var(--gold-l)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Icone nom="rotate-ccw" taille={16} />
            {tf('Revenir à mes ventes du mois ({v})', { v: montant(s.ventesDuMois) })}
          </button>
        )}
      </div>
      <div className="vd10-filtres" role="radiogroup" aria-label={t('Facturation')}>
        <button type="button" role="radio" aria-checked={facturation === 'mensuelle'} className={'chip' + (facturation === 'mensuelle' ? ' on' : '')} onClick={() => setFacturation('mensuelle')}>
          {t('Payé au mois')}
        </button>
        <button type="button" role="radio" aria-checked={facturation === 'annuelle'} className={'chip' + (facturation === 'annuelle' ? ' on' : '')} onClick={() => setFacturation('annuelle')}>
          {t('Payé à l’année')}
        </button>
      </div>
      <div className="kick" style={{ fontSize: '12px', margin: '18px 4px 8px' }}>
        {t('Vous gardez')}
      </div>
      <div className="split3" aria-busy={attente} style={{ opacity: attente ? 0.7 : 1, transition: 'opacity var(--blv-moyen)' }}>
        {(['Free', 'Boost', 'Pro'] as Plan[]).map((plan) => {
          const top = plan === s.meilleur
          return (
            <div key={plan + (top ? s.meilleur : '')} className={'mini' + (top ? ' vd10-gagne' : '')} style={{ boxShadow: top ? '0 0 0 2px var(--green)' : undefined, padding: '12px 6px' }}>
              <div className="mk" style={{ fontSize: '12px' }}>
                {t(plan)}
              </div>
              <div className={'mv ' + (top ? 'cg' : '')} style={{ fontSize: '16px' }}>
                {montant(s.gardes[plan])}
              </div>
              <div className="t12 c3 mt4" style={{ lineHeight: '1.3' }}>
                {lecture(plan)}
              </div>
            </div>
          )
        })}
      </div>
      <div className="note green">
        <Icone nom="badge-check" taille={18} />
        <div>
          <b>{valeur === s.ventesDuMois ? tf('Ce mois-ci, {plan} vous fait garder le plus.', { plan: t(s.meilleur) }) : tf('À {v} de ventes, {plan} vous fait garder le plus.', { v: montant(valeur), plan: t(s.meilleur) })}</b>
          {t(' Le simulateur vous le dit, même quand un plan ne vaut pas le coup.')}
        </div>
      </div>
      <div className="card">
        <h3>{t('Quand un plan est remboursé')}</h3>
        <p className="t13 c3" style={{ margin: '6px 0 6px', lineHeight: '1.45' }}>
          {t('Au-delà de ces ventes, ce qu’il vous fait garder en plus paie tout son prix.')}
        </p>
        {(['Boost', 'Pro'] as const).map((p) => (
          <div key={p} className="kv">
            <span className="k">{t(p)}</span>
            <span className="v ">{s.seuils[p] !== null ? tf('dès {v} de ventes', { v: montant(s.seuils[p]!) }) : tf('au-delà de {v} de ventes', { v: montant(s.max) })}</span>
          </div>
        ))}
        <Plus plat icone="list" titre={t('Voir le détail')}>
          <table className="tbl">
            <tbody>
              <tr>
                <th style={{ fontSize: '12px' }}>{t('Ventes')}</th>
                {(['Free', 'Boost', 'Pro'] as Plan[]).map((p) => (
                  <th key={p} className="r" style={{ fontSize: '12px' }}>
                    {t(p)}
                  </th>
                ))}
              </tr>
              {s.reperes.map((r) => (
                <tr key={r.ventes}>
                  <td className="b7">{montant(r.ventes)}</td>
                  {(['Free', 'Boost', 'Pro'] as Plan[]).map((p) => (
                    <td key={p} className={'r' + (p === r.meilleur ? ' b8 cg' : '')}>
                      {t(F(r.gardes[p]))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt8">{t('À égalité, le plan le moins cher l’emporte : ce qu’un plan vous rend ne dépasse jamais son prix.')}</p>
          <p>{tf('Calcul pour les {categorie}, palier {palier}, offre de découverte comprise. Le serveur refait le calcul sur vos vraies ventes.', { categorie: t(s.base.categorie).toLowerCase(), palier: nomPalier(s.base.palier, langue) })}</p>
          {s.facturation === 'annuelle' && <p>{t('À l’année, ce que le plan vous rend chaque mois ne dépasse pas son prix annuel divisé par 12.')}</p>}
        </Plus>
      </div>
      <div className="mt16">
        {s.meilleur === 'Free' && !offres.find((o) => o.plan === 'Free')?.actuel ? (
          <Bouton classe="primary" icone="check" vers={chemin('plans_liste')}>
            {t('Revenir à Free')}
          </Bouton>
        ) : s.meilleur === 'Free' || !meilleurOffre ? (
          <Bouton classe="primary" icone="check" vers={chemin('visibilite')}>
            {t('Rester en Free')}
          </Bouton>
        ) : meilleurOffre.actuel ? (
          <Bouton classe="primary" icone="check" vers={chemin('plans_liste')}>
            {tf('Garder {plan}', { plan: s.meilleur })}
          </Bouton>
        ) : (
          <Bouton classe="primary" icone={meilleurOffre.essaiPossible ? 'gift' : 'smartphone'} vers={chemin('plans_liste', { essai: s.meilleur.toLowerCase() })}>
            {meilleurOffre.essaiPossible ? tf('Essayer {plan} un mois offert', { plan: s.meilleur }) : tf('Choisir {plan}', { plan: s.meilleur })}
          </Bouton>
        )}
      </div>
    </Ecran>
  )
}

export default function Plans() {
  const lecture = useLecture(() => Promise.all([source.plans.simuler(), source.plans.plans()]).then(([base, offres]) => ({ base, offres })), [])
  return <Attente route="plans" lecture={lecture}>{(d) => <Contenu base={d.base} offres={d.offres} />}</Attente>
}
