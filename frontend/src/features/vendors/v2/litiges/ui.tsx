// frontend/src/features/vendors/v2/litiges/ui.tsx
// Atomes d'UI partagés par les écrans Litiges et retours (VD-07) — même
// système que le Lot 1 (theme.ts/DockNav.tsx/MenuPage.tsx) et que les autres
// dossiers v2 (commandes/ui.tsx, accueil/…) : palette(), primaryGradient(),
// classes Tailwind identiques, tailles de police en px, lucide-react.
// Dupliqué localement (plutôt qu'importé d'un autre dossier de lot) pour ne
// pas coupler ce lot au travail en parallèle d'autres agents sur le dépôt.

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { primaryGradient, type VendorPalette } from '../theme';

export function PageHeader({
  title, subtitle, onBack, backLabel, p,
}: { title: string; subtitle?: string; onBack?: () => void; backLabel: string; p: VendorPalette }) {
  return (
    <div className="mb-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-2 flex items-center gap-1 font-semibold"
          style={{ fontSize: 12.5, color: p.textMuted }}
        >
          <ChevronLeft size={14} /> {backLabel}
        </button>
      ) : null}
      <h1 className="font-black" style={{ fontSize: 19, color: p.text }}>{title}</h1>
      {subtitle ? <p style={{ fontSize: 12.5, color: p.textMuted, marginTop: 2 }}>{subtitle}</p> : null}
    </div>
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

export function Collapsible({ title, children, p, defaultOpen }: { title: string; children: ReactNode; p: VendorPalette; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
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

export function SecondaryButton({
  children, onClick, disabled, p, danger,
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; p: VendorPalette; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl font-bold transition-transform active:scale-[0.98] disabled:opacity-50"
      style={{
        background: p.cardAlt,
        border: `1px solid ${danger ? p.red : p.border}`,
        color: danger ? p.red : p.text,
        padding: '13px 18px',
        fontSize: 13.5,
        minHeight: 46,
      }}
    >
      {children}
    </button>
  );
}

export function KeepAmount({ amount, label, p, size = 20, color }: { amount: string; label: string; p: VendorPalette; size?: number; color?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span style={{ fontSize: 12.5, color: p.textMuted, fontWeight: 600 }}>{label}</span>
      <span className="font-black" style={{ fontSize: size, color: color ?? p.red }}>{amount}</span>
    </div>
  );
}

/** Segment de filtres (À répondre/En médiation/Clos, À décider/En route/Clos…) avec compteurs. */
export function FilterTabs<T extends string>({
  tabs, active, onChange, counts, p,
}: { tabs: { key: T; label: string }[]; active: T; onChange: (v: T) => void; counts: Record<T, number>; p: VendorPalette }) {
  return (
    <div className="flex gap-2 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {tabs.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="flex-shrink-0 rounded-full font-bold flex items-center gap-1.5"
            style={{
              padding: '9px 14px',
              fontSize: 12.5,
              minHeight: 40,
              background: isActive ? p.orange : p.card,
              color: isActive ? '#fff' : p.textMuted,
              border: `1px solid ${isActive ? p.orange : p.border}`,
            }}
          >
            {label}
            <span
              className="rounded-full flex items-center justify-center"
              style={{
                fontSize: 10.5,
                minWidth: 18,
                height: 18,
                padding: '0 4px',
                background: isActive ? 'rgba(255,255,255,0.25)' : p.cardAlt,
                color: isActive ? '#fff' : p.textMuted,
              }}
            >
              {counts[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Bouton radio pleine largeur avec une ligne d'explication (postures REP-01, RMP-01…). */
export function RadioOption({
  selected, onSelect, title, detail, p,
}: { selected: boolean; onSelect: () => void; title: string; detail: string; p: VendorPalette }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-start gap-3 rounded-xl text-left"
      style={{
        padding: '13px 14px',
        background: selected ? `${p.orange}14` : p.cardAlt,
        border: `1.5px solid ${selected ? p.orange : p.border}`,
      }}
    >
      <span
        className="flex-shrink-0 rounded-full flex items-center justify-center"
        style={{ width: 18, height: 18, marginTop: 1, border: `2px solid ${selected ? p.orange : p.border}` }}
      >
        {selected ? <span className="rounded-full" style={{ width: 9, height: 9, background: p.orange }} /> : null}
      </span>
      <span className="min-w-0">
        <span className="block font-bold" style={{ fontSize: 13.5, color: p.text }}>{title}</span>
        <span className="block" style={{ fontSize: 12, color: p.textMuted, marginTop: 2 }}>{detail}</span>
      </span>
    </button>
  );
}

/** Bandeau d'alerte (présomption au silence, réseau requis, dossier clos…). */
export function Banner({ tone, children, p }: { tone: 'amber' | 'red' | 'muted'; children: ReactNode; p: VendorPalette }) {
  const color = tone === 'amber' ? p.amber : tone === 'red' ? p.red : p.textMuted;
  return (
    <div
      className="rounded-xl mb-4"
      style={{ padding: '11px 13px', background: `${color}14`, border: `1px solid ${color}55`, fontSize: 12, color: p.text, lineHeight: 1.5 }}
    >
      {children}
    </div>
  );
}
