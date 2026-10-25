// Machine à états du versement du vendeur : portage fidèle de la machine VERSEMENT et du mécanisme Machine/Transition de
// moteurs/belivay_moteurs/etats.py (VER-02, VER-04 ; DP-55 : Q-13, Q-19).
//
// Une machine est une table de transitions : état de départ, événement, état d'arrivée, garde et effets. La garde est
// déclarée : conditions exigées (vraies dans le contexte) et interdites (fausses ou absentes). Une transition absente
// ou dont la garde n'est pas remplie est refusée (au serveur : 409 state_changed). Le contexte est fourni par
// l'appelant, qui calcule chaque condition avec les autres calculs ; la machine ne va jamais chercher de données.
import { ErreurMoteur } from './erreurs'

/** Transition inconnue depuis cet état, ou garde fausse : 409 state_changed côté serveur. */
export class TransitionRefusee extends ErreurMoteur {}

export type Contexte = Record<string, unknown>

export interface Transition {
  de: string
  evenement: string
  vers: string
  exige: string[] // conditions qui doivent être vraies dans le contexte
  interdit: string[] // conditions qui doivent être fausses ou absentes
  gardeTexte: string
  effets: string[]
  libelleClient: string
}

export const permise = (t: Transition, contexte: Contexte) => t.exige.every((k) => !!contexte[k]) && !t.interdit.some((k) => !!contexte[k])

const T = (de: string, evenement: string, vers: string, o: Partial<Omit<Transition, 'de' | 'evenement' | 'vers'>> = {}): Transition => ({
  de, evenement, vers, exige: o.exige ?? [], interdit: o.interdit ?? [], gardeTexte: o.gardeTexte ?? '', effets: o.effets ?? [], libelleClient: o.libelleClient ?? '',
})

export class Machine {
  readonly nom: string
  readonly transitions: Transition[]
  readonly etatsFinaux: ReadonlySet<string>
  constructor(nom: string, transitions: Transition[], etatsFinaux: string[] = []) {
    this.nom = nom
    this.transitions = transitions
    this.etatsFinaux = new Set(etatsFinaux)
  }
  get etats(): Set<string> {
    return new Set(this.transitions.flatMap((t) => [t.de, t.vers]))
  }
  possibles(etat: string): Transition[] {
    return this.transitions.filter((t) => t.de === etat)
  }
  /** La transition à appliquer ; TransitionRefusee si l'événement n'est pas permis ou si la garde est fausse. */
  appliquer(etat: string, evenement: string, contexte: Contexte = {}): Transition {
    const candidates = this.transitions.filter((t) => t.de === etat && t.evenement === evenement)
    if (!candidates.length) throw new TransitionRefusee(`${this.nom} : « ${evenement} » impossible depuis « ${etat} »`)
    const t = candidates.find((c) => permise(c, contexte))
    if (t) return t
    throw new TransitionRefusee(`${this.nom} : « ${evenement} » depuis « ${etat} » refusé (${candidates[0].gardeTexte})`)
  }
}

// ── Le versement du vendeur (VER-02, VER-04 ; DP-55 : Q-13, Q-19) ──────────────────────────────────────

export const VERSEMENT = new Machine(
  'versement',
  [
    T('—', 'payout.closing', 'prevu', {
      effets: ['arrêté du vendredi 14 h 59, heure de Yaoundé : montant dû figé, sans minimum', 'référence BLV-VS-nnnn attribuée et annoncée (VER-02)'],
    }),
    T('prevu', 'payout.friday', 'envoye', {
      interdit: ['revue_du_numero'],
      gardeTexte: "jamais pendant la revue de 7 jours d'un nouveau numéro",
      effets: ['envoyé le vendredi avant 12 h, sans frais'],
    }),
    T('prevu', 'payout.friday', 'reporte', {
      exige: ['revue_du_numero'],
      effets: ["reporté au vendredi qui suit la revue ; jamais envoyé à l'ancien numéro (Q-19)"],
    }),
    T('reporte', 'number.review_ended', 'prevu', { effets: ['tout le montant dû part le vendredi suivant'] }),
    T('envoye', 'operator.credited', 'credite', { effets: ['référence gardée dans Versements'] }),
    T('envoye', 'operator.refused', 'refuse', { effets: ['motif affiché tel quel avec « À faire »', 'essais à + 24 h, + 48 h, + 72 h (F7)'] }),
    T('refuse', 'payout.retry', 'envoye', { interdit: ['essais_epuises'], gardeTexte: 'trois essais au plus' }),
    T('refuse', 'payout.retry', 'suspendu', {
      exige: ['essais_epuises'],
      effets: ["versements suspendus, le support prend la main ; l'argent reste au vendeur"],
    }),
    T('suspendu', 'number.corrected', 'prevu', {
      effets: ['reprise automatique (après la revue de 7 jours si le numéro change), sans frais (Q-13)'],
    }),
  ],
  ['credite'],
)
