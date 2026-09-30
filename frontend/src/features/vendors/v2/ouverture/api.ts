// frontend/src/features/vendors/v2/ouverture/api.ts
// Bridge API pour VD-03 (Accès et ouverture de la boutique).
//
// Pont explicitement demandé : vendorsApi.apply()/getProfile() restent la
// seule écriture réelle du dossier vendeur (business_name, phone, adresse,
// id_document, statut PENDING/APPROVED). Les endpoints décrits par la
// synthèse (POST /shops, POST /shops/{id}/kyc multipart, POST /contract/sign,
// GET /assisted-entry…) n'existent pas encore côté backend à ce jour :
//   - le numéro MoMo de versement (KYC-01) a un vrai endpoint existant
//     (vendorsApi.savePaymentPreferences → PATCH /api/vendors/settings/) : on
//     s'en sert directement, sans rien inventer ;
//   - la vérification du numéro par SMS (OUV-01) et la signature du contrat
//     (KYC-03) n'ont aucun équivalent réel aujourd'hui : on appelle les
//     endpoints tels que décrits par la synthèse (préfixés /api comme le
//     reste du projet), en échouant proprement (toast) si absents, pour que
//     l'écran fonctionne dès leur mise en service sans reprise frontend ;
//   - les photos CNI recto/verso et le selfie n'ont pas de stockage serveur
//     dédié : la capture est fonctionnelle côté écran, mais seule une note
//     texte ("CNI photographiée, vérification en attente") est envoyée dans
//     id_document — jamais une image encodée de force dans un champ texte ;
//   - la signature du contrat (étape 3) est actée localement (horodatage
//     signé dans localStorage) faute de POST /contract/sign : c'est un état
//     d'écran, pas une preuve légale, et c'est documenté comme tel partout où
//     c'est lu.
// Cette logique suit le même principe que useAccueilData.ts / commandes/helpers.ts :
// brancher sur ce qui existe réellement, ne jamais fabriquer de données.

import { http } from '@/services/api/http';
import { vendorsApi, type VendorApplication, type VendorProfile } from '@/services/api/vendors';
import { geocodingApiUrl } from '@/config/maps';
import type { AssistedEntryBatch, AssistedEntryGroup, ShopDraft } from './types';

// ── Brouillon de boutique (étape 1 → étape 2) ───────────────────────────────

const DRAFT_KEY = 'belivay_seller_shop_draft';

/**
 * sessionStorage : le brouillon franchit la navigation de l'étape 1 vers
 * l'étape 2 sans backend dédié (POST /shops n'existe pas encore).
 */
export function readShopDraft(): ShopDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ShopDraft) : null;
  } catch {
    return null;
  }
}

export function saveShopDraft(draft: ShopDraft): void {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Navigation privée : l'étape 2 redemandera simplement ces champs.
  }
}

// ── Ouvrir ma boutique (étape 1/3) ──────────────────────────────────────────

/**
 * Aperçu de zone/quartier par géocodage inverse public (Nominatim, service
 * déjà utilisé ailleurs dans le repo — voir SellerShopPage.tsx). Ce n'est PAS
 * la zone officielle calculée côté serveur (OUV-01, ex. "Z4") : c'est un
 * repère affiché en attendant ce calcul serveur.
 */
export async function previewZoneLabel(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `${geocodingApiUrl}/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: Record<string, string> };
    const a = data.address ?? {};
    const neighbourhood = a.neighbourhood || a.suburb || a.quarter || a.city_district;
    const city = a.city || a.town || a.village;
    return [neighbourhood, city].filter(Boolean).join(' · ') || null;
  } catch {
    return null;
  }
}

interface OtpResponse {
  challenge_id?: string;
}

/** POST /api/auth/otp/ (VD-D04.A05/A09) — envoie le code SMS de vérification du numéro. */
export async function sendShopPhoneOtp(phone: string): Promise<OtpResponse> {
  return http<OtpResponse>('/api/auth/otp/', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

/** POST /api/auth/verify/ (VD-D04.A05) — valide le code à 6 chiffres reçu par SMS. */
export async function verifyShopPhoneOtp(phone: string, code: string): Promise<void> {
  await http<void>('/api/auth/verify/', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
}

// ── Mot de passe oublié ──────────────────────────────────────────────────────

/**
 * Aucun endpoint de réinitialisation n'existe dans authApi aujourd'hui (le
 * lien "/forgot-password" est déjà un lien mort ailleurs dans l'app — voir
 * PortalLoginCard.tsx). On tente un endpoint plausible ; en cas d'échec (404
 * ou réseau), l'appelant affiche quand même la confirmation générique
 * ("si un compte existe…") : ne jamais révéler si l'identifiant correspond à
 * un compte, qu'il existe un backend ou non — pratique de sécurité standard,
 * indépendante du succès technique de l'appel.
 */
export async function requestPasswordResetLink(identifier: string): Promise<void> {
  try {
    await http<void>('/api/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  } catch {
    // Volontairement silencieux — voir commentaire ci-dessus.
  }
}

// ── Publier et être payé (étapes 2-3) ───────────────────────────────────────

/**
 * Termine l'ouverture de boutique en réutilisant vendorsApi.apply() — seule
 * écriture réelle disponible. business_description/address/city sont dérivés
 * du brouillon plutôt que redemandés au vendeur (OUV-01 : rien de plus que
 * nom/numéro/position à l'étape 1). id_document porte une note honnête, pas
 * un flux d'image (voir en-tête de fichier).
 */
export async function finalizeShopApplication(
  draft: ShopDraft,
  kycNote: string,
): Promise<VendorProfile> {
  const payload: VendorApplication = {
    business_name: draft.businessName,
    business_description: 'Boutique ouverte via BelivaY Vendeur.',
    phone: draft.phone,
    address: draft.zoneLabel ?? (draft.lat && draft.lng ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}` : ''),
    city: draft.zoneLabel?.split('·').pop()?.trim() ?? '',
    id_document: kycNote,
  };
  return vendorsApi.apply(payload);
}

/** Numéro MoMo de versement (KYC-01) — vrai endpoint existant, aucune invention. */
export async function verifyPayoutNumber(
  operator: 'MTN_MOMO' | 'ORANGE_MONEY',
  phone: string,
): Promise<VendorProfile> {
  return vendorsApi.savePaymentPreferences({ default_withdrawal_operator: operator, default_withdrawal_phone: phone });
}

const CONTRACT_KEY_PREFIX = 'belivay_seller_contract_signed_';

/**
 * Signature de contrat (KYC-03) : faute de POST /contract/sign côté backend,
 * l'accord est horodaté localement. Ce n'est qu'un état d'écran (permet de ne
 * pas re-présenter le contrat à chaque visite) — jamais une preuve légale.
 */
export function signContractLocally(vendorId: number, isRegistered: boolean, rccmNiu: string): void {
  try {
    window.localStorage.setItem(
      `${CONTRACT_KEY_PREFIX}${vendorId}`,
      JSON.stringify({ signedAt: new Date().toISOString(), isRegistered, rccmNiu: isRegistered ? rccmNiu : '' }),
    );
  } catch {
    // Stockage indisponible (navigation privée) : la signature reste simplement
    // re-demandée à la prochaine visite, sans conséquence bloquante.
  }
}

export function isContractSignedLocally(vendorId: number): boolean {
  try {
    return Boolean(window.localStorage.getItem(`${CONTRACT_KEY_PREFIX}${vendorId}`));
  } catch {
    return false;
  }
}

// ── Saisie assistée ──────────────────────────────────────────────────────────

interface AssistedEntryApiProduct {
  id: number;
  title: string;
  image_url: string | null;
  price_xaf: number;
  stock: number;
  group: AssistedEntryGroup;
  checks_passed: number;
  reason_label?: string;
  existing_product_ref?: string;
}

interface AssistedEntryApiResponse {
  agent_name: string;
  zone_label: string;
  visited_at: string;
  products: AssistedEntryApiProduct[];
}

/**
 * GET /api/vendors/assisted-entry/ (VD-D04.A16) : n'existe pas encore côté
 * backend à ce jour. Dès sa mise en service avec cette forme de réponse,
 * cette fonction suffit — voir le même principe dans useAccueilData.ts.
 */
export async function getAssistedEntryBatch(): Promise<AssistedEntryBatch | null> {
  try {
    const res = await http<AssistedEntryApiResponse>('/api/vendors/assisted-entry/');
    return {
      agentName: res.agent_name,
      zoneLabel: res.zone_label,
      visitedAt: res.visited_at,
      products: res.products.map((p) => ({
        id: p.id,
        title: p.title,
        imageUrl: p.image_url,
        priceXaf: p.price_xaf,
        stock: p.stock,
        group: p.group,
        checksPassed: p.checks_passed,
        reasonLabel: p.reason_label,
        existingProductRef: p.existing_product_ref,
      })),
    };
  } catch {
    return null;
  }
}

/** POST /api/vendors/assisted-entry/{id}/approve/ (VD-D04.A16). */
export async function approveAssistedEntryProduct(id: number): Promise<void> {
  await http<void>(`/api/vendors/assisted-entry/${id}/approve/`, { method: 'POST' });
}

/** POST /api/vendors/assisted-entry/approve/ — validation en masse des produits "prêts" (SAI-04). */
export async function approveAssistedEntryBatch(ids: number[]): Promise<void> {
  await http<void>('/api/vendors/assisted-entry/approve/', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}
