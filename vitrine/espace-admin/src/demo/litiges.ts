// DONNÉES DE DÉMONSTRATION — dossiers de litige de la console (ADM-P03), cohérents avec le jeu d'essai des six espaces :
// - LT-0412 · BLV-51877 · Tonton PG → Relais Mvog-Ada : « Article différent de la photo », le vendeur a contesté →
//   à arbitrer par le Support (niveau 1) ;
// - LT-0418 · BLV-52230 · Maman Wax Mokolo → Relais Mokolo Marché : colis abîmé, constat de la gérante Hortense Biloa
//   au comptoir, réserve à la réception (C2) → ouvert, le vendeur a encore le temps de répondre ;
// - LT-0405 · BLV-52150 · Techno Bastos → Relais Biyem-Assi Lycée : remboursé au niveau 1 (RB-0029), recours du
//   vendeur → Médiation, au-delà du seuil : à quatre yeux ;
// - LT-0399 · BLV-52198 · Saveurs du Pays : décidé (débouté) il y a 4 jours ;
// - ajoutés pour le poste de travail (DECISIONS-ENCADREES.md) : LT-0421 non reçu, les preuves disculpent le livreur ;
//   LT-0424 non reçu, le client a raison (ni photo ni code, 1,8 km) ; LT-0427 article manquant, ambigu, à transmettre
//   (ouvert par Clarisse : elle ne le tranche pas) ; LT-0430 et LT-0431 retards d'une même panne (décision en lot).
//   Chaque dossier porte son type, les faits lus dans ses pièces (calculs/decisions.ts) et ses pièces (frise du poste).
// - les litiges ouverts par le client sur une commande du pont (claim.opened), avec la réponse du vendeur
//   (claim.answered : « conteste » ⇒ arbitrage BelivaY), le colis rendu (parcel.returned) et l'issue (return.closed) ;
//   lus à chaque lecture depuis le pont, une fois par dossier, puis gardés ici dès qu'un geste les touche.
// Les règles (délais, seuils, moyen d'origine, quatre yeux) viennent du registre (pages/ADM-03/regles.ts) ; les
// montants des options sont calculés ici comme le ferait le serveur, jamais saisis (R68 : remboursé après
// récupération et inspection du colis, 48 h au plus, au moyen d'origine ; R72 : frais Mobile Money rendus au client
// quand il n'est pas en faute).
import { F } from '@client/i18n/format'
import { PARAMETRES, REGISTRE, entier, valeur } from '../calculs/registre'
import { fraisClient } from '../calculs/argent'
import { pageOuverte } from '../config/droits'
import type { DecisionQuatreYeux } from '../donnees/domaines/quatreyeux'
import type { DecisionLitige, DomaineLitiges, LitigeCourt, LitigeDossier, OptionDecision, OptionLitige, Position, PreuveGarde } from '../donnees/domaines/litiges'
import type { AppelPoste, DecisionPoste, EtatControle, MotifImage, PieceDossier, TransmissionPoste, TypeLitige } from '../donnees/domaines/decisions'
import { controlesLitige, issuesLitige, lireLitige, type ContexteLitige, type FaitsLitige } from '../calculs/decisions'
import { AccesRefuse, type Role } from '../donnees/communs'
import { REGLES_S1 } from '../pages/ADM-03/regles'
import { ACTEURS_DEMO, evenementsPour, publier, type Evenement } from './pont'
import { etatMembre } from './equipe-etat'
import { maintenant } from './horloge'
import { agentCourant, dansPerimetre, exiger, exigerPage, roleCourant } from './acces'
import { journaliser, journaliserSysteme } from './journal'
import { CLIENTS, HEURE, JOUR, T, nomAgent } from './jeu-essai'
import { demanderSecond, effetQuatreYeux } from './quatreyeux'
import { magasin, repondre } from './stockage'

const R = REGLES_S1
const masque = (id: string) => CLIENTS.find((c) => c.id === id)?.masque ?? 'Client •••'

interface Statique {
  id: string
  commande: string
  client: string // id du client (masqué à l'envoi)
  vendeur: string
  zone: string
  montantEnJeu: number
  motif: string
  article: string
  trajet: string
  paiement: string
  etiquette: string | null
  paquet: string | null
  entreprise: string | null // en cause possible (preuve de transport)
  ouvertLe: number
  preuves: PreuveGarde[]
  frise: { t: string; le: number | null }[]
  croisement: { colonnes: string[]; lignes: string[][]; alerteFraude: boolean; note: string }
  positionsBase: Position[]
  /** Lecture des preuves par les règles (FF-IA fermé : aucune confiance chiffrée, la règle citée). */
  regle: { option: OptionLitige; texte: string; regle: string } | null
  constatRelais: boolean // constat d'un gérant de relais (visible des Opérations de la zone)
  // ── Poste de travail (logique-metier/DECISIONS-ENCADREES.md) ──
  type: TypeLitige
  faits: FaitsLitige
  pieces: PieceDossier[]
  relais: string | null
  commission: number // commission de la commande : plafond d'un geste (R25)
  auteur: string | null // agent qui a ouvert le dossier (appel du client au Support)
  lies: string[] // agents liés à une partie (titulaire d'une boutique, parent…)
  cause: string | null // cause commune (lot) : « Panne déclarée PN-0031 »
}

interface Dynamique {
  niveau: 1 | 2
  etat: LitigeCourt['etat']
  vendeurRepondu: boolean
  decision: DecisionLitige | null
  recours: LitigeDossier['recours']
  complements: LitigeDossier['complements']
  attente: string | null // QY en attente pour ce dossier
  poste: EtatPoste
}
/** Ce que le poste de travail garde d'un dossier : contrôles confirmés ou corrigés, appels, prolongation, transmission. */
export interface EtatPoste {
  corrections: Record<string, { etat: EtatControle; par: string; le: number; de: EtatControle }>
  confirmes: string[]
  appels: AppelPoste[]
  prolongeJusqua: number | null
  transmission: TransmissionPoste | null
  decision: DecisionPoste | null
}
export const postNeuf = (): EtatPoste => ({ corrections: {}, confirmes: [], appels: [], prolongeJusqua: null, transmission: null, decision: null })

const p = (id: string, point: PreuveGarde['point'], quoi: string, par: string, le: number, lieu: string, note: string, photo = true, saisieLe: number | null = null): PreuveGarde => ({ id, point, quoi, par, le, lieu, photo, note, saisieLe })
type OptPiece = { image?: PieceDossier['image']; distanceM?: number | null; colis?: string | null; manquante?: boolean; saisieLe?: number | null }
/** Une pièce du poste (frise des preuves). */
const pc = (id: string, nature: PieceDossier['nature'], etape: string, partie: PieceDossier['partie'], titre: string, par: string, le: number, lieu: string | null, note: string, o: OptPiece = {}): PieceDossier => ({ id, nature, etape, partie, titre, par, le, lieu, distanceM: o.distanceM ?? null, colis: o.colis ?? null, note, image: o.image ?? null, manquante: o.manquante ?? false, saisieLe: o.saisieLe ?? null, source: 'jeu' })
const img = (motif: MotifImage, teinte: NonNullable<PieceDossier['image']>['teinte'] = 'sable') => ({ image: { motif, teinte } })
const commissionDe = (article: number) => Math.max(700, Math.round(article * 0.08))
const F0: FaitsLitige = { mode: 'relais', photoRamassage: true, contenuRamassage: null, emballage: true, scelle: 'intact', photoRemise: true, codeRemise: true, distanceRemiseM: null, heuresCoherentes: true, appels: null, photosClient: 0, clientJoignable: null, reponseVendeur: null, retardH: null, causeRetard: null }

const STATIQUES: Statique[] = [
  {
    id: 'LT-0412',
    commande: 'BLV-51877',
    client: 'c-4217',
    vendeur: 'Tonton PG',
    zone: 'Z9',
    montantEnJeu: 16700,
    motif: 'Article différent de la photo',
    article: 'Robe pagne wax · taille M · motif « Nid d’hirondelle »',
    trajet: 'Tonton PG, Mvog-Mbi (Z10) → Relais Mvog-Ada',
    paiement: 'MTN MoMo ···· 17',
    etiquette: 'BV 24 7962',
    paquet: 'PQ-Z9-261011-002',
    entreprise: 'Yafé Express',
    ouvertLe: T(-50 * 60),
    preuves: [
      p('c1a', 'C1', 'Produit à découvert', 'Serge A. · Yafé Express', T(-74 * 60), 'Mvog-Mbi · ±6 m', 'Chez Tonton PG, devant le vendeur : motif visible, couleur bleu nuit'),
      p('c1b', 'C1', 'Colis scellé et étiqueté', 'Serge A. · Yafé Express', T(-74 * 60 + 1), 'Mvog-Mbi · ±6 m', 'Étiquette BV 24 7962 · code de remise validé : responsabilité au transporteur'),
      p('c2', 'C2', 'Réception au relais', 'Bernard Onana · Relais Mvog-Ada', T(-72 * 60), 'Mvog-Ada · QR de mission', 'Scellé intact, sans réserve : pas de photo exigée', false),
      p('c3', 'C3', 'Remise au comptoir', 'Bernard Onana · Relais Mvog-Ada', T(-52 * 60), 'Mvog-Ada · ±4 m', 'Code de retrait validé · ouverture devant le gérant : non'),
      p('cl1', 'client', 'Article reçu', 'Client ••• 4217', T(-50 * 60 - 10), 'Mvog-Ada', 'Photo de la cliente : motif « Nid d’hirondelle » vert, et non bleu nuit', true, T(-50 * 60 - 25)),
      p('v1', 'vendeur', 'Réponse du vendeur', 'Tonton PG', T(-30 * 60), 'Mvog-Mbi', 'Photo de l’étiquette fournisseur : coloris « assorti », non garanti'),
    ],
    frise: [
      { t: 'Payée', le: T(-23 * 24 * 60) },
      { t: 'Prête', le: T(-75 * 60) },
      { t: 'C1 · remise', le: T(-74 * 60) },
      { t: 'C2 · relais', le: T(-72 * 60) },
      { t: 'C3 · retrait', le: T(-52 * 60) },
      { t: 'Litige', le: T(-50 * 60) },
      { t: 'Vendeur', le: T(-30 * 60) },
    ],
    croisement: {
      colonnes: ['Avant toute conclusion', 'Client ••• 4217', 'Tonton PG'],
      lignes: [
        ['Indice', 'IFA Standard', 'Trust 62,7'],
        ['Palier', '—', 'Bronze'],
        ['Commandes livrées', '11', '14'],
        ['Litiges perdus (90 j)', '0', '0'],
        ['Litiges ouverts', '1', '1'],
        ['Contrôle C4', '—', '1 sur 20'],
      ],
      alerteFraude: false,
      note: 'Premier litige de ce client chez ce vendeur. Un litige en cours ne pénalise personne ; un taux anormal ouvre une revue, jamais une sanction automatique.',
    },
    positionsBase: [
      { partie: 'client', nom: 'Client ••• 4217', etat: 'Attend un remboursement', texte: '« La robe reçue est verte ; la photo de l’offre la montre bleu nuit. »', le: T(-50 * 60) },
      { partie: 'vendeur', nom: 'Tonton PG', etat: 'Conteste', texte: '« Le coloris est “assorti” chez le fournisseur ; la photo C1 montre la robe remise au livreur. »', le: T(-30 * 60) },
      { partie: 'entreprise', nom: 'Yafé Express', etat: 'Non mise en cause', texte: 'Scellé intact de C1 à C3 : le transport n’est pas en cause.', le: null },
    ],
    regle: { option: 'rembourser', texte: 'Scellé intact de C1 à C3 : la robe remise au livreur est celle que la cliente a reçue ; elle ne correspond pas à la photo de l’offre. Vendeur en tort.', regle: 'ADM-P03R-03 · ADM-PRV-05 : la preuve du vendeur (C1) montre la robe verte ; l’offre la montre bleu nuit.' },
    constatRelais: false,
    type: 'non_conforme',
    faits: { ...F0, contenuRamassage: 'non_conforme', distanceRemiseM: 4, photosClient: 1, reponseVendeur: 'conteste' },
    pieces: [
      pc('offre', 'photo', 'Offre', 'vendeur', 'Photo de l’offre', 'Tonton PG', T(-40 * 24 * 60), 'Catalogue', 'Robe « Nid d’hirondelle », coloris bleu nuit', img('produit', 'bleu')),
      pc('ram1', 'photo', 'Ramassage', 'livreur', 'Produit à découvert', 'Serge A. · Yafé Express', T(-74 * 60), 'Mvog-Mbi · ±6 m', 'Chez Tonton PG, devant le vendeur : robe au motif vert', { ...img('produit_autre', 'vert'), colis: 'BLV-51877-1' }),
      pc('ram2', 'photo', 'Ramassage', 'livreur', 'Colis scellé et étiqueté', 'Serge A. · Yafé Express', T(-74 * 60 + 1), 'Mvog-Mbi · ±6 m', 'Étiquette BV 24 7962 · code de remise du vendeur validé', { ...img('colis'), colis: 'BLV-51877-1' }),
      pc('dep', 'scan', 'Dépôt au relais', 'relais', 'Réception au relais', 'Bernard Onana · Relais Mvog-Ada', T(-72 * 60), 'Relais Mvog-Ada', 'QR de mission scanné · scellé intact, sans réserve', { colis: 'BLV-51877-1' }),
      pc('rem', 'photo', 'Remise', 'relais', 'Remise au comptoir', 'Bernard Onana · Relais Mvog-Ada', T(-52 * 60), 'Relais Mvog-Ada · ±4 m', 'Colis fermé remis à la cliente', { ...img('comptoir'), distanceM: 4, colis: 'BLV-51877-1' }),
      pc('code', 'code', 'Remise', 'relais', 'Code de retrait validé', 'Relais Mvog-Ada', T(-52 * 60), 'Relais Mvog-Ada', 'Code saisi au premier essai'),
      pc('cl1', 'photo', 'Client', 'client', 'Article reçu', 'Client ••• 4217', T(-50 * 60 - 10), 'Mvog-Ada', 'Robe au motif vert, et non bleu nuit', { ...img('produit_autre', 'vert'), saisieLe: T(-50 * 60 - 25) }),
      pc('cl2', 'message', 'Client', 'client', 'Message du client', 'Client ••• 4217', T(-50 * 60), null, '« La robe reçue est verte ; la photo de l’offre la montre bleu nuit. »'),
      pc('v1', 'message', 'Vendeur', 'vendeur', 'Réponse du vendeur', 'Tonton PG', T(-30 * 60), null, '« Le coloris est “assorti” chez le fournisseur ; la photo du ramassage montre la robe remise. » Photo de l’étiquette jointe.', img('facture')),
    ],
    relais: 'Relais Mvog-Ada',
    commission: commissionDe(16700),
    auteur: null,
    lies: ['a-franck'], // Tonton PG : boutique de Franck Penga (lieAgent)
    cause: null,
  },
  {
    id: 'LT-0418',
    commande: 'BLV-52230',
    client: 'c-7731',
    vendeur: 'Maman Wax Mokolo',
    zone: 'Z3',
    montantEnJeu: 28900,
    motif: 'Colis abîmé au comptoir',
    article: 'Pagne wax 6 yards · lot de 3',
    trajet: 'Maman Wax Mokolo (Z3) → Relais Mokolo Marché',
    paiement: 'Orange Money ···· 31',
    etiquette: 'BV 24 8135',
    paquet: 'PQ-Z3-261013-003',
    entreprise: 'Yafé Express',
    ouvertLe: T(-90),
    preuves: [
      p('c1a', 'C1', 'Produit à découvert', 'Josiane E. · Yafé Express', T(-5 * 60), 'Mokolo · ±5 m', 'Trois pagnes pliés, emballage d’origine intact'),
      p('c1b', 'C1', 'Colis scellé et étiqueté', 'Josiane E. · Yafé Express', T(-5 * 60 + 2), 'Mokolo · ±5 m', 'Pochette M · étiquette BV 24 8135 · code de remise validé'),
      p('c2', 'C2', 'Reçu avec réserve', 'Hortense Biloa · Relais Mokolo Marché', T(-3 * 60 - 40), 'Mokolo · ±3 m', 'Réserve écrite : pochette M froissée et mouillée, scellé intact'),
      p('g1', 'gerant', 'Constat au comptoir', 'Hortense Biloa · Relais Mokolo Marché', T(-95), 'Mokolo · ±3 m', 'Déballage photographié devant la cliente : un pagne taché d’eau'),
    ],
    frise: [
      { t: 'Payée', le: T(-3 * 60 - 60) },
      { t: 'Prête', le: T(-5 * 60 - 20) },
      { t: 'C1 · remise', le: T(-5 * 60) },
      { t: 'C2 · réserve', le: T(-3 * 60 - 40) },
      { t: 'Constat', le: T(-95) },
      { t: 'Litige', le: T(-90) },
    ],
    croisement: {
      colonnes: ['Critère', 'Client ••• 7731', 'Maman Wax Mokolo', 'Yafé Express'],
      lignes: [
        ['Indice', 'IFA Standard', 'Trust 78,4', 'Trust 72'],
        ['Palier', '—', 'Argent', 'Nouveau'],
        ['Litiges perdus (90 j)', '0', '1', '0'],
        ['Litiges ouverts', '1', '1', '1'],
      ],
      alerteFraude: true,
      note: 'Alerte FR-0004 en cours : trois clients concentrent 80 % des litiges du Relais Mokolo Marché. Ce client n’en fait pas partie ; l’alerte ouvre une revue, jamais une sanction.',
    },
    positionsBase: [
      { partie: 'client', nom: 'Client ••• 7731', etat: 'Attend un remplacement', texte: '« Un des trois pagnes est taché ; je le refuse au comptoir. »', le: T(-90) },
      { partie: 'vendeur', nom: 'Maman Wax Mokolo', etat: 'Pas encore répondu', texte: null, le: null },
      { partie: 'entreprise', nom: 'Yafé Express · Josiane E.', etat: 'Mise en cause possible', texte: 'Réserve du relais à la réception (C2) : réponse de l’entreprise attendue.', le: null },
    ],
    regle: null,
    constatRelais: true,
    type: 'abime',
    faits: { ...F0, scelle: 'reserve', distanceRemiseM: 3, photosClient: 1 },
    pieces: [
      pc('ram1', 'photo', 'Ramassage', 'livreur', 'Produit à découvert', 'Josiane E. · Yafé Express', T(-5 * 60), 'Mokolo · ±5 m', 'Trois pagnes pliés, secs, emballage d’origine intact', { ...img('produit', 'or'), colis: 'BLV-52230-1' }),
      pc('ram2', 'photo', 'Ramassage', 'livreur', 'Colis scellé et étiqueté', 'Josiane E. · Yafé Express', T(-5 * 60 + 2), 'Mokolo · ±5 m', 'Pochette M · étiquette BV 24 8135', { ...img('colis'), colis: 'BLV-52230-1' }),
      pc('dep', 'photo', 'Dépôt au relais', 'relais', 'Reçu avec réserve', 'Hortense Biloa · Relais Mokolo Marché', T(-3 * 60 - 40), 'Relais Mokolo Marché · ±3 m', 'Réserve écrite : pochette froissée et mouillée, scellé intact', { ...img('colis_mouille', 'bleu'), colis: 'BLV-52230-1' }),
      pc('cst', 'constat', 'Remise', 'relais', 'Constat au comptoir', 'Hortense Biloa · Relais Mokolo Marché', T(-95), 'Relais Mokolo Marché · ±3 m', 'Déballage devant la cliente : un pagne taché d’eau', { ...img('colis_abime', 'rouge'), distanceM: 3 }),
      pc('code', 'code', 'Remise', 'relais', 'Code de retrait validé', 'Relais Mokolo Marché', T(-96), 'Relais Mokolo Marché', 'Code saisi, colis refusé au comptoir après le constat'),
      pc('cl1', 'message', 'Client', 'client', 'Message du client', 'Client ••• 7731', T(-90), null, '« Un des trois pagnes est taché ; je le refuse au comptoir. »'),
    ],
    relais: 'Relais Mokolo Marché',
    commission: commissionDe(28900),
    auteur: null,
    lies: [],
    cause: null,
  },
  {
    id: 'LT-0405',
    commande: 'BLV-52150',
    client: 'c-6120',
    vendeur: 'Techno Bastos',
    zone: 'Z6',
    montantEnJeu: 112000,
    motif: 'Recours du vendeur après remboursement',
    article: 'Téléphone Tecno Camon 30 · 256 Go',
    trajet: 'Techno Bastos (Z1) → Relais Biyem-Assi Lycée',
    paiement: 'MTN MoMo ···· 20',
    etiquette: 'BV 24 8101',
    paquet: 'PQ-Z6-261008-004',
    entreprise: 'Yafé Express',
    ouvertLe: T(-6 * 24 * 60),
    preuves: [
      p('c1a', 'C1', 'Produit à découvert', 'Brice N. · Yafé Express', T(-8 * 24 * 60), 'Bastos · ±4 m', 'Téléphone allumé devant le vendeur, écran intact'),
      p('c1b', 'C1', 'Colis scellé et étiqueté', 'Brice N. · Yafé Express', T(-8 * 24 * 60 + 2), 'Bastos · ±4 m', 'Pochette S · BV 24 8101 · code de remise validé'),
      p('c2', 'C2', 'Réception au relais', 'Christelle Manga · Relais Biyem-Assi Lycée', T(-8 * 24 * 60 + 150), 'Biyem-Assi · QR de mission', 'Scellé intact, sans réserve', false),
      { ...p('c3', 'C3', 'Remise au comptoir', 'Christelle Manga · Relais Biyem-Assi Lycée', T(-7 * 24 * 60), 'Biyem-Assi', 'Code de retrait validé ; photo de remise absente (synchronisation jamais arrivée)', false), manquante: true },
      p('cl1', 'client', 'Écran fissuré', 'Client ••• 6120', T(-7 * 24 * 60 + 20), 'Biyem-Assi', 'Photo prise 20 min après la remise'),
    ],
    frise: [
      { t: 'Payée', le: T(-9 * 24 * 60) },
      { t: 'C1', le: T(-8 * 24 * 60) },
      { t: 'C2', le: T(-8 * 24 * 60 + 150) },
      { t: 'C3', le: T(-7 * 24 * 60) },
      { t: 'Litige', le: T(-6 * 24 * 60) },
      { t: 'Décidé', le: T(-3 * 24 * 60) },
      { t: 'Recours', le: T(-20 * 60) },
    ],
    croisement: {
      colonnes: ['Critère', 'Client ••• 6120', 'Techno Bastos', 'Relais Biyem-Assi'],
      lignes: [
        ['Indice', 'IFA Standard', 'Trust 88,1', '—'],
        ['Palier', '—', 'Or', '—'],
        ['Litiges perdus (90 j)', '0', '0', '0'],
        ['Preuves manquantes (30 j)', '—', '0', '1'],
      ],
      alerteFraude: false,
      note: 'La photo de remise C3 manque : la responsabilité se reporte sur l’acteur qui devait la produire (ADM-PRV-05).',
    },
    positionsBase: [
      { partie: 'client', nom: 'Client ••• 6120', etat: 'Remboursé (RB-0029)', texte: '« L’écran était fissuré à l’ouverture du colis. »', le: T(-6 * 24 * 60) },
      { partie: 'vendeur', nom: 'Techno Bastos', etat: 'Recours', texte: '« Le téléphone a été remis intact au livreur (photo C1). La photo de remise au comptoir manque : nous ne devons pas en porter la charge. »', le: T(-20 * 60) },
      { partie: 'entreprise', nom: 'Yafé Express · Brice N.', etat: 'Non mise en cause', texte: 'Scellé intact jusqu’au relais (C2).', le: null },
    ],
    regle: { option: 'transporteur', texte: 'Scellé intact de C1 à C2 ; la photo de remise C3 manque : la charge revient à l’acteur qui devait la produire, pas au vendeur.', regle: 'ADM-PRV-05 : une preuve absente reporte la responsabilité sur l’acteur qui devait la produire.' },
    constatRelais: true,
    type: 'abime',
    faits: { ...F0, photoRemise: false, distanceRemiseM: 6, photosClient: 1, reponseVendeur: 'conteste' },
    pieces: [
      pc('ram1', 'photo', 'Ramassage', 'livreur', 'Produit à découvert', 'Brice N. · Yafé Express', T(-8 * 24 * 60), 'Bastos · ±4 m', 'Téléphone allumé devant le vendeur, écran intact', { ...img('ecran', 'bleu'), colis: 'BLV-52150-1' }),
      pc('ram2', 'photo', 'Ramassage', 'livreur', 'Colis scellé et étiqueté', 'Brice N. · Yafé Express', T(-8 * 24 * 60 + 2), 'Bastos · ±4 m', 'Pochette S avec papier bulle (R87) · BV 24 8101', { ...img('colis'), colis: 'BLV-52150-1' }),
      pc('dep', 'scan', 'Dépôt au relais', 'relais', 'Réception au relais', 'Christelle Manga · Relais Biyem-Assi Lycée', T(-8 * 24 * 60 + 150), 'Relais Biyem-Assi Lycée', 'QR de mission scanné · scellé intact, sans réserve', { colis: 'BLV-52150-1' }),
      pc('rem', 'photo', 'Remise', 'relais', 'Remise au comptoir', 'Christelle Manga · Relais Biyem-Assi Lycée', T(-7 * 24 * 60), 'Relais Biyem-Assi Lycée', 'Photo de remise absente : synchronisation jamais arrivée', { manquante: true, colis: 'BLV-52150-1' }),
      pc('code', 'code', 'Remise', 'relais', 'Code de retrait validé', 'Relais Biyem-Assi Lycée', T(-7 * 24 * 60), 'Relais Biyem-Assi Lycée', 'Code saisi au premier essai', { distanceM: 6 }),
      pc('cl1', 'photo', 'Client', 'client', 'Écran fissuré', 'Client ••• 6120', T(-7 * 24 * 60 + 20), 'Biyem-Assi', 'Photo prise 20 min après la remise', img('ecran_fissure', 'gris')),
      pc('v1', 'message', 'Vendeur', 'vendeur', 'Recours du vendeur', 'Techno Bastos', T(-20 * 60), null, '« Le téléphone a été remis intact au livreur. La photo de remise au comptoir manque : nous ne devons pas en porter la charge. »'),
    ],
    relais: 'Relais Biyem-Assi Lycée',
    commission: commissionDe(112000),
    auteur: null,
    lies: [],
    cause: null,
  },
  {
    id: 'LT-0399',
    commande: 'BLV-52198',
    client: 'c-2954',
    vendeur: 'Saveurs du Pays',
    zone: 'Z6',
    montantEnJeu: 9800,
    motif: 'Produit périmé',
    article: 'Miel de l’Adamaoua · 1 L',
    trajet: 'Saveurs du Pays (Z6) → Relais Melen Université',
    paiement: 'Orange Money ···· 54',
    etiquette: 'BV 24 8077',
    paquet: 'PQ-Z6-261009-001',
    entreprise: 'Yafé Express',
    ouvertLe: T(-6 * 24 * 60),
    preuves: [
      p('c1a', 'C1', 'Produit à découvert', 'Kevin D. · Yafé Express', T(-7 * 24 * 60), 'Melen · ±5 m', 'Date de péremption lisible : mars 2027'),
      p('c3', 'C3', 'Remise au comptoir', 'Patricia Fouda · Relais Melen Université', T(-6 * 24 * 60 - 60), 'Melen · ±3 m', 'Code de retrait validé'),
    ],
    frise: [
      { t: 'Payée', le: T(-8 * 24 * 60) },
      { t: 'C1', le: T(-7 * 24 * 60) },
      { t: 'C3', le: T(-6 * 24 * 60 - 60) },
      { t: 'Litige', le: T(-6 * 24 * 60) },
      { t: 'Décidé', le: T(-4 * 24 * 60) },
    ],
    croisement: { colonnes: ['Critère', 'Client ••• 2954', 'Saveurs du Pays'], lignes: [['Indice', 'IFA Standard', 'Trust 55,2']], alerteFraude: false, note: 'La photo C1 montre une date de péremption de mars 2027.' },
    positionsBase: [
      { partie: 'client', nom: 'Client ••• 2954', etat: 'Débouté', texte: '« Le miel est périmé. »', le: T(-6 * 24 * 60) },
      { partie: 'vendeur', nom: 'Saveurs du Pays', etat: 'Conteste', texte: '« La date figure sur la photo C1. »', le: T(-5 * 24 * 60) },
    ],
    regle: null,
    constatRelais: false,
    type: 'non_conforme',
    faits: { ...F0, contenuRamassage: 'conforme', distanceRemiseM: 3, photosClient: 0, reponseVendeur: 'conteste' },
    pieces: [
      pc('ram1', 'photo', 'Ramassage', 'livreur', 'Produit à découvert', 'Kevin D. · Yafé Express', T(-7 * 24 * 60), 'Melen · ±5 m', 'Date de péremption lisible : mars 2027', img('produit', 'or')),
      pc('rem', 'photo', 'Remise', 'relais', 'Remise au comptoir', 'Patricia Fouda · Relais Melen Université', T(-6 * 24 * 60 - 60), 'Relais Melen Université · ±3 m', 'Code de retrait validé', { ...img('comptoir'), distanceM: 3 }),
      pc('cl1', 'message', 'Client', 'client', 'Message du client', 'Client ••• 2954', T(-6 * 24 * 60), null, '« Le miel est périmé. »'),
    ],
    relais: 'Relais Melen Université',
    commission: commissionDe(9800),
    auteur: null,
    lies: [],
    cause: null,
  },
  // ── Dossiers ajoutés pour le poste de travail (19 oct.) ──
  {
    // Les preuves disculpent le livreur : photo devant la porte, code validé, position à 9 m, deux appels comptés.
    id: 'LT-0421',
    commande: 'BLV-52266',
    client: 'c-0388',
    vendeur: 'Techno Bastos',
    zone: 'Z1',
    montantEnJeu: 23500,
    motif: 'Colis non reçu à domicile',
    article: 'Écouteurs sans fil JBL Tune 520',
    trajet: 'Techno Bastos (Z1) → domicile, Bastos',
    paiement: 'Orange Money ···· 88',
    etiquette: 'BV 24 8190',
    paquet: 'PQ-Z1-261010-007',
    entreprise: 'Yafé Express',
    ouvertLe: T(-60 * 60),
    preuves: [],
    frise: [
      { t: 'Payée', le: T(-66 * 60) },
      { t: 'Ramassage', le: T(-64 * 60) },
      { t: 'Remise', le: T(-63 * 60) },
      { t: 'Litige', le: T(-60 * 60) },
    ],
    croisement: { colonnes: ['Critère', 'Client ••• 0388', 'Techno Bastos', 'Yafé Express'], lignes: [['Litiges ouverts', '2', '0', '1'], ['Litiges perdus (90 j)', '1', '0', '0']], alerteFraude: false, note: 'Deuxième « non reçu » de ce client en 90 jours.' },
    positionsBase: [
      { partie: 'client', nom: 'Client ••• 0388', etat: 'Attend un remboursement', texte: '« Je n’ai rien reçu, personne n’est venu. »', le: T(-60 * 60) },
      { partie: 'vendeur', nom: 'Techno Bastos', etat: 'Non concerné', texte: 'Colis remis au livreur, photo au ramassage.', le: T(-59 * 60) },
      { partie: 'entreprise', nom: 'Yafé Express · Serge A.', etat: 'Conteste', texte: 'Remis en main propre contre le code, photo devant la porte.', le: T(-58 * 60) },
    ],
    regle: null,
    constatRelais: false,
    type: 'non_recu',
    faits: { ...F0, mode: 'domicile', scelle: null, distanceRemiseM: 9, appels: 2, clientJoignable: true },
    pieces: [
      pc('ram1', 'photo', 'Ramassage', 'livreur', 'Colis scellé au ramassage', 'Serge A. · Yafé Express', T(-64 * 60), 'Techno Bastos · ±4 m', 'Pochette S · BV 24 8190 · code de remise du vendeur validé', { ...img('colis'), colis: 'BLV-52266-1' }),
      pc('pos1', 'position', 'Trajet', 'livreur', 'Position du livreur', 'Serge A. · Yafé Express', T(-63 * 60 - 12), 'Bastos, rue 1.839', 'Arrivée devant l’adresse épinglée par le client', { ...img('carte', 'vert'), distanceM: 9 }),
      pc('ap1', 'appel', 'Remise', 'livreur', 'Appel masqué 1', 'Serge A. · Yafé Express', T(-63 * 60 - 10), 'Bastos', 'Sans réponse · 35 s'),
      pc('ap2', 'appel', 'Remise', 'livreur', 'Appel masqué 2', 'Serge A. · Yafé Express', T(-63 * 60 - 4), 'Bastos', 'Joint : « Je descends »'),
      pc('rem', 'photo', 'Remise', 'livreur', 'Remise devant la porte', 'Serge A. · Yafé Express', T(-63 * 60), 'Bastos · ±9 m', 'Colis remis en main propre, porte verte au numéro 14', { ...img('porte', 'vert'), distanceM: 9, colis: 'BLV-52266-1' }),
      pc('code', 'code', 'Remise', 'livreur', 'Code de réception validé', 'Serge A. · Yafé Express', T(-63 * 60), 'Bastos', 'Code du client saisi au premier essai'),
      pc('cl1', 'message', 'Client', 'client', 'Message du client', 'Client ••• 0388', T(-60 * 60), null, '« Je n’ai rien reçu, personne n’est venu. »'),
    ],
    relais: null,
    commission: commissionDe(23500),
    auteur: null,
    lies: ['a-aicha'], // Aïcha Bouba : cousine du client (déclaré au Service client)
    cause: null,
  },
  {
    // Le client a raison : remise sans photo ni code, position à 1,8 km, aucun appel.
    id: 'LT-0424',
    commande: 'BLV-52271',
    client: 'c-2954',
    vendeur: 'Beauté Melen',
    zone: 'Z6',
    montantEnJeu: 41000,
    motif: 'Colis non reçu à domicile',
    article: 'Coffret soins au karité · 3 pièces',
    trajet: 'Beauté Melen (Z6) → domicile, Melen',
    paiement: 'Orange Money ···· 54',
    etiquette: 'BV 24 8204',
    paquet: 'PQ-Z6-261010-011',
    entreprise: 'Mboa Logistique',
    ouvertLe: T(-68 * 60),
    preuves: [],
    frise: [
      { t: 'Payée', le: T(-75 * 60) },
      { t: 'Ramassage', le: T(-72 * 60) },
      { t: '« Remis »', le: T(-71 * 60 - 46) },
      { t: 'Litige', le: T(-68 * 60) },
    ],
    croisement: { colonnes: ['Critère', 'Client ••• 2954', 'Beauté Melen', 'Mboa Logistique'], lignes: [['Litiges perdus (90 j)', '0', '0', '2'], ['Remises sans code (30 j)', '—', '—', '4']], alerteFraude: false, note: 'Quatre remises sans code chez cette entreprise en 30 jours.' },
    positionsBase: [
      { partie: 'client', nom: 'Client ••• 2954', etat: 'Attend un remboursement', texte: '« Le suivi dit remis, mais je n’ai jamais vu le livreur. »', le: T(-68 * 60) },
      { partie: 'vendeur', nom: 'Beauté Melen', etat: 'Non concerné', texte: 'Colis remis au livreur, photo au ramassage.', le: T(-67 * 60) },
      { partie: 'entreprise', nom: 'Mboa Logistique · Armel B.', etat: 'Pas encore répondu', texte: null, le: null },
    ],
    regle: null,
    constatRelais: false,
    type: 'non_recu',
    faits: { ...F0, mode: 'domicile', scelle: null, photoRemise: false, codeRemise: false, distanceRemiseM: 1800, heuresCoherentes: false, appels: 0, clientJoignable: true },
    pieces: [
      pc('ram1', 'photo', 'Ramassage', 'livreur', 'Colis scellé au ramassage', 'Armel B. · Mboa Logistique', T(-72 * 60), 'Beauté Melen · ±5 m', 'Carton C1 · BV 24 8204 · code de remise du vendeur validé', { ...img('colis'), colis: 'BLV-52271-1' }),
      pc('pos1', 'position', 'Trajet', 'livreur', 'Position au moment de « Remis »', 'Armel B. · Mboa Logistique', T(-71 * 60 - 46), 'Melen, carrefour EMIA', 'Marqué « remis » à 1,8 km de l’adresse, 14 min après le ramassage à 6 km', { ...img('carte', 'rouge'), distanceM: 1800 }),
      pc('rem', 'photo', 'Remise', 'livreur', 'Photo de remise', 'Armel B. · Mboa Logistique', T(-71 * 60 - 46), null, 'Aucune photo envoyée', { manquante: true }),
      pc('code', 'code', 'Remise', 'livreur', 'Code de réception', 'Armel B. · Mboa Logistique', T(-71 * 60 - 46), null, 'Aucun code saisi : « client absent, laissé au gardien »', { manquante: true }),
      pc('ap0', 'appel', 'Remise', 'livreur', 'Journal d’appels', 'Armel B. · Mboa Logistique', T(-71 * 60 - 46), null, 'Aucun appel au client (R51 : deux appels exigés)'),
      pc('cl1', 'message', 'Client', 'client', 'Message du client', 'Client ••• 2954', T(-68 * 60), null, '« Le suivi dit remis, mais je n’ai jamais vu le livreur. »'),
    ],
    relais: null,
    commission: commissionDe(41000),
    auteur: null,
    lies: [],
    cause: null,
  },
  {
    // Ambigu : scellé intact de bout en bout, photo du ramassage où l'on ne compte pas les trois chemises.
    id: 'LT-0427',
    commande: 'BLV-52279',
    client: 'c-7731',
    vendeur: 'Tonton PG',
    zone: 'Z1',
    montantEnJeu: 27600,
    motif: 'Article manquant dans le colis',
    article: 'Chemises bazin brodées · lot de 3',
    trajet: 'Tonton PG, Nlongkak (Z1) → Relais Bastos Carrefour',
    paiement: 'MTN MoMo ···· 31',
    etiquette: 'BV 24 8211',
    paquet: 'PQ-Z1-261011-004',
    entreprise: 'Yafé Express',
    ouvertLe: T(-50 * 60),
    preuves: [],
    frise: [
      { t: 'Payée', le: T(-58 * 60) },
      { t: 'Ramassage', le: T(-56 * 60) },
      { t: 'Relais', le: T(-55 * 60) },
      { t: 'Retrait', le: T(-51 * 60) },
      { t: 'Litige', le: T(-50 * 60) },
      { t: 'Vendeur', le: T(-40 * 60) },
    ],
    croisement: { colonnes: ['Critère', 'Client ••• 7731', 'Tonton PG'], lignes: [['Litiges ouverts', '2', '2'], ['Poids au ramassage / au relais', '—', '0,9 kg / 0,9 kg']], alerteFraude: false, note: 'Même poids au ramassage et au relais.' },
    positionsBase: [
      { partie: 'client', nom: 'Client ••• 7731', etat: 'Attend un remboursement partiel', texte: '« Deux chemises sur trois dans le colis. »', le: T(-50 * 60) },
      { partie: 'vendeur', nom: 'Tonton PG', etat: 'Conteste', texte: '« Les trois chemises sont parties ; voyez la photo du ramassage. »', le: T(-40 * 60) },
      { partie: 'entreprise', nom: 'Yafé Express · Brice N.', etat: 'Non mise en cause', texte: 'Scellé intact jusqu’au relais.', le: null },
    ],
    regle: null,
    constatRelais: false,
    type: 'manquant',
    faits: { ...F0, contenuRamassage: 'illisible', distanceRemiseM: 5, photosClient: 2, reponseVendeur: 'conteste' },
    pieces: [
      pc('ram1', 'photo', 'Ramassage', 'livreur', 'Produit à découvert', 'Brice N. · Yafé Express', T(-56 * 60), 'Nlongkak · ±5 m', 'Pile de chemises : la troisième est cachée en partie', { ...img('contenu_incomplet', 'or'), colis: 'BLV-52279-1' }),
      pc('ram2', 'photo', 'Ramassage', 'livreur', 'Colis scellé et pesé', 'Brice N. · Yafé Express', T(-56 * 60 + 1), 'Nlongkak · ±5 m', 'Pochette M · 0,9 kg · BV 24 8211', { ...img('colis'), colis: 'BLV-52279-1' }),
      pc('dep', 'scan', 'Dépôt au relais', 'relais', 'Réception au relais', 'Rose Mbarga · Relais Bastos Carrefour', T(-55 * 60), 'Relais Bastos Carrefour', 'QR scanné · scellé intact · 0,9 kg', { colis: 'BLV-52279-1' }),
      pc('rem', 'photo', 'Remise', 'relais', 'Remise au comptoir', 'Rose Mbarga · Relais Bastos Carrefour', T(-51 * 60), 'Relais Bastos Carrefour · ±5 m', 'Colis fermé remis au client', { ...img('comptoir'), distanceM: 5 }),
      pc('code', 'code', 'Remise', 'relais', 'Code de retrait validé', 'Relais Bastos Carrefour', T(-51 * 60), 'Relais Bastos Carrefour', 'Code saisi au premier essai'),
      pc('cl1', 'photo', 'Client', 'client', 'Contenu à l’ouverture', 'Client ••• 7731', T(-50 * 60 - 20), 'Bastos', 'Deux chemises dans la pochette ouverte', img('contenu_incomplet', 'sable')),
      pc('cl2', 'photo', 'Client', 'client', 'Pochette ouverte', 'Client ••• 7731', T(-50 * 60 - 18), 'Bastos', 'Pochette déchirée à l’ouverture, côté opposé au scellé', img('colis_abime', 'sable')),
      pc('v1', 'message', 'Vendeur', 'vendeur', 'Réponse du vendeur', 'Tonton PG', T(-40 * 60), null, '« Les trois chemises sont parties ; voyez la photo du ramassage. »'),
    ],
    relais: 'Relais Bastos Carrefour',
    commission: commissionDe(27600),
    auteur: 'a-clarisse', // ouvert par le Service client à l'appel du client
    lies: ['a-franck'],
    cause: null,
  },
  {
    // Retard dû à une panne déclarée par l'entreprise : même cause et même issue que LT-0431 (décision en lot).
    id: 'LT-0430',
    commande: 'BLV-52283',
    client: 'c-6120',
    vendeur: 'Pièces Auto Biyem',
    zone: 'Z6',
    montantEnJeu: 8500,
    motif: 'Livré avec un jour de retard',
    article: 'Ampoules H4 · paire',
    trajet: 'Pièces Auto Biyem (Z6) → domicile, Biyem-Assi',
    paiement: 'MTN MoMo ···· 20',
    etiquette: 'BV 24 8220',
    paquet: 'PQ-Z6-261011-002',
    entreprise: 'Mboa Logistique',
    ouvertLe: T(-30 * 60),
    preuves: [],
    frise: [
      { t: 'Payée', le: T(-56 * 60) },
      { t: 'Ramassage', le: T(-54 * 60) },
      { t: 'Panne', le: T(-53 * 60) },
      { t: 'Remise', le: T(-32 * 60) },
      { t: 'Litige', le: T(-30 * 60) },
    ],
    croisement: { colonnes: ['Critère', 'Client ••• 6120', 'Mboa Logistique'], lignes: [['Retards (30 j)', '—', '3'], ['Panne déclarée', '—', 'PN-0031']], alerteFraude: false, note: 'Panne de moto déclarée PN-0031 : trois clients livrés le lendemain.' },
    positionsBase: [
      { partie: 'client', nom: 'Client ••• 6120', etat: 'Demande un geste', texte: '« Promis en 4 heures, livré le lendemain. »', le: T(-30 * 60) },
      { partie: 'entreprise', nom: 'Mboa Logistique · Flore N.', etat: 'Reconnaît', texte: 'Panne de moto déclarée à 14 h (PN-0031).', le: T(-29 * 60) },
    ],
    regle: null,
    constatRelais: false,
    type: 'retard',
    faits: { ...F0, mode: 'domicile', scelle: null, distanceRemiseM: 12, appels: 2, clientJoignable: true, retardH: 20, causeRetard: 'entreprise' },
    pieces: [
      pc('ram1', 'photo', 'Ramassage', 'livreur', 'Colis scellé au ramassage', 'Flore N. · Mboa Logistique', T(-54 * 60), 'Biyem-Assi · ±4 m', 'Pochette S · BV 24 8220', img('colis')),
      pc('pn', 'systeme', 'Trajet', 'entreprise', 'Panne déclarée PN-0031', 'Mboa Logistique', T(-53 * 60), 'Biyem-Assi', 'Moto en panne : tournée reportée au lendemain, clients prévenus par SMS'),
      pc('rem', 'photo', 'Remise', 'livreur', 'Remise à domicile', 'Flore N. · Mboa Logistique', T(-32 * 60), 'Biyem-Assi · ±12 m', 'Colis remis en main propre', { ...img('porte', 'or'), distanceM: 12 }),
      pc('code', 'code', 'Remise', 'livreur', 'Code de réception validé', 'Flore N. · Mboa Logistique', T(-32 * 60), 'Biyem-Assi', 'Code du client saisi'),
      pc('cl1', 'message', 'Client', 'client', 'Message du client', 'Client ••• 6120', T(-30 * 60), null, '« Promis en 4 heures, livré le lendemain. »'),
    ],
    relais: null,
    commission: commissionDe(8500),
    auteur: null,
    lies: [],
    cause: 'Panne déclarée PN-0031',
  },
  {
    id: 'LT-0431',
    commande: 'BLV-52284',
    client: 'c-4217',
    vendeur: 'Pièces Auto Biyem',
    zone: 'Z6',
    montantEnJeu: 12000,
    motif: 'Livré avec un jour de retard',
    article: 'Essuie-glaces Bosch · paire',
    trajet: 'Pièces Auto Biyem (Z6) → domicile, Biyem-Assi',
    paiement: 'MTN MoMo ···· 17',
    etiquette: 'BV 24 8221',
    paquet: 'PQ-Z6-261011-002',
    entreprise: 'Mboa Logistique',
    ouvertLe: T(-29 * 60),
    preuves: [],
    frise: [
      { t: 'Payée', le: T(-56 * 60) },
      { t: 'Ramassage', le: T(-54 * 60) },
      { t: 'Panne', le: T(-53 * 60) },
      { t: 'Remise', le: T(-31 * 60) },
      { t: 'Litige', le: T(-29 * 60) },
    ],
    croisement: { colonnes: ['Critère', 'Client ••• 4217', 'Mboa Logistique'], lignes: [['Retards (30 j)', '—', '3'], ['Panne déclarée', '—', 'PN-0031']], alerteFraude: false, note: 'Même panne que LT-0430.' },
    positionsBase: [
      { partie: 'client', nom: 'Client ••• 4217', etat: 'Demande un geste', texte: '« Livré le lendemain, sans explication. »', le: T(-29 * 60) },
      { partie: 'entreprise', nom: 'Mboa Logistique · Flore N.', etat: 'Reconnaît', texte: 'Panne de moto déclarée à 14 h (PN-0031).', le: T(-29 * 60) },
    ],
    regle: null,
    constatRelais: false,
    type: 'retard',
    faits: { ...F0, mode: 'domicile', scelle: null, distanceRemiseM: 7, appels: 2, clientJoignable: true, retardH: 21, causeRetard: 'entreprise' },
    pieces: [
      pc('ram1', 'photo', 'Ramassage', 'livreur', 'Colis scellé au ramassage', 'Flore N. · Mboa Logistique', T(-54 * 60), 'Biyem-Assi · ±4 m', 'Pochette S · BV 24 8221', img('colis')),
      pc('pn', 'systeme', 'Trajet', 'entreprise', 'Panne déclarée PN-0031', 'Mboa Logistique', T(-53 * 60), 'Biyem-Assi', 'Moto en panne : tournée reportée au lendemain, clients prévenus par SMS'),
      pc('rem', 'photo', 'Remise', 'livreur', 'Remise à domicile', 'Flore N. · Mboa Logistique', T(-31 * 60), 'Biyem-Assi · ±7 m', 'Colis remis en main propre', { ...img('porte', 'or'), distanceM: 7 }),
      pc('code', 'code', 'Remise', 'livreur', 'Code de réception validé', 'Flore N. · Mboa Logistique', T(-31 * 60), 'Biyem-Assi', 'Code du client saisi'),
      pc('cl1', 'message', 'Client', 'client', 'Message du client', 'Client ••• 4217', T(-29 * 60), null, '« Livré le lendemain, sans explication. »'),
    ],
    relais: null,
    commission: commissionDe(12000),
    auteur: null,
    lies: [],
    cause: 'Panne déclarée PN-0031',
  },
]

// ── Litiges venus du pont (client → vendeur → console) ─────────────────────────────────────────────────────────
type Ev<T extends Evenement['type']> = Extract<Evenement, { type: T }>
const SOUHAIT: Record<Ev<'claim.opened'>['souhait'], string> = { rembourse: 'Attend un remboursement', remplace: 'Attend un remplacement', signal: 'Signale le problème' }
const POSTURE: Record<Ev<'claim.answered'>['posture'], string> = { accepte: 'Accepte le retour', arrangement: 'Propose un arrangement', conteste: 'Conteste' }

/** Ce que le pont dit d'un dossier ouvert par le client : la commande payée, la réponse du vendeur, le retour, l'issue. */
function lirePont() {
  const ev = evenementsPour('admin')
  const de = <T extends Evenement['type']>(t: T) => ev.filter((e): e is Ev<T> => e.type === t)
  const ouverts = new Map<string, Ev<'claim.opened'>>()
  for (const e of de('claim.opened')) if (!ouverts.has(e.dossier)) ouverts.set(e.dossier, e)
  return [...ouverts.values()].map((o) => {
    const paye = de('order.paid').find((e) => e.commande === o.commande) ?? null
    const colis = paye?.colis.find((c) => c.colis === o.colis) ?? paye?.colis[0] ?? null
    const reponse = de('claim.answered').find((e) => e.dossier === o.dossier) ?? null
    const rendu = de('parcel.returned').find((e) => e.colis.includes(o.colis)) ?? null
    const issue = de('return.closed').find((e) => e.colis === o.colis) ?? null
    const publie = de('package.published').find((e) => e.colis.includes(o.colis)) ?? null
    const affecte = de('package.assigned').find((e) => e.colis.includes(o.colis)) ?? null
    // Preuves de la chaîne, telles que les applis les publient (livreur, relais, vendeur) : le poste les lit.
    const pret = de('suborder.ready').find((e) => e.colis === o.colis) ?? null
    const ramasse = de('parcel.collected').find((e) => e.colis.includes(o.colis)) ?? null
    const depot = de('relay.drop.item_result').find((e) => e.colis === o.colis) ?? null
    const livre = de('parcel.delivered').find((e) => e.colis.includes(o.colis)) ?? null
    const remis = de('handover.completed').find((e) => e.colis === o.colis) ?? null
    return { o, paye, colis, reponse, rendu, issue, pret, ramasse, depot, livre, remis, paquet: publie?.paquet ?? affecte?.paquet ?? null, entreprise: affecte ? (affecte.entreprise === ACTEURS_DEMO.entreprise.id ? ACTEURS_DEMO.entreprise.nom : affecte.entreprise) : null }
  })
}
type Pont = ReturnType<typeof lirePont>[number]

function statiquePont(x: Pont): Statique {
  const { o, paye, colis, reponse, rendu } = x
  const vendeur = colis?.boutique ?? ACTEURS_DEMO.vendeur.vitrine
  const montant = colis ? colis.lignes.reduce((n, l) => n + l.prix * l.qte, 0) : 0
  const paiement = paye?.payableAuRetrait ? 'Payable au retrait' : 'Mobile Money · moyen d’origine'
  const client = 'Client •••'
  const preuves: PreuveGarde[] = [p('cl1', 'client', o.photos > 1 ? `${o.photos} photos du client` : 'Photo du client', client, o.le, paye?.lieu ?? '—', o.motif, o.photos > 0)]
  if (reponse) preuves.push(p('v1', 'vendeur', 'Réponse du vendeur', vendeur, reponse.le, '—', POSTURE[reponse.posture] + (reponse.retour ? ` · retour ${reponse.retour}` : ''), false))
  if (rendu) preuves.push(p('r1', 'vendeur', 'Colis rendu au vendeur', vendeur, rendu.le, '—', `Paquet ${rendu.paquet}${rendu.photo ? ' · photo' : ''} · inspection sous ${R.inspectionH} h`, rendu.photo))
  return {
    id: o.dossier,
    commande: o.commande,
    client: 'pont',
    vendeur,
    zone: paye?.zone ?? ACTEURS_DEMO.vendeur.zone,
    montantEnJeu: montant,
    motif: o.motif,
    article: colis ? colis.lignes.map((l) => l.titre).join(' · ') : o.colis,
    trajet: `${vendeur} → ${paye?.lieu ?? '—'}`,
    paiement,
    etiquette: null,
    paquet: x.paquet,
    entreprise: x.entreprise,
    ouvertLe: o.le,
    preuves,
    frise: [
      ...(paye ? [{ t: 'Payée', le: paye.le }] : []),
      { t: 'Litige', le: o.le },
      ...(reponse ? [{ t: 'Vendeur', le: reponse.le }] : []),
      ...(rendu ? [{ t: 'Retour', le: rendu.le }] : []),
    ],
    croisement: { colonnes: ['Critère', client, vendeur], lignes: [['Souhait', SOUHAIT[o.souhait], '—'], ['Réponse', '—', reponse ? POSTURE[reponse.posture] : 'Pas encore']], alerteFraude: false, note: '' },
    positionsBase: [
      { partie: 'client', nom: client, etat: SOUHAIT[o.souhait], texte: `« ${o.motif} »`, le: o.le },
      { partie: 'vendeur', nom: vendeur, etat: reponse ? POSTURE[reponse.posture] : 'Pas encore répondu', texte: null, le: reponse?.le ?? null },
    ],
    regle: null,
    constatRelais: false,
    ...posteDuPont(x, vendeur, client, montant),
  }
}

/** Type d'un litige d'après le motif écrit par le client (le serveur le recevra typé). */
export function typeDuMotif(m: string): TypeLitige {
  const t = m.toLowerCase()
  if (/re[çc]u|arriv|livr[ée] nulle|jamais/.test(t)) return 'non_recu'
  if (/manqu/.test(t)) return 'manquant'
  if (/retard/.test(t)) return 'retard'
  if (/ab[iî]m|cass|fissur|fendu|tach|mouill|[ée]cras|ray[ée]/.test(t)) return 'abime'
  return 'non_conforme'
}

/** Faits et pièces d'un litige venu du pont : chaque preuve publiée par une appli devient une pièce. */
function posteDuPont(x: Pont, vendeur: string, client: string, montant: number): Pick<Statique, 'type' | 'faits' | 'pieces' | 'relais' | 'commission' | 'auteur' | 'lies' | 'cause'> {
  const { o, paye, reponse, pret, ramasse, depot, livre, remis } = x
  const domicile = paye?.mode === 'domicile'
  const livreur = `${ACTEURS_DEMO.livreur.vu} · ${x.entreprise ?? ACTEURS_DEMO.entreprise.nom}`
  const pieces: PieceDossier[] = []
  const de = (q: PieceDossier) => pieces.push({ ...q, source: 'pont' })
  if (pret) de(pc('pret', 'photo', 'Préparation', 'vendeur', 'Colis prêt', vendeur, pret.le, pret.lieu, pret.photo ? 'Photo du colis emballé par le vendeur' : 'Sans photo du vendeur', pret.photo ? img('colis') : { manquante: true }))
  if (ramasse) de(pc('ram1', 'photo', 'Ramassage', 'livreur', 'Colis ramassé', livreur, ramasse.le, ACTEURS_DEMO.vendeur.point, 'Contrôle et photo du livreur, code de remise du vendeur validé', { ...img('colis'), colis: o.colis }))
  if (depot) de(pc('dep', depot.photos ? 'photo' : 'scan', 'Dépôt au relais', 'relais', depot.resultat === 'controle' ? 'Reçu au relais' : 'Reçu avec réserve', paye?.lieu ?? 'Relais', depot.le, paye?.lieu ?? null, depot.motif ?? (depot.resultat === 'controle' ? 'Scellé intact, sans réserve' : `Résultat : ${depot.resultat}`), depot.photos ? img(depot.resultat === 'controle' ? 'colis' : 'colis_abime', depot.resultat === 'controle' ? 'sable' : 'rouge') : {}))
  if (livre) de(pc('rem', 'photo', 'Remise', 'livreur', 'Remise à domicile', livreur, livre.le, paye?.lieu ?? null, livre.photo ? 'Photo prise à la remise' : 'Aucune photo à la remise', livre.photo ? img('porte') : { manquante: true }))
  if (remis) de(pc('code', 'code', 'Remise', domicile ? 'livreur' : 'relais', 'Code validé à la remise', paye?.lieu ?? 'Relais', remis.le, paye?.lieu ?? null, 'Code du client vérifié'))
  de(pc('cl1', o.photos ? 'photo' : 'message', 'Client', 'client', o.photos > 1 ? `${o.photos} photos du client` : o.photos ? 'Photo du client' : 'Message du client', client, o.le, null, `« ${o.motif} »`, o.photos ? img('produit_autre', 'gris') : {}))
  if (reponse) de(pc('v1', 'message', 'Vendeur', 'vendeur', 'Réponse du vendeur', vendeur, reponse.le, null, POSTURE[reponse.posture] + (reponse.retour ? ` · retour ${reponse.retour}` : '')))
  const faits: FaitsLitige = {
    mode: domicile ? 'domicile' : 'relais',
    photoRamassage: !!ramasse,
    contenuRamassage: null,
    emballage: pret ? pret.photo : null,
    scelle: domicile ? null : depot ? (depot.resultat === 'controle' ? 'intact' : 'reserve') : null,
    photoRemise: domicile ? !!livre?.photo : !!remis,
    codeRemise: !!remis || (domicile && !!livre),
    distanceRemiseM: null,
    heuresCoherentes: ramasse && (livre || remis) ? true : null,
    appels: null,
    photosClient: o.photos,
    clientJoignable: null,
    reponseVendeur: reponse?.posture ?? null,
    retardH: null,
    causeRetard: null,
  }
  return { type: typeDuMotif(o.motif), faits, pieces, relais: domicile ? null : (paye?.lieu ?? null), commission: commissionDe(montant), auteur: null, lies: [], cause: null }
}

/** État d'un dossier du pont tant qu'aucun geste de la console ne l'a touché (R70). */
function dynamiquePont(x: Pont): Dynamique {
  const { reponse, issue } = x
  const etat: Dynamique['etat'] = issue ? (issue.issue === 'mediation' ? 'arbitrer' : 'clos') : reponse?.posture === 'conteste' ? 'arbitrer' : 'ouvert'
  return { niveau: 1, etat, vendeurRepondu: !!reponse, decision: null, recours: null, complements: [], attente: null, poste: postNeuf() }
}

/** Tous les dossiers : le jeu d'essai, puis ceux du pont (une fois par dossier) ; l'état gardé prime. */
function tous(): { s: Statique; d: Dynamique }[] {
  const e = litigesDemo.lire().dossiers
  const pont = lirePont().filter((x) => !STATIQUES.some((y) => y.id === x.o.dossier))
  return [...STATIQUES.filter((s) => e[s.id]).map((s) => ({ s, d: e[s.id] })), ...pont.map((x) => ({ s: statiquePont(x), d: e[x.o.dossier] ?? dynamiquePont(x) }))]
}

export const litigesDemo = magasin<{ dossiers: Record<string, Dynamique>; decisions7j: number[] }>('litiges', () => ({
  dossiers: {
    'LT-0412': { niveau: 1, etat: 'arbitrer', vendeurRepondu: true, decision: null, recours: null, complements: [], attente: null, poste: postNeuf() },
    'LT-0418': { niveau: 1, etat: 'ouvert', vendeurRepondu: false, decision: null, recours: null, complements: [], attente: null, poste: postNeuf() },
    'LT-0405': {
      niveau: 2,
      etat: 'recours',
      vendeurRepondu: true,
      decision: { option: 'rembourser', libelle: 'Rembourser', motif: 'Écran fissuré à l’ouverture, photo du client 20 min après la remise ; aucune preuve contraire au dossier.', par: 'Clarisse Mvondo · Support client', le: T(-3 * 24 * 60), etat: 'contresignee', quatreYeux: 'QY-0005', suites: ['Client : remboursement RB-0029 de 112 000 F vers MTN MoMo ···· 20 (moyen d’origine)'] },
      recours: { par: 'Techno Bastos', le: T(-20 * 60), texte: 'La photo de remise au comptoir manque : la charge ne peut pas revenir au vendeur.', echeance: T(-20 * 60) + R.mediateurJ * JOUR },
      complements: [],
      attente: null,
      poste: postNeuf(),
    },
    'LT-0399': {
      niveau: 1,
      etat: 'decide',
      vendeurRepondu: true,
      decision: { option: 'debouter', libelle: 'Débouter', motif: 'La photo C1 montre une date de péremption de mars 2027 ; le produit remis n’est pas périmé.', par: 'Clarisse Mvondo · Support client', le: T(-4 * 24 * 60), etat: 'appliquee', quatreYeux: null, suites: ['Client et vendeur : SMS de décision', 'Vendeur : aucun effet sur le Trust Score'] },
      recours: null,
      complements: [],
      attente: null,
      poste: postNeuf(),
    },
    'LT-0421': { niveau: 1, etat: 'arbitrer', vendeurRepondu: true, decision: null, recours: null, complements: [], attente: null, poste: postNeuf() },
    'LT-0424': { niveau: 1, etat: 'arbitrer', vendeurRepondu: true, decision: null, recours: null, complements: [], attente: null, poste: postNeuf() },
    'LT-0427': { niveau: 1, etat: 'arbitrer', vendeurRepondu: true, decision: null, recours: null, complements: [], attente: null, poste: postNeuf() },
    'LT-0430': { niveau: 1, etat: 'arbitrer', vendeurRepondu: true, decision: null, recours: null, complements: [], attente: null, poste: postNeuf() },
    'LT-0431': { niveau: 1, etat: 'arbitrer', vendeurRepondu: true, decision: null, recours: null, complements: [], attente: null, poste: postNeuf() },
  },
  // Durées (heures) entre ouverture et décision des dossiers décidés ces 7 derniers jours (délai médian, ADM-RG-R19).
  decisions7j: [14, 16, 22, 48],
}))

const trouver = (id: string) => tous().find((x) => x.s.id === id)
const DECIDEURS: Record<1 | 2, Role[]> = { 1: ['superviseur', 'support'], 2: ['superviseur', 'mediation'] }

/** Le rôle voit-il ce dossier (niveau, zone, constats des relais pour les Opérations) ? */
function visible(s: Statique, d: Dynamique, r: Role): boolean {
  if (!dansPerimetre(s.zone)) return false
  if (r === 'support') return d.niveau === 1
  if (r === 'mediation') return d.niveau === 2
  if (r === 'operations') return s.constatRelais
  return r === 'superviseur' || r === 'audit'
}

function echeanceDe(s: Statique, d: Dynamique): number {
  const base = d.recours ? d.recours.echeance : (() => {
    const vendeur = s.ouvertLe + R.vendeurH * HEURE
    return d.vendeurRepondu || maintenant() >= vendeur ? vendeur + R.decisionH * HEURE : vendeur
  })()
  // Une prolongation (champ de manœuvre, une fois) repousse l'échéance de décision, jamais celle du vendeur.
  return d.poste.prolongeJusqua && d.poste.prolongeJusqua > base ? d.poste.prolongeJusqua : base
}

function court(s: Statique, d: Dynamique): LitigeCourt {
  const vendeurEcheance = s.ouvertLe + R.vendeurH * HEURE
  const silencieux = !d.vendeurRepondu && maintenant() >= vendeurEcheance
  return {
    id: s.id,
    commande: s.commande,
    niveau: d.niveau,
    motif: s.motif,
    client: masque(s.client),
    vendeur: s.vendeur,
    zone: s.zone,
    montantEnJeu: s.montantEnJeu,
    ouvertLe: s.ouvertLe,
    echeance: echeanceDe(s, d),
    etat: d.etat === 'ouvert' && silencieux ? 'arbitrer' : d.etat,
    alerte: d.recours && d.etat === 'recours' ? 'En recours' : silencieux ? 'Vendeur silencieux · présomption client' : d.etat === 'arbitrer' && d.vendeurRepondu && s.faits.reponseVendeur === 'conteste' ? 'Contesté par le vendeur' : d.poste.transmission && d.etat !== 'decide' ? `Transmis · ${d.poste.transmission.vers}` : null,
  }
}

/** Options et leurs effets, calculés comme le serveur (montants jamais saisis). */
function options(s: Statique, d: Dynamique, peut: boolean, tot: boolean): OptionDecision[] {
  const m = s.montantEnJeu
  const seuil = R.seuilQuatreYeux
  const recours = d.etat === 'recours'
  const part = Math.round(m / 2)
  // R72 : le client qui n'est pas en faute récupère aussi ses frais Mobile Money (rien à rendre s'il a payé au retrait).
  const frais = s.paiement === 'Payable au retrait' ? 0 : fraisClient(m)
  const avecFrais = frais ? ` + ${F(frais)} F de frais Mobile Money` : ''
  const base: OptionDecision[] = [
    { id: 'rembourser', libelle: recours ? 'Confirmer le remboursement' : 'Rembourser', effet: `${F(m)} F${avecFrais} rendus au client vers ${s.paiement}, le moyen d’origine, dès le colis récupéré et inspecté (${R.inspectionH} h au plus, sinon d’office) ; commission annulée ; course de retour de ${F(R.retourTrajet)} F au vendeur.`, montant: m + frais, quatreYeux: m + frais > seuil, permise: true },
    { id: 'remplacer', libelle: 'Remplacer', effet: 'Même article, envoyé à nouveau aux frais du vendeur ; aucun argent ne sort de l’escrow.', montant: null, quatreYeux: false, permise: !recours, raison: recours ? 'Pas en recours : la décision porte sur la charge, plus sur le produit.' : undefined },
    { id: 'partager', libelle: 'Partager', effet: `${F(part)} F rendus au client vers ${s.paiement} ; le reste versé au vendeur ; répartition calculée par le serveur.`, montant: part, quatreYeux: part > seuil, permise: true },
    { id: 'debouter', libelle: recours ? 'Accueillir le recours du vendeur' : 'Débouter', effet: recours ? 'Le vendeur est rétabli dans sa vente ; la charge du remboursement déjà fait reste à BelivaY ou au transporteur selon les preuves.' : 'Le client garde le produit ; rien n’est remboursé ; le vendeur est payé à la libération.', montant: 0, quatreYeux: false, permise: true },
    { id: 'transporteur', libelle: 'Mettre en cause le transporteur', effet: `${F(m)} F${avecFrais} rendus au client vers ${s.paiement} ; retenue sur le versement de ${s.entreprise ?? 'l’entreprise'}, dans la limite du plafond de son palier ; le vendeur est payé.`, montant: m + frais, quatreYeux: m + frais > seuil, permise: !!s.entreprise, raison: s.entreprise ? undefined : 'Aucune entreprise de livraison sur ce dossier.' },
  ]
  return base.map((o) => (peut && !tot ? o : { ...o, permise: false, raison: o.raison ?? (tot ? 'Le vendeur peut encore répondre.' : 'Réservé au niveau qui tranche ce dossier.') }))
}

function dossier(s: Statique, d: Dynamique): LitigeDossier {
  const r = roleCourant()
  const c = court(s, d)
  const vendeurEcheance = s.ouvertLe + R.vendeurH * HEURE
  const tot = c.etat === 'ouvert'
  const monNiveau = DECIDEURS[d.niveau].includes(r)
  const decidable = monNiveau && (c.etat === 'arbitrer' || c.etat === 'recours') && !d.attente
  const positions = s.positionsBase.map((x) => (x.partie === 'vendeur' && !d.vendeurRepondu && maintenant() >= vendeurEcheance ? { ...x, etat: 'Silencieux · délai dépassé' } : x))
  return {
    ...c,
    paiement: s.paiement,
    article: s.article,
    trajet: s.trajet,
    etiquette: s.etiquette,
    paquet: s.paquet,
    echeanceVendeur: vendeurEcheance,
    vendeurRepondu: d.vendeurRepondu,
    preuves: s.preuves.length ? s.preuves : s.pieces.filter((x) => x.nature === 'photo' || x.nature === 'scan' || x.nature === 'constat').map(versPreuve),
    frise: s.frise.map((f, i) => ({ ...f, st: i === s.frise.length - 1 ? 'cur' : f.t.startsWith('Litige') || f.t.startsWith('Recours') ? 'bad' : 'done' })),
    croisement: s.croisement,
    positions,
    proposition: tot ? null : s.regle,
    options: options(s, d, decidable, tot),
    decision: d.decision,
    recours: d.recours,
    complements: d.complements,
    monNiveau,
    attente: d.attente,
    vue: monNiveau && c.etat !== 'decide' ? 'decider' : 'lecture',
    escrow: c.etat === 'decide' ? (d.decision?.option === 'debouter' ? 'Libéré au vendeur à la fermeture du droit de retour' : 'Rendu au client au moyen d’origine') : 'Gelés · sans date',
  }
}

/** Pièce du poste vue comme une preuve de garde (fiche de la File d'action). */
function versPreuve(x: PieceDossier): PreuveGarde {
  const point: PreuveGarde['point'] = x.etape === 'Ramassage' ? 'C1' : x.etape === 'Dépôt au relais' ? 'C2' : x.etape === 'Remise' ? 'C3' : x.partie === 'client' ? 'client' : x.partie === 'vendeur' ? 'vendeur' : x.partie === 'relais' ? 'gerant' : 'entreprise'
  return { id: x.id, point, quoi: x.titre, par: x.par, le: x.le, lieu: x.lieu ?? '—', photo: !!x.image, note: x.note, saisieLe: x.saisieLe, ...(x.manquante ? { manquante: true } : {}) }
}

function lire(id: string): { s: Statique; d: Dynamique } {
  const x = trouver(id)
  if (!x) throw new Error(`litige inconnu : ${id}`)
  // Un dossier du pont entre dans l'état gardé au premier geste de la console.
  if (!litigesDemo.lire().dossiers[id]) litigesDemo.ecrire((e) => void (e.dossiers[id] = structuredClone(x.d)))
  return { s: x.s, d: litigesDemo.lire().dossiers[id] }
}

const LIBELLES: Record<OptionLitige, string> = { rembourser: 'Rembourser', remplacer: 'Remplacer', partager: 'Partager', debouter: 'Débouter', transporteur: 'Mettre en cause le transporteur' }

/** Applique une décision (tout de suite, ou à la contresignature) : état, suites vers les espaces, journal. */
function appliquer(id: string, option: OptionLitige, motif: string, par: string, le: number, quatreYeux: string | null) {
  const { s, d } = lire(id)
  const o = options(s, d, true, false).find((x) => x.id === option)!
  const suites = [
    `Client et vendeur : SMS de décision (${LIBELLES[option]}) avec le motif`,
    o.montant ? `Client : ${F(o.montant)} F vers ${s.paiement}, le moyen d’origine${option === 'rembourser' ? ', après retour et inspection' : ''}` : 'Escrow : aucun argent rendu au client',
    option === 'transporteur' ? `${s.entreprise} : retenue sur son prochain versement, dans la limite de son plafond` : option === 'debouter' ? 'Vendeur : aucun effet sur le Trust Score' : 'Vendeur : litige perdu, compté au Trust Score',
    `Recours possible une fois, sous ${R.recoursH} h (Médiation)`,
  ]
  litigesDemo.ecrire((e) => {
    const x = e.dossiers[id]
    x.etat = 'decide'
    x.attente = null
    x.decision = { option, libelle: LIBELLES[option], motif, par, le, etat: quatreYeux ? 'contresignee' : 'appliquee', quatreYeux, suites }
    e.decisions7j.push(Math.max(1, Math.round((le - s.ouvertLe) / HEURE)))
  })
  // Client et vendeur : décision et motif ; entreprise : retenue si le transporteur est en cause.
  publier({ type: 'litige_decide', id, commande: s.commande, decision: option, motif, montant: o.montant ?? null, transporteurEnCause: option === 'transporteur' }, `admin-litige-${id}`, le)
}

// À la contresignature d'un litige à quatre yeux, la décision s'applique ; au refus, le dossier revient à l'arbitrage.
effetQuatreYeux('litige.', (objet, q: DecisionQuatreYeux) => {
  const option = q.action.split('.')[1] as OptionLitige
  if (q.etat === 'contresignee') appliquer(objet, option, q.motif, `${q.premier.agent} · ${q.second?.agent}`, maintenant(), q.id)
  else litigesDemo.ecrire((e) => void (e.dossiers[objet].attente = null))
})

const motifValable = (m: string) => m.trim().length >= PARAMETRES.console.motifMin

// ── Délais de R70 (BV-DEV v2.0, décision finale du 21/09/2026), tenus par la source à chaque lecture ────────────────
// « Client silencieux 5 jours : litige clos » (LIT-CLIENT-SILENCE-J) ; « Remplacement : 72 h ouvrées, puis
// remboursement » (RET-REMPL-DELAI : 72 h ouvrées, dimanche non compté). Le silence du vendeur (48 h, LIT-VENDEUR-H)
// renvoie déjà à l'arbitrage (court()). Une fois chacun ; le système signe la ligne du journal.
const CLIENT_SILENCE_J = entier(REGISTRE, 'LIT-CLIENT-SILENCE-J', /^jours/)
const REMPL_H = Number(/^(\d+)\s*h/.exec(valeur(REGISTRE, 'RET-REMPL-DELAI'))?.[1] ?? NaN)
/** Échéance après `h` heures ouvrées à Yaoundé, le dimanche non compté. */
export function plusHeuresOuvrees(debut: number, h: number): number {
  let t = debut
  let reste = h * HEURE
  while (reste > 0) {
    const jour = new Date(t + HEURE).getUTCDay() // 0 : dimanche à Yaoundé
    const finJour = Date.UTC(new Date(t + HEURE).getUTCFullYear(), new Date(t + HEURE).getUTCMonth(), new Date(t + HEURE).getUTCDate() + 1) - HEURE
    if (jour === 0) {
      t = finJour
      continue
    }
    const pas = Math.min(reste, finJour - t)
    t += pas
    reste -= pas
  }
  return t
}
async function echeancesR70() {
  const n = maintenant()
  for (const { s, d } of tous()) {
    if (d.etat === 'decide' && d.decision?.option === 'remplacer' && Number.isFinite(REMPL_H) && n > plusHeuresOuvrees(d.decision.le, REMPL_H) && !d.decision.suites.some((x) => x.startsWith('R70'))) {
      const motif = `R70 : remplacement non fait sous ${REMPL_H} h ouvrées, remboursement du client`
      litigesDemo.ecrire((e) => void e.dossiers[s.id].decision!.suites.push(motif))
      const o = options(s, d, true, false).find((x) => x.id === 'rembourser')
      publier({ type: 'litige_decide', id: s.id, commande: s.commande, decision: 'rembourser', motif, montant: o?.montant ?? null, transporteurEnCause: false }, `admin-litige-${s.id}-r70-remplacement`, n)
      await journaliserSysteme({ action: 'litige.r70_remplacement', objet: s.id, motif, zone: s.zone, avant: 'Remplacer', apres: 'Rembourser' })
    }
    const demande = [...d.complements].reverse().find((c) => c.partie === 'client')
    if (demande && d.etat !== 'decide' && n > demande.le + CLIENT_SILENCE_J * JOUR) {
      const motif = `R70 : client silencieux ${CLIENT_SILENCE_J} jours après la demande de complément, litige clos`
      litigesDemo.ecrire((e) => {
        const x = e.dossiers[s.id]
        x.etat = 'decide'
        x.decision = { option: 'debouter', libelle: LIBELLES.debouter, motif, par: 'Système BelivaY', le: n, etat: 'appliquee', quatreYeux: null, suites: ['Client et vendeur : SMS de clôture', 'Vendeur : aucun effet sur le Trust Score'] }
      })
      publier({ type: 'litige_decide', id: s.id, commande: s.commande, decision: 'debouter', motif, montant: null, transporteurEnCause: false }, `admin-litige-${s.id}-r70-silence`, n)
      await journaliserSysteme({ action: 'litige.r70_silence_client', objet: s.id, motif, zone: s.zone, avant: d.etat, apres: 'Clos' })
    }
  }
}

export const demoLitiges: DomaineLitiges = {
  async liste() {
    exigerPage('litige', 'Litiges')
    await echeancesR70()
    const r = roleCourant()
    return repondre(tous().filter((x) => visible(x.s, x.d, r)).map((x) => court(x.s, x.d)))
  },
  async litige(id) {
    exigerPage('litige', 'Litiges')
    await echeancesR70()
    const x = trouver(id)
    if (!x || !visible(x.s, x.d, roleCourant())) return repondre(null)
    return repondre(dossier(x.s, x.d))
  },
  async decider(id, option, motif) {
    exiger('litige.decider')
    const { s, d } = lire(id)
    const r = roleCourant()
    if (!visible(s, d, r) || !DECIDEURS[d.niveau].includes(r)) throw new AccesRefuse('Trancher ce litige', DECIDEURS[d.niveau])
    // Périmètre de l'agent (ACCES-CONSOLE § 2) : un Agent des litiges tranche le niveau 1 seulement.
    const perimetre = etatMembre(agentCourant().id)?.perimetre
    if (r !== 'superviseur' && perimetre?.niveauLitige && d.niveau > perimetre.niveauLitige) throw new AccesRefuse(`Trancher un litige de niveau ${d.niveau} (périmètre : niveau ${perimetre.niveauLitige})`, DECIDEURS[d.niveau])
    if (d.etat === 'decide' || d.attente) return { ok: false, raison: 'deja_decide' }
    if (court(s, d).etat === 'ouvert') return { ok: false, raison: 'trop_tot' }
    const o = options(s, d, true, false).find((x) => x.id === option)
    if (!o || !o.permise) return { ok: false, raison: 'non_permise' }
    // Décisions encadrées (DECISIONS-ENCADREES.md § 3) : la même règle que le poste de travail bloque ici aussi une
    // issue qui impute une partie disculpée ou sort de la liste du type, et l'auteur ou un agent lié à une partie.
    const a0 = agentCourant().id
    if (s.auteur === a0 || s.lies.includes(a0) || d.poste.transmission?.parId === a0) return { ok: false, raison: 'non_permise', detail: 'Un autre compte tranche ce dossier.' }
    const bloque = lecturePoste(s, d).issues.find((x) => x.id === ISSUE_DE_OPTION(option, s, d) && x.etat === 'bloquee')
    if (bloque) return { ok: false, raison: 'non_permise', detail: bloque.raison ?? undefined }
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const a = agentCourant()
    const auDelaPlafond = r !== 'superviseur' && perimetre?.plafond != null && (o.montant ?? 0) > perimetre.plafond
    if (o.quatreYeux || auDelaPlafond) {
      const q = await demanderSecond({ action: `litige.${option}`, objet: id, resume: `${s.id} · ${o.libelle} : ${o.effet}`, motif: motif.trim(), preuves: [{ id: 'cmd', libelle: `Commande ${s.commande}`, route: 'commandes', params: { ref: s.commande } }, { id: 'dos', libelle: `Dossier ${s.id}`, route: 'litige', params: { id: s.id } }], montant: o.montant, quatreYeux: true, rolesSecond: ['finance', 'superviseur'] })
      litigesDemo.ecrire((e) => void (e.dossiers[id].attente = q))
      return { ok: true, etat: 'a_contresigner', id: q }
    }
    await journaliser({ action: `litige.${option}`, objet: id, motif: motif.trim(), zone: s.zone })
    appliquer(id, option, motif.trim(), nomAgent(a), maintenant(), null)
    return { ok: true, etat: 'appliquee', id }
  },
  async escalader(id, motif) {
    exiger('litige.decider')
    const { s, d } = lire(id)
    if (!DECIDEURS[1].includes(roleCourant())) throw new AccesRefuse('Passer un litige en médiation', DECIDEURS[1])
    if (d.niveau === 2) return { ok: false, raison: 'deja_niveau_2' }
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    litigesDemo.ecrire((e) => void (e.dossiers[id].niveau = 2))
    await journaliser({ action: 'litige.escalader', objet: id, motif: motif.trim(), zone: s.zone })
    return { ok: true }
  },
  async demanderComplement(id, partie, motif) {
    exiger('litige.decider')
    const { s } = lire(id)
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const a = agentCourant()
    litigesDemo.ecrire((e) => void e.dossiers[id].complements.push({ partie, motif: motif.trim(), le: maintenant(), par: nomAgent(a) }))
    await journaliser({ action: 'litige.complement', objet: `${id} · ${partie}`, motif: motif.trim(), zone: s.zone })
    return { ok: true }
  },
}

/** Pour la File d'action et la vue d'ensemble : dossiers non décidés, avec leur échéance et le rôle qui tranche. */
export function litigesOuverts() {
  return tous()
    .filter(({ d }) => d.etat !== 'decide' && d.etat !== 'clos')
    .map(({ s, d }) => ({ ...court(s, d), attente: d.attente, voir: (r: Role) => visible(s, d, r) && pageOuverte('litige', r) }))
}
/** Médiane (heures) des délais d'arbitrage des 7 derniers jours. */
export function delaiMedian(): { h: number | null; n: number } {
  const l = [...litigesDemo.lire().decisions7j].sort((a, b) => a - b)
  if (!l.length) return { h: null, n: 0 }
  const m = l.length % 2 ? l[(l.length - 1) / 2] : (l[l.length / 2 - 1] + l[l.length / 2]) / 2
  return { h: Math.round(m), n: l.length }
}
/** Issue décidée du litige d'une commande (null : aucun litige décidé) : la commande suit la décision. */
export function issueDe(commande: string): OptionLitige | null {
  const d = tous().find((x) => x.s.commande === commande)?.d
  return d?.etat === 'decide' && d.decision ? d.decision.option : null
}

// ── Poste de travail (logique-metier/DECISIONS-ENCADREES.md) : lu par src/demo/decisions.ts ───────────────────────────
/** Issue du poste qui correspond à une option de l'ancien arbitrage (rembourser : la charge que la règle suggère). */
export function ISSUE_DE_OPTION(option: OptionLitige, s: Statique, d: Dynamique): string {
  if (option === 'transporteur') return 'rembourser_transporteur'
  if (option === 'partager') return 'partiel'
  if (option === 'rembourser') {
    const sug = lecturePoste(s, d).lecture.suggestion.issue
    return sug && sug.startsWith('rembourser') ? sug : 'rembourser_vendeur'
  }
  return option
}
/** Option de l'ancien arbitrage d'une issue du poste (les autres espaces lisent ces mots : pont « litige_decide »). */
export const OPTION_DE_ISSUE: Record<string, OptionLitige> = { rembourser_vendeur: 'rembourser', rembourser_transporteur: 'transporteur', rembourser_relais: 'rembourser', partiel: 'partager', remplacer: 'remplacer', debouter: 'debouter', geste: 'debouter' }

/** Contrôles (avec les corrections de l'agent), lecture de la règle et issues d'un litige. */
export function lecturePoste(s: Statique, d: Dynamique) {
  const calc = controlesLitige(s.type, s.faits)
  const controles = calc.map((c) => {
    const k = d.poste.corrections[c.id]
    return { ...c, calcule: c.etat, etat: k?.etat ?? c.etat, confirme: d.poste.confirmes.includes(c.id) || !!k, corrige: k ? { par: k.par, le: k.le, de: k.de } : null }
  })
  const etats = Object.fromEntries(controles.map((c) => [c.id, c.etat])) as Record<string, EtatControle>
  const lecture = lireLitige(s.type, etats, s.faits)
  const recours = d.etat === 'recours'
  const frais = s.paiement === 'Payable au retrait' ? 0 : fraisClient(s.montantEnJeu)
  const contexte: ContexteLitige = { type: s.type, montant: s.montantEnJeu, paye: s.montantEnJeu + frais, fraisMomo: frais, commission: s.commission, entreprise: s.entreprise, relais: s.relais, paiement: s.paiement, recours }
  const geste = PARAMETRES.decisions.geste.responsable
  return { controles, etats, lecture, contexte, issues: issuesLitige(contexte, lecture, geste) }
}

export type LitigeInterne = { s: Statique; d: Dynamique }
/** Tous les dossiers (jeu d'essai et pont), pour le poste de travail. */
export const litigesInternes = (): LitigeInterne[] => tous()
export const litigeInterne = (id: string): LitigeInterne => lire(id)
export const litigeVisible = (x: LitigeInterne, r: Role) => visible(x.s, x.d, r)
export const litigeCourt = (x: LitigeInterne) => court(x.s, x.d)
export const DECIDEURS_LITIGE = DECIDEURS
export const masqueClient = masque
/** Modifie l'état du poste d'un dossier (contrôles, appels, prolongation, transmission). */
export function ecrirePoste(id: string, f: (d: Dynamique) => void) {
  lire(id)
  litigesDemo.ecrire((e) => f(e.dossiers[id]))
}
export type { Statique as StatiqueLitige, Dynamique as DynamiqueLitige }

/** Applique une décision du poste : état du dossier, suites vers les espaces (pont), même effet que l'arbitrage. */
export function appliquerPoste(id: string, dec: DecisionPoste, transporteurEnCause: boolean) {
  const { s } = lire(id)
  const option = OPTION_DE_ISSUE[dec.issue] ?? 'debouter'
  litigesDemo.ecrire((e) => {
    const x = e.dossiers[id]
    x.etat = 'decide'
    x.attente = null
    x.poste.decision = dec
    x.decision = { option, libelle: dec.libelle, motif: dec.note, par: dec.par, le: dec.le, etat: dec.quatreYeux ? 'contresignee' : 'appliquee', quatreYeux: dec.quatreYeux, suites: dec.suites }
    e.decisions7j.push(Math.max(1, Math.round((dec.le - s.ouvertLe) / HEURE)))
  })
  // Client et vendeur : la décision et son motif ; entreprise : retenue si elle est en cause ; un geste part à part.
  if (dec.issue === 'geste') publier({ type: 'geste', ticket: id, ref: s.commande, montant: dec.montant ?? 0 }, `admin-litige-${id}-geste`, dec.le)
  else publier({ type: 'litige_decide', id, commande: s.commande, decision: option, motif: dec.note, montant: dec.montant ?? null, transporteurEnCause }, `admin-litige-${id}`, dec.le)
}
