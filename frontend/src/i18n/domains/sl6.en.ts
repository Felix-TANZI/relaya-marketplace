// frontend/src/i18n/domains/sl6.en.ts
// Seller v2 "Home" screen — VD-04 / VD-D05.
// Non-negotiable rule: never the word "commission", never the total paid by
// the customer, never the customer's identity — always "You keep X F" (ACC-08).

export default {
  sl6_accueil: {
    // ── Generic page states ──────────────────────────────────────────────
    loading: 'Loading…',
    error_title: 'Could not load your home screen',
    error_retry: 'Retry',
    action_error: "This action couldn't go through in time: try again.",
    prep_access_note: 'Amounts and payouts are reserved for the shop owner.',

    // ── "To-do" list title (ACC-01) ──────────────────────────────────────
    todo_title: '{{count}} thing(s) to do',
    todo_title_one: '{{count}} thing to do',
    todo_title_other: '{{count}} things to do',

    // ── Orange hero card — most urgent order (ACC-02/03) ─────────────────
    hero_label: 'To prepare first',
    hero_untitled_product: 'Item',
    hero_due_at: 'Ready before {{time}}',
    hero_courier: 'Courier: {{name}}',
    hero_keep_label: 'You keep',
    hero_action_ready: 'Ready',
    hero_action_stockout: 'Out of stock',
    hero_action_extend: 'More time',
    hero_action_detail: 'Detail',

    // ── Soft cards: remaining orders to prepare / disputes (ACC-02/04/05) ─
    row_prepare_badge: 'To prepare',
    row_dispute_badge: 'Dispute — frozen',
    row_dispute_frozen: 'Frozen until the decision · {{amount}}',
    row_dispute_frozen_no_amount: 'Frozen until the decision.',
    row_prepare_action: 'Ready',
    row_dispute_action: 'Respond',

    // ── "Shop open" card (ACC-06/07) ─────────────────────────────────────
    shop_open: 'Shop open',
    shop_close_today: 'Close for today',
    shop_close_not_yet: 'Coming soon',

    // ── Discreet low-stock line at the bottom (ACC-06) ───────────────────
    low_stock: '{{count}} product(s) low on stock',
    low_stock_one: '{{count}} product low on stock',
    low_stock_other: '{{count}} products low on stock',

    // ── Launch tier (ACC-15/21) ──────────────────────────────────────────
    tier_bronze: 'Bronze',
    tier_silver: 'Silver',
    tier_gold: 'Gold',
    tier_platinum: 'Platinum',
    tier_title: 'The more you list, the more you keep',
    tier_current: 'Current tier: {{tier}}',
    tier_progress: '{{active}} active products out of {{next}} for the next tier',
    tier_max: 'Maximum tier reached',
    tier_how_it_works: 'How it works',
    tier_row_bronze: 'Bronze — starting tier',
    tier_row_silver: 'Silver — from {{n}} active products',
    tier_row_gold: 'Gold — from {{n}} active products',
    tier_row_platinum: 'Platinum — from {{n}} active products',

    // ── "Three gestures to get started" — Day one (ACC-14/16/21) ─────────
    gestures_title: 'Three gestures to get started',
    gesture_add_product: 'Add a product',
    gesture_set_hours: 'Set my hours',
    gesture_verify_payout: 'Verify my payout number',
    welcome_title: 'Welcome {{shop}} · day 1',

    // ── Discovery offer — Day one (KYC-05) ───────────────────────────────
    discovery_title: 'Discovery offer',
    discovery_body: 'About 3 extra points kept on every sale, from your first paid order, for 3 months or 50 orders.',

    // ── "Need help?" — Day one (A16) ──────────────────────────────────────
    help_title: 'Need help?',
    help_assisted_entry: 'Assisted entry',
    help_whatsapp: 'WhatsApp support',

    // ── "Nothing to do" (ACC-10/20) ──────────────────────────────────────
    empty_title: 'Nothing to do for now',
    empty_cta_intro: 'An idea to sell more',
    empty_cta_action: 'Add this product',

    earnings_title: 'Earned with BelivaY',
    earnings_releasing: '{{amount}} more coming soon',
    earnings_next_payout: 'Next payout {{date}}: {{amount}}',
    earnings_no_next_payout: 'No payout pending right now.',
    earnings_recap_orders: '{{count}} order(s)',
    earnings_recap_orders_one: '{{count}} order',
    earnings_recap_orders_other: '{{count}} orders',
    earnings_zero_unpaid: '0 F unpaid',
    earnings_zero_transport: '0 F transport fees',
    earnings_see_tier: 'See my tier',

    // ── Offline (OFF-01 to 05) ────────────────────────────────────────────
    offline_banner: 'No connection. Data from {{time}}.',
    offline_banner_no_data: 'No connection.',
    offline_retry: 'Retry',
    offline_empty: 'No cached tasks right now. Reconnect to reload.',

    // ── Suspended account (SUS-01 to 03) ─────────────────────────────────
    suspended_title: 'Account suspended',
    suspended_intro: '{{shop}}, your seller access is currently suspended.',
    suspended_reason_fallback: "The detailed reason for this decision will be shared by our team. Contact support if you haven't received it yet.",
    suspended_allowed_title: 'What you can still do',
    suspended_allowed_1: 'Prepare orders already received',
    suspended_allowed_2: 'View your money',
    suspended_blocked_title: "What's blocked",
    suspended_blocked_1: 'Receive new orders',
    suspended_blocked_2: 'Publish or edit products',
    suspended_contest_action: 'Contest this decision',
    suspended_contest_hint: 'Only one contest allowed. Our team replies within 72 business hours.',
  },
};
