import { useEffect, useState } from "react";
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

const fallbackNotifications = [
  {
    id: 1,
    title: "Commande #12345 expédiee",
    description: "Votre colis est en route. Livraison estimee aujourd'hui avant 14h.",
    time: "Il y a 10 min",
    icon: Package,
    tone: "bg-orange-50 text-primary",
    unread: true,
  },
  {
    id: 2,
    title: "Promo flash : -30% sur la mode",
    description: "Profitez d'une selection limitee sur les articles tendance du moment.",
    time: "Il y a 1 h",
    icon: Gift,
    tone: "bg-pink-50 text-pink-600",
    unread: true,
  },
  {
    id: 3,
    title: "Paiement securise confirme",
    description: "Le paiement de votre derniere commande a ete valide sans incident.",
    time: "Il y a 4 h",
    icon: ShieldCheck,
    tone: "bg-green-50 text-green-600",
    unread: false,
  },
  {
    id: 4,
    title: "Nouveau message du support",
    description: "Un agent Belivay a repondu a votre derniere demande d'assistance.",
    time: "Hier",
    icon: MessageCircleMore,
    tone: "bg-blue-50 text-blue-600",
    unread: false,
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationCard[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-[#f8f5f1] py-10 dark:bg-gray-950">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Espace client
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Suivez vos commandes, promotions et messages importants au meme endroit.
              </p>
            </div>
            <div className="rounded-2xl bg-orange-50 px-4 py-3 text-right dark:bg-primary/10">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Non lues</p>
              <p className="text-2xl font-bold text-primary">{unreadCount}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {loading && (
            <article className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">Chargement des notifications...</p>
            </article>
          )}
          {notifications.map((notification) => {
            const Icon = 'icon' in notification && notification.icon ? notification.icon : Bell;
            const tone = 'tone' in notification && notification.tone ? notification.tone : "bg-orange-50 text-primary";

            return (
              <article
                key={notification.id}
                className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
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
                          Nouveau
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                      {'description' in notification ? notification.description : notification.message}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <Clock3 size={14} />
                      {'time' in notification ? notification.time : new Date(notification.created_at).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 rounded-[1.75rem] border border-dashed border-orange-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-900">
          <Bell className="mx-auto mb-3 text-primary" size={30} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Centre de notifications pret
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            Cette vue est prete a etre reliee aux vraies notifications backend des que l'API sera
            disponible.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
            <CheckCircle2 size={16} />
            Base UI client en place
          </div>
        </div>
      </div>
    </div>
  );
}
