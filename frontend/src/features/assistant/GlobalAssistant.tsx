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

    if (
      prompt.includes("accueil") ||
      prompt.includes("retour") ||
      prompt.includes("revenir")
    ) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Pour revenir à l'accueil, utilise le logo BelivaY en haut de page ou ce raccourci direct. Je peux aussi t'y envoyer maintenant.",
        actions: [{ label: "Aller à l'accueil", onClick: () => navigate("/") }],
      });
      return;
    }

    if (prompt.includes("panier")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Le panier est accessible en permanence depuis l'icône en haut à droite. Si tu veux, je peux t'ouvrir la page panier immédiatement.",
        actions: [{ label: "Ouvrir le panier", onClick: () => navigate("/cart") }],
      });
      return;
    }

    if (
      prompt.includes("commande") ||
      prompt.includes("suivi") ||
      prompt.includes("orders")
    ) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Tu peux suivre tes achats dans la page Commandes. Tu y verras l'historique, les statuts et les détails de chaque commande.",
        actions: [
          { label: "Voir mes commandes", onClick: () => navigate("/orders") },
        ],
      });
      return;
    }

    if (prompt.includes("profil") || prompt.includes("compte")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Ton compte client te permet de modifier tes informations, ton avatar et d'accéder rapidement à tes commandes, favoris et notifications.",
        actions: [{ label: "Ouvrir mon compte", onClick: () => navigate("/profile") }],
      });
      return;
    }

    if (prompt.includes("aide") || prompt.includes("support")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Je peux t'aider directement ici, mais si tu veux une page plus complète avec FAQ et guides, je peux aussi t'ouvrir le centre d'aide.",
        actions: [{ label: "Centre d'aide", onClick: () => navigate("/help") }],
      });
      return;
    }

    if (prompt.includes("paiement") || prompt.includes("checkout")) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "La page Paiement te permet de confirmer tes informations, choisir ton mode de règlement et valider la commande. Je peux t'y envoyer si ton panier est prêt.",
        actions: [{ label: "Aller au paiement", onClick: () => navigate("/checkout") }],
      });
      return;
    }

    if (
      prompt.includes("favori") ||
      prompt.includes("wishlist") ||
      prompt.includes("coeur")
    ) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Quand tu cliques sur le cœur d'un produit, il est ajouté aux Favoris et le compteur de l'en-tête se met à jour. Tu peux consulter tous tes favoris depuis la page dédiée.",
        actions: [{ label: "Ouvrir mes favoris", onClick: () => navigate("/wishlist") }],
      });
      return;
    }

    if (
      prompt.includes("guide") ||
      prompt.includes("visite") ||
      prompt.includes("tutoriel")
    ) {
      pushAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Je relance la visite guidée produit. Elle va te montrer les points essentiels de l'application dans le bon ordre.",
      });
      window.dispatchEvent(new Event("belivay-open-tutorial"));
      return;
    }

    if (
      prompt.includes("moins cher") ||
      prompt.includes("pas cher") ||
      prompt.includes("abordable") ||
      prompt.includes("promo") ||
      prompt.includes("produit")
    ) {
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
        content:
          cheapestProducts.length > 0
            ? "Voici quelques options intéressantes à petit prix que j'ai trouvées pour toi."
            : "Je n'ai pas trouvé de produit correspondant tout de suite. Essaie une requête un peu plus précise.",
        products: cheapestProducts,
        actions: [
          { label: "Ouvrir la recherche", onClick: () => navigate("/search") },
          { label: "Voir le catalogue", onClick: () => navigate("/catalog") },
        ],
      });
      return;
    }

    pushAssistantMessage({
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content:
        "Je peux t'aider sur deux choses: trouver un produit ou te guider dans l'application. Essaie par exemple « produits les moins chers », « ouvrir mon panier », « revenir à l'accueil » ou « relancer la visite guidée ».",
      actions: [
        { label: "Recherche", onClick: () => navigate("/search") },
        { label: "Accueil", onClick: () => navigate("/") },
        { label: "Guide", onClick: () => window.dispatchEvent(new Event("belivay-open-tutorial")) },
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
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed bottom-20 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:bg-primary-dark lg:bottom-6 lg:right-6"
        aria-label="Ouvrir l'assistant BelivaY"
      >
        {isOpen ? <X size={20} /> : <Bot size={22} />}
      </button>

      {isOpen && (
        <section className="fixed bottom-36 right-4 z-[70] w-[min(400px,calc(100vw-2rem))] max-h-[min(520px,calc(100vh-10rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 lg:bottom-24 lg:right-6 flex flex-col">
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
