// frontend/src/i18n/domains/sl13.fr.ts
// Domaine i18n partagé — espace vendeur v2, écrans VD-11 "Boutique, compte et
// communication". Deux lots y ajoutent leurs clés sous le même namespace
// sl13_boutique (toujours ajouter, jamais écraser) :
//  - Boutique (fig.2) et Horaires et fermetures (fig.3) — identité interne de
//    la boutique, jamais client-facing (voir BoutiquePage.tsx/HorairesPage.tsx).
//  - Emplacement (fig.4), Mon équipe (fig.5) et Mon équipe · ajouter un accès
//    (fig.6).
// Modèle : sl11.fr.ts.

export default {
  sl13_boutique: {
    // ── Ma boutique (VD-11 fig.2) ───────────────────────────────────────────
    title: 'Ma boutique',
    subtitle: 'Le nom de votre boutique reste entre vous et BelivaY.',

    client_sees_label: 'Ce que voit le client',
    trust_score_label: 'Trust Score {{score}}',
    nothing_else: 'Rien d’autre : ni nom, ni photo, ni adresse, ni téléphone, ni lien, ni QR de boutique.',
    trust_score_explain: 'Trust Score : votre note de confiance, sur 100.',

    how_it_works: 'Comment ça marche',
    client_never_sees: 'Le client ne voit jamais le nom de la boutique, une page boutique, une photo, l’adresse, le téléphone, le WhatsApp, un lien ou un QR.',
    vendor_never_sees: 'Vous ne voyez jamais le nom, le numéro, l’adresse ni le quartier du client, son mode de livraison, son relais, les autres vendeurs, le total payé. Seule exception : la mention « payable au retrait ».',
    between_you: 'Entre vous deux, aucun contact direct : une messagerie rattachée à la commande, anonyme et filtrée.',

    link_hours: 'Horaires et fermetures',
    link_hours_subtitle: 'Lun – sam 08 h – 18 h',
    link_reviews: 'Avis',
    link_team: 'Mon équipe',
    link_location: 'Emplacement',
    link_location_count: '{{count}} emplacement enregistré',
    link_location_count_plural: '{{count}} emplacements enregistrés',
    link_location_none: 'Aucun emplacement enregistré',

    identity_title: 'Votre identité chez BelivaY',
    identity_shop_name: 'Nom de la boutique',
    identity_owner: 'Titulaire',
    identity_username: 'Identifiant',
    identity_status: 'Statut du compte',
    identity_account: 'Compte',
    identity_account_created: 'Créé le {{date}}',
    identity_account_created_approved: 'Créé le {{created}} · approuvé le {{approved}}',
    identity_hint: 'L’identifiant ne change jamais. Le titulaire suit votre pièce d’identité : le changer demande une vérification.',

    status_pending: 'En attente',
    status_approved: 'Approuvé',
    status_rejected: 'Rejeté',
    status_suspended: 'Suspendu',

    request_change: 'Demander une modification',
    request_change_whatsapp_message: 'Bonjour BelivaY, je suis {{shop}} (compte #{{id}}) et je voudrais demander une modification de mes informations de boutique.',

    // ── Horaires et fermetures (VD-11 fig.3) ────────────────────────────────
    hours_title: 'Horaires et fermetures',
    hours_subtitle: 'Le délai de préparation ne court que pendant vos heures d’ouverture.',

    closed_today_title: 'Fermé aujourd’hui',
    closed_today_open_note: 'Ouverte aujourd’hui jusqu’à 18 h',
    closed_today_explain: 'Activé : plus de nouvelle commande jusqu’à demain 08 h. Les commandes déjà reçues restent à préparer.',
    closed_today_not_ready: 'Pas encore disponible : la fermeture ponctuelle « aujourd’hui » n’est pas encore reliée au serveur. Utilisez la mise en pause dans Paramètres en attendant.',

    hours_card_title: 'Horaires d’ouverture',
    hours_mon_sat: 'Lundi à samedi',
    hours_mon_sat_value: '08 h – 18 h',
    hours_sunday: 'Dimanche',
    hours_sunday_value: 'Toujours fermé',
    hours_locked_note: 'Ces horaires sont les mêmes pour tous les vendeurs BelivaY au lancement. Seul votre jour de fermeture hebdomadaire peut varier — ce réglage n’est pas encore affiché ici.',

    pickup_title: 'Passage du livreur',
    pickup_not_ready: 'Pas encore disponible : les créneaux de passage du livreur par zone ne sont pas encore communiqués dans l’espace vendeur.',

    closures_title: 'Fermetures programmées',
    closures_empty: 'Aucune fermeture programmée pour l’instant.',
    closures_schedule_button: 'Programmer une fermeture',
    closures_not_ready: 'Pas encore disponible : la programmation de fermetures n’est pas encore reliée au serveur.',
    closures_advance_notice: 'Au moins 48 h à l’avance : le temps de confier vos commandes à d’autres vendeurs.',

    // ── Emplacement (VD-11 fig.4) ─────────────────────────────────────────
    location_title: 'Emplacement',
    location_subtitle: 'Votre prix + la livraison depuis ici : le total le plus bas l’emporte.',
    location_none: 'Aucun emplacement enregistré pour le moment.',
    location_verified_pill: 'Principal',
    location_no_coords: 'Position non renseignée pour le moment.',
    landmark_label: 'Repère pour le livreur',
    landmark_placeholder: 'Ex. : face à la pharmacie du carrefour',
    landmark_hint: 'Une phrase simple pour trouver la boutique.',
    how_cost_strong: 'Coût total livré',
    how_cost_text: '= votre prix + la livraison réelle depuis votre boutique. Le plus bas reçoit la commande.',
    how_tie_strong: 'À coût égal,',
    how_tie_text: 'le meilleur Trust Score passe devant.',
    how_fail_strong: 'Rupture, lenteur ou refus :',
    how_fail_text: 'la commande passe au vendeur suivant.',
    how_no_choice_text: 'Le client ne choisit pas de vendeur : il choisit un produit, BelivaY choisit l’offre.',
    relocate_cta: 'Replacer le point depuis la boutique',
    relocate_hint: 'À faire sur place. Au-delà de 200 m, une nouvelle vérification suit.',
    location_error: 'Position indisponible. Vérifiez que la localisation est autorisée.',

    // ── Mon équipe (VD-11 fig.5) ──────────────────────────────────────────
    team_title: 'Mon équipe',
    team_subtitle: 'Un accès par personne : on sait toujours qui a fait quoi.',
    role_owner: 'Propriétaire',
    team_owner_caption: 'Vous · tout, dont l’argent et les prix',
    team_no_second_access: 'Aucun second accès pour le moment — les comptes Préparation arrivent bientôt.',
    team_add_cta: 'Ajouter un accès',
    team_never_share: 'Ne partagez jamais votre compte : en cas de litige, on doit savoir qui a fait quoi.',
    team_prep_matrix_title: 'Ce que voit un accès Préparation',
    team_can_do: 'Peut faire',
    prep_can_1: 'Préparer, « C’est prêt », rupture, délai',
    prep_can_2: 'Stock, photos, code de remise',
    prep_can_3: 'Répondre aux litiges, inspecter les retours',
    prep_can_4: '« Fermer aujourd’hui »',
    team_never_sees: 'Ne voit jamais',
    prep_cannot_1: 'L’argent, les versements, les documents',
    prep_cannot_2: 'Les prix, la publication, les plans',
    prep_cannot_3: 'Le numéro de versement, l’équipe',
    team_owner_can_all: 'Vous, propriétaire, pouvez tout faire.',
    team_preview_prep_home: 'Aperçu de l’accueil Préparation',
    team_preview_not_wired: 'Disponible dès qu’un second accès réel existera côté serveur.',
    team_how_2fa: 'Ajouter ou retirer un accès demandera un code reçu par SMS : c’est votre second facteur.',
    team_how_log: 'Chaque action sera signée par son auteur et visible dans le journal de la commande.',

    // ── Mon équipe · ajouter un accès (VD-11 fig.6) ───────────────────────
    add_title: 'Ajouter un accès',
    add_subtitle: 'La personne reçoit un SMS pour installer l’application et choisir son mot de passe.',
    add_firstname_label: 'Prénom et nom',
    add_firstname_placeholder: 'Prénom',
    add_lastname_placeholder: 'Nom',
    add_phone_label: 'Téléphone',
    add_access_prep_title: 'Accès « Préparation »',
    add_access_prep_can: 'Commandes, stock, photos, code de remise, litiges, retours, « Fermer aujourd’hui ».',
    add_access_prep_cannot: 'Jamais : argent, versements, documents, prix, publication, plans, équipe.',
    add_access_level_fixed_note: 'Seul l’accès Préparation est disponible pour le moment.',
    add_not_wired_title: 'Envoi pas encore branché',
    add_not_wired_text: 'Les comptes d’équipe multi-utilisateurs ne sont pas encore livrés côté serveur. Contactez le support pour un ajout manuel en attendant.',
    add_not_wired_whatsapp_cta: 'Contacter le support WhatsApp',
    add_send_cta: 'Envoyer l’invitation',
    add_sms_hint: 'Pour confirmer, un code vous sera envoyé par SMS.',
    add_whatsapp_message: 'Bonjour, je souhaite ajouter un accès « Préparation » pour {{name}} ({{phone}}) sur ma boutique BelivaY.',
  },
};
