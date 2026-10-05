// Domaine « Profil, numéro et codes » (CL-03, DP-52 ; CIN-31 à CIN-43, CAP-14, CAP-15).
// Routes du kit : backend-kit/apps/otp (codes) et apps/client_accounts (/api/me, e-mail, numéro). Réponses au format
// de src/donnees/source.ts (EnvoiCode, ResultatCode) : adaptateur identité. Le serveur envoie, compte et décide ;
// le site n'affiche que ce qu'il rend (essais restants, blocage).
import type { Boutique, ChangementNumero, ChangementProfil, EnvoiCode, NouvelleBoutique, ObjetCode, ResultatBoutique, ResultatCode } from '../../donnees/source'
import type { ClientApi } from '../client'
import { ou } from './refus'

export function domaineProfil(api: ClientApi) {
  // POST /api/auth/otp/verify {purpose, code, numero?} → ResultatCode ; 409 utilise (premier numéro, CIN-35).
  const verifier = (corps: { purpose?: string; code: string; numero?: string }) => api.post<ResultatCode>('/auth/otp/verify', corps)

  return {
    // POST /api/auth/otp/send {purpose, destination?, canal} → 202 EnvoiCode. purpose = l'objet du site
    // (« email-sms », « numero-nouveau », « moyen »…) ; sans destination : le numéro vérifié du compte.
    envoyerCode: async (objet: ObjetCode, destination?: string, canal?: 'sms' | 'whatsapp') =>
      api.post<EnvoiCode>('/auth/otp/send', { purpose: objet, ...(destination ? { destination } : {}), canal: canal ?? 'sms' }),

    verifierPremierNumero: async (numero: string, code: string) => ou(verifier({ numero, code }), ['utilise'] as const),
    verifierCodeEmail: async (code: string) => verifier({ purpose: 'email-sms', code }),
    verifierCodeNumeroAncien: async (code: string) => verifier({ purpose: 'numero-ancien', code }),

    // POST /api/me/email/check {email} → {ok: true} ; 422 meme ; 409 pris (un e-mail = un compte, CIN-16)
    verifierNouvelEmail: async (email: string) => ou(api.post<{ ok: true }>('/me/email/check', { email }), ['meme', 'pris'] as const),
    // PUT /api/me/email {email, code} → ResultatCode (second code, reçu à la nouvelle adresse)
    confirmerEmail: async (email: string, code: string) => api.put<ResultatCode>('/me/email', { email, code }),

    // PATCH /api/me {prenom, nom, photo, code} → ResultatCode (DP-52 : code par SMS au numéro vérifié)
    confirmerProfil: async (c: ChangementProfil, code: string) => api.patch<ResultatCode>('/me', { prenom: c.prenom, nom: c.nom, photo: c.photo, code }),

    // POST /api/me/phone/check {numero} → {ok: true} ; 422 meme ; 409 utilise
    verifierNouveauNumero: async (numero: string) => ou(api.post<{ ok: true }>('/me/phone/check', { numero }), ['meme', 'utilise'] as const),
    // PUT /api/me/phone {numero, code} → ResultatCode ; codes de retrait régénérés, autres sessions fermées (CAP-15)
    confirmerNumero: async (numero: string, code: string) => api.put<ResultatCode>('/me/phone', { numero, code }),
    // GET /api/me/phone/last-change → ChangementNumero | 204
    changementNumero: async () => (await api.get<ChangementNumero | undefined>('/me/phone/last-change')) ?? null,

    // ——— Devenir vendeur (boutique ouverte depuis le compte ; chez relaya : profil vendeur EN ATTENTE) ———
    // GET /api/me/shop → Boutique | 204
    boutique: async () => (await api.get<Boutique | undefined>('/me/shop')) ?? null,
    // POST /api/me/shop {nom, categorie, type} → ResultatBoutique ; 409 nom_pris → { ok: false, raison: 'nom-pris' }
    ouvrirBoutique: async (b: NouvelleBoutique) =>
      ou(api.post<ResultatBoutique>('/me/shop', { nom: b.nom, categorie: b.categorie, type: b.type }), ['nom-pris'] as const, { nom_pris: 'nom-pris' }),
    // POST /api/me/business {piece} → 204
    demanderBusiness: async (piece: string) => {
      await api.post('/me/business', { piece })
    },
  }
}
