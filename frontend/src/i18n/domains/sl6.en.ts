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
    // "Prep access" note (ACC-26) — shown at the bottom of the page ("Accueil_prep" state),
    // right before the network footer, never at the top: amounts are already hidden above.
    prep_access_note: 'Amounts and payouts are reserved for the shop owner.',
    // Identity bar + greeting in prep access mode — staffFirstName comes from the role
    // session (not modelled server-side yet, ACC-26): with no known first name we fall back
    // to the generic label below instead of inventing a name.
    prep_role_label: 'Prep access',
    prep_role_label_named: '{{name}} · prep access',
    greeting_prep: 'Hello {{name}} · prep access',

    // ── Personalised greeting, above "Shop open" (ACC-gap) ───────────────
    greeting: 'Hello {{name}} · {{date}}',

    // ── "To-do" list title (ACC-01) ──────────────────────────────────────
    todo_title: '{{count}} thing(s) to do',
    todo_title_one: '{{count}} thing to do',
    todo_title_other: '{{count}} things to do',

    // ── Categorised pills under the title, when the queue mixes several
    // types ("2 to prepare · 2 disputes · 1 return", ACC-01) ─────────────
    todo_pill_prepare: '{{count}} to prepare',
    todo_pill_prepare_one: '{{count}} to prepare',
    todo_pill_prepare_other: '{{count}} to prepare',
    todo_pill_dispute: '{{count}} dispute(s)',
    todo_pill_dispute_one: '{{count}} dispute',
    todo_pill_dispute_other: '{{count}} disputes',
    todo_pill_return: '{{count}} return(s)',
    todo_pill_return_one: '{{count}} return',
    todo_pill_return_other: '{{count}} returns',

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

    // ── Soft cards: remaining orders to prepare / disputes / returns (ACC-02/04/05/06) ─
    row_prepare_badge: 'To prepare',
    row_dispute_badge: 'Dispute — frozen',
    row_dispute_frozen: 'Frozen until the decision · {{amount}}',
    row_dispute_frozen_no_amount: 'Frozen until the decision.',
    row_dispute_frozen_label: 'Frozen amount',
    row_dispute_reason: 'The customer says: "{{reason}}"',
    row_dispute_deadline: 'Respond before {{when}}. With no response, the decision is made in the customer\'s favour.',
    row_dispute_mediation: 'Your response was sent — BelivaY will decide.',
    row_prepare_action: 'Ready',
    row_dispute_action: 'Respond',
    row_dispute_action_view: 'View',
    row_paid_at: 'Paid at {{time}}',
    row_courier_unassigned: 'No courier assigned yet',

    row_return_badge: 'Return',
    row_return_reason: 'Reason: {{reason}}',
    row_return_frozen_review: 'Frozen until your decision',
    row_return_frozen_transit: 'Frozen until it reaches you',
    row_return_frozen_inspection: 'Frozen until inspection',
    row_return_inspection_deadline: 'You have until {{when}} to inspect it.',
    row_return_action: 'View the return',
    return_reason_not_as_described: 'Not as described',
    return_reason_damaged: 'Damaged',
    return_reason_counterfeit: 'Counterfeit',
    return_reason_hidden_defect: 'Hidden defect',

    // ── "Shop open" card (ACC-06/07) ─────────────────────────────────────
    shop_open: 'Shop open',
    shop_close_today: 'Close for today',
    shop_close_not_yet: 'Coming soon',
    // ── "Shop closed today" card (FermeAujourdhui.html mockup gap) ────────
    shop_closed_today: 'Closed today',
    shop_reopen_now: 'Reopen now',
    shop_closed_banner_title: 'Shop closed today',
    shop_closed_banner_body: 'New orders are going to other sellers until tomorrow 8 AM. {{count}} order(s) already received still need to be prepared.',
    shop_closed_banner_body_zero: 'New orders are going to other sellers until tomorrow 8 AM.',
    shop_close_toast: "Closing isn't connected to the server yet: this is a visual preview only, nothing is saved.",
    shop_reopen_toast: "Reopening isn't connected to the server yet: this is a visual preview only, nothing is saved.",

    // ── Discreet low-stock line at the bottom (ACC-06) ───────────────────
    low_stock: '{{count}} product(s) low on stock',
    low_stock_one: '{{count}} product low on stock',
    low_stock_other: '{{count}} products low on stock',
    low_stock_title: 'Low stock · {{title}}',
    low_stock_detail: '{{count}} left, threshold set at {{threshold}}',
    low_stock_detail_one: '{{count}} left, threshold set at {{threshold}}',
    low_stock_detail_other: '{{count}} left, threshold set at {{threshold}}',
    low_stock_action: 'Restock',

    // ── Bottom of page — network state (ACC-gap) ─────────────────────────
    network_footer: 'Connected · no action waiting to send',

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
    welcome_title: 'Welcome {{name}} · day 1',

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
    // ── Second explanatory banner (HorsLigne.html mockup gap) ──────────────
    offline_sync_info: 'Offline — preparation and the handover code work without network.',
    // "Handover code" button on "to prepare" cards while offline: opens the
    // real handover screen (commandes/HandoverPage.tsx), already able to read
    // shipment.pickup_confirmation_code from local cache (REM-05).
    row_handover_action: 'Handover code',
    // Dedicated "Handover code" card (sync queue): no seller action queue
    // exists yet (see OfflineBanner.tsx comment) — count and log stay
    // honestly empty until it's wired up.
    offline_sync_card_title: 'Handover code',
    offline_sync_card_count: '{{count}} action(s) pending',
    offline_sync_card_count_zero: 'No action pending',
    offline_sync_card_details: 'Details',
    offline_sync_card_retry: 'Retry',
    offline_sync_card_log_empty: 'No action logged yet.',
    offline_sync_card_expiry_warning: 'Past 72 h offline, pending actions are automatically cancelled.',
    offline_how_rule_1: 'Already-loaded orders stay visible offline, without amounts until they are re-verified.',
    offline_how_rule_2: 'The handover code for the courier stays available: it is already on your phone, no network needed to read it.',
    offline_how_rule_3: "Other actions (e.g. \"It's ready\") still need a connection: they will fail until automatic sync is built.",

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

    // ── "Your score is close to a tier" — "Accueil_alerte" state (ACC-gap) ──
    // Real tier and points (vendorsApi.getCertifications(), same bridge as
    // MonPalierPage.tsx). Not all 3 figures from the mockup (today's orders,
    // disputes, remaining delivered orders) are available: only the first two
    // are (accueil's real queues) — the 3rd is left out rather than invented.
    score_approaching_title: 'Your score is close to {{tier}}',
    score_approaching_points: '{{count}} point(s) left to reach {{tier}}.',
    score_approaching_points_one: '{{count}} point left to reach {{tier}}.',
    score_approaching_points_other: '{{count}} points left to reach {{tier}}.',
    score_approaching_bonus: "You'll keep up to {{pct}}% more commission.",
    score_approaching_action_prepare: 'Prepare {{count}} order(s) on time today',
    score_approaching_action_dispute: 'Respond to {{count}} dispute(s) before the deadline',
    score_approaching_cta_tier: 'See my tier',
    score_approaching_dismiss: 'Dismiss',
  },
};
