// DONNÉES DE DÉMONSTRATION — ce que le relais publie vers le livreur, l'entreprise, le client, le vendeur et la console
// (src/demo/pont.ts). Les domaines du relais (reception, departs, retrait, stock, fermeture, incidents) les appellent à
// leurs points « // pont : … ». Ce fichier ne dépend que du pont : les domaines l'importent sans cycle (la lecture des
// gestes du livreur, src/demo/pont-livreur.ts, dépend elle de la réception). Charge utile anonyme (PR-RC-11,
// PR-RC-20) : références de lots et de colis seulement, jamais un code.
import type { Instant, Origine } from '../donnees/communs'
import type { ResultatReception } from '../donnees/domaines/colis'
import { appliOuverte, publier, type MotifSortiePont, type ResultatDepotPont } from './pont'

/** L'application du livreur est ouverte dans ce navigateur (battement de présence du pont) : ses confirmations
 * arrivent par le pont ; sinon la démonstration les simule. */
export const livreurOuvert = () => appliOuverte('livreur')

const RESULTAT: Record<Exclude<ResultatReception, 'en_trop'>, ResultatDepotPont> = { ok: 'controle', reserve: 'reserve', refus: 'refuse', absent: 'absent' }

/** Réception (PR-04), après verifierCodeDepot réussi : le livreur voit « code de dépôt vérifié ». */
export const pontCodeVerifie = (lot: string, o: Origine) => publier({ type: 'relay.drop_code.verified', lot }, `relay.drop_code.verified-${lot}`, o.heure)
/** Réception, au 3e code de dépôt faux (CODE-ESSAIS) : livreur, entreprise et console prévenus ; le lot est inconnu. */
export const pontCodeBloque = (jusqua: Instant, o: Origine) => publier({ type: 'relay.drop_code.blocked', lot: null, jusqua }, `relay.drop_code.blocked-${o.cle}`, o.heure)
/** Réception, après chaque résultat : le livreur le voit en miroir (contrôlé, réserve, refusé, absent ; motif, nombre de photos). */
export const pontResultatColis = (lot: string, colis: string, resultat: Exclude<ResultatReception, 'en_trop'>, motif: string | null, photos: number, o: Origine) =>
  publier({ type: 'relay.drop.item_result', lot, colis, resultat: RESULTAT[resultat], motif, photos }, `relay.drop.item_result-${lot}-${colis}-${o.cle}`, o.heure)
/** Réception : colis non annoncé (« en trop ») ou destiné à un autre relais (PR-RC-04 : il reste au livreur, incident à l'entreprise). */
export const pontColisHorsLot = (lot: string, colis: string, nature: 'en_trop' | 'pas_pour_ce_relais', photos: number, o: Origine) =>
  publier({ type: 'relay.drop.item_result', lot, colis, resultat: nature, motif: null, photos }, `relay.drop.item_result-${lot}-${colis}-${o.cle}`, o.heure)
/** Réception, après validerLot (photo du lot, PIN) : le livreur voit « confirmez le lot » et les emplacements. */
export const pontLotValide = (lot: string, emplacements: Record<string, string | null>, o: Origine) =>
  publier({ type: 'relay.drop.validated', lot, emplacements, photoLot: true }, `relay.drop.validated-${lot}`, o.heure)

/** Départs (PR-06) : colis prêts à partir à une collecte (renvoi du 7e jour, retour, transfert…) ; l'entreprise publie la course. */
export const pontDepartsPrets = (collecte: string, colis: { id: string; classe: 'S' | 'M' | 'L'; motif: MotifSortiePont }[], o: Origine) =>
  publier({ type: 'relay.departures.ready', collecte, colis }, `relay.departures.ready-${collecte}-${colis.map((c) => c.id).sort().join(',')}`, o.heure)
/** Départs, après scanner : le gérant tend le colis ; le livreur peut le confirmer. */
export const pontColisPresente = (collecte: string, colis: string, o: Origine) => publier({ type: 'relay.departure.scanned', collecte, colis }, `relay.departure.scanned-${collecte}-${colis}`, o.heure)
/** Départs, après valider (photo, PIN) : sortie validée côté relais, places libérées. */
export const pontSortieValidee = (collecte: string, colis: string[], o: Origine) =>
  publier({ type: 'relay.departure.confirmed', collecte, colis, par: 'relais' }, `relay.departure.confirmed-relais-${collecte}`, o.heure)
/** Départs, après marquerAbsent : colis prévu qui ne part pas, marqué manquant dans la collecte du livreur. */
export const pontColisManquant = (collecte: string, colis: string, o: Origine) => publier({ type: 'relay.departure.missing', collecte, colis }, `relay.departure.missing-relais-${collecte}-${colis}`, o.heure)

/** Stock et capacité : occupation du relais (saturation : nouveaux clients orientés ailleurs, paquets réorientés, PR-RC-05). */
export const pontOccupation = (occupees: number, declarees: number, sature: boolean, o: Origine) =>
  publier({ type: 'relay.stock.updated', occupees, declarees, sature }, `relay.stock.updated-${occupees}-${declarees}-${sature}`, o.heure)
/** Fermeture déclarée (gérant ; employé : fermeture imprévue du jour) : client, entreprise et console prévenus (ARL-20). */
export const pontFermeture = (du: string, au: string, motif: string, o: Origine) => publier({ type: 'relay.closure.declared', du, au, motif }, `relay.closure.declared-${du}`, o.heure)
/** Inventaire (PR-07) : colis non retrouvés ; la console de BelivaY ouvre la file « colis manquants au relais ». */
export const pontInventaireManquants = (inventaire: string, colis: string[], o: Origine) =>
  publier({ type: 'relay.inventory.missing', inventaire, colis }, `relay.inventory.missing-${inventaire}`, o.heure)
/** Retrait (PR-05), colis remis : client (reçu, remerciement) et vendeur (livré). */
export const pontRemise = (colis: string, o: Origine) => publier({ type: 'handover.completed', colis }, `handover.completed-${colis}`, o.heure)
/** Retour client déposé au relais (2 photos, scellé) : le vendeur voit son retour en route, la console le dossier. */
/** Non retiré au jour du renvoi (tâche du serveur à l'ouverture) : le client et le vendeur le voient. */
export const pontNonRetire = (colis: string, jours: number, o: Origine) => publier({ type: 'parcel.unclaimed', colis, jours }, `parcel.unclaimed-${colis}`, o.heure)
export const pontRetourDepose = (colis: string, reference: string, o: Origine) => publier({ type: 'return.dropped', colis, reference }, `return.dropped-${colis}`, o.heure)

