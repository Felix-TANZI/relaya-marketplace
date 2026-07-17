import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Gift,
  Info,
  type LucideIcon,
  MessageCircleMore,
  Package,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { customerApi, type CustomerNotification } from "@/services/api/customer";

type NotificationCard = CustomerNotification & {
  icon?: LucideIcon;
  tone?: string;
  description?: string;
  time?: string;
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const fallbackNotifications = [
    {
      id: 0,
      title: t('notifications_extra.welcome_title'),
      description: t('notifications_extra.welcome_desc'),
      time: t('notifications_extra.now'),
      icon: Gift,
      tone: "bg-primary/10 text-primary",
      unread: true,
    },
    {
      id: 1,
      title: t('notifications.fallback.order_shipped_title'),
      description: t('notifications.fallback.order_shipped_desc'),
      time: t('notifications.fallback.time_10min'),
      icon: Package,
      tone: "bg-orange-50 text-primary",
      unread: true,
    },
    {
      id: 2,
      title: t('notifications.fallback.flash_promo_title'),
      description: t('notifications.fallback.flash_promo_desc'),
      time: t('notifications.fallback.time_1h'),
      icon: Gift,
      tone: "bg-pink-50 text-pink-600",
      unread: true,
    },
    {
      id: 3,
      title: t('notifications.fallback.secure_payment_title'),
      description: t('notifications.fallback.secure_payment_desc'),
      time: t('notifications.fallback.time_4h'),
      icon: ShieldCheck,
      tone: "bg-green-50 text-green-600",
      unread: false,
    },
    {
      id: 4,
      title: t('notifications.fallback.support_message_title'),
      description: t('notifications.fallback.support_message_desc'),
      time: t('notifications.fallback.time_yesterday'),
      icon: MessageCircleMore,
      tone: "bg-blue-50 text-blue-600",
      unread: false,
    },
  ];

  const [notifications, setNotifications] = useState<NotificationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<NotificationCard | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        if (localStorage.getItem('access_token')) {
          const data = await customerApi.getNotifications();
          setNotifications(data);
        } else {
          setNotifications(
            fallbackNotifications.map((notification) => ({
              ...notification,
              is_read: !notification.unread,
              notification_type: 'SYSTEM',
              action_url: '',
              updated_at: '',
              created_at: notification.time,
              message: notification.description,
            })),
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    const handleNewNotification = () => {
      void fetchNotifications();
    };
    window.addEventListener("belivay-new-notification", handleNewNotification);
    return () => window.removeEventListener("belivay-new-notification", handleNewNotification);
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const notificationText = (notification: NotificationCard) =>
    'description' in notification && notification.description ? notification.description : notification.message;
  const notificationTime = (notification: NotificationCard) =>
    'time' in notification && notification.time ? notification.time : new Date(notification.created_at).toLocaleString('fr-FR');
  const getNotificationDate = (notification: NotificationCard) => {
    const date = new Date(notification.created_at);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  };
  const getNotificationVisual = (notification: NotificationCard) => {
    const ageMs = Date.now() - getNotificationDate(notification).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (notification.notification_type === "SYSTEM") {
      return {
        icon: Info,
        accent: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/15 dark:text-red-300",
        rail: "bg-red-500",
        label: "Système",
      };
    }

    if (ageMs >= oneDayMs) {
      return {
        icon: notification.notification_type === "ORDER" ? Package : Bell,
        accent: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-300",
        rail: "bg-amber-500",
        label: "À relire",
      };
    }

    return {
      icon: notification.notification_type === "ORDER" ? Package : CheckCircle2,
      accent: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/15 dark:text-emerald-300",
      rail: "bg-emerald-500",
      label: notification.is_read ? "Récent" : "Nouveau",
    };
  };
  const getOrderTarget = (notification: NotificationCard) => {
    const source = `${notification.action_url ?? ""} ${notification.title ?? ""} ${notification.message ?? ""}`;
    const match = source.match(/(?:orders\/|commande\s*#?|#)(\d+)/i);
    return match ? `/orders/${match[1]}` : "/orders";
  };

  const openNotification = async (notification: NotificationCard) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      setNotifications((current) =>
        current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item)
      );
      if (localStorage.getItem('access_token') && notification.id > 0) {
        try {
          await customerApi.markNotificationRead(notification.id);
        } catch {
          // La lecture reste visible cote interface meme si le backend demo ne repond pas.
        }
      }
    }
  };

  const deleteNotification = async (notification: NotificationCard) => {
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    if (selectedNotification?.id === notification.id) {
      setSelectedNotification(null);
    }
    if (localStorage.getItem('access_token') && notification.id > 0) {
      try {
        await customerApi.deleteNotification(notification.id);
      } catch {
        // La suppression reste appliquee cote interface pour ne pas bloquer le client.
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5f1] py-3 dark:bg-gray-950 sm:py-10">
      <div className="container mx-auto max-w-5xl px-3 sm:px-4">

        {/* ══════════ EN-TÊTE MOBILE — slim, sans carte ══════════ */}
        <div className="mb-3 flex items-center justify-between gap-3 px-1 sm:hidden">
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">
            {t('notifications.title')}
          </h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
              {unreadCount} {t('notifications.unread_label')}
            </span>
          )}
        </div>

        {/* ══════════ EN-TÊTE DESKTOP — carte complète ══════════ */}
        <div className="mb-8 hidden rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800 sm:block">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {t('notifications.breadcrumb')}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {t('notifications.title')}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('notifications.subtitle')}
              </p>
            </div>
            <div className="rounded-2xl bg-orange-50 px-4 py-3 text-right dark:bg-primary/10">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('notifications.unread_label')}</p>
              <p className="text-2xl font-bold text-primary">{unreadCount}</p>
            </div>
          </div>
        </div>

        {/* ══════════ LISTE DENSE — MOBILE ══════════ */}
        <div className="sm:hidden">
          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              {t('notifications.loading')}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('notifications.empty_title')}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('notifications.empty_description')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
              {notifications.map((notification) => {
                const visual = getNotificationVisual(notification);
                const Icon = 'icon' in notification && notification.icon ? notification.icon : visual.icon;
                const unread = !notification.is_read;

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => openNotification(notification)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition active:bg-gray-50 dark:active:bg-gray-800 ${
                      unread ? "bg-orange-50/40 dark:bg-primary/5" : ""
                    }`}
                  >
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border ${visual.accent}`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-[13.5px] ${
                          unread ? "font-bold text-gray-900 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-200"
                        }`}>
                          {notification.title}
                        </span>
                        {unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                        <span className="flex-shrink-0 text-[10.5px] text-gray-400 dark:text-gray-500">
                          {notificationTime(notification)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-gray-500 dark:text-gray-400">
                        {notificationText(notification)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════ LISTE CARTES — DESKTOP ══════════ */}
        <div className="hidden gap-4 sm:grid">
          {loading && (
            <article className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.loading')}</p>
            </article>
          )}
          {notifications.map((notification) => {
            const visual = getNotificationVisual(notification);
            const Icon = 'icon' in notification && notification.icon ? notification.icon : visual.icon;

            return (
              <article
                key={notification.id}
                onClick={() => openNotification(notification)}
                className="relative cursor-pointer overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className={`absolute inset-y-0 left-0 w-1.5 ${visual.rail}`} />
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border ${visual.accent}`}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 pr-6">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        {notification.title}
                      </h2>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${visual.accent}`}>
                        {visual.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                      {notificationText(notification)}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <Clock3 size={14} />
                      {notificationTime(notification)}
                    </div>
                  </div>
                  <div className="mt-1 flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteNotification(notification);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      aria-label="Supprimer la notification"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight className="text-gray-300 dark:text-gray-600" size={18} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {selectedNotification && (
          <div className="fixed inset-0 z-[1200] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-4">
            <div className="w-full rounded-t-[2rem] bg-white p-5 shadow-2xl dark:bg-gray-900 sm:max-w-lg sm:rounded-[2rem] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    {getNotificationVisual(selectedNotification).label}
                  </p>
                  <h2 className="mt-2 text-xl font-extrabold text-gray-900 dark:text-white">
                    {selectedNotification.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800"
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
                {notificationText(selectedNotification)}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-400">
                <Clock3 size={14} />
                {notificationTime(selectedNotification)}
              </div>
              <button
                type="button"
                onClick={() => void deleteNotification(selectedNotification)}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20"
              >
                <Trash2 size={16} />
                Supprimer ce message
              </button>
              {selectedNotification.notification_type === "ORDER" && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => navigate(getOrderTarget(selectedNotification))}
                    className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-dark"
                  >
                    Ouvrir la commande
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/orders")}
                    className="rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-bold text-primary hover:bg-orange-50 dark:border-primary/30 dark:bg-gray-900"
                  >
                    Mes commandes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}