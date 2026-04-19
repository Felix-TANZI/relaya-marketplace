import { TRUST_BANNERS } from "@/data/v29Products";

export default function TrustBannersStrip() {
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,.03)] dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <div className="h-[18px] w-[3px] rounded bg-primary" />
        <h3 className="text-[13px] font-extrabold text-gray-900 dark:text-white">🔒 Achetez en toute sécurité</h3>
      </div>
      {/* Strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {TRUST_BANNERS.map((b, i) => (
          <div
            key={i}
            className="relative h-[130px] w-[220px] flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl transition-transform hover:scale-[1.02]"
            style={{ scrollSnapAlign: "start" }}
          >
            <img src={b.img} alt={b.title} loading="lazy" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="text-sm font-extrabold text-white">{b.title}</p>
              <p className="mt-0.5 text-[11px] text-white/80">{b.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
