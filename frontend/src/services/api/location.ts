import { api } from "./client";

export interface LocationSemanticMatch {
  label: string;
  reason: string;
}

export interface LocationPrecisionResult {
  normalizedAddress: string;
  city: string;
  district: string;
  landmarks: string[];
  driverHint: string;
  precisionScore: number;
  precisionLabel: "faible" | "moyen" | "bon" | "excellent";
  needsMoreDetail: boolean;
  followUpQuestion: string;
  warnings: string[];
  semanticMatches: LocationSemanticMatch[];
  source: "openrouter" | "local-fallback";
  providerReady: boolean;
  model: string;
  error?: string;
}

export const locationApi = {
  refine: (payload: { city: string; address: string }) =>
    api.post<LocationPrecisionResult>("/ai/location-assistant/", payload),
};
