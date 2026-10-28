// Domaine « accès » branché sur le kit (backend-kit/apps/relais_compte ; relais_core/compte.py, activation.py) :
// invitation d'un membre, candidature (sans compte : par l'appareil, X-Device-Id), numéro de versement du candidat,
// activation, statut du relais, formation, contestation d'une décision, annulation de la demande de fin.
// Le brouillon de candidature est gardé SUR LE TÉLÉPHONE (INS-01, « blv_r_brouillon ») : il ne part qu'à l'envoi.
import type { ClientApi } from '@client/api/client'
import type { Activation, Brouillon, Candidature, DomaineAcces, FormationMembre, Invitation, ModuleVu, QuartierCandidat, StatutDetail } from '../../donnees/domaines/acces'
import type { SourceRelais } from '../../donnees/source'
import { appels, ouNull, prevenir, seg } from '../outils'
import { garder } from './session'

const CLE_BROUILLON = 'blv_r_brouillon'
let brouillonMemoire: Brouillon | null = null

export function domaineAcces(api: ClientApi): SourceRelais['acces'] {
  const a = appels(api)
  const anonyme = { anonyme: true } as const
  type R<K extends keyof DomaineAcces> = Awaited<ReturnType<DomaineAcces[K]>>
  /** Geste public (sans compte) : origine dans le corps, clé d'idempotence (rejeu 24 h côté serveur). */
  const public_ = async <T>(chemin: string, o: { cle: string }, corps: object = {}) => {
    const x = await a.post<T>(chemin, { ...corps, origine: o }, { ...anonyme, idempotence: o.cle })
    prevenir('acces')
    return x
  }
  const d: DomaineAcces = {
    invitation: (jeton) => ouNull(a.get<Invitation>(`/invitations/${seg(jeton)}`, anonyme)),
    accepterInvitation: async (jeton, pin, o) => garder(api, await public_<R<'accepterInvitation'> & { jetons?: { access: string; refresh: string } }>(`/invitations/${seg(jeton)}/accept`, o, { pin })),
    redemanderInvitation: (jeton, o) => public_<R<'redemanderInvitation'>>(`/invitations/${seg(jeton)}/renew`, o),
    formation: () => a.get<FormationMembre>('/me/training'),

    quartiers: () => a.get<QuartierCandidat[]>('/applications/areas', anonyme),
    async brouillon() {
      try {
        const x = localStorage.getItem(CLE_BROUILLON)
        return x ? (JSON.parse(x) as Brouillon) : brouillonMemoire
      } catch {
        return brouillonMemoire
      }
    },
    async enregistrerBrouillon(b) {
      brouillonMemoire = b
      try {
        localStorage.setItem(CLE_BROUILLON, JSON.stringify(b))
      } catch {
        /* gardé en mémoire pour la session */
      }
    },
    envoyerCodeVersement: (operateur, numero, o) => public_<R<'envoyerCodeVersement'>>('/applications/payout-number/otp', o, { operateur, numero }),
    verifierCodeVersement: (code, o) => public_<R<'verifierCodeVersement'>>('/applications/payout-number/verify', o, { code }),
    async candidater(b, o) {
      const r = await public_<R<'candidater'>>('/applications', o, { brouillon: b, pieces: b.pieces, signature: b.convention.signature })
      if (r.ok) {
        brouillonMemoire = null
        try {
          localStorage.removeItem(CLE_BROUILLON)
        } catch {
          /* rien */
        }
      }
      return r
    },
    candidature: () => ouNull(a.get<Candidature>('/applications/mine', anonyme)),
    programme: () => a.get<ModuleVu[]>('/training/program', api.jetons.lire() ? undefined : anonyme),

    activation: () => a.get<Activation>('/activation'),
    statut: () => a.get<StatutDetail>('/status'),
    contester: (decision, texte, o) => a.geste<R<'contester'>>(`/decisions/${seg(decision)}/contest`, o, { texte }),
    annulerFin: (o) => a.supprimer<R<'annulerFin'>>('/account/closure', o),
  }
  return d
}
