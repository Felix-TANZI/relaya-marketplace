import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import {
  getStoredProfileAvatar,
  getUserDisplayName,
  getUserInitials,
  setStoredProfileAvatar,
} from "@/lib/profileAvatar";

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"profile" | "disputes">("profile");
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
                      onClick={() => setActiveSection(item.key as "profile" | "disputes")}
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
              <div className="space-y-4">
                <div className="rounded-[1.75rem] border border-orange-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
                        <AlertTriangle size={20} className="text-amber-500" />
                        Mes Litiges
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">Gérez vos réclamations et litiges avec les vendeurs.</p>
                    </div>
                    <Button variant="primary" className="rounded-2xl" onClick={() => showToast("Fonctionnalité en cours de développement", "warning")}>
                      <MessageSquare size={14} />
                      Nouveau litige
                    </Button>
                  </div>
                </div>

                {/* Empty state */}
                <div className="rounded-[1.75rem] border border-gray-100 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <AlertTriangle size={40} className="mx-auto mb-4 text-gray-300" />
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Aucun litige en cours</h4>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                    Si vous rencontrez un problème avec un produit ou un vendeur, vous pouvez ouvrir un litige depuis les détails de votre commande.
                  </p>
                  <Link to="/orders" className="mt-4 inline-flex">
                    <Button variant="secondary" className="rounded-2xl">
                      <Package size={14} />
                      Voir mes commandes
                    </Button>
                  </Link>
                </div>

                {/* Info card */}
                <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-900/10">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                    <ShieldCheck size={14} />
                    Comment fonctionne un litige ?
                  </h4>
                  <ul className="space-y-2 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                    <li>1. Ouvrez un litige depuis les détails de votre commande</li>
                    <li>2. Décrivez le problème rencontré avec le produit ou le vendeur</li>
                    <li>3. L'équipe BelivaY examine votre réclamation sous 48h</li>
                    <li>4. Si le litige est fondé, l'Escrow vous rembourse intégralement</li>
                  </ul>
                </div>
              </div>
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
