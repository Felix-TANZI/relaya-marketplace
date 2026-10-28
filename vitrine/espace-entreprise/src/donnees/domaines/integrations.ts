// Domaine « intégrations » (ENT-P26) : fonction d'après le lancement (integrations_actives : non) ; au lancement,
// l'écran dit « bientôt disponible » sans aucun chiffre (ENT-P26R-01). Quand elle ouvrira : clés propres à l'entreprise,
// révocables, debit_par_cle appels par minute, rappels signés et rejouables sans double effet, rappels en échec retentés
// ENT-WEBHOOK-REESSAIS heures puis désactivés (ENT-P26R-04) ; les preuves restent faites dans l'application livreur
// (ENT-P26R-02), aucune donnée de client au-delà du portail (ENT-P26R-05), tout reste faisable dans le portail
// (ENT-P26R-03). Propriétaire seulement. API (après le lancement) : /api/company/integrations/keys, …/webhooks, …/logs.
// Environnement de test, ouvert dès maintenant : clé de test (masquée, montrée à la demande, régénérée après
// confirmation : l'ancienne cesse aussitôt), rappels de test (adresse https, événements choisis, essai signé), journal
// des appels de test, débit par minute. La clé de production attend l'ouverture (refus « fermee »).
// API : GET /integrations/space ; POST /integrations/keys {env} ; POST …/keys/{id}/reveal|rotate ;
// POST · DELETE /integrations/webhooks[/{id}] ; POST …/webhooks/{id}/test ; POST /integrations/sandbox/call.
import type { Instant, Resultat } from '../communs'

export interface EtatIntegrations {
  actives: boolean
  debitParMinute: number
  reessaisH: number
}

export type EnvApi = 'test' | 'production'
export type EvenementRappel = 'paquet_publie' | 'paquet_accepte' | 'statut'

export interface CleApi {
  id: string
  env: EnvApi
  apercu: string // « blv_test_••••••••3f9a » : jamais la clé entière dans une liste
  creeLe: Instant
  derniereUtilisation: Instant | null
}

export interface RappelApi {
  id: string
  url: string
  evenements: EvenementRappel[]
  actif: boolean // désactivé après ENT-WEBHOOK-REESSAIS heures d'échecs
  echecs: number
  derniereTentative: Instant | null
  dernierStatut: number | null
}

export interface AppelApi {
  id: string
  le: Instant
  env: EnvApi
  genre: 'appel' | 'rappel'
  methode: 'GET' | 'POST' | 'PUT'
  chemin: string
  statut: number
  dureeMs: number
}

export interface EspaceIntegrations {
  cles: CleApi[]
  rappels: RappelApi[]
  journal: AppelApi[] // du plus récent au plus ancien
  quota: { parMinute: number; cetteMinute: number }
}

export type RefusIntegrations = 'fermee' | 'existe' | 'introuvable' | 'url' | 'evenements' | 'quota' | 'sans_cle'

export interface DomaineIntegrations {
  etat(): Promise<EtatIntegrations>
  espace(): Promise<EspaceIntegrations>
  creerCle(env: EnvApi): Promise<Resultat<{ valeur: string }, RefusIntegrations>>
  /** Montre la clé entière (journalisé) ; l'écran la masque de nouveau. */
  revelerCle(id: string): Promise<Resultat<{ valeur: string }, RefusIntegrations>>
  /** Nouvelle valeur ; l'ancienne cesse aussitôt. */
  regenererCle(id: string): Promise<Resultat<{ valeur: string }, RefusIntegrations>>
  ajouterRappel(url: string, evenements: EvenementRappel[]): Promise<Resultat<object, RefusIntegrations>>
  retirerRappel(id: string): Promise<Resultat<object, RefusIntegrations>>
  essayerRappel(id: string): Promise<Resultat<{ statut: number }, RefusIntegrations>>
  /** Appel de test signé par la clé de test (compte dans le débit par minute). */
  appelDeTest(chemin: string): Promise<Resultat<{ statut: number }, RefusIntegrations>>
}
