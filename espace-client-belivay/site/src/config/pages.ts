// Inventaire des pages du site (logique-metier/pages.json, via outils/site.py) et navigation de chaque
// page relevée dans le prototype affiché (outils/navigation.mjs).
import navigation from '../genere/navigation.json'
import pages from '../genere/pages.json'
import type { Interrupteur } from './interrupteurs'

export type Onglet = 'accueil' | 'categories' | 'panier' | 'sauvegardes' | 'compte'

export interface Page {
  route: string
  titre: string
  onglet: '' | Onglet | 'commandes'
  document: string
  phase: 'lancement' | 'après le lancement'
  interrupteur: Interrupteur | null
  documentee: boolean
  sections: string[]
  etats: { adresse: string; libelle: string }[]
  regles: number
  regles_etape4: string[]
  api: string[]
}

export interface ActionEntete {
  balise: 'a' | 'button' | 'span'
  classe: string
  adresse: string | null
  aria: string | null
  texte: string
  icone: string | null
  taille: number | null
}

export interface Navigation {
  entete: 'racine' | 'enfant' | 'aucun' | 'propre' // propre : l'écran écrit son en-tête (pages web de CL-14)
  titre: string // titre de l'en-tête enfant : celui du prototype, ou le nom du registre s'il porte une donnée
  sousTitre: string | null
  margeHaute: number // marge haute du contenu sous la zone sûre (prototype : moins sa barre d'état de 50 px)
  styleMain?: string
  classesApp?: string[]
  retour: string | null // parent naturel (CNV-03, CNV-10)
  droite: 'panier' | 'accueil' | 'propre' | null // CNV-03, CDS-04
  action?: ActionEntete // élément de droite propre à l'écran
  recherche: boolean // CNV-04
  bandeau: boolean // CNV-04, CDS-24
  barre: boolean // CNV-01, CNV-08
  calme?: boolean // barre du bas sans aucun badge (CNV-07, nouveau client)
  onglet: Onglet | null // onglet allumé (CNV-01)
  prototype: { titre: string | null; sousTitre: string | null; retour: string | null; droite: string[] }
  ecart?: string
}

// Pages propres au site, absentes du prototype, ajoutées par une décision du porteur (DP-52 : modifier son
// profil, avec un code de vérification). Même famille que « Changer de numéro » : écran enfant du compte.
const enfantDuCompte = (titre: string, retour: string): Navigation => ({
  entete: 'enfant',
  titre,
  sousTitre: null,
  margeHaute: 64,
  retour,
  droite: 'accueil',
  recherche: false,
  bandeau: false,
  barre: false,
  onglet: null,
  prototype: { titre: null, sousTitre: null, retour: null, droite: [] },
})
const pageDuSite = (route: string, titre: string, etats: string[]): Page => ({
  route,
  titre,
  onglet: '',
  document: 'CL-13',
  phase: 'lancement',
  interrupteur: null,
  documentee: false,
  sections: ['DP-52'],
  etats: etats.map((adresse) => ({ adresse, libelle: titre })),
  regles: 0,
  regles_etape4: [],
  api: [],
})
export const PAGES_SITE: Page[] = [
  pageDuSite('profil', 'Modifier mon profil', ['#profil', '#profil?st=code', '#profil?st=ok']),
  pageDuSite('confidentialite', 'Confidentialité et données', ['#confidentialite']),
  pageDuSite('securite', 'Numéro et connexion', ['#securite']),
  pageDuSite('profil-email', 'Changer d’e-mail', ['#profil-email', '#profil-email?etape=2', '#profil-email?etape=3', '#profil-email?st=ok']),
  // Diaspora (DP-54) : compte ouvert depuis l'étranger, lien famille avec l'accord du proche, commande pour lui.
  pageDuSite('inscription-diaspora', 'S’inscrire depuis l’étranger', ['#inscription-diaspora']),
  pageDuSite('proches', 'Mes proches', ['#proches']),
  pageDuSite('commander-pour', 'Commander pour un proche', ['#commander-pour']),
  pageDuSite('diaspora-infos', 'Comptes diaspora : tout savoir', ['#diaspora-infos']),
  // Espace diaspora (DP-54) : la page centrale ; les paniers envoyés à payer entre proches reliés.
  pageDuSite('espace-diaspora', 'Espace diaspora', ['#espace-diaspora']),
  pageDuSite('paniers-proches', 'À payer pour mes proches', ['#paniers-proches']),
  // Listes d'envies (DP-54) : mettre sa liste en statut (image 1080 × 1920, QR code, lien court).
  { ...pageDuSite('liste-statut', 'Mettre ma liste en statut', ['#liste-statut']), document: 'CL-14', interrupteur: 'FF-LISTE-ENVIES' },
  // Reçus (DP-54) : tout ce que des proches envoient au client (listes, paniers, cotisations, colis, invitations…)
  // et la vue de réception de chaque envoi, pour l'exécuter depuis son compte.
  pageDuSite('recus', 'Reçus', ['#recus', '#recus?vue=envoyes']),
  pageDuSite('recu', 'Envoi reçu', ['#recu?id=R-mariage', '#recu?id=R-panier', '#recu?id=R-colis']),
  // Lien reçu par e-mail après « Mot de passe oublié » (DP-04) : choisir le nouveau mot de passe.
  { ...pageDuSite('mdp-nouveau', 'Nouveau mot de passe', ['#mdp-nouveau']), document: 'CL-03' },
]

export const PAGES = [...(pages as Page[]), ...PAGES_SITE]
export const NAVIGATION = {
  ...(navigation as Record<string, Navigation>),
  profil: enfantDuCompte('Modifier mon profil', 'compte'),
  'profil-email': enfantDuCompte('Changer d’e-mail', 'profil'),
  securite: enfantDuCompte('Numéro et connexion', 'compte'),
  confidentialite: enfantDuCompte('Confidentialité et données', 'compte'),
  'inscription-diaspora': enfantDuCompte('S’inscrire depuis l’étranger', 'connexion'),
  proches: enfantDuCompte('Mes proches', 'compte'),
  'commander-pour': enfantDuCompte('Commander pour un proche', 'proches'),
  'diaspora-infos': enfantDuCompte('Comptes diaspora : tout savoir', 'inscription-diaspora'),
  'espace-diaspora': enfantDuCompte('Espace diaspora', 'compte'),
  'paniers-proches': enfantDuCompte('À payer pour mes proches', 'espace-diaspora'),
  'liste-statut': { ...enfantDuCompte('Mettre en statut', 'listes'), droite: null },
  recus: enfantDuCompte('Reçus', 'compte'),
  recu: enfantDuCompte('Envoi reçu', 'recus'),
  'mdp-nouveau': { ...(navigation as Record<string, Navigation>)['mdp-oublie'], titre: 'Nouveau mot de passe', retour: 'connexion-email' },
} as Record<string, Navigation>

// Fil d'Ariane des grands écrans (dès 1024) : le parent naturel relevé dans le prototype est celui du bouton de
// retour du téléphone (d'où l'on vient le plus souvent) ; il ne fait pas toujours un fil logique (« Favoris ›
// Liste de rentrée », « Connexion › S'inscrire depuis l'étranger »). Ces parents et ces noms ne valent que pour
// le fil et le bouton de retour nommé des grands écrans ; le téléphone garde son retour, au pixel.
export const ARIANE: Record<string, string> = {
  rentree: 'accueil', // un service de l'accueil, pas un favori
  'inscription-diaspora': 'diaspora',
  'diaspora-infos': 'diaspora',
  annuler: 'commande', // comme Modifier, Retourner, Code de retrait : une action sur la commande
  'annuler-confirmer': 'annuler',
  'changer-adresse': 'modifier', // comme Changer de relais
}
export const TITRES_ARIANE: Record<string, string> = {
  cote: 'Mettre de côté', // la feuille posée sur la fiche (sans produit, l'écran se nomme « Mises de côté »)
  listes: 'Listes d’envies',
}

// L'accueil vit à la racine du site ; toutes les autres pages à /<route>.
export function chemin(route: string, params?: Record<string, string>): string {
  const base = route === 'accueil' ? '/' : '/' + route
  const q = params ? new URLSearchParams(params).toString() : ''
  return q ? base + '?' + q : base
}

// Adresse d'un état du prototype (« #route?a=b ») vers l'adresse du site (CNV-14 : mêmes paramètres).
export function adresseDuSite(adresse: string): string {
  const [route, q] = adresse.replace(/^#/, '').split('?')
  return chemin(route) + (q ? '?' + q : '')
}

// Barre du bas (CNV-01) : cinq onglets ; les écrans de Mes commandes allument Compte.
export const ONGLETS: { id: Onglet; titre: string; icone: string }[] = [
  { id: 'accueil', titre: 'Accueil', icone: 'house' },
  { id: 'categories', titre: 'Catégories', icone: 'layout-grid' },
  { id: 'panier', titre: 'Panier', icone: 'shopping-cart' },
  { id: 'sauvegardes', titre: 'Sauvegardés', icone: 'heart' },
  { id: 'compte', titre: 'Compte', icone: 'user-round' },
]

// Pages qui demandent un compte (CAC-29 : un visiteur navigue librement, la connexion est demandée pour ce qui
// est à lui). Sans session, elles ouvrent la connexion, qui ramène ensuite à la page demandée (DP-53).
// Restent publiques : aide, questions fréquentes, pages légales, réglages, réseau, devenir vendeur, et le payeur
// à l'étranger (il n'a pas de compte).
export const EXIGE_COMPTE = new Set([
  'compte', 'question', 'profil', 'profil-email', 'securite', 'confidentialite', 'numero-changer', 'adresses', 'moyens-paiement', 'wallet', 'factures', 'supprimer', 'devenir-vendeur',
  'avis-donner', 'avis-bas', 'messagerie', 'fil', 'rappel', 'notifications', 'notifs-reglages',
  'commandes', 'commande', 'code', 'code-partage', 'suivi', 'garde', 'comptoir', 'comptoir-payer',
  'litiges', 'litige', 'litige-auto', 'litige-comptoir', 'litige-confirme', 'litige-suivi', 'litige-arrangement',
  'retour', 'remplacement', 'annuler', 'annuler-confirmer', 'modifier', 'changer-adresse', 'changer-relais',
  'proches', 'commander-pour', 'paniers-proches',
  // Listes d'envies (DP-54) : créer et régler sa liste demande un compte (un visiteur passe par l'inscription, qui
  // le ramène ici) ; la page publique d'une liste et l'offre d'un cadeau restent ouvertes à tous, sans compte.
  'liste-creer', 'liste-envies', 'liste-envoyer', 'liste-statut',
  // Reçus (DP-54) : ce qui a été envoyé au client se traite depuis son compte (sans compte : le lien public).
  'recus', 'recu',
])
