// Domaine « Diaspora et proches » (DP-54) : inscription (deux codes), liens famille (code, invitation, réponse,
// livraison du proche), commander pour un proche (carte, contrôle de cohérence), demandes de panier, proche actif
// (« Pour qui ? »), devise d'affichage. Routes du kit : backend-kit/apps/diaspora, apps/otp (codes « diaspora »),
// apps/client_accounts (préférences) ; réponses au format de src/donnees/source.ts (adaptateur identité).
//
// identiteFournisseur reste « front » : il faut le jeton Google Identity Services ou Sign in with Apple JS (comme
// `connecter`), que le site n'a pas encore ; la route POST /api/auth/social/lookup est prête dans le kit.
import type {
  CarteJeton,
  CompteDiaspora,
  ControleDiaspora,
  DemandeProche,
  EnvoiCode,
  InscriptionDiaspora,
  LienFamille,
  ResultatInscription,
  Session,
  Source,
} from '../../donnees/source'
import type { ClientApi } from '../client'
import { ErreurInterdit, ErreurIntrouvable } from '../erreurs'
import { ou, refusAttendu, seg, suivreRedirection } from './refus'

type ReponseInscription = ({ ok: true; session: Session; access: string; refresh: string }) | Exclude<ResultatInscription, { ok: true }>

export function domaineDiaspora(api: ClientApi) {
  return {
    // Inscription : POST /api/auth/otp/send {purpose: diaspora, canal: sms|email, destination} (sans compte) → 202 EnvoiCode.
    // Commande pour un proche, vérification renforcée (l'écran donne le numéro masqué du compte) :
    // POST /api/auth/otp/send {purpose: diaspora-renforce} (compte connecté) → le code part au numéro étranger vérifié.
    envoyerCodeDiaspora: async (canal: 'sms' | 'email', vers: string) =>
      /[·•]/.test(vers) && api.jetons.lire()
        ? api.post<EnvoiCode>('/auth/otp/send', { purpose: 'diaspora-renforce', canal: 'sms' })
        : api.post<EnvoiCode>('/auth/otp/send', { purpose: 'diaspora', canal, destination: vers }, { anonyme: true }),

    // POST /api/auth/otp/verify {purpose: diaspora, destination, code} (sans compte, sans consommer le code : le
    // serveur le recontrôle à l'inscription) → { ok } ; 422 code → { ok: false }
    verifierCodeDiaspora: async (vers: string, code: string) =>
      ou(api.post<{ ok: boolean }>('/auth/otp/verify', { purpose: 'diaspora', destination: vers, code }, { anonyme: true }), ['code'] as const).then((r) => ({ ok: r.ok })),

    // E-mail : POST /api/auth/diaspora/register ; Google, Apple, numéro : POST /api/auth/social/diaspora.
    // → { ok, session, access, refresh } (la session s'ouvre sur l'appareil) ; refus existe, prenom, email, mdp (200) ;
    // 422 code, codeEmail, age, pays, numero, jeton.
    inscrireDiaspora: async (i: InscriptionDiaspora) => {
      const communs = { prenom: i.prenom, nom: i.nom, email: i.email, naissance: i.naissance, pays: i.pays, ville: i.ville, indicatif: i.indicatif, numero: i.numero, code: i.code }
      try {
        const r =
          i.fournisseur === 'email'
            ? await api.post<ReponseInscription>('/auth/diaspora/register', { ...communs, motDePasse: i.motDePasse ?? '', codeEmail: i.codeEmail ?? '' }, { anonyme: true })
            : await api.post<ReponseInscription>('/auth/social/diaspora', { ...communs, fournisseur: i.fournisseur, jeton: i.jeton ?? '', convertir: !!i.convertir }, { anonyme: true })
        if (!r.ok) return r
        api.jetons.ecrire({ acces: r.access, rafraichissement: r.refresh }, true)
        return { ok: true as const, session: r.session }
      } catch (e) {
        const { ok, raison } = refusAttendu(e, ['code', 'codeEmail', 'age', 'pays', 'numero', 'jeton', 'existe', 'prenom', 'email', 'mdp'] as const)
        return { ok, raison }
      }
    },

    // GET /api/me/family-links → { compte, liens, code, depensesMois, maintenant }
    liensFamille: async () =>
      api.get<{ compte: CompteDiaspora | null; liens: LienFamille[]; code: { code: string; jusqua: number } | null; depensesMois: number; maintenant: number }>('/me/family-links'),

    // POST /api/me/family-links/code → { code, jusqua } (côté Cameroun) ; 403 type
    creerCodeFamille: async () => api.post<{ code: string; jusqua: number }>('/me/family-links/code'),

    // POST /api/me/family-links {code} → { ok, lien } ; 404 code, 409 deja, 422 max
    lierParCode: async (code: string) => ou(api.post<{ ok: true; lien: LienFamille }>('/me/family-links', { code }), ['code', 'max', 'deja'] as const),

    // POST /api/me/family-links/invite {prenom, numero} → { ok, lien } | { ok: false, raison: numero | max | deja }
    inviterProche: async (prenom: string, numero: string) =>
      ou(api.post<{ ok: true; lien: LienFamille } | { ok: false; raison: 'numero' | 'max' | 'deja' }>('/me/family-links/invite', { prenom, numero }), ['numero', 'max', 'deja'] as const),

    // POST /api/me/family-links/{id}/answer {accepte, relais?} → 204 (côté Cameroun)
    repondreLien: async (id: string, accepte: boolean, relais?: string) => {
      await api.post(`/me/family-links/${seg(id)}/answer`, { accepte, relais: relais ?? null })
    },

    // DELETE /api/me/family-links/{id} → 204
    retirerLien: async (id: string) => {
      await api.supprimer(`/me/family-links/${seg(id)}`)
    },

    // POST /api/family-links/{id}/orders (Idempotency-Key) {carte: jeton, bin, paysCarte, devise, mot, titulaire, codeSms,
    // livraison, moyen, demande, supplementPar} → { ok, ref } | { ok: false, raison, controle? } ; 422 domicile, demande, garantie.
    // Carte : le jeton du prestataire et le BIN (6 à 8 chiffres, permis par PCI DSS) seuls (CAP-24).
    commanderPour: async (
      id: string,
      p: { carte: CarteJeton; devise: 'EUR' | 'USD'; mot: string; titulaire: string; paysCarte: string; codeSms?: string; livraison?: 'relais' | 'domicile'; moyen?: 'carte' | 'apple' | 'google'; demande?: string; supplementPar?: 'payeur' | 'destinataire' },
    ) => {
      type R = Awaited<ReturnType<Source['commanderPour']>>
      try {
        const r = await api.post<R>(
          `/family-links/${seg(id)}/orders`,
          {
            carte: p.carte.jeton,
            bin: p.carte.bin,
            paysCarte: p.paysCarte,
            devise: p.devise,
            mot: p.mot,
            titulaire: p.titulaire,
            codeSms: p.codeSms ?? '',
            livraison: p.livraison ?? 'relais',
            moyen: p.moyen ?? 'carte',
            demande: p.demande ?? null,
            supplementPar: p.supplementPar ?? null,
          },
          { idempotence: true },
        )
        return suivreRedirection(r)
      } catch (e) {
        const x = refusAttendu(e, ['lien', 'plafond', 'vide', 'titulaire', 'verification', 'coherence', 'domicile', 'demande', 'garantie'] as const)
        return x.data.controle ? { ok: false, raison: x.raison, controle: x.data.controle as ControleDiaspora } : { ok: false, raison: x.raison }
      }
    },

    // PATCH /api/me/preferences {devise} → { ok } ; 403 hors compte diaspora → { ok: false }
    reglerDevise: async (d: 'XAF' | 'EUR' | 'USD') => {
      try {
        return await api.patch<{ ok: boolean }>('/me/preferences', { devise: d })
      } catch (e) {
        if (e instanceof ErreurInterdit) return { ok: false }
        throw e
      }
    },

    // PUT /api/me/active-relative {lien} → { ok } ; 403 hors compte diaspora, 404 lien non actif → { ok: false }.
    // La session porte ensuite `proche` (distances, délais du catalogue depuis le relais de ce proche).
    choisirProche: async (id: string) => {
      try {
        return await api.put<{ ok: boolean }>('/me/active-relative', { lien: id })
      } catch (e) {
        if (e instanceof ErreurInterdit || e instanceof ErreurIntrouvable) return { ok: false }
        throw e
      }
    },

    // POST /api/me/family-links/invitation → { type, code, jusqua } (lien partageable, QR)
    lienInvitation: async () => api.post<{ type: 'famille' | 'invitation'; code: string; jusqua: number }>('/me/family-links/invitation'),

    // POST /api/me/family-links/invitation/{code}/accept {relais} → { ok, lien } ; 404 code, 409 deja, 422 max, 403 type
    accepterInvitation: async (code: string, relais: string) =>
      ou(api.post<{ ok: true; lien: LienFamille }>(`/me/family-links/invitation/${seg(code)}/accept`, { relais }), ['code', 'max', 'deja', 'type'] as const),

    // PATCH /api/me/family-links/{id}/delivery {relais, domicile, prefere} → 204 (côté Cameroun) ; 422 relais
    reglerLivraisonLien: async (id: string, p: { relais: string; domicile: boolean; prefere: 'relais' | 'domicile' }) => {
      await api.patch(`/me/family-links/${seg(id)}/delivery`, p)
    },

    // GET /api/me/family-requests → { demandes, maintenant }
    demandesProches: async () => api.get<{ demandes: DemandeProche[]; maintenant: number }>('/me/family-requests'),

    // POST /api/me/family-links/{id}/requests {mot, livraison, lignes?} → { ok, demande } ; refus lien (200) ;
    // 409 deja ; 422 vide, plafond, domicile
    envoyerPanierAuProche: async (lien: string, p: { mot: string; livraison: 'relais' | 'domicile'; lignes?: string[] }) =>
      ou(
        api.post<{ ok: true; demande: DemandeProche } | { ok: false; raison: 'lien' | 'vide' | 'plafond' | 'deja' | 'domicile' }>(`/me/family-links/${seg(lien)}/requests`, {
          mot: p.mot,
          livraison: p.livraison,
          lignes: p.lignes ?? null,
        }),
        ['lien', 'vide', 'plafond', 'deja', 'domicile'] as const,
      ),

    // POST /api/me/family-requests/{id}/decline {mot} → 204 (côté diaspora) ; 409 state_changed
    refuserDemande: async (id: string, mot: string) => {
      await api.post(`/me/family-requests/${seg(id)}/decline`, { mot })
    },

    // DELETE /api/me/family-requests/{id} → 204 (côté Cameroun) ; 409 state_changed
    annulerDemande: async (id: string) => {
      await api.supprimer(`/me/family-requests/${seg(id)}`)
    },
  } satisfies Partial<Source>
}
