import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Bell,
  Calendar,
  Camera,
  Heart,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { authApi, type User as UserType } from "@/services/api/auth";
import { useToast } from "@/context/ToastContext";
import { customerApi, type CustomerNotification } from "@/services/api/customer";
import {
  getStoredProfileAvatar,
  getUserDisplayName,
  getUserInitials,
  setStoredProfileAvatar,
} from "@/lib/profileAvatar";

/* ══ DISPUTE SECTION with integrated chat ══ */
function DisputeSection({
  supportMessages,
  formatDate,
}: {
  supportMessages: CustomerNotification[];
  formatDate: (d: string) => string;
}) {
  const navigate = useNavigate();
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState<{ from: "user" | "support"; text: string; time: string }[]>([
    { from: "support", text: "Bonjour ! Je suis l'assistant BelivaY. Comment puis-je vous aider avec votre commande ou un litige ?", time: new Date().toISOString() },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = () => {
    const text = chatMsg.trim();
    if (!text) return;
    const now = new Date().toISOString();
    setChatHistory((h) => [...h, { from: "user", text, time: now }]);
    setChatMsg("");
    setTimeout(() => {
      setChatHistory((h) => [...h, {
        from: "support",
        text: "Merci pour votre message. Un conseiller BelivaY va traiter votre demande dans les 24h. Vous serez notifié par email.",
        time: new Date().toISOString(),
      }]);
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 800);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-[1.75rem] border border-orange-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
              <AlertTriangle size={20} className="text-amber-500" />
              Litiges ouverts
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Réclamations en cours · Réponse garantie sous 24h
            </p>
          </div>
          <Link to="/orders">
            <Button variant="secondary" className="rounded-2xl">
              <Package size={14} />
              Voir mes commandes
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        {/* Aucun litige + notifications */}
        <div className="space-y-3">
          <div className="rounded-[1.75rem] border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <AlertTriangle size={36} className="mx-auto mb-3 text-gray-300" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white">Aucun litige en cours</h4>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              Ouvrez un litige depuis les détails d'une commande en cas de problème.
            </p>
          </div>

          {supportMessages.length > 0 && (
            <div className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-900/40 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2">
                <Bell size={16} className="text-blue-500" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Messages BelivaY</h4>
              </div>
              <div className="space-y-2">
                {supportMessages.map((n) => (
                  <div key={n.id} className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12.5px] font-bold text-gray-900 dark:text-white">{n.title}</p>
                        <p className="mt-0.5 text-[12px] text-gray-600 dark:text-gray-300">{n.message}</p>
                      </div>
                      {!n.is_read && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold text-white">Nouveau</span>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400">{formatDate(n.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat intégré */}
        <div className="flex flex-col overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900" style={{ minHeight: "400px" }}>
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-primary/90 to-orange-500 px-5 py-3 dark:border-gray-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <MessageSquare size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Support BelivaY</p>
              <p className="text-[10px] text-white/70">Réponse sous 24h · Équipe disponible</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <span className="text-[10px] text-white/80">En ligne</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "280px" }}>
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                {msg.from === "support" && (
                  <div className="mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <ShieldCheck size={12} className="text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${
                    msg.from === "user"
                      ? "rounded-br-sm bg-primary text-white"
                      : "rounded-bl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                >
                  {msg.text}
                  <p className={`mt-1 text-[10px] ${msg.from === "user" ? "text-white/60" : "text-gray-400"}`}>
                    {formatDate(msg.time)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 dark:border-gray-800">
            <div className="flex items-end gap-2">
              <textarea
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Décrivez votre problème… (Entrée pour envoyer)"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
              <button
                onClick={sendMessage}
                disabled={!chatMsg.trim()}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-all hover:bg-orange-700 disabled:opacity-40"
              >
                <MessageSquare size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-900/10">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
          <ShieldCheck size={14} />
          Comment fonctionne un litige ?
        </h4>
        <ul className="space-y-1.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
          <li>1. Ouvrez un litige depuis les détails de votre commande</li>
          <li>2. Décrivez le problème via le chat ci-dessus</li>
          <li>3. L'équipe BelivaY examine votre réclamation sous 24h</li>
          <li>4. Si le litige est fondé, l'Escrow vous rembourse intégralement</li>
        </ul>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<CustomerNotification[]>([]);
  const [activeSection, setActiveSection] = useState<"profile" | "disputes">(
    searchParams.get("tab") === "disputes" ? "disputes" : "profile",
  );
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await authApi.getProfile();
        setUser(data);
        setFormData({
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || "",
        });
        setProfileAvatar(data.avatar_url || getStoredProfileAvatar());
      } catch (error) {
        // silenced;
        showToast(t("profile.load_error"), "error");
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, [showToast, t]);

  useEffect(() => {
    const nextSection = searchParams.get("tab") === "disputes" ? "disputes" : "profile";
    setActiveSection(nextSection);
  }, [searchParams]);

  useEffect(() => {
    const fetchSupportMessages = async () => {
      try {
        const notifications = await customerApi.getNotifications();
        setSupportMessages(
          notifications.filter(
            (notification) =>
              notification.notification_type === "SUPPORT" ||
              /support|litige|belivay/i.test(
                `${notification.title} ${notification.message}`,
              ),
          ),
        );
      } catch {
        setSupportMessages([]);
      }
    };

    void fetchSupportMessages();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedUser = await authApi.updateProfile(formData);
      setUser(updatedUser);
      setIsEditing(false);
      showToast(t("profile.update_success"), "success");
    } catch (error) {
      // silenced;
      showToast(t("profile.update_error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!user) return;
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || "",
    });
    setIsEditing(false);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    authApi
      .uploadAvatar(file)
      .then((updatedUser) => {
        const avatarUrl = updatedUser.avatar_url || null;
        setUser(updatedUser);
        setProfileAvatar(avatarUrl);
        setStoredProfileAvatar(avatarUrl);
        window.dispatchEvent(new Event("belivay-avatar-updated"));
        showToast(t("profile.avatar_success"), "success");
      })
      .catch((error) => {
        // silenced;
        showToast(t("profile.avatar_error"), "error");
      });
  };

  const handleRemoveAvatar = () => {
    authApi
      .removeAvatar()
      .then((updatedUser) => {
        setUser(updatedUser);
        setProfileAvatar(null);
        setStoredProfileAvatar(null);
        window.dispatchEvent(new Event("belivay-avatar-updated"));
        showToast(t("profile.avatar_removed"), "success");
      })
      .catch((error) => {
        // silenced;
        showToast(t("profile.avatar_remove_error"), "error");
      });
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] px-4 py-10 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="skeleton h-[360px] rounded-[1.75rem]" />
            <div className="skeleton h-[420px] rounded-[1.75rem]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = getUserDisplayName(user);
  const userInitials = getUserInitials(user);
  const fallbackSupportMessages = [
    {
      id: 0,
      title: "Message BelivaY",
      message:
        "Tous vos échanges support et le suivi de réclamation apparaissent ici dès qu'un litige est ouvert.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      action_url: "",
      is_read: false,
      notification_type: "SUPPORT" as const,
    },
  ];
  const displayedSupportMessages =
    supportMessages.length > 0 ? supportMessages : fallbackSupportMessages;
  const changeSection = (section: "profile" | "disputes") => {
    setActiveSection(section);
    setSearchParams(section === "disputes" ? { tab: "disputes" } : {});
  };

  return (
    <div className="min-h-screen bg-[#f8f5f1] px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-[1.75rem] border border-orange-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="text-center">
                <div className="relative mx-auto mb-4 h-28 w-28">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary text-3xl font-bold text-white shadow-lg">
                    {profileAvatar ? (
                      <img src={profileAvatar} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      userInitials
                    )}
                  </div>
                  <label className="absolute bottom-1 right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-primary shadow-md ring-1 ring-orange-100 transition hover:scale-105 dark:bg-gray-900 dark:ring-gray-700">
                    <Camera size={16} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{displayName}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                <p className="mt-4 rounded-2xl bg-[#fff7ef] px-4 py-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {t("profile.avatar_hint")}
                </p>
                {profileAvatar ? (
                  <button
                    onClick={handleRemoveAvatar}
                    className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={16} />
                    {t("profile.avatar_remove")}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-orange-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="py-2">
                {[
                  { key: "profile" as const, label: "Mon Profil", icon: User },
                  { key: "orders" as const, label: t("profile.menu.orders"), icon: Package, to: "/orders" },
                  { key: "wishlist" as const, label: t("profile.menu.favorites"), icon: Heart, to: "/wishlist" },
                  { key: "notifications" as const, label: t("profile.menu.notifications"), icon: Bell, to: "/notifications" },
                  { key: "disputes" as const, label: "Mes Litiges", icon: AlertTriangle },
                ].map((item) => {
                  const isActive = !item.to && activeSection === item.key;
                  if (item.to) {
                    return (
                      <Link
                        key={item.key}
                        to={item.to}
                        className="flex items-center justify-between px-4 py-2.5 text-[12.5px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary dark:text-gray-400 dark:hover:bg-gray-800"
                      >
                        <span className="inline-flex items-center gap-3">
                          <item.icon size={13} className="opacity-60" />
                          {item.label}
                        </span>
                        <span className="text-gray-300">›</span>
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={item.key}
                      onClick={() => changeSection(item.key as "profile" | "disputes")}
                      className={`relative flex w-full items-center justify-between px-4 py-2.5 text-[12.5px] font-semibold transition-colors ${
                        isActive
                          ? "bg-orange-50 text-primary dark:bg-primary/10"
                          : "text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-400 dark:hover:bg-gray-800"
                      }`}
                    >
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r bg-primary" />}
                      <span className="inline-flex items-center gap-3">
                        <item.icon size={13} className="opacity-60" />
                        {item.label}
                      </span>
                      <span className="text-gray-300">›</span>
                    </button>
                  );
                })}
                <div className="mx-4 my-1 h-px bg-gray-100 dark:bg-gray-800" />
                <button
                  onClick={() => window.dispatchEvent(new Event("belivay-open-tutorial"))}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-[12.5px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <span className="inline-flex items-center gap-3">
                    <ShieldCheck size={13} className="opacity-60" />
                    Visite guidée
                  </span>
                  <span className="text-gray-300">›</span>
                </button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <Calendar size={16} className="text-primary" />
                Membre depuis {formatDate(user.date_joined)}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            {activeSection === "disputes" ? (
              /* ══ DISPUTES SECTION ══ */
              <DisputeSection
                supportMessages={displayedSupportMessages}
                formatDate={formatDate}
              />
            ) : (
            /* ══ PROFILE SECTION ══ */
            <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-orange-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Informations personnelles</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Modifiez vos coordonnées principales utilisées pour vos commandes.
                  </p>
                </div>
                {!isEditing ? (
                  <Button variant="secondary" className="rounded-2xl" onClick={() => setIsEditing(true)}>
                    Modifier
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="secondary" className="rounded-2xl" onClick={handleCancel}>
                      <X size={16} />
                      Annuler
                    </Button>
                    <Button variant="primary" className="rounded-2xl" onClick={handleSave} isLoading={saving}>
                      <Save size={16} />
                      Enregistrer
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Input
                  label={t("profile.first_name")}
                  value={formData.first_name}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, first_name: event.target.value }))
                  }
                  disabled={!isEditing}
                />
                <Input
                  label={t("profile.last_name")}
                  value={formData.last_name}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, last_name: event.target.value }))
                  }
                  disabled={!isEditing}
                />
                <Input
                  label={t("profile.email")}
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, email: event.target.value }))
                  }
                  disabled={!isEditing}
                />
                <Input
                  label={t("profile.phone")}
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, phone: event.target.value }))
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[1.75rem] border border-orange-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact principal</h3>
                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                    <User size={16} className="mt-0.5 text-primary" />
                    <span>{displayName}</span>
                  </div>
                  <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                    <Mail size={16} className="mt-0.5 text-primary" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                    <Phone size={16} className="mt-0.5 text-primary" />
                    <span>{user.phone || "Numéro non renseigné"}</span>
                  </div>
                  <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                    <MapPin size={16} className="mt-0.5 text-primary" />
                    <span>Yaoundé, Cameroun</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="rounded-[1.75rem] border border-orange-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Parcours rapide</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Continuez votre parcours depuis vos sections les plus utilisées.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" className="rounded-2xl" onClick={() => navigate("/orders")}>
                    Commandes
                  </Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => navigate("/wishlist")}>
                    Favoris
                  </Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => navigate("/help")}>
                    Aide
                  </Button>
                </div>
              </div>
            </div>
            </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
