import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';
import { listMyPayments } from '@/services/api/payments';
import { useToast } from '@/context/ToastContext';
import Header from './Header';
import Footer from './Footer';
import ClientTutorial from '@/features/tutorial/ClientTutorial';
import GlobalAssistant from '@/features/assistant/GlobalAssistant';
import MobileBottomNav from '@/components/MobileBottomNav';
import BackToTop from '@/components/BackToTop';
import { isDedicatedPortal } from '@/config/portals';

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
  const { pathname } = useLocation();
  const isAuthPage = ['/login', '/register', '/forgot-password'].some((path) => pathname.startsWith(path));
  const hideChrome = isAuthPage && isDedicatedPortal;
  const isCheckout = pathname.startsWith('/checkout');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [usingOfflineCache, setUsingOfflineCache] = useState(false);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => {
      setOnline(false);
      setUsingOfflineCache(true);
    };
    const showOfflineFallback = () => setUsingOfflineCache(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('belivay-offline-fallback', showOfflineFallback);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('belivay-offline-fallback', showOfflineFallback);
    };
  }, []);

  useEffect(() => {
    let touchStart = 0;
    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY === 0) touchStart = event.touches[0]?.clientY || 0;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const touchEnd = event.changedTouches[0]?.clientY || 0;
      if (online && touchStart > 0 && touchEnd - touchStart > 90) window.location.reload();
      touchStart = 0;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [online]);

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
      <a href="#main-content" className="fixed left-3 top-3 z-[9999] -translate-y-24 rounded-lg bg-gray-950 px-4 py-3 text-sm font-bold text-white transition focus:translate-y-0">Aller au contenu principal</a>
      <ScrollToTopOnRouteChange />
      {(!online || usingOfflineCache) && <div role="status" className="fixed inset-x-0 top-0 z-[9998] bg-amber-600 px-4 py-2 text-center text-sm font-bold text-white">Mode hors ligne : les données affichées proviennent du cache et peuvent ne plus être à jour.</div>}
      {!hideChrome && !isCheckout && <Header />}
      <main id="main-content" tabIndex={-1} className={`flex-1 overflow-x-hidden ${hideChrome || isCheckout ? '' : 'pt-[132px] pb-16 lg:pb-0'}`}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      {!hideChrome && !isCheckout && <Footer />}
      {!hideChrome && !isCheckout && <GlobalAssistant />}
      {!hideChrome && !isCheckout && !isAuthPage && <ClientTutorial />}
      {!hideChrome && !isCheckout && <MobileBottomNav />}
      {!hideChrome && !isCheckout && <BackToTop />}
    </div>
  );
}
