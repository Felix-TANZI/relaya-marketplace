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
  annonces: 'Annonces sponsorisées',
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
  securite: c(D.securite, 'partiel', 'GET /api/auth/me/ · GET /api/auth/sessions/ · GET /api/me · GET /api/me/security · GET /api/me/identities', '→ DonneesSecurite', 'Numéro vérifié : GET /api/me (kit). Date de vérification et alerte de connexion : GET /api/me/security (ajouté, lisait seulement PATCH jusqu’ici) ; comptes Google/Apple liés : GET /api/me/identities (ajouté). Manquent encore : historique des connexions (méthode, lieu), biométrie, seuil CODE-BIO.'),
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
  relaisListe: c(D.relais, 'partiel', 'GET /api/shipping/relay-points/nearby/?city=&lat=&lng= · GET /api/me', '→ [{id, name, address, city, opening_hours, has_space, distance_km}] ; relais habituel : nom lu dans le compte du kit', 'Route désormais AllowAny (accès visiteur, Tâche D3 : apps/shipping/views.py RelayPointNearbyView) — un visiteur sans compte voit déjà les relais, has_space seulement ; un compte connecté reçoit aussi storage_capacity/occupancy. Manquent toujours : gérant, horaire du jour en mots, jour de fermeture ; filtres open_today et not_full (spécification : GET /api/relais?near=).'),
  choisirRelais: c(D.relais, 'branche', 'PUT /api/me/relais-habituel {relais}'),
  adresses: c(D.relais, 'branche', 'GET /api/me/adresses', '→ DonneesAdresses'),
  enregistrerAdresse: c(D.relais, 'branche', 'POST /api/me/adresses {a} · PUT /api/me/adresses/{id} {a}', '→ {ok, adresse} | 422 zone_non_servie {ville}', 'Adresse chiffrée au repos (CAP-21) ; zone : geo.zone_exploitee. relaya garde aussi l’adresse saisie à chaque commande.'),
  supprimerAdresse: c(D.relais, 'branche', 'DELETE /api/me/adresses/{id}'),
  adresseParDefaut: c(D.relais, 'branche', 'PUT /api/me/adresses/{id} {principale: true}'),
  interets: c(D.relais, 'branche', 'GET /api/me/interets', '→ univers choisis'),
  choisirInterets: c(D.relais, 'branche', 'PUT /api/me/interets {univers}'),

  // ——— Catalogue, fiche et avis produit ———
  produits: c(D.catalogue, 'partiel', 'GET /api/catalog/products/?page_size=100&group_by_master=1', '→ {results: [ProductSerializer]}',
    'group_by_master=1 (Tâche D5, apps/catalog/offers.py) : une seule offre par MasterProduct dans la grille (le prix le plus bas, puis le Trust Score le plus haut) — résout le doublon « un vendeur = une carte ». Manquent encore : classe de colis, variantes et options, vendeur (palier, Trust Score, km), autres offres, distance au relais, caractéristiques, univers (ces derniers seraient servis par /api/catalog/master-products/{slug}/, pas encore branché ici). Spécification : GET /api/listing/{cat} et GET /api/search (curseur).'),
  produit: c(D.catalogue, 'partiel', 'GET /api/catalog/products/{id}/', '→ ProductSerializer',
    'Mêmes manques ; spécification : GET /api/products/{maitre}?relais=&variante= (offre attribuée, prix livré). relaya a aussi /api/catalog/master-products/{id|slug}/.'),
  avisProduit: c(D.catalogue, 'partiel', 'GET /api/catalog/products/{id}/reviews/', '→ [{id, rating, comment, created_at, is_verified_purchase}]',
    'Manquent : répartition des notes (GET /reviews/summary), variante, photo, votes « utile », réponse du vendeur.'),
  voterAvis: c(D.catalogue, 'serveur', 'POST /api/reviews/{id}/vote {action: utile|signaler}', undefined,
    'Aucune action « vote » sur ProductReviewViewSet/ProductViewSet côté relaya : la route n’existe pas (vérifié dans apps/catalog/views.py). À créer.'),
  ajouterProduit: c(D.catalogue, 'serveur', 'POST /api/cart/lines {produit, options, qte, boutique?}', '→ {ok, id} ; le serveur recalcule le panier (offre, frais)',
    'apps.cart (kit) n’est pas installé (seuls apps.client_core/otp/client_accounts/notifications_client le sont) : /api/cart/lines n’existe pas. relaya n’a que GET/PUT /api/auth/cart/ (UserCart : tableau JSON remplacé en bloc, sans recalcul serveur par ligne) — modèle très différent, à trancher avec le domaine panier avant de brancher.'),

  // ——— Contenus et photos ———
  contenuAccueil: c(D.contenus, 'serveur', 'GET /api/content/home', '→ ContenuAccueil (carrousel, catégories, textes flash, bandeau de confiance, fond d’arrivée)',
    'apps.contenus (kit) n’est pas installé côté relaya : la route n’existe pas. Le site garde un repli gracieux (contenu par défaut de donnees/contenus.ts), donc l’accueil ne casse pas, mais ce n’est pas du contenu éditorial réel tant que la route n’est pas créée.'),

  // ——— Favoris ———
  favoris: c(D.favoris, 'partiel', 'GET /api/auth/favorites/', '→ [{id, product, created_at}]', 'Manquent : variante, prix à l’ajout, prix livré au relais, état du stock (retour), alertes.'),
  basculerFavori: c(D.favoris, 'branche', 'GET /api/auth/favorites/ puis POST /api/auth/favorites/ {product_id} ou DELETE /api/auth/favorites/{id}/', '→ vrai si ajouté'),
  retirerFavori: c(D.favoris, 'branche', 'DELETE /api/auth/favorites/{id}/'),
  remettreFavori: c(D.favoris, 'branche', 'POST /api/auth/favorites/ {product_id}'),
  reglerAlerteFavori: c(D.favoris, 'branche', 'PATCH /api/me/favorites/{id} {alertes: {prix?, stock?}}'),
  favoriAuPanier: c(D.favoris, 'serveur', 'POST /api/cart/lines {favori}', undefined,
    'apps.cart (kit) n’est pas installé : /api/cart/lines n’existe pas côté relaya. Voir la note de ajouterProduit (même gap, à trancher avec le domaine panier).'),
  mettreEnFavori: c(D.favoris, 'serveur', 'POST /api/cart/lines/{id}/save', undefined,
    'apps.cart (kit) n’est pas installé : /api/cart/lines n’existe pas côté relaya. Voir la note de ajouterProduit (même gap).'),

  // ——— Panier et panier partagé ———
  // Vérifié le 14 oct. 2026 contre backend/ réel (pas le kit) : apps.cart n'est pas dans INSTALLED_APPS, aucune des
  // routes /api/cart*, /api/carts/*, /api/gift-links/*, /api/gift-payments n'existe. apps/orders/serializers.py::
  // OrderCreateSerializer prend tout le panier en un seul POST /api/orders/ {cart_items: [...]}. CONNECTEURS.md
  // (3 oct.) marquait ce domaine « branché » contre le serveur d'essai du kit, pas contre ce dépôt.
  panier: c(D.panier, 'serveur', 'GET /api/cart', undefined, 'apps.cart non installée : pas de panier persistant côté serveur (voir domaines/panier.ts).'),
  verifierPanier: c(D.panier, 'serveur', 'GET /api/cart', undefined, 'apps.cart non installée.'),
  accepterChangements: c(D.panier, 'serveur', 'POST /api/checkout/confirm', undefined, 'apps.cart non installée.'),
  changerQuantite: c(D.panier, 'serveur', 'PATCH /api/cart/lines/{id} {qte}', undefined, 'apps.cart non installée.'),
  retirerLigne: c(D.panier, 'serveur', 'DELETE /api/cart/lines/{id}', undefined, 'apps.cart non installée.'),
  remettreLigne: c(D.panier, 'serveur', 'POST /api/cart/lines {ligne, position}', undefined, 'apps.cart non installée.'),
  ajouterAuPanier: c(D.panier, 'serveur', 'POST /api/cart/lines {produit, boutique}', undefined, 'apps.cart non installée.'),
  changerOption: c(D.panier, 'serveur', 'PATCH /api/cart/lines/{id} {nom, valeur}', undefined, 'apps.cart non installée.'),
  choisirVendeur: c(D.panier, 'serveur', 'POST /api/cart/lines/{id}/swap-offer {boutique}', undefined, 'apps.cart non installée.'),
  choisirModePanier: c(D.panier, 'serveur', 'PATCH /api/cart {mode: relais|domicile}', undefined, 'apps.cart non installée.'),
  partagerPanier: c(D.panier, 'serveur', 'POST /api/carts/me/share {lignes?}', undefined, 'apps.cart non installée ; gift-links/gift-payments absents aussi.'),
  panierPartage: c(D.panier, 'serveur', 'GET /api/gift-links/{token}', undefined, 'gift-links absent côté relaya.'),
  paniersPartages: c(D.panier, 'serveur', 'GET /api/me/gift-links', undefined, 'gift-links absent côté relaya.'),
  payerPanierPartage: c(D.panier, 'serveur', 'POST /api/gift-payments {token, prenom, email, carte_jeton, devise} (Idempotency-Key)', undefined, 'gift-payments absent côté relaya.'),
  choisirRemplacement: c(D.panier, 'serveur', 'POST /api/orders/{id}/replacement {autre_vendeur}', undefined, 'Route absente de apps/orders/urls.py.'),

  // ——— Paiement ———
  // Vérifié le 14 oct. 2026 contre backend/ réel : pas de /api/checkout ni de /api/payments/{id}/{abandon,resend,
  // cancel} (routes du kit). Le vrai moteur (apps.payments : PaymentIntent, EscrowHold, SettlementBatch — construit
  // cette session) expose /api/payments/v2/me/payments/{reference}/{pay,check}/ ; l'intention est créée
  // automatiquement à la commande (apps.payments.bridge.checkout_v2.prepare_payment, appelé par OrderCreateView).
  // Remboursement au moyen d'origine : déjà modélisé (PaymentIntent.RefundTarget.ORIGINAL_SOURCE), rien à construire.
  passerCommande: c(D.paiement, 'serveur', 'POST /api/orders/ {cart_items, city, district, address, customer_phone, ...}', undefined,
    'Signature Source.passerCommande (mode, moyen, comptoir, numero, livraison, frais, prime) incompatible : ne transporte ni les articles ni l’adresse qu’exige la vraie route. À trancher avec le domaine panier (voir rapport de session).'),
  commandePassee: c(D.paiement, 'partiel', 'GET /api/orders/{id}/ · GET /api/payments/v2/me/payments/', '→ CommandePassee reconstitué (pas de reçu dédié)',
    'Pas de GET /api/orders/{id}/receipt côté relaya. La référence de paiement se retrouve en cherchant, dans la liste des intentions de l’acheteur, celle liée à cette commande (BuyerIntentSerializer.orders). Frais et lieu non résolus (voir domaines/paiement.ts).'),
  paiementsEnAttente: c(D.paiement, 'partiel', 'GET /api/payments/v2/me/payments/', '→ intentions non terminées de l’acheteur', 'Pas de route dédiée « en attente » : filtrage côté site sur le statut de l’intention.'),
  confirmerPaiement: c(D.paiement, 'partiel', 'POST /api/payments/v2/me/payments/{reference}/check/ (sondage 3 s puis 10 s)', '→ CommandePassee : attente | payee | echec',
    'Route réelle en POST (interroge activement Campay), pas en GET comme le supposait le kit.'),
  echouerPaiement: c(D.paiement, 'serveur', 'POST /api/payments/{id}/abandon {cause}', undefined, 'Route absente côté relaya : une intention échoue ou expire d’elle-même (webhook Campay), elle ne se déclare pas échouée depuis l’écran.'),
  relancerPaiement: c(D.paiement, 'partiel', 'POST /api/payments/v2/me/payments/{reference}/pay/ {payer_msisdn}', undefined,
    'Mappé sur la vraie route d’émission (idempotente : un autre numéro avant émission remplace la demande, InitiatePaymentView) plutôt que sur /resend (inexistant).'),
  annulerPaiement: c(D.paiement, 'serveur', 'POST /api/payments/{id}/cancel', undefined, 'Route absente côté relaya.'),
  payerAuComptoir: c(D.paiement, 'serveur', 'POST /api/orders/{id}/counter-payment (Idempotency-Key)', undefined, 'Route absente côté relaya.'),

  // ——— Commandes, retrait et modification ———
  // Vérifié le 14 oct. 2026 : OrderDetailSerializer (apps/orders/serializers.py) n'a PAS de champ « espace_client »
  // (le kit ne l'a jamais injecté dans ce dépôt). Shipment EST déjà « un colis par vendeur et par commande »
  // (règle mère, apps/shipping/models.py::Shipment, commentaire du modèle) mais OrderDetailSerializer ne l'expose
  // pas : seul GET /api/orders/{id}/tracking/ sort les Shipment (colis principal + other_shipments). Conflit
  // sous-commandes connu (mémoire projet) : NON résolu ici, voir le rapport de session.
  commandes: c(D.commandes, 'partiel', 'GET /api/orders/my-orders/', '→ [OrderDetailSerializer]',
    'Pas de champ « espace_client » dans ce dépôt (contrairement à ce que CONNECTEURS.md affirmait, vérifié contre le serveur d’essai du kit) : colis par article (OrderItem), sans boutique, code ni garde — voir adaptateurs.ts::versCommande, déjà honnête sur ce point.'),
  commandeClient: c(D.commandes, 'partiel', 'GET /api/orders/{id}/', '→ OrderDetailSerializer', 'Idem ; GET /api/orders/{id}/tracking/ existe et expose les Shipment (un par vendeur) mais n’est pas encore utilisé ici.'),
  racheter: c(D.commandes, 'serveur', 'POST /api/orders/{id}/rebuy', undefined, 'Route absente de apps/orders/urls.py.'),
  confirmerRetrait: c(D.commandes, 'partiel', 'POST /api/orders/{id}/confirm-receipt/ {code}', undefined,
    'Route réelle, mais ConfirmReceiptView exige un `code` (celui du livreur/relais, Shipment.ensure_receipt_confirmation_code) dès que fulfillment_status=DELIVERED — Source.confirmerRetrait(ref) n’a pas de paramètre code : premier appel sans code = 400 INVALID_CONFIRMATION_CODE dans le cas le plus courant. Signature Source à étendre (hors domaine, voir rapport de session).'),
  deleguerRetrait: c(D.commandes, 'serveur', 'PUT /api/orders/{id}/delegation {prenom, numero | null}',
    undefined, 'relaya : authorized_pickup_name et authorized_pickup_phone existent sur la commande (posés à la création), mais aucune route ne permet de les changer après coup.'),
  apercuAnnulation: c(D.commandes, 'serveur', 'GET /api/orders/{id}/manage', undefined, 'Route absente : pas d’aperçu avant annulation côté relaya.'),
  annulerColis: c(D.commandes, 'serveur', 'POST /api/suborders/{id}/cancel {motif} (Idempotency-Key)', undefined,
    'relaya n’a pas de sous-commande : seul POST /api/orders/{id}/cancel/ existe et annule TOUTE la commande (bloqué dès qu’un colis est ramassé). Conflit sous-commandes connu (mémoire projet) : non résolu ici plutôt que de brancher par erreur une annulation globale sur un bouton « annuler cette boutique ».'),
  changerLieu: c(D.commandes, 'serveur', 'PUT /api/orders/{id}/relais {lieu, frais} · PUT /api/orders/{id}/address {lieu, frais}', undefined, 'Route absente côté relaya.'),

  // ——— Litiges et retours ———
  // Vérifié le 14 oct. 2026 : pas de /api/disputes top-level ni de /api/me/disputes. Dispute vit sous la commande
  // (apps/orders/views.py : OrderDisputeListCreateView, DisputeMessageCreateView) et référence order_item (pas un
  // « colis » par boutique) ; pas d'arrangement/appel/retrait de dossier, pas de remboursement automatique sous seuil.
  litiges: c(D.litiges, 'serveur', 'GET /api/me/disputes', undefined, 'Route absente : relaya ne liste les litiges que par commande (GET /api/orders/{id}/disputes/).'),
  litige: c(D.litiges, 'serveur', 'GET /api/disputes/{id}', undefined, 'Route absente : pas de détail de litige par identifiant seul (il faut connaître la commande).'),
  commandeLitige: c(D.litiges, 'partiel', 'GET /api/orders/{id}/', '→ CommandeLitige reconstitué', 'Par OrderItem (prix, quantité), pas par boutique : pas de fenêtre « défaut caché » distincte, pas de « payePar » résolu.'),
  ouvrirLitige: c(D.litiges, 'partiel', 'POST /api/orders/{id}/disputes/ {order_item, reason, description}', '→ Dispute (reconstitution)',
    'order_item retrouvé via GET /api/orders/{id}/ (index 1 = premier item, comme adaptateurs.ts::versCommande) ; reason mappé depuis `pb` (ProblemeLitige → Dispute.REASON_CHOICES). Pas de photos à la création (ajoutées ensuite via ajouterPreuve, non atomique), pas de `souhait`, pas de remboursement automatique sous un seuil (litige_window_days existe côté PlatformSettings, pas de seuil de remboursement d’office).'),
  ajouterPreuve: c(D.litiges, 'partiel', 'POST /api/orders/disputes/{id}/messages/ (multipart : message, files)', undefined,
    'Pas de route dédiée « photos seules » : la photo part comme pièce jointe d’un message de litige. POST /api/orders/evidence-requests/{id}/respond/ répond, lui, à une demande de preuve précise du vendeur/support — méthode différente, non couverte ici.'),
  repondreArrangement: c(D.litiges, 'serveur', 'POST /api/disputes/{id}/arrangement {accepte}', undefined, 'Pas de proposition d’arrangement côté relaya (résolution par messages + décision support uniquement).'),
  contesterDecision: c(D.litiges, 'serveur', 'POST /api/disputes/{id}/appeal {motif}', undefined, 'Pas de recours/appel côté relaya.'),
  retirerLitige: c(D.litiges, 'serveur', 'POST /api/disputes/{id}/withdraw', undefined, 'Pas de retrait de dossier côté relaya.'),
  deposerRetour: c(D.litiges, 'serveur', 'POST /api/returns/{id}/deposit', undefined,
    'Pas de confirmation de dépôt côté client : POST /api/orders/{id}/returns/ (Return, apps/orders/models.py) existe pour CRÉER un retour mais n’est exposé par AUCUNE méthode de Source dans ce domaine — à relier (hors mandat de cette session, signalé au rapport).'),

  // ——— Avis sur une commande ———
  // Pas de modèle d’avis de commande (vendeur + relais) côté relaya : seul ProductReview existe (avis produit).
  avis: c(D.avis, 'serveur', 'GET /api/orders/{id}/reviews', undefined, 'Route absente ; relaya n’a pas de fenêtre/éligibilité « avis de commande ».'),
  envoyerAvis: c(D.avis, 'serveur', 'POST · PUT /api/orders/{id}/reviews {notes[], commentaire, photo}', undefined,
    'relaya : POST /api/catalog/products/{id}/add_review/ note un produit seul (pas le vendeur ni le relais, pas de notion de « colis »).'),

  // ——— Messagerie, aide et rappel ———
  conversations: c(D.messages, 'serveur', 'GET /api/me/threads', '→ conversations',
    'Aucune messagerie acheteur↔vendeur générique dans backend/ (choix délibéré, Addendum Décisions v1.0 : Product.faq compense). Un système MessageThread/ThreadMessage existe (backend/apps/vendors/models.py, oct.) mais strictement côté vendeur (auth vendeur, apps/vendors/views.py « boutique/messages »), avec sa propre note de code demandant validation du porteur avant mise en production : ne pas l’étendre côté client sans décision produit. backend-kit/apps/messaging reste un prototype non installé (INSTALLED_APPS).'),
  conversation: c(D.messages, 'serveur', 'GET /api/me/threads/{id}', '→ la marque lue', 'Même constat que `conversations`.'),
  envoyerMessage: c(D.messages, 'serveur', 'POST /api/me/threads/{id}/messages {texte?, photo?}', '→ {masked[]} (numéros, e-mails, liens retirés côté serveur)', 'Même constat que `conversations`.'),
  marquerToutLu: c(D.messages, 'serveur', 'POST /api/me/threads/read', undefined, 'Même constat que `conversations`.'),
  poserQuestion: c(D.messages, 'branche', 'POST /api/catalog/products/{id}/ask_question/ {text}', '→ {id, masked[]}',
    'Branché pour de vrai (14 oct.) sur ProductQuestion, qui existait déjà côté vendeur (réponse publique, apps/catalog/models.py ; réponse/signalement : apps/vendors/views.py) mais sans route pour poser la question côté acheteur — route ajoutée, pas une nouvelle messagerie : question et réponse publiques sur la fiche, comme un avis (différent du fil privé `conversations`, absent).'),
  ecrireSupport: c(D.messages, 'partiel', 'POST /api/contact/ {name, email, phone, subject, message}', '→ {id}',
    'Formulaire de contact de relaya : pas de fil de conversation, ni photo, ni commande liée, ni masquage. Spécification : POST /api/support/threads.'),
  faq: c(D.messages, 'serveur', 'GET /api/help/faq?lang=&q=', undefined,
    'Aucun centre d’aide générique côté serveur. Seuls Product.faq (par produit) et une FAQ statique codée en dur côté vendeur (_HELP_QUESTIONS, apps/vendors/views.py) existent comme précédent ; backend-kit/apps/messaging propose /api/help/faq en prototype, non porté. Décision produit : contenu statique côté site, ou petite route calquée sur le précédent vendeur.'),
  aide: c(D.messages, 'serveur', 'GET /api/help', '→ dossier en cours, conversations, changement des conditions',
    'Agrège un dossier en cours, les conversations (absentes) et les changements de CGU : dépend de la messagerie, absente côté serveur.'),
  rappel: c(D.messages, 'serveur', 'GET /api/support/callback', undefined, 'Aucun rappel programmé côté serveur ; backend-kit/apps/messaging le propose en prototype, non porté.'),
  demanderRappel: c(D.messages, 'serveur', 'POST /api/support/callback {sujet, commande, creneau, precision}', '→ Rappel (aujourd’hui ou demain)', 'Même constat que `rappel`.'),
  annulerRappel: c(D.messages, 'serveur', 'DELETE /api/support/callback', undefined, 'Même constat que `rappel`.'),

  // ——— Légal ———
  legal: c(D.legal, 'branche', 'GET /api/legal/{doc}?lang= · GET /api/me/legal', '→ version, date, essentiel, PDF ; versions acceptées'),
  accepterConditions: c(D.legal, 'branche', 'POST /api/me/legal/accept {doc, version}'),

  // ——— Portefeuille, moyens de paiement, factures ———
  // NON DISPONIBLE EN PRODUCTION (src/api/domaines/argent.ts) : backend-kit/apps/wallet n'est pas dans
  // backend/apps/ ni dans INSTALLED_APPS. Volontairement exclu : décision CEO en attente, le référentiel verrouillé
  // interdit tout solde/jeton stocké côté client. relaya n'a qu'un historique de paiements et de remboursements
  // acheteur (GET /api/payments/v2/me/payments/, GET /api/payments/v2/me/refunds/), pas de solde, recharge, retrait,
  // numéro Mobile Money ni carte enregistrés côté client. PDF des factures : aucune bibliothèque PDF côté serveur.
  factures: c(D.argent, 'serveur', 'GET /api/me/factures · GET /api/orders/{id}/invoice.pdf', '→ factures (toutes les pages du curseur) et commandes annulées ; PDF généré par le serveur, montants figés', 'Portefeuille client (apps.wallet) absent de backend/ : voir argent.ts. relaya : aucune bibliothèque PDF.'),
  portefeuille: c(D.argent, 'serveur', 'GET /api/me/wallet', '→ solde, mouvements, plafonds (FF-WALLET)', 'apps.wallet absent de backend/ (exclu par décision CEO, référentiel verrouillé : pas de solde/jeton stocké). relaya : GET /api/payments/v2/me/refunds/ liste les remboursements, sans solde.'),
  recharger: c(D.argent, 'serveur', 'POST /api/me/wallet/topups {montant, moyen} (Idempotency-Key)', undefined, 'apps.wallet absent de backend/ (décision CEO en attente).'),
  fraisRetrait: c(D.argent, 'serveur', 'GET /api/me/wallet/withdrawal-fee?montant=', undefined, 'apps.wallet absent de backend/ (décision CEO en attente).'),
  retirer: c(D.argent, 'serveur', 'POST /api/me/wallet/withdrawals {montant, moyen} (Idempotency-Key)', undefined, 'apps.wallet absent de backend/ (décision CEO en attente).'),
  moyensPaiement: c(D.argent, 'serveur', 'GET /api/me/moyens-paiement', '→ numéros Mobile Money', 'apps.wallet absent de backend/. relaya : /api/auth/payout-accounts/ sert aux versements des partenaires, pas aux paiements du client.'),
  ajouterMoyen: c(D.argent, 'serveur', 'POST /api/me/moyens-paiement {numero}', '→ {ok, envoi: EnvoiCode} (le code part avec la réponse) | 409 deja ; 422 numero_invalide, operateur_non_accepte', 'apps.wallet absent de backend/ (décision CEO en attente).'),
  confirmerMoyen: c(D.argent, 'serveur', 'POST /api/me/moyens-paiement/{id}/verify {code}', '→ ResultatCode ; {id} : le numéro saisi (ou l’identifiant du moyen)', 'apps.wallet absent de backend/ (décision CEO en attente).'),
  moyenParDefaut: c(D.argent, 'serveur', 'PATCH /api/me/moyens-paiement/{id} {par_defaut: true}', undefined, 'apps.wallet absent de backend/ (décision CEO en attente).'),
  retirerMoyen: c(D.argent, 'serveur', 'DELETE /api/me/moyens-paiement/{id}', undefined, 'apps.wallet absent de backend/ (décision CEO en attente).'),
  cartes: c(D.argent, 'serveur', 'GET /api/me/cartes', '→ cartes enregistrées chez le prestataire (jamais le numéro)', 'apps.wallet absent de backend/ (décision CEO en attente).'),
  ajouterCarte: c(D.argent, 'serveur', 'POST /api/me/cartes {jeton, titulaire}', '→ carte (marque, 4 derniers chiffres, expiration lus chez le prestataire) | 409 deja', 'apps.wallet absent de backend/ (décision CEO en attente).'),
  retirerCarte: c(D.argent, 'serveur', 'DELETE /api/me/cartes/{id}', undefined, 'apps.wallet absent de backend/ (décision CEO en attente).'),
  carteParDefaut: c(D.argent, 'serveur', 'PATCH /api/me/cartes/{id} {par_defaut: true}', undefined, 'apps.wallet absent de backend/ (décision CEO en attente).'),

  // ——— Abonnement et cagnotte (client) ———
  // NON DISPONIBLE EN PRODUCTION (src/api/domaines/prime.ts) : backend-kit/apps/subscriptions n'est pas dans
  // backend/apps/ ni dans INSTALLED_APPS. relaya a un système d'abonnement, mais c'est celui du VENDEUR
  // (apps.vendors : SubscriptionPlan, VendorSubscription, /api/vendors/plans/) — un concept produit différent.
  prime: c(D.prime, 'serveur', 'GET /api/me/subscription', '→ palier, formule, prélèvements, cagnotte, parrainage (FF-ABONNEMENT)', 'apps.subscriptions (client) absent de backend/. relaya : abonnements des vendeurs seulement (/api/vendors/plans/), concept différent.'),
  payerAbonnement: c(D.prime, 'serveur', 'POST /api/me/subscription/pay {moyen} (Idempotency-Key)', undefined, 'apps.subscriptions absent de backend/.'),
  changerMoyenAbonnement: c(D.prime, 'serveur', 'PATCH /api/me/subscription {moyen}', undefined, 'apps.subscriptions absent de backend/.'),
  souscrire: c(D.prime, 'serveur', 'POST /api/me/subscription {palier, formule, moyen} (Idempotency-Key)', '→ 409 trial_used', 'apps.subscriptions absent de backend/.'),
  resilierAbonnement: c(D.prime, 'serveur', 'POST /api/me/subscription/cancel', undefined, 'apps.subscriptions absent de backend/.'),
  reprendreAbonnement: c(D.prime, 'serveur', 'POST /api/me/subscription/resume', undefined, 'apps.subscriptions absent de backend/.'),
  offrirAbonnement: c(D.prime, 'serveur', 'POST /api/subscription-gifts {numero, prenom, palier, mois, message, carte} (Idempotency-Key)', '→ {ok, …} | {ok: false, raison: inconnu} ; 422 action_requise (3-D Secure), carte_refusee, plafond_carte', 'apps.subscriptions absent de backend/.'),
  verserCagnotte: c(D.prime, 'serveur', 'POST /api/me/cagnotte/payout', '→ montant versé', 'apps.subscriptions absent de backend/.'),

  // ——— Devenir vendeur ———
  boutique: c(D.boutique, 'branche', 'GET /api/me/shop', '→ boutique ouverte depuis le compte | 204', 'Route du kit (client_accounts). relaya : GET /api/vendors/profile/ existe (profil vendeur) ; champs à aligner (code, pièce).'),
  ouvrirBoutique: c(D.boutique, 'branche', 'POST /api/me/shop {nom, categorie, type}', '→ boutique | 409 nom_pris', 'Route du kit (client_accounts : VendorProfile EN ATTENTE par le pont). relaya : POST /api/vendors/apply/ existe ; champs à aligner.'),
  demanderBusiness: c(D.boutique, 'branche', 'POST /api/me/business {piece}'),

  // ——— Diaspora et proches ———
  // NON DISPONIBLE EN PRODUCTION (src/api/domaines/diaspora.ts) : backend-kit/apps/diaspora n'est pas dans
  // backend/apps/ ni dans INSTALLED_APPS. CONNECTEURS.md (3 oct.) annonçait « 19/20 branché » : trompeur, ce mot n'y
  // signifiait que « appel réel écrit côté site », pas « route existante côté relaya ». Vérifié le 14 oct. contre
  // backend/ : aucun modèle de compte diaspora, de lien famille ni de commande pour un proche n'existe. Seules
  // envoyerCodeDiaspora/verifierCodeDiaspora (purpose=diaspora) répondent réellement (apps.otp, générique, installée)
  // mais ne mènent nulle part sans inscrireDiaspora ; reglerDevise cible une route réelle (client_accounts.Preferences)
  // mais répondra TOUJOURS 403 (rien ne crée de compte type_compte=DIASPORA). Gardées « serveur » par cohérence
  // produit plutôt que de laisser un bout de parcours sans suite.
  envoyerCodeDiaspora: c(D.diaspora, 'serveur', 'POST /api/auth/otp/send {purpose: diaspora | diaspora-renforce, canal: sms|email, destination?}', undefined, 'apps.diaspora absent de backend/. Nuance : purpose=diaspora répond réellement (apps.otp, générique) mais ne mène nulle part sans inscrireDiaspora ; purpose=diaspora-renforce plante (ImportError) côté serveur car apps/otp/views.py importe apps.diaspora.services, absent — bug latent à signaler, hors du périmètre de ce connecteur.'),
  verifierCodeDiaspora: c(D.diaspora, 'serveur', 'POST /api/auth/otp/verify {purpose: diaspora, destination, code}', '→ 200 | 422 code', 'apps.diaspora absent de backend/ ; le code vérifié ne sert à rien sans inscrireDiaspora.'),
  identiteFournisseur: c(D.diaspora, 'serveur', 'POST /api/auth/social/lookup {provider: google|apple, credential | identity_token}', '→ {jeton, prenom, nom, email, compte: null|standard|diaspora}',
    'apps.diaspora absent de backend/ : la route n’existe pas, SDK ou non côté site.'),
  inscrireDiaspora: c(D.diaspora, 'serveur', 'POST /api/auth/diaspora/register {prenom, nom, email, motDePasse, codeEmail, naissance, pays, ville, indicatif, numero, code} · POST /api/auth/social/diaspora {fournisseur: google|apple|numero, jeton?, convertir?, prenom, nom, email, naissance, pays, ville, indicatif, numero, code}',
    '→ session | 409 existe | 422 code, codeEmail, age, pays, numero, jeton',
    'apps.diaspora absent de backend/ : aucun modèle de compte diaspora, point d’entrée du domaine entier.'),
  liensFamille: c(D.diaspora, 'serveur', 'GET /api/me/family-links', undefined, 'apps.diaspora absent de backend/.'),
  creerCodeFamille: c(D.diaspora, 'serveur', 'POST /api/me/family-links/code', undefined, 'apps.diaspora absent de backend/.'),
  lierParCode: c(D.diaspora, 'serveur', 'POST /api/me/family-links {code}', undefined, 'apps.diaspora absent de backend/.'),
  inviterProche: c(D.diaspora, 'serveur', 'POST /api/me/family-links/invite {prenom, numero}', undefined, 'apps.diaspora absent de backend/.'),
  repondreLien: c(D.diaspora, 'serveur', 'POST /api/me/family-links/{id}/answer {accepte, relais?}', undefined, 'apps.diaspora absent de backend/.'),
  retirerLien: c(D.diaspora, 'serveur', 'DELETE /api/me/family-links/{id}', undefined, 'apps.diaspora absent de backend/.'),
  commanderPour: c(D.diaspora, 'serveur', 'POST /api/family-links/{id}/orders {carte, bin, paysCarte, devise, mot, titulaire, codeSms?, livraison, moyen, demande?, supplementPar?} (Idempotency-Key)', '→ 3-D Secure ou Apple Pay / Google Pay ; contrôle de cohérence pays/BIN côté serveur ; 422 domicile, demande, garantie', 'apps.diaspora absent de backend/.'),
  reglerDevise: c(D.diaspora, 'serveur', 'PATCH /api/me/preferences {devise: XAF|EUR|USD}', '→ 403 hors compte diaspora', 'Route réelle (apps.client_accounts.Preferences, installée) mais toujours 403 : rien ne met jamais type_compte=DIASPORA sans apps.diaspora.inscrireDiaspora, absent.'),
  choisirProche: c(D.diaspora, 'serveur', 'PUT /api/me/active-relative {lien}', '→ 403 hors compte diaspora, 404 lien non actif', 'apps.diaspora absent de backend/ : /api/me/active-relative n’existe pas.'),
  lienInvitation: c(D.diaspora, 'serveur', 'POST /api/me/family-links/invitation', '→ {type: famille|invitation, code, jusqua} (lien partageable, QR)', 'apps.diaspora absent de backend/.'),
  accepterInvitation: c(D.diaspora, 'serveur', 'POST /api/me/family-links/invitation/{code}/accept {relais}', '→ lien | 404 code, 409 deja, 422 max, 403 type', 'apps.diaspora absent de backend/.'),
  reglerLivraisonLien: c(D.diaspora, 'serveur', 'PATCH /api/me/family-links/{id}/delivery {relais, domicile, prefere}', 'côté proche au Cameroun ; l’adresse reste dans son compte', 'apps.diaspora absent de backend/.'),
  demandesProches: c(D.diaspora, 'serveur', 'GET /api/me/family-requests', '→ paniers envoyés et reçus entre proches reliés', 'apps.diaspora absent de backend/.'),
  envoyerPanierAuProche: c(D.diaspora, 'serveur', 'POST /api/me/family-links/{id}/requests {mot, livraison, lignes?}', '→ demande | 409 deja, 422 vide, plafond, domicile', 'apps.diaspora absent de backend/.'),
  refuserDemande: c(D.diaspora, 'serveur', 'POST /api/me/family-requests/{id}/decline {mot}', undefined, 'apps.diaspora absent de backend/.'),
  annulerDemande: c(D.diaspora, 'serveur', 'DELETE /api/me/family-requests/{id}', undefined, 'apps.diaspora absent de backend/.'),

  // ——— Listes d'envies ———
  // apps.wishlists (kit) n'est pas dans INSTALLED_APPS côté relaya (seuls apps.client_core/otp/client_accounts/
  // notifications_client le sont ; vérifié : backend/apps/wishlists n'existe même pas sur disque). Aucune des
  // routes /api/me/wishlists ou /api/wishlists/{code} ci-dessous n'existe réellement malgré le « branché » que ce
  // registre affichait avant vérification (CONNECTEURS.md datait du 3 oct., avant l'arrêt du rollout wishlists) :
  // tout le domaine passe à l'état « serveur », src/api/domaines/listes.ts ne les appelle plus (NonDisponible).
  // Construire tout le sous-système (listes, cagnotte publique, cadeaux par carte avec contrôle de cohérence
  // diaspora, liens publics) est un gros morceau métier, pas une extension mécanique de serializer : à trancher
  // avant de le construire, pas improvisé ici.
  listes: c(D.listes, 'serveur', 'GET /api/me/wishlists'),
  creerListe: c(D.listes, 'serveur', 'POST /api/me/wishlists {nom, mode, remiseLe, surprise, occasion?, hotes?, cagnotte?}', '→ 201 ListeEnvies'),
  ajouterArticleListe: c(D.listes, 'serveur', 'POST /api/me/wishlists/{id}/items {produit}'),
  retirerArticleListe: c(D.listes, 'serveur', 'DELETE /api/me/wishlists/{id}/items/{produit}', '→ refusé pour un article offert'),
  reglerListe: c(D.listes, 'serveur', 'PATCH /api/me/wishlists/{id}'),
  partagerListe: c(D.listes, 'serveur', 'POST /api/me/wishlists/{id}/share'),
  arreterPartage: c(D.listes, 'serveur', 'DELETE /api/me/wishlists/{id}/share'),
  demarrerListe: c(D.listes, 'serveur', 'POST /api/me/wishlists/{id}/start'),
  listePublique: c(D.listes, 'serveur', 'GET /api/wishlists/{code}', 'lien public l/ (CAP-11)'),
  offrirArticleListe: c(D.listes, 'serveur', 'POST /api/wishlists/{code}/gifts {produit, prenom, email, moyen, jeton, prix_vu, qui, livraison, devise, carte: {bin, pays_carte, pays, code_email}} (Idempotency-Key)', '→ 409 price_changed (CLE-39) ; 422 plafond, domicile, coherence (avec le contrôle), verification', 'À créer. Sans compte, depuis n’importe où : relais du destinataire ou chez lui (adresse jamais renvoyée) ; carte : plafonds et contrôle de cohérence du compte diaspora, historique par e-mail.'),
  envoyerCodeCadeau: c(D.listes, 'serveur', 'POST /api/wishlists/{code}/gifts/otp {email}', '→ destination masquée, validité', 'À créer. Vérification renforcée d’un cadeau payé par carte (contrôle de cohérence « renforcé »).'),
  suiviCadeau: c(D.listes, 'serveur', 'GET /api/wishlists/{code}/gifts/{ref}', '→ étapes, preuve de remise, merci', 'À créer. Public pour qui a offert (lien de l’e-mail de suivi) : jamais l’adresse, le code ni le numéro du destinataire.'),
  partagerStatutListe: c(D.listes, 'serveur', 'POST /api/me/wishlists/{id}/status-shares {canal}', '→ code et validité du lien', 'À créer. Crée le lien au besoin (comme /share) et compte les mises en statut par canal.'),

  // ——— Échanges entre clients (donnees/echanges.ts : qui paie la livraison, « BelivaY ne perd jamais ») ———
  echanges: c(D.echanges, 'serveur', 'GET /api/me/exchanges', '→ proches, listes suivies, envois, remerciements, colis payés par l’un pour l’autre', 'À créer. Proches : comptes BelivaY trouvés par numéro ou liés (family-links) ; jamais l’adresse ni le numéro complet. Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  chercherProche: c(D.echanges, 'serveur', 'POST /api/me/contacts/lookup {numero}', '→ prénom et quartier du relais, ou inconnu', 'À créer. Limiter les recherches (anti-annuaire) : 20 par jour. Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  envoyerAuxProches: c(D.echanges, 'serveur', 'POST /api/me/exchanges/send {type, id, proches[]}', '→ nombre de notifications envoyées', 'À créer. Une notification dans l’application du proche, une fois par objet. Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  rappelerInvites: c(D.echanges, 'serveur', 'POST /api/me/wishlists/{id}/remind', '→ 429 too_early {prochain} ; un rappel tous les 3 jours au plus', 'À créer. Seulement les invités BelivaY qui n’ont rien offert ; BelivaY ne relance jamais de lui-même. Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  suivreListe: c(D.echanges, 'serveur', 'PUT /api/me/followed-wishlists/{code} {suivre, rappel}', undefined, 'À créer. Rappel push N jours avant la date de remise, à qui l’a demandé. Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  remercier: c(D.echanges, 'serveur', 'POST /api/me/thanks {ref, texte}', undefined, 'À créer. Message à qui a offert (e-mail pour un invité sans compte). Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  repondreColis: c(D.echanges, 'serveur', 'POST /api/me/incoming-parcels/{id}/answer {accepte}', '→ colis ; refus : retenue (retenueRefus) et remboursement du payeur', 'À créer. Sans frais avant l’expédition (règle 6). Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  cotiserArticleListe: c(D.echanges, 'serveur', 'POST /api/wishlists/{code}/items/{produit}/pool', '→ code de la cotisation (créée au besoin)', 'À créer. Articles de 15 000 F et plus. Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  envoyerPanierA: c(D.echanges, 'serveur', 'POST /api/cart/send-to {prenom, proche?, relais, qui_paie_livraison, moyen, mot} (Idempotency-Key)', '→ référence ; refus « garantie » si le destinataire ne peut pas payer la livraison', 'À créer. Contrôle destinatairePeutPayer refait côté serveur. Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  // Reçus (DP-54) : chaque envoi entre clients a sa réception ; une seule boîte, des deux côtés.
  recus: c(D.echanges, 'serveur', 'GET /api/me/inbox', '→ envois reçus (à traiter d’abord) et envoyés, avec les réponses ; nombre à traiter', 'À créer. Un envoi par destinataire (compte trouvé par numéro vérifié ou e-mail) ; sans compte, seul le lien public existe. Jamais l’adresse ni le numéro complet de l’autre. Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  recu: c(D.echanges, 'serveur', 'GET /api/me/inbox/{id}', '→ envoi, sens (reçu, envoyé), moyens du compte (Mobile Money, cartes, portefeuille ; diaspora : cartes)', 'À créer. Lu seulement par l’envoyeur et le destinataire. Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  executerRecu: c(D.echanges, 'serveur', 'POST /api/me/inbox/{id}/actions {action, p?, montant?, moyen, qui?, mot?, discret?, relais?} (Idempotency-Key)', '→ envoi mis à jour, commande née, montant payé ; 409 traite, 410 expire, 422 garantie, montant, solde, moyen, diaspora', 'À créer. Règle donnees/echanges.ts refaite côté serveur : articles payés et bloqués avant l’envoi au vendeur ; « destinataire paie » seulement si la garantie couvre le pire cas ; refus sans frais avant l’expédition ; compte diaspora : carte seulement. Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  remercierRecu: c(D.echanges, 'serveur', 'POST /api/me/inbox/{id}/thanks {texte}', undefined, 'À créer. Le bénéficiaire remercie qui a payé (e-mail pour un invité sans compte). Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  envoyerRecu: c(D.echanges, 'serveur', 'POST /api/me/outbox {type, a, prenom, titre, …}', '→ envoi ; dansLApplication si le destinataire a un compte ; refus numero, moi, vide', 'À créer. Anti-annuaire : on ne dit pas si un numéro a un compte avant l’envoi (20 recherches par jour). Aucune app backend-kit (wishlists/recus) n’est installée dans backend/relaya/settings/base.py : système entier absent de backend/, pas un champ manquant — décision produit requise.'),
  participerCagnotteListe: c(D.listes, 'serveur', 'POST /api/wishlists/{code}/fund {prenom, montant, moyen, mot, discret} (Idempotency-Key)', '→ montant réuni ; refus ferme, montant', 'apps.wishlists n’existe pas côté relaya (voir la note en tête de la section Listes d’envies). Cagnotte d’une liste (mariage : voyage de noces) : dès 1 000 F, bloquée chez BelivaY puis versée au portefeuille des hôtes à la date de l’événement — à créer.'),

  // ——— Cotisations ———
  // NON DISPONIBLE EN PRODUCTION (src/api/domaines/cotisations.ts) : backend-kit/apps/extras (POST /api/me/pools…)
  // n'est pas dans backend/apps/ ni dans INSTALLED_APPS. Aucun modèle de cotisation nulle part dans backend/ :
  // système entier à concevoir (modèle de données, paiement partagé, hausse de prix), pas une route à corriger.
  cotisations: c(D.cotisations, 'serveur', 'GET /api/me/pools', undefined, 'apps.extras absent de backend/ : aucun modèle de cotisation côté serveur.'),
  creerCotisation: c(D.cotisations, 'serveur', 'POST /api/me/pools', undefined, 'apps.extras absent de backend/.'),
  cotisationPublique: c(D.cotisations, 'serveur', 'GET /api/pools/{code}', 'lien public c/ ; noms discrets masqués', 'apps.extras absent de backend/.'),
  participer: c(D.cotisations, 'serveur', 'POST /api/pools/{code}/contributions {prenom, montant, discret, mot, moyen, jeton?, carte} (Idempotency-Key)', undefined, 'apps.extras absent de backend/.'),
  deciderHausse: c(D.cotisations, 'serveur', 'POST /api/me/pools/{id}/price-rise {choix, moyen?}', undefined, 'apps.extras absent de backend/.'),

  // ——— Mises de côté ———
  // NON DISPONIBLE EN PRODUCTION (src/api/domaines/modules-cl15.ts) : backend-kit/apps/extras (POST /api/me/layaways…)
  // n'est pas dans backend/apps/ ni dans INSTALLED_APPS. Aucun modèle de mise de côté nulle part dans backend/ :
  // système entier à concevoir (modèle de données, paiement échelonné), pas une route à corriger.
  misesDeCote: c(D.cote, 'serveur', 'GET /api/me/layaways', undefined, 'apps.extras absent de backend/ : aucun modèle de mise de côté côté serveur.'),
  creerMiseDeCote: c(D.cote, 'serveur', 'POST /api/me/layaways {produit, rythme, moyen} (Idempotency-Key)', '→ acompte payé', 'apps.extras absent de backend/.'),
  creerMiseDeCoteListe: c(D.cote, 'serveur', 'POST /api/me/layaways {liste, exclus, equivalents, rythme, moyen} (Idempotency-Key)', undefined, 'apps.extras absent de backend/.'),
  payerVersement: c(D.cote, 'serveur', 'POST /api/me/layaways/{id}/installments {moyen} (Idempotency-Key)', undefined, 'apps.extras absent de backend/.'),
  annulerMiseDeCote: c(D.cote, 'serveur', 'POST /api/me/layaways/{id}/cancel', undefined, 'apps.extras absent de backend/.'),

  // ——— Ventes flash ———
  ventesFlash: c(D.flash, 'partiel', 'GET /api/catalog/promotions/active/?type=FLASH', '→ offres (PromotionCampaign), alerte et relais non résolus',
    'Route réelle (ActivePromotionCampaignListView) ; alerte/relais du compte neutres (pas de champ équivalent côté serveur), dessin/univers/livraison neutres aussi (voir adaptateurs, cohérent avec versCommande).'),
  ajouterFlash: c(D.flash, 'serveur', 'POST /api/cart/lines {produit, flash: true}', undefined, 'apps.cart non installée (même gap que le domaine panier).'),
  alerteFlash: c(D.flash, 'branche', 'PUT /api/me/notification-settings {flash}', undefined, 'apps.notifications_client est bien installée : route réelle, inchangée.'),

  // ——— Annonces sponsorisées (DP-59) ———
  // Vérifié le 14 oct. 2026 : AUCUNE trace de « sponsored » dans backend/ (grep vide sur apps/*). DP-59 (annonces
  // sponsorisées, Boost) n'existe pas même en ébauche côté serveur réel — contrairement à CONNECTEURS.md (3 oct.,
  // vérifié contre le serveur d'essai du kit). À créer intégralement côté serveur avant de brancher ce domaine.
  annoncesListe: c(D.annonces, 'serveur', 'GET /api/sponsored/placements?ou=&q=&cat=', undefined, 'Aucune app « sponsored » dans backend/apps.'),
  emplacementsAccueil: c(D.annonces, 'serveur', 'GET /api/sponsored/home', undefined, 'Aucune app « sponsored » dans backend/apps.'),
  cliquerAnnonce: c(D.annonces, 'serveur', 'POST /api/sponsored/clicks {annonce}', undefined, 'Aucune app « sponsored » dans backend/apps.'),
  voirAnnonce: c(D.annonces, 'serveur', 'POST /api/sponsored/impressions {annonce, emplacement, visite}', undefined, 'Aucune app « sponsored » dans backend/apps.'),
  signalerAnnonce: c(D.annonces, 'serveur', 'POST /api/sponsored/reports {annonce, motif}', undefined, 'Aucune app « sponsored » dans backend/apps.'),

  // ——— Rentrée scolaire ———
  rentree: c(D.rentree, 'serveur', 'GET /api/school-lists', undefined,
    'Aucune route "school-lists" dans backend/ ; backend-kit/apps/extras en a un prototype complet (modèles, règles, tests), jamais installé (INSTALLED_APPS, backend/relaya/settings/base.py). PromotionCampaign (apps/catalog) est une remise sur un produit d’un vendeur, pas une liste multi-articles multi-vendeurs construite par un parent : pas réutilisable tel quel. Système entier absent de backend/, pas un champ manquant — décision produit requise avant de porter l’app ou de redéfinir la fonctionnalité.'),
  commanderRentree: c(D.rentree, 'serveur', 'POST /api/school-lists/{id}/order {exclus, equivalents, moyen} (Idempotency-Key)', '→ référence de commande', 'Même constat que `rentree`.'),
  envoyerListePapier: c(D.rentree, 'serveur', 'POST /api/school-lists/photo (multipart) {classe, photo}', undefined, 'Même constat que `rentree`.'),
  publierListe: c(D.rentree, 'serveur', 'POST /api/school-lists/{id}/publish', undefined, 'Même constat que `rentree`.'),

  // ——— Panier famille ———
  // NON DISPONIBLE EN PRODUCTION (src/api/domaines/modules-cl15.ts) : backend-kit/apps/extras n'est pas dans
  // backend/apps/ ni dans INSTALLED_APPS. Aucun modèle de panier famille dans backend/ : système entier (modèle de
  // données, prélèvement récurrent, destinataire lié) à concevoir, pas une route à corriger.
  famille: c(D.famille, 'serveur', 'GET /api/me/family-baskets', undefined, 'apps.extras absent de backend/ : aucun modèle de panier famille côté serveur.'),
  enregistrerPanierFamille: c(D.famille, 'serveur', 'POST /api/me/family-baskets · PUT /api/me/family-baskets/{id}', undefined, 'apps.extras absent de backend/.'),
  lierDestinataire: c(D.famille, 'serveur', 'POST /api/me/family-baskets/recipient {prenom, numero, relais}', undefined, 'apps.extras absent de backend/.'),
  payerPanierFamille: c(D.famille, 'serveur', 'POST /api/me/family-baskets/{id}/pay {carte_jeton, email, mensuel, jour} (Idempotency-Key)', undefined, 'apps.extras absent de backend/.'),
  suspendrePanierFamille: c(D.famille, 'serveur', 'PATCH /api/me/family-baskets/{id} {suspendu}', undefined, 'apps.extras absent de backend/.'),

  // ——— Troc ———
  // NON DISPONIBLE EN PRODUCTION (src/api/domaines/modules-cl15.ts) : backend-kit/apps/extras n'est pas dans
  // backend/apps/ ni dans INSTALLED_APPS. Aucun modèle de reprise/troc dans backend/ : système entier (modèle de
  // données, contestation, règle de valeur reprise) à concevoir, pas une route à corriger.
  trocs: c(D.troc, 'serveur', 'GET /api/me/trades', undefined, 'apps.extras absent de backend/ : aucun modèle de troc côté serveur.'),
  creerTroc: c(D.troc, 'serveur', 'POST /api/me/trades {produit, modele, declare}', undefined, 'apps.extras absent de backend/.'),
  repondreTroc: c(D.troc, 'serveur', 'POST /api/me/trades/{id}/answer {accepte}', undefined, 'apps.extras absent de backend/.'),
  contesterTroc: c(D.troc, 'serveur', 'POST /api/me/trades/{id}/contest {texte}', undefined, 'apps.extras absent de backend/.'),
  payerTroc: c(D.troc, 'serveur', 'POST /api/me/trades/{id}/pay {moyen} (Idempotency-Key)', undefined, 'apps.extras absent de backend/.'),
  annulerTroc: c(D.troc, 'serveur', 'DELETE /api/me/trades/{id}', undefined, 'apps.extras absent de backend/.'),

  // ——— WhatsApp ———
  // Vérifié le 14 oct. 2026 : apps.extras (qui devait fournir ces deux routes, même en 501 a_finir) n'existe pas
  // dans le backend aujourd'hui — ni le dossier apps/extras, ni l'app dans INSTALLED_APPS. L'appel écrit côté site
  // est correct pour le jour où la route existera, mais tombera en 404 brut (pas un 501 {error:{code:'a_finir'}})
  // tant que le module n'est pas créé. relaya : apps.whatsapp_assistant ne sert que le webhook entrant
  // (/api/whatsapp/webhook/), rien côté client. FF-EX06 est de toute façon fermé (non au lancement).
  whatsapp: c(D.whatsapp, 'branche', 'GET /api/whatsapp/conversation', undefined, 'Appel écrit côté site ; route absente aujourd’hui (apps.extras pas créé) : 404 brut tant que le module n’existe pas, FF-EX06 fermé. relaya : module whatsapp_assistant (webhook entrant seulement).'),
  repondreWhatsapp: c(D.whatsapp, 'branche', 'POST /api/whatsapp/conversation/messages {texte}'),
}
