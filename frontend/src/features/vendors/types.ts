// frontend/src/features/vendors/types.ts
// Types TypeScript pour l'intégralité de l'espace vendeur BelivaY

// ─────────────────────────────────────────────
// PROFIL & STATUT VENDEUR
// ─────────────────────────────────────────────

export type VendorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type VendorPlan = 'starter' | 'pro' | 'elite' | 'business';

export interface VendorProfile {
  id: number;
  username: string;
  email: string;
  business_name: string;
  business_description: string;
  phone: string;
  address: string;
  city: string;
  id_document: string;
  status: VendorStatus;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export interface VendorApplication {
  business_name: string;
  business_description: string;
  phone: string;
  address: string;
  city: string;
  id_document?: string;
}

// ─────────────────────────────────────────────
// STATISTIQUES
// ─────────────────────────────────────────────

export interface VendorStats {
  total_products: number;
  active_products: number;
  total_orders: number;
  total_revenue: number;
  // Champs additionnels (seront ajoutés côté backend)
  pending_orders?: number;
  revenue_this_month?: number;
  revenue_last_month?: number;
  revenue_trend?: number;           // % variation
  orders_trend?: number;            // % variation
  avg_order_value?: number;
  conversion_rate?: number;
  views_this_month?: number;
}

// Données du graphique de ventes (7 derniers jours / 30 jours / 12 mois)
export interface SalesChartData {
  label: string;   // ex: "Lun", "Mar", "01 Jan"
  amount: number;  // montant en XAF
  orders: number;  // nombre de commandes
}

// ─────────────────────────────────────────────
// PRODUITS
// ─────────────────────────────────────────────

export interface ProductImage {
  id: number;
  image: string;
  image_url: string;
  is_primary: boolean;
  order: number;
  created_at: string;
}

export interface VendorProduct {
  id: number;
  title: string;
  description: string;
  price_xaf: number;
  stock_quantity: number;
  category: number;
  category_name?: string;
  is_active: boolean;
  images: ProductImage[];
  primary_image_url?: string;
  created_at: string;
  updated_at: string;
  views?: number;
  sales_count?: number;
}

export interface ProductFormData {
  title: string;
  description: string;
  price_xaf: string;
  stock_quantity: string;
  category: string;
  is_active: boolean;
}

// ─────────────────────────────────────────────
// COMMANDES
// ─────────────────────────────────────────────

export type PaymentStatus  = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type FulfillmentStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface VendorOrderItem {
  id: number;
  product: number;
  product_title: string;
  product_image?: string;
  quantity: number;
  unit_price_xaf: number;
  line_total_xaf: number;
}

export interface VendorOrder {
  id: number;
  reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  items: VendorOrderItem[];
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  total_xaf: number;
  shipping_address?: string;
  shipping_city?: string;
  created_at: string;
  updated_at: string;
  tracking_number?: string;
}

export interface VendorOrderFilters {
  payment_status?: PaymentStatus;
  fulfillment_status?: FulfillmentStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface UpdateFulfillmentStatusPayload {
  fulfillment_status: FulfillmentStatus;
  tracking_number?: string;
}

// ─────────────────────────────────────────────
// PAIEMENTS / ESCROW
// ─────────────────────────────────────────────

export type EscrowStatus = 'blocked' | 'pending' | 'released' | 'refunded';

export interface VendorPayment {
  id: number;
  order: string;        // référence commande
  product: string;      // nom produit
  gross_amount: number; // montant brut
  commission: number;   // commission plateforme
  net_amount: number;   // montant net vendeur
  escrow_status: EscrowStatus;
  date: string;
  date_ts: number;
  release_date?: string;
}

export interface VendorPaymentStats {
  balance: number;           // solde disponible
  pending_escrow: number;    // en séquestre
  total_earned: number;      // total gagné (vie)
  month_revenue: number;     // revenus ce mois
  commission_rate: number;   // taux commission (%)
  next_payout_date?: string; // prochain reversement
}

// ─────────────────────────────────────────────
// WALLET (COMPTE BELIVAY)
// ─────────────────────────────────────────────

export type WalletTxnType = 'deposit' | 'withdrawal' | 'earning' | 'subscription' | 'boost';
export type MobileOperator = 'orange' | 'mtn';
export type WithdrawalMethod = 'momo' | 'bank';

export interface WalletBalance {
  available: number;    // solde disponible
  pending: number;      // en attente
  total_earned: number; // total gagné
  total_withdrawn: number; // total retiré
}

export interface WalletTransaction {
  id: number;
  type: WalletTxnType;
  label: string;
  sub_label?: string;
  amount: number;
  sign: 1 | -1;          // +1 crédit, -1 débit
  status: 'completed' | 'pending' | 'failed';
  reference: string;
  date: string;
  date_ts: number;
}

export interface DepositRequest {
  method: 'momo' | 'bank';
  operator?: MobileOperator;
  phone?: string;
  amount: number;
}

export interface WithdrawalRequest {
  method: WithdrawalMethod;
  operator?: MobileOperator;
  phone?: string;
  bank_account_id?: number;
  amount: number;
}

export interface BankAccount {
  id: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  rib?: string;
  is_default: boolean;
}

// ─────────────────────────────────────────────
// LITIGES
// ─────────────────────────────────────────────

export type DisputeStatus = 'open' | 'vendor_replied' | 'in_review' | 'resolved' | 'escalated';
export type DisputeReason = 'not_received' | 'not_as_described' | 'damaged' | 'other';

export interface DisputeMessage {
  id: number;
  author: 'customer' | 'vendor' | 'admin';
  author_name: string;
  message: string;
  created_at: string;
  attachments?: string[];
}

export interface VendorDispute {
  id: number;
  reference: string;
  order_reference: string;
  product_title: string;
  customer_name: string;
  reason: DisputeReason;
  status: DisputeStatus;
  amount_disputed: number;
  messages: DisputeMessage[];
  created_at: string;
  updated_at: string;
  deadline?: string;
}

// ─────────────────────────────────────────────
// BOUTIQUE
// ─────────────────────────────────────────────

export interface ShopProfile {
  id: number;
  business_name: string;
  business_description: string;
  logo_url?: string;
  banner_url?: string;
  city: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  social_facebook?: string;
  social_instagram?: string;
  rating: number;
  reviews_count: number;
  total_sales: number;
  member_since: string;
  is_verified: boolean;
  response_rate?: number;
  response_time?: string;
}

// ─────────────────────────────────────────────
// CERTIFICATIONS
// ─────────────────────────────────────────────

export type CertLevel = 'bronze' | 'silver' | 'gold' | 'elite';

export interface CertTier {
  level: CertLevel;
  label: string;
  min_sales: number;
  max_sales: number | null;
  commission_rate: number;
  benefits: string[];
  badge_color: string;
}

export interface VendorCertification {
  current_level: CertLevel;
  next_level: CertLevel | null;
  current_sales: number;
  sales_to_next: number | null;
  progress_percent: number;
  tiers: CertTier[];
}

// ─────────────────────────────────────────────
// PLANS & ABONNEMENTS
// ─────────────────────────────────────────────

export interface PlanFeature {
  label: string;
  included: boolean;
  limit?: string;
}

export interface SubscriptionPlan {
  id: VendorPlan;
  name: string;
  price_monthly: number;   // FCFA/mois
  commission_rate: number; // %
  max_products: number | null;
  features: PlanFeature[];
  is_popular: boolean;
  badge_color?: string;
}

export interface CurrentSubscription {
  plan: VendorPlan;
  plan_name: string;
  started_at: string;
  next_billing_date: string;
  commission_rate: number;
  max_products: number | null;
  products_used: number;
}

// ─────────────────────────────────────────────
// ANALYTIQUES
// ─────────────────────────────────────────────

export interface HeatmapHour {
  hour: number;       // 0-23
  sales: number;      // nombre de ventes
  revenue: number;    // XAF
  intensity: number;  // 0-1 (normalisé)
}

export interface HeatmapDay {
  day: string;        // 'Lun', 'Mar', ...
  sales: number;
  revenue: number;
  intensity: number;
}

export interface TopProduct {
  id: number;
  title: string;
  image_url?: string;
  sales_count: number;
  revenue: number;
  trend: number;      // % variation
}

export interface AnalyticsData {
  hourly_heatmap: HeatmapHour[];
  daily_heatmap: HeatmapDay[];
  top_products: TopProduct[];
  conversion_rate: number;
  avg_session_duration: number;
  bounce_rate: number;
  revenue_forecast: number;
  forecast_confidence: number;
}

// ─────────────────────────────────────────────
// BOOST & PUBLICITÉ
// ─────────────────────────────────────────────

export type BoostType = 'homepage' | 'category' | 'search' | 'flash_sale';

export interface BoostOption {
  type: BoostType;
  name: string;
  description: string;
  price_daily: number;   // FCFA/jour
  duration_days: number;
  reach_estimate: string;
  features: string[];
  is_pro_only: boolean;
  badge?: string;
}

export interface ActiveBoost {
  id: number;
  type: BoostType;
  product_id: number;
  product_title: string;
  start_date: string;
  end_date: string;
  amount_paid: number;
  impressions: number;
  clicks: number;
  status: 'active' | 'completed' | 'paused';
}

// ─────────────────────────────────────────────
// NAVIGATION SIDEBAR
// ─────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number | null;
  badgeColor?: 'red' | 'green' | 'orange' | 'violet';
  proLocked?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}