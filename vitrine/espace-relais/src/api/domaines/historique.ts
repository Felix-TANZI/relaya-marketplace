// Domaine « historique » branché sur le kit (relais_guichet, relais_core/quotidien.py) : opérations filtrées (aucun
// montant pour un employé, HIS-03) ; export CSV réservé au gérant (403 owner_only → droit_refuse).
import type { ClientApi } from '@client/api/client'
import type { DomaineHistorique, FiltresHistorique, Historique } from '../../donnees/domaines/historique'
import type { SourceRelais } from '../../donnees/source'
import { appels, sousDroits } from '../outils'

export function domaineHistorique(api: ClientApi): SourceRelais['historique'] {
  const a = appels(api)
  const query = (f: FiltresHistorique) => ({ period: f.periode, type: f.type || undefined, q: f.recherche || undefined })
  const d: DomaineHistorique = {
    historique: (f) => a.get<Historique>('/history', { query: query(f) }),
    exporter: (f) => sousDroits(a.get<Awaited<ReturnType<DomaineHistorique['exporter']>>>('/history/export', { query: query(f) })),
  }
  return d
}
