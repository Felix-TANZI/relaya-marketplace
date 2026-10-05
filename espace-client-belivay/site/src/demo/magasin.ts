// DONNÉES DE DÉMONSTRATION — le « serveur » de la démonstration (DP-53 : chaque page fonctionne pour de vrai).
// Un état du compte, gardé sur l'appareil, que chaque écran lit et que chaque geste modifie (adresse ajoutée,
// relais changé, déconnexion…). Il part des valeurs du prototype et du jeu d'essai de CL-02, si bien qu'un
// appareil neuf montre exactement le prototype (tests au pixel). Il disparaît avec le dossier src/demo quand
// l'API existera : les écrans ne lisent que src/donnees/source.ts.
import type { Appareil, Boutique, Carte, CommandeClient, CommandePassee, Favori, LignePanier, Litige, ChoixNotifications, MethodeConnexion, CommandeANoter, CommandeEnCours, Conversation, DonneesFactures, Rappel, PanierPartage, Abonnement, ListeEnvies, MiseDeCote, Cotisation, DonneesFamille, DonneesRentree, PanierFamille, Troc, ConversationWa, CompteDiaspora, LienFamille, ProcheBelivay, ListeSuivie, EnvoiEchange, Merci, ColisEchange, DemandeProche, EnvoiRecu, CagnotteListe } from '../donnees/source'

export type Operateur = 'MTN' | 'Orange'

export interface AdresseDemo {
  id: string
  nom: string // « Maison »
  quartier: string // zone : « Mvog-Ada »
  zoneServie: boolean
  reperes: string // écrits comme dans la rue, sans le quartier : « carrefour Emana, immeuble bleu, 2e étage »
  position: boolean // position enregistrée sur la carte
  principale: boolean
}

export interface MoyenDemo {
  id: string
  operateur: Operateur
  numeroMasque: string // « 6 77 ·· ·· 41 »
  duCompte: boolean // numéro vérifié du compte (messages, retrait, comptoir)
  parDefaut: boolean
}

export interface EtatDemo {
  v: 1
  connecte: boolean
  supprime?: boolean // le compte de l'appareil a été supprimé (plus de « Bon retour »)
  retenu: boolean // « Se souvenir de moi » : l'appareil garde le compte (connexion par e-mail)
  motDePasse: string // mot de passe du compte (démonstration ; le serveur n'en garde qu'une empreinte) ; '' : aucun
  securite: {
    google: string | null // adresse du compte Google lié
    apple: string | null
    verifieLe: number | null
    appareils: Appareil[]
    historique: { le: number; methode: MethodeConnexion; appareil: string; lieu: string }[]
    biometrie: boolean
    alerteConnexion?: boolean // prévenir à chaque connexion sur un nouvel appareil (absent des états anciens : oui)
  }
  profil: {
    prenom: string
    nom: string
    email: string
    photo: string | null
    numeroMasque: string
    operateur: Operateur
    numeroVerifie: boolean
    connexion: 'google' | 'apple' | 'email'
  }
  relais: { nom: string; gerant: string; horaires: string; acces: string } | null
  adresses: AdresseDemo[]
  moyens: MoyenDemo[]
  // Portefeuille (moteurs/portefeuille.py, DP-48) : le solde est l'argent remboursé plus le reste de chaque
  // recharge ; une recharge qui n'a servi à rien attend WALLET-RECHARGE-ATTENTE avant de pouvoir être retirée.
  portefeuille: {
    cagnotteEnAttente: number
    rembourse: number
    recharges: { le: number; montant: number; restant: number; aServi: boolean }[]
    retraits: { le: number; montant: number; partRechargee: number }[]
    historique: { id: string; type: 'recharge' | 'remboursement' | 'paiement' | 'cagnotte' | 'retrait'; libelle: string; le: number; montant: number }[] // le plus récent d'abord
  }
  compteurs: { commandes: number; litiges: number; messagesNonLus: number; sauvegardes: number; factures: number }
  avisADonner: { ref: string; article: string; jusqua: string }[]
  codesEnCours: string[] // commandes qui ont un code de retrait en cours (CIN-40)
  enCours: CommandeEnCours[] // commandes pas encore terminées (retrait, paiement, litige)
  factures: DonneesFactures
  aNoter: CommandeANoter[]
  rappel: Rappel | null
  // Notifications qui se désactivent (les alertes critiques, jamais) : enregistrées sur le compte (CNO).
  notifs: ChoixNotifications
  canal: 'sms' | 'whatsapp'
  calme: { actif: boolean; debut: number; fin: number }
  boutique: Boutique | null
  cartes: Carte[]
  litiges: Litige[]
  favoris: Favori[]
  panier: { mode: 'relais' | 'domicile'; lignes: LignePanier[] }
  passees: CommandePassee[]
  jeuEssai?: boolean // false : compte neuf, sans les commandes ni les notifications du jeu d'essai
  abonnement?: Abonnement | null // Prime et ses paliers (FF-ABONNEMENT)
  essaiUtilise?: boolean // premier mois à 1 500 F : une fois par compte et par numéro
  business?: 'aucune' | 'envoyee'
  filleuls?: { prenom: string; le: number; etat: 'inscrit' | 'retiree' }[]
  cagnottesVersees?: string[] // commandes dont la cagnotte est versée au Portefeuille
  conditions?: { version: string; le: number } // dernière version acceptée par le compte
  partageFavoris?: ListeEnvies['partage'] // la liste par défaut envoyée
  // Réglages de la liste par défaut (les favoris) : où vont les cadeaux, mode surprise, livraison à domicile.
  reglagesFavoris?: Partial<Pick<ListeEnvies, 'destination' | 'tiers' | 'surprise' | 'domicile'>> | null
  listes?: ListeEnvies[] // listes nommées (la liste par défaut, ce sont les favoris)
  wa?: ConversationWa
  trocs?: Troc[]
  rentree?: { papier: DonneesRentree['papier']; publiees: string[]; commande: string | null }
  diaspora?: CompteDiaspora | null // compte ouvert depuis l'étranger
  liens?: LienFamille[]
  codeFamille?: { code: string; jusqua: number } | null
  devise?: 'XAF' | 'EUR' | 'USD' // devise d'affichage (compte diaspora seulement)
  procheActif?: string | null // « Pour qui ? » d'un compte diaspora : lien famille choisi
  demandes?: DemandeProche[] // paniers envoyés à payer entre proches reliés (DP-54)
  invitation?: { code: string; jusqua: number } | null // lien d'invitation d'un compte diaspora
  famille?: { destinataires: DonneesFamille['destinataires']; paniers: PanierFamille[] }
  cotisations?: Cotisation[]
  cotes?: MiseDeCote[]
  alerteFlash?: boolean
  flashVendus?: Record<string, number>
  interets?: string[] // univers choisis à l'arrivée
  partages?: PanierPartage[] // paniers envoyés à un proche (diaspora)
  // Échanges entre clients (DP-54 ; donnees/echanges.ts) : proches sur BelivaY, listes de proches suivies, envois
  // dans l'application des proches, remerciements, colis payés par l'un pour l'autre, cadeaux faits sur les listes
  // des proches (démonstration : leurs listes sont dans source-demo, LISTES_PROCHES).
  proches?: ProcheBelivay[]
  suivies?: ListeSuivie[]
  envoisEchange?: EnvoiEchange[]
  mercis?: Merci[]
  colisEchange?: ColisEchange[]
  offertsProches?: Record<string, Record<string, { par: string; le: number; ref: string; qui?: 'payeur' | 'destinataire' }>>
  // Cadeaux payés par carte depuis une liste (DP-54) : l'historique par adresse e-mail de celui qui offre, pour les
  // plafonds du mois et le contrôle de cohérence (montant et rythme habituels), comme un compte diaspora.
  cadeauxCarte?: { email: string; le: number; montant: number }[]
  // Reçus (DP-54, src/demo/reseau.ts) : envois reçus d'autres comptes (absents : ceux du jeu d'essai), envois faits
  // à des proches sans compte sur l'appareil, participations aux cagnottes des listes de proches (mariage).
  recus?: EnvoiRecu[]
  envoyes?: EnvoiRecu[]
  cagnottesProches?: Record<string, CagnotteListe['participations']>
  votesAvis?: Record<string, { utile: boolean; signale: boolean }>
  notifsLues?: string[]
  commandesMaj?: Record<string, Partial<CommandeClient>> // changements des commandes du jeu d'essai
  confidentialite: { personnalisation: boolean; nomRetrait: string | null; recherches: number; vus: number }
  // Messagerie : conversations (liste : icône ou vignette ; visible : LIT-3044 n'existe qu'une fois le litige ouvert).
  conversations: (Conversation & { liste: { icone?: string; dessin?: string }; visible: boolean })[]
  changementNumero: { le?: number; nouveau: string; operateur: Operateur; ancien: string; ancienOperateur: Operateur; renouvelees: string[] } | null
  // Avantages du palier (CCO-02 ; moteurs/comptoir.py, moteurs/litiges.py) : écrits en clair, jamais le palier.
  palier: { remboursementImmediat: number; comptoir: number; suivant: { comptoir: number; commandes: number } | null; prochain?: number }
}

// Le compte de référence du prototype (Carine, journée du jeu d'essai).
export const ETAT_INITIAL: EtatDemo = {
  v: 1,
  connecte: true,
  retenu: true,
  motDePasse: 'Belivay2026', // valeur d'essai du jeu de démonstration
  securite: {
    google: 'carine@gmail.com',
    apple: null,
    verifieLe: Date.UTC(2026, 7, 2, 8, 42),
    appareils: [
      { id: 'cet', nom: 'Tecno Spark 20 · application', lieu: 'Yaoundé', derniere: Date.UTC(2026, 8, 24, 8, 15), actuel: true },
      { id: 'pc', nom: 'Chrome sur ordinateur · site', lieu: 'Yaoundé', derniere: Date.UTC(2026, 8, 21, 17, 40), actuel: false },
    ],
    historique: [
      { le: Date.UTC(2026, 8, 24, 8, 15), methode: 'google', appareil: 'Tecno Spark 20 · application', lieu: 'Yaoundé' },
      { le: Date.UTC(2026, 8, 21, 17, 40), methode: 'email', appareil: 'Chrome sur ordinateur · site', lieu: 'Yaoundé' },
      { le: Date.UTC(2026, 7, 2, 8, 40), methode: 'google', appareil: 'Tecno Spark 20 · application', lieu: 'Yaoundé' },
    ],
    biometrie: true,
    alerteConnexion: true,
  },
  profil: {
    prenom: 'Carine',
    nom: 'Mballa',
    email: 'carine@gmail.com',
    photo: null,
    numeroMasque: '6 77 ·· ·· 41',
    operateur: 'MTN',
    numeroVerifie: true,
    connexion: 'google',
  },
  relais: { nom: 'Relais Mvog-Ada', gerant: 'Mme Ngo Bassong', horaires: '8 h – 19 h', acces: '350 m, 6 min à pied' },
  adresses: [
    {
      id: 'maison',
      nom: 'Maison',
      quartier: 'Mvog-Ada',
      zoneServie: true,
      reperes: 'carrefour Emana, immeuble bleu, 2e étage',
      position: true,
      principale: true,
    },
  ],
  moyens: [
    { id: 'mtn', operateur: 'MTN', numeroMasque: '6 77 ·· ·· 41', duCompte: true, parDefaut: true },
    { id: 'orange', operateur: 'Orange', numeroMasque: '6 55 ·· ·· 08', duCompte: false, parDefaut: false },
  ],
  // 45 000 F : 3 740 F remboursés (LIT-2987, cagnotte) + 23 600 F de la recharge du 18 sept. (elle a payé
  // BLV-51940) + 17 660 F de celle du 22 sept.
  portefeuille: {
    cagnotteEnAttente: 3918,
    rembourse: 3740,
    recharges: [
      { le: Date.UTC(2026, 8, 18, 19, 15), montant: 30000, restant: 23600, aServi: true },
      { le: Date.UTC(2026, 8, 22, 17, 5), montant: 20000, restant: 17660, aServi: false },
    ],
    retraits: [],
    historique: [
      { id: 'h6', type: 'recharge', libelle: 'Recharge MTN MoMo', le: Date.UTC(2026, 8, 22, 17, 5), montant: 20000 },
      { id: 'h5', type: 'remboursement', libelle: 'Remboursement LIT-2987 · fer à repasser', le: Date.UTC(2026, 8, 21, 10, 40), montant: 3000 },
      { id: 'h4', type: 'paiement', libelle: 'Paiement BLV-51940 · Relais Mvog-Ada', le: Date.UTC(2026, 8, 20, 15, 12), montant: -6400 },
      { id: 'h3', type: 'cagnotte', libelle: 'Cagnotte créditée · BLV-51702', le: Date.UTC(2026, 8, 19, 8, 30), montant: 740 },
      { id: 'h2', type: 'recharge', libelle: 'Recharge Orange Money', le: Date.UTC(2026, 8, 18, 19, 15), montant: 30000 },
      { id: 'h1', type: 'retrait', libelle: 'Retrait vers MTN MoMo', le: Date.UTC(2026, 8, 16, 12, 2), montant: -2340 },
    ],
  },
  compteurs: { commandes: 4, litiges: 1, messagesNonLus: 1, sauvegardes: 2, factures: 3 },
  avisADonner: [{ ref: 'BLV-51702', article: 'Écouteurs', jusqua: 'sam. 26 sept.' }],
  codesEnCours: ['BLV-52018'],
  enCours: [
    { ref: 'BLV-52018', libelle: 'Retirable maintenant', dessin: 'bf4e892644c3', litige: false },
    { ref: 'BLV-52107', libelle: 'Retrait possible aujourd’hui dès 15\u00A0h', dessin: '96013188e842', litige: false },
    { ref: 'BLV-51940', libelle: 'Validée · à payer au retrait', dessin: 'ebe6ccc0fef4', litige: false },
    { ref: 'BLV-51877', libelle: 'En litige · LIT-3042', dessin: '3626f48d73f7', litige: true },
  ],
  changementNumero: null,
  rappel: null,
  notifs: { messages: true, suivi: true, promotions: false },
  canal: 'sms',
  calme: { actif: true, debut: 21, fin: 7 },
  boutique: null,
  cartes: [],
  favoris: [
    { id: 'f1', p: 'montre', titre: 'Montre acier bracelet cuir', variante: null, dessin: '465a7de86fd7', prix: 27500, prixAvant: 29900, retrait: 900, stock: 'ok', alertes: { prix: true, stock: true }, ajouteLe: Date.UTC(2026, 8, 12, 18, 0) },
    { id: 'f2', p: 'baskets', titre: 'Baskets running', variante: 'Pointure 42', dessin: '032cafed79c8', prix: 29900, prixAvant: null, retrait: 900, stock: 'retour', alertes: { prix: true, stock: true }, ajouteLe: Date.UTC(2026, 8, 20, 9, 30) },
  ],
  passees: [],
  // Prime pris ce matin avec le premier mois à 1 500 F (jeu. 24 sept., 9 h) ; prochain prélèvement le 24 oct.
  abonnement: { palier: 'prime', formule: 'mois', debut: Date.UTC(2026, 8, 24, 8, 0), prochain: Date.UTC(2026, 9, 24, 8, 0), montant: 4000, moyen: 'MTN MoMo · 6 77 ·· ·· 41', resilie: null, fin: null, offertPar: null, echec: null, messageCadeau: null },
  essaiUtilise: true,
  rentree: { papier: [], publiees: [], commande: 'BLV-52089' },
  diaspora: null,
  liens: [
    { id: 'LF-31', sens: 'cameroun', prenom: 'Hervé', pays: 'France', relais: null, etat: 'invite', le: Date.UTC(2026, 8, 24, 7, 30), commandes: [] },
    { id: 'LF-27', sens: 'cameroun', prenom: 'Paul', pays: 'Belgique', relais: 'Relais Mvog-Ada', etat: 'actif', le: Date.UTC(2026, 8, 2, 18, 0), commandes: [{ ref: 'BLV-51533', le: Date.UTC(2026, 8, 11, 19, 0), montant: 22900 }] },
  ],
  codeFamille: null,
  devise: 'XAF',
  procheActif: null,
  demandes: [],
  invitation: null,
  trocs: [
    {
      id: 'TR-21',
      p: 'camon30',
      titre: 'Tecno Camon 30',
      prixLivre: 150699,
      modele: 'camon20',
      modeleNom: 'Tecno Camon 20 · 128 Go',
      declare: { allume: true, ecran: 'intact', batterie: true, coque: 'bon', compteRetire: true, codeRetire: true },
      estimation: { min: 32000, max: 41000 },
      codeDepot: '482907',
      relais: 'Relais Mvog-Ada',
      dates: { cree: Date.UTC(2026, 8, 22, 9, 0), depose: Date.UTC(2026, 8, 22, 15, 10), collecte: Date.UTC(2026, 8, 23, 8, 30), recu: Date.UTC(2026, 8, 23, 13, 0), inspecte: Date.UTC(2026, 8, 24, 8, 40) },
      valeur: null,
      contreOffre: { valeur: 27000, ecarts: [{ titre: 'Écran fissuré sous la protection', sous: 'Non déclaré à l’estimation' }, { titre: 'Batterie à 71 %', sous: 'Mesurée à l’inspection' }] },
      motif: {
        type: 'etat',
        texte: 'L’état constaté à l’inspection est moins bon que l’état déclaré : écran fissuré sous la protection, batterie à 71 % de sa capacité.',
        photos: [
          { src: 'c8ed74acd931', legende: 'Écran, protection retirée' },
          { src: 'fc7577438531', legende: 'Mesure de la batterie' },
        ],
      },
      contestation: null,
      etat: 'contre',
      ref: null,
    },
    {
      id: 'TR-20',
      p: 'camon30',
      titre: 'Tecno Camon 30',
      prixLivre: 150699,
      modele: 'spark10',
      modeleNom: 'Tecno Spark 10 · 64 Go',
      declare: { allume: true, ecran: 'rayures', batterie: true, coque: 'bon', compteRetire: true, codeRetire: true },
      estimation: { min: 17000, max: 21500 },
      codeDepot: '305118',
      relais: 'Relais Mvog-Ada',
      dates: { cree: Date.UTC(2026, 8, 21, 10, 0), depose: Date.UTC(2026, 8, 21, 17, 20), collecte: Date.UTC(2026, 8, 22, 8, 10), recu: Date.UTC(2026, 8, 22, 12, 30), inspecte: Date.UTC(2026, 8, 23, 16, 5) },
      valeur: null,
      contreOffre: null,
      motif: { type: 'compte', texte: 'Le téléphone est encore lié à un compte Google : le reconditionneur ne peut ni l’effacer ni le revendre.', photos: [{ src: '8bf046203afd', legende: 'Écran de verrouillage du compte' }] },
      contestation: null,
      etat: 'refuse',
      ref: null,
    },
  ],
  famille: {
    destinataires: [{ prenom: 'Odile M.', numero: '6 99 ·· ·· 12', relais: 'Relais Mvog-Ada', lieLe: Date.UTC(2026, 8, 20, 10, 0) }],
    paniers: [
      {
        id: 'PF-1',
        nom: 'Panier de Maman',
        destinataire: { prenom: 'Odile M.', relais: 'Relais Mvog-Ada' },
        articles: [
          { id: 'riz5', qte: 2 },
          { id: 'huile5', qte: 1 },
          { id: 'sucre', qte: 2 },
          { id: 'lait', qte: 1 },
          { id: 'spaghetti', qte: 6 },
          { id: 'savon', qte: 4 },
          { id: 'tomate', qte: 4 },
          { id: 'sardines', qte: 6 },
        ],
        mensuel: true,
        jour: 21,
        suspendu: false,
        carte: 'Visa •••• 4821',
        email: 'e•••••@orange.fr',
        historique: [{ le: Date.UTC(2026, 8, 21, 7, 0), montant: 35088, ref: 'BLV-52041', retireLe: Date.UTC(2026, 8, 21, 16, 42) }],
      },
    ],
  },
  cotisations: [
    {
      id: 'COT-77',
      code: '7KQ2M',
      nom: 'Les 30 ans de Junior',
      occasion: 'Anniversaire',
      p: 'montre',
      titre: 'Montre acier bracelet cuir',
      dessin: '',
      prixLivre: 28400,
      objectif: 28968,
      beneficiaire: 'Junior',
      relais: 'Relais Essos',
      organisateur: 'Carine M.',
      creeLe: Date.UTC(2026, 8, 15, 18, 0),
      jusqua: Date.UTC(2026, 8, 30, 22, 59),
      participations: [
        { id: 'pa1', prenom: 'Carine', montant: 10000, frais: 0, le: Date.UTC(2026, 8, 15, 18, 5), discret: false, moyen: 'MTN MoMo', mot: '', organisateur: true },
        { id: 'pa2', prenom: 'Nadège', montant: 5000, frais: 0, le: Date.UTC(2026, 8, 16, 9, 0), discret: false, moyen: 'Orange Money', mot: 'Bon anniversaire Junior !', organisateur: false },
        { id: 'pa3', prenom: 'Hervé', montant: 3000, frais: 60, le: Date.UTC(2026, 8, 18, 20, 0), discret: false, moyen: 'Carte', mot: '', organisateur: false },
        { id: 'pa4', prenom: 'Paul', montant: 5000, frais: 0, le: Date.UTC(2026, 8, 21, 12, 0), discret: true, moyen: 'Mobile Money', mot: '', organisateur: false },
        { id: 'pa5', prenom: 'Aline', montant: 2000, frais: 0, le: Date.UTC(2026, 8, 23, 17, 0), discret: false, moyen: 'MTN MoMo', mot: '', organisateur: false },
      ],
      etat: 'ouverte',
      hausse: null,
      ref: null,
      fin: null,
    },
  ],
  cotes: [
    {
      id: 'MC-118',
      p: 'ventilo',
      titre: 'Ventilateur sur pied 16″',
      dessin: '',
      prix: 24500,
      livraison: 1100,
      prixLivre: 25600,
      rythme: '2sem',
      versements: [
        { n: 1, du: 5120, le: Date.UTC(2026, 8, 10, 9, 0), payeLe: Date.UTC(2026, 8, 10, 9, 5) },
        { n: 2, du: 10240, le: Date.UTC(2026, 8, 24, 9, 0), payeLe: null },
        { n: 3, du: 10240, le: Date.UTC(2026, 9, 8, 9, 0), payeLe: null },
      ],
      creeLe: Date.UTC(2026, 8, 10, 9, 0),
      moyen: 'MTN MoMo · 6 77 ·· ·· 41',
      etat: 'en_cours',
      ref: null,
      annulee: null,
    },
  ],
  listes: [
    {
      id: 'anniv',
      nom: 'Mon anniversaire',
      favoris: false,
      mode: 'groupe',
      remiseLe: Date.UTC(2026, 9, 10, 17, 0),
      surprise: false,
      destination: 'moi',
      relais: 'Relais Mvog-Ada',
      tiers: null,
      // Prix relevés au partage : le tapis a pris 400 F depuis, la crème a baissé (CLE-39).
      partage: { code: 'k7Q2mX', le: Date.UTC(2026, 8, 21, 9, 0), jusqua: Date.UTC(2026, 9, 21, 22, 59), prix: { batterie: 14900, cafe: 6500, tapisyoga: 9500, cremevisage: 7500 } },
      demarree: false,
      articles: [
        { p: 'batterie', titre: 'Batterie externe 20 000 mAh', dessin: '', prix: 14900, livraison: 900, prixPartage: null, offert: { par: 'Paul', le: Date.UTC(2026, 8, 22, 18, 0), ref: 'BLV-52061' } },
        { p: 'cafe', titre: 'Café arabica de l’Ouest 500 g', dessin: '', prix: 6500, livraison: 900, prixPartage: null, offert: { par: 'Mireille', le: Date.UTC(2026, 8, 23, 11, 0), ref: 'BLV-52088' } },
        { p: 'tapisyoga', titre: 'Tapis de yoga 6 mm', dessin: '', prix: 9900, livraison: 900, prixPartage: null, offert: null },
        { p: 'cremevisage', titre: 'Crème visage karité & aloe 100 ml', dessin: '', prix: 7500, livraison: 900, prixPartage: null, offert: null },
      ],
    },
    {
      id: 'mariage',
      nom: 'Mariage de Sandrine',
      favoris: false,
      mode: 'groupe',
      remiseLe: Date.UTC(2026, 9, 17, 17, 0),
      surprise: false,
      destination: 'tiers',
      relais: null,
      tiers: null,
      partage: null,
      demarree: false,
      articles: [
        { p: 'ventilo', titre: 'Ventilateur sur pied 16″', dessin: '', prix: 24500, livraison: 1100, prixPartage: null, offert: null },
        { p: 'marmite', titre: 'Marmite en fonte 8 L', dessin: '', prix: 22000, livraison: 1100, prixPartage: null, offert: null },
      ],
    },
  ],
  proches: [
    { id: 'pr-paul', prenom: 'Paul', numeroMasque: '6 99 ·· ·· 12', quartier: 'Mvog-Ada', lie: true, anniversaire: null, liste: null },
    { id: 'pr-mireille', prenom: 'Mireille', numeroMasque: '6 77 ·· ·· 58', quartier: 'Essos', lie: false, anniversaire: Date.UTC(2026, 9, 12, 8, 0), liste: null },
    { id: 'pr-nadege', prenom: 'Nadège', numeroMasque: '6 55 ·· ·· 07', quartier: 'Bastos', lie: false, anniversaire: Date.UTC(2026, 10, 2, 8, 0), liste: null },
    { id: 'pr-aline', prenom: 'Aline', numeroMasque: '6 90 ·· ·· 33', quartier: 'Nlongkak', lie: false, anniversaire: null, liste: null },
  ],
  suivies: [{ code: 'm3Rq8z', prenom: 'Mireille', nom: 'Mon anniversaire', remiseLe: Date.UTC(2026, 9, 12, 17, 0), rappel: 3, depuis: Date.UTC(2026, 8, 20, 10, 0) }],
  envoisEchange: [
    { objet: 'liste', id: 'anniv', proche: 'pr-paul', prenom: 'Paul', le: Date.UTC(2026, 8, 21, 9, 5), rappeleLe: null },
    { objet: 'liste', id: 'anniv', proche: 'pr-mireille', prenom: 'Mireille', le: Date.UTC(2026, 8, 21, 9, 5), rappeleLe: null },
    { objet: 'liste', id: 'anniv', proche: 'pr-nadege', prenom: 'Nadège', le: Date.UTC(2026, 8, 21, 9, 5), rappeleLe: null },
  ],
  mercis: [],
  // Un colis payé par Paul depuis son panier, pour Carine : la livraison est à payer à la remise (900 F).
  colisEchange: [
    { id: 'CE-11', ref: 'BLV-52096', origine: 'panier', sens: 'recu', de: 'Paul', pour: 'Carine', titre: 'Sandales cuir femme', dessin: '46807d04a705', articles: 14900, frais: 900, qui: 'destinataire', relais: 'Relais Mvog-Ada', etat: 'a_accepter', expedie: false, joursGarde: 0, retenue: null, rembourse: null, le: Date.UTC(2026, 8, 24, 7, 40) },
  ],
  offertsProches: {},
  cadeauxCarte: [],
  filleuls: [
    { prenom: 'Joël', le: Date.UTC(2026, 8, 24, 8, 30), etat: 'inscrit' },
    { prenom: 'Aline', le: Date.UTC(2026, 8, 12, 15, 0), etat: 'retiree' },
  ],
  panier: {
    mode: 'relais',
    lignes: [
      {
        id: 'l1', p: 'camon30', titre: 'Tecno Camon 30', variante: 'Gris titane · 256 Go', dessin: 'c8ed74acd931', prix: 150699, qte: 1, stock: 23, classe: 'S', boutique: 'Boutique A',
        options: [
          { nom: 'Couleur', valeurs: ['Gris titane', 'Vert', 'Noir'], indispo: ['Noir'], choisi: 'Gris titane' },
          { nom: 'Capacité', valeurs: ['128 Go', '256 Go', '512 Go'], indispo: ['512 Go'], prix: { '128 Go': 139900, '256 Go': 150699 }, choisi: '256 Go' },
        ],
        offres: [
          { boutique: 'Boutique E', zone: 'Essos', prix: 147500, km: 0.9, score: 88, ventes: 41 },
          { boutique: 'Boutique F', zone: 'Mokolo', prix: 150699, km: 5.1, score: 94, ventes: 220 },
          { boutique: 'Boutique G', zone: 'Mvan', prix: 145000, km: 7.8, score: 79, ventes: 12 },
        ],
      },
      {
        id: 'l2', p: 'ensemblewax', titre: 'Ensemble wax 3 pièces', variante: 'Taille M', dessin: '0875c550060b', prix: 32000, qte: 1, stock: 5, classe: 'M', boutique: 'Boutique B',
        options: [{ nom: 'Taille', valeurs: ['S', 'M', 'L', 'XL'], indispo: ['XL'], choisi: 'M' }],
      },
      {
        id: 'l3', p: 'saccuir', titre: 'Sac cuir artisanal', variante: 'Marron', dessin: '30942470397d', prix: 52000, qte: 1, stock: 2, classe: 'M', boutique: 'Boutique B',
        options: [{ nom: 'Couleur', valeurs: ['Marron', 'Noir', 'Cognac'], indispo: ['Cognac'], choisi: 'Marron' }],
      },
      {
        id: 'l4', p: 'mixeur', titre: 'Mixeur-blender 2 L · 600 W', variante: null, dessin: '1bf387ebd71e', prix: 37000, qte: 1, stock: 4, classe: 'M', boutique: 'Boutique C',
        offres: [{ boutique: 'Boutique D', zone: 'Mvog-Ada', prix: 37000, km: 0.4, score: 80, ventes: 96 }],
      },
    ],
  },
  litiges: [
    {
      id: 'LIT-3042',
      ref: 'BLV-51877',
      colis: 1,
      produit: 'Fer à repasser vapeur 2\u00A0200\u00A0W',
      dessin: '3626f48d73f7',
      pb: 'abime',
      probleme: 'Semelle fendue',
      description: 'Constat au comptoir, au déballage.',
      souhait: 'remplace',
      montant: 15800,
      origine: 'comptoir',
      ouvertLe: Date.UTC(2026, 8, 23, 16, 15),
      echeance: Date.UTC(2026, 8, 25, 16, 15),
      etat: 'attente',
      preuves: [
        { titre: 'Déballage', sous: 'photo de Mme Ngo Bassong, mer. 23 sept. à 17\u00A0h\u00A010', dessin: 'c7250c577bc3' },
        { titre: 'Colis scellé', sous: 'photo du livreur chez le vendeur', dessin: '57dd2f97c358' },
      ],
      relais: 'Relais Mvog-Ada',
    },
    {
      id: 'LIT-2987',
      ref: 'BLV-51206',
      colis: 1,
      produit: 'Chemise bazin brodée · L',
      dessin: 'd526d9d3fe62',
      pb: 'pas-commande',
      probleme: 'Pas la bonne taille',
      description: '',
      souhait: 'rembourse',
      montant: 3000,
      ouvertLe: Date.UTC(2026, 7, 10, 9, 0),
      echeance: Date.UTC(2026, 7, 12, 9, 0),
      etat: 'rembourse',
      preuves: [],
      decision: { le: Date.UTC(2026, 7, 10, 9, 1), motif: 'Tout de suite, sans enquête : remboursement immédiat de ton palier (3 000 F).' },
      relais: 'Relais Mvog-Ada',
      origine: 'auto',
    },
    {
      id: 'LIT-3041',
      ref: 'BLV-51655',
      colis: 1,
      produit: 'Mixeur-blender 2 L · 600 W',
      dessin: '1bf387ebd71e',
      pb: 'abime',
      probleme: 'Ne démarre pas',
      description: 'Le moteur ne tourne pas, même sur la vitesse 1.',
      souhait: 'remplace',
      montant: 37000,
      ouvertLe: Date.UTC(2026, 8, 21, 18, 0),
      echeance: Date.UTC(2026, 8, 23, 18, 0),
      etat: 'accepte',
      preuves: [{ titre: 'Ta photo 1', sous: 'versée au dossier', dessin: '1bf387ebd71e' }],
      decision: { le: Date.UTC(2026, 8, 23, 10, 0), motif: 'Le vendeur accepte de remplacer le mixeur.' },
      relais: 'Relais Mvog-Ada',
      origine: 'appli',
      remplacement: { etape: 'autre', dates: { attente: Date.UTC(2026, 8, 23, 10, 0) }, avant: Date.UTC(2026, 8, 26, 10, 0), autre: { boutique: 'Boutique F', trust: 78, ecart: 600 } },
    },
    {
      id: 'LIT-3039',
      ref: 'BLV-51388',
      colis: 1,
      produit: 'Beurre de karité pur 500\u00A0g\u00A0×\u00A02',
      dessin: '603cb36e1d48',
      pb: 'abime',
      probleme: 'Odeur rance (défaut caché)',
      description: 'Pots ouverts à la maison : odeur rance, date dépassée.',
      souhait: 'rembourse',
      montant: 7800,
      ouvertLe: Date.UTC(2026, 8, 22, 8, 0),
      echeance: Date.UTC(2026, 8, 24, 8, 0),
      etat: 'accepte',
      preuves: [{ titre: 'Ta photo 1', sous: 'versée au dossier', dessin: '603cb36e1d48' }],
      decision: { le: Date.UTC(2026, 8, 23, 14, 20), motif: 'Le vendeur accepte : remboursement après retour de l’article au relais.' },
      relais: 'Relais Mvog-Ada',
      origine: 'appli',
      retour: { etape: 'depot', dates: {}, avant: Date.UTC(2026, 8, 30, 18, 0) },
    },
  ],
  confidentialite: { personnalisation: true, nomRetrait: null, recherches: 14, vus: 23 },
  // Messagerie du jeu d'essai (heures de Yaoundé : UTC + 1).
  conversations: [
    {
      id: 'LIT-3042',
      type: 'dossier',
      titre: 'Dossier LIT-3042 · fer à repasser',
      apercu: 'Support\u00A0: «\u00A0Bien reçu. Ta demande de remplacement est au dossier.\u00A0»',
      liste: { icone: 'scale' },
      visible: true,
      entete: { titre: 'Fer à repasser vapeur 2\u00A0200 W', sous: 'BLV-51877 · constat au comptoir', dessin: '3626f48d73f7', bloque: 15800, lien: { texte: 'Le dossier', vers: '/litige-suivi?id=LIT-3042' } },
      resolue: false,
      nonLus: 1,
      placeholder: 'Ton message au dossier…',
      pied: 'Cette conversation fait partie du dossier. Les photos se prennent ici, jamais par WhatsApp.',
      messages: [
        { de: 'systeme', le: Date.UTC(2026, 8, 23, 16, 15), texte: 'scale|heure|Dossier ouvert au comptoir du [[Relais Mvog-Ada]]. Mme Ngo Bassong a photographié la semelle et garde le colis.' },
        { de: 'eux', qui: 'BelivaY', le: Date.UTC(2026, 8, 23, 16, 16), texte: 'Ton paiement reste bloqué, rien n’est versé au vendeur. Le vendeur a jusqu’au ven. 25 sept. à 17\u00A0h\u00A015 pour répondre.' },
        { de: 'moi', le: Date.UTC(2026, 8, 24, 8, 40), texte: 'La semelle était fendue dès l’ouverture du carton. Je préfère être remplacée.' },
        { de: 'eux', qui: 'Support BelivaY', le: Date.UTC(2026, 8, 24, 9, 5), texte: 'Bien reçu. Ta demande de remplacement est au dossier. On te prévient dès que le vendeur répond.' },
      ],
    },
    {
      id: 'question',
      type: 'vendeur',
      titre: 'Pagne wax 6 yards · le vendeur',
      apercu: 'Le vendeur\u00A0: «\u00A0Oui, 100\u00A0% coton, 6 yards.\u00A0»',
      liste: { dessin: 'bf4e892644c3' },
      visible: true,
      entete: { titre: 'Pagne wax 6 yards · motif soleil orange', sous: 'Le vendeur ne voit ni ton nom ni ton numéro.', dessin: 'bf4e892644c3', lien: { texte: 'Voir', vers: '/fiche?p=pagne' } },
      resolue: false,
      nonLus: 0,
      placeholder: 'Ta question au vendeur…',
      pied: 'Gardé par écrit. BelivaY ne lit cette conversation que si un dossier est ouvert.',
      messages: [
        { de: 'moi', le: Date.UTC(2026, 8, 18, 19, 14), texte: 'Bonjour, il est en coton\u00A0? Mon numéro\u00A0: {{numero}}' },
        { de: 'systeme', le: Date.UTC(2026, 8, 18, 19, 14), texte: 'eye-off||Un numéro a été retiré de ce message avant l’envoi. Le vendeur répond ici.' },
        { de: 'eux', qui: 'Le vendeur', le: Date.UTC(2026, 8, 19, 7, 30), texte: 'Bonjour, oui\u00A0: 100\u00A0% coton, 6 yards.' },
      ],
    },
    {
      id: 'support',
      type: 'support',
      titre: 'Support BelivaY',
      apercu: 'Toi\u00A0: «\u00A0Merci\u00A0!\u00A0» · résolue',
      liste: { icone: 'headset' },
      visible: true,
      entete: { titre: 'Support BelivaY', sous: 'Réponse sous 2\u00A0h, de 7\u00A0h à 21\u00A0h, 7\u00A0jours sur 7' },
      resolue: true,
      nonLus: 0,
      placeholder: 'Ton message…',
      pied: 'Gardé par écrit. Numéros, e-mails et réseaux sociaux sont masqués.',
      messages: [
        { de: 'moi', le: Date.UTC(2026, 8, 22, 18, 2), texte: 'Bonjour, je peux changer mon relais habituel pour Essos\u00A0?' },
        {
          de: 'eux',
          qui: 'Support BelivaY',
          le: Date.UTC(2026, 8, 23, 7, 10),
          texte: 'Bonjour Carine. Oui\u00A0: Mon compte, puis «\u00A0Changer\u00A0» sur ton relais habituel. Pour une commande déjà payée, passe par la commande\u00A0: c’est gratuit tant que rien n’est collecté.',
        },
        { de: 'moi', le: Date.UTC(2026, 8, 23, 7, 20), texte: 'Merci\u00A0!' },
        { de: 'systeme', le: Date.UTC(2026, 8, 23, 7, 21), texte: 'check||Conversation résolue. Écris ici si tu as une autre question.' },
      ],
    },
    {
      id: 'LIT-3044',
      type: 'dossier',
      titre: 'Dossier LIT-3044 · écouteurs',
      apercu: 'BelivaY\u00A0: «\u00A0Ton paiement reste bloqué, rien n’est versé au vendeur.\u00A0»',
      liste: { icone: 'scale' },
      visible: false,
      entete: { titre: 'Écouteurs sans fil · blanc', sous: 'BLV-51702 · Colis 1 · ouvert dans l’application', dessin: '2b5bcef070f6', bloque: 23000, lien: { texte: 'Le dossier', vers: '/litige-suivi?id=LIT-3044' } },
      resolue: false,
      nonLus: 0,
      placeholder: 'Ton message au dossier…',
      pied: 'Cette conversation fait partie du dossier. Les photos se prennent ici, jamais par WhatsApp.',
      messages: [
        { de: 'photo', le: Date.UTC(2026, 8, 24, 9, 14), dessin: 'e349e8b35d04' },
        { de: 'moi', le: Date.UTC(2026, 8, 24, 9, 15), texte: 'Carton écrasé\u00A0: le boîtier des écouteurs et le chargeur sont fendus.' },
        { de: 'systeme', le: Date.UTC(2026, 8, 24, 9, 15), texte: 'scale|heure|Dossier LIT-3044 ouvert dans l’application. Photo prise dans l’application et versée au dossier.' },
        { de: 'eux', qui: 'BelivaY', le: Date.UTC(2026, 8, 24, 9, 15), texte: 'Ton paiement reste bloqué, rien n’est versé au vendeur. Le vendeur a jusqu’au sam. 26 sept. à 10\u00A0h\u00A015 pour répondre. On te prévient dès qu’il répond.' },
      ],
    },
  ],
  // Commandes à noter (jeu d'essai) : BLV-51702 retirée sam. 19 sept. à 11 h 32 ; BLV-52018 retirée aujourd'hui
  // à 10 h 32 (2 colis) ; BLV-51388 retirée le 28 août (notation fermée) ; BLV-52107 payée, pas retirée.
  aNoter: [
    {
      ref: 'BLV-51702',
      titre: 'Écouteurs sans fil · blanc et chargeur rapide 33 W USB-C',
      produit: 'ecouteurs',
      dessin: '2b5bcef070f6',
      retireeLe: Date.UTC(2026, 8, 19, 10, 32),
      payeeLe: Date.UTC(2026, 8, 17, 9, 0),
      relais: 'Relais Mvog-Ada',
      gerant: 'Mme Ngo Bassong',
      colis: [{ produit: null }],
      avis: null,
    },
    {
      ref: 'BLV-52018',
      titre: 'Pagne wax 6 yards et sandales cuir femme · 2 colis',
      produit: 'pagne',
      dessin: 'bf4e892644c3',
      retireeLe: Date.UTC(2026, 8, 24, 9, 32),
      payeeLe: Date.UTC(2026, 8, 22, 9, 0),
      relais: 'Relais Mvog-Ada',
      gerant: 'Mme Ngo Bassong',
      colis: [{ produit: 'Pagne wax 6 yards', dessin: 'bf4e892644c3' }, { produit: 'Sandales cuir femme', dessin: 'd904fc29309b' }],
      avis: null,
    },
    {
      ref: 'BLV-51388',
      titre: 'Beurre de karité pur 500 g ×2 et huile de coco vierge 500 ml',
      produit: 'karite',
      dessin: '603cb36e1d48',
      retireeLe: Date.UTC(2026, 7, 28, 15, 0),
      payeeLe: Date.UTC(2026, 7, 27, 9, 0),
      relais: 'Relais Mvog-Ada',
      gerant: 'Mme Ngo Bassong',
      colis: [{ produit: null }],
      avis: null,
    },
    {
      ref: 'BLV-52107',
      titre: 'Samsung Galaxy A15 · 128 Go et 2 autres colis',
      produit: 'galaxya15',
      dessin: '96013188e842',
      retireeLe: null,
      payeeLe: Date.UTC(2026, 8, 24, 8, 2),
      relais: 'Relais Mvog-Ada',
      gerant: 'Mme Ngo Bassong',
      colis: [{ produit: null }, { produit: null }, { produit: null }],
      avis: null,
    },
  ],
  // Les commandes terminées du jeu d'essai (BLV-51388 : 2 × 3 500 F de karité + 4 800 F d'huile de coco + 900 F).
  factures: {
    factures: [
      {
        ref: 'BLV-51702',
        total: 23900,
        retiree: 'Retirée sam. 19 sept.',
        resume: 'Écouteurs sans fil, chargeur rapide 33 W',
        lignes: [
          { libelle: 'Écouteurs sans fil', montant: 16500 },
          { libelle: 'Chargeur rapide 33 W USB-C', montant: 6500 },
          { libelle: 'Livraison au relais', montant: 900 },
        ],
        retrait: { relais: 'Relais Mvog-Ada', quand: ' · sam. 19 sept. à 11\u00A0h\u00A032' },
        payePar: { operateur: 'MTN', numero: '6 77 ·· ·· 41' },
        remboursement: null,
        le: Date.UTC(2026, 8, 19, 10, 32),
      },
      {
        ref: 'BLV-51388',
        total: 12700,
        retiree: 'Retirée le 28 août',
        resume: 'Beurre de karité ×2, huile de coco',
        lignes: [
          { libelle: 'Beurre de karité pur 500 g × 2', montant: 7000 },
          { libelle: 'Huile de coco vierge 500 ml', montant: 4800 },
          { libelle: 'Livraison au relais', montant: 900 },
        ],
        retrait: { relais: 'Relais Mvog-Ada', quand: ' · ven. 28 août' },
        payePar: { operateur: 'MTN', numero: '6 77 ·· ·· 41' },
        remboursement: null,
        le: Date.UTC(2026, 7, 28, 9, 0),
      },
      {
        ref: 'BLV-51206',
        total: 21900,
        retiree: 'Retirée le 8 août',
        resume: 'Chemise bazin brodée · 3\u00A0000\u00A0F remboursés (LIT-2987)',
        lignes: [
          { libelle: 'Chemise bazin brodée', montant: 21000 },
          { libelle: 'Livraison au relais', montant: 900 },
        ],
        retrait: { relais: 'Relais Mvog-Ada', quand: ' · sam. 8 août' },
        payePar: { operateur: 'MTN', numero: '6 77 ·· ·· 41' },
        remboursement: { libelle: 'Remboursé le lun. 10 août · LIT-2987', montant: 3000 },
        le: Date.UTC(2026, 7, 8, 9, 0),
      },
    ],
    annulees: [{ ref: 'BLV-51533', texte: 'Pas de facture\u00A0: annulée le 12 sept., 22\u00A0900\u00A0F remboursés' }],
  },
  palier: { remboursementImmediat: 3000, comptoir: 50000, suivant: { comptoir: 100000, commandes: 5 } },
}

// Un compte qui vient d'être créé (prototype : « compte?st=nouveau ») : numéro à vérifier, rien en cours.
export const ETAT_NOUVEAU: EtatDemo = {
  ...ETAT_INITIAL,
  jeuEssai: false,
  abonnement: null,
  essaiUtilise: false,
  business: 'aucune',
  filleuls: [],
  cagnottesVersees: [],
  interets: [],
  partages: [],
  listes: [],
  reglagesFavoris: null,
  proches: [],
  suivies: [],
  envoisEchange: [],
  mercis: [],
  colisEchange: [],
  offertsProches: {},
  cadeauxCarte: [],
  recus: [],
  envoyes: [],
  cagnottesProches: {},
  cotes: [],
  cotisations: [],
  famille: { destinataires: [], paniers: [] },
  rentree: { papier: [], publiees: [], commande: null },
  trocs: [],
  diaspora: null,
  liens: [],
  codeFamille: null,
  devise: 'XAF',
  procheActif: null,
  demandes: [],
  invitation: null,
  profil: { ...ETAT_INITIAL.profil, numeroVerifie: false },
  securite: { ...ETAT_INITIAL.securite, verifieLe: null, appareils: ETAT_INITIAL.securite.appareils.filter((a) => a.actuel), historique: [], alerteConnexion: true },
  relais: null,
  adresses: [],
  moyens: [],
  portefeuille: { cagnotteEnAttente: 0, rembourse: 0, recharges: [], retraits: [], historique: [] },
  compteurs: { commandes: 0, litiges: 0, messagesNonLus: 0, sauvegardes: 0, factures: 0 },
  avisADonner: [],
  codesEnCours: [],
  enCours: [],
  litiges: [],
  favoris: [],
  panier: { mode: 'relais', lignes: [] },
  factures: { factures: [], annulees: [] },
  aNoter: [],
  rappel: null,
  conversations: [],
  palier: { remboursementImmediat: 3000, comptoir: 15000, suivant: { comptoir: 100000, commandes: 5 }, prochain: 50000 },
}

const CLE = 'blv_demo_etat'

export function lireEtat(): EtatDemo {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) || 'null') as Partial<EtatDemo> | null
    if (brut && brut.v === 1)
      return {
        ...ETAT_INITIAL,
        ...brut,
        profil: { ...ETAT_INITIAL.profil, ...brut.profil },
        portefeuille: { ...ETAT_INITIAL.portefeuille, ...brut.portefeuille },
      }
  } catch {
    // Stockage illisible : on repart du compte de référence.
  }
  return ETAT_INITIAL
}

export function ecrireEtat(e: EtatDemo): EtatDemo {
  try {
    localStorage.setItem(CLE, JSON.stringify(e))
  } catch {
    // Stockage plein ou refusé : le changement vaut pour cette visite.
  }
  return e
}

export function modifier(f: (e: EtatDemo) => EtatDemo): EtatDemo {
  return ecrireEtat(f(lireEtat()))
}

// Solde du portefeuille : l'argent remboursé plus le reste de chaque recharge.
export const solde = (e: EtatDemo) => e.portefeuille.rembourse + e.portefeuille.recharges.reduce((n, r) => n + r.restant, 0)
