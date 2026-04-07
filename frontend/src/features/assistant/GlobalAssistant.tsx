import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
}

const QUICK_ACTIONS = [
  "Quels sont les produits les moins chers ?",
  "Je n'arrive pas à revenir à l'accueil",
  "Comment retrouver mon panier ?",
  "Relancer la visite guidée",
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

function getRouteLabel(pathname: string) {
  if (pathname.startsWith("/catalog")) return "Catalogue";
  if (pathname.startsWith("/cart")) return "Panier";
  if (pathname.startsWith("/checkout")) return "Paiement";
  if (pathname.startsWith("/orders")) return "Commandes";
  if (pathname.startsWith("/wishlist")) return "Favoris";
  if (pathname.startsWith("/profile")) return "Compte";
  if (pathname.startsWith("/search")) return "Recherche";
  return "Accueil";
}

function getContextualPrompts(pathname: string) {
  if (pathname.startsWith("/cart")) {
    return [
      "Comment finaliser mon achat ?",
      "Comment retrouver mon panier ?",
      "Je n'arrive pas à revenir à l'accueil",
      "Relancer la visite guidée",
    ];
  }

  if (pathname.startsWith("/orders")) {
    return [
      "Comment suivre mes commandes ?",
      "Je n'arrive pas à revenir à l'accueil",
      "Comment retrouver mon panier ?",
      "Relancer la visite guidée",
    ];
  }

  if (pathname.startsWith("/profile")) {
    return [
      "Comment modifier mon profil ?",
      "Comment retrouver mes favoris ?",
      "Je n'arrive pas à revenir à l'accueil",
      "Relancer la visite guidée",
    ];
  }

  return QUICK_ACTIONS;
}

export default function GlobalAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const viewportLabel = getRouteLabel(location.pathname);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const contextualPrompts = useMemo(
    () => getContextualPrompts(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    setMessages([
      {
        id: "assistant-intro",
        role: "assistant",
        content:
          "Bonjour. Je peux t'aider à trouver un produit, revenir sur une page, relancer la visite guidée ou te guider dans l'application entière.",
        actions: [
          { label: "Accueil", onClick: () => navigate("/") },
          { label: "Panier", onClick: () => navigate("/cart") },
          { label: "Commandes", onClick: () => navigate("/orders") },
        ],
      },
    ]);
  }, [navigate]);

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

  const statusLabel = useMemo(
    () => `Assistant BelivaY · ${viewportLabel}`,
    [viewportLabel],
  );

  const pushAssistantMessage = (nextMessage: ChatMessage) => {
    setMessages((current) => [...current, nextMessage]);
  };

  const handleLocalHelp = async (rawPrompt: string) => {
    const prompt = normalize(rawPrompt);

    // ── Greetings ──
    if (/^(yo|salut|bonjour|bonsoir|hello|coucou|hey|hi|cc|slt)\b/.test(prompt)) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Salut ! 👋 Je suis l'assistant BelivaY. Dis-moi ce que tu cherches : un produit, une page, ou une question sur l'appli. Je suis là pour t'aider !",
        actions: [
          { label: "🛍️ Voir les produits", onClick: () => navigate("/catalog") },
          { label: "🏠 Accueil", onClick: () => navigate("/") },
          { label: "🎓 Visite guidée", onClick: () => { window.dispatchEvent(new Event("belivay-open-tutorial")); setIsOpen(false); } },
        ],
      });
      return;
    }

    // ── Comment fonctionne l'app / aide générale ──
    if (prompt.includes("fonctionne") || prompt.includes("comment ca marche") || prompt.includes("c'est quoi") || prompt.includes("utiliser") || prompt.includes("expliqu")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "BelivaY est une marketplace camerounaise. Voici comment ça marche :\n\n🔍 **Cherche** un produit via la barre de recherche\n📦 **Ajoute** au panier et passe commande\n💳 **Paye** par Mobile Money (MTN MoMo / Orange Money)\n🚚 **Reçois** ta livraison en 24-72h\n\nTu veux que je te montre avec la visite guidée ?",
        actions: [
          { label: "🎓 Lancer la visite guidée", onClick: () => { window.dispatchEvent(new Event("belivay-open-tutorial")); setIsOpen(false); } },
          { label: "🔍 Chercher un produit", onClick: () => navigate("/search") },
          { label: "📂 Voir les catégories", onClick: () => navigate("/categories") },
        ],
      });
      return;
    }

    // ── Navigation: Accueil ──
    if (prompt.includes("accueil") || prompt.includes("retour") || prompt.includes("revenir") || prompt.includes("home")) {
      navigate("/");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "C'est fait ! Je t'ai renvoyé à l'accueil. 🏠 Tu peux aussi cliquer sur le logo Belivay en haut à gauche à tout moment.",
      });
      return;
    }

    // ── Panier ──
    if (prompt.includes("panier") || prompt.includes("cart")) {
      navigate("/cart");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Voici ton panier ! 🛒 Tu peux modifier les quantités, retirer des articles ou passer commande. L'icône panier en haut à droite t'y amène aussi.",
      });
      return;
    }

    // ── Commandes ──
    if (prompt.includes("commande") || prompt.includes("suivi") || prompt.includes("orders") || prompt.includes("livraison")) {
      navigate("/orders");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Tu es sur tes commandes ! 📦 Tu y vois l'historique, les statuts de paiement et de livraison. Clique sur une commande pour les détails.",
      });
      return;
    }

    // ── Profil / Compte ──
    if (prompt.includes("profil") || prompt.includes("compte") || prompt.includes("profile") || prompt.includes("info")) {
      navigate("/profile");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Voici ton espace personnel ! 👤 Tu peux modifier tes infos, ton avatar, accéder à tes commandes et favoris.",
      });
      return;
    }

    // ── Favoris ──
    if (prompt.includes("favori") || prompt.includes("wishlist") || prompt.includes("coeur") || prompt.includes("liste")) {
      navigate("/wishlist");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Voici tes favoris ! ❤️ Clique sur le cœur d'un produit pour l'ajouter ici. Le compteur en haut se met à jour automatiquement.",
      });
      return;
    }

    // ── Aide / Support ──
    if (prompt.includes("aide") || prompt.includes("support") || prompt.includes("help") || prompt.includes("contact")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Tu peux me poser tes questions ici ! Pour un contact direct : WhatsApp +237 000 556 87 78, ou le centre d'aide complet.",
        actions: [
          { label: "📞 Centre d'aide", onClick: () => navigate("/help") },
          { label: "✉️ Nous contacter", onClick: () => navigate("/contact") },
        ],
      });
      return;
    }

    // ── Paiement ──
    if (prompt.includes("paiement") || prompt.includes("checkout") || prompt.includes("payer") || prompt.includes("momo") || prompt.includes("orange money")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "BelivaY accepte **MTN Mobile Money** et **Orange Money**. Le paiement est sécurisé. Pour payer, ajoute des articles au panier puis clique sur « Passer commande ».",
        actions: [
          { label: "🛒 Mon panier", onClick: () => navigate("/cart") },
          { label: "💳 Passer commande", onClick: () => navigate("/checkout") },
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
        content: "Voici les catégories ! 📂 Mode Femme, Mode Homme, Téléphones, Maison, Beauté, Supermarché... Choisis ta catégorie pour filtrer les produits.",
      });
      return;
    }

    // ── Recherche ──
    if (prompt.includes("recherch") || prompt.includes("cherch") || prompt.includes("search") || prompt.includes("trouver")) {
      navigate("/search");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "La recherche est ouverte ! 🔍 Tape un mot-clé et les résultats apparaissent en temps réel. Pas besoin d'appuyer Entrée.",
      });
      return;
    }

    // ── Visite guidée ──
    if (prompt.includes("guide") || prompt.includes("visite") || prompt.includes("tutoriel") || prompt.includes("tour")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "C'est parti ! 🎓 La visite guidée va te montrer les fonctionnalités essentielles étape par étape.",
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
        content: "Voici les vendeurs certifiés BelivaY ! 🏪 Chaque vendeur est vérifié. Tu peux voir leur note, nombre de ventes et spécialité.",
      });
      return;
    }

    // ── Notifications ──
    if (prompt.includes("notification") || prompt.includes("alerte") || prompt.includes("cloche")) {
      navigate("/notifications");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Tu es sur tes notifications ! 🔔 Commandes expédiées, promos flash, messages du support... tout est ici.",
      });
      return;
    }

    // ── Inscription / Connexion ──
    if (prompt.includes("inscri") || prompt.includes("register") || prompt.includes("creer un compte") || prompt.includes("sign up")) {
      navigate("/register");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Tu peux créer ton compte gratuitement ! 📝 Juste un email et un mot de passe.",
      });
      return;
    }
    if (prompt.includes("connexion") || prompt.includes("connecter") || prompt.includes("login") || prompt.includes("mot de passe")) {
      navigate("/login");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Page de connexion ouverte ! 🔐 Connecte-toi avec ton email et mot de passe.",
      });
      return;
    }

    // ── Langue / Theme ──
    if (prompt.includes("langue") || prompt.includes("anglais") || prompt.includes("francais") || prompt.includes("english")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Pour changer la langue, clique sur l'icône 🌐 en haut de la page. Tu peux basculer entre Français et English.",
      });
      return;
    }
    if (prompt.includes("sombre") || prompt.includes("dark") || prompt.includes("theme") || prompt.includes("clair") || prompt.includes("nuit")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Pour activer le mode sombre, clique sur l'icône ☀️/🌙 dans la barre de navigation en haut.",
      });
      return;
    }

    // ── Devenir vendeur ──
    if (prompt.includes("vendre") || prompt.includes("devenir vendeur") || prompt.includes("ouvrir boutique")) {
      navigate("/become-seller");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Tu veux vendre sur BelivaY ? 🚀 Remplis le formulaire et ton dossier sera examiné. Commission faible, paiements sécurisés, support dédié !",
      });
      return;
    }

    // ── Produits / Prix ──
    if (prompt.includes("moins cher") || prompt.includes("pas cher") || prompt.includes("abordable") || prompt.includes("promo") || prompt.includes("produit") || prompt.includes("prix")) {
      const response = await productsApi.list({
        page_size: 3,
        ordering: "price_xaf",
        search: rawPrompt.trim().length >= 2 ? rawPrompt.trim() : undefined,
      });
      const cheapestProducts = [...(response.results ?? [])]
        .sort((left, right) => left.price_final - right.price_final)
        .slice(0, 3);

      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: cheapestProducts.length > 0
          ? "Voici les produits les plus abordables que j'ai trouvés pour toi ! 💰 Clique pour voir les détails."
          : "Je n'ai pas trouvé de produit correspondant. Essaie un terme plus précis ou explore le catalogue.",
        products: cheapestProducts,
        actions: [
          { label: "🔍 Rechercher", onClick: () => navigate("/search") },
          { label: "📂 Catalogue", onClick: () => navigate("/catalog") },
        ],
      });
      return;
    }

    // ── Merci / Au revoir ──
    if (/^(merci|thanks|au revoir|bye|a\+|a bientot)\b/.test(prompt)) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "De rien ! 😊 N'hésite pas à revenir si tu as d'autres questions. Bon shopping sur BelivaY !",
      });
      return;
    }

    // ── Fallback - more helpful ──
    pushAssistantMessage({
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "Je ne suis pas sûr de comprendre ta demande. Voici ce que je peux faire pour toi :",
      actions: [
        { label: "🔍 Chercher un produit", onClick: () => navigate("/search") },
        { label: "🏠 Aller à l'accueil", onClick: () => navigate("/") },
        { label: "📦 Mes commandes", onClick: () => navigate("/orders") },
        { label: "🛒 Mon panier", onClick: () => navigate("/cart") },
        { label: "📂 Catégories", onClick: () => navigate("/categories") },
        { label: "🎓 Visite guidée", onClick: () => { window.dispatchEvent(new Event("belivay-open-tutorial")); setIsOpen(false); } },
        { label: "📞 Aide & Contact", onClick: () => navigate("/help") },
      ],
    });
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
    } catch (error) {
      console.error("Erreur assistant global:", error);
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Je n'ai pas réussi à compléter cette aide tout de suite, mais je peux toujours te rediriger vers la bonne page ou relancer la visite guidée.",
        actions: [
          { label: "Centre d'aide", onClick: () => navigate("/help") },
          { label: "Accueil", onClick: () => navigate("/") },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-20 right-4 z-[80] lg:bottom-6 lg:right-6">
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
          aria-label="Ouvrir l'assistant BelivaY"
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
        <section className="fixed bottom-36 right-4 z-[80] w-[min(400px,calc(100vw-2rem))] max-h-[min(480px,calc(100vh-10rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 lg:bottom-24 lg:right-6 flex flex-col">
          <header className="border-b border-slate-200 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.92))] px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <Sparkles size={13} />
                  Aide globale
                </p>
                <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
                  Assistant BelivaY
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {statusLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                aria-label="Fermer l'assistant"
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
                  <p>{chatMessage.content}</p>

                  {chatMessage.products && chatMessage.products.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {chatMessage.products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            navigate(`/product/${product.id}`);
                            setIsOpen(false);
                          }}
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
                          onClick={() => {
                            action.onClick();
                            setIsOpen(false);
                          }}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <Loader2 size={16} className="animate-spin" />
                  Analyse en cours…
                </div>
              </div>
            )}
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
              className="rounded-[24px] border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-end gap-2">
                <div className="flex flex-1 items-start gap-2 rounded-[18px] bg-white px-3 py-2 dark:bg-slate-950">
                  <MessageSquareText
                    size={18}
                    className="mt-1 shrink-0 text-slate-400"
                  />
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (message.trim()) {
                          void handleAsk(message);
                        }
                      }
                    }}
                    placeholder="Pose une question…"
                    className="min-h-[36px] max-h-[80px] w-full resize-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !message.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-55"
                  aria-label="Envoyer le message"
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
                Accueil
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
                Recherche
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
                Panier
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
                Visite guidée
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
