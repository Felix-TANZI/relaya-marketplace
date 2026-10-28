// Domaine « argent » branché sur le kit (relais_compte, relais_core/argent.py), gérant seul (403 droit_refuse pour un
// employé, ARL-06) : prochain versement, relevé, versement non reçu, changement du numéro de versement (deux codes SMS,
// vérification par une personne), dette à reverser (Mobile Money vers le numéro marchand), rapports et relevés.
import type { ClientApi } from '@client/api/client'
import type { Argent, DomaineArgent, FichierReleve, PeriodeRapport, Rapport, Versement } from '../../donnees/domaines/argent'
import type { SourceRelais } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

/** Période du contrat (?period=month|quarter|since_opening). */
const PERIODE: Record<PeriodeRapport, string> = { mois: 'month', trimestre: 'quarter', ouverture: 'since_opening' }

export function domaineArgent(api: ClientApi): SourceRelais['argent'] {
  const a = appels(api)
  type R<K extends keyof DomaineArgent> = Awaited<ReturnType<DomaineArgent[K]>>
  const d: DomaineArgent = {
    argent: () => a.get<Argent>('/payouts/next'),
    versements: () => a.get<Versement[]>('/payouts'),
    versement: (id) => ouNull(a.get<Versement>(`/payouts/${seg(id)}`)),
    signalerNonRecu: (id, o) => a.geste<R<'signalerNonRecu'>>(`/payouts/${seg(id)}/not-received`, o),
    changerNumero: (operateur, numero, o) => a.geste<R<'changerNumero'>>('/payout-number', o, { operateur, numero }),
    renvoyerCodes: (o) => a.geste<R<'renvoyerCodes'>>('/payout-number/resend', o),
    confirmerNumero: (codes, o) => a.geste<R<'confirmerNumero'>>('/payout-number/confirm', o, { codes }),
    annulerChangement: (o) => a.supprimer<R<'annulerChangement'>>('/payout-number/pending', o),
    reverserDette: (o) => a.geste<R<'reverserDette'>>('/debt/pay', o),
    rapport: (p) => a.get<Rapport>('/reports', { query: { period: PERIODE[p] } }),
    releve: (p, format) => a.get<FichierReleve>('/reports/statement', { query: { period: PERIODE[p], format } }),
  }
  return d
}
