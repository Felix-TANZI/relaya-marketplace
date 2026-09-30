// frontend/src/features/vendors/v2/accueil/AccueilPage.tsx
// Écran "Accueil" — VD-04 / VD-D05. Choisit la bonne variante selon l'état
// renvoyé par useAccueilData() : "ce qu'il y a à faire" (todo), "rien à
// faire" (empty), "premier jour" (first_day), "hors connexion" (offline),
// "compte suspendu" (suspended). Aucun graphique ni tuile de chiffres
// au-dessus du travail (ACC-01/A01/A02) : les chiffres n'apparaissent que
// quand la file est vide (ACC-10).
//
// Route recommandée : /seller/v2/accueil, montée dans <SellerLayout> comme
// MenuPage.tsx (le header en verre + le dock de navigation sont déjà rendus
// par le layout parent — cette page ne fournit que le corps).

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, MessageCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import { useAccueilData } from './useAccueilData';
import type { TodoItem } from './types';
import ShopStatusBar from './ShopStatusBar';
import HeroCard from './HeroCard';
import TodoRowCard from './TodoRowCard';
import LowStockRow from './LowStockRow';
import LaunchTierCard from './LaunchTierCard';
import GesturesCard from './GesturesCard';
import EarningsCard from './EarningsCard';
import DiscoveryOfferCard from './DiscoveryOfferCard';
import SuspendedCard from './SuspendedCard';
import OfflineBanner from './OfflineBanner';

const SUPPORT_WHATSAPP_URL = 'https://wa.me/237689002812';

/** "Besoin d'aide ?" (Premier jour) : saisie assistée + support WhatsApp (A16). */
function HelpBlock() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
      <p className="font-bold px-4 pt-3.5 pb-2" style={{ fontSize: 13, color: p.text }}>
        {t('sl6_accueil.help_title')}
      </p>
      <button
        type="button"
        onClick={() => navigate('/seller/v2/saisie-assistee')}
        className="w-full flex items-center gap-2.5 text-left px-4"
        style={{ minHeight: 44, borderTop: `1px solid ${p.border}` }}
      >
        <HelpCircle size={16} color={p.textMuted} />
        <span className="font-semibold" style={{ fontSize: 13, color: p.text }}>{t('sl6_accueil.help_assisted_entry')}</span>
      </button>
      <a
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        className="w-full flex items-center gap-2.5 px-4"
        style={{ minHeight: 44, borderTop: `1px solid ${p.border}` }}
      >
        <MessageCircle size={16} color={p.textMuted} />
        <span className="font-semibold" style={{ fontSize: 13, color: p.text }}>{t('sl6_accueil.help_whatsapp')}</span>
      </a>
    </div>
  );
}

export default function AccueilPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const state = useAccueilData();

  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleReady = useCallback(async (orderId: number) => {
    setBusyOrderId(orderId);
    setActionError(null);
    try {
      await state.markReady(orderId);
    } catch {
      // Message repris tel quel du dossier de synthèse (§2.5) : couvre aussi
      // bien l'échec réseau hors connexion que l'échec serveur.
      setActionError(t('sl6_accueil.action_error'));
    } finally {
      setBusyOrderId(null);
    }
  }, [state, t]);

  const goToOrder = useCallback((orderId: number) => navigate(`/seller/orders/${orderId}`), [navigate]);
  const goToDisputes = useCallback(() => navigate('/seller/disputes'), [navigate]);
  const goToTier = useCallback(() => navigate('/seller/certifications'), [navigate]);

  // ── États de chargement / erreur ──────────────────────────────────────────

  if (state.loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
        <RefreshCw size={20} color={p.textMuted} className="animate-spin" />
        <span className="ml-2" style={{ fontSize: 13, color: p.textMuted }}>{t('sl6_accueil.loading')}</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="rounded-2xl p-5 text-center mt-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-2" style={{ fontSize: 14, color: p.text }}>{t('sl6_accueil.error_title')}</p>
        <p className="mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>{state.error}</p>
        <button
          type="button"
          onClick={() => state.reload()}
          className="rounded-xl font-bold px-5"
          style={{ minHeight: 44, background: p.orange, color: '#fff', fontSize: 13 }}
        >
          {t('sl6_accueil.error_retry')}
        </button>
      </div>
    );
  }

  // ── Compte suspendu (SUS-01 à 03) : remplace tout l'accueil (A18) ─────────

  if (state.variant === 'suspended') {
    return <SuspendedCard shopName={state.shopName} />;
  }

  // ── Sélection de la carte héros (une seule, ACC-03) parmi les "à préparer" ─

  const heroItem: TodoItem | null = state.todos.find((it) => it.kind === 'prepare') ?? null;
  const restItems = state.todos.filter((it) => it !== heroItem);

  return (
    <div className="pb-24 pt-2">
      {state.variant === 'offline' ? (
        <OfflineBanner lastLoadedAt={state.lastLoadedAt} onRetry={() => state.reload()} />
      ) : null}

      <ShopStatusBar />

      {state.isPrepAccess ? (
        <p className="mb-4" style={{ fontSize: 11.5, color: p.textMuted }}>
          {t('sl6_accueil.prep_access_note')}
        </p>
      ) : null}

      {actionError ? (
        <div className="rounded-xl px-3.5 py-2.5 mb-4" style={{ background: theme === 'dark' ? 'rgba(255,138,128,0.1)' : '#FEF2F2', border: `1px solid ${p.red}` }}>
          <p style={{ fontSize: 12, color: p.red }}>{actionError}</p>
        </div>
      ) : null}

      {state.variant === 'first_day' ? (
        <>
          <p className="font-black mb-4" style={{ fontSize: 18, color: p.text }}>
            {t('sl6_accueil.welcome_title', { shop: state.shopName })}
          </p>
          <GesturesCard gestures={state.gestures} />
          {state.launchTier ? <LaunchTierCard tier={state.launchTier} /> : null}
          <DiscoveryOfferCard />
          <HelpBlock />
        </>
      ) : state.variant === 'empty' ? (
        <>
          <p className="font-black mb-4" style={{ fontSize: 18, color: p.text }}>
            {t('sl6_accueil.empty_title')}
          </p>
          <EarningsCard
            lifetimeEarnedXaf={state.lifetimeEarnedXaf}
            releasingXaf={state.releasingXaf}
            nextPayoutLabel={state.nextPayoutLabel}
            nextPayoutAmountXaf={state.nextPayoutAmountXaf}
            totalOrdersCount={state.totalOrdersCount}
            onSeeTier={goToTier}
          />
          <p className="mb-1.5" style={{ fontSize: 12, color: p.textMuted }}>
            {t('sl6_accueil.empty_cta_intro')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/seller/products/new')}
            className="w-full rounded-2xl font-bold text-white"
            style={{ minHeight: 44, background: p.orange, fontSize: 14.5 }}
          >
            {t('sl6_accueil.empty_cta_action')}
          </button>
        </>
      ) : restItems.length === 0 && heroItem === null && state.variant === 'offline' ? (
        <p className="text-center mt-6" style={{ fontSize: 12.5, color: p.textMuted }}>
          {t('sl6_accueil.offline_empty')}
        </p>
      ) : (
        <>
          <p className="font-black mb-4" style={{ fontSize: 18, color: p.text }}>
            {t('sl6_accueil.todo_title', { count: state.todos.length })}
          </p>
          {heroItem ? (
            <HeroCard
              item={heroItem}
              onReady={handleReady}
              onStockout={goToOrder}
              onExtend={goToOrder}
              onDetail={goToOrder}
              busy={busyOrderId === heroItem.orderId}
              hideAmount={state.isPrepAccess}
            />
          ) : null}
          {restItems.map((item) => (
            <TodoRowCard
              key={item.id}
              item={item}
              onReady={handleReady}
              onRespondDispute={goToDisputes}
              busy={busyOrderId === item.orderId}
              hideAmount={state.isPrepAccess}
            />
          ))}
        </>
      )}

      <LowStockRow count={state.lowStockCount} />
    </div>
  );
}
