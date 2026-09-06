// frontend/src/features/relay/ParcelSizeDisplay.tsx
//
// =============================================================================
//  LA CATEGORIE, DETERMINEE PAR BELIVAY
//
//  ─────────────────────────────────────────────────────────────────────────
//  LECTURE SEULE, PAR DECISION PRODUIT
//
//  Le gerant ne choisit pas : BelivaY deduit la categorie du contenu de la
//  commande. Cela evite qu'un point relais surclasse ses colis pour etre
//  mieux paye.
//
//  Le revers, qu'il faut connaitre : l'estimation ne dispose NI DU POIDS NI
//  DES DIMENSIONS. Elle deduit d'une famille de produits. Un panier de
//  quinze telephones sortira « standard » comme un telephone seul.
//
//  Quand la deduction est incertaine — categorie inconnue, filet par
//  defaut — l'ecran le DIT, et invite a signaler. C'est le seul recours
//  laisse au gerant, et il ne doit pas etre silencieux.
// =============================================================================

import { useEffect, useState } from "react";
import { Box, Info, Lock, Mail, Package, PackageX } from "lucide-react";

import { http } from "@/services/api/http";
import {
  getRelayTariff, type ParcelSize, type RelayTariffLine,
} from "@/services/api/relaySettlements";

interface Suggestion {
  parcel_size: ParcelSize;
  reason: string;
  /** Faux quand la deduction repose sur un filet plutot qu'une regle. */
  confident: boolean;
  current_parcel_size?: string;
}

const CATEGORIES: Record<ParcelSize, {
  nom: string; exemple: string; icone: (c: string) => React.ReactNode;
}> = {
  SMALL: { nom: "Petit colis", exemple: "enveloppe, accessoire",
    icone: (c) => <Mail size={22} color={c} /> },
  STANDARD: { nom: "Colis standard", exemple: "carton moyen",
    icone: (c) => <Package size={22} color={c} /> },
  LARGE: { nom: "Gros colis", exemple: "électroménager",
    icone: (c) => <Box size={22} color={c} /> },
  BULKY: { nom: "Encombrant", exemple: "mobilier, réfrigérateur",
    icone: (c) => <PackageX size={22} color={c} /> },
};

interface Props {
  /** L'expedition en cours de reception. Vide tant qu'elle n'est pas saisie. */
  shipmentId: string;
  /** Remonte la categorie determinee, pour l'envoi au serveur. */
  onResolved: (taille: ParcelSize | "") => void;
}

export default function ParcelSizeDisplay({ shipmentId, onResolved }: Props) {
  const [grille, setGrille] = useState<RelayTariffLine[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    let monte = true;
    getRelayTariff()
      .then((lignes) => { if (monte) setGrille(lignes); })
      .catch(() => { /* Sans grille, on affiche sans montant. */ });
    return () => { monte = false; };
  }, []);

  useEffect(() => {
    if (!shipmentId) {
      setSuggestion(null);
      onResolved("");
      return;
    }

    let monte = true;
    setChargement(true);

    http<Suggestion>(
      `/api/shipping/relay-point/parcel-size/?shipment_id=${shipmentId}`,
      { method: "GET" },
    )
      .then((s) => {
        if (!monte) return;
        setSuggestion(s);
        onResolved(s.parcel_size);
      })
      .catch(() => {
        if (!monte) return;
        // ─────────────────────────────────────────────────────────────
        // ON NE DEVINE PAS A LA PLACE DU SERVEUR
        //
        // Si la categorie n'a pas pu etre determinee, on remonte une
        // valeur VIDE. Le serveur gardera alors celle de l'expedition
        // plutot qu'une valeur inventee ici.
        // ─────────────────────────────────────────────────────────────
        setSuggestion(null);
        onResolved("");
      })
      .finally(() => { if (monte) setChargement(false); });

    return () => { monte = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentId]);

  if (!shipmentId) return null;

  if (chargement) {
    return (
      <div style={cadre}>
        <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
          Détermination de la catégorie…
        </p>
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div style={{ ...cadre, background: "#FFF7ED", borderColor: "#FED7AA" }}>
        <p style={{ fontSize: 13, color: "#9A3412", margin: 0, lineHeight: 1.6 }}>
          La catégorie n’a pas pu être déterminée. Le colis sera enregistré
          avec la catégorie par défaut de l’expédition.
        </p>
      </div>
    );
  }

  const cat = CATEGORIES[suggestion.parcel_size];
  const tarif = grille.find((l) => l.parcel_size === suggestion.parcel_size);
  const refuse = tarif ? !tarif.is_accepted : false;

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "baseline",
        justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>
          Catégorie du colis
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 12, color: "#64748B",
        }}>
          <Lock size={12} />
          déterminée par BelivaY
        </span>
      </div>

      <div style={{
        marginTop: 10, display: "flex", alignItems: "center", gap: 16,
        border: refuse ? "1px solid #FECACA" : "1px solid #BFDBFE",
        background: refuse ? "#FEF2F2" : "#EFF6FF",
        borderRadius: 14, padding: "16px 18px",
      }}>
        {cat.icone(refuse ? "#B91C1C" : "#1D4ED8")}

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 16, margin: 0, fontWeight: 800,
            color: refuse ? "#7F1D1D" : "#1E3A8A",
          }}>
            {cat.nom}
          </p>
          <p style={{
            fontSize: 12, margin: "3px 0 0",
            color: refuse ? "#B91C1C" : "#3B82F6",
          }}>
            {refuse
              ? "Votre contrat exclut cette catégorie."
              : `${cat.exemple} · d’après la ${suggestion.reason}`}
          </p>
        </div>

        {!refuse && tarif && (
          <div style={{ textAlign: "right" }}>
            <p style={{
              fontSize: 19, margin: 0, fontWeight: 800, color: "#1D4ED8",
            }}>
              {tarif.amount_xaf.toLocaleString("fr-FR")}
            </p>
            <p style={{ fontSize: 11, margin: "2px 0 0", color: "#64748B" }}>
              FCFA pour ce colis
            </p>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          QUAND LA DEDUCTION EST INCERTAINE, ON LE DIT

          Le gerant ne peut pas corriger. Lui cacher que la categorie repose
          sur un filet le priverait du seul recours qui lui reste : signaler.
          ───────────────────────────────────────────────────────────────── */}
      {!suggestion.confident && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 9, marginTop: 10,
          padding: "11px 14px", background: "#FFF7ED", borderRadius: 11,
        }}>
          <Info size={15} color="#C2410C" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: "#9A3412", margin: 0, lineHeight: 1.55 }}>
            Le contenu de cette commande n’a pas pu être identifié
            précisément. Si le colis vous semble d’une autre catégorie,
            signalez-le dans les observations ci-dessous.
          </p>
        </div>
      )}

      {refuse && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 9, marginTop: 10,
          padding: "11px 14px", background: "#FEF2F2", borderRadius: 11,
        }}>
          <Info size={15} color="#B91C1C" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: "#7F1D1D", margin: 0, lineHeight: 1.55 }}>
            Ce colis relève d’une catégorie que votre contrat exclut. Vous
            pouvez le réceptionner, mais il ne donnera lieu à aucune
            rémunération. Contactez BelivaY si cela vous semble anormal.
          </p>
        </div>
      )}
    </div>
  );
}

const cadre: React.CSSProperties = {
  marginTop: 10,
  border: "1px solid #E2E8F0",
  background: "#F8FAFC",
  borderRadius: 14,
  padding: "16px 18px",
};