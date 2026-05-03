import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import type { Product } from "@/services/api/products";
import { getCatalogAssistantResponse } from "./catalogAssistant";

interface CatalogAssistantPanelProps {
  products: Product[];
  selectedCategoryName: string;
  filters: {
    promoOnly: boolean;
    inStockOnly: boolean;
    minRating: number;
  };
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

// QUICK_PROMPTS moved inside component to use t()

export default function CatalogAssistantPanel({
  products,
  selectedCategoryName,
  filters,
}: CatalogAssistantPanelProps) {
  const { t } = useTranslation();

  const QUICK_PROMPTS = [
    t('assistant.best_value'),
    t('assistant.best_promos'),
    t('assistant.reliable_product'),
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content: t('assistant.intro'),
    },
  ]);
  const [suggestedProducts, setSuggestedProducts] = useState<
    { productId: number; title: string; reason: string }[]
  >([]);
  const [followUpPrompts, setFollowUpPrompts] = useState<string[]>(QUICK_PROMPTS);
  const [assistantMeta, setAssistantMeta] = useState<{
    source: "mock" | "openrouter";
    providerReady: boolean;
    model?: string;
  }>({
    source: "mock",
    providerReady: false,
  });

  const visibleProducts = useMemo(() => products.slice(0, 12), [products]);

  const handleAsk = async (prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setMessages((previous) => [
      ...previous,
      { id: `user-${Date.now()}`, role: "user", content: trimmedPrompt },
    ]);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await getCatalogAssistantResponse({
        message: trimmedPrompt,
        products: visibleProducts,
        selectedCategoryName,
        filters,
      });

      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.answer,
        },
      ]);
      setSuggestedProducts(response.suggestions);
      setFollowUpPrompts(response.followUp);
      setAssistantMeta({
        source: response.source,
        providerReady: response.providerReady,
        model: response.model,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] hover:bg-primary-dark"
      >
        {isOpen ? <X size={18} /> : <Bot size={18} />}
        {t('assistant.catalog_assistant')}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-4 z-40 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-orange-100 bg-[#fff8f1] px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <Sparkles size={14} />
                  {assistantMeta.source === "openrouter" ? t('assistant.openrouter_active') : t('assistant.fallback_mode')}
                </p>
                <h2 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  {t('assistant.title')}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {assistantMeta.source === "openrouter"
                    ? t('assistant.using_model', { model: assistantMeta.model || "OpenRouter" })
                    : t('assistant.fallback_description')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-white hover:text-primary dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
            {messages.map((chatMessage) => (
              <div
                key={chatMessage.id}
                className={`flex ${chatMessage.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 ${
                    chatMessage.role === "user"
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                >
                  {chatMessage.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-3xl bg-gray-100 px-4 py-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                  {t('assistant.analyzing')}
                </div>
              </div>
            )}

            {suggestedProducts.length > 0 && (
              <div className="rounded-3xl border border-orange-100 bg-[#fffaf5] p-4 dark:border-gray-700 dark:bg-gray-800/70">
                <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  {t('assistant.recommended')}
                </p>
                <div className="space-y-3">
                  {suggestedProducts.map((suggestion) => (
                    <div
                      key={suggestion.productId}
                      className="rounded-2xl bg-white p-3 shadow-sm dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {suggestion.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                            {suggestion.reason}
                          </p>
                        </div>
                        <Link
                          to={`/product/${suggestion.productId}`}
                          className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                        >
                          {t('assistant.view')}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-orange-100 px-5 py-4 dark:border-gray-700">
            <div className="mb-3 flex flex-wrap gap-2">
              {followUpPrompts.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleAsk(prompt)}
                  className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-orange-100 dark:bg-primary/10 dark:hover:bg-primary/20"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleAsk(message);
              }}
              className="flex items-end gap-3"
            >
              <div className="relative flex-1">
                <MessageCircle className="pointer-events-none absolute left-4 top-3.5 text-gray-400" size={18} />
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={2}
                  placeholder={t('assistant.placeholder')}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
