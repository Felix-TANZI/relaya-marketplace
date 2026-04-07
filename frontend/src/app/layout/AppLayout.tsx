import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ClientTutorial from '@/features/tutorial/ClientTutorial';
import GlobalAssistant from '@/features/assistant/GlobalAssistant';
import MobileBottomNav from '@/components/MobileBottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark transition-colors">
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <GlobalAssistant />
      <ClientTutorial />
      <MobileBottomNav />
    </div>
  );
}
