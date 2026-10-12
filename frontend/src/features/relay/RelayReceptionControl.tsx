/**
 * Étape 2 de la réception : le contrôle du lot.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ON COCHE EN TOUCHANT LE COLIS
 *
 * Le livreur est là, il attend, et il repartira dès la signature. Tout ce
 * qui n'a pas été vérifié À CE MOMENT ne le sera jamais : une fois le
 * transfert signé, un scellé rompu découvert deux heures plus tard est un
 * problème du gérant, pas du transporteur.
 *
 * D'où une case par colis, cochée en ayant l'objet en main — jamais un
 * « tout accepter ». C'est lent exprès : c'est le seul instant où la
 * responsabilité change de camp, et il vaut les trente secondes.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * L'EMPLACEMENT SE CALCULE, IL NE SE CHOISIT PAS
 *
 * Chaque ligne annonce son casier : la zone vient de la taille (un
 * encombrant ne monte pas sur l'étagère A), l'index est le premier libre.
 * Un gérant qui range où il veut retrouve mal, et c'est lui qui perd le
 * temps au retrait.
 */
import { useState } from "react";
import { Camera, Check, Lock, TriangleAlert, Truck, X } from "lucide-react";
import { ensureImageUnderLimit } from "@/lib/imageCompression";
import { RelaySheet, RelaySheetHeader } from "./RelayUi";
import type { RelayArrival } from "./RelayReception";
import { ZONE_SHORT, placesOf, zoneOf } from "./relayShelf";

/**
 * Les trois écarts possibles entre ce qui est annoncé et ce qui arrive.
 *
 * Ils ne se valent pas, et le sous-titre le dit : la réserve ACCEPTE le
 * colis en le signalant, le refus le RENVOIE avec le livreur, l'écart de
 * compte ne concerne pas le gérant. Confondre les trois, c'est accepter un
 * colis cassé en croyant l'avoir refusé.
 */
const ANOMALIES: Array<{ id: "reserve" | "refus" | "ecart"; icon: typeof Camera; tone: string; title: string; body: string }> = [
  {
    id: "reserve",
    icon: Camera,
    tone: "bg-[#FFF4D6] text-[#E8A10E] dark:bg-amber-950 dark:text-amber-300",
    title: "Réserve avec photo",
    body: "Angle enfoncé, étiquette abîmée : vous acceptez en le signalant",
  },
  {
    id: "refus",
    icon: X,
    tone: "bg-[#FDECEA] text-[#B42318] dark:bg-red-950 dark:text-red-300",
    title: "Refuser un colis",
    body: "Scellé cassé, mouillé, ouvert : 2 photos, il repart avec le livreur",
  },
  {
    id: "ecart",
    icon: TriangleAlert,
    tone: "bg-[#F1ECE6] text-[#9FAACB] dark:bg-slate-800 dark:text-slate-300",
    title: "Colis annoncé absent · colis en trop",
    body: "Signalez l'écart : le livreur en répond, pas vous",
  },
];

/** Chevron de ligne : fin et pâle, il indique sans attirer. */
function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] flex-shrink-0 text-slate-300 dark:text-slate-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function RelayReceptionControl({
  lot,
  checked,
  slots,
  courier,
  missionRef,
  outbound,
  busy,
  onToggle,
  onValidate,
  onRefuse,
  onCancel,
  onReserve,
  onReportGap,
}: {
  /** Les colis annoncés par ce livreur, tels qu'ils sont posés sur le comptoir. */
  lot: RelayArrival[];
  /** Identifiants d'expédition dont le scellé a été vérifié. */
  checked: number[];
  /** Casier proposé pour chaque colis, par identifiant d'expédition. */
  slots: Record<number, string>;
  courier: string;
  missionRef: string;
  /** Colis que le livreur remporte en repartant. */
  outbound: number;
  busy: boolean;
  onToggle: (shipmentId: number) => void;
  onValidate: () => void;
  onRefuse: () => void;
  onCancel: () => void;
  /** Accepter un colis en le signalant : la photo part en preuve de réception. */
  onReserve: (input: { parcelId: number; photo: File; note: string }) => Promise<boolean>;
  /** Écart de comptage : le livreur en répond, on le trace auprès du support. */
  onReportGap: (note: string) => Promise<boolean>;
}) {
  const [sheet, setSheet] = useState<"reserve" | "ecart" | null>(null);
  const places = lot.reduce((total, arrival) => total + placesOf(arrival.sizeLabel), 0);
  const avance = lot.length > 0 ? (checked.length / lot.length) * 100 : 0;
  const complet = lot.length > 0 && checked.length === lot.length;

  return (
    <div className="space-y-4">
      {/* ── Le lot validé ────────────────────────────────────────────────── */}
      <section
        className="pr-span pr-bleed -mx-4 -mt-4 px-4 pb-5 pt-4 text-white sm:-mx-6 sm:-mt-6 sm:px-6"
        style={{
          backgroundImage:
            "radial-gradient(75% 110% at 99% -6%, rgba(239,106,0,.42) 0%, rgba(239,106,0,.14) 40%, rgba(239,106,0,0) 68%),"
            + " linear-gradient(132deg, #0B1734 0%, #12254C 46%, #1B3570 100%)",
        }}
      >
        <ol className="flex items-center justify-between gap-2">
          {["Code", "Contrôler", "Valider"].map((label, index) => (
            <li key={label} className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11.5px] font-black ${
                  index <= 1 ? "bg-[#E8A10E] text-[#1A2A52]" : "bg-[#1A2A52] text-[#9FAACB]"
                }`}
              >
                {index + 1}
              </span>
              <span className={`truncate text-[13px] font-black ${index <= 1 ? "text-white" : "text-[#C3CCE0]"}`}>
                {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex items-start gap-4">
          <span className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-[14px] bg-white/10 text-[#E8A10E]">
            <Truck size={24} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-black uppercase leading-none tracking-[0.09em] text-[#52D69A]">
              Code de dépôt validé
            </p>
            <div className="mt-2 text-[21px] font-black leading-tight">
              {missionRef} · {lot.length} colis · {places} places
            </div>
            <p className="mt-1 truncate text-[13px] font-medium text-white/70">
              {[courier || "Livreur à assigner", outbound > 0 ? `repart avec ${outbound} colis` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </section>

      <header>
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Contrôlez chaque colis
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          Scannez l'étiquette de chaque colis, puis touchez-le si son scellé est intact (le film, pour
          un encombrant). L'emplacement dépend de la taille.
        </p>
      </header>

      {/* ── Le lot ───────────────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">Le lot</h3>
          <span className="text-[14.5px] font-black text-[#2456D6] dark:text-blue-400">
            {checked.length} / {lot.length} contrôlés
          </span>
        </div>

        <div className="mt-3 h-[7px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2456D6] to-[#EF6A00] transition-[width] duration-300"
            style={{ width: `${avance}%` }}
          />
        </div>

        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {lot.map((arrival) => {
            const on = checked.includes(arrival.shipmentId);
            return (
              <li key={arrival.shipmentId}>
                <button
                  type="button"
                  onClick={() => onToggle(arrival.shipmentId)}
                  aria-pressed={on}
                  className="flex w-full items-center gap-3 py-4 text-left transition active:scale-[.99]"
                >
                  <span
                    className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[12px] border-2 transition ${
                      on
                        ? "border-[#BFE3CF] bg-[#E6F4EC] text-[#1F7A4D]"
                        : "border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                    }`}
                  >
                    {on ? <Check size={19} strokeWidth={3} /> : null}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                      {arrival.internalRef}
                    </span>
                    <span className="mt-1 block truncate text-[13px] font-medium text-slate-500 dark:text-slate-400">
                      {[ZONE_SHORT[zoneOf(arrival.sizeLabel)], on ? "scellé intact" : "scellé à vérifier"]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>

                  <span className="flex-shrink-0 text-right">
                    <span className="block text-[10.5px] font-black uppercase leading-none tracking-[0.08em] text-slate-400 dark:text-slate-500">
                      Ranger en
                    </span>
                    <span className="mt-1 block font-mono text-[15px] font-black text-[#2456D6] dark:text-blue-400">
                      {slots[arrival.shipmentId] || "—"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

      </section>

      {/* ── Les anomalies ────────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-2 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Anomalies du lot
        </h3>
        <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
          {ANOMALIES.map(({ id, icon: Icon, tone, title, body }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => (id === "refus" ? onRefuse() : setSheet(id))}
                className="flex w-full items-start gap-3 py-3.5 text-left transition active:scale-[.99]"
              >
                <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] ${tone}`}>
                  <Icon size={19} strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                    {title}
                  </span>
                  <span className="mt-1 block text-[13px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
                    {body}
                  </span>
                </span>
                <span className="mt-1.5">
                  <Chevron />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Sortir, ou s'engager ─────────────────────────────────────────── */}
      <div className="flex items-stretch gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="w-[34%] flex-shrink-0 rounded-[12px] border border-slate-200 bg-white px-3 py-4 text-[16px] font-bold text-slate-700 transition active:scale-[.97] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          Retour
        </button>
        <button
          type="button"
          disabled={!complet || busy}
          onClick={onValidate}
          className="pr-btn flex flex-1 items-center justify-center gap-2.5 rounded-[12px] px-4 py-4 text-[17px] font-black text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
        >
          <Check size={19} strokeWidth={3} /> Valider le lot
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-[14px] bg-[#EAF0FF] px-4 py-3.5 dark:bg-blue-950/40">
        <Lock size={18} strokeWidth={2.2} className="mt-0.5 flex-shrink-0 text-[#8FB0FF] dark:text-blue-300" />
        <p className="text-[13.5px] font-medium leading-[1.55] text-[#9FAACB] dark:text-blue-100/80">
          Vous ne voyez jamais le vendeur ni le client : uniquement la référence BelivaY, la taille et
          l'emplacement.
        </p>
      </div>

      {sheet === "reserve" ? (
        <ReserveSheet lot={lot} busy={busy} onCancel={() => setSheet(null)} onConfirm={onReserve} />
      ) : null}

      {sheet === "ecart" ? (
        <GapSheet busy={busy} onCancel={() => setSheet(null)} onConfirm={onReportGap} />
      ) : null}
    </div>
  );
}

/** Accepter en signalant : une photo, une phrase, et le colis entre quand même. */
function ReserveSheet({
  lot,
  busy,
  onCancel,
  onConfirm,
}: {
  lot: RelayArrival[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: (input: { parcelId: number; photo: File; note: string }) => Promise<boolean>;
}) {
  const [parcelId, setParcelId] = useState(lot[0]?.id ?? 0);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [note, setNote] = useState("");

  const addPhoto = async (file: File | null) => {
    if (!file) return;
    const optimized = await ensureImageUnderLimit(file).catch(() => null);
    if (!optimized) return;
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ file: optimized, url: URL.createObjectURL(optimized) });
  };

  return (
    <RelaySheet label="Réserve avec photo" onClose={onCancel} size="sm">
      <RelaySheetHeader
        icon={Camera}
        tone="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
        title="Réserve avec photo"
        subtitle="Le colis entre en stock, mais l'état constaté est daté et attaché à l'expédition."
        onClose={onCancel}
      />

      {lot.length > 1 ? (
        <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Colis concerné
          <select
            value={parcelId}
            onChange={(event) => setParcelId(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {lot.map((arrival) => (
              <option key={arrival.id} value={arrival.id}>
                {arrival.internalRef} · {arrival.sizeLabel}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Ce que vous constatez
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Ex : angle enfoncé, carton intact par ailleurs."
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </label>

      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-dashed border-slate-300 bg-white px-4 py-3.5 text-sm font-black text-slate-600 transition active:scale-[.98] dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200">
        <Camera size={17} /> {photo ? "Photo prête — reprendre" : "Photo de la réserve (obligatoire)"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => void addPhoto(event.target.files?.[0] || null)}
        />
      </label>
      {photo ? <img src={photo.url} alt="" className="mt-3 h-32 w-full rounded-2xl object-cover" /> : null}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-[14px] border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!photo || note.trim().length < 5 || busy}
          onClick={() =>
            photo && void onConfirm({ parcelId, photo: photo.file, note: note.trim() }).then((ok) => ok && onCancel())
          }
          className="pr-btn rounded-2xl px-5 py-2.5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
        >
          {busy ? "Envoi..." : "Enregistrer la réserve"}
        </button>
      </div>
    </RelaySheet>
  );
}

/** Écart de comptage : ce n'est pas au gérant d'en répondre, mais de le dire. */
function GapSheet({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState("");

  return (
    <RelaySheet label="Écart de comptage" onClose={onCancel} size="sm">
      <RelaySheetHeader
        icon={TriangleAlert}
        tone="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
        title="Colis annoncé absent · colis en trop"
        subtitle="Signalez l'écart maintenant, livreur présent. C'est lui qui en répond."
        onClose={onCancel}
      />

      <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Ce que vous comptez
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Ex : 6 colis annoncés, 5 posés sur le comptoir. BV-40305 manquant."
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </label>

      <p className="mt-3 text-[13px] font-medium leading-[1.5] text-slate-500 dark:text-slate-400">
        Ne cochez que les colis réellement devant vous. Un colis coché puis jamais rangé devient le
        vôtre au premier inventaire.
      </p>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-[14px] border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={note.trim().length < 5 || busy}
          onClick={() => void onConfirm(note.trim()).then((ok) => ok && onCancel())}
          className="rounded-2xl bg-[#2456D6] px-5 py-2.5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busy ? "Envoi..." : "Signaler l'écart"}
        </button>
      </div>
    </RelaySheet>
  );
}
