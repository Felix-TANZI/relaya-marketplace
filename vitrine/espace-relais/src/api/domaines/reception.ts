// Domaine « réception » branché sur le kit (relais_guichet, relais_core/reception.py) : lots annoncés, code de dépôt du
// livreur (6 chiffres ou jeton de son QR, jamais renvoyé), scan des étiquettes, résultat colis par colis, validation
// du lot (photo et PIN) ; la garde passe au relais quand le livreur confirme (POST /api/courier/stops/{id}/relay-drop/confirm).
// Lots du jour : le serveur ne rend que les lots ANNONCÉS (pas encore confirmés par le livreur) ; l'écran montre aussi
// le lot reçu (« Lot reçu · n colis »). Un lot vu sur ce téléphone qui quitte la liste est relu par son identifiant et
// gardé s'il a été confirmé aujourd'hui (comme la démonstration, qui garde les lots reçus du jour).
import type { ClientApi } from '@client/api/client'
import type { DomaineReception, IssueScan, Lot, ReglesReception } from '../../donnees/domaines/reception'
import type { SourceRelais } from '../../donnees/source'
import { jourDe } from '../../calculs/temps'
import { appels, ouNull, seg } from '../outils'

export function domaineReception(api: ClientApi): SourceRelais['reception'] {
  const a = appels(api)
  type R<K extends keyof DomaineReception> = Awaited<ReturnType<DomaineReception[K]>>
  const item = (lot: string, colis: string) => `/missions/${seg(lot)}/items/${seg(colis)}`
  const vus = new Set<string>()
  const d: DomaineReception = {
    async lots() {
      const annonces = await a.get<Lot[]>('/missions', { query: { status: 'announced' } })
      const ici = new Set(annonces.map((x) => x.lot))
      const partis = [...vus].filter((id) => !ici.has(id))
      const relus = await Promise.all(partis.map((id) => ouNull(a.get<Lot>(`/missions/${seg(id)}`))))
      const aujourdhui = jourDe(Date.now())
      const recus = relus.filter((x): x is Lot => !!x?.confirmeParLivreurA && jourDe(x.confirmeParLivreurA) === aujourdhui)
      for (const id of partis) if (!recus.some((x) => x.lot === id)) vus.delete(id)
      for (const id of ici) vus.add(id)
      return [...recus, ...annonces]
    },
    lot: (id) => ouNull(a.get<Lot>(`/missions/${seg(id)}`)),
    regles: () => a.get<ReglesReception>('/config/reception'),
    verifierCodeDepot: (code, o) => a.geste<R<'verifierCodeDepot'>>('/missions/verify-code', o, { code }),
    scannerEtiquette: (lot, etiquette, o) => a.geste<IssueScan>(`/missions/${seg(lot)}/scan`, o, { etiquette }),
    resultat: (lot, colis, r, o) => a.geste<R<'resultat'>>(item(lot, colis), o, { ...r }),
    colisEnTrop: (lot, colis, classe, photos, o) => a.geste<R<'colisEnTrop'>>(item(lot, colis), o, { resultat: 'en_trop', classe, photos }),
    validerLot: (lot, photo, pin, o) => a.geste<R<'validerLot'>>(`/missions/${seg(lot)}/validate`, o, { photo, pin }),
  }
  return d
}
