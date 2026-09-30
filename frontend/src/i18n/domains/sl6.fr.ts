// frontend/src/i18n/domains/sl6.fr.ts
// Écran "Accueil" de l'espace vendeur v2 — VD-04 / VD-D05.
// Règle non négociable : jamais le mot "commission", jamais le total payé par
// le client, jamais l'identité du client — toujours "Vous gardez X F" (ACC-08).

export default {
  sl6_accueil: {
    // ── États génériques de la page ──────────────────────────────────────
    loading: 'Chargement…',
    error_title: "Impossible de charger l'accueil",
    error_retry: 'Réessayer',
    action_error: "Cette action n'a pas pu partir à temps : refaites-la.",
    prep_access_note: 'Les montants et les versements sont réservés au propriétaire de la boutique.',

    // ── Salutation personnalisée, au-dessus de "Boutique ouverte" (ACC-écart) ─
    greeting: 'Bonjour {{name}} · {{date}}',

    // ── Titre de la file "à faire" (ACC-01) ──────────────────────────────
    todo_title: '{{count}} chose(s) à faire',
    todo_title_one: '{{count}} chose à faire',
    todo_title_other: '{{count}} choses à faire',

    // ── Pastilles catégorisées sous le titre, quand la file mélange plusieurs
    // types ("2 à préparer · 2 litiges · 1 retour", ACC-01) ─────────────────
    todo_pill_prepare: '{{count}} à préparer',
    todo_pill_prepare_one: '{{count}} à préparer',
    todo_pill_prepare_other: '{{count}} à préparer',
    todo_pill_dispute: '{{count}} litige(s)',
    todo_pill_dispute_one: '{{count}} litige',
    todo_pill_dispute_other: '{{count}} litiges',
    todo_pill_return: '{{count}} retour(s)',
    todo_pill_return_one: '{{count}} retour',
    todo_pill_return_other: '{{count}} retours',

    // ── Carte héros orange — commande la plus urgente (ACC-02/03) ───────
    hero_label: 'À préparer en priorité',
    hero_untitled_product: 'Article',
    hero_due_at: 'Prête avant {{time}}',
    hero_courier: 'Livreur : {{name}}',
    hero_keep_label: 'Vous gardez',
    hero_action_ready: "C'est prêt",
    hero_action_stockout: 'Rupture',
    hero_action_extend: 'Plus de temps',
    hero_action_detail: 'Détail',

    // ── Cartes douces : à préparer restantes / litiges / retours (ACC-02/04/05/06) ─
    row_prepare_badge: 'À préparer',
    row_dispute_badge: 'Litige — gelé',
    row_dispute_frozen: 'Gelé jusqu’à la décision · {{amount}}',
    row_dispute_frozen_no_amount: 'Gelé jusqu’à la décision.',
    row_dispute_frozen_label: 'Montant gelé',
    row_dispute_reason: 'Le client dit : « {{reason}} »',
    row_dispute_deadline: 'Répondez avant {{when}}. Sans réponse, la décision est prise en faveur du client.',
    row_dispute_mediation: 'Votre réponse est envoyée — BelivaY tranche.',
    row_prepare_action: "C'est prêt",
    row_dispute_action: 'Répondre',
    row_dispute_action_view: 'Voir',
    row_paid_at: 'Payée à {{time}}',
    row_courier_unassigned: 'Livreur pas encore attribué',

    row_return_badge: 'Retour',
    row_return_reason: 'Motif : {{reason}}',
    row_return_frozen_review: 'Gelé jusqu’à votre décision',
    row_return_frozen_transit: 'Gelé jusqu’à la réception',
    row_return_frozen_inspection: 'Gelé jusqu’à l’inspection',
    row_return_inspection_deadline: 'Vous avez jusqu’à {{when}} pour l’inspecter.',
    row_return_action: 'Voir le retour',
    return_reason_not_as_described: 'Non conforme',
    return_reason_damaged: 'Abîmé',
    return_reason_counterfeit: 'Contrefaçon',
    return_reason_hidden_defect: 'Défaut caché',

    // ── Carte "Boutique ouverte" (ACC-06/07) ─────────────────────────────
    shop_open: 'Boutique ouverte',
    shop_close_today: "Fermer aujourd'hui",
    shop_close_not_yet: 'Bientôt disponible',

    // ── Ligne stock bas, discrète, en bas (ACC-06) ───────────────────────
    low_stock: '{{count}} produit(s) en stock bas',
    low_stock_one: '{{count}} produit en stock bas',
    low_stock_other: '{{count}} produits en stock bas',
    low_stock_title: 'Stock bas · {{title}}',
    low_stock_detail: '{{count}} restant(s), seuil réglé à {{threshold}}',
    low_stock_detail_one: '{{count}} restant, seuil réglé à {{threshold}}',
    low_stock_detail_other: '{{count}} restants, seuil réglé à {{threshold}}',
    low_stock_action: 'Réapprovisionner',

    // ── Bas de page — état réseau (ACC-écart) ────────────────────────────
    network_footer: 'Connecté · aucune action en attente d’envoi',

    // ── Palier de lancement (ACC-15/21) ──────────────────────────────────
    tier_bronze: 'Bronze',
    tier_silver: 'Argent',
    tier_gold: 'Or',
    tier_platinum: 'Platine',
    tier_title: 'Plus vous publiez, plus vous gardez',
    tier_current: 'Palier actuel : {{tier}}',
    tier_progress: '{{active}} produits actifs sur {{next}} pour le palier suivant',
    tier_max: 'Palier maximum atteint',
    tier_how_it_works: 'Comment ça marche',
    tier_row_bronze: 'Bronze — palier de départ',
    tier_row_silver: 'Argent — à partir de {{n}} produits actifs',
    tier_row_gold: 'Or — à partir de {{n}} produits actifs',
    tier_row_platinum: 'Platine — à partir de {{n}} produits actifs',

    // ── "Trois gestes pour commencer" — Premier jour (ACC-14/16/21) ─────
    gestures_title: 'Trois gestes pour commencer',
    gesture_add_product: 'Ajouter un produit',
    gesture_set_hours: 'Régler mes horaires',
    gesture_verify_payout: 'Vérifier mon numéro de versement',
    welcome_title: 'Bienvenue {{name}} · jour 1',

    // ── Offre de découverte — Premier jour (KYC-05) ──────────────────────
    discovery_title: 'Offre de découverte',
    discovery_body: 'Environ 3 points gardés en plus sur chaque vente, dès votre première commande payée, pendant 3 mois ou 50 commandes.',

    // ── "Besoin d'aide ?" — Premier jour (A16) ───────────────────────────
    help_title: "Besoin d'aide ?",
    help_assisted_entry: 'Saisie assistée',
    help_whatsapp: 'Support WhatsApp',

    // ── "Rien à faire" (ACC-10/20) ───────────────────────────────────────
    empty_title: 'Rien à faire pour l’instant',
    empty_cta_intro: 'Une idée pour vendre plus',
    empty_cta_action: 'Ajouter ce produit',

    earnings_title: 'Gagné avec BelivaY',
    earnings_releasing: '{{amount}} de plus à venir bientôt',
    earnings_next_payout: 'Prochain versement {{date}} : {{amount}}',
    earnings_no_next_payout: 'Aucun versement en attente pour le moment.',
    earnings_recap_orders: '{{count}} commande(s)',
    earnings_recap_orders_one: '{{count}} commande',
    earnings_recap_orders_other: '{{count}} commandes',
    earnings_zero_unpaid: '0 F d’impayés',
    earnings_zero_transport: '0 F de transport',
    earnings_see_tier: 'Voir mon palier',

    // ── Hors connexion (OFF-01 à 05) ──────────────────────────────────────
    offline_banner: 'Pas de connexion. Données de {{time}}.',
    offline_banner_no_data: 'Pas de connexion.',
    offline_retry: 'Réessayer',
    offline_empty: 'Aucune tâche en mémoire pour le moment. Reconnectez-vous pour recharger.',

    // ── Compte suspendu (SUS-01 à 03) ────────────────────────────────────
    suspended_title: 'Compte suspendu',
    suspended_intro: '{{shop}}, votre accès vendeur est actuellement suspendu.',
    suspended_reason_fallback: 'Le motif détaillé de cette décision vous sera communiqué par notre équipe. Contactez le support si vous ne l’avez pas encore reçu.',
    suspended_allowed_title: 'Ce que vous pouvez encore faire',
    suspended_allowed_1: 'Préparer les commandes déjà reçues',
    suspended_allowed_2: 'Consulter votre argent',
    suspended_blocked_title: 'Ce qui est bloqué',
    suspended_blocked_1: 'Recevoir de nouvelles commandes',
    suspended_blocked_2: 'Publier ou modifier des produits',
    suspended_contest_action: 'Contester cette décision',
    suspended_contest_hint: 'Une seule contestation possible. Réponse de notre équipe sous 72 heures ouvrées.',
  },
};
