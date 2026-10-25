// Domaine « retrait » branché sur le kit (relais_guichet, relais_core/guichet.py) : remise au client — code ou QR (un
// code par colis, jamais renvoyé), recherche d'une commande payable au retrait, paiement Mobile Money au comptoir
// (jamais hors ligne, OFF-02), espèces de garde, contrôle, preuve, signature par le PIN, refus sans motif, abandon.
// Les trois gestes « simuler… » / « presentables » sont ceux de l'application du client et de l'agrégateur : propres à
// la démonstration (NonDisponible ici) ; sur le serveur d'essai, /api/_essai/relais/… les remplace.
import type { ClientApi } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import type { DomaineRetrait, Remise } from '../../donnees/domaines/retrait'
import type { SourceRelais } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineRetrait(api: ClientApi): SourceRelais['retrait'] {
  const a = appels(api)
  type R<K extends keyof DomaineRetrait> = Awaited<ReturnType<DomaineRetrait[K]>>
  const h = (id: string, suite: string) => `/handover/${seg(id)}/${suite}`
  const demo = (m: string, qui: string) => () => Promise.reject(new NonDisponible(`retrait.${m}`, `démonstration seulement (${qui})`))
  const d: DomaineRetrait = {
    verifierCode: (saisie, remiseId, o) => a.geste<R<'verifierCode'>>('/handover/verify', o, { methode: saisie.methode, valeur: saisie.valeur, remise: remiseId }),
    rechercher: (q) => ouNull(a.get<Remise>('/handover/search', { query: 'reference' in q ? { ref: q.reference } : { phone: q.telephone } })),
    remise: (id) => ouNull(a.get<Remise>(`/handover/${seg(id)}`)),
    demanderPaiement: (id, o) => a.geste<R<'demanderPaiement'>>(h(id, 'payment'), o),
    annulerPaiement: (id, o) => a.supprimer<R<'annulerPaiement'>>(h(id, 'payment'), o),
    confirmerEncaissement: (id, recu, o) => a.geste<R<'confirmerEncaissement'>>(h(id, 'cash'), o, { recu }),
    inviterControle: (id, o) => a.geste<R<'inviterControle'>>(h(id, 'check-request'), o),
    nePasOuvrir: (id, o) => a.geste<R<'nePasOuvrir'>>(h(id, 'check'), o, { controle: 'sans_ouverture' }),
    poserPreuve: (id, p, o) => a.geste<R<'poserPreuve'>>(h(id, 'proof'), o, { ...p }),
    remettre: (id, pin, o) => a.geste<R<'remettre'>>(h(id, 'complete'), o, { pin }),
    refusSansMotif: (id, pin, o) => a.geste<R<'refusSansMotif'>>(h(id, 'refuse'), o, { pin }),
    abandonner: (id, motif, constat, o) => a.geste<R<'abandonner'>>(h(id, 'cancel'), o, { motif, constat }),
    presentables: demo('presentables', 'application du client'),
    simulerPresentation: demo('simulerPresentation', 'application du client'),
    simulerRefusPaiement: demo('simulerRefusPaiement', 'agrégateur Mobile Money'),
  }
  return d
}
