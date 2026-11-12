// frontend/src/config/__tests__/visuels.test.ts
// DEV-SRV-01 v1.8, C03 : plus aucune photo Unsplash sur le site réel (elle reste permise sur la vitrine, hors de
// frontend/). Ce test refuse qu'un fichier du site réel cite de nouveau une image Unsplash.
import { describe, expect, it } from 'vitest';
import { VISUEL_ACCUEIL, VISUELS_CONFIANCE, VISUELS_THEMES } from '@/config/visuels';

const sources = import.meta.glob('/src/**/*.{ts,tsx,css}', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;
const UNSPLASH = ['images', 'unsplash', 'com'].join('.');

describe('C03 : visuels du site réel', () => {
  it("aucun fichier ne cite d'image Unsplash", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100); // le test lit bien les fichiers du site
    const fautifs = Object.entries(sources)
      .filter(([, texte]) => texte.includes(UNSPLASH))
      .map(([chemin]) => chemin);
    expect(fautifs).toEqual([]);
  });

  it('chaque visuel est un fichier local de /visuels/', () => {
    const tous = [VISUEL_ACCUEIL, ...VISUELS_CONFIANCE, ...Object.values(VISUELS_THEMES)];
    expect(tous.length).toBe(17);
    for (const chemin of tous) expect(chemin).toMatch(/\/visuels\/[a-z-]+\.svg$/);
  });
});
