// frontend/src/features/vendors/v2/boutique/api.ts
// Pont API pour VD-11 fig.4 (Emplacement) — CRUD réel déjà existant côté
// backend (apps/vendors/models.py VendorLocation + views.py section
// "EMPLACEMENTS PHYSIQUES") :
//   GET    /api/vendors/locations/
//   POST   /api/vendors/locations/create/
//   PATCH  /api/vendors/locations/<id>/update/
//   DELETE /api/vendors/locations/<id>/delete/
// Repris tel quel (même route déjà utilisée en lecture par BoutiquePage.tsx
// pour compter les emplacements) — rien à inventer ici, contrairement à
// ouverture/api.ts qui comble de vraies lacunes serveur.

import { http } from '@/services/api/http';

export interface VendorLocation {
  id: number;
  name: string;
  address: string;
  description: string;
  phone: string;
  email: string;
  representative_name: string;
  representative_phone: string;
  // DecimalField cote DRF : serialise en chaine ("3.889500"), jamais en
  // nombre — convertir explicitement cote consommateur (voir EmplacementPage).
  latitude: string | null;
  longitude: string | null;
  /** Quartier de Yaoundé (t_quartiers) : donne la zone et le niveau de prix de la boutique (spec v2.1, R06.1). */
  quartier: string;
  is_active: boolean;
  is_main: boolean;
  created_at: string;
}

/** Quartiers de Yaoundé du référentiel (GET /api/shipping/quartiers/). */
export async function getQuartiers(): Promise<{ quartier: string; zone: string }[]> {
  return (await http<{ quartiers: { quartier: string; zone: string }[] }>('/api/shipping/quartiers/')).quartiers;
}

export async function getVendorLocations(): Promise<VendorLocation[]> {
  return http<VendorLocation[]>('/api/vendors/locations/');
}

export async function updateVendorLocation(
  id: number,
  patch: Partial<Pick<VendorLocation, 'description' | 'latitude' | 'longitude' | 'quartier'>>,
): Promise<VendorLocation> {
  return http<VendorLocation>(`/api/vendors/locations/${id}/update/`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
