// frontend/src/hooks/useChiffresPublics.ts
// DEV-SRV-01, T09 : « aucun écran réel n'affiche de donnée d'exemple ». Les chiffres de l'accueil et de « À propos »
// (« 15 240 produits, 3 200 vendeurs, 50K+ clients, 4,8/5 », écrits dans le code) sont désormais comptés dans la base
// par le serveur (/api/catalog/chiffres/). null tant qu'ils ne sont pas arrivés : l'écran affiche alors « — ».

import { useEffect, useState } from 'react';
import { http } from '@/services/api/http';

export interface ChiffresPublics {
  produits: number;
  boutiques: number;
}

let chargement: Promise<ChiffresPublics> | null = null;

export function useChiffresPublics(): ChiffresPublics | null {
  const [chiffres, setChiffres] = useState<ChiffresPublics | null>(null);
  useEffect(() => {
    let actif = true;
    chargement ??= http<ChiffresPublics>('/api/catalog/chiffres/');
    chargement
      .then((valeurs) => { if (actif) setChiffres(valeurs); })
      .catch(() => { chargement = null; });
    return () => { actif = false; };
  }, []);
  return chiffres;
}

/** « 1 234 », ou « — » tant que le chiffre n'est pas arrivé. */
export function chiffre(valeur: number | undefined): string {
  return valeur === undefined ? '—' : valeur.toLocaleString('fr-FR');
}
