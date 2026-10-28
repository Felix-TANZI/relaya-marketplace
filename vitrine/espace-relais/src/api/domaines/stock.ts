// Domaine « stock » branché sur le kit (relais_guichet ; relais_core/sorties.py, stock_vue.py) : stock par onglet, vue
// filtrée (catégorie, classe, code bloqué, comptoir, case), fiche (et fiche complète : parcours, garde jour par jour,
// preuves, journal, sans donnée personnelle), plan des cases, déplacement, inventaire (commencer, pointer, clore au PIN).
// GET /api/relay/stock sert les deux lectures : avec un filtre de vue (tab, class, blocked, counter, slot) → VueStock,
// sinon (filter, q) → Stock ; `tab` part donc toujours avec la vue.
import type { ClientApi } from '@client/api/client'
import type { ColisRelais } from '../../donnees/domaines/colis'
import type { DomaineStock, FicheColis, Inventaire, Stock, VueStock } from '../../donnees/domaines/stock'
import type { Case } from '../../calculs/capacite'
import type { SourceRelais } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineStock(api: ClientApi): SourceRelais['stock'] {
  const a = appels(api)
  type R<K extends keyof DomaineStock> = Awaited<ReturnType<DomaineStock[K]>>
  const d: DomaineStock = {
    stock: (onglet, recherche) => a.get<Stock>('/stock', { query: { filter: onglet, q: recherche || undefined } }),
    vue: (f = {}) =>
      a.get<VueStock>('/stock', {
        query: { tab: f.categorie ?? '', q: f.q || undefined, class: f.classe ?? undefined, blocked: f.codeBloque ? '1' : undefined, counter: f.auComptoir ? '1' : undefined, slot: f.emplacement ?? undefined },
      }),
    fiche: (id) => ouNull(a.get<ColisRelais>(`/parcels/${seg(id)}`)),
    ficheComplete: (id) => ouNull(a.get<FicheColis>(`/parcels/${seg(id)}`, { query: { detail: 'full' } })),
    plan: () => a.get<Case[]>('/slots'),
    deplacer: (colis, emplacement, o) => a.geste<R<'deplacer'>>(`/parcels/${seg(colis)}/move`, o, { emplacement }),
    inventaire: () => a.get<Inventaire | null>('/inventory'),
    commencerInventaire: (o) => a.geste<R<'commencerInventaire'>>('/inventory', o),
    // « courant » : l'inventaire en cours du relais (le serveur le retrouve ; même chemin au rejeu hors connexion).
    pointer: (colis, trouveEn, o) => a.geste<R<'pointer'>>('/inventory/courant/check', o, { colis, trouve_en: trouveEn }),
    async terminerInventaire(pin, o) {
      const inv = await a.get<Inventaire | null>('/inventory')
      if (!inv || inv.termineA !== null) return { ok: false, raison: 'aucun_inventaire' }
      return a.geste<R<'terminerInventaire'>>(`/inventory/${seg(inv.id)}/close`, o, { pin })
    },
  }
  return d
}
