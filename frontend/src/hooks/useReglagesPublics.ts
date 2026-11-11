// frontend/src/hooks/useReglagesPublics.ts
// DEV-SRV-01, T02-5 / T05 : « aucun montant écrit dans le code ». Les réglages r_… que les écrans affichent ou font
// respecter (prix minimum, commission minimale, plafond d'un nouveau vendeur, course de retour) viennent du serveur
// (/api/regles/reglages/, liste fermée) : changer un réglage dans l'admin change l'écran.
// Chargés une fois pour toute l'application ; null tant qu'ils ne sont pas arrivés (l'écran affiche alors « — », et
// le serveur reste seul juge de ce qu'il accepte).

import { useEffect, useState } from 'react';
import { http } from '@/services/api/http';

export interface ReglagesPublics {
  r_prix_min_publiable: number;
  r_com_min: number;
  r_plafond_nouveau: number;
  r_nouveau_seuil: number;
  r_retour: number;
}

let chargement: Promise<ReglagesPublics> | null = null;

export function useReglagesPublics(): ReglagesPublics | null {
  const [reglages, setReglages] = useState<ReglagesPublics | null>(null);
  useEffect(() => {
    let actif = true;
    chargement ??= http<ReglagesPublics>('/api/regles/reglages/');
    chargement
      .then((valeurs) => { if (actif) setReglages(valeurs); })
      .catch(() => { chargement = null; });
    return () => { actif = false; };
  }, []);
  return reglages;
}
