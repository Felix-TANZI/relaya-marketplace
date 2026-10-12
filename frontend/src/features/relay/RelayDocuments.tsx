/**
 * Documents — le dossier qui autorise à recevoir et à être payé.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA BANNIÈRE D'ABORD, PARCE QU'ELLE DÉCIDE DE TOUT
 *
 * Un dossier incomplet ne suspend pas « une fonctionnalité » : il arrête les
 * colis et les versements. C'est donc la seule chose à lire en haut, et elle
 * est verte ou elle ne l'est pas — pas de nuance intermédiaire qui laisserait
 * croire qu'on peut travailler à moitié.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SIX PIÈCES, CINQ OBLIGATOIRES
 *
 * Les cinq premières conditionnent l'ouverture. La NIU / patente est
 * facultative et le dit : l'exiger de tous ferait renoncer des commerçants
 * qui n'en ont pas, et qui peuvent pourtant tenir un relais.
 *
 * Le vocabulaire des types (`MANAGER_ID`, `ACTIVITY_RECORD`…) est celui que
 * le portail envoie déjà à `/auth/compliance-documents/` : `document_type`
 * est un texte libre côté serveur, c'est donc au portail de rester constant.
 */
import { useRef } from "react";
import { Camera, FileText, IdCard, MapPin, ShieldCheck, Smartphone, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ComplianceDocument {
  id: number;
  document_type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  file_url: string | null;
  updated_at?: string;
}

interface Piece {
  type: string;
  icon: LucideIcon;
  titre: string;
  detail: string;
  /** Libellé du bouton quand la pièce est déjà au dossier. */
  actionRemplie: string;
  /** Libellé quand elle manque. */
  actionVide: string;
  /** Pluriel féminin pour la pastille (« Vérifiées »). */
  accord: "" | "e" | "es";
  obligatoire: boolean;
}

const PIECES: Piece[] = [
  {
    type: "MANAGER_ID",
    icon: IdCard,
    titre: "Pièce d'identité",
    detail: "CNI ou passeport du gérant",
    actionRemplie: "Voir",
    actionVide: "Envoyer",
    accord: "e",
    obligatoire: true,
  },
  {
    type: "ACTIVITY_RECORD",
    icon: Store,
    titre: "Preuve d'activité",
    detail: "Attestation de commerce",
    actionRemplie: "Voir",
    actionVide: "Envoyer",
    accord: "e",
    obligatoire: true,
  },
  {
    type: "PAYOUT_ACCOUNT",
    icon: Smartphone,
    titre: "Numéro de versement",
    detail: "Compte Mobile Money, confirmé par code",
    actionRemplie: "Changer",
    actionVide: "Configurer",
    accord: "",
    obligatoire: true,
  },
  {
    type: "PREMISES_PHOTOS",
    icon: Camera,
    titre: "Photos du relais",
    detail: "Votre portrait et la façade (vus par les clients), rangement",
    actionRemplie: "Mettre à jour",
    actionVide: "Envoyer",
    accord: "es",
    obligatoire: true,
  },
  {
    type: "FIELD_VALIDATION",
    icon: MapPin,
    titre: "Visite BelivaY",
    detail: "Contrôle sur place avant ouverture",
    actionRemplie: "Voir",
    actionVide: "Planifier",
    accord: "e",
    obligatoire: true,
  },
  {
    type: "TAX_ID",
    icon: FileText,
    titre: "NIU / patente",
    detail: "À ajouter si vous en avez un",
    actionRemplie: "Voir",
    actionVide: "Ajouter",
    accord: "",
    obligatoire: false,
  },
];

const JOUR_LONG = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function RelayDocuments({
  documents,
  kycApproved,
  busy,
  onUpload,
  onOpenPayoutNumber,
}: {
  documents: ComplianceDocument[];
  /** Le dossier est-il validé dans son ensemble ? */
  kycApproved: boolean;
  busy: boolean;
  onUpload: (documentType: string, file?: File) => void;
  /** Le numéro de versement ne s'envoie pas : il se vérifie par code SMS. */
  onOpenPayoutNumber: () => void;
}) {
  const champs = useRef<Record<string, HTMLInputElement | null>>({});

  const trouver = (type: string) => documents.find((document) => document.document_type === type) ?? null;

  const manquantes = PIECES.filter((piece) => piece.obligatoire && !trouver(piece.type)).length;
  const complet = kycApproved && manquantes === 0;

  /**
   * « Vérifié le … » — la dernière pièce validée, pas une date de dossier.
   *
   * `RelayPointProfile` ne porte aucune date de validation KYC. Plutôt que
   * d'en inventer une, on prend la plus récente parmi les pièces validées :
   * c'est le moment où le dossier a effectivement fini d'être examiné.
   */
  const dateVerif = (() => {
    const dates = documents
      .filter((document) => document.status === "APPROVED" && document.updated_at)
      .map((document) => new Date(document.updated_at as string))
      .filter((date) => !Number.isNaN(date.getTime()));
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map((date) => date.getTime())));
  })();

  return (
    <div className="space-y-4">
      {/* ── L'état du dossier ──────────────────────────────────────────── */}
      <section
        className={`flex items-start gap-3 rounded-[14px] border px-4 py-4 ${
          complet
            ? "border-[#BFE3CF] bg-[#E6F4EC] dark:border-emerald-800 dark:bg-emerald-950/30"
            : "border-[#F0DA9C] bg-[#FFF4D6] dark:border-amber-800 dark:bg-amber-950/30"
        }`}
      >
        <span
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] text-white ${
            complet ? "bg-[#1F7A4D]" : "bg-[#8A5A00]"
          }`}
        >
          <ShieldCheck size={22} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={`text-[17px] font-black leading-tight ${
              complet ? "text-[#155C39] dark:text-emerald-200" : "text-[#8A5A00] dark:text-amber-200"
            }`}
          >
            {complet ? "Dossier complet" : "Dossier à compléter"}
          </div>
          <p
            className={`mt-1 text-[13.5px] font-medium leading-snug ${
              complet ? "text-[#1F7A4D] dark:text-emerald-300/85" : "text-[#8A5A00] dark:text-amber-300/85"
            }`}
          >
            {complet ? (
              <>
                {dateVerif ? `Vérifié le ${JOUR_LONG.format(dateVerif)} · ` : ""}
                vous pouvez recevoir et être payé
              </>
            ) : (
              <>
                {manquantes > 0
                  ? `Il manque ${manquantes} pièce${manquantes > 1 ? "s" : ""} · `
                  : "Vérification en cours · "}
                les colis et les versements restent suspendus
              </>
            )}
          </p>
        </div>
      </section>

      {/* ── Les pièces ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {PIECES.map((piece) => {
          const document = trouver(piece.type);
          const valide = document?.status === "APPROVED";
          const refuse = document?.status === "REJECTED";
          const Icon = piece.icon;

          // Le numero de versement ne s'envoie pas comme un fichier : il se
          // verifie par deux codes SMS. Le bouton mene donc au parcours
          // dedie, pas au selecteur de fichiers.
          const estVersement = piece.type === "PAYOUT_ACCOUNT";

          const pastille = refuse
            ? { texte: "À refaire", classe: "border-[#F4C3BE] bg-[#FDECEA] text-[#B42318]" }
            : valide
              ? { texte: `Vérifié${piece.accord}`, classe: "border-[#BFE3CF] bg-[#E6F4EC] text-[#1F7A4D]" }
              : document
                ? { texte: "En revue", classe: "border-[#F0DA9C] bg-[#FFF4D6] text-[#8A5A00]" }
                : piece.obligatoire
                  ? { texte: "À envoyer", classe: "border-slate-200 bg-slate-50 text-slate-500" }
                  : { texte: "Facultatif", classe: "border-slate-200 bg-white text-slate-500" };

          return (
            <section
              key={piece.type}
              className="flex flex-col rounded-[14px] border border-slate-200 bg-white px-4 pb-4 pt-3.5 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[#FFF1E2] text-[#EF6A00] dark:bg-orange-950/50 dark:text-orange-300">
                  <Icon size={19} strokeWidth={2.2} />
                </span>
                <span
                  className={`flex-shrink-0 rounded-full border px-2.5 py-[4px] text-[11.5px] font-semibold ${pastille.classe} dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300`}
                >
                  {pastille.texte}
                </span>
              </div>

              <h3 className="mt-3 text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                {piece.titre}
              </h3>
              <p className="mt-1.5 flex-1 text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                {refuse && document?.file_url ? "Refusée — renvoyez une photo lisible" : piece.detail}
              </p>

              {estVersement ? null : (
                <input
                  ref={(element) => {
                    champs.current[piece.type] = element;
                  }}
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(event) => onUpload(piece.type, event.target.files?.[0])}
                />
              )}

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  estVersement ? onOpenPayoutNumber() : champs.current[piece.type]?.click()
                }
                className="mt-3 w-full rounded-[11px] border border-slate-200 bg-white px-3 py-2.5 text-[14px] font-bold text-slate-700 transition active:scale-[.97] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {document ? piece.actionRemplie : piece.actionVide}
              </button>
            </section>
          );
        })}
      </div>

      {/*
        Ce que le portail promet sur les pieces.

        ATTENTION : « 180 jours » vient de la maquette, pas des reglages. La
        retention reelle est lue de `PlatformSettings` — 8 jours pour les
        preuves de colis, 60 pour celles d'un litige (voir l'ecran
        Historique, qui les affiche). Ces pieces-ci, elles, ne sont pas
        purgees : `ComplianceDocument` n'a aucune regle de suppression.
      */}
      <p className="px-1 pb-1 text-center text-[12.5px] font-medium leading-[1.55] text-slate-400 dark:text-slate-500">
        Une pièce qui expire vous est signalée 30 jours avant. Vos pièces ne sont jamais montrées :
        les clients voient seulement votre prénom, votre portrait et la façade. Vous pouvez les
        consulter, les corriger et demander leur export à tout moment.
      </p>
    </div>
  );
}
