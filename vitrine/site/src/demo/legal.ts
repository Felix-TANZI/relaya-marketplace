// Pages légales (CL-13), textes du prototype du 1er octobre (CL13_LEGAL), en français et en anglais, avec les
// montants recalculés (DP-08 : garde ; DP-25 : colis L) et les décisions du porteur : remboursement sur le Wallet
// BelivaY ou la carte qui a payé (DP-06, DP-23), carte ouverte à tous (DP-23). L'API servira ces textes et le PDF
// complet de chaque version.
//
// À FAIRE RELIRE PAR LE PORTEUR (mise en ligne du 25 oct. 2026) : conditions d'utilisation, confidentialité, cookies
// et mentions légales réécrits pour le site public, où seuls les comptes sont réels (données gardées : site/COMPTES-REELS.md
// § 8 de la branche des comptes). Ces quatre textes servent aux six espaces (les inscriptions du vendeur, de l'entreprise,
// du relais et de la console renvoient vers /cgu et /legal-doc?d=confidentialite). Les champs « [À COMPLÉTER : …] » sont
// des informations légales inconnues ici : ne rien inventer, les remplir (liste dans MISE-EN-LIGNE.md). « sections » :
// le texte complet sous « L'essentiel ». Le serveur (backend-kit/apps/client_accounts/donnees/legal.json) doit reprendre
// ces textes au passage au réel.
import type { DocumentLegal } from '../donnees/source'

export const LEGAL: DocumentLegal[] = [
 {
  cle: "cgu",
  icone: "file-text",
  aAccepter: true,
  fr: {
   titre: "Conditions générales d’utilisation",
   sous: "Qui peut utiliser BelivaY, et comment.",
   grille: null,
   points: [
    "BelivaY ouvre d’abord ses comptes\u00A0: les produits, les prix, les commandes et les paiements affichés sont pour l’instant des exemples de démonstration. Rien n’est vendu, livré ni débité.",
    "Tu peux découvrir BelivaY sans compte. Pour commander, il faudra un compte et un numéro vérifié par code.",
    "Un e-mail correspond à un seul compte.",
    "Le vendeur reste anonyme\u00A0: tu vois «\u00A0Vendeur certifié\u00A0» et son palier, jamais son nom (dans le panier, une lettre distingue seulement tes colis). Lui ne voit ni ton nom, ni ton numéro, ni ton relais.",
    "Photos et preuves passent par l’application, jamais par WhatsApp.",
    "En cas d’abus, certains avantages sont limités, toujours après examen par une personne et avec recours. Jamais d’exclusion définitive.",
    "Tu peux supprimer ton compte quand aucune commande ni aucun litige n’est en cours."
   ],
   sections: [
    { titre: "1. Objet", points: [
     "Ces conditions encadrent l’utilisation du site et des applications BelivaY\u00A0: l’espace client, l’espace vendeur, l’espace entreprise de livraison, l’espace livreur, l’espace point relais et la console d’administration. Ils sont édités par BelivaY SARLU (voir les mentions légales).",
     "Créer un compte, ou utiliser le service, vaut acceptation de ces conditions et de la politique de confidentialité, dans leur version datée du jour."
    ] },
    { titre: "2. Période de démonstration", points: [
     "Pendant la phase de lancement, seuls les comptes sont réels. Le catalogue, les boutiques, les prix, les paniers, les commandes, les paiements, le portefeuille, les livraisons, les messages et les chiffres des tableaux de bord sont des données de démonstration, gardées dans ton navigateur.",
     "Aucune vente n’est conclue et aucun argent n’est débité. N’entre jamais de vraies informations bancaires ou de Mobile Money.",
     "Les conditions de vente, de retour, de garde et de paiement au comptoir décrivent le service tel qu’il fonctionnera à l’ouverture des ventes\u00A0; elles s’appliqueront à partir de cette date."
    ] },
    { titre: "3. Comptes", points: [
     "Le compte est gratuit et personnel. Les informations données doivent être exactes\u00A0; le mot de passe (ou le code PIN) reste secret et ne se partage pas.",
     "Les comptes vendeur, entreprise de livraison et point relais sont examinés par BelivaY avant d’être activés\u00A0; BelivaY peut refuser une candidature, avec un motif.",
     "Les livreurs et les membres d’un point relais sont invités par leur responsable. L’accès à la console d’administration est réservé à l’équipe de BelivaY, sur invitation, avec un second facteur obligatoire.",
     "Toute activité faite depuis un compte est réputée faite par son titulaire, sauf s’il a signalé un accès qu’il n’a pas autorisé."
    ] },
    { titre: "4. Usage loyal", points: [
     "Il est interdit d’usurper l’identité d’une autre personne, d’essayer d’accéder au compte d’autrui, de contourner les mesures de sécurité, de créer des comptes en masse ou par des robots, ou de publier des contenus illicites, trompeurs ou injurieux.",
     "En cas de manquement, BelivaY peut limiter ou suspendre un compte, après examen par une personne, avec un motif écrit et la possibilité de contester."
    ] },
    { titre: "5. Disponibilité et responsabilité", points: [
     "Le service est en cours de lancement\u00A0: il peut être interrompu pour maintenance ou évoluer sans préavis. BelivaY fait de son mieux pour qu’il reste disponible et sûr.",
     "Les données de démonstration ne sont ni des offres ni des engagements\u00A0: aucune décision ne doit être prise sur leur foi."
    ] },
    { titre: "6. Propriété intellectuelle", points: [
     "La marque BelivaY, son logo, les textes, les visuels et le code du service appartiennent à BelivaY ou sont utilisés avec autorisation. Toute reproduction sans accord écrit est interdite."
    ] },
    { titre: "7. Fin du compte", points: [
     "Chacun peut supprimer son compte à tout moment depuis son espace (le mot de passe est demandé). La suppression efface réellement les données du compte, comme le décrit la politique de confidentialité."
    ] },
    { titre: "8. Modifications", points: [
     "Chaque version de ces conditions est datée. Un changement important est montré à l’ouverture de l’application et doit être accepté pour continuer."
    ] },
    { titre: "9. Droit applicable et contact", points: [
     "Ces conditions sont soumises au droit camerounais. Juridiction compétente\u00A0: [À COMPLÉTER\u00A0: tribunal compétent, à faire valider].",
     "Une question\u00A0: contact@belivay.com, ou la page Aide et contact de l’application."
    ] }
   ]
  },
  en: {
   titre: "Terms of use",
   sous: "Who can use BelivaY, and how.",
   grille: null,
   points: [
    "BelivaY is opening accounts first: the products, prices, orders and payments shown are demonstration examples for now. Nothing is sold, delivered or charged.",
    "You can explore BelivaY without an account. To order, you will need an account and a phone number verified by code.",
    "One e-mail address matches one account.",
    "The seller stays anonymous: you see “Certified seller” and its tier, never its name (in the cart, a letter only tells your parcels apart). The seller never sees your name, your number or your relay point.",
    "Photos and proof go through the app, never through WhatsApp.",
    "In case of abuse, some benefits are limited, always after review by a person and with the right to appeal. Never a permanent ban.",
    "You can delete your account when no order and no dispute is in progress."
   ],
   sections: [
    { titre: "1. Purpose", points: [
     "These terms govern the use of the BelivaY website and apps: the customer space, the seller space, the delivery company space, the courier space, the relay point space and the administration console. They are published by BelivaY SARLU (see the legal notice).",
     "Creating an account, or using the service, means accepting these terms and the privacy policy, in their version dated that day."
    ] },
    { titre: "2. Demonstration period", points: [
     "During the launch phase, only accounts are real. The catalogue, shops, prices, carts, orders, payments, wallet, deliveries, messages and dashboard figures are demonstration data, kept in your browser.",
     "No sale is made and no money is charged. Never enter real bank or Mobile Money details.",
     "The terms of sale, returns, storage and counter payment describe the service as it will work when sales open; they will apply from that date."
    ] },
    { titre: "3. Accounts", points: [
     "The account is free and personal. The information given must be accurate; the password (or PIN) stays secret and is never shared.",
     "Seller, delivery company and relay point accounts are reviewed by BelivaY before activation; BelivaY may turn down an application, with a reason.",
     "Couriers and relay point staff are invited by their manager. Access to the administration console is reserved for the BelivaY team, by invitation, with a mandatory second factor.",
     "Any activity from an account is deemed to be done by its holder, unless they reported access they did not authorise."
    ] },
    { titre: "4. Fair use", points: [
     "It is forbidden to impersonate someone else, to try to access another person’s account, to get around security measures, to create accounts in bulk or with bots, or to publish unlawful, misleading or abusive content.",
     "In case of a breach, BelivaY may limit or suspend an account, after review by a person, with a written reason and the possibility to appeal."
    ] },
    { titre: "5. Availability and liability", points: [
     "The service is being launched: it may be interrupted for maintenance or change without notice. BelivaY does its best to keep it available and secure.",
     "Demonstration data are neither offers nor commitments: no decision should be based on them."
    ] },
    { titre: "6. Intellectual property", points: [
     "The BelivaY brand, its logo, texts, visuals and the code of the service belong to BelivaY or are used with permission. Any reproduction without written consent is forbidden."
    ] },
    { titre: "7. Closing an account", points: [
     "Anyone can delete their account at any time from their space (the password is required). Deletion really erases the account data, as described in the privacy policy."
    ] },
    { titre: "8. Changes", points: [
     "Each version of these terms is dated. A major change is shown when you open the app and must be accepted to continue."
    ] },
    { titre: "9. Governing law and contact", points: [
     "These terms are governed by Cameroonian law. Competent court: [TO BE COMPLETED: competent court, to be confirmed].",
     "A question: contact@belivay.com, or the Help and contact page of the app."
    ] }
   ]
  }
 },
 {
  cle: "cgv",
  icone: "receipt",
  aAccepter: true,
  fr: {
   titre: "Conditions générales de vente",
   sous: "Prix, paiement, retrait, argent bloqué, retour.",
   grille: null,
   points: [
    "Chaque prix montre aussi le coût de retrait à ton relais. Livraison de base\u00A0: 900\u00A0F au relais par colis S ou M (1\u00A0100\u00A0F pour un colis L), offerte dès 30\u00A0000\u00A0F d’articles pour un colis\u00A0; 1\u00A0500\u00A0F à domicile, offerte dès 50\u00A0000\u00A0F.",
    "Paiement par MTN MoMo ou Orange Money, ou au comptoir si ton panier y a droit. Jamais d’espèces.",
    "Ton argent reste bloqué jusqu’à ton retrait et la fin de la fenêtre de retour. Le vendeur est payé ensuite.",
    "Tu retires avec un code à 6 chiffres. La garde est gratuite le jour d’arrivée, puis suit la politique de garde.",
    "Annulation boutique par boutique, sans frais, tant que le colis n’est pas collecté.",
    "Retour avec un motif, dans les 7\u00A0jours après le retrait. Remboursement sur le moyen de paiement d’origine."
   ]
  },
  en: {
   titre: "Terms of sale",
   sous: "Prices, payment, pickup, money on hold, returns.",
   grille: null,
   points: [
    "Every price also shows the pickup cost at your relay point. Basic delivery: 900\u00A0F at the relay per size S or M parcel (1,100\u00A0F for a size L parcel), free from 30,000\u00A0F of items for one parcel; 1,500\u00A0F to your home, free from 50,000\u00A0F.",
    "Pay with MTN MoMo or Orange Money, or at the counter if your cart qualifies. Never cash.",
    "Your money stays on hold until you pick up and the return window ends. The seller is paid after that.",
    "You pick up with a 6-digit code. Storage is free on the day of arrival, then follows the storage policy.",
    "Cancel shop by shop, free of charge, as long as the parcel has not been collected.",
    "Returns need a reason, within 7 days after pickup. Refunds go to your BelivaY Wallet, or to the card that paid."
   ]
  }
 },
 {
  cle: "confidentialite",
  icone: "lock",
  aAccepter: true,
  fr: {
   titre: "Politique de confidentialité",
   sous: "Tes données, qui les voit, combien de temps, tes droits.",
   grille: null,
   points: [
    "Aujourd’hui, seul ton compte est enregistré chez nous\u00A0: ton e-mail, ton nom, ton numéro et ta photo si tu les donnes, ton mot de passe sous une forme illisible, et la date où tu as accepté les conditions.",
    "Les commandes, paniers et messages de la démonstration restent dans ton navigateur\u00A0: ils ne sont pas envoyés à nos serveurs.",
    "Aucun traceur publicitaire, aucune mesure d’audience, aucune vente de tes données.",
    "Le vendeur ne verra jamais ton nom, ton numéro ni ton relais. Personne ne voit ton numéro\u00A0: les appels passeront par un rappel masqué.",
    "Tu peux télécharger tes données, les corriger et supprimer ton compte, depuis ton compte.",
    "Une question sur tes données\u00A0: contact@belivay.com."
   ],
   sections: [
    { titre: "1. Qui est responsable", points: [
     "BelivaY SARLU, [À COMPLÉTER\u00A0: adresse du siège], Yaoundé, Cameroun. Contact pour les données personnelles\u00A0: contact@belivay.com."
    ] },
    { titre: "2. Ce que nous gardons pour chaque compte", points: [
     "L’espace du compte (client, vendeur, entreprise de livraison, livreur, point relais ou console), l’adresse e-mail et, s’ils sont donnés, le numéro de téléphone, le prénom, le nom et une photo (150\u00A0Ko au plus).",
     "Le mot de passe ou le code PIN, gardé uniquement sous une forme hachée (scrypt)\u00A0: personne, même chez BelivaY, ne peut le relire.",
     "Le rôle, le statut (actif, en attente, refusé, suspendu), le type de compte (par exemple diaspora) et le pays s’il est indiqué.",
     "Pour une candidature (vendeur, entreprise de livraison, point relais)\u00A0: les informations saisies dans le formulaire.",
     "La version des conditions acceptées et la date d’acceptation.",
     "Les appareils connectés\u00A0: un résumé comme «\u00A0Chrome · Android\u00A0», la date de connexion et de dernière visite. Jamais ton adresse IP.",
     "Pour la console\u00A0: le secret du second facteur, chiffré, et l’empreinte des codes de secours."
    ] },
    { titre: "3. Ce que nous ne collectons pas", points: [
     "Aucune donnée bancaire ni de Mobile Money\u00A0: aucun paiement réel n’a lieu pendant la démonstration.",
     "Les paniers, commandes, adresses, messages et positions de la démonstration restent dans le stockage de ton navigateur\u00A0; ils s’effacent avec lui.",
     "Aucun cookie publicitaire, aucun traceur d’autres entreprises, aucun profil publicitaire."
    ] },
    { titre: "4. Pourquoi", points: [
     "Créer et sécuriser ton compte, te reconnecter, examiner les candidatures professionnelles, protéger le service contre les abus (limite des tentatives), garder la preuve de l’acceptation des conditions et répondre à tes demandes.",
     "Ces traitements sont nécessaires au service que tu demandes en créant un compte, et à sa sécurité."
    ] },
    { titre: "5. Qui y a accès", points: [
     "Les membres habilités de l’équipe BelivaY, selon leur rôle (chacun ne voit que ce dont il a besoin).",
     "Nos prestataires techniques d’hébergement, de base de données et, quand il est activé, d’envoi d’e-mails, qui agissent uniquement pour notre compte. [À COMPLÉTER\u00A0: noms des prestataires et pays d’hébergement des données, si la loi applicable impose de les publier].",
     "Personne d’autre\u00A0: nous ne vendons ni ne louons tes données."
    ] },
    { titre: "6. Combien de temps", points: [
     "Le compte\u00A0: tant qu’il existe. Quand tu le supprimes, il est réellement effacé de la base, avec ses sessions et ses liens. [À COMPLÉTER\u00A0: durée après laquelle un compte inactif est supprimé, si BelivaY en fixe une].",
     "Les sessions\u00A0: 12\u00A0heures, ou 30\u00A0jours avec «\u00A0Se souvenir de moi\u00A0», puis effacées.",
     "Un lien de mot de passe oublié vaut 30\u00A0minutes, une invitation 72\u00A0heures\u00A0; ils sont effacés au plus tard un jour après leur expiration.",
     "Les compteurs contre les abus ne gardent qu’une empreinte de l’adresse IP ou de l’e-mail, effacée à la fin de leur fenêtre (15\u00A0minutes).",
     "Le journal technique des erreurs ne contient aucune donnée personnelle et est effacé après 30\u00A0jours.",
     "Les sauvegardes de la base gardent une donnée supprimée jusqu’à la fin de leur durée de conservation\u00A0: [À COMPLÉTER\u00A0: durée, selon l’offre d’hébergement]."
    ] },
    { titre: "7. Sécurité", points: [
     "Connexion chiffrée (HTTPS), mots de passe hachés, cookie de session inaccessible aux scripts, blocage temporaire après 5 essais faux, second facteur obligatoire pour la console, base chiffrée au repos."
    ] },
    { titre: "8. Tes droits", points: [
     "Accès et portabilité\u00A0: tu télécharges toutes les données de ton compte depuis ton compte, dans un fichier lisible.",
     "Rectification\u00A0: tu modifies ton nom, ton numéro, ton e-mail et ta photo depuis ton profil.",
     "Suppression\u00A0: «\u00A0Supprimer mon compte\u00A0» efface réellement ton compte.",
     "Opposition, limitation et retrait de ton accord\u00A0: écris à contact@belivay.com. Nous répondons sous [À COMPLÉTER\u00A0: délai de réponse].",
     "Tu peux aussi saisir l’autorité de protection des données personnelles compétente au Cameroun\u00A0: [À COMPLÉTER\u00A0: nom et coordonnées de l’autorité prévue par la loi de 2024]."
    ] },
    { titre: "9. Cookies et stockage", points: [
     "Un seul cookie, strictement nécessaire\u00A0: celui de ta session, posé quand tu te connectes, illisible par les scripts de la page.",
     "Le stockage du navigateur garde tes réglages (langue, thème), ton panier et la démonstration.",
     "Comme rien d’autre n’est déposé, aucun bandeau ne te demande ton accord. Si une mesure d’audience est un jour ajoutée, elle restera éteinte tant que tu ne l’allumes pas dans Réglages."
    ] },
    { titre: "10. Quand les ventes ouvriront", points: [
     "Le vendeur ne verra jamais ton nom, ton numéro ni ton relais. Le gérant du relais verra le nom donné au retrait\u00A0; à domicile, le livreur verra ton prénom et tes repères.",
     "Les appels passeront par un rappel masqué, l’écrit par la messagerie. BelivaY ne lira tes messages avec un vendeur que si un dossier est ouvert.",
     "Cette politique sera complétée (commandes, paiements, livraisons) avant l’ouverture des ventes, et la nouvelle version te sera montrée."
    ] }
   ]
  },
  en: {
   titre: "Privacy policy",
   sous: "Your data, who sees it, for how long, your rights.",
   grille: null,
   points: [
    "Today, only your account is stored with us: your e-mail, your name, your number and your photo if you give them, your password in an unreadable form, and the date you accepted the terms.",
    "The orders, carts and messages of the demonstration stay in your browser: they are not sent to our servers.",
    "No advertising tracker, no audience measurement, no sale of your data.",
    "The seller will never see your name, your number or your relay point. Nobody sees your number: calls will go through a masked call-back.",
    "You can download your data, correct it and delete your account, from your account.",
    "A question about your data: contact@belivay.com."
   ],
   sections: [
    { titre: "1. Who is responsible", points: [
     "BelivaY SARLU, [TO BE COMPLETED: head office address], Yaoundé, Cameroon. Contact for personal data: contact@belivay.com."
    ] },
    { titre: "2. What we keep for each account", points: [
     "The account space (customer, seller, delivery company, courier, relay point or console), the e-mail address and, if given, the phone number, first name, last name and a photo (150 KB at most).",
     "The password or PIN, kept only in hashed form (scrypt): nobody, even at BelivaY, can read it back.",
     "The role, the status (active, pending, refused, suspended), the account type (for example diaspora) and the country if given.",
     "For an application (seller, delivery company, relay point): the information entered in the form.",
     "The version of the terms accepted and the date of acceptance.",
     "Connected devices: a summary such as “Chrome · Android”, the date of sign-in and of last visit. Never your IP address.",
     "For the console: the second-factor secret, encrypted, and the fingerprint of the backup codes."
    ] },
    { titre: "3. What we do not collect", points: [
     "No bank or Mobile Money details: no real payment takes place during the demonstration.",
     "The carts, orders, addresses, messages and locations of the demonstration stay in your browser’s storage; they are erased with it.",
     "No advertising cookie, no third-party tracker, no advertising profile."
    ] },
    { titre: "4. Why", points: [
     "To create and secure your account, sign you back in, review professional applications, protect the service against abuse (limits on attempts), keep proof that the terms were accepted and answer your requests.",
     "This processing is necessary for the service you ask for when creating an account, and for its security."
    ] },
    { titre: "5. Who has access", points: [
     "Authorised members of the BelivaY team, according to their role (each one sees only what they need).",
     "Our technical providers for hosting, database and, when enabled, e-mail sending, acting only on our behalf. [TO BE COMPLETED: provider names and data hosting countries, if the applicable law requires publishing them].",
     "Nobody else: we neither sell nor rent your data."
    ] },
    { titre: "6. For how long", points: [
     "The account: as long as it exists. When you delete it, it is really erased from the database, with its sessions and links. [TO BE COMPLETED: period after which an inactive account is deleted, if BelivaY sets one].",
     "Sessions: 12 hours, or 30 days with “Remember me”, then erased.",
     "A forgotten-password link is valid for 30 minutes, an invitation for 72 hours; they are erased at most one day after they expire.",
     "Anti-abuse counters keep only a fingerprint of the IP address or e-mail, erased at the end of their window (15 minutes).",
     "The technical error log contains no personal data and is erased after 30 days.",
     "Database backups keep deleted data until the end of their retention period: [TO BE COMPLETED: period, depending on the hosting plan]."
    ] },
    { titre: "7. Security", points: [
     "Encrypted connection (HTTPS), hashed passwords, session cookie out of reach of scripts, temporary lock after 5 wrong attempts, mandatory second factor for the console, database encrypted at rest."
    ] },
    { titre: "8. Your rights", points: [
     "Access and portability: you download all your account data from your account, in a readable file.",
     "Correction: you change your name, number, e-mail and photo from your profile.",
     "Erasure: “Delete my account” really erases your account.",
     "Objection, restriction and withdrawal of consent: write to contact@belivay.com. We answer within [TO BE COMPLETED: response time].",
     "You can also contact the competent personal data protection authority in Cameroon: [TO BE COMPLETED: name and contact details of the authority set up by the 2024 law]."
    ] },
    { titre: "9. Cookies and storage", points: [
     "A single cookie, strictly necessary: your session cookie, set when you sign in, unreadable by the page’s scripts.",
     "Browser storage keeps your settings (language, theme), your cart and the demonstration.",
     "Since nothing else is stored, no banner asks for your consent. If audience measurement is ever added, it will stay off until you turn it on in Settings."
    ] },
    { titre: "10. When sales open", points: [
     "The seller will never see your name, your number or your relay point. The relay manager will see the name given at pickup; for home delivery, the courier will see your first name and your landmarks.",
     "Calls will go through a masked call-back, writing through the in-app messages. BelivaY will read your messages with a seller only when a case is open.",
     "This policy will be completed (orders, payments, deliveries) before sales open, and the new version will be shown to you."
    ] }
   ]
  }
 },
 {
  cle: "retours",
  icone: "scale",
  aAccepter: true,
  fr: {
   titre: "Règles des retours et des litiges",
   sous: "Motifs, délais, remboursement, décision.",
   grille: null,
   points: [
    "Retour possible si l’article est non conforme, abîmé, contrefait, ou a un défaut caché signalé dans les 48\u00A0h après le retrait.",
    "Dans les 7\u00A0jours après le retrait\u00A0; «\u00A0Tout est en ordre\u00A0» ferme ce délai plus tôt. Pas de retour pour un changement d’avis.",
    "Tu rapportes le colis à ton relais, le livreur le reprend. Retour gratuit si le problème est validé.",
    "Remboursement quand le vendeur a reçu et vérifié l’article, sous 48\u00A0h, sur le moyen de paiement d’origine.",
    "Litige\u00A0: le vendeur a 48\u00A0h pour répondre. S’il se tait, une personne de BelivaY décide en partant de ta version. Toute décision contre toi a un motif écrit.",
    "Un vice caché est couvert 100\u00A0jours après le retrait."
   ]
  },
  en: {
   titre: "Returns and disputes",
   sous: "Reasons, deadlines, refunds, decisions.",
   grille: null,
   points: [
    "A return is possible if the item is not as described, damaged, counterfeit, or has a hidden defect reported within 48 hours after pickup.",
    "Within 7 days after pickup; “All good” closes this window earlier. No return for a change of mind.",
    "You bring the parcel back to your relay point and the courier takes it. Free return if the problem is confirmed.",
    "Refund once the seller has received and checked the item, within 48 hours, to your BelivaY Wallet, or to the card that paid.",
    "Dispute: the seller has 48 hours to answer. If they stay silent, a person at BelivaY decides, starting from your side of the story. Any decision against you comes with a written reason.",
    "A hidden defect is covered for 100 days after pickup."
   ]
  }
 },
 {
  cle: "garde",
  icone: "clock",
  aAccepter: true,
  fr: {
   titre: "Politique de garde au relais",
   sous: "Par colis : 24\u00A0h gratuites, puis de 100\u00A0F à 1\u00A0000\u00A0F par jour.",
   grille: [
    [
     "Jour 1",
     "Gratuit"
    ],
    [
     "Jours 2–4",
     "100\u00A0F"
    ],
    [
     "Jour 5",
     "200\u00A0F"
    ],
    [
     "Jour 6",
     "500\u00A0F"
    ],
    [
     "Jour 7",
     "1\u00A0000\u00A0F"
    ]
   ],
   points: [
    "La garde se compte par colis, quel que soit son format. Le 1er jour est gratuit.",
    "100\u00A0F par jour les 2e, 3e et 4e jours, 200\u00A0F le 5e, 500\u00A0F le 6e, 1\u00A0000\u00A0F le 7e\u00A0: 2\u00A0000\u00A0F au plus par colis, jamais plus que sa valeur.",
    "Un jour de garde dure 24\u00A0h, à partir de l’arrivée de ton dernier colis au relais (quand ton code part).",
    "Quand le relais est fermé, le compteur s’arrête et le renvoi recule d’autant\u00A0: toujours 7 jours de garde. Pendant un litige, la garde s’arrête aussi.",
    "Après le 7e jour, le colis repart chez le vendeur\u00A0: seule la garde de chaque colis est retenue sur ton remboursement, sans autre frais.",
    "Tu paies la garde en espèces au gérant, en une fois, au retrait\u00A0; il confirme l’encaissement avant de te remettre tes colis."
   ]
  },
  en: {
   titre: "Storage at the relay point",
   sous: "Per parcel: 24\u00A0h free, then 100\u00A0F to 1,000\u00A0F per day.",
   grille: [
    [
     "Day 1",
     "Free"
    ],
    [
     "Days 2–4",
     "100\u00A0F"
    ],
    [
     "Day 5",
     "200\u00A0F"
    ],
    [
     "Day 6",
     "500\u00A0F"
    ],
    [
     "Day 7",
     "1,000\u00A0F"
    ]
   ],
   points: [
    "Storage is counted per parcel, whatever its size. Day 1 is free.",
    "100\u00A0F per day on days 2, 3 and 4, 200\u00A0F on day 5, 500\u00A0F on day 6, 1,000\u00A0F on day 7: 2,000\u00A0F at most per parcel, never more than its value.",
    "A storage day lasts 24\u00A0h, from the arrival of your last parcel at the relay point (when your code is sent).",
    "When the relay point is closed, the count stops and the return date moves back by as much: always 7 days of storage. Storage also stops during a dispute.",
    "After day 7, the parcel goes back to the seller: only the storage of each parcel is taken from your refund, with no other fee.",
    "You pay storage in cash to the manager, in one go, at pickup; they confirm the payment before handing over your parcels."
   ]
  }
 },
 {
  cle: "comptoir",
  icone: "wallet",
  aAccepter: true,
  fr: {
   titre: "Paiement au comptoir et par carte",
   sous: "Plafonds, refus, frais de 2 % de la carte.",
   grille: null,
   points: [
    "Payer au retrait\u00A0: tu paies la livraison d’avance, puis le reste en Mobile Money sur ton téléphone, au comptoir.",
    "Plafonds\u00A0: 15\u00A0000\u00A0F pour un nouveau compte, puis 50\u00A0000\u00A0F, et 100\u00A0000\u00A0F après 5 commandes sans incident.",
    "Si tu refuses le colis, la livraison payée d’avance n’est pas remboursée. Après deux refus, le paiement d’avance devient obligatoire.",
    "Pas de paiement au comptoir depuis l’étranger ni pour un gros colis. Le vendeur peut le refuser pour certains produits.",
    "Carte Visa ou Mastercard, pour tous\u00A0: 3-D Secure, frais de service de 2 % affichés avant de payer, 150\u00A0000\u00A0F au plus par paiement. Jamais pour une commande payée au comptoir.",
    "Un remboursement revient toujours sur le moyen de paiement d’origine (Mobile Money, carte ou Wallet)."
   ]
  },
  en: {
   titre: "Paying at the counter and by card",
   sous: "Limits, refusals, 2% card fee.",
   grille: null,
   points: [
    "Pay at pickup: you pay the delivery in advance, then the rest by Mobile Money on your phone, at the counter.",
    "Limits: 15,000 F for a new account, then 50,000 F, and 100,000 F after 5 orders without incident.",
    "If you refuse the parcel, the delivery paid in advance is not refunded. After two refusals, paying in advance becomes mandatory.",
    "No counter payment from abroad or for a bulky parcel. The seller may refuse it for some products.",
    "Visa or Mastercard, for everyone: 3-D Secure, 2% service fee shown before paying, 150,000 F at most per payment. Never for an order paid at the counter.",
    "A refund goes to your BelivaY Wallet; a card payment is refunded to the same card."
   ]
  }
 },
 {
  cle: "diaspora",
  icone: "globe",
  aAccepter: false,
  fr: {
   titre: "Comptes diaspora",
   sous: "Acheter depuis l’étranger pour un proche au Cameroun.",
   grille: null,
   points: [
    "Qui peut ouvrir un compte diaspora\u00A0: une personne majeure (18\u00A0ans et plus) qui vit hors du Cameroun, dans un des pays acceptés (jamais un pays sous sanctions), inscrite avec Google, Apple, une adresse e-mail ou son numéro étranger, et dont le numéro de ce pays est vérifié par SMS (l’e-mail est vérifié par Google, Apple ou un code\u00A0; il est facultatif avec le numéro). Ces conditions s’acceptent à l’ouverture du compte.",
    "Le compte sert à acheter des marchandises pour tes proches au Cameroun\u00A0: jamais de revente, jamais d’argent liquide transféré.",
    "Type de compte\u00A0: un compte diaspora sert uniquement à payer et faire livrer des proches reliés. Pas de retrait pour toi-même, pas de paiement au comptoir, pas de Mobile Money, pas de portefeuille BelivaY ni de vente\u00A0; à chaque commande, «\u00A0Pour qui\u00A0?\u00A0» est obligatoire.",
    "Devise d’affichage\u00A0: tu choisis dans Réglages d’afficher les prix en francs CFA, en euros ou en dollars US\u00A0; le franc CFA reste écrit à côté et reste la monnaie de la commande. Euro\u00A0: parité fixe (1\u00A0€ = 655,957\u00A0F)\u00A0; dollar\u00A0: taux du jour du prestataire, figé au moment du paiement.",
    "Consentement du proche\u00A0: le lien famille ne naît qu’avec son accord, par son code famille (valable 24\u00A0h, une seule fois), en acceptant ton invitation dans son application, ou en ouvrant ton lien d’invitation (QR, WhatsApp, SMS, valable 7\u00A0jours) puis en l’acceptant. Un proche au Cameroun peut aussi t’envoyer son code famille en lien. Chacun de vous retire le lien quand il veut\u00A0; 5\u00A0proches au plus par compte.",
    "Données minimales\u00A0: tu vois le prénom de ton proche, le quartier du relais qu’il a choisi et, s’il l’accepte, «\u00A0chez {prénom}\u00A0» (avec sa ville)\u00A0; jamais son numéro, son adresse ni ses autres commandes. Lui voit ton prénom et ton pays. Le code de retrait ou de remise reste à lui seul\u00A0; tu reçois les étapes et la preuve.",
    "Livraison chez ton proche\u00A0: seulement s’il l’a acceptée dans son compte\u00A0; son adresse reste chez lui. Le livreur lui remet le colis contre son code.",
    "Paniers envoyés par un proche\u00A0: un proche relié peut t’envoyer son panier à payer dans ton application («\u00A0À payer pour mes proches\u00A0»)\u00A0; tu paies, ou tu refuses avec un mot. Sans réponse, il expire après 7\u00A0jours. Tu paies les articles, la livraison et les frais de service\u00A0; si ton proche a demandé la livraison chez lui, tu peux lui laisser le supplément domicile, payé à la remise, seulement si la valeur des articles couvre la garantie (frais, garde et renvoi)\u00A0; s’il refuse le colis, ces montants sont retenus sur ton remboursement, jamais plus que le payé.",
    "Paiement par carte Visa ou Mastercard à ton nom (la carte d’un tiers est refusée), avec 3-D Secure, ou par Apple Pay ou Google Pay avec une carte à ton nom. Frais de service de 2\u00A0% affichés avant de payer\u00A0; total en francs et en euros (parité fixe, 655,957\u00A0F) ou en dollars US (taux du jour, figé au paiement).",
    "Plafonds\u00A0: 150\u00A0000\u00A0F au plus par paiement et 500\u00A0000\u00A0F par mois. Pas de paiement au comptoir depuis l’étranger.",
    "Remboursement\u00A0: toujours sur la carte qui a payé, jamais en espèces ni sur un autre compte. Ton proche signale un problème depuis son application, au comptoir, ou dans les 7\u00A0jours après le retrait.",
    "Lutte contre la fraude et le blanchiment\u00A0: BelivaY peut te demander une pièce d’identité, contrôler chaque paiement (pays de la carte, montant inhabituel, commandes rapprochées) : selon le cas il passe, un code SMS est demandé en plus, ou il est refusé sans rien débiter et tu peux écrire au support pour qu’une personne le revoie et signaler aux autorités ce que la loi l’oblige à signaler. Les paiements et leurs traces sont gardés 10\u00A0ans, comme les pièces comptables."
   ]
  },
  en: {
   titre: "Diaspora accounts",
   sous: "Buying from abroad for a relative in Cameroon.",
   grille: null,
   points: [
    "Who can open a diaspora account: an adult (18 or over) living outside Cameroon, in one of the accepted countries (never a country under sanctions), signed up with Google, Apple, an e-mail address or their foreign number, and whose phone number from that country is verified by SMS (the e-mail is verified by Google, Apple or a code; it is optional with the number). These terms are accepted when the account is opened.",
    "The account is for buying goods for your relatives in Cameroon: never for resale, never to send cash.",
    "Account type: a diaspora account is only for paying for and delivering to linked relatives. No pickup for yourself, no counter payment, no Mobile Money, no BelivaY Wallet and no selling; every order asks “For whom?”.",
    "Display currency: in Settings you choose to show prices in CFA francs, euros or US dollars; the CFA franc stays shown next to it and remains the order currency. Euro: fixed rate (€1 = 655.957 F); dollar: provider’s rate of the day, fixed at payment.",
    "Your relative’s consent: the family link exists only with their agreement, through their family code (valid 24 hours, single use), by accepting your invitation in their app, or by opening your invitation link (QR, WhatsApp, SMS, valid 7 days) and accepting it. A relative in Cameroon can also send you their family code as a link. Either of you can remove the link at any time; 5 relatives at most per account.",
    "Minimal data: you see your relative’s first name, the neighbourhood of the relay point they chose and, if they accept it, “at {first name}’s” (with their city); never their number, address or other orders. They see your first name and your country. The pickup or delivery code stays with them alone; you get the steps and the proof.",
    "Delivery to your relative’s home: only if they accepted it in their account; their address stays with them. The courier hands over the parcel against their code.",
    "Baskets sent by a relative: a linked relative can send you their basket to pay in your app (“To pay for my relatives”); you pay, or decline with a note. Without an answer it expires after 7 days. You pay the items, delivery and service fee; if your relative asked for home delivery, you may leave the home-delivery supplement to them, paid on delivery, only if the items’ value covers the guarantee (fees, storage and return); if they refuse the parcel, these amounts are kept from your refund, never more than what was paid.",
    "Payment by Visa or Mastercard in your name (a third party’s card is refused), with 3-D Secure, or by Apple Pay or Google Pay with a card in your name. 2% service fee shown before paying; total in francs and in euros (fixed rate, 655.957 F) or US dollars (rate of the day, fixed at payment).",
    "Limits: 150,000 F at most per payment and 500,000 F per month. No counter payment from abroad.",
    "Refunds: always to the card that paid, never in cash or to another account. Your relative reports a problem from their app, at the counter, or within 7 days after pickup.",
    "Fighting fraud and money laundering: BelivaY may ask you for an ID, check every payment (card country, unusual amount, orders close together): depending on the case it goes through, an extra SMS code is requested, or it is declined with nothing charged and you can write to support so a person reviews it and report to the authorities what the law requires. Payments and their records are kept for 10 years, like accounting records."
   ]
  }
 },
 {
  cle: "paiement-lien",
  icone: "link",
  aAccepter: false,
  fr: {
   titre: "Paiement par lien depuis l’étranger",
   sous: "Quand un proche paie ton panier depuis l’étranger.",
   grille: null,
   points: [
    "Depuis ton panier, tu envoies un lien à un proche qui vit à l’étranger. Le panier est figé\u00A0: articles, livraison au relais, frais de service et total ne changent plus.",
    "Ton proche paie sur belivay.com sans créer de compte\u00A0: son prénom, et son e-mail pour le reçu. Il voit ton prénom, ton relais et le panier\u00A0; jamais ton numéro, ton adresse ni tes autres commandes.",
    "Carte Visa ou Mastercard, Apple Pay ou Google Pay, avec 3-D Secure. Frais de service de 2\u00A0% affichés avant\u00A0; 150\u00A0000\u00A0F au plus par paiement. Rien n’est débité avant la validation de sa banque.",
    "Total en francs et en euros (parité fixe, 655,957\u00A0F) ou en dollars US (taux du jour du prestataire, figé au paiement, au centime).",
    "Toi seul reçois le code de retrait. Ton proche reçoit la confirmation, le suivi et la preuve de ton retrait, par notification ou par e-mail.",
    "L’argent reste bloqué chez BelivaY\u00A0: le vendeur n’est payé que 14\u00A0jours après la fin du délai de retour.",
    "Problème\u00A0: tu le signales depuis ton application, comme pour toute commande. Un remboursement revient sur la carte qui a payé, jamais sur ton portefeuille.",
    "Ne paie jamais un lien qui ne vient pas de ton proche ou qui ne mène pas à belivay.com. BelivaY ne demande jamais de payer par un autre moyen."
   ]
  },
  en: {
   titre: "Payment by link from abroad",
   sous: "When a relative pays your cart from abroad.",
   grille: null,
   points: [
    "From your cart, you send a link to a relative who lives abroad. The cart is frozen: items, delivery to the relay point, service fee and total no longer change.",
    "Your relative pays on belivay.com without creating an account: their first name, and their e-mail for the receipt. They see your first name, your relay point and the cart; never your number, your address or your other orders.",
    "Visa or Mastercard, Apple Pay or Google Pay, with 3-D Secure. 2% service fee shown before; 150,000 F at most per payment. Nothing is charged before their bank confirms.",
    "Total in francs and in euros (fixed rate, 655.957 F) or US dollars (provider’s rate of the day, fixed at payment, to the cent).",
    "Only you receive the pickup code. Your relative receives the confirmation, the tracking and the proof of your pickup, by notification or by e-mail.",
    "The money stays held by BelivaY: the seller is paid only 14 days after the end of the return window.",
    "A problem: you report it from your app, as for any order. A refund goes back to the card that paid, never to your wallet.",
    "Never pay a link that does not come from your relative or does not lead to belivay.com. BelivaY never asks you to pay another way."
   ]
  }
 },
 {
  cle: "cookies",
  icone: "cookie",
  aAccepter: false,
  fr: {
   titre: "Cookies et mesure d’audience",
   sous: "Un seul cookie, nécessaire. Aucun traceur.",
   grille: null,
   points: [
    "Un seul cookie\u00A0: celui de ta session, posé quand tu te connectes. Il est strictement nécessaire et illisible par les scripts de la page.",
    "Le stockage de ton navigateur garde ce qui fait marcher l’application\u00A0: tes réglages, ton panier, la démonstration.",
    "Aucune mesure d’audience n’est active, aucune publicité d’autres entreprises, aucun traceur\u00A0: c’est pourquoi aucun bandeau ne te demande ton accord.",
    "Si une mesure d’audience est un jour ajoutée, elle restera éteinte tant que tu ne l’allumes pas dans Réglages, et tu pourras la couper à tout moment."
   ]
  },
  en: {
   titre: "Cookies and audience measurement",
   sous: "A single, necessary cookie. No tracker.",
   grille: null,
   points: [
    "A single cookie: your session cookie, set when you sign in. It is strictly necessary and unreadable by the page’s scripts.",
    "Your browser’s storage keeps what makes the app work: your settings, your cart, the demonstration.",
    "No audience measurement is active, no advertising from other companies, no tracker: that is why no banner asks for your consent.",
    "If audience measurement is ever added, it will stay off until you turn it on in Settings, and you can turn it off at any time."
   ]
  }
 },
 {
  cle: "mentions",
  icone: "building",
  aAccepter: false,
  fr: {
   titre: "Mentions légales",
   sous: "Qui édite BelivaY.",
   grille: null,
   points: [
    "Éditeur\u00A0: BelivaY SARLU (société à responsabilité limitée unipersonnelle), au capital de [À COMPLÉTER\u00A0: montant] F CFA.",
    "Siège social\u00A0: [À COMPLÉTER\u00A0: adresse], Yaoundé, Cameroun.",
    "RCCM\u00A0: [À COMPLÉTER\u00A0: numéro]. NIU\u00A0: [À COMPLÉTER\u00A0: numéro].",
    "Directeur de la publication\u00A0: [À COMPLÉTER\u00A0: nom et fonction].",
    "Contact\u00A0: contact@belivay.com, +237\u00A0689\u00A0002\u00A0812 (téléphone et WhatsApp).",
    "Hébergement du site et des données\u00A0: [À COMPLÉTER\u00A0: nom, adresse et téléphone de l’hébergeur].",
    "Les produits, boutiques, prix et commandes visibles sur le site sont, pour l’instant, des exemples de démonstration.",
    "La marque, le logo, les textes et les visuels de BelivaY sont protégés\u00A0: toute reproduction demande un accord écrit."
   ]
  },
  en: {
   titre: "Legal notice",
   sous: "Who publishes BelivaY.",
   grille: null,
   points: [
    "Publisher: BelivaY SARLU (single-member limited liability company), with a share capital of [TO BE COMPLETED: amount] CFA francs.",
    "Head office: [TO BE COMPLETED: address], Yaoundé, Cameroon.",
    "Trade register (RCCM): [TO BE COMPLETED: number]. Tax ID (NIU): [TO BE COMPLETED: number].",
    "Publication director: [TO BE COMPLETED: name and position].",
    "Contact: contact@belivay.com, +237 689 002 812 (phone and WhatsApp).",
    "Hosting of the website and data: [TO BE COMPLETED: name, address and phone number of the host].",
    "The products, shops, prices and orders shown on the website are, for now, demonstration examples.",
    "The BelivaY brand, logo, texts and visuals are protected: any reproduction requires written consent."
   ]
  }
 }
]
