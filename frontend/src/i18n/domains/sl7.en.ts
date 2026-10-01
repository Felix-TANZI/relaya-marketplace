// frontend/src/i18n/domains/sl7.en.ts
// Seller space v2 — "Orders" lot (VD-05 Orders and preparation, VD-06
// Handover, receipt and errors). Same convention as sl5.en.ts: one flat
// namespace, never the word "commission", never the customer's identity —
// always "You keep X F".

export default {
  sl7_commandes: {
    // Orders received (VD-05 §CMD-01 to CMD-10)
    list_title: 'Orders received',
    list_summary:
      '{{total}} orders · {{prep}} to prepare · {{in_progress}} with the courier · {{problems}} in dispute or return · {{done}} completed',
    filter_prep: 'To prepare',
    filter_in_progress: 'In progress',
    filter_done: 'Completed',
    filter_problems: 'Problems',
    loading: 'Loading…',
    empty_filter: 'No orders here for now.',
    anonymity_note:
      'As a protection rule, you never see the customer’s name, phone number or neighbourhood.',
    pill_problem: 'Dispute or return',
    plus_n_others: '+ {{n}} more item(s)',
    paid_at: 'Paid on {{time}}',
    item_meta_line: '×{{qty}} · {{price}}',
    courier_line_home: 'Courier {{name}} at your place',
    courier_line_relay: 'Courier {{name}} at the {{relay}} relay',
    menu_more: 'More options',
    menu_export: 'Export',
    menu_invoices: 'Invoices',
    menu_soon: 'Coming soon: no dedicated export yet.',
    you_keep: 'You keep',
    money_paid: 'Paid out',
    money_releasing: 'Releasing soon',
    money_to_pay: 'To pay on Friday',
    saving: 'Saving…',
    cta_ready: 'It’s ready',
    back: 'Back',
    why: 'Why?',
    not_found: 'Order not found.',
    how_it_works: 'How it works',
    other_actions: 'Other actions',
    back_to_list: 'Back to orders',
    back_to_order: 'Back to the order',

    // Order to prepare (VD-05 §PRE-01 to PRE-06)
    detail_title: 'Order to prepare',
    pill_paid: 'Paid',
    pill_counter: 'Pay on pickup',
    pill_to_prepare: 'To prepare',
    pill_with_courier: 'With courier',
    pill_delivered: 'Delivered',
    pill_cancelled: 'Cancelled',
    due_in: '{{time}} left',
    due_overdue: 'Deadline passed',
    due_before: 'Ready before {{time}}',
    detail_set_aside: 'Set aside: charger, cable, box if you have them.',
    detail_already_ready: 'This order is already marked ready.',
    sale_price: 'Sale price',
    pickup_title: 'Pickup at your place',
    pickup_not_assigned: 'Courier not assigned yet.',
    pickup_not_you: 'You don’t pack the parcel: the courier takes care of it.',
    pickup_how:
      'The courier checks the item, packs and seals it in front of you with BelivaY’s own material. You have no box or label to prepare.',
    action_extend: 'Need more time',
    action_stockout: 'Report an out-of-stock',
    action_slip: 'Preparation slip',
    action_journal: 'Order journal',
    action_handover: 'Hand over to the courier',

    // Out of stock (VD-05 §RUP-01 to RUP-04)
    rupture_title: 'Out of stock',
    rupture_subtitle: 'Reporting it early costs little, staying silent costs a lot.',
    rupture_consequences_title: 'What will happen',
    rupture_consequence_next_vendor:
      'Another trusted seller can take over if their price stays close to yours.',
    rupture_consequence_refund_today: 'Otherwise, the customer is refunded the same day.',
    rupture_consequence_no_fee: 'No fee for you.',
    rupture_consequence_punctuality:
      'A light effect on your Punctuality if reported before the deadline.',
    rupture_how:
      'BelivaY looks for a seller with a high Trust Score at a price close to yours; any gap is paid by BelivaY, never by the customer. On a multi-seller order, only your part is affected: you never see the other sellers.',
    rupture_toggle_stock_zero: 'Set this item’s stock to 0',
    rupture_confirm: 'Report the out-of-stock',
    rupture_cancel: 'Cancel',
    rupture_done_title: 'Out-of-stock reported',
    rupture_done_detail:
      'The customer will be taken care of automatically. You can find the details in the order journal.',

    // Need more time (VD-05 §DEL-01 to DEL-04)
    extend_title: 'Need more time',
    extend_current_due: 'Currently ready before',
    extend_choice_1h: '+ 1 hour',
    extend_choice_2h: '+ 2 hours',
    extend_choice_tomorrow: 'Tomorrow at opening',
    extend_choice_preview: 'New time: {{time}}',
    extend_choice_disabled: 'Beyond the absolute limit',
    extend_absolute_limit:
      'The absolute limit is {{time}}: no extension is possible beyond that.',
    extend_consequences_title: 'What will happen',
    extend_consequence_kept:
      'The customer and the courier are notified automatically of the new deadline.',
    extend_consequence_late:
      'A delay not kept without notice has an effect on your Punctuality.',
    extend_why:
      'Only one extension is possible per order, to keep the deadline reliable for the customer. You can never go beyond 24 hours after payment.',
    extend_confirm: 'Ask for {{choice}} more',
    extend_confirm_generic: 'Choose a new time',
    extend_already_used:
      'You already requested an extension for this order. Only one extension is allowed.',
    extend_done_title: 'Extension requested',
    extend_done_detail: 'Your request has been recorded.',

    // Preparation slip (VD-05 §BON-01/02)
    slip_title: 'Preparation slip',
    slip_document_label: 'Preparation slip',
    slip_paid_at: 'Paid on {{time}}',
    slip_deadline: 'Deadline: {{time}}',
    slip_check_title: 'To check before the courier arrives',
    slip_check_model: 'Correct model and colour',
    slip_check_tested: 'New and tested',
    slip_check_accessories: 'Charger and cable set aside',
    slip_check_box: 'Original box',
    slip_dont_close: 'Don’t close anything: the courier checks and packs in front of you.',
    slip_pickup_note:
      'The courier already knows the handover code. You have nothing to give them in writing.',
    slip_print: 'Print',
    slip_share: 'Share as PDF',

    // Order journal (VD-05 §JRN-01/02)
    journal_title: 'Order journal',
    journal_subtitle: 'Every action is signed',
    journal_immutable: 'No one can edit or delete this journal.',

    // Hand over to the courier (VD-06 §REM-01 to REM-09)
    handover_title: 'Hand over to the courier',
    handover_ready_pill: 'Ready',
    handover_code_label: 'Handover code',
    handover_code_missing: 'Code not available yet.',
    handover_show_code: 'Show the code',
    handover_hide_code: 'Hide the code',
    handover_warning: 'Only show this code after checking the courier’s face against their profile.',
    handover_how:
      'The courier enters this code on their side to confirm the handover. It works even without network.',
    write_support: 'Write to support',
    handover_other_cases_title: 'Other possible situations',
    handover_data_from: 'Latest data from {{time}}',

    // Six handover error cases (VD-06 §1.6)
    error_courier_absent_title: 'The courier didn’t show up',
    error_courier_absent_detail:
      'They will come back at the next slot. This delay does not count against you.',
    error_courier_absent_why:
      'The deadline is paused until the courier’s next visit: your deadline does not move during that time.',
    error_code_blocked_title: 'Handover blocked',
    error_code_blocked_detail:
      'Three wrong codes were entered. BelivaY has been notified; it unblocks automatically 24 hours later.',
    error_code_blocked_why: 'This safeguard protects against handing over to the wrong person.',
    error_cancelled_title: 'Order cancelled',
    error_cancelled_detail:
      'This order was cancelled before pickup. No effect on your Trust Score.',
    error_cancelled_action: 'Back to orders',
    error_cancelled_why: 'The item’s stock is returned to you automatically.',
    error_deadline_title: 'Deadline passed',
    error_deadline_detail: 'Every minute of delay counts against your Punctuality.',
    error_deadline_action: 'Contact support',
    error_deadline_why: 'Report an out-of-stock or an extension early to avoid this effect.',
    error_offline_title: 'No network',
    error_offline_detail:
      'The code still works. The action will go through automatically once the network is back.',
    error_offline_action: 'Try again',
    error_offline_why:
      'Your actions are queued and sent with their original time as soon as the network returns.',
    error_value_cap_title: 'Value cap',
    error_value_cap_detail:
      'This item is over 250,000 F: only an insured Gold delivery company can take it on.',
    error_value_cap_why: 'This cap protects the item’s value during transport.',

    // Handed over to the courier (VD-06 §REM-04/06/07/08)
    handover_done_title: 'Handed over to the courier',
    handover_done_covered: 'You’re covered',
    handover_done_covered_detail:
      'Responsibility for the item passes to the delivery company as soon as this handover happens.',
    handover_done_release:
      'This amount is released {{days}} day(s) after the customer’s confirmation, depending on your tier.',
    handover_done_photos_title: 'Proof kept on file',
    handover_done_photo_open: 'Open parcel, item visible',
    handover_done_photo_closed: 'Parcel closed and labelled',
    handover_done_photos_note:
      'These photos are automatically added to your file, timestamped and geolocated.',
    handover_done_see_receipt: 'View the receipt',
    handover_done_finish: 'Done',

    // Seller receipt (VD-06 §RCU-01 to RCU-04)
    receipt_title: 'Seller receipt',
    receipt_header: 'Seller receipt',
    receipt_document_label: 'Seller receipt',
    receipt_row_article: 'Item',
    receipt_row_ref: 'Reference',
    receipt_row_date: 'Collected on',
    receipt_row_customer: 'Customer',
    receipt_row_collected_by: 'Collected by',
    receipt_row_sale_price: 'Sale price',
    receipt_identity_masked: 'Identity hidden',
    receipt_collected_by_value: 'BelivaY, on your behalf',
    receipt_not_invoice: 'This is not a tax invoice.',
    receipt_mandatary_title: 'What does "on your behalf" mean?',
    receipt_mandatary_detail:
      'It means BelivaY collects the payment for you, then pays you back what you keep.',
    receipt_share: 'Share the receipt',
    receipt_see_documents: 'View my documents',
  },
};
