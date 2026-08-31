import { api } from "./client";
import type { Product } from "./products";

export interface AssistantSuggestion {
  productId?: number;
  title: string;
  reason?: string;
}

export interface AssistantChatItem {
  role: "assistant" | "user";
  content: string;
}

export interface AssistantAskPayload {
  message: string;
  products?: Product[];
  path?: string;
  routeLabel?: string;
  portalRole?: string;
  history?: AssistantChatItem[];
}

export interface AssistantAskResponse {
  answer: string;
  suggestions?: AssistantSuggestion[];
  followUp?: string[];
  source?: string;
  model?: string;
  providerReady?: boolean;
  error?: string;
}

export const assistantApi = {
  ask: (payload: AssistantAskPayload) =>
    api.post<AssistantAskResponse>("/ai/catalog-assistant/", {
      products: [],
      ...payload,
    }),
};
