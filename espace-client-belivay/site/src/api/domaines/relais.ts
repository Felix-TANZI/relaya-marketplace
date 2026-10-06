// Domaine « Relais, adresses, intérêts » (CL-04, CL-13 ; CCO-10, CCO-11, CPR-23, DP-09 ; CAP-21).
// Relais proches : route de relaya (GET /api/shipping/relay-points/nearby/) ; relais habituel, carnet d'adresses et
// centres d'intérêt : routes du kit (backend-kit/apps/client_accounts), réponses au format du site.
import type { DonneesAdresses, DonneesCompte, NouvelleAdresse, ResultatAdresse } from '../../donnees/source'
import { versRelais, type RPage, type RRelais } from '../adaptateurs'
import type { ClientApi } from '../client'
import { ErreurApi } from '../erreurs'
import { liste } from './session'
import { seg } from './refus'

export function domaineRelais(api: ClientApi) {
  return {
    // Le relais habituel (son nom) est lu dans le compte du kit (GET /api/me).
    relaisListe: async () => {
      const [r, compte] = await Promise.all([
        api.get<RRelais[] | RPage<RRelais>>('/shipping/relay-points/nearby/'),
        api.get<DonneesCompte>('/me').catch(() => null),
      ])
      return { relais: liste(r).map(versRelais), habituel: compte?.relais?.nom ?? null }
    },
    // PUT /api/me/relais-habituel {relais} (identifiant ou nom) → 204 ; 404 relais inconnu ou fermé
    choisirRelais: async (nom: string) => {
      await api.put('/me/relais-habituel', { relais: nom })
    },

    // GET /api/me/adresses → DonneesAdresses
    adresses: async () => api.get<DonneesAdresses>('/me/adresses'),
    // POST /api/me/adresses {a} · PUT /api/me/adresses/{id} {a} → {ok, adresse} ; 422 zone_non_servie {ville}
    enregistrerAdresse: async (a: NouvelleAdresse): Promise<ResultatAdresse> => {
      try {
        return a.id ? await api.put<ResultatAdresse>(`/me/adresses/${seg(a.id)}`, { a }) : await api.post<ResultatAdresse>('/me/adresses', { a })
      } catch (e) {
        if (e instanceof ErreurApi && e.code === 'zone_non_servie') {
          const ville = (e.data as { ville?: string } | undefined)?.ville ?? ''
          return { ok: false, erreur: 'zone_non_servie', ville }
        }
        throw e
      }
    },
    supprimerAdresse: async (id: string) => {
      await api.supprimer(`/me/adresses/${seg(id)}`)
    },
    // PUT /api/me/adresses/{id} {principale: true}
    adresseParDefaut: async (id: string) => {
      await api.put(`/me/adresses/${seg(id)}`, { principale: true })
    },

    // GET · PUT /api/me/interets {univers}
    interets: async () => api.get<string[]>('/me/interets'),
    choisirInterets: async (univers: string[]) => {
      await api.put('/me/interets', { univers })
    },
  }
}
