// ENT-P25 · Rapports, repris sur le prototype (route('rapports')) : barre de filtres (période, zone, livreur, type,
// comparaison avec la période précédente), quatre indicateurs (prestations validées absentes pour le répartiteur),
// colis et prestations par jour, par zone et par type, indicateurs définis comme la console et le Trust Score
// (ENT-P25R-03), tableau par livreur (aucune donnée de client, ENT-P25R-01), rapport de fin de pilote (au dernier jour
// du pilote, ENT-P25R-04). Sous ENT-RAPPORT-MIN-MISSIONS missions : « peu de données », rien d'extrapolé, exports
// fermés (état s=peu du prototype). Remplissage moyen = colis par tournée relais, objectif du registre (ENT-P25R-02).
// Enrichi (M6, M15) : exports en vrais fichiers rendus par la source (PDF « %PDF », CSV « ; ») ; période gardée dans
// l'adresse (?periode=) ; rapport programmé chaque vendredi (feuille ?sheet=programme : heure, format, destinataire
// interne ; enregistré par geste, prochain envoi en compte à rebours ; un exemplaire téléchargeable tout de suite) ;
// le répartiteur le lit, le propriétaire et le comptable le règlent.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { geste } from '../../donnees/fileHorsLigne'
import type { ProgrammeRapport } from '../../donnees/domaines/rapports'
import { Icone } from '../../composants/Icone'
import { Ecran } from '../../composants/coque'
import { Barre, BarrePouce, type Colonne, Hint, Interdit, Kpi, Kv, Li, Note, Panel, Px, Qui, Rebours, Table, telechargerFichier, Tete, Tg, useLarge, Vide } from '../../composants/prototype'
import type { FiltreRapport, Indicateurs, Rapport } from '../../donnees/domaines/rapports'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { JOUR, jourDe } from '../../calculs/temps'
import { OUTILS } from '../../calculs/ent08'
import { PARAMETRES } from '../../calculs/registre'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useSession } from '../../session'
import { Chargement, ErreurLecture, useAnnonce, useDates, useEnLigne, useF } from '../ENT-07/commun'
import { usePeut } from '../../session'
import './ent08.css'

type Periode = 'pilote' | '7' | '30' | 'dates'
type Livreur = Rapport['parLivreur'][number]
// Le serveur pourra détailler les prestations par zone et par type (INTEGRATION.md) : lues si présentes.
type ZoneR = Rapport['parZone'][number] & { prestations?: number | null }
type TypeR = Rapport['parType'][number] & { prestations?: number | null }

/** CH.bars du prototype : barres verticales (valeurs au-dessus, jour dessous, la plus haute en orange). */
function Barres({ data, aria }: { data: { l: string; v: number; on?: boolean }[]; aria: string }) {
  const W = 600
  const H = 170
  const pad = 26
  const max = Math.max(...data.map((d) => d.v), 1) * 1.15
  const bw = (W - pad * 2) / Math.max(1, data.length)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + 26}`} role="img" aria-label={aria}>
      {[0, 1, 2, 3].map((i) => {
        const y = pad + ((H - pad) * i) / 3
        return <line key={i} x1={pad} x2={W - 6} y1={y} y2={y} stroke="var(--line-2)" strokeDasharray="3 4" />
      })}
      {data.map((d, i) => {
        const h = ((H - pad) * d.v) / max
        const x = pad + i * bw + bw * 0.18
        const y = H - h
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw * 0.64} height={h} rx={6} fill={d.on ? 'var(--or)' : 'var(--acc)'} />
            <text x={x + bw * 0.32} y={y - 6} textAnchor="middle">
              {d.v}
            </text>
            <text x={x + bw * 0.32} y={H + 18} textAnchor="middle">
              {d.l}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** CH.line du prototype : une courbe, aire légère, dernier point marqué. */
function Courbe({ valeurs, labels, aria }: { valeurs: number[]; labels: string[]; aria: string }) {
  const W = 600
  const H = 170
  const pad = 28
  const max = Math.max(...valeurs, 1) * 1.15
  const X = (i: number) => pad + ((W - pad * 2) * i) / Math.max(1, labels.length - 1)
  const Y = (v: number) => H - ((H - pad) * v) / max
  const d = valeurs.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ')
  const li = valeurs.length - 1
  const pas = labels.length <= 12 ? 1 : Math.ceil(labels.length / 8)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + 26}`} role="img" aria-label={aria}>
      {[0, 1, 2, 3].map((i) => {
        const y = pad + ((H - pad) * i) / 3
        return <line key={i} x1={pad} x2={W - 6} y1={y} y2={y} stroke="var(--line-2)" strokeDasharray="3 4" />
      })}
      {li >= 0 && (
        <>
          <path d={`${d} L${X(li)} ${H} L${X(0)} ${H}Z`} fill="var(--or)" opacity={0.12} />
          <path d={d} fill="none" stroke="var(--or)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={X(li)} cy={Y(valeurs[li])} r={4.5} fill="var(--or)" stroke="var(--card)" strokeWidth={2} />
        </>
      )}
      {labels.map((l, i) =>
        i % pas === 0 ? (
          <text key={i} x={X(i)} y={H + 18} textAnchor="middle">
            {l}
          </text>
        ) : null,
      )}
    </svg>
  )
}

/** CH.donut du prototype : anneau à deux parts, pourcentage au centre. */
function Anneau({ parts, centre, sous }: { parts: { v: number; couleur: string }[]; centre: string; sous: string }) {
  const S = 132
  const r = S / 2 - 14
  const c = 2 * Math.PI * r
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1
  let off = 0
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} style={{ flexShrink: 0 }} aria-hidden="true">
      <circle cx={S / 2} cy={S / 2} r={r} fill="none" stroke="var(--sand-3)" strokeWidth={18} />
      {parts.map((p, i) => {
        const l = (c * p.v) / tot
        const el = <circle key={i} cx={S / 2} cy={S / 2} r={r} fill="none" stroke={p.couleur} strokeWidth={18} strokeDasharray={`${Math.max(0, l - 2).toFixed(1)} ${c.toFixed(1)}`} strokeDashoffset={(-off).toFixed(1)} transform={`rotate(-90 ${S / 2} ${S / 2})`} />
        off += l
        return el
      })}
      <text x={S / 2} y={S / 2 + 2} textAnchor="middle" fontSize={Math.round(S / 6)} fontWeight={800} fill="var(--ink)">
        {centre}
      </text>
      <text x={S / 2} y={S / 2 + 20} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink-3)">
        {sous}
      </text>
    </svg>
  )
}

/** CH.hbars du prototype : barres horizontales (libellé, barre, valeur). */
function HBarres({ rows }: { rows: { l: string; v: number; max: number; r: string }[] }) {
  return (
    <>
      {rows.map((x) => (
        <div key={x.l} className="row e8-hb" style={{ gap: 10, padding: '7px 0' }}>
          <span className="t13 b7 e8-hb-l">{x.l}</span>
          <span className="grow">
            <Barre pct={(100 * x.v) / Math.max(1, x.max)} ton="acc" />
          </span>
          <span className="t13 b8 right e8-hb-r">{x.r}</span>
        </div>
      ))}
    </>
  )
}

export default function Rapports() {
  const { t, tf, langue } = usePreferences()
  const nb = (x: number) => (langue === 'fr' ? String(x).replace('.', ',') : String(x))
  const d = useDates()
  const f = useF()
  const s = useSession()
  const large = useLarge()
  const maintenant = useHorloge(60_000)
  const voir = useMontantsVisibles()
  const enLigne = useEnLigne()
  const { annoncer, vue } = useAnnonce()
  const aujourdhui = jourDe(maintenant)
  const debutPilote = jourDe(maintenant - ((s.entreprise?.pilote?.jour ?? 1) - 1) * JOUR)
  const [params, setParams] = useSearchParams()
  const periode: Periode = (['7', '30', 'dates'] as Periode[]).includes(params.get('periode') as Periode) ? (params.get('periode') as Periode) : 'pilote'
  const setPeriode = (p: Periode) =>
    setParams(
      (x) => {
        const n = new URLSearchParams(x)
        if (p === 'pilote') n.delete('periode')
        else n.set('periode', p)
        return n
      },
      { replace: true },
    )
  const programme = useFeuille('programme')
  const prog = useLecture(() => source.rapports.programme(), [])
  const [du, setDu] = useState(debutPilote)
  const [au, setAu] = useState(aujourdhui)
  const [zone, setZone] = useState('')
  const [livreur, setLivreur] = useState('')
  const [type, setType] = useState<'' | 'relais' | 'domicile'>('')
  const [comparer, setComparer] = useState(false)
  const bornes: [string, string] = periode === 'pilote' ? [debutPilote, aujourdhui] : periode === 'dates' ? [du <= au ? du : au, du <= au ? au : du] : [jourDe(maintenant - (Number(periode) - 1) * JOUR), aujourdhui]
  const filtre: FiltreRapport = { du: bornes[0], au: bornes[1], zone: zone || undefined, livreur: livreur || undefined, type: type || undefined }
  const lecture = useLecture(() => source.rapports.rapport(filtre), [filtre.du, filtre.au, zone, livreur, type])
  const reglages = useLecture(() => source.parametres.reglages(), [])
  const livreurs = useLecture(() => source.livreurs.liste(), [])
  const r = lecture.donnees
  const exporter = async (format: 'csv' | 'pdf') => {
    const x = await source.rapports.exporter(filtre, format)
    if (!x.ok) return annoncer(false, tf('Les exports s’ouvrent à {n} missions.', { n: OUTILS.rapportMin }))
    telechargerFichier(x)
    annoncer(true, format === 'pdf' ? t('Rapport PDF téléchargé.') : t('Rapport CSV téléchargé.'))
  }
  const acts = (
    <>
      <button type="button" className="btn secondary sm" onClick={programme.ouvrir}>
        <Icone nom="calendar-clock" taille={16} />
        {t('Rapport du vendredi')}
      </button>
      <button type="button" className="btn secondary sm" disabled={!r?.parlant || !enLigne} onClick={() => void exporter('csv')}>
        <Icone nom="file-spreadsheet" taille={16} />
        {t('Exporter en CSV')}
      </button>
      <button type="button" className="btn secondary sm" disabled={!r?.parlant || !enLigne} onClick={() => void exporter('pdf')}>
        <Icone nom="download" taille={16} />
        {t('Exporter en PDF')}
      </button>
    </>
  )
  const sansPrecedent = !!r && r.precedent.paquets === 0 && r.precedent.colis === 0
  const evol = (k: keyof Indicateurs) => {
    if (!comparer || !r || sansPrecedent) return null
    const a = r.indicateurs[k]
    const b = r.precedent[k]
    if (a === null || b === null) return null
    const diff = Math.round(10 * (a - b)) / 10
    return <span className={'e8-evol ' + (diff > 0 ? 'haut' : diff < 0 ? 'bas' : '')}>{tf('{d} vs période précédente', { d: `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${k === 'prestations' ? f(Math.abs(diff)) : nb(Math.abs(diff))}` })}</span>
  }
  const court = (j: string) => {
    const x = d.jour(j).split(' ').slice(0, 2).join(' ')
    return x.charAt(0).toUpperCase() + x.slice(1)
  }
  const pct = (v: number | null) => (v === null ? '—' : `${nb(v)} %`)
  const nomPeriode = periode === 'pilote' ? 'Depuis le début du pilote' : periode === 'dates' ? 'Dates choisies' : periode === '7' ? '7 derniers jours' : '30 derniers jours'

  const outils = (
    <div className="dt-wrap">
      <div className="dt-tools e8-outils">
        <label className="flt on">
          <Icone nom="calendar" taille={15} />
          <select aria-label={t('Période')} value={periode} onChange={(e) => setPeriode(e.target.value as Periode)}>
            {(['pilote', '7', '30', 'dates'] as Periode[]).map((p) => (
              <option key={p} value={p}>
                {t(p === 'pilote' ? 'Depuis le début du pilote' : p === 'dates' ? 'Dates choisies' : p === '7' ? '7 derniers jours' : '30 derniers jours')}
              </option>
            ))}
          </select>
        </label>
        {periode === 'dates' && (
          <>
            <label className="flt on">
              <span>{t('Du')}</span>
              <input type="date" value={du} max={aujourdhui} onChange={(e) => e.target.value && setDu(e.target.value)} />
            </label>
            <label className="flt on">
              <span>{t('Au')}</span>
              <input type="date" value={au} max={aujourdhui} onChange={(e) => e.target.value && setAu(e.target.value)} />
            </label>
          </>
        )}
        <label className={'flt' + (zone ? ' on' : '')}>
          <Icone nom="map-pin" taille={15} />
          <select aria-label={t('Zone')} value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="">{t('Zone : toutes')}</option>
            {(reglages.donnees?.zonesExploitees ?? []).map((z) => (
              <option key={z.code} value={z.code}>{`${z.code} ${z.nom}`}</option>
            ))}
          </select>
        </label>
        <label className={'flt' + (livreur ? ' on' : '')}>
          <Icone nom="users" taille={15} />
          <select aria-label={t('Livreur')} value={livreur} onChange={(e) => setLivreur(e.target.value)}>
            <option value="">{t('Livreur : tous')}</option>
            {(livreurs.donnees ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </select>
        </label>
        <label className={'flt' + (type ? ' on' : '')}>
          <Icone nom="boxes" taille={15} />
          <select aria-label={t('Type')} value={type} onChange={(e) => setType(e.target.value as '' | 'relais' | 'domicile')}>
            <option value="">{t('Type : tous')}</option>
            <option value="relais">{t('Tournées relais')}</option>
            <option value="domicile">{t('Courses domicile')}</option>
          </select>
        </label>
        <span className="sp"></span>
        {sansPrecedent ? (
          <span className="lock">
            <Icone nom="git-compare" taille={15} /> {t('Comparaison : aucune période précédente')}
          </span>
        ) : (
          <button type="button" className={'flt' + (comparer ? ' on' : '')} aria-pressed={comparer} onClick={() => setComparer(!comparer)}>
            <Icone nom="git-compare" taille={15} />
            {t('Comparer à la période précédente')}
          </button>
        )}
      </div>
    </div>
  )

  const remplissageBas = r?.indicateurs.remplissage !== null && r?.indicateurs.remplissage !== undefined && r.indicateurs.remplissage < OUTILS.alerteRemplissage.sous
  const finPilote = r ? d.jourLong(r.pilote.fin - JOUR) : ''

  const corps = () => {
    if (!r) return null
    const ind = r.indicateurs
    if (!r.parlant)
      return (
        <div className="g g21">
          <div className="panel">
            <Vide
              icone="chart-column"
              t={tf('Les chiffres deviennent parlants après {n} missions', { n: OUTILS.rapportMin })}
              s={tf('{m} mission(s) validée(s) sur la période : {p} paquet(s) clos, {c} colis remis. Les tableaux et les courbes s’affichent dès la {n}e mission validée ; rien n’est extrapolé.', { m: ind.missions, p: ind.paquets, c: ind.colis, n: OUTILS.rapportMin })}
            >
              <div style={{ maxWidth: 420, margin: '14px auto 0' }}>
                <Barre pct={(100 * ind.missions) / OUTILS.rapportMin} aria={tf('{m} mission(s) sur {n}', { m: ind.missions, n: OUTILS.rapportMin })} />
                <div className="row mt8 t12 c3" style={{ justifyContent: 'space-between' }}>
                  <span>{tf('{n} mission(s)', { n: ind.missions })}</span>
                  <span>{tf('{n} missions', { n: OUTILS.rapportMin })}</span>
                </div>
              </div>
            </Vide>
          </div>
          <Panel titre={t('Déjà mesuré')} icone="activity" id="deja-mesure">
            <Kv k={t('Paquets clos')} v={ind.paquets} />
            <Kv k={t('Colis remis')} v={ind.colis} />
            {voir && ind.prestations !== null && <Kv k={t('Prestations validées')} v={tf('{m}, comme le relevé provisoire', { m: f(ind.prestations) })} />}
            <Kv k={t('Paquets rendus')} v={ind.rendus} />
            <Hint icone="flag">{tf('Le rapport de fin de pilote sera généré ici le {j}, pour le bilan conjoint.', { j: finPilote })}</Hint>
          </Panel>
        </div>
      )
    const jours = r.parJour.slice(-14)
    const maxJour = Math.max(...jours.map((j) => j.colis), 0)
    const zones = r.parZone as ZoneR[]
    const typesR = r.parType as TypeR[]
    const maxZone = Math.max(1, ...zones.map((z) => z.colis))
    const prestZone = voir && zones.length > 0 && zones.every((z) => typeof z.prestations === 'number')
    const maxPZ = Math.max(1, ...zones.map((z) => z.prestations ?? 0))
    const relais = typesR.find((x) => x.type === 'relais')?.colis ?? 0
    const domicile = typesR.find((x) => x.type === 'domicile')?.colis ?? 0
    const totalType = relais + domicile
    const cols: Colonne<Livreur>[] = [
      { k: 'w', t: t('Livreur'), main: true, rendu: (l) => <Qui nom={l.nom} /> },
      { k: 'c', t: t('Colis'), cls: 'r', rendu: (l) => l.colis },
      { k: 'd', t: tf('Sous {h} h', { h: PARAMETRES.delais.livraisonH }), cls: 'r', rendu: (l) => pct(l.dansLeDelai) },
      { k: 'p', t: t('Preuves complètes'), cls: 'r', rendu: (l) => pct(l.preuvesCompletes) },
      ...(voir ? [{ k: 'm', t: t('Prestations validées'), cls: 'r', rendu: (l: Livreur) => <b>{l.prestations === null ? '—' : f(l.prestations)}</b> }] : []),
    ]
    const tuile = (k: string, v: string | number, def: string) => (
      <div className="tile" key={k} title={t(def)}>
        <div className="tk">
          {t(k)} <Icone nom="info" taille={13} style={{ color: 'var(--ink-4)', display: 'inline', verticalAlign: '-2px' }} />
        </div>
        <div className="tv" style={{ fontSize: 24 }}>
          {v}
        </div>
        <div className="ec8-def">{t(def)}</div>
      </div>
    )
    return (
      <>
        <div className="g g4">
          <Kpi k={t('Paquets')} v={ind.paquets} s={<>{tf('{m} mission(s) · {r} rendu(s)', { m: ind.missions, r: ind.rendus })} {evol('paquets')}</>} icone="boxes" />
          <Kpi k={t('Colis')} v={ind.colis} s={<>{tf('{r} en tournées relais, {d} à domicile', { r: relais, d: domicile })} {evol('colis')}</>} icone="package" />
          {voir && ind.prestations !== null && <Kpi k={t('Prestations validées')} v={f(ind.prestations).replace(/\s?F$/, '')} u="F" s={<>{t('égal au relevé · payé le vendredi')} {evol('prestations')}</>} icone="banknote" ton="night" />}
          <Kpi
            k={t('Remplissage moyen')}
            v={ind.remplissage === null ? '—' : nb(ind.remplissage)}
            u={t('colis / tournée')}
            s={<span className={remplissageBas ? 'ca' : undefined}>{tf('objectif {o}', { o: OUTILS.objectifTournee })}</span>}
            icone="layers"
          />
        </div>
        <div className={voir ? 'g g2' : 'e8-seul'}>
          <Panel titre={t('Colis par jour')} icone="chart-column">
            <Barres data={jours.map((j) => ({ l: court(j.jour), v: j.colis, on: maxJour > 0 && j.colis === maxJour }))} aria={jours.map((j) => `${d.jour(j.jour)} : ${j.colis}`).join(', ')} />
          </Panel>
          {voir && (
            <Panel titre={t('Prestations validées par jour')} icone="chart-line">
              <Courbe valeurs={jours.map((j) => j.prestations ?? 0)} labels={jours.map((j) => court(j.jour))} aria={jours.map((j) => `${d.jour(j.jour)} : ${f(j.prestations ?? 0)}`).join(', ')} />
              <div className="legend">
                <span>
                  <i style={{ background: 'var(--or)' }}></i>
                  {jours.map((j) => f(j.prestations ?? 0).replace(/\s?F$/, '')).join(' · ')} F
                </span>
              </div>
            </Panel>
          )}
        </div>
        <div className={prestZone ? 'g g3' : 'g g2'}>
          {prestZone && (
            <Panel titre={t('Prestations par zone')} icone="map-pinned">
              <HBarres rows={zones.map((z) => ({ l: `${z.zone} ${z.nom}`, v: z.prestations ?? 0, max: maxPZ, r: f(z.prestations ?? 0) }))} />
            </Panel>
          )}
          <Panel titre={t('Par type de paquet')} icone="chart-pie">
            <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
              <Anneau
                parts={[
                  { v: relais, couleur: 'var(--acc)' },
                  { v: domicile, couleur: 'var(--or)' },
                ]}
                centre={totalType ? `${Math.round((100 * relais) / totalType)} %` : '—'}
                sous={t('tournées relais')}
              />
              <div className="grow">
                <Kv
                  k={
                    <span className="row" style={{ gap: 6 }}>
                      <i className="e8-puce" style={{ background: 'var(--acc)' }}></i>
                      {t('Tournées relais')}
                    </span>
                  }
                  v={tf('{n} colis', { n: relais })}
                />
                <Kv
                  k={
                    <span className="row" style={{ gap: 6 }}>
                      <i className="e8-puce" style={{ background: 'var(--or)' }}></i>
                      {t('Courses domicile')}
                    </span>
                  }
                  v={tf('{n} colis', { n: domicile })}
                />
              </div>
            </div>
          </Panel>
          <Panel titre={t('Colis par zone')} icone="package">
            <HBarres rows={zones.map((z) => ({ l: `${z.zone} ${z.nom}`, v: z.colis, max: maxZone, r: String(z.colis) }))} />
          </Panel>
        </div>
        <div style={{ marginTop: 16 }}>
          <Panel titre={t('Indicateurs · mêmes définitions que la console et le Trust Score')} icone="gauge">
            <div className="ec8-ind">
              {tuile('Paquets', ind.paquets, 'Paquets acceptés puis menés au bout sur la période.')}
              {tuile('Colis', ind.colis, 'Colis remis au relais ou à domicile, preuve faite.')}
              {tuile('Missions', ind.missions, 'Missions closes, une par paquet et par livreur.')}
              {tuile(tf('Livraisons sous {h} h', { h: PARAMETRES.delais.livraisonH }), pct(ind.dansLeDelai), 'Part des remises faites avant la promesse de livraison.')}
              {tuile('Remplissage moyen', ind.remplissage === null ? '—' : nb(ind.remplissage), 'Colis par tournée relais ; alerte sous le seuil en moyenne sur 7 jours.')}
              {tuile('Preuves complètes', pct(ind.preuvesCompletes), 'Missions dont la chaîne de photos et de codes est complète.')}
              {tuile('Litiges', ind.litiges, 'Dossiers ouverts sur les paquets de la période.')}
              {tuile('Paquets rendus', ind.rendus, 'Paquets acceptés puis rendus faute de livreur.')}
              {voir && ind.prestations !== null && tuile('Prestations validées', f(ind.prestations), 'Montant validé par le serveur, payé le vendredi.')}
            </div>
          </Panel>
        </div>
        <div className="ec-tb" style={{ marginTop: 16 }}>
          <Table
            cols={cols}
            rows={r.parLivreur}
            cle={(l) => l.id}
            legende={t('Par livreur')}
            vide={<Vide icone="users" t={t('Aucune mission sur la période')} s={t('Changez la période ou les filtres.')} />}
            outils={
              <>
                <span className="b8 t14">{t('Par livreur')}</span>
                <span className="sp"></span>
                <span className="lock">
                  <Icone nom="eye-off" taille={15} /> {t('aucune donnée personnelle de client')}
                </span>
              </>
            }
            pied={
              <>
                <span>{voir && ind.prestations !== null ? tf('Total : {c} colis · {m} validés, égal au relevé', { c: ind.colis, m: f(ind.prestations) }) : tf('Total : {c} colis', { c: ind.colis })}</span>
                {voir && <span>{t('Le relevé fait foi pour l’argent')}</span>}
              </>
            }
          />
        </div>
      </>
    )
  }

  return (
    <Ecran route="rapports" actions={large ? acts : undefined}>
      <Px>
        <Tete route="rapports" titre={t('Rapports')} />
        <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
        {outils}
        {vue}
        {!r ? (
          !lecture.erreur && <Chargement />
        ) : (
          <>
            <p className="t12 c3 mt8" aria-live="polite">
              {tf('{p} · du {du} au {au}', { p: t(nomPeriode), du: d.jour(r.filtre.du), au: d.jour(r.filtre.au) })}
            </p>
            {prog.donnees && <LigneProgramme p={prog.donnees} ouvrir={programme.ouvrir} />}
            {corps()}
            {r.parlant && (
              <div style={{ marginTop: 16 }}>
                <Panel titre={t('Rapport de fin de pilote')} icone="flag" tonIcone="or">
                  <Li
                    icone="flag"
                    ton="or"
                    t={r.pilote.disponible ? t('Disponible : le pilote est terminé') : tf('Généré ici le {j}, au dernier jour du pilote', { j: finPilote })}
                    s={t('Il sert au bilan conjoint écrit avec BelivaY, qui fixe la grille définitive, toujours sous les plafonds.')}
                    droite={
                      <button
                        type="button"
                        className="btn secondary sm"
                        disabled={!r.pilote.disponible || !enLigne}
                        onClick={async () => {
                          const x = await source.rapports.rapportPilote()
                          if (x.ok) telechargerFichier(x)
                          else annoncer(false, t('Le pilote n’est pas terminé.'))
                        }}
                      >
                        <Icone nom="file-text" taille={16} />
                        {r.pilote.disponible ? t('Générer le rapport de fin de pilote') : tf('Disponible le {j}', { j: finPilote })}
                      </button>
                    }
                  />
                  <Note ton="red" icone="ban">
                    <b>{t('Interdit')}</b> : {t('exporter des données de clients ; publier les chiffres de BelivaY sans accord écrit.')}
                  </Note>
                </Panel>
              </div>
            )}
          </>
        )}
        <BarrePouce>{acts}</BarrePouce>
      </Px>
      {prog.donnees && <FeuilleProgramme ouverte={programme.ouverte} fermer={programme.fermer} p={prog.donnees} annoncer={annoncer} />}
    </Ecran>
  )
}

/** État du rapport programmé, sous la période : prochain envoi en compte à rebours. */
function LigneProgramme({ p, ouvrir }: { p: ProgrammeRapport; ouvrir: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  return (
    <div className="e8-prog" data-programme={p.actif ? 'actif' : 'arrete'}>
      <Icone nom="calendar-clock" taille={16} />
      <span className="grow t13">
        {p.actif && p.prochain ? (
          <>
            {tf('Rapport du vendredi : {f} à {m}, chaque vendredi à {h} h · prochain envoi le {j}', { f: p.format.toUpperCase(), m: p.destinataire, h: p.heure, j: d.jourLong(p.prochain) })} <Rebours fin={p.prochain} urgent={0} critique={0} avant={<>{t('dans')} </>} />
          </>
        ) : (
          t('Rapport du vendredi : non programmé.')
        )}
      </span>
      <button type="button" className="btn ghost sm" onClick={ouvrir}>
        {t(p.actif ? 'Modifier' : 'Programmer')}
      </button>
    </div>
  )
}

/** Feuille « Rapport du vendredi » : chaque vendredi (jour de paiement), la semaine écoulée, par e-mail. */
function FeuilleProgramme({ ouverte, fermer, p, annoncer }: { ouverte: boolean; fermer: () => void; p: ProgrammeRapport; annoncer: (ok: boolean, t: string) => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const regle = usePeut(['proprietaire', 'comptable'])
  const users = useLecture(() => source.parametres.utilisateurs(), [])
  const maintenant = useHorloge(60_000)
  const [actif, setActif] = useState(p.actif || !p.destinataire)
  const [heure, setHeure] = useState(p.heure)
  const [format, setFormat] = useState<'pdf' | 'csv'>(p.format)
  const [dest, setDest] = useState(p.destinataire)
  const [erreur, setErreur] = useState<string | null>(null)
  const emails = (users.donnees ?? []).filter((u) => u.statut !== 'retire').map((u) => ({ email: u.email.toLowerCase(), nom: u.nom }))
  useEffect(() => {
    if (!dest && emails[0]) setDest(emails[0].email)
  }, [dest, emails])
  const enregistrer = async () => {
    const x = await geste('Programmer le rapport du vendredi', (s) => s.rapports.programmer({ actif, heure, format, destinataire: dest }))
    if (x.etat === 'en_file') return fermer(), annoncer(true, t('Hors connexion : réglage gardé, envoyé au retour du réseau.'))
    if (!x.r.ok) return setErreur(t(x.r.raison === 'heure' ? 'Heure d’envoi : de 6 h à 22 h.' : x.r.raison === 'destinataire' ? 'Choisissez l’e-mail d’un accès interne.' : 'Réservé au propriétaire et au comptable.'))
    setErreur(null)
    fermer()
    annoncer(true, x.r.prochain ? tf('Rapport programmé : prochain envoi le {j} à {h} h.', { j: d.jourLong(x.r.prochain), h: heure }) : t('Rapport du vendredi arrêté.'))
  }
  const exemplaire = async () => {
    const au = jourDe(maintenant)
    const du = jourDe(maintenant - 6 * JOUR)
    const x = await source.rapports.exporter({ du, au }, format)
    if (!x.ok) return setErreur(tf('Les exports s’ouvrent à {n} missions.', { n: OUTILS.rapportMin }))
    telechargerFichier(x)
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Rapport du vendredi')}>
      <h2 className="card-t">{t('Rapport du vendredi')}</h2>
      <p className="e7-note mt10">{t('Chaque vendredi, jour de paiement, la semaine écoulée vous arrive par e-mail : mêmes chiffres et mêmes définitions que cet écran, sans donnée de client.')}</p>
      {!regle ? (
        <>
          <Kv k={t('État')} v={p.actif ? tf('chaque vendredi à {h} h, {f}', { h: p.heure, f: p.format.toUpperCase() }) : t('non programmé')} />
          <Interdit roles={['proprietaire', 'comptable']} quoi="Programmer le rapport du vendredi" />
        </>
      ) : (
        <>
          <div className="e8-confort">
            <span className="grow t13">
              <b>{t('Envoyer chaque vendredi')}</b>
            </span>
            <Tg on={actif} libelle={t('Envoyer chaque vendredi')} changer={setActif} />
          </div>
          {actif && (
            <>
              <label className="champ">
                <span>{t('Heure d’envoi')}</span>
                <select value={heure} onChange={(e) => setHeure(Number(e.target.value))}>
                  {[...Array(17).keys()].map((i) => (
                    <option key={i} value={i + 6}>
                      {tf('{h} h', { h: i + 6 })}
                    </option>
                  ))}
                </select>
              </label>
              <div className="t13 b8 mt12" id="e8-format">
                {t('Format')}
              </div>
              <div className="seg mt8" role="radiogroup" aria-labelledby="e8-format">
                {(['pdf', 'csv'] as const).map((f) => (
                  <button key={f} type="button" role="radio" aria-checked={format === f} className={format === f ? 'on' : ''} onClick={() => setFormat(f)}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <label className="champ">
                <span>{t('Destinataire')}</span>
                <select value={dest} onChange={(e) => setDest(e.target.value)}>
                  {emails.map((u) => (
                    <option key={u.email} value={u.email}>{`${u.nom} · ${u.email}`}</option>
                  ))}
                </select>
              </label>
              <p className="e7-note">{t('Seulement l’e-mail d’un accès interne ; le répartiteur le reçoit sans montant.')}</p>
            </>
          )}
          {erreur && (
            <p className="note red mt10" role="alert">
              {erreur}
            </p>
          )}
          <div className="btns ec-btns mt16">
            <button type="button" className="btn primary" onClick={() => void enregistrer()}>
              <Icone nom="calendar-check" taille={18} />
              {t('Enregistrer')}
            </button>
            <button type="button" className="btn secondary" onClick={() => void exemplaire()}>
              <Icone nom="file-down" taille={18} />
              {t('Recevoir un exemplaire maintenant')}
            </button>
          </div>
        </>
      )}
    </Feuille>
  )
}
