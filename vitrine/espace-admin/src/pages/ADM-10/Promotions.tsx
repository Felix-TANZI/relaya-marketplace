// ADM-P26 · Promotions, ventes flash, sponsorisé et fidélité, repris sur le prototype (route('promotions') : budgets en
// tête, onglets, calendrier commercial camerounais, ventes flash et leurs états, accueil en rotation, sponsorisé et
// fidélité, budget). v6 : Promotions (baisses de prix des vendeurs) et ventes flash (Flash Deals) sont DEUX fonctions
// séparées — onglet « Promotions » ajouté ; une vente flash suit l'heure du serveur (fin jamais prolongée, arrêt
// automatique à stock nul), un seul prix flash pour la liste, la fiche, le panier et la commande, remise réelle d'au
// moins FLASH-REMISE-MIN sur le prix pratiqué, durée ≤ FLASH-DUREE-MAX, limite de générosité. Sponsorisé, boost,
// parrainage, codes promo et fidélité sont CACHÉS au lancement (interrupteurs fermés) : jamais montrés disponibles.
// Onglet « Plateforme » : promotions lancées par BelivaY (pages/SURVEILLER/PromotionsPlateforme.tsx).
import { useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Anneau, Banniere, Barre, Frise, Interdit, Kpi, Kv, Li, Note, Panel, Pill, Rebours, Table, Tg, Vide, useSurtitre, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { HEURE, JOUR, jourDe, yaounde } from '../../calculs/temps'
import type { FlashVu, VuePromotions } from '../../donnees/domaines/pilotage'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { useHorloge, useRole, useRouteOuverte } from '../../session'
import { Chargement, Coche, ErreurLecture, Etapes, Mini, Onglets, RAISONS, useDates } from '../ADM-11/commun-s5'
import { REGLES_S5, budgets, type ControleFlash, type EtatFlash } from '../ADM-11/regles-s5'
import { PromotionsPlateforme } from '../SURVEILLER/PromotionsPlateforme'

const R = REGLES_S5
type Vue = 'cal' | 'pf' | 'fl' | 'pm' | 'sp' | 'bu'
const VUE: Record<string, Vue> = { '': 'cal', plateforme: 'pf', flash: 'fl', promotions: 'pm', fidelite: 'sp', budget: 'bu' }
const ETAT: Record<EtatFlash, [string, Ton]> = { brouillon: ['Brouillon', 'ink'], programmee: ['Programmée', 'blue'], en_cours: ['En cours', 'or'], terminee: ['Terminée', 'green'], epuisee: ['Épuisée', 'red'], arretee: ['Arrêtée', 'red'], annulee: ['Annulée', 'ink'] }
const ETAPE: Record<EtatFlash, number> = { brouillon: 0, programmee: 1, en_cours: 2, terminee: 4, epuisee: 4, arretee: 4, annulee: 4 }
const CONTROLES: Record<ControleFlash, string> = {
  prix_barre: 'Prix barré réellement pratiqué (7 jours au moins sur 30)',
  remise: 'Remise réelle d’au moins {m} %',
  generosite: 'Limite de générosité de {g} % respectée',
  duree: 'Durée de {h} h au plus',
  stock: 'Stock réservé, jamais plus que le stock de l’offre',
  ciblage: 'Ciblée sur une zone pour servir une tournée',
  futur: 'Début à venir (plus rien ne change une fois commencée)',
}
const pct = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')

export default function Promotions() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const [p] = useSearchParams()
  const vue = VUE[p.get('s') ?? ''] ?? 'cal'
  const l = useLecture(() => source.pilotage.promotions(), [])
  const v = l.donnees
  const brouillon = v?.flashes.find((f) => f.etat === 'brouillon')
  const actes = brouillon ? (
    <Link className="btn primary auto" to={chemin('promotions', { s: 'flash', id: brouillon.id })}>
      <Icone nom="zap" taille={18} />
      <span>{t('Brouillons des vendeurs')}</span>
    </Link>
  ) : undefined
  const fl = v?.flashes ?? []
  const fonctions = useFonctions([
    { verbe: 'Programmer', n: fl.filter((f) => f.etat === 'brouillon').length, unite: ['vente flash', 'ventes flash'], icone: 'zap', route: 'promotions', params: { s: 'flash', id: brouillon?.id }, geste: true },
    { verbe: 'Surveiller', n: fl.filter((f) => f.etat === 'en_cours').length, unite: ['vente en cours', 'ventes en cours'], icone: 'timer', route: 'promotions', params: { s: 'flash' } },
    { verbe: 'Retirer', n: (v?.promotions ?? []).filter((x) => !x.honnete && !x.retiree).length, unite: ['rabais trompeur', 'rabais trompeurs'], icone: 'package-x', route: 'promotions', params: { s: 'promotions' }, geste: true, alerte: true },
  ])
  return (
    <Ecran route="promotions" kicker={surtitre} actions={actes} fonctions={fonctions}>
      <ErreurLecture erreur={l.erreur} relire={l.relire} />
      {!v ? (
        !l.erreur && <Chargement n={3} />
      ) : (
        <>
          <Budgets v={v} />
          <Onglets
            aria="Vues des promotions"
            actif={vue}
            items={[
              { id: 'cal', t: 'Calendrier', s: '', icone: 'calendar-days' },
              { id: 'pf', t: 'Plateforme', s: 'plateforme', icone: 'megaphone' },
              { id: 'fl', t: 'Ventes flash', s: 'flash', n: v.flashes.filter((f) => f.etat === 'en_cours' || f.etat === 'programmee' || f.etat === 'brouillon').length, icone: 'zap' },
              { id: 'pm', t: 'Promotions', s: 'promotions', n: v.promotions.filter((x) => !x.honnete && !x.retiree).length || null, icone: 'tag' },
              { id: 'sp', t: 'Sponsorisé et fidélité', s: 'fidelite', icone: 'megaphone' },
              { id: 'bu', t: 'Budget', s: 'budget', icone: 'wallet' },
            ]}
          />
          {vue === 'cal' && <Calendrier v={v} />}
          {vue === 'pf' && <PromotionsPlateforme />}
          {vue === 'fl' && <VentesFlash v={v} relire={l.relire} />}
          {vue === 'pm' && <PromotionsVue v={v} relire={l.relire} />}
          {vue === 'sp' && <Sponsorise v={v} />}
          {vue === 'bu' && <BudgetVue v={v} />}
        </>
      )}
    </Ecran>
  )
}

function Budgets({ v }: { v: VuePromotions }) {
  const { t, tf } = usePreferences()
  const b = budgets(v.mois)
  const sponso = v.fonctions.find((f) => f.code === 'FF-SPONSO')
  return (
    <div className="g g4">
      <div className="kpi night">
        <span className="i">
          <Icone nom="rocket" taille={18} />
        </span>
        <div className="k">{t('Budget de croissance')}</div>
        <div className="v">
          {F(b.croissanceConsomme)}
          <small>F</small>
        </div>
        <div className="s">{tf('sur {max} F · {p} % des revenus de {m}', { max: F(b.croissanceMax), p: v.mois.premiereAnnee ? R.croissanceAn1Pct : R.croissanceEnsuitePct, m: t(v.mois.libelle) })}</div>
        <div className="mt10">
          <Barre pct={b.croissanceMax ? (b.croissanceConsomme / b.croissanceMax) * 100 : 0} ton={b.arretCroissance ? 'red' : 'acc'} aria={tf('{p} % consommé', { p: b.croissanceMax ? Math.round((b.croissanceConsomme / b.croissanceMax) * 100) : 0 })} />
        </div>
      </div>
      <div className="kpi">
        <span className="i">
          <Icone nom="heart" taille={18} />
        </span>
        <div className="k">{tf('Fidélité · plafond {p} % du volume', { p: pct(R.fidelitePlafondPct) })}</div>
        <div className="v">
          {F(b.fideliteConsomme)}
          <small>F</small>
        </div>
        <div className="s">{tf('sur {max} F · fermée au lancement', { max: F(b.fideliteMax) })}</div>
        <div className="mt10">
          <Barre pct={0} ton="acc" aria={t('0 % consommé')} />
        </div>
      </div>
      <Kpi k={t('Limite de générosité')} v={R.generositeLancementPct} u="%" s={tf('au lancement, puis {c} % · plus forte remise du mois : {r} %', { c: R.generositeCourantPct, r: pct(v.mois.plusForteRemise) })} icone="scale" iton="amber" />
      <Kpi k={t('Sponsorisé vendu')} v={sponso?.ouvert ? '—' : t('Fermé')} s={t('Après le lancement (FF-SPONSO) · jamais dans la recherche')} icone="megaphone" iton="or" to={chemin('promotions', { s: 'fidelite' })} />
    </div>
  )
}

// ── Calendrier ─────────────────────────────────────────────────────────────────────────────────────────────────────
function Calendrier({ v }: { v: VuePromotions }) {
  const { t, tf, langue } = usePreferences()
  const n = useHorloge()
  const d = useDates()
  // Six semaines à partir du lundi de la semaine précédente.
  const aujourdhui = jourDe(n)
  const [a, m, j] = aujourdhui.split('-').map(Number)
  const t0 = yaounde(a, m, j)
  const dow = (new Date(t0 + HEURE).getUTCDay() + 6) % 7
  const debut = t0 - (dow + 7) * JOUR
  const jours = Array.from({ length: 42 }, (_, i) => debut + i * JOUR)
  const nomJ = langue === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const paie = (x: number) => {
    const dd = new Date(x + HEURE)
    const fin = new Date(Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth() + 1, 0)).getUTCDate()
    return dd.getUTCDate() >= fin - 5
  }
  const evts = (x: number) => [
    ...(paie(x) ? [{ c: 'pay', t: t('Paie fin de mois') }] : []),
    ...v.flashes.filter((f) => f.etat !== 'annulee' && jourDe(f.debut) === jourDe(x)).map((f) => ({ c: f.etat === 'en_cours' || f.etat === 'programmee' ? 'prog' : f.etat === 'brouillon' ? 'draft' : 'done', t: `${t('Flash')} · ${f.offre}` })),
  ]
  return (
    <>
      <Panel titre={t('Calendrier commercial camerounais')} icone="calendar-days" className="mt16" droite={<Pill ton="acc" sm>{`${t('Aujourd’hui')} : ${d.court(n)}`}</Pill>}>
        <div className="admp-cal" role="grid" aria-label={t('Calendrier commercial')}>
          {nomJ.map((x) => (
            <div key={x} className="admp-dh" role="columnheader">
              {x}
            </div>
          ))}
          {jours.map((x) => (
            <div key={x} className={'admp-day' + (jourDe(x) === aujourdhui ? ' today' : '')} role="gridcell">
              <div className="n">
                {d.court(x).split(' ')[0]}
                <span className="admp-m">{' ' + d.court(x).split(' ').slice(1).join(' ')}</span>
              </div>
              {evts(x).map((e, i) => (
                <span key={i} className={'admp-ev ' + e.c} title={e.t}>
                  {e.t}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="legend">
          <span>
            <i className="admp-ev pay"></i>
            {t('Paie de fin de mois')}
          </span>
          <span>
            <i className="admp-ev prog"></i>
            {t('Vente flash')}
          </span>
        </div>
        <div className="divide">{t('Temps forts suivants')}</div>
        <div className="admp-next">
          {v.fetes.map((f) => (
            <div key={f.libelle}>
              <span className="admp-ev fete">{t(f.libelle)}</span>
              <span className="t12 c3">{t(f.quand)}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="g g2">
        <Panel titre={t('Ventes flash')} icone="zap">
          <FFFlash ouvert={v.flashOuvert} />
          {v.flashes.map((f) => (
            <LigneFlash key={f.id} f={f} />
          ))}
        </Panel>
        <div>
          <Panel titre={tf('Accueil · {n} emplacements en rotation', { n: v.accueil.emplacements })} icone="layout-grid">
            <div className="admp-slots" aria-hidden="true">
              {Array.from({ length: v.accueil.emplacements }, (_, i) => (
                <i key={i} className={i < v.accueil.sponsorises ? 'sp' : i % 6 === 5 && i / 6 < v.accueil.nouveaux ? 'nw' : ''} />
              ))}
            </div>
            <p className="t12 c3 mt8">{t('10 à 20 % des emplacements réservés aux nouveaux produits-vendeurs, en rotation ; un nouveau produit démarre avec un score neutre, jamais nul. Sponsorisé : fermé au lancement.')}</p>
            <Kv k={t('Nouveaux produits-vendeurs')} v={`${v.accueil.nouveaux} (${pct((v.accueil.nouveaux / v.accueil.emplacements) * 100)} %)`} />
            <Kv k={t('Sponsorisé')} v={v.accueil.sponsorises} />
            <Kv k={t('Rotation')} v={`${v.accueil.rotationH} h`} />
          </Panel>
          <Panel titre={t('La promotion au service du groupage')} icone="target" style={{ marginTop: 16 }}>
            <Li icone="route" ton="acc" t={t('Remplir une tournée')} s={t('Chaque vente flash est ciblée sur une zone, avant une tournée relais')} />
            <Li icone="package-check" ton="acc" t={t('Écouler ce qui dort au relais')} s={t('Ciblage par relais et par créneau, jamais tout le catalogue')} />
            <Li icone="calendar-days" ton="acc" t={t('Suivre le calendrier camerounais')} s={t('Paie de fin de mois, rentrée, fêtes')} />
            <RegleSms />
          </Panel>
        </div>
      </div>
    </>
  )
}

function RegleSms() {
  const { t, tf } = usePreferences()
  return (
    <div className="row wrap mt12" style={{ gap: 8 }}>
      <Pill ton="red" icone="message-square-off">
        {t('Aucune promotion par SMS')}
      </Pill>
      <Pill ton="ink" icone="bell">
        {tf('Notifications de promotion : {n} par semaine au plus, {a} h – {b} h', { n: R.promoParSemaine, a: R.promoHeures[0], b: R.promoHeures[1] })}
      </Pill>
      <Pill ton="violet" icone="shield-check">
        {t('Jamais sur le versement, l’escrow, les preuves, les litiges')}
      </Pill>
    </div>
  )
}

function FFFlash({ ouvert }: { ouvert: boolean }) {
  const { t } = usePreferences()
  return (
    <div className="row wrap" style={{ gap: 8, margin: '4px 0 8px' }}>
      <Pill ton={ouvert ? 'green' : 'violet'} icone={ouvert ? 'circle-check' : 'lock'}>
        {ouvert ? t('Ventes flash ouvertes au lancement (FF-FLASH)') : t('Ventes flash fermées (FF-FLASH)')}
      </Pill>
      <span className="t12 c3 b7">{t('Remise décidée par le vendeur : budget BelivaY 0 F')}</span>
    </div>
  )
}

function LigneFlash({ f }: { f: FlashVu }) {
  const { t } = usePreferences()
  const d = useDates()
  const quand = f.etat === 'en_cours' ? `${t('fin à')} ${d.heure(f.finReelle)} · ${f.stockReserve - f.vendus} ${t('en stock')}` : f.etat === 'epuisee' ? `${t('arrêt automatique à')} ${d.heure(f.finReelle)}` : `${d.jour(f.debut)}, ${d.heure(f.debut)} – ${d.heure(f.fin)}`
  return <Li icone="zap" ton={ETAT[f.etat][1] === 'or' ? 'or' : 'acc'} t={`${f.offre} · ${F(f.prixFlash)} F`} s={`${f.vendeur} · ${quand}`} droite={<Pill ton={ETAT[f.etat][1]} sm>{t(ETAT[f.etat][0])}</Pill>} to={chemin('promotions', { s: 'flash', id: f.id })} />
}

// ── Ventes flash ───────────────────────────────────────────────────────────────────────────────────────────────────
function VentesFlash({ v, relire }: { v: VuePromotions; relire: () => void }) {
  const { t } = usePreferences()
  const [p] = useSearchParams()
  const f = v.flashes.find((x) => x.id === p.get('id')) ?? v.flashes.find((x) => x.etat === 'en_cours') ?? v.flashes[0]
  if (!f) return <Vide icone="zap" t={t('Aucune vente flash')} s={t('Les vendeurs proposent leurs ventes flash depuis leur espace ; elles arrivent ici en brouillon.')} />
  return (
    <>
      <FFFlash ouvert={v.flashOuvert} />
      <Etapes etapes={['Brouillon', 'Programmée', 'En cours', 'Terminée']} cur={ETAPE[f.etat]} />
      {f.etat === 'epuisee' && (
        <Banniere ton="amber" icone="package-x" className="mt16">
          <b>{t('Stock épuisé : vente arrêtée automatiquement.')}</b> {t('Aucun compte à rebours ne reste affiché ; la fiche est revenue au prix habituel.')}
        </Banniere>
      )}
      <FlashDetail f={f} ouvertFF={v.flashOuvert} relire={relire} />
      <Panel titre={t('Toutes les ventes flash')} icone="list" style={{ marginTop: 16 }}>
        {v.flashes.map((x) => (
          <LigneFlash key={x.id} f={x} />
        ))}
      </Panel>
    </>
  )
}

function TeteFlash({ f }: { f: FlashVu }) {
  const { t, tf } = usePreferences()
  return (
    <Panel style={{ marginTop: 0 }}>
      <div className="row" style={{ gap: 14 }}>
        <span className="ic or" style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icone nom="zap" taille={24} />
        </span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row wrap" style={{ gap: 6 }}>
            <Pill ton={ETAT[f.etat][1]} sm>
              {t(ETAT[f.etat][0])}
            </Pill>
            <Pill ton="or" sm>
              {tf('Remise réelle {r} %', { r: pct(f.remise) })}
            </Pill>
            <span className="mono t12 c3">{f.id}</span>
          </div>
          <div className="b8 t17 mt6">{f.offre}</div>
          <div className="t13 c3">{`${f.vendeur} · ${f.zone ?? '—'}`}</div>
        </div>
        <div className="right">
          <div className="t12 c3 b7" style={{ textDecoration: 'line-through' }}>{`${F(f.prix30)} F`}</div>
          <div className="b8" style={{ fontSize: 24, color: 'var(--or-txt)' }}>{`${F(f.prixFlash)} F`}</div>
        </div>
      </div>
    </Panel>
  )
}

function FlashDetail({ f, ouvertFF, relire }: { f: FlashVu; ouvertFF: boolean; relire: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const role = useRole()
  const direction = role === 'superviseur'
  const peutArreter = role === 'superviseur' || role === 'support'
  const [feuille, setFeuille] = useState<'annuler' | 'arreter' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const geste = async (fn: () => Promise<{ ok: boolean; raison?: string }>, ok: string) => {
    setEnvoi(true)
    const r = await fn()
    setMsg(r.ok ? t(ok) : t(RAISONS[r.raison ?? ''] ?? 'Refusé.'))
    setEnvoi(false)
    relire()
  }
  const envoyer = (fn: (m: string) => Promise<{ ok: boolean; raison?: string }>) => async (m: string) => {
    const r = await fn(m)
    relire()
    return r.ok ? null : t(RAISONS[r.raison ?? ''] ?? 'Refusé.')
  }
  const controles = (
    <>
      {f.controles.map((c) => (
        <Coche key={c.id} ok={c.ok} mauvais>
          {tf(CONTROLES[c.id], { m: R.flashRemiseMinPct, g: R.generositeLancementPct, h: R.flashDureeMaxH })}
        </Coche>
      ))}
      <Coche ok>{t('Canaux : accueil, catégorie et notification · jamais de SMS')}</Coche>
    </>
  )
  const rapporte = (
    <Panel titre={t('Ce que la vente rapporte')} icone="coins">
      <Kv k={t('Prix payé par le client (liste, fiche, panier, commande)')} v={`${F(f.prixFlash)} F`} />
      <Kv k={t('Commission')} v={tf('sur le prix payé, + {p} points pendant la vente (calculée par le serveur)', { p: R.flashMajorationPts })} />
      <Kv k={t('Financé par BelivaY')} v="0 F" />
      <Kv k={t('Tournée servie')} v={t(f.cible)} />
    </Panel>
  )
  return (
    <>
      {msg && (
        <Note ton="ink" icone="info" className="mt12" role="status">
          {msg}
        </Note>
      )}
      {f.etat === 'brouillon' && (
        <div className="g g2">
          <div>
            <TeteFlash f={f} />
            <Panel titre={t('Ciblage et durée')} icone="target" style={{ marginTop: 16 }}>
              <Kv k={t('Offre')} v={`${f.offre} · ${f.vendeur}`} />
              <Kv k={t('Zone ciblée')} v={f.zone ?? '—'} />
              <Kv k={t('Créneau')} v={`${d.jour(f.debut)} · ${d.heure(f.debut)} – ${d.heure(f.fin)}`} />
              <Kv k={t('Tournée servie')} v={t(f.cible)} />
              <Kv k={t('Stock réservé')} v={tf('{r} sur {s} en stock', { r: f.stockReserve, s: f.stockOffre })} />
              <Kv k={t('Prix flash décidé par le vendeur')} v={<b>{`${F(f.prixFlash)} F`}</b>} />
            </Panel>
          </div>
          <Panel titre={t('Simulation avant programmation')} icone="flask-conical">
            <div className="tiles" style={{ marginTop: 0 }}>
              <div className="tile or">
                <div className="tk">{t('Remise réelle')}</div>
                <div className="tv">
                  {pct(f.remise)}
                  <small>%</small>
                </div>
                <div className="ts">{`(${F(f.prix30)} − ${F(f.prixFlash)}) ÷ ${F(f.prix30)}`}</div>
              </div>
              <div className="tile acc">
                <div className="tk">{t('Budget BelivaY')}</div>
                <div className="tv">
                  0<small>F</small>
                </div>
                <div className="ts">{t('remise décidée par le vendeur')}</div>
              </div>
            </div>
            <div className="mt12">{controles}</div>
            {f.simuleeLe && <p className="t12 c3 mt8">{tf('Simulée à {h}.', { h: d.heure(f.simuleeLe) })}</p>}
            {direction ? (
              <div className="btns mt12">
                {!f.simuleeLe ? (
                  <button type="button" className="btn primary" disabled={envoi} onClick={() => void geste(() => source.pilotage.simulerFlash(f.id), 'Simulation faite.')}>
                    <Icone nom="flask-conical" taille={18} />
                    <span>{t('Simuler')}</span>
                  </button>
                ) : (
                  <button type="button" className="btn primary" disabled={envoi || !ouvertFF || f.controles.some((c) => !c.ok)} title={!ouvertFF ? t('Les ventes flash sont fermées (FF-FLASH).') : f.controles.some((c) => !c.ok) ? t('Un contrôle est en échec : la vente ne peut pas être programmée.') : undefined} onClick={() => void geste(() => source.pilotage.programmerFlash(f.id), 'Vente programmée : le client et le vendeur la voient.')}>
                    <Icone nom="calendar-check" taille={18} />
                    <span>{t('Programmer')}</span>
                  </button>
                )}
                <button type="button" className="btn danger" onClick={() => setFeuille('annuler')}>
                  <Icone nom="x" taille={18} />
                  <span>{t('Refuser le brouillon')}</span>
                </button>
              </div>
            ) : (
              <Interdit roles={['superviseur']} quoi="Programmer une vente flash" />
            )}
          </Panel>
        </div>
      )}
      {f.etat === 'programmee' && (
        <div className="g g21">
          <div>
            <TeteFlash f={f} />
            <div className="hero night">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="hk">{t('Début dans')}</span>
                <Pill ton="dk" icone="calendar">
                  {`${d.jour(f.debut)} · ${d.heure(f.debut)}`}
                </Pill>
              </div>
              <div className="ht">
                <Rebours fin={f.debut} urgent={0} critique={0} echu={t('Commencée')} />
              </div>
              <div className="hs">{tf('Fin à {h}, jamais prolongée · {r} réservés · {c}.', { h: d.heure(f.fin), r: f.stockReserve, c: t(f.cible) })}</div>
            </div>
            <Panel titre={t('Ce que verra le client')} icone="smartphone" style={{ marginTop: 16 }}>
              <div className="admm-sms">
                <div className="from">{t('Notification · Ventes flash')}</div>
                {tf('{o} à {p} F au lieu de {a} F, jusqu’à {h}. {r} à ce prix.', { o: f.offre, p: F(f.prixFlash), a: F(f.prix30), h: d.heure(f.fin), r: f.stockReserve })}
              </div>
            </Panel>
          </div>
          <div>
            <Panel titre={t('Contrôles faits')} icone="list-checks">
              {controles}
            </Panel>
            {direction && (
              <div className="row wrap mt16" style={{ gap: 8 }}>
                <button type="button" className="btn danger auto" onClick={() => setFeuille('annuler')}>
                  <Icone nom="x" taille={18} />
                  <span>{t('Annuler')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {f.etat === 'en_cours' && (
        <>
          <div className="hero orange">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="hk">{tf('En cours · ciblée sur {z}', { z: f.zone ?? '—' })}</span>
              <Pill ton="dk" icone="timer">
                {tf('Fin réelle à {h}', { h: d.heure(f.fin) })}
              </Pill>
            </div>
            <div className="ht">{tf('{o} à {p} F', { o: f.offre, p: F(f.prixFlash) })}</div>
            <div className="hs">{tf('Prix pratiqué {a} F · remise réelle {r} % · {v}', { a: F(f.prix30), r: pct(f.remise), v: f.vendeur })}</div>
            <div className="admp-cd">
              <div>
                <Rebours fin={f.fin} />
              </div>
              <div>
                <b>{f.stockReserve - f.vendus}</b>
                <span>{tf('en stock sur {n}', { n: f.stockReserve })}</span>
              </div>
            </div>
            <div className="admp-wbar">
              <i style={{ width: `${(f.vendus / f.stockReserve) * 100}%` }}></i>
            </div>
            <div className="row t12 mt8" style={{ justifyContent: 'space-between' }}>
              <span>{tf('{n} vendus depuis {h}', { n: f.vendus, h: d.heure(f.debut) })}</span>
              <span>{t(f.cible)}</span>
            </div>
          </div>
          <div className="g g2">
            <Panel titre={t('Ventes')} icone="chart-column">
              {f.ventes.length ? <Frise items={f.ventes.map((x, i) => ({ t: tf('Vente n° {n}', { n: i + 1 }), d: d.heure(x), st: 'done' as const }))} /> : <p className="t13 c3">{t('Aucune vente pour l’instant.')}</p>}
              <p className="t12 c3 mt4">{t('Compte à rebours et stock affichés au client : les vrais, à l’heure du serveur.')}</p>
            </Panel>
            {rapporte}
          </div>
          <div className="g g2">
            <Panel titre={t('Arrêter la vente')} icone="circle-stop">
              {peutArreter ? (
                <>
                  <p className="t13 c2">{t('Le motif est visible par le vendeur. L’arrêt retire aussitôt le compte à rebours ; les clients qui ont déjà payé gardent leur prix.')}</p>
                  <div className="btns mt12">
                    <button type="button" className="btn danger" onClick={() => setFeuille('arreter')}>
                      <Icone nom="circle-stop" taille={18} />
                      <span>{t('Arrêter maintenant')}</span>
                    </button>
                  </div>
                </>
              ) : (
                <Interdit roles={['superviseur', 'support']} quoi="Arrêter une vente flash" />
              )}
            </Panel>
            <Panel titre={t('Contrôle du Support')} icone="shield-check">
              <Coche ok>{tf('Compte à rebours réel : fin {h}, jamais prolongée', { h: d.heure(f.fin) })}</Coche>
              <Coche ok>{tf('Stock réel réservé : {n} restants, arrêt automatique à 0', { n: f.stockReserve - f.vendus })}</Coche>
              <Coche ok={f.joursPratique >= 7} mauvais>{tf('Prix barré honnête : {a} F, pratiqué {j} jours sur 30', { a: F(f.prix30), j: f.joursPratique })}</Coche>
            </Panel>
          </div>
        </>
      )}
      {(f.etat === 'terminee' || f.etat === 'epuisee' || f.etat === 'arretee' || f.etat === 'annulee') && (
        <div className="g g21">
          <div>
            <TeteFlash f={f} />
            <div className="hero acc">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="hk">{tf('Bilan · {j}, {a} – {b}', { j: d.jour(f.debut), a: d.heure(f.debut), b: d.heure(f.finReelle) })}</span>
                <Pill ton="dk" icone="circle-check">
                  {tf('{n} sur {s} vendus', { n: f.vendus, s: f.stockReserve })}
                </Pill>
              </div>
              <div className="ht">{t(f.cible)}</div>
              {f.motifArret && <div className="hs">{`${t('Motif')} : ${f.motifArret}`}</div>}
              <div className="money4 admp-m4">
                <Mini l={t('Ventes')} v={`${F(f.vendus * f.prixFlash)} F`} s={`${f.vendus} × ${F(f.prixFlash)} F`} />
                <Mini l={t('Commission')} v={t('serveur')} s={tf('prix payé + {p} points', { p: R.flashMajorationPts })} />
                <Mini l={t('Budget BelivaY')} v="0 F" s={t('remise du vendeur')} />
                <Mini l={t('Fin')} v={d.heure(f.finReelle)} s={t(ETAT[f.etat][0])} />
              </div>
            </div>
          </div>
          <div>
            <Panel titre={t('Ce qui s’est passé')} icone="history">
              <Frise items={f.journal.map((j) => ({ t: t(j.quoi), d: `${d.complet(j.le)}${j.par ? ' · ' + j.par : ''}`, st: 'done' as const }))} />
            </Panel>
            {f.etat === 'epuisee' && (
              <Note ton="acc" icone="lightbulb" className="mt12">
                {t('Épuisée avant la fin : proposer au vendeur un stock réservé plus grand la prochaine fois, s’il l’a vraiment.')}
              </Note>
            )}
          </div>
        </div>
      )}
      <DecisionMotivee ouverte={feuille === 'annuler'} fermer={() => setFeuille(null)} titre={tf('Annuler la vente flash {id}', { id: f.id })} resume={tf('{o} · {v} : la vente ne sera ni visible ni vendable ; le vendeur reçoit le motif.', { o: f.offre, v: f.vendeur })} libelle="Annuler la vente" icone="x" danger envoyer={envoyer((m) => source.pilotage.annulerFlash(f.id, m))} />
      <DecisionMotivee ouverte={feuille === 'arreter'} fermer={() => setFeuille(null)} titre={tf('Arrêter la vente flash {id}', { id: f.id })} resume={t('Le compte à rebours disparaît aussitôt ; les clients qui ont déjà payé gardent leur prix ; le motif est visible par le vendeur.')} libelle="Arrêter maintenant" icone="circle-stop" danger envoyer={envoyer((m) => source.pilotage.arreterFlash(f.id, m))} />
    </>
  )
}

// ── Promotions (baisses de prix des vendeurs) ──────────────────────────────────────────────────────────────────────
function PromotionsVue({ v, relire }: { v: VuePromotions; relire: () => void }) {
  const { t, tf } = usePreferences()
  const role = useRole()
  const [cible, setCible] = useState<string | null>(null)
  const pm = v.promotions.find((x) => x.id === cible)
  return (
    <>
      <Note ton="ink" icone="info" className="mt16">
        {t('Promotions et ventes flash sont deux fonctions séparées (v6) : une promotion est une baisse de prix du vendeur, sans compte à rebours ; le prix barré n’est permis que s’il a été réellement pratiqué 7 jours au moins sur les 30 derniers.')}
      </Note>
      <Table
        className="mt16"
        legende={t('Promotions des vendeurs')}
        rows={v.promotions}
        cle={(x) => x.id}
        ligneCls={(x) => (!x.honnete && !x.retiree ? 'warn' : undefined)}
        vide={<Vide icone="tag" t={t('Aucune promotion')} s={t('Les baisses de prix des vendeurs apparaissent ici.')} />}
        cols={[
          { k: 'o', t: t('Offre'), main: true, rendu: (x) => <><b>{x.offre}</b><div className="t2">{`${x.id} · ${x.vendeur}`}</div></> },
          { k: 'p', t: t('Prix'), rendu: (x) => <><s className="c3">{`${F(x.prixBarre)} F`}</s> <b>{`${F(x.prix)} F`}</b></> },
          { k: 'r', t: t('Remise'), rendu: (x) => `${pct(x.remise)} %` },
          { k: 'j', t: t('Prix barré pratiqué'), hideM: true, rendu: (x) => tf('{j} jours sur 30', { j: x.joursPratique }) },
          {
            k: 'e',
            t: t('Contrôle'),
            rendu: (x) =>
              x.retiree ? (
                <Pill ton="ink" sm>{t('Faux rabais retiré')}</Pill>
              ) : x.honnete ? (
                <Pill ton="green" sm>{t('Prix barré honnête')}</Pill>
              ) : role === 'superviseur' ? (
                <button type="button" className="btn danger sm" onClick={() => setCible(x.id)}>
                  <Icone nom="ban" taille={16} />
                  {t('Retirer le faux rabais')}
                </button>
              ) : (
                <Pill ton="red" sm>{t('Faux rabais')}</Pill>
              ),
          },
        ]}
      />
      <DecisionMotivee ouverte={!!pm} fermer={() => setCible(null)} titre={tf('Retirer le faux rabais {id}', { id: pm?.id ?? '' })} resume={pm ? tf('{o} · {v} : le prix barré de {a} F disparaît ; le prix de {p} F reste. Le vendeur reçoit le motif.', { o: pm.offre, v: pm.vendeur, a: F(pm.prixBarre), p: F(pm.prix) }) : ''} libelle="Retirer le faux rabais" icone="ban" danger envoyer={async (m) => {
        const r = await source.pilotage.retirerRabais(cible!, m)
        relire()
        return r.ok ? null : t(RAISONS[r.raison] ?? 'Refusé.')
      }} />
    </>
  )
}

// ── Sponsorisé et fidélité ─────────────────────────────────────────────────────────────────────────────────────────
function Sponsorise({ v }: { v: VuePromotions }) {
  const { t, tf } = usePreferences()
  const ouverte = useRouteOuverte()
  const b = budgets(v.mois)
  const fonction = (code: string) => v.fonctions.find((f) => f.code === code)
  return (
    <div className="g g21">
      <div>
        <Panel titre={t('Bande « Sponsorisé » · emplacements vendus')} icone="megaphone">
          <Vide icone="lock" t={t('Fermé au lancement')} s={t('Les produits sponsorisés et le boost sont des fonctions d’après le lancement (FF-SPONSO, FF-BOOST) : aucun emplacement n’est vendu, rien n’est montré aux clients ni aux vendeurs.')} />
          <div className="row wrap mt12" style={{ gap: 8 }}>
            <Pill ton="or" icone="tag">{t('Séparés et marqués « Sponsorisé »')}</Pill>
            <Pill ton="violet" icone="lock">{t('Jamais dans les résultats de recherche')}</Pill>
            <Pill ton="ink" icone="shield-check">{t('L’attribution d’un client ne s’achète jamais')}</Pill>
          </div>
        </Panel>
        <Panel titre={t('Fidélité · remise directe financée par BelivaY')} icone="heart" style={{ marginTop: 16 }}>
          <div className="row" style={{ gap: 16 }}>
            <Anneau v={0} max={100} taille={92} libelle="0 %" aria={t('0 % du plafond consommé')} />
            <div className="grow">
              <div className="b8 t15">{tf('{c} F consommés sur {m} F', { c: F(b.fideliteConsomme), m: F(b.fideliteMax) })}</div>
              <div className="t13 c3 mt4">{tf('Plafond : {p} % du volume d’affaires du mois. Au-delà, arrêt automatique et carte Direction. Jamais déduite du net vendeur.', { p: pct(R.fidelitePlafondPct) })}</div>
            </div>
          </div>
          <div className="divide">{t('Au lancement')}</div>
          <Li icone="ban" ton="red" t={t('Points et paliers de fidélité')} s={t('Retirés : aucun programme de jetons, la fidélité est une remise directe')} droite={<Pill ton="red" sm>{t('Retiré')}</Pill>} />
          {(['FF-CODES-PROMO', 'FF-PARRAINAGE', 'FF-FIDELITE'] as const).map((c) => {
            const f = fonction(c)
            const txt = { 'FF-CODES-PROMO': 'Un usage par client, jamais sur les ramassages, comptés dans le plafond de fidélité', 'FF-PARRAINAGE': 'Remise versée après la première commande livrée et confirmée du filleul', 'FF-FIDELITE': 'Réactivée après le lancement, sur décision' }[c]
            return <Li key={c} icone={c === 'FF-CODES-PROMO' ? 'ticket-percent' : c === 'FF-PARRAINAGE' ? 'user-plus' : 'heart'} ton="ink" t={t(f?.libelle ?? c)} s={`${t(txt)} · ${c}`} droite={<Tg on={!!f?.ouvert} lock libelle={tf('{c} : fermé au lancement (bascule dans Interrupteurs de fonctions)', { c })} />} />
          })}
          {ouverte('interrupteurs') && (
            <Link className="btn secondary mt12" to={chemin('interrupteurs')}>
              <Icone nom="toggle-right" taille={18} />
              <span>{t('Interrupteurs de fonctions')}</span>
            </Link>
          )}
        </Panel>
      </div>
      <BudgetPanel v={v} />
    </div>
  )
}

function BudgetPanel({ v }: { v: VuePromotions }) {
  const { t, tf } = usePreferences()
  const ouverte = useRouteOuverte()
  const b = budgets(v.mois)
  return (
    <Panel titre={tf('Budget de croissance · {m}', { m: t(v.mois.libelle) })} icone="wallet">
      <div className="row" style={{ gap: 16, alignItems: 'center' }}>
        <Anneau v={b.croissanceConsomme} max={Math.max(1, b.croissanceMax)} taille={110} libelle={`${pct(b.croissanceMax ? (b.croissanceConsomme / b.croissanceMax) * 100 : 0)} %`} aria={t('Budget de croissance consommé')} />
        <div className="grow t13 c2">{tf('{p} % des revenus la première année, puis {q} %. Au-delà, toute promotion s’arrête automatiquement.', { p: R.croissanceAn1Pct, q: R.croissanceEnsuitePct })}</div>
      </div>
      <div className="mt12">
        <Kv k={t('Livraison offerte (dépense commerciale)')} v={`${F(v.mois.livraisonOfferte)} F`} />
        <Kv k={t('Gestes commerciaux du support')} v={ouverte('support') ? <Link to={chemin('support')}>{`${F(v.mois.gestes)} F`}</Link> : `${F(v.mois.gestes)} F`} />
        <Kv k={t('Ventes flash financées par BelivaY')} v={`${F(v.mois.remisesBelivay)} F`} />
        <Kv k={t('Disponible')} v={<b>{`${F(Math.max(0, b.croissanceMax - b.croissanceConsomme))} F`}</b>} />
      </div>
      {b.arretCroissance && (
        <Note ton="red" icone="octagon-alert" className="mt12">
          {t('Budget atteint : les promotions financées par BelivaY sont arrêtées et une carte Direction est ouverte.')}
        </Note>
      )}
    </Panel>
  )
}

function BudgetVue({ v }: { v: VuePromotions }) {
  const { t, tf } = usePreferences()
  return (
    <div className="g g21">
      <BudgetPanel v={v} />
      <Panel titre={t('Revenus et volume du mois')} icone="coins">
        <Kv k={t('Revenus BelivaY (commissions et frais de livraison nets)')} v={`${F(v.mois.revenus)} F`} />
        <Kv k={t('Volume d’affaires')} v={`${F(v.mois.volume)} F`} />
        <Kv k={t('Plafond de fidélité et codes promo')} v={tf('{p} % du volume', { p: pct(R.fidelitePlafondPct) })} />
        <Kv k={t('Limite de générosité')} v={tf('{a} % au lancement, puis {b} %', { a: R.generositeLancementPct, b: R.generositeCourantPct })} />
        <RegleSms />
      </Panel>
    </div>
  )
}
