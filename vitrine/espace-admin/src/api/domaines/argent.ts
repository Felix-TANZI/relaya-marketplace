// Domaine « argent » branché sur le kit : escrow, Wallet, remboursements (statut relevé chez l'opérateur), versements du
// vendredi (formes de l'appli, montants du kit), exécution d'un remboursement (décision litige-client), rapprochement
// et revenus, relevé importé, cartes Finance, clôture transmise au comptable (backend-kit/apps/console/argent_serveur.py),
// grand livre (export comptable signé, JSON Lines).
import type { ClientApi } from '@client/api/client'
import type { Instant } from '../../donnees/communs'
import type { DomaineArgent, EtatRemb, LigneExport, VueCommissions, VueEscrow, VueRapprochement, VueRemboursements, VueVersements, VueWallet } from '../../donnees/domaines/argent'
import { appels, decision, resultat, seg } from '../outils'

/** Jour civil de Yaoundé (UTC+1) d'un instant : « AAAA-MM-JJ ». */
export const jourYaounde = (t: Instant) => new Date(t + 3600_000).toISOString().slice(0, 10)

/** Corps JSON Lines de l'export comptable : première ligne {entete}, puis une écriture par ligne. */
export function lignesJsonl(corps: unknown): LigneExport[] {
  const texte = typeof corps === 'string' ? corps : ''
  return texte
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as LigneExport & { entete?: unknown })
    .filter((x) => !('entete' in x))
    .map(({ date, piece, compte, libelle, debit, credit }) => ({ date, piece, compte, libelle, debit, credit }))
}

export function domaineArgent(api: ClientApi): DomaineArgent {
  const a = appels(api, 'argent')
  return {
    escrow: () => a.get<VueEscrow>('/vues/escrow'),
    wallet: () => a.get<VueWallet>('/vues/wallet'),
    remboursements: () => a.get<VueRemboursements>('/vues/remboursements'),
    releverStatut: (id) =>
      resultat(a.post<{ ok: true; etat: EtatRemb }>(`/vues/remboursements/${seg(id)}/relever`, {}).then((x) => ({ etat: x.etat })), (c) => (c === 'etat' ? ('etat' as const) : ('inconnu' as const))),
    async executer(id) {
      const n = Number(String(id).toUpperCase().replace(/^LIT-/, ''))
      const r = await decision(a, 'litige-client', { litige: n, issue: 'rembourse' }, 'Remboursement exécuté depuis la console', [], (c) => (c === 'not_found' || c === 'inconnu' ? 'inconnu' : 'etat'))
      if (!r.ok) return r
      return { ok: true, etat: r.etat === 'a_contresigner' ? 'a_contresigner' : 'decide' }
    },
    versements: () => a.get<VueVersements>('/vues/versements'),
    rapprochement: () => a.get<VueRapprochement>('/vues/rapprochement'),
    importerReleve: (nom, contenu) => a.post<{ ok: true; lignes: number; ecarts: number } | { ok: false; raison: 'vide' | 'forme' }>('/vues/rapprochement/releve', { nom, contenu }, { idempotence: true }),
    ouvrirCarte: (objet, texte) => a.post<{ ok: true; id: string } | { ok: false; raison: 'deja' }>('/vues/cartes-finance', { objet, texte }, { idempotence: true }),
    transmettreComptable: (mois) => a.post<{ ok: true } | { ok: false; raison: 'deja' }>('/vues/cloture/transmettre', { mois }, { idempotence: true }),
    commissions: () => a.get<VueCommissions>('/vues/commissions'),
    grandLivre: async (du, au) => lignesJsonl(await a.get<unknown>('/finances/export', { query: { du: jourYaounde(du), au: jourYaounde(au), sortie: 'jsonl' } })),
  }
}
