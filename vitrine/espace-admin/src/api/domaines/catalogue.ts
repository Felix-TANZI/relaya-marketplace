// Domaine « catalogue » branché sur le kit : offres à modérer et signalements (avis, publicités) lus sous la forme de
// l'appli, tranchés par la décision « moderation » ; demandes de fiche, fiches maîtres, doublons et taxonomie
// (backend-kit/apps/console/catalogue_serveur.py).
import type { ClientApi } from '@client/api/client'
import type { Appariement, Avis, Categorie, DemandeCreation, DomaineCatalogue, FicheMaitre, OffreAModerer } from '../../donnees/domaines/catalogue'
import type { RaisonRefus } from '../../donnees/domaines/acteurs'
import { appels, decision, resultat, seg } from '../outils'
import { prixBarreValide } from '../../pages/ADM-06/calculs/regles'

const REFUS: readonly RaisonRefus[] = ['motif_court', 'pieces_non_vues', 'conflit_interets', 'deja_traite', 'lecture_seule', 'sans_evenement', 'meme_auteur', 'trop_tot', 'sans_croisement', 'doublon']
const refusCatalogue = (c: string): RaisonRefus => ((REFUS as readonly string[]).includes(c) ? (c as RaisonRefus) : 'lecture_seule')
const raison = (c: string) => (c === 'motif_court' ? ('motif_court' as const) : c === 'state_changed' ? ('deja_traite' as const) : ('lecture_seule' as const))

export function domaineCatalogue(api: ClientApi): DomaineCatalogue {
  const a = appels(api, 'catalogue')
  return {
    demandes: () => a.get<DemandeCreation[]>('/vues/demandes-fiches'),
    deciderDemande: (id, d) =>
      resultat(a.post<{ ok: true; etat: DemandeCreation['etat'] }>(`/vues/demandes-fiches/${seg(id)}/decider`, d, { idempotence: true }).then((x) => ({ etat: x.etat })), refusCatalogue),
    appariements: () => a.get<Appariement[]>('/vues/appariements'),
    deciderAppariement: (id, action, motif) =>
      resultat(a.post<{ ok: true; etat: Appariement['etat'] }>(`/vues/appariements/${seg(id)}/decider`, { action, motif }, { idempotence: true }).then((x) => ({ etat: x.etat })), (c) =>
        c === 'delai_depasse' ? ('delai_depasse' as const) : refusCatalogue(c),
      ),
    fiches: () => a.get<FicheMaitre[]>('/vues/fiches'),
    modifierFiche: (id, titre, motif) => resultat(a.post<{ ok: true }>(`/vues/fiches/${seg(id)}`, { titre, motif }, { idempotence: true }).then(() => ({})), refusCatalogue),
    taxonomie: () => a.get<Categorie[]>('/vues/taxonomie'),
    creerSousCategorie: (parent, nom) => a.post<{ ok: true } | { ok: false; raison: 'doublon' | 'vide' | 'lecture_seule'; existe?: string }>('/vues/taxonomie', { parent, nom }, { idempotence: true }),
    aModerer: () => a.get<OffreAModerer[]>('/vues/offres'),
    async deciderOffre(id, d) {
      // Recours : le vendeur du kit renvoie une offre corrigée (nouvelle vérification), il n'y a pas de recours à trancher.
      if (d.action === 'recours_maintenir' || d.action === 'recours_accepter') return { ok: false, raison: 'deja_traite' }
      const o = (await a.get<OffreAModerer[]>('/vues/offres')).find((x) => x.id === id)
      if (!o || o.etat !== 'a_moderer') return { ok: false, raison: 'deja_traite' }
      if (o.conflit) return { ok: false, raison: 'conflit_interets' }
      // Prix conseillé (VD-CONSEIL-PRIX) envoyé au vendeur avec le motif.
      const motif = d.suggestion && o.suggestion !== null ? `${d.motif.trim()} · Prix conseillé : ${o.suggestion} F` : d.motif
      if (d.action === 'retirer_barre') {
        if (o.prixBarre !== null && prixBarreValide(o.historique, o.prixBarre)) return { ok: false, raison: 'barre_valide' }
        const x = await resultat(a.post<{ ok: true }>(`/vues/promotions/rabais/PM-${seg(id)}/retirer`, { motif: d.motif }, { idempotence: true }).then(() => ({})), (c) => (c === 'etat' ? 'deja_traite' : refusCatalogue(c)))
        if (!x.ok && x.raison !== 'deja_traite') return x
      }
      const choix = d.action === 'valider' || d.action === 'retirer_barre' ? 'accepter' : 'refuser'
      const r = await decision(a, 'moderation', { genre: 'offre', id: Number(id), decision: choix }, motif, [], raison)
      return r.ok ? { ok: true, etat: choix === 'accepter' ? 'acceptee' : d.action === 'correction' ? 'correction' : 'depubliee' } : r
    },
    avis: () => a.get<Avis[]>('/vues/avis'),
    async deciderAvis(id, d) {
      if (!id.startsWith('P')) return { ok: false, raison: 'masquage_impossible', detail: 'L’avis produit est gardé par la boutique en ligne : le masquer se fait chez elle.' }
      const r = await decision(a, 'moderation', { genre: 'publicite', id: Number(id.slice(1)), decision: d.action === 'refuser' ? 'accepter' : 'refuser' }, d.motif, [], raison)
      return r.ok ? { ok: true, etat: d.action === 'refuser' ? 'publie' : d.action === 'masquer' ? 'masque' : 'retire' } : r
    },
  }
}
