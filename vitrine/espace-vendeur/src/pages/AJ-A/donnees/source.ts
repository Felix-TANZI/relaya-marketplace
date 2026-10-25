// Source des pages AJ-A : même patron que src/donnees/source.ts (une interface, deux sources choisies par VITE_SOURCE).
// « demo » : src/demo/aj-a.ts, chargé à la première lecture (jamais par un écran) ; « api » : le serveur, routes /vendors/…
// du contrat (types.ts). Les écrans n'appellent que `sourceAJA.<domaine>.<méthode>()`.
import { clientDeLEnvironnement, type ClientApi } from '@client/api/client'
import { env } from '@client/config/env'
import { appels, ouNull, seg } from '../../../api/outils'
import type { Resultat } from '../../../donnees/communs'
import type { SourceAJA } from './types'

type Methodes = Record<string, (...args: unknown[]) => unknown>
let demo: SourceAJA | null = null
let chargement: Promise<SourceAJA> | null = null
const charger = () => (chargement ??= import('../../../demo/aj-a').then((m) => (demo = m.demoAJA)))
function domaineDemo<K extends keyof SourceAJA>(nom: K): SourceAJA[K] {
  return new Proxy({} as SourceAJA[K], {
    get(_, methode) {
      if (typeof methode !== 'string' || methode === 'then') return undefined
      return (...args: unknown[]) => (demo ? (demo[nom] as unknown as Methodes)[methode](...args) : charger().then((d) => (d[nom] as unknown as Methodes)[methode](...args)))
    },
  })
}

/** Connecteurs (vague 3) : réponses au format de types.ts ; refus attendus en 200 { ok: false, raison }. */
function sourceApi(api: ClientApi): SourceAJA {
  const s = appels(api, 'stock')
  const p = appels(api, 'promotions')
  const q = appels(api, 'questions')
  const l = appels(api, 'livraison')
  type R<T extends object, E extends string> = Promise<Resultat<T, E>>
  return {
    stock: {
      inventaire: () => s.get('/stock'),
      mouvements: (offreId) => s.get(offreId ? `/stock/movements?offer=${seg(offreId)}` : '/stock/movements'),
      ajuster: (id, c) => s.post(`/stock/${seg(id)}/adjust`, c, { idempotence: true }),
      regler: (id, seuil) => s.put(`/stock/${seg(id)}/threshold`, { seuil }),
      exporter: () => s.get<string>('/stock/export'),
    },
    promotions: {
      regles: () => p.get('/promotions/rules'),
      liste: () => p.get('/promotions'),
      offres: () => p.get('/promotions/offers'),
      apercu: (x) => p.post('/promotions/quote', x),
      creer: (x) => p.post('/promotions', x, { idempotence: true }),
      arreter: async (id) => (await ouNull(p.post<Awaited<R<never, 'etat'>>>(`/promotions/${seg(id)}/stop`))) ?? { ok: false, raison: 'etat' },
    },
    questions: {
      liste: () => q.get('/questions'),
      filtrer: (texte) => q.post('/questions/filter', { texte }),
      repondre: (id, texte) => q.post(`/questions/${seg(id)}/answer`, { texte }, { idempotence: true }),
      signaler: (id, motif) => q.post(`/questions/${seg(id)}/report`, { motif }),
      modeles: () => q.get('/questions/templates'),
      enregistrerModele: (titre, texte) => q.post('/questions/templates', { titre, texte }),
      modifierModele: (id, titre, texte) => q.put(`/questions/templates/${seg(id)}`, { titre, texte }),
      supprimerModele: async (id) => {
        await q.supprimer(`/questions/templates/${seg(id)}`)
      },
    },
    livraison: {
      reglages: () => l.get('/delivery-settings'),
      regler: (d) => l.put('/delivery-settings', d),
      reglerProduit: (id, c) => l.put(`/offers/${seg(id)}/delivery`, c),
      creneau: (id, prefere) => l.put(`/delivery-settings/slots/${seg(id)}`, { prefere }),
      relais: (id, prefere) => l.put(`/delivery-settings/relays/${seg(id)}`, { prefere }),
    },
  }
}

function choisir(): SourceAJA {
  if (env.source === 'api') {
    const api = clientDeLEnvironnement()
    if (!api) throw new Error('VITE_SOURCE=api demande VITE_API_URL')
    return sourceApi(api)
  }
  return { stock: domaineDemo('stock'), promotions: domaineDemo('promotions'), questions: domaineDemo('questions'), livraison: domaineDemo('livraison') }
}

export const sourceAJA: SourceAJA = choisir()
