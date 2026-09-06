// frontend/src/features/relay/RelayFinancePanel.tsx
//
// =============================================================================
//  L'ONGLET FINANCES DU POINT RELAIS
//
//  Remplace `renderFinances()` de RelayPointPage. Autonome : il charge ses
//  donnees, gere son chargement et ses erreurs.
//
//  ─────────────────────────────────────────────────────────────────────────
//  CE QU'IL CORRIGE
//
//  L'ancien panneau affichait « Tarif actuel : 150 FCFA / colis » EN DUR.
//  C'est faux des que la grille est configuree : un petit colis rapporte
//  300, un encombrant 1 500, et certaines categories sont refusees.
//
//  Il annoncait aussi un « prochain versement » estime, sans verifier qu'il
//  aurait lieu. Un gerant dont le KYC n'est pas valide n'aurait rien recu
//  ce jour-la, sans avoir ete prevenu.
// =============================================================================

import { useEffect, useState } from "react";
import {
  AlertTriangle, Banknote, CalendarCheck, ChevronRight, Info, Package,
  Smartphone,
} from "lucide-react";

import {
  compteARebours, formatCourt, formatLong, formatPeriode, getRelayDue,
  getRelayTariff, humaniserBlocage, libellePayout, listRelayAdjustments,
  listRelayPayouts, listRelaySettlements,
  type RelayAdjustment, type RelayAmountDue, type RelayPayout,
  type RelaySettlement, type RelayTariffLine,
} from "@/services/api/relaySettlements";

const nf = (n: number) => n.toLocaleString("fr-FR");

interface Props {
  /** Ou envoyer un gerant dont le dossier bloque le versement. */
  onOpenKyc?: () => void;
}

export default function RelayFinancePanel({ onOpenKyc }: Props) {
  const [due, setDue] = useState<RelayAmountDue | null>(null);
  const [grille, setGrille] = useState<RelayTariffLine[]>([]);
  const [ajustements, setAjustements] = useState<RelayAdjustment[]>([]);
  const [releves, setReleves] = useState<RelaySettlement[]>([]);
  const [versements, setVersements] = useState<RelayPayout[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let monte = true;

    Promise.all([
      getRelayDue(),
      // Chaque appel secondaire retombe sur une liste vide : un onglet ne
      // doit pas disparaitre parce qu'une section n'a pas repondu.
      getRelayTariff().catch(() => [] as RelayTariffLine[]),
      listRelayAdjustments().catch(() => [] as RelayAdjustment[]),
      listRelaySettlements().catch(() => [] as RelaySettlement[]),
      listRelayPayouts().catch(() => [] as RelayPayout[]),
    ])
      .then(([d, g, a, r, v]) => {
        if (!monte) return;
        setDue(d);
        setGrille(g);
        setAjustements(a);
        setReleves(r);
        setVersements(v);
      })
      .catch((exc: unknown) => {
        if (!monte) return;
        setErreur(exc instanceof Error
          ? exc.message
          : "Impossible de charger vos finances pour le moment.");
      })
      .finally(() => { if (monte) setChargement(false); });

    return () => { monte = false; };
  }, []);

  if (chargement) {
    return (
      <div style={carte}>
        <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Chargement…</p>
      </div>
    );
  }

  if (erreur || !due) {
    return (
      <div style={carte}>
        <p style={{ fontSize: 15, color: "#020617", margin: 0, fontWeight: 800 }}>
          Finances indisponibles
        </p>
        <p style={{ fontSize: 13, color: "#64748B", margin: "6px 0 0", lineHeight: 1.6 }}>
          {erreur ?? "Aucun compte financier n'est rattaché à ce point relais."}
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // DEDUPLIQUER APRES TRADUCTION, PAS AVANT
  //
  // Le backend renvoie deux blocages distincts — « aucun numero » et
  // « aucun operateur » — qui se traduisent par la MEME phrase. Les
  // dedupliquer avant traduction ne servirait a rien : ce sont deux
  // chaines differentes.
  //
  // Un gerant qui lit deux fois la meme phrase croit a un bug.
  // ─────────────────────────────────────────────────────────────────────
  const blocages = Array.from(
    new Set(due.blockers.map(humaniserBlocage)),
  );
  const bloque = blocages.length > 0;
  // `due_xaf` est DEJA net : on reconstitue le brut pour que le detail se
  // lise sans calcul mental.
  const acquis = due.due_xaf + due.outstanding_debt_xaf;
  // ─────────────────────────────────────────────────────────────────────
  // LES COLIS SE COMPTENT SUR LES AJUSTEMENTS, PAS SUR LES RELEVES
  //
  // Un releve n'existe qu'apres la construction d'un cycle. Compter dessus
  // affichait ZERO a un gerant qui avait deja remis dix colis — le plus
  // decourageant des chiffres, et le plus faux.
  //
  // Chaque remise cree une remuneration : c'est la bonne source.
  // ─────────────────────────────────────────────────────────────────────
  const colisRemuneres = ajustements.filter(
    (a) => a.direction === "DEBIT" && /colis/i.test(a.reason),
  ).length || releves.reduce((somme, r) => somme + r.lines.length, 0);
  const contrat = grille.find((l) => l.contract_reference)?.contract_reference;

  return (
    <div>

      {/* ═══ MONTANT DU ═══════════════════════════════════════════════ */}
      <div style={{ ...carte, marginBottom: 16 }}>
        <p style={kicker}>REVERSEMENTS</p>
        <p style={titre}>Finances MoMo</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14, marginBottom: 18,
        }}>
          <Tuile
            icone={<Banknote size={21} color="#1D4ED8" />}
            label="BelivaY vous doit"
            valeur={nf(due.due_xaf)}
            note="FCFA · après retenue"
          />
          <Tuile
            icone={<Package size={21} color="#64748B" />}
            label="Colis rémunérés"
            valeur={String(colisRemuneres)}
            note="depuis vos remises"
          />
          {bloque ? (
            <Tuile
              icone={<AlertTriangle size={21} color="#C2410C" />}
              label="Prochain versement"
              valeur="suspendu"
              note="voir ci-dessous"
              petit
            />
          ) : (
            <Tuile
              icone={<CalendarCheck size={21} color="#1D4ED8" />}
              label="Prochain versement"
              valeur={formatLong(due.next_settlement_at) || "au seuil"}
              note={compteARebours(due.next_settlement_at)
                || "dès le minimum atteint"}
              petit
              accentNote
            />
          )}
          <Tuile
            icone={<Smartphone size={21} color="#64748B" />}
            label="Versé sur"
            valeur={versements[0]?.payee_msisdn_masked || "—"}
            note={versements[0]?.payee_operator
              ? `${versements[0].payee_operator} Mobile Money`
              : "numéro non enregistré"}
            petit
          />
        </div>

        {/* Le detail : `due_xaf` seul laisserait un chiffre inexplique. */}
        {due.outstanding_debt_xaf > 0 && (
          <div style={{
            border: "1px solid #E2E8F0", borderRadius: 14,
            padding: "16px 18px", background: "#F8FAFC",
          }}>
            <p style={{
              fontSize: 11.5, color: "#64748B", margin: "0 0 12px",
              fontWeight: 700, letterSpacing: "0.05em",
            }}>
              DÉTAIL DU MONTANT
            </p>
            <Ligne label="Colis remis, acquis" valeur={nf(acquis)} />
            <Ligne
              label="Retenue"
              valeur={`− ${nf(due.outstanding_debt_xaf)}`}
              rouge
            />
            <div style={{
              display: "flex", justifyContent: "space-between",
              paddingTop: 10,
            }}>
              <span style={{ fontSize: 13.5, color: "#020617", fontWeight: 700 }}>
                À verser
              </span>
              <span style={{ fontSize: 16, color: "#020617", fontWeight: 900 }}>
                {nf(due.due_xaf)}{" "}
                <span style={{ fontSize: 11.5, color: "#94A3B8" }}>FCFA</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BLOCAGES ═════════════════════════════════════════════════ */}
      {/* Quand un blocage existe, promettre un versement est deloyal. */}
      {bloque && (
        <div style={{
          background: "#FFF7ED", border: "1px solid #FED7AA",
          borderRadius: 18, padding: "18px 22px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
            <AlertTriangle size={20} color="#C2410C" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: 15, color: "#7C2D12", margin: "0 0 5px", fontWeight: 800,
              }}>
                Versement suspendu
              </p>
              {blocages.map((b) => (
                <p key={b} style={{
                  fontSize: 13, color: "#9A3412", margin: "0 0 6px", lineHeight: 1.6,
                }}>
                  {b}
                </p>
              ))}
              {onOpenKyc && (
                <button
                  type="button"
                  onClick={onOpenKyc}
                  style={{
                    fontSize: 12.5, padding: "8px 15px", background: "#fff",
                    border: "1px solid #FDBA74", borderRadius: 10,
                    color: "#9A3412", fontWeight: 700, cursor: "pointer",
                    marginTop: 4,
                  }}
                >
                  Compléter mon dossier
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ RETENUES ═════════════════════════════════════════════════ */}
      {ajustements.length > 0 && (
        <div style={{ ...carte, marginBottom: 16 }}>
          <p style={{ ...kicker, color: "#B91C1C" }}>RETENUES</p>
          <p style={titre}>Ce qui est déduit, et pourquoi</p>
          <p style={sousTitre}>
            Toute retenue porte son motif. Si l’un vous semble injustifié,
            contactez l’administration BelivaY.
          </p>

          <div style={liste}>
            {ajustements.map((a, i) => {
              const retenue = a.direction === "CREDIT";
              return (
                <div
                  key={a.reference}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 13,
                    padding: "15px 18px",
                    borderBottom: i < ajustements.length - 1
                      ? "1px solid #F1F5F9" : "none",
                  }}
                >
                  <span style={{
                    width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                    marginTop: 6,
                    background: retenue ? "#F59E0B" : "#10B981",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Le motif en premier : c'est ce qu'on veut lire. */}
                    <p style={{
                      fontSize: 14, color: "#020617", margin: 0,
                      fontWeight: 700, lineHeight: 1.5,
                    }}>
                      {a.reason}
                    </p>
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: "4px 0 0" }}>
                      {a.category_label} · {formatCourt(a.created_at)}
                      {a.remaining_xaf > 0 && a.remaining_xaf !== a.amount_xaf
                        && ` · reste ${nf(a.remaining_xaf)} à imputer`}
                      {a.remaining_xaf === 0 && " · soldé"}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 16, fontWeight: 800, whiteSpace: "nowrap",
                    color: retenue ? "#B91C1C" : "#065F46",
                  }}>
                    {retenue ? "− " : "+ "}{nf(a.amount_xaf)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ GRILLE TARIFAIRE ═════════════════════════════════════════ */}
      {grille.length > 0 && (
        <div style={{ ...carte, marginBottom: 16 }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", gap: 16, flexWrap: "wrap",
          }}>
            <div>
              <p style={kicker}>VOTRE CONTRAT</p>
              <p style={{ ...titre, marginBottom: 0 }}>Grille tarifaire</p>
            </div>
            {contrat && (
              <span style={{
                fontSize: 11.5, color: "#64748B", background: "#F1F5F9",
                padding: "6px 13px", borderRadius: 999,
              }}>
                Réf. {contrat}
              </span>
            )}
          </div>
          <p style={{ ...sousTitre, marginTop: 6 }}>
            Montant versé par colis remis, selon sa catégorie. Cette
            rémunération vient de votre contrat — elle ne dépend pas des frais
            de livraison payés par l’acheteur.
          </p>

          <div style={liste}>
            <div style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "13px 18px", background: "#F8FAFC",
              borderBottom: "1px solid #E2E8F0",
            }}>
              <span style={{ flex: 1, ...entete }}>CATÉGORIE</span>
              <span style={{ width: 105, ...entete }}>TARIF</span>
              <span style={{ width: 120, ...entete, textAlign: "right" }}>ORIGINE</span>
            </div>

            {grille.map((l, i) => (
              <div
                key={l.parcel_size}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px",
                  background: l.is_accepted ? "transparent" : "#FEF2F2",
                  borderBottom: i < grille.length - 1
                    ? "1px solid #F1F5F9" : "none",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: 14.5, margin: 0, fontWeight: 700,
                    color: l.is_accepted ? "#020617" : "#7F1D1D",
                  }}>
                    {l.parcel_size_label}
                  </p>
                  {/* On l'affiche : la masquer laisserait croire qu'elle
                      n'existe pas. */}
                  {!l.is_accepted && (
                    <p style={{ fontSize: 12, color: "#B91C1C", margin: "3px 0 0" }}>
                      Vous ne recevez pas cette catégorie.
                    </p>
                  )}
                </div>
                <span style={{
                  width: 105, fontSize: l.is_accepted ? 17 : 14,
                  fontWeight: l.is_accepted ? 800 : 700,
                  color: l.is_accepted ? "#020617" : "#B91C1C",
                }}>
                  {l.is_accepted ? nf(l.amount_xaf) : "—"}
                </span>
                <span style={{ width: 120, textAlign: "right" }}>
                  {!l.is_accepted ? (
                    <Etiquette texte="refusé" fond="#FEE2E2" couleur="#991B1B" />
                  ) : l.is_negotiated ? (
                    <Etiquette texte="négocié" fond="#D1FAE5" couleur="#065F46" />
                  ) : (
                    <span style={{ fontSize: 12, color: "#64748B" }}>
                      tarif général
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16,
            padding: "13px 15px", background: "#EFF6FF", borderRadius: 12,
          }}>
            <Info size={17} color="#1D4ED8" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12.5, color: "#1E40AF", margin: 0, lineHeight: 1.6 }}>
              Un tarif <b>négocié</b> vient d’un accord propre à votre point
              relais et prime sur le tarif général. Pour modifier votre grille,
              contactez l’administration BelivaY.
            </p>
          </div>
        </div>
      )}

      {/* ═══ RELEVÉS ══════════════════════════════════════════════════ */}
      <div style={{ ...carte, marginBottom: 16 }}>
        <p style={kicker}>RELEVÉS</p>
        <p style={titre}>Mes règlements</p>
        <p style={sousTitre}>
          Chaque relevé regroupe les colis d’une période en un seul versement.
        </p>

        {releves.length === 0 ? (
          <Vide texte="Aucun règlement pour le moment. Votre premier relevé apparaîtra ici dès la fin du prochain cycle." />
        ) : (
          <div style={liste}>
            {releves.map((r, i) => (
              <div
                key={r.reference}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "15px 18px",
                  borderBottom: i < releves.length - 1
                    ? "1px solid #F1F5F9" : "none",
                }}
              >
                <span style={{
                  width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                  background: r.payout?.settled_at ? "#10B981" : "#F59E0B",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13.5, color: "#020617", margin: 0, fontWeight: 700,
                  }}>
                    {r.reference}
                  </p>
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: "3px 0 0" }}>
                    {formatPeriode(r.period_start, r.period_end)}
                    {r.lines.length > 0 && ` · ${r.lines.length} colis`}
                  </p>
                </div>
                <span style={{
                  width: 105, textAlign: "right", fontSize: 12,
                  color: r.payout?.settled_at ? "#64748B" : "#B45309",
                  fontWeight: r.payout?.settled_at ? 400 : 600,
                }}>
                  {r.payout?.settled_at
                    ? `versé le ${formatCourt(r.payout.settled_at)}`
                    : r.status_label}
                </span>
                <span style={{
                  width: 85, textAlign: "right", fontSize: 16,
                  color: "#020617", fontWeight: 800,
                }}>
                  {nf(r.net_amount_xaf)}
                </span>
                <ChevronRight size={16} color="#CBD5E1" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ VERSEMENTS ═══════════════════════════════════════════════ */}
      <div style={carte}>
        <p style={kicker}>HISTORIQUE</p>
        <p style={titre}>Versements reçus</p>

        {versements.length === 0 ? (
          <Vide texte="Aucun versement pour le moment. Ils apparaîtront ici avec leur montant, votre numéro et leur statut." />
        ) : (
          <div style={liste}>
            {versements.map((v, i) => {
              const etat = libellePayout(v.status);
              const inconnu = v.status === "UNKNOWN";
              return (
                <div
                  key={v.reference}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "15px 18px",
                    borderBottom: i < versements.length - 1
                      ? "1px solid #F1F5F9" : "none",
                  }}
                >
                  <span style={{
                    width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                    background: etat.couleur,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13.5, color: "#020617", margin: 0, fontWeight: 700,
                    }}>
                      {v.reference}
                    </p>
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: "3px 0 0" }}>
                      {formatCourt(v.settled_at ?? v.requested_at)}
                      {/* `UNKNOWN` n'est pas un echec : on ignore si l'argent
                          est parti, et le gerant n'a rien a faire. */}
                      {inconnu
                        ? " · vérification en cours auprès de l’opérateur"
                        : ` · ${v.payee_msisdn_masked} ${v.payee_operator}`}
                    </p>
                  </div>
                  <span style={{
                    width: 105, textAlign: "right", fontSize: 12,
                    color: etat.couleur, fontWeight: 600,
                  }}>
                    {etat.texte}
                  </span>
                  <span style={{
                    width: 85, textAlign: "right", fontSize: 16,
                    color: "#020617", fontWeight: 800,
                  }}>
                    {nf(v.amount_xaf)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fragments
// ─────────────────────────────────────────────────────────────────────────────

function Tuile({ icone, label, valeur, note, petit, accentNote }: {
  icone: React.ReactNode; label: string; valeur: string; note: string;
  petit?: boolean; accentNote?: boolean;
}) {
  return (
    <div style={{
      border: "1px solid #E2E8F0", background: "#F8FAFC",
      borderRadius: 16, padding: 18,
    }}>
      {icone}
      <p style={{
        fontSize: 12.5, color: "#64748B", margin: "11px 0 0", fontWeight: 700,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: petit ? 17 : 26, color: "#020617", margin: "4px 0 0",
        fontWeight: petit ? 800 : 900,
      }}>
        {valeur}
      </p>
      <p style={{
        fontSize: accentNote ? 12.5 : 12, margin: "7px 0 0", lineHeight: 1.5,
        color: accentNote ? "#1D4ED8" : "#64748B",
        fontWeight: accentNote ? 700 : 400,
      }}>
        {note}
      </p>
    </div>
  );
}

function Ligne({ label, valeur, rouge }: {
  label: string; valeur: string; rouge?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "0 0 10px", borderBottom: "1px solid #E2E8F0",
      marginBottom: 10,
    }}>
      <span style={{ fontSize: 13.5, color: rouge ? "#B91C1C" : "#475569" }}>
        {label}
      </span>
      <span style={{
        fontSize: 14, fontWeight: 700, color: rouge ? "#B91C1C" : "#020617",
      }}>
        {valeur}
      </span>
    </div>
  );
}

function Etiquette({ texte, fond, couleur }: {
  texte: string; fond: string; couleur: string;
}) {
  return (
    <span style={{
      fontSize: 11.5, color: couleur, background: fond,
      padding: "4px 10px", borderRadius: 999, fontWeight: 700,
    }}>
      {texte}
    </span>
  );
}

function Vide({ texte }: { texte: string }) {
  return (
    <div style={{
      border: "1px dashed #E2E8F0", borderRadius: 14,
      padding: "26px 18px", textAlign: "center",
    }}>
      <p style={{
        fontSize: 13, color: "#94A3B8", margin: 0, lineHeight: 1.6,
        maxWidth: 420, marginLeft: "auto", marginRight: "auto",
      }}>
        {texte}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const carte: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 18,
  padding: 22,
};

const kicker: React.CSSProperties = {
  fontSize: 11, color: "#1D4ED8", margin: "0 0 4px",
  letterSpacing: "0.1em", fontWeight: 700,
};

const titre: React.CSSProperties = {
  fontSize: 19, color: "#020617", margin: "0 0 6px", fontWeight: 800,
};

const sousTitre: React.CSSProperties = {
  fontSize: 13, color: "#64748B", margin: "0 0 16px", lineHeight: 1.6,
};

const liste: React.CSSProperties = {
  border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden",
};

const entete: React.CSSProperties = {
  fontSize: 11.5, color: "#64748B", fontWeight: 700,
};