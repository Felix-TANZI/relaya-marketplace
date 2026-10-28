// Fiches « Apprendre » de l'entreprise (AJ-E, motif M14) : courtes, une règle par étape, chaque nombre lu dans le
// registre en vigueur (aucun délai ni seuil écrit ici). Les textes sont des modèles français traduits par
// AJ-E.en.json ; {x} reçoit la valeur du registre. Chaque fiche finit par le geste qui l'applique.
import { PARAMETRES, REGISTRE } from '../../calculs/registre'

const D = PARAMETRES.delais
const P = PARAMETRES.paliers
const L = PARAMETRES.litiges
const nombre = (code: string) => Number.parseInt(String(REGISTRE[code]?.valeur ?? ''), 10)

export interface Etape {
  titre: string
  texte: string
  valeurs?: Record<string, string | number>
}
export interface Fiche {
  id: 'delais' | 'preuves' | 'litiges' | 'score' | 'domicile' | 'incidents'
  titre: string
  resume: string
  minutes: number
  icone: string
  etapes: Etape[]
  retenir: string
  valeursRetenir?: Record<string, string | number>
  agir: { libelle: string; route: string }
}

export const FICHES: Fiche[] = [
  {
    id: 'delais',
    titre: 'Tenir les délais d’un paquet',
    resume: 'Accepter, ramasser, livrer : trois horloges qui partent l’une après l’autre.',
    minutes: 2,
    icone: 'timer',
    etapes: [
      { titre: 'Accepter à temps', texte: 'Un paquet publié s’accepte en {a} minutes ; les {f} premières minutes, les entreprises du premier rang passent devant.', valeurs: { a: D.acceptationMin, f: D.fenetrePrioriteMin } },
      { titre: 'Affecter tout de suite', texte: 'Sans livreur affecté après {n} minutes, l’alerte part : le ramassage doit commencer dans les {r} minutes qui suivent l’acceptation.', valeurs: { n: D.alerteNonAffecteMin, r: D.ramassageMin } },
      { titre: 'Livrer dans la promesse', texte: 'Chaque colis est remis en strictement moins de {h} heures ; le délai tenu compte pour le Trust Score.', valeurs: { h: D.livraisonH } },
    ],
    retenir: 'Un paquet que vous ne pouvez pas tenir se rend avant le ramassage, jamais après.',
    agir: { libelle: 'Voir les paquets disponibles', route: 'paquets' },
  },
  {
    id: 'preuves',
    titre: 'Des preuves qui protègent',
    resume: 'Photo, scan et position à chaque passage de main : c’est votre défense en litige.',
    minutes: 2,
    icone: 'camera',
    etapes: [
      { titre: 'Au ramassage', texte: 'Le livreur photographie le colis, scanne son étiquette et la scelle : sans scan, le colis n’est pas sous votre garde.' },
      { titre: 'Au dépôt ou à la remise', texte: 'Nouvelle photo et code de remise ; une photo floue est refusée par l’appli du livreur.' },
      { titre: 'Envoyées, puis gardées', texte: 'Une preuve encore sur le téléphone passe en revue après {r} heures et expire après {x} heures en file ; envoyées, les preuves sont gardées {j} jours au moins.', valeurs: { r: nombre('ENT-PREUVE-REVUE'), x: nombre('ENT-PREUVE-EXPIRE'), j: nombre('ENT-CONSERV-PREUVES') } },
    ],
    retenir: 'Relancez un livreur dont une preuve manque avant la fin de la journée.',
    agir: { libelle: 'Ouvrir les preuves', route: 'preuves' },
  },
  {
    id: 'litiges',
    titre: 'Répondre à un litige',
    resume: 'Un délai, des preuves, une réponse signée par le propriétaire.',
    minutes: 3,
    icone: 'scale',
    etapes: [
      { titre: 'Le délai', texte: 'Vous avez {h} heures pour répondre ; passé ce délai, BelivaY arbitre sur les preuves déjà au dossier.', valeurs: { h: L.reponseLitigeH } },
      { titre: 'Préparer', texte: 'Le répartiteur prépare la réponse avec la déclaration du livreur et les preuves de la mission.' },
      { titre: 'Envoyer', texte: 'Le propriétaire relit et envoie ; une proposition d’arrangement compte {n} caractères au moins.', valeurs: { n: L.arrangementMin } },
    ],
    retenir: 'Un recours est possible une fois : il est examiné par une autre personne.',
    agir: { libelle: 'Voir les litiges', route: 'litiges' },
  },
  {
    id: 'score',
    titre: 'Monter de palier',
    resume: 'Le Trust Score fixe votre palier, et le palier fixe le plafond de valeur par colis.',
    minutes: 2,
    icone: 'gauge',
    etapes: [
      { titre: 'Les seuils', texte: 'Confirmé dès {c} points, Or dès {o} points, chaque seuil tenu {j} jours de suite.', valeurs: { c: P.seuils.Confirme, o: P.seuils.Or, j: P.tenueJours } },
      { titre: 'La descente', texte: 'On ne redescend qu’à {e} points sous le seuil ; une baisse est limitée à {b} points par recalcul.', valeurs: { e: P.ecartDescente, b: P.baisseMax } },
      { titre: 'Ce qui compte', texte: 'Chaque remise dans le délai fait monter la note ; une remise après la promesse ou un litige perdu la font baisser.' },
    ],
    retenir: 'Chaque critère du Score qualité dit ce qui le ferait monter.',
    agir: { libelle: 'Ouvrir le Score qualité', route: 'score' },
  },
  {
    id: 'domicile',
    titre: 'Les courses à domicile',
    resume: 'Une seule commande par paquet, un livreur choisi par vous.',
    minutes: 1,
    icone: 'house',
    etapes: [
      { titre: 'Un paquet, une commande', texte: 'À domicile, le paquet porte toujours une seule commande : le livreur va directement chez le client.' },
      { titre: 'Votre choix', texte: 'BelivaY n’affecte jamais un livreur : la suggestion reste une aide, l’entreprise choisit.' },
      { titre: 'La remise', texte: 'Le client donne son code de remise ; sans code, pas de remise : le colis revient au relais, déposé au plus tard {m} minutes avant sa fermeture.', valeurs: { m: nombre('ENT-DEPOT-AVANT-FERMETURE') } },
    ],
    retenir: 'Le numéro du client reste masqué : l’appel passe par le portail, pendant la mission seulement.',
    agir: { libelle: 'Voir les missions', route: 'missions' },
  },
  {
    id: 'incidents',
    titre: 'Décider d’un incident',
    resume: 'Valider ou refuser vite, avec un motif écrit.',
    minutes: 1,
    icone: 'triangle-alert',
    etapes: [
      { titre: 'Le délai', texte: 'Un incident bloquant se décide en {n} minutes ; sans décision, l’opérateur BelivaY tranche.', valeurs: { n: D.decisionIncidentMin } },
      { titre: 'Le motif', texte: 'Un refus s’explique en {n} caractères au moins ; le livreur le lit.', valeurs: { n: L.motifRefusIncidentMin } },
    ],
    retenir: 'Écrivez le motif pour le livreur : il lit ce qu’il doit faire ensuite.',
    agir: { libelle: 'Voir les incidents', route: 'incidents' },
  },
]
