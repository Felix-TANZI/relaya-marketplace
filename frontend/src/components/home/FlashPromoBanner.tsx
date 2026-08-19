import { useEffect, useState } from "react";
import { Clock, Flame } from "lucide-react";
import SectionBanner from "./SectionBanner";

interface FlashPromoBannerProps {
  /** Nombre d'articles actuellement en promotion. */
  count: number;
  /** Remise maximale du lot, en pourcentage. */
  maxDiscount: number;
  /** Fins de promotion connues, en millisecondes, triées croissant. */
  endDates: number[];
}

const PLACEHOLDER = "--:--:--";

function endOfToday() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

function formatRemaining(targetTime: number) {
  const totalSeconds = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, "0")).join(":");
}

export default function FlashPromoBanner({ count, maxDiscount, endDates }: FlashPromoBannerProps) {
  const [remaining, setRemaining] = useState(PLACEHOLDER);

  /*
   * L'horloge n'est lue que dans l'effet : la calculer pendant le rendu rendrait le
   * composant impur, avec un résultat qui change à chaque re-rendu fortuit. C'est
   * aussi ici qu'on choisit l'échéance — la première fin de promo encore à venir,
   * ou la fin de journée si aucune date n'est renseignée.
   */
  useEffect(() => {
    const now = Date.now();
    const target = endDates.find((date) => date > now) ?? endOfToday();

    const tick = () => setRemaining(formatRemaining(target));
    const firstTick = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(timer);
    };
  }, [endDates]);

  if (count === 0) return null;

  return (
    <SectionBanner
      to="/promotions"
      ariaLabel={`${count} promotions jusqu'à -${maxDiscount}%, voir la page promotions`}
      title={`${count} promo${count > 1 ? "s" : ""} jusqu'à −${maxDiscount}%`}
      subtitle={
        <span className="flex items-center gap-1.5 text-amber-100">
          <Clock size={12} />
          Fin dans <span className="tabular-nums tracking-wide">{remaining}</span>
        </span>
      }
      icon={Flame}
      iconAnimation="animate-flame-flicker"
      iconClassName="text-amber-200 drop-shadow-[0_0_6px_rgba(253,224,71,.75)]"
      gradient="linear-gradient(102deg,#EA580C 0%,#DC2626 32%,#E1400F 58%,#F97316 82%,#FB923C 100%)"
      shadow="0 12px 32px rgba(220,38,38,.22)"
      watermark={["PROMO", "FLASH", "BELIVAY", "DEAL", "SOLDES", "BON PLAN"]}
    />
  );
}
