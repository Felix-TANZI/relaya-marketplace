// Conditions de remise et PIN de remise : PORTAGE FIDÈLE de moteurs/belivay_moteurs/relais.py (garde_a_encaisser,
// conditions_de_remise, essai_pin) ; mêmes exemples que moteurs/tests/test_relais.py. v6 D12 (garde en espèces,
// remise bloquée tant que l'encaissement n'est pas confirmé), D14 (Mobile Money au comptoir, jamais en espèces), D15
// (photo) ; ARL-01 (un code par colis), ARL-02 (garde du groupe encaissée une fois), ARL-03 (hors ligne : seulement si
// seule la garde est due, sous PR-HL-REMISES ; Mobile Money jamais hors ligne), ARL-04 (montant reçu, monnaie),
// ARL-42 (3 PIN faux annulent la remise) ; PR-RC-01, PR-RC-19, PR-RC-21, PR-RC-22, PR-RC-31.
import type { Instant } from '../donnees/communs'
import { etat, type GroupeEnGarde } from './garde'
import type { ParametresMoteursRelais } from './parametres-moteurs'
import type { Blocage } from './reception'
import type { Jour } from './temps'

export interface DemandeDeRemise {
  colis: string
  groupe: GroupeEnGarde // son groupe de remise : la garde se calcule par groupe (garde.ts)
  jour: Jour
  codeJuste: boolean // code ou QR de CE colis vérifié par le serveur (ARL-01)
  codeBloque?: boolean
  gardeDejaEncaissee?: boolean // au 1er retrait du groupe ; les colis suivants ne doivent rien (ARL-02)
  encaissementConfirme?: boolean // confirmé par le membre sous son PIN (v6 D12)
  montantRecu?: number | null // « Montant reçu », facultatif (ARL-04)
  resteAPayer?: number // articles d'une commande à payer au comptoir, en Mobile Money (v6 D14)
  paiementConfirme?: boolean // confirmation de l'agrégateur reçue
  porteurDesigne?: boolean
  pieceVerifiee?: boolean
  photo?: boolean // photo de remise (v6 D15)
  pinFaux?: number // PIN faux pendant cette remise
  pinOk?: boolean
  constatEnCours?: boolean
  horsLigne?: boolean
  remisesHorsLigneDuJour?: number // remises hors ligne avec garde due déjà faites aujourd'hui
}

export interface ConditionsDeRemise {
  blocages: Blocage[]
  possible: boolean
  gardeAEncaisser: number
  monnaieARendre: number
  pieceExigee: boolean
  annulee: boolean // PR-PIN-REMISE-ESSAIS PIN faux : remise annulée, colis remis en stock (ARL-42)
  compteHorsLigne: boolean // compte dans PR-HL-REMISES (ARL-03)
}

type P = Pick<ParametresMoteursRelais, 'garde' | 'porteurPieceDes' | 'pinRemiseEssais' | 'horsLigneRemises'>

/** Garde due par le groupe, encaissée une seule fois, au premier retrait du groupe (ARL-02, PR-RC-22). */
export const gardeAEncaisser = (g: GroupeEnGarde, jour: Jour, dejaEncaissee: boolean, p: Pick<ParametresMoteursRelais, 'garde'>) => (dejaEncaissee ? 0 : etat(g, jour, p.garde).du)

/** Blocages de « Remettre le colis », dans l'ordre de relais.py : constat ; code bloqué ou pas encore juste ; remise
 * annulée (PIN) ; paiement hors ligne ou au comptoir non confirmé ; plafond hors ligne ; encaissement ; montant reçu ;
 * pièce ; photo ; PIN. */
export function conditionsDeRemise(d: DemandeDeRemise, p: P): ConditionsDeRemise {
  const reste = d.resteAPayer ?? 0
  const pinFaux = d.pinFaux ?? 0
  const duJour = d.remisesHorsLigneDuJour ?? 0
  const recu = d.montantRecu ?? null
  if (reste < 0 || pinFaux < 0 || duJour < 0 || (recu !== null && recu < 0)) throw new Error('compteur ou montant négatif')
  const garde = gardeAEncaisser(d.groupe, d.jour, d.gardeDejaEncaissee ?? false, p)
  const piece = (d.porteurDesigne ?? false) || d.groupe.valeur >= p.porteurPieceDes
  const annulee = pinFaux >= p.pinRemiseEssais
  const b: Blocage[] = []
  const bloquer = (code: string, regle: string) => b.push({ code, regle, colis: d.colis })
  if (d.constatEnCours) bloquer('constat_en_cours', 'S4, PR-RC-06')
  if (d.codeBloque) bloquer('code_bloque', 'CAL-31, PR-RC-21')
  else if (!d.codeJuste) bloquer('code_requis', 'ARL-01, RET-02')
  if (annulee) bloquer('remise_annulee', 'ARL-42, PR-RC-31')
  if (d.horsLigne && reste > 0) bloquer('paiement_hors_ligne', 'OFF-02, ARL-03')
  else if (reste > 0 && !d.paiementConfirme) bloquer('paiement_comptoir', 'v6 D14, PR-RC-01')
  if (d.horsLigne && garde > 0 && duJour >= p.horsLigneRemises) bloquer('plafond_hors_ligne', 'ARL-03, PR-HL-REMISES')
  if (garde > 0 && !d.encaissementConfirme) bloquer('encaissement_garde', 'v6 D12, PR-RC-01')
  if (garde > 0 && recu !== null && recu < garde) bloquer('montant_recu_insuffisant', 'ARL-04')
  if (piece && !d.pieceVerifiee) bloquer('piece_a_verifier', 'CODE-PORTEUR, TRU-05')
  if (!d.photo) bloquer('photo_de_remise', 'v6 D15, PR-RC-12')
  if (!annulee && !d.pinOk) bloquer('pin_requis', 'ARL-12, ARL-42')
  return {
    blocages: b,
    possible: b.length === 0,
    gardeAEncaisser: garde,
    monnaieARendre: recu !== null ? Math.max(recu - garde, 0) : 0,
    pieceExigee: piece,
    annulee,
    compteHorsLigne: (d.horsLigne ?? false) && garde > 0,
  }
}

export interface EssaiPin {
  accepte: boolean
  fauxDansLaRemise: number
  fauxConsecutifs: number // tous gestes confondus ; 0 après un PIN juste
  remiseAnnulee: boolean // PR-PIN-REMISE-ESSAIS faux dans cette remise (ARL-42)
  bloqueJusquAu: Instant | null // PIN-ESSAIS faux de suite : PIN bloqué PR-PIN-BLOCAGE-MIN minutes (ARL-12)
}
/** PIN du membre pendant une remise (ARL-12, ARL-42) ; pendant le blocage, rien n'est accepté ni compté. */
export function essaiPin(juste: boolean, fauxDansLaRemiseAvant: number, fauxConsecutifsAvant: number, maintenant: Instant, p: Pick<ParametresMoteursRelais, 'pinEssais' | 'pinRemiseEssais' | 'pinBlocageMinutes'>, bloqueJusquAu: Instant | null = null): EssaiPin {
  if (fauxDansLaRemiseAvant < 0 || fauxConsecutifsAvant < 0) throw new Error('compteur négatif')
  let suiteAvant = fauxConsecutifsAvant
  if (bloqueJusquAu !== null) {
    if (maintenant < bloqueJusquAu) return { accepte: false, fauxDansLaRemise: fauxDansLaRemiseAvant, fauxConsecutifs: suiteAvant, remiseAnnulee: fauxDansLaRemiseAvant >= p.pinRemiseEssais, bloqueJusquAu }
    suiteAvant = 0
  }
  if (juste) return { accepte: true, fauxDansLaRemise: fauxDansLaRemiseAvant, fauxConsecutifs: 0, remiseAnnulee: false, bloqueJusquAu: null }
  const dans = fauxDansLaRemiseAvant + 1
  const suite = suiteAvant + 1
  return { accepte: false, fauxDansLaRemise: dans, fauxConsecutifs: suite, remiseAnnulee: dans >= p.pinRemiseEssais, bloqueJusquAu: suite >= p.pinEssais ? maintenant + p.pinBlocageMinutes * 60_000 : null }
}
