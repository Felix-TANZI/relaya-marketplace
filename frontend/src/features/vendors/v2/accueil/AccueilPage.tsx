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
import { HelpCircle, MessageCircle, RefreshCw, Wifi } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import { useAccueilData } from './useAccueilData';
import { formatTodayLabel } from './format';
import type { TodoItem } from './types';
import ShopStatusBar from './ShopStatusBar';
import HeroCard from './HeroCard';
import TodoRowCard from './TodoRowCard';
import LowStockRow from './LowStockRow';
import LaunchTierCard from './LaunchTierCard';
import GesturesCard from './GesturesCard';
import EarningsCard from './EarningsCard';
import DiscoveryOfferCard from './DiscoveryOfferCard';
import ScoreApproachingCard from './ScoreApproachingCard';
import SuspendedCard from './SuspendedCard';
import OfflineBanner, { HandoverSyncCard, OfflineSyncInfoBanner } from './OfflineBanner';
import ShopIdentityBar from '../ShopIdentityBar';

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

/** Pastilles catégorisées sous "N choses à faire" ("2 à préparer · 2 litiges · 1 retour", ACC-01) —
 * affichées seulement quand la file mélange plusieurs types, sinon le titre suffit. */
function TodoCategoryPills({ prepareCount, disputeCount, returnCount, p }: {
  prepareCount: number;
  disputeCount: number;
  returnCount: number;
  p: ReturnType<typeof palette>;
}) {
  const { t } = useTranslation();
  const pill = (label: string, color: string) => (
    <span
      key={label}
      className="font-bold rounded-full px-2.5 py-1 flex-shrink-0"
      style={{ fontSize: 11.5, color, background: `${color}1F` }}
    >
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {prepareCount > 0 ? pill(t('sl6_accueil.todo_pill_prepare', { count: prepareCount }), p.orange) : null}
      {disputeCount > 0 ? pill(t('sl6_accueil.todo_pill_dispute', { count: disputeCount }), p.red) : null}
      {returnCount > 0 ? pill(t('sl6_accueil.todo_pill_return', { count: returnCount }), p.amber) : null}
    </div>
  );
}

export default function AccueilPage() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const locale = i18n.language.startsWith('en') ? 'en' : 'fr';
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
  // Ouvre la vraie fiche du litige (VD-07) : réponse si le vendeur n'a pas
  // encore répondu, décision si le dossier est déjà en médiation.
  const goToDispute = useCallback((item: TodoItem) => {
    if (!item.disputeId) return;
    navigate(item.disputeReplied ? `/seller/v2/litiges/${item.disputeId}/decision` : `/seller/v2/litiges/${item.disputeId}`);
  }, [navigate]);
  const goToReturn = useCallback((item: TodoItem) => {
    if (!item.returnId) return;
    navigate(`/seller/v2/retours/${item.returnId}`);
  }, [navigate]);
  const goToTier = useCallback(() => navigate('/seller/v2/palier'), [navigate]);
  // "Code de remise" (mode hors connexion, mockup HorsLigne.html) : ouvre le
  // vrai écran de remise (commandes/HandoverPage.tsx), qui lit
  // shipment.pickup_confirmation_code déjà en cache local (REM-05) — aucun
  // réseau requis pour l'afficher, contrairement à "C'est prêt".
  const goToHandover = useCallback((orderId: number) => navigate(`/seller/v2/commandes/${orderId}/remise`), [navigate]);

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

  // Pastilles catégorisées (ACC-01) : seulement quand la file mélange plusieurs types.
  const prepareCount = state.todos.filter((it) => it.kind === 'prepare').length;
  const disputeCount = state.todos.filter((it) => it.kind === 'dispute').length;
  const returnCount = state.todos.filter((it) => it.kind === 'return').length;
  const showCategoryPills = [prepareCount, disputeCount, returnCount].filter((c) => c > 0).length > 1;
  const isOffline = state.variant === 'offline';

  return (
    <div className="pb-24 pt-2">
      {isOffline ? (
        <>
          <OfflineBanner lastLoadedAt={state.lastLoadedAt} onRetry={() => state.reload()} />
          <OfflineSyncInfoBanner />
        </>
      ) : null}

      <ShopIdentityBar isPrepAccess={state.isPrepAccess} staffFirstName={state.staffFirstName} />

      {state.variant === 'todo' || state.variant === 'empty' ? (
        <p className="font-black uppercase mb-3" style={{ fontSize: 11, letterSpacing: '.06em', color: p.textMuted }}>
          {state.isPrepAccess
            ? (state.staffFirstName
                ? t('sl6_accueil.greeting_prep', { name: state.staffFirstName })
                : t('sl6_accueil.prep_role_label'))
            : t('sl6_accueil.greeting', { name: state.firstName, date: formatTodayLabel(locale) })}
        </p>
      ) : null}

      <ShopStatusBar prepareCount={prepareCount} />

      {actionError ? (
        <div className="rounded-xl px-3.5 py-2.5 mb-4" style={{ background: theme === 'dark' ? 'rgba(255,138,128,0.1)' : '#FEF2F2', border: `1px solid ${p.red}` }}>
          <p style={{ fontSize: 12, color: p.red }}>{actionError}</p>
        </div>
      ) : null}

      {state.variant === 'first_day' ? (
        <>
          <p className="font-black mb-4" style={{ fontSize: 18, color: p.text }}>
            {t('sl6_accueil.welcome_title', { name: state.firstName })}
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
            onClick={() => navigate('/seller/v2/produits/nouveau')}
            className="w-full rounded-2xl font-bold text-white"
            style={{ minHeight: 44, background: p.orange, fontSize: 14.5 }}
          >
            {t('sl6_accueil.empty_cta_action')}
          </button>
        </>
      ) : restItems.length === 0 && heroItem === null && isOffline ? (
        <p className="text-center mt-6 mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>
          {t('sl6_accueil.offline_empty')}
        </p>
      ) : (
        <>
          <p className={showCategoryPills ? 'font-black mb-1' : 'font-black mb-4'} style={{ fontSize: 18, color: p.text }}>
            {t('sl6_accueil.todo_title', { count: state.todos.length })}
          </p>
          {showCategoryPills ? (
            <TodoCategoryPills prepareCount={prepareCount} disputeCount={disputeCount} returnCount={returnCount} p={p} />
          ) : null}
          {heroItem ? (
            <HeroCard
              item={heroItem}
              onReady={handleReady}
              onStockout={goToOrder}
              onExtend={goToOrder}
              onDetail={goToOrder}
              busy={busyOrderId === heroItem.orderId}
              hideAmount={state.isPrepAccess || isOffline}
              onHandoverCode={isOffline ? goToHandover : undefined}
            />
          ) : null}
          {restItems.map((item) => (
            <TodoRowCard
              key={item.id}
              item={item}
              onReady={handleReady}
              onRespondDispute={goToDispute}
              onViewReturn={goToReturn}
              busy={busyOrderId === item.orderId}
              hideAmount={state.isPrepAccess || isOffline}
              onHandoverCode={isOffline ? goToHandover : undefined}
            />
          ))}
        </>
      )}

      {isOffline ? <HandoverSyncCard onRetry={() => state.reload()} /> : null}

      {/* État "Accueil_alerte" : insérée entre la file "à faire" et le stock bas (pas un
         AccueilVariant séparé — la carte se montre d'elle-même selon le score, ACC-écart). */}
      {state.variant === 'todo' ? (
        <ScoreApproachingCard
          vendorId={state.vendorId}
          prepareCount={prepareCount}
          disputeCount={disputeCount}
          onSeeTier={goToTier}
        />
      ) : null}

      <LowStockRow item={state.lowStockItem} />

      {/* Note "Accès Préparation" — en bas de page, juste avant le bandeau réseau (ACC-26,
         état "Accueil_prep"), pas en haut : tous les montants sont déjà masqués plus haut. */}
      {state.isPrepAccess ? (
        <p className="text-center mb-3" style={{ fontSize: 11.5, color: p.textMuted }}>
          {t('sl6_accueil.prep_access_note')}
        </p>
      ) : null}

      {state.variant !== 'offline' ? (
        <div className="flex items-center gap-2 justify-center mt-3" style={{ minHeight: 44 }}>
          <Wifi size={14} color={p.green} />
          <span style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl6_accueil.network_footer')}</span>
        </div>
      ) : null}
    </div>
  );
}
