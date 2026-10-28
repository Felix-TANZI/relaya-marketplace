// Droits d'un accès employé (demande du porteur, 6 oct. ; EQU-01 à EQU-04, Q-17, Q-18, VD-EQUIPE-MAX) : le propriétaire
// coche, pour chaque employé, ce qu'il peut faire, regroupé par domaine. Rôles prédéfinis (Préparation — l'ancien accès
// unique —, Gestion du stock, Service client) ou personnalisé. Certains droits ne s'ouvrent JAMAIS à un employé, quoi
// que coche le propriétaire : ils restent affichés, verrouillés, avec la règle qui l'interdit.
// Le serveur applique les mêmes droits (403 owner_only / forbidden_right) : l'écran masque ou dit « Réservé », la
// source refuse de toute façon (démonstration : src/demo/session.ts, aLeDroit / avecDroit).
export type Droit =
  | 'commandes.voir'
  | 'commandes.preparer'
  | 'commandes.remettre'
  | 'produits.voir'
  | 'produits.stock'
  | 'produits.prix'
  | 'litiges.voir'
  | 'litiges.preuves'
  | 'litiges.repondre'
  | 'retours.inspecter'
  | 'messages.voir'
  | 'messages.repondre'
  | 'argent.voir'
  | 'boutique.fermer'
  | 'boutique.modifier'
  | 'equipe.gerer'

export type ProfilAcces = 'preparation' | 'stock' | 'service_client' | 'personnalise'

export interface DefinitionDroit {
  id: Droit
  libelle: string
  aide?: string
  /** Jamais pour un employé : la règle qui l'interdit (affichée, case verrouillée). */
  jamais?: string
  /** Droit qu'il faut aussi avoir (cocher « préparer » coche « voir »). */
  suppose?: Droit
}

export const GROUPES_DROITS: { id: string; titre: string; icone: string; droits: DefinitionDroit[] }[] = [
  {
    id: 'commandes',
    titre: 'Commandes',
    icone: 'package',
    droits: [
      { id: 'commandes.voir', libelle: 'Voir les commandes', aide: 'Sans le client : ni nom, ni numéro, ni adresse.' },
      { id: 'commandes.preparer', libelle: 'Préparer', aide: 'Bon, « C’est prêt », rupture, demande de délai.', suppose: 'commandes.voir' },
      { id: 'commandes.remettre', libelle: 'Remettre au livreur', aide: 'Code de remise et photos du colis.', suppose: 'commandes.voir' },
    ],
  },
  {
    id: 'produits',
    titre: 'Produits',
    icone: 'box',
    droits: [
      { id: 'produits.voir', libelle: 'Voir les produits', aide: 'Sans les prix ni ce que vous gardez.' },
      { id: 'produits.stock', libelle: 'Modifier le stock', aide: 'Entrées, sorties, inventaire, photos.', suppose: 'produits.voir' },
      { id: 'produits.prix', libelle: 'Modifier les prix', jamais: 'Les prix, la publication et les promotions restent au propriétaire (EQU-01).' },
    ],
  },
  {
    id: 'litiges',
    titre: 'Litiges et retours',
    icone: 'scale',
    droits: [
      { id: 'litiges.voir', libelle: 'Voir les litiges' },
      { id: 'litiges.preuves', libelle: 'Ajouter des preuves', aide: 'Photos et constats, signés à son nom.', suppose: 'litiges.voir' },
      { id: 'litiges.repondre', libelle: 'Répondre au litige', jamais: 'Accepter, contester ou proposer un arrangement reste au propriétaire (Q-17).' },
      { id: 'retours.inspecter', libelle: 'Recevoir et inspecter les retours', aide: 'Le choix remplacer ou rembourser reste au propriétaire.' },
    ],
  },
  {
    id: 'messages',
    titre: 'Messages',
    icone: 'message-circle',
    droits: [
      { id: 'messages.voir', libelle: 'Lire les messages' },
      { id: 'messages.repondre', libelle: 'Répondre aux clients', aide: 'Messagerie anonyme et filtrée, comme pour vous.', suppose: 'messages.voir' },
    ],
  },
  {
    id: 'argent',
    titre: 'Argent',
    icone: 'wallet',
    droits: [{ id: 'argent.voir', libelle: 'Argent, versements, documents, montants', jamais: 'Jamais pour un employé : aucun montant, aucun achat (Q-18).' }],
  },
  {
    id: 'boutique',
    titre: 'Boutique',
    icone: 'store',
    droits: [
      { id: 'boutique.fermer', libelle: '« Fermer aujourd’hui » et rouvrir le jour même' },
      { id: 'boutique.modifier', libelle: 'Horaires, emplacements, vitrine, identité', jamais: 'Réservé au propriétaire : l’employé les voit en lecture seule (Q-18).' },
    ],
  },
  {
    id: 'equipe',
    titre: 'Équipe',
    icone: 'users',
    droits: [{ id: 'equipe.gerer', libelle: 'Voir et gérer l’équipe', jamais: 'Ajouter, retirer ou changer un accès demande le code SMS du propriétaire (EQU-01).' }],
  },
]

export const DEFINITIONS: Record<Droit, DefinitionDroit> = Object.fromEntries(GROUPES_DROITS.flatMap((g) => g.droits.map((d) => [d.id, d]))) as Record<Droit, DefinitionDroit>

/** Droits qu'un employé ne reçoit jamais, quoi qu'on coche. */
export const JAMAIS_POUR_UN_EMPLOYE: Droit[] = GROUPES_DROITS.flatMap((g) => g.droits.filter((d) => d.jamais).map((d) => d.id))

/** Tous les droits : le propriétaire. */
export const TOUS_LES_DROITS: Droit[] = GROUPES_DROITS.flatMap((g) => g.droits.map((d) => d.id))

/** Rôles prédéfinis. « Préparation » reprend l'accès unique d'avant (EQU-01). */
export const PROFILS: Record<Exclude<ProfilAcces, 'personnalise'>, { titre: string; resume: string; droits: Droit[] }> = {
  preparation: {
    titre: 'Préparation',
    resume: 'Prépare, remet au livreur, gère le stock, ajoute des preuves, inspecte les retours.',
    droits: ['commandes.voir', 'commandes.preparer', 'commandes.remettre', 'produits.voir', 'produits.stock', 'litiges.voir', 'litiges.preuves', 'retours.inspecter', 'messages.voir', 'messages.repondre', 'boutique.fermer'],
  },
  stock: {
    titre: 'Gestion du stock',
    resume: 'Tient le stock et les photos ; voit les commandes pour savoir ce qui part.',
    droits: ['commandes.voir', 'produits.voir', 'produits.stock'],
  },
  service_client: {
    titre: 'Service client',
    resume: 'Répond aux messages, suit les commandes, ajoute des preuves aux litiges.',
    droits: ['commandes.voir', 'messages.voir', 'messages.repondre', 'litiges.voir', 'litiges.preuves'],
  },
}

export const NOM_PROFIL: Record<ProfilAcces, string> = { preparation: 'Préparation', stock: 'Gestion du stock', service_client: 'Service client', personnalise: 'Personnalisé' }

/** Droits retenus pour un employé : sans les interdits, avec les droits supposés (préparer ⇒ voir). Ordre du catalogue. */
export function normaliserDroits(droits: readonly Droit[]): Droit[] {
  const set = new Set(droits.filter((d) => !JAMAIS_POUR_UN_EMPLOYE.includes(d)))
  for (const d of [...set]) {
    const s = DEFINITIONS[d]?.suppose
    if (s) set.add(s)
  }
  return TOUS_LES_DROITS.filter((d) => set.has(d))
}

/** Le profil dont les droits sont exactement ceux-ci, sinon « personnalisé ». */
export function profilDe(droits: readonly Droit[]): ProfilAcces {
  const n = normaliserDroits(droits).join(',')
  for (const [k, p] of Object.entries(PROFILS)) if (normaliserDroits(p.droits).join(',') === n) return k as ProfilAcces
  return 'personnalise'
}

/** Droit qu'il faut pour OUVRIR une page (menu, barre latérale, tiroir, barre du bas, raccourcis de l'accueil) : une
 *  entrée sans le droit est masquée pour l'employé. Les droits « jamais » (argent, prix, équipe) ferment la page à tout
 *  employé. Une route absente d'ici reste ouverte (lecture seule : boutique, horaires, palier, avis, aide…). */
export const DROIT_DE_ROUTE: Record<string, Droit> = {
  commandes: 'commandes.voir',
  ramassages: 'commandes.voir',
  litiges: 'litiges.voir',
  retours: 'retours.inspecter',
  messages: 'messages.voir',
  questions: 'messages.voir',
  produits: 'produits.voir',
  stock: 'produits.voir',
  offre1: 'produits.prix',
  promotions: 'produits.prix',
  publicite: 'argent.voir',
  publicite_nouvelle: 'argent.voir',
  publicite_solde: 'argent.voir',
  chiffres: 'argent.voir',
  visibilite: 'argent.voir',
  plans_liste: 'argent.voir',
  argent: 'argent.voir',
  versements: 'argent.voir',
  se_libere: 'argent.voir',
  documents: 'argent.voir',
  ajustements: 'argent.voir',
  equipe: 'equipe.gerer',
}
