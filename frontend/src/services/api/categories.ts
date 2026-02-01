// frontend/src/services/api/categories.ts
// Service API pour les catégories

import { http } from './http';

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export const categoriesApi = {
  /**
   * Récupérer toutes les catégories
   */
  list: async (): Promise<Category[]> => {
    const response = await http<{ results: Category[] }>('/api/catalog/categories/');
    // Si c'est un objet paginé, retourner results, sinon retourner la réponse directe
    return Array.isArray(response) ? response : response.results || [];
  },
};