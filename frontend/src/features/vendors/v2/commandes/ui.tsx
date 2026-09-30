// frontend/src/features/vendors/v2/commandes/ui.tsx
// Atomes d'UI partagés par les écrans Commandes — même système que le Lot 1
// (theme.ts/DockNav.tsx/MenuPage.tsx) : palette(), primaryGradient(), classes
// Tailwind identiques, tailles de police en px, lucide-react.

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { primaryGradient, type VendorPalette } from '../theme';

export function PrimaryButton({
  children, onClick, disabled, p, type = 'button',
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; p: VendorPalette; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
      style={{
        background: primaryGradient(p),
        padding: '14px 18px',
        fontSize: 14.5,
        minHeight: 48,
        boxShadow: disabled ? undefined : '0 10px 24px rgba(204,74,11,0.28)',
      }}
    >
      {children}
    </button>
  );
}

export function GhostRow({
  children, onClick, p, danger, href,
}: { children: ReactNode; onClick?: () => void; p: VendorPalette; danger?: boolean; href?: string }) {
  const style = {
    padding: '12px 14px',
    minHeight: 44,
    color: danger ? p.red : p.text,
    background: p.cardAlt,
    border: `1px solid ${p.border}`,
    fontSize: 13.5,
    fontWeight: 600,
  };
  if (href) {
    return (
      <a href={href} className="w-full flex items-center justify-between text-left rounded-xl no-underline">
        <span style={style} className="w-full flex items-center justify-between">{children}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center justify-between text-left rounded-xl" style={style}>
      {children}
    </button>
  );
}

export function Card({ children, p, accent }: { children: ReactNode; p: VendorPalette; accent?: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: p.card, border: `1px solid ${accent ?? p.border}`, borderLeftWidth: accent ? 3 : 1 }}
    >
      {children}
    </div>
  );
}

export function Pill({ label, tone, p }: { label: string; tone: 'orange' | 'green' | 'red' | 'amber' | 'muted'; p: VendorPalette }) {
  const colors: Record<typeof tone, string> = { orange: p.orange, green: p.green, red: p.red, amber: p.amber, muted: p.textMuted };
  const c = colors[tone];
  return (
    <span
      className="inline-flex items-center font-bold rounded-full whitespace-nowrap"
      style={{ fontSize: 11, padding: '4px 10px', color: c, background: `${c}1F` }}
    >
      {label}
    </span>
  );
}

export function Collapsible({ title, children, p }: { title: string; children: ReactNode; p: VendorPalette }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${p.border}` }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between"
        style={{ padding: '11px 13px', minHeight: 44 }}
      >
        <span className="font-semibold" style={{ fontSize: 12.5, color: p.textMuted }}>{title}</span>
        <ChevronDown
          size={16}
          color={p.textMuted}
          style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}
        />
      </button>
      {open ? (
        <div style={{ padding: '0 13px 13px', fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>{children}</div>
      ) : null}
    </div>
  );
}

export function KeepAmount({ amount, label, p, size = 20 }: { amount: string; label: string; p: VendorPalette; size?: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span style={{ fontSize: 12.5, color: p.textMuted, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: size, fontWeight: 900, color: p.green }}>{amount}</span>
    </div>
  );
}

export function PageHeader({
  title, subtitle, onBack, p,
}: { title: string; subtitle?: string; onBack?: () => void; p: VendorPalette }) {
  const { t } = useTranslation();
  return (
    <div className="mb-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-2 flex items-center gap-1 font-semibold"
          style={{ fontSize: 12.5, color: p.textMuted }}
        >
          <ChevronLeft size={14} /> {t('sl7_commandes.back')}
        </button>
      ) : null}
      <h1 className="font-black" style={{ fontSize: 19, color: p.text }}>{title}</h1>
      {subtitle ? <p style={{ fontSize: 12.5, color: p.textMuted, marginTop: 2 }}>{subtitle}</p> : null}
    </div>
  );
}

export function ProgressBar({ ratio, p }: { ratio: number; p: VendorPalette }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: p.border }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.round(ratio * 100)}%`, background: ratio >= 1 ? p.red : primaryGradient(p) }}
      />
    </div>
  );
}

export function Toggle({
  checked, onChange, label, p,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; p: VendorPalette }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between rounded-xl"
      style={{ padding: '12px 14px', minHeight: 44, background: p.cardAlt, border: `1px solid ${p.border}` }}
    >
      <span className="font-semibold text-left" style={{ fontSize: 13, color: p.text }}>{label}</span>
      <span
        className="relative flex-shrink-0 rounded-full transition-colors"
        style={{ width: 40, height: 24, background: checked ? p.orange : p.border }}
      >
        <span
          className="absolute rounded-full bg-white transition-transform"
          style={{ width: 18, height: 18, top: 3, left: 3, transform: checked ? 'translateX(16px)' : undefined }}
        />
      </span>
    </button>
  );
}

export function CenterState({ icon, title, detail, p }: { icon: ReactNode; title: string; detail?: string; p: VendorPalette }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: p.cardAlt }}>
        {icon}
      </div>
      <p className="font-bold" style={{ fontSize: 14.5, color: p.text }}>{title}</p>
      {detail ? <p style={{ fontSize: 12.5, color: p.textMuted, marginTop: 4 }}>{detail}</p> : null}
    </div>
  );
}
