import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { listMyPayments } from '@/services/api/payments';
import { useToast } from '@/context/ToastContext';
import Header from './Header';
import Footer from './Footer';
import ClientTutorial from '@/features/tutorial/ClientTutorial';
import GlobalAssistant from '@/features/assistant/GlobalAssistant';
import MobileBottomNav from '@/components/MobileBottomNav';
import BackToTop from '@/components/BackToTop';

function ScrollToTopOnRouteChange() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const scrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollTop();
    const frame = window.requestAnimationFrame(scrollTop);
    const timeout = window.setTimeout(scrollTop, 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [pathname, search]);

  return null;
}

export default function AppLayout() {
  const { showToast } = useToast();
  // `null` tant qu'aucun sondage n'a eu lieu : le premier passage sert de
  // reference et ne notifie rien, sinon toutes les transactions existantes
  // declencheraient un toast au chargement de l'app.
  const seenRef = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const txs = await listMyPayments();
        if (cancelled) return;
        const seen = seenRef.current;
        if (seen === null) {
          seenRef.current = new Map(txs.map((t) => [t.id, t.status]));
          return;
        }
        for (const tx of txs) {
          const before = seen.get(tx.id);
          if (before && before !== tx.status) {
            if (tx.status === "SUCCESS") {
              showToast("Paiement confirmé", {
                description: `Commande #${tx.order} · ${tx.amount_xaf.toLocaleString("fr-FR")} FCFA sous séquestre.`,
                type: "success",
              });
            } else if (tx.status === "FAILED" || tx.status === "CANCELLED") {
              showToast("Paiement non abouti", {
                description: `Commande #${tx.order} · aucun montant débité. Vous pouvez réessayer.`,
                type: "error",
              });
            }
            window.dispatchEvent(new Event("belivay-new-notification"));
          }
          seen.set(tx.id, tx.status);
        }
      } catch { /* silencieux */ }
    };

    poll();
    const interval = window.setInterval(poll, 20000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [showToast]);

  return (
    /* `belivay-client` : scope typographique de l'espace client.
       Voir index.css — force Plus Jakarta Sans sur tous les titres et
       neutralise Syne (font-display) pour une police unique. */
    <div className="belivay-client min-h-screen flex flex-col overflow-x-hidden bg-bg-light dark:bg-bg-dark transition-colors">
      <ScrollToTopOnRouteChange />
      <Header />
      <main className="flex-1 overflow-x-hidden pt-[132px] pb-16 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <GlobalAssistant />
      <ClientTutorial />
      <MobileBottomNav />
      <BackToTop />
    </div>
  );
}