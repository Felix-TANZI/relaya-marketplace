// Raccourcis du poste de travail (Poste.tsx), listés par l'aide « ? » (composants/Raccourcis.tsx) quand un poste est
// à l'écran. Rien n'est capté pendant une saisie ni quand une feuille est ouverte.
export const RACCOURCIS_POSTE: { touches: string[]; quoi: string }[] = [
  { touches: ['n'], quoi: 'Dossier suivant' },
  { touches: ['k'], quoi: 'Dossier précédent' },
  { touches: ['1', '…', '9'], quoi: 'Choisir une issue' },
  { touches: ['c'], quoi: 'Comparer les preuves côte à côte' },
  { touches: ['a'], quoi: 'Noter un appel' },
  { touches: ['t'], quoi: 'Transmettre au niveau supérieur' },
  { touches: ['Ctrl', 'Entrée'], quoi: 'Décider (dans la note)' },
]
