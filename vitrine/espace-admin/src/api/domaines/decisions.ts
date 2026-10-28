// Domaine « decisions » (poste de travail des décisions encadrées, logique-metier/DECISIONS-ENCADREES.md) branché sur le
// kit : /api/console/postes… (backend-kit/apps/console/vues_postes.py, postes.py, postes_genres.py). Les sept genres
// (litige, kyc, remboursement, sanction, constat, kit, signalement) ; le serveur refait chaque contrôle, dans l'ordre de
// logique-metier/CONTROLES-SERVEUR-DECISIONS.md, et rend le code de refus de l'écran (422 { code }). Décision et lot :
// clé d'idempotence ; au-delà de REMB-CONTROLE-SEUIL, la décision attend un second validateur (202, à contre-signer).
import type { ClientApi } from '@client/api/client'
import type { Resultat } from '../../donnees/communs'
import type { DomaineDecisions, DossierCourt, DossierPoste, GenreDossier, LigneEcart, RefusPoste } from '../../donnees/domaines/decisions'
import { appels, ouNull, resultat, seg } from '../outils'

const CODES: readonly RefusPoste[] = [
  'deja_decide',
  'trop_tot',
  'auteur',
  'lie',
  'hors_regle',
  'disculpe',
  'au_dela_paye',
  'hors_fourchette',
  'geste_commission',
  'motif',
  'note_courte',
  'lecture_seule',
  'transmettre',
  'prolongation_unique',
  'lot_heterogene',
  'lot_plafond',
  'lot_taille',
  'accord_hors_issues',
  'en_attente',
]

/** Code du kit → raison de l'écran : les codes du moteur sont ceux de l'écran ; le reste se rapproche du plus proche. */
export function raisonPoste(code: string): RefusPoste {
  if ((CODES as readonly string[]).includes(code)) return code as RefusPoste
  if (code === 'motif_court') return 'note_courte'
  if (code === 'inconnu' || code === 'not_found' || code === 'state_changed') return 'deja_decide'
  return 'hors_regle'
}

export function domaineDecisions(api: ClientApi): DomaineDecisions {
  const a = appels(api, 'decisions')
  const base = (genre: GenreDossier, id: string) => `/postes/${seg(genre)}/${seg(id)}`
  const r = <T extends object>(p: Promise<T>) => resultat(p, raisonPoste) as Promise<Resultat<T, RefusPoste>>

  return {
    file: (genre) => a.get<DossierCourt[]>('/postes', { query: { genre, tout: 1 } }),
    dossier: (genre, id) => ouNull(a.get<DossierPoste>(base(genre, id))),
    controler: (genre, id, controle, etat) => r(a.post<{ ok: true }>(`${base(genre, id)}/controles`, { controle, etat }, { idempotence: true }).then(() => ({}))),
    noterAppel: (genre, id, x) => r(a.post<{ ok: true; id: string }>(`${base(genre, id)}/appels`, x, { idempotence: true }).then((y) => ({ id: String(y.id) }))),
    decider: (genre, id, d) =>
      r(
        a
          .post<{ ok: true; etat: 'appliquee' | 'a_contresigner'; id: string }>(`${base(genre, id)}/decision`, d, { idempotence: true })
          .then((y) => ({ etat: y.etat, id: String(y.id) })),
      ),
    transmettre: (genre, id, raison, issueProposee) =>
      r(a.post<{ ok: true; vers: string }>(`${base(genre, id)}/transmettre`, { raison, issueProposee }, { idempotence: true }).then((y) => ({ vers: y.vers }))),
    prolonger: (genre, id, note) => r(a.post<{ ok: true; echeance: number }>(`${base(genre, id)}/prolonger`, { note }, { idempotence: true }).then((y) => ({ echeance: y.echeance }))),
    deciderLot: (genre, ids, d) => r(a.post<{ ok: true; n: number }>(`/postes/${seg(genre)}/lot`, { ...d, ids }, { idempotence: true }).then((y) => ({ n: y.n }))),
    ecarts: () => a.get<LigneEcart[]>('/postes/ecarts', { query: { tout: 1 } }),
  }
}
