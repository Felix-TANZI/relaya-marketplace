// frontend/src/features/vendors/vendorTheme.tsx
// Tokens et styles partagés par les pages financières de l'espace vendeur.
// Reprend à l'identique les valeurs déjà utilisées dans SellerLayout / SellerPaymentsPage.
//
// Ce module expose volontairement des tokens ET des primitives de rendu : c'est
// la source unique du vocabulaire visuel vendeur. Les separer imposerait deux
// imports a chaque page pour aucun gain.
/* eslint-disable react-refresh/only-export-components */

export const T = {
  orange:  '#F47920',
  orangeD: '#E06510',
  orangeL: '#FFF3E8',
  orangeB: 'rgba(244,121,32,0.12)',
  cream:   '#F5F0E8',
  creamAlt:'#EDE7DC',
  white:   '#FFFFFF',
  border:  '#E8E2D9',
  borderL: '#F1ECE4',
  sidebar: '#1C1209',
  text:    '#1A1209',
  muted:   '#7C6E5A',
  mutedL:  '#B8A898',
  green:   '#16A34A',
  greenL:  'rgba(22,163,74,0.10)',
  greenB:  'rgba(22,163,74,0.20)',
  red:     '#DC2626',
  redL:    'rgba(220,38,38,0.10)',
  redB:    'rgba(220,38,38,0.20)',
  amber:   '#D97706',
  amberL:  'rgba(217,119,6,0.10)',
  amberB:  'rgba(217,119,6,0.22)',
  blue:    '#2563EB',
  blueL:   'rgba(37,99,235,0.10)',
  violet:  '#7C3AED',
  violetL: 'rgba(124,58,237,0.10)',
} as const;

/** Carte blanche standard de l'espace vendeur. */
export const card: React.CSSProperties = {
  background: T.white,
  border: `1px solid ${T.border}`,
  boxShadow: '0 1px 4px rgba(28,18,9,0.06)',
};

/** Dégradés des blocs héros, un par nature de montant. */
export const HERO = {
  dark:   'linear-gradient(135deg,#1C1209 0%,#2B1A0C 52%,#3A230D 100%)',
  green:  'linear-gradient(135deg,#0F2C1B,#154C2C 55%,#1C6B3C)',
  amber:  'linear-gradient(135deg,#2B1A0C,#4A2A0C 55%,#5C360D)',
  violet: 'linear-gradient(135deg,#241338,#3A1D57 55%,#4A2470)',
  orange: `linear-gradient(135deg,${T.orange},${T.orangeD})`,
} as const;

const CSS = `
@keyframes vUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes vPop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
@keyframes vGlow{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.85;transform:scale(1.15)}}
@keyframes vFlow{0%{transform:translateX(-110%)}100%{transform:translateX(320%)}}
@keyframes vPulse{0%{transform:scale(.85);opacity:.6}75%,100%{transform:scale(1.5);opacity:0}}
@keyframes vSlide{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}

.v-anim{animation:vUp .42s cubic-bezier(.22,1,.36,1) both}
.v-row{animation:vSlide .4s ease-out both}
.v-glow{animation:vGlow 5.5s ease-in-out infinite}
.v-glow-slow{animation:vGlow 7s ease-in-out infinite 1s}
.v-flow{animation:vFlow 2.8s linear infinite}
.v-pulse{animation:vPulse 2.4s ease-out infinite}
.v-pop{animation:vPop .42s cubic-bezier(.34,1.4,.64,1) both}

/* Tableaux financiers : scrollent au lieu de s'écraser */
.v-scroll{overflow-x:auto}
.v-scroll>*{min-width:660px}
.v-cell{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

@media(prefers-reduced-motion:reduce){
  .v-anim,.v-row,.v-glow,.v-glow-slow,.v-flow,.v-pulse,.v-pop{animation:none!important}
}
`;

let injected = false;

/** Injecte les keyframes une seule fois. À monter en haut de chaque page financière. */
export function VendorStyles() {
  if (typeof document !== 'undefined' && !injected) {
    const el = document.createElement('style');
    el.id = 'belivay-vendor-finance';
    el.textContent = CSS;
    document.head.appendChild(el);
    injected = true;
  }
  return null;
}

// ─── Formatage ────────────────────────────────────────────────────────────────

export const fmtRate = (r: string | number) => `${parseFloat(String(r)).toFixed(1)} %`;
export const nf = (n: number) => Math.round(n).toLocaleString('fr-FR');

// ─── Statuts escrow (source : Order.EscrowStatus) ─────────────────────────────

export type EscrowKey =
  | 'PENDING' | 'BLOCKED' | 'RELEASE_PENDING' | 'RELEASED'
  | 'REFUNDED' | 'PARTIAL_REFUNDED' | 'DISPUTED';

export const ESCROW: Record<EscrowKey, { label: string; color: string; bg: string }> = {
  PENDING:          { label: 'Non payé',        color: T.muted,  bg: T.creamAlt },
  BLOCKED:          { label: 'En escrow',       color: T.amber,  bg: T.amberL   },
  RELEASE_PENDING:  { label: 'Libération 24 h', color: T.blue,   bg: T.blueL    },
  RELEASED:         { label: 'Libéré',          color: T.green,  bg: T.greenL   },
  REFUNDED:         { label: 'Remboursé',       color: T.blue,   bg: T.blueL    },
  PARTIAL_REFUNDED: { label: 'Remb. partiel',   color: T.amber,  bg: T.amberL   },
  DISPUTED:         { label: 'Litige',          color: T.red,    bg: T.redL     },
};

export const WITHDRAWAL: Record<string, { color: string; bg: string }> = {
  PENDING:   { color: T.amber, bg: T.amberL   },
  APPROVED:  { color: T.green, bg: T.greenL   },
  REJECTED:  { color: T.red,   bg: T.redL     },
  CANCELLED: { color: T.muted, bg: T.creamAlt },
};

// ─── Primitives ───────────────────────────────────────────────────────────────

export function Badge({ label, color, bg, minWidth }: {
  label: string; color: string; bg: string; minWidth?: number;
}) {
  return (
    <span
      className="inline-block rounded-full text-center font-bold"
      style={{ color, background: bg, fontSize: 10.5, padding: '5px 10px', minWidth, whiteSpace: 'nowrap' }}
    >
      {label}
    </span>
  );
}

export function PageHead({ kicker, kickerColor, title, subtitle, actions }: {
  kicker: string; kickerColor?: string; title: string; subtitle: string; actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
      <div>
        <p className="font-black uppercase" style={{ fontSize: 10, letterSpacing: '.2em', color: kickerColor ?? T.orange }}>
          {kicker}
        </p>
        <h1 className="font-black mt-1" style={{ fontSize: 25, color: T.text, letterSpacing: '-.025em', fontFamily: 'Syne,Poppins,sans-serif' }}>
          {title}
        </h1>
        <p className="mt-1" style={{ fontSize: 12.5, color: T.muted }}>{subtitle}</p>
      </div>
      {actions ? <div className="flex gap-2 flex-wrap">{actions}</div> : null}
    </div>
  );
}

export function GhostBtn({ icon, children, onClick }: {
  icon?: React.ReactNode; children: React.ReactNode; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl font-semibold transition-all"
      style={{ padding: '9px 14px', fontSize: 12, background: T.white, border: `1px solid ${T.border}`, color: T.muted }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.orange; e.currentTarget.style.color = T.orange; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
    >
      {icon}{children}
    </button>
  );
}

export function StatCard({ icon, value, label, sub, color, bg, trend }: {
  icon: React.ReactNode; value: string; label: string; sub?: string;
  color: string; bg: string; trend?: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={card}>
      <div className="flex items-center justify-between">
        <span className="w-[34px] h-[34px] rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: bg, color }}>{icon}</span>
        {trend ? (
          <span className="font-bold rounded-full" style={{ fontSize: 10, padding: '4px 9px', background: bg, color }}>{trend}</span>
        ) : null}
      </div>
      <p className="font-black mt-3" style={{ fontSize: 19, color: T.text, letterSpacing: '-.02em' }}>{value}</p>
      <p className="font-semibold mt-0.5" style={{ fontSize: 11.5, color: T.muted }}>{label}</p>
      {sub ? <p style={{ fontSize: 10.5, color: T.mutedL, marginTop: 2 }}>{sub}</p> : null}
    </div>
  );
}

export function Hero({ gradient, blobColor, children }: {
  gradient: string; blobColor: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl p-6 relative overflow-hidden"
      style={{ background: gradient, boxShadow: '0 22px 50px -26px rgba(28,18,9,.9)' }}>
      <span className="v-glow absolute pointer-events-none"
        style={{ top: -70, right: -40, width: 210, height: 210, borderRadius: '50%',
          background: `radial-gradient(circle,${blobColor},transparent 68%)` }} />
      <div className="relative">{children}</div>
    </div>
  );
}

export function HeroAmount({ kicker, value, note }: { kicker: string; value: string; note?: React.ReactNode }) {
  return (
    <div>
      <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.2em', color: 'rgba(255,255,255,.45)' }}>
        {kicker}
      </p>
      <p className="font-black mt-2" style={{ fontSize: 40, color: '#fff', letterSpacing: '-.035em', lineHeight: 1, fontFamily: 'Syne,Poppins,sans-serif' }}>
        {value} <span style={{ fontSize: 15, color: 'rgba(255,255,255,.5)' }}>FCFA</span>
      </p>
      {note ? <p className="mt-3" style={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)' }}>{note}</p> : null}
    </div>
  );
}

export function Panel({ title, sub, right, children, pad = true }: {
  title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; pad?: boolean;
}) {
  return (
    <section className="rounded-2xl overflow-hidden" style={card}>
      <div className="flex items-center justify-between gap-3 flex-wrap"
        style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
        <div>
          <p className="font-bold" style={{ fontSize: 13.5, color: T.text }}>{title}</p>
          {sub ? <p style={{ fontSize: 11, color: T.mutedL, marginTop: 2 }}>{sub}</p> : null}
        </div>
        {right}
      </div>
      <div style={pad ? { padding: '18px 20px' } : undefined}>{children}</div>
    </section>
  );
}

export function Tabs<K extends string>({ items, value, onChange, accent = T.orange }: {
  items: { key: K; label: string; n?: number }[];
  value: K; onChange: (k: K) => void; accent?: string;
}) {
  return (
    <div className="flex gap-1 flex-wrap rounded-xl" style={{ padding: 3, background: T.cream, border: `1px solid ${T.border}` }}>
      {items.map(it => {
        const on = it.key === value;
        return (
          <button key={it.key} type="button" onClick={() => onChange(it.key)}
            className="flex items-center gap-1.5 rounded-lg transition-all"
            style={{
              padding: '7px 13px', fontSize: 11.5, fontWeight: on ? 700 : 500,
              background: on ? T.white : 'transparent', color: on ? T.text : T.muted,
              boxShadow: on ? '0 1px 3px rgba(28,18,9,.1)' : 'none',
            }}>
            {it.label}
            {it.n !== undefined && (
              <span className="font-bold rounded-full"
                style={{ fontSize: 9.5, padding: '1px 6px', fontVariantNumeric: 'tabular-nums',
                  background: on ? `${accent}1f` : 'rgba(28,18,9,.06)', color: on ? accent : T.mutedL }}>
                {it.n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Note({ icon, tone = 'neutral', children }: {
  icon: React.ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'violet' | 'blue';
  children: React.ReactNode;
}) {
  const map = {
    neutral: { bg: T.cream,   bd: T.border, fg: T.muted  },
    green:   { bg: T.greenL,  bd: T.greenB, fg: T.green  },
    amber:   { bg: T.amberL,  bd: T.amberB, fg: T.amber  },
    red:     { bg: T.redL,    bd: T.redB,   fg: T.red    },
    violet:  { bg: T.violetL, bd: 'rgba(124,58,237,.22)', fg: T.violet },
    blue:    { bg: T.blueL,   bd: 'rgba(37,99,235,.18)',  fg: T.blue   },
  }[tone];
  return (
    <div className="flex gap-3 rounded-2xl" style={{ padding: 14, background: map.bg, border: `1px solid ${map.bd}` }}>
      <span className="flex-shrink-0 mt-0.5" style={{ color: map.fg }}>{icon}</span>
      <p style={{ fontSize: 11.5, lineHeight: 1.6, color: T.muted }}>{children}</p>
    </div>
  );
}

export function Skeleton({ h = 74, n = 3 }: { h?: number; n?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-2xl animate-pulse" style={{ height: h, background: T.white, border: `1px solid ${T.border}` }} />
      ))}
    </div>
  );
}
