// frontend/src/i18n/domains/sl10.fr.ts
// Libellés — "Mes produits" / "Une offre" / "Nouvelle offre" (espace vendeur
// v2, VD-08). Règle produit verrouillée : jamais le mot "commission" — toujours
// "Vous gardez X F". Modèle repris à l'identique de sl5.fr.ts/sl5.en.ts.

export default {
  sl10_catalogue: {
    // Commun
    back: 'Retour',
    loading: 'Chargement…',
    saving: 'Enregistrement…',
    duplicate: 'Dupliquer',
    how_it_works: 'Comment ça marche',
    toast_soon: 'Bientôt disponible',
    state_selling: 'En vente',
    state_paused: 'En pause',
    field_price: 'Prix de vente',
    field_price_example: 'Ex. : 14 500',
    field_price_min: 'Minimum {{min}}',
    field_price_too_low: 'Le prix doit être d’au moins {{min}}',
    field_stock: 'Stock',
    field_stock_example: 'Ex. : 12',
    field_condition: 'État',
    field_condition_placeholder: 'Choisir un état',
    field_color: 'Couleur',
    field_color_example: 'Ex. : Noir',
    field_weight: 'Poids (kg)',
    field_weight_example: 'Ex. : 6',
    field_dimensions: 'Dimensions (cm)',
    field_dimensions_example: 'Ex. : 55 x 40 x 20',
    you_keep_per_sale: 'Vous gardez par vente',
    you_keep_live: 'Vous gardez {{pct}} à ce prix',
    offer_not_found: 'Offre introuvable',

    // Mes produits (PRD-01 à PRD-07)
    list_title: 'Mes produits',
    list_summary: '{{total}} produits · {{selling}} en vente · {{paused}} en pause',
    cta_new_offer: 'Nouvelle offre',
    empty_title: 'Pas encore de produit',
    empty_detail: 'Créez votre première offre pour commencer à vendre.',
    stock_label: '{{count}} en stock',
    attention_low_stock: 'Stock bas : {{count}} restants',
    attention_low_stock_action: 'Réapprovisionner',
    attention_dispute: 'Un litige concerne ce produit',
    attention_dispute_action: 'Voir',

    // Une offre (OFR-01 à OFR-05)
    offer_title: 'Une offre',
    your_offer_title: 'Votre offre',
    field_sheet_locked: 'Fiche produit (titre, description, photos de référence)',
    zones_title: 'Où les clients vous voient',
    zones_unavailable: 'La comparaison avec les autres vendeurs n’est pas encore disponible sur cet écran.',
    toggle_cod: 'Accepter le paiement au retrait',
    toggle_auto_price: 'Prix automatique',
    moderation_title: 'En pause',
    moderation_detail: 'Cette offre n’est pas visible des clients pour le moment.',
    cta_edit_price: 'Modifier le prix',
    cta_edit_offer: 'Modifier l’offre',
    cta_pause: 'Mettre en pause',
    cta_resume: 'Remettre en vente',
    toast_paused: 'Offre mise en pause',
    toast_resumed: 'Offre remise en vente',
    how_it_works_offer_detail: 'Votre offre (prix, stock, état, photos réelles) vous appartient. La fiche produit (titre, description, photos de référence) est écrite et contrôlée par BelivaY pour garder un catalogue fiable.',

    // Nouvelle offre — commun aux 4 étapes
    wizard_title: 'Nouvelle offre',
    cta_continue: 'Continuer',
    step_name_product: 'Produit',
    step_name_photos: 'Photos',
    step_name_price: 'Prix',
    step_name_publish: 'Publier',
    err_missing_product: 'Choisissez un produit avant de continuer',
    err_missing_photos: 'Ajoutez au moins {{min}} photos',
    err_missing_condition: 'Indiquez l’état du produit',
    err_missing_stock: 'Indiquez votre stock',
    err_price_too_low: 'Le prix minimum est de 500 F',
    err_missing_dimensions: 'Poids et dimensions obligatoires au-delà de 5 kg ou 50 cm',
    seller_note_color: 'Couleur choisie par le vendeur : {{color}}',
    toast_draft_saved: 'Brouillon enregistré',

    // Étape 1 — produit (NOF-01 à NOF-05)
    step1_title: 'Quel produit vendez-vous ?',
    step1_search_placeholder: 'Nom, marque ou référence',
    step1_shortcut_barcode: 'Code-barres',
    step1_shortcut_photo: 'Photo',
    step1_shortcut_dictate: 'Dicter',
    step1_searching: 'Recherche…',
    step1_pick: 'C’est celui-là',
    step1_no_results: 'Aucun résultat pour cette recherche.',
    step1_request_sheet: 'Aucun de ces produits · Demander une fiche',

    // Demander une fiche
    sheet_request_title: 'Demander une fiche',
    sheet_field_name: 'Nom du produit',
    sheet_field_brand: 'Marque',
    sheet_field_brand_example: 'Ex. : Samsung',
    sheet_field_category: 'Catégorie',
    sheet_field_category_example: 'Ex. : Téléphones',
    sheet_field_photo: 'Ajouter une photo',
    sheet_priority_toggle: 'Fiche prioritaire · 1 000 F',
    sheet_how_it_works_detail: 'BelivaY rédige la fiche (titre, description, photos de référence) sous 48 h, ou 24 h avec l’option prioritaire. Votre offre reste en brouillon en attendant.',
    sheet_cta_send: 'Envoyer la demande',
    sheet_sent_toast: 'Nous avons bien noté votre recherche.',

    // Étape 2 — photos (PHO-01 à PHO-04)
    step2_title: 'Photos réelles du produit',
    step2_desc: '{{min}} à {{max}} photos, prises par vous, pas de photo du catalogue.',
    step2_add: 'Ajouter',
    step2_take_photo: 'Prendre une photo',
    step2_counter: '{{count}} / {{max}} photos',
    step2_too_small: 'Photo trop petite : reprenez-la (800×800 px minimum)',

    // Étape 3 — stock et prix (PRX-01 à PRX-09)
    step3_title: 'Stock, état et prix',
    step3_other_settings: 'Autres réglages',
    step3_oversize_notice: 'Poids et dimensions obligatoires au-delà de 5 kg ou 50 cm.',
    step3_sell_more_title: 'Pour vendre plus',
    step3_sell_more_unavailable: 'Le prix conseillé et les zones où votre offre passe en premier seront affichés dès que la comparaison avec les autres vendeurs sera disponible.',

    // Étape 4 — récapitulatif (REC-01/02)
    step4_title: 'Vérifiez avant de publier',
    step4_untitled: 'Produit sans titre',
    step4_photos_count: 'Photos ajoutées',
    step4_when_money_arrives: 'Quand l’argent arrive, en 4 temps',
    step4_when_money_arrives_detail: '1) Le client paie, l’argent est mis de côté. 2) Vous préparez et remettez au livreur. 3) Le client confirme la réception (ou la confirmation se fait automatiquement après quelques jours). 4) L’argent vous est versé selon votre palier.',
    step4_cta_publish: 'Publier · vérification sous 48 h',
    step4_cta_draft: 'Garder en brouillon',

    // Offre envoyée (A31)
    sent_title: 'Offre envoyée',
    sent_answer_before: 'Réponse avant {{when}}',
    sent_cta_see_products: 'Voir mes produits',
    sent_cta_add_color: 'Ajouter une autre couleur',
    sent_note: 'Votre offre est en vérification. Vous serez prévenu dès qu’elle sera visible des clients.',

    // Dupliquer un produit (DUP-01 à DUP-04)
    duplicate_title: 'Dupliquer un produit',
    duplicate_pick_variant: 'Quelle variante ajoutez-vous ?',
    duplicate_other_variant: 'Autre…',
    duplicate_already_created: 'Déjà créées',
    duplicate_cta_create_draft: 'Créer le brouillon',
    duplicate_what_is_kept: 'Ce qui est repris',
    duplicate_what_is_kept_detail: 'La fiche, les photos de référence, la catégorie, le gabarit, le poids, les dimensions, le délai et le paiement au retrait sont repris automatiquement. À saisir : la variante, le prix, le stock et des photos réelles.',
  },
};
