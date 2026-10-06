// Registre des connecteurs : pour chaque méthode de la source (src/donnees/source.ts), la route du serveur
// (relaya-marketplace) qui la sert ou qu'il faut créer, et son état. Une seule vérité, lue par :
// - src/api/source-api.ts (message de NonDisponible : la route attendue) ;
// - outils/connecteurs.mjs, qui écrit le tableau de CONNECTEURS.md ;
// - tests/connecteurs.spec.ts (chaque méthode de Source est ici, et seules les méthodes branchées ont l'état
//   « branche » ou « partiel »).
//
// Les chemins sont complets (/api/…). Routes existantes : relaya-marketplace, commit 9546ffe (3 oct. 2026) ;
// routes à créer : les noms de la spécification (logique-metier/api.json, CL-02), sous /api/.
import type { Source } from '../donnees/source'

export type MethodeSource = Exclude<keyof Source, 'nom'>

/**
 * branche : appel réel, format converti sans perte ;
 * partiel : appel réel, mais des champs de l'écran n'existent pas encore côté serveur (valeurs neutres, listées) ;
 * serveur : la route manque (ou ne suffit pas) côté serveur ; l'appel lève NonDisponible ;
 * front : la route serveur existe ; il manque un morceau côté site (SDK, appareil) ; l'appel lève NonDisponible ;
 * demo : simulation propre à la démonstration ; sans objet avec le vrai serveur.
 */
export type EtatConnecteur = 'branche' | 'partiel' | 'serveur' | 'front' | 'demo'

export interface Connecteur {
  domaine: string
  etat: EtatConnecteur
  /** Route(s) : « MÉTHODE /api/chemin ». */
  route: string
  /** Corps → réponse, en bref. */
  echange?: string
  /** Ce qui existe déjà dans relaya, ce qui manque, la règle à respecter. */
  note?: string
}

const D = {
  session: 'Session, menu et compte',
  connexion: 'Connexion et inscription',
  profil: 'Profil, numéro et codes',
  securite: 'Sécurité, confidentialité, suppression',
  notifs: 'Notifications',
  relais: 'Relais, adresses, intérêts',
  catalogue: 'Catalogue, fiche et avis produit',
  favoris: 'Favoris',
  panier: 'Panier et panier partagé',
  paiement: 'Paiement',
  commandes: 'Commandes, retrait et modification',
  litiges: 'Litiges et retours',
  avis: 'Avis sur une commande',
  messages: 'Messagerie, aide et rappel',
  legal: 'Légal',
  argent: 'Portefeuille, moyens de paiement, factures',
  prime: 'Abonnement et cagnotte',
  boutique: 'Devenir vendeur',
  diaspora: 'Diaspora et proches',
  listes: "Listes d'envies",
  echanges: 'Échanges entre clients',
  cotisations: 'Cotisations',
  cote: 'Mises de côté',
  flash: 'Ventes flash',
  rentree: 'Rentrée scolaire',
  famille: 'Panier famille',
  troc: 'Troc',
  whatsapp: 'WhatsApp',
  contenus: 'Contenus et photos',
} as const

const c = (domaine: string, etat: EtatConnecteur, route: string, echange?: string, note?: string): Connecteur => ({ domaine, etat, route, echange, note })

export const CONNECTEURS: Record<MethodeSource, Connecteur> = {
  // ——— Session, menu et compte ———
  session: c(D.session, 'partiel', 'GET /api/auth/me/ · GET /api/auth/notifications/ · GET /api/cart · GET /api/orders/my-orders/ · GET /api/config/flags · GET /api/me', '→ Session', 'Interrupteurs : GET /api/config/flags (kit) ; relais habituel : GET /api/me (kit). Manquent : horaire du jour en mots du relais, chiffres du bandeau (quartiers exploités, seuil de retrait offert), type de compte, devise et proche actif (diaspora). À terme un seul GET /api/me (CL-02).'),
  menu: c(D.session, 'branche', 'GET /api/me/menu', '→ DonneesMenu (promotions, univers et compteurs réels, portefeuille, commandes, litiges, messages, heures du support)'),
  entete: c(D.session, 'branche', 'aucune', '→ null', "Provisoire : en production chaque écran lit son titre dans ses propres données (« Ma commande · BLV-… »)."),
  compte: c(D.session, 'branche', 'GET /api/me', '→ DonneesCompte (compteurs, portefeuille, palier, relais, adresse principale, moyens, avis à donner, boutique)', 'Kit : apps/client_accounts (donnees_compte). Le scénario « nouveau » est propre à la démonstration.'),

  // ——— Connexion et inscription ———
  connecter: c(D.connexion, 'front', 'POST /api/auth/google/ {credential} · POST /api/auth/apple/ {identity_token, authorization_code}', '→ {access, refresh, created} ou {2fa_required}',
    'Routes existantes. Manque côté site : Google Identity Services (VITE_GOOGLE_CLIENT_ID) et Sign in with Apple JS (VITE_APPLE_CLIENT_ID) pour obtenir le jeton.'),
  compteConnu: c(D.connexion, 'branche', "aucune (mémoire de l'appareil)", '→ prénom et e-mail masqué du dernier compte retenu', 'Google One Tap (FedCM) pourra le compléter.'),
  compteRetenu: c(D.connexion, 'branche', "aucune (mémoire de l'appareil)", '→ {emailMasque} si un jeton de rafraîchissement est gardé'),
  reprendreCompte: c(D.connexion, 'branche', 'POST /api/auth/refresh/ {refresh}', '→ {access, refresh} puis session()'),
  connecterEmail: c(D.connexion, 'branche', 'POST /api/auth/login/ {username: e-mail, password}', '→ {access, refresh} ; 401 → incorrect ; 429 → bloqué',
    "Le serveur ne renvoie pas les essais restants (CIN : 5 essais puis 15 min) ; limite actuelle 5/min par IP. La 2FA par e-mail (2fa_required) n'a pas d'écran."),
  inscrire: c(D.connexion, 'branche', 'POST /api/auth/register/ {username, email, password, password2, first_name} puis POST /api/auth/login/', '→ 201 utilisateur, puis jetons',
    'Spécification : POST /auth/email {mode: signup} (409 e-mail pris).'),
  deconnecter: c(D.connexion, 'branche', 'POST /api/auth/logout/ {refresh}', '→ 200', 'Révoquer aussi le jeton de notifications (DELETE /api/devices, CAP-17).'),
  demanderLienMdp: c(D.connexion, 'branche', 'POST /api/auth/password/forgot {email}', '→ 202 {destination, valideMinutes}', 'Toujours 202, que le compte existe ou non (CAP-16) ; lien à usage unique (MDP-LIEN), envoyé par e-mail (/mdp-nouveau?jeton=…). email null : le compte retenu sur l’appareil.'),
  nouveauMotDePasse: c(D.connexion, 'branche', 'POST /api/auth/password/reset {jeton, mot_de_passe}', '→ 200 {ok, email masqué} | 422 regle | 410 expire (lien utilisé, remplacé ou expiré) | 404 invalide', 'Page /mdp-nouveau du lien reçu par e-mail. Jeton à usage unique, 30 min ; règle DP-04 (8 caractères dont un chiffre) refaite côté serveur ; succès : les autres sessions sont révoquées.'),

  // ——— Profil, numéro et codes ———
  envoyerCode: c(D.profil, 'branche', 'POST /api/auth/otp/send {purpose, destination?, canal: sms|whatsapp}', '→ 202 EnvoiCode (destination masquée, valideMinutes, renvoiSecondes)', 'purpose = l’objet du site (profil, email-sms, email-adresse, numero-ancien, numero-nouveau, moyen, suppression) ; sans destination : le numéro vérifié du compte. Prestataire SMS : console dans le kit (à désigner).'),
  verifierPremierNumero: c(D.profil, 'branche', 'POST /api/auth/otp/verify {numero, code}', '→ ResultatCode (client | essaisRestants | bloqueJusqua) | 409 utilise', 'relaya : POST /api/auth/phone/validate/ normalise le numéro sans le vérifier.'),
  verifierNouvelEmail: c(D.profil, 'branche', 'POST /api/me/email/check {email}', '→ 200 | 409 pris | 422 meme'),
  confirmerProfil: c(D.profil, 'branche', 'PATCH /api/me {prenom, nom, photo, code}', '→ client', 'relaya : PATCH /api/auth/profile/update/ et POST /api/auth/profile/avatar/ existent, sans code SMS (DP-52 en exige un).'),
  verifierCodeEmail: c(D.profil, 'branche', 'POST /api/auth/otp/verify {purpose: email-sms, code}'),
  confirmerEmail: c(D.profil, 'branche', 'PUT /api/me/email {email, code}', '→ client'),
  verifierCodeNumeroAncien: c(D.profil, 'branche', 'POST /api/auth/otp/verify {purpose: numero-ancien, code}'),
  verifierNouveauNumero: c(D.profil, 'branche', 'POST /api/me/phone/check {numero}', '→ 200 | 409 utilise | 422 meme'),
  confirmerNumero: c(D.profil, 'branche', 'PUT /api/me/phone {numero, code}', '→ client ; codes de retrait régénérés, autres sessions fermées (CAP-15)'),
  changementNumero: c(D.profil, 'branche', 'GET /api/me/phone/last-change', '→ ChangementNumero | 204'),

  // ——— Sécurité, confidentialité, suppression ———
  securite: c(D.securite, 'partiel', 'GET /api/auth/me/ · GET /api/auth/sessions/ · GET /api/me', '→ DonneesSecurite', 'Numéro vérifié : GET /api/me (kit). Manquent : date de vérification, comptes Google/Apple liés, historique des connexions, lieu, biométrie, seuil CODE-BIO, alerte de connexion (écrite par PATCH /api/me/security, pas encore relue).'),
  lierMethode: c(D.securite, 'front', 'POST /api/me/identities {provider: google|apple, jeton}', '→ 200 | 409 pris', 'Route du kit écrite (apps/client_accounts) ; manquent côté site les SDK Google Identity Services (VITE_GOOGLE_CLIENT_ID) et Sign in with Apple JS (VITE_APPLE_CLIENT_ID) pour obtenir le jeton.'),
  delierMethode: c(D.securite, 'branche', 'DELETE /api/me/identities/{provider}', '→ 200 | 409 derniere'),
  changerMotDePasse: c(D.securite, 'branche', 'POST /api/auth/change-password/ {old_password, new_password, new_password2}', '→ 200 | 400 old_password → ancien | 400 new_password → regle',
    'Premier mot de passe (compte Google ou Apple, ancien = null) : route à créer POST /api/auth/password/set. Fermer les autres sessions (CAP-17).'),
  deconnecterAppareil: c(D.securite, 'branche', 'DELETE /api/auth/sessions/{jti}/revoke/'),
  deconnecterAutres: c(D.securite, 'branche', 'POST /api/auth/sessions/revoke-all/'),
  reglerBiometrie: c(D.securite, 'front', "aucune (réglage de l'appareil)", 'WebAuthn (passkey) sur le site ; FaceID/empreinte dans l’application', 'Réglage local de chaque téléphone ; à brancher avec WebAuthn.'),
  reglerAlerteConnexion: c(D.securite, 'branche', 'PATCH /api/me/security {alerte_connexion}'),
  confidentialite: c(D.securite, 'branche', 'GET /api/me/privacy', '→ personnalisation, nom au retrait, historique (recherches, vus)'),
  reglerConfidentialite: c(D.securite, 'branche', 'PATCH /api/me/privacy {personnalisation?, nom_retrait?}'),
  effacerHistorique: c(D.securite, 'branche', 'DELETE /api/me/search-history · DELETE /api/me/viewed', 'quoi = recherches | vus | tout'),
  suppression: c(D.securite, 'branche', 'GET /api/me/deletion', '→ commandes en cours, solde, numéro masqué, ce qui est perdu, durée de garde'),
  supprimerCompte: c(D.securite, 'branche', 'DELETE /api/me {code}', '→ 202 | 409 compte_en_cours', 'Kit : code SMS (objet suppression), pseudonymisation, données légales gardées ; succès : jetons et compte retenu effacés de l’appareil. relaya : DELETE /api/auth/me/ {password} reste pour ses autres clients.'),

  // ——— Notifications ———
  notificationsClient: c(D.notifs, 'partiel', 'GET /api/auth/notifications/', '→ [{id, title, message, notification_type, action_url, is_read, created_at}]',
    'Manquent : catégorie « Retrait » distincte, envoi par SMS (sms), pagination par curseur (30 par page, CAP-05).'),
  lireNotification: c(D.notifs, 'branche', 'POST /api/auth/notifications/{id}/read/ · POST /api/auth/notifications/read-all/'),
  notifications: c(D.notifs, 'branche', 'GET /api/me/notification-settings', '→ numéro, canal, choix, heures calmes',
    'relaya : sms_notifications et newsletter_subscribed sur le profil seulement.'),
  reglerNotification: c(D.notifs, 'branche', 'PUT /api/me/notification-settings {cle, actif}', '→ choix ; 422 category_locked'),
  reglerCanal: c(D.notifs, 'branche', 'PUT /api/me/notification-settings {canal} · POST /api/me/consents', 'WhatsApp : consentement horodaté'),
  reglerCalme: c(D.notifs, 'branche', 'PUT /api/me/notification-settings {calme: {actif, debut, fin}}'),
  enregistrerAbonnementPush: c(D.notifs, 'branche', 'POST /api/devices {type: webpush, abonnement} · DELETE /api/devices/{id}', '→ {ok}',
    'Spécification : POST · DELETE /devices (jeton par appareil, révoqué à la déconnexion, CAP-17). Envoi : Web Push (VAPID) ou FCM côté serveur.'),

  // ——— Relais, adresses, intérêts ———
  relaisListe: c(D.relais, 'partiel', 'GET /api/shipping/relay-points/nearby/?city=&lat=&lng= · GET /api/me', '→ [{id, name, address, city, opening_hours, has_space, distance_km}] ; relais habituel : nom lu dans le compte du kit', 'Route authentifiée (un visiteur ne voit pas les relais). Manquent : gérant, horaire du jour en mots, jour de fermeture ; filtres open_today et not_full (spécification : GET /api/relais?near=).'),
  choisirRelais: c(D.relais, 'branche', 'PUT /api/me/relais-habituel {relais}'),
  adresses: c(D.relais, 'branche', 'GET /api/me/adresses', '→ DonneesAdresses'),
  enregistrerAdresse: c(D.relais, 'branche', 'POST /api/me/adresses {a} · PUT /api/me/adresses/{id} {a}', '→ {ok, adresse} | 422 zone_non_servie {ville}', 'Adresse chiffrée au repos (CAP-21) ; zone : geo.zone_exploitee. relaya garde aussi l’adresse saisie à chaque commande.'),
  supprimerAdresse: c(D.relais, 'branche', 'DELETE /api/me/adresses/{id}'),
  adresseParDefaut: c(D.relais, 'branche', 'PUT /api/me/adresses/{id} {principale: true}'),
  interets: c(D.relais, 'branche', 'GET /api/me/interets', '→ univers choisis'),
  choisirInterets: c(D.relais, 'branche', 'PUT /api/me/interets {univers}'),

  // ——— Catalogue, fiche et avis produit ———
  produits: c(D.catalogue, 'partiel', 'GET /api/catalog/products/?page_size=100', '→ {results: [ProductSerializer]}',
    'Manquent : classe de colis, variantes et options, vendeur (palier, Trust Score, km), autres offres, distance au relais, caractéristiques, univers. Spécification : GET /api/listing/{cat} et GET /api/search (curseur).'),
  produit: c(D.catalogue, 'partiel', 'GET /api/catalog/products/{id}/', '→ ProductSerializer',
    'Mêmes manques ; spécification : GET /api/products/{maitre}?relais=&variante= (offre attribuée, prix livré). relaya a aussi /api/catalog/master-products/{id|slug}/.'),
  avisProduit: c(D.catalogue, 'partiel', 'GET /api/catalog/products/{id}/reviews/', '→ [{id, rating, comment, created_at, is_verified_purchase}]',
    'Manquent : répartition des notes (GET /reviews/summary), variante, photo, votes « utile », réponse du vendeur.'),
  voterAvis: c(D.catalogue, 'branche', 'POST /api/reviews/{id}/vote {action: utile|signaler}'),
  ajouterProduit: c(D.catalogue, 'branche', 'POST /api/cart/lines {produit, options, qte, boutique?}', '→ {ok, id} ; le serveur recalcule le panier (offre, frais)'),

  // ——— Contenus et photos ———
  contenuAccueil: c(D.contenus, 'branche', 'GET /api/content/home', '→ ContenuAccueil (carrousel, catégories, textes flash, bandeau de confiance, fond d’arrivée)',
    'Kit : apps/contenus (éditable dans l’admin, photos téléversées par POST /api/admin/media). Route en échec → contenu par défaut (donnees/contenus.ts).'),

  // ——— Favoris ———
  favoris: c(D.favoris, 'partiel', 'GET /api/auth/favorites/', '→ [{id, product, created_at}]', 'Manquent : variante, prix à l’ajout, prix livré au relais, état du stock (retour), alertes.'),
  basculerFavori: c(D.favoris, 'branche', 'GET /api/auth/favorites/ puis POST /api/auth/favorites/ {product_id} ou DELETE /api/auth/favorites/{id}/', '→ vrai si ajouté'),
  retirerFavori: c(D.favoris, 'branche', 'DELETE /api/auth/favorites/{id}/'),
  remettreFavori: c(D.favoris, 'branche', 'POST /api/auth/favorites/ {product_id}'),
  reglerAlerteFavori: c(D.favoris, 'branche', 'PATCH /api/me/favorites/{id} {alertes: {prix?, stock?}}'),
  favoriAuPanier: c(D.favoris, 'branche', 'POST /api/cart/lines {favori}'),
  mettreEnFavori: c(D.favoris, 'branche', 'POST /api/cart/lines/{id}/save'),

  // ——— Panier et panier partagé ———
  panier: c(D.panier, 'branche', 'GET /api/cart · GET /api/auth/favorites/', '→ panier recalculé depuis zéro (lignes, boutiques, relais, adresse, plafond du comptoir, numéro vérifié) ; favoris de relaya sous le panier', 'Kit : apps/cart (frais du moteur, comptoir, changements CAL-11). Panier d’un visiteur par X-Device-Id : à faire (D18).'),
  verifierPanier: c(D.panier, 'branche', 'GET /api/cart', '→ changements[] : baisses déjà appliquées, hausses, retraits et pris à accepter'),
  accepterChangements: c(D.panier, 'branche', 'POST /api/checkout/confirm'),
  changerQuantite: c(D.panier, 'branche', 'PATCH /api/cart/lines/{id} {qte}'),
  retirerLigne: c(D.panier, 'branche', 'DELETE /api/cart/lines/{id}'),
  remettreLigne: c(D.panier, 'branche', 'POST /api/cart/lines {ligne, position}'),
  ajouterAuPanier: c(D.panier, 'branche', 'POST /api/cart/lines {produit, boutique}'),
  changerOption: c(D.panier, 'branche', 'PATCH /api/cart/lines/{id} {nom, valeur}'),
  choisirVendeur: c(D.panier, 'branche', 'POST /api/cart/lines/{id}/swap-offer {boutique}', '→ refusé si le gain n’est plus positif'),
  choisirModePanier: c(D.panier, 'branche', 'PATCH /api/cart {mode: relais|domicile}'),
  partagerPanier: c(D.panier, 'branche', 'POST /api/carts/{id}/share {lignes?}', '→ PanierPartage (lien de paiement pour un proche) ; {id} = me'),
  panierPartage: c(D.panier, 'branche', 'GET /api/gift-links/{token}', '→ PanierPartage (sans adresse ni numéro)'),
  paniersPartages: c(D.panier, 'branche', 'GET /api/me/gift-links'),
  payerPanierPartage: c(D.panier, 'branche', 'POST /api/gift-payments {token, prenom, email, carte_jeton, devise} (Idempotency-Key)', '→ 3-D Secure ; 402 card_declined, 422 over_cap', 'Carte : jeton du prestataire (src/connecteurs/paiementCarte.ts), jamais le numéro ni le CVC (CAP-24).'),
  choisirRemplacement: c(D.panier, 'branche', 'POST /api/orders/{id}/replacement {autre_vendeur}'),

  // ——— Paiement ———
  passerCommande: c(D.paiement, 'branche', 'POST /api/checkout (Idempotency-Key)', '→ 202 {commande, paiement, expires_at} ; 409 price_changed', 'Kit : apps/cart (prix recontrôlés, montants figés, sous-commandes, lignes réservées). Clé d’idempotence par intention : reprise après une coupure = même clé. À finir chez relaya : création de la commande par son circuit (D8), Mobile Money par collect et webhooks (D9).'),
  commandePassee: c(D.paiement, 'branche', 'GET /api/orders/{id}/receipt', '→ CommandePassee (reçu)'),
  paiementsEnAttente: c(D.paiement, 'branche', 'GET /api/me/pending-payments', '→ CommandePassee[] : demandes Mobile Money non validées, non expirées', 'Kit : apps/cart (paiement.en_attente).'),
  confirmerPaiement: c(D.paiement, 'branche', 'GET /api/orders/{id}/receipt (sondage 3 s puis 10 s)', '→ CommandePassee : attente | payee | echec', 'Le serveur seul confirme (webhook de l’agrégateur → paiement.confirmer_paiement) ; le site relit le reçu jusqu’à la fin de la demande.'),
  echouerPaiement: c(D.paiement, 'branche', 'POST /api/payments/{id}/abandon {cause}', '→ 204 : demande abandonnée, rien n’est débité, articles rendus au panier', 'L’écran déclare l’échec (délai écoulé, solde insuffisant) ; l’échec venu de l’agrégateur passe par son webhook.'),
  relancerPaiement: c(D.paiement, 'branche', 'POST /api/payments/{id}/resend {numero?} (Idempotency-Key)', undefined, 'Kit : la demande précédente est remplacée, le délai repart.'),
  annulerPaiement: c(D.paiement, 'branche', 'POST /api/payments/{id}/cancel'),
  payerAuComptoir: c(D.paiement, 'branche', 'POST /api/orders/{id}/counter-payment (Idempotency-Key)', '→ demande Mobile Money du montant dû'),

  // ——— Commandes, retrait et modification ———
  commandes: c(D.commandes, 'partiel', 'GET /api/orders/my-orders/', '→ [OrderDetailSerializer]',
    "Avec le champ « espace_client » (pickup.services.vue_commande_client du kit, décision D14) : colis par boutique, code de retrait, garde, comptoir, étapes, fenêtre de retour, au format du site (vérifié contre le serveur d'essai). Sans lui : colis par article, sans code ni garde (relaya a une commande par panier, sans sous-commande)."),
  commandeClient: c(D.commandes, 'partiel', 'GET /api/orders/{id}/', '→ OrderDetailSerializer (+ espace_client)', 'Même champ « espace_client » ; suivi : GET /api/orders/{id}/tracking/ existe.'),
  racheter: c(D.commandes, 'branche', 'POST /api/orders/{id}/rebuy', '→ nombre d’articles remis au panier'),
  confirmerRetrait: c(D.commandes, 'branche', 'POST /api/orders/{id}/confirm-receipt/', undefined, 'Spécification : POST /api/orders/{id}/all-good (ferme la fenêtre de retour).'),
  deleguerRetrait: c(D.commandes, 'branche', 'PUT /api/orders/{id}/delegation {prenom, numero | null}',
    undefined, 'relaya : authorized_pickup_name et authorized_pickup_phone existent sur la commande, sans route pour les changer.'),
  apercuAnnulation: c(D.commandes, 'branche', 'GET /api/orders/{id}/manage', '→ sous-commandes, remboursement si annulée'),
  annulerColis: c(D.commandes, 'branche', 'POST /api/suborders/{id}/cancel {motif} (Idempotency-Key)', '→ montant remboursé ; 409 state_changed',
    'relaya : POST /api/orders/{id}/cancel/ annule la commande entière seulement.'),
  changerLieu: c(D.commandes, 'branche', 'PUT /api/orders/{id}/relais {lieu, frais} · PUT /api/orders/{id}/address {lieu, frais} · POST /api/parcels/{id}/transfer {lieu, frais}', '→ 409 price_changed | collected | state_changed',
    'Le site lit le mode de la commande (GET /api/orders/{id}/) : relais → /relais (colis arrivés transférés par le serveur, transfert et garde due), domicile → /address (lieu : identifiant ou libellé « Nom · Quartier »).'),

  // ——— Litiges et retours ———
  litiges: c(D.litiges, 'branche', 'GET /api/me/disputes', '→ dossiers', 'relaya : GET /api/orders/{id}/disputes/ par commande seulement.'),
  litige: c(D.litiges, 'branche', 'GET /api/disputes/{id}', '→ états, compte à rebours, réponse du vendeur, décision et motif'),
  commandeLitige: c(D.litiges, 'branche', 'GET /api/orders/{id}?for=dispute', '→ colis et relais de la commande'),
  ouvrirLitige: c(D.litiges, 'branche', 'POST /api/disputes {ref, colis, pb, description, souhait, photos, origine?} (Idempotency-Key)', '→ dossier (remboursé d’office sous le seuil) ; 409 deja : le site rend le dossier déjà ouvert',
    'relaya : POST /api/orders/{id}/disputes/ {order_item, reason, description} existe, sans photos, souhait ni remboursement automatique.'),
  ajouterPreuve: c(D.litiges, 'branche', 'POST /api/disputes/{id}/photos {photo} (data: URL ou multipart)', undefined, 'relaya : POST /api/orders/evidence-requests/{id}/respond/ répond à une demande de preuve.'),
  repondreArrangement: c(D.litiges, 'branche', 'POST /api/disputes/{id}/arrangement {accepte}'),
  contesterDecision: c(D.litiges, 'branche', 'POST /api/disputes/{id}/appeal {motif}', '→ une fois, sous 48 h (DP-35)'),
  retirerLitige: c(D.litiges, 'branche', 'POST /api/disputes/{id}/withdraw'),
  deposerRetour: c(D.litiges, 'branche', 'POST /api/returns/{id}/deposit', undefined, 'relaya : POST /api/orders/{id}/returns/ crée le retour ; le dépôt est scanné par le relais.'),

  // ——— Avis sur une commande ———
  avis: c(D.avis, 'branche', 'GET /api/orders/{id}/reviews', '→ commande à noter, fenêtre (7 jours)'),
  envoyerAvis: c(D.avis, 'branche', 'POST · PUT /api/orders/{id}/reviews {notes[], commentaire, photo}', '→ 403 non_eligible | 410 fenetre_fermee',
    'relaya : POST /api/catalog/products/{id}/add_review/ note un produit, pas le vendeur et le relais.'),

  // ——— Messagerie, aide et rappel ———
  conversations: c(D.messages, 'branche', 'GET /api/me/threads', '→ conversations', 'relaya : GET /api/shipping/orders/{id}/messages/ par commande seulement.'),
  conversation: c(D.messages, 'branche', 'GET /api/me/threads/{id}', '→ la marque lue'),
  envoyerMessage: c(D.messages, 'branche', 'POST /api/me/threads/{id}/messages {texte?, photo?}', '→ {masked[]} (numéros, e-mails, liens retirés côté serveur)'),
  marquerToutLu: c(D.messages, 'branche', 'POST /api/me/threads/read'),
  poserQuestion: c(D.messages, 'branche', 'POST /api/messages/threads {produit, texte}', '→ {id, masked[]}'),
  ecrireSupport: c(D.messages, 'partiel', 'POST /api/contact/ {name, email, phone, subject, message}', '→ {id}',
    'Formulaire de contact de relaya : pas de fil de conversation, ni photo, ni commande liée, ni masquage. Spécification : POST /api/support/threads.'),
  faq: c(D.messages, 'branche', 'GET /api/help/faq?lang=&q='),
  aide: c(D.messages, 'branche', 'GET /api/help', '→ dossier en cours, conversations, changement des conditions'),
  rappel: c(D.messages, 'branche', 'GET /api/support/callback'),
  demanderRappel: c(D.messages, 'branche', 'POST /api/support/callback {sujet, commande, creneau, precision}', '→ Rappel (aujourd’hui ou demain)'),
  annulerRappel: c(D.messages, 'branche', 'DELETE /api/support/callback'),

  // ——— Légal ———
  legal: c(D.legal, 'branche', 'GET /api/legal/{doc}?lang= · GET /api/me/legal', '→ version, date, essentiel, PDF ; versions acceptées'),
  accepterConditions: c(D.legal, 'branche', 'POST /api/me/legal/accept {doc, version}'),

  // ——— Portefeuille, moyens de paiement, factures ———
  factures: c(D.argent, 'branche', 'GET /api/me/factures · GET /api/orders/{id}/invoice.pdf', '→ factures (toutes les pages du curseur) et commandes annulées ; PDF généré par le serveur, montants figés'),
  portefeuille: c(D.argent, 'branche', 'GET /api/me/wallet', '→ solde, mouvements, plafonds (FF-WALLET)', 'Kit : apps/wallet, derrière FF-WALLET (404 si fermé). relaya : GET /api/payments/v2/me/refunds/ liste les remboursements.'),
  recharger: c(D.argent, 'branche', 'POST /api/me/wallet/topups {montant, moyen} (Idempotency-Key)'),
  fraisRetrait: c(D.argent, 'branche', 'GET /api/me/wallet/withdrawal-fee?montant='),
  retirer: c(D.argent, 'branche', 'POST /api/me/wallet/withdrawals {montant, moyen} (Idempotency-Key)'),
  moyensPaiement: c(D.argent, 'branche', 'GET /api/me/moyens-paiement', '→ numéros Mobile Money', 'relaya : /api/auth/payout-accounts/ sert aux versements des partenaires, pas aux paiements du client.'),
  ajouterMoyen: c(D.argent, 'branche', 'POST /api/me/moyens-paiement {numero}', '→ {ok, envoi: EnvoiCode} (le code part avec la réponse) | 409 deja ; 422 numero_invalide, operateur_non_accepte', 'Un seul envoi : le site n’appelle pas envoyerCode après ; « Renvoyer le code » le fait (envoyerCode(moyen, numéro)), après renvoiSecondes (sinon 429 trop_tot).'),
  confirmerMoyen: c(D.argent, 'branche', 'POST /api/me/moyens-paiement/{id}/verify {code}', '→ ResultatCode ; {id} : le numéro saisi (ou l’identifiant du moyen)'),
  moyenParDefaut: c(D.argent, 'branche', 'PATCH /api/me/moyens-paiement/{id} {par_defaut: true}'),
  retirerMoyen: c(D.argent, 'branche', 'DELETE /api/me/moyens-paiement/{id}'),
  cartes: c(D.argent, 'branche', 'GET /api/me/cartes', '→ cartes enregistrées chez le prestataire (jamais le numéro)'),
  ajouterCarte: c(D.argent, 'branche', 'POST /api/me/cartes {jeton, titulaire}', '→ carte (marque, 4 derniers chiffres, expiration lus chez le prestataire) | 409 deja', 'Le numéro et le CVC sont tokenisés dans le navigateur (src/connecteurs/paiementCarte.ts), jamais envoyés à BelivaY (CAP-24).'),
  retirerCarte: c(D.argent, 'branche', 'DELETE /api/me/cartes/{id}'),
  carteParDefaut: c(D.argent, 'branche', 'PATCH /api/me/cartes/{id} {par_defaut: true}'),

  // ——— Abonnement et cagnotte ———
  prime: c(D.prime, 'branche', 'GET /api/me/subscription', '→ palier, formule, prélèvements, cagnotte, parrainage (FF-ABONNEMENT)', 'relaya : abonnements des vendeurs seulement (/api/vendors/plans/).'),
  payerAbonnement: c(D.prime, 'branche', 'POST /api/me/subscription/pay {moyen} (Idempotency-Key)'),
  changerMoyenAbonnement: c(D.prime, 'branche', 'PATCH /api/me/subscription {moyen}'),
  souscrire: c(D.prime, 'branche', 'POST /api/me/subscription {palier, formule, moyen} (Idempotency-Key)', '→ 409 trial_used'),
  resilierAbonnement: c(D.prime, 'branche', 'POST /api/me/subscription/cancel'),
  reprendreAbonnement: c(D.prime, 'branche', 'POST /api/me/subscription/resume'),
  offrirAbonnement: c(D.prime, 'branche', 'POST /api/subscription-gifts {numero, prenom, palier, mois, message, carte} (Idempotency-Key)', '→ {ok, …} | {ok: false, raison: inconnu} ; 422 action_requise (3-D Secure), carte_refusee, plafond_carte', 'Carte : jeton du prestataire (src/connecteurs/paiementCarte.ts), jamais le numéro ni le CVC (CAP-24).'),
  verserCagnotte: c(D.prime, 'branche', 'POST /api/me/cagnotte/payout', '→ montant versé'),

  // ——— Devenir vendeur ———
  boutique: c(D.boutique, 'branche', 'GET /api/me/shop', '→ boutique ouverte depuis le compte | 204', 'Route du kit (client_accounts). relaya : GET /api/vendors/profile/ existe (profil vendeur) ; champs à aligner (code, pièce).'),
  ouvrirBoutique: c(D.boutique, 'branche', 'POST /api/me/shop {nom, categorie, type}', '→ boutique | 409 nom_pris', 'Route du kit (client_accounts : VendorProfile EN ATTENTE par le pont). relaya : POST /api/vendors/apply/ existe ; champs à aligner.'),
  demanderBusiness: c(D.boutique, 'branche', 'POST /api/me/business {piece}'),

  // ——— Diaspora et proches ———
  envoyerCodeDiaspora: c(D.diaspora, 'branche', 'POST /api/auth/otp/send {purpose: diaspora | diaspora-renforce, canal: sms|email, destination?}', undefined, 'Inscription : sans compte, à la destination donnée. Vérification renforcée d’une commande pour un proche (numéro masqué du compte) : diaspora-renforce, au numéro étranger vérifié du compte.'),
  verifierCodeDiaspora: c(D.diaspora, 'branche', 'POST /api/auth/otp/verify {purpose: diaspora, destination, code}', '→ 200 | 422 code'),
  identiteFournisseur: c(D.diaspora, 'front', 'POST /api/auth/social/lookup {provider: google|apple, credential | identity_token}', '→ {jeton, prenom, nom, email, compte: null|standard|diaspora}',
    'Jeton obtenu par Google Identity Services (VITE_GOOGLE_CLIENT_ID) ou Sign in with Apple JS (VITE_APPLE_CLIENT_ID) ; le serveur le vérifie et ne crée rien.'),
  inscrireDiaspora: c(D.diaspora, 'branche', 'POST /api/auth/diaspora/register {prenom, nom, email, motDePasse, codeEmail, naissance, pays, ville, indicatif, numero, code} · POST /api/auth/social/diaspora {fournisseur: google|apple|numero, jeton?, convertir?, prenom, nom, email, naissance, pays, ville, indicatif, numero, code}',
    '→ session | 409 existe | 422 code, codeEmail, age, pays, numero, jeton',
    'Communs : prénom, nom, naissance (18 ans), pays accepté et son indicatif, numéro de ce pays (jamais +237) vérifié par code SMS. Google/Apple : e-mail repris du jeton (déjà vérifié), ni mot de passe ni code e-mail ; convertir=true passe le compte existant en diaspora. Numéro : e-mail facultatif.'),
  liensFamille: c(D.diaspora, 'branche', 'GET /api/me/family-links'),
  creerCodeFamille: c(D.diaspora, 'branche', 'POST /api/me/family-links/code'),
  lierParCode: c(D.diaspora, 'branche', 'POST /api/me/family-links {code}'),
  inviterProche: c(D.diaspora, 'branche', 'POST /api/me/family-links/invite {prenom, numero}'),
  repondreLien: c(D.diaspora, 'branche', 'POST /api/me/family-links/{id}/answer {accepte, relais?}'),
  retirerLien: c(D.diaspora, 'branche', 'DELETE /api/me/family-links/{id}'),
  commanderPour: c(D.diaspora, 'branche', 'POST /api/family-links/{id}/orders {carte, bin, paysCarte, devise, mot, titulaire, codeSms?, livraison, moyen, demande?, supplementPar?} (Idempotency-Key)', '→ 3-D Secure ou Apple Pay / Google Pay ; contrôle de cohérence pays/BIN côté serveur ; 422 domicile, demande, garantie', 'Règle donnees/echanges.ts (totalDiaspora, supplementAuProche) refaite côté serveur ; l’adresse du proche ne sort jamais. Carte : jeton du prestataire (src/connecteurs/paiementCarte.ts), jamais le numéro ni le CVC (CAP-24). Le BIN (6 à 8 chiffres, permis par PCI DSS) sert au contrôle de cohérence.'),
  reglerDevise: c(D.diaspora, 'branche', 'PATCH /api/me/preferences {devise: XAF|EUR|USD}', '→ 403 hors compte diaspora', 'Taux du dollar : celui du prestataire, figé au paiement ; euro : parité fixe 655,957.'),
  choisirProche: c(D.diaspora, 'branche', 'PUT /api/me/active-relative {lien}', '→ 403 hors compte diaspora, 404 lien non actif', 'La session porte ensuite proche {id, prenom, quartier, ville, domicile, autres} ; les distances, délais et « retirable aujourd’hui » du catalogue partent du relais de ce proche (jamais son adresse ni son code).'),
  lienInvitation: c(D.diaspora, 'branche', 'POST /api/me/family-links/invitation', '→ {type: famille|invitation, code, jusqua} (lien partageable, QR)'),
  accepterInvitation: c(D.diaspora, 'branche', 'POST /api/me/family-links/invitation/{code}/accept {relais}', '→ lien | 404 code, 409 deja, 422 max, 403 type'),
  reglerLivraisonLien: c(D.diaspora, 'branche', 'PATCH /api/me/family-links/{id}/delivery {relais, domicile, prefere}', 'côté proche au Cameroun ; l’adresse reste dans son compte'),
  demandesProches: c(D.diaspora, 'branche', 'GET /api/me/family-requests', '→ paniers envoyés et reçus entre proches reliés'),
  envoyerPanierAuProche: c(D.diaspora, 'branche', 'POST /api/me/family-links/{id}/requests {mot, livraison, lignes?}', '→ demande | 409 deja, 422 vide, plafond, domicile'),
  refuserDemande: c(D.diaspora, 'branche', 'POST /api/me/family-requests/{id}/decline {mot}'),
  annulerDemande: c(D.diaspora, 'branche', 'DELETE /api/me/family-requests/{id}'),

  // ——— Listes d'envies ———
  listes: c(D.listes, 'branche', 'GET /api/me/wishlists'),
  creerListe: c(D.listes, 'branche', 'POST /api/me/wishlists {nom, mode, remiseLe, surprise, occasion?, hotes?, cagnotte?}', '→ 201 ListeEnvies'),
  ajouterArticleListe: c(D.listes, 'branche', 'POST /api/me/wishlists/{id}/items {produit}'),
  retirerArticleListe: c(D.listes, 'branche', 'DELETE /api/me/wishlists/{id}/items/{produit}', '→ refusé pour un article offert'),
  reglerListe: c(D.listes, 'branche', 'PATCH /api/me/wishlists/{id}'),
  partagerListe: c(D.listes, 'branche', 'POST /api/me/wishlists/{id}/share'),
  arreterPartage: c(D.listes, 'branche', 'DELETE /api/me/wishlists/{id}/share'),
  demarrerListe: c(D.listes, 'branche', 'POST /api/me/wishlists/{id}/start'),
  listePublique: c(D.listes, 'branche', 'GET /api/wishlists/{code}', 'lien public l/ (CAP-11)'),
  offrirArticleListe: c(D.listes, 'branche', 'POST /api/wishlists/{code}/gifts {produit, prenom, email, moyen, jeton, prix_vu, qui, livraison, devise, carte: {bin, pays_carte, pays, code_email}} (Idempotency-Key)', '→ 409 price_changed (CLE-39) ; 422 plafond, domicile, coherence (avec le contrôle), verification', 'À créer. Sans compte, depuis n’importe où : relais du destinataire ou chez lui (adresse jamais renvoyée) ; carte : plafonds et contrôle de cohérence du compte diaspora, historique par e-mail.'),
  envoyerCodeCadeau: c(D.listes, 'branche', 'POST /api/wishlists/{code}/gifts/otp {email}', '→ destination masquée, validité', 'À créer. Vérification renforcée d’un cadeau payé par carte (contrôle de cohérence « renforcé »).'),
  suiviCadeau: c(D.listes, 'branche', 'GET /api/wishlists/{code}/gifts/{ref}', '→ étapes, preuve de remise, merci', 'À créer. Public pour qui a offert (lien de l’e-mail de suivi) : jamais l’adresse, le code ni le numéro du destinataire.'),
  partagerStatutListe: c(D.listes, 'branche', 'POST /api/me/wishlists/{id}/status-shares {canal}', '→ code et validité du lien', 'À créer. Crée le lien au besoin (comme /share) et compte les mises en statut par canal.'),

  // ——— Échanges entre clients (donnees/echanges.ts : qui paie la livraison, « BelivaY ne perd jamais ») ———
  echanges: c(D.echanges, 'branche', 'GET /api/me/exchanges', '→ proches, listes suivies, envois, remerciements, colis payés par l’un pour l’autre', 'À créer. Proches : comptes BelivaY trouvés par numéro ou liés (family-links) ; jamais l’adresse ni le numéro complet.'),
  chercherProche: c(D.echanges, 'branche', 'POST /api/me/contacts/lookup {numero}', '→ prénom et quartier du relais, ou inconnu', 'À créer. Limiter les recherches (anti-annuaire) : 20 par jour.'),
  envoyerAuxProches: c(D.echanges, 'branche', 'POST /api/me/exchanges/send {type, id, proches[]}', '→ nombre de notifications envoyées', 'À créer. Une notification dans l’application du proche, une fois par objet.'),
  rappelerInvites: c(D.echanges, 'branche', 'POST /api/me/wishlists/{id}/remind', '→ 429 too_early {prochain} ; un rappel tous les 3 jours au plus', 'À créer. Seulement les invités BelivaY qui n’ont rien offert ; BelivaY ne relance jamais de lui-même.'),
  suivreListe: c(D.echanges, 'branche', 'PUT /api/me/followed-wishlists/{code} {suivre, rappel}', undefined, 'À créer. Rappel push N jours avant la date de remise, à qui l’a demandé.'),
  remercier: c(D.echanges, 'branche', 'POST /api/me/thanks {ref, texte}', undefined, 'À créer. Message à qui a offert (e-mail pour un invité sans compte).'),
  repondreColis: c(D.echanges, 'branche', 'POST /api/me/incoming-parcels/{id}/answer {accepte}', '→ colis ; refus : retenue (retenueRefus) et remboursement du payeur', 'À créer. Sans frais avant l’expédition (règle 6).'),
  cotiserArticleListe: c(D.echanges, 'branche', 'POST /api/wishlists/{code}/items/{produit}/pool', '→ code de la cotisation (créée au besoin)', 'À créer. Articles de 15 000 F et plus.'),
  envoyerPanierA: c(D.echanges, 'branche', 'POST /api/cart/send-to {prenom, proche?, relais, qui_paie_livraison, moyen, mot} (Idempotency-Key)', '→ référence ; refus « garantie » si le destinataire ne peut pas payer la livraison', 'À créer. Contrôle destinatairePeutPayer refait côté serveur.'),
  // Reçus (DP-54) : chaque envoi entre clients a sa réception ; une seule boîte, des deux côtés.
  recus: c(D.echanges, 'branche', 'GET /api/me/inbox', '→ envois reçus (à traiter d’abord) et envoyés, avec les réponses ; nombre à traiter', 'À créer. Un envoi par destinataire (compte trouvé par numéro vérifié ou e-mail) ; sans compte, seul le lien public existe. Jamais l’adresse ni le numéro complet de l’autre.'),
  recu: c(D.echanges, 'branche', 'GET /api/me/inbox/{id}', '→ envoi, sens (reçu, envoyé), moyens du compte (Mobile Money, cartes, portefeuille ; diaspora : cartes)', 'À créer. Lu seulement par l’envoyeur et le destinataire.'),
  executerRecu: c(D.echanges, 'branche', 'POST /api/me/inbox/{id}/actions {action, p?, montant?, moyen, qui?, mot?, discret?, relais?} (Idempotency-Key)', '→ envoi mis à jour, commande née, montant payé ; 409 traite, 410 expire, 422 garantie, montant, solde, moyen, diaspora', 'À créer. Règle donnees/echanges.ts refaite côté serveur : articles payés et bloqués avant l’envoi au vendeur ; « destinataire paie » seulement si la garantie couvre le pire cas ; refus sans frais avant l’expédition ; compte diaspora : carte seulement.'),
  remercierRecu: c(D.echanges, 'branche', 'POST /api/me/inbox/{id}/thanks {texte}', undefined, 'À créer. Le bénéficiaire remercie qui a payé (e-mail pour un invité sans compte).'),
  envoyerRecu: c(D.echanges, 'branche', 'POST /api/me/outbox {type, a, prenom, titre, …}', '→ envoi ; dansLApplication si le destinataire a un compte ; refus numero, moi, vide', 'À créer. Anti-annuaire : on ne dit pas si un numéro a un compte avant l’envoi (20 recherches par jour).'),
  participerCagnotteListe: c(D.listes, 'branche', 'POST /api/wishlists/{code}/fund {prenom, montant, moyen, mot, discret} (Idempotency-Key)', '→ montant réuni ; refus ferme, montant', 'À créer. Cagnotte d’une liste (mariage : voyage de noces) : dès 1 000 F, bloquée chez BelivaY puis versée au portefeuille des hôtes à la date de l’événement.'),

  // ——— Cotisations ———
  cotisations: c(D.cotisations, 'branche', 'GET /api/me/pools'),
  creerCotisation: c(D.cotisations, 'branche', 'POST /api/me/pools'),
  cotisationPublique: c(D.cotisations, 'branche', 'GET /api/pools/{code}', 'lien public c/ ; noms discrets masqués'),
  participer: c(D.cotisations, 'branche', 'POST /api/pools/{code}/contributions {prenom, montant, discret, mot, moyen, jeton?, carte} (Idempotency-Key)', undefined, 'Carte : jeton du prestataire (src/connecteurs/paiementCarte.ts), jamais le numéro ni le CVC (CAP-24).'),
  deciderHausse: c(D.cotisations, 'branche', 'POST /api/me/pools/{id}/price-rise {choix, moyen?}'),

  // ——— Mises de côté ———
  misesDeCote: c(D.cote, 'branche', 'GET /api/me/layaways'),
  creerMiseDeCote: c(D.cote, 'branche', 'POST /api/me/layaways {produit, rythme, moyen} (Idempotency-Key)', '→ acompte payé'),
  creerMiseDeCoteListe: c(D.cote, 'branche', 'POST /api/me/layaways {liste, exclus, equivalents, rythme, moyen} (Idempotency-Key)'),
  payerVersement: c(D.cote, 'branche', 'POST /api/me/layaways/{id}/installments {moyen} (Idempotency-Key)'),
  annulerMiseDeCote: c(D.cote, 'branche', 'POST /api/me/layaways/{id}/cancel'),

  // ——— Ventes flash ———
  ventesFlash: c(D.flash, 'branche', 'GET /api/flash-deals', '→ offres, alerte, relais', 'relaya : GET /api/catalog/promotions/active/ et is_flash_deal sur le produit existent ; stock et fin de l’offre à exposer.'),
  ajouterFlash: c(D.flash, 'branche', 'POST /api/cart/lines {produit, flash: true}', '→ ok si l’offre court et qu’il reste du stock'),
  alerteFlash: c(D.flash, 'branche', 'PUT /api/me/notification-settings {flash}'),

  // ——— Rentrée scolaire ———
  rentree: c(D.rentree, 'branche', 'GET /api/school-lists'),
  commanderRentree: c(D.rentree, 'branche', 'POST /api/school-lists/{id}/order {exclus, equivalents, moyen} (Idempotency-Key)', '→ référence de commande'),
  envoyerListePapier: c(D.rentree, 'branche', 'POST /api/school-lists/photo (multipart) {classe, photo}'),
  publierListe: c(D.rentree, 'branche', 'POST /api/school-lists/{id}/publish'),

  // ——— Panier famille ———
  famille: c(D.famille, 'branche', 'GET /api/me/family-baskets'),
  enregistrerPanierFamille: c(D.famille, 'branche', 'POST /api/me/family-baskets · PUT /api/me/family-baskets/{id}'),
  lierDestinataire: c(D.famille, 'branche', 'POST /api/me/family-baskets/recipient {prenom, numero, relais}'),
  payerPanierFamille: c(D.famille, 'branche', 'POST /api/me/family-baskets/{id}/pay {carte_jeton, email, mensuel, jour} (Idempotency-Key)', undefined, 'Carte : jeton du prestataire (src/connecteurs/paiementCarte.ts), jamais le numéro ni le CVC (CAP-24).'),
  suspendrePanierFamille: c(D.famille, 'branche', 'PATCH /api/me/family-baskets/{id} {suspendu}'),

  // ——— Troc ———
  trocs: c(D.troc, 'branche', 'GET /api/me/trades'),
  creerTroc: c(D.troc, 'branche', 'POST /api/me/trades {produit, modele, declare}'),
  repondreTroc: c(D.troc, 'branche', 'POST /api/me/trades/{id}/answer {accepte}'),
  contesterTroc: c(D.troc, 'branche', 'POST /api/me/trades/{id}/contest {texte}'),
  payerTroc: c(D.troc, 'branche', 'POST /api/me/trades/{id}/pay {moyen} (Idempotency-Key)'),
  annulerTroc: c(D.troc, 'branche', 'DELETE /api/me/trades/{id}'),

  // ——— WhatsApp ———
  whatsapp: c(D.whatsapp, 'branche', 'GET /api/whatsapp/conversation', undefined, 'Appel écrit côté site ; le kit répond 501 a_finir tant que l’API WhatsApp Business n’est pas en service (FF-EX06). relaya : module whatsapp_assistant (webhook entrant seulement).'),
  repondreWhatsapp: c(D.whatsapp, 'branche', 'POST /api/whatsapp/conversation/messages {texte}'),
}
