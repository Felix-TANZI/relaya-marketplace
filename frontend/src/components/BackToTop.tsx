import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 220);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-20 right-[4.9rem] z-[79] flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f3d7c3] bg-white text-[#c85e14] shadow-[0_18px_38px_rgba(15,23,42,.14)] transition-all hover:-translate-y-1 hover:border-primary hover:bg-[#fff4eb] dark:border-gray-700 dark:bg-gray-900 dark:text-primary lg:bottom-7 lg:right-[5.2rem]"
      aria-label="Retour en haut"
    >
      <ArrowUp size={20} />
    </button>
  );
}
