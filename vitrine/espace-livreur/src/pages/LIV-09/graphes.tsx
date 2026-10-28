// Graphiques du prototype pour LIV-09 (objet CH du moteur : bars, line, donut, hbars ; jauge livc_gauge), en React,
// même dessin : barres par jour (activité · semaine), anneau par type (activité · mois), courbe avec seuil (Trust ·
// évolution), barres horizontales (Trust · nouveau livreur), jauge demi-cercle (Trust · héros nuit).
import type { ReactNode } from 'react'
import { Barre } from '../../composants/proto'

/** CH.bars : barres verticales ; `on` = barre mise en avant (orange, jour en cours). */
export function Barres({ data, w = 360, h = 150, max, label }: { data: { l: string; v: number; on?: boolean }[]; w?: number; h?: number; max?: number; label: string }) {
  const pad = 26
  const m = max ?? Math.max(...data.map((d) => d.v), 1) * 1.15
  const bw = (w - pad * 2) / data.length
  return (
    <svg className="chart l9-chart" viewBox={`0 0 ${w} ${h + 26}`} role="img" aria-label={label}>
      {[0, 1, 2, 3].map((i) => {
        const y = pad + ((h - pad) * i) / 3
        return <line key={i} x1={pad} x2={w - 6} y1={y} y2={y} stroke="var(--line-2)" strokeDasharray="3 4" />
      })}
      {data.map((d, i) => {
        const hh = ((h - pad) * d.v) / m
        const x = pad + i * bw + bw * 0.18
        const y = h - hh
        return (
          <g key={i}>
            <rect x={x.toFixed(1)} y={y.toFixed(1)} width={(bw * 0.64).toFixed(1)} height={hh.toFixed(1)} rx="6" fill={d.on ? 'var(--or)' : 'var(--acc)'} />
            <text x={(x + bw * 0.32).toFixed(1)} y={(y - 6).toFixed(1)} textAnchor="middle">
              {d.v}
            </text>
            <text x={(x + bw * 0.32).toFixed(1)} y={h + 18} textAnchor="middle">
              {d.l}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** CH.line : courbe (aire légère), seuil en pointillé avec son libellé. */
export function Courbe({ data, labels, w = 360, h = 170, min = 0, max, seuil, seuilLabel, label, couleur = 'var(--acc)' }: { data: number[]; labels: string[]; w?: number; h?: number; min?: number; max?: number; seuil?: number; seuilLabel?: string; label: string; couleur?: string }) {
  const pad = 28
  const mx = max ?? Math.max(...data, 1) * 1.15
  const X = (i: number) => pad + ((w - pad * 2) * i) / Math.max(1, labels.length - 1)
  const Y = (v: number) => h - ((h - pad) * (v - min)) / (mx - min)
  const d = data.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ')
  const li = data.length - 1
  const pas = labels.length <= 6 ? 1 : Math.ceil(labels.length / 5)
  return (
    <svg className="chart l9-chart" viewBox={`0 0 ${w} ${h + 26}`} role="img" aria-label={label}>
      {[0, 1, 2, 3].map((i) => {
        const y = pad + ((h - pad) * i) / 3
        return <line key={i} x1={pad} x2={w - 6} y1={y} y2={y} stroke="var(--line-2)" strokeDasharray="3 4" />
      })}
      {li > 0 && <path d={`${d} L${X(li)} ${h} L${X(0)} ${h}Z`} fill={couleur} opacity=".12" />}
      <path className="l9-trace" pathLength={1} d={d} fill="none" stroke={couleur} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {li >= 0 && <circle cx={X(li)} cy={Y(data[li])} r="4.5" fill={couleur} stroke="var(--card)" strokeWidth="2" />}
      {labels.map((l, i) =>
        (i % pas === 0 && labels.length - 1 - i >= pas) || i === labels.length - 1 ? (
          <text key={i} x={X(i).toFixed(1)} y={h + 18} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}>
            {l}
          </text>
        ) : null,
      )}
      {seuil !== undefined && (
        <>
          <line x1={pad} x2={w - 6} y1={Y(seuil)} y2={Y(seuil)} stroke="var(--red)" strokeWidth="1.6" strokeDasharray="5 4" />
          <text x={w - 8} y={Y(seuil) - 6} textAnchor="end" style={{ fill: 'var(--red)' }}>
            {seuilLabel}
          </text>
        </>
      )}
    </svg>
  )
}

/** CH.donut : anneau de parts, chiffre au centre. */
export function Donut({ parts, taille = 132, centre, sous, label }: { parts: { v: number; couleur: string }[]; taille?: number; centre: ReactNode; sous: string; label: string }) {
  const S = taille
  const r = S / 2 - 14
  const c = 2 * Math.PI * r
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1
  let off = 0
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} style={{ flexShrink: 0 }} role="img" aria-label={label}>
      <circle cx={S / 2} cy={S / 2} r={r} fill="none" stroke="var(--sand-3)" strokeWidth="18" />
      {parts.map((p, i) => {
        const l = (c * p.v) / tot
        const el = <circle key={i} cx={S / 2} cy={S / 2} r={r} fill="none" stroke={p.couleur} strokeWidth="18" strokeDasharray={`${Math.max(0, l - 2).toFixed(1)} ${c.toFixed(1)}`} strokeDashoffset={(-off).toFixed(1)} transform={`rotate(-90 ${S / 2} ${S / 2})`} />
        off += l
        return p.v > 0 ? el : null
      })}
      <text x={S / 2} y={S / 2 + 2} textAnchor="middle" fontSize={Math.round(S / 6)} fontWeight="800" fill="var(--ink)">
        {centre}
      </text>
      <text x={S / 2} y={S / 2 + 20} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink-3)">
        {sous}
      </text>
    </svg>
  )
}

/** CH.hbars : barres horizontales (libellé, barre, valeur). */
export const BarresH = ({ lignes }: { lignes: { l: string; v: number; max: number; r: string }[] }) => (
  <>
    {lignes.map((x) => (
      <div key={x.l} className="row l9-hbar">
        <span className="t13 b7">{x.l}</span>
        <span className="grow">
          <Barre pct={(100 * x.v) / x.max} ton="acc" label={`${x.l} · ${x.r}`} />
        </span>
        <span className="t13 b8 right">{x.r}</span>
      </div>
    ))}
  </>
)

/** livc_gauge : jauge demi-cercle du héros nuit (seuils des paliers, note au centre). */
export function Jauge({ v, palier, sur, seuils }: { v: number; palier: string; sur: string; seuils: number[] }) {
  const cx = 150
  const cy = 150
  const r = 116
  const pt = (x: number, rr = r) => {
    const a = Math.PI * (1 - x / 100)
    return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)]
  }
  const arc = (a: number, b: number, stroke: string, w: number) => {
    const p1 = pt(a)
    const p2 = pt(b)
    return <path d={`M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${r} ${r} 0 0 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`} fill="none" stroke={stroke} strokeWidth={w} />
  }
  const [s1, s2] = [seuils[0] ?? 70, seuils[1] ?? 85]
  const n = Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 0 // note affichée : un entier de 0 à 100
  const k = pt(Math.max(0.5, n))
  return (
    <svg className="livc-gauge" viewBox="0 -8 300 180" aria-hidden="true">
      <defs>
        <linearGradient id="l9Gg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#10B981" />
          <stop offset="1" stopColor="#6EE7B7" />
        </linearGradient>
      </defs>
      {arc(0, 100, 'rgba(255,255,255,.13)', 22)}
      {arc(s1, s2, 'rgba(110,231,183,.28)', 22)}
      {arc(s2, 100, 'rgba(255,200,69,.32)', 22)}
      {n > 0 && arc(0, n, 'url(#l9Gg)', 22)}
      {seuils.map((s) => {
        const i1 = pt(s, r - 16)
        const o1 = pt(s, r + 16)
        const t = pt(s, r + 30)
        return (
          <g key={s}>
            <line x1={i1[0].toFixed(1)} y1={i1[1].toFixed(1)} x2={o1[0].toFixed(1)} y2={o1[1].toFixed(1)} stroke="#fff" strokeWidth="2.5" opacity=".85" />
            <text x={t[0].toFixed(1)} y={(t[1] + 4).toFixed(1)} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" opacity=".85">
              {s}
            </text>
          </g>
        )
      })}
      <circle cx={k[0].toFixed(1)} cy={k[1].toFixed(1)} r="12" fill="#fff" />
      <circle cx={k[0].toFixed(1)} cy={k[1].toFixed(1)} r="6" fill="#047857" />
      <text className="l9-note" x="150" y="128" textAnchor="middle" fontSize="62" fontWeight="800" fill="#fff" letterSpacing="-2">
        {n}
      </text>
      <text x="150" y="152" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff" opacity=".8">
        {sur} · {palier}
      </text>
    </svg>
  )
}
