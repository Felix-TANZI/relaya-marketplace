// ADM-P30 · Fraude et anneaux (ADM-12 § 44). Structure du prototype : indicateurs, « Nouvelle alerte · à instruire »,
// « Signaux relevés sur 30 jours », « Toutes les alertes » ; revue (?alerte=) : graphe des liens, historique commun,
// « Avant de décider », comptes liés, décision ; gel conservatoire à quatre yeux. Les alertes sont CALCULÉES par la
// source (même appareil, même numéro Mobile Money, remboursements automatiques, refus au comptoir, avis croisés,
// retraits Wallet) avec les seuils du registre ; jamais d'action automatique. Décider : Direction et Médiation
// (fraude.decider) ; l'Audit instruit sans décider ; le Support lit. Le gel s'applique à la contre-signature d'un
// AUTRE compte (Finance, G01) et se revoit tous les ADM-GEL-FRAUDE-J jours (G06).
import { LienPoste } from '../../composants/poste/LienPoste'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Masque } from '../../composants/Masque'
import { Perimetre } from '../../composants/Perimetre'
import { AucunResultat, Barre, BarresH, Frise, Kpi, Kv, Li, Note, Panel, Pill, Puces, Px, Recherche, Sec, St, Table, Vide, correspond, useSurtitre, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { AlerteFraude, EtatAlerte, NoeudGraphe, TableauFraude } from '../../donnees/domaines/gouvernance'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, usePeut, useSession } from '../../session'
import { EtatLecture, NOM_ESPACE, useDate, useRaison } from './commun-s6'
import { useFonctions } from '../AJ-A/fonctions-page'

const JOUR = 86_400_000
export const TYPE_ALERTE = (a: Pick<AlerteFraude, 'type' | 'lien'>) =>
  a.type === 'anneau' ? (a.lien === 'numero' ? 'Même numéro de versement' : a.lien === 'moyen' ? 'Même moyen de paiement' : 'Même appareil') : { remboursements: 'Remboursements automatiques répétés', comptoir: 'Refus répétés au comptoir', avis_croises: 'Avis croisés entre deux comptes', retraits: 'Retraits Wallet anormaux en 24 h', signalement: 'Signalement d’un espace' }[a.type]
const ETAT: Record<EtatAlerte, [string, Ton]> = {
  nouvelle: ['Nouvelle', 'red'],
  revue: ['En revue', 'amber'],
  gel_demande: ['Gel demandé, quatre yeux', 'amber'],
  gel: ['Gel conservatoire', 'red'],
  classee: ['Classée', 'green'],
  sanction_proposee: ['Sanction proposée', 'violet'],
  gel_leve: ['Gel levé', 'green'],
}
const ouverte = (e: EtatAlerte) => e === 'nouvelle' || e === 'revue' || e === 'gel_demande' || e === 'gel'

export default function Fraude() {
  const [params] = useSearchParams()
  const id = params.get('alerte')
  return id ? <Revue id={id} /> : <Liste />
}

function Liste() {
  const { t, tf } = usePreferences()
  const surtitre = useSurtitre()
  const date = useDate()
  const naviguer = useNavigate()
  const droit = useDroit('fraude')
  const [params, setParams] = useSearchParams()
  const l = useLecture(() => source.gouvernance.fraude(), [])
  const q = params.get('q') ?? ''
  const statut = (params.get('statut') ?? 'ouvertes') as 'ouvertes' | 'toutes' | 'closes'
  const poser = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }
  const instruire = async (a: AlerteFraude) => {
    if (droit.acces === 'oui') await source.gouvernance.ouvrirRevue(a.id)
    naviguer(chemin('fraude', { alerte: a.id }))
  }
  const plusAncienne = (d: TableauFraude) => [...d.alertes].filter((a) => a.etat === 'nouvelle').sort((x, y) => x.detecteeLe - y.detecteeLe)[0]
  const al = l.donnees?.alertes ?? []
  const premiere = l.donnees ? plusAncienne(l.donnees) : undefined
  const enRevue = al.filter((a) => a.etat === 'revue')
  const fonctions = useFonctions([
    { verbe: 'Instruire', n: al.filter((a) => a.etat === 'nouvelle').length, unite: ['alerte', 'alertes'], icone: 'shield-alert', alerte: true, ...(droit.acces === 'oui' && premiere ? { onClick: () => void instruire(premiere) } : { route: 'fraude', params: { alerte: premiere?.id } }) },
    { verbe: 'Trancher', n: enRevue.length, unite: ['revue', 'revues'], icone: 'gavel', route: 'fraude', params: { alerte: enRevue[0]?.id } },
    { verbe: 'Revoir', n: al.filter((a) => a.etat === 'gel' || a.etat === 'gel_demande').length, unite: ['gel', 'gels'], icone: 'snowflake', route: 'fraude', params: { alerte: al.find((a) => a.etat === 'gel' || a.etat === 'gel_demande')?.id } },
    { verbe: 'Contrôler', n: null, unite: ['décision', 'décisions'], icone: 'scroll-text', route: 'journal', params: { q: 'fraude' } },
  ])
  return (
    <Ecran
      route="fraude"
      kicker={surtitre}
      fonctions={fonctions}
      actions={<LienPoste genre="signalement" />}
    >
      <Px>
        <Perimetre route="fraude" />
        <EtatLecture l={l} quoi="les alertes de fraude">
          {(d) => {
            const h = plusAncienne(d)
            const liste = d.alertes.filter((a) => (statut === 'toutes' ? true : statut === 'ouvertes' ? ouverte(a.etat) : !ouverte(a.etat))).filter((a) => correspond(q, a.id, t(TYPE_ALERTE(a)), a.zone, ...a.comptes.map((c) => c.nom), a.identifiantMasque))
            const max = Math.max(1, ...d.signaux.map((s) => s.n))
            return (
              <>
                <div className="g g4">
                  <Kpi k={t('Alertes à instruire')} v={d.alertes.filter((a) => a.etat === 'nouvelle').length} s={h ? tf('{id} · détectée {quand}', { id: h.id, quand: date(h.detecteeLe) }) : t('Aucune alerte nouvelle')} icone="shield-alert" iton="red" />
                  <Kpi k={t('Revues en cours')} v={d.alertes.filter((a) => a.etat === 'revue').length} s={t('Graphe vu, décision à prendre')} icone="scan-search" iton="amber" />
                  <Kpi k={t('Gels conservatoires')} v={d.alertes.filter((a) => a.etat === 'gel' || a.etat === 'gel_demande').length} s={tf('À quatre yeux, revus tous les {n} jours', { n: d.regles.gelRevueJ })} icone="snowflake" />
                  <Kpi k={tf('Issues sur {n} jours', { n: d.regles.fenetreJ })} v={d.issues30j.classees + d.issues30j.sanctions + d.issues30j.gelsLeves} s={tf('{c} classées · {s} sanctions proposées · {a} automatique', { c: d.issues30j.classees, s: d.issues30j.sanctions, a: d.issues30j.automatiques })} icone="gavel" ton="night" />
                </div>
                <div className="g g21">
                  {h ? (
                    <div className="hero night" style={{ marginTop: 0 }}>
                      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                        <span className="hk">{t('Nouvelle alerte · à instruire')}</span>
                        <Pill ton="dk" icone="clock">
                          {date(h.detecteeLe)}
                        </Pill>
                      </div>
                      <div className="ht mt8">{`${h.id} · ${t(TYPE_ALERTE(h))}`}</div>
                      <div className="hs">{h.signalement ? `${t(NOM_ESPACE[h.signalement.espace])} · ${h.signalement.objet} · ${h.signalement.motif}` : tf('Zone {zone} · {n} comptes liés', { zone: h.zone ?? '—', n: h.comptes.length })}</div>
                      <div className="adme-chips">
                        {h.comptes.map((c) => (
                          <Pill key={c.id} ton="dk" sm>
                            {`${c.nom} · ${t(NOM_ESPACE[c.espace])}`}
                          </Pill>
                        ))}
                      </div>
                      <div className="adme-m4">
                        <div className="m4">
                          <div className="l">
                            <Icone nom="users" taille={14} />
                            {t('Mesure')}
                          </div>
                          <div className="v">{h.mesure}</div>
                          <div className="s">{tf('seuil : {n}', { n: h.seuil })}</div>
                        </div>
                        <div className="m4">
                          <div className="l">
                            <Icone nom="shopping-bag" taille={14} />
                            {t('Commandes')}
                          </div>
                          <div className="v">{h.comptes.reduce((a, c) => a + c.commandes, 0)}</div>
                          <div className="s">{t('des comptes liés')}</div>
                        </div>
                        <div className="m4">
                          <div className="l">
                            <Icone nom="smartphone" taille={14} />
                            {t('Identifiant partagé')}
                          </div>
                          <div className="v" style={{ fontSize: 16 }}>
                            {h.identifiantMasque ?? '—'}
                          </div>
                          <div className="s">{t('masqué')}</div>
                        </div>
                        <div className="m4">
                          <div className="l">
                            <Icone nom="gauge" taille={14} />
                            {t('Niveau')}
                          </div>
                          <div className="v" style={{ fontSize: 16 }}>
                            {t(h.niveau === 'critique' ? 'Critique' : 'Attention')}
                          </div>
                          <div className="s">{t('critique au double du seuil')}</div>
                        </div>
                      </div>
                      <div className="adme-btns">
                        {droit.acces === 'oui' && (
                          <button type="button" className="btn primary" onClick={() => void instruire(h)}>
                            <Icone nom="scan-search" taille={18} />
                            <span>{t('Ouvrir une revue')}</span>
                          </button>
                        )}
                        <Link className="btn dark" to={chemin('fraude', { alerte: h.id })}>
                          <Icone nom="waypoints" taille={18} />
                          <span>{t('Voir le graphe')}</span>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <Panel titre={t('Nouvelle alerte · à instruire')} icone="shield-check">
                      <Vide icone="shield-check" t={t('Aucune alerte nouvelle')} />
                    </Panel>
                  )}
                  <Panel titre={tf('Signaux relevés sur {n} jours', { n: d.regles.fenetreJ })} icone="radar">
                    <BarresH largeurLibelle={170} lignes={d.signaux.map((s) => ({ l: t(TYPE_ALERTE(s)), v: s.n, max, r: String(s.n) }))} />
                  </Panel>
                </div>
                <Sec t={t('Toutes les alertes')} />
                <Table
                  outils={
                    <>
                      <Recherche q={q} setQ={(v) => poser('q', v)} placeholder={t('Alerte, compte, zone…')} aria={t('Rechercher une alerte')} />
                      <Puces
                        aria={t('Statut')}
                        actif={statut}
                        choisir={(v) => poser('statut', v === 'ouvertes' ? '' : v)}
                        items={[
                          { id: 'ouvertes', t: 'Ouvertes', n: d.alertes.filter((a) => ouverte(a.etat)).length },
                          { id: 'closes', t: 'Tranchées', n: d.alertes.filter((a) => !ouverte(a.etat)).length },
                          { id: 'toutes', t: 'Toutes', n: d.alertes.length },
                        ]}
                      />
                      <span className="sp" />
                      <span className="lock">
                        <Icone nom="eye-off" taille={15} />
                        {t('Critères de détection internes')}
                      </span>
                    </>
                  }
                  cle={(a) => a.id}
                  ligneCls={(a) => (a.etat === 'nouvelle' ? 'bad' : a.etat === 'revue' || a.etat === 'gel_demande' ? 'warn' : undefined)}
                  rows={liste}
                  vide={<AucunResultat effacer={() => setParams({}, { replace: true })} />}
                  cols={[
                    { k: 'a', t: t('Alerte'), main: true, rendu: (a) => (<><b className="mono">{a.id}</b><div className="t2">{t(TYPE_ALERTE(a))}</div></>) },
                    { k: 'z', t: t('Zone'), rendu: (a) => a.zone ?? '—' },
                    { k: 'w', t: t('Comptes liés'), rendu: (a) => (<>{a.comptes.slice(0, 2).map((c) => c.nom).join(', ')}{a.comptes.length > 2 ? ' …' : ''}<div className="t2">{tf('{n} compte(s)', { n: a.comptes.length })}</div></>) },
                    { k: 'd', t: t('Détectée'), rendu: (a) => date(a.detecteeLe) },
                    { k: 's', t: t('Statut'), rendu: (a) => <St t={t(ETAT[a.etat][0])} ton={ETAT[a.etat][1]} /> },
                    { k: 'i', t: t('Issue'), hideM: true, rendu: (a) => a.issue?.motif ?? (a.gel ? t('Versements retenus à titre conservatoire') : t('À instruire')) },
                    {
                      k: 'go',
                      t: '',
                      cls: 'r',
                      rendu: (a) =>
                        a.etat === 'nouvelle' && droit.acces === 'oui' ? (
                          <button type="button" className="btn sm primary" onClick={() => void instruire(a)}>
                            {t('Ouvrir une revue')}
                          </button>
                        ) : (
                          <Link className="btn sm secondary" to={chemin('fraude', { alerte: a.id })} aria-label={tf('Voir l’alerte {id}', { id: a.id })}>
                            {t('Voir')}
                          </Link>
                        ),
                    },
                  ]}
                  pied={
                    <>
                      <span>{tf('{n} alertes · chacune a une issue : classée, revue ou sanction', { n: liste.length })}</span>
                      <span>{t('Aucune sanction automatique')}</span>
                    </>
                  }
                />
              </>
            )
          }}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}

// ── Graphe des liens ───────────────────────────────────────────────────────────────────────────────────────────────
const COULEUR: Record<NoeudGraphe['genre'], string> = { client: 'var(--blue)', vendeur: 'var(--or)', relais: 'var(--green)', appareil: 'var(--ink-3)', numero: 'var(--red)' }
const ARC: Record<string, { c: string; d?: string; w: number }> = { numero: { c: 'var(--red)', w: 3 }, appareil: { c: 'var(--ink-3)', d: '7 5', w: 2.2 }, relais: { c: 'var(--blue)', w: 2 }, note: { c: 'var(--amber)', d: '2 4', w: 2.4 }, retrait: { c: 'var(--red)', w: 2 } }

function Graphe({ a }: { a: AlerteFraude }) {
  const { t } = usePreferences()
  const W = 780
  const gauche = a.noeuds.filter((n) => n.genre === 'client')
  const milieu = a.noeuds.filter((n) => n.genre === 'numero' || n.genre === 'appareil' || n.genre === 'relais')
  const droite = a.noeuds.filter((n) => n.genre === 'vendeur')
  const H = Math.max(240, 110 * Math.max(gauche.length, milieu.length, droite.length))
  const pos: Record<string, { x: number; y: number }> = {}
  const placer = (l: NoeudGraphe[], x: number) => l.forEach((n, i) => (pos[n.id] = { x, y: ((i + 0.5) * H) / l.length }))
  placer(gauche, 150)
  placer(milieu, 420)
  placer(droite, droite.length && !gauche.length ? 150 : 600)
  if (droite.length && !gauche.length) placer(milieu, 560)
  return (
    <div className="adme-graph">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Graphe des liens entre comptes')}>
        {a.arcs.map((e, i) => {
          const p = pos[e.de]
          const q = pos[e.vers]
          if (!p || !q) return null
          const s = ARC[e.nature]
          const mx = p.x + (q.x - p.x) * 0.55
          const my = p.y + (q.y - p.y) * 0.55
          return (
            <g key={i}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={s.c} strokeWidth={s.w} strokeDasharray={s.d} strokeLinecap="round" />
              {e.n !== null && (
                <>
                  <circle cx={mx} cy={my} r="11" fill="var(--card)" stroke={s.c} strokeWidth="2" />
                  <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--ink)">
                    {e.n}
                  </text>
                </>
              )}
            </g>
          )
        })}
        {a.noeuds.map((n) => {
          const p = pos[n.id]
          if (!p) return null
          const r = n.chaud ? 28 : 22
          const cote = p.x < 300 ? 'end' : p.x >= 560 ? 'start' : 'middle'
          const lx = cote === 'end' ? p.x - r - 10 : cote === 'start' ? p.x + r + 10 : p.x
          const ly = cote === 'middle' ? p.y + r + 16 : p.y - 2
          return (
            <g key={n.id}>
              {n.chaud && <circle cx={p.x} cy={p.y} r={r + 11} fill="var(--red)" opacity=".14" />}
              <circle cx={p.x} cy={p.y} r={r + 3} fill="var(--card)" />
              <circle cx={p.x} cy={p.y} r={r} fill={COULEUR[n.genre]} />
              <text x={lx} y={ly} textAnchor={cote} fontSize="13" fontWeight="800" fill="var(--ink)">
                {n.libelle}
              </text>
              <text x={lx} y={ly + 15} textAnchor={cote} fontSize="11" fontWeight="600" fill="var(--ink-3)">
                {t(n.sous)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Revue d'une alerte ─────────────────────────────────────────────────────────────────────────────────────────────
function Revue({ id }: { id: string }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const raison = useRaison()
  const droit = useDroit('fraude')
  const decide = usePeut('fraude.decider')
  const { interrupteurs } = useSession()
  const l = useLecture(() => source.gouvernance.alerte(id), [id])
  const [feuille, setFeuille] = useState<null | 'gel' | 'classer' | 'sanction' | 'lever'>(null)
  const [coches, setCoches] = useState<number[]>([])
  const fermer = () => setFeuille(null)
  const a = l.donnees
  const CONTROLES = ['Tous les liens vus : numéro, appareil, relais', 'Photos de remise au relais contrôlées', 'Historique du Trust Score du vendeur consulté', 'Aucun contact avec les comptes signalés avant la décision', 'Les avis restent en ligne : seule la Médiation retire un avis, par décision motivée']
  const pret = coches.length === CONTROLES.length
  const vendeur = a?.comptes.find((c) => c.espace === 'vendeur')
  return (
    <Ecran
      route="fraude"
      titre={a ? tf('Revue {id} · {type}', { id: a.id, type: t(TYPE_ALERTE(a)) }) : t('Revue d’une alerte')}
      nom={id}
      retour={chemin('fraude')}
      kicker={a?.revue ? tf('Revue ouverte par {qui} · {quand}', { qui: a.revue.par, quand: date(a.revue.le) }) : undefined}
      sous={t('Alerte → graphe → revue → décision. Aucune sanction n’est automatique, et aucun des comptes liés ne voit quoi que ce soit avant votre décision.')}
      actions={
        <Link className="btn secondary" to={chemin('fraude')}>
          <Icone nom="arrow-left" taille={18} />
          <span>{t('Toutes les alertes')}</span>
        </Link>
      }
    >
      <Px>
        <EtatLecture l={l} quoi="l’alerte de fraude">
          {(x) =>
            !x ? (
              <Vide icone="search-x" t={t('Alerte introuvable')} s={t('Cet identifiant ne correspond à aucune alerte.')} action={<Link className="btn secondary" to={chemin('fraude')}>{t('Toutes les alertes')}</Link>} />
            ) : (
              <>
                {!x.revue && droit.acces === 'oui' && (
                  <div className="dk-banner amber">
                    <Icone nom="scan-search" taille={20} />
                    <div className="grow">
                      <b>{t('Revue non ouverte.')}</b> {t('Ouvrir la revue montre tous les liens ; l’ouverture est journalisée et précède toute décision.')}
                    </div>
                    <button type="button" className="btn sm primary" onClick={() => void source.gouvernance.ouvrirRevue(x.id)}>
                      {t('Ouvrir la revue')}
                    </button>
                  </div>
                )}
                {(x.etat === 'gel' || x.etat === 'gel_demande') && x.gel && <Gel a={x} lever={() => setFeuille('lever')} sanction={() => setFeuille('sanction')} decide={decide} />}
                {x.issue && x.etat !== 'gel' && (
                  <Note ton={x.etat === 'sanction_proposee' ? 'violet' : 'green'} icone={x.etat === 'sanction_proposee' ? 'gavel' : 'circle-check'}>
                    <b>{t(ETAT[x.etat][0])}</b> · {tf('{qui}, {quand} :', { qui: x.issue.par, quand: date(x.issue.le) })} « {x.issue.motif} »
                    {x.etat === 'sanction_proposee' && (
                      <>
                        {' '}
                        <Link to={chemin('sanctions')}>{t('Voir le dossier dans Sanctions et recours')}</Link>
                      </>
                    )}
                  </Note>
                )}
                <div className="g g21 adme-rv" style={{ marginTop: 6 }}>
                  <div className="adme-rvl">
                    {x.signalement && (
                      <Panel titre={t('Signalement reçu')} icone="flag">
                        <Kv k={t('Espace')} v={t(NOM_ESPACE[x.signalement.espace])} />
                        <Kv k={t('Objet')} v={<b className="mono">{x.signalement.objet}</b>} />
                        <Kv k={t('Motif')} v={x.signalement.motif} />
                      </Panel>
                    )}
                    <Panel titre={t('Graphe des liens')} icone="waypoints" droite={<Pill ton="green" sm icone="check">{t('Tous les liens affichés')}</Pill>}>
                      <Graphe a={x} />
                      <div className="adme-leg">
                        <span><i style={{ borderTopColor: 'var(--red)' }} />{t('Même numéro Mobile Money (nombre de commandes)')}</span>
                        <span><i style={{ borderTopColor: 'var(--ink-3)', borderTopStyle: 'dashed' }} />{t('Même appareil')}</span>
                        <span><i style={{ borderTopColor: 'var(--blue)' }} />{t('Même relais habituel')}</span>
                        {x.type === 'avis_croises' && <span><i style={{ borderTopColor: 'var(--amber)', borderTopStyle: 'dotted' }} />{t('Avis réciproques')}</span>}
                      </div>
                      {x.identifiantMasque && (x.lien === 'numero' || x.lien === 'moyen') && (
                        <div className="row mt10" style={{ gap: 8, flexWrap: 'wrap' }}>
                          <span className="t13 b7">{t('Numéro partagé')}</span>
                          <Masque donnee="Numéro Mobile Money" masque={x.identifiantMasque} demasquer={(m) => source.gouvernance.demasquerIdentifiant(x.id, m)} />
                        </div>
                      )}
                    </Panel>
                    <div className="g g2">
                      <Panel titre={t('Historique commun')} icone="history">
                        <Frise items={x.historique.map((h, i) => ({ t: `${date(h.le)} — ${h.t}`, d: h.d, st: i === x.historique.length - 1 ? 'cur' : 'done' }))} />
                      </Panel>
                      <Panel titre={t('Avant de décider')} icone="list-checks">
                        {CONTROLES.map((c, i) => (
                          <label key={c} className="e-case">
                            <input type="checkbox" checked={coches.includes(i)} disabled={!decide} onChange={(e) => setCoches((k) => (e.target.checked ? [...k, i] : k.filter((y) => y !== i)))} />
                            <span>{t(c)}</span>
                          </label>
                        ))}
                      </Panel>
                    </div>
                    <div className="hide-m" style={{ marginTop: 16 }}>
                      <Table
                        cle={(c) => c.id}
                        rows={x.comptes}
                        cols={[
                          { k: 'c', t: t('Compte'), main: true, rendu: (c) => <b>{c.nom}</b> },
                          { k: 'r', t: t('Rôle'), rendu: (c) => `${t(NOM_ESPACE[c.espace])} · ${c.zone ?? '—'}` },
                          { k: 'd', t: t('Créé le'), rendu: (c) => date(c.creeLe).split(' · ')[0] },
                          { k: 'n', t: t('Commandes'), cls: 'r', rendu: (c) => c.commandes },
                          { k: 'l', t: t('Liens relevés'), rendu: (c) => (<div className="row wrap" style={{ gap: 4 }}>{c.liens.map((k) => <Pill key={k} ton={k === 'numero' ? 'red' : k === 'relais' ? 'blue' : 'ink'} sm>{t({ numero: 'Numéro', appareil: 'Appareil', relais: 'Relais' }[k])}</Pill>)}</div>) },
                        ]}
                        pied={<span>{tf('{n} comptes · consultation journalisée', { n: x.comptes.length })}</span>}
                      />
                    </div>
                  </div>
                  <div className="adme-stack">
                    <Panel titre={t('Décision')} icone="gavel">
                      {!decide ? (
                        <Note ton="ink" icone="eye">
                          {droit.acces === 'oui' ? t('Votre rôle instruit (revue, graphe, journal) sans décider : la Direction ou la Médiation tranche.') : t('Lecture seule : la Direction ou la Médiation tranche.')}
                        </Note>
                      ) : !ouverte(x.etat) ? (
                        <Note ton="green" icone="circle-check">
                          {t('Alerte tranchée : une alerte tranchée n’est jamais rouverte par le calcul.')}
                        </Note>
                      ) : (
                        <>
                          {!x.revue && <Note ton="amber" icone="scan-search">{t('Ouvrez d’abord la revue.')}</Note>}
                          {x.revue && !pret && <Note ton="amber" icone="list-checks">{tf('Cochez les {n} contrôles « Avant de décider ».', { n: CONTROLES.length })}</Note>}
                          <details className="a-plie">
                            <summary>{t('Si l’auto-achat est confirmé :')}</summary>
                            <div className="a-plie-c t13">{t('veto, Trust Score plafonné et dossier de sanction. La décision reste humaine et motivée.')}</div>
                          </details>
                          <div className="adme-btns">
                            {vendeur && x.etat !== 'gel' && x.etat !== 'gel_demande' && (
                              <button type="button" className="btn primary" disabled={!x.revue || !pret} onClick={() => setFeuille('gel')}>
                                <Icone nom="snowflake" taille={18} />
                                <span>{t('Demander le gel conservatoire')}</span>
                              </button>
                            )}
                          </div>
                          <div className="adme-btns" style={{ marginTop: 8, flexDirection: 'column', alignItems: 'stretch' }}>
                            <button type="button" className="btn secondary" disabled={!x.revue || !pret} onClick={() => setFeuille('sanction')}>
                              <Icone nom="gavel" taille={18} />
                              <span>{t('Proposer une sanction')}</span>
                            </button>
                            {x.etat !== 'gel' && (
                              <button type="button" className="btn secondary" disabled={!x.revue || !pret} onClick={() => setFeuille('classer')}>
                                <Icone nom="archive" taille={18} />
                                <span>{t('Classer sans suite')}</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </Panel>
                    {interrupteurs['FF-IA'] && (
                      <Panel titre={t('Assistant · proposition')} icone="sparkles">
                        <p className="t13 c3">{t('L’assistant propose, vous décidez. Rien n’est exécuté sans votre clic.')}</p>
                      </Panel>
                    )}
                  </div>
                </div>
                {vendeur && (
                  <DecisionMotivee
                    ouverte={feuille === 'gel'}
                    fermer={fermer}
                    titre={t('Geler les versements à titre conservatoire')}
                    action="fraude.geler"
                    objet={x.id}
                    resume={tf('Le gel retient les versements de {v} le temps de décider. Il ne vaut ni sanction ni accusation ; montants calculés par le serveur, jamais saisis ; revue obligatoire tous les {n} jours.', { v: vendeur.nom, n: x.revueGelJ })}
                    preuves={[
                      { id: 'graphe', libelle: tf('Graphe des liens · {n} comptes', { n: x.comptes.length }), route: 'fraude', params: { alerte: x.id } },
                      { id: 'historique', libelle: t('Historique commun des comptes') },
                    ]}
                    quatreYeux
                    rolesSecond={['finance', 'superviseur']}
                    apres={(r) => r && void source.gouvernance.lierGel(x.id, r.id)}
                  />
                )}
                <DecisionMotivee ouverte={feuille === 'classer'} fermer={fermer} titre={t('Classer sans suite')} resume={t('Le signal ne tient pas : l’alerte est close avec son motif écrit, visible au journal, jamais par les comptes signalés.')} libelle="Classer sans suite" icone="archive" envoyer={async (m) => { const r = await source.gouvernance.classerAlerte(x.id, m); return r.ok ? null : raison(r.raison, { pas_de_revue: 'Ouvrez d’abord la revue.', deja_tranchee: 'Cette alerte est déjà tranchée.' }) }} />
                <DecisionMotivee ouverte={feuille === 'sanction'} fermer={fermer} titre={t('Proposer une sanction')} resume={t('Ouvre un dossier dans Sanctions et recours ; l’acteur garde son droit de recours. La Médiation décide.')} libelle="Proposer une sanction" icone="gavel" envoyer={async (m) => { const r = await source.gouvernance.proposerSanction(x.id, m); return r.ok ? null : raison(r.raison, { pas_de_revue: 'Ouvrez d’abord la revue.', deja_tranchee: 'Cette alerte est déjà tranchée.' }) }} />
                <DecisionMotivee ouverte={feuille === 'lever'} fermer={fermer} titre={t('Lever le gel')} resume={t('Les versements retenus partent au vendredi suivant ; la levée est journalisée avec son motif.')} libelle="Lever le gel" icone="lock-open" envoyer={async (m) => { const r = await source.gouvernance.leverGel(x.id, m); return r.ok ? null : raison(r.raison, { pas_de_gel: 'Aucun gel actif sur cette alerte.' }) }} />
              </>
            )
          }
        </EtatLecture>
      </Px>
    </Ecran>
  )
}

function Gel({ a, lever, sanction, decide }: { a: AlerteFraude; lever: () => void; sanction: () => void; decide: boolean }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const maintenant = useHorloge()
  const g = a.gel!
  const actif = a.etat === 'gel'
  const jour = actif && g.appliqueLe ? Math.floor((maintenant - g.appliqueLe) / JOUR) + 1 : 0
  const duree = g.revueLe && g.appliqueLe ? Math.round((g.revueLe - g.appliqueLe) / JOUR) : 0
  return (
    <div className="g g21" style={{ marginTop: 6 }}>
      <div className="adme-stack">
        <div className={'hero ' + (actif ? 'red' : 'night')} style={{ marginTop: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <span className="hk">{actif ? t('Gel conservatoire actif') : t('Gel demandé · en attente du second validateur')}</span>
            <Pill ton="dk" icone="snowflake">
              {actif ? tf('Jour {j} · revue tous les {n} jours', { j: jour, n: duree }) : t('Quatre yeux')}
            </Pill>
          </div>
          <div className="row mt10 adme-bigrow" style={{ gap: 16, alignItems: 'flex-end' }}>
            <div className="bigN">
              {F(g.montant)}
              <small style={{ fontSize: 20, opacity: 0.75 }}> F</small>
            </div>
            <div className="grow hs" style={{ margin: 0 }}>
              {tf('retenus sur les versements de {v} ({n} commandes), calculés par le serveur.', { v: g.vendeur, n: g.commandes })}
            </div>
          </div>
          {actif && g.revueLe && (
            <>
              <div className="mt14">
                <Barre pct={Math.min(100, (100 * jour) / Math.max(1, duree))} ton="red" />
              </div>
              <div className="row mt8 t12" style={{ justifyContent: 'space-between' }}>
                <span>{date(g.appliqueLe!)}</span>
                <span>{tf('Revue au plus tard : {d}', { d: date(g.revueLe) })}</span>
              </div>
            </>
          )}
          <div className="hs mt12">{t('Le gel ne se prolonge jamais seul : à chaque revue, il est levé ou transformé en décision. Aucun montant n’est saisi à la main.')}</div>
          {actif && decide && (
            <div className="adme-btns">
              <button type="button" className="btn white" onClick={sanction}>
                <Icone nom="gavel" taille={18} />
                <span>{t('Proposer une sanction')}</span>
              </button>
              <button type="button" className="btn dark" onClick={lever}>
                <Icone nom="lock-open" taille={18} />
                <span>{t('Lever le gel')}</span>
              </button>
            </div>
          )}
        </div>
        <Panel titre={t('Ce que le gel ne touche pas')} icone="shield-check">
          <Li icone="shopping-bag" ton="green" t={t('Les commandes en cours suivent leur cours')} s={t('Les clients liés gardent leurs commandes ; aucun compte n’est fermé sur soupçon')} />
          <Li icone="star" ton="amber" t={t('Les avis restent en ligne')} s={t('Seule la Médiation retire un avis, par décision motivée')} />
          <Li icone="gauge" ton="acc" t={t('Le veto n’est pas encore appliqué')} s={t('Seulement si l’auto-achat est confirmé par décision')} />
        </Panel>
      </div>
      <Panel titre={t('Validation à quatre yeux')} icone="users" a={{ t: t('Quatre yeux'), to: chemin('quatreyeux') }}>
        <Frise
          items={[
            { t: tf('{d} · Demande', { d: date(g.demandeLe) }), d: tf('Décision {qy} · motif écrit', { qy: g.qy }), st: 'done' },
            { t: g.appliqueLe ? tf('{d} · Validation par un autre compte', { d: date(g.appliqueLe) }) : t('Second validateur : Finance ou Direction, un autre compte'), d: t('Personne différente vérifiée par le serveur'), st: g.appliqueLe ? 'done' : 'cur' },
            { t: t('Versements retenus par le serveur'), d: tf('{m} F sur {n} commandes · aucune écriture modifiée', { m: F(g.montant), n: g.commandes }), st: g.appliqueLe ? 'done' : '' },
            { t: t('Revue : levée ou décision'), d: g.revueLe ? date(g.revueLe) : '—', st: g.appliqueLe ? 'cur' : '' },
          ]}
        />
      </Panel>
    </div>
  )
}
