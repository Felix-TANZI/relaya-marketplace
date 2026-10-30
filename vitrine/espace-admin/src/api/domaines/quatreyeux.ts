// Domaine « quatreyeux » branché sur le kit : décisions motivées (une porte : POST /console/decisions) et
// contre-signature d'une AUTRE personne habilitée (POST /console/decisions/{ref}/contresigner). Les gestes de l'appli
// (« relais.fermer », « livreur.suspendre »…) sont traduits en actions du catalogue du kit (GESTES) ; un geste sans
// service au kit lève NonBranche.
import type { ClientApi } from '@client/api/client'
import { AccesRefuse, type EtatDecision, type Resultat } from '../../donnees/communs'
import type { DecisionQuatreYeux, DemandeDecision, DomaineQuatreYeux, RaisonQuatreYeux } from '../../donnees/domaines/quatreyeux'
import { appels, decision, etatDecision, NonBranche, resultat, seg, type Appels, type DecisionKit } from '../outils'
import { CONNECTEURS_ADMIN } from '../routes'

const litige = (objet: string) => Number(String(objet).toUpperCase().replace(/^LIT-/, ''))
const JOUR = 86_400_000
const YAOUNDE = 3_600_000 // UTC+1, sans heure d'été
/** Début du jour à Yaoundé (ms) : portée « aujourd'hui » d'un export du journal. */
export const debutDuJour = (t = Date.now()) => Math.floor((t + YAOUNDE) / JOUR) * JOUR - YAOUNDE

/** Geste de l'appli → action du catalogue du kit et ses données (objet : identifiant rendu par les vues du kit). */
export const GESTES: Record<string, (objet: string, a: Appels) => Promise<{ action: string; donnees: Record<string, unknown> }>> = {
  'relais.activer': async (o) => ({ action: 'relais-etat', donnees: { relais: Number(o), actif: true } }),
  'relais.fermer': async (o) => ({ action: 'relais-etat', donnees: { relais: Number(o), actif: false } }),
  'entreprise.suspendre': async (o) => ({ action: 'entreprise-etat', donnees: { entreprise: Number(o), evenement: 'company.suspended', niveau: 'N1' } }),
  'entreprise.lever': async (o) => ({ action: 'entreprise-etat', donnees: { entreprise: Number(o), evenement: 'company.reinstated' } }),
  'entreprise.activer': async (o, a) => {
    const e = await a.get<{ statut: string }>(`/vues/entreprises/${seg(o)}`)
    return { action: 'entreprise-etat', donnees: { entreprise: Number(o), evenement: e.statut === 'pilote' ? 'company.activated' : 'company.pilot_started' } }
  },
  'livreur.suspendre': async (o) => ({ action: 'decision-livreur', donnees: { livreur: Number(o), niveau: 3 } }),
  'depart.clore': async (o) => ({ action: 'depart-cloture', donnees: { demande: Number(o) } }),
  'kit.maintenir': async (o) => ({ action: 'kit-contestation', donnees: { demande: Number(o), decision: 'maintenue' } }),
  'kit.annuler': async (o) => ({ action: 'kit-contestation', donnees: { demande: Number(o), decision: 'annulee' } }),
  'paquet.elargir': async (o) => ({ action: 'paquet-republier', donnees: { paquet: o } }),
  'versement.controle': async (o) => ({ action: 'versement-controle', donnees: { reference: o } }),
  'remboursement.executer': async (o) => ({ action: 'litige-client', donnees: { litige: litige(o), issue: 'rembourse' } }),
  'candidature.prendre': async (o) => ({ action: 'candidature-prendre', donnees: { reference: o } }),
  'candidature.completer': async (o) => ({ action: 'candidature-complement', donnees: { reference: o } }),
  'candidature.accepter': async (o) => ({ action: 'candidature-accepter', donnees: { reference: o } }),
  'candidature.refuser': async (o) => ({ action: 'candidature-refuser', donnees: { reference: o } }),
  // Export signé du journal : l'objet est une demande de données (« DA-… ») ou la journée en cours.
  'journal.exporter': async (o) => ({
    action: 'journal-export',
    donnees: { portee: /^DA-/i.test(o) ? { genre: 'demande', demande: o } : { genre: 'periode', du: debutDuJour(), au: debutDuJour() + JOUR } },
  }),
  'fraude.geler': async (o) => ({ action: 'fraude-gel', donnees: { alerte: Number(o) } }),
  'versement.exception': async (o) => ({ action: 'versement-exception', donnees: { reference: o } }),
  // Logistique (backend-kit/apps/console/logistique_serveur.py) : objet « quartier → Zn » pour placer un quartier.
  'zone.placer': async (o) => {
    const [quartier, zone] = o.split(' → ')
    return { action: 'zone-placer', donnees: { quartier: (quartier ?? '').trim(), zone: (zone ?? '').trim() } }
  },
  'zone.plan': async (o) => ({ action: 'zone-plan', donnees: { zone: o } }),
  'zone.saison': async (o) => ({ action: 'zone-saison', donnees: { zone: o } }),
  'emballage.commander': async (o) => ({ action: 'emballage-commander', donnees: { format: o } }),
  'emballage.facturer': async (o) => ({ action: 'emballage-facturer', donnees: { entreprise: Number(o) } }),
  'emballage.justifier': async (o) => ({ action: 'emballage-justifier', donnees: { entreprise: Number(o) } }),
  'etiquettes.attribuer': async (o) => ({ action: 'etiquettes-attribuer', donnees: { livreur: Number(o) } }),
  'etiquettes.invalider': async (o) => ({ action: 'etiquettes-invalider', donnees: { plage: Number(o) } }),
  'livreur.activer': async (o) => ({ action: 'livreur-activer', donnees: { livreur: o } }),
  'livreur.retablir': async (o) => ({ action: 'livreur-retablir', donnees: { livreur: Number(o) } }),
  'paquet.priorite': async (o) => ({ action: 'paquet-priorite', donnees: { paquet: o } }),
  'paquet.prevenir': async (o) => ({ action: 'paquet-prevenir', donnees: { paquet: o } }),
}

/** Action du kit d'un geste, sans appel (pour verifier) : null si le geste n'a pas de service au kit. */
export const ACTION_DU_GESTE: Record<string, string> = {
  'relais.activer': 'relais-etat',
  'relais.fermer': 'relais-etat',
  'entreprise.suspendre': 'entreprise-etat',
  'entreprise.lever': 'entreprise-etat',
  'entreprise.activer': 'entreprise-etat',
  'livreur.suspendre': 'decision-livreur',
  'depart.clore': 'depart-cloture',
  'kit.maintenir': 'kit-contestation',
  'kit.annuler': 'kit-contestation',
  'paquet.elargir': 'paquet-republier',
  'versement.controle': 'versement-controle',
  'remboursement.executer': 'litige-client',
  'candidature.prendre': 'candidature-prendre',
  'candidature.completer': 'candidature-complement',
  'candidature.accepter': 'candidature-accepter',
  'candidature.refuser': 'candidature-refuser',
  'journal.exporter': 'journal-export',
  'fraude.geler': 'fraude-gel',
  'versement.exception': 'versement-exception',
  'zone.placer': 'zone-placer',
  'zone.plan': 'zone-plan',
  'zone.saison': 'zone-saison',
  'emballage.commander': 'emballage-commander',
  'emballage.facturer': 'emballage-facturer',
  'emballage.justifier': 'emballage-justifier',
  'etiquettes.attribuer': 'etiquettes-attribuer',
  'etiquettes.invalider': 'etiquettes-invalider',
  'livreur.activer': 'livreur-activer',
  'livreur.retablir': 'livreur-retablir',
  'paquet.priorite': 'paquet-priorite',
  'paquet.prevenir': 'paquet-prevenir',
}

const RAISONS: Record<string, RaisonQuatreYeux> = {
  meme_personne: 'meme_compte',
  role_insuffisant: 'role_non_permis',
  state_changed: 'deja_traitee',
  motif_court: 'motif_court',
}

export function domaineQuatreYeux(api: ClientApi): DomaineQuatreYeux {
  const a = appels(api, 'quatreyeux')

  async function contresigner(id: string, accord: boolean, motif: string): Promise<Resultat<{ etat: EtatDecision }, RaisonQuatreYeux>> {
    try {
      return await resultat(
        a.post<DecisionKit & { contreseing: string | null }>(`/decisions/${seg(id)}/contresigner`, { accord, motif }, { idempotence: true }).then((d) => ({
          etat: d.statut === 'appliquee' ? ('contresignee' as const) : etatDecision(d),
        })),
        (c) => RAISONS[c] ?? 'deja_traitee',
      )
    } catch (x) {
      if (x instanceof AccesRefuse) return { ok: false, raison: 'role_non_permis', detail: x.message }
      throw x
    }
  }

  return {
    async decider(d: DemandeDecision) {
      const geste = GESTES[d.action]
      if (!geste) throw new NonBranche(`quatreyeux.decider(${d.action})`, CONNECTEURS_ADMIN['quatreyeux.decider'].route, 'geste sans action au catalogue du kit')
      try {
        const { action, donnees } = await geste(d.objet, a)
        const r = await decision(a, action, donnees, d.motif, d.preuves.map((p) => p.libelle), (c) => (c === 'motif_court' ? 'motif_court' : 'role_non_permis'))
        return r.ok ? { ok: true, etat: r.etat, id: r.id } : r
      } catch (x) {
        if (x instanceof AccesRefuse) return { ok: false, raison: 'role_non_permis', detail: x.message }
        throw x
      }
    },
    enAttente: () => a.get<DecisionQuatreYeux[]>('/vues/quatre-yeux', { query: { vue: 'attente' } }),
    historique: () => a.get<DecisionQuatreYeux[]>('/vues/quatre-yeux', { query: { vue: 'historique' } }),
    contresigner: (id, motif) => contresigner(id, true, motif),
    refuser: (id, motif) => contresigner(id, false, motif),
  }
}
