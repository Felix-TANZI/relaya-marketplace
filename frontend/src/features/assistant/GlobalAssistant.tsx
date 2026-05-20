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
          "Salut, je suis là. Dis-moi ce que tu veux faire et je t’y amène : chercher un produit, retrouver une commande, comprendre un paiement, ou juste te débloquer dans l’app.",
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
    () => `Je suis avec toi sur ${viewportLabel}`,
    [viewportLabel],
  );
  const assistantLayer = location.pathname.startsWith("/search") ? "z-[45]" : "z-[80]";

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
        content: "Salut. Je suis avec toi. Tu peux me dire les choses simplement : “ouvre mon panier”, “trouve un téléphone”, “je veux suivre ma commande”. Je m’occupe du chemin.",
        actions: [
          { label: "Voir les produits", onClick: () => navigate("/catalog") },
          { label: "Accueil", onClick: () => navigate("/") },
          { label: "Visite guidée", onClick: () => { window.dispatchEvent(new Event("belivay-open-tutorial")); setIsOpen(false); } },
        ],
      });
      return;
    }

    // ── Comment fonctionne l'app / aide générale ──
    if (prompt.includes("fonctionne") || prompt.includes("comment ca marche") || prompt.includes("c'est quoi") || prompt.includes("utiliser") || prompt.includes("expliqu")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "BelivaY fonctionne comme un achat accompagné : tu choisis un produit, tu le mets au panier, tu paies, puis tu suis la commande jusqu’à la livraison. Je peux te faire gagner du temps en t’ouvrant directement la bonne étape.",
        actions: [
          { label: "Lancer la visite guidée", onClick: () => { window.dispatchEvent(new Event("belivay-open-tutorial")); setIsOpen(false); } },
          { label: "Chercher un produit", onClick: () => navigate("/search") },
          { label: "Voir les catégories", onClick: () => navigate("/categories") },
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
        content: "C’est fait, je t’ai ramené à l’accueil. De là, tu peux repartir vers les produits, les promos ou tes commandes.",
      });
      return;
    }

    // ── Panier ──
    if (prompt.includes("panier") || prompt.includes("cart")) {
      navigate("/cart");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Voilà ton panier. Tu peux choisir les articles à payer, changer les quantités ou passer directement à la commande.",
      });
      return;
    }

    // ── Commandes ──
    if (prompt.includes("commande") || prompt.includes("suivi") || prompt.includes("orders") || prompt.includes("livraison")) {
      navigate("/orders");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Je t’ai ouvert tes commandes. Regarde le statut en haut de chaque carte, puis ouvre une commande si tu veux le suivi ou les détails.",
      });
      return;
    }

    // ── Profil / Compte ──
    if (prompt.includes("profil") || prompt.includes("compte") || prompt.includes("profile") || prompt.includes("info")) {
      navigate("/profile");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Voici ton compte. C’est ici que tu retrouves tes infos, tes commandes et tes préférences.",
      });
      return;
    }

    // ── Favoris ──
    if (prompt.includes("favori") || prompt.includes("wishlist") || prompt.includes("coeur") || prompt.includes("liste")) {
      navigate("/wishlist");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "J’ai ouvert tes favoris. Tu peux reprendre un produit mis de côté, l’ajouter au panier ou l’acheter maintenant.",
      });
      return;
    }

    // ── Aide / Support ──
    if (prompt.includes("aide") || prompt.includes("support") || prompt.includes("help") || prompt.includes("contact")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Dis-moi ce qui bloque et je t’oriente. Si tu veux parler à l’équipe, je peux aussi t’ouvrir l’aide ou la page contact.",
        actions: [
          { label: "Centre d'aide", onClick: () => navigate("/help") },
          { label: "Nous contacter", onClick: () => navigate("/contact") },
        ],
      });
      return;
    }

    // ── Paiement ──
    if (prompt.includes("paiement") || prompt.includes("checkout") || prompt.includes("payer") || prompt.includes("momo") || prompt.includes("orange money")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Pour payer, pars du panier. BelivaY te guidera ensuite vers les informations de livraison et le paiement Mobile Money.",
        actions: [
          { label: "Mon panier", onClick: () => navigate("/cart") },
          { label: "Passer commande", onClick: () => navigate("/checkout") },
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
        content: "Je t’ai ouvert les catégories. Choisis une famille de produits et l’app filtrera ce qui t’intéresse.",
      });
      return;
    }

    // ── Recherche ──
    if (prompt.includes("recherch") || prompt.includes("cherch") || prompt.includes("search") || prompt.includes("trouver")) {
      navigate("/search");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "La recherche est prête. Tape le nom du produit, une catégorie ou un budget, et on réduit le choix.",
      });
      return;
    }

    // ── Visite guidée ──
    if (prompt.includes("guide") || prompt.includes("visite") || prompt.includes("tutoriel") || prompt.includes("tour")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "C’est parti, je lance la visite guidée. Elle va te montrer les points importants sans te perdre dans les menus.",
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
        content: "Je t’ai ouvert les vendeurs. Tu peux comparer les boutiques par spécialité, fiabilité et produits disponibles.",
      });
      return;
    }

    // ── Notifications ──
    if (prompt.includes("notification") || prompt.includes("alerte") || prompt.includes("cloche")) {
      navigate("/notifications");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Voici tes notifications. Les plus récentes et les messages importants ressortent visuellement pour que tu voies vite quoi traiter.",
      });
      return;
    }

    // ── Inscription / Connexion ──
    if (prompt.includes("inscri") || prompt.includes("register") || prompt.includes("creer un compte") || prompt.includes("sign up")) {
      navigate("/register");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Je t’ai ouvert la création de compte. Remplis les infos essentielles et tu pourras commander plus facilement.",
      });
      return;
    }
    if (prompt.includes("connexion") || prompt.includes("connecter") || prompt.includes("login") || prompt.includes("mot de passe")) {
      navigate("/login");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Je t’ai ouvert la connexion. Entre ton identifiant et ton mot de passe, puis tu reprends ton parcours.",
      });
      return;
    }

    // ── Langue / Theme ──
    if (prompt.includes("langue") || prompt.includes("anglais") || prompt.includes("francais") || prompt.includes("english")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "La langue se change depuis l’icône globe en haut. Tu peux passer de Français à English quand tu veux.",
      });
      return;
    }
    if (prompt.includes("sombre") || prompt.includes("dark") || prompt.includes("theme") || prompt.includes("clair") || prompt.includes("nuit")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Le thème clair/sombre se règle avec l’icône lune ou soleil dans l’en-tête.",
      });
      return;
    }

    // ── Devenir vendeur ──
    if (prompt.includes("vendre") || prompt.includes("devenir vendeur") || prompt.includes("ouvrir boutique")) {
      navigate("/become-seller");
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Je t’ai ouvert l’espace pour devenir vendeur. Tu remplis ton dossier, puis BelivaY l’examine avant activation.",
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
          ? "J’ai trouvé quelques options abordables. Regarde celles-ci, et ouvre celle qui te parle le plus."
          : "Je n’ai rien de solide avec ces mots. Essaie un nom plus précis, ou pars du catalogue pour explorer.",
        products: cheapestProducts,
        actions: [
          { label: "Rechercher", onClick: () => navigate("/search") },
          { label: "Catalogue", onClick: () => navigate("/catalog") },
        ],
      });
      return;
    }

    // ── Merci / Au revoir ──
    if (/^(merci|thanks|au revoir|bye|a\+|a bientot)\b/.test(prompt)) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Avec plaisir. Je reste là si tu veux continuer ou vérifier quelque chose avant d’acheter.",
      });
      return;
    }

    // ── Fallback - more helpful ──
    pushAssistantMessage({
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "Je ne veux pas te répondre à côté. Je peux déjà t’aider sur ces actions, ou reformule en une phrase simple et je m’adapte.",
      actions: [
        { label: "Chercher un produit", onClick: () => navigate("/search") },
        { label: "Aller à l'accueil", onClick: () => navigate("/") },
        { label: "Mes commandes", onClick: () => navigate("/orders") },
        { label: "Mon panier", onClick: () => navigate("/cart") },
        { label: "Catégories", onClick: () => navigate("/categories") },
        { label: "Visite guidée", onClick: () => { window.dispatchEvent(new Event("belivay-open-tutorial")); setIsOpen(false); } },
        { label: "Aide & Contact", onClick: () => navigate("/help") },
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
    } catch {
      // silenced;
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Je n’ai pas réussi à aller au bout, mais je peux encore t’aider à reprendre la main. Choisis une option et on repart proprement.",
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
          aria-label="Ouvrir l'assistant BelivaY"
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
        <section className={`fixed bottom-36 right-4 ${assistantLayer} w-[min(400px,calc(100vw-2rem))] max-h-[min(480px,calc(100vh-10rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 lg:bottom-24 lg:right-6 lg:z-[80] flex flex-col`}>
          <header className="border-b border-slate-200 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.92))] px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <Sparkles size={13} />
                  Agent client
                </p>
                <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
                  Agent BelivaY
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
                  <p className="whitespace-pre-line">{chatMessage.content}</p>

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
                  Je regarde ça…
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
                    placeholder="Dis-moi ce que tu veux faire…"
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
