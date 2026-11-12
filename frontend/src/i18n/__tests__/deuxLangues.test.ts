// frontend/src/i18n/__tests__/deuxLangues.test.ts
// DEV-SRV-01, T03 : « vérifier l'affichage dans les deux langues » ; résultat final : « les six espaces … en français
// et en anglais ». Une clé française sans traduction anglaise s'affiche telle quelle (« ad8_terrain.title ») à un
// utilisateur anglophone : ce test refuse qu'une clé existe dans une langue et pas dans l'autre.

import { describe, expect, it } from 'vitest';
import i18n from '@/i18n';

type Arbre = { [cle: string]: unknown };

function cles(arbre: unknown, prefixe = ''): string[] {
  if (Array.isArray(arbre)) return [prefixe];
  if (arbre === null || typeof arbre !== 'object') return [prefixe];
  return Object.entries(arbre as Arbre).flatMap(([cle, valeur]) => cles(valeur, prefixe ? `${prefixe}.${cle}` : cle));
}

const dictionnaire = (langue: string) => i18n.getResourceBundle(langue, 'translation') as Arbre;

describe('les deux langues', () => {
  const fr = new Set(cles(dictionnaire('fr')));
  const en = new Set(cles(dictionnaire('en')));

  it('chaque texte français a sa traduction anglaise', () => {
    expect([...fr].filter((cle) => !en.has(cle)).sort()).toEqual([]);
  });

  it('chaque texte anglais a son texte français', () => {
    expect([...en].filter((cle) => !fr.has(cle)).sort()).toEqual([]);
  });
});
