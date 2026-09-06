// frontend/src/features/admin/FinanceConfigEditPage.tsx
//
// =============================================================================
//  MODIFIER UN REGLAGE FINANCIER
//
//  Une page par reglage. Le formulaire est construit a partir du SCHEMA
//  renvoye par le serveur : 117 champs, avec leur type, leurs choix et leur
//  aide.
//
//  ─────────────────────────────────────────────────────────────────────────
//  ON NE MODIFIE JAMAIS DIRECTEMENT
//
//  Le bouton n'enregistre pas : il cree une DEMANDE, qu'un tiers approuvera.
//  La contrainte est appliquee en base, pas seulement ici.
//
//  L'ecran le dit clairement plutot que de laisser croire a un
//  enregistrement immediat — decouvrir que rien n'a change serait pire.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, GitPullRequest, RefreshCw, RotateCcw, Save,
} from 'lucide-react';

import { useAdminTheme } from '@/hooks/useAdminTheme';
import { api } from '@/services/api/client';

// ─────────────────────────────────────────────────────────────────────────────

interface FieldSchema {
  name: string;
  label: string;
  type: 'string' | 'text' | 'integer' | 'decimal' | 'boolean' | 'select' | 'json';
  choices: Array<{ value: string; label: string }>;
  default: unknown;
  required: boolean;
  /** La consequence du reglage, pas sa definition. */
  help: string;
  /** Un reglage qui engage : mode LIVE, blocage automatique… */
  sensitive: boolean;
}

interface SectionDetail {
  key: string;
  label: string;
  hint: string;
  governance_level: string;
  schema: FieldSchema[];
  active: Array<Record<string, unknown>>;
  history: Array<{
    config_key: string;
    version: number;
    is_active: boolean;
    valid_from: string | null;
    created_by: string;
  }>;
}

type Valeurs = Record<string, unknown>;

function fmtDate(v: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Compare en tenant compte des types : « 100 » et 100 sont identiques. */
function different(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined) return !(b === null || b === undefined || b === '');
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a) !== JSON.stringify(b);
  }
  return String(a) !== String(b);
}

// =============================================================================

export default function FinanceConfigEditPage() {
  const T = useAdminTheme();
  const navigate = useNavigate();
  const { section = '', configKey = '' } = useParams<{
    section: string; configKey: string;
  }>();

  const [detail, setDetail] = useState<SectionDetail | null>(null);
  const [valeurs, setValeurs] = useState<Valeurs>({});
  const [initial, setInitial] = useState<Valeurs>({});
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.get<SectionDetail>(
        `/api/payments/v2/admin/config/${section}/`,
      );
      setDetail(d);

      // La cle peut viser un objet precis — une categorie de colis, par
      // exemple. Sans cle, on prend le premier actif.
      const cible = configKey
        ? d.active.find((o) => String(o.config_key) === configKey)
        : d.active[0];

      const depart: Valeurs = {};
      d.schema.forEach((c) => {
        depart[c.name] = cible?.[c.name] ?? c.default ?? '';
      });
      setValeurs(depart);
      setInitial(depart);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [section, configKey]);

  useEffect(() => { void load(); }, [load]);

  const modifies = useMemo(
    () => Object.keys(valeurs).filter((k) => different(valeurs[k], initial[k])),
    [valeurs, initial],
  );

  const soumettre = async () => {
    if (modifies.length === 0) {
      setError('Aucune modification à demander.');
      return;
    }
    if (!justification.trim()) {
      setError('La justification est obligatoire.');
      return;
    }

    // On n'envoie QUE ce qui change : un payload complet reecrirait des
    // champs qu'on n'a pas voulu toucher.
    const payload: Valeurs = {};
    modifies.forEach((k) => { payload[k] = valeurs[k]; });

    setBusy(true);
    setError(null);
    try {
      const cle = configKey || String(detail?.active[0]?.config_key ?? '');
      await api.post('/api/payments/v2/admin/config/requests/', {
        section,
        config_key: cle,
        payload,
        justification: justification.trim(),
      });
      setNotice(
        'Demande créée. Elle doit être approuvée par une autre personne '
        + 'avant de prendre effet.',
      );
      setJustification('');
      await load();
    } catch (exc) {
      // Le message du serveur, TEL QUEL.
      setError(exc instanceof Error ? exc.message : 'La demande a échoué.');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !detail) {
    return <p style={{ fontSize: 13, color: T.muted }}>Chargement…</p>;
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Retour T={T} onClick={() => navigate('/admin/finance/configuration')} />
        <p style={{ fontSize: 13, color: T.red }}>
          {error ?? 'Réglage introuvable.'}
        </p>
      </div>
    );
  }

  const sensibleModifie = detail.schema.some(
    (c) => c.sensitive && modifies.includes(c.name),
  );

  return (
    <div className="space-y-5">

      <Retour T={T} onClick={() => navigate('/admin/finance/configuration')} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{
            fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800,
            color: T.text, marginBottom: 4,
          }}>
            {detail.label}
          </h1>
          <p style={{ fontSize: 12.5, color: T.muted }}>{detail.hint}</p>
        </div>
        <button
          onClick={() => { void load(); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <Bandeau T={T} tone="error">{error}</Bandeau>}
      {notice && <Bandeau T={T} tone="ok">{notice}</Bandeau>}

      {/* ── Choisir l'objet quand il y en a plusieurs ────────────────── */}
      {detail.active.length > 1 && (
        <Section title="Règle à modifier" icon={GitPullRequest} T={T}>
          <div className="flex flex-wrap gap-2">
            {detail.active.map((o) => {
              const cle = String(o.config_key);
              const actif = cle === (configKey || String(detail.active[0]?.config_key));
              return (
                <button
                  key={cle}
                  type="button"
                  onClick={() => navigate(
                    `/admin/finance/configuration/${section}/${cle}`,
                  )}
                  style={{
                    padding: '8px 14px', borderRadius: 10, fontSize: 12,
                    fontWeight: 600,
                    background: actif ? T.redB : T.cardAlt,
                    border: `1px solid ${actif ? `${T.red}55` : T.border}`,
                    color: actif ? T.red : T.muted,
                  }}
                >
                  {String(o.name || cle)}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Le formulaire ───────────────────────────────────────────── */}
      <Section title="Valeurs" icon={Save} T={T}>
        {detail.schema.map((champ) => {
          const change = modifies.includes(champ.name);
          const valeur = valeurs[champ.name];

          return (
            <div key={champ.name}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <label style={{ fontSize: 12.5, fontWeight: 600, color: T.muted }}>
                  {champ.label}
                  {champ.sensitive && (
                    <span style={{ color: '#FBBF24', marginLeft: 6, fontSize: 11 }}>
                      sensible
                    </span>
                  )}
                </label>
                {/* La valeur d'origine reste accessible : c'est le retour
                    arriere le plus simple qui soit. */}
                {change && champ.default !== null && champ.default !== undefined && (
                  <button
                    type="button"
                    onClick={() => setValeurs((v) => ({
                      ...v, [champ.name]: initial[champ.name],
                    }))}
                    className="inline-flex items-center gap-1"
                    style={{ fontSize: 11, color: T.mutedL }}
                  >
                    <RotateCcw size={10} /> annuler
                  </button>
                )}
              </div>

              {champ.help && (
                <p style={{ fontSize: 11, color: T.mutedL, margin: '0 0 6px', lineHeight: 1.5 }}>
                  {champ.help}
                </p>
              )}

              {champ.type === 'boolean' ? (
                <button
                  type="button"
                  onClick={() => setValeurs((v) => ({
                    ...v, [champ.name]: !v[champ.name],
                  }))}
                  className="flex items-center gap-2.5"
                  style={{
                    padding: '9px 13px', borderRadius: 10, width: '100%',
                    background: T.cardAlt,
                    border: `1px solid ${change ? '#FBBF24' : T.border}`,
                    color: T.text, fontSize: 13, fontWeight: 600,
                  }}
                >
                  <span style={{
                    width: 34, height: 19, borderRadius: 999, flexShrink: 0,
                    background: valeur ? '#10B981' : T.border,
                    position: 'relative', transition: 'background .15s',
                  }}>
                    <span style={{
                      position: 'absolute', top: 2,
                      left: valeur ? 17 : 2,
                      width: 15, height: 15, borderRadius: '50%',
                      background: '#fff', transition: 'left .15s',
                    }} />
                  </span>
                  {valeur ? 'Activé' : 'Désactivé'}
                </button>
              ) : champ.type === 'select' ? (
                <select
                  value={String(valeur ?? '')}
                  onChange={(e) => setValeurs((v) => ({
                    ...v, [champ.name]: e.target.value,
                  }))}
                  style={{
                    width: '100%', padding: '9px 13px', borderRadius: 10,
                    background: T.cardAlt, color: T.text, fontSize: 13,
                    border: `1px solid ${change ? '#FBBF24' : T.border}`,
                  }}
                >
                  {!champ.required && <option value="">—</option>}
                  {champ.choices.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              ) : champ.type === 'json' ? (
                <textarea
                  value={typeof valeur === 'string'
                    ? valeur : JSON.stringify(valeur ?? [], null, 2)}
                  onChange={(e) => setValeurs((v) => ({
                    ...v, [champ.name]: e.target.value,
                  }))}
                  rows={3}
                  style={{
                    width: '100%', padding: '9px 13px', borderRadius: 10,
                    background: T.cardAlt, color: T.text, fontSize: 12,
                    fontFamily: 'monospace',
                    border: `1px solid ${change ? '#FBBF24' : T.border}`,
                  }}
                />
              ) : (
                <input
                  type={champ.type === 'integer' || champ.type === 'decimal'
                    ? 'number' : 'text'}
                  step={champ.type === 'decimal' ? '0.01' : undefined}
                  value={String(valeur ?? '')}
                  onChange={(e) => {
                    const brut = e.target.value;
                    setValeurs((v) => ({
                      ...v,
                      [champ.name]: champ.type === 'integer'
                        ? (brut === '' ? '' : Number(brut))
                        : brut,
                    }));
                  }}
                  style={{
                    width: '100%', padding: '9px 13px', borderRadius: 10,
                    background: T.cardAlt, color: T.text, fontSize: 13,
                    border: `1px solid ${change ? '#FBBF24' : T.border}`,
                  }}
                />
              )}
            </div>
          );
        })}
      </Section>

      {/* ── Le différentiel avant envoi ─────────────────────────────── */}
      {modifies.length > 0 && (
        <Section title="Ce qui va changer" icon={GitPullRequest} T={T}>
          <div style={{
            border: `1px solid ${T.border}`, borderRadius: 12,
            padding: '12px 16px', background: T.cardAlt,
          }}>
            {modifies.map((k) => {
              const champ = detail.schema.find((c) => c.name === k);
              return (
                <div key={k} className="flex justify-between items-baseline"
                  style={{ padding: '5px 0' }}>
                  <span style={{ fontSize: 12, color: T.mutedL }}>
                    {champ?.label ?? k}
                  </span>
                  <span style={{ fontSize: 12.5, color: T.text }}>
                    <span style={{ color: T.red, textDecoration: 'line-through' }}>
                      {String(initial[k] ?? '—')}
                    </span>
                    {' → '}
                    <b>{String(valeurs[k] ?? '—')}</b>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Un reglage sensible merite qu'on s'arrete dessus. */}
          {sensibleModifie && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.25)',
            }}>
              <AlertTriangle size={15} style={{ color: '#FBBF24', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#FBBF24', margin: 0, lineHeight: 1.55 }}>
                Vous modifiez un réglage sensible. Il engage de l’argent réel
                ou lève une protection — relisez le différentiel avant de
                demander.
              </p>
            </div>
          )}

          <div>
            <label style={{
              fontSize: 12.5, fontWeight: 600, color: T.muted,
              display: 'block', marginBottom: 6,
            }}>
              Justification
            </label>
            <p style={{ fontSize: 11, color: T.mutedL, margin: '0 0 6px', lineHeight: 1.5 }}>
              Elle sera lue par la personne qui approuve, et conservée dans
              l’historique.
            </p>
            <input
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Pourquoi ce changement…"
              style={{
                width: '100%', padding: '9px 13px', borderRadius: 10,
                background: T.cardAlt, color: T.text, fontSize: 13,
                border: `1px solid ${T.border}`,
              }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setValeurs(initial); setJustification(''); }}
              style={{
                padding: '9px 16px', borderRadius: 10, fontSize: 12.5,
                fontWeight: 600, background: T.cardAlt, color: T.muted,
                border: `1px solid ${T.border}`,
              }}
            >
              Tout annuler
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { void soumettre(); }}
              className="inline-flex items-center gap-1.5"
              style={{
                padding: '9px 16px', borderRadius: 10, fontSize: 12.5,
                fontWeight: 700, background: T.redB, color: T.red,
                border: `1px solid ${T.red}55`,
                opacity: busy ? 0.5 : 1,
              }}
            >
              <GitPullRequest size={13} />
              {busy ? 'Envoi…' : 'Demander la modification'}
            </button>
          </div>

          {/* Dire d'avance que rien n'est enregistre : le decouvrir apres
              coup serait pire. */}
          <p style={{ fontSize: 11.5, color: T.mutedL, textAlign: 'right', lineHeight: 1.5 }}>
            Rien n’est enregistré maintenant. Une autre personne devra
            approuver la demande.
          </p>
        </Section>
      )}

      {/* ── Historique ──────────────────────────────────────────────── */}
      {detail.history.length > 0 && (
        <Section title="Historique des versions" icon={RotateCcw} T={T}>
          {detail.history.slice(0, 10).map((h) => (
            <div key={`${h.config_key}-${h.version}`} className="flex gap-3">
              <span style={{ fontSize: 11.5, color: T.mutedL, width: 74, flexShrink: 0 }}>
                {fmtDate(h.valid_from)}
              </span>
              <span style={{ fontSize: 12, color: T.muted }}>
                <b style={{ color: T.text }}>v{h.version}</b> · {h.config_key}
                {h.created_by && ` · par ${h.created_by}`}
                {h.is_active && <span style={{ color: '#34D399' }}> · active</span>}
              </span>
            </div>
          ))}
          <p style={{ fontSize: 11.5, color: T.mutedL, lineHeight: 1.6 }}>
            Pour revenir à une version antérieure, utilisez le retour arrière
            depuis la demande correspondante, dans l’écran de configuration.
            Une nouvelle version portant les anciennes valeurs sera créée —
            l’historique reste complet.
          </p>
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Retour({ onClick, T }: {
  onClick: () => void; T: ReturnType<typeof useAdminTheme>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5"
      style={{
        padding: '7px 13px', borderRadius: 10, fontSize: 12,
        background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`,
      }}
    >
      <ArrowLeft size={13} /> Configuration
    </button>
  );
}

function Section({ title, icon: Icon, children, T }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  T: ReturnType<typeof useAdminTheme>;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
        <Icon size={14} style={{ color: T.red }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</span>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Bandeau({ children, tone, T }: {
  children: React.ReactNode;
  tone: 'error' | 'ok';
  T: ReturnType<typeof useAdminTheme>;
}) {
  const err = tone === 'error';
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 12, fontSize: 12.5,
      background: err ? T.redB : 'rgba(16,185,129,0.1)',
      border: `1px solid ${err ? `${T.red}33` : 'rgba(16,185,129,0.3)'}`,
      color: err ? T.red : '#34D399',
    }}>
      {children}
    </div>
  );
}