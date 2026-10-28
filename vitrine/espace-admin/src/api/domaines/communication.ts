// Domaine « communication » branché sur le kit (backend-kit/apps/console/communication_serveur.py) : journal des envois
// et renvoi (même clé), budget des SMS, diffusions (quatre yeux au-delà du seuil de destinataires), modèles de messages
// (une version FR et EN, motif gardé), pannes de service et mode papier (registre des relais), support (demandes nées
// des conversations des espaces) et centre d'aide. Les refus de règle du kit arrivent avec le code de l'écran.
import type { ClientApi } from '@client/api/client'
import type { Resultat } from '../../donnees/communs'
import type {
  ArticleAide,
  BudgetSms,
  Diffusion,
  DomaineCommunication,
  Envoi,
  Incident,
  ModeleMessage,
  RaisonDiffusion,
  RaisonIncident,
  RaisonModele,
  RaisonSupport,
  ReponseType,
  ServiceEtat,
  TicketSupport,
} from '../../donnees/domaines/communication'
import { appels, resultat, seg } from '../outils'

const parmi =
  <R extends string>(l: readonly R[], defaut: R) =>
  (c: string): R =>
    (l as readonly string[]).includes(c) ? (c as R) : defaut

const DIFFUSION: readonly RaisonDiffusion[] = ['motif_court', 'contenu', 'sms_promo', 'heures_promo', 'passe', 'vide', 'objet']
const MODELE: readonly RaisonModele[] = ['numero', 'code', 'variable_inconnue', 'code_hors_modele', 'motif_court', 'sms_promo', 'inchange', 'vide']
const INCIDENT: readonly RaisonIncident[] = ['motif_court', 'contenu', 'etat', 'zones', 'perimetre', 'registre', 'rapport', 'non_retabli', 'service']
const SUPPORT: readonly RaisonSupport[] = ['contenu', 'vide', 'etat', 'geste_depasse', 'deja_geste', 'non_rattache', 'motif_court', 'inconnu']

export function domaineCommunication(api: ClientApi): DomaineCommunication {
  const a = appels(api, 'communication')
  const ok = () => ({})
  const panne = (id: string, geste: string, corps: object = {}): Promise<Resultat<object, RaisonIncident>> =>
    resultat(a.post<{ ok: true }>(`/vues/pannes/${seg(id)}/${geste}`, corps, { idempotence: true }).then(ok), parmi(INCIDENT, 'etat'))
  const ticket = (id: string, geste: string, corps: object = {}): Promise<Resultat<object, RaisonSupport>> =>
    resultat(a.post<{ ok: true }>(`/vues/tickets/${seg(id)}/${geste}`, corps, { idempotence: true }).then(ok), parmi(SUPPORT, 'etat'))

  return {
    envois: () => a.get<Envoi[]>('/vues/envois'),
    renvoyer: (id) =>
      resultat(a.post<{ ok: true }>(`/vues/envois/${seg(id)}/renvoyer`, {}, { idempotence: true }).then(ok), (c) =>
        c === 'deja_delivre' || c === 'quota' ? c : ('inconnu' as const),
      ),
    budgetSms: () => a.get<BudgetSms>('/vues/budget-sms'),
    diffusions: () => a.get<Diffusion[]>('/vues/diffusions'),
    audience: async (espaces, zones, promotion) =>
      (await a.get<{ destinataires: number }>('/vues/audience', { query: { espaces: espaces.join(','), zones: zones.join(','), promotion: promotion ? 1 : 0 } })).destinataires,
    diffuser: (d) =>
      resultat(
        a.post<{ ok: true; id: string; etat: Diffusion['etat'] }>('/vues/diffusions', d, { idempotence: true }).then((x) => ({ id: x.id, etat: x.etat })),
        parmi(DIFFUSION, 'vide'),
      ),
    modeles: () => a.get<ModeleMessage[]>('/vues/modeles'),
    publierModele: (id, fr, en, motif) =>
      resultat(a.post<{ ok: true; version: number }>(`/vues/modeles/${seg(id)}/publier`, { fr, en, motif }, { idempotence: true }).then((x) => ({ version: x.version })), parmi(MODELE, 'vide')),
    services: () => a.get<ServiceEtat[]>('/vues/services'),
    incidents: () => a.get<Incident[]>('/vues/pannes'),
    declarer: (d) => resultat(a.post<{ ok: true; id: string }>('/vues/pannes', d, { idempotence: true }).then((x) => ({ id: x.id })), parmi(INCIDENT, 'service')),
    passerPapier: (id, relais) => panne(id, 'papier', { relais }),
    mettreAJour: (id, consignes) => panne(id, 'consignes', { consignes }),
    retablir: (id) => panne(id, 'retablir'),
    relancerRessaisie: (id, remise) => panne(id, 'ressaisie', { remise }),
    ecrireRapport: (id, r) => panne(id, 'rapport', r),
    clore: (id) => panne(id, 'clore'),
    tickets: () => a.get<TicketSupport[]>('/vues/tickets'),
    rattacher: (id, ref) => ticket(id, 'rattacher', { ref }),
    preparerReponse: (id, reponseType, texte) => ticket(id, 'brouillon', { reponseType, texte }),
    envoyerReponse: (id) => ticket(id, 'reponse'),
    resoudre: (id) => ticket(id, 'resoudre'),
    accorderGeste: (id, motif) => ticket(id, 'geste', { motif }),
    reponsesTypes: () => a.get<ReponseType[]>('/vues/reponses-types'),
    articles: () => a.get<ArticleAide[]>('/vues/articles'),
    mettreAJourArticle: (id) => resultat(a.post<{ ok: true }>(`/vues/articles/${seg(id)}`, {}, { idempotence: true }).then(ok), parmi(SUPPORT, 'inconnu')),
  }
}
