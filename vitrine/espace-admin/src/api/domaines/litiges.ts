// Domaine « litiges » branché sur le kit : litiges des clients (aftersales) lus sous la forme de l'appli, tranchés
// par la décision « litige-client » (remboursement au-delà de REMB-CONTROLE-SEUIL à quatre yeux) ; passage en médiation
// (« litige-escalader ») et demande de pièce à une partie (« litige-complement », R70 pour le client).
import type { ClientApi } from '@client/api/client'
import type { DomaineLitiges, LitigeCourt, LitigeDossier, OptionLitige } from '../../donnees/domaines/litiges'
import { appels, decision, ouNull, seg } from '../outils'

const numero = (id: string) => Number(String(id).toUpperCase().replace(/^LIT-/, ''))
const ISSUES: Partial<Record<OptionLitige, string>> = { rembourser: 'rembourse', remplacer: 'remplace', debouter: 'refuse' }

export function domaineLitiges(api: ClientApi): DomaineLitiges {
  const a = appels(api, 'litiges')
  return {
    liste: () => a.get<LitigeCourt[]>('/vues/litiges'),
    litige: (id) => ouNull(a.get<LitigeDossier>(`/vues/litiges/${seg(id)}`)),
    async decider(id, option, motif) {
      const issue = ISSUES[option]
      if (!issue) return { ok: false, raison: 'non_permise', detail: 'Issue absente du catalogue du kit (litige-client : rembourse, remplace, refuse).' }
      return decision(a, 'litige-client', { litige: numero(id), issue }, motif, [], (c) => (c === 'motif_court' ? 'motif_court' : c === 'state_changed' ? 'deja_decide' : 'non_permise'))
    },
    async escalader(id, motif) {
      const r = await decision(a, 'litige-escalader', { litige: numero(id) }, motif, [], (c) => (c === 'deja_niveau_2' ? ('deja_niveau_2' as const) : ('motif_court' as const)))
      return r.ok ? { ok: true } : r
    },
    async demanderComplement(id, partie, motif) {
      const r = await decision(a, 'litige-complement', { litige: numero(id), partie }, motif, [], () => 'motif_court' as const)
      return r.ok ? { ok: true } : r
    },
  }
}
