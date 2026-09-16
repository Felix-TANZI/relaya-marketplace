// frontend/src/i18n/domains/misc1.fr.ts
//
// Domaine "misc1" — clôture d'un lot de composants et modules divers restés
// sans câblage i18n : visite guidée, écran d'accès refusé, toasts, carte de
// vérification de compte de versement, autocomplete marque, recadrage
// avatar, géolocalisation, compte BelivaY, boîte de réception support, et
// les aides d'affichage des modules règlements vendeur/relais/livraison.
//
// Toutes les clés de premier niveau commencent par "misc1_" pour éviter
// toute collision avec les autres fichiers de domaine.

export default {
  misc1_tutorial: {
    welcome_title: "Bienvenue sur BelivaY",
    welcome_description:
      "Cette visite rapide te montre comment rechercher, explorer, ajouter au panier et finaliser une commande sans te perdre dans l'application.",
    welcome_helper:
      "Tu peux utiliser Suivant, Précédent, Ignorer ou la touche Echap. La visite ne se ferme pas quand tu cliques à côté.",
    search_title: "Rechercher des produits ici",
    search_description:
      "La recherche est disponible dès l'en-tête. Elle lance les résultats automatiquement pendant que tu écris, sans attendre la validation.",
    search_helper: "Essaie par exemple « chaussures », « iPhone » ou « karité ».",
    categories_title: "Parcourir par catégorie",
    categories_description:
      "Tu peux partir d'une catégorie populaire pour aller plus vite vers la bonne famille de produits.",
    categories_helper: "Chaque carte t'envoie directement vers une vue ciblée du catalogue.",
    product_card_title: "Découvrir une fiche produit",
    product_card_description:
      "Chaque fiche permet d'ouvrir le détail du produit, de consulter le prix, la note et les informations essentielles avant achat.",
    product_card_helper: "Le cœur sert aux favoris, et le bouton principal ajoute au panier.",
    add_to_cart_title: "Ajouter des articles à votre panier",
    add_to_cart_description:
      "Depuis la carte produit, tu peux ajouter immédiatement un article au panier sans quitter la page.",
    add_to_cart_helper: "Le compteur du panier se met à jour en direct dans l'en-tête.",
    cart_summary_title: "Voir votre panier",
    cart_summary_description:
      "Depuis l'icône panier, tu retrouves les articles ajoutés, les quantités et le total avant validation.",
    cart_summary_helper: "Tu peux modifier les quantités ou retirer un article avant de passer à l'étape suivante.",
    chatbot_title: "Votre assistant BelivaY",
    chatbot_description:
      "Le chatbot est disponible sur toutes les pages. Posez-lui vos questions sur les produits, la livraison, le paiement ou les retours.",
    chatbot_helper:
      "Cliquez sur la bulle en bas à droite pour démarrer une conversation. Il peut aussi vous guider vers les pages de l'application.",
    route_home: "Accueil",
    route_cart: "Panier",
    lets_start: "Let's start",
    continue: "Continuer",
  },

  misc1_role_access_denied: {
    space_seller: "vendeur",
    space_relay_point: "point relais",
    space_delivery_organization: "organisation de livraison",
    space_courier: "livreur",
    title_offline: "Vérification impossible",
    title_seller: "Espace vendeur non activé",
    title_relay_point: "Espace point relais non activé",
    title_delivery_organization: "Espace organisation de livraison non activé",
    title_courier: "Espace livreur non activé",
    instruction_offline:
      "Nous n'avons pas pu vérifier les droits de votre compte. Vérifiez votre connexion puis réessayez, ou reconnectez-vous.",
    instruction_seller:
      "Pour devenir vendeur, vous devez aller dans mon profil et remplir les informations adéquates si vous ne l'avez pas encore fait.",
    instruction_relay_point: "Cet espace est réservé aux comptes Point relais validés par BelivaY.",
    instruction_delivery_organization:
      "Cet espace est réservé aux entreprises de livraison partenaires validées par BelivaY.",
    instruction_courier:
      "Pour devenir livreur, vous devez aller dans mon profil et remplir les informations adéquates si vous ne l'avez pas encore fait.",
    retry: "Réessayer",
    logout: "Se déconnecter",
    go_to_profile: "Aller dans mon profil",
    back_home: "Retour à l'accueil",
    account_missing_role: "Votre compte n'a pas le rôle {{role}}. Déconnectez-vous pour utiliser un autre compte.",
  },

  misc1_toast: {
    notifications_region_label: "Notifications",
  },

  misc1_payout_verification: {
    role_vendor: "vendeur",
    role_courier: "livreur",
    role_delivery_organization: "organisation de livraison",
    role_relay_point: "point relais",
    status_verified: "Vérifié",
    status_disabled: "Désactivé",
    status_code_required: "Code requis",
    status_loading: "Chargement",
    status_active: "Actif",
    status_to_verify: "À vérifier",
    load_error: "Impossible de charger les comptes de versement.",
    header_kicker: "Versements BelivaY",
    header_title: "Compte d'encaissement vérifié",
    header_description:
      "Avant qu'un {{role}} puisse recevoir l'argent envoyé par BelivaY, le numéro Mobile Money doit être confirmé par code.",
    primary_account: "Compte principal",
    replace_hint: "Ajoutez un nouveau numéro si vous souhaitez remplacer le compte actuel.",
    replace_button: "Remplacer",
    phone_label: "Numéro Mobile Money à vérifier",
    operator_placeholder: "Opérateur",
    invalid_number_hint: "Numéro camerounais invalide ou opérateur non reconnu.",
    label_placeholder: "Ex: Versement {{role}}",
    default_label: "Compte {{role}}",
    request_code_button: "Demander le code",
    code_verification_heading: "Vérification du code",
    code_verification_note: "Le numéro reste bloqué tant que le code n'est pas confirmé.",
    validate_number_button: "Valider le numéro",
    invalid_number_error: "Entrez un numéro camerounais valide avant de demander le code.",
    code_sent_dev: "Code envoyé. En local/test, code: {{code}}",
    code_sent: "Code envoyé. Saisissez le code reçu pour activer ce numéro.",
    send_code_error: "Impossible d'envoyer le code.",
    enter_code_error: "Saisissez le code reçu avant de valider.",
    number_verified: "Numéro vérifié. BelivaY peut maintenant l'utiliser pour les versements.",
    invalid_or_expired_code: "Code invalide ou expiré.",
  },

  misc1_brand_autocomplete: {
    search_placeholder: "Rechercher une marque…",
    verified_brand_title: "Marque vérifiée",
    verified_label: "Vérifiée",
    change_brand_aria: "Changer de marque",
    brand_exists_not_found: "Cette marque existe déjà, mais nous n'arrivons pas à la retrouver.",
    create_error: "Erreur lors de la création. Réessayez.",
    create_brand_button: "Créer la marque « {{name}} »",
  },

  misc1_avatar_crop: {
    dialog_aria_label: "Rogner la photo de profil",
    edit_photo_title: "Modifier la photo",
    edit_photo_subtitle: "Rognez puis compressez la photo avant son transfert.",
    preview_alt: "Aperçu à rogner",
    zoom_label: "Zoom",
    horizontal_position_label: "Position horizontale",
    vertical_position_label: "Position verticale",
    original_file_label: "Fichier original",
    final_format_label: "Format final",
    final_format_value: "WebP · 512 × 512",
    transferred_size_label: "Taille transférée",
    compressing: "Compression…",
    uploading: "Transfert vers votre profil…",
    transferring: "Transfert…",
    crop_and_save: "Rogner et enregistrer",
    size_bytes: "{{count}} o",
    size_kilobytes: "{{count}} Ko",
    size_megabytes: "{{count}} Mo",
    image_read_error: "Ce fichier image ne peut pas être lu.",
    browser_cannot_prepare_image: "Votre navigateur ne peut pas préparer cette image.",
    compress_error: "Impossible de compresser l'image.",
    preview_not_ready: "La prévisualisation n'est pas encore prête.",
    upload_failed: "L'envoi a échoué.",
  },

  misc1_geolocation: {
    error_generic: "Erreur de géolocalisation",
    error_unavailable: "Géolocalisation non disponible",
    error_permission_denied: "Permission refusée. Activez la géolocalisation dans les paramètres.",
    error_position_unavailable: "Position indisponible",
    error_timeout: "Délai d'attente dépassé",
  },

  misc1_belivay_account: {
    min_deposit_error: "Le dépôt minimum est de {{amount}}.",
    unknown_plan_error: "Plan inconnu.",
    insufficient_balance_error: "Solde insuffisant : il manque {{amount}}. Faites un dépôt d'abord.",
  },

  misc1_support_inbox: {
    author_support: "Support",
    author_you: "Vous",
    seed_conversation1_name: "Support BelivaY",
    seed_conversation2_name: "Support abonnement",
    seed_message_request_received: "Bonjour, nous avons bien reçu votre demande.",
    seed_message_refund_status_question: "Merci, je voulais vérifier le statut de mon remboursement.",
    seed_message_case_in_progress: "Le dossier est en cours de traitement, retour sous 24h.",
    seed_message_deposit_validated: "Votre dépôt a bien été validé sur votre Compte BelivaY.",
  },

  misc1_vendor_settlements: {
    processing: "en cours de traitement",
    today: "aujourd'hui",
    tomorrow: "demain",
    in_days: "dans {{count}} jours",
    blocker_kyc: "Vos pièces d'identité ne sont pas encore vérifiées.",
    blocker_cooling: "Votre numéro Mobile Money a changé récemment. Un délai de sécurité de 72 h s'applique.",
    blocker_suspended: "Les versements sont suspendus sur votre compte.",
    blocker_no_number: "Aucun numéro Mobile Money n'est enregistré.",
    blocker_below_minimum: "Le montant dû n'atteint pas encore le minimum de versement.",
  },

  misc1_relay_settlements: {
    period_join: "au",
    processing: "en cours de traitement",
    today: "aujourd'hui",
    tomorrow: "demain",
    in_days: "dans {{count}} jours",
    blocker_kyc: "Vos pièces d'identité ne sont pas encore vérifiées.",
    blocker_cooling: "Votre numéro Mobile Money a changé récemment. Un délai de sécurité de 72 h s'applique.",
    blocker_suspended: "Les versements sont suspendus sur votre compte.",
    blocker_no_number: "Aucun numéro Mobile Money n'est enregistré.",
    blocker_below_minimum: "Le montant dû n'atteint pas encore le minimum de versement.",
    status_paid: "versé",
    status_processing: "en cours",
    status_approved: "approuvé",
    status_pending_approval: "en attente",
    status_unknown: "en vérification",
    status_failed: "non abouti",
    status_rejected: "rejeté",
    status_cancelled: "annulé",
  },

  misc1_delivery_settlements: {
    period_join: "au",
    processing: "en cours de traitement",
    today: "aujourd'hui",
    tomorrow: "demain",
    in_days: "dans {{count}} jours",
    blocker_kyc: "Vos pièces d'identité ne sont pas encore vérifiées.",
    blocker_cooling: "Votre numéro Mobile Money a changé récemment. Un délai de sécurité de 72 h s'applique.",
    blocker_suspended: "Les versements sont suspendus sur votre compte.",
    blocker_no_number: "Aucun numéro Mobile Money n'est enregistré.",
    blocker_below_minimum: "Le montant dû n'atteint pas encore le minimum de versement.",
    status_paid: "versé",
    status_processing: "en cours",
    status_approved: "approuvé",
    status_pending_approval: "en attente",
    status_unknown: "en vérification",
    status_failed: "non abouti",
    status_rejected: "rejeté",
    status_cancelled: "annulé",
  },
};
