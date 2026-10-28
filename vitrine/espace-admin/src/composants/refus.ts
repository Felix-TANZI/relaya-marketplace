// Raisons de refus de la source, en mots (traduites par t()) : table commune lue par DecisionMotivee quand la méthode
// du domaine refuse une décision ({ ok: false, raison }). « motif_court » est rendu avec la longueur du registre.
export const RAISONS_REFUS: Record<string, string> = {
  pieces_non_vues: 'Ouvrez chaque pièce avant d’approuver : la décision garde l’image vue.',
  conflit_interets: 'Conflit d’intérêts : ce dossier revient à un autre agent.',
  deja_traite: 'Ce dossier a déjà été traité.',
  lecture_seule: 'Votre rôle lit cette page sans y décider.',
  sans_evenement: 'Citez au moins un élément qui fonde la décision.',
  meme_auteur: 'Vous avez pris la décision contestée : le recours revient à une autre personne.',
  trop_tot: 'Aucune rétrogradation avant le nombre minimal de commandes.',
  sans_croisement: 'Le croisement avec les vendeurs n’est pas chargé : aucune rétrogradation sans lui.',
  doublon: 'Doublon non autorisé (prête-nom) : refusez la pièce et transmettez à la fraude.',
  masquage_impossible: 'Aucun motif de modération : cet avis ne peut pas être masqué.',
  role: 'Votre rôle ne prend pas cette décision.',
  barre_valide: 'Ce prix barré a été pratiqué assez longtemps : il reste valable.',
  delai_depasse: 'Le délai pour annuler cette fusion est dépassé.',
}
