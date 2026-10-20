export default {
  sl1_dashboard: {
    // Plans
    plan_free: 'Free',
    plan_starter: 'Starter',
    plan_pro: 'Pro',
    plan_business: 'Business',

    // Order fulfillment statuses
    fulfill_pending: 'To confirm',
    fulfill_processing: 'Processing',
    fulfill_shipped: 'Ready',
    fulfill_delivered: 'Delivered',
    fulfill_cancelled: 'Cancelled',

    see_all: 'See all',

    // Shop approval states
    retry: 'Retry',
    refresh: 'Refresh',
    pending_title: 'Application under review',
    pending_desc_before: 'Our team is reviewing your application for ',
    pending_desc_after: '. Turnaround: 24–48 business hours.',
    rejected_title: 'Application rejected',
    rejected_desc_before: 'The application for ',
    rejected_desc_after: 'was not approved.',
    contact_support: 'Contact support',
    suspended_title: 'Shop suspended',
    suspended_desc_after: 'is temporarily suspended.',

    // Hero
    badge_plan_free: 'Free Plan',
    greeting: 'Hello, {{name}}',
    monthly_revenue_kicker: 'Monthly revenue',
    vs_last_month: '{{value}}% vs last month',
    orders_label: 'Orders',
    orders_pending: '{{count}} pending',
    unique_customers_label: 'Unique customers',
    add_product: 'Add a product',
    plan_summary_line: '{{count}} product · 20% commission · 0 boost',
    plan_summary_line_plural: '{{count}} products · 20% commission · 0 boost',
    upgrade_to_pro: 'Upgrade to Pro',

    // Milestones
    milestone_shop_created: 'Shop created',
    milestone_first_product: 'First product',
    milestone_first_sale: 'First sale',
    milestone_first_review: 'First review',
    milestone_first_boost: 'First boost',
    milestone_pro_plan: 'Pro plan',

    // Pro banner
    pro_banner_title: 'Unlock the Pro Plan · 7 days free',
    pro_banner_desc: '10% commission · AI Analytics · 3 boosts included · 24/7 support',
    view_plans: 'View plans',

    // KPI cards
    avg_order_sub: '{{amount}} avg cart',
    orders_total: '{{count}} total',
    units_sold: '{{count}} units sold',
    shop_rating_label: 'Shop rating',
    reviews_count: '{{count}} customer reviews',
    total_sales: '{{count}} total sales',

    // Quick actions
    action_add_product: 'Add product',
    action_payments: 'Payments',
    action_disputes: 'Disputes',
    action_reviews: 'Reviews',
    action_boost: 'Boost',
    share_shop: 'Share shop',

    // Plan chips
    chip_products: '{{count}} product',
    chip_products_plural: '{{count}} products',
    chip_commission: '20% commission',
    chip_boost: '0 boost',
    chip_analytics_ai: 'AI Analytics',
    chip_heatmap: 'Heatmap',

    // Goal
    goal_title: 'Monthly goal',
    edit: 'Edit',
    goal_target: 'out of {{amount}} target',
    goal_remaining_label: 'Still',
    goal_reached: 'Goal reached!',

    // Upgrade tip
    upgrade_tip_before: 'Upgrade to the ',
    upgrade_tip_after: ' plan to reduce your commission from 20% to 18% and unlock boosts.',

    fulfillment_rate_short: 'Fulfillment rate',
    return_rate_short: 'Return rate',
    fulfillment_rate_full: 'Fulfillment rate',
    return_rate_full: 'Return rate',

    // Revenue chart
    revenue_chart_title: 'Revenue',
    chart_total: 'Total:',
    chart_avg: 'Avg:',
    period_7d: '7d',
    period_30d: '30d',
    period_12m: '12m',
    no_sales_period: 'No sales in this period',

    // Plan simulator
    plan_sim_title: 'Simulate another plan',
    sim_revenue_label: 'Estimated revenue',
    sim_commission_label: 'Commission',
    sim_savings_label: 'Savings',

    // Heatmap
    heatmap_title: 'Sales heatmap',
    heatmap_subtitle: 'Activity over the last 30 days',
    heatmap_days_label: 'Days of the week',
    heatmap_hours_label: 'Hours (0am → 11pm)',
    heat_low: 'Low',
    heat_high: 'High',
    orders_abbr: 'ord',

    // Stock alerts
    stock_alerts_title: 'Stock alerts',
    stock_all_ok: 'All stock levels are OK',
    out_of_stock: 'Out of stock',
    units_remaining: '{{count}} unit left',
    units_remaining_plural: '{{count}} units left',
    restock_short: 'Restock',

    // Performance
    performance_title: 'Quick performance',
    fulfillment_rate_sub: 'Delivered vs paid orders',
    return_rate_sub: 'Refunds',
    satisfaction_label: 'Satisfaction',
    no_reviews_yet: 'No reviews yet',
    avg_cart_label: 'Average cart',
    avg_cart_sub: 'Average value per order',

    // Recent orders
    recent_orders_title: 'Recent orders',
    no_orders_yet: 'No orders yet',

    // Top products
    top_products_title: 'Top products',
    no_sales_recorded: 'No sales recorded',
    sales_count: '{{count}} sales',

    // Products table
    my_products_title: 'My products',
    no_products_yet: 'No products yet',
    create_first_product: 'Create my first product',
    th_product: 'Product',
    th_price: 'Price',
    th_stock: 'Stock',
    th_status: 'Status',
    status_active: 'Active',
    status_inactive: 'Inactive',

    // Reviews
    customer_reviews_title: 'Customer reviews',
    reviews_short: '{{count}} reviews',
    view_my_shop: 'View my shop',

    // Toasts / confirmations
    toast_load_error: 'Loading error',
    confirm_delete_product: 'Delete this product?',
    toast_deleted: 'Deleted',
    toast_error: 'Error',
    toast_link_copied: 'Link copied!',
  },

  sl1_become_seller: {
    already_seller_title: 'You are already a seller',
    already_seller_desc: 'The seller form is no longer shown because your BelivaY shop is active.',
    open_seller_space: 'Open seller space',
    back_to_profile: 'Back to profile',
  },

  sl1_shop: {
    page_title: 'My Shop',
    page_subtitle: 'Configuration and presentation',
    saving: 'Saving…',
    save_button: 'Save',

    tier_bronze: 'Bronze',
    tier_silver: 'Silver',
    tier_gold: 'Gold',
    tier_diamond: 'Diamond',

    field_business_name: 'Shop name',
    field_business_description: 'Description',
    field_city: 'City',
    field_address: 'Address',

    mod_request_pending: 'Modification request in progress — #{{id}}',
    status_label: 'Status:',
    docs_required_admin_note: ' — The admin is requesting additional documents.',
    admin_note_label: 'BelivaY note:',

    no_banner: 'No banner — click to add one',
    edit_banner: 'Edit banner',
    banner_alt: 'banner',

    default_shop_name: 'My Shop',
    shop_photo_alt: 'shop photo',
    status_online: 'Online',
    status_offline: 'Offline',
    active_label: 'Active',
    paused_label: 'Paused',

    official_info_title: 'Official information',
    official_info_desc: 'This information matches your official documents. Any change is subject to BelivaY validation.',
    request_mod_button: 'Request a modification',

    contact_title: 'Contact & availability',
    whatsapp_label: 'WhatsApp phone',
    whatsapp_hint: 'Displayed on your public BelivaY page.',

    qr_title: 'BelivaY QR Code',
    qr_desc: 'Display this code in your physical shop. Your customers scan it and go straight to BelivaY.',
    copied_label: 'Copied',
    copy_label: 'Copy',
    download_label: 'Download',

    our_locations_title: 'Our locations',
    locations_active: '{{count}} active location',
    locations_active_plural: '{{count}} active locations',
    main_badge: 'Main',
    secondary_badge: 'Secondary',
    representative_label: 'Representative',
    visible_on_map: 'Visible on the map',

    physical_locations_title: 'Physical locations',
    physical_locations_hint: 'Required for BelivaY to validate your shop and be able to find you.',
    add_button: 'Add',
    main_shop_required: 'Main shop required',
    add_address_hint: 'Add an address with a map position or an access description.',
    repr_short_label: 'Rep.:',
    located_on_map: 'Located on the map',

    map_section_title: 'Locations on the map',
    locations_located: '{{count}} location found',
    locations_located_plural: '{{count}} locations found',

    // ModRequestModal
    toast_select_field: 'Select at least one field.',
    toast_reason_required: 'A justification is required.',
    toast_fill_values: 'Fill in the new values.',
    generic_error: 'Error',
    toast_request_sent: 'Request sent to BelivaY.',
    request_mod_title: 'Request a modification',
    request_pending: 'Request in progress — #{{id}}',
    docs_required_note: ' — Documents are being requested from you.',
    docs_required_label: 'Documents requested:',
    official_info_notice: 'This information is tied to your official documents and subject to BelivaY validation under Cameroonian regulations.',
    fields_to_modify: 'Fields to modify',
    current_value_label: 'Current:',
    new_value_placeholder: 'New value for {{label}}',
    justification_label: 'Justification',
    justification_placeholder: 'E.g.: Company name change following RCCM registration…',
    attachments_label: 'Attachments (optional)',
    attach_documents: 'Attach documents',
    sending: 'Sending…',
    send_request: 'Send request',

    // LocationModal
    edit_location_title: 'Edit location',
    add_location_title: 'Add a location',
    gps_hint: 'GPS coordinates allow display on the map.',
    section_info: 'Information',
    location_name_label: 'Location name',
    location_name_placeholder: 'E.g.: Safara Mokolo',
    address_label: 'Full address',
    address_placeholder: 'Mokolo Market, Yaoundé, Cameroon',
    locate_button: 'Locate',
    address_not_found: 'Address not found. Click on the map to position manually.',
    position_found: 'Position found — drag the marker to adjust.',
    access_description_label: 'Access description',
    access_description_placeholder: 'E.g.: orange gate behind the pharmacy, 2nd floor, call the representative on arrival',
    access_description_hint: 'Pin the shop on the map or add a precise access description.',
    phone_label: 'Phone',
    email_label: 'Email',
    section_representative: 'On-site representative',
    name_label: 'Name',
    section_map_position: 'Position on the map',
    map_required_hint: 'Required if no precise description',
    use_gps_button: 'Use my current GPS position',
    gps_unavailable: 'Position unavailable — allow geolocation or position manually on the map.',
    drag_marker_hint: 'Drag the marker to precisely adjust the position.',
    click_map_hint: 'Click on the map to position your location.',
    location_fallback_name: 'Location',
    drag_to_adjust: 'Drag to adjust',
    latitude_label: 'Latitude',
    longitude_label: 'Longitude',
    coords_auto_hint: 'Coordinates auto-filled via the map. Editable manually if needed.',
    main_center_label: 'Main center',
    main_center_hint: 'Other locations automatically become secondary.',
    save_changes: 'Save changes',
    add_location_button: 'Add this location',

    // Main page toasts
    toast_load_error: 'Loading error',
    toast_shop_updated: 'Shop updated',
    toast_save_error: 'Error while saving',
    toast_photo_updated: 'Photo updated',
    toast_photo_error: 'Photo upload error',
    toast_banner_updated: 'Banner updated',
    toast_banner_error: 'Banner upload error',
    toast_link_copied: 'Link copied',
    toast_location_updated: 'Location updated',
    toast_location_added: 'Location added',
    confirm_delete_location: 'Delete this location?',
    toast_location_deleted: 'Location deleted',
    toast_delete_error: 'Deletion error',
  },
};
