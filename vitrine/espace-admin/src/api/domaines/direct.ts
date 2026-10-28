// Domaine « direct » branché sur le kit : vue en direct et recherche transversale, filtrées par rôle et zones au kit.
import type { ClientApi } from '@client/api/client'
import type { DomaineDirect, ResultatRecherche, VueDirecte } from '../../donnees/domaines/direct'
import { appels } from '../outils'

export function domaineDirect(api: ClientApi): DomaineDirect {
  const a = appels(api, 'direct')
  return {
    // « activite » : journal récent des cinq espaces ; vide tant que le kit ne le sert pas.
    vue: async () => {
      const v = await a.get<Omit<VueDirecte, 'activite'> & { activite?: VueDirecte['activite'] }>('/vues/direct')
      return { ...v, activite: v.activite ?? [] }
    },
    chercher: (q) => (q.trim().length < 2 ? Promise.resolve([]) : a.get<ResultatRecherche[]>('/vues/recherche', { query: { q: q.trim() } })),
  }
}
