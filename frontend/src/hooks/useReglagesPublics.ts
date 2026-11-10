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
  /** R07 : livraison offerte au relais dès ce montant de produits… */
  r_seuil_relais: number;
  /** … à hauteur de ce montant. */
  r_relais: number;
}

let chargement: Promise<ReglagesPublics> | null = null;

/** Un seul appel pour toute l'application (écrans et textes traduits). */
export function chargerReglagesPublics(): Promise<ReglagesPublics> {
  chargement ??= http<ReglagesPublics>('/api/regles/reglages/');
  return chargement.catch((erreur) => { chargement = null; throw erreur; });
}

export function useReglagesPublics(): ReglagesPublics | null {
  const [reglages, setReglages] = useState<ReglagesPublics | null>(null);
  useEffect(() => {
    let actif = true;
    chargerReglagesPublics()
      .then((valeurs) => { if (actif) setReglages(valeurs); })
      .catch(() => undefined);
    return () => { actif = false; };
  }, []);
  return reglages;
}
