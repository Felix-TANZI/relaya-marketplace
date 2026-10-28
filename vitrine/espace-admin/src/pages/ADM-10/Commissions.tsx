// ADM-P25 · Commissions, grilles et abonnements vendeur (tenu par S2). Structure du prototype gardée (indicateurs,
// onglets Grilles / Abonnements et options / Relevés ; grille en vigueur, cas types, « Ce qui s'applique au taux de la
// grille » ; plans, échecs de prélèvement, options, gain plafonné ; relevés, facture, relevés émis). Contenu selon DP-65
// (v6 D17, QUESTIONS A12) : commission V02 — un taux par catégorie et par palier, sur TOUT le prix, sans tranche ni
// plafond par article — puis +3 / −2 points, découverte × 0,80, plancher MAX(700 F ; 2 %), un seul arrondi ; remise de
// plan Boost / Pro plafonnée au prix du plan ; 1 % Mobile Money retenu sur le versement. « BelivaY ne perd jamais » : une
// vente où le vendeur garderait 0 F ou moins est refusée à la publication. Le vendeur ne voit que ce qu'il garde.
// Options sponsorisées (DP-59) : fonctions d'après lancement, montrées fermées.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { ExportSigne } from '../../composants/ExportSigne'
import { Icone } from '../../composants/Icone'
import { BarresH, Choix, Kpi, Li, Note, Panel, Pill, Table, Tg, exporterPdf } from '../../composants/prototype'
import { REGISTRE } from '../../calculs/registre'
import { chemin } from '../../config/pages'
import type { VendeurCommission } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { useRouteOuverte } from '../../session'
import { Fr, Lu, Mv, useDate } from '../ADM-05/commun'
import { ARGENT, FAMILLES, PALIERS, commission, remiseDePlan, versementVendeur, type Famille, type Palier } from '../../calculs/argent'

type Onglet = 'grilles' | 'abonnements' | 'releves'
const pc = (x: number) => `${String(Math.round(x * 10) / 10).replace('.', ',')} %`

// Cas types recalculés par la règle (les exemples du paquet sont recalculés, QUESTIONS A12).
const CAS: { o: string; v: string; famille: Famille; palier: Palier; prix: number; decouverte: boolean; mic?: boolean }[] = [
  { o: 'ITEL AC52 noir', v: 'Tonton PG · Bronze · offre de découverte', famille: 'telephonie', palier: 'Bronze', prix: 20000, decouverte: true },
  { o: 'Câble USB-C 1 m', v: 'Tonton PG · Bronze · petit prix', famille: 'telephonie', palier: 'Bronze', prix: 3000, decouverte: false },
  { o: 'Ensemble bazin brodé', v: 'Maman Wax Mokolo · Argent', famille: 'mode', palier: 'Argent', prix: 62000, decouverte: false },
  { o: 'Miel de l’Adamaoua · 1 L', v: 'Saveurs du Pays · Bronze · Made in Cameroon', famille: 'supermarche', palier: 'Bronze', prix: 8900, decouverte: true, mic: true },
  { o: 'MacBook Air M2', v: 'Techno Bastos · Or · produit très cher', famille: 'telephonie', palier: 'Or', prix: 455000, decouverte: false },
]

export default function Commissions() {
  const { t, tf } = usePreferences()
  const d = useDate()
  const [p, setP] = useSearchParams()
  const ouvre = useRouteOuverte()
  const l = useLecture(() => source.argent.commissions(), [])
  const onglet = (['abonnements', 'releves'].includes(p.get('s') ?? '') ? p.get('s') : 'grilles') as Onglet
  const [historique, setHistorique] = useState(false)
  const v0 = l.donnees
  const fonctions = useFonctions([
    { verbe: 'Relancer', n: (v0?.vendeurs ?? []).filter((x) => x.echec).length, unite: ['prélèvement échoué', 'prélèvements échoués'], icone: 'rotate-cw', route: 'commissions', params: { s: 'abonnements' }, alerte: true },
    { verbe: 'Revoir', n: (v0?.versions ?? []).filter((x) => x.etat !== 'en_vigueur' && x.etat !== 'remplacee').length, unite: ['version de grille', 'versions de grille'], icone: 'history', onClick: () => setHistorique(true) },
    { verbe: 'Proposer', n: null, unite: ['version', 'versions'], icone: 'square-pen', route: 'parametrage', params: { s: 'simulation' }, droit: 'parametrage', geste: true },
  ])
  return (
    <Ecran
      route="commissions"
      kicker={d.quand(Date.now())}
      fonctions={fonctions}
      actions={
        <>
          <button type="button" className="btn secondary" aria-pressed={historique} onClick={() => (setHistorique((x) => !x), setP({}, { replace: true }))}>
            <Icone nom="history" taille={18} />
            <span>{t('Historique')}</span>
          </button>
          {ouvre('parametrage') && (
            <Link className="btn primary" to={chemin('parametrage')}>
              <Icone nom="square-pen" taille={18} />
              <span>{t('Proposer une version')}</span>
            </Link>
          )}
        </>
      }
    >
      <Lu l={l}>
        {(v) => {
          const ventes = v.vendeurs.reduce((n, x) => n + x.ventes, 0)
          const retenu = v.vendeurs.reduce((n, x) => n + x.retenu, 0)
          const enVigueur = v.versions.find((x) => x.etat === 'en_vigueur')
          return (
            <>
              <div className="g g4">
                <Kpi k={tf('Commissions de {mois}', { mois: v.mois })} v={Fr(retenu).replace(' F', '')} u="F" s={tf('Retenues sur les ventes libérées · volume {m}', { m: Fr(ventes) })} icone="percent" ton="night" />
                <Kpi k={t('Taux effectif moyen')} v={ventes ? pc((retenu / ventes) * 100).replace(' %', '') : '—'} u="%" s={t('Sur tout le prix, sans plafond par article')} icone="trending-down" />
                <Kpi k={t('Plancher')} v={Fr(ARGENT.comMin).replace(' F', '')} u="F" s={tf('ou {p} % du prix, le plus élevé, par commande et vendeur', { p: ARGENT.comMinTaux })} icone="arrow-down-to-line" iton="or" />
                <Kpi k={t('Version en vigueur')} v={enVigueur?.v ?? '—'} s={enVigueur ? t(enVigueur.effet) : ''} icone="git-branch" />
              </div>
              <div style={{ marginTop: 16 }}>
                <Choix
                  forme="tabs"
                  aria={t('Commissions')}
                  actif={onglet}
                  choisir={(o) => setP(o === 'grilles' ? {} : { s: o }, { replace: true })}
                  items={[
                    { id: 'grilles', t: t('Grilles'), icone: 'percent' },
                    { id: 'abonnements', t: t('Abonnements et options'), icone: 'badge-percent', n: v.vendeurs.filter((x) => x.plan !== 'Free').length },
                    { id: 'releves', t: t('Relevés'), icone: 'receipt' },
                  ]}
                />
              </div>
              {historique && <Versions v={v.versions} />}
              {onglet === 'grilles' && <Grilles />}
              {onglet === 'abonnements' && <Abonnements vendeurs={v.vendeurs} />}
              {onglet === 'releves' && <Releves mois={v.mois} vendeurs={v.vendeurs} emis={v.relevesEmis} />}
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}

function Versions({ v }: { v: { v: string; contenu: string; effet: string; par: string; etat: string }[] }) {
  const { t } = usePreferences()
  return (
    <Panel titre={t('Versions de la grille')} icone="history" className="mt16">
      <Table
        cle={(x) => x.v}
        rows={v}
        legende={t('Versions de la grille')}
        cols={[
          { k: 'v', t: t('Version'), main: true, rendu: (x) => <b>{x.v}</b> },
          { k: 'c', t: t('Contenu'), rendu: (x) => x.contenu },
          { k: 'e', t: t('Date d’effet'), rendu: (x) => x.effet },
          { k: 'w', t: t('Demandée · validée'), hideM: true, rendu: (x) => x.par },
          { k: 's', t: t('État'), rendu: (x) => <Pill ton={x.etat === 'en_vigueur' ? 'green' : x.etat === 'annoncee' ? 'violet' : 'ink'} sm dot>{t(x.etat === 'en_vigueur' ? 'En vigueur' : x.etat === 'annoncee' ? 'Annoncée' : 'Remplacée')}</Pill> },
        ]}
      />
    </Panel>
  )
}

function Grilles() {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="mt16">
        <Panel titre={t('Grille v3 en vigueur · taux par catégorie et palier, sur tout le prix')} icone="percent" droite={<Pill ton="green" sm>{t('V02 · DP-65')}</Pill>}>
          <div className="admp-mxw">
            <table className="admp-mx grid">
              <thead>
                <tr>
                  <th>{t('Famille de catégories')}</th>
                  {PALIERS.map((p) => (
                    <th key={p}>{t(p)}</th>
                  ))}
                  <th>{t('Vendeur garde')}</th>
                </tr>
              </thead>
              <tbody>
                {FAMILLES.map((f) => (
                  <tr key={f.id}>
                    <td className="lbl">
                      <b>{t(f.nom)}</b>
                      <span className="t12 c3" style={{ display: 'block', fontWeight: 600 }}>
                        {t(f.exemples)}
                      </span>
                    </td>
                    {PALIERS.map((p) => (
                      <td key={p} className="c admp-rate" style={{ background: `rgba(var(--acc-rgb),${(0.05 + ARGENT.taux[f.id][p] / 60).toFixed(2)})` }}>
                        <b>{pc(ARGENT.taux[f.id][p])}</b>
                      </td>
                    ))}
                    <td className="c">
                      <b className="cg">{`${pc(100 - ARGENT.taux[f.id].Bronze)} à ${pc(100 - ARGENT.taux[f.id].Platine)}`}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row wrap mt12" style={{ gap: 8 }}>
            <Pill ton="ink" icone="layers">
              {tf('{n} familles', { n: FAMILLES.length })}
            </Pill>
            <Pill ton="green" icone="circle-check">
              {t('Sans tranche ni plafond par article')}
            </Pill>
            <Pill ton="violet" icone="git-branch">
              {t('Chaque commande porte sa version')}
            </Pill>
          </div>
          <div className="t12 c3 mt8" style={{ lineHeight: 1.45 }}>
            {t('Le taux de la famille et du palier s’applique à tout le prix payé : un bazin à 62 000 F au palier Argent paie 18 % sur 62 000 F. Le palier est déjà dans le taux : aucun coefficient ne s’ajoute.')}
          </div>
        </Panel>
      </div>
      <div className="g g21">
        <Panel titre={t('Cas types · ce qui est retenu, ce que le vendeur garde')} icone="calculator">
          <Table
            cle={(c) => c.o}
            rows={CAS.map((c) => ({ ...c, k: commission([{ famille: c.famille, prix: c.prix, mic: c.mic }], c.palier, c.decouverte) }))}
            legende={t('Cas types')}
            cols={[
              { k: 'o', t: t('Commande'), main: true, rendu: (c) => <><b>{`${c.o} · ${Fr(c.prix)}`}</b><div className="t2">{c.v}</div></> },
              { k: 'c', t: t('Retenu'), cls: 'r', rendu: (c) => Fr(c.k.retenue) },
              { k: 'g', t: t('Vendeur garde'), cls: 'r', rendu: (c) => <b className="cg">{Fr(c.k.garde)}</b> },
              { k: 'n', t: t('Calcul'), hideM: true, rendu: (c) => (c.k.auPlancher ? tf('Plancher : {a} calculés, {b} retenus', { a: Fr(Math.round(c.k.calculee)), b: Fr(c.k.retenue) }) : `${Fr(c.prix)} × ${pc(c.k.lignes[0].taux)}${c.decouverte ? ` × ${String(ARGENT.decouverte).replace('.', ',')}` : ''}`) },
            ]}
          />
          <Note ton="acc" icone="scale" className="mt10">
            <b>{t('Produit très cher.')}</b> {t('Sans plafond par article, la commission suit le prix : le taux du palier Or (14 % en téléphonie) reste rentable pour BelivaY sans que le prix ait à gonfler ; le vendeur Or garde 86 %.')}
          </Note>
        </Panel>
        <Panel titre={t('Ce qui s’applique au taux de la grille')} icone="sliders-horizontal">
          <Li icone="award" ton="acc" t={t('Palier du vendeur')} s={t('Déjà dans le taux de la grille (Bronze, Argent, Or, Platine) : aucun coefficient en plus')} />
          <Li icone="plus" ton="amber" t={tf('Petit prix · +{n} points', { n: ARGENT.pointsPetitPrix })} s={tf('Prix unitaire sous {s}', { s: Fr(ARGENT.seuilPetitPrix) })} />
          <Li icone="flag" ton="green" t={tf('Made in Cameroon · −{n} points', { n: ARGENT.pointsMic })} s={tf('Jamais sous {m} %', { m: ARGENT.tauxMin })} />
          <Li icone="gift" ton="green" t={t('Offre de découverte')} s={tf('Commission × {x} pendant 3 mois ou 50 commandes', { x: String(ARGENT.decouverte).replace('.', ',') })} />
          <Li icone="badge-percent" ton="or" t={t('Plans Boost et Pro')} s={tf('Remise de {b} % ou {p} % de la commission du mois, jamais au-delà du prix du plan', { b: ARGENT.plans.Boost.remise, p: ARGENT.plans.Pro.remise })} />
          <Li icone="arrow-down-to-line" ton="amber" t={t('Plancher')} s={tf('{m} ou {p} % du prix, le plus élevé, par commande et par vendeur', { m: Fr(ARGENT.comMin), p: ARGENT.comMinTaux })} />
          <Li icone="landmark" ton="ink" t={t('TVA sur la commission')} s={tf('{tva} % aujourd’hui · 19,25 % dès l’assujettissement de BelivaY, annoncée 30 jours avant', { tva: ARGENT.tva })} />
          <Li icone="banknote" ton="ink" t={t('Frais de versement')} s={tf('{v} % Mobile Money retenu sur le versement du vendredi', { v: ARGENT.fraisVersementVendeur })} />
        </Panel>
      </div>
      <Simulateur />
    </>
  )
}

/** Simuler une vente : ce qui est retenu, ce que le vendeur garde, ce qui est versé le vendredi. */
function Simulateur() {
  const { t, tf } = usePreferences()
  const [famille, setFamille] = useState<Famille>('telephonie')
  const [palier, setPalier] = useState<Palier>('Bronze')
  const [prix, setPrix] = useState(20000)
  const [decouverte, setDecouverte] = useState(false)
  const [mic, setMic] = useState(false)
  const k = commission([{ famille, prix, mic }], palier, decouverte)
  const v = versementVendeur(k.garde, 0)
  return (
    <Panel titre={t('Simuler une vente')} icone="calculator" className="mt16">
      <div className="row wrap" style={{ gap: 12 }}>
        <label className="fld">
          <span className="fld-t">{t('Famille')}</span>
          <span className="inp">
            <select value={famille} onChange={(e) => setFamille(e.target.value as Famille)}>
              {FAMILLES.map((f) => (
                <option key={f.id} value={f.id}>
                  {t(f.nom)}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="fld">
          <span className="fld-t">{t('Palier')}</span>
          <span className="inp">
            <select value={palier} onChange={(e) => setPalier(e.target.value as Palier)}>
              {PALIERS.map((p) => (
                <option key={p} value={p}>
                  {t(p)}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="fld">
          <span className="fld-t">{t('Prix payé (F)')}</span>
          <span className="inp">
            <input type="number" min={0} step={100} value={prix} onChange={(e) => setPrix(Math.max(0, Number(e.target.value) || 0))} />
          </span>
        </label>
        <span className="row" style={{ gap: 8, alignItems: 'center' }}>
          <Tg on={decouverte} changer={setDecouverte} libelle={t('Offre de découverte')} />
          <span className="t13">{t('Découverte')}</span>
        </span>
        <span className="row" style={{ gap: 8, alignItems: 'center' }}>
          <Tg on={mic} changer={setMic} libelle={t('Made in Cameroon')} />
          <span className="t13">{t('Made in Cameroon')}</span>
        </span>
      </div>
      <div className="g g2">
        <div>
          <Mv k={t('Taux de l’article')} v={pc(k.lignes[0]?.taux ?? 0)} />
          <Mv k={t('Commission retenue')} v={`${Fr(k.retenue)}${k.auPlancher ? ' · ' + t('plancher') : ''}`} />
          <Mv k={t('TVA')} v={Fr(k.tva)} />
          <Mv k={t('Le vendeur garde')} v={Fr(k.garde)} tot />
        </div>
        <div>
          <Mv k={tf('Frais de versement ({p} %)', { p: ARGENT.fraisVersementVendeur })} v={Fr(v.frais)} />
          <Mv k={t('Versé le vendredi')} v={Fr(v.verse)} tot />
          <Mv k={t('Taux effectif')} v={pc(k.tauxEffectif)} />
          {k.perte && (
            <Note ton="red" icone="ban" className="mt10">
              {t('Le vendeur garderait 0 F ou moins : vente refusée à la publication (BelivaY ne perd jamais).')}
            </Note>
          )}
        </div>
      </div>
    </Panel>
  )
}

function Abonnements({ vendeurs }: { vendeurs: VendeurCommission[] }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const de = (p: string) => vendeurs.filter((v) => v.plan === p)
  const plan = (n: string, prix: string, abonnes: VendeurCommission[], ft: string[], ton?: string) => (
    <div className={'admp-plan' + (ton ? ' ' + ton : '')}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="b8 t17">{n}</div>
          <div className="t12 c3 mt4">{tf('{n} vendeurs · dont {e} en essai', { n: abonnes.length, e: abonnes.filter((x) => x.essai).length })}</div>
        </div>
        <div className="right">
          <div className="b8" style={{ fontSize: 22 }}>
            {prix}
          </div>
          <div className="t12 c3">{t('par mois')}</div>
        </div>
      </div>
      <div className="mt8">
        {ft.map((f) => (
          <div className="admp-ft" key={f}>
            <Icone nom="check" taille={15} />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
  const echecs = vendeurs.filter((v) => v.echec)
  const payants = vendeurs.filter((v) => v.plan !== 'Free' && !v.essai)
  return (
    <>
      <div className="g g3">
        {plan('Free', '0 F', de('Free'), [t('Vendre, versement chaque vendredi'), t('Chiffres des 30 derniers jours')])}
        {plan('Boost', Fr(ARGENT.plans.Boost.prix), de('Boost'), [tf('Remise de {p} % de la commission du mois, au plus le prix du plan', { p: ARGENT.plans.Boost.remise }), t('Statistiques sur 3 et 12 mois')], 'or')}
        {plan('Pro', Fr(ARGENT.plans.Pro.prix), de('Pro'), [tf('Remise de {p} % de la commission du mois, au plus le prix du plan', { p: ARGENT.plans.Pro.remise }), t('Analytiques par offre et par quartier')], 'acc')}
      </div>
      <Panel titre={tf('Échecs de prélèvement · {j} jours de grâce, puis Free', { j: ARGENT.planGraceJ })} icone="credit-card" className="mt16">
        <Table
          cle={(v) => v.vendeur}
          rows={echecs}
          legende={t('Échecs de prélèvement')}
          ligneCls={(v) => (v.echec?.etat === 'free' ? 'bad' : 'warn')}
          vide={<p className="t13 c3">{t('Aucun échec de prélèvement.')}</p>}
          cols={[
            { k: 'v', t: t('Vendeur'), main: true, rendu: (v) => <><b>{v.vendeur}</b><div className="t2">{v.zone} · {t(v.palier)}</div></> },
            { k: 'p', t: t('Plan'), rendu: (v) => `${v.plan} · ${Fr(ARGENT.plans[v.plan as 'Boost' | 'Pro']?.prix ?? 0)}` },
            { k: 'e', t: t('Échec'), rendu: (v) => `${d.jour(v.echec!.le)} · ${v.echec!.motif}` },
            { k: 'g', t: t('Grâce'), rendu: (v) => tf('jusqu’au {j}', { j: d.jour(v.echec!.graceJusqua) }) },
            { k: 's', t: t('État'), rendu: (v) => <Pill ton={v.echec!.etat === 'free' ? 'red' : 'amber'} sm dot>{t(v.echec!.etat === 'free' ? 'Repassé en Free' : 'Nouvelle tentative pendant la grâce')}</Pill> },
          ]}
        />
      </Panel>
      <div className="g g21">
        <Panel titre={t('Options à la carte')} icone="shopping-cart" droite={<Pill ton="violet" sm icone="lock">{t('Après le lancement · interrupteur fermé')}</Pill>}>
          <Note ton="ink" icone="lock">
            {t('Mise en avant, boost de catégorie, vitrine de quartier, boost au résultat : fonctions d’après le lancement (DP-59, DP-63), cachées aux vendeurs tant que leur interrupteur est fermé. Toujours marquées « Sponsorisé », jamais dans la recherche, jamais au-dessus d’une offre moins chère et mieux notée.')}
          </Note>
        </Panel>
        <Panel titre={t('Gain d’abonnement plafonné')} icone="scale">
          <BarresH largeurLibelle={150} largeurValeur={70} lignes={payants.map((v) => ({ l: `${v.vendeur} · ${v.plan}`, v: v.remisePlan, max: ARGENT.plans[v.plan as 'Boost' | 'Pro'].prix, r: Fr(v.remisePlan), ton: 'acc' }))} />
          <div className="t12 c3 mt8" style={{ lineHeight: 1.45 }}>
            {tf('Exemple : un vendeur Boost dont la commission du mois est de 100 000 F reçoit {r}, jamais plus que le prix du plan. Un abonnement ne coûte jamais d’argent à BelivaY.', { r: Fr(remiseDePlan('Boost', 100000)) })}
          </div>
        </Panel>
      </div>
    </>
  )
}

function Releves({ mois, vendeurs, emis }: { mois: string; vendeurs: VendeurCommission[]; emis: { mois: string; emisLe: number; vendeurs: number; retenu: number }[] }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const [choisi, setChoisi] = useState(vendeurs.find((v) => v.ventes > 0)?.vendeur ?? vendeurs[0]?.vendeur)
  const v = vendeurs.find((x) => x.vendeur === choisi)
  const mentions = REGISTRE['BLV-MENTIONS-LEGALES']?.valeur ?? ''
  const facture = (x: VendeurCommission) =>
    exporterPdf(`releve-commissions-${x.vendeur.replace(/\W+/g, '-').toLowerCase()}.pdf`, [
      { texte: 'BelivaY · Relevé des commissions (vaut facture)', taille: 14 },
      { texte: mentions, espace: 6 },
      { texte: `${x.vendeur} · ${mois}`, taille: 12, espace: 10 },
      { texte: `Ventes libérées : ${Fr(x.ventes)}` },
      { texte: `Commission (grille v3, V02${x.decouverte ? ', offre de découverte' : ''}) : ${Fr(x.retenu)}` },
      { texte: `TVA ${ARGENT.tva} % : ${Fr(0)}` },
      { texte: `Remise de plan : ${Fr(x.remisePlan)}` },
      { texte: `Frais de versement Mobile Money (${ARGENT.fraisVersementVendeur} %) : ${Fr(x.fraisVersement)}` },
      { texte: `Le vendeur garde : ${Fr(x.garde)}`, taille: 11 },
    ])
  return (
    <div className="g g21">
      <div>
        <Table
          cle={(x) => x.vendeur}
          rows={vendeurs}
          legende={tf('Relevés de {mois}', { mois })}
          ligneCls={(x) => (x.vendeur === choisi ? 'sel' : undefined)}
          outils={<ExportSigne nom={`commissions-${mois.replace(' ', '-')}.csv`} objet={`Relevés des commissions ${mois}`} entetes={['Vendeur', 'Palier', 'Commandes', 'Ventes libérées', 'Retenu', 'Vendeur garde', 'Frais de versement']} lignes={() => vendeurs.map((x) => [x.vendeur, x.palier, x.commandes, x.ventes, x.retenu, x.garde, x.fraisVersement])} />}
          cols={[
            { k: 'v', t: t('Vendeur'), main: true, rendu: (x) => <button type="button" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }} onClick={() => setChoisi(x.vendeur)}><b>{x.vendeur}</b><div className="t2">{`${x.zone} · ${t(x.palier)}${x.decouverte ? ' · ' + t('découverte') : ''} · ${tf('{n} commandes', { n: x.commandes })}`}</div></button> },
            { k: 'b', t: t('Ventes libérées'), cls: 'r', rendu: (x) => Fr(x.ventes) },
            { k: 'c', t: t('Retenu'), cls: 'r', rendu: (x) => Fr(x.retenu) },
            { k: 't', t: t('Taux'), cls: 'r', hideM: true, rendu: (x) => (x.ventes ? pc((x.retenu / x.ventes) * 100) : '—') },
            { k: 'k', t: t('Vendeur garde'), cls: 'r', rendu: (x) => <b className="cg">{Fr(x.garde)}</b> },
          ]}
          pied={<span>{tf('{n} vendeurs · retenu ce mois à ce jour : {m}', { n: vendeurs.length, m: Fr(vendeurs.reduce((n, x) => n + x.retenu, 0)) })}</span>}
        />
      </div>
      <div className="col" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
        {v && (
          <Panel titre={t('Facture des commissions · aperçu')} icone="file-text">
            <div className="admp-doc">
              <div className="t12 c3" style={{ lineHeight: 1.5 }}>
                {mentions}
              </div>
              <div className="divide">{`${v.vendeur} · ${mois}`}</div>
              <Mv k={t('Ventes libérées')} v={Fr(v.ventes)} />
              <Mv k={t('Commission · grille v3')} v={Fr(v.retenu)} />
              <Mv k={tf('TVA {tva} %', { tva: ARGENT.tva })} v={Fr(0)} />
              <Mv k={t('Remise de plan')} v={Fr(v.remisePlan)} />
              <Mv k={tf('Frais de versement ({p} %)', { p: ARGENT.fraisVersementVendeur })} v={Fr(v.fraisVersement)} />
              <Mv k={t('Le vendeur garde')} v={Fr(v.garde)} tot />
            </div>
            <button type="button" className="btn secondary mt10" onClick={() => facture(v)}>
              <Icone nom="download" taille={18} />
              <span>{t('Télécharger le relevé (PDF)')}</span>
            </button>
          </Panel>
        )}
        <Panel titre={t('Relevés émis')} icone="archive">
          {emis.map((e) => (
            <Li key={e.mois} icone="file-check" ton="acc" t={e.mois} s={tf('Émis le {j} · {n} vendeurs · {m} retenus', { j: d.jour(e.emisLe), n: e.vendeurs, m: Fr(e.retenu) })} />
          ))}
        </Panel>
      </div>
    </div>
  )
}
