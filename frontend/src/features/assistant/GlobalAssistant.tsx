import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Bot,
  Compass,
  Home,
  Loader2,
  MessageSquareText,
  Search,
  SendHorizonal,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import { assistantApi } from "@/services/api/assistant";
import { productsApi, type Product } from "@/services/api/products";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  actions?: {
    label: string;
    onClick: () => void;
  }[];
  products?: Product[];
  meta?: string;
}

const QUICK_ACTIONS = [
  "Trouve-moi un produit pas cher",
  "Ramène-moi à l'accueil",
  "Ouvre mon panier",
  "Guide-moi dans l'app",
];

function formatPrice(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getRouteLabel(pathname: string, t: (key: string) => string) {
  if (pathname.startsWith("/catalog")) return t("cl5_assistant.route_catalog");
  if (pathname.startsWith("/cart")) return t("cl5_assistant.route_cart");
  if (pathname.startsWith("/checkout")) return t("cl5_assistant.route_checkout");
  if (pathname.startsWith("/orders")) return t("cl5_assistant.route_orders");
  if (pathname.startsWith("/wishlist")) return t("cl5_assistant.route_wishlist");
  if (pathname.startsWith("/profile")) return t("cl5_assistant.route_profile");
  if (pathname.startsWith("/search")) return t("cl5_assistant.route_search");
  return t("cl5_assistant.route_home");
}

function getContextualPrompts(pathname: string) {
  if (pathname.startsWith("/cart")) {
    return [
      "Aide-moi à payer",
      "Vérifie mon panier",
      "Ramène-moi à l'accueil",
      "Guide-moi dans l'app",
    ];
  }

  if (pathname.startsWith("/orders")) {
    return [
      "Explique-moi ce statut",
      "Ouvre le suivi",
      "Ramène-moi à l'accueil",
      "Guide-moi dans l'app",
    ];
  }

  if (pathname.startsWith("/profile")) {
    return [
      "Aide-moi avec mon compte",
      "Ouvre mes favoris",
      "Ramène-moi à l'accueil",
      "Guide-moi dans l'app",
    ];
  }

  return QUICK_ACTIONS;
}

function hasProductIntent(prompt: string) {
  return (
    prompt.includes("moins cher") ||
    prompt.includes("pas cher") ||
    prompt.includes("abordable") ||
    prompt.includes("promo") ||
    prompt.includes("promotion") ||
    prompt.includes("produit") ||
    prompt.includes("prix") ||
    prompt.includes("meilleur") ||
    prompt.includes("telephone") ||
    prompt.includes("ordinateur")
  );
}

export default function GlobalAssistant() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const viewportLabel = getRouteLabel(location.pathname, t);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const contextualPrompts = useMemo(
    () => getContextualPrompts(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    setMessages([
      {
        id: "assistant-intro",
        role: "assistant",
        content: t("cl5_assistant.intro_message"),
        actions: [
          { label: t("cl5_assistant.action_home"), onClick: () => navigate("/") },
          { label: t("cl5_assistant.action_cart"), onClick: () => navigate("/cart") },
          { label: t("cl5_assistant.action_orders"), onClick: () => navigate("/orders") },
        ],
      },
    ]);
  }, [navigate, t]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isOpen, isLoading, messages]);

  /* Ouverture depuis l'extérieur — bouton « Chat IA » de la page À propos. */
  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener("belivay-open-assistant", open);
    return () => window.removeEventListener("belivay-open-assistant", open);
  }, []);

  const statusLabel = useMemo(
    () => t("cl5_assistant.status_label", { route: viewportLabel }),
    [viewportLabel, t],
  );
  const assistantLayer = location.pathname.startsWith("/search") ? "z-[45]" : "z-[80]";

  const pushAssistantMessage = (nextMessage: ChatMessage) => {
    setMessages((current) => [...current, nextMessage]);
  };

  const buildFollowUpActions = (followUp?: string[]) =>
    (followUp ?? []).slice(0, 3).map((label) => ({
      label,
      onClick: () => {
        void handleAsk(label);
      },
    }));

  const askRemoteAssistant = async (rawPrompt: string, prompt: string) => {
    let contextualProducts: Product[] = [];

    if (hasProductIntent(prompt)) {
      const response = await productsApi.list({
        page_size: 8,
        is_active: true,
        search: rawPrompt.trim().length >= 2 ? rawPrompt.trim() : undefined,
      });
      contextualProducts = response.results ?? [];
    }

    const response = await assistantApi.ask({
      message: rawPrompt,
      products: contextualProducts,
      path: location.pathname,
      routeLabel: viewportLabel,
      portalRole: import.meta.env.VITE_PORTAL_ROLE || "client",
      history: [
        ...messages.slice(-7).map((chatMessage) => ({
          role: chatMessage.role,
          content: chatMessage.content,
        })),
        { role: "user", content: rawPrompt },
      ],
    });

    const suggestedProducts = (response.suggestions ?? [])
      .map((suggestion) =>
        contextualProducts.find((product) => product.id === suggestion.productId),
      )
      .filter(Boolean) as Product[];

    pushAssistantMessage({
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: response.answer || t("cl5_assistant.remote_fallback"),
      products: suggestedProducts,
      actions: buildFollowUpActions(response.followUp),
      meta: response.model ? `${response.source ?? "assistant"} · ${response.model}` : undefined,
    });
  };

  const handleLocalHelp = async (rawPrompt: string) => {
    const prompt = normalize(rawPrompt);

    // ── Greetings ──
    if (/^(yo|salut|bonjour|bonsoir|hello|coucou|hey|hi|cc|slt)\b/.test(prompt)) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.greeting_message"),
        actions: [
          { label: t("cl5_assistant.action_view_products"), onClick: () => navigate("/catalog") },
          { label: t("cl5_assistant.action_home"), onClick: () => navigate("/") },
          { label: t("cl5_assistant.action_tour"), onClick: () => { window.dispatchEvent(new Event("belivay-open-tutorial")); setIsOpen(false); } },
        ],
      });
      return;
    }

    // ── Comment fonctionne l'app / aide générale ──
    if (prompt.includes("fonctionne") || prompt.includes("comment ca marche") || prompt.includes("c'est quoi") || prompt.includes("utiliser") || prompt.includes("expliqu")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.how_it_works_message"),
        actions: [
          { label: t("cl5_assistant.action_start_tour"), onClick: () => { window.dispatchEvent(new Event("belivay-open-tutorial")); setIsOpen(false); } },
          { label: t("cl5_assistant.action_search_product"), onClick: () => navigate("/search") },
          { label: t("cl5_assistant.action_view_categories"), onClick: () => navigate("/categories") },
        ],
      });
      return;
    }

    // Le paiement doit être traité avant la livraison : une question comme
    // "payer à la livraison" contient les deux intentions.
    if (prompt.includes("paiement") || prompt.includes("checkout") || prompt.includes("payer") || prompt.includes("momo") || prompt.includes("orange money") || prompt.includes("espece")) {
      await askRemoteAssistant(rawPrompt, prompt);
      return;
    }

    // ── Navigation: Accueil ──
    if (prompt.includes("accueil") || prompt.includes("retour") || prompt.includes("revenir") || prompt.includes("home")) {
      navigate("/");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_home_message"),
      });
      return;
    }

    // ── Panier ──
    if (prompt.includes("panier") || prompt.includes("cart")) {
      navigate("/cart");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_cart_message"),
      });
      return;
    }

    // ── Commandes ──
    if (prompt.includes("commande") || prompt.includes("suivi") || prompt.includes("orders") || prompt.includes("livraison")) {
      navigate("/orders");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_orders_message"),
      });
      return;
    }

    // ── Profil / Compte ──
    if (prompt.includes("profil") || prompt.includes("compte") || prompt.includes("profile") || prompt.includes("info")) {
      navigate("/profile");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_profile_message"),
      });
      return;
    }

    // ── Favoris ──
    if (prompt.includes("favori") || prompt.includes("wishlist") || prompt.includes("coeur") || prompt.includes("liste")) {
      navigate("/wishlist");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_wishlist_message"),
      });
      return;
    }

    // ── Aide / Support ──
    if (prompt.includes("aide") || prompt.includes("support") || prompt.includes("help") || prompt.includes("contact")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_help_message"),
        actions: [
          { label: t("cl5_assistant.action_help_center"), onClick: () => navigate("/help") },
          { label: t("cl5_assistant.action_contact_us"), onClick: () => navigate("/contact") },
        ],
      });
      return;
    }

    // ── Catégories ──
    if (prompt.includes("categorie") || prompt.includes("category") || prompt.includes("parcourir") || prompt.includes("explorer")) {
      navigate("/categories");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_categories_message"),
      });
      return;
    }

    // ── Recherche ──
    if (prompt.includes("recherch") || prompt.includes("cherch") || prompt.includes("search") || prompt.includes("trouver")) {
      navigate("/search");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_search_message"),
      });
      return;
    }

    // ── Visite guidée ──
    if (prompt.includes("guide") || prompt.includes("visite") || prompt.includes("tutoriel") || prompt.includes("tour")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_tour_message"),
      });
      window.dispatchEvent(new Event("belivay-open-tutorial"));
      setIsOpen(false);
      return;
    }

    // ── Vendeurs ──
    if (prompt.includes("vendeur") || prompt.includes("boutique") || prompt.includes("seller") || prompt.includes("vendor")) {
      navigate("/vendors");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_vendors_message"),
      });
      return;
    }

    // ── Notifications ──
    if (prompt.includes("notification") || prompt.includes("alerte") || prompt.includes("cloche")) {
      navigate("/notifications");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_notifications_message"),
      });
      return;
    }

    // ── Inscription / Connexion ──
    if (prompt.includes("inscri") || prompt.includes("register") || prompt.includes("creer un compte") || prompt.includes("sign up")) {
      navigate("/register");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_register_message"),
      });
      return;
    }
    if (prompt.includes("connexion") || prompt.includes("connecter") || prompt.includes("login") || prompt.includes("mot de passe")) {
      navigate("/login");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_login_message"),
      });
      return;
    }

    // ── Langue / Theme ──
    if (prompt.includes("langue") || prompt.includes("anglais") || prompt.includes("francais") || prompt.includes("english")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_language_message"),
      });
      return;
    }
    if (prompt.includes("sombre") || prompt.includes("dark") || prompt.includes("theme") || prompt.includes("clair") || prompt.includes("nuit")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_theme_message"),
      });
      return;
    }

    // ── Devenir vendeur ──
    if (prompt.includes("vendre") || prompt.includes("devenir vendeur") || prompt.includes("ouvrir boutique")) {
      navigate("/become-seller");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_become_seller_message"),
      });
      return;
    }

    // ── Produits / Prix ──
    if (hasProductIntent(prompt)) {
      await askRemoteAssistant(rawPrompt, prompt);
      return;
    }

    // ── Merci / Au revoir ──
    if (/^(merci|thanks|au revoir|bye|a\+|a bientot)\b/.test(prompt)) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.nav_thanks_message"),
      });
      return;
    }

    await askRemoteAssistant(rawPrompt, prompt);
  };

  const handleAsk = async (rawPrompt: string) => {
    const trimmedPrompt = rawPrompt.trim();
    if (!trimmedPrompt) return;

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmedPrompt,
      },
    ]);
    setMessage("");
    setIsLoading(true);

    try {
      await handleLocalHelp(trimmedPrompt);
    } catch {
      // silenced;
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("cl5_assistant.error_message"),
        actions: [
          { label: t("cl5_assistant.action_help_center"), onClick: () => navigate("/help") },
          { label: t("cl5_assistant.action_home"), onClick: () => navigate("/") },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`fixed bottom-20 right-4 ${assistantLayer} lg:bottom-6 lg:right-6 lg:z-[80]`}>
        {/* Pulse ring - attention grabber */}
        {!isOpen && (
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
        )}
        {/* Outer glow ring */}
        {!isOpen && (
          <span className="absolute -inset-1 animate-pulse rounded-full border-2 border-primary/40" />
        )}
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/40 transition-all hover:scale-110 hover:bg-primary-dark"
          aria-label={t("cl5_assistant.open_assistant_aria")}
          data-tutorial="chatbot"
        >
          {isOpen ? <X size={20} /> : <Bot size={22} />}
          {/* Sparkle dot */}
          {!isOpen && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[8px] shadow-sm">
              ✦
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <section className={`fixed bottom-36 right-4 ${assistantLayer} flex h-[min(620px,calc(100dvh-10rem))] w-[min(430px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 lg:bottom-24 lg:right-6 lg:z-[80] lg:h-[min(680px,calc(100dvh-8rem))]`}>
          <header className="border-b border-slate-200 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.92))] px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <Sparkles size={13} />
                  {t("cl5_assistant.header_badge")}
                </p>
                <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
                  {t("cl5_assistant.header_title")}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {statusLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                aria-label={t("cl5_assistant.close_assistant_aria")}
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto bg-gray-50 px-4 py-4 dark:bg-gray-950">
            {messages.map((chatMessage) => (
              <article
                key={chatMessage.id}
                className={`flex ${chatMessage.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm ${
                    chatMessage.role === "user"
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  <p className="whitespace-pre-line">{chatMessage.content}</p>

                  {chatMessage.products && chatMessage.products.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {chatMessage.products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => navigate(`/product/${product.id}`)}
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition-all hover:border-primary hover:bg-white dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {product.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {formatPrice(product.price_final)}
                            </div>
                          </div>
                          <ArrowRight size={16} className="shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {chatMessage.actions && chatMessage.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {chatMessage.actions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => action.onClick()}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {chatMessage.meta && chatMessage.role === "assistant" && (
                    <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-400 dark:border-slate-800">
                      {chatMessage.meta}
                    </p>
                  )}
                </div>
              </article>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <Loader2 size={16} className="animate-spin" />
                  {t("cl5_assistant.loading_message")}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
            {messages.filter(m => m.role === "user").length === 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {contextualPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void handleAsk(prompt)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleAsk(message);
              }}
              className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition focus-within:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-600"
            >
              <label
                htmlFor="belivay-assistant-message"
                className="mb-1.5 block px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300"
              >
                {t("cl5_assistant.message_label")}
              </label>
              <div className="flex items-end gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                  <MessageSquareText
                    size={18}
                    className="mt-1.5 shrink-0 text-primary"
                  />
                  <textarea
                    id="belivay-assistant-message"
                    ref={textareaRef}
                    rows={2}
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      event.currentTarget.style.height = "auto";
                      event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 112)}px`;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (message.trim()) {
                          void handleAsk(message);
                        }
                      }
                    }}
                    placeholder={t("cl5_assistant.message_placeholder")}
                    className="min-h-[52px] max-h-28 w-full resize-none overflow-y-auto border-0 bg-transparent py-1 text-[15px] font-medium leading-6 text-slate-950 caret-primary outline-none ring-0 placeholder:font-normal placeholder:text-slate-500 focus:border-0 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !message.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                  aria-label={t("cl5_assistant.send_message_aria")}
                >
                  <SendHorizonal size={17} />
                </button>
              </div>
            </form>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={() => {
                  navigate("/");
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300"
              >
                <Home size={13} />
                {t("cl5_assistant.action_home")}
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/search");
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300"
              >
                <Search size={13} />
                {t("cl5_assistant.route_search")}
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/cart");
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300"
              >
                <ShoppingCart size={13} />
                {t("cl5_assistant.action_cart")}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event("belivay-open-tutorial"));
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300"
              >
                <Compass size={13} />
                {t("cl5_assistant.action_tour")}
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
