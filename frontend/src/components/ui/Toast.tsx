// frontend/src/components/ui/Toast.tsx
// Composant toast premium BelivaY.
// Toujours sombre (glassmorphism) — contraste garanti sur les deux thèmes.
// Géré entièrement par ToastContext : ne pas instancier directement.

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id:           string;
  title:        string;
  description?: string;
  type?:        ToastType;
  duration?:    number;
  onDismiss:    (id: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION PAR TYPE
// ─────────────────────────────────────────────────────────────────────────────

const CFG: Record<ToastType, {
  Icon:        React.ElementType;
  color:       string;
  iconBg:      string;
  iconBorder:  string;
  progressBar: string;
}> = {
  success: {
    Icon:        CheckCircle2,
    color:       '#10B981',
    iconBg:      'rgba(16,185,129,0.12)',
    iconBorder:  'rgba(16,185,129,0.3)',
    progressBar: 'linear-gradient(90deg,#10B981,#059669)',
  },
  error: {
    Icon:        XCircle,
    color:       '#EF4444',
    iconBg:      'rgba(239,68,68,0.12)',
    iconBorder:  'rgba(239,68,68,0.3)',
    progressBar: 'linear-gradient(90deg,#EF4444,#DC2626)',
  },
  warning: {
    Icon:        AlertTriangle,
    color:       '#F59E0B',
    iconBg:      'rgba(245,158,11,0.12)',
    iconBorder:  'rgba(245,158,11,0.3)',
    progressBar: 'linear-gradient(90deg,#F59E0B,#D97706)',
  },
  info: {
    Icon:        Info,
    color:       '#3B82F6',
    iconBg:      'rgba(59,130,246,0.12)',
    iconBorder:  'rgba(59,130,246,0.3)',
    progressBar: 'linear-gradient(90deg,#3B82F6,#2563EB)',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT
// ─────────────────────────────────────────────────────────────────────────────

export default function Toast({
  id,
  title,
  description,
  type     = 'success',
  duration = 5000,
  onDismiss,
}: ToastProps) {
  const [leaving, setLeaving] = useState(false);
  const cfg                   = CFG[type];
  const { Icon }              = cfg;

  // Ref pour éviter de déclencher dismiss plusieurs fois
  const dismissedRef = useRef(false);

  const handleDismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setLeaving(true);
    setTimeout(() => onDismiss(id), 290);
  };

  // Timer d'auto-fermeture
  useEffect(() => {
    const t = setTimeout(handleDismiss, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position:              'relative',
        overflow:              'hidden',
        borderRadius:          16,
        width:                 364,
        maxWidth:              'calc(100vw - 32px)',
        pointerEvents:         'all',
        // Glassmorphism sombre
        background:            'rgba(15, 18, 25, 0.92)',
        backdropFilter:        'blur(24px)',
        WebkitBackdropFilter:  'blur(24px)',
        border:                '1px solid rgba(255,255,255,0.09)',
        boxShadow: [
          '0 2px 8px rgba(0,0,0,0.35)',
          '0 12px 40px rgba(0,0,0,0.45)',
          `0 0 0 1px rgba(255,255,255,0.04)`,
        ].join(', '),
        // Animation gérée par la classe CSS injectée dans ToastContext
        animation: leaving
          ? 'belivay-toast-out 0.29s cubic-bezier(0.4,0,1,1) forwards'
          : 'belivay-toast-in 0.38s cubic-bezier(0.34,1.4,0.64,1) both',
      }}
    >
      {/* Barre accent gauche */}
      <div
        aria-hidden
        style={{
          position:     'absolute',
          inset:        '0 auto 0 0',
          width:         3,
          background:    cfg.color,
          borderRadius: '16px 0 0 16px',
          opacity:       0.9,
        }}
      />

      {/* Corps */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 13px 16px 16px' }}>

        {/* Icône */}
        <div
          aria-hidden
          style={{
            flexShrink:     0,
            width:          36,
            height:         36,
            borderRadius:   10,
            background:     cfg.iconBg,
            border:         `1px solid ${cfg.iconBorder}`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            marginTop:       description ? 0 : 1,
          }}
        >
          <Icon size={17} color={cfg.color} strokeWidth={2.2} />
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: description ? 1 : 9 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontSize:    13.5,
            fontWeight:  700,
            color:       '#F3F4F6',
            lineHeight:  1.3,
            margin:      0,
            letterSpacing: '-0.01em',
          }}>
            {title}
          </p>

          {description && (
            <p style={{
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize:    12.5,
              fontWeight:  400,
              color:       'rgba(209,213,219,0.65)',
              lineHeight:  1.5,
              margin:      '4px 0 0',
            }}>
              {description}
            </p>
          )}
        </div>

        {/* Bouton fermer */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fermer"
          style={{
            flexShrink:     0,
            width:          26,
            height:         26,
            borderRadius:    8,
            border:         'none',
            background:     'rgba(255,255,255,0.06)',
            color:          'rgba(209,213,219,0.5)',
            cursor:         'pointer',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            transition:     'background 0.15s, color 0.15s',
            marginTop:       2,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.13)';
            e.currentTarget.style.color      = '#F3F4F6';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color      = 'rgba(209,213,219,0.5)';
          }}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>

      {/* Barre de progression (fond) */}
      <div
        aria-hidden
        style={{
          position:   'absolute',
          bottom:      0,
          left:        0,
          right:       0,
          height:      2.5,
          background: 'rgba(255,255,255,0.06)',
        }}
      >
        {/* Barre de progression (remplissage qui se vide) */}
        <div
          style={{
            height:          '100%',
            background:       cfg.progressBar,
            transformOrigin: 'left center',
            animation:       `belivay-toast-progress ${duration}ms linear forwards`,
            opacity:          0.75,
          }}
        />
      </div>
    </div>
  );
}