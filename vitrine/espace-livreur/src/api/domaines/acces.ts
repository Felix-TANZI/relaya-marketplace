// Domaine « acces » branché sur le kit (backend-kit/apps/livreur_session) : activation (charte, pièces KYC),
// certification (modules, quiz tiré et corrigé par le serveur), états du compte et recours.
import type { ClientApi } from '@client/api/client'
import type { Activation, Certification, DomaineAcces, EtatDuCompte } from '../../donnees/domaines/acces'
import type { SourceLivreur } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineAcces(api: ClientApi): SourceLivreur['acces'] {
  const a = appels(api)
  const d: DomaineAcces = {
    activation: () => a.get<Activation>('/activation'),
    accepterCharte: (version, origine) => a.geste('/activation/charter', origine, { version }),
    envoyerPiece: (id, envoi, origine) => a.geste('/kyc/documents', origine, { piece: id, octets: envoi.octets, controles: envoi.controles }),
    certification: () => a.get<Certification>('/certification'),
    lireCarte: async (moduleId, carte) => {
      await a.post(`/certification/modules/${seg(moduleId)}/cards`, { carte })
    },
    terminerModule: (moduleId, origine) => a.geste(`/certification/modules/${seg(moduleId)}/done`, origine),
    reglerLectureVocale: async (active) => {
      await a.put('/certification/voice', { active })
    },
    commencerQuiz: (origine) => a.geste('/certification/quiz/start', origine),
    envoyerQuiz: (tentativeId, reponses, horsLigne, origine) => a.geste(`/certification/quiz/${seg(tentativeId)}/submit`, origine, { reponses, horsLigne }),
    etatDuCompte: () => a.get<EtatDuCompte>('/me/state'),
    faireAppel: (decisionId, texte, preuves, origine) => a.geste(`/sanctions/${seg(decisionId)}/appeal`, origine, { texte, preuves }),
  }
  return d
}
