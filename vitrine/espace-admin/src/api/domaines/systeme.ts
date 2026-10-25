// Domaine « systeme » branché sur le kit : interrupteurs (bascule à quatre yeux), santé (tableau : supervision,
// prestataires, sauvegardes, maintenances), tâches planifiées, maintenances (« maintenance », « maintenance-annuler »),
// textes légaux (« texte-legal ») et produits interdits (« produit-interdit ») : backend-kit/apps/console/systeme_serveur.py.
import type { ClientApi } from '@client/api/client'
import type { DomaineSysteme, ServiceSante, TableauConservation, TableauLegal, TableauRapports, TableauSante, TacheDetail, TachePlanifiee } from '../../donnees/domaines/systeme'
import { appels, decision, resultat, seg } from '../outils'
import type { InterrupteurKit } from './pilotage'

export function domaineSysteme(api: ClientApi): DomaineSysteme {
  const a = appels(api, 'systeme')
  return {
    interrupteurs: async () =>
      (await a.get<InterrupteurKit[]>('/interrupteurs')).map((x) => ({
        code: x.code,
        libelle: x.libelle,
        ouvert: x.ouvert,
        decision: x.derniereBascule ? x.derniereBascule.decision : x.parDefaut ? 'ouvert par défaut' : 'fermé par défaut',
      })),
    sante: () => a.get<ServiceSante[]>('/vues/sante'),
    taches: () => a.get<TachePlanifiee[]>('/vues/taches/courtes'),
    tableauSante: () => a.get<TableauSante>('/vues/sante/tableau'),
    async programmerMaintenance(m) {
      const r = await decision(a, 'maintenance', { service: m.service, debut: m.debut, dureeMin: m.dureeMin }, m.motif, [], (c) =>
        c === 'motif_court' || c === 'preavis' || c === 'creneau_interdit' ? c : c === 'chevauchement' ? ('creneau_interdit' as const) : ('inconnu' as const),
      )
      return r.ok ? { ok: true, id: String((r.resultat as { id?: string } | null)?.id ?? r.id) } : r
    },
    async annulerMaintenance(id, motif) {
      const r = await decision(a, 'maintenance-annuler', { maintenance: id }, motif, [], (c) => (c === 'motif_court' ? ('motif_court' as const) : ('inconnu' as const)))
      return r.ok ? { ok: true } : r
    },
    tableauTaches: () => a.get<TacheDetail[]>('/vues/taches'),
    async lancerTache(nom, motif) {
      const r = await resultat(
        a.post<{ ok: boolean; raison?: string }>(`/taches/${seg(nom)}/lancer`, { motif }).then((x) => ({ horsPeriode: x.raison === 'hors_periode' })),
        (c) => (c === 'motif_court' ? ('motif_court' as const) : ('inconnu' as const)),
      )
      if (!r.ok) return r
      return r.horsPeriode ? { ok: false, raison: 'deja_faite' } : { ok: true }
    },
    conservation: () => a.get<TableauConservation>('/vues/conservation'),
    rapports: (f) => a.get<TableauRapports>('/vues/rapports', { query: { periode: f.periode, ...(f.zone ? { zone: f.zone } : {}) } }),
    legal: () => a.get<TableauLegal>('/vues/legal'),
    async proposerVersion(v) {
      const r = await decision(a, 'texte-legal', { texte: v.texte, resume: v.resume, contenu: v.contenu, effet: v.effet }, v.motif, [], (c) =>
        c === 'motif_court' || c === 'preavis' || c === 'vocabulaire' || c === 'deja_annoncee' ? c : ('inconnu' as const),
      )
      return r.ok ? { ok: true, version: String((r.resultat as { version?: string } | null)?.version ?? '') } : r
    },
    async ajouterInterdit(categorie, produit, motif) {
      const r = await decision(a, 'produit-interdit', { categorie, produit }, motif, [], (c) => (c === 'motif_court' || c === 'existe' || c === 'vide' ? c : ('inconnu' as const)))
      return r.ok ? { ok: true } : r
    },
  }
}
