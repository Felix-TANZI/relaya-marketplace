// frontend/src/features/vendors/components/NextSettlementCard.tsx
//
// =============================================================================
//  LE PROCHAIN REGLEMENT
//
//  Cette carte s'insere dans la page portefeuille, AU-DESSUS du formulaire
//  de retrait. Elle ne le remplace pas.
//
//  ─────────────────────────────────────────────────────────────────────────
//  CE QU'ELLE APPORTE QUE LE SOLDE SEUL NE DIT PAS
//
//  Un solde repond a « combien ». Cette carte repond a « quand », et
//  surtout a « pourquoi pas encore ».
//
//  Le montant « pas encore du » est le point delicat : ce sont des
//  commandes vivantes, l'acheteur peut encore etre rembourse. Ce n'est PAS
//  l'argent du vendeur, et l'afficher comme un solde serait une promesse
//  que le sequestre ne tient pas.
// =============================================================================

import { useEffect, useState } from "react";
import { CalendarCheck, Clock, Lock, TriangleAlert } from "lucide-react";

import {
  countdownLabel, formatSettlementDate, getAmountDue, humanizeBlocker,
  type AmountDue,
} from "@/services/api/vendorSettlements";

const T = {
  orange: "#F47920",
  coral: "#D85A30",
  green: "#0F6E56",
  greenL: "#1D9E75",
  amber: "#EF9F27",
  amberD: "#854F0B",
  red: "#E24B4A",
  redD: "#A32D2D",
  cream: "#F8F5F1",
  border: "#EDE7DC",
  text: "#1A1209",
  muted: "#7C6E5A",
  faint: "#B4B2A9",
  held: "#D3D1C7",
} as const;

const nf = (n: number) => n.toLocaleString("fr-FR");

interface Props {
  /** Rafraichi apres une action externe — creation de retrait, par exemple. */
  refreshKey?: number;
  onOpenProfile?: () => void;
}

export default function NextSettlementCard({ refreshKey, onOpenProfile }: Props) {
  // Le resultat est memorise AVEC la cle qui l'a produit. `chargement` en est
  // deduit, au lieu d'etre pose par un setState synchrone dans l'effet — ce
  // qui declenchait un rendu en cascade a chaque montage et rafraichissement.
  const [instantane, setInstantane] = useState<{
    cle: number; due: AmountDue | null; erreur: string | null;
  } | null>(null);

  const cle = refreshKey ?? 0;
  const chargement = instantane === null || instantane.cle !== cle;
  const due = instantane?.due ?? null;
  const erreur = instantane?.erreur ?? null;

  useEffect(() => {
    let monte = true;

    getAmountDue()
      .then((donnees) => {
        if (monte) setInstantane({ cle, due: donnees, erreur: null });
      })
      .catch((exc: unknown) => {
        if (!monte) return;
        setInstantane({
          cle, due: null,
          erreur: exc instanceof Error ? exc.message : "Chargement impossible.",
        });
      });

    return () => { monte = false; };
  }, [cle]);

  if (chargement) {
    return (
      <div style={carte}>
        <span style={{ fontSize: 13, color: T.faint }}>Chargement…</span>
      </div>
    );
  }

  // Un vendeur sans compte financier n'a rien a voir ici. On ne rend RIEN
  // plutot qu'une erreur : ce serait inquietant sans raison.
  if (erreur || !due || !due.payee_code) return null;

  const bloque = due.blockers.length > 0;
  const totalMaturite = due.not_yet_due_xaf + due.in_settlement_xaf
    + due.released_not_settled_xaf + due.pending_bonus_xaf;

  const segments = [
    {
      label: "Sous séquestre",
      hint: "encore remboursable",
      amount: due.not_yet_due_xaf,
      color: T.held,
    },
    {
      label: "En règlement",
      hint: "lot en préparation",
      amount: due.in_settlement_xaf,
      color: "#F0997B",
    },
    {
      label: "Acquis",
      hint: due.outstanding_debt_xaf > 0
        ? `dont ${nf(due.outstanding_debt_xaf)} retenus`
        : "à verser au prochain cycle",
      amount: due.released_not_settled_xaf + due.pending_bonus_xaf,
      color: T.greenL,
    },
  ];

  return (
    <div style={carte}>

      {/* ── Montant du et echeance ─────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: 20, flexWrap: "wrap",
        marginBottom: 22,
      }}>
        <div>
          <p style={etiquette}>BelivaY vous doit</p>
          <p style={{
            fontSize: 38, fontWeight: 700, color: T.text, margin: 0,
            lineHeight: 1, fontVariantNumeric: "tabular-nums",
          }}>
            {nf(due.due_xaf)}
          </p>
          <p style={{ fontSize: 12.5, color: T.muted, margin: "7px 0 0" }}>
            FCFA · net de toute retenue
          </p>
        </div>

        {bloque ? (
          // QUAND UN OBSTACLE EXISTE, LA DATE DISPARAIT.
          // Annoncer « versement vendredi » a un partenaire dont le dossier
          // est incomplet est une promesse fausse — et c'est ce qui detruit
          // la confiance quand le vendredi arrive sans virement.
          <div style={{ textAlign: "right", maxWidth: 280 }}>
            <p style={{ ...etiquette, color: T.amberD }}>Versement suspendu</p>
            {due.blockers.map((b) => (
              <div key={b} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                justifyContent: "flex-end", marginTop: 6,
              }}>
                <TriangleAlert size={15} color={T.amber} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{
                  fontSize: 13, color: T.text, margin: 0,
                  textAlign: "left", lineHeight: 1.5,
                }}>
                  {humanizeBlocker(b)}
                </p>
              </div>
            ))}
            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                style={{
                  marginTop: 12, fontSize: 12, padding: "7px 14px",
                  borderRadius: 10, border: `1px solid ${T.border}`,
                  background: "#fff", color: T.text, cursor: "pointer",
                }}
              >
                Compléter mon dossier
              </button>
            )}
          </div>
        ) : due.next_settlement_at ? (
          <div style={{ textAlign: "right" }}>
            <p style={etiquette}>Prochain versement</p>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              justifyContent: "flex-end",
            }}>
              <CalendarCheck size={17} color={T.coral} />
              <span style={{ fontSize: 15.5, color: T.text, fontWeight: 600 }}>
                {formatSettlementDate(due.next_settlement_at)}
              </span>
            </div>
            {/* Une date informe ; un compte a rebours engage. */}
            <p style={{
              fontSize: 13, color: T.coral, margin: "5px 0 0", fontWeight: 600,
            }}>
              {countdownLabel(due.next_settlement_at)}
            </p>
          </div>
        ) : (
          <div style={{ textAlign: "right", maxWidth: 240 }}>
            <p style={etiquette}>Prochain versement</p>
            <p style={{ fontSize: 13, color: T.muted, margin: 0, lineHeight: 1.5 }}>
              Dès que le montant minimum sera atteint.
            </p>
          </div>
        )}
      </div>

      {/* ── La barre de maturite ───────────────────────────────────────── */}
      {totalMaturite > 0 && (
        <>
          <div style={{
            display: "flex", height: 7, borderRadius: 999,
            overflow: "hidden", background: T.border, marginBottom: 14,
          }}>
            {segments.map((s) => (
              <div
                key={s.label}
                title={`${s.label} — ${s.hint}`}
                style={{
                  width: `${(Math.max(0, s.amount) / totalMaturite) * 100}%`,
                  background: s.color,
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
            {segments.map((s) => (
              <div key={s.label}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 7, marginBottom: 3,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%", background: s.color,
                  }} />
                  <span style={{ fontSize: 12, color: T.muted }}>{s.label}</span>
                </div>
                <p style={{
                  fontSize: 16, margin: "0 0 1px 14px", color: T.text,
                  fontVariantNumeric: "tabular-nums", fontWeight: 600,
                }}>
                  {nf(s.amount)}
                </p>
                <p style={{ fontSize: 11, margin: "0 0 0 14px", color: T.faint }}>
                  {s.hint}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Les fonds geles ────────────────────────────────────────────── */}
      {due.frozen_xaf > 0 && (
        <div style={{
          marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}`,
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <Lock size={16} color={T.redD} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12.5, color: T.muted, margin: 0, lineHeight: 1.55 }}>
            <b style={{ color: T.redD }}>{nf(due.frozen_xaf)} FCFA</b> sont gelés
            par un litige en cours. Ils seront libérés dès son arbitrage.
          </p>
        </div>
      )}

      {/* ── L'explication du sequestre ─────────────────────────────────── */}
      <div style={{
        marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}`,
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <Clock size={16} color={T.faint} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12.5, color: T.muted, margin: 0, lineHeight: 1.55 }}>
          Les fonds sous séquestre correspondent à des commandes en cours.
          Ils deviennent disponibles après confirmation de réception par
          l'acheteur.
        </p>
      </div>
    </div>
  );
}

const carte: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${T.border}`,
  borderRadius: 20,
  padding: "24px 26px",
};

const etiquette: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: T.faint,
  margin: "0 0 10px",
  fontWeight: 600,
};