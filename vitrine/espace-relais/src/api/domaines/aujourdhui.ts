// Domaine « aujourd'hui » branché sur le kit (relais_guichet, relais_core/quotidien.py) : l'accueil du guichet ; gains
// et caisse à null pour un employé (le serveur filtre, ARL-06).
import type { ClientApi } from '@client/api/client'
import type { Aujourdhui } from '../../donnees/domaines/aujourdhui'
import type { SourceRelais } from '../../donnees/source'
import { appels } from '../outils'

export function domaineAujourdhui(api: ClientApi): SourceRelais['aujourdhui'] {
  const a = appels(api)
  return { aujourdhui: () => a.get<Aujourdhui>('/today') }
}
