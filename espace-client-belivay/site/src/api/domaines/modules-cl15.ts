// Modules CL-15 : assistant WhatsApp (FF-EX06). Routes du kit : backend-kit/apps/extras (réponses au format de
// src/donnees/source.ts : adaptateur identité). Un module fermé par son interrupteur répond 404 sur ses routes
// (CAP-13).
//
// Mises de côté (FF-EX03), panier famille (FF-EX05) et troc / reprise de téléphone (FF-EX04) ont été retirés de ce
// fichier : NON DISPONIBLES EN PRODUCTION, décision produit requise avant de construire quoi que ce soit. Leurs
// routes (POST /api/me/layaways, /api/me/family-baskets, /api/me/trades…) ne visent que `backend-kit/apps/extras`,
// qui N'EST PAS dans `backend/apps/` (relaya-marketplace) ni dans `INSTALLED_APPS`. Aucun modèle backend (mise de
// côté, panier famille, reprise de téléphone) n'existe nulle part dans le dépôt de production : ce sont trois
// systèmes entiers (modèle de données, paiement échelonné ou partagé, règles métier) à concevoir avant de pouvoir les
// écrire, pas des routes à corriger. `source-api.ts` les fait lever NonDisponible (src/api/routes.ts, état
// « serveur ») : l'écran le sait et dit quoi créer plutôt que d'appeler une route qui n'existera jamais tant que la
// décision produit n'est pas prise.
//
// Rentrée scolaire (rentree/commanderRentree/envoyerListePapier/publierListe) retirée d'ici le 14 oct., même
// constat : aucune route "school-lists" nulle part dans backend/, backend-kit/apps/extras en a un prototype
// complet (modèles, règles, tests) jamais porté vers backend/ (touche INSTALLED_APPS, hors du périmètre mécanique
// de cette vérification). PromotionCampaign (apps/catalog) est une remise sur UN produit d'UN vendeur, pas une
// liste multi-articles multi-vendeurs construite par un parent : pas réutilisable tel quel. Décision produit
// requise avant de rebrancher ces 4 méthodes ; elles lèvent NonDisponible pour l'instant (routes.ts : état
// « serveur »).
//
// WhatsApp reste branché tel quel ici (hors du périmètre de cette vérification) ; se référer à CONNECTEURS.md pour
// son propre état.
import type { ConversationWa, Source } from '../../donnees/source'
import type { ClientApi } from '../client'

export function domaineModulesCl15(api: ClientApi) {
  return {
    // ——— WhatsApp ———
    // GET /api/whatsapp/conversation · POST /api/whatsapp/conversation/messages {texte} → ConversationWa.
    // Le kit répond 501 a_finir tant que l'API WhatsApp Business n'est pas en service (FF-EX06 : « non au lancement »).
    whatsapp: async () => api.get<ConversationWa>('/whatsapp/conversation'),
    repondreWhatsapp: async (texte: string) => api.post<ConversationWa>('/whatsapp/conversation/messages', { texte }),
  } satisfies Partial<Source>
}
