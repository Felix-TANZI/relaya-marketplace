// frontend/src/features/admin/terrain/api.ts
// DEV-SRV-01, T07-4/5 — appels des écrans de l'agent de terrain (backend : apps/vendors/views_agent.py).

import { http } from '@/services/api/http';

export type StatutPiece = 'PENDING' | 'APPROVED' | 'REJECTED' | null;
export type Piece = 'recto' | 'verso' | 'selfie';

export interface FicheVendeur {
  id: number;
  boutique: string;
  telephone: string;
  identifiant: string;
  quartier: string;
  statut: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  /** `verifiee` : dossier complet (trois pièces), condition du versement. `peut_publier` : CNI validée et numéro
   *  Mobile Money renseigné (T07-2). */
  identite: {
    verifiee: boolean; peut_publier: boolean; mobile_money: boolean;
    manquantes: string[]; refusees: string[]; en_attente: string[];
    pour_publier: { manquantes: string[]; refusees: string[]; en_attente: string[] };
  };
  pieces: Record<Piece, StatutPiece>;
  /** Numéro masqué ; `verifie` passe à vrai quand le vendeur confirme son code depuis son espace. */
  mobile_money: { numero: string; verifie: boolean } | null;
  produits: number;
  acces_provisoire_expire_le: string | null;
  inscrit_le: string;
  /** Rendu une seule fois, à l'inscription ou au nouvel accès. */
  mot_de_passe_provisoire?: string;
}

export interface Inscription {
  boutique: string;
  telephone: string;
  quartier: string;
  gerant?: string;
  latitude?: number | null;
  longitude?: number | null;
  reperes?: string;
}

export interface Quartier { quartier: string; commune: string; zone: string }

const BASE = '/api/vendors/agent/vendeurs';

export const terrainApi = {
  liste: () => http<FicheVendeur[]>(BASE),
  fiche: (id: number) => http<FicheVendeur>(`${BASE}/${id}`),
  inscrire: (donnees: Inscription) => http<FicheVendeur>(BASE, { method: 'POST', body: JSON.stringify(donnees) }),
  deposerPiece: (id: number, piece: Piece, fichier: File) => {
    const corps = new FormData();
    corps.append('piece', piece);
    corps.append('fichier', fichier);
    return http<FicheVendeur>(`${BASE}/${id}/pieces`, { method: 'POST', body: corps });
  },
  ajouterProduit: (id: number, produit: FormData) =>
    http<{ id: number; title: string }>(`${BASE}/${id}/produits`, { method: 'POST', body: produit }),
  enregistrerMobileMoney: (id: number, telephone: string) =>
    http<FicheVendeur>(`${BASE}/${id}/mobile-money`, { method: 'POST', body: JSON.stringify({ telephone }) }),
  nouvelAcces: (id: number) => http<FicheVendeur>(`${BASE}/${id}/acces`, { method: 'POST' }),
  quartiers: () => http<{ quartiers: Quartier[] }>('/api/shipping/quartiers/'),
};
