// Pages légales (CL-13), textes du prototype du 1er octobre (CL13_LEGAL), en français et en anglais, avec les
// montants recalculés (DP-08 : garde ; DP-25 : colis L) et les décisions du porteur : remboursement sur le Wallet
// BelivaY ou la carte qui a payé (DP-06, DP-23), carte ouverte à tous (DP-23). L'API servira ces textes et le PDF
// complet de chaque version.
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
    "Tu peux découvrir BelivaY sans compte. Pour commander, il faut un compte et un numéro vérifié par code.",
    "Un e-mail correspond à un seul compte.",
    "Le vendeur reste anonyme\u00A0: tu vois «\u00A0Boutique A\u00A0» et son palier, jamais son nom. Lui ne voit ni ton nom, ni ton numéro, ni ton relais.",
    "Photos et preuves passent par l’application, jamais par WhatsApp.",
    "En cas d’abus, certains avantages sont limités, toujours après examen par une personne et avec recours. Jamais d’exclusion définitive.",
    "Tu peux supprimer ton compte quand aucune commande ni aucun litige n’est en cours."
   ]
  },
  en: {
   titre: "Terms of use",
   sous: "Who can use BelivaY, and how.",
   grille: null,
   points: [
    "You can explore BelivaY without an account. To order, you need an account and a phone number verified by code.",
    "One e-mail address matches one account.",
    "The seller stays anonymous: you see “Shop A” and its tier, never its name. The seller never sees your name, your number or your relay point.",
    "Photos and proof go through the app, never through WhatsApp.",
    "In case of abuse, some benefits are limited, always after review by a person and with the right to appeal. Never a permanent ban.",
    "You can delete your account when no order and no dispute is in progress."
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
    "Retour avec un motif, dans les 7\u00A0jours après le retrait. Remboursement sur ton Portefeuille BelivaY, ou sur la carte qui a payé."
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
   sous: "Tes données, qui les voit, tes droits.",
   grille: null,
   points: [
    "On garde ce qu’il faut pour tes commandes\u00A0: nom, numéro vérifié, e-mail, relais habituel, adresse par repères.",
    "Le vendeur ne voit jamais ton nom, ton numéro ni ton relais.",
    "Le gérant du relais voit le nom donné au retrait. À domicile, le livreur voit ton prénom et tes repères.",
    "Personne ne voit ton numéro\u00A0: les appels passent par un rappel masqué, l’écrit par la messagerie.",
    "BelivaY ne lit tes messages avec un vendeur que si un dossier est ouvert.",
    "Tu peux supprimer ton compte depuis Mon compte."
   ]
  },
  en: {
   titre: "Privacy policy",
   sous: "Your data, who sees it, your rights.",
   grille: null,
   points: [
    "We keep what your orders need: name, verified number, e-mail, usual relay point, address by landmarks.",
    "The seller never sees your name, your number or your relay point.",
    "The relay manager sees the name given at pickup. For home delivery, the courier sees your first name and your landmarks.",
    "Nobody sees your number: calls go through a masked call-back, writing through the in-app messages.",
    "BelivaY reads your messages with a seller only when a case is open.",
    "You can delete your account from My account."
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
    "Remboursement quand le vendeur a reçu et vérifié l’article, sous 48\u00A0h, sur ton Portefeuille BelivaY, ou sur la carte qui a payé.",
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
   sous: "Jour d’arrivée gratuit, puis de 100\u00A0F à 1\u00A0000\u00A0F par jour.",
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
    "Le jour d’arrivée est gratuit.",
    "100\u00A0F par jour les 2e, 3e et 4e jours, 200\u00A0F le 5e, 500\u00A0F le 6e, 1\u00A0000\u00A0F le 7e\u00A0: 2\u00A0000\u00A0F au plus.",
    "Le décompte part du jour où l’on te prévient\u00A0: application ouverte ou SMS délivré.",
    "Un jour de fermeture du relais n’est jamais facturé. Pendant un litige, la garde s’arrête.",
    "Après le 7e jour, le colis repart chez le vendeur\u00A0: la garde et 500\u00A0F de renvoi sont retenus sur ton remboursement, 2\u00A0500\u00A0F au plus.",
    "Tu paies en Mobile Money au retrait\u00A0; le gérant ne touche jamais d’argent."
   ]
  },
  en: {
   titre: "Storage at the relay point",
   sous: "Free on arrival day, then 100\u00A0F to 1,000\u00A0F per day.",
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
    "The day of arrival is free.",
    "100\u00A0F per day on days 2, 3 and 4, 200\u00A0F on day 5, 500\u00A0F on day 6, 1,000\u00A0F on day 7: 2,000\u00A0F at most.",
    "The count starts on the day you are told: app opened or text message delivered.",
    "A day when the relay point is closed is never charged. Storage stops during a dispute.",
    "After day 7, the parcel goes back to the seller: storage plus 500\u00A0F return fee are taken from your refund, 2,500\u00A0F at most.",
    "You pay by Mobile Money at pickup; the manager never handles money."
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
    "Un remboursement va sur ton Portefeuille BelivaY\u00A0; un paiement par carte est remboursé sur la même carte."
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
   sous: "Ce qui est nécessaire, ce qui dépend de ton accord.",
   grille: null,
   points: [
    "L’application garde sur ton téléphone ce qui la fait marcher\u00A0: ta session, ton panier, tes réglages, ton code déjà affiché.",
    "La mesure d’audience ne s’active qu’avec ton accord, dans Réglages. Tu peux la couper à tout moment.",
    "Aucune publicité d’autres entreprises."
   ]
  },
  en: {
   titre: "Cookies and audience measurement",
   sous: "What is needed, what depends on your consent.",
   grille: null,
   points: [
    "The app keeps on your phone what it needs to work: your session, your cart, your settings, your code already shown.",
    "Audience measurement only starts with your consent, in Settings. You can turn it off at any time.",
    "No advertising from other companies."
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
    "Éditeur\u00A0: BelivaY, Yaoundé, Cameroun.",
    "Immatriculation (RCCM, NIU), siège et directeur de la publication\u00A0: à publier avant l’ouverture.",
    "Hébergeur\u00A0: à publier avant l’ouverture.",
    "Contact\u00A0: la messagerie de l’application, ou le support WhatsApp."
   ]
  },
  en: {
   titre: "Legal notice",
   sous: "Who publishes BelivaY.",
   grille: null,
   points: [
    "Publisher: BelivaY, Yaoundé, Cameroon.",
    "Registration (RCCM, NIU), head office and publication director: to be published before opening.",
    "Hosting provider: to be published before opening.",
    "Contact: the in-app messages, or WhatsApp support."
   ]
  }
 }
]
