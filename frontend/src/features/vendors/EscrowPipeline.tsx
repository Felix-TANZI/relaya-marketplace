// frontend/src/features/vendors/EscrowPipeline.tsx
// Ces blocs se posent SUR un hero sombre : toutes les couleurs sont des alphas
// de blanc, aucun token clair n'y a sa place.
import { nf } from './vendorTheme';

export type Leg = { label: string; amount: number; meta: string; color: string; pct: number };

export function EscrowPipeline({ legs, total }: { legs: Leg[]; total: number }) {
  return (
    <div className="relative mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,.1)' }}>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.4)' }}>
          Le chemin de vos fonds
        </p>
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.4)' }}>
          Total en circulation <strong style={{ color: '#fff' }}>{nf(total)} FCFA</strong>
        </p>
      </div>

      <div className="flex items-stretch gap-2 flex-wrap">
        {legs.map(leg => (
          <div key={leg.label} className="flex-1 rounded-2xl p-3.5"
            style={{ minWidth: 148, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}>
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 rounded-full"
                style={{ width: 7, height: 7, background: leg.color, boxShadow: `0 0 8px ${leg.color}` }} />
              <span className="font-bold" style={{ fontSize: 10.5, color: 'rgba(255,255,255,.62)' }}>{leg.label}</span>
            </div>
            <p className="font-black mt-2" style={{ fontSize: 18, color: '#fff', letterSpacing: '-.02em' }}>
              {nf(leg.amount)}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 3 }}>{leg.meta}</p>
            <div className="relative mt-3 overflow-hidden rounded-full"
              style={{ height: 4, background: 'rgba(255,255,255,.1)' }}>
              <span className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${Math.min(100, leg.pct)}%`, background: leg.color }} />
              <span className="v-flow absolute inset-y-0 rounded-full"
                style={{ width: '34%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Barre segmentée simple (utilisée par Fonds en attente et Ajustements). */
export function SegmentBar({ segments }: { segments: { pct: number; color: string; label?: string }[] }) {
  return (
    <>
      <div className="relative mt-5 flex gap-0.5 overflow-hidden rounded-full" style={{ height: 10 }}>
        {segments.map((s, i) => (
          <span key={i} style={{ width: `${s.pct}%`, background: s.color }} />
        ))}
        <span className="flex-1" style={{ background: 'rgba(255,255,255,.1)' }} />
      </div>
      <div className="mt-2.5 flex gap-4 flex-wrap" style={{ fontSize: 10.5, color: 'rgba(255,255,255,.55)' }}>
        {segments.filter(s => s.label).map((s, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="rounded-sm" style={{ width: 8, height: 8, background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </>
  );
}
