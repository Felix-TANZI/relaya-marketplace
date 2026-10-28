// DONNÉES DE DÉMONSTRATION — domaine « acces » : activation (pièces, charte), certification (modules, quiz tiré et
// corrigé par le serveur) et états du compte (décisions, recours). Deux comptes (demo/session.ts) : Serge, actif depuis
// le 3 septembre ; Hervé, invité par Yafé Express, en activation (5 modules sur 7, permis rejeté, assurance à envoyer).
// Le jeu d'essai peut partir d'une autre situation de compte (demo/scenario.ts : ?demo=suspendu…) : ce sont des
// DONNÉES, les règles sont les mêmes.
import { HEURE, JOUR, ajouterMois, debutDuJour, jourDe, yaounde } from '../calculs/temps'
import type { Origine } from '../donnees/communs'
import type {
  Activation,
  Certification,
  Charte,
  Decision,
  DomaineAcces,
  EtapeActivation,
  EtatDetaille,
  EtatDuCompte,
  IdPiece,
  ModuleCertification,
  PieceKyc,
  Preuve,
  QuestionQuiz,
  RaisonQuizFerme,
  ResultatQuiz,
} from '../donnees/domaines/acces'
import { maintenant } from './horloge'
import { h } from './jeu-essai'
import { scenario } from './scenario'
import { etatSession, nombre, regle } from './session'
import { magasin, repondre } from './stockage'
import { demanderActivation } from './pont-console'

// ---------- Règles servies par le serveur ----------
const R = {
  verificationAutoMin: () => nombre('KYC-AUTO-MIN'),
  revueHumaineH: () => nombre('KYC-REVUE-H'),
  photoMaxKo: () => nombre('PHOTO-MAX-KO'),
  pieceAlerteJours: () => nombre('PIECE-ALERTE-J'),
  quizQuestions: () => nombre('CERT-QUIZ-N'),
  quizMinutes: () => Number(regle('quiz_questions_duree', '(\\d+) · (\\d+)')[2]),
  quizSeuil: () => Number(regle('CERT-SEUIL', '(\\d+) sur (\\d+)')[1]),
  delaiEssaiH: () => nombre('CERT-DELAI-ESSAI-H'),
  essaisJour: () => nombre('CERT-ESSAIS-JOUR'),
  validiteMois: () => nombre('CERT-VALIDITE-MOIS'),
  alerteJours: () => nombre('CERT-ALERTE-J'),
  recoursJours: () => nombre('LIV-RECOURS-J'),
  motifMin: () => nombre('motif_min_caracteres'),
  dureesModules: () => regle('CERTIF-MODULES-DUREE', '((?:\\d+ · )+)quiz (\\d+)')[1].split('·').map((x) => Number(x.trim())).filter(Boolean),
}
// Réponse de la console à un recours : LIV-RECOURS-REPONSE-H (DP-62, QUESTIONS L-04) ; délai de traitement de la
// démonstration pour une pièce envoyée (sous la limite KYC-AUTO-MIN) et pour l'approbation de l'entreprise : données
// du jeu d'essai.
const TRAITEMENT_PIECE_MS = 20_000
const APPROBATION_MS = 30_000

// ---------- Charte d'accès (LIV-RG-R249 à R260) ----------
const CHARTE = {
  version: '2026-09',
  publieeLe: yaounde(2026, 9, 22),
  interdits: [
    'Recevoir ou demander de l’argent ou un pourboire, sous quelque forme que ce soit : le client a tout payé en ligne.',
    'Ouvrir un colis scellé, quel qu’en soit le motif.',
    'Intervertir, sauter ou ajouter un arrêt ; ramasser un colis qui n’est pas dans son paquet.',
    'Prendre une photo hors de l’étape prévue, réutiliser une photo, importer une image, falsifier sa position.',
    'Donner, noter ou demander à l’avance un code ; valider une remise sans code.',
    'Écrire l’identité ou l’adresse du client sur un colis ; conserver une donnée client après la mission.',
    'Échanger son numéro de téléphone avec un client, un vendeur ou un gérant ; proposer un service hors plateforme.',
    'Remettre un colis à une personne qui n’a pas le code ; laisser un colis devant une porte, chez un voisin ou à un gardien.',
    'Garder un colis chez soi pour la nuit ; le seul lieu de garde hors tournée est le point de stockage de l’entreprise ou un relais.',
    'Prêter son compte ou son téléphone connecté ; travailler sous le compte d’un autre.',
    'Emballer dans un emballage non BelivaY ou improvisé ; utiliser les emballages BelivaY à d’autres fins.',
    'Déclarer un incident fictif.',
  ],
}

// ---------- Modules de certification (LIV-RG-R30, LIV-03-R29, R34) : contenu livré par BelivaY ----------
type Carte = ModuleCertification['cartes'][number]
const MODULES: { id: string; titre: string; cartes: Carte[] }[] = [
  {
    id: 'belivay',
    titre: 'BelivaY en 5 minutes',
    cartes: [
      { id: 'b1', lieu: 'Partout', icone: 'wallet', titre: 'L’argent est bloqué', consigne: 'Le client paie BelivaY, jamais vous : l’argent reste bloqué jusqu’à la remise et au droit de retour.', consequences: ['Client : protégé jusqu’à la remise', 'Vendeur : payé le vendredi après libération', 'Vous : payé par votre entreprise'] },
      { id: 'b2', lieu: 'Partout', icone: 'ban', titre: 'Aucun argent', consigne: 'Vous ne touchez jamais d’argent : le client a tout payé en ligne avant la course.', consequences: ['Rien à recevoir à la remise', 'Une demande d’argent est une faute de niveau 3'] },
      { id: 'b3', lieu: 'Partout', icone: 'eye-off', titre: 'Anonymat', consigne: 'Vous ne voyez ni le contenu, ni le prix, ni le numéro de personne : les appels passent par un numéro masqué.', consequences: ['Client : prénom et quartier seulement', 'Aucun numéro échangé, jamais'] },
      { id: 'b4', lieu: 'Partout', icone: 'users', titre: 'Qui fait quoi', consigne: 'Votre entreprise vous affecte les paquets ; BelivaY calcule l’ordre et contrôle l’accès, jamais votre travail.', consequences: ['Rien à accepter : l’entreprise a accepté', 'BelivaY n’envoie aucun ordre de travail'] },
    ],
  },
  {
    id: 'ramassage',
    titre: 'Le ramassage',
    cartes: [
      { id: 'r1', lieu: 'Boutique', icone: 'search', titre: 'Contrôler devant le vendeur', consigne: 'Vérifiez l’article devant le vendeur : il correspond à la fiche, sans défaut visible.', consequences: ['Vendeur : présent au contrôle', 'Litige : votre contrôle fait foi'] },
      { id: 'r2', lieu: 'Boutique', icone: 'camera', titre: 'Deux photos', consigne: 'Photo 1 : l’article à découvert. Photo 2 : le colis fermé, scellé, étiqueté. L’étape est bloquée sans photo.', consequences: ['Sans photo, la responsabilité reste sur vous', 'Photos prises par l’application seulement'] },
      { id: 'r3', lieu: 'Boutique', icone: 'package', titre: 'Emballer et sceller', consigne: 'Emballez dans le format BelivaY prévu, scellez, posez l’étiquette de votre rouleau.', consequences: ['Jamais d’emballage improvisé', 'Une étiquette ne sert qu’une fois'] },
      { id: 'r4', lieu: 'Boutique', icone: 'key-round', titre: 'Le code de remise', consigne: 'Le vendeur vous donne son code à 6 chiffres quand le colis est prêt : il ne se demande jamais à l’avance.', consequences: ['Code bon : la garde passe à votre entreprise', '3 codes faux : blocage et incident'] },
    ],
  },
  {
    id: 'refus',
    titre: 'Refuser un colis',
    cartes: [
      { id: 'f1', lieu: 'Boutique', icone: 'package-x', titre: 'Non conforme ou abîmé', consigne: 'L’article ne correspond pas ou il est abîmé : refusez-le, avec une photo et le motif.', consequences: ['Vendeur : informé avec la photo', 'Client : un autre vendeur ou le remboursement'] },
      { id: 'f2', lieu: 'Boutique', icone: 'shield-alert', titre: 'Contrefaçon ou produit interdit', consigne: 'Un doute sur l’authenticité ou un produit interdit : refusez sans discuter.', consequences: ['Dossier ouvert par la console', 'Vous n’êtes jamais juge : vous signalez'] },
      { id: 'f3', lieu: 'Boutique', icone: 'scale', titre: 'Classe sous-déclarée', consigne: 'Le colis est plus grand que sa classe : signalez-le ; le véhicule ou le format peuvent ne plus convenir.', consequences: ['Classe réelle enregistrée', 'Déplacement imputé au vendeur'] },
    ],
  },
  {
    id: 'relais',
    titre: 'Le dépôt au relais',
    cartes: [
      { id: 'd1', lieu: 'Relais', icone: 'scan', titre: 'Le QR de dépôt', consigne: 'Au relais, montrez votre QR de dépôt : le gérant le scanne une seule fois pour tout le lot.', consequences: ['QR signé et limité dans le temps', 'Le code de dépôt aussi en 6 chiffres, si le scan ne passe pas'] },
      { id: 'd2', lieu: 'Relais', icone: 'clipboard-check', titre: 'Résultat colis par colis', consigne: 'Le gérant contrôle chaque colis : contrôlé, reçu avec réserve, refusé ou absent.', consequences: ['Réserve : photo du gérant', 'Vous confirmez le lot à la fin'] },
      { id: 'd3', lieu: 'Relais', icone: 'door-open', titre: 'Relais fermé', consigne: 'Le relais est fermé à votre arrivée : photographiez la devanture et déclarez l’incident.', consequences: ['Le système propose la suite', 'Aucun colis laissé dehors'] },
    ],
  },
  {
    id: 'domicile',
    titre: 'La remise à domicile',
    cartes: [
      { id: 'm1', lieu: 'Domicile', icone: 'phone-call', titre: 'Appel masqué', consigne: 'Appelez le client par l’application : ni lui ni vous ne voyez le numéro de l’autre.', consequences: ['Ligne ouverte pendant la mission seulement', 'Journal : heure et durée, jamais le contenu'] },
      { id: 'm2', lieu: 'Domicile', icone: 'circle-check', titre: 'Payé en ligne', consigne: 'Toute commande est payée en ligne avant la course : vous remettez le colis, rien d’autre.', consequences: ['Vous ne recevez jamais d’argent', 'Une demande d’argent est une faute grave'] },
      { id: 'm3', lieu: 'Domicile', icone: 'key-round', titre: 'Code et photo', consigne: 'Le client vous donne son code de réception ; prenez la photo de remise.', consequences: ['Sans code, aucune remise', 'Jamais chez un voisin ou un gardien'] },
      { id: 'm4', lieu: 'Domicile', icone: 'user-x', titre: 'Client absent', consigne: 'Client absent : attendez, appelez deux fois à 5 minutes d’intervalle, puis déclarez l’échec.', consequences: ['Le colis repart au relais ou au stockage', 'Le client est prévenu par le système'] },
    ],
  },
  {
    id: 'incidents',
    titre: 'Les incidents',
    cartes: [
      { id: 'i1', lieu: 'Boutique', icone: 'store', titre: 'Boutique fermée', consigne: 'Boutique fermée à votre arrivée : photographiez la devanture et déclarez l’incident. Le système dissocie l’arrêt, pas vous.', consequences: ['Vous : aucun effet', 'Vendeur : événement Ponctualité'] },
      { id: 'i2', lieu: 'Route', icone: 'bike', titre: 'Panne ou accident', consigne: 'Panne pendant la tournée : déclarez l’incident ; votre entreprise organise le transfert avec scan.', consequences: ['Vous restez en pause jusqu’au transfert', 'Colis remis en main propre au remplaçant'] },
      { id: 'i3', lieu: 'Partout', icone: 'list-checks', titre: 'Six familles', consigne: 'Lieu, colis, client, livreur et véhicule, sécurité, système : choisissez la famille, l’application dit la suite.', consequences: ['Validation par l’entreprise sous 15 min', 'À défaut, l’opérateur de zone décide'] },
    ],
  },
  {
    id: 'securite',
    titre: 'Sécurité et conduite',
    cartes: [
      { id: 's1', lieu: 'Route', icone: 'hard-hat', titre: 'Casque et code de la route', consigne: 'Casque attaché, code de la route respecté : aucune minute gagnée ne vaut un accident.', consequences: ['Obligation légale', 'Condition de la certification'] },
      { id: 's2', lieu: 'Route', icone: 'siren', titre: 'Agression', consigne: 'Menace ou agression : ne résistez pas, mettez-vous à l’abri et touchez SOS.', consequences: ['Position partagée 30 minutes', 'Entreprise et support prévenus'] },
      { id: 's3', lieu: 'Route', icone: 'droplets', titre: 'Pluie', consigne: 'Par temps de pluie, sac de transport étanche obligatoire : un colis mouillé est un colis abîmé.', consequences: ['Sac fourni par l’entreprise', 'Colis mouillé imputé'] },
      { id: 's4', lieu: 'Partout', icone: 'user-round-check', titre: 'Comportement', consigne: 'Poli, sobre, en état de conduire : sinon, ne vous déclarez pas disponible.', consequences: ['Votre entreprise peut vous retirer de la tournée'] },
    ],
  },
]

// ---------- Banque de questions (LIV-P03R-01 : des gestes concrets, aucune question piège) ----------
// La bonne réponse est la première de chaque liste ; le serveur mélange l'ordre à chaque tirage.
const BANQUE: { id: string; module: number; lieu: string; icone: string; texte: string; reponses: [string, string, string]; explication: string }[] = [
  { id: 'q01', module: 1, lieu: 'Domicile', icone: 'hand-coins', texte: 'Un client veut vous donner 500 F pour vous remercier. Que faites-vous ?', reponses: ['Je refuse poliment : je ne touche jamais d’argent', 'J’accepte, c’est un cadeau', 'Je l’accepte et je le déclare à mon entreprise'], explication: 'Aucun argent, aucun pourboire, sous aucune forme.' },
  { id: 'q02', module: 1, lieu: 'Domicile', icone: 'phone', texte: 'Le client vous demande votre numéro pour la prochaine fois. Que répondez-vous ?', reponses: ['Je ne donne pas mon numéro : il pourra m’appeler par l’application pendant une livraison', 'Je le donne, c’est plus simple', 'Je lui donne celui de mon entreprise'], explication: 'Aucun numéro ne s’échange : les appels passent par le numéro masqué.' },
  { id: 'q03', module: 1, lieu: 'Partout', icone: 'users', texte: 'Qui vous affecte un paquet ?', reponses: ['Mon entreprise de livraison', 'BelivaY', 'Le vendeur'], explication: 'BelivaY publie, l’entreprise accepte et affecte ; BelivaY n’affecte jamais.' },
  { id: 'q04', module: 2, lieu: 'Boutique', icone: 'key-round', texte: 'Vous arrivez chez le vendeur. Quand demandez-vous le code de remise ?', reponses: ['Quand le colis est contrôlé, emballé et scellé', 'Dès l’arrivée, pour gagner du temps', 'Je le demande la veille par message'], explication: 'Le code ne se demande jamais à l’avance : il clôt le ramassage.' },
  { id: 'q05', module: 2, lieu: 'Boutique', icone: 'camera', texte: 'Votre téléphone n’a plus de place pour la photo 2. Que faites-vous ?', reponses: ['Je libère de la place et je prends la photo : l’étape reste bloquée sans elle', 'Je passe à l’étape suivante', 'Je prends la photo avec un autre téléphone'], explication: 'Deux photos par l’application, sinon la responsabilité reste sur vous.' },
  { id: 'q06', module: 2, lieu: 'Boutique', icone: 'package', texte: 'Il ne vous reste plus de pochette M pour un colis M. Que faites-vous ?', reponses: ['Je signale « emballage manquant » et je ne ramasse pas', 'Je l’emballe dans un sac plastique', 'Je prends une pochette L à la place sans rien dire'], explication: 'Jamais d’emballage improvisé : la tournée est ajustée par le système.' },
  { id: 'q07', module: 2, lieu: 'Boutique', icone: 'package-open', texte: 'Le vendeur refuse que vous ouvriez la boîte. Que faites-vous ?', reponses: ['Boîte scellée d’usine : je la photographie sur toutes les faces ; sinon le contrôle est obligatoire', 'Je ramasse sans contrôle', 'Je m’en vais sans rien dire'], explication: 'Le contrôle devant le vendeur protège tout le monde.' },
  { id: 'q08', module: 3, lieu: 'Boutique', icone: 'package-x', texte: 'L’article a une rayure visible absente de la fiche. Que faites-vous ?', reponses: ['Je refuse avec une photo et le motif « abîmé »', 'Je le prends, le client verra bien', 'Je le répare avec du ruban'], explication: 'Refus motivé et photographié : le client reçoit un autre article ou est remboursé.' },
  { id: 'q09', module: 3, lieu: 'Boutique', icone: 'shield-alert', texte: 'Vous doutez qu’un parfum soit authentique. Que faites-vous ?', reponses: ['Je refuse et je signale une contrefaçon suspectée', 'Je le sens pour vérifier', 'Je demande au vendeur s’il est vrai'], explication: 'Au moindre doute, refus et signalement : la console examine.' },
  { id: 'q10', module: 3, lieu: 'Boutique', icone: 'scale', texte: 'Un colis déclaré S ne rentre pas dans une pochette S. Que faites-vous ?', reponses: ['Je signale la classe sous-déclarée', 'Je force la pochette', 'Je le mets dans mon sac'], explication: 'La classe réelle compte pour le véhicule, le format et les frais.' },
  { id: 'q11', module: 4, lieu: 'Relais', icone: 'scan', texte: 'Au relais, comment se fait le dépôt du lot ?', reponses: ['Le gérant scanne mon QR de dépôt une fois, puis contrôle chaque colis', 'Je pose les colis et je repars', 'Je donne le code de chaque client au gérant'], explication: 'Un seul scan du QR de dépôt, puis un résultat par colis.' },
  { id: 'q12', module: 4, lieu: 'Relais', icone: 'door-open', texte: 'Le relais est fermé à votre arrivée. Que faites-vous ?', reponses: ['Je photographie la devanture et je déclare l’incident', 'Je laisse les colis devant la porte', 'Je garde les colis chez moi pour la nuit'], explication: 'Jamais de colis laissé dehors ni gardé chez soi.' },
  { id: 'q13', module: 4, lieu: 'Relais', icone: 'clipboard-check', texte: 'Le gérant note « reçu avec réserve » sur un colis. Qu’est-ce que cela veut dire ?', reponses: ['Le colis est accepté, avec une photo de ce qui ne va pas', 'Le colis est refusé', 'Je dois le reprendre'], explication: 'La réserve accepte le colis et garde la preuve.' },
  { id: 'q14', module: 5, lieu: 'Domicile', icone: 'circle-check', texte: 'Le client vous tend de l’argent à la porte. Que faites-vous ?', reponses: ['Je refuse poliment : la commande est déjà payée en ligne', 'Je le prends et je préviens mon entreprise', 'Je le prends comme pourboire'], explication: 'Toute commande est payée en ligne : vous ne recevez jamais d’argent.' },
  { id: 'q15', module: 5, lieu: 'Domicile', icone: 'user-x', texte: 'Le client ne répond pas. Avant de déclarer l’échec, que faut-il ?', reponses: ['Deux appels masqués à 5 minutes d’intervalle au moins', 'Un SMS personnel', 'Laisser le colis au gardien'], explication: 'Deux appels masqués, puis l’échec déclaré ; jamais de colis au voisin.' },
  { id: 'q16', module: 5, lieu: 'Domicile', icone: 'key-round', texte: 'Le frère du client veut prendre le colis sans code. Que faites-vous ?', reponses: ['Je refuse : sans code, aucune remise', 'Je le lui donne s’il montre sa pièce', 'Je le lui donne, c’est la famille'], explication: 'Le code de réception est la seule preuve de remise.' },
  { id: 'q17', module: 6, lieu: 'Boutique', icone: 'store', texte: 'La boutique est fermée à votre arrivée. Qui retire l’arrêt de la tournée ?', reponses: ['Le système, après ma déclaration avec photo', 'Moi, je passe à l’arrêt suivant', 'Le vendeur, par message'], explication: 'Le livreur ne dissocie rien : il déclare, le système ajuste.' },
  { id: 'q18', module: 6, lieu: 'Route', icone: 'bike', texte: 'Votre moto tombe en panne avec 3 colis sur vous. Que faites-vous ?', reponses: ['Je déclare l’incident « panne » ; mon entreprise organise le transfert avec scan', 'Je confie les colis à un taxi', 'Je rentre chez moi avec les colis'], explication: 'Transfert colis par colis, avec scan, au livreur désigné.' },
  { id: 'q19', module: 6, lieu: 'Partout', icone: 'clock', texte: 'Qui valide votre incident en premier ?', reponses: ['Mon entreprise, sous 15 minutes ; à défaut l’opérateur de zone', 'Le client', 'Personne : il est validé tout seul'], explication: 'Validation humaine : l’entreprise, puis la console.' },
  { id: 'q20', module: 7, lieu: 'Route', icone: 'siren', texte: 'Quelqu’un vous menace pour prendre un colis. Que faites-vous ?', reponses: ['Je ne résiste pas, je me mets à l’abri et je touche SOS', 'Je me défends', 'Je négocie'], explication: 'Votre sécurité d’abord : SOS partage votre position 30 minutes.' },
  { id: 'q21', module: 7, lieu: 'Route', icone: 'droplets', texte: 'Il pleut fort. Comment transportez-vous les colis ?', reponses: ['Dans le sac étanche fourni par l’entreprise', 'Sous ma veste', 'J’attends la fin de la tournée'], explication: 'Un colis mouillé est un colis abîmé.' },
  { id: 'q22', module: 7, lieu: 'Partout', icone: 'user-round-check', texte: 'Vous ne vous sentez pas en état de conduire ce matin. Que faites-vous ?', reponses: ['Je ne me déclare pas disponible et je préviens mon entreprise', 'Je roule doucement', 'Je fais seulement les arrêts proches'], explication: 'Interdit de se déclarer disponible sans être en état de conduire.' },
  { id: 'q23', module: 2, lieu: 'Boutique', icone: 'tag', texte: 'Vous trouvez une étiquette d’un autre rouleau dans votre sac. Pouvez-vous l’utiliser ?', reponses: ['Non : l’application refuse une étiquette hors de ma plage', 'Oui, si elle est neuve', 'Oui, en l’écrivant à la main'], explication: 'Chaque rouleau est rattaché à un livreur par sa plage.' },
  { id: 'q24', module: 1, lieu: 'Partout', icone: 'smartphone', texte: 'Un collègue vous demande votre téléphone connecté pour finir sa tournée. Que faites-vous ?', reponses: ['Je refuse : un compte ne se prête jamais', 'Je le lui prête une heure', 'Je lui donne mon PIN'], explication: 'Prêter son compte ou son téléphone connecté est interdit.' },
  { id: 'q25', module: 4, lieu: 'Relais', icone: 'package-check', texte: 'Quand la garde des colis passe-t-elle au relais ?', reponses: ['À ma confirmation du lot, après le contrôle du gérant', 'Quand j’entre dans le relais', 'Le lendemain'], explication: 'La confirmation du lot transfère la garde.' },
  { id: 'q26', module: 5, lieu: 'Domicile', icone: 'camera', texte: 'Le code est bon. Que manque-t-il pour finir la remise ?', reponses: ['La photo de remise prise par l’application', 'Une signature sur papier', 'Rien'], explication: 'Code + photo : la remise est prouvée.' },
]

// ---------- État ----------
interface EtatCompteDemo {
  etat: EtatDetaille
  prenom: string
  entreprise: { nom: string; active: boolean; fermeLe: number | null }
  zone: string
  vehicule: string
  inviteLe: number
  charte: { versionAcceptee: string | null; accepteeLe: number | null }
  pieces: PieceKyc[]
  approbation: { etat: 'attente' | 'approuvee'; le: number | null }
  activeLe: number | null
  modules: { id: string; etat: ModuleCertification['etat']; carteVue: number; aRevoir: boolean }[]
  essais: { le: number; bonnes: number; reussi: boolean }[]
  enCours: { id: string; ids: string[]; ordres: number[][]; commenceeA: number; finA: number } | null
  dernier: ResultatQuiz | null
  badge: { obtenuLe: number; expireLe: number } | null
  lectureVocale: boolean
  decision: Decision | null
  historique: Decision[]
  dossier: Preuve[]
}

const piece = (id: IdPiece, etat: PieceKyc['etat'], p: Partial<PieceKyc> = {}): PieceKyc => ({
  id,
  gabarit: id.startsWith('cni') || id === 'permis' ? 'carte' : id === 'selfie' || id === 'profil' ? 'visage' : id === 'vehicule' ? 'vehicule' : 'document',
  video: id === 'selfie',
  etat,
  motif: null,
  envoyeeLe: null,
  verifieeLe: null,
  revueHumaine: false,
  reponseAvant: null,
  expireLe: null,
  ...p,
})
const ACTIVE_LE = yaounde(2026, 9, 24, 11, 20)
const verif = (id: IdPiece, expireLe: number | null = null) => piece(id, 'verifiee', { envoyeeLe: yaounde(2026, 9, 22, 9, 10), verifieeLe: yaounde(2026, 9, 22, 9, 22), expireLe })

function serge(): EtatCompteDemo {
  return {
    etat: 'actif',
    prenom: 'Serge',
    entreprise: { nom: 'Yafé Express', active: true, fermeLe: null },
    zone: 'Z1 Centre-ville',
    vehicule: 'Moto',
    inviteLe: yaounde(2026, 9, 21, 10, 0),
    charte: { versionAcceptee: CHARTE.version, accepteeLe: yaounde(2026, 9, 22, 9, 2) },
    // Pièces de Serge (LIV-04-R13) : CNI jusqu'au 11 mars 2030, permis jusqu'au 2 août 2029, assurance jusqu'au 14 mars 2027.
    pieces: [
      verif('cni_recto', yaounde(2030, 3, 11)),
      verif('cni_verso', yaounde(2030, 3, 11)),
      verif('selfie'),
      verif('permis', yaounde(2029, 8, 2)),
      verif('carte_grise'),
      verif('vehicule'),
      verif('assurance', yaounde(2027, 3, 14)),
      verif('profil'),
    ],
    approbation: { etat: 'approuvee', le: ACTIVE_LE },
    activeLe: ACTIVE_LE,
    modules: MODULES.map((m) => ({ id: m.id, etat: 'fait', carteVue: m.cartes.length - 1, aRevoir: false })),
    essais: [{ le: yaounde(2026, 9, 24, 10, 40), bonnes: 18, reussi: true }],
    enCours: null,
    dernier: null,
    badge: { obtenuLe: yaounde(2026, 9, 24, 10, 40), expireLe: debutDuJour(ajouterMois(jourDe(yaounde(2026, 9, 24, 10, 40)), 12)) },
    lectureVocale: false,
    decision: null,
    historique: [],
    dossier: [],
  }
}

function herve(): EtatCompteDemo {
  return {
    etat: 'en_activation',
    prenom: 'Hervé',
    entreprise: { nom: 'Yafé Express', active: true, fermeLe: null },
    zone: 'Z1 Centre-ville',
    vehicule: 'Moto',
    inviteLe: h(9, 15),
    charte: { versionAcceptee: null, accepteeLe: null },
    pieces: [
      piece('cni_recto', 'a_envoyer'),
      piece('cni_verso', 'a_envoyer'),
      piece('selfie', 'a_envoyer'),
      piece('permis', 'a_envoyer'),
      piece('carte_grise', 'a_envoyer'),
      piece('vehicule', 'a_envoyer'),
      piece('assurance', 'a_envoyer'),
      piece('profil', 'a_envoyer'),
    ],
    approbation: { etat: 'attente', le: null },
    activeLe: null,
    modules: MODULES.map((m) => ({ id: m.id, etat: 'a_faire', carteVue: -1, aRevoir: false })),
    essais: [],
    enCours: null,
    dernier: null,
    badge: null,
    lectureVocale: false,
    decision: null,
    historique: [],
    dossier: [],
  }
}

/** Hervé en cours d'activation (situation « activation ») : charte acceptée, permis rejeté, 5 modules sur 7. */
function herveEnCours(): EtatCompteDemo {
  const e = herve()
  e.charte = { versionAcceptee: CHARTE.version, accepteeLe: h(9, 40) }
  const envoi = h(10, 5)
  e.pieces = e.pieces.map((p) =>
    p.id === 'assurance'
      ? p
      : p.id === 'permis'
        ? { ...p, etat: 'rejetee', envoyeeLe: envoi, motif: 'Catégorie de permis incohérente avec le véhicule déclaré : la catégorie A est exigée pour une moto.' }
        : { ...p, etat: 'verifiee', envoyeeLe: envoi, verifieeLe: envoi + 9 * 60_000, expireLe: p.id.startsWith('cni') ? yaounde(2031, 5, 30) : null },
  )
  e.modules = e.modules.map((m, i) => ({ ...m, etat: i < 5 ? 'fait' : 'a_faire', carteVue: i < 5 ? MODULES[i].cartes.length - 1 : -1 }))
  return e
}

const DOSSIER: Preuve[] = [
  { id: 'P-1003-1', libelle: 'Photo 2 · BLV-00003-1 · Tech Bastos', quand: yaounde(2026, 10, 3, 10, 14) },
  { id: 'P-1007-1', libelle: 'Photo 1 · BLV-00005-2 · Maison Ngono', quand: yaounde(2026, 10, 7, 11, 2) },
  { id: 'P-1008-1', libelle: 'Position de remise · domicile · Bastos', quand: yaounde(2026, 10, 8, 16, 41) },
]

function decision(niveau: Decision['niveau'], le: number, motif: string, p: Partial<Decision>): Decision {
  return {
    id: 'DEC-' + jourDe(le).replace(/-/g, '').slice(2) + '-' + (niveau ?? 0),
    niveau,
    le,
    examenHumain: niveau !== null,
    auteur: niveau === null ? 'BelivaY' : 'Opérations de zone, BelivaY',
    motif,
    finLe: null,
    limites: null,
    scoreGeleSous: null,
    probationJours: null,
    recours: { possibleJusqua: niveau !== null && niveau >= 2 ? le + R.recoursJours() * JOUR : null, deposeLe: null, reponseAvant: null, reponse: null },
    ...p,
  }
}

/** Situation de compte du jeu d'essai (demo/scenario.ts) appliquée à Serge. */
function sergeSelon(s: string | null): EtatCompteDemo {
  const e = serge()
  const le = yaounde(2026, 10, 9, 17, 30)
  if (s === 'restreint') {
    e.etat = 'restreint'
    e.decision = decision(2, le, 'Trois photos 2 manquantes en deux semaines (3, 7 et 8 octobre) : les colis sont arrivés, mais la chaîne de preuve était incomplète à chaque fois.', {
      finLe: le + 7 * JOUR,
      limites: { plafondColis: 30_000, domicile: false, modulesARefaire: ['ramassage'] },
    })
    e.modules = e.modules.map((m) => (m.id === 'ramassage' ? { ...m, etat: 'a_faire', carteVue: -1, aRevoir: true } : m))
    e.dossier = DOSSIER
  } else if (s === 'suspendu') {
    e.etat = 'suspendu'
    e.decision = decision(3, le, 'Demande d’argent liquide à un client lors de la remise du 8 octobre à Bastos, établie par deux signalements concordants et l’examen du dossier de la mission.', {
      finLe: le + 14 * JOUR,
      scoreGeleSous: nombre('score_gele_suspension'),
      probationJours: nombre('periode_probatoire_retour'),
    })
    e.dossier = DOSSIER
  } else if (s === 'retire') {
    e.etat = 'retire'
    e.decision = decision(4, le, 'Ouverture d’un colis scellé le 7 octobre, établie par les photos 1 et 2 de la mission et le contrôle du relais Bastos Carrefour.', {})
    e.badge = null
    e.dossier = DOSSIER
  } else if (s === 'rattachement_ferme') {
    e.etat = 'rattachement_ferme'
    e.entreprise.fermeLe = le
    e.decision = decision(null, le, 'Yafé Express a mis fin à votre rattachement le 9 octobre, après votre dernière mission en cours.', { auteur: 'Yafé Express' })
  } else if (s === 'depart_clos') {
    // Départ demandé par Serge, clôturé par Yafé Express le lundi 12 octobre (DP-66, DP-67).
    e.etat = 'rattachement_ferme'
    e.entreprise.fermeLe = yaounde(2026, 10, 12, 16, 30)
    e.decision = decision(null, yaounde(2026, 10, 12, 16, 30), 'Départ demandé par vous, clôturé par Yafé Express : aucune mission en cours, aucun colis sous votre garde, kit constaté.', { auteur: 'Yafé Express' })
  } else if (s === 'rattachement_suspendu') {
    e.etat = 'rattachement_suspendu'
    e.entreprise.active = false
    e.decision = decision(null, le, 'Yafé Express est suspendue par BelivaY depuis le 9 octobre (assurance de la flotte expirée). Ce n’est pas une décision contre vous.', {})
  }
  if (s && s !== 'activation' && s !== 'premiere' && s !== 'preavis' && s !== 'photo' && s !== 'photo_retard' && s !== 'depart_clos') e.historique = [decision(1, yaounde(2026, 10, 1, 12, 0), 'Arrêts en retard répétés (3 en une semaine).', { auteur: 'Système, validé par les opérations de zone' })]
  return e
}

/** Départ clôturé (DP-66, par l'entreprise ou l'administrateur) : le rattachement de Serge est fermé, accès fermé. */
export function fermerRattachementSerge(le: number, par: 'entreprise' | 'admin', kitNonConteste = false, texte?: string) {
  etatAcces.ecrire((x) => {
    const e = x.serge
    e.etat = 'rattachement_ferme'
    e.entreprise.fermeLe = le
    e.decision = decision(
      null,
      le,
      texte ??
      (par === 'entreprise'
        ? 'Départ demandé par vous, clôturé par Yafé Express : aucune mission en cours, aucun colis sous votre garde, kit constaté.'
        : kitNonConteste
          ? 'Départ demandé par vous, clôturé par BelivaY à la fin du préavis : Yafé Express n’avait pas constaté votre kit dans le délai, kit non contesté, aucune retenue.'
          : 'Départ demandé par vous, clôturé par BelivaY à la fin du préavis : Yafé Express ne l’avait pas fait.'),
      { auteur: par === 'entreprise' ? 'Yafé Express' : 'BelivaY' },
    )
  })
}

/** Suspension décidée par la console BelivaY (pont : « livreur_suspendu ») : accès suspendu, motif et fin affichés. */
export function suspendreSergeParBelivay(le: number, motif: string, jusqua: number | null) {
  etatAcces.ecrire((x) => {
    const e = x.serge
    if (e.etat !== 'actif' && e.etat !== 'restreint') return
    if (e.decision) e.historique.unshift(e.decision)
    e.etat = 'suspendu'
    e.decision = decision(3, le, motif, { finLe: jusqua })
  })
}
/** Suspension levée par la console BelivaY (pont : « livreur_retabli ») : l'accès revient, la décision passe à l'historique. */
export function retablirSerge(le: number) {
  etatAcces.ecrire((x) => {
    const e = x.serge
    if (e.etat !== 'suspendu') return
    if (e.decision) e.historique.unshift({ ...e.decision, finLe: le })
    e.etat = 'actif'
    e.decision = null
  })
}

export const etatAcces = magasin('acces', () => {
  const s = scenario()
  return { serge: sergeSelon(s), herve: s === 'activation' ? herveEnCours() : herve() }
})

// ---------- Calculs ----------
type IdCompte = 'serge' | 'herve'
const compteCourant = (): IdCompte => etatSession.lire().compte

/** Le « serveur » fait avancer ce qui dépend du temps : vérification des pièces, approbation, activation. */
function avancer(c: IdCompte) {
  const t = maintenant()
  const e = etatAcces.lire()[c]
  const aVerifier = e.pieces.some((p) => p.etat === 'en_verification' && p.envoyeeLe !== null && t - p.envoyeeLe >= TRAITEMENT_PIECE_MS)
  const pret = e.etat === 'en_activation' && pretPourApprobation(e)
  if (!aVerifier && !(pret && e.approbation.etat === 'attente' && derniereEtape(e) !== null && t - derniereEtape(e)! >= APPROBATION_MS)) return
  etatAcces.ecrire((x) => {
    const a = x[c]
    for (const p of a.pieces)
      if (p.etat === 'en_verification' && p.envoyeeLe !== null && t - p.envoyeeLe >= TRAITEMENT_PIECE_MS) {
        p.etat = 'verifiee'
        p.verifieeLe = p.envoyeeLe + TRAITEMENT_PIECE_MS
        p.reponseAvant = null
      }
    const fin = derniereEtape(a)
    if (a.etat === 'en_activation' && pretPourApprobation(a) && a.entreprise.active && fin !== null && t - fin >= APPROBATION_MS) {
      // L'entreprise approuve, BelivaY active (seul le serveur passe le compte à « actif », LIV-03-R17).
      a.approbation = { etat: 'approuvee', le: fin + APPROBATION_MS }
      a.etat = 'actif'
      a.activeLe = fin + APPROBATION_MS
    }
  })
}
const piecesExigees = (e: EtatCompteDemo) => e.pieces // assurance exigée par le contrat de Yafé Express
const pretPourApprobation = (e: EtatCompteDemo) => e.charte.versionAcceptee === CHARTE.version && piecesExigees(e).every((p) => p.etat === 'verifiee') && badgeValide(e, maintenant())
function derniereEtape(e: EtatCompteDemo): number | null {
  const dates = [...e.pieces.map((p) => p.verifieeLe ?? (p.envoyeeLe !== null ? p.envoyeeLe + TRAITEMENT_PIECE_MS : null)), e.badge?.obtenuLe ?? null, e.charte.accepteeLe]
  return dates.some((d) => d === null) ? null : Math.max(...(dates as number[]))
}
const badgeValide = (e: EtatCompteDemo, t: number) => !!e.badge && e.badge.expireLe > t

function etapes(e: EtatCompteDemo, t: number): EtapeActivation[] {
  const ex = piecesExigees(e)
  const rejet = ex.some((p) => p.etat === 'rejetee')
  return [
    { id: 'charte', etat: e.charte.versionAcceptee === CHARTE.version ? 'fait' : 'a_faire' },
    { id: 'pieces_envoyees', etat: ex.every((p) => p.etat === 'en_verification' || p.etat === 'verifiee') ? 'fait' : rejet ? 'refuse' : ex.some((p) => p.etat !== 'a_envoyer') ? 'en_cours' : 'a_faire' },
    { id: 'pieces_verifiees', etat: ex.every((p) => p.etat === 'verifiee') ? 'fait' : rejet ? 'refuse' : ex.some((p) => p.etat === 'en_verification') ? 'en_cours' : 'a_faire' },
    { id: 'certification', etat: badgeValide(e, t) ? 'fait' : e.modules.some((m) => m.etat !== 'a_faire') || e.essais.length ? 'en_cours' : 'a_faire' },
    { id: 'approbation', etat: e.approbation.etat === 'approuvee' ? 'fait' : pretPourApprobation(e) ? 'en_cours' : 'a_faire' },
  ]
}

const essaisDuJour = (e: EtatCompteDemo, t: number) => e.essais.filter((x) => jourDe(x.le) === jourDe(t))
function raisonFerme(e: EtatCompteDemo, t: number): { raison: RaisonQuizFerme; prochain: number | null } {
  if (e.modules.some((m) => m.etat !== 'fait')) return { raison: 'modules', prochain: null }
  if (badgeValide(e, t) && t < recertDes(e)!) return { raison: 'certifie', prochain: recertDes(e) }
  const dernier = e.essais[e.essais.length - 1]
  if (dernier && !dernier.reussi && t < dernier.le + R.delaiEssaiH() * HEURE) return { raison: 'attente', prochain: dernier.le + R.delaiEssaiH() * HEURE }
  if (essaisDuJour(e, t).length >= R.essaisJour()) return { raison: 'limite_jour', prochain: debutDuJour(jourDe(t + JOUR)) }
  return { raison: null, prochain: null }
}
const recertDes = (e: EtatCompteDemo) => (e.badge ? e.badge.expireLe - R.alerteJours() * JOUR : null)

/** Mélange déterministe (même tirage pour une même tentative). */
function melanger<T>(l: T[], graine: number): T[] {
  const r = [...l]
  let x = graine || 1
  for (let i = r.length - 1; i > 0; i--) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0
    const j = x % (i + 1)
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function certificationDe(e: EtatCompteDemo, t: number): Certification {
  const durees = R.dureesModules()
  const ferme = raisonFerme(e, t)
  const dernier = e.essais[e.essais.length - 1]
  const etat: Certification['etat'] =
    e.badge && e.badge.expireLe <= t
      ? 'expiree'
      : badgeValide(e, t) && (t >= recertDes(e)! || e.modules.some((m) => m.aRevoir))
        ? 'a_recertifier'
        : badgeValide(e, t)
          ? 'reussie'
          : dernier && !dernier.reussi
            ? 'echouee'
            : e.modules.some((m) => m.etat !== 'a_faire')
              ? 'en_cours'
              : 'a_faire'
  const enCours = e.enCours
  return {
    etat,
    modules: MODULES.map((m, i) => {
      const s = e.modules.find((x) => x.id === m.id)!
      return { id: m.id, numero: i + 1, titre: m.titre, minutes: durees[i], cartes: m.cartes, etat: s.etat, carteVue: s.carteVue, aRevoir: s.aRevoir }
    }),
    quiz: {
      questions: R.quizQuestions(),
      minutes: R.quizMinutes(),
      seuil: R.quizSeuil(),
      ouvert: ferme.raison === null,
      raisonFerme: ferme.raison,
      prochainEssaiA: ferme.prochain,
      essaisRestantsJour: Math.max(0, R.essaisJour() - essaisDuJour(e, t).length),
      essaisParJour: R.essaisJour(),
      delaiEssaiH: R.delaiEssaiH(),
      enCours: enCours && enCours.finA > t ? { id: enCours.id, commenceeA: enCours.commenceeA, finA: enCours.finA, questions: enCours.ids.map((id, i) => questionVue(id, enCours.ordres[i])) } : null,
      dernier: e.dernier,
    },
    badge: e.badge,
    recertificationDes: recertDes(e),
    lectureVocale: e.lectureVocale,
  }
}
function questionVue(id: string, ordre: number[]): QuestionQuiz {
  const q = BANQUE.find((x) => x.id === id)!
  return { id, texte: q.texte, lieu: q.lieu, icone: q.icone, reponses: ordre.map((k) => q.reponses[k]) }
}

const charteDe = (e: EtatCompteDemo): Charte => ({ ...CHARTE, accepteeLe: e.charte.accepteeLe, versionAcceptee: e.charte.versionAcceptee })

// Un numéro de téléphone dans un texte (LIV-UIX-09) : 9 chiffres camerounais, avec ou sans indicatif ni espaces.
const NUMERO = /(?:\+?\s*237[\s.-]*)?[26](?:[\s.-]*\d){8}/

export const demoAcces: DomaineAcces = {
  activation() {
    const c = compteCourant()
    avancer(c)
    const e = etatAcces.lire()[c]
    const t = maintenant()
    const a: Activation = {
      etat: e.etat,
      prenom: e.prenom,
      entreprise: { nom: e.entreprise.nom, active: e.entreprise.active },
      zone: e.zone,
      vehicule: e.vehicule,
      inviteLe: e.inviteLe,
      charte: charteDe(e),
      pieces: e.pieces,
      etapes: etapes(e, t),
      certification: { reussie: badgeValide(e, t), modulesFaits: e.modules.filter((m) => m.etat === 'fait').length, modulesTotal: MODULES.length },
      approbation: e.approbation,
      activeLe: e.activeLe,
      regles: { verificationAutoMin: R.verificationAutoMin(), revueHumaineH: R.revueHumaineH(), photoMaxKo: R.photoMaxKo(), pieceAlerteJours: R.pieceAlerteJours() },
    }
    return repondre(a)
  },
  accepterCharte(version) {
    if (version !== CHARTE.version) return repondre({ ok: false as const, raison: 'version_perimee' as const })
    const c = compteCourant()
    etatAcces.ecrire((x) => void (x[c].charte = { versionAcceptee: version, accepteeLe: maintenant() }))
    return repondre({ ok: true as const })
  },
  envoyerPiece(id, envoi) {
    const c = compteCourant()
    const p = etatAcces.lire()[c].pieces.find((x) => x.id === id)
    // Une pièce vérifiée ne se renvoie que pour la renouveler (à J−30 de son expiration, LIV-10-R24).
    const renouvelable = p?.expireLe != null && p.expireLe - maintenant() <= R.pieceAlerteJours() * JOUR
    if (!p || (p.etat === 'verifiee' && !renouvelable)) return repondre({ ok: false as const, raison: 'deja_verifiee' as const })
    if (!envoi.controles) return repondre({ ok: false as const, raison: 'qualite' as const }) // 422 sans contrôle de l'application
    if (!p.video && envoi.octets > R.photoMaxKo() * 1024) return repondre({ ok: false as const, raison: 'trop_lourde' as const })
    const t = maintenant()
    etatAcces.ecrire((x) => {
      const q = x[c].pieces.find((y) => y.id === id)!
      q.etat = 'en_verification'
      q.motif = null
      q.envoyeeLe = t
      q.verifieeLe = null
      q.reponseAvant = t + R.verificationAutoMin() * 60_000
    })
    // Vers la console : les pièces en vérification attendent la revue KYC de BelivaY (File d'action, ADM-P09).
    demanderActivation('livreur', 'l-' + c, 'KYC-L-' + c, etatAcces.lire()[c].pieces.filter((y) => y.etat === 'en_verification').length, t)
    return repondre({ ok: true as const })
  },
  certification() {
    const c = compteCourant()
    return repondre(certificationDe(etatAcces.lire()[c], maintenant()))
  },
  async lireCarte(moduleId, carte) {
    const c = compteCourant()
    etatAcces.ecrire((x) => {
      const m = x[c].modules.find((y) => y.id === moduleId)
      if (!m) return
      m.carteVue = Math.max(m.carteVue, carte)
      if (m.etat === 'a_faire') m.etat = 'en_cours'
    })
  },
  terminerModule(moduleId) {
    const c = compteCourant()
    const m = etatAcces.lire()[c].modules.find((y) => y.id === moduleId)
    const total = MODULES.find((y) => y.id === moduleId)?.cartes.length ?? 0
    if (!m || m.carteVue < total - 1) return repondre({ ok: false as const, raison: 'cartes_non_lues' as const })
    etatAcces.ecrire((x) => {
      const y = x[c].modules.find((z) => z.id === moduleId)!
      y.etat = 'fait'
      y.aRevoir = false
      // Recertification ciblée après une sanction : faite quand les modules liés sont revus (LIV-P03R-03).
      const d = x[c].decision
      if (d?.limites) d.limites.modulesARefaire = d.limites.modulesARefaire.filter((id) => id !== moduleId)
    })
    return repondre({ ok: true as const })
  },
  async reglerLectureVocale(active) {
    const c = compteCourant()
    etatAcces.ecrire((x) => void (x[c].lectureVocale = active))
  },
  commencerQuiz() {
    const c = compteCourant()
    const t = maintenant()
    const e = etatAcces.lire()[c]
    const f = raisonFerme(e, t)
    if (f.raison) return repondre({ ok: false as const, raison: f.raison })
    // Tirage serveur : questions différentes à chaque essai (graine = essai), ordre des réponses mélangé.
    const graine = e.essais.length * 7919 + t % 9973
    const ids = melanger(BANQUE, graine).slice(0, R.quizQuestions()).map((q) => q.id)
    const ordres = ids.map((_, i) => melanger([0, 1, 2], graine + i + 1))
    const enCours = { id: 'QZ-' + c + '-' + (e.essais.length + 1), ids, ordres, commenceeA: t, finA: t + R.quizMinutes() * 60_000 }
    etatAcces.ecrire((x) => void (x[c].enCours = enCours))
    return repondre({ ok: true as const, tentative: { id: enCours.id, commenceeA: t, finA: enCours.finA, questions: ids.map((id, i) => questionVue(id, ordres[i])) } })
  },
  envoyerQuiz(tentativeId, reponses, horsLigne) {
    const c = compteCourant()
    const t = maintenant()
    const e = etatAcces.lire()[c]
    const q = e.enCours
    if (!q || q.id !== tentativeId) return repondre({ ok: false as const, raison: 'tentative_inconnue' as const })
    const ratees: ResultatQuiz['ratees'] = []
    let bonnes = 0
    q.ids.forEach((id, i) => {
      const b = BANQUE.find((x) => x.id === id)!
      const choisi = reponses[i]
      const juste = choisi !== null && choisi !== undefined && q.ordres[i][choisi] === 0
      if (juste) bonnes++
      else ratees.push({ question: b.texte, reponseDonnee: choisi === null || choisi === undefined ? null : b.reponses[q.ordres[i][choisi]], bonneReponse: b.reponses[0], explication: b.explication, module: b.module })
    })
    const reussi = bonnes >= R.quizSeuil()
    const resultat: ResultatQuiz = { tentativeId, le: t, bonnes, sur: q.ids.length, reussi, enAttenteDeValidation: horsLigne, ratees }
    etatAcces.ecrire((x) => {
      const a = x[c]
      a.enCours = null
      a.dernier = resultat
      a.essais.push({ le: t, bonnes, reussi })
      const aRevoir = new Set(ratees.map((r) => MODULES[r.module - 1].id))
      a.modules.forEach((m) => (m.aRevoir = !reussi && aRevoir.has(m.id)))
      // Badge daté, valable 12 mois (événement courier.certified : portail, critère Formation à 100).
      if (reussi) a.badge = { obtenuLe: t, expireLe: debutDuJour(ajouterMois(jourDe(t), R.validiteMois())) }
    })
    return repondre({ ok: true as const, resultat })
  },
  etatDuCompte() {
    const c = compteCourant()
    avancer(c)
    const e = etatAcces.lire()[c]
    const v: EtatDuCompte = {
      etat: e.etat,
      entreprise: { nom: e.entreprise.nom, fermeLe: e.entreprise.fermeLe },
      decision: e.decision,
      historique: e.historique,
      colisSousGarde: c === 'serge' ? etatSession.lire().colisSousGarde : 0,
      dossier: e.dossier,
      historiqueJours: nombre('historique_consultable_jours'),
      recoursJours: R.recoursJours(),
      recoursMinCaracteres: R.motifMin(),
    }
    return repondre(v)
  },
  faireAppel(decisionId, texte, preuves, o: Origine) {
    void o
    const c = compteCourant()
    const t = maintenant()
    const d = etatAcces.lire()[c].decision
    if (!d || d.id !== decisionId || d.recours.possibleJusqua === null) return repondre({ ok: false as const, raison: 'sans_recours' as const })
    if (d.recours.deposeLe !== null) return repondre({ ok: false as const, raison: 'deja_fait' as const }) // 409 appeal_already_filed
    if (t > d.recours.possibleJusqua) return repondre({ ok: false as const, raison: 'hors_delai' as const }) // 410 appeal_window_closed
    if (NUMERO.test(texte)) return repondre({ ok: false as const, raison: 'numero_interdit' as const })
    if (texte.trim().length < R.motifMin()) return repondre({ ok: false as const, raison: 'texte_trop_court' as const })
    const reponseAvant = t + nombre('LIV-RECOURS-REPONSE-H') * HEURE
    etatAcces.ecrire((x) => {
      const y = x[c].decision!
      // Dossier vers la console (ADM-P12) et le portail de l'entreprise ; la décision reste appliquée pendant l'examen.
      y.recours = { ...y.recours, deposeLe: t, reponseAvant }
      void preuves
    })
    return repondre({ ok: true as const, reponseAvant })
  },
}
