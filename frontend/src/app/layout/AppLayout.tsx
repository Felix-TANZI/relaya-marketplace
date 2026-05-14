import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ClientTutorial from '@/features/tutorial/ClientTutorial';
import GlobalAssistant from '@/features/assistant/GlobalAssistant';
import MobileBottomNav from '@/components/MobileBottomNav';
import BackToTop from '@/components/BackToTop';

function ScrollToTopOnRouteChange() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-bg-light dark:bg-bg-dark transition-colors">
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
