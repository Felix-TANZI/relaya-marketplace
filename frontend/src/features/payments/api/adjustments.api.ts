// frontend/src/features/payments/api/adjustments.api.ts
// Ajustements et grille tarifaire — espace partenaire.

import { api } from '@/services/api/client';

import type { Adjustment, RelayTariffLine } from '../model/adjustment.types';

const BASE = '/api/payments/v2/partner';

export const adjustmentsApi = {
  /** Penalites et bonus, AVEC leur motif. */
  list: () => api.get<Adjustment[]>(`${BASE}/adjustments/`),

  /** Grille tarifaire d'un point relais — son contrat rendu lisible. */
  relayTariff: () => api.get<RelayTariffLine[]>(`${BASE}/relay-tariff/`),
};