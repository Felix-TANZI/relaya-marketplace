import { useCallback, useEffect, useState } from "react";
import { ChartColumnBig, MessageSquareHeart, ThumbsUp } from "lucide-react";
import { http } from "@/services/api/http";
import { Panel, StatusPill } from "./RelayUi";

interface RelayReview {
  id: number;
  rating: number;
  comment: string;
  author_initials: string;
  parcel_ref: string;
  thanked_at: string | null;
  created_at: string;
}

interface RelayReviewPayload {
  summary: { average: number; count: number; distribution: Record<string, number> };
  results: RelayReview[];
}

const LEVELS = [5, 4, 3, 2, 1];

/**
 * Etoiles pleines animees : le degrade defile sous le glyphe et donne
 * l'impression d'une lumiere qui traverse la rangee.
 */
function Stars({ value, size = "text-base" }: { value: number; size?: string }) {
  const filled = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-0.5 ${size} leading-none`} aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <span
          key={index}
          aria-hidden
          className={index <= filled ? "belivay-star-shimmer" : "text-slate-300 dark:text-slate-600"}
          style={index <= filled ? { animationDelay: `${index * 0.18}s` } : undefined}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function RelayReviews({ onError }: { onError: (error: unknown) => void }) {
  const [payload, setPayload] = useState<RelayReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [thanking, setThanking] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayload(await http<RelayReviewPayload>("/api/shipping/relay-point/reviews/"));
    } catch (error) {
      onError(error);
      setPayload({ summary: { average: 0, count: 0, distribution: {} }, results: [] });
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const thank = async (review: RelayReview) => {
    setThanking(review.id);
    try {
      const updated = await http<RelayReview>(`/api/shipping/relay-point/reviews/${review.id}/thank/`, { method: "POST" });
      setPayload((current) =>
        current
          ? { ...current, results: current.results.map((item) => (item.id === updated.id ? updated : item)) }
          : current,
      );
    } catch (error) {
      onError(error);
    } finally {
      setThanking(null);
    }
  };

  const summary = payload?.summary;
  const reviews = payload?.results ?? [];
  const maxCount = Math.max(1, ...LEVELS.map((level) => summary?.distribution?.[String(level)] ?? 0));

  return (
    <div className="space-y-5">
      <section className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 to-indigo-500 text-white shadow-[0_8px_18px_rgba(2,6,23,.2)] ring-1 ring-white/25">
          <MessageSquareHeart size={21} strokeWidth={2.4} />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Avis des acheteurs</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Note publique sur la marketplace · alimente votre Trust Score (Satisfaction)
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-6xl font-black tracking-tight text-amber-500">{(summary?.average ?? 0).toFixed(1)}</div>
          <div className="mt-3">
            <Stars value={summary?.average ?? 0} size="text-2xl" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {loading ? "Chargement des avis..." : `${summary?.count ?? 0} avis acheteur${(summary?.count ?? 0) > 1 ? "s" : ""}`}
          </p>
        </div>

        <Panel kicker="Satisfaction" title="Répartition" action={<ChartColumnBig className="text-blue-700 dark:text-blue-300" size={19} />}>
          <div className="space-y-2.5">
            {LEVELS.map((level) => {
              const count = summary?.distribution?.[String(level)] ?? 0;
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="flex w-8 flex-shrink-0 items-center gap-0.5 text-xs font-black text-slate-600 dark:text-slate-300">
                    {level}
                    <span className="text-amber-500">★</span>
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-700 ease-out"
                      style={{ width: `${count ? Math.max(6, (count / maxCount) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="w-6 flex-shrink-0 text-right text-xs font-bold text-slate-500 dark:text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>

      <Panel
        kicker="Retours terrain"
        title="Tous les avis"
        action={<StatusPill tone={reviews.length > 0 ? "blue" : "slate"}>{reviews.length}</StatusPill>}
      >
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5 text-sm font-semibold text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              Chargement des avis...
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
              Aucun avis acheteur pour le moment. Les notes arrivent après les premiers retraits.
            </div>
          ) : (
            reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-100 hover:bg-white dark:border-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800/70"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                      {review.author_initials.replace(/[.\s]/g, "")}
                    </div>
                    <div>
                      <div className="font-black text-slate-950 dark:text-white">{review.author_initials}</div>
                      <Stars value={review.rating} />
                    </div>
                  </div>
                  <span className="text-xs font-semibold italic text-slate-400">
                    {new Date(review.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                {review.comment ? (
                  <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{review.comment}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {review.thanked_at ? (
                    <StatusPill tone="emerald">Remercié</StatusPill>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void thank(review)}
                      disabled={thanking === review.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950 dark:text-blue-200"
                    >
                      <ThumbsUp size={14} />
                      {thanking === review.id ? "Envoi..." : "Remercier"}
                    </button>
                  )}
                  {review.parcel_ref ? <StatusPill tone="slate">{review.parcel_ref}</StatusPill> : null}
                </div>
              </article>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
