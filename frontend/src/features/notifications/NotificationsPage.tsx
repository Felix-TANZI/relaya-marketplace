import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Clock3,
  Gift,
  type LucideIcon,
  MessageCircleMore,
  Package,
  ShieldCheck,
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
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const notificationText = (notification: NotificationCard) =>
    'description' in notification && notification.description ? notification.description : notification.message;
  const notificationTime = (notification: NotificationCard) =>
    'time' in notification && notification.time ? notification.time : new Date(notification.created_at).toLocaleString('fr-FR');
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

  return (
    <div className="min-h-screen bg-[#f8f5f1] py-10 dark:bg-gray-950">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
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

        <div className="grid gap-4">
          {loading && (
            <article className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.loading')}</p>
            </article>
          )}
          {notifications.map((notification) => {
            const Icon = 'icon' in notification && notification.icon ? notification.icon : Bell;
            const tone = 'tone' in notification && notification.tone ? notification.tone : "bg-orange-50 text-primary";

            return (
              <article
                key={notification.id}
                onClick={() => openNotification(notification)}
                className="cursor-pointer rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${tone}`}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        {notification.title}
                      </h2>
                      {!notification.is_read && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                          {t('notifications.new_badge')}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                      {notificationText(notification)}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <Clock3 size={14} />
                      {notificationTime(notification)}
                    </div>
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
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Détail notification</p>
                  <h2 className="mt-2 text-xl font-extrabold text-gray-900 dark:text-white">
                    {selectedNotification.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-500 hover:bg-gray-200 dark:bg-gray-800"
                >
                  Fermer
                </button>
              </div>
              <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
                {notificationText(selectedNotification)}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-400">
                <Clock3 size={14} />
                {notificationTime(selectedNotification)}
              </div>
              {selectedNotification.notification_type === "ORDER" && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => navigate(getOrderTarget(selectedNotification))}
                    className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-dark"
                  >
                    Voir le détail
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
