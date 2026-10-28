// Domaine « logistique » branché sur le kit : zones, relais, entreprises, couverture, livreurs, départs, paquets,
// candidatures (formes de l'appli, filtrées par zone au kit) ; verifier lit le catalogue des décisions et les rôles
// du kit ; la console n'affecte jamais un livreur ni un paquet.
import type { ClientApi } from '@client/api/client'
import type { Role } from '../../donnees/communs'
import type {
  Candidature,
  CouvertureZone,
  ChangementIdentifiant,
  Depart,
  DomaineLogistique,
  DossierLivreur,
  Emballages,
  EntrepriseCourte,
  EntrepriseFiche,
  LivreurCourt,
  LivreurFiche,
  PaquetCourt,
  PaquetFiche,
  PlacementQuartier,
  PointCarte,
  RelaisCourt,
  RelaisFiche,
  Zone,
  ZonePilotage,
} from '../../donnees/domaines/logistique'
import type { Instant } from '../../donnees/communs'
import { appels, decision, ouNull, seg } from '../outils'
import { ACTION_DU_GESTE } from './quatreyeux'

interface ActionCatalogue {
  code: string
  permission: string
  permise: boolean
  doubleControle: boolean | string
}
interface RolesKit {
  permissions: Record<string, string[]>
  quatreYeux: { action: string; second: string[] | string; toujours: boolean }[]
}

export function domaineLogistique(api: ClientApi): DomaineLogistique {
  const a = appels(api, 'logistique')
  let catalogue: { le: number; actions: ActionCatalogue[]; roles: RolesKit } | null = null
  const lireCatalogue = async () => {
    if (!catalogue || Date.now() - catalogue.le > 60_000) {
      const [actions, roles] = await Promise.all([a.get<ActionCatalogue[]>('/actions'), a.get<RolesKit>('/roles')])
      catalogue = { le: Date.now(), actions, roles }
    }
    return catalogue
  }

  return {
    zones: async () => (await a.get<(Zone & Record<string, unknown>)[]>('/zones')).map(({ code, nom, exploitee }) => ({ code, nom, exploitee })),
    relais: () => a.get<RelaisCourt[]>('/vues/relais'),
    relaisFiche: (id) => ouNull(a.get<RelaisFiche>(`/vues/relais/${seg(id)}`)),
    entreprises: () => a.get<EntrepriseCourte[]>('/vues/entreprises'),
    entrepriseFiche: (id) => ouNull(a.get<EntrepriseFiche>(`/vues/entreprises/${seg(id)}`)),
    couverture: () => a.get<CouvertureZone[]>('/vues/couverture'),
    placements: () => a.get<PlacementQuartier[]>('/vues/placements'),
    livreurs: () => a.get<LivreurCourt[]>('/vues/livreurs'),
    livreurFiche: (id) => ouNull(a.get<LivreurFiche>(`/vues/livreurs/${seg(id)}`)),
    departs: () => a.get<Depart[]>('/vues/departs'),
    changements: () => a.get<ChangementIdentifiant[]>('/vues/changements'),
    paquets: () => a.get<PaquetCourt[]>('/vues/paquets'),
    paquetFiche: (id) => ouNull(a.get<PaquetFiche>(`/vues/paquets/${seg(id)}`)),
    pilotage: () => a.get<ZonePilotage[]>('/vues/pilotage'),
    carte: () => a.get<PointCarte[]>('/vues/carte'),
    consulterPosition: (id) => a.post<{ ok: true; le: Instant } | { ok: false; raison: 'hors_mission' }>(`/vues/livreurs/${seg(id)}/position`),
    emballages: () => a.get<Emballages>('/vues/emballages'),
    candidatures: () => a.get<Candidature[]>('/vues/candidatures'),
    dossiersLivreurs: () => a.get<DossierLivreur[]>('/vues/livreurs-activations'),
    async verifier(action) {
      const code = ACTION_DU_GESTE[action]
      if (!code) return { ok: false, raison: 'inconnu', detail: 'Geste sans service au kit' }
      const { actions, roles } = await lireCatalogue()
      const x = actions.find((y) => y.code === code)
      if (!x) return { ok: false, raison: 'inconnu' }
      if (!x.permise) return { ok: false, raison: 'role' }
      const qy = roles.quatreYeux.find((y) => y.action === code)
      const rolesDe = (p: string) => (roles.permissions[p] ?? []) as Role[]
      const quatreYeux = x.doubleControle === true || action === 'relais.fermer'
      return {
        ok: true,
        regle: {
          roles: rolesDe(x.permission),
          quatreYeux,
          rolesSecond: quatreYeux ? (Array.isArray(qy?.second) ? (qy.second as Role[]) : rolesDe(x.permission)) : [],
          route: code,
        },
        detail: null,
      }
    },
    async suspendreLivreur(id, motif, jusqua) {
      const jours = jusqua ? Math.max(1, Math.ceil((jusqua - Date.now()) / 86_400_000)) : undefined
      const r = await decision(a, 'decision-livreur', { livreur: Number(id), niveau: 3, ...(jours ? { dureeJours: jours } : {}) }, motif)
      if (r.ok) return { ok: true }
      if (r.raison === 'motif_court') return { ok: false, raison: 'motif_court' }
      throw new Error(r.detail ?? r.raison)
    },
  }
}
