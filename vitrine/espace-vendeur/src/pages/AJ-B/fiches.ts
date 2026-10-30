// Fiches « Apprendre » (AJ-B, DP-58) : contenus courts, gérés dans la console comme l'aide (VD11-R63) ; ici le texte
// français de référence (traduit par AJ-B.en.json). Chaque fiche suit les règles du paquet et des décisions, sans
// aucun montant écrit : le prix minimum, le prix conseillé et « vous gardez » se lisent dans les écrans où l'on agit.
export interface Etape {
  titre: string
  texte: string
}
export interface Fiche {
  id: 'photos' | 'prix' | 'colis' | 'litiges' | 'palier'
  titre: string
  resume: string
  minutes: number
  icone: string
  illustration: { type: 'photo' | 'art'; nom: string } | null
  etapes: Etape[]
  retenir: string
  agir: { libelle: string; route: string; params?: Record<string, string>; proprio?: boolean }
  premierJour?: boolean // recommandée la première semaine
}

export const FICHES: Fiche[] = [
  {
    id: 'photos',
    titre: 'Bien photographier',
    resume: 'Des photos vraies et nettes : le client achète ce qu’il voit.',
    minutes: 2,
    icone: 'camera',
    illustration: { type: 'art', nom: 'itel' },
    premierJour: true,
    etapes: [
      { titre: 'La lumière du jour', texte: 'Placez-vous près d’une fenêtre, sans flash. Pas d’ombre sur l’article.' },
      { titre: 'Un fond uni et clair', texte: 'Un drap, un mur ou une feuille blanche : rien ne doit distraire le regard.' },
      { titre: 'L’article entier, puis les détails', texte: 'De face pour la couverture, puis le dos, l’étiquette, les accessoires et tout défaut.' },
      { titre: 'Votre article, jamais une image d’internet', texte: 'Chaque offre passe des contrôles automatiques : photo, doublon, prix anormal, description.' },
    ],
    retenir: 'Une photo vraie évite la plupart des litiges « ce n’est pas le bon produit ».',
    agir: { libelle: 'Ajouter un produit', route: 'offre1', proprio: true },
  },
  {
    id: 'prix',
    titre: 'Fixer son prix',
    resume: 'Le bon prix vend vite, sans jamais vous faire perdre.',
    minutes: 2,
    icone: 'tag',
    illustration: null,
    premierJour: true,
    etapes: [
      { titre: 'Regardez le prix conseillé', texte: 'Il est un peu sous la médiane des offres du même produit, jamais sous les moins chères.' },
      { titre: 'Pensez prix livré', texte: 'Le client compare le prix avec la livraison de sa zone : quelques francs font la différence.' },
      { titre: 'Lisez « vous gardez » en direct', texte: 'En tapant le prix, l’écran montre ce que vous gardez sur chaque vente, au palier du jour.' },
      { titre: 'Le prix automatique, si vous voulez', texte: 'Il ne fait que baisser, doucement, et jamais sous le plancher que vous fixez.' },
    ],
    retenir: 'Un prix trop bas est refusé : BelivaY ne vous laisse jamais vendre à perte.',
    agir: { libelle: 'Voir mes produits', route: 'produits' },
  },
  {
    id: 'colis',
    titre: 'Préparer un colis',
    resume: 'Quatre vérifications, un colis fermé, un code : c’est remis.',
    minutes: 3,
    icone: 'package-check',
    illustration: { type: 'photo', nom: 'box' },
    premierJour: true,
    etapes: [
      { titre: 'Ouvrez le bon de préparation', texte: 'Il dit l’article, la variante, la référence et ce qui part avec (chargeur, câble, boîte).' },
      { titre: 'Faites les quatre vérifications', texte: 'Bon modèle et bonne couleur (scannez la référence), état, accessoires, boîte d’origine.' },
      { titre: 'Emballez et touchez « C’est prêt »', texte: 'Colis protégé et fermé, avant l’échéance affichée. Un seul geste : le livreur est prévenu.' },
      { titre: 'Remettez au livreur du créneau', texte: 'Vérifiez son nom et sa photo, puis affichez le code à 6 chiffres : c’est lui qui le tape.' },
    ],
    retenir: 'Le livreur photographie l’article à découvert puis le colis fermé : ces photos vous protègent.',
    agir: { libelle: 'Commandes à préparer', route: 'commandes', params: { f: 'prep' } },
  },
  {
    id: 'litiges',
    titre: 'Éviter les litiges',
    resume: 'Dire vrai, vérifier, répondre vite : la confiance se garde.',
    minutes: 2,
    icone: 'scale',
    illustration: { type: 'photo', nom: 'cracked' },
    etapes: [
      { titre: 'Une offre exacte', texte: 'Variante, capacité, couleur, état : ce qui est écrit doit être ce qui part.' },
      { titre: 'Vérifiez avant de fermer', texte: 'Allumez, essayez, regardez l’écran : un défaut vu chez vous n’arrive jamais chez le client.' },
      { titre: 'Répondez aux questions', texte: 'Par la messagerie de la commande, sans numéro ni lien : c’est une preuve pour vous.' },
      { titre: 'En cas de litige, répondez à temps', texte: 'Avant l’échéance affichée, avec vos photos. Après la décision, un recours chacun sous 48 h.' },
    ],
    retenir: 'Pendant un litige, l’argent de la vente est gelé, jamais perdu d’avance.',
    agir: { libelle: 'Voir mes litiges', route: 'litiges' },
  },
  {
    id: 'palier',
    titre: 'Monter de palier',
    resume: 'Bronze, Argent, Or, Platine : plus de confiance, plus d’avantages.',
    minutes: 2,
    icone: 'award',
    illustration: null,
    etapes: [
      { titre: 'Votre Trust Score, sur 100', texte: 'Il suit vos délais, vos litiges, vos retours et les avis des clients.' },
      { titre: 'Préparez à l’heure', texte: 'Le geste qui compte le plus : « C’est prêt » avant l’échéance, à chaque commande.' },
      { titre: 'Chaque palier garde ceux d’en dessous', texte: 'Pour Or, il faut aussi les conditions d’Argent. Les seuils sont dans « Trust Score et palier ».' },
      { titre: 'Gardez le cap', texte: 'Sous le seuil de votre palier pendant 14 jours, vous redescendez : une alerte vous prévient avant.' },
    ],
    retenir: 'Les mises en avant se gagnent au mérite (vitrine de quartier), jamais en payant.',
    agir: { libelle: 'Voir mon palier', route: 'palier' },
  },
]

export const cleEtape = (fiche: string, i: number) => `${fiche}:${i}`
