// Renvoi au vendeur à 7 jours : PORTAGE FIDÈLE de renvoi_au_vendeur (moteurs/belivay_moteurs/relais.py), au-dessus de
// garde.renvoi ; mêmes exemples que moteurs/tests/test_relais.py. ARL-08 (commande payée : garde des 7 jours déduite du
// remboursement, sans autre frais), ARL-09 (à payer au comptoir : compté comme un refus), R37 (jours fermés non comptés :
// le renvoi recule d'autant), ARL-130 (le relais touche ses 100 F par jour, payés par BelivaY au versement), PR-RC-07.
import { DERNIER_RANG, etat, jourDuRang, ouvert, renvoi, type GroupeEnGarde } from './garde'
import { ajouterJours, ecartJours } from './temps'
import type { ParametresMoteursRelais } from './parametres-moteurs'
import type { Jour } from './temps'

export interface RenvoiAuVendeur {
  jour: Jour // premier jour ouvert (et non suspendu) après le 7e jour : le colis passe « À faire partir »
  joursFermes: Jour[] // jours fermés jusqu'au 7e jour : non comptés (R37)
  garde: number // garde des 7 jours, plafonnée à la valeur (ARL-10)
  deduitDuRemboursement: number // au plus le montant payé (DP-24)
  rembourse: number // vers le moyen d'origine, à la sortie confirmée (PR-RC-07)
  joursPayesAuRelais: number // jours facturés et 1er jour payé par BelivaY
  gainRelais: number // payé par BelivaY au versement (ARL-130)
  compteCommeRefus: boolean // GARDE-COMPTOIR
  trace: string[]
}

/** Colis non retiré : renvoi le premier jour ouvert après le 7e jour ; null tant que l'avis n'est pas délivré. */
export function renvoiAuVendeur(g: GroupeEnGarde, p: Pick<ParametresMoteursRelais, 'garde'>): RenvoiAuVendeur | null {
  const r = renvoi(g, p.garde)
  if (r === null) return null
  const e = etat(g, jourDuRang(g, DERNIER_RANG), p.garde)
  const fin = jourDuRang(g, DERNIER_RANG)
  const fermes = Array.from({ length: ecartJours(g.j0!, fin) + 1 }, (_, k) => ajouterJours(g.j0!, k)).filter((j) => !ouvert(g.horaires, j))
  const trace = [...r.trace]
  if (fermes.length) trace.push(`${fermes.length} jour(s) fermé(s) non compté(s) : le renvoi recule d'autant (R37)`)
  return {
    jour: r.jour,
    joursFermes: fermes,
    garde: r.garde,
    deduitDuRemboursement: r.retenue,
    rembourse: r.rembourse,
    joursPayesAuRelais: e.joursFactures + (e.payeParBelivay ? 1 : 0),
    gainRelais: r.payeParBelivay,
    compteCommeRefus: r.compteCommeRefus,
    trace,
  }
}
