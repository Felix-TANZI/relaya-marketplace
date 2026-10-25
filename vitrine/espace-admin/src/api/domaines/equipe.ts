// Domaine « equipe » branché sur le kit (backend-kit/apps/console/equipes.py, logique-metier/ACCES-CONSOLE.md) :
// équipes, niveaux, périmètres, rôle additionnel, accès temporaires, avertissements, revue trimestrielle, accès
// d'urgence, descentes terrain. Le kit tient les mêmes règles que la démonstration (§ 3 à § 5, quatre yeux, deux
// comptes Direction) ; un refus de règle revient en Resultat { ok: false, raison }, un refus de rôle en AccesRefuse.
import type { ClientApi } from '@client/api/client'
import type { Resultat } from '../../donnees/communs'
import type { Descente, DomaineEquipe, MesSessions, VueClient, FicheMembre, IssueAcces, MesMessages, MonEquipe, QuiPeut, RaisonAcces, RevueAcces, TableauDescentes, TableauEquipe } from '../../donnees/domaines/equipe'
import { appels, ouNull, resultat, seg } from '../outils'

const raison = (c: string) => c as RaisonAcces

export function domaineEquipe(api: ClientApi): DomaineEquipe {
  const a = appels(api, 'equipe')
  const geste = (chemin: string, corps: unknown): Promise<IssueAcces> => resultat(a.post<{ etat: 'applique' | 'a_contresigner'; qy: string | null; id?: string }>(chemin, corps, { idempotence: true }), raison)
  const simple = <T extends object = object>(chemin: string, corps: unknown): Promise<Resultat<T, RaisonAcces>> => resultat(a.post<T>(chemin, corps, { idempotence: true }), raison)
  const m = (id: string) => `/equipe/membres/${seg(id)}`
  return {
    tableau: () => a.get<TableauEquipe>('/equipe'),
    membre: (id) => ouNull(a.get<FicheMembre>(m(id))),
    quiPeut: () => a.get<QuiPeut>('/equipe/qui-peut'),
    inviter: (n, motif) => geste('/equipe/inviter', { ...n, motif }),
    changerNiveau: (id, niveau, motif) => geste(`${m(id)}/niveau`, { niveau, motif }),
    changerPerimetre: (id, perimetre, motif) => geste(`${m(id)}/perimetre`, { perimetre, motif }),
    changerRole: (id, role, motif) => geste(`${m(id)}/role`, { role, motif }),
    donnerTemporaire: (id, t) => geste(`${m(id)}/temporaires`, t),
    retirerTemporaire: (id, t, motif) => geste(`${m(id)}/temporaires/${seg(t)}/retirer`, { motif }),
    avertir: (pour, genre, texte) => simple<{ id: string; destinataires: number }>('/equipe/avertissements', { pour, genre, texte }),
    suspendre: (id, motif) => geste(`${m(id)}/suspendre`, { motif }),
    reactiver: (id, motif) => geste(`${m(id)}/reactiver`, { motif }),
    desactiver: (id, motif, repreneur) => simple<{ reattribues: number }>(`${m(id)}/desactiver`, { motif, repreneur }),
    revue: (equipe) => a.get<RevueAcces>(`/equipe/revues/${seg(equipe)}`),
    revoir: (ligne, decision, motif) => geste(`/equipe/revues/lignes/${seg(ligne)}`, { decision, motif }),
    monEquipe: () => a.get<MonEquipe>('/equipe/mon-equipe'),
    repartir: (dossier, vers) => simple(`/equipe/dossiers/${seg(dossier)}/repartir`, { vers }),
    mesMessages: () => a.get<MesMessages>('/moi/messages'),
    lireMessage: async (id) => void (await a.post(`/moi/messages/${seg(id)}/lu`, {})),
    ouvrirUrgence: (motif, heures) => simple<{ jusqua: number }>('/urgence', { motif, heures }),
    fermerUrgence: async () => void (await a.post('/urgence/fermer', {})),
    revoirUrgence: (id, motif) => simple(`/urgence/${seg(id)}/revoir`, { motif }),
    descentes: () => a.get<TableauDescentes>('/descentes'),
    planifier: (d) => simple<{ id: string }>('/descentes', d),
    assigner: (id, agentId) => simple(`/descentes/${seg(id)}/assigner`, { agent: agentId }),
    annulerDescente: (id, motif) => simple(`/descentes/${seg(id)}/annuler`, { motif }),
    mesDescentes: () => a.get<Descente[]>('/moi/descentes'),
    descente: (id) => ouNull(a.get<Descente>(`/descentes/${seg(id)}`)),
    avancer: (id, statut) => simple(`/descentes/${seg(id)}/avancer`, { statut }),
    rapporter: (id, r) => simple(`/descentes/${seg(id)}/rapport`, r),
    mesSessions: () => a.get<MesSessions>('/moi/sessions'),
    async fermerAutresSessions() {
      // Le kit rend une paire neuve à cet appareil (les jetons d'avant sont refusés) : on la garde.
      const r = await a.post<{ fermees: number; acces: string; rafraichissement: string }>('/moi/sessions/fermer-autres', {})
      api.jetons.ecrire({ acces: r.acces, rafraichissement: r.rafraichissement })
      return { fermees: r.fermees }
    },
    ouvrirVueClient: (client, motif) => resultat(a.post<{ jusqua: number }>(`/vues/clients/${seg(client)}/apercu`, { motif }, { idempotence: true }), (x) => x as 'motif_court' | 'inconnu'),
    vueClient: (client) => ouNull(a.get<VueClient>(`/vues/clients/${seg(client)}/apercu`)),
  }
}
