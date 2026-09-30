// frontend/src/i18n/domains/sl10.en.ts
// English mirror of sl10.fr.ts — "My products" / "An offer" / "New offer"
// (seller space v2, VD-08). Locked product rule: never the word "commission" —
// always "You keep X F".

export default {
  sl10_catalogue: {
    back: 'Back',
    loading: 'Loading…',
    saving: 'Saving…',
    duplicate: 'Duplicate',
    how_it_works: 'How it works',
    toast_soon: 'Coming soon',
    state_selling: 'Selling',
    state_paused: 'Paused',
    field_price: 'Sale price',
    field_price_example: 'E.g.: 14,500',
    field_price_min: 'Minimum {{min}}',
    field_price_too_low: 'The price must be at least {{min}}',
    field_stock: 'Stock',
    field_stock_example: 'E.g.: 12',
    field_condition: 'Condition',
    field_condition_placeholder: 'Choose a condition',
    field_color: 'Color',
    field_color_example: 'E.g.: Black',
    field_weight: 'Weight (kg)',
    field_weight_example: 'E.g.: 6',
    field_dimensions: 'Dimensions (cm)',
    field_dimensions_example: 'E.g.: 55 x 40 x 20',
    you_keep_per_sale: 'You keep per sale',
    you_keep_live: 'You keep {{pct}} at this price',
    offer_not_found: 'Offer not found',

    // My products
    list_title: 'My products',
    list_summary: '{{total}} products · {{selling}} selling · {{paused}} paused',
    cta_new_offer: 'New offer',
    empty_title: 'No product yet',
    empty_detail: 'Create your first offer to start selling.',
    stock_label: '{{count}} in stock',
    attention_low_stock: 'Low stock: {{count}} left',
    attention_low_stock_action: 'Restock',
    attention_dispute: 'A dispute concerns this product',
    attention_dispute_action: 'View',

    // An offer
    offer_title: 'An offer',
    your_offer_title: 'Your offer',
    field_sheet_locked: 'Product sheet (title, description, reference photos)',
    zones_title: 'Where customers see you',
    zones_unavailable: 'Comparison with other sellers is not available on this screen yet.',
    toggle_cod: 'Accept payment on pickup',
    toggle_auto_price: 'Automatic price',
    moderation_title: 'Paused',
    moderation_detail: 'This offer is not visible to customers right now.',
    cta_edit_price: 'Edit price',
    cta_edit_offer: 'Edit offer',
    cta_pause: 'Pause',
    cta_resume: 'Resume selling',
    toast_paused: 'Offer paused',
    toast_resumed: 'Offer back on sale',
    how_it_works_offer_detail: 'Your offer (price, stock, condition, real photos) belongs to you. The product sheet (title, description, reference photos) is written and controlled by BelivaY to keep a reliable catalog.',

    // New offer — common to the 4 steps
    wizard_title: 'New offer',
    cta_continue: 'Continue',
    step_name_product: 'Product',
    step_name_photos: 'Photos',
    step_name_price: 'Price',
    step_name_publish: 'Publish',
    err_missing_product: 'Choose a product before continuing',
    err_missing_photos: 'Add at least {{min}} photos',
    err_missing_condition: 'Indicate the product condition',
    err_missing_stock: 'Indicate your stock',
    err_price_too_low: 'The minimum price is 500 F',
    err_missing_dimensions: 'Weight and dimensions are required above 5 kg or 50 cm',
    seller_note_color: 'Color chosen by the seller: {{color}}',
    toast_draft_saved: 'Draft saved',

    // Step 1 — product
    step1_title: 'What product are you selling?',
    step1_search_placeholder: 'Name, brand or reference',
    step1_shortcut_barcode: 'Barcode',
    step1_shortcut_photo: 'Photo',
    step1_shortcut_dictate: 'Dictate',
    step1_searching: 'Searching…',
    step1_pick: 'This one',
    step1_no_results: 'No results for this search.',
    step1_request_sheet: 'None of these · Request a sheet',

    // Request a sheet
    sheet_request_title: 'Request a sheet',
    sheet_field_name: 'Product name',
    sheet_field_brand: 'Brand',
    sheet_field_brand_example: 'E.g.: Samsung',
    sheet_field_category: 'Category',
    sheet_field_category_example: 'E.g.: Phones',
    sheet_field_photo: 'Add a photo',
    sheet_priority_toggle: 'Priority sheet · 1,000 F',
    sheet_how_it_works_detail: 'BelivaY writes the sheet (title, description, reference photos) within 48h, or 24h with the priority option. Your offer stays in draft in the meantime.',
    sheet_cta_send: 'Send the request',
    sheet_sent_toast: 'We noted your search.',

    // Step 2 — photos
    step2_title: 'Real photos of the product',
    step2_desc: '{{min}} to {{max}} photos, taken by you, not a catalog photo.',
    step2_add: 'Add',
    step2_take_photo: 'Take a photo',
    step2_counter: '{{count}} / {{max}} photos',
    step2_too_small: 'Photo too small: retake it (800×800 px minimum)',

    // Step 3 — stock and price
    step3_title: 'Stock, condition and price',
    step3_other_settings: 'Other settings',
    step3_oversize_notice: 'Weight and dimensions are required above 5 kg or 50 cm.',
    step3_sell_more_title: 'To sell more',
    step3_sell_more_unavailable: 'The recommended price and the zones where your offer shows first will appear once comparison with other sellers is available.',

    // Step 4 — summary
    step4_title: 'Review before publishing',
    step4_untitled: 'Untitled product',
    step4_photos_count: 'Photos added',
    step4_when_money_arrives: 'When the money arrives, in 4 steps',
    step4_when_money_arrives_detail: '1) The customer pays, the money is set aside. 2) You prepare and hand it to the courier. 3) The customer confirms receipt (or it confirms automatically after a few days). 4) The money is paid to you according to your tier.',
    step4_cta_publish: 'Publish · verification within 48h',
    step4_cta_draft: 'Keep as draft',

    // Offer sent
    sent_title: 'Offer sent',
    sent_answer_before: 'Answer before {{when}}',
    sent_cta_see_products: 'See my products',
    sent_cta_add_color: 'Add another color',
    sent_note: 'Your offer is under verification. You will be notified as soon as it is visible to customers.',

    // Duplicate a product
    duplicate_title: 'Duplicate a product',
    duplicate_pick_variant: 'Which variant are you adding?',
    duplicate_other_variant: 'Other…',
    duplicate_already_created: 'Already created',
    duplicate_cta_create_draft: 'Create the draft',
    duplicate_what_is_kept: 'What is kept',
    duplicate_what_is_kept_detail: 'The sheet, reference photos, category, template, weight, dimensions, lead time and pickup payment are carried over automatically. To fill in: the variant, price, stock and real photos.',
  },
};
