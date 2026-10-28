// File du comptoir (VAGUE-AMELIORATIONS.md n° 7) : ce que le gérant prépare avant que les clients arrivent, calculé sur
// les colis prêts au retrait (en stock ou dernier jour, code envoyé au client, ou payables au comptoir). Jamais le nom du client (GEN-01) : une
// commande se désigne par sa référence.
// - Clients attendus : un par groupe de remise (une commande au relais), les plus pressés d'abord : dernier jour, puis
//   le jour de garde le plus avancé, puis ceux qui ont à payer au comptoir (plus long), puis la référence.
// - Tournée des étagères : chaque colis prêt dans l'ordre des étagères (lettre, puis numéro : A-01, A-02, B-01…), les
//   colis sans emplacement (comptoir provisoire, DP-20) à la fin.
import type { ColisRelais } from '../donnees/domaines/colis'

export interface ClientAttendu {
  groupe: string
  colis: string[]
  emplacements: string[]
  dernierJour: boolean
  rang: number // jour de garde le plus avancé du groupe (0 : pas encore commencé)
  gardeDue: number // garde due aujourd'hui (comptée par groupe : la plus haute de ses colis)
  aPayer: number // commande payable au comptoir, pas encore confirmée (Mobile Money)
}

/** « A-01 » → [« A », 1] (sans emplacement : tout à la fin, ordreEtagere). */
function cleEtagere(e: string): [string, number] {
  const m = /^([A-Z]+)-?(\d+)/.exec(e.toUpperCase())
  return m ? [m[1], Number(m[2])] : [e.toUpperCase(), 0]
}
export function ordreEtagere(a: string | null, b: string | null): number {
  if (!a || !b) return Number(!a) - Number(!b)
  const [la, na] = cleEtagere(a)
  const [lb, nb] = cleEtagere(b)
  return la.localeCompare(lb) || na - nb
}

/** Prêt au retrait : en stock (ou dernier jour) et code envoyé au client ; payable au comptoir : le client vient payer. */
export const pretAuRetrait = (c: ColisRelais) => (c.etat === 'en_stock' || c.etat === 'dernier_jour') && (c.code.envoye || c.paiement.mode === 'au_comptoir')

export function clientsAttendus(colis: ColisRelais[]): ClientAttendu[] {
  const groupes = new Map<string, ColisRelais[]>()
  for (const c of colis.filter(pretAuRetrait)) groupes.set(c.groupe, [...(groupes.get(c.groupe) ?? []), c])
  return [...groupes.entries()]
    .map(([groupe, l]) => ({
      groupe,
      colis: l.map((c) => c.id).sort(),
      emplacements: l.map((c) => c.emplacement).filter((e): e is string => !!e).sort(ordreEtagere),
      dernierJour: l.some((c) => c.etat === 'dernier_jour'),
      rang: Math.max(0, ...l.map((c) => c.garde?.rang ?? 0)),
      gardeDue: Math.max(0, ...l.map((c) => c.garde?.du ?? 0)),
      aPayer: l.filter((c) => c.paiement.mode === 'au_comptoir' && c.paiement.etat !== 'confirme').reduce((n, c) => n + c.paiement.montant, 0),
    }))
    .sort((a, b) => Number(b.dernierJour) - Number(a.dernierJour) || b.rang - a.rang || Number(b.aPayer > 0) - Number(a.aPayer > 0) || a.groupe.localeCompare(b.groupe))
}

/** Les colis prêts, dans l'ordre de la tournée des étagères. */
export const tourneeEtageres = (colis: ColisRelais[]): ColisRelais[] => colis.filter(pretAuRetrait).sort((a, b) => ordreEtagere(a.emplacement, b.emplacement) || a.id.localeCompare(b.id))
