// frontend/src/features/orders/components/DisputeProofCard.tsx
//
// Carte "photo(s) de preuve" pour l'état "en litige". N'affiche que des
// preuves réellement versées au dossier par l'API (`dispute.evidences`,
// type PHOTO) — si aucune photo n'a été transmise, l'écran le dit
// honnêtement plutôt que d'afficher un visuel fabriqué.

import { ImageOff } from "lucide-react";
import type { DisputeEvidence } from "@/services/api/customer";

function formatEvidenceDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

interface DisputeProofCardProps {
  evidences: DisputeEvidence[];
  /** Description du litige saisie par l'acheteur à l'ouverture, utilisée comme légende. */
  disputeDescription?: string | null;
}

export function DisputeProofCard({ evidences, disputeDescription }: DisputeProofCardProps) {
  const photos = evidences.filter((evidence) => evidence.evidence_type === "PHOTO" && evidence.file_url);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
      <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Photo(s) de preuve</h3>

      {photos.length === 0 ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-gray-200 p-4 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <ImageOff size={20} className="shrink-0" />
          Aucune photo versée au dossier pour le moment.
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <a
              key={photo.id}
              href={photo.file_url || "#"}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"
            >
              <img src={photo.file_url || undefined} alt={photo.description || "Preuve du litige"} className="h-28 w-full object-cover" />
              <div className="bg-gray-50 px-2 py-1.5 dark:bg-gray-900">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {formatEvidenceDate(photo.created_at)}
                </p>
                <p className="truncate text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  {photo.uploaded_by_name}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}

      {disputeDescription && (
        <p className="mt-3 text-sm italic text-gray-600 dark:text-gray-300">« {disputeDescription} »</p>
      )}
    </div>
  );
}
