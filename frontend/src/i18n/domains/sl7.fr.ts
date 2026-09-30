// frontend/src/i18n/domains/sl7.fr.ts
// Espace vendeur v2 — Lot « Commandes » (VD-05 Commandes et préparation,
// VD-06 Remise, reçu et erreurs). Même convention que sl5.fr.ts : un seul
// espace de noms plat, aucune mention du mot "commission", jamais l'identité
// du client — toujours "Vous gardez X F".

export default {
  sl7_commandes: {
    // Commandes reçues (VD-05 §CMD-01 à CMD-10)
    list_title: 'Commandes reçues',
    list_summary:
      '{{total}} commandes · {{prep}} à préparer · {{in_progress}} chez le livreur · {{problems}} en litige ou retour · {{done}} terminées',
    filter_prep: 'À préparer',
    filter_in_progress: 'En cours',
    filter_done: 'Terminées',
    filter_problems: 'Problèmes',
    loading: 'Chargement…',
    empty_filter: 'Aucune commande ici pour l’instant.',
    anonymity_note:
      'Par mesure de protection, vous ne voyez jamais le nom, le numéro ni le quartier du client.',
    pill_problem: 'Litige ou retour',
    plus_n_others: '+ {{n}} autre(s) article(s)',
    paid_at: 'Payée le {{time}}',
    you_keep: 'Vous gardez',
    money_paid: 'Versé',
    money_releasing: 'Se libère bientôt',
    money_to_pay: 'À verser vendredi',
    saving: 'Enregistrement…',
    cta_ready: 'C’est prêt',
    back: 'Retour',
    why: 'Pourquoi ?',
    not_found: 'Commande introuvable.',
    how_it_works: 'Comment ça marche',
    other_actions: 'Autres actions',
    back_to_list: 'Retour aux commandes',
    back_to_order: 'Retour à la commande',

    // Commande à préparer (VD-05 §PRE-01 à PRE-06)
    detail_title: 'Commande à préparer',
    pill_paid: 'Payée',
    pill_counter: 'Payable au retrait',
    pill_to_prepare: 'À préparer',
    pill_with_courier: 'Chez le livreur',
    pill_delivered: 'Livrée',
    pill_cancelled: 'Annulée',
    due_in: 'Encore {{time}}',
    due_overdue: 'Délai dépassé',
    due_before: 'Prête avant {{time}}',
    detail_set_aside: 'Mettez de côté : chargeur, câble, boîte si vous les avez.',
    detail_already_ready: 'Cette commande est déjà prête.',
    sale_price: 'Prix de vente',
    pickup_title: 'Ramassage chez vous',
    pickup_not_assigned: 'Livreur pas encore attribué.',
    pickup_not_you: 'Vous ne faites pas le colis : le livreur s’en charge.',
    pickup_how:
      'Le livreur contrôle l’article, l’emballe et le scelle devant vous avec le matériel BelivaY. Vous n’avez ni carton ni étiquette à préparer.',
    action_extend: 'Besoin de plus de temps',
    action_stockout: 'Signaler une rupture',
    action_slip: 'Bon de préparation',
    action_journal: 'Journal de la commande',
    action_handover: 'Remise au livreur',

    // Rupture (VD-05 §RUP-01 à RUP-04)
    rupture_title: 'Rupture',
    rupture_subtitle: 'Signaler tôt coûte peu, se taire coûte cher.',
    rupture_consequences_title: 'Ce qui va se passer',
    rupture_consequence_next_vendor:
      'Un autre vendeur fiable peut prendre le relais si son prix reste proche du vôtre.',
    rupture_consequence_refund_today: 'Sinon, le client est remboursé aujourd’hui même.',
    rupture_consequence_no_fee: 'Aucun frais pour vous.',
    rupture_consequence_punctuality:
      'Un effet léger sur votre Ponctualité si c’est signalé avant l’échéance.',
    rupture_how:
      'BelivaY cherche un vendeur au Trust Score élevé et à un prix proche du vôtre ; l’écart éventuel est payé par BelivaY, jamais par le client. Sur une commande à plusieurs vendeurs, seule votre part est concernée : vous ne voyez pas les autres vendeurs.',
    rupture_toggle_stock_zero: 'Mettre le stock de cet article à 0',
    rupture_confirm: 'Signaler la rupture',
    rupture_cancel: 'Annuler',
    rupture_done_title: 'Rupture signalée',
    rupture_done_detail:
      'Le client sera pris en charge automatiquement. Vous pouvez retrouver le détail dans le journal de la commande.',

    // Besoin de plus de temps (VD-05 §DEL-01 à DEL-04)
    extend_title: 'Besoin de plus de temps',
    extend_current_due: 'Actuellement prête avant',
    extend_choice_1h: '+ 1 heure',
    extend_choice_2h: '+ 2 heures',
    extend_choice_tomorrow: 'Demain à l’ouverture',
    extend_choice_preview: 'Nouvelle heure : {{time}}',
    extend_choice_disabled: 'Dépasse la limite absolue',
    extend_absolute_limit:
      'La limite absolue est {{time}} : au-delà, aucun report n’est possible.',
    extend_consequences_title: 'Ce qui va se passer',
    extend_consequence_kept:
      'Le client et le livreur sont prévenus automatiquement du nouveau délai.',
    extend_consequence_late:
      'Un retard non tenu sans prévenir a un effet sur votre Ponctualité.',
    extend_why:
      'Une seule prolongation est possible par commande, pour garder le délai fiable pour le client. Vous ne pouvez jamais dépasser 24 heures après le paiement.',
    extend_confirm: 'Demander {{choice}} de plus',
    extend_confirm_generic: 'Choisissez une nouvelle heure',
    extend_already_used:
      'Vous avez déjà demandé un délai supplémentaire pour cette commande. Une seule prolongation est possible.',
    extend_done_title: 'Délai demandé',
    extend_done_detail: 'Votre demande est enregistrée.',

    // Bon de préparation (VD-05 §BON-01/02)
    slip_title: 'Bon de préparation',
    slip_paid_at: 'Payée le {{time}}',
    slip_deadline: 'Heure limite : {{time}}',
    slip_check_title: 'À vérifier avant l’arrivée du livreur',
    slip_check_model: 'Bon modèle et bonne couleur',
    slip_check_tested: 'Neuf et testé',
    slip_check_accessories: 'Chargeur et câble mis de côté',
    slip_check_box: 'Boîte d’origine',
    slip_dont_close: 'Ne fermez rien : le livreur contrôle et emballe devant vous.',
    slip_pickup_note:
      'Le livreur connaît le code de remise. Vous n’avez rien à lui donner par écrit.',
    slip_print: 'Imprimer',
    slip_share: 'Partager en PDF',

    // Journal de la commande (VD-05 §JRN-01/02)
    journal_title: 'Journal de la commande',
    journal_subtitle: 'Chaque action est signée',
    journal_immutable: 'Personne ne peut modifier ni effacer ce journal.',

    // Remise au livreur (VD-06 §REM-01 à REM-09)
    handover_title: 'Remise au livreur',
    handover_ready_pill: 'Prête',
    handover_code_label: 'Code de remise',
    handover_code_missing: 'Code pas encore disponible.',
    handover_show_code: 'Afficher le code',
    handover_hide_code: 'Masquer le code',
    handover_warning:
      'Ne montrez ce code qu’après avoir vérifié le visage du livreur sur son profil.',
    handover_how:
      'Le livreur saisit ce code de son côté pour confirmer la remise. Il fonctionne même sans réseau.',
    write_support: 'Écrire au support',
    handover_other_cases_title: 'Autres situations possibles',
    handover_data_from: 'Dernières données du {{time}}',

    // Six cas d'erreur à la remise (VD-06 §1.6)
    error_courier_absent_title: 'Le livreur n’est pas venu',
    error_courier_absent_detail:
      'Il repassera au créneau suivant. Ce contretemps ne compte pas contre vous.',
    error_courier_absent_why:
      'Le délai est suspendu jusqu’au prochain passage du livreur : votre échéance ne bouge pas pendant ce temps.',
    error_code_blocked_title: 'Remise bloquée',
    error_code_blocked_detail:
      'Trois codes erronés ont été saisis. BelivaY a été prévenu ; le déblocage est automatique 24 heures après.',
    error_code_blocked_why: 'Cette sécurité protège contre une remise à la mauvaise personne.',
    error_cancelled_title: 'Commande annulée',
    error_cancelled_detail:
      'Cette commande a été annulée avant le ramassage. Aucun effet sur votre Trust Score.',
    error_cancelled_action: 'Retour aux commandes',
    error_cancelled_why: 'Le stock de l’article vous est rendu automatiquement.',
    error_deadline_title: 'Délai dépassé',
    error_deadline_detail: 'Chaque minute de retard compte sur votre Ponctualité.',
    error_deadline_action: 'Contacter le support',
    error_deadline_why:
      'Signalez tôt une rupture ou une prolongation pour éviter cet effet.',
    error_offline_title: 'Pas de réseau',
    error_offline_detail:
      'Le code fonctionne quand même. L’action repartira automatiquement au retour du réseau.',
    error_offline_action: 'Réessayer',
    error_offline_why:
      'Vos actions sont mises en file et envoyées avec leur heure d’origine dès que le réseau revient.',
    error_value_cap_title: 'Plafond de valeur',
    error_value_cap_detail:
      'Cet article dépasse 250 000 F : seule une entreprise de livraison Or, assurée, peut le prendre en charge.',
    error_value_cap_why: 'Ce plafond protège la valeur de l’article pendant le transport.',

    // Remis au livreur (VD-06 §REM-04/06/07/08)
    handover_done_title: 'Remis au livreur',
    handover_done_covered: 'Vous êtes couvert',
    handover_done_covered_detail:
      'La responsabilité de l’article passe à l’entreprise de livraison dès cette remise.',
    handover_done_release:
      'Cette somme se libère {{days}} jour(s) après la confirmation du client, selon votre palier.',
    handover_done_photos_title: 'Preuves conservées',
    handover_done_photo_open: 'Colis ouvert, article visible',
    handover_done_photo_closed: 'Colis fermé et étiqueté',
    handover_done_photos_note:
      'Ces photos sont versées automatiquement à votre dossier, horodatées et géolocalisées.',
    handover_done_see_receipt: 'Voir le reçu',
    handover_done_finish: 'Terminer',

    // Reçu vendeur (VD-06 §RCU-01 à RCU-04)
    receipt_title: 'Reçu vendeur',
    receipt_header: 'Reçu vendeur',
    receipt_row_article: 'Article',
    receipt_row_ref: 'Référence',
    receipt_row_date: 'Encaissé le',
    receipt_row_customer: 'Client',
    receipt_row_collected_by: 'Encaissé par',
    receipt_row_sale_price: 'Prix de vente',
    receipt_identity_masked: 'Identité masquée',
    receipt_collected_by_value: 'BelivaY, pour votre compte',
    receipt_not_invoice: 'Ceci n’est pas une facture fiscale.',
    receipt_mandatary_title: 'Qu’est-ce qu’un mandataire ?',
    receipt_mandatary_detail:
      '« Mandataire » veut dire que BelivaY encaisse pour votre compte, puis vous reverse ce que vous gardez.',
    receipt_share: 'Partager le reçu',
    receipt_see_documents: 'Voir mes documents',
  },
};
