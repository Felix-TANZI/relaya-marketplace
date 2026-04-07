// frontend/src/services/api/vendorChart.ts
// Service API pour les données analytiques du dashboard vendeur.

import { http } from './http';


// TYPES


export interface ChartBar {
  label:  string;
  value:  number;
  orders: number;
}

export interface ChartResponse {
  period: '7d' | '30d' | '12m';
  data:   ChartBar[];
}

export type ChartPeriod = '7d' | '30d' | '12m';

export interface HeatmapHour {
  hour:      number;
  orders:    number;
  revenue:   number;
  intensity: number;
}

export interface HeatmapDay {
  day:       string;
  orders:    number;
  revenue:   number;
  intensity: number;
}

export interface HeatmapResponse {
  hours: HeatmapHour[];
  days:  HeatmapDay[];
}

export interface LowStockItem {
  id:             number;
  title:          string;
  stock_quantity: number;
}

export interface TopProduct {
  id:          number;
  title:       string;
  revenue:     number;
  sales_count: number;
  image_url:   string | null;
}

export interface FullStatsResponse {
  // Revenus
  total_revenue:        number;
  monthly_revenue:      number;
  revenue_trend:        number | null;
  // Commandes
  total_orders:         number;
  monthly_orders:       number;
  orders_trend:         number | null;
  pending_orders_count: number;
  // Produits
  total_products:       number;
  active_products:      number;
  low_stock_products:   number;
  low_stock_items:      LowStockItem[];
  // Clients
  unique_customers:     number;
  total_sales_count:    number;
  // Métriques
  avg_order_value:      number;
  return_rate:          number;
  fulfillment_rate:     number;
  // Note
  shop_rating:          number | null;
  reviews_count:        number;
  // Top produits
  top_products:         TopProduct[];
}


// API


function authHeaders() {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${token}`,
  };
}

export const vendorChartApi = {
  getFullStats:  (): Promise<FullStatsResponse> =>
    http<FullStatsResponse>('/api/vendors/full-stats/', { headers: authHeaders() }),

  getChartData:  (period: ChartPeriod = '7d'): Promise<ChartResponse> =>
    http<ChartResponse>(`/api/vendors/chart/?period=${period}`, { headers: authHeaders() }),

  getHeatmap:    (): Promise<HeatmapResponse> =>
    http<HeatmapResponse>('/api/vendors/heatmap/', { headers: authHeaders() }),
};