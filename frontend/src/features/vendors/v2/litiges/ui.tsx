// frontend/src/features/vendors/v2/litiges/ui.tsx
// Atomes d'UI partagés par les écrans Litiges et retours (VD-07) — même
// système que le Lot 1 (theme.ts/DockNav.tsx/MenuPage.tsx) et que les autres
// dossiers v2 (commandes/ui.tsx, accueil/…) : palette(), primaryGradient(),
// classes Tailwind identiques, tailles de police en px, lucide-react.
// Dupliqué localement (plutôt qu'importé d'un autre dossier de lot) pour ne
// pas coupler ce lot au travail en parallèle d'autres agents sur le dépôt.

import { useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronLeft, Package } from 'lucide-react';
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

// ── Enrichissements « richesse visuelle » (alignement sur les maquettes
// Fond_clair/Litiges·Repondre·Decision·Retours·Inspection·Remplacement.jpg) ──

/**
 * Vignette produit. Les endpoints VD-07 (VendorDisputeListItem/Detail,
 * OrderReturn) n'exposent aucune URL de photo produit — seul le titre
 * (order_item_title, retours uniquement) est disponible. On affiche donc une
 * icône générique plutôt que d'inventer une image, en gardant le même
 * gabarit que la vraie photo des maquettes pour la mise en page.
 */
export function ProductThumb({ p, size = 52 }: { p: VendorPalette; size?: number }) {
  return (
    <div
      className="flex-shrink-0 rounded-xl flex items-center justify-center"
      style={{ width: size, height: size, background: p.cardAlt, border: `1px solid ${p.border}` }}
    >
      <Package size={Math.round(size * 0.42)} color={p.textMuted} />
    </div>
  );
}

const HERO_GRADIENT: Record<'neutral' | 'green' | 'red', string> = {
  neutral: 'linear-gradient(160deg, #2E2013 0%, #14100B 100%)',
  green: 'linear-gradient(160deg, #0E3A28 0%, #0A2318 100%)',
  red: 'linear-gradient(160deg, #431414 0%, #230B0B 100%)',
};

// eslint-disable-next-line react-refresh/only-export-components -- constante de teinte colocalisée avec DarkHero, ses seuls consommateurs
export const HERO_ACCENT: Record<'neutral' | 'green' | 'red', string> = {
  neutral: '#F0C04C',
  green: '#7FE3B4',
  red: '#FF9C90',
};

/**
 * Carte « héro » à fond sombre en dégradé, volontairement indépendante du
 * thème clair/sombre de l'app (comme les cartes « Argent gelé »/« Décision »
 * des maquettes, sombres même sur fond clair) — sert à mettre en avant les
 * montants et l'issue d'un litige.
 */
export function DarkHero({ tone, children }: { tone: 'neutral' | 'green' | 'red'; children: ReactNode }) {
  return (
    <div className="rounded-2xl p-5 mb-4" style={{ background: HERO_GRADIENT[tone] }}>
      {children}
    </div>
  );
}

interface StepState { label: string; state: 'done' | 'current' | 'upcoming'; }

/** Frise horizontale à 4 étapes (Décision.jpg) — utilisée seulement pendant la médiation. */
export function Stepper({ steps, p }: { steps: StepState[]; p: VendorPalette }) {
  return (
    <div className="flex items-start">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center" style={{ flex: i === steps.length - 1 ? '0 0 auto' : '1 1 auto' }}>
          <div className="flex flex-col items-center" style={{ minWidth: 58 }}>
            <div
              className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
              style={{
                width: 30,
                height: 30,
                fontSize: 12.5,
                background: s.state === 'done' ? `${p.green}22` : s.state === 'current' ? p.orange : p.cardAlt,
                color: s.state === 'done' ? p.green : s.state === 'current' ? '#fff' : p.textMuted,
                border: s.state === 'upcoming' ? `1.5px solid ${p.border}` : 'none',
              }}
            >
              {s.state === 'done' ? <Check size={15} /> : i + 1}
            </div>
            <span
              className="text-center mt-1.5"
              style={{ fontSize: 10.5, fontWeight: 700, color: s.state === 'upcoming' ? p.textMuted : p.text, lineHeight: 1.25 }}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 ? (
            <div style={{ flex: 1, height: 2, marginTop: 15, background: s.state === 'done' ? p.green : p.border }} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Ligne « ce qui peut arriver » (Decision.jpg, section informative — pas de navigation). */
export function OutcomeRow({
  icon, tone, title, detail, p, first,
}: { icon: ReactNode; tone: 'green' | 'red' | 'amber'; title: string; detail: string; p: VendorPalette; first?: boolean }) {
  const bg = tone === 'green' ? `${p.green}1F` : tone === 'red' ? `${p.red}1F` : `${p.amber}1F`;
  return (
    <div className="flex items-start gap-3 py-3" style={first ? undefined : { borderTop: `1px solid ${p.border}` }}>
      <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, background: bg }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{title}</p>
        <p style={{ fontSize: 11.5, color: p.textMuted, marginTop: 2, lineHeight: 1.4 }}>{detail}</p>
      </div>
    </div>
  );
}
