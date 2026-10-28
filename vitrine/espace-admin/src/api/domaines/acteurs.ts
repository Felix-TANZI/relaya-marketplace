// Domaine « acteurs » branché sur le kit : vendeurs, dossiers KYC (boutiques B…, livreurs L…, entreprises E…), pièces
// par lien court journalisé, clients masqués, qualité (Trust Score lu) ; décisions KYC et sanctions par le catalogue.
import type { ClientApi } from '@client/api/client'
import type { Instant, Resultat } from '../../donnees/communs'
import type { AbonnementClient, AccesActeur, ActeurQualite, ClientCourt, DomaineActeurs, DossierKyc, EtatKyc, EtatProposition, EtatSanction, FicheClient, FicheVendeur, PropositionPalier, RaisonAcces, RaisonRefus, Sanction, VendeurCourt } from '../../donnees/domaines/acteurs'
import type { PalierIfa } from '../../pages/ADM-06/calculs/regles'
import type { EspaceTrust, Palier } from '../../pages/ADM-06/calculs/regles'
import { appels, decision, NonBranche, ouNull, resultat, seg } from '../outils'
import { CONNECTEURS_ADMIN } from '../routes'
import { demasquer } from './commandes'

const REFUS: readonly RaisonRefus[] = ['motif_court', 'pieces_non_vues', 'conflit_interets', 'deja_traite', 'lecture_seule', 'sans_evenement', 'meme_auteur', 'trop_tot', 'sans_croisement', 'doublon']
/** Refus d'une décision d'acteur : le code du kit quand l'écran le connaît (state_changed : déjà traité). */
const refusActeur = (c: string): RaisonRefus => ((REFUS as readonly string[]).includes(c) ? (c as RaisonRefus) : c === 'state_changed' || c === 'inconnu' ? 'deja_traite' : 'lecture_seule')
const RAISONS_ACCES: readonly RaisonAcces[] = ['motif_court', 'sans_effet', 'deja_demande']
const raison = (c: string): RaisonRefus => (c === 'motif_court' ? 'motif_court' : c === 'state_changed' ? 'deja_traite' : refusActeur(c))

interface LigneQualite {
  id: number
  nom: string
  score: number | null
  palier: string | null
  entreprise?: string | null
  zones: string[]
  historique?: number[]
  veto?: boolean
  sanctionsOuvertes?: number
}
const ACTEURS: [string, EspaceTrust, string][] = [
  ['vendeurs', 'vendeur', 'vendeurs'],
  ['entreprises', 'entreprise', 'entreprises'],
  ['livreurs', 'livreur', 'livreurs'],
  ['relais', 'relais', 'relais'],
]
const palier = (p: string | null): Palier | null => (p ? (p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() as Palier) : null)

type PieceAvecType = DossierKyc['pieces'][number] & { type?: string }

export function domaineActeurs(api: ClientApi): DomaineActeurs {
  const a = appels(api, 'acteurs')

  async function dossier(id: string): Promise<DossierKyc | undefined> {
    return (await a.get<DossierKyc[]>('/vues/kyc')).find((x) => x.id === id)
  }

  return {
    vendeurs: () => a.get<VendeurCourt[]>('/vues/vendeurs'),
    vendeur: (id) => ouNull(a.get<FicheVendeur>(`/vues/vendeurs/${seg(id)}`)),
    demasquerVendeur: (id, motif) => demasquer(a, 'vendeur', id, 'numero', motif),
    kyc: () => a.get<DossierKyc[]>('/vues/kyc'),
    async ouvrirPiece(dossierId, piece, motif) {
      if (!motif.trim()) return { ok: false, raison: 'motif_court' }
      if (!/^\d+$/.test(piece)) throw new NonBranche('acteurs.ouvrirPiece', CONNECTEURS_ADMIN['acteurs.ouvrirPiece'].route, `la pièce ${piece} du dossier ${dossierId} n’a pas de fichier au kit`)
      const l = await a.post<{ jeton: string; expireLe: Instant }>(`/pieces/${seg(piece)}/lien`)
      const p = await a.get<{ titulaire: string; fichier: { chemin?: string } | null }>(`/pieces/ouvrir/${seg(l.jeton)}`)
      return { ok: true, lien: { url: p.fichier?.chemin ?? '', expireLe: l.expireLe, filigrane: `BelivaY · ${p.titulaire} · consultation journalisée` } }
    },
    async deciderKyc(id, d): Promise<Resultat<{ etat: EtatKyc; sanction: string | null }, RaisonRefus>> {
      if (d.action === 'complement') {
        const r = await decision(a, 'kyc-complement', { dossier: id, pieces: d.pieces }, d.motif, [], raison)
        return r.ok ? { ok: true, etat: 'complement', sanction: null } : r
      }
      const approuver = d.action === 'approuver'
      const motif = approuver ? 'Pièces vérifiées et conformes' : d.motif
      const etat: EtatKyc = approuver ? 'approuve' : 'rejete'
      const n = id.slice(1)
      if (id.startsWith('B')) {
        const r = await decision(a, 'kyc-vendeur', { boutique: Number(n), decision: approuver ? 'approuver' : 'refuser' }, motif, [], raison)
        return r.ok ? { ok: true, etat, sanction: null } : r
      }
      const dos = await dossier(id)
      if (!dos) return { ok: false, raison: 'deja_traite' }
      const pieces = (dos.pieces as PieceAvecType[]).filter((p) => (approuver ? p.etat === 'a_revoir' : d.action === 'rejeter' && p.id === d.piece))
      for (const p of pieces) {
        const r = id.startsWith('L')
          ? await decision(a, 'piece-livreur', { livreur: Number(n), type: p.type, accord: approuver }, motif, [], raison)
          : await decision(a, 'piece-entreprise', { entreprise: Number(n), type: p.type, valide: approuver }, motif, [], raison)
        if (!r.ok) return r
      }
      return { ok: true, etat, sanction: null }
    },
    abonnements: () => a.get<{ liste: AbonnementClient[]; plafondGeste: number | null }>('/vues/abonnements'),
    gesteAbonnement: (id, montant, motif) => resultat(a.post(`/abonnements/${seg(id)}/geste`, { montant, motif }, { idempotence: true }), (x) => x as 'motif_court' | 'plafond' | 'montant' | 'inconnu'),
    paliers: () => a.get<PropositionPalier[]>('/vues/paliers'),
    deciderPalier: (id, d) =>
      resultat(a.post<{ ok: true; etat: EtatProposition }>(`/vues/paliers/${seg(id)}/decider`, d, { idempotence: true }).then((x) => ({ etat: x.etat })), refusActeur),
    sanctions: () => a.get<Sanction[]>('/vues/sanctions'),
    deciderSanction: (id, d) =>
      resultat(
        a.post<{ ok: true; etat: EtatSanction; quatreYeux: string | null }>(`/vues/sanctions/${seg(id)}/decider`, d, { idempotence: true }).then((x) => ({ etat: x.etat, quatreYeux: x.quatreYeux })),
        refusActeur,
      ),
    proposerSanction: (p) =>
      resultat(
        a.post<{ ok: true; id: string }>('/vues/sanctions', { acteurId: p.acteurId, espace: p.espace, niveau: p.niveau, motif: p.motif, origine: p.origine }, { idempotence: true }).then((x) => ({ id: x.id })),
        refusActeur,
      ),
    clients: () => a.get<ClientCourt[]>('/vues/clients'),
    client: (id) => ouNull(a.get<FicheClient>(`/vues/clients/${seg(id)}`)),
    demasquerClient: (id, motif) => demasquer(a, 'client', id, 'telephone', motif),
    deciderIfa: (id, d) => resultat(a.post<{ ok: true; palier: PalierIfa }>(`/vues/clients/${seg(id)}/ifa`, d, { idempotence: true }).then((x) => ({ palier: x.palier })), refusActeur),
    accesActeur: (espace, id) => a.get<AccesActeur>(`/vues/acces/${seg(espace)}/${seg(id)}`),
    changerAcces: (d) =>
      resultat(
        a.post<{ ok: true; etat: 'appliquee' | 'a_contresigner'; id: string } | { ok: false; raison: RaisonAcces }>(
          '/vues/acces',
          { espace: d.espace, acteurId: d.acteurId, etat: d.etat, motif: d.motif },
          { idempotence: true },
        ),
        (c) => ((RAISONS_ACCES as readonly string[]).includes(c) ? (c as RaisonAcces) : 'sans_effet'),
      ) as ReturnType<DomaineActeurs['changerAcces']>,
    async qualite() {
      const listes = await Promise.all(
        ACTEURS.map(async ([acteur, espace, route]) => {
          const r = await a.get<{ elements: LigneQualite[] }>('/qualite', { query: { acteur } })
          return r.elements.map(
            (x): ActeurQualite => ({
              id: String(x.id),
              nom: x.nom,
              espace,
              zone: x.zones[0] ?? '',
              organisation: x.entreprise ?? null,
              score: x.score,
              palier: espace === 'relais' ? null : palier(x.palier), // paliers du relais (Starter, Confirmé, Premium) : propres au relais
              historique: x.historique ?? [],
              veto: x.veto ?? false,
              sanctionsOuvertes: x.sanctionsOuvertes ?? 0,
              route,
              params: { id: String(x.id) },
            }),
          )
        }),
      )
      return listes.flat()
    },
  }
}
