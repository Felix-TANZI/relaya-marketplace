// Ce que l'interface lit du serveur. Les chiffres (badges, compteurs, montants, seuils) viennent toujours
// du serveur, jamais d'une valeur écrite dans le code (CCH-15, CNV-07, CRD-12).
//
// Deux sources, une seule interface (Source, ci-dessous), choisies par VITE_SOURCE (src/config/env.ts) :
// - « demo » (défaut) : la démonstration (src/demo, valeurs du prototype et du jeu d'essai de CL-02) ;
// - « api » : le serveur relaya-marketplace (src/api/source-api.ts) ; chaque méthode y est branchée, ou lève
//   NonDisponible avec la route attendue (état de chaque méthode : CONNECTEURS.md).
// Les pages ne savent pas laquelle tourne. Quand tout sera branché, src/demo sera supprimé d'un bloc.
import { clientDeLEnvironnement } from '../api/client'
import { creerSourceApi } from '../api/source-api'
import { env } from '../config/env'
import { INTERRUPTEURS_DU_LANCEMENT, type EtatInterrupteurs } from '../config/interrupteurs'
import { sourceDemo } from '../demo/source-demo'
import type { PaieFrais } from './echanges'
import type { ContenuAccueil } from './contenus'

// Une image servie par l'API (url) ; en démonstration, le dessin du prototype (svg), parfois redessiné
// aux couleurs du thème sombre (svgSombre).
export type Image = { url: string; srcset?: string; alt?: string } | { svg: string; svgSombre?: string }

// Photo servie par le serveur (produit, boutique, relais, bandeau, catégorie) : adresse, variantes de largeur
// (`srcset`, « …-480.webp 480w, …-960.webp 960w ») et texte alternatif. Champ toujours facultatif : sans photo, ou
// si elle ne se charge pas, l'écran garde le dessin du prototype (composants/Dessin.tsx). En démonstration, aucune
// donnée n'a de photo. Téléversement : POST /api/admin/media (backend-kit/apps/contenus).
export interface PhotoServeur {
  url: string
  srcset?: string
  alt?: string
}

export interface Badges {
  panier: number // somme des quantités (CPN-56)
  nonLus: number // notifications non lues (CNT-04)
  compte: number // commandes à retirer (CMC-16)
}

export interface Client {
  prenom: string
  nom: string
  nomComplet: string
  numeroMasque: string
  operateur: string // opérateur du numéro vérifié, détecté au préfixe (CCO-14) : « MTN »
  email: string
  emailMasque: string // « c•••••@gmail.com » (menu du profil, compte)
  connexion: 'google' | 'apple' | 'email' // méthode de connexion, écrite à côté de l'e-mail (CIN-46)
  portrait: Record<36 | 48, Image>
  photo: string | null // photo de profil choisie par le client (DP-52), à la place du portrait
}

// Codes de vérification (CIN-33, CIN-34) : 6 chiffres, valables CODE-VALIDITE minutes, renvoi après
// CODE-RENVOI secondes, blocage après CODE-ESSAIS codes faux. Le serveur envoie, compte et décide ; l'écran
// ne fait qu'afficher.
export interface EnvoiCode {
  destination: string // « 6 77 ·· ·· 41 · MTN » ou l'e-mail, déjà masqué
  valideMinutes: number
  renvoiSecondes: number
  codeDemo?: string // démonstration seulement : le code à saisir (l'API ne le renvoie jamais)
}
export type ResultatCode =
  | { ok: true; client: Client }
  | { ok: false; essaisRestants: number }
  | { ok: false; bloqueJusqua: number } // heure de reprise (ms)

// Profil (DP-52) : prénom, nom, photo ; enregistrés après un code par SMS au numéro vérifié. L'e-mail
// change après deux codes : un par SMS (c'est bien la cliente), un à la nouvelle adresse (elle est à elle).
export interface ChangementProfil {
  prenom: string
  nom: string
  photo: string | null
}
// Dernier changement de numéro : ce que l'écran final nomme (CIN-40, CIN-43).
export interface ChangementNumero {
  nouveau: string // masqué : « 6 55 ·· ·· 08 »
  operateur: 'MTN' | 'Orange'
  ancien: string
  ancienOperateur: 'MTN' | 'Orange'
  renouvelees: string[] // commandes dont le code de retrait est renouvelé
  relais: string
}
export type ObjetCode = 'profil' | 'email-sms' | 'email-adresse' | 'numero-ancien' | 'numero-nouveau' | 'moyen' | 'suppression'

export interface RelaisHabituel {
  nom: string
  gerant: string
  horaireDuJour: string // déjà en mots (CCH-32), ex. « Ouvert jusqu’à 19 h »
}

export interface Session {
  connecte: boolean
  client: Client | null
  relais: RelaisHabituel | null
  badges: Badges
  interrupteurs: EtatInterrupteurs
  // Repères de revue du prototype (CCH-19) : jamais en production ; la démonstration peut les montrer
  // pour comparer le site au prototype écran par écran.
  reperesPrototype: boolean
  // Chiffres du bandeau de l'en-tête racine (CNV-04) : agrégat et paramètre (CAC-34, LIV-SEUIL-RELAIS).
  bandeau: { quartiersExploites: number; seuilRetraitOffert: number }
  // Type de compte (DP-54) : « diaspora » sert UNIQUEMENT à payer et faire livrer des proches au Cameroun (carte,
  // Apple Pay, Google Pay ; ni retrait pour soi, ni comptoir, ni Mobile Money, ni portefeuille). Absent : standard.
  typeCompte?: 'standard' | 'diaspora'
  // Devise d'affichage choisie dans Réglages (comptes diaspora seulement ; F CFA sinon), gardée sur le compte.
  devise?: 'XAF' | 'EUR' | 'USD'
  // Proche actif d'un compte diaspora (DP-54, « Pour qui ? ») : le proche relié choisi (mémorisé sur le compte ; à
  // défaut, le premier relié). Tout ce qui dépend du lieu (distances, retirable aujourd'hui, délais, frais, tri au
  // plus proche) part de SON relais ; le site n'en montre que le prénom et le quartier, jamais l'adresse ni le code.
  // null : aucun proche relié (le site invite à en relier un). Absent : compte qui n'est pas diaspora.
  proche?: ProcheActif | null
}
export interface ProcheActif {
  id: string // lien famille
  prenom: string
  quartier: string | null // quartier de son relais (null : relais pas encore choisi)
  ville: string | null
  domicile: boolean // il accepte d'être livré chez lui
  autres: number // autres proches reliés (le sélecteur ne s'affiche que s'il y a un choix)
}

export interface Univers {
  id: string
  nom: string
  produits: number // compteur réel (CNV-02)
  vignette: Image
}

export interface DonneesMenu {
  promotions: { nombre: number; remiseMax: number }
  seuilPremium: number
  univers: Univers[]
  portefeuille: { solde: number; cagnotteEnAttente: number }
  commandes: { aRetirer: number; enPreparation: number; badge: number }
  sauvegardesSuivis: number
  litiges: { enCours: number; badge: number }
  messagesNonLus: number
  notificationsNouvelles: number
  recusATraiter?: number // boîte « Reçus » : envois à traiter (DP-54)
  support: { ouverture: number; fermeture: number } // heures d'ouverture du support (DP-12)
}

// Titre et sous-titre d'en-tête qui dépendent des données (« Ma commande · BLV-52018 », univers d'une
// fiche…) : l'écran les lit avec ses données. En attendant la construction de l'écran (étape 6), la page
// provisoire les demande ici.
export interface EnteteDonnees {
  titre: string | null
  sousTitre: string | null
}

// Mon compte (CCO-01, CCO-02, CCO-07, DP-52, DP-53) : tout ce que la page du compte affiche, compteurs réels
// (CNV-07 : un compteur à 0 ne s'affiche pas), avantages écrits en clair avec leur plafond.
export interface DonneesCompte {
  numeroVerifie: boolean
  compteurs: { commandes: number; litiges: number; messagesNonLus: number; sauvegardes: number; factures: number }
  portefeuille: { solde: number; cagnotteEnAttente: number }
  palier: { remboursementImmediat: number; comptoir: number; suivant: { comptoir: number; commandes: number } | null; prochain?: number }
  relais: { nom: string; gerant: string; horaires: string; acces: string } | null
  adressePrincipale: { nom: string; reperes: string } | null
  moyens: { operateur: string; parDefaut: boolean }[]
  avisADonner: { ref: string; article: string; jusqua: string }[]
  boutique: { nom: string; piece: EtatPiece } | null // boutique ouverte depuis le compte (devenir vendeur)
}

// Adresses de livraison à domicile (CCO-10, CCO-11, CPR-23, DP-09) : nom, quartier (zone), repères écrits comme
// dans la rue, position. Une adresse hors des zones servies est refusée (422 zone_non_servie) ; le retrait au
// relais continue. La livraison à domicile a son prix et son seuil d'offre (LIV-DOM-PRIX, LIV-SEUIL-DOM).
export interface Adresse {
  id: string
  nom: string
  quartier: string
  zoneServie: boolean
  reperes: string
  position: boolean
  coords?: { lat: number; lon: number; precision: number } // position réelle du téléphone (GPS), si donnée
  instructions?: string // pour le livreur : « portail vert, sonner deux fois »
  destinataire?: string // qui reçoit le colis, s'il n'est pas le client
  creneau?: 'matin' | 'apres-midi' | 'soir' | null // moment préféré pour la livraison
  photo?: string | null // photo de l'entrée (aide le livreur)
  principale: boolean
}
export interface DonneesAdresses {
  adresses: Adresse[]
  zonesServies: string[] // quartiers de Yaoundé servis au lancement
  relais: string // relais habituel, où vont les colis par défaut
  domicile: { prix: number; offertDes: number }
}
export type NouvelleAdresse = Omit<Adresse, 'id' | 'zoneServie' | 'principale'> & { id?: string }
export type ResultatAdresse = { ok: true; adresse: Adresse } | { ok: false; erreur: 'zone_non_servie'; ville: string }

// Moyens de paiement (CCO-14, CCO-15, CIN-43) : numéros Mobile Money MTN et Orange, vérifiés par un code SMS ;
// le numéro du compte est proposé à chaque paiement et ne se retire pas (il se change) ; un autre numéro sert à
// payer seulement, les messages restent sur le numéro du compte.
export interface MoyenPaiement {
  id: string
  operateur: 'MTN' | 'Orange'
  numeroMasque: string
  duCompte: boolean
  parDefaut: boolean
}

// Cartes Visa et Mastercard (DP-23) : pour tous ; 3-D Secure à chaque paiement, frais de service de 2 % affichés
// avant, 150 000 F au plus par paiement, jamais pour une commande payée au comptoir ; remboursée sur la même carte.
// Le numéro complet ne quitte jamais le prestataire de paiement : BelivaY garde la marque et les 4 derniers chiffres.
export interface Carte {
  id: string
  marque: 'Visa' | 'Mastercard'
  derniers: string
  expire: string // « 08/29 »
  titulaire: string
  parDefaut: boolean
  jeton?: string // démonstration : jeton du prestataire, pour reconnaître une carte déjà enregistrée
}
// Carte vue par BelivaY (CAP-24) : le jeton du prestataire, jamais le numéro complet ni le code au dos. Le numéro
// est tokenisé dans le navigateur (src/connecteurs/paiementCarte.ts) ; seuls passent la marque, les 4 derniers
// chiffres, l'expiration et le BIN (6 à 8 premiers chiffres, permis par PCI DSS) pour le contrôle de cohérence
// diaspora. Apple Pay et Google Pay : le jeton du portefeuille du téléphone (ni chiffres, ni expiration, ni BIN).
export interface CarteJeton {
  jeton: string
  marque: 'Visa' | 'Mastercard' | 'Apple Pay' | 'Google Pay'
  derniers: string // '' pour Apple Pay, Google Pay
  expire: string // « 08/29 » ; '' pour Apple Pay, Google Pay
  bin: string // 6 à 8 chiffres ; '' pour Apple Pay, Google Pay
  pays?: string // pays d'émission, quand le prestataire le donne
}
// Libellé montré au client et gardé dans ses données : « Visa •••• 4242 », « Apple Pay ».
export const libelleCarte = (c: CarteJeton) => (c.derniers ? `${c.marque} •••• ${c.derniers}` : c.marque)
export type CarteBancaire = CarteJeton & { marque: Carte['marque'] } // Visa ou Mastercard, tokenisée
export interface NouvelleCarte {
  carte: CarteBancaire
  titulaire: string
}

// Portefeuille (moteurs/portefeuille.py ; CWL-01 à CWL-11 ; DP-06, DP-48) : solde, ce qui se retire maintenant,
// historique ; recharge (WALLET-RECHARGE-MIN, WALLET-PLAFOND, sans frais) et retrait (WALLET-RETRAIT-MIN,
// WALLET-RETRAIT-JOUR, un retrait gratuit par mois sur l'argent rechargé, puis WALLET-RETRAIT-FRAIS).
export interface Mouvement {
  id: string
  type: 'recharge' | 'remboursement' | 'paiement' | 'cagnotte' | 'retrait'
  libelle: string
  le: number
  montant: number // positif : crédit ; négatif : débit
}
export interface DonneesPortefeuille {
  solde: number
  cagnotteEnAttente: number
  retirable: number // retirable maintenant (remboursé, recharges utilisées ou passées 72 h)
  disponibleLe: number | null // quand le reste devient retirable
  historique: Mouvement[]
  moyens: MoyenPaiement[]
  regles: { plafond: number; rechargeMin: number; retraitMin: number; retraitJour: number; versementHeures: number }
  // Détail pour le client (DP-54) : l'argent venu d'un remboursement (retiré sans frais), les retraits gratuits
  // qui restent ce mois-ci, ce qui a déjà été retiré aujourd'hui, et les règles des frais et des attentes.
  rembourse: number
  retraitsGratuits: number
  retireAujourdhui: number
  frais: { gratuitsParMois: number; pourCent: number; minimum: number; attenteRechargeH: number; attenteNumeroH: number }
}
export type RefusPortefeuille = 'minimum' | 'plafond' | 'solde' | 'attente_recharge' | 'attente_numero' | 'plafond_jour'
export type ResultatPortefeuille =
  | { ok: true; solde: number; montant: number; frais: number }
  | { ok: false; refus: RefusPortefeuille; possible: number }

// Factures (CCO-07, CCO-20) : une par commande retirée, émise par BelivaY (jamais le nom de la boutique) ; une
// commande annulée n'en a pas. La démonstration fabrique le PDF sur l'appareil ; l'API servira celui du serveur.
export interface Facture {
  ref: string
  total: number
  retiree: string // « Retirée sam. 19 sept. »
  resume: string // « Écouteurs sans fil, chargeur rapide 33 W »
  lignes: { libelle: string; montant: number }[]
  retrait: { relais: string; quand: string } // quand : « · sam. 19 sept. à 11 h 32 »
  // Moyen du paiement : numéro masqué (Mobile Money), « •••• 4821 » (carte), vide (Apple Pay, Google Pay,
  // Portefeuille BelivaY, comptoir du relais).
  payePar: { operateur: OperateurFacture; numero: string }
  remboursement: { libelle: string; montant: number } | null
  le: number // instant du retrait (filtres par période, relevé PDF)
}
export type OperateurFacture = 'MTN' | 'Orange' | 'Carte' | 'Apple Pay' | 'Google Pay' | 'Portefeuille' | 'Comptoir'
// Nom montré sur la facture et son PDF (« Payé par : MTN MoMo · 6 77 ·· ·· 41 », « Carte · Visa •••• 4821 »).
export const NOM_PAYE_PAR: Record<OperateurFacture, string> = { MTN: 'MTN MoMo', Orange: 'Orange Money', Carte: 'Carte', 'Apple Pay': 'Apple Pay', 'Google Pay': 'Google Pay', Portefeuille: 'Portefeuille BelivaY', Comptoir: 'Au comptoir du relais' }
export interface DonneesFactures {
  factures: Facture[]
  annulees: { ref: string; texte: string }[]
}

// Avis (CL-13 ; AVIS-FENETRE, DP-35) : seuls ceux qui ont payé et retiré notent, pendant 7 jours après le
// retrait ; une note par vendeur (un par colis) et une pour le relais ; commentaire et photo facultatifs ;
// une note de 2 ou moins propose un litige, sans rien changer à la note ; modifiables tant que la fenêtre court.
export interface AvisEnvoye {
  notes: number[] // une par colis, puis le relais
  commentaire: string
  photo: string | null
  envoyeLe: number
}
export interface CommandeANoter {
  ref: string
  titre: string
  produit: string // pour « Lire les avis » (fiche du premier article)
  dessin: string // vignette (démonstration)
  retireeLe: number | null
  payeeLe: number
  relais: string
  gerant: string
  colis: { produit: string | null; dessin?: string }[] // produit nommé (et sa vignette) quand il y a plusieurs colis
  avis: AvisEnvoye | null
}
export interface DonneesAvis {
  commande: CommandeANoter
  fenetreJours: number
  maintenant: number
  prenom: string
}

// Messagerie (CL-13 ; CMS-01 à CMS-12) : échanges gardés par écrit avec BelivaY et les vendeurs. Le vendeur ne
// voit ni le nom ni le numéro ; numéros, e-mails et liens sont retirés d'un message avant l'envoi ; une
// conversation de dossier verse messages et photos au dossier ; le support répond sous 2 h (7 h – 21 h, 7 j/7 ; DP-12).
export type Masque = 'numero' | 'email' | 'lien'
export interface Message {
  de: 'moi' | 'eux' | 'systeme' | 'photo'
  qui?: string // « Support BelivaY », « Le vendeur »
  texte?: string // les parties masquées s'écrivent {{numero}}, {{email}}, {{lien}}
  le: number
  dessin?: string // photo de démonstration
  photo?: string
  systeme?: string // ligne système jointe à une photo
}
export interface Conversation {
  id: string
  type: 'dossier' | 'vendeur' | 'support'
  titre: string // titre dans la liste
  apercu: string // dernier échange, dans la liste
  entete: { titre: string; sous: string; dessin?: string; bloque?: number; lien?: { texte: string; vers: string } }
  resolue: boolean
  messages: Message[]
  nonLus: number
  placeholder: string
  pied: string
}
export interface NouveauMessageSupport {
  sujet: string
  commande: string | null
  texte: string
  photo: string | null
}

// Aide et support (CL-13, 15.2 ; DP-12) : questions fréquentes par thème, dossier en cours, conversations,
// heures du support (7 h – 21 h), WhatsApp humain (jamais pour une commande), rappel masqué sur un créneau.
export interface ThemeFaq {
  cle: string
  titre: string
  icone: string
  // module : la question ne vaut que si l'interrupteur ff est dans cet état (ex. remboursement au portefeuille
  // quand FF-WALLET est ouvert, au moyen de paiement d'origine quand il est fermé ; DP-17, DP-50).
  questions: { q: string; r: string; lien: { texte: string; vers: string } | null; module?: { ff: string; ouvert: boolean } }[]
}
export interface DonneesAide {
  dossier: { id: string; libelle: string; sous: string } | null
  conversations: { nombre: number; nonLus: number }
  support: { ouverture: number; fermeture: number; ouvert: boolean; instant: number } // instant : l'heure du serveur
  whatsapp: string | null // lien wa.me du support (l'API le donne ; sinon config/coordonnees.ts)
  numero: string // numéro vérifié du compte, masqué (rappel)
  numeroVerifie: boolean // sans numéro vérifié, le support ne peut pas rappeler (il propose de le vérifier)
  commandesEnCours: string[]
  services: { nom: string; ok: boolean; detail: string }[] // état des services (paiement, relais, livraison)
}
export interface DemandeRappel {
  sujet: string
  commande: string | null
  creneau: string // « Dès que possible », « Avant 12 h », « 12 h – 17 h », « 17 h – 21 h »
  precision?: string // facultatif : ce que le client veut dire avant l'appel (200 caractères au plus)
}
// Le serveur place l'appel : aujourd'hui si le créneau n'est pas passé et que le support est ouvert, sinon demain.
export interface Rappel extends DemandeRappel {
  jour: 'aujourdhui' | 'demain'
}

// Pages légales (CL-13) : chaque texte a sa version ; le compte garde la date d'acceptation (une fois, à l'inscription).
export interface TexteLegal {
  titre: string
  sous: string
  grille: [string, string][] | null // grille des tarifs (garde)
  points: string[]
}
export interface DocumentLegal {
  cle: string
  icone: string
  aAccepter: boolean // accepté à l'inscription (les mentions et les cookies ne s'acceptent pas)
  fr: TexteLegal
  en: TexteLegal
}
export interface DonneesLegal {
  version: string
  publiee: number
  acceptee: number | null // date d'acceptation par le compte ; null sans compte
  pdf: Record<string, string> | null // adresse du PDF complet par document et langue (« cgu-fr ») ; l'API la donne
  documents: DocumentLegal[]
  // Nouvelle version publiée et pas encore acceptée par le compte : ce qui change, et dès quand.
  changement: { version: string; des: number; points: string[] } | null
}

// Réglages des notifications (CL-10) : Commande, Retrait, Incident et Paiement ne se désactivent pas ; les autres
// suivent le compte, sur chaque téléphone. Canal de repli quand l'application est fermée : le SMS (WhatsApp bientôt).
export interface ChoixNotifications {
  messages: boolean
  suivi: boolean
  promotions: boolean
}
export interface ReglagesNotifications {
  numero: string | null // numéro de notification, masqué ; null sans numéro vérifié
  verifie: boolean
  canal: 'sms' | 'whatsapp'
  choix: ChoixNotifications
  calme: { actif: boolean; debut: number; fin: number } // heures calmes : sans son, sauf alerte critique
}

// Supprimer son compte (9.5) : refusé tant qu'une commande ou un litige est en cours, ou qu'il reste de l'argent
// sur le portefeuille (DP-06 : il est au client, il le retire d'abord) ; confirmé par un code SMS.
export interface CommandeEnCours {
  ref: string
  libelle: string // « Retirable maintenant », « En litige · LIT-3042 »
  dessin: string
  litige: boolean
}
export interface DonneesSuppression {
  enCours: CommandeEnCours[]
  solde: number
  numero: string // numéro vérifié du compte, masqué
  // Ce que la suppression emporte (DP-54) : cagnotte pas encore versée, boutique, abonnement (sans rien
  // reprélever), proches reliés, favoris ; ce qui est gardé l'est le temps de la loi (paiements : 10 ans).
  perdu: { cagnotte: number; boutique: string | null; abonnement: boolean; proches: number; favoris: number }
  gardeAns: number
}

// Devenir vendeur (CL-13, 9.6) : la boutique s'ouvre depuis le compte client (nom, catégorie, particulier ou
// entreprise) ; la pièce d'identité se donne plus tard, dans l'espace vendeur (application à part), avant de vendre.
export type EtatPiece = 'aucune' | 'envoyee' | 'verifiee' | 'refusee'
export interface Boutique {
  nom: string
  categorie: string
  type: 'particulier' | 'entreprise'
  code: string // « KRN-4821 » : vendeur.belivay.com/b/KRN-4821
  piece: EtatPiece
  image?: PhotoServeur | null // logo ou bannière de la boutique (relaya, si servie)
}
export interface NouvelleBoutique {
  nom: string
  categorie: string
  type: 'particulier' | 'entreprise'
}
export type ResultatBoutique = { ok: true; boutique: Boutique } | { ok: false; raison: 'nom-court' | 'nom-long' | 'nom-pris' | 'numero' }

// Connexion par e-mail (CIN, 3.2) : un e-mail = un compte ; 5 essais faux, puis 15 minutes d'attente (ou un
// nouveau mot de passe) ; mot de passe de 8 caractères au moins, dont un chiffre ; le lien de nouveau mot de passe
// part par e-mail seulement, et la réponse ne dit jamais si l'adresse a un compte.
export type ResultatConnexion =
  | { ok: true; session: Session }
  | { ok: false; raison: 'incorrect'; essaisRestants: number }
  | { ok: false; raison: 'bloque'; jusqua: number }
export interface Inscription {
  prenom: string
  email: string | null // null : l'adresse du compte du téléphone (proposée par l'appareil)
  motDePasse: string
}
// Inscription diaspora (DP-54) : Google ou Apple (jeton d'identité ; e-mail déjà vérifié, ni code e-mail ni mot de
// passe), e-mail (mot de passe et code e-mail), ou numéro étranger (code SMS ; e-mail facultatif). Puis l'étape
// commune : pays, ville, date de naissance, numéro étranger vérifié par SMS, engagement. « convertir » : le compte
// Google ou Apple existe déjà et son titulaire le passe en diaspora (mêmes contrôles).
export type FournisseurDiaspora = 'google' | 'apple' | 'email' | 'numero'
export interface InscriptionDiaspora {
  fournisseur: FournisseurDiaspora
  jeton?: string // google, apple
  convertir?: boolean // google, apple : compte existant passé en diaspora
  prenom: string
  nom: string
  email: string // vide possible avec « numero »
  motDePasse?: string // email seulement
  codeEmail?: string // email seulement
  naissance: string
  pays: string
  ville: string
  indicatif: string
  numero: string
  code: string // code SMS au numéro étranger
}
export interface IdentiteFournisseur {
  jeton: string
  prenom: string
  nom: string
  email: string
  compte: null | 'standard' | 'diaspora'
}
export type ResultatInscription = { ok: true; session: Session } | { ok: false; raison: 'existe' | 'prenom' | 'email' | 'mdp' }

// Numéro et connexion (DP-53) : tout ce qui sert à entrer dans le compte et à le protéger.
// - le numéro vérifié (connexion par code, code de retrait, SMS vitaux) ;
// - les façons de se connecter (Google, Apple, e-mail et mot de passe) : on en garde toujours au moins une ;
// - les appareils où le compte est ouvert (chacun se déconnecte à distance) et les dernières connexions ;
// - la biométrie avant d'afficher un code de retrait (CODE-BIO : commandes de 50 000 F et plus).
export type MethodeConnexion = 'google' | 'apple' | 'email'
export interface Appareil {
  id: string
  nom: string // « Tecno Spark 20 · application »
  lieu: string
  derniere: number
  actuel: boolean
}
export interface DonneesSecurite {
  numero: { masque: string; operateur: string; verifie: boolean; verifieLe: number | null }
  email: string // masqué
  methodes: { google: string | null; apple: string | null; motDePasse: boolean } // adresses masquées des comptes liés
  methodeActuelle: MethodeConnexion
  appareils: Appareil[]
  historique: { le: number; methode: MethodeConnexion; appareil: string; lieu: string }[]
  biometrie: boolean
  seuilBiometrie: number
  alerteConnexion: boolean // un message au numéro vérifié à chaque connexion sur un nouvel appareil
}
export type ResultatSecurite = { ok: true } | { ok: false; raison: 'derniere' | 'ancien' | 'regle' | 'pris' }

// Confidentialité et données (DP-54 ; politique de confidentialité, CRG) : consentements, nom donné au retrait,
// historique effaçable, export des données du compte.
export interface DonneesConfidentialite {
  personnalisation: boolean // suggestions selon ce que tu regardes et achètes
  partenaires: false // aucune donnée vendue ni partagée pour de la publicité (toujours non)
  nomRetrait: string | null // nom donné au comptoir à la place du nom complet (le gérant le voit)
  historique: { recherches: number; vus: number }
}

// Litiges (CL-11 ; DP-10, DP-06) : un dossier par colis ; le paiement reste bloqué ; le vendeur a 48 h pour
// répondre (accepte, conteste, propose un arrangement) ; sans réponse, BelivaY décide avec la règle en faveur du
// client ; toute décision a un motif écrit ; une décision contre le client se conteste une fois, sous 48 h (DP-35).
export type ProblemeLitige = 'jamais' | 'abime' | 'pas-commande' | 'manque' | 'autre'
export type EtatLitige = 'attente' | 'conteste' | 'silence' | 'examen' | 'arrangement' | 'accepte' | 'rembourse' | 'remplace' | 'refuse' | 'signal' | 'retire'
export interface Litige {
  id: string
  ref: string
  colis: number
  produit: string
  dessin: string
  pb: ProblemeLitige
  probleme: string // « Semelle fendue », ou le motif choisi
  description: string
  souhait: 'rembourse' | 'remplace' | 'signal'
  montant: number // bloqué pendant le litige
  ouvertLe: number
  echeance: number // réponse du vendeur attendue (48 h)
  etat: EtatLitige
  preuves: { titre: string; sous: string; dessin?: string; photo?: string }[]
  arrangement?: { montant: number; texte: string }
  decision?: { le: number; motif: string; conteste?: boolean }
  relais: string
  // D'où vient le dossier : l'application, le constat du gérant au comptoir, ou le remboursement immédiat d'un
  // petit montant (payé par BelivaY, sans enquête ni retour).
  origine?: 'appli' | 'comptoir' | 'auto'
  // Retour par le relais (DP-10) quand l'article doit repartir : dépôt, collecte du livreur, inspection (48 h),
  // dossier clos ; « avant » : date limite de l'étape en cours (dépôt, puis réponse du vendeur).
  retour?: { etape: EtapeRetour; dates: Partial<Record<EtapeRetour, number>>; avant: number }
  // Remplacement accepté : le vendeur renvoie l'article neuf avant « avant », sinon remboursement automatique ;
  // s'il n'en a plus, un autre vendeur (Trust Score 75 au moins) peut servir, l'écart payé par BelivaY.
  remplacement?: { etape: EtapeRemplacement; dates: Partial<Record<EtapeRemplacement, number>>; avant: number; autre?: { boutique: string; trust: number; ecart: number } }
}
export type EtapeRetour = 'depot' | 'depose' | 'collecte' | 'inspection' | 'clos'
export type EtapeRemplacement = 'attente' | 'expedie' | 'arrive' | 'remis' | 'retard' | 'autre'
export interface CommandeLitige {
  ref: string
  colis: { n: number; produit: string; dessin: string; detail: string; montant: number }[]
  fenetre: 'ouverte' | 'cachee' // ouverte : 7 jours après le retrait ; cachee : seul le défaut caché (100 jours)
  finCachee: string
  payePar: string
}
export type NouveauLitige = Pick<Litige, 'ref' | 'colis' | 'pb' | 'description' | 'souhait'> & { photos: string[]; origine?: 'comptoir' }

// Favoris (ex-« Sauvegardés », DP-54) : le cœur d'une fiche ou « Mettre en favori » dans le panier ; prix et
// stock vérifiés à chaque visite ; alertes gratuites sur la variante exacte (baisse de prix, retour en stock).
export interface Favori {
  id: string
  p: string // produit (fiche ?p=…)
  titre: string
  variante: string | null
  dessin: string
  image?: PhotoServeur | null // photo servie par le serveur ; le dessin en repli
  prix: number
  prixAvant: number | null // prix au moment de l'ajout, s'il a baissé depuis
  retrait: number
  stock: 'ok' | 'retour' | 'rupture'
  alertes: { prix: boolean; stock: boolean }
  ajouteLe: number
}

// Panier (CL-07 ; DP-54) : lignes par boutique (une boutique = un colis), mode de retrait, favoris à remettre.
export interface LignePanier {
  id: string
  p: string
  titre: string
  variante: string | null
  dessin: string
  image?: PhotoServeur | null // photo servie par le serveur ; le dessin en repli
  prix: number
  qte: number
  stock: number
  classe: 'S' | 'M' | 'L' | 'XL' | 'HG'
  boutique: string
  // Paramètres de l'article (couleur, capacité, taille) : valeurs, indisponibles, prix selon la valeur.
  options?: { nom: string; valeurs: string[]; indispo?: string[]; prix?: Record<string, number>; choisi: string }[]
  // Autres vendeurs du même produit (fiche : « Autres vendeurs ») ; « Choisir » change la boutique et le prix.
  offres?: { boutique: string; zone: string; prix: number; km: number; score: number; ventes: number }[]
  flash?: number // ajoutée au prix d'une vente flash : fin de l'offre
}
// Prix vérifiés au paiement (CAL-11) : une hausse est bloquée et montrée, une baisse appliquée ; un article retiré
// de la vente quitte le panier ; un article dont le dernier vient d'être pris ne part pas.
export interface ChangementPanier {
  id: string
  titre: string
  variante: string | null
  dessin: string
  type: 'hausse' | 'baisse' | 'retire' | 'pris'
  avant: number
  apres: number
  qte: number
}
export interface DonneesPanier {
  mode: 'relais' | 'domicile'
  lignes: LignePanier[]
  boutiques: Record<string, { zone: string; delai: string; palier: string; suggestions: { p: string; titre: string; dessin: string; prix: number }[] }>
  relais: string
  adresse: string | null
  plafondComptoir: number
  numeroVerifie: boolean
  favoris: Favori[]
}

// Commande passée (CL-08 ; DP-54) : le relais ou le domicile se choisit à l'achat ; payée maintenant (Mobile
// Money validé sur le téléphone, carte, Portefeuille) ou au comptoir (livraison d'avance, le reste au retrait).
export type MoyenCommande = 'mtn' | 'orange' | 'autre' | 'wallet' | 'carte' | 'apple' | 'google'
export interface CommandePassee {
  ref: string
  le: number
  mode: 'relais' | 'domicile'
  lieu: string // « Relais Mvog-Ada » ou « Maison · Mvog-Ada »
  moyen: MoyenCommande
  numero: string | null // numéro Mobile Money (masqué) ou carte (•••• 4242)
  comptoir: boolean
  articles: number
  colis: number
  sousTotal: number
  livraison: number
  frais: number // frais de service carte (2 %)
  montant: number // payé maintenant
  dueAuRetrait: number // comptoir : le reste au retrait
  etat: 'attente' | 'payee' | 'echec'
  cause?: 'expire' | 'solde' | 'carte'
  expire: number // fin de la demande Mobile Money (15 min)
  lu?: number // heure de la source quand la commande a été lue : le compte à rebours suit l'horloge du serveur
  lignes: { titre: string; dessin: string; qte: number; prix: number; boutique: string }[]
  payeur?: PanierPartage['payeur']
  prime?: number // remise de l'abonnement sur la livraison
  canal?: 'whatsapp' // commandée par WhatsApp : le panier de l'application n'est pas touché
  // Payée pour quelqu'un d'autre (cadeau, panier envoyé à un proche ; règle donnees/echanges.ts) : qui paie la
  // livraison, ce que le destinataire paie à la remise, la garantie donnée par le payeur.
  pour?: { prenom: string; relais: string; qui: PaieFrais; fraisRemise: number; garantie: number }
}

// Abonnement (CL-14 ; FF-ABONNEMENT) : palier, formule, prélèvements annoncés, résiliation en un tap ; cagnotte
// (2 % du sous-total produits, créditée quand le vendeur est payé) ; parrainage (1 mois offert par proche dont
// la première commande est retirée, 3 par mois au plus). Règles : donnees/prime.ts.
export interface Abonnement {
  palier: 'plus' | 'prime' | 'duo' | 'business' | 'pass'
  formule: 'mois' | 'an' | 'pass'
  debut: number
  prochain: number | null // prochain prélèvement (null : Pass, ou résilié)
  montant: number // du prochain prélèvement
  moyen: string // « MTN MoMo · 6 77 ·· ·· 41 » ou la carte du proche qui l'a offert
  resilie: number | null
  fin: number | null // fin de la période payée (résilié, Pass, offert)
  offertPar: string | null
  // Prélèvement refusé (CAB-43, CAB-44) : date, numéro, montant, tentatives ; 7 jours de grâce (ABO-GRACE) où
  // l'abonnement reste actif, puis le palier Gratuit (rien n'est perdu). null : aucun échec en cours.
  echec: { le: number; moyen: string; montant: number; tentatives: number } | null
  messageCadeau: string | null // abonnement offert : le mot de celui qui l'a offert
}
export interface DonneesPrime {
  abonnement: Abonnement | null
  actif: boolean
  essaiUtilise: boolean
  usage: { relais: number; domicile: number; total: number } // ce mois-ci
  economies: { relais: number; domicile: number; nbRelais: number; nbDomicile: number }
  cagnotte: { disponible: number; versee: number; attente: { ref: string; produit: string; dessin: string; base: number; montant: number }[] } // dessin : celui du premier article
  parrainage: { lien: string; filleuls: { prenom: string; le: number; etat: 'inscrit' | 'retiree' }[]; recompensesMois: number; moisGagnes: number }
  business: 'aucune' | 'envoyee'
  maintenant: number
}

// Listes d'envies (CL-14 ; FF-LISTE-ENVIES) : la liste par défaut (les favoris) et des listes nommées
// (anniversaire, mariage…) ; envoyées par un lien de 30 jours (le partage part du téléphone) ; un proche choisit
// un article et l'offre (Mobile Money, ou carte depuis l'étranger) ; remise au fil de l'eau (chaque cadeau son
// code) ou groupée (tous ensemble à une date, 21 jours au plus après le premier cadeau payé, sans frais de garde) ;
// mode surprise : ni l'article ni la personne ; un article offert ne se retire jamais.
export interface ArticleListe {
  p: string
  titre: string
  dessin: string
  image?: PhotoServeur | null // photo servie par le serveur ; le dessin en repli
  prix: number
  livraison: number // livraison au relais pour cet article seul (le proche la paie avec)
  livraisonDomicile?: number // livraison à domicile pour cet article seul (si le destinataire l'accepte)
  prixPartage: number | null // prix montré aux proches au partage (ou à l'ajout dans une liste déjà partagée) ; null : pas partagée
  offert: { par: string; le: number; ref: string; qui?: PaieFrais } | null // qui : qui paie la livraison (echanges.ts)
  // Article cher offert à plusieurs (COTISER_DES) : sa cotisation, ce qui est réuni et l'objectif.
  cotisation?: { code: string; reuni: number; objectif: number } | null
}
export interface ListeEnvies {
  id: string
  nom: string
  favoris: boolean // la liste par défaut, faite des favoris
  mode: 'fil' | 'groupe'
  remiseLe: number | null
  surprise: boolean
  destination: 'moi' | 'offrant' | 'tiers'
  relais: string | null
  tiers: { prenom: string; relais: string } | null
  partage: { code: string; le: number; jusqua: number; prix: Record<string, number> } | null // prix : relevés au partage (CLE-39)
  demarree: boolean
  articles: ArticleListe[]
  // Livraison à domicile acceptée par le propriétaire (liste au fil de l'eau) : celui qui offre peut faire livrer
  // chez lui ; l'adresse n'est jamais montrée (le livreur appelle le destinataire).
  domicile?: boolean
  statuts?: { canal: CanalStatut; le: number }[] // mises en statut (WhatsApp, Facebook, Instagram, TikTok…)
  // Occasion (DP-54) : mariage, naissance, baby shower, crémaillère, diplôme, fête… ; les hôtes (le couple, les
  // parents) ; la cagnotte « voyage de noces » d'un mariage (participations libres dès 1 000 F).
  occasion?: OccasionListe | null
  hotes?: string[]
  cagnotte?: CagnotteListe | null
}
// Mettre sa liste en statut (DP-54) : l'image de statut et son lien partagés par ce canal.
export type CanalStatut = 'partage' | 'image' | 'whatsapp' | 'sms' | 'lien' | 'texte'
export interface ListePublique {
  code: string
  prenom: string
  nom: string
  quartier: string
  relais: string | null
  mode: 'fil' | 'groupe'
  remiseLe: number | null
  jusqua: number
  destination: ListeEnvies['destination']
  partageLe: number // date du partage : les prix d'alors restent affichés à côté des prix du jour
  articles: (Omit<ArticleListe, 'offert'> & { offert: boolean })[]
  domicile?: { ville: string } | null // livraison chez le destinataire possible (la ville seulement, jamais l'adresse)
  occasion?: OccasionListe | null
  hotes?: string[]
  cagnotte?: { titre: string; objectif: number; reuni: number; participants: number } | null
}
// Suivi public d'un cadeau, pour celui qui l'a offert (avec ou sans compte) : les étapes, la preuve de remise et le
// merci ; jamais l'adresse, le code de retrait ni le numéro du destinataire.
export interface SuiviCadeau {
  ref: string
  pour: string // prénom du destinataire
  livraison: 'relais' | 'domicile'
  lieu: string // le quartier du relais, ou la ville (domicile)
  payeLe: number
  montant: number
  moyen: string
  devise: 'XAF' | 'EUR' | 'USD'
  prepareLe: number | null
  arriveLe: number | null // arrivé au relais, ou parti en livraison
  remisLe: number | null // preuve de remise : retiré avec le code, ou remis en main propre
  rembourse: number | null
  merci: { de: string; texte: string; le: number } | null
  maintenant: number
}

// Ventes flash (CL-14 ; FF-FLASH) : prix barré = prix vraiment pratiqué avant, remise d'au moins 10 %, 48 h au
// plus, stock propre à l'offre ; le compte à rebours s'arrête à la vraie fin ; la remise est payée par le vendeur
// ou BelivaY.
export interface OffreFlash {
  p: string
  titre: string
  dessin: string
  image?: PhotoServeur | null // photo servie par le serveur ; le dessin en repli
  univers: string
  prix: number // prix de l'offre
  avant: number // prix pratiqué avant l'offre
  debut: number
  fin: number
  stock: number // restant à ce prix
  livraison: number
}

// Mise de côté (CL-15 ; EX-03) : règles dans donnees/cote.ts.
export interface MiseDeCote {
  id: string
  p: string
  titre: string
  dessin: string
  prix: number
  livraison: number
  prixLivre: number
  rythme: '2sem' | 'mois'
  versements: { n: number; du: number; le: number; payeLe: number | null }[]
  creeLe: number
  moyen: string
  etat: 'en_cours' | 'payee' | 'annulee'
  ref: string | null // la commande, après le dernier versement
  annulee: { le: number; rembourse: number; forfait: number } | null
  // Une liste de rentrée entière mise de côté (un seul achat, CRS-16) : la commande groupée part au dernier
  // versement, qui tombe avant la rentrée.
  liste?: { id: string; classe: string; ecole: string; exclus: string[]; equivalents: string[]; articles: number; rentreeLe: number } | null
}

// Cotisation (CL-15 ; EX-02) : offrir à plusieurs. L'argent reste bloqué chez BelivaY ; objectif = prix livré
// figé à la création + 2 % de frais de service ; 30 jours au plus ; participation libre dès 1 000 F, au plus ce
// qui manque, Mobile Money sans frais ou carte (+ 2 %), discrète si on veut ; objectif atteint : la commande part
// toute seule au prix figé vers le relais du bénéficiaire (une hausse de 5 % au plus est prise par BelivaY, au-delà
// l'organisateur choisit) ; date dépassée : chacun est remboursé sur son moyen, sans frais, jamais en espèces.
export interface Participation {
  id: string
  prenom: string
  montant: number // ce qui compte pour l'objectif
  frais: number // frais de carte payés en plus (rendus au remboursement)
  le: number
  discret: boolean
  moyen: string
  mot: string
  organisateur: boolean
}
export interface Cotisation {
  id: string
  code: string
  nom: string
  occasion: string
  p: string
  titre: string
  dessin: string
  prixLivre: number // figé à la création
  objectif: number // prix livré + 2 %
  beneficiaire: string
  relais: string
  organisateur: string
  creeLe: number
  jusqua: number
  participations: Participation[]
  etat: 'ouverte' | 'atteinte' | 'hausse' | 'echue' | 'remboursee'
  hausse: { prix: number; ecart: number } | null
  ref: string | null
  fin: number | null
  qui?: PaieFrais // qui paie la livraison : les participants (dans l'objectif) ou le bénéficiaire, à la remise
  frais?: number // la livraison au relais du bénéficiaire, figée à la création
  liste?: { code: string; p: string } | null // née d'un article cher d'une liste d'envies
}

// Échanges entre clients (DP-54 ; règle commune donnees/echanges.ts) : les proches sur BelivaY (trouvés par leur
// numéro, ou liés), les listes de proches que l'on suit (rappel avant la date), les envois d'une liste ou d'une
// cotisation dans l'application des proches, les remerciements, et les colis payés par l'un pour l'autre :
// le destinataire voit ce qu'il paiera avant d'accepter ; il peut refuser (sans frais avant l'expédition).
export interface ProcheBelivay {
  id: string
  prenom: string
  numeroMasque: string
  quartier: string | null // quartier de son relais (jamais l'adresse)
  lie: boolean // proche lié (lien famille actif)
  anniversaire: number | null // son prochain anniversaire, s'il l'a rendu visible
  liste: { code: string; nom: string; remiseLe: number | null; offerts: number; articles: number } | null // sa liste partagée
}
export interface ListeSuivie {
  code: string
  prenom: string
  nom: string
  remiseLe: number | null
  rappel: number | null // jours avant la remise ; null : pas de rappel
  depuis: number
}
export interface EnvoiEchange {
  objet: 'liste' | 'cotisation'
  id: string
  proche: string // id du proche
  prenom: string
  le: number
  rappeleLe: number | null // dernier rappel envoyé par le propriétaire
}
export interface Merci {
  ref: string // la commande du cadeau (ou de la cotisation)
  de: string // qui remercie
  pour: string // qui a offert (« tous » pour une cotisation)
  texte: string
  le: number
}
export interface ColisEchange {
  id: string
  ref: string
  origine: 'liste' | 'cotisation' | 'panier'
  sens: 'recu' | 'envoye' // reçu : je suis le destinataire ; envoyé : j'ai payé
  de: string
  pour: string
  titre: string
  dessin: string
  articles: number // valeur des articles, payée et bloquée
  frais: number // livraison au relais
  qui: PaieFrais
  relais: string
  mot?: string // le mot du payeur
  etat: 'a_accepter' | 'accepte' | 'refuse' | 'retire'
  expedie: boolean
  joursGarde: number
  retenue: number | null // après un refus
  rembourse: number | null // rendu au payeur après un refus
  le: number
}
export interface DonneesEchanges {
  proches: ProcheBelivay[]
  suivies: ListeSuivie[]
  envois: EnvoiEchange[]
  mercis: Merci[]
  colis: ColisEchange[]
  maintenant: number
}

// ——— Reçus (DP-54, consigne du porteur du 5 oct. : « tout ce qui est envoyé doit avoir une façon d'être reçu et
// d'être exécuté ») ———
// Chaque envoi d'un client à un autre (liste d'envies et ses occasions, cagnotte, cotisation, panier à payer,
// lien de paiement, demande diaspora, liste de rentrée, colis offert, lien famille, abonnement offert, panier
// famille, retrait confié, parrainage, question ou avis partagé) arrive dans l'application du destinataire s'il a
// un compte (boîte « Reçus »), sinon par son lien public. Le destinataire l'exécute avec les moyens de son compte
// (Mobile Money, carte, portefeuille ; un compte diaspora : la carte) ; l'envoyeur voit la réponse (merci, suivi).
// Règle commune : donnees/echanges.ts (« BelivaY ne perd jamais » : rien ne part sans être payé et bloqué).
export type TypeEnvoi = 'liste' | 'cagnotte' | 'cotisation' | 'panier' | 'lien-paiement' | 'demande-diaspora' | 'rentree' | 'colis' | 'lien-famille' | 'abonnement' | 'panier-famille' | 'code-retrait' | 'parrainage' | 'partage'
export type GroupeRecu = 'offrir' | 'payer' | 'rejoindre' | 'accepter' | 'retirer' | 'parrainages'
export const GROUPE_ENVOI: Record<TypeEnvoi, GroupeRecu> = {
  liste: 'offrir',
  cagnotte: 'rejoindre',
  cotisation: 'rejoindre',
  panier: 'payer',
  'lien-paiement': 'payer',
  'demande-diaspora': 'payer',
  rentree: 'payer',
  colis: 'accepter',
  'lien-famille': 'accepter',
  abonnement: 'accepter',
  'panier-famille': 'accepter',
  'code-retrait': 'retirer',
  parrainage: 'parrainages',
  partage: 'parrainages',
}
// Occasions d'une liste d'envies : la date (anniversaire, mariage, fête…), les hôtes (le couple, les parents), le
// lieu de remise (un relais, jamais une adresse) et, pour un mariage, la cagnotte « voyage de noces ».
export type OccasionListe = 'anniversaire' | 'mariage' | 'dot' | 'naissance' | 'baby-shower' | 'cremaillere' | 'diplome' | 'fete' | 'rentree' | 'autre'
export interface CagnotteListe {
  titre: string // « Voyage de noces »
  objectif: number
  participations: { prenom: string; montant: number; le: number; mot: string; discret: boolean }[]
}
export interface LigneEnvoi {
  p: string | null // produit (fiche) ; null : article hors catalogue (liste de rentrée)
  titre: string
  dessin: string
  qte: number
  prix: number
  livraison: number // livraison au relais de cet article seul (liste) ; 0 : comprise dans les frais de l'envoi
  offertPar: string | null // liste : qui l'a offert
}
export interface ActionEnvoi {
  le: number
  par: string // prénom de qui agit
  quoi: 'offert' | 'paye' | 'participe' | 'accepte' | 'refuse' | 'retire' | 'vu'
  montant: number // payé (articles et livraison) ; 0 sans paiement
  ref: string | null // la commande née de l'action
  p: string | null // l'article offert
  mot: string | null
}
export interface EnvoiRecu {
  id: string
  type: TypeEnvoi
  de: string // prénom de l'envoyeur
  depuis: string | null // son pays, s'il vit à l'étranger
  pour: string // prénom du destinataire
  titre: string
  occasion: OccasionListe | null
  hotes: string[] // le couple, les parents, les hôtes
  date: number | null // jour de l'événement, de la remise
  lieu: string | null // relais de remise (jamais une adresse)
  mot: string | null
  le: number
  jusqua: number | null
  lignes: LigneEnvoi[]
  frais: number // livraison au relais (panier, colis…)
  qui: PaieFrais | null // qui paie la livraison, fixé par l'envoyeur ; null : au choix de qui paie (echanges.ts)
  objectif: number | null // cagnotte, cotisation
  reuni: number
  cagnotte: { titre: string; objectif: number; reuni: number } | null // liste de mariage : sa cagnotte
  code: string | null // liste, cagnotte, cotisation, lien de paiement : le code public ; retrait confié : le code (vu après l'accord)
  ref: string | null // la commande liée (colis offert, retrait confié, panier famille)
  detail: string | null // abonnement : palier et durée ; parrainage : la récompense ; partage : la question ou l'avis
  lien: string // l'adresse publique, pour qui n'a pas de compte (« /l/m3Rq8z »)
  dansLApplication: boolean // le destinataire a un compte : l'envoi est dans sa boîte « Reçus »
  etat: 'a_traiter' | 'accepte' | 'fait' | 'refuse' | 'expire'
  actions: ActionEnvoi[]
  merci: { de: string; texte: string; le: number } | null
}
export interface DonneesRecus {
  recus: EnvoiRecu[] // envoyés au client connecté, à traiter d'abord
  envoyes: EnvoiRecu[] // ses envois, avec les réponses
  aTraiter: number
  maintenant: number
}
// Les moyens du compte pour exécuter un envoi (pré-remplis, sans ressaisie) : moyen « wallet », « momo:<id> »,
// « momo:+<numéro> » (un autre numéro), « carte:<id> », « apple », « google ».
export interface MoyensRecu {
  diaspora: boolean // compte diaspora : la carte seulement (Apple Pay, Google Pay), 2 % de frais de service
  mobile: MoyenPaiement[]
  cartes: Carte[]
  portefeuille: number
  relais: string | null
  prenom: string
}
export interface DetailRecu {
  envoi: EnvoiRecu
  sens: 'recu' | 'envoye'
  moyens: MoyensRecu
  maintenant: number
}
export type ActionRecu =
  | { action: 'offrir'; p: string; moyen: string; qui: PaieFrais; mot?: string }
  | { action: 'participer'; montant: number; moyen: string; discret?: boolean; mot?: string }
  | { action: 'payer'; moyen: string; qui?: PaieFrais; mot?: string }
  | { action: 'accepter'; relais?: string }
  | { action: 'refuser'; mot?: string }
  | { action: 'retirer' }
export type ResultatRecu = { ok: true; envoi: EnvoiRecu; ref: string | null; paye: number } | { ok: false; raison: 'traite' | 'expire' | 'offert' | 'montant' | 'garantie' | 'solde' | 'moyen' | 'diaspora' }
export type NouvelEnvoi = { type: TypeEnvoi; a: string; prenom: string; titre: string } & Partial<Pick<EnvoiRecu, 'occasion' | 'hotes' | 'date' | 'lieu' | 'mot' | 'jusqua' | 'lignes' | 'frais' | 'qui' | 'objectif' | 'cagnotte' | 'code' | 'ref' | 'detail' | 'lien'>>
/** Montant minimal d'une participation (cagnotte, cotisation). */
export const PARTICIPATION_MIN = 1000

// Panier famille (CL-15 ; EX-05) : un proche (souvent à l'étranger) paie par carte un panier d'essentiels pour
// sa famille, qui le retire au relais avec son propre code ; le payeur reçoit la preuve de retrait. Chaque article
// pèse 5 kg au plus ; le panier part en colis S, M ou L (30 kg au plus), jamais en XL ; 2 % de frais de carte ;
// chaque mois au jour choisi, annoncé 3 jours avant avec le prix du jour, suspensible en un geste.
export interface ArticleFamille {
  id: string
  titre: string
  prix: number
  poids: number // kg
  dessin: string
}
export interface PanierFamille {
  id: string
  nom: string
  destinataire: { prenom: string; relais: string } | null
  articles: { id: string; qte: number }[]
  mensuel: boolean
  jour: number // jour du mois du débit
  suspendu: boolean
  carte: string | null
  email: string
  historique: { le: number; montant: number; ref: string; retireLe: number | null }[]
}
export interface DonneesFamille {
  articles: ArticleFamille[]
  modeles: { id: string; nom: string; articles: { id: string; qte: number }[] }[]
  destinataires: { prenom: string; numero: string; relais: string; lieLe: number }[]
  paniers: PanierFamille[]
  maintenant: number
}

// Rentrée (CL-15 ; EX-01) : listes officielles publiées gratuitement par des écoles vérifiées ; les parents
// choisissent l'école et la classe, décochent ce qu'ils ont déjà (le total est recalculé depuis zéro), prennent un
// équivalent conforme à la consigne si l'école le permet ; toute la liste arrive au relais et se retire avec un
// seul code (les colis arrivés attendent les autres, sans frais, 21 jours au plus) ; liste papier : photographiée,
// saisie sous 24 h ; aucune donnée d'élève, seulement la classe.
export interface ArticleRentree {
  id: string
  titre: string
  groupe: string
  qte: number
  prixUnitaire: number
  boutique: string
  zone: string
  consigne: string | null
  exigee: boolean // édition exigée : pas d'équivalent
  equivalent: { titre: string; prixUnitaire: number } | null
  dessin?: string
}
export interface ListeRentree {
  id: string
  ecole: string
  classe: string
  section: 'fr' | 'en'
  statut: 'publiee' | 'brouillon'
  publieeLe: number | null
  historique: { le: number; texte: string }[]
  articles: ArticleRentree[]
}
export interface Ecole {
  id: string
  nom: string
  quartier: string
  verifiee: boolean
  depuis: number
}
export interface DonneesRentree {
  saison: string
  ouverte: boolean
  ecoles: Ecole[]
  listes: ListeRentree[]
  enCours: CommandeClient | null
  papier: { classe: string; le: number; photo: string; pretLe: number }[]
  rentreeLe: number // jour de la rentrée de la saison : une mise de côté de liste finit avant
  relais: string | null
  maintenant: number
}

// Reprise (CL-15 ; EX-04) : règles dans donnees/troc.ts.
export interface Troc {
  id: string
  p: string // le neuf
  titre: string
  prixLivre: number
  modele: string
  modeleNom: string
  declare: import('./troc').EtatDeclare
  estimation: { min: number; max: number }
  codeDepot: string
  relais: string
  dates: { cree: number; depose: number | null; collecte: number | null; recu: number | null; inspecte: number | null }
  valeur: number | null // confirmée à l'inspection
  contreOffre: { valeur: number; ecarts: { titre: string; sous: string }[] } | null
  // Pourquoi une contre-offre ou un refus : état constaté, pièce manquante, prix du marché, compte encore lié,
  // IMEI signalé ; avec les photos du constat quand le reconditionneur en a pris (adresse d'image ou dessin).
  motif: { type: 'etat' | 'piece' | 'marche' | 'compte' | 'imei'; texte: string; photos: { src: string; legende: string }[] } | null
  // Le client conteste le constat : l'équipe BelivaY revoit les photos avec le reconditionneur, réponse sous 48 h.
  contestation: { le: number; texte: string; reponseAvant: number } | null
  etat: 'depot' | 'depose' | 'collecte' | 'inspection' | 'confirme' | 'contre' | 'refuse' | 'paye' | 'rendu' | 'annule'
  ref: string | null
}

// Commande par WhatsApp (CL-15 ; EX-06) : avec l'accord du client (message vocal écouté puis supprimé),
// l'assistant propose une commande d'après ses habitudes, prix calculés par BelivaY ; rien n'est commandé ni payé
// avant « OUI » ; le paiement se fait dans BelivaY (lien), jamais à sa place ; le code n'est jamais écrit sur
// WhatsApp ; ce qui n'est pas compris passe à une personne de l'équipe.
export interface MessageWa {
  de: 'client' | 'belivay' | 'conseiller' | 'systeme'
  le: number
  texte: string
  carte?: { titre: string; lignes: string[]; total: string; lien?: string }
}
export interface ConversationWa {
  etape: 'accord' | 'proposition' | 'confirmer' | 'lien' | 'suite' | 'humain'
  messages: MessageWa[]
  ref: string | null
}

// Diaspora (DP-54) : un compte ouvert depuis l'étranger commande pour un proche au Cameroun, relié par un lien
// famille. Le lien ne naît qu'avec l'accord du proche : son code famille (24 h, à usage unique) ou l'acceptation
// d'une invitation dans son application. Le compte diaspora ne voit que le prénom du proche et le quartier du relais
// qu'il a choisi ; jamais son numéro, son adresse ni ses autres commandes. Le proche voit le prénom et le pays de
// celui qui paie. Chacun retire le lien quand il veut. Paiement par carte (3-D Secure), 150 000 F au plus par
// paiement et 500 000 F par mois ; des marchandises seulement, jamais d'argent liquide transféré.
export interface CompteDiaspora {
  pays: string
  ville: string
  indicatif: string
  numeroMasque: string
}
export interface LienFamille {
  id: string
  sens: 'diaspora' | 'cameroun' // diaspora : vu par celui qui paie ; cameroun : vu par celui qui reçoit
  prenom: string // le proche
  pays: string | null // pays de celui qui paie (vu du Cameroun)
  relais: string | null // relais choisi par le proche (vu de la diaspora : le quartier seulement)
  etat: 'invite' | 'actif' | 'refuse' | 'retire'
  le: number
  commandes: CommandePourProche[]
  // Livraison réglée par le proche dans SON compte (DP-54) : il accepte ou non d'être livré chez lui, et dit ce
  // qu'il préfère. Vu de la diaspora : « chez {prénom} » possible ou non, jamais l'adresse ; la ville seulement.
  domicile?: boolean
  prefere?: 'relais' | 'domicile'
  ville?: string | null
}
// Une commande payée pour un proche, vue de celui qui paie : jamais le code, le relais précis ni l'adresse.
// pretLe : arrivée au relais prévue (code envoyé au proche) ; retireLe : preuve de retrait ; rembourse : montant
// rendu sur la carte d'origine.
export interface CommandePourProche {
  ref: string
  le: number
  montant: number
  devise?: 'EUR' | 'USD'
  enDevise?: number // montant débité dans la devise, au centime (euro : parité fixe ; dollar : taux figé au paiement)
  carte?: string // « Visa •••• 4242 »
  articles?: number
  mot?: string
  pretLe?: number | null
  retireLe?: number | null
  rembourse?: number | null
  livraison?: 'relais' | 'domicile' // « au relais de X » ou « chez X » (jamais l'adresse)
  moyen?: 'carte' | 'apple' | 'google'
  demande?: string | null // panier envoyé par le proche, payé ici
  aLaRemise?: number // supplément domicile laissé au proche, payé à la remise (echanges.ts)
}
// Panier qu'un proche au Cameroun envoie à son proche diaspora relié, pour qu'il le paie (DP-54, sans lien
// externe). « recue » : vue du compte diaspora (boîte « À payer pour mes proches ») ; « envoyee » : vue du proche.
// Le proche choisit la livraison (relais ou chez lui) ; le diaspora paie tout par défaut, ou laisse au proche le
// supplément domicile quand la garantie le couvre (src/donnees/echanges.ts). Valable 7 jours, puis expirée.
export interface DemandeProche {
  id: string
  sens: 'recue' | 'envoyee'
  lien: string
  prenom: string // l'autre : le proche qui envoie (recue) ou le proche à l'étranger (envoyee)
  pays: string | null // pays du proche à l'étranger (envoyee)
  lignes: { titre: string; dessin: string; qte: number; prix: number; boutique: string; classe: 'S' | 'M' | 'L' | 'XL' | 'HG' }[]
  sousTotal: number
  livraison: 'relais' | 'domicile'
  fraisRelais: number // livraison au relais (moteur de frais)
  fraisDomicile: number // livraison à domicile (moteur de frais)
  mot: string
  creeLe: number
  jusqua: number
  etat: 'attente' | 'payee' | 'refusee' | 'annulee' | 'expiree'
  ref: string | null
  motRefus: string | null
  supplementPar: 'payeur' | 'destinataire' | null
  payeeLe: number | null
}
export const DEMANDE_JOURS = 7
export const PLAFONDS_DIASPORA = { paiement: 150000, mois: 500000, liens: 5 }
// Compte diaspora (DP-54) : majeur, vivant dans un des pays acceptés (jamais le Cameroun : compte normal ; jamais
// un pays sous sanctions), numéro de ce pays vérifié par SMS, carte à son nom.
export const AGE_DIASPORA = 18
// Le nom sur la carte est celui du compte (mêmes mots, sans accents ni majuscules, dans n'importe quel ordre) : la
// carte d'un tiers est refusée.
export const nomCarte = (x: string) =>
  x
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .sort()
    .join(' ')
export const PAYS_DIASPORA: [string, string][] = [
  ['France', '+33'],
  ['Belgique', '+32'],
  ['Suisse', '+41'],
  ['Allemagne', '+49'],
  ['Italie', '+39'],
  ['Espagne', '+34'],
  ['Royaume-Uni', '+44'],
  ['Canada', '+1'],
  ['États-Unis', '+1'],
  ['Gabon', '+241'],
  ['Côte d’Ivoire', '+225'],
  ['Nigeria', '+234'],
  ['Afrique du Sud', '+27'],
]

// Contrôle de cohérence anti-fraude d'une commande diaspora (DP-54), refait par le serveur à chaque paiement.
// 1. Pays de la carte : déduit des 8 premiers chiffres (BIN) ; si le BIN est inconnu, le pays d'émission que le
//    client indique. Comparé au pays du compte, qui est aussi celui du numéro vérifié par SMS (même indicatif).
// 2. Achat inhabituel : montant au-delà de MONTANT_X fois la moyenne des HABITUDE_N dernières commandes (dès
//    HABITUDE_MIN commandes) ou, sans habitudes, au-delà de PREMIER_MAX ; commandes rapprochées : RAPPROCHEES
//    commandes déjà payées dans les FENETRE_H dernières heures.
// Décision : carte émise au Cameroun ou dans un pays non accepté, ou REFUS_RAPPROCHEES commandes dans la fenêtre :
// refusé. Sinon, chaque signal (pays différent, montant inhabituel, commandes rapprochées) compte pour un : 0 :
// accepté (3-D Secure seul) ; 1 : vérification renforcée (3-D Secure + code SMS au numéro étranger du compte) ;
// 2 ou plus : refusé. Un refus ne débite rien ; le support peut lever le doute.
export const COHERENCE_DIASPORA = {
  MONTANT_X: 3,
  HABITUDE_N: 5,
  HABITUDE_MIN: 2,
  PREMIER_MAX: 100000,
  FENETRE_H: 24,
  RAPPROCHEES: 2,
  REFUS_RAPPROCHEES: 4,
  SIGNAUX_REFUS: 2,
}
// BIN de démonstration (cartes de test, numéros valides) : 8 premiers chiffres → pays d'émission. En production :
// la réponse du prestataire de paiement.
export const BIN_DEMO: Record<string, string> = {
  '42424242': 'France',
  '40000025': 'France',
  '40000005': 'Belgique',
  '40000075': 'Suisse',
  '40000027': 'Allemagne',
  '40000038': 'Italie',
  '40000072': 'Espagne',
  '40000082': 'Royaume-Uni',
  '40000012': 'Canada',
  '55555555': 'États-Unis',
  '40000120': 'Cameroun',
  '40000156': 'Chine',
}
export const paysDuBin = (numero: string): string | null => BIN_DEMO[numero.replace(/\D/g, '').slice(0, 8)] ?? null
export type SignalDiaspora = 'pays' | 'montant' | 'rapprochees'
export type ControleDiaspora =
  | { decision: 'accepte'; paysCarte: string; signaux: [] }
  | { decision: 'renforce'; paysCarte: string; signaux: SignalDiaspora[] }
  | { decision: 'refuse'; paysCarte: string; signaux: SignalDiaspora[]; motif: 'cameroun' | 'pays' | 'rapprochees' | 'signaux' }
export function controleDiaspora(c: { paysCarte: string; paysCompte: string; montant: number; historique: { le: number; montant: number }[]; maintenant: number }): ControleDiaspora {
  const R = COHERENCE_DIASPORA
  const { paysCarte } = c
  const recentes = [...c.historique].sort((a, b) => b.le - a.le)
  const proches = recentes.filter((x) => x.le > c.maintenant - R.FENETRE_H * 3600e3).length
  if (paysCarte === 'Cameroun') return { decision: 'refuse', paysCarte, signaux: [], motif: 'cameroun' }
  if (!PAYS_DIASPORA.some(([p]) => p === paysCarte)) return { decision: 'refuse', paysCarte, signaux: [], motif: 'pays' }
  if (proches >= R.REFUS_RAPPROCHEES) return { decision: 'refuse', paysCarte, signaux: ['rapprochees'], motif: 'rapprochees' }
  const habitudes = recentes.slice(0, R.HABITUDE_N)
  const moyenne = habitudes.length >= R.HABITUDE_MIN ? habitudes.reduce((n, x) => n + x.montant, 0) / habitudes.length : null
  const signaux: SignalDiaspora[] = []
  if (paysCarte !== c.paysCompte) signaux.push('pays')
  if (moyenne !== null ? c.montant > R.MONTANT_X * moyenne : c.montant > R.PREMIER_MAX) signaux.push('montant')
  if (proches >= R.RAPPROCHEES) signaux.push('rapprochees')
  if (signaux.length >= R.SIGNAUX_REFUS) return { decision: 'refuse', paysCarte, signaux, motif: 'signaux' }
  return signaux.length ? { decision: 'renforce', paysCarte, signaux } : { decision: 'accepte', paysCarte, signaux: [] }
}

// Produit (fiche, catalogue ; DP-54).
export interface OptionProduit {
  nom: string
  valeurs: string[]
  indispo?: string[]
  prix?: Record<string, number>
  choisi: string
}
export interface Produit {
  p: string
  titre: string
  variante?: string | null
  prix: number
  prixBarre?: number | null
  depuis?: number | null
  classe: 'S' | 'M' | 'L' | 'XL' | 'HG'
  marque: string | null // marque du produit (filtre « Marque », recherche) ; null : sans marque (fait main, vrac)
  // Distance géodésique du relais du client (habituel, sinon le premier proposé) au point d'expédition de la
  // boutique (« 1,2 km ») ; calculée par le serveur à chaque lecture, comme vendeur.km et autres[].km ; la
  // position de la boutique ne sort jamais (CMC-49).
  distance?: string | null
  relaisDistance?: string | null // le relais d'où part la distance
  note?: string | null
  avis: number
  ventes: number
  stock: number
  univers: string
  universTitre: string
  sousCategorie?: string | null
  tags: string[]
  dessins: string[]
  images?: PhotoServeur[] // photos du produit (même ordre que dessins) ; le dessin reste en repli
  options: OptionProduit[]
  vendeur: { boutique: string; zone: string; score: number; palier: string; km: number }
  autres: { boutique: string; zone: string; prix: number; km: number; score: number; ventes: number }[]
  description: string
  specs: [string, string][]
}

export interface AvisProduit {
  id: string
  note: number
  le: number
  variante: string | null
  texte: string
  photo: string | null // dessin d'une photo d'acheteur
  utiles: number
  monVote: boolean
  signale: boolean
  reponse: string | null // réponse du vendeur
}

// Relais (CL-03, CL-05) : les points de retrait, leur distance, leurs horaires ; le relais habituel du compte.
export interface Relais {
  nom: string
  quartier: string
  gerant: string
  km: number
  horaires: string
  ferme: string // jour de fermeture
  plein: boolean // plus de place pour de nouveaux colis aujourd'hui
  image?: PhotoServeur | null // photo de la devanture (relaya, si servie)
}

// Commandes du client (CL-09, CL-10 ; DP-54) : état, colis, code de retrait, garde, comptoir, étapes.
export type EtatCommande = 'paiement' | 'preparation' | 'route' | 'retirable' | 'comptoir' | 'litige' | 'retiree' | 'annulee'
export interface ColisCommande {
  n: number
  p: string
  produit: string
  dessin: string
  image?: PhotoServeur | null
  prix: number
  qte: number
  boutique: string
  etagere: string | null
  arrive: boolean
  gros?: boolean // gros colis (carton C1 ou C2) : + 300 F par jour de garde pour le groupe (DP-08)
  // Côté vendeur, tant que la commande se prépare : pas encore confirmée (annulation libre), en préparation,
  // prêt, récupéré par le livreur (emballé et scellé : plus d'annulation, plus de changement de lieu).
  statut?: StatutColis
  annule?: { le: number; rembourse: number; par: 'toi' | 'vendeur' | 'belivay'; motif: string }
}
export interface FraisDetail {
  total: number
  ramassages: number
  remises: number
  offert: number
}
export type StatutColis = 'attente' | 'preparation' | 'pret' | 'recupere'
// Annuler une boutique (CL-12) : l'article, et la différence des frais de livraison recalculés sans elle.
export interface ApercuAnnulation {
  colis: ColisCommande
  article: number
  fraisAvant: FraisDetail
  fraisApres: FraisDetail
  rembourse: number
  payePar: string
  reste: ColisCommande[]
}
// Un proche paie depuis l'étranger (CL-12, diaspora) : le panier est figé dans un lien ; carte seulement, 2 % de
// frais de service, 150 000 F au plus par paiement ; le code de retrait reste au client, le payeur reçoit la
// preuve de retrait ; un remboursement revient sur sa carte.
export interface PanierPartage {
  id: string
  prenom: string // le client qui reçoit
  relais: string
  lignes: { titre: string; dessin: string; qte: number; prix: number; boutique: string }[]
  sousTotal: number
  livraison: number
  frais: number
  total: number
  creeLe: number
  ref: string | null // la commande, une fois payée
  payeur: { prenom: string; email: string; carte: string; devise: 'EUR' | 'USD'; le: number } | null
}
export interface CommandeClient {
  ref: string
  etat: EtatCommande
  payeeLe: number
  mode: 'relais' | 'domicile'
  lieu: string
  colis: ColisCommande[]
  total: number
  livraison: number
  code: string | null // 6 chiffres, au retrait
  codeBio: boolean // biométrie avant d'afficher (commande de 50 000 F et plus, CODE-BIO)
  arriveeLe: number | null
  pretLe: number | null // retirable à partir de
  garde: { du: number; demain: number; jour: number } | null // frais de garde (DP-08)
  comptoir: { livraisonPayee: number; du: number } | null // payer au retrait
  litige: string | null
  retireeLe: number | null
  retourJusqua: number | null
  annulee: { le: number; rembourse: number } | null
  delegue: { prenom: string; numero: string } | null // quelqu'un retire à ta place
  etapes: { titre: string; le: number | null }[]
  payeur?: PanierPartage['payeur'] // payée par un proche depuis l'étranger
  transfert?: { de: string; le: number; frais: number } // changement de relais après l'arrivée
}

export interface NotificationClient {
  id: string
  type: 'Suivi' | 'Paiement' | 'Retrait' | 'Incident' | 'Messages' | 'Promotions'
  titre: string
  texte: string
  le: number
  lu: boolean
  lien: string
  sms: boolean // envoyée aussi par SMS (application fermée)
}

// Abonnement Web Push d'un appareil (PushSubscription.toJSON()) : adresse du service push et clés de chiffrement.
export interface AbonnementPush {
  endpoint: string
  expirationTime?: number | null
  keys: { p256dh: string; auth: string }
}

export interface Source {
  nom: string
  // Échanges entre clients (DP-54 ; donnees/echanges.ts).
  echanges(): Promise<DonneesEchanges>
  chercherProche(numero: string): Promise<{ ok: true; proche: ProcheBelivay } | { ok: false; raison: 'numero' | 'inconnu' | 'moi' }>
  envoyerAuxProches(objet: { type: 'liste' | 'cotisation'; id: string }, proches: string[]): Promise<{ envoyes: number }> // une notification dans leur application
  rappelerInvites(liste: string): Promise<{ ok: true; n: number } | { ok: false; raison: 'trop_tot'; prochain: number } | { ok: false; raison: 'personne' }>
  suivreListe(code: string, suivre: boolean, rappel: number | null): Promise<void>
  remercier(ref: string, texte: string): Promise<void>
  repondreColis(id: string, accepte: boolean): Promise<ColisEchange>
  cotiserArticleListe(code: string, p: string): Promise<{ ok: true; code: string } | { ok: false; raison: 'offert' | 'ferme' | 'petit' }> // la cotisation de l'article (créée au besoin)
  // Le panier payé pour un proche (Cameroun) : colis à son relais ; qui paie la livraison (destinatairePeutPayer).
  envoyerPanierA(c: { prenom: string; proche: string | null; relais: string; qui: PaieFrais; moyen: string; mot: string }): Promise<{ ok: true; ref: string } | { ok: false; raison: 'vide' | 'garantie' | 'relais' }>
  // Reçus (DP-54) : la boîte de ce qui a été envoyé au client (et de ses envois, avec les réponses) ; le détail d'un
  // envoi avec les moyens du compte ; l'exécuter (offrir, participer, payer, accepter, refuser, retirer) ; remercier
  // (le bénéficiaire remercie qui a payé) ; envoyer à un proche par son numéro ou son e-mail (sans compte : le lien).
  recus(): Promise<DonneesRecus>
  recu(id: string): Promise<DetailRecu | null>
  executerRecu(id: string, a: ActionRecu): Promise<ResultatRecu>
  remercierRecu(id: string, texte: string): Promise<{ ok: boolean }>
  envoyerRecu(e: NouvelEnvoi): Promise<{ ok: true; envoi: EnvoiRecu } | { ok: false; raison: 'numero' | 'moi' | 'vide' }>
  // Cagnotte d'une liste d'envies (mariage : « voyage de noces »), depuis la page publique de la liste, sans compte.
  participerCagnotteListe(code: string, p: { prenom: string; montant: number; moyen: string; mot: string; discret: boolean }): Promise<{ ok: true; reuni: number } | { ok: false; raison: 'ferme' | 'montant' }>
  session(): Promise<Session>
  menu(): Promise<DonneesMenu>
  entete(route: string): Promise<EnteteDonnees | null>
  // Compte (DP-53) ; « nouveau » : compte qui vient d'être créé (démonstration de l'état du prototype).
  compte(scenario?: 'nouveau'): Promise<DonneesCompte>
  deconnecter(): Promise<void>
  connecter(methode: 'google' | 'apple' | 'email'): Promise<Session>
  // Compte déjà connu de l'appareil (compte Google du téléphone, dernier compte ouvert) : « Bon retour, Carine ».
  compteConnu(): Promise<{ prenom: string; nomComplet: string; emailMasque: string } | null>
  // « Se souvenir de moi » : l'appareil garde le compte ; il se rouvre sans mot de passe.
  compteRetenu(): Promise<{ emailMasque: string } | null>
  reprendreCompte(): Promise<Session>
  // email null : le compte retenu sur l'appareil.
  connecterEmail(email: string | null, motDePasse: string, seSouvenir: boolean): Promise<ResultatConnexion>
  inscrire(i: Inscription, seSouvenir: boolean): Promise<ResultatInscription>
  demanderLienMdp(email: string | null): Promise<{ destination: string; valideMinutes: number }> // null : le compte de l'appareil
  // Lien reçu par e-mail (/mdp-nouveau?jeton=…) : à usage unique, 30 min ; mot de passe selon DP-04.
  nouveauMotDePasse(jeton: string, motDePasse: string): Promise<{ ok: true; email: string } | { ok: false; raison: 'expire' | 'invalide' | 'regle' }> // email : masqué
  avis(ref: string): Promise<DonneesAvis | null>
  envoyerAvis(ref: string, avis: Omit<AvisEnvoye, 'envoyeLe'>): Promise<{ ok: true } | { ok: false; raison: 'ferme' | 'non_retiree' }>
  conversations(): Promise<{ conversations: Conversation[]; maintenant: number; commandesEnCours: string[] }>
  conversation(id: string): Promise<{ conversation: Conversation; maintenant: number } | null> // la marque lue
  envoyerMessage(id: string, m: { texte?: string; photo?: string }): Promise<{ masques: Masque[] }>
  marquerToutLu(): Promise<void>
  favoris(): Promise<{ favoris: Favori[]; verifieLe: number }>
  relaisListe(): Promise<{ relais: Relais[]; habituel: string | null }>
  // Centres d'intérêt (arrivée) : les univers choisis passent en premier dans les catégories.
  interets(): Promise<string[]>
  // Inscription diaspora : un code par SMS au numéro étranger et un code à l'e-mail ; le compte n'est créé qu'avec
  // les deux codes justes (numéro ET e-mail vérifiés).
  envoyerCodeDiaspora(canal: 'sms' | 'email', vers: string): Promise<EnvoiCode>
  // Code SMS vérifié tout de suite (inscription « avec mon numéro ») ; le serveur le recontrôle à l'inscription.
  verifierCodeDiaspora(vers: string, code: string): Promise<{ ok: boolean }>
  // Identité donnée par Google ou Apple (jeton vérifié par le serveur) : prénom, nom, e-mail déjà vérifié, et le
  // compte BelivaY qui porte déjà cette adresse (aucun, standard ou diaspora). « appareil » : le compte Google du
  // téléphone ; « autre » : un autre compte choisi dans la feuille.
  identiteFournisseur(f: 'google' | 'apple', compte: 'appareil' | 'autre'): Promise<IdentiteFournisseur>
  inscrireDiaspora(i: InscriptionDiaspora): Promise<ResultatInscription | { ok: false; raison: 'code' | 'codeEmail' | 'age' | 'pays' | 'numero' | 'jeton' }>
  liensFamille(): Promise<{ compte: CompteDiaspora | null; liens: LienFamille[]; code: { code: string; jusqua: number } | null; depensesMois: number; maintenant: number }>
  creerCodeFamille(): Promise<{ code: string; jusqua: number }> // côté Cameroun : à donner au proche à l'étranger
  lierParCode(code: string): Promise<{ ok: true; lien: LienFamille } | { ok: false; raison: 'code' | 'max' | 'deja' }>
  inviterProche(prenom: string, numero: string): Promise<{ ok: true; lien: LienFamille } | { ok: false; raison: 'numero' | 'max' | 'deja' }>
  repondreLien(id: string, accepte: boolean, relais?: string): Promise<void> // côté Cameroun
  retirerLien(id: string): Promise<void>
  // Contrôle de cohérence (COHERENCE_DIASPORA) refait ici : bin (8 premiers chiffres) ou paysCarte déclaré ;
  // vérification renforcée : codeSms (envoyé au numéro étranger du compte) exigé en plus de 3-D Secure.
  // DP-54 : livraison « au relais de X » ou « chez X » (si X l'accepte) ; Apple Pay / Google Pay (carte du compte) ;
  // demande : payer un panier envoyé par le proche (au lieu du panier du compte), supplementPar : qui paie le
  // supplément domicile quand le proche l'a choisi (echanges.ts).
  commanderPour(id: string, p: { carte: CarteJeton; devise: 'EUR' | 'USD'; mot: string; titulaire: string; paysCarte: string; codeSms?: string; livraison?: 'relais' | 'domicile'; moyen?: 'carte' | 'apple' | 'google'; demande?: string; supplementPar?: 'payeur' | 'destinataire' }): Promise<{ ok: true; ref: string } | { ok: false; raison: 'lien' | 'plafond' | 'vide' | 'titulaire' | 'verification' | 'coherence' | 'domicile' | 'demande' | 'garantie'; controle?: ControleDiaspora }>
  // Espace diaspora (DP-54).
  reglerDevise(d: 'XAF' | 'EUR' | 'USD'): Promise<{ ok: boolean }> // refusé (ok: false) hors compte diaspora
  choisirProche(id: string): Promise<{ ok: boolean }> // « Pour qui ? » mémorisé ; refusé hors compte diaspora ou lien non actif
  lienInvitation(): Promise<{ type: 'famille' | 'invitation'; code: string; jusqua: number }> // code à partager (QR, WhatsApp, SMS)
  accepterInvitation(code: string, relais: string): Promise<{ ok: true; lien: LienFamille } | { ok: false; raison: 'code' | 'max' | 'deja' | 'type' }> // côté Cameroun
  reglerLivraisonLien(id: string, p: { relais: string; domicile: boolean; prefere: 'relais' | 'domicile' }): Promise<void> // côté Cameroun
  demandesProches(): Promise<{ demandes: DemandeProche[]; maintenant: number }>
  // lignes : les articles choisis du panier (tous par défaut).
  envoyerPanierAuProche(lien: string, p: { mot: string; livraison: 'relais' | 'domicile'; lignes?: string[] }): Promise<{ ok: true; demande: DemandeProche } | { ok: false; raison: 'lien' | 'vide' | 'plafond' | 'deja' | 'domicile' }>
  refuserDemande(id: string, mot: string): Promise<void> // côté diaspora
  annulerDemande(id: string): Promise<void> // côté Cameroun
  verifierPanier(): Promise<ChangementPanier[]> // les baisses sont appliquées tout de suite
  accepterChangements(): Promise<void> // hausses acceptées ; articles retirés ou pris enlevés (pris : gardés en favori)
  whatsapp(): Promise<ConversationWa>
  repondreWhatsapp(texte: string): Promise<ConversationWa>
  trocs(): Promise<{ liste: Troc[]; relais: string | null; maintenant: number }>
  creerTroc(t: { p: string; modele: string; declare: Troc['declare'] }): Promise<Troc>
  repondreTroc(id: string, accepte: boolean): Promise<Troc> // contre-offre ; refus = téléphone rendu au relais
  contesterTroc(id: string, texte: string): Promise<Troc> // contre-offre ou refus contesté
  payerTroc(id: string, moyen: string): Promise<Troc>
  annulerTroc(id: string): Promise<void> // avant le dépôt
  rentree(): Promise<DonneesRentree>
  commanderRentree(liste: string, c: { exclus: string[]; equivalents: string[]; moyen: string }): Promise<string> // la commande
  envoyerListePapier(classe: string, photo: string): Promise<void>
  publierListe(id: string): Promise<void>
  famille(): Promise<DonneesFamille>
  enregistrerPanierFamille(p: Partial<PanierFamille> & { id?: string }): Promise<PanierFamille>
  lierDestinataire(d: { prenom: string; numero: string; relais: string }): Promise<void>
  payerPanierFamille(id: string, p: { carte: CarteJeton; email: string; mensuel: boolean; jour: number }): Promise<PanierFamille>
  suspendrePanierFamille(id: string, suspendu: boolean): Promise<void>
  cotisations(): Promise<{ liste: Cotisation[]; maintenant: number }>
  creerCotisation(c: { nom: string; occasion: string; p: string; beneficiaire: string; relais: string; jusqua: number; qui?: PaieFrais }): Promise<Cotisation>
  cotisationPublique(code: string): Promise<Cotisation | null> // vue d'un proche : les noms discrets sont masqués
  participer(code: string, p: { prenom: string; montant: number; discret: boolean; mot: string; moyen: string; carte: CarteJeton | null }): Promise<{ ok: true; cotisation: Cotisation } | { ok: false; raison: 'fermee' | 'montant' }>
  deciderHausse(id: string, choix: 'completer' | 'rembourser', moyen?: string): Promise<Cotisation>
  misesDeCote(): Promise<{ liste: MiseDeCote[]; maintenant: number }>
  creerMiseDeCote(p: string, rythme: '2sem' | 'mois', moyen: string): Promise<MiseDeCote> // l'acompte est payé
  creerMiseDeCoteListe(liste: string, c: { exclus: string[]; equivalents: string[]; rythme: '2sem' | 'mois'; moyen: string }): Promise<MiseDeCote> // l'acompte est payé
  payerVersement(id: string, moyen: string): Promise<MiseDeCote> // le prochain versement dû
  annulerMiseDeCote(id: string): Promise<MiseDeCote>
  ventesFlash(): Promise<{ offres: OffreFlash[]; alerte: boolean; relais: string | null; maintenant: number }>
  ajouterFlash(p: string): Promise<{ ok: boolean }> // au prix de l'offre, si elle court encore et qu'il reste du stock
  alerteFlash(actif: boolean): Promise<void>
  listes(): Promise<{ listes: ListeEnvies[]; relais: string | null; maintenant: number }>
  creerListe(l: { nom: string; mode: 'fil' | 'groupe'; remiseLe: number | null; surprise: boolean; occasion?: OccasionListe | null; hotes?: string[]; cagnotte?: { titre: string; objectif: number } | null }): Promise<ListeEnvies>
  ajouterArticleListe(id: string, p: string): Promise<void>
  retirerArticleListe(id: string, p: string): Promise<{ ok: boolean }> // refusé pour un article offert
  reglerListe(id: string, r: Partial<Pick<ListeEnvies, 'destination' | 'tiers' | 'surprise' | 'domicile'>>): Promise<void>
  partagerListe(id: string): Promise<ListeEnvies>
  arreterPartage(id: string): Promise<void>
  demarrerListe(id: string): Promise<void>
  listePublique(code: string): Promise<ListePublique | null>
  // prixVu : le prix que celui qui offre a validé ; plus haut au moment du paiement : refusé avant débit, nouveau prix (CLE-39).
  // Depuis n'importe où (DP-54) : livraison au relais du destinataire ou chez lui (adresse jamais montrée) ; carte
  // depuis l'étranger : plafonds PLAFONDS_DIASPORA (par paiement, et par mois pour une même adresse e-mail) et
  // contrôle de cohérence controleDiaspora (pays de la carte face au pays où vit celui qui offre ; montant et rythme
  // face à ses cadeaux déjà payés) ; vérification renforcée : un code envoyé à son e-mail (envoyerCodeCadeau).
  offrirArticleListe(code: string, p: string, o: { prenom: string; email: string; moyen: string; prixVu: number; qui?: PaieFrais; livraison?: 'relais' | 'domicile'; devise?: 'EUR' | 'USD'; carte?: { jeton: CarteJeton; paysCarte: string; pays: string; codeEmail?: string } }): Promise<{ ok: true; ref: string } | { ok: false; raison: 'offert' | 'ferme' | 'garantie' | 'plafond' | 'domicile' } | { ok: false; raison: 'prix'; prix: number } | { ok: false; raison: 'coherence' | 'verification'; controle: ControleDiaspora }>
  envoyerCodeCadeau(code: string, email: string): Promise<EnvoiCode> // vérification renforcée d'un cadeau payé par carte
  suiviCadeau(code: string, ref: string): Promise<SuiviCadeau | null> // public : celui qui a offert, sans compte
  partagerStatutListe(id: string, canal: CanalStatut): Promise<{ code: string; jusqua: number }> // crée le lien au besoin
  prime(scenario?: 'grace' | 'suspendu'): Promise<DonneesPrime> // scénario : démonstration d'un prélèvement refusé
  payerAbonnement(moyen: string): Promise<Abonnement> // après un prélèvement refusé : grâce ou suspendu
  changerMoyenAbonnement(moyen: string): Promise<void> // le numéro des prochains prélèvements
  souscrire(p: { palier: Abonnement['palier']; formule: Abonnement['formule']; moyen: string }): Promise<Abonnement>
  resilierAbonnement(): Promise<void>
  reprendreAbonnement(): Promise<void>
  offrirAbonnement(p: { numero: string; prenom: string; palier: 'plus' | 'prime' | 'duo'; mois: 1 | 3 | 12; message: string; carte: CarteJeton }): Promise<{ ok: true; pourCeCompte: boolean; ref: string; le: number; du: number | null; au: number | null } | { ok: false; raison: 'inconnu' }>
  verserCagnotte(): Promise<number>
  demanderBusiness(piece: string): Promise<void>
  choisirInterets(univers: string[]): Promise<void>
  choisirRelais(nom: string): Promise<void>
  produit(p: string): Promise<Produit | null>
  produits(): Promise<Produit[]>
  // Contenus éditoriaux de l'accueil (carrousel, catégories mises en avant, ventes flash, bandeau de confiance) et
  // fond d'arrivée : remplaçables dans l'admin (donnees/contenus.ts ; en mode api, repli sur le contenu par défaut).
  contenuAccueil(): Promise<ContenuAccueil>
  // Ajout au panier depuis la fiche : variante choisie, quantité, vendeur (le sien ou un autre vendeur).
  ajouterProduit(p: string, choix: Record<string, string>, qte: number, boutique?: string): Promise<void>
  basculerFavori(p: string): Promise<boolean> // vrai : maintenant en favori
  // Avis d'un produit : acheteurs vérifiés seulement (payé et retiré) ; utiles et signalements gardés.
  avisProduit(p: string): Promise<{ repartition: number[]; avis: AvisProduit[] } | null>
  voterAvis(p: string, id: string, action: 'utile' | 'signaler'): Promise<void>
  commandes(): Promise<{ commandes: CommandeClient[]; maintenant: number }>
  commandeClient(ref: string): Promise<{ commande: CommandeClient; maintenant: number } | null>
  racheter(ref: string): Promise<number> // articles remis au panier
  payerAuComptoir(ref: string): Promise<void> // le montant dû, validé sur le téléphone
  confirmerRetrait(ref: string): Promise<void> // « Tout est en ordre »
  deleguerRetrait(ref: string, prenom: string, numero: string | null): Promise<void> // null : retirer la délégation
  notificationsClient(): Promise<{ notifications: NotificationClient[]; maintenant: number }>
  lireNotification(id: string | 'toutes'): Promise<void>
  panier(): Promise<DonneesPanier>
  passerCommande(c: { mode: 'relais' | 'domicile'; moyen: MoyenCommande; comptoir: boolean; numero: string | null; livraison: number; frais: number; prime?: number }): Promise<CommandePassee>
  commandePassee(ref: string): Promise<CommandePassee | null>
  paiementsEnAttente(): Promise<CommandePassee[]> // demandes Mobile Money pas encore validées (15 min)
  confirmerPaiement(ref: string): Promise<CommandePassee>
  echouerPaiement(ref: string, cause: 'expire' | 'solde' | 'carte'): Promise<void>
  relancerPaiement(ref: string): Promise<CommandePassee> // nouvelle demande Mobile Money : l'ancienne est annulée, le délai repart
  annulerPaiement(ref: string): Promise<void> // demande abandonnée avant validation : rien n'est débité, le panier reste
  changerQuantite(id: string, qte: number): Promise<void>
  retirerLigne(id: string): Promise<void>
  remettreLigne(l: LignePanier, index: number): Promise<void>
  mettreEnFavori(id: string): Promise<void>
  ajouterAuPanier(boutique: string, p: string): Promise<void>
  changerOption(id: string, nom: string, valeur: string): Promise<void>
  choisirVendeur(id: string, boutique: string): Promise<void>
  choisirModePanier(mode: 'relais' | 'domicile'): Promise<void>
  retirerFavori(id: string): Promise<void>
  remettreFavori(f: Favori): Promise<void> // annuler un retrait
  reglerAlerteFavori(id: string, k: 'prix' | 'stock', actif: boolean): Promise<void>
  favoriAuPanier(id: string): Promise<void>
  litiges(): Promise<{ litiges: Litige[]; maintenant: number }>
  litige(id: string): Promise<{ litige: Litige; maintenant: number } | null>
  commandeLitige(ref: string): Promise<CommandeLitige | null>
  ouvrirLitige(n: NouveauLitige): Promise<Litige>
  ajouterPreuve(id: string, photo: string): Promise<void>
  repondreArrangement(id: string, accepte: boolean): Promise<void>
  contesterDecision(id: string, motif: string): Promise<void>
  retirerLitige(id: string): Promise<void>
  deposerRetour(id: string): Promise<void> // « J'ai déposé le colis au relais »
  apercuAnnulation(ref: string, n: number): Promise<ApercuAnnulation | null>
  annulerColis(ref: string, n: number, motif: string): Promise<number> // montant remboursé
  changerLieu(ref: string, lieu: string, frais: number): Promise<void> // relais ou adresse ; frais : transfert payé
  partagerPanier(lignes?: string[]): Promise<PanierPartage | null> // les lignes choisies (toutes par défaut)
  panierPartage(id: string): Promise<PanierPartage | null>
  paniersPartages(): Promise<PanierPartage[]> // les paniers envoyés, les plus récents d'abord
  payerPanierPartage(id: string, p: { prenom: string; email: string; carte: CarteJeton; devise: 'EUR' | 'USD' }): Promise<PanierPartage>
  choisirRemplacement(id: string, autreVendeur: boolean): Promise<void> // le vendeur n'a plus l'article
  // Question au vendeur depuis la fiche (CL-06) : une conversation « vendeur » par produit, dans la messagerie.
  poserQuestion(p: { cle: string; titre: string; dessin: string }, texte: string): Promise<{ id: string; masques: Masque[] }>
  ecrireSupport(m: NouveauMessageSupport): Promise<{ id: string; masques: Masque[] }>
  faq(): Promise<ThemeFaq[]>
  aide(): Promise<DonneesAide>
  legal(): Promise<DonneesLegal>
  accepterConditions(version: string): Promise<void>
  // Premier numéro (CIN-31) : code par SMS ou WhatsApp ; un numéro vérifié va avec un seul compte (CIN-35).
  verifierPremierNumero(numero: string, code: string): Promise<ResultatCode | { ok: false; raison: 'utilise' }>
  confidentialite(): Promise<DonneesConfidentialite>
  reglerConfidentialite(c: Partial<Pick<DonneesConfidentialite, 'personnalisation' | 'nomRetrait'>>): Promise<void>
  effacerHistorique(quoi: 'recherches' | 'vus' | 'tout'): Promise<void>
  securite(): Promise<DonneesSecurite>
  lierMethode(m: 'google' | 'apple'): Promise<ResultatSecurite>
  delierMethode(m: MethodeConnexion): Promise<ResultatSecurite>
  // ancien null : pas encore de mot de passe (compte ouvert avec Google ou Apple).
  changerMotDePasse(ancien: string | null, nouveau: string): Promise<ResultatSecurite>
  deconnecterAppareil(id: string): Promise<void>
  deconnecterAutres(): Promise<void>
  reglerBiometrie(actif: boolean): Promise<void>
  reglerAlerteConnexion(actif: boolean): Promise<void>
  boutique(): Promise<Boutique | null>
  ouvrirBoutique(b: NouvelleBoutique): Promise<ResultatBoutique>
  suppression(): Promise<DonneesSuppression>
  supprimerCompte(code: string): Promise<ResultatCode>
  notifications(): Promise<ReglagesNotifications>
  reglerNotification(cle: keyof ChoixNotifications, actif: boolean): Promise<ChoixNotifications>
  // WhatsApp : avec l'accord du client ; jamais de commande, de paiement, de litige ni de photo par ce canal.
  reglerCanal(canal: 'sms' | 'whatsapp'): Promise<void>
  reglerCalme(c: { actif: boolean; debut: number; fin: number }): Promise<void>
  // Notifications push (src/connecteurs/push.ts) : l'abonnement Web Push de cet appareil, gardé par le serveur pour
  // lui envoyer les alertes (commande, retrait, incident, paiement, puis les choix du client) ; null : retiré.
  enregistrerAbonnementPush(abonnement: AbonnementPush | null): Promise<{ ok: boolean }>
  rappel(): Promise<Rappel | null>
  demanderRappel(r: DemandeRappel): Promise<Rappel>
  annulerRappel(): Promise<void>
  factures(): Promise<DonneesFactures & { maintenant: number }>
  portefeuille(): Promise<DonneesPortefeuille>
  recharger(montant: number, moyenId: string): Promise<ResultatPortefeuille>
  fraisRetrait(montant: number): Promise<number>
  retirer(montant: number, moyenId: string): Promise<ResultatPortefeuille>
  moyensPaiement(): Promise<MoyenPaiement[]>
  cartes(): Promise<Carte[]>
  ajouterCarte(c: NouvelleCarte): Promise<{ ok: true; carte: Carte } | { ok: false; raison: 'deja' }>
  retirerCarte(id: string): Promise<void>
  carteParDefaut(id: string): Promise<void>
  // Contrôle le numéro puis envoie le code (un seul envoi : le serveur l'envoie avec la réponse ; « Renvoyer le
  // code » passe ensuite par envoyerCode('moyen'), après le délai).
  ajouterMoyen(numero: string): Promise<{ ok: true; envoi: EnvoiCode } | { ok: false; raison: 'deja' }>
  confirmerMoyen(numero: string, code: string): Promise<ResultatCode>
  moyenParDefaut(id: string): Promise<void>
  retirerMoyen(id: string): Promise<void>
  adresses(): Promise<DonneesAdresses>
  enregistrerAdresse(a: NouvelleAdresse): Promise<ResultatAdresse>
  supprimerAdresse(id: string): Promise<void>
  adresseParDefaut(id: string): Promise<void>
  // Profil (DP-52) : envoi d'un code, puis confirmation avec le code ; le serveur applique le changement.
  // destination : la nouvelle adresse e-mail, ou le nouveau numéro (9 chiffres).
  // canal : SMS (par défaut) ou WhatsApp, au choix du client pour un premier numéro (CL-03).
  envoyerCode(objet: ObjetCode, destination?: string, canal?: 'sms' | 'whatsapp'): Promise<EnvoiCode>
  // Un e-mail = un compte (CIN-16) : contrôle avant l'envoi des codes du changement d'adresse.
  verifierNouvelEmail(email: string): Promise<{ ok: true } | { ok: false; raison: 'meme' | 'pris' }>
  confirmerProfil(changement: ChangementProfil, code: string): Promise<ResultatCode>
  verifierCodeEmail(code: string): Promise<ResultatCode> // premier code (SMS) du changement d'e-mail
  confirmerEmail(email: string, code: string): Promise<ResultatCode> // second code (nouvelle adresse)
  // Changer de numéro (CIN-39 à CIN-43) : code à l'ancien, numéro nouveau contrôlé (un numéro vérifié = un
  // seul compte, CIN-35), code au nouveau ; puis les codes de retrait en cours sont renouvelés (CIN-40).
  verifierCodeNumeroAncien(code: string): Promise<ResultatCode>
  verifierNouveauNumero(numero: string): Promise<{ ok: true } | { ok: false; raison: 'meme' | 'utilise' }>
  confirmerNumero(numero: string, code: string): Promise<ResultatCode>
  changementNumero(): Promise<ChangementNumero | null>
}

// La source choisie par l'environnement. Session perdue (jeton de rafraîchissement refusé) : l'événement
// « blv:session-perdue » permet à l'interface de renvoyer vers la connexion.
const client = env.source === 'api' ? clientDeLEnvironnement(() => window.dispatchEvent(new CustomEvent('blv:session-perdue'))) : null
const base: Source = client ? creerSourceApi(client, { interrupteurs: INTERRUPTEURS_DU_LANCEMENT }) : sourceDemo

// Gestes du client qui méritent une animation (jet au panier, cœur du favori : src/composants/Animations.tsx) :
// la source les signale par un événement de la page, quel que soit l'écran qui appelle.
const signaler = (nom: 'blv:panier' | 'blv:favori', detail: Record<string, unknown>) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(nom, { detail }))
}

export const source: Source = {
  ...base,
  ajouterProduit: async (p, choix, qte, boutique) => {
    await base.ajouterProduit(p, choix, qte, boutique)
    signaler('blv:panier', { p, qte })
  },
  ajouterAuPanier: async (boutique, p) => {
    await base.ajouterAuPanier(boutique, p)
    signaler('blv:panier', { p, qte: 1 })
  },
  ajouterFlash: async (p) => {
    const r = await base.ajouterFlash(p)
    if (r.ok) signaler('blv:panier', { p, qte: 1 })
    return r
  },
  favoriAuPanier: async (id) => {
    await base.favoriAuPanier(id)
    signaler('blv:panier', { favori: id, qte: 1 })
  },
  racheter: async (ref) => {
    const n = await base.racheter(ref)
    if (n > 0) signaler('blv:panier', { commande: ref, qte: n })
    return n
  },
  basculerFavori: async (p) => {
    const on = await base.basculerFavori(p)
    signaler('blv:favori', { p, on })
    return on
  },
}
